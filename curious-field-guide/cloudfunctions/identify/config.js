// 好奇图鉴 - 百度智能云密钥配置（集中管理）
// 说明：优先读云函数环境变量 BAIDU_API_KEY / BAIDU_SECRET_KEY；
//       本地调试读 config.local.js（已加入 .gitignore，不会提交到仓库）
// 安全约定：密钥只允许出现在 config.local.js 或云函数环境变量中，业务代码一律从本文件引用

let localConfig = {};
try {
  // eslint-disable-next-line global-require
  localConfig = require('./config.local');
} catch (error) {
  // config.local.js 不存在时忽略，依赖环境变量
}

module.exports = {
  BAIDU_API_KEY: process.env.BAIDU_API_KEY || localConfig.BAIDU_API_KEY || '',
  BAIDU_SECRET_KEY: process.env.BAIDU_SECRET_KEY || localConfig.BAIDU_SECRET_KEY || ''
};
