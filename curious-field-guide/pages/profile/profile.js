// 好奇图鉴 - 我的页逻辑
// 数据流：onShow 加载收藏数据 + 用户资料 → 计算统计/徽章 → 渲染；菜单项跳转或占位提示

const api = require('../../utils/api');
const { summarizeCollections, evaluateBadges } = require('../../utils/gamification');
const { STORAGE_KEYS } = require('../../utils/constants');

// 默认资料：未设置头像昵称时的展示
const DEFAULT_PROFILE = {
  nickname: '好奇宝宝',
  avatarEmoji: '🌿'
};

Page({
  /**
   * 页面数据状态
   */
  data: {
    // 用户昵称（默认「好奇宝宝」，可在编辑资料中修改）
    nickname: DEFAULT_PROFILE.nickname,
    // 用户头像图片路径（微信 chooseAvatar 返回的临时路径）；为空时显示默认 emoji
    avatarUrl: '',
    // 默认头像 emoji（无头像时展示）
    avatarEmoji: DEFAULT_PROFILE.avatarEmoji,
    // 是否显示编辑资料弹层
    showEditModal: false,
    // 编辑中的草稿（保存才生效）
    draftAvatarUrl: '',
    draftNickname: '',
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
   * 说明：tabBar 页面，收藏变化后统计与徽章需同步；用户资料也从缓存刷新
   */
  onShow() {
    this.loadUserProfile();
    this.loadProfile();
  },

  /**
   * 从本地缓存读取用户资料
   * 说明：取不到时使用默认资料（好奇宝宝 + 🌿）
   */
  loadUserProfile() {
    try {
      const profile = wx.getStorageSync(STORAGE_KEYS.USER_PROFILE);
      if (profile && profile.nickname) {
        this.setData({
          nickname: profile.nickname,
          avatarUrl: profile.avatarUrl || ''
        });
      }
    } catch (error) {
      console.error('[profile] 读取用户资料失败', error);
    }
  },

  /**
   * 点击用户信息区，打开编辑资料弹层
   */
  onEditProfile() {
    this.setData({
      showEditModal: true,
      draftAvatarUrl: this.data.avatarUrl,
      draftNickname: this.data.nickname
    });
  },

  /**
   * 微信官方「选择头像」回调
   * 说明：返回的是临时路径，仅本次安装有效；收藏上云后需转存云存储
   */
  onChooseAvatar(event) {
    this.setData({ draftAvatarUrl: event.detail.avatarUrl });
  },

  /**
   * 昵称输入（type="nickname" 自带微信昵称联想）
   */
  onNicknameInput(event) {
    this.setData({ draftNickname: event.detail.value });
  },

  /**
   * 保存资料：写本地缓存并刷新展示
   */
  onSaveProfile() {
    const nickname = (this.data.draftNickname || '').trim();
    if (!nickname) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }

    const profile = {
      nickname,
      avatarUrl: this.data.draftAvatarUrl
    };
    try {
      wx.setStorageSync(STORAGE_KEYS.USER_PROFILE, profile);
      this.setData({
        nickname: profile.nickname,
        avatarUrl: profile.avatarUrl,
        showEditModal: false
      });
      wx.showToast({ title: '已保存', icon: 'none' });
    } catch (error) {
      console.error('[profile] 保存用户资料失败', error);
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    }
  },

  /**
   * 关闭编辑资料弹层（不保存）
   */
  onCloseEditModal() {
    this.setData({ showEditModal: false });
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
   * 说明：仅已解锁徽章可点开查看成就内容；未解锁徽章保持问号保密，点击不响应
   */
  onBadgeTap(event) {
    const index = event.currentTarget.dataset.index;
    const badge = this.data.badges[index];
    if (!badge || !badge.unlocked) {
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
