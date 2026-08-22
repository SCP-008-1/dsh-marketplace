/**
 * 一次性数据修复：对 data/plugins.json 中 hasNpm=false 的插件，
 * 检测其 GitHub 仓库根目录是否存在 package.json：
 *   - 存在        → 保留 `npm i github:<owner>/<repo>`（npm git 协议可安装）
 *   - 不存在      → installCmd 置为 null（避免生成必败的 npm 安装命令）
 * 之后同步刷新 index.html 内嵌 bootstrap 数据与 Wiki。
 *
 * 用法: GITHUB_TOKEN=xxx node scripts/fix-install-cmds.js
 */
const path = require('path');
const fs = require('fs');

const { fetchJson } = require('./lib/http');
const { injectBootstrap } = require('./lib/bootstrap');
const { generateWiki } = require('./lib/wiki');

async function main() {
  const dataPath = path.join(__dirname, '..', 'data', 'plugins.json');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const targets = data.plugins.filter(p => !p.hasNpm);
  console.log(`待校验 (hasNpm=false): ${targets.length} 个`);

  const token = process.env.GITHUB_TOKEN || '';
  const headers = token ? { Authorization: `token ${token}` } : {};
  const batchSize = 10;
  let removed = 0;

  for (let i = 0; i < targets.length; i += batchSize) {
    await Promise.all(targets.slice(i, i + batchSize).map(async p => {
      let hasPkgJson = false;
      for (const branch of ['main', 'master']) {
        const pkg = await fetchJson(`https://raw.githubusercontent.com/${p.fullName}/${branch}/package.json`, headers);
        if (pkg && typeof pkg === 'object') { hasPkgJson = true; break; }
      }
      if (!hasPkgJson && p.installCmd) {
        p.installCmd = null;
        removed++;
      }
    }));
    process.stdout.write(`已校验: ${Math.min(i + batchSize, targets.length)}/${targets.length}\r`);
  }

  console.log(`\n移除无效安装命令: ${removed} 个`);
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`已写回 ${dataPath}`);

  injectBootstrap(data.plugins);
  const npmPlugins = data.plugins.filter(p => p.hasNpm);
  generateWiki(data.plugins, npmPlugins);
  console.log('index.html 内嵌数据与 Wiki 已同步刷新');
}

main().catch(err => { console.error('修复失败:', err); process.exit(1); });
