// 好奇图鉴 - API 请求封装
// 说明：v1.0 先用 mock 数据返回，后续接入真实云函数时只替换此文件内部实现

const { MOCK_SPECIES_LIST, MOCK_DISCOVERIES, MOCK_USER_STATS } = require('../data/species-mock');

/**
 * 获取首页仪表盘数据
 * 说明：返回累计发现数、连续天数、最近发现列表
 * @returns {Promise<Object>} { totalDiscoveries, streakCount, recentDiscoveries }
 */
function getDashboard() {
  return Promise.resolve({
    totalDiscoveries: MOCK_USER_STATS.totalDiscoveries,
    streakCount: MOCK_USER_STATS.streakCount,
    recentDiscoveries: MOCK_DISCOVERIES.slice(0, 5)
  });
}

/**
 * 上传照片并请求识别
 * 说明：v1.0 为 mock，随机返回一个物种；真实实现需上传 buffer 到云函数
 * @param {String} imagePath - 本地图片临时路径
 * @param {Object} options - 附加信息，如 location
 * @returns {Promise<Object>} 识别结果
 */
function identifyImage(imagePath, options = {}) {
  console.log('[api] mock identify', imagePath, options);
  // 随机返回一个 mock 物种作为识别结果
  const randomIndex = Math.floor(Math.random() * MOCK_SPECIES_LIST.length);
  const species = MOCK_SPECIES_LIST[randomIndex];

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
    officialPhotoStatus: 'ready',
    confidence: 0.85,
    source: 'baidu-animal',
    note: null,
    previewTags: [],
    alternatives: [],
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
    category: item.category,
    order: item.order,
    family: item.family,
    description: item.description
  })));
}

/**
 * 按 id 获取单条发现记录（只读模式）
 * 说明：合并物种百科字段，供结果页/详情页展示
 * @param {String} id - 发现记录 id
 * @returns {Promise<Object>} 发现记录 + 物种信息
 */
function getDiscoveryById(id) {
  const discovery = MOCK_DISCOVERIES.find(item => item.id === id);
  if (!discovery) {
    return Promise.reject(new Error('发现记录不存在'));
  }

  const species = MOCK_SPECIES_LIST.find(item => item.speciesKey === discovery.speciesKey) || {};

  return Promise.resolve({
    ...discovery,
    description: species.description || '',
    habitat: species.habitat || '',
    order: species.order || '',
    family: species.family || '',
    officialPhotoUrl: species.officialPhotoUrl || ''
  });
}

/**
 * 获取已收藏列表（mock）
 * 说明：v1.0 存本地缓存，接入云开发后改为查询数据库
 * @returns {Promise<Array>} 收藏记录数组
 */
function getCollections() {
  try {
    return Promise.resolve(wx.getStorageSync('mock_collections') || []);
  } catch (error) {
    console.error('[api] 读取收藏列表失败', error);
    return Promise.resolve([]);
  }
}

/**
 * 收入图鉴（mock）
 * 说明：把识别结果追加到本地收藏列表，重复收藏同一物种会被忽略
 * @param {Object} record - 收藏记录（含 speciesKey）
 * @returns {Promise<Object>} { success, duplicated }
 */
function addCollection(record) {
  try {
    const list = wx.getStorageSync('mock_collections') || [];
    const duplicated = list.some(item => item.speciesKey === record.speciesKey);
    if (!duplicated) {
      list.unshift({
        ...record,
        collectedAt: new Date().toISOString()
      });
      wx.setStorageSync('mock_collections', list);
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
