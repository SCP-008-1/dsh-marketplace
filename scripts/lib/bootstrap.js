/**
 * index.html 内嵌 bootstrap 数据同步：
 * 将 data/plugins.json 的插件数组内嵌进页面，保证离线与即时渲染可用。
 */
const fs = require('fs');
const path = require('path');

// 读取上一次生成的数据（用于数量骤降守卫 / --bootstrap-only）
function loadPreviousData(outputPath) {
  try {
    return JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  } catch (e) {
    return null;
  }
}

// 将插件数据内嵌进 index.html。独立出来支持 --bootstrap-only 复用
function injectBootstrap(pluginsData) {
  const indexPath = path.join(__dirname, '..', '..', 'index.html');
  if (!fs.existsSync(indexPath)) return;
  try {
    // 关键：< 必须转义为 \u003c，否则插件描述里的 "</script>" 会破出 <script> 标签造成 XSS；
    // U+2028/2029 也一并转义以兼容旧解析器
    const inlineJson = JSON.stringify(pluginsData)
      .replace(/</g, '\\u003c')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
    let indexHtml = fs.readFileSync(indexPath, 'utf-8');
    // 行锚点整行替换：非贪婪 [\s\S]*?\]; 会在描述包含 "];" 时截断数据；\s* 兼容行首缩进
    if (!/^\s*window\.DSH_BOOTSTRAP_PLUGINS\s*=.*$/m.test(indexHtml) ||
        !/^\s*window\.DSH_UPDATED_AT\s*=.*$/m.test(indexHtml)) {
      console.warn('index.html 中未找到 bootstrap 数据锚点，跳过内嵌更新');
      return;
    }
    // 用替换函数：避免插件描述里的 $&、$'、$` 等字符被当作特殊替换模式展开，损坏生成的 index.html
    indexHtml = indexHtml.replace(/^\s*window\.DSH_BOOTSTRAP_PLUGINS\s*=.*$/m, () => `window.DSH_BOOTSTRAP_PLUGINS = ${inlineJson};`);
    indexHtml = indexHtml.replace(/^\s*window\.DSH_UPDATED_AT\s*=.*$/m, () => `window.DSH_UPDATED_AT = ${JSON.stringify(new Date().toISOString())};`);
    // 静态资源缓存击穿：每次同步刷新 ?v= 版本参数（分钟级时间戳），
    // 强制浏览器拉取最新 JS/CSS——否则前端逻辑修复后，旧缓存脚本仍会展示旧行为。
    // 注意：新增资源引用时必须自带 ?v= 初始值，否则不会被本正则覆盖。
    const assetVersion = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
    // 注意：必须用带捕获组的替换函数（箭头函数中 $1 不展开），否则会把路径替换成字面 "$1"
    indexHtml = indexHtml.replace(/(assets\/(?:js|css)\/[\w.-]+\?v=)[\w.]*/g, (m, p1) => p1 + assetVersion);
    fs.writeFileSync(indexPath, indexHtml, 'utf-8');
    console.log('index.html 内嵌 bootstrap 数据已同步更新');
  } catch (e) {
    console.warn('更新 index.html 内嵌数据失败:', e.message);
  }
}

module.exports = { loadPreviousData, injectBootstrap };
