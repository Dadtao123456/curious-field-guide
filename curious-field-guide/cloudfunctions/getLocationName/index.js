// 好奇图鉴 - 逆地址解析云函数
// 职责：把经纬度转换为可读地名（如"奥林匹克森林公园"），用于标注发现地点
// 数据源：腾讯位置服务 WebServiceAPI（需申请 key，放在 config.local.js 或环境变量）

const https = require('https');
const { TENCENT_MAP_KEY } = require('./config');

const REQUEST_TIMEOUT = 5000;

/**
 * 发起 HTTPS GET 请求
 */
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error('位置服务返回格式异常'));
        }
      });
    });
    req.setTimeout(REQUEST_TIMEOUT, () => {
      req.destroy(new Error('位置服务请求超时'));
    });
    req.on('error', reject);
  });
}

/**
 * 云函数入口
 * @param {Object} event - { latitude, longitude }（gcj02 坐标系）
 */
exports.main = async (event) => {
  const { latitude, longitude } = event || {};

  if (!latitude || !longitude) {
    return { success: false, address: '' };
  }
  if (!TENCENT_MAP_KEY) {
    console.error('[getLocationName] 未配置腾讯位置服务 key');
    return { success: false, address: '' };
  }

  try {
    const url = `https://apis.map.qq.com/ws/geocoder/v1/?location=${latitude},${longitude}&key=${TENCENT_MAP_KEY}`;
    const data = await httpsGet(url);

    if (data.status !== 0 || !data.result) {
      console.error('[getLocationName] 逆地址解析失败', data.status, data.message);
      return { success: false, address: '' };
    }

    // 优先用推荐的友好地址（如"奥林匹克森林公园南园内"），退而用标准地址
    const result = data.result;
    const address = (result.formatted_addresses && result.formatted_addresses.recommend) ||
                    result.address ||
                    '';
    return { success: true, address };
  } catch (error) {
    console.error('[getLocationName] 请求失败', error);
    return { success: false, address: '' };
  }
};
