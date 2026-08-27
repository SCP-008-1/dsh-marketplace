/**
 * 去重与镜像检测单测（issue #18）——只测纯函数，不发网络请求。
 * dedupRepos 的 GitHub 请求部分不在此覆盖（与 security-scan 同理）。
 */
const test = require('node:test');
const assert = require('node:assert');
const {
  normalizeRepoName,
  descriptionSimilarity,
  DESC_SIMILARITY_THRESHOLD
} = require('../scripts/lib/dedup');

test('normalizeRepoName：剥离常见镜像后缀与分隔符', () => {
  assert.strictEqual(normalizeRepoName('dsh-foo'), 'dshfoo');
  assert.strictEqual(normalizeRepoName('dsh-foo-mirror'), 'dshfoo');
  assert.strictEqual(normalizeRepoName('dsh-foo-Fork'), 'dshfoo');
  assert.strictEqual(normalizeRepoName('dsh-foo-mirror-fork'), 'dshfoo'); // 连续多段后缀
  assert.strictEqual(normalizeRepoName('Foo.Bar_backup'), 'foobar');
  assert.strictEqual(normalizeRepoName(''), '');
  assert.strictEqual(normalizeRepoName(null), '');
});

test('descriptionSimilarity：完全相同=1，无交集=0，空描述=0', () => {
  const a = 'A dsh plugin for token usage tracking';
  assert.strictEqual(descriptionSimilarity(a, a), 1);
  assert.ok(descriptionSimilarity(a, 'totally unrelated words about cooking') < 0.2);
  assert.strictEqual(descriptionSimilarity(a, ''), 0);
  assert.strictEqual(descriptionSimilarity('', ''), 0);
});

test('descriptionSimilarity：中文描述可比较；镜像典型场景是原样复制描述', () => {
  const zh = '一个用于统计 dsh token 用量的插件';
  // 真实镜像通常原样复制上游描述（含标点差异）；改写幅度大的不应被启发式误报
  const copied = '一个用于统计 dsh token 用量的插件。';
  const sim = descriptionSimilarity(zh, copied);
  assert.ok(sim >= DESC_SIMILARITY_THRESHOLD, `复制描述相似度应达阈值，实际 ${sim}`);
  const rewritten = '一个完全不同定位的开发者工具集合';
  assert.ok(descriptionSimilarity(zh, rewritten) < DESC_SIMILARITY_THRESHOLD, '大幅改写不应达阈值');
});
