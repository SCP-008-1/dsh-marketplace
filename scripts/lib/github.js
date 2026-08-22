/**
 * GitHub Search API 拉取与过滤
 */
const { fetchJson } = require('./http');

// GitHub Search API 单页 100 条；最多取 MAX_PAGES 页防止静默截断
const MAX_PAGES = 5;

// 黑名单列表（忽略大小写）
const EXCLUDED_REPOS = [
  'deepseek-ai/deepseek-harness',
  'deepseek-harness'
];

// 分页拉取全部搜索结果；首页失败返回 null（调用方必须中止而不是写空数据）
async function fetchAllRepos(searchUrl, headers) {
  const items = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await fetchJson(`${searchUrl}&page=${page}`, headers);
    if (!result || !Array.isArray(result.items)) {
      if (page === 1) return null;
      console.warn(`第 ${page} 页拉取失败，仅使用前 ${items.length} 条`);
      break;
    }
    items.push(...result.items);
    if (result.items.length < 100) break;
  }
  return items;
}

// 过滤黑名单仓库（忽略大小写）
function filterExcluded(items) {
  return items.filter(repo => {
    const fullName = (repo.full_name || '').toLowerCase();
    const repoName = (repo.name || '').toLowerCase();
    return !EXCLUDED_REPOS.some(ex => fullName === ex.toLowerCase() || repoName === ex.toLowerCase());
  });
}

module.exports = { MAX_PAGES, EXCLUDED_REPOS, fetchAllRepos, filterExcluded };
