#!/bin/bash
# gate-session-close.sh — Stop hook
#
# Turns "the verify block" (§7.3) from a checklist the seat must REMEMBER to run
# into a gate it CANNOT skip. Exit 2 on a Stop hook prevents Claude from stopping
# and feeds stderr back as the reason -- so Claude fixes it without being asked.
#
# This is the single highest-leverage hook in the kit: it makes "tests pass" a
# structural fact rather than a self-report, which is exactly the gap the
# NORTHSTAR "builder never verifies own work" law is trying to close.
#
# Designed to be CHEAP (no CI minutes, no network): typecheck + ledger + eval.
# Build/guardrails stay manual because they are slow -- see note at the bottom.

set -uo pipefail

REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$REPO_ROOT" || exit 0

# Escape hatch: if a session legitimately needs to stop mid-verification
# (dying session, BLOCKED protocol), the seat writes this file with a reason.
# The BLOCKED protocol in §12 explicitly allows an honest partial.
if [ -f "$REPO_ROOT/.claude/.stop-override" ]; then
  REASON=$(cat "$REPO_ROOT/.claude/.stop-override" 2>/dev/null)
  rm -f "$REPO_ROOT/.claude/.stop-override"
  echo "Stop gate overridden. Recorded reason: ${REASON:-<none given>}" >&2
  exit 0
fi

# Nothing staged or modified => nothing to verify. Let the turn end.
if git diff --quiet HEAD 2>/dev/null && [ -z "$(git status --porcelain 2>/dev/null)" ]; then
  exit 0
fi

FAILURES=""

TS_ERRORS=$(npm run typecheck 2>&1 | grep -c "error TS" || true)
if [ "$TS_ERRORS" != "0" ]; then
  FAILURES="${FAILURES}
- typecheck: ${TS_ERRORS} 'error TS' occurrences (must be 0)"
fi

if ! npm run check:ledger >/dev/null 2>&1; then
  FAILURES="${FAILURES}
- check:ledger: non-zero exit. A ledger row is malformed, or a DONE row lacks resolvable evidence."
fi

if ! npm run agent:eval >/dev/null 2>&1; then
  FAILURES="${FAILURES}
- agent:eval: non-zero exit on deterministic fixtures."
fi

if [ -n "$FAILURES" ]; then
  cat >&2 <<EOF
SESSION CANNOT CLOSE -- the §7.3 verify block is red:
${FAILURES}

Fix these before ending the turn. Do not weaken a guard, assertion, or threshold
to make them pass (§4 honesty law 4). If a failure is genuinely out of scope,
follow the two-attempt rule: revert, mark the ledger row BLOCKED with the exact
error text, then write .claude/.stop-override with the reason and stop.
EOF
  exit 2
fi

# Ledger currency check: STATE.md must be touched if any commit happened.
# NORTHSTAR §3: "Any session that ends without updating it has not finished."
if git log --oneline -1 --since="6 hours ago" >/dev/null 2>&1; then
  if [ -f docs/ops/STATE.md ]; then
    LAST_STATE_COMMIT=$(git log -1 --format=%ct -- docs/ops/STATE.md 2>/dev/null || echo 0)
    LAST_ANY_COMMIT=$(git log -1 --format=%ct 2>/dev/null || echo 0)
    if [ "$LAST_ANY_COMMIT" -gt "$LAST_STATE_COMMIT" ]; then
      echo "SESSION CANNOT CLOSE -- commits landed after the last docs/ops/STATE.md update. The librarian duty (NORTHSTAR §3) is standing overhead on every Claude session: update STATE.md (founder queue <=3, what is in flight, what is quarantined) before ending. Cap ~60 lines." >&2
      exit 2
    fi
  fi
fi

exit 0

# ---------------------------------------------------------------------------
# DELIBERATELY NOT IN THIS HOOK:
#   npm run build, npm run guardrails  -- both slow; running them on EVERY turn
#   end would make the session unusable. They belong in the pre-PR skill
#   (.claude/skills/session-close/) which the seat invokes once, not per turn.
#   Guidance: a Stop hook should be fast enough that you forget it is there.
# ---------------------------------------------------------------------------
