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
 * 说明：v1.0 为 mock；真实实现需上传 buffer 到云函数
 * @param {String} imagePath - 本地图片临时路径
 * @param {Object} options - 附加信息，如 location、scenario（mock 测试场景）
 * @returns {Promise<Object>} 识别结果
 */
function identifyImage(imagePath, options = {}) {
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
 * 说明：v1.0 为 mock，根据关键词过滤 mock 物种列表
 * @param {String} keyword - 搜索关键词
 * @returns {Promise<Array>} 候选物种列表
 */
function searchSpecies(keyword) {
  const lowerKeyword = keyword.toLowerCase();

  const results = MOCK_SPECIES_LIST.filter(item => {
    return item.name.includes(keyword) ||
           item.latinName.toLowerCase().includes(lowerKeyword) ||
           item.family.includes(keyword) ||
           item.description.includes(keyword);
  });

  return Promise.resolve(results.map(item => ({
    name: item.name,
    latinName: item.latinName,
    speciesKey: item.speciesKey,
    category: item.category,
    order: item.order,
    family: item.family,
    description: item.description,
    habitat: item.habitat
  })));
}

/**
 * 按 key 获取单条发现/收藏记录（只读模式）
 * 说明：key 兼容发现记录 id 与物种 speciesKey；合并物种百科字段，供结果页/详情页展示
 * @param {String} key - 发现记录 id 或物种 speciesKey
 * @returns {Promise<Object>} 发现记录 + 物种信息
 */
function getDiscoveryById(key) {
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
        rarityTags: []
      };
    }
  }

  if (!record) {
    return Promise.reject(new Error('发现记录不存在'));
  }

  const species = MOCK_SPECIES_LIST.find(item => item.speciesKey === record.speciesKey) || {};

  return Promise.resolve({
    ...record,
    description: species.description || '',
    habitat: species.habitat || '',
    order: species.order || '',
    family: species.family || '',
    officialPhotoUrl: species.officialPhotoUrl || ''
  });
}

/**
 * 获取已收藏列表（mock）
 * 说明：v1.0 合并「历史发现 mock」与「本地收藏缓存」，按 speciesKey 去重；
 *       接入云开发后改为查询数据库
 * @returns {Promise<Array>} 收藏记录数组，每项含 viewKey 供详情跳转
 */
function getCollections() {
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

  return Promise.resolve(list);
}

/**
 * 收入图鉴（mock）
 * 说明：把识别结果追加到本地收藏列表，重复收藏同一物种会被忽略
 * @param {Object} record - 收藏记录（含 speciesKey）
 * @returns {Promise<Object>} { success, duplicated }
 */
function addCollection(record) {
  try {
    const list = wx.getStorageSync(STORAGE_KEYS.COLLECTIONS) || [];
    const duplicated = list.some(item => item.speciesKey === record.speciesKey);
    if (!duplicated) {
      list.unshift({
        ...record,
        collectedAt: new Date().toISOString()
      });
      wx.setStorageSync(STORAGE_KEYS.COLLECTIONS, list);
    }
    return Promise.resolve({ success: true, duplicated });
  } catch (error) {
    console.error('[api] 收藏失败', error);
    return Promise.resolve({ success: false, duplicated: false });
  }
}

module.exports = {
  getDashboard,
  identifyImage,
  searchSpecies,
  getDiscoveryById,
  getCollections,
  addCollection
};
