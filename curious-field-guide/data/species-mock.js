// 好奇图鉴 - Mock 数据
// 说明：v1.0 开发阶段用于演示流程，接入真实识别后逐步替换

const { CATEGORIES } = require('../utils/constants');

/**
 * Mock 物种列表
 * 说明：覆盖昆虫、植物、鸟类、菌类、动物五类，用于首页最近发现、识别结果演示
 */
const MOCK_SPECIES_LIST = [
  {
    name: '玉带凤蝶',
    latinName: 'Papilio polytes',
    speciesKey: 'papilio polytes',
    category: CATEGORIES.INSECT.key,
    order: '鳞翅目',
    family: '凤蝶科',
    description: '翅展约 90-120mm，翅膀黑色，后翅有白色斑纹，飞行姿态优雅。',
    habitat: '常见于柑橘园、公园及林荫道，幼虫以柑橘类植物为食。',
    officialPhotoUrl: '',
    officialPhotoStatus: 'pending',
    imageSource: 'iNaturalist',
    imageLicense: 'CC BY'
  },
  {
    name: '碧凤蝶',
    latinName: 'Papilio bianor',
    speciesKey: 'papilio bianor',
    category: CATEGORIES.INSECT.key,
    order: '鳞翅目',
    family: '凤蝶科',
    description: '大型凤蝶，翅展可达 120mm 以上，雄蝶后翅有翠绿色鳞片。',
    habitat: '分布于山地林缘，喜访花吸蜜，幼虫以花椒等芸香科植物为食。',
    officialPhotoUrl: '',
    officialPhotoStatus: 'pending',
    imageSource: 'iNaturalist',
    imageLicense: 'CC BY'
  },
  {
    name: '鸡腿菇',
    latinName: 'Coprinus comatus',
    speciesKey: 'coprinus comatus',
    category: CATEGORIES.FUNGI.key,
    order: '伞菌目',
    family: '鬼伞科',
    description: '菌盖圆柱形，成熟时表面出现鳞片状龟裂，菌柄粗壮。',
    habitat: '夏秋季节生于草地、田野、路边，可食用但需与有毒种类区分。',
    officialPhotoUrl: '',
    officialPhotoStatus: 'pending',
    imageSource: 'iNaturalist',
    imageLicense: 'CC BY-SA'
  },
  {
    name: '白头鹎',
    latinName: 'Pycnonotus sinensis',
    speciesKey: 'pycnonotus sinensis',
    category: CATEGORIES.BIRD.key,
    order: '雀形目',
    family: '鹎科',
    description: '头顶黑色，枕部白色，叫声清脆响亮，常成群活动。',
    habitat: '城市公园、灌丛、果园均可见，食性杂，以果实和昆虫为主。',
    officialPhotoUrl: '',
    officialPhotoStatus: 'pending',
    imageSource: 'Wikimedia Commons',
    imageLicense: 'CC0'
  },
  {
    name: '月季花',
    latinName: 'Rosa chinensis',
    speciesKey: 'rosa chinensis',
    category: CATEGORIES.PLANT.key,
    order: '蔷薇目',
    family: '蔷薇科',
    description: '常绿或半常绿灌木，花色丰富，常见红、粉、黄、白等色。',
    habitat: '广泛栽培于庭院、公园，花期长，四季常开。',
    officialPhotoUrl: '',
    officialPhotoStatus: 'pending',
    imageSource: 'Wikimedia Commons',
    imageLicense: 'CC BY'
  },
  {
    name: '中华大蟾蜍',
    latinName: 'Bufo gargarizans',
    speciesKey: 'bufo gargarizans',
    category: CATEGORIES.ANIMAL.key,
    order: '无尾目',
    family: '蟾蜍科',
    description: '体背布满疣粒，耳后腺可分泌白色毒液，夜间活动频繁。',
    habitat: '常见于农田、池塘、树林底层，以昆虫为食。',
    officialPhotoUrl: '',
    officialPhotoStatus: 'pending',
    imageSource: 'iNaturalist',
    imageLicense: 'CC BY-NC'
  },
  {
    name: '七星瓢虫',
    latinName: 'Coccinella septempunctata',
    speciesKey: 'coccinella septempunctata',
    category: CATEGORIES.INSECT.key,
    order: '鞘翅目',
    family: '瓢虫科',
    description: '体背红色，有七个黑色斑点，是著名的天敌昆虫。',
    habitat: '麦田、菜园、果园常见，以蚜虫为食。',
    officialPhotoUrl: '',
    officialPhotoStatus: 'pending',
    imageSource: 'Wikimedia Commons',
    imageLicense: 'CC0'
  },
  {
    name: '银杏',
    latinName: 'Ginkgo biloba',
    speciesKey: 'ginkgo biloba',
    category: CATEGORIES.PLANT.key,
    order: '银杏目',
    family: '银杏科',
    description: '落叶乔木，叶片扇形，秋季变黄，是著名的活化石植物。',
    habitat: '城市行道树、公园、寺庙常见，耐寒耐旱。',
    officialPhotoUrl: '',
    officialPhotoStatus: 'pending',
    imageSource: 'Wikimedia Commons',
    imageLicense: 'CC0'
  },
  {
    name: '麻雀',
    latinName: 'Passer montanus',
    speciesKey: 'passer montanus',
    category: CATEGORIES.BIRD.key,
    order: '雀形目',
    family: '雀科',
    description: '体小而圆，头顶栗色，颊部有黑斑，常成群觅食。',
    habitat: '城市、村落、农田均可见，以谷物和昆虫为食。',
    officialPhotoUrl: '',
    officialPhotoStatus: 'pending',
    imageSource: 'iNaturalist',
    imageLicense: 'CC BY'
  },
  {
    name: '狗尾草',
    latinName: 'Setaria viridis',
    speciesKey: 'setaria viridis',
    category: CATEGORIES.PLANT.key,
    order: '禾本目',
    family: '禾本科',
    description: '一年生草本，穗状花序直立，形似狗尾，常见于路边荒地。',
    habitat: '田边、路旁、荒地极为常见，耐践踏。',
    officialPhotoUrl: '',
    officialPhotoStatus: 'pending',
    imageSource: 'iNaturalist',
    imageLicense: 'CC BY'
  }
];

