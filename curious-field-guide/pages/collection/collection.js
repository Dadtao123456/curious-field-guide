// 好奇图鉴 - 图鉴页逻辑
// 数据流：onShow 加载收藏列表 → 计算统计与分类 tabs → 筛选渲染网格 → 点击卡片跳结果页只读模式

const api = require('../../utils/api');
const { CATEGORY_LIST, CATEGORY_EMOJI_MAP } = require('../../utils/constants');
const { parseRarityTags } = require('../../utils/format');

Page({
  /**
   * 页面数据状态
   */
  data: {
    // 全部收藏列表（未筛选）
    allItems: [],
    // 当前展示的列表（按分类筛选后）
    displayList: [],
    // 当前选中的分类 key，空串表示全部
    activeCategory: '',
    // 统计：物种总数、覆盖类别数
    totalCount: 0,
    categoryCount: 0,
    // 收集进度仪表盘：各分类 emoji 与数量
    categoryStats: [],
    // 分类筛选 tabs：全部 + 五个分类，带数量
    tabs: []
  },

  /**
   * 页面显示时刷新
   * 说明：tabBar 页面，从结果页收藏返回后需重新加载
   */
  onShow() {
    this.loadCollections();
  },

  /**
   * 加载收藏列表并计算统计
   */
  loadCollections() {
    api.getCollections().then(list => {
      const items = list.map(item => ({
        ...item,
        emoji: CATEGORY_EMOJI_MAP[item.category] || '🔍',
        tags: parseRarityTags(item.rarityTags || [])
      }));

      this.setData({ allItems: items });
      this.buildStats(items);
      this.applyFilter();
    }).catch(error => {
      console.error('[collection] 加载收藏列表失败', error);
      wx.showToast({ title: '加载失败，请重试', icon: 'none' });
    });
  },

  /**
   * 计算统计数据：总数、类别数、分类仪表盘、筛选 tabs
   * @param {Array} items
   */
  buildStats(items) {
    const countMap = {};
    items.forEach(item => {
      countMap[item.category] = (countMap[item.category] || 0) + 1;
    });

    const categoryStats = CATEGORY_LIST.map(cat => ({
      key: cat.key,
      emoji: cat.emoji,
      label: cat.label,
      count: countMap[cat.key] || 0
    }));

    const tabs = [
      { key: '', label: '全部', count: items.length },
      ...CATEGORY_LIST.map(cat => ({
        key: cat.key,
        label: cat.label,
        count: countMap[cat.key] || 0
      }))
    ];

    this.setData({
      totalCount: items.length,
      categoryCount: Object.keys(countMap).length,
      categoryStats,
      tabs
    });
  },

  /**
   * 点击分类 tab
   */
  onCategoryTap(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ activeCategory: key });
    this.applyFilter();
  },

  /**
   * 按当前分类筛选列表
   */
  applyFilter() {
    const { allItems, activeCategory } = this.data;
    const displayList = activeCategory
      ? allItems.filter(item => item.category === activeCategory)
      : allItems;
    this.setData({ displayList });
  },

  /**
   * 点击卡片，跳转结果页只读模式
   */
  onItemTap(event) {
    const key = event.currentTarget.dataset.key;
    wx.navigateTo({
      url: `/pages/result/result?mode=readonly&id=${key}`
    });
  }
});
