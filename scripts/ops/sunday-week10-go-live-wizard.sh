#!/usr/bin/env bash
# Interactive owner-only Week 10 Sunday cutover wizard.
#
# Agents NEVER run --execute on adjudicate-stale-picks or flip live Vercel env
# gates on their own. Run with --dry-run (default) first, then --execute when
# ready to cut over production. Pure ASCII only.

set -euo pipefail

MODE="dry-run"
if [[ "${1:-}" == "--execute" ]]; then
  MODE="execute"
fi

confirm() {
  local prompt="$1"
  local reply=""
  read -r -p "$prompt [y/N] " reply
  [[ "$reply" == "y" || "$reply" == "Y" ]]
}

echo "=== Galaxy Sports Edge - Week 10 Owner Cutover Wizard ($MODE) ==="
echo "Step 1: Read-only production launch readiness probe..."
node scripts/check-launch-readiness.mjs

echo ""
echo "Step 2: Dry-run inspect stale pending picks (May/June un-refreshed rows)..."
npm run ops:stale-picks:unpublish

if [[ "$MODE" == "dry-run" ]]; then
  echo ""
  echo "DRY RUN COMPLETE. Re-run with 'bash scripts/ops/sunday-week10-go-live-wizard.sh --execute' to apply interactively."
  exit 0
fi

echo ""
if confirm "Apply stale pending pick unpublish (npm run ops:stale-picks:unpublish -- --execute)?"; then
  npm run ops:stale-picks:unpublish -- --execute
else
  echo "Skipped stale-picks unpublish."
fi

for VAR_NAME in PUBLIC_PICKS_ENABLED LIVE_BOARD PERFORMANCE_STATS_ENABLED PUBLISH_LEDGER; do
  echo ""
  if confirm "Flip Vercel production env var $VAR_NAME to true?"; then
    printf "true" | npx vercel env rm "$VAR_NAME" production --yes >/dev/null 2>&1 || true
    printf "true" | npx vercel env add "$VAR_NAME" production
    echo "Set $VAR_NAME=true in Vercel production."
  else
    echo "Left $VAR_NAME unchanged."
  fi
done

echo ""
if confirm "Keep CALIBRATION_ADJUSTMENTS_ENABLED fail-closed (false)? Recommend Y (stay false until 200+ settled CLV plays)."; then
  echo "Keeping CALIBRATION_ADJUSTMENTS_ENABLED=false."
else
  if confirm "Confirm you really want to set CALIBRATION_ADJUSTMENTS_ENABLED=true in production?"; then
    printf "true" | npx vercel env rm CALIBRATION_ADJUSTMENTS_ENABLED production --yes >/dev/null 2>&1 || true
    printf "true" | npx vercel env add CALIBRATION_ADJUSTMENTS_ENABLED production
  fi
fi

echo ""
if confirm "Trigger production deploy (npx vercel --prod) to pick up updated env flags?"; then
  npx vercel --prod
else
  echo "Skipped vercel --prod deploy."
fi

echo ""
echo "Running Orbit unlock smoke & final readiness verification..."
npm run orbit:unlock-smoke
node scripts/check-launch-readiness.mjs
echo "=== Cutover wizard finished ==="
