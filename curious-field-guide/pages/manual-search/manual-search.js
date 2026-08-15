// 好奇图鉴 - 手动搜索页逻辑
// 数据流：输入关键词 → api.searchSpecies → 渲染候选列表 → 点击候选带数据进结果页（手动搜索模式）

const api = require('../../utils/api');
const { CATEGORY_ICON_MAP, STORAGE_KEYS } = require('../../utils/constants');

Page({
  /**
   * 页面数据状态
   */
  data: {
    // 搜索关键词
    keyword: '',
    // 是否正在搜索
    searching: false,
    // 是否已执行过搜索（区分初始态与无结果态）
    searched: false,
    // 候选物种列表
    results: []
  },

  /**
   * 输入框内容变化
   */
  onKeywordInput(event) {
    this.setData({ keyword: event.detail.value });
  },

  /**
   * 执行搜索（点击按钮或键盘搜索键）
   */
  onSearch() {
    const keyword = this.data.keyword.trim();
    if (!keyword) {
      wx.showToast({ title: '先输入关键词', icon: 'none' });
      return;
    }

    this.setData({ searching: true });

    api.searchSpecies(keyword).then(results => {
      const list = results.map(item => ({
        ...item,
        icon: CATEGORY_ICON_MAP[item.category] || ''
      }));

      this.setData({
        searching: false,
        searched: true,
        results: list
      });
    }).catch(error => {
      console.error('[manual-search] 搜索失败', error);
      this.setData({ searching: false });
      wx.showToast({ title: '搜索服务暂时不可用，请稍后再试', icon: 'none' });
    });
  },

  /**
   * 点击候选物种
   * 说明：构造手动搜索模式的识别结果写入缓存，跳转结果页确认
   */
  onCandidateTap(event) {
    const index = event.currentTarget.dataset.index;
    const candidate = this.data.results[index];
    if (!candidate) {
      return;
    }

    const result = {
      success: true,
      isManualSearch: true,
      species: {
        name: candidate.name,
        latinName: candidate.latinName,
        speciesKey: candidate.speciesKey,
        category: candidate.category,
        order: candidate.order,
        family: candidate.family
      },
      description: candidate.description,
      habitat: candidate.habitat,
      officialPhotoUrl: '',
      confidence: null,
      source: 'manual-search',
      alternatives: [],
      location: '未知地点',
      discoveredAt: new Date().toISOString()
    };

    try {
      wx.setStorageSync(STORAGE_KEYS.IDENTIFY_RESULT, result);
      wx.navigateTo({ url: '/pages/result/result?mode=identify' });
    } catch (error) {
      console.error('[manual-search] 写入搜索结果失败', error);
      wx.showToast({ title: '跳转失败，请重试', icon: 'none' });
    }
  }
});
