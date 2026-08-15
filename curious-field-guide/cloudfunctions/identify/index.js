// 好奇图鉴 - 图像识别云函数
// 职责：接收前端上传到云存储的照片（fileID），调用百度智能云完成物种识别
// 路由策略（PRD 3.2）：
//   1. 先用百度「通用图像识别」粗分类（返回 root 大类，如 植物-树 / 动物-猫）
//   2. 植物 → 百度植物识别；动物 → 百度动物识别（再按名称细分昆虫/鸟类/动物）
//   3. 菌类及判断不了的 → 用百度通用识别的结果兜底
// 置信度策略（PRD）：< 0.5 或无结果视为识别失败，由前端结果页展示失败态

const cloud = require('wx-server-sdk');
const https = require('https');
const { BAIDU_API_KEY, BAIDU_SECRET_KEY } = require('./config');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 百度智能云接口配置
const BAIDU_HOST = 'aip.baidubce.com';
const API_PATH = {
  GENERAL: '/rest/2.0/image-classify/v2/advanced_general', // 通用物体和场景识别（高级版）
  ANIMAL: '/rest/2.0/image-classify/v1/animal',            // 动物识别
  PLANT: '/rest/2.0/image-classify/v1/plant'               // 植物识别
};

// 置信度低于该值视为识别失败（PRD：0.5 以下进失败页）
const FAIL_CONFIDENCE = 0.5;
// 兜底路径（通用识别结果）的最低置信度：通用识别打分天然偏低（什么都认、不如垂类专），
// 实测猫狗等常见对象正确结果常在 0.4 左右；兜底结果前端必带「识别不确定」黄条，风险可控
const FALLBACK_MIN_CONFIDENCE = 0.3;
// 单次 HTTP 请求超时时间（毫秒），PRD 要求整体 10 秒内可取消
const REQUEST_TIMEOUT = 8000;

// 细分分类关键词：百度动物识别不区分昆虫/鸟类，按物种名称特征归类
const INSECT_KEYWORDS = ['蝶', '蛾', '蜂', '蚁', '蝉', '蜻', '螳', '甲虫', '瓢虫', '蚊', '蝇', '蝗', '蟋', '萤', '蚜', '蝽', '虻', '螽', '蠹', '毛虫', '天牛', '金龟'];
const BIRD_KEYWORDS = ['鸟', '雀', '鸽', '鹭', '鹰', '隼', '鸮', '雁', '鸭', '鹅', '鹤', '鹳', '鸥', '燕', '鸫', '鹎', '莺', '鹟', '雉', '鹃', '鸠', '鹦鹉', '鹂', '鸻', '鹬', '鹈', '鹗', '鸢', '鸦', '鹊', '鸲', '鹀', '鹛', '鸬', '鹮', '鹑', '鸨', '鸵', '鹄', '鸳', '鸯', '鹫', '鹞', '鹌'];
const FUNGI_KEYWORDS = ['菇', '菌', '蘑', '木耳', '灵芝', '银耳', '猴头', '竹荪', '虫草', '马勃'];

// 百度垂类接口的兜底名称：识别不出具体物种时返回「非动物」「非植物」，出现即视为无有效结果
const NEGATIVE_NAMES = ['非动物', '非植物'];

// iNaturalist 百科数据源配置（免费开放 API，无需密钥）
// 用途：百度识别只返回物种名和置信度，百科内容（拉丁名/简介/标准图/目科）从这里补充
const INAT_HOST = 'api.inaturalist.org';

// access_token 缓存（有效期约 30 天，提前 1 天刷新）；云函数实例复用时生效
let cachedToken = null;

// 网络瞬断类错误码：出现这些错误时自动重试，避免偶发连接重置导致整体失败
const NETWORK_RETRY_TOKENS = ['ECONNRESET', 'ETIMEDOUT', 'ESOCKETTIMEDOUT', 'EPIPE', 'socket hang up', '超时'];
const MAX_NETWORK_RETRY = 2;

/**
 * 发起 HTTPS 请求的 Promise 封装
 * @param {Object} options - https.request 参数
 * @param {String} postData - POST 请求体，GET 请求传 null
 * @returns {Promise<Object>} 解析后的 JSON 响应
 */
function httpsRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error('百度接口返回格式异常'));
        }
      });
    });
    req.setTimeout(REQUEST_TIMEOUT, () => {
      req.destroy(new Error('百度接口请求超时'));
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

/**
 * 延迟指定毫秒数（用于重试间隔）
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带网络重试的 HTTPS 请求
 * 说明：ECONNRESET 等瞬断错误自动重试（间隔 500ms），非网络错误直接抛出
 * @param {Object} options - https.request 参数
 * @param {String} postData - POST 请求体
 * @param {String} tag - 日志标记（标识是哪一步的请求）
 * @returns {Promise<Object>} 解析后的 JSON 响应
 */
async function httpsRequestWithRetry(options, postData, tag) {
  for (let attempt = 0; attempt <= MAX_NETWORK_RETRY; attempt++) {
    try {
      return await httpsRequest(options, postData);
    } catch (error) {
      const errorText = `${error.code || ''} ${error.message || ''}`;
      const isNetworkError = NETWORK_RETRY_TOKENS.some(token => errorText.includes(token));
      if (!isNetworkError || attempt === MAX_NETWORK_RETRY) {
        throw error;
      }
      console.warn(`[identify] ${tag} 网络瞬断，第 ${attempt + 1} 次重试`, error.message);
      await sleep(500);
    }
  }
  throw new Error('unreachable');
}

/**
 * 获取百度 access_token（带缓存）
 * @param {Boolean} forceRefresh - token 失效时强制刷新
 * @returns {Promise<String>} access_token
 */
async function getAccessToken(forceRefresh) {
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const path = `/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_API_KEY}&client_secret=${BAIDU_SECRET_KEY}`;
  const data = await httpsRequestWithRetry({ host: BAIDU_HOST, path, method: 'GET' }, null, '获取token');

  if (!data.access_token) {
    throw new Error(`获取百度 token 失败: ${data.error_description || data.error || '未知错误'}`);
  }

  cachedToken = {
    value: data.access_token,
    // expires_in 单位秒（约 30 天），提前 1 天过期以留出余量
    expiresAt: Date.now() + (data.expires_in - 86400) * 1000
  };
  return cachedToken.value;
}

/**
 * 调用百度图像识别接口
 * 说明：token 失效（错误码 110/111）时自动刷新重试一次
 * @param {String} apiPath - 接口路径
 * @param {String} imageBase64 - 图片 base64（不含前缀）
 * @param {Boolean} retried - 是否已重试过
 * @param {String} tag - 日志标记
 * @param {Boolean} withBaike - 是否带 baike_num=1（动植物接口返回百度百科简介/图片）
 * @returns {Promise<Object>} 接口返回的识别结果
 */
async function callBaiduApi(apiPath, imageBase64, retried, tag, withBaike) {
  const token = await getAccessToken(false);
  const postData = `image=${encodeURIComponent(imageBase64)}${withBaike ? '&baike_num=3' : ''}`;
  const data = await httpsRequestWithRetry({
    host: BAIDU_HOST,
    path: `${apiPath}?access_token=${token}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, postData, tag || '识别接口');

  if (data.error_code) {
    // token 失效：强制刷新后重试一次
    if ((data.error_code === 110 || data.error_code === 111) && !retried) {
      await getAccessToken(true);
      return callBaiduApi(apiPath, imageBase64, true, tag, withBaike);
    }
    const error = new Error(data.error_msg || '百度识别接口报错');
    error.baiduCode = data.error_code;
    throw error;
  }
  return data;
}

/**
 * 按名称特征把动物识别结果细分为昆虫/鸟类/动物
 * @param {String} name - 物种名称
 * @returns {String} 分类 key（insect / bird / animal）
 */
function refineAnimalCategory(name) {
  if (INSECT_KEYWORDS.some(word => name.includes(word))) {
    return 'insect';
  }
  if (BIRD_KEYWORDS.some(word => name.includes(word))) {
    return 'bird';
  }
  return 'animal';
}

/**
 * 判断名称是否为菌类
 * @param {String} name - 物种名称
 * @returns {Boolean}
 */
function isFungi(name) {
  return FUNGI_KEYWORDS.some(word => name.includes(word));
}

/**
 * 把百度返回的一条结果转换为统一的候选物种格式
 * 说明：百度的 score 字段是字符串（如 "0.86"），统一转成数字，避免前端类型错误；
 *       baike_num=3 时前 3 条结果自带百度百科简介（baike_info.description），一并带上
 * @param {Object} item - 百度结果项（name/keyword + score + 可选 baike_info）
 * @param {String} category - 分类 key
 * @returns {Object} 候选物种
 */
function toCandidate(item, category) {
  const name = item.name || item.keyword;
  return {
    name,
    latinName: '',
    speciesKey: name,
    category,
    order: '',
    family: '',
    description: (item.baike_info && item.baike_info.description) || '',
    habitat: '',
    confidence: Number(item.score) || 0
  };
}

/**
 * 去除 HTML 标签（iNat 的维基简介含 <b>/<i> 等标签）
 * @param {String} text - 原始文本
 * @returns {String} 纯文本
 */
function stripHtml(text) {
  return (text || '').replace(/<[^>]+>/g, '').trim();
}

/**
 * 调用 iNaturalist 接口（GET + JSON）
 * @param {String} path - 接口路径（含查询参数）
 * @returns {Promise<Object>} 解析后的 JSON 响应
 */
function inatGet(path) {
  return httpsRequestWithRetry({
    host: INAT_HOST,
    path,
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'curious-field-guide/1.0'
    }
  }, null, 'iNat百科');
}

/**
 * 从 iNaturalist 抓取物种百科信息
 * 说明：任何一步失败都返回 null，由调用方降级为占位内容，不影响识别主流程
 * @param {String} chineseName - 百度识别出的中文物种名
 * @returns {Promise<Object|null>} { latinName, description, officialPhotoUrl, order, family } 或 null
 */
async function enrichFromINat(chineseName) {
  try {
    // 第一步：按中文名搜索物种（autocomplete 对中文俗名匹配最好）
    const auto = await inatGet(`/v1/taxa/autocomplete?q=${encodeURIComponent(chineseName)}&locale=zh-CN&per_page=10`);
    const results = auto.results || [];
    if (!results.length) {
      return null;
    }

    // 名称质量校验：单字中文名（葱/蒜/猫）歧义大，必须分级匹配——
    // ① 种/亚种的精确匹配；② 命中词一致；③ 科/属级且名称为「查询名+科/属/族」的整词形态
    // （如 猫→猫科 可以接受；葱→葱芥属 是另一种植物，不能接受）
    // 宁可返回 null 显示占位，也不能张冠李戴
    const isSpeciesRank = item => ['species', 'subspecies'].includes(item.rank);
    const groupSuffix = new RegExp(`^${chineseName}(科|属|族|亚科|亚属)$`);
    const target =
      results.find(item => isSpeciesRank(item) &&
        (item.preferred_common_name === chineseName || item.name === chineseName)) ||
      results.find(item => item.matched_term === chineseName &&
        ['species', 'subspecies', 'genus'].includes(item.rank)) ||
      results.find(item =>
        ['genus', 'family', 'subfamily', 'tribe'].includes(item.rank) &&
        groupSuffix.test(item.preferred_common_name || ''));
    if (!target) {
      console.log('[identify] iNat 无名称匹配的物种，跳过百科增强：', chineseName);
      return null;
    }

    // 第二步：取物种详情（简介/标准图/分类阶元都在详情里）
    const detail = await inatGet(`/v1/taxa/${target.id}?locale=zh-CN`);
    const taxon = (detail.results || [])[0];
    if (!taxon) {
      return null;
    }

    // 从分类阶元中取目/科的中文名（无中文名则用拉丁名）
    const ancestors = taxon.ancestors || [];
    const findAncestor = (rank) => {
      const hit = ancestors.find(item => item.rank === rank);
      return hit ? (hit.preferred_common_name || hit.name) : '';
    };

    return {
      latinName: taxon.name || '',
      description: stripHtml(taxon.wikipedia_summary),
      officialPhotoUrl: (taxon.default_photo && taxon.default_photo.medium_url) || '',
      order: findAncestor('order'),
      family: findAncestor('family')
    };
  } catch (error) {
    console.warn('[identify] iNat 百科增强失败，降级为占位内容', error.message);
    return null;
  }
}

/**
 * 组装识别成功的返回结构（与结果页数据契约保持一致）
 * 说明：百科内容合并策略——
 *   简介：百度百科（baike_num 返回，中文且详细）优先，iNaturalist 维基简介兜底
 *   标准图：iNaturalist（CC 授权）优先，百度百科图片兜底（http 统一转 https）
 *   拉丁名/目科：iNaturalist 提供，百度百科不含结构化分类
 *   两个来源都失败时百科字段为空，前端显示占位
 */
async function buildSuccessResult({ candidate, alternatives, source, location, baike, isFallback }) {
  const enrichment = await enrichFromINat(candidate.name);

  const baikeDescription = baike && baike.description ? baike.description : '';
  const baikePhoto = baike && baike.image_url ? baike.image_url.replace(/^http:/, 'https:') : '';
  const officialPhotoUrl = enrichment && enrichment.officialPhotoUrl
    ? enrichment.officialPhotoUrl
    : baikePhoto;

  return {
    success: true,
    species: {
      name: candidate.name,
      latinName: enrichment ? enrichment.latinName : candidate.latinName,
      speciesKey: candidate.speciesKey,
      category: candidate.category,
      order: enrichment ? enrichment.order : candidate.order,
      family: enrichment ? enrichment.family : candidate.family
    },
    // 分布与习性暂无独立数据源（百科简介通常涵盖），保持占位
    description: baikeDescription || (enrichment ? enrichment.description : ''),
    habitat: '',
    officialPhotoUrl,
    officialPhotoStatus: officialPhotoUrl ? 'ready' : 'pending',
    confidence: candidate.confidence,
    source,
    note: candidate.category === 'fungi' ? '菌类仅供观赏参考，可能有毒，请勿采食' : null,
    previewTags: [],
    alternatives,
    location: location || '',
    discoveredAt: new Date().toISOString(),
    isMultiSubject: false,
    // 兜底结果标记：垂类接口不达标、用通用识别名称兜底时为 true，前端展示「识别不确定」黄条
    isFallback: !!isFallback
  };
}

/**
 * 组装识别失败的返回结构（reason 供前端区分失败原因）
 */
function buildFailResult(reason, message) {
  return { success: false, reason, message };
}

/**
 * 垂类接口不达标时的兜底：用通用识别的粗分类名称作为结果
 * 说明：常见家养动物（猫/狗）在百度动物识别里只能拿到品种级低置信度，
 *       按技术文档 3.1 用通用识别结果兜底（如「猫」），并标记 isFallback 提示不确定
 * @param {Object} classifiable - 通用识别中第一条有明确大类的结果
 * @param {Array} verticalResults - 垂类接口原始结果（过滤低分后作为候选）
 * @param {String} category - 分类 key
 * @param {String} location - 位置文本
 * @returns {Promise<Object>} 识别结果（通用置信度也不达标时返回失败）
 */
function buildGeneralFallback(classifiable, verticalResults, category, location) {
  const candidate = toCandidate(classifiable, category);
  if (candidate.confidence < FALLBACK_MIN_CONFIDENCE) {
    return buildFailResult('low_confidence', '看不太清它是谁，换一张更清晰的照片试试');
  }
  const alternatives = (verticalResults || [])
    .filter(item => (Number(item.score) || 0) >= 0.3)
    .slice(0, 2)
    .map(item => toCandidate(item, category));
  return buildSuccessResult({
    candidate,
    alternatives,
    source: 'baidu-general',
    location,
    isFallback: true
  });
}

/**
 * 云函数入口
 * @param {Object} event - { fileID: 云存储照片 ID, location: 用户位置文本 }
 */
exports.main = async (event) => {
  const { fileID, location, action, name } = event || {};

  // 子动作：单独查询物种百科内容
  // 用途：结果页切换候选时按需补充（识别主流程只增强首选，避免为每个候选多发 2 次请求）
  if (action === 'enrich') {
    if (!name) {
      return buildFailResult('invalid_param', '缺少物种名');
    }
    const enrichment = await enrichFromINat(name);
    if (!enrichment) {
      return buildFailResult('no_result', '暂无该物种的百科内容');
    }
    return { success: true, enrichment };
  }

  if (!fileID) {
    return buildFailResult('invalid_param', '照片上传异常，请重试');
  }

  try {
    // 从云存储下载照片并转 base64
    const file = await cloud.downloadFile({ fileID });
    const imageBase64 = file.fileContent.toString('base64');
    console.log('[identify] 照片下载完成，大小约', Math.round(file.fileContent.length / 1024), 'KB');

    // 第一步：通用识别粗分类
    const general = await callBaiduApi(API_PATH.GENERAL, imageBase64, false, '通用识别');
    const generalTop = general.result && general.result[0];

    if (!generalTop) {
      return buildFailResult('no_result', '暂时无法识别，可能是新物种，也可能是照片不够清晰');
    }

    const root = generalTop.root || '';
    const keyword = generalTop.keyword || '';
    console.log('[identify] 通用识别粗分类：', root, '/', keyword, '/', generalTop.score);

    // 第二步：按粗分类路由到垂类接口
    // 菌类优先判断（百度常把蘑菇粗分到 植物/食物，需用名称兜底，检查前 3 条候选）
    const fungiItem = (general.result || []).slice(0, 3).find(item => isFungi(item.keyword || ''));
    if (fungiItem) {
      const candidate = toCandidate(fungiItem, 'fungi');
      if (candidate.confidence < FAIL_CONFIDENCE) {
        return buildFailResult('low_confidence', '看不太清它是谁，换一张更清晰的照片试试');
      }
      return await buildSuccessResult({
        candidate,
        alternatives: [],
        source: 'baidu-general',
        location
      });
    }

    // 通用识别第一条的 root 可能为空（纯风景/艺术图），取第一条有明确大类的结果做路由
    const classifiable = (general.result || []).find(item => item.root);
    const routeRoot = classifiable ? classifiable.root : '';

    if (routeRoot.includes('植物')) {
      const plant = await callBaiduApi(API_PATH.PLANT, imageBase64, false, '植物识别', true);
      // 过滤「非植物」等兜底名称
      const results = (plant.result || []).filter(item => !NEGATIVE_NAMES.includes(item.name));
      // 垂类接口不达标：按技术文档 3.1 用通用识别结果兜底
      if (!results.length || (Number(results[0].score) || 0) < FAIL_CONFIDENCE) {
        console.log('[identify] 植物接口不达标，走通用兜底');
        return buildGeneralFallback(classifiable, results, 'plant', location);
      }
      console.log('[identify] 植物识别结果：', results[0].name, '/', results[0].score);
      const candidate = toCandidate(results[0], 'plant');
      return await buildSuccessResult({
        candidate,
        alternatives: results.slice(1, 3).map(item => toCandidate(item, 'plant')),
        source: 'baidu-plant',
        location,
        baike: results[0].baike_info || null
      });
    }

    if (routeRoot.includes('动物')) {
      const animal = await callBaiduApi(API_PATH.ANIMAL, imageBase64, false, '动物识别', true);
      // 过滤「非动物」等兜底名称
      const results = (animal.result || []).filter(item => !NEGATIVE_NAMES.includes(item.name));
      // 垂类接口不达标：按技术文档 3.1 用通用识别结果兜底（猫狗等家养动物常见此场景）
      if (!results.length || (Number(results[0].score) || 0) < FAIL_CONFIDENCE) {
        console.log('[identify] 动物接口不达标，走通用兜底');
        return buildGeneralFallback(classifiable, results, refineAnimalCategory(classifiable.keyword || ''), location);
      }
      console.log('[identify] 动物识别结果：', results[0].name, '/', results[0].score);
      const category = refineAnimalCategory(results[0].name);
      const candidate = toCandidate(results[0], category);
      return await buildSuccessResult({
        candidate,
        alternatives: results.slice(1, 3).map(item => toCandidate(item, refineAnimalCategory(item.name))),
        source: 'baidu-animal',
        location,
        baike: results[0].baike_info || null
      });
    }

    // 粗分类不在识别范围内（商品/食物/建筑等）
    return buildFailResult('not_supported', '它好像不在我的识别范围内，我目前认识昆虫、植物、鸟类、菌类和动物');
  } catch (error) {
    console.error('[identify] 识别失败', error);

    // 百度配额类错误（17 每日超限 / 18 QPS 超限 / 19 总量超限）
    if (error.baiduCode === 17 || error.baiduCode === 18 || error.baiduCode === 19) {
      return buildFailResult('quota_exceeded', '今日识别次数已用完，明天再来吧');
    }
    return buildFailResult('service_error', '识别服务暂时开小差了，请稍后再试');
  }
};
