// 好奇图鉴 - 腾讯位置服务密钥配置（集中管理）
// 说明：优先读云函数环境变量 TENCENT_MAP_KEY；本地调试读 config.local.js（已 gitignore）
// 申请方式：lbs.qq.com → 控制台 → 应用管理 → 创建应用 → 添加 Key（WebServiceAPI，勾选逆地址解析）

let localConfig = {};
try {
  // eslint-disable-next-line global-require
  localConfig = require('./config.local');
} catch (error) {
  // config.local.js 不存在时忽略，依赖环境变量
}

module.exports = {
  TENCENT_MAP_KEY: process.env.TENCENT_MAP_KEY || localConfig.TENCENT_MAP_KEY || ''
};
