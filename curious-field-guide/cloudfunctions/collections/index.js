// 好奇图鉴 - 收藏云函数
// 职责：用户收藏记录的云端存储（云数据库按 openid 隔离，换机/重装不丢）
// 动作：list 列表 / add 收藏（按 speciesKey 去重）/ get 单条 / migrate 本地数据迁移
// 说明：微信静默登录，openid 从云函数上下文获取，前端无需任何授权弹窗

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const COLLECTION_NAME = 'collections';

// 集合是否已确认存在（实例复用时跳过重复检查）
let collectionReady = false;

/**
 * 确保 collections 集合存在（首次写入前自动创建；已存在时 createCollection 会报错，忽略即可）
 */
async function ensureCollection() {
  if (collectionReady) {
    return;
  }
  try {
    await db.createCollection(COLLECTION_NAME);
    console.log('[collections] 创建集合成功');
  } catch (error) {
    // 集合已存在，忽略
  }
  collectionReady = true;
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { action, record, records, speciesKey } = event || {};

  if (!OPENID) {
    return { success: false, message: '无法获取用户身份' };
  }

  try {
    await ensureCollection();
    const coll = db.collection(COLLECTION_NAME);

    // 收藏列表（按收藏时间倒序，个人量级 limit 100 足够）
    if (action === 'list') {
      const res = await coll
        .where({ _openid: OPENID })
        .orderBy('collectedAt', 'desc')
        .limit(100)
        .get();
      return { success: true, list: res.data };
    }

    // 新增收藏（按 speciesKey 去重）
    if (action === 'add') {
      if (!record || !record.speciesKey) {
        return { success: false, message: '缺少物种信息' };
      }
      const dup = await coll
        .where({ _openid: OPENID, speciesKey: record.speciesKey })
        .count();
      if (dup.total > 0) {
        return { success: true, duplicated: true };
      }
      await coll.add({
        data: {
          ...record,
          _openid: OPENID,
          collectedAt: new Date().toISOString()
        }
      });
      return { success: true, duplicated: false };
    }

    // 本地数据迁移（逐条去重写入）
    if (action === 'migrate') {
      let added = 0;
      for (const item of records || []) {
        if (!item || !item.speciesKey) {
          continue;
        }
        const dup = await coll
          .where({ _openid: OPENID, speciesKey: item.speciesKey })
          .count();
        if (dup.total === 0) {
          await coll.add({
            data: {
              ...item,
              _openid: OPENID,
              collectedAt: item.collectedAt || new Date().toISOString()
            }
          });
          added++;
        }
      }
      return { success: true, added };
    }

    // 单条查询（结果页只读模式）
    if (action === 'get') {
      if (!speciesKey) {
        return { success: false, message: '缺少物种标识' };
      }
      const res = await coll
        .where({ _openid: OPENID, speciesKey })
        .limit(1)
        .get();
      if (!res.data.length) {
        return { success: false, message: '记录不存在' };
      }
      return { success: true, record: res.data[0] };
    }

    return { success: false, message: '未知操作' };
  } catch (error) {
    console.error('[collections] 操作失败', action, error);
    return { success: false, message: '收藏服务暂时开小差了' };
  }
};
