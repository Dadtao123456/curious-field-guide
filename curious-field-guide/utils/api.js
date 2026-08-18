// 好奇图鉴 - API 请求封装
// 说明：v1.0 先用 mock 数据返回，后续接入真实云函数时只替换此文件内部实现

const { MOCK_SPECIES_LIST, MOCK_DISCOVERIES } = require('../data/species-mock');
const { STORAGE_KEYS } = require('./constants');
const { calculateStreak } = require('./gamification');

/**
 * 获取首页仪表盘数据
 * 说明：累计发现数、连续天数、最近发现列表均基于合并后的收藏数据实时计算，
 *       保证「收入图鉴」后首页同步更新
 * @returns {Promise<Object>} { totalDiscoveries, streakCount, recentDiscoveries }
 */
function getDashboard() {
  return getCollections().then(list => ({
    totalDiscoveries: list.length,
    streakCount: calculateStreak(
      list.map(item => item.discoveredAt).filter(Boolean)
    ),
    recentDiscoveries: list.slice(0, 5)
  }));
}

/**
 * 上传照片并请求识别
 * 说明：默认走真实云函数（上传云存储 → identify 云函数 → 百度识别）；
 *       带 scenario 参数时走 mock（首页长按入口的测试场景）
 * @param {String} imagePath - 本地图片临时路径
 * @param {Object} options - 附加信息，如 location、scenario（mock 测试场景）
 * @returns {Promise<Object>} 识别结果（success=false 时含 reason/message，由结果页展示失败态）
 */
function identifyImage(imagePath, options = {}) {
  if (options.scenario) {
    return mockIdentify(imagePath, options);
  }
  return identifyByCloud(imagePath, options);
}

/**
 * 真实识别：上传照片到云存储后调用 identify 云函数
 * 说明：网络/服务异常统一转为 success=false 的失败结构，保证首页始终能跳转结果页失败态
 * @param {String} imagePath - 本地图片临时路径
 * @param {Object} options - 附加信息，如 location
 * @returns {Promise<Object>} 识别结果
 */
function identifyByCloud(imagePath, options) {
  let uploadedFileID = '';
  return uploadIdentifyPhoto(imagePath).then(fileID => {
    uploadedFileID = fileID;
    return wx.cloud.callFunction({
      name: 'identify',
      data: { fileID, location: options.location || '' }
    });
  }).then(res => {
    const result = (res && res.result) || {};
    if (typeof result.success === 'undefined') {
      return { success: false, reason: 'empty_result', message: '识别服务暂时开小差了，请稍后再试' };
    }
    // 保留照片的云存储 ID：收藏时入库（本地临时路径会失效，不能作为收藏图）
    result.photoFileID = uploadedFileID;
    return result;
  }).catch(error => {
    console.error('[api] 识别请求失败', error);
    return { success: false, reason: 'network', message: '网络异常，识别失败，请检查网络后重试' };
  });
}

/**
 * 把本地照片上传到云存储，返回 fileID
 * 说明：照片经云存储中转，避免 base64 直接传参受 callFunction 数据量限制
 * @param {String} imagePath - 本地图片临时路径
 * @returns {Promise<String>} 云存储 fileID
 */
function uploadIdentifyPhoto(imagePath) {
  const extMatch = imagePath.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const ext = extMatch ? extMatch[1] : 'jpg';
  const cloudPath = `identify-photos/${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`;
  return wx.cloud.uploadFile({ cloudPath, filePath: imagePath }).then(res => res.fileID);
}

/**
 * mock 识别：按测试场景返回预置数据
 * @param {String} imagePath - 本地图片临时路径
 * @param {Object} options - 含 scenario 测试场景
 * @returns {Promise<Object>} 识别结果
 */
