// 好奇图鉴 - 小程序全局入口
// 负责：全局状态管理、隐私授权状态、静默登录占位、首次启动引导

const auth = require('./utils/auth');

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
    this.loadPrivacyStatusFromStorage();
  },

  /**
   * 从本地缓存读取隐私授权状态
   * 说明：用户首次打开时缓存中不存在，返回 'unknown'，触发隐私弹窗
   */
  loadPrivacyStatusFromStorage() {
    try {
      const status = wx.getStorageSync('privacy_status');
      if (status) {
        this.globalData.privacyStatus = status;
      }
    } catch (error) {
      console.error('读取隐私状态失败', error);
      this.globalData.privacyStatus = 'unknown';
    }
  },

  /**
   * 用户同意隐私政策
   * 说明：点击「同意并继续」后调用，写入缓存并触发登录流程
   */
  agreePrivacyPolicy() {
    this.globalData.privacyStatus = 'agreed';
    wx.setStorageSync('privacy_status', 'agreed');
    this.performSilentLogin();
  },

  /**
   * 用户选择仅浏览
   * 说明：不获取 openid，禁用拍照/收藏功能，后续点击敏感功能时再次弹窗
   */
  chooseBrowseOnly() {
    this.globalData.privacyStatus = 'browse-only';
    wx.setStorageSync('privacy_status', 'browse-only');
  },

  /**
   * 静默登录（占位实现）
   * 说明：v1.0 先用本地模拟用户；接入云开发后，通过 wx.login + 云函数获取 openid
   */
  performSilentLogin() {
    // TODO: 接入真实微信登录与云开发
    console.log('[app] 执行静默登录占位');
  }
});
