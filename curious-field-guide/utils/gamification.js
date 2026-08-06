// 好奇图鉴 - 游戏化计算工具
// 说明：计算稀有度标签、徽章进度、连续天数等，逻辑可复用于多个页面和云函数

const { RARITY_TAGS, BADGE_LIST } = require('./constants');

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

/**
 * 汇总收藏列表统计
 * 说明：图鉴页/我的页共用的统计逻辑：总数、分类计数、覆盖类别数、连续天数、夜间发现数、最早发现日期
 * @param {Array} list - 收藏记录数组
 * @returns {Object} { totalCount, categoryStats, categoryCount, streak, nightCount, earliest }
 */
function summarizeCollections(list) {
  const items = Array.isArray(list) ? list : [];
  const categoryStats = {};
  let nightCount = 0;
  let earliest = null;

  items.forEach(item => {
    if (!item || !item.category) {
      return;
    }
    categoryStats[item.category] = (categoryStats[item.category] || 0) + 1;

    if (item.discoveredAt && isNightDiscovery(item.discoveredAt)) {
      nightCount++;
    }

    if (item.discoveredAt && (!earliest || new Date(item.discoveredAt) < new Date(earliest))) {
      earliest = item.discoveredAt;
    }
  });

  return {
    totalCount: items.length,
    categoryStats,
    categoryCount: Object.keys(categoryStats).length,
    streak: calculateStreak(items.map(item => item.discoveredAt).filter(Boolean)),
    nightCount,
    earliest
  };
}

/**
 * 计算徽章解锁状态
 * 说明：v1.0 徽章按真实数据统计判定；v1.2 规划徽章恒为锁定
 * @param {Object} stats - { totalCount, categoryStats, streak, nightCount }
 * @returns {Array} 徽章数组，每项含 unlocked / progress / target
 */
function evaluateBadges(stats) {
  const categoryStats = stats.categoryStats || {};

  return BADGE_LIST.map(badge => {
    // v1.2 规划徽章：仅展示锁定状态
    if (badge.version !== 'v1.0') {
      return { ...badge, unlocked: false, progress: 0 };
    }

    let progress = 0;
    switch (badge.id) {
      case 'first_nature':
        progress = stats.totalCount;
        break;
      case 'insect_apprentice':
        progress = categoryStats.insect || 0;
        break;
      case 'plant_walker':
        progress = categoryStats.plant || 0;
        break;
      case 'bird_observer':
        progress = categoryStats.bird || 0;
        break;
      case 'fungi_hunter':
        progress = categoryStats.fungi || 0;
        break;
      case 'persistent':
        progress = stats.streak || 0;
        break;
      case 'night_owl':
        progress = stats.nightCount || 0;
        break;
      case 'naturalist':
        progress = stats.totalCount;
        break;
      default:
        progress = 0;
    }

    return {
      ...badge,
      progress,
      unlocked: progress >= badge.target
    };
  });
}

module.exports = {
  isFirstDiscovery,
  isNightDiscovery,
  calculateStreak,
  calculateRarityTags,
  summarizeCollections,
  evaluateBadges
};
