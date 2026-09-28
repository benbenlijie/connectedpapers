#!/usr/bin/env bash
# 本地初始化：安装依赖、准备数据目录、复制后端环境变量样例。
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

command -v bun >/dev/null || { echo "需要 Bun ≥1.3：https://bun.sh"; exit 1; }
command -v pnpm >/dev/null || { echo "需要 pnpm 9"; exit 1; }

mkdir -p data

if [ ! -f server/.env ]; then
  cp server/.env.example server/.env
  echo "已创建 server/.env（可选：填入 SEMANTIC_SCHOLAR_API_KEY 提升速率限制）"
fi

(cd academic-paper-explorer && pnpm install)

echo "初始化完成。运行： bun run build:web && bun run server"
