#!/usr/bin/env bash
# 一键安装本地 git hooks
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOK_SRC="$ROOT/scripts/hooks/pre-commit"
HOOK_DST="$ROOT/.git/hooks/pre-commit"

if [[ ! -f "$HOOK_SRC" ]]; then
  echo "找不到 $HOOK_SRC"
  exit 1
fi

mkdir -p "$ROOT/.git/hooks"
cp "$HOOK_SRC" "$HOOK_DST"
chmod +x "$HOOK_DST"
echo "✓ 已安装 .git/hooks/pre-commit"
echo "  测试拦截：echo 'ghp_***' > /tmp/test && git diff --no-index /dev/null /tmp/test | grep ghp_"
echo "  跳过门禁（仅调试）：SKIP_SECRET_CHECK=1 git commit -m '...'"
