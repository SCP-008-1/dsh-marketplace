/**
 * 去重与镜像检测（issue #18）
 *
 * 问题：同一插件被 fork 多次后，多个镜像仓库都带 dsh-plugin Topic 被自动收录，
 * 搜索出现大量重复条目且无法分辨哪个是上游原始仓库。
 *
 * 三层处理：
 *   1. fork 链识别：Search API 结果自带 fork 布尔字段；对 fork 仓库逐个调
 *      GET /repos/{owner}/{repo} 取 source 根归属（Search API 不返回 parent/source）。
 *        - 上游根仓库在本轮收录集合中 → 直接跳过该镜像，不作为独立插件收录
 *        - 上游存在但不在收录集合（如未打 topic）→ 保留条目并标注 isMirror + upstream
 *          （保留发现价值：卡片显示「镜像 → 指向上游」而非隐藏）
 *        - 上游已删除（404）→ 保留条目并标注 upstream.alive=false，前端给出接管提示路径
 *        - 判定失败（限流/网络）→ 保守放行不标注（fail-open），绝不凭单次失败误杀
 *   2. 非 fork 疑似镜像启发式（已知限制：手动改名的镜像无法靠 API 字段识别）：
 *      仓库名归一化 + 描述 Jaccard 相似度，仅输出「人工确认」日志，绝不自动合并
 *   3. 去重统计日志：跳过 N 个镜像 / 保留 M 个标注镜像等，满足同步日志验收标准
 */
const { fetchJsonStatus } = require('./http');

// fork 上游解析并发数（与验证阶段批量粒度一致，避免触发 GitHub 二级限流）
const FORK_PROBE_CONCURRENCY = 10;

// 描述 Jaccard 相似度阈值：仅作人工确认提示，阈值取保守值减少误报
const DESC_SIMILARITY_THRESHOLD = 0.75;

// 疑似镜像最多逐条打印的对数，防止日志爆炸
const MAX_SUSPECT_LOG = 20;

// 仓库名归一化时剥离的常见镜像语义后缀（可连续多段，如 -mirror-fork）
const MIRROR_NAME_SUFFIXES = ['mirror', 'fork', 'backup', 'copy', 'clone'];

/**
 * 归一化仓库名：小写 → 循环剥离镜像后缀 → 去掉非字母数字。
 * 用于非 fork 镜像启发式比对：foo-bar 与 Foo.Bar.mirror 归一化后同为 foobar。
 */
function normalizeRepoName(name) {
  let n = String(name || '').toLowerCase();
  let changed = true;
  while (changed) {
    changed = false;
    for (const suf of MIRROR_NAME_SUFFIXES) {
      // 同时覆盖 -mirror 与 _mirror 两种命名习惯
      if (n.endsWith('-' + suf) || n.endsWith('_' + suf)) {
        n = n.slice(0, -(suf.length + 1));
        changed = true;
      }
    }
  }
  return n.replace(/[^a-z0-9]/g, '');
}

// 描述分词：按非字母数字/中文段切分，过滤单字符噪声；返回 Set 供 Jaccard 计算
function tokenizeDescription(text) {
  return new Set(
    String(text || '')
      .toLowerCase()
      .split(/[^a-z0-9\u4e00-\u9fff]+/)
      .filter(w => w.length > 1)
  );
}

/** 描述 Jaccard 相似度 ∈ [0,1]；任一侧为空返回 0（无法判定 ≠ 相似） */
function descriptionSimilarity(a, b) {
  const sa = tokenizeDescription(a);
  const sb = tokenizeDescription(b);
  if (!sa.size || !sb.size) return 0;
  let inter = 0;
  for (const w of sa) if (sb.has(w)) inter++;
  return inter / (sa.size + sb.size - inter);
}

/**
 * 解析单个 fork 仓库的上游根归属。
 * @returns {{upstream:{fullName,url}} | {gone:true} | {unknown:true}}
 *   upstream: source 根仓库存在；gone: 整条请求链 404（上游已删除）；unknown: 限流/网络/字段缺失
 */
async function resolveForkSource(fullName, headers) {
  const res = await fetchJsonStatus(`https://api.github.com/repos/${fullName}`, headers);
  // 网络异常/超时：status=0，必须保守处理
  if (!res || res.status === 0) return { unknown: true };
  // 404 说明该 fork 的归属链不可达（上游被删等），是明确的"消失"信号
  if (res.status === 404) return { gone: true };
  const src = res.json && res.json.source;
  if (src && src.full_name) {
    return {
      upstream: {
        fullName: src.full_name,
        url: src.html_url || `https://github.com/${src.full_name}`
      }
    };
  }
  // 非 fork 链或字段缺失：视为无法判定
  return { unknown: true };
}

