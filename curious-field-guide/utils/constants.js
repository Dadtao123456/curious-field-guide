// 好奇图鉴 - 全局常量配置
// 说明：集中管理颜色、分类、徽章等静态配置，避免在页面中硬编码

/**
 * 生物分类枚举
 * 说明：PRD 约定的五类识别范围
 */
const CATEGORIES = {
  INSECT: { key: 'insect', label: '昆虫', emoji: '🦋', icon: '/images/icons/icon-insect.png' },
  PLANT: { key: 'plant', label: '植物', emoji: '🌿', icon: '/images/icons/icon-plant.png' },
  BIRD: { key: 'bird', label: '鸟类', emoji: '🐦', icon: '/images/icons/icon-bird.png' },
  FUNGI: { key: 'fungi', label: '菌类', emoji: '🍄', icon: '/images/icons/icon-fungi.png' },
  ANIMAL: { key: 'animal', label: '动物', emoji: '🐿️', icon: '/images/icons/icon-animal.png' }
};

/**
 * 分类列表（用于循环渲染）
 */
const CATEGORY_LIST = [
  CATEGORIES.INSECT,
  CATEGORIES.PLANT,
  CATEGORIES.BIRD,
  CATEGORIES.FUNGI,
  CATEGORIES.ANIMAL
];

/**
 * 分类 emoji 映射（由 CATEGORY_LIST 生成，供页面直接渲染）
 * 说明：emoji 保留作为分享卡片 canvas 等不便加载图片场景的兜底
 */
const CATEGORY_EMOJI_MAP = CATEGORY_LIST.reduce((map, item) => {
  map[item.key] = item.emoji;
  return map;
}, {});

/**
 * 分类图标路径映射（手绘 icon，优先于 emoji 使用）
 */
const CATEGORY_ICON_MAP = CATEGORY_LIST.reduce((map, item) => {
  map[item.key] = item.icon;
  return map;
}, {});

/**
 * 本地缓存 key 汇总
 * 说明：统一管理 storage key，避免散落各处写死
 */
const STORAGE_KEYS = {
  PRIVACY_STATUS: 'privacy_status',
  IDENTIFY_RESULT: 'identify_result',
  COLLECTIONS: 'mock_collections',
  SHARE_CARD: 'share_card_data',
  // 用户资料（头像临时路径 + 昵称），收藏上云后迁移到数据库
  USER_PROFILE: 'user_profile'
};

/**
 * 稀有度标签定义
 * 说明：v1.0 支持的两种标签，按优先级排序（「首次发现」已下线）
 */
const RARITY_TAGS = {
  STREAK: {
    type: 'streak',
    label: '连续 N 天',
    color: 'orange'
  },
  NIGHT: {
    type: 'night',
    label: '夜间发现',
    color: 'purple'
  }
};

/**
 * 徽章定义
 * 说明：v1.0 解锁的徽章，v1.2 规划徽章仅展示锁定状态
 */
const BADGES = {
  FIRST_NATURE: {
    id: 'first_nature',
    name: '初识自然',
    emoji: '🌿',
    description: '累计发现 1 个物种',
    target: 1,
    version: 'v1.0'
  },
  INSECT_APPRENTICE: {
    id: 'insect_apprentice',
    name: '昆虫学徒',
    emoji: '🦋',
    description: '昆虫类累计发现 5 种',
    target: 5,
    version: 'v1.0'
  },
  PLANT_WALKER: {
    id: 'plant_walker',
    name: '植物行者',
    emoji: '🌸',
    description: '植物类累计发现 10 种',
    target: 10,
    version: 'v1.0'
  },
  BIRD_OBSERVER: {
    id: 'bird_observer',
    name: '鸟类观察家',
    emoji: '🐦',
    description: '鸟类累计发现 3 种',
    target: 3,
    version: 'v1.0'
  },
  FUNGI_HUNTER: {
    id: 'fungi_hunter',
    name: '菌类猎人',
    emoji: '🍄',
    description: '菌类累计发现 5 种',
    target: 5,
    version: 'v1.0'
  },
  PERSISTENT: {
    id: 'persistent',
    name: '坚持不懈',
    emoji: '🔥',
    description: '连续 7 天有新发现',
    target: 7,
    version: 'v1.0'
  },
  NIGHT_OWL: {
    id: 'night_owl',
    name: '夜间发现',
    emoji: '🌙',
    description: '夜间发现累计 3 次',
    target: 3,
    version: 'v1.0'
  },
  NATURALIST: {
    id: 'naturalist',
    name: '博物学家',
    emoji: '📚',
    description: '累计发现 50 个物种',
    target: 50,
    version: 'v1.0'
  },
  // v1.2 规划徽章，v1.0 仅展示为锁定状态
  OFF_SEASON: {
    id: 'off_season',
    name: '逆季节',
    emoji: '❄️',
    description: '反季节发现 1 次（v1.2 开放）',
    target: 1,
    version: 'v1.2'
  },
  URBAN_ENCOUNTER: {
    id: 'urban_encounter',
    name: '城市奇遇',
    emoji: '🏙️',
    description: '城市环境发现特殊物种（v1.2 开放）',
    target: 1,
    version: 'v1.2'
  }
};

/**
 * 徽章列表（用于循环渲染）
 */
const BADGE_LIST = Object.values(BADGES);

/**
 * 颜色映射（与 app.wxss 中的 CSS 变量保持一致，手账风格）
 */
const COLORS = {
  paper: '#faf8f3',
  pencil: '#3a3a3a',
  gray: '#888888',
  lightGray: '#999999',
  cream: '#f5f5f0',
  white: '#ffffff',
  tagColors: {
    green: { bg: 'rgba(74, 155, 92, 0.12)', text: '#4a9b5c', border: '#4a9b5c' },
    orange: { bg: 'rgba(201, 162, 39, 0.12)', text: '#c9a227', border: '#c9a227' },
    purple: { bg: 'rgba(124, 91, 191, 0.12)', text: '#7c5bbf', border: '#7c5bbf' },
    blue: { bg: 'rgba(74, 124, 155, 0.12)', text: '#4a7c9b', border: '#4a7c9b' },
    red: { bg: 'rgba(184, 84, 80, 0.12)', text: '#b85450', border: '#b85450' }
  }
};

// 微信云开发环境 ID
// 说明：在微信开发者工具「云开发」控制台可查看
const CLOUD_ENV_ID = 'cloud1-d4g9hp6ku9ffb7f0a';

module.exports = {
  CATEGORIES,
  CATEGORY_LIST,
  CATEGORY_EMOJI_MAP,
  CATEGORY_ICON_MAP,
  STORAGE_KEYS,
  RARITY_TAGS,
  BADGES,
  BADGE_LIST,
  COLORS,
  CLOUD_ENV_ID
};