/**
 * Mock 最近发现记录
 * 说明：用于首页「最近发现」列表展示
 */
const MOCK_DISCOVERIES = [
  {
    id: 'd1',
    speciesName: '玉带凤蝶',
    latinName: 'Papilio polytes',
    speciesKey: 'papilio polytes',
    category: CATEGORIES.INSECT.key,
    userPhotoUrl: '',
    location: '奥森公园',
    discoveredAt: '2026-08-04T10:23:00+08:00',
    rarityTags: ['首次发现', '连续 12 天']
  },
  {
    id: 'd2',
    speciesName: '鸡腿菇',
    latinName: 'Coprinus comatus',
    speciesKey: 'coprinus comatus',
    category: CATEGORIES.FUNGI.key,
    userPhotoUrl: '',
    location: '朝阳公园',
    discoveredAt: '2026-08-03T16:45:00+08:00',
    rarityTags: ['首次发现']
  },
  {
    id: 'd3',
    speciesName: '白头鹎',
    latinName: 'Pycnonotus sinensis',
    speciesKey: 'pycnonotus sinensis',
    category: CATEGORIES.BIRD.key,
    userPhotoUrl: '',
    location: '小区花园',
    discoveredAt: '2026-08-02T08:12:00+08:00',
    rarityTags: []
  },
  {
    id: 'd4',
    speciesName: '月季花',
    latinName: 'Rosa chinensis',
    speciesKey: 'rosa chinensis',
    category: CATEGORIES.PLANT.key,
    userPhotoUrl: '',
    location: '北海公园',
    discoveredAt: '2026-08-01T14:30:00+08:00',
    rarityTags: ['连续 11 天']
  },
  {
    id: 'd5',
    speciesName: '中华大蟾蜍',
    latinName: 'Bufo gargarizans',
    speciesKey: 'bufo gargarizans',
    category: CATEGORIES.ANIMAL.key,
    userPhotoUrl: '',
    location: '奥森公园',
    discoveredAt: '2026-07-31T21:10:00+08:00',
    rarityTags: ['夜间发现']
  }
];

/**
 * Mock 用户统计
 * 说明：用于首页顶部和仪表盘展示
 */
const MOCK_USER_STATS = {
  totalDiscoveries: 23,
  categoryCount: 5,
  streakCount: 12,
  joinDays: 128,
  categoryStats: {
    insect: 8,
    plant: 12,
    bird: 3,
    fungi: 3,
    animal: 2
  }
};

module.exports = {
  MOCK_SPECIES_LIST,
  MOCK_DISCOVERIES,
  MOCK_USER_STATS
};
