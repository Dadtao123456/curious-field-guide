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
 * 请求相机权限
 * 说明：拍照识别前调用
 * @returns {Promise<Boolean>}
 */
function requestCameraPermission() {
  return new Promise((resolve) => {
    wx.authorize({
      scope: 'scope.camera',
      success: () => resolve(true),
      fail: () => resolve(false)
    });
  });
}

/**
 * 请求相册权限
 * 说明：从相册选择照片前调用
 * @returns {Promise<Boolean>}
 */
function requestPhotoAlbumPermission() {
  return new Promise((resolve) => {
    wx.authorize({
      scope: 'scope.writePhotosAlbum',
      success: () => resolve(true),
      fail: () => resolve(false)
    });
  });
}

/**
 * 请求地理位置权限
 * 说明：记录发现地点前调用
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
  requestCameraPermission,
  requestPhotoAlbumPermission,
  requestLocationPermission
};
