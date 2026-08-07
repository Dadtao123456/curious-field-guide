// 好奇图鉴 - 小程序全局入口
// 负责：全局状态管理、隐私授权状态、静默登录占位、首次启动引导

const auth = require('./utils/auth');
const { STORAGE_KEYS, CLOUD_ENV_ID } = require('./utils/constants');

App({
  /**
   * 全局状态对象
   * 说明：用于在隐私弹窗、首页、权限请求之间共享状态
   */
  globalData: {
    // privacyStatus: 'unknown' | 'agreed' | 'browse-only'
    // unknown: 尚未处理；agreed: 已同意；browse-only: 仅浏览
    privacyStatus: 'unknown',
    // 用户信息占位，后续通过微信静默登录获取 openid
    userInfo: null,
    // 地理位置总开关，默认开启
    locationEnabled: true
  },

  /**
   * 小程序启动时执行
   * 说明：读取本地缓存的隐私授权状态，初始化全局数据
   */
  onLaunch() {
    this.initCloud();
    this.loadPrivacyStatusFromStorage();
  },

  /**
   * 初始化微信云开发
   * 说明：基础库过低不支持云开发时降级（真实识别不可用，mock 场景仍可自测）
   */
  initCloud() {
    if (!wx.cloud) {
      console.error('[app] 当前微信版本过低，无法使用云开发能力');
      return;
    }
    wx.cloud.init({
      env: CLOUD_ENV_ID,
      traceUser: true
    });
  },

  /**
   * 从本地缓存读取隐私授权状态
   * 说明：用户首次打开时缓存中不存在，返回 'unknown'，触发隐私弹窗
   */
  loadPrivacyStatusFromStorage() {
    try {
      const status = wx.getStorageSync(STORAGE_KEYS.PRIVACY_STATUS);
      if (status) {
        this.globalData.privacyStatus = status;
      }
    } catch (error) {
      console.error('读取隐私状态失败', error);
      this.globalData.privacyStatus = 'unknown';
    }
  }
});
