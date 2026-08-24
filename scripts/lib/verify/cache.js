/**
 * 验证结果缓存：增量扫描的核心。
 * key = 仓库 fullName；pushed_at 未变化的仓库直接复用上轮扫描结果，
 * 仅刷新展示层所需的 lastVerifiedAt（避免"验证时间"随每次同步漂移误导用户，
 * lastVerifiedAt 只在真正重新扫描时更新）。
 */
const fs = require('fs');
const path = require('path');

const CACHE_PATH = path.join(__dirname, '..', '..', '..', 'data', 'verification-cache.json');

function loadCache() {
  try {
    const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
    const json = JSON.parse(raw);
    return (json && typeof json.entries === 'object') ? json : { updatedAt: null, entries: {} };
  } catch (e) {
    return { updatedAt: null, entries: {} };
  }
}

function saveCache(cache) {
  cache.updatedAt = new Date().toISOString();
  // data/ 由同步脚本在后续步骤才创建，验证阶段先行写盘时需自建，避免 ENOENT 中断整轮同步
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
}

// 命中条件：缓存中存在该仓库，且 pushedAt 与本轮一致（源码无变动）。
// pushedAt 缺失时不允许命中，防止异常数据导致永不重扫
function getFreshEntry(cache, fullName, pushedAt) {
  const entry = cache.entries[fullName];
  if (!entry || !entry.verification || !pushedAt) return null;
  return entry.pushedAt === pushedAt ? entry : null;
}

function putEntry(cache, fullName, pushedAt, verification) {
  cache.entries[fullName] = { pushedAt: pushedAt || null, scannedAt: new Date().toISOString(), verification };
}

// 清理已从 topic 下架的仓库条目，防止缓存无限膨胀
function pruneCache(cache, keepFullNames) {
  const keep = new Set(keepFullNames);
  for (const name of Object.keys(cache.entries)) {
    if (!keep.has(name)) delete cache.entries[name];
  }
}

module.exports = { loadCache, saveCache, getFreshEntry, putEntry, pruneCache, CACHE_PATH };
