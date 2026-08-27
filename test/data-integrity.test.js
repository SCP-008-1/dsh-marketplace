/**
 * 数据完整性测试 —— 守住两条历史上真出过问题的不变量：
 *   1. 插件 id 唯一（早期用裸仓库名做 id，499 条里有 27 条冲突，
 *      导致不同作者的同名仓库共享评分 KV 键、点击卡片打开同一个详情）
 *   2. index.html 内嵌的 bootstrap 数据与 data/plugins.json 一致
 *      （sync 脚本会同时写两处，任一处漏提交就会静默漂移）
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/plugins.json'), 'utf8'));

test('顶层字段类型正确且计数自洽', () => {
  assert.strictEqual(typeof data.updatedAt, 'string');
  assert.ok(Array.isArray(data.plugins));
  assert.strictEqual(data.total, data.plugins.length, 'total 与 plugins 长度不一致');
  assert.strictEqual(data.npmCount, data.plugins.filter(p => p.hasNpm).length, 'npmCount 与 hasNpm 实际数量不一致');
});

test('每条插件的必需字段齐备', () => {
  for (const p of data.plugins) {
    const where = `plugins[${p.id}]`;
    assert.strictEqual(typeof p.id, 'string', `${where}.id`);
    assert.strictEqual(typeof p.fullName, 'string', `${where}.fullName`);
    assert.strictEqual(typeof p.repoUrl, 'string', `${where}.repoUrl`);
    assert.ok(Array.isArray(p.tags), `${where}.tags`);
    assert.ok(Number.isFinite(p.stars) && p.stars >= 0, `${where}.stars`);
  }
});

test('插件 id 全局唯一', () => {
  const seen = new Map();
  const dups = [];
  for (const p of data.plugins) {
    if (seen.has(p.id)) dups.push(`${p.id} <- ${seen.get(p.id)} / ${p.fullName}`);
    else seen.set(p.id, p.fullName);
  }
  assert.deepStrictEqual(dups, [], `发现重复 id:\n  ${dups.join('\n  ')}`);
});

test('id 必须等于 fullName（owner/repo），不能退回裸仓库名', () => {
  const bad = data.plugins.filter(p => p.id !== p.fullName).map(p => `${p.id} != ${p.fullName}`);
  assert.deepStrictEqual(bad, [], `id 与 fullName 不一致:\n  ${bad.slice(0, 10).join('\n  ')}`);
  for (const p of data.plugins) {
    assert.match(p.id, /^[A-Za-z0-9][\w.-]*\/[A-Za-z0-9][\w.-]*$/, `id 格式非法: ${p.id}`);
  }
});

test('镜像条目字段自洽（issue #18）', () => {
  for (const p of data.plugins) {
    if (p.isMirror === undefined) continue;
    const where = `plugins[${p.id}]`;
    assert.strictEqual(p.isMirror, true, `${where}.isMirror 只能为 true 或省略`);
    assert.ok(p.upstream && typeof p.upstream === 'object', `${where}.upstream 必须存在`);
    assert.strictEqual(typeof p.upstream.alive, 'boolean', `${where}.upstream.alive`);
    if (p.upstream.alive) {
      assert.strictEqual(typeof p.upstream.fullName, 'string', `${where} 上游存活时必须有 fullName`);
    }
  }
});

test('index.html 内嵌 bootstrap 与 data/plugins.json 的 id 集合一致', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const marker = 'window.DSH_BOOTSTRAP_PLUGINS';
  const start = html.indexOf(marker);
  assert.notStrictEqual(start, -1, 'index.html 中找不到 DSH_BOOTSTRAP_PLUGINS');

  const line = html.slice(start, html.indexOf('\n', start));
  const bootIds = [...line.matchAll(/"id":"((?:[^"\\]|\\.)*)"/g)].map(m => m[1]);
  const jsonIds = data.plugins.map(p => p.id);

  assert.strictEqual(bootIds.length, jsonIds.length,
    `bootstrap 条数 ${bootIds.length} != plugins.json 条数 ${jsonIds.length}` +
    ' —— 跑 `node scripts/sync-plugins.js --bootstrap-only` 重新注入');

  const missing = jsonIds.filter(id => !bootIds.includes(id));
  assert.deepStrictEqual(missing.slice(0, 10), [],
    'bootstrap 缺少这些 id（数据已漂移，跑 `node scripts/sync-plugins.js --bootstrap-only`）:\n  ' +
    missing.slice(0, 10).join('\n  '));
});
