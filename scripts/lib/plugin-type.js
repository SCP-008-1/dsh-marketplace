/**
 * 插件类型判定：基于 GitHub Topics 标签
 */

// 判定插件类型
function detectPluginType(topics = []) {
  const lowerTopics = topics.map(t => t.toLowerCase());
  if (lowerTopics.includes('dsh-skill') || lowerTopics.includes('skill')) return 'skill';
  if (lowerTopics.includes('dsh-mcp') || lowerTopics.includes('mcp')) return 'mcp';
  if (lowerTopics.includes('dsh-theme') || lowerTopics.includes('theme')) return 'theme';
  if (lowerTopics.includes('dsh-prompt') || lowerTopics.includes('prompt')) return 'prompt';
  return 'extension';
}

module.exports = { detectPluginType };
