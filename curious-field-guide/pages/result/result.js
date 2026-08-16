// 好奇图鉴 - 识别结果页逻辑
// 数据流：onLoad 按 mode 读取识别结果/发现记录 → setData 渲染 → 用户点击收藏/生成卡片/切换候选

const api = require('../../utils/api');
const auth = require('../../utils/auth');
const { CATEGORIES, STORAGE_KEYS } = require('../../utils/constants');
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
    // 是否为手动搜索来源（无置信度，展示来源提示条）
    isManualSearch: false,
    // 识别置信度（0~1，用于展示）
    confidenceText: '',
    // 候选池：首选 + 其他候选，切换后当前物种从候选区移除
    candidatePool: [],
    currentCandidateIndex: 0,
    // 候选区展示列表（候选池中除当前物种外的项，带 poolIndex）
    displayAlternatives: [],
    // 「其他可能」展开状态
    alternativesExpanded: false,
    // 官方标准图 URL（mock 阶段为空，显示占位）
    officialPhotoUrl: '',
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
      result = wx.getStorageSync(STORAGE_KEYS.IDENTIFY_RESULT);
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

    // 构建候选池：首选物种 + 其他候选，支持轮换切换
    // confidenceText 为格式化后的置信度展示文本（真实接口返回多位小数，统一保留两位）
    const formatConfidence = value => (value != null ? (Number(value) || 0).toFixed(2) : '');
    const pool = [{
      name: result.species.name,
      latinName: result.species.latinName,
      speciesKey: result.species.speciesKey,
      category: result.species.category,
      order: result.species.order,
      family: result.species.family,
      description: result.description,
      habitat: result.habitat,
      confidence: result.confidence || 0,
      confidenceText: formatConfidence(result.confidence)
    }, ...(result.alternatives || []).map(item => ({
      ...item,
      confidenceText: formatConfidence(item.confidence)
    }))];

    // 置信度可能为 null（手动搜索无置信度），此时不展示低置信度黄条
    // isFallback：垂类接口不达标、用通用识别兜底的结果，同样提示「识别不确定」
    const confidence = result.confidence;

    this.setData({
      userPhotoUrl: result.userPhotoUrl || '',
      officialPhotoUrl: result.officialPhotoUrl || '',
      isUncertain: (confidence != null && confidence < LOW_CONFIDENCE_THRESHOLD) || !!result.isFallback,
      isFungi: result.species.category === 'fungi',
      isManualSearch: !!result.isManualSearch,
      confidenceText: confidence != null ? confidence.toFixed(2) : '',
      candidatePool: pool,
      currentCandidateIndex: 0
    });
    this.refreshAlternatives();

    this.renderSpecies(result.species, {
      description: result.description,
      habitat: result.habitat,
      location: result.location,
      discoveredAt: result.discoveredAt
    });

    // 手动搜索/兜底结果可能无百科内容，按需懒加载补充
    this.lazyEnrichCandidate(0);
  },

  /**
   * 读取已收藏/历史发现记录（只读模式）
   * @param {String} id - 发现记录 id
   */
  loadDiscovery(id) {
    api.getDiscoveryById(id).then(record => {
      this.setData({
        userPhotoUrl: record.userPhotoUrl || '',
        officialPhotoUrl: record.officialPhotoUrl || '',
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
        // 已在图鉴中的物种，按钮直接呈现已收藏状态
        isCollected: existingKeys.includes(species.speciesKey),
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
   * 刷新候选区展示列表
   * 说明：候选池中除当前展示物种外的项，附带 poolIndex 供切换定位
   */
  refreshAlternatives() {
    const { candidatePool, currentCandidateIndex } = this.data;
    const displayAlternatives = candidatePool
      .map((item, poolIndex) => ({ ...item, poolIndex }))
      .filter(item => item.poolIndex !== currentCandidateIndex);
    this.setData({ displayAlternatives });
  },

  /**
   * 点击候选物种，切换查看该候选的识别结果
   * 说明：切换为轮换制——当前物种回到候选区，被点候选成为当前展示；
   *       标签按新物种重新计算，黄条状态按当前候选置信度更新
   */
  onAlternativeTap(event) {
    const poolIndex = event.currentTarget.dataset.poolIndex;
    const candidate = this.data.candidatePool[poolIndex];
    if (!candidate) {
      return;
    }

    this.setData({
      currentCandidateIndex: poolIndex,
      isFungi: candidate.category === 'fungi',
      isUncertain: (candidate.confidence || 0) < LOW_CONFIDENCE_THRESHOLD,
      confidenceText: (candidate.confidence || 0).toFixed(2)
    });
    this.refreshAlternatives();

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

    // 候选默认不带百科内容（主流程只增强首选），切换后按需补充
    this.lazyEnrichCandidate(poolIndex);
  },

  /**
   * 按需补充候选物种的百科内容
   * 说明：候选/手动搜索结果默认只有名字；补充成功后若用户仍停留在该候选，同步刷新展示
   * @param {Number} poolIndex - 候选池下标
   */
  lazyEnrichCandidate(poolIndex) {
    const candidate = this.data.candidatePool[poolIndex];
    if (!candidate || candidate.description) {
      return;
    }

    api.enrichSpecies(candidate.name).then(enrichment => {
      // 用户可能已切走，只更新仍停留在该候选的情况
      if (!enrichment || this.data.currentCandidateIndex !== poolIndex) {
        return;
      }
      const pool = this.data.candidatePool.slice();
      pool[poolIndex] = { ...pool[poolIndex], ...enrichment };
      this.setData({ candidatePool: pool });
      this.fillSpecies({
        name: pool[poolIndex].name,
        latinName: enrichment.latinName || pool[poolIndex].latinName,
        speciesKey: pool[poolIndex].speciesKey,
        category: pool[poolIndex].category,
        order: enrichment.order || pool[poolIndex].order,
        family: enrichment.family || pool[poolIndex].family
      }, enrichment.description, pool[poolIndex].habitat);
    });
  },

  /**
   * 点击照片查看大图
   * 说明：生活照/官方图有 URL 时调起微信图片预览；官方图占位时提示整理中
   */
  onPhotoTap(event) {
    const type = event.currentTarget.dataset.type;
    const url = type === 'official' ? this.data.officialPhotoUrl : this.data.userPhotoUrl;

    if (!url) {
      if (type === 'official') {
        wx.showToast({ title: '标准图整理中', icon: 'none' });
      }
      return;
    }

    wx.previewImage({
      urls: [url],
      current: url
    });
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
   * 说明：把当前物种数据写入缓存，跳转分享卡片页生成可保存/分享的卡片图
   */
  onShareCard() {
    const shareData = {
      name: this.data.species.name,
      latinName: this.data.species.latinName,
      category: this.data.species.category,
      categoryLabel: this.data.species.categoryLabel,
      categoryEmoji: this.data.categoryEmoji,
      tags: this.data.tags,
      location: this.data.discovery.location,
      discoveredAtText: this.data.discovery.discoveredAtText
    };

    try {
      wx.setStorageSync(STORAGE_KEYS.SHARE_CARD, shareData);
      wx.navigateTo({ url: '/pages/share-card/share-card' });
    } catch (error) {
      console.error('[result] 写入分享数据失败', error);
      wx.showToast({ title: '生成失败，请重试', icon: 'none' });
    }
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
      order: this.data.species.order,
      family: this.data.species.family,
      // 百科内容一并收藏，图鉴/最近发现打开时才能完整展示
      description: this.data.species.description,
      habitat: this.data.species.habitat,
      officialPhotoUrl: this.data.officialPhotoUrl,
      location: this.data.discovery.location,
      userPhotoUrl: this.data.userPhotoUrl,
      rarityTags: this.data.tags.map(tag => tag.label)
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
