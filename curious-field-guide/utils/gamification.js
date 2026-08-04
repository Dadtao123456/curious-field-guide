// 好奇图鉴 - 游戏化计算工具
// 说明：计算稀有度标签、徽章进度、连续天数等，逻辑可复用于多个页面和云函数

const { RARITY_TAGS } = require('./constants');

/**
 * 判断是否为首次发现
 * @param {String} speciesKey - 物种查重键
 * @param {Array} existingKeys - 用户已收藏的 speciesKey 列表
 * @returns {Boolean}
 */
function isFirstDiscovery(speciesKey, existingKeys) {
  if (!speciesKey || !Array.isArray(existingKeys)) {
    return false;
  }
  return !existingKeys.includes(speciesKey);
}

/**
 * 判断是否为夜间发现
 * 说明：PRD 约定 20:00 - 06:00 为夜间
 * @param {Date|String|Number} date - 发现时间
 * @returns {Boolean}
 */
function isNightDiscovery(date) {
  const hour = new Date(date).getHours();
  return hour >= 20 || hour < 6;
}

/**
 * 计算当前连续发现天数
 * 说明：按自然日（东八区）判定，每天有新发现即计 1 天
 * @param {Array} discoveryDates - 发现时间 ISO 字符串数组
 * @returns {Number}
 */
function calculateStreak(discoveryDates) {
  if (!Array.isArray(discoveryDates) || discoveryDates.length === 0) {
    return 0;
  }

  // 按日期去重，转换为本地日期字符串
  const dateSet = new Set();
  discoveryDates.forEach(isoString => {
    const date = new Date(isoString);
    const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    dateSet.add(dateStr);
  });

  const sortedDates = Array.from(dateSet).sort().reverse();

  let streak = 0;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

  // 检查今天或昨天是否有发现
  const hasToday = sortedDates.includes(todayStr);
  let checkDate = new Date();
  if (!hasToday) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  for (let i = 0; i < sortedDates.length; i++) {
    const checkStr = `${checkDate.getFullYear()}-${checkDate.getMonth() + 1}-${checkDate.getDate()}`;
    if (sortedDates.includes(checkStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * 计算稀有度标签
 * 说明：PRD v1.0 支持三种标签：首次发现、连续 N 天、夜间发现
 * @param {String} speciesKey - 当前物种查重键
 * @param {Array} existingKeys - 已收藏查重键列表
 * @param {Number} streak - 当前连续天数
 * @param {Date|String} discoveredAt - 发现时间
 * @returns {Array} 标签对象数组
 */
function calculateRarityTags(speciesKey, existingKeys, streak, discoveredAt) {
  const tags = [];

  if (isFirstDiscovery(speciesKey, existingKeys)) {
    tags.push({ ...RARITY_TAGS.FIRST_DISCOVERY, label: '首次发现' });
  }

  if (streak >= 3) {
    tags.push({ ...RARITY_TAGS.STREAK, label: `连续 ${streak} 天` });
  }

  if (isNightDiscovery(discoveredAt)) {
    tags.push({ ...RARITY_TAGS.NIGHT, label: '夜间发现' });
  }

  return tags;
}

module.exports = {
  isFirstDiscovery,
  isNightDiscovery,
  calculateStreak,
  calculateRarityTags
};
