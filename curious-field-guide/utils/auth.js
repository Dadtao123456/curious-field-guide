// 好奇图鉴 - 认证与权限工具
// 说明：封装隐私授权状态、静默登录、权限请求等操作
// 注意：不要在模块顶层调用 getApp()，App 注册完成前会返回 undefined

/**
 * 读取全局隐私状态
 * @returns {String} 'unknown' | 'agreed' | 'browse-only'
 */
function getPrivacyStatus() {
  const app = getApp();
  if (!app || !app.globalData) {
    return 'unknown';
  }
  return app.globalData.privacyStatus || 'unknown';
}

/**
 * 检查用户是否已同意隐私政策
 * @returns {Boolean}
 */
function hasAgreedPrivacy() {
  return getPrivacyStatus() === 'agreed';
}

/**
 * 检查是否为仅浏览模式
 * @returns {Boolean}
 */
function isBrowseOnly() {
  return getPrivacyStatus() === 'browse-only';
}

/**
 * 检查是否需要显示隐私弹窗
 * @returns {Boolean}
 */
function shouldShowPrivacyModal() {
  return getPrivacyStatus() === 'unknown';
}

/**
 * 用户同意隐私政策
 * 说明：写入全局状态与本地缓存，并触发静默登录占位
 */
function agreePrivacy() {
  const app = getApp();
  if (app && app.globalData) {
    app.globalData.privacyStatus = 'agreed';
  }
  try {
    wx.setStorageSync('privacy_status', 'agreed');
  } catch (error) {
    console.error('[auth] 写入隐私状态失败', error);
  }
  performSilentLogin();
}

/**
 * 用户选择仅浏览
 * 说明：不获取 openid，禁用拍照/收藏功能，后续点击敏感功能时再次弹窗
 */
function chooseBrowseOnly() {
  const app = getApp();
  if (app && app.globalData) {
    app.globalData.privacyStatus = 'browse-only';
  }
  try {
    wx.setStorageSync('privacy_status', 'browse-only');
  } catch (error) {
    console.error('[auth] 写入隐私状态失败', error);
  }
}

/**
 * 静默登录（占位实现）
 * 说明：v1.0 先用本地模拟用户；接入云开发后，通过 wx.login + 云函数获取 openid
 */
function performSilentLogin() {
  // TODO: 接入真实微信登录与云开发
  console.log('[auth] 执行静默登录占位');
}

/**
 * 请求地理位置权限（预留）
 * 说明：记录发现地点时调用；拍照/相册权限由 wx.chooseImage 流程自动触发系统授权，无需预申请
 * @returns {Promise<Boolean>}
 */
function requestLocationPermission() {
  return new Promise((resolve) => {
    wx.authorize({
      scope: 'scope.userLocation',
      success: () => resolve(true),
      fail: () => resolve(false)
    });
  });
}

module.exports = {
  hasAgreedPrivacy,
  isBrowseOnly,
  shouldShowPrivacyModal,
  agreePrivacy,
  chooseBrowseOnly,
  requestLocationPermission
};
