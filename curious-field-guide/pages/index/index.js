// 好奇图鉴 - 首页逻辑
// 数据流：onLoad 请求仪表盘数据 → setData 渲染 → 交互触发拍照/弹窗/跳转

const api = require('../../utils/api');
const auth = require('../../utils/auth');
const { CATEGORIES, CATEGORY_LIST } = require('../../utils/constants');

/**
 * 将稀有度标签字符串数组解析为 { label, color }
 * 说明：按 PRD 与设计规范映射颜色
 * @param {Array<String>} tags
 * @returns {Array<Object>}
 */
function parseRarityTags(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return [];

  return tags.map(tag => {
    const label = String(tag);
    if (label.includes('首次')) {
      return { label, color: 'green' };
    }
    if (label.includes('连续') || label.includes('streak')) {
      return { label, color: 'orange' };
    }
    if (label.includes('夜间')) {
      return { label, color: 'purple' };
    }
    return { label, color: 'blue' };
  });
}

/**
 * 格式化发现时间
 * 说明：将 ISO 时间转换为「今天 / 昨天 / 前天 / MM.DD」等可读文本
 * @param {String} isoString - ISO 时间字符串
 * @returns {String}
 */
function formatDiscoveryTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

  const diffDays = Math.floor((new Date(todayStr) - new Date(dateStr)) / (1000 * 60 * 60 * 24));

  const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

  if (diffDays === 0) return `今天 ${timeStr}`;
  if (diffDays === 1) return `昨天 ${timeStr}`;
  if (diffDays === 2) return `前天 ${timeStr}`;
  return `${date.getMonth() + 1}月${date.getDate()}日 ${timeStr}`;
}

Page({
  /**
   * 页面数据状态
   */
  data: {
    // 仪表盘数据：累计发现数、连续天数、最近发现列表
    dashboard: {
      totalDiscoveries: 0,
      streakCount: 0,
      recentDiscoveries: []
    },
    // 是否显示隐私政策弹窗
    showPrivacyModal: false,
    // 是否仅浏览模式
    isBrowseOnly: false,
    // 分类 emoji 映射，用于列表渲染
    categoryEmojiMap: {}
  },

  /**
   * 页面加载
   */
  onLoad() {
    this.initCategoryEmojiMap();
    this.checkPrivacyStatus();
    this.loadDashboard();
  },

  /**
   * 初始化分类 emoji 映射
   * 说明：将分类数组转换为 { insect: '🦋', plant: '🌿' } 格式，方便 wxml 使用
   */
  initCategoryEmojiMap() {
    const map = {};
    CATEGORY_LIST.forEach(item => {
      map[item.key] = item.emoji;
    });
    this.setData({ categoryEmojiMap: map });
  },

  /**
   * 检查隐私政策状态
   * 说明：首次打开或未知状态时，弹出隐私政策弹窗
   */
  checkPrivacyStatus() {
    const shouldShow = auth.shouldShowPrivacyModal();
    this.setData({
      showPrivacyModal: shouldShow,
      isBrowseOnly: auth.isBrowseOnly()
    });
  },

  /**
   * 加载首页仪表盘数据
   * 说明：调用 api.getDashboard（当前为 mock），处理时间格式化
   */
  loadDashboard() {
    api.getDashboard().then(res => {
      const recentDiscoveries = res.recentDiscoveries.map(item => ({
        ...item,
        categoryLabel: (CATEGORIES[item.category.toUpperCase()] && CATEGORIES[item.category.toUpperCase()].label) || item.category,
        discoveredAtText: formatDiscoveryTime(item.discoveredAt),
        tags: parseRarityTags(item.rarityTags || [])
      }));

      this.setData({
        dashboard: {
          totalDiscoveries: res.totalDiscoveries,
          streakCount: res.streakCount,
          recentDiscoveries
        }
      });
    }).catch(error => {
      console.error('[index] 加载仪表盘数据失败', error);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    });
  },

  /**
   * 点击中央拍照入口
   * 说明：未同意隐私政策时弹窗；已同意时弹出拍照/相册选择器
   */
  onCameraEntryTap() {
    if (auth.isBrowseOnly()) {
      this.setData({ showPrivacyModal: true });
      return;
    }

    if (!auth.hasAgreedPrivacy()) {
      this.setData({ showPrivacyModal: true });
      return;
    }

    this.showCameraActionSheet();
  },

  /**
   * 显示拍照/相册选择器
   */
  showCameraActionSheet() {
    wx.showActionSheet({
      itemList: ['拍照', '从相册选择'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.takePhoto();
        } else {
          this.chooseFromAlbum();
        }
      }
    });
  },

  /**
   * 调用微信相机拍照
   */
  takePhoto() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera'],
      success: (res) => {
        console.log('[index] 拍照成功', res.tempFilePaths[0]);
        // v1.0 第 1 轮：仅打印路径，真实识别在第 2 轮实现
        wx.showToast({
          title: '照片已获取（mock 识别待实现）',
          icon: 'none'
        });
      },
      fail: (error) => {
        console.error('[index] 拍照失败', error);
      }
    });
  },

  /**
   * 从相册选择照片
   */
  chooseFromAlbum() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: (res) => {
        console.log('[index] 相册选择成功', res.tempFilePaths[0]);
        wx.showToast({
          title: '照片已获取（mock 识别待实现）',
          icon: 'none'
        });
      },
      fail: (error) => {
        console.error('[index] 相册选择失败', error);
      }
    });
  },

  /**
   * 用户同意隐私政策
   */
  onPrivacyAgree() {
    const app = getApp();
    if (app && app.agreePrivacyPolicy) {
      app.agreePrivacyPolicy();
    }
    this.setData({
      showPrivacyModal: false,
      isBrowseOnly: false
    });
  },

  /**
   * 用户选择仅浏览
   */
  onPrivacyBrowseOnly() {
    const app = getApp();
    if (app && app.chooseBrowseOnly) {
      app.chooseBrowseOnly();
    }
    this.setData({
      showPrivacyModal: false,
      isBrowseOnly: true
    });
  },

  /**
   * 用户点击「查看完整隐私政策」
   */
  onViewPrivacyPolicy() {
    wx.navigateTo({
      url: '/pages/privacy/privacy'
    });
  },

  /**
   * 关闭隐私弹窗
   * 说明：点击遮罩时触发，对于重要确认建议不关闭；当前保持弹窗开启
   */
  onPrivacyClose() {
    // 隐私弹窗不允许点遮罩关闭，保持显示
  },

  /**
   * 点击最近发现项
   * 说明：跳转结果页只读模式（结果页在第 2 轮实现，先占位提示）
   */
  onRecentItemTap(event) {
    const id = event.currentTarget.dataset.id;
    console.log('[index] 点击最近发现', id);
    wx.showToast({
      title: '结果页待实现',
      icon: 'none'
    });
  },

  /**
   * 点击「查看全部」
   */
  onViewAll() {
    wx.switchTab({
      url: '/pages/collection/collection'
    });
  }
});
