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
// 单次 HTTP 请求超时时间（毫秒），PRD 要求整体 10 秒内可取消
const REQUEST_TIMEOUT = 8000;

// 细分分类关键词：百度动物识别不区分昆虫/鸟类，按物种名称特征归类
const INSECT_KEYWORDS = ['蝶', '蛾', '蜂', '蚁', '蝉', '蜻', '螳', '甲虫', '瓢虫', '蚊', '蝇', '蝗', '蟋', '萤', '蚜', '蝽', '虻', '螽', '蠹', '毛虫', '天牛', '金龟'];
const BIRD_KEYWORDS = ['鸟', '雀', '鸽', '鹭', '鹰', '隼', '鸮', '雁', '鸭', '鹅', '鹤', '鹳', '鸥', '燕', '鸫', '鹎', '莺', '鹟', '雉', '鹃', '鸠', '鹦鹉', '鹂', '鸻', '鹬', '鹈', '鹗', '鸢'];
const FUNGI_KEYWORDS = ['菇', '菌', '蘑', '木耳', '灵芝', '银耳', '猴头', '竹荪', '虫草', '马勃'];

// access_token 缓存（有效期约 30 天，提前 1 天刷新）；云函数实例复用时生效
let cachedToken = null;

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
 * 获取百度 access_token（带缓存）
 * @param {Boolean} forceRefresh - token 失效时强制刷新
 * @returns {Promise<String>} access_token
 */
async function getAccessToken(forceRefresh) {
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const path = `/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_API_KEY}&client_secret=${BAIDU_SECRET_KEY}`;
  const data = await httpsRequest({ host: BAIDU_HOST, path, method: 'GET' }, null);

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
 * @returns {Promise<Object>} 接口返回的识别结果
 */
async function callBaiduApi(apiPath, imageBase64, retried) {
  const token = await getAccessToken(false);
  const postData = `image=${encodeURIComponent(imageBase64)}`;
  const data = await httpsRequest({
    host: BAIDU_HOST,
    path: `${apiPath}?access_token=${token}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, postData);

  if (data.error_code) {
    // token 失效：强制刷新后重试一次
    if ((data.error_code === 110 || data.error_code === 111) && !retried) {
      await getAccessToken(true);
      return callBaiduApi(apiPath, imageBase64, true);
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
 * 说明：百度的 score 字段是字符串（如 "0.86"），统一转成数字，避免前端类型错误
 * @param {Object} item - 百度结果项（name/keyword + score）
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
    description: '',
    habitat: '',
    confidence: Number(item.score) || 0
  };
}

/**
 * 组装识别成功的返回结构（与结果页数据契约保持一致）
 */
function buildSuccessResult({ candidate, alternatives, source, location }) {
  return {
    success: true,
    species: {
      name: candidate.name,
      latinName: candidate.latinName,
      speciesKey: candidate.speciesKey,
      category: candidate.category,
      order: candidate.order,
      family: candidate.family
    },
    // 官方图与百科文案为 v1.0 占位，后续异步抓取补充
    description: '',
    habitat: '',
    officialPhotoUrl: '',
    officialPhotoStatus: 'pending',
    confidence: candidate.confidence,
    source,
    note: candidate.category === 'fungi' ? '菌类仅供观赏参考，可能有毒，请勿采食' : null,
    previewTags: [],
    alternatives,
    location: location || '',
    discoveredAt: new Date().toISOString(),
    isMultiSubject: false
  };
}

/**
 * 组装识别失败的返回结构（reason 供前端区分失败原因）
 */
function buildFailResult(reason, message) {
  return { success: false, reason, message };
}

/**
 * 云函数入口
 * @param {Object} event - { fileID: 云存储照片 ID, location: 用户位置文本 }
 */
exports.main = async (event) => {
  const { fileID, location } = event || {};

  if (!fileID) {
    return buildFailResult('invalid_param', '照片上传异常，请重试');
  }

  try {
    // 从云存储下载照片并转 base64
    const file = await cloud.downloadFile({ fileID });
    const imageBase64 = file.fileContent.toString('base64');

    // 第一步：通用识别粗分类
    const general = await callBaiduApi(API_PATH.GENERAL, imageBase64);
    const generalTop = general.result && general.result[0];

    if (!generalTop) {
      return buildFailResult('no_result', '暂时无法识别，可能是新物种，也可能是照片不够清晰');
    }

    const root = generalTop.root || '';
    const keyword = generalTop.keyword || '';

    // 第二步：按粗分类路由到垂类接口
    // 菌类优先判断（百度常把蘑菇粗分到 植物/食物，需用名称兜底）
    if (isFungi(keyword)) {
      const candidate = toCandidate(generalTop, 'fungi');
      if (candidate.confidence < FAIL_CONFIDENCE) {
        return buildFailResult('low_confidence', '看不太清它是谁，换一张更清晰的照片试试');
      }
      return buildSuccessResult({
        candidate,
        alternatives: [],
        source: 'baidu-general',
        location
      });
    }

    if (root.includes('植物')) {
      const plant = await callBaiduApi(API_PATH.PLANT, imageBase64);
      const results = plant.result || [];
      if (!results.length) {
        return buildFailResult('no_result', '暂时无法识别，可能是新物种，也可能是照片不够清晰');
      }
      const candidate = toCandidate(results[0], 'plant');
      if (candidate.confidence < FAIL_CONFIDENCE) {
        return buildFailResult('low_confidence', '看不太清它是谁，换一张更清晰的照片试试');
      }
      return buildSuccessResult({
        candidate,
        alternatives: results.slice(1, 3).map(item => toCandidate(item, 'plant')),
        source: 'baidu-plant',
        location
      });
    }

    if (root.includes('动物')) {
      const animal = await callBaiduApi(API_PATH.ANIMAL, imageBase64);
      const results = animal.result || [];
      if (!results.length) {
        return buildFailResult('no_result', '暂时无法识别，可能是新物种，也可能是照片不够清晰');
      }
      const category = refineAnimalCategory(results[0].name);
      const candidate = toCandidate(results[0], category);
      if (candidate.confidence < FAIL_CONFIDENCE) {
        return buildFailResult('low_confidence', '看不太清它是谁，换一张更清晰的照片试试');
      }
      return buildSuccessResult({
        candidate,
        alternatives: results.slice(1, 3).map(item => toCandidate(item, refineAnimalCategory(item.name))),
        source: 'baidu-animal',
        location
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
