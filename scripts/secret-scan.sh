#!/usr/bin/env bash
# 扫描仓库历史与工作区中的泄露凭据。
#
#   bash scripts/secret-scan.sh              # 扫描全部 git 历史（默认）
#   bash scripts/secret-scan.sh --staged     # 只扫描暂存区，适合 pre-commit
#   bash scripts/secret-scan.sh --install-hook   # 安装 pre-commit 钩子
#
# 优先使用 PATH 上的 gitleaks；没有则下载固定版本到 .git/gitleaks-bin/（不进版本控制）。
set -euo pipefail

GITLEAKS_VERSION="8.28.0"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

config="$root/.gitleaks.toml"
mode="history"

case "${1:-}" in
  --staged) mode="staged" ;;
  --install-hook) mode="install-hook" ;;
  --help|-h) sed -n '2,8p' "$0"; exit 0 ;;
  "") ;;
  *) echo "未知参数：$1（用 --help 查看用法）" >&2; exit 2 ;;
esac

if [ "$mode" = "install-hook" ]; then
  hook="$root/.git/hooks/pre-commit"
  if [ -e "$hook" ] && ! grep -q 'secret-scan.sh' "$hook" 2>/dev/null; then
    echo "已存在 .git/hooks/pre-commit 且不是本脚本安装的，未覆盖。" >&2
    echo "请手动加入： bash scripts/secret-scan.sh --staged" >&2
    exit 1
  fi
  cat > "$hook" <<'HOOK'
#!/usr/bin/env bash
# 由 scripts/secret-scan.sh --install-hook 生成
bash "$(git rev-parse --show-toplevel)/scripts/secret-scan.sh" --staged
HOOK
  chmod +x "$hook"
  echo "已安装 pre-commit 钩子：$hook"
  exit 0
fi

# 找一个可用的 gitleaks：PATH 优先，否则下载到 .git/ 下（git 不会跟踪该目录）。
gitleaks_bin="$(command -v gitleaks 2>/dev/null || true)"
if [ -z "$gitleaks_bin" ]; then
  cache="$root/.git/gitleaks-bin"
  gitleaks_bin="$cache/gitleaks"
  if [ ! -x "$gitleaks_bin" ]; then
    case "$(uname -m)" in
      x86_64|amd64) arch="X64" ;;
      aarch64|arm64) arch="arm64" ;;
      *) echo "不支持的架构：$(uname -m)" >&2; exit 1 ;;
    esac
    mkdir -p "$cache"
    url="https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_${arch}.tar.gz"
    echo "未找到 gitleaks，正在下载 v${GITLEAKS_VERSION} ..." >&2
    if ! curl -sSL "$url" | tar -xz -C "$cache" gitleaks; then
      echo "下载失败。请手动安装 gitleaks 后重试： https://github.com/gitleaks/gitleaks/releases" >&2
      exit 1
    fi
    chmod +x "$gitleaks_bin"
  fi
fi

# --redact 保证即使命中，明文也不会出现在日志里。
if [ "$mode" = "staged" ]; then
  exec "$gitleaks_bin" git --staged --config "$config" --redact --verbose --no-banner
fi

exec "$gitleaks_bin" git . --config "$config" --redact --verbose --no-banner