function mockIdentify(imagePath, options) {
  console.log('[api] mock identify', imagePath, options);

  // mock 测试场景：fail 返回识别失败，用于验证失败页分支
  if (options.scenario === 'fail') {
    return Promise.resolve({
      success: false,
      reason: 'no_result',
      message: '暂时无法识别，可能是新物种，也可能是照片不够清晰'
    });
  }

  // 按场景选取物种：fungi 场景固定返回菌类，其余随机
  let pool = MOCK_SPECIES_LIST;
  if (options.scenario === 'fungi') {
    pool = MOCK_SPECIES_LIST.filter(item => item.category === 'fungi');
  }
  const randomIndex = Math.floor(Math.random() * pool.length);
  const species = pool[randomIndex];

  // 从全量列表中随机取 2 个不同物种作为「其他可能」候选
  const alternatives = MOCK_SPECIES_LIST
    .filter(item => item.speciesKey !== species.speciesKey)
    .sort(() => Math.random() - 0.5)
    .slice(0, 2)
    .map((item, index) => ({
      name: item.name,
      latinName: item.latinName,
      speciesKey: item.speciesKey,
      category: item.category,
      order: item.order,
      family: item.family,
      description: item.description,
      habitat: item.habitat,
      confidence: index === 0 ? 0.82 : 0.65
    }));

  // 低置信度场景：触发结果页「识别不确定」提示条
  const confidence = options.scenario === 'low_confidence' ? 0.55 : 0.85;

  return Promise.resolve({
    success: true,
    species: {
      name: species.name,
      latinName: species.latinName,
      speciesKey: species.speciesKey,
      category: species.category,
      order: species.order,
      family: species.family
    },
    description: species.description,
    habitat: species.habitat,
    officialPhotoUrl: species.officialPhotoUrl,
    officialPhotoStatus: 'pending',
    confidence,
    source: 'baidu-animal',
    note: null,
    previewTags: [],
    alternatives,
    location: options.location || '奥森公园',
    discoveredAt: new Date().toISOString(),
    isMultiSubject: false
  });
}

/**
 * 手动搜索物种
 * 说明：走云端 identify 云函数的 search 子动作（iNaturalist 物种库，几十万物种）；
 *       云端不可用时降级为本地 mock 列表搜索，保证功能可用
 * @param {String} keyword - 搜索关键词（物种名/俗名，不支持描述性短语）
 * @returns {Promise<Array>} 候选物种列表
 */
function searchSpecies(keyword) {
  return wx.cloud.callFunction({
    name: 'identify',
    data: { action: 'search', name: keyword }
  }).then(res => {
    const result = (res && res.result) || {};
    if (!result.success) {
      throw new Error(result.message || '搜索失败');
    }
    return result.results || [];
  }).catch(error => {
    console.error('[api] 云端搜索失败，降级为本地 mock 搜索', error);
    return mockSearchSpecies(keyword);
  });
}

/**
 * 本地 mock 搜索（云端不可用时的降级方案）
 * @param {String} keyword - 搜索关键词
 * @returns {Array} 候选物种列表
 */
function mockSearchSpecies(keyword) {
  const lowerKeyword = keyword.toLowerCase();

  const results = MOCK_SPECIES_LIST.filter(item => {
    return item.name.includes(keyword) ||
           item.latinName.toLowerCase().includes(lowerKeyword) ||
           item.family.includes(keyword) ||
           item.description.includes(keyword);
  });

  return results.map(item => ({
    name: item.name,
    latinName: item.latinName,
    speciesKey: item.speciesKey,
    category: item.category,
    order: item.order,
    family: item.family,
    description: item.description,
    habitat: item.habitat
  }));
}

/**
 * 按 key 获取单条发现/收藏记录（只读模式）
 * 说明：优先查云端收藏；查不到/云端不可用时降级查本地缓存与 mock 历史发现
 * @param {String} key - 发现记录 id 或物种 speciesKey
 * @returns {Promise<Object>} 发现记录 + 物种信息
 */
function getDiscoveryById(key) {
  return callCollections('get', { speciesKey: key }).then(result => {
    const item = result.record;
    return {
      id: item.speciesKey,
      speciesName: item.speciesName,
      latinName: item.latinName || '',
      speciesKey: item.speciesKey,
      category: item.category,
      userPhotoUrl: item.userPhotoUrl || '',
      location: item.location || '未知地点',
      discoveredAt: item.collectedAt,
      rarityTags: item.rarityTags || [],
      description: item.description || '',
      habitat: item.habitat || '',
      order: item.order || '',
      family: item.family || '',
      officialPhotoUrl: item.officialPhotoUrl || ''
    };
  }).catch(error => {
    console.error('[api] 云端查询失败，降级本地查询', error);
    return getDiscoveryByIdLocal(key);
  });
}

/**
 * 本地查询单条记录（云端不可用时的降级方案）
 */
