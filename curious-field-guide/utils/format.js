// 好奇图鉴 - 展示格式化工具
// 说明：时间格式化、标签字符串解析等纯展示逻辑，供多个页面复用

/**
 * 格式化发现时间
 * 说明：将 ISO 时间转换为「今天 / 昨天 / 前天 / M月D日 HH:mm」等可读文本
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

/**
 * 将稀有度标签字符串数组解析为 { label, color } 对象数组
 * 说明：mock 数据里标签是字符串，UI 需要颜色映射以渲染蜡笔色块
 * @param {Array<String>} tags
 * @returns {Array<Object>}
 */
function parseRarityTags(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return [];

  return tags
    // 「首次发现」标签已下线：旧收藏数据中仍可能存有这个标签，直接过滤不展示
    .filter(tag => !String(tag).includes('首次'))
    .map(tag => {
      const label = String(tag);
      if (label.includes('连续') || label.includes('streak')) {
        return { label, color: 'orange' };
      }
      if (label.includes('夜间')) {
        return { label, color: 'purple' };
      }
      return { label, color: 'blue' };
    });
}

module.exports = {
  formatDiscoveryTime,
  parseRarityTags
};
