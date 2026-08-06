// 好奇图鉴 - 我的页逻辑
// 数据流：onShow 加载收藏数据 → 计算统计/徽章 → 渲染；菜单项跳转或占位提示

const api = require('../../utils/api');
const { summarizeCollections, evaluateBadges } = require('../../utils/gamification');

Page({
  /**
   * 页面数据状态
   */
  data: {
    // 用户信息（mock 昵称，接入微信登录后替换）
    nickname: '好奇探索者',
    avatarEmoji: '🌿',
    // 加入天数（按最早发现日期计算）
    joinDays: 0,
    // 三项统计
    totalCount: 0,
    categoryCount: 0,
    streak: 0,
    // 徽章列表（含解锁状态）
    badges: [],
    // 已解锁徽章数
    unlockedCount: 0,
    // 当前查看详情的徽章
    activeBadge: null,
    // 是否显示徽章详情卡片
    showBadgeModal: false
  },

  /**
   * 页面显示时刷新
   * 说明：tabBar 页面，收藏变化后统计与徽章需同步
   */
  onShow() {
    this.loadProfile();
  },

  /**
   * 加载收藏数据并计算统计、徽章
   */
  loadProfile() {
    api.getCollections().then(list => {
      const summary = summarizeCollections(list);

      // 加入天数：最早发现日期到今天，至少 1 天；无数据时为 0
      const joinDays = summary.earliest
        ? Math.max(1, Math.floor((Date.now() - new Date(summary.earliest).getTime()) / (1000 * 60 * 60 * 24)) + 1)
        : 0;

      const badges = evaluateBadges(summary);

      this.setData({
        totalCount: summary.totalCount,
        categoryCount: summary.categoryCount,
        streak: summary.streak,
        joinDays,
        badges,
        unlockedCount: badges.filter(badge => badge.unlocked).length
      });
    }).catch(error => {
      console.error('[profile] 加载失败', error);
      wx.showToast({ title: '加载失败，请重试', icon: 'none' });
    });
  },

  /**
   * 点击徽章，弹出详情卡片
   * 说明：网格中未解锁徽章以问号保密，点击后揭晓名称、达成条件与进度
   */
  onBadgeTap(event) {
    const index = event.currentTarget.dataset.index;
    const badge = this.data.badges[index];
    if (!badge) {
      return;
    }
    this.setData({
      activeBadge: badge,
      showBadgeModal: true
    });
  },

  /**
   * 关闭徽章详情卡片
   */
  onCloseBadgeModal() {
    this.setData({ showBadgeModal: false });
  },

  /**
   * 阻止点击卡片内容时冒泡到遮罩
   */
  onModalContentTap() {
    // 仅阻止冒泡，不执行操作
  },

  /**
   * 点击「导出观察手册」
   * 说明：PDF 导出在后续版本实现
   */
  onExportHandbook() {
    wx.showToast({ title: '导出功能待实现', icon: 'none' });
  },

  /**
   * 点击「隐私设置」
   */
  onPrivacySetting() {
    wx.navigateTo({ url: '/pages/privacy/privacy' });
  },

  /**
   * 点击「关于好奇图鉴」
   */
  onAbout() {
    wx.showModal({
      title: '好奇图鉴',
      content: '一本随身携带的自然观察手账。\n版本 v1.0（开发中）',
      showCancel: false,
      confirmText: '知道了'
    });
  }
});
