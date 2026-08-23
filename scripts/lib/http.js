/**
 * HTTP / JSON 请求辅助（Node 内置 https，无第三方依赖）
 */
const https = require('https');

// 请求 JSON；失败/非 2xx/解析错误一律 resolve(null)，由调用方决定是否中止
function fetchJson(url, headers = {}) {
  return new Promise(resolve => {
    const reqHeaders = {
      'User-Agent': 'dsh-plugin-sync-bot',
      'Accept': 'application/json, text/plain, */*',
      ...headers
    };

    https.get(url, { headers: reqHeaders, timeout: 5000 }, res => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        return resolve(null);
      }
      let body = '';
      res.setEncoding('utf8'); // 多字节 UTF-8 字符跨 chunk 边界时由 Node 缓冲，避免中文描述被截断成乱码
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null))
      .on('timeout', function() { this.destroy(); resolve(null); });
  });
}

// 探测 URL 是否存在（HEAD 请求，不下载 body）；成功 resolve(true)，其它一律 false
function probeUrl(url, headers = {}) {
  return new Promise(resolve => {
    const reqHeaders = {
      'User-Agent': 'dsh-plugin-sync-bot',
      ...headers
    };
    const req = https.request(url, { method: 'HEAD', headers: reqHeaders, timeout: 5000 }, res => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 300);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

module.exports = { fetchJson, probeUrl };
