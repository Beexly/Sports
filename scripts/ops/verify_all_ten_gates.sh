#!/usr/bin/env bash
# verify_all_ten_gates.sh — WP-7 FAIL-CLOSED gate runner (owner directive 2026-11-13).
#
# Runs the pre-sim dry run (T-00) + all ten blocking gates T-01..T-10.
# A gate whose script does not exist FAILS ("NOT IMPLEMENTED") — there is no
# path to a green run with missing checks. Exit 0 ONLY when every check passes.
# WP-8 simulation is forbidden unless this script exits 0 (REFUSE_PROJECTION).
#
# Usage: bash scripts/ops/verify_all_ten_gates.sh [--skip-dry-run]
#   --skip-dry-run: development convenience ONLY; the WP-8 invocation must NOT use it.
set -euo pipefail
cd "$(dirname "$0")/../.." || exit 2

GATES_DIR="scripts/ops/gates"
SKIP_DRY=0
if [ "${1:-}" = "--skip-dry-run" ]; then SKIP_DRY=1; fi

# Read-only Neon URL for DB gates (never printed).
if [ -z "${DATABASE_URL:-}" ]; then
  DATABASE_URL="$(neonctl connection-string main --project-id summer-brook-99380762 --role-name hermes_ro 2>/dev/null | tail -1)"
  export DATABASE_URL
fi

PY=python
command -v python >/dev/null 2>&1 || PY=python3

declare -a NAMES=(
  "T-01 Board Quarantine & W9/TNF Settlement"
  "T-02 Live HNSW EXPLAIN cost<12000 & <5s"
  "T-03 Football Semantic Retrieval"
  "T-04 lit.situation Verbatim Quote Integrity"
  "T-05 Honest Equation Executor & Sinkhorn<1e-9"
  "T-06 Live lit.premise Router & {}->0 Nullity"
  "T-07 32-Team 800-Row Injuries & player_gp"
  "T-08 Live Shin De-Vig != 0.5238"
  "T-09 Purged OOF Calibration & Placebo"
  "T-10 Repo Guardrails + tsc --noEmit"
)

run_gate() {
  local prefix="$1" label="$2"
  local script
  script="$(ls "$GATES_DIR"/${prefix}_* 2>/dev/null | head -1 || true)"
  if [ -z "$script" ]; then
    echo "FAIL  $label — NOT IMPLEMENTED ($GATES_DIR/${prefix}_* missing)"
    return 1
  fi
  echo "--- $label ($script)"
  case "$script" in
    *.mjs|*.js) node "$script" ;;
    *.py) "$PY" "$script" ;;
    *.sh) bash "$script" ;;
    *) echo "FAIL  $label — unknown script type"; return 1 ;;
  esac
}

FAILED=0
PASSED=0

if [ "$SKIP_DRY" -eq 0 ]; then
  if run_gate "t00" "T-00 --dry-run-pre-sim (all remaining Week 10 games)"; then
    PASSED=$((PASSED+1))
  else
    FAILED=$((FAILED+1))
  fi
fi

for i in 01 02 03 04 05 06 07 08 09 10; do
  idx=$((10#$i - 1))
  if run_gate "t$i" "${NAMES[$idx]}"; then
    PASSED=$((PASSED+1))
  else
    FAILED=$((FAILED+1))
  fi
done

echo ""
echo "=================================================="
echo "GATE SUMMARY: $PASSED passed, $FAILED failed"
if [ "$FAILED" -gt 0 ]; then
  echo "REFUSE_PROJECTION — WP-8 simulation is BLOCKED (fail-closed)."
  exit 1
fi
echo "ALL GATES GREEN — WP-8 post-gate simulation authorized."
exit 0