function getDiscoveryByIdLocal(key) {
  let record = MOCK_DISCOVERIES.find(item => item.id === key);

  if (!record) {
    // 收藏列表按 speciesKey 查找，转换为发现记录格式
    let collections = [];
    try {
      collections = wx.getStorageSync(STORAGE_KEYS.COLLECTIONS) || [];
    } catch (error) {
      collections = [];
    }
    const collected = collections.find(item => item.speciesKey === key);
    if (collected) {
      record = {
        id: collected.speciesKey,
        speciesName: collected.speciesName,
        latinName: collected.latinName,
        speciesKey: collected.speciesKey,
        category: collected.category,
        userPhotoUrl: collected.userPhotoUrl || '',
        location: collected.location || '未知地点',
        discoveredAt: collected.collectedAt,
        rarityTags: [],
        // 收藏时保存的百科字段（真实识别物种在 mock 列表中查不到，必须从这里取）
        description: collected.description || '',
        habitat: collected.habitat || '',
        order: collected.order || '',
        family: collected.family || '',
        officialPhotoUrl: collected.officialPhotoUrl || ''
      };
    }
  }

  if (!record) {
    return Promise.reject(new Error('发现记录不存在'));
  }

  const species = MOCK_SPECIES_LIST.find(item => item.speciesKey === record.speciesKey) || {};

  // 百科字段优先用记录自身存储的（真实识别物种），mock 列表兜底（历史发现）
  return Promise.resolve({
    ...record,
    description: record.description || species.description || '',
    habitat: record.habitat || species.habitat || '',
    order: record.order || species.order || '',
    family: record.family || species.family || '',
    officialPhotoUrl: record.officialPhotoUrl || species.officialPhotoUrl || ''
  });
}

/**
 * 调用 collections 云函数的统一入口
 * @param {String} action - list / add / get / migrate
 * @param {Object} data - 附加参数
 * @returns {Promise<Object>} 云函数返回的 result
 */
function callCollections(action, data = {}) {
  return wx.cloud.callFunction({
    name: 'collections',
    data: { action, ...data }
  }).then(res => {
    const result = (res && res.result) || {};
    if (!result.success) {
      throw new Error(result.message || '收藏服务异常');
    }
    return result;
  });
}

/**
 * 云端收藏记录 → 页面统一格式
 */
function mapCloudRecord(item) {
  return {
    viewKey: item.speciesKey,
    speciesName: item.speciesName,
    latinName: item.latinName || '',
    speciesKey: item.speciesKey,
    category: item.category,
    userPhotoUrl: item.userPhotoUrl || '',
    location: item.location || '未知地点',
    discoveredAt: item.collectedAt,
    rarityTags: item.rarityTags || [],
    description: item.description || '',
    habitat: item.habitat || '',
    order: item.order || '',
    family: item.family || '',
    officialPhotoUrl: item.officialPhotoUrl || ''
  };
}

/**
 * 获取已收藏列表
 * 说明：优先读云端（按 openid 隔离，换机不丢）；云端不可用时降级本地缓存 + mock 历史发现
 * @returns {Promise<Array>} 收藏记录数组，每项含 viewKey 供详情跳转
 */
function getCollections() {
  return callCollections('list')
    .then(result => (result.list || []).map(mapCloudRecord))
    .catch(error => {
      console.error('[api] 云端收藏读取失败，降级本地数据', error);
      return getCollectionsLocal();
    });
}

/**
 * 本地收藏列表（云端不可用时的降级方案）：合并本地缓存与 mock 历史发现
 */
function getCollectionsLocal() {
  let stored = [];
  try {
    stored = wx.getStorageSync(STORAGE_KEYS.COLLECTIONS) || [];
  } catch (error) {
    console.error('[api] 读取收藏列表失败', error);
  }

  // 历史发现 mock 转换为统一收藏格式
  const historical = MOCK_DISCOVERIES.map(item => ({
    viewKey: item.id,
    speciesName: item.speciesName,
    latinName: item.latinName,
    speciesKey: item.speciesKey,
    category: item.category,
    userPhotoUrl: item.userPhotoUrl || '',
    location: item.location,
    discoveredAt: item.discoveredAt,
    rarityTags: item.rarityTags || []
  }));

  // 本地收藏（结果页「收入图鉴」写入）转换为统一格式
  const collected = stored.map(item => ({
    viewKey: item.speciesKey,
    speciesName: item.speciesName,
    latinName: item.latinName,
    speciesKey: item.speciesKey,
    category: item.category,
    userPhotoUrl: item.userPhotoUrl || '',
    location: item.location || '未知地点',
    discoveredAt: item.collectedAt,
    rarityTags: item.rarityTags || []
  }));

  // 本地收藏在前，历史发现在后；按 speciesKey 去重
  const merged = [...collected, ...historical];
  const seen = new Set();
  const list = merged.filter(item => {
    if (seen.has(item.speciesKey)) {
      return false;
    }
    seen.add(item.speciesKey);
    return true;
  });

  return list;
}

