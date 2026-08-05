// 好奇图鉴 - 识别结果页逻辑
// 数据流：onLoad 按 mode 读取识别结果/发现记录 → setData 渲染 → 用户点击收藏/生成卡片

const api = require('../../utils/api');
const auth = require('../../utils/auth');
const { CATEGORIES } = require('../../utils/constants');
const { calculateRarityTags } = require('../../utils/gamification');
const { formatDiscoveryTime, parseRarityTags } = require('../../utils/format');

Page({
  /**
   * 页面数据状态
   */
  data: {
    // 页面模式：identify 新识别结果 / readonly 查看已收藏记录
    mode: 'identify',
    // 是否仅浏览模式（收藏需再次确认隐私）
    isBrowseOnly: false,
    // 当前物种是否已收入图鉴
    isCollected: false,
    // 是否显示隐私政策弹窗
    showPrivacyModal: false,
    // 用户拍摄的照片临时路径
    userPhotoUrl: '',
    // 分类 emoji（官方图占位）
    categoryEmoji: '',
    // 物种信息
    species: {
      name: '',
      latinName: '',
      speciesKey: '',
      category: '',
      categoryLabel: '',
      order: '',
      family: '',
      description: '',
      habitat: ''
    },
    // 稀有度标签对象数组
    tags: [],
    // 发现信息
    discovery: {
      location: '',
      discoveredAtText: ''
    }
  },

  /**
   * 页面加载
   * @param {Object} options - { mode: 'identify' | 'readonly', id }
   */
  onLoad(options) {
    const mode = options.mode || 'identify';
    this.setData({
      mode,
      isBrowseOnly: auth.isBrowseOnly()
    });

    if (mode === 'readonly') {
      this.loadDiscovery(options.id);
    } else {
      this.loadIdentifyResult();
    }
  },

  /**
   * 读取首页拍照后的识别结果
   * 说明：首页调用 api.identifyImage 后把结果写入本地缓存，本页读取并计算标签
   */
  loadIdentifyResult() {
    let result;
    try {
      result = wx.getStorageSync('identify_result');
    } catch (error) {
      result = null;
    }

    if (!result || !result.species) {
      wx.showToast({ title: '识别结果不存在', icon: 'none' });
      return;
    }

    Promise.all([api.getDashboard(), api.getCollections()]).then(([dashboard, collections]) => {
      const existingKeys = collections.map(item => item.speciesKey);
      const tags = calculateRarityTags(
        result.species.speciesKey,
        existingKeys,
        dashboard.streakCount,
        result.discoveredAt
      );

      this.fillPage({
        species: result.species,
        description: result.description,
        habitat: result.habitat,
        userPhotoUrl: result.userPhotoUrl || '',
        tags,
        location: result.location,
        discoveredAt: result.discoveredAt
      });
    });
  },

  /**
   * 读取已收藏/历史发现记录（只读模式）
   * @param {String} id - 发现记录 id
   */
  loadDiscovery(id) {
    api.getDiscoveryById(id).then(record => {
      this.fillPage({
        species: {
          name: record.speciesName,
          latinName: record.latinName,
          speciesKey: record.speciesKey,
          category: record.category,
          order: record.order,
          family: record.family
        },
        description: record.description,
        habitat: record.habitat,
        userPhotoUrl: record.userPhotoUrl || '',
        tags: parseRarityTags(record.rarityTags || []),
        location: record.location,
        discoveredAt: record.discoveredAt,
        readonly: true
      });
    }).catch(error => {
      console.error('[result] 加载发现记录失败', error);
      wx.showToast({ title: '记录不存在', icon: 'none' });
    });
  },

  /**
   * 统一填充页面数据
   * @param {Object} payload
   */
  fillPage(payload) {
    const categoryInfo = CATEGORIES[String(payload.species.category || '').toUpperCase()] || {};

    this.setData({
      userPhotoUrl: payload.userPhotoUrl,
      categoryEmoji: categoryInfo.emoji || '🔍',
      species: {
        name: payload.species.name,
        latinName: payload.species.latinName,
        speciesKey: payload.species.speciesKey,
        category: payload.species.category,
        categoryLabel: categoryInfo.label || '',
        order: payload.species.order || '',
        family: payload.species.family || '',
        description: payload.description || '',
        habitat: payload.habitat || ''
      },
      tags: payload.tags || [],
      discovery: {
        location: payload.location || '未知地点',
        discoveredAtText: formatDiscoveryTime(payload.discoveredAt)
      },
      isCollected: !!payload.readonly
    });
  },

  /**
   * 点击「生成卡片」
   * 说明：分享卡片页在后续轮次实现，当前占位提示
   */
  onShareCard() {
    wx.showToast({
      title: '分享卡片待实现',
      icon: 'none'
    });
  },

  /**
   * 点击「收入图鉴」
   * 说明：仅浏览模式先弹隐私确认；已收藏时按钮禁用；成功后更新按钮状态
   */
  onCollect() {
    if (this.data.isCollected) {
      return;
    }

    if (this.data.isBrowseOnly) {
      this.setData({ showPrivacyModal: true });
      return;
    }

    api.addCollection({
      speciesName: this.data.species.name,
      latinName: this.data.species.latinName,
      speciesKey: this.data.species.speciesKey,
      category: this.data.species.category,
      location: this.data.discovery.location,
      userPhotoUrl: this.data.userPhotoUrl
    }).then(res => {
      if (res.success) {
        this.setData({ isCollected: true });
        wx.showToast({
          title: res.duplicated ? '已在图鉴中' : '已收入图鉴',
          icon: 'none'
        });
      } else {
        wx.showToast({ title: '收藏失败，请重试', icon: 'none' });
      }
    });
  },

  /**
   * 隐私弹窗：同意并继续
   */
  onPrivacyAgree() {
    auth.agreePrivacy();
    this.setData({ showPrivacyModal: false, isBrowseOnly: false });
  },

  /**
   * 隐私弹窗：仅浏览
   */
  onPrivacyBrowseOnly() {
    auth.chooseBrowseOnly();
    this.setData({ showPrivacyModal: false, isBrowseOnly: true });
  },

  /**
   * 隐私弹窗：查看完整政策
   */
  onViewPrivacyPolicy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' });
  },

  /**
   * 隐私弹窗：遮罩点击不关闭
   */
  onPrivacyClose() {
    // 重要确认不响应遮罩关闭
  }
});
