#!/usr/bin/env bash
set -euo pipefail

trap 'echo "[setup-infra-wizard] aborted at line ${LINENO}" >&2' ERR

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${REPO_ROOT}" || exit 1

CHECK_ONLY=0
if [[ "${1:-}" == "--check" ]]; then
  CHECK_ONLY=1
fi

echo "=== Galaxy Sports Edge Infrastructure Wizard (v3) ==="
echo "Repo root: ${REPO_ROOT}"
echo ""

echo "[1/6] Checking Antigravity Desktop hooks & soc-gate readiness..."
echo "  - If soc-gate or the Windows WSL bash hook is enabled, toggle them inside"
echo "    Antigravity Desktop settings before running MCP tools or shell runners."

echo "[2/6] Checking rclone Cloudflare R2 archive readiness..."
if command -v rclone >/dev/null 2>&1; then
  echo "  - rclone detected: $(rclone --version | head -n 1)"
  echo "  - RCLONE_R2_REMOTE=${RCLONE_R2_REMOTE:-<unset>}"
  if [[ -n "${RCLONE_R2_REMOTE:-}" ]]; then
    echo "  - Dry-run preview: node scripts/ops/rclone-r2-offload.mjs"
  fi
else
  echo "  - rclone not installed on PATH (optional for local dev, recommended for cold data offload)."
fi

echo "[3/6] Checking FastAPI gse-ml-service sidecar..."
echo "  - GSE_ML_SERVICE_URL=${GSE_ML_SERVICE_URL:-<unset>}"

echo "[4/6] Checking storefront cookie, Whop webhook, and line-archive variables..."
for var_name in UNLOCK_COOKIE_SECRET WHOP_WEBHOOK_SECRET LINE_ARCHIVE_ENABLED; do
  if [[ -n "${!var_name:-}" ]]; then
    echo "  - ${var_name}: SET"
  else
    echo "  - ${var_name}: UNSET"
  fi
done

echo "[5/6] Checking Arize AX observability variables..."
for var_name in ARIZE_API_KEY ARIZE_SPACE_ID; do
  if [[ -n "${!var_name:-}" ]]; then
    echo "  - ${var_name}: SET"
  else
    echo "  - ${var_name}: UNSET (tracing runs as local no-op)"
  fi
done

echo "[6/6] Running one-command verification suite..."
if [[ "${CHECK_ONLY}" -eq 1 ]]; then
  echo "  - --check mode: skipping interactive prompts; ready to execute:"
  echo "    node scripts/ops/overnight-verify-and-ship.mjs"
  exit 0
fi

read -r -p "Run full local verification suite now? [y/N] " reply
if [[ "${reply}" =~ ^[Yy]$ ]]; then
  node scripts/ops/overnight-verify-and-ship.mjs
else
  echo "Skipped run. Execute manually anytime: node scripts/ops/overnight-verify-and-ship.mjs"
fi
