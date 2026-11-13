#!/usr/bin/env bash
# T-05 — Honest Equation Executor & Sinkhorn kernels (WP-7, fail-closed).
# Contract (WP-2):
#   - honest_equation_executor.py has a pytest suite that passes.
#   - intelligence/ops/run_week10_quant_kernels.py supports --verify-only:
#     prints JSON with sinkhorn_max_residual < 1e-9 and games >= 13, exit 0.
set -euo pipefail
cd "$(dirname "$0")/../../.." || exit 2
FAIL=0

EXEC="$(find scripts intelligence packages -name 'honest_equation_executor.py' -not -path '*/node_modules/*' 2>/dev/null | head -1 || true)"
if [ -z "$EXEC" ]; then
  echo "FAIL  honest_equation_executor.py not found"; FAIL=1
else
  TESTDIR="$(dirname "$EXEC")"
  echo "--- pytest around $EXEC"
  if python -m pytest "$TESTDIR" -q -k "executor or equation or honest" 2>&1 | tail -3; then
    :
  else
    echo "FAIL  executor tests"; FAIL=1
  fi
fi

KERNELS="intelligence/ops/run_week10_quant_kernels.py"
if [ ! -f "$KERNELS" ]; then
  echo "FAIL  $KERNELS missing (NOT IMPLEMENTED)"; FAIL=1
else
  echo "--- $KERNELS --verify-only"
  CODE=0
  OUT="$(python "$KERNELS" --verify-only 2>&1)" || CODE=$?
  echo "$OUT" | tail -5
  if [ "$CODE" -ne 0 ]; then
    echo "FAIL  kernels exit $CODE"; FAIL=1
  else
    if ! echo "$OUT" | python -c "
import json,sys
raw=sys.stdin.read()
start=raw.find('{')
d=json.loads(raw[start:raw.rindex('}')+1])
r=d.get('sinkhorn_max_residual')
assert r is not None and r < 1e-9, f'sinkhorn residual {r}'
assert d.get('games',0) >= 13, f'games {d.get(\"games\")}'
print('  sinkhorn_max_residual=%s games=%s OK' % (r, d.get('games')))
"; then
      echo "FAIL  kernel conservation contract"; FAIL=1
    fi
  fi
fi

if [ "$FAIL" -eq 0 ]; then
  echo "T-05 PASS"
else
  echo "T-05 FAIL"; exit 1
fi