/**
 * 收入图鉴
 * 说明：优先写云端；photoFileID（识别时已传云存储）作为收藏的实拍图，本地临时路径会失效不入库；
 *       云端不可用时降级写本地缓存
 * @param {Object} record - 收藏记录（含 speciesKey、photoFileID）
 * @returns {Promise<Object>} { success, duplicated }
 */
function addCollection(record) {
  const payload = {
    ...record,
    userPhotoUrl: record.photoFileID || ''
  };
  delete payload.photoFileID;

  return callCollections('add', { record: payload })
    .then(result => ({ success: true, duplicated: result.duplicated }))
    .catch(error => {
      console.error('[api] 云端收藏失败，降级写本地', error);
      return addCollectionLocal(record);
    });
}

/**
 * 本地收藏（云端不可用时的降级方案）
 */
function addCollectionLocal(record) {
  try {
    const list = wx.getStorageSync(STORAGE_KEYS.COLLECTIONS) || [];
    const inStored = list.some(item => item.speciesKey === record.speciesKey);
    const inHistorical = MOCK_DISCOVERIES.some(item => item.speciesKey === record.speciesKey);
    const duplicated = inStored || inHistorical;

    if (!duplicated) {
      list.unshift({
        ...record,
        collectedAt: new Date().toISOString()
      });
      wx.setStorageSync(STORAGE_KEYS.COLLECTIONS, list);
    }
    return { success: true, duplicated };
  } catch (error) {
    console.error('[api] 收藏失败', error);
    return { success: false, duplicated: false };
  }
}

/**
 * 本地收藏迁移上云（静默执行一次）
 * 说明：上云前收藏的物种存在本地，首次启动时逐条迁移；迁移完成打标记，不再重复执行
 * @returns {Promise}
 */
function migrateLocalCollections() {
  let local = [];
  try {
    if (wx.getStorageSync(STORAGE_KEYS.COLLECTIONS_MIGRATED)) {
      return Promise.resolve();
    }
    local = wx.getStorageSync(STORAGE_KEYS.COLLECTIONS) || [];
  } catch (error) {
    return Promise.resolve();
  }

  if (!local.length) {
    try {
      wx.setStorageSync(STORAGE_KEYS.COLLECTIONS_MIGRATED, 1);
    } catch (error) { /* 忽略 */ }
    return Promise.resolve();
  }

  return callCollections('migrate', { records: local }).then(result => {
    console.log('[api] 本地收藏迁移完成，新增', result.added, '条');
    try {
      wx.setStorageSync(STORAGE_KEYS.COLLECTIONS_MIGRATED, 1);
    } catch (error) { /* 忽略 */ }
  }).catch(error => {
    console.error('[api] 收藏迁移失败，下次启动重试', error);
  });
}

/**
 * 按需补充物种百科内容
 * 说明：识别结果的候选物种默认只有名字（主流程只增强首选），
 *       结果页切换候选时调用此接口补充拉丁名/简介/目科
 * @param {String} name - 物种中文名
 * @returns {Promise<Object|null>} 百科内容或 null（查不到/失败时静默降级）
 */
function enrichSpecies(name) {
  return wx.cloud.callFunction({
    name: 'identify',
    data: { action: 'enrich', name }
  }).then(res => {
    const result = (res && res.result) || {};
    return result.success ? result.enrichment : null;
  }).catch(error => {
    console.error('[api] 百科增强失败', error);
    return null;
  });
}

module.exports = {
  getDashboard,
  identifyImage,
  searchSpecies,
  getDiscoveryById,
  getCollections,
  addCollection,
  enrichSpecies,
  migrateLocalCollections
};
