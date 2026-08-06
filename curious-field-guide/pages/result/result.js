// 好奇图鉴 - 识别结果页逻辑
// 数据流：onLoad 按 mode 读取识别结果/发现记录 → setData 渲染 → 用户点击收藏/生成卡片/切换候选

const api = require('../../utils/api');
const auth = require('../../utils/auth');
const { CATEGORIES } = require('../../utils/constants');
const { calculateRarityTags } = require('../../utils/gamification');
const { formatDiscoveryTime, parseRarityTags } = require('../../utils/format');

// 低置信度阈值（PRD：置信度 < 0.6 展示黄色提示条）
const LOW_CONFIDENCE_THRESHOLD = 0.6;

Page({
  /**
   * 页面数据状态
   */
  data: {
    // 页面模式：identify 新识别结果 / readonly 查看已收藏记录
    mode: 'identify',
    // 是否仅浏览模式（收藏需再次确认隐私）
    isBrowseOnly: false,
    // 识别是否失败（展示失败页分支）
    isFailed: false,
    // 失败提示文案
    failMessage: '',
    // 是否为低置信度结果（展示「识别不确定」黄条）
    isUncertain: false,
    // 是否为菌类结果（展示「仅供参考」黄条）
    isFungi: false,
    // 识别置信度（0~1，用于展示）
    confidenceText: '',
    // 「其他可能」候选列表与展开状态
    alternatives: [],
    alternativesExpanded: false,
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

    if (!result) {
      wx.showToast({ title: '识别结果不存在', icon: 'none' });
      return;
    }

    // 失败分支：所有来源均无有效结果
    if (!result.success) {
      this.setData({
        isFailed: true,
        failMessage: result.message || '暂时无法识别，可能是新物种，也可能是照片不够清晰',
        userPhotoUrl: result.userPhotoUrl || ''
      });
      return;
    }

    this.setData({
      userPhotoUrl: result.userPhotoUrl || '',
      isUncertain: (result.confidence || 0) < LOW_CONFIDENCE_THRESHOLD,
      isFungi: result.species.category === 'fungi',
      confidenceText: (result.confidence || 0).toFixed(2),
      alternatives: result.alternatives || []
    });

    this.renderSpecies(result.species, {
      description: result.description,
      habitat: result.habitat,
      location: result.location,
      discoveredAt: result.discoveredAt
    });
  },

  /**
   * 读取已收藏/历史发现记录（只读模式）
   * @param {String} id - 发现记录 id
   */
  loadDiscovery(id) {
    api.getDiscoveryById(id).then(record => {
      this.setData({
        userPhotoUrl: record.userPhotoUrl || '',
        isFungi: record.category === 'fungi',
        tags: parseRarityTags(record.rarityTags || []),
        discovery: {
          location: record.location || '未知地点',
          discoveredAtText: formatDiscoveryTime(record.discoveredAt)
        },
        isCollected: true
      });

      this.fillSpecies({
        name: record.speciesName,
        latinName: record.latinName,
        speciesKey: record.speciesKey,
        category: record.category,
        order: record.order,
        family: record.family
      }, record.description, record.habitat);
    }).catch(error => {
      console.error('[result] 加载发现记录失败', error);
      wx.showToast({ title: '记录不存在', icon: 'none' });
    });
  },

  /**
   * 渲染物种信息（识别模式：需要计算稀有度标签）
   * @param {Object} species - 物种对象
   * @param {Object} extra - { description, habitat, location, discoveredAt }
   */
  renderSpecies(species, extra) {
    Promise.all([api.getDashboard(), api.getCollections()]).then(([dashboard, collections]) => {
      const existingKeys = collections.map(item => item.speciesKey);
      const tags = calculateRarityTags(
        species.speciesKey,
        existingKeys,
        dashboard.streakCount,
        extra.discoveredAt
      );

      this.setData({
        tags,
        discovery: {
          location: extra.location || '未知地点',
          discoveredAtText: formatDiscoveryTime(extra.discoveredAt)
        }
      });
      this.fillSpecies(species, extra.description, extra.habitat);
    });
  },

  /**
   * 填充物种展示字段
   * @param {Object} species
   * @param {String} description
   * @param {String} habitat
   */
  fillSpecies(species, description, habitat) {
    const categoryInfo = CATEGORIES[String(species.category || '').toUpperCase()] || {};

    this.setData({
      categoryEmoji: categoryInfo.emoji || '🔍',
      species: {
        name: species.name,
        latinName: species.latinName,
        speciesKey: species.speciesKey,
        category: species.category,
        categoryLabel: categoryInfo.label || '',
        order: species.order || '',
        family: species.family || '',
        description: description || '',
        habitat: habitat || ''
      }
    });
  },

  /**
   * 展开/收起「其他可能」候选区
   */
  onToggleAlternatives() {
    this.setData({
      alternativesExpanded: !this.data.alternativesExpanded
    });
  },

  /**
   * 点击候选物种，切换查看该候选的识别结果
   * 说明：切换后标签按新物种重新计算；候选列表与提示条状态保持不变
   */
  onAlternativeTap(event) {
    const index = event.currentTarget.dataset.index;
    const candidate = this.data.alternatives[index];
    if (!candidate) {
      return;
    }

    this.renderSpecies({
      name: candidate.name,
      latinName: candidate.latinName,
      speciesKey: candidate.speciesKey,
      category: candidate.category,
      order: candidate.order,
      family: candidate.family
    }, {
      description: candidate.description,
      habitat: candidate.habitat,
      location: this.data.discovery.location,
      discoveredAt: new Date().toISOString()
    });

    wx.pageScrollTo({ scrollTop: 0, duration: 200 });
  },

  /**
   * 点击「重拍」
   * 说明：返回首页重新拍照
   */
  onRetake() {
    wx.navigateBack();
  },

  /**
   * 点击「手动搜索」
   * 说明：跳转手动搜索页（该页在后续轮次实现）
   */
  onManualSearch() {
    wx.navigateTo({
      url: '/pages/manual-search/manual-search'
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
