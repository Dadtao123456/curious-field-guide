// 好奇图鉴 - 定位工具
// 说明：拍照识别前静默获取位置并解析为地名；
//       用户拒绝授权/定位失败/解析失败都静默降级为空串，地点显示「未知地点」，不影响识别主流程

// 定位整体超时（毫秒）：超时按无位置处理，不阻塞识别
const LOCATION_TIMEOUT = 5000;

/**
 * 获取当前位置的可读地名
 * @returns {Promise<String>} 地名（如"奥林匹克森林公园"）；失败返回空串
 */
function getLocationText() {
  return Promise.race([
    resolveLocation(),
    new Promise(resolve => setTimeout(() => resolve(''), LOCATION_TIMEOUT))
  ]);
}

/**
 * 调微信定位 + 云端逆地址解析
 * @returns {Promise<String>}
 */
function resolveLocation() {
  return new Promise(resolve => {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        wx.cloud.callFunction({
          name: 'getLocationName',
          data: { latitude: res.latitude, longitude: res.longitude }
        }).then(r => {
          const result = (r && r.result) || {};
          resolve(result.success ? result.address : '');
        }).catch(() => resolve(''));
      },
      fail: (error) => {
        // 用户拒绝授权或系统定位失败，静默降级
        console.log('[location] 定位失败，按无位置处理', error && error.errMsg);
        resolve('');
      }
    });
  });
}

module.exports = {
  getLocationText
};
