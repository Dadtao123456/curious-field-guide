// 好奇图鉴 - 认证与权限工具
// 说明：封装微信登录、权限请求、隐私状态判断等操作

const APP = getApp();

/**
 * 检查用户是否已同意隐私政策
 * @returns {Boolean}
 */
function hasAgreedPrivacy() {
  if (!APP || !APP.globalData) {
    return false;
  }
  return APP.globalData.privacyStatus === 'agreed';
}

/**
 * 检查是否为仅浏览模式
 * @returns {Boolean}
 */
function isBrowseOnly() {
  if (!APP || !APP.globalData) {
    return false;
  }
  return APP.globalData.privacyStatus === 'browse-only';
}

/**
 * 检查是否需要显示隐私弹窗
 * @returns {Boolean}
 */
function shouldShowPrivacyModal() {
  if (!APP || !APP.globalData) {
    return true;
  }
  return APP.globalData.privacyStatus === 'unknown';
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
  requestLocationPermission
};