/**
 * 去重主流程：从 Search API 结果中收敛 fork 镜像并对保留的镜像做标注。
 * @param {Array} items filterExcluded 后的 Search API 仓库列表（含 fork 字段）
 * @param {object} headers GitHub API 鉴权头
 * @returns {{kept:Array, skippedList:Array, suspectPairs:Array, stats:object}}
 *   kept 中每个 repo 可能带 __mirror = { fullName, url, alive }（同步脚本转成插件字段）
 */
async function dedupRepos(items, headers) {
  const nonForks = [];
  const forks = [];
  for (const repo of items) {
    (repo.fork === true ? forks : nonForks).push(repo);
  }

  const stats = {
    total: items.length,
    forkTotal: forks.length,
    skippedMirrors: 0,   // 上游已收录而被跳过的镜像
    keptMirrors: 0,      // 保留并标注的镜像
    deadUpstream: 0,     // 其中上游已删除的
    unknownForks: 0      // 无法判定而保守放行的
  };

  // 批量并发解析每个 fork 的上游根仓库
  const resolved = new Map(); // fork fullName -> resolveForkSource 结果
  for (let i = 0; i < forks.length; i += FORK_PROBE_CONCURRENCY) {
    const batch = forks.slice(i, i + FORK_PROBE_CONCURRENCY);
    await Promise.all(batch.map(async repo => {
      resolved.set(repo.full_name, await resolveForkSource(repo.full_name, headers));
    }));
  }

  const indexedNames = new Set(nonForks.map(r => r.full_name));
  const kept = [...nonForks];
  const skippedList = []; // { fullName, upstream }——liveness 需据此排除上一轮残留条目

  for (const repo of forks) {
    const info = resolved.get(repo.full_name) || { unknown: true };

    // 默认收录策略：只收录 source 根仓库，fork 且上游在册的直接跳过
    if (info.upstream && indexedNames.has(info.upstream.fullName)) {
      stats.skippedMirrors++;
      skippedList.push({ fullName: repo.full_name, upstream: info.upstream.fullName });
      continue;
    }

    if (info.unknown) {
      // 判定失败（限流/网络）：fail-open 放行为普通条目，避免误杀真实插件
      stats.unknownForks++;
      console.warn(`⚠ 无法解析 fork 上游归属（保守放行，不标注镜像）: ${repo.full_name}`);
    } else {
      if (info.gone) {
        // 上游已删除：镜像成为事实上的唯一来源，alive=false 触发前端接管提示
        repo.__mirror = { fullName: null, url: null, alive: false };
        stats.deadUpstream++;
      } else {
        // 上游存活但未进商城（未打 topic 等）：标注指向上游，保留发现价值
        repo.__mirror = { fullName: info.upstream.fullName, url: info.upstream.url, alive: true };
      }
      stats.keptMirrors++;
    }
    kept.push(repo);
  }

  // 非 fork 疑似镜像启发式：同名归一化桶内两两比较描述相似度，只提示不合并
  const buckets = new Map();
  for (const repo of kept) {
    const key = normalizeRepoName(repo.name);
    if (!key) continue;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(repo);
  }
  const suspectPairs = [];
  for (const group of buckets.values()) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const sim = descriptionSimilarity(group[i].description, group[j].description);
        if (sim >= DESC_SIMILARITY_THRESHOLD) {
          suspectPairs.push({ a: group[i].full_name, b: group[j].full_name, similarity: sim });
        }
      }
    }
  }

  // 同步日志输出去重统计（验收标准第 3 条）
  console.log(
    `去重统计：共 ${stats.total} 个仓库，fork ${stats.forkTotal} 个；` +
    `跳过 ${stats.skippedMirrors} 个镜像（上游已收录）；` +
    `保留 ${stats.keptMirrors} 个标注镜像（上游未收录 ${stats.keptMirrors - stats.deadUpstream} 个 / 上游已删除 ${stats.deadUpstream} 个）；` +
    `无法判定保守放行 ${stats.unknownForks} 个`
  );
  if (suspectPairs.length > 0) {
    console.log(
      `发现 ${suspectPairs.length} 对疑似非 fork 镜像` +
      `（名称归一化相同 + 描述相似度 ≥ ${DESC_SIMILARITY_THRESHOLD}），需人工确认合并：`
    );
    for (const s of suspectPairs.slice(0, MAX_SUSPECT_LOG)) {
      console.log(`  [人工确认] ${s.a} <-> ${s.b} (描述相似度 ${s.similarity.toFixed(2)})`);
    }
    if (suspectPairs.length > MAX_SUSPECT_LOG) {
      console.log(`  ... 其余 ${suspectPairs.length - MAX_SUSPECT_LOG} 对省略`);
    }
  }

  return { kept, skippedList, suspectPairs, stats };
}

module.exports = {
  dedupRepos,
  normalizeRepoName,
  descriptionSimilarity,
  resolveForkSource,
  DESC_SIMILARITY_THRESHOLD
};
