#!/bin/bash
# guard-git-and-gates.sh — PreToolUse on Bash
#
# Enforces three §5 rules that were previously prose only:
#   1. Never push to main / never merge to main yourself
#   2. Never flip a gate or env flag (the honesty boundary)
#   3. Never create/modify/dispatch a GitHub Actions workflow (§6, CI minutes)
#
# Uses structured JSON deny so the reason reaches Claude cleanly.
# NOTE: exit 2 and JSON-deny are alternative styles -- this script uses JSON only,
# per the docs' guidance not to mix the two in one hook.

set -uo pipefail

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')

[ -z "$CMD" ] && exit 0

deny() {
  jq -n --arg reason "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    }
  }'
  exit 0
}

# --- 1. Pushes and merges to main -------------------------------------------
# Matches: git push origin main, git push -u origin main, git push origin HEAD:main
if printf '%s' "$CMD" | grep -Eq '(^|[;&|]\s*)git\s+push\b'; then
  if printf '%s' "$CMD" | grep -Eq '\b(main|master)\b|HEAD:(main|master)'; then
    deny "BLOCKED: push to main. §1 of the operating prompt authorizes pushes to sonnet/* feature branches ONLY; the founder merges. Push to 'sonnet/<task-slug>' and open a PR instead."
  fi
fi

if printf '%s' "$CMD" | grep -Eq '(^|[;&|]\s*)git\s+merge\b' && \
   printf '%s' "$CMD" | grep -Eq '\b(main|master|origin/main)\b'; then
  deny "BLOCKED: merge to main. Merges to main are a founder action (STATE.md founder queue). Open a PR."
fi

# gh pr merge is the same action by another route.
if printf '%s' "$CMD" | grep -Eq 'gh\s+pr\s+merge'; then
  deny "BLOCKED: 'gh pr merge'. Merging is founder-only (governance precedent C-60: never self-mark founder-owned rows DONE)."
fi

# --- 2. Gate / feature-flag flips -------------------------------------------
# The honesty boundary. Opening a gate publishes an unearned claim (C-32).
GATES='PUBLIC_PICKS|STATS_PUBLIC|LIVE_BOARD|PERFORMANCE_STATS|PUBLISH_LEDGER|REFUND_REVOKES_ACCESS'
if printf '%s' "$CMD" | grep -Eq "($GATES)\s*=" ; then
  deny "BLOCKED: gate/env-flag assignment detected. Gates are the honesty boundary -- flipping one publishes an unearned claim. Founder-YES only (§5). Surface as an owner ask."
fi
if printf '%s' "$CMD" | grep -Eq 'vercel\s+env' ; then
  deny "BLOCKED: 'vercel env' is an operator-only action (docs/ops/OPERATOR.md). Write it up as a precise owner ask; never attempt or simulate it."
fi

# --- 3. GitHub Actions workflow manipulation (§6 CI-minutes economy) --------
if printf '%s' "$CMD" | grep -Eq 'gh\s+workflow\s+(run|enable|disable)|gh\s+run\s+rerun'; then
  deny "BLOCKED: manual workflow dispatch. The Actions free pool was exhausted 2026-08-26; workflow_dispatch runs count against it. §6 rule 4: never create, modify, enable, disable, or dispatch a workflow. The scheduled-workflow fixes are owner asks."
fi

# --- 4. Verification-masking (§1 'real exit codes always') -----------------
# Piping a verify command through head/tail hides its exit status. This has
# hidden a real failure before, per the operating prompt.
if printf '%s' "$CMD" | grep -Eq '(npm run (typecheck|lint|build|guardrails|check:ledger|agent:eval)|vitest run)[^|]*\|\s*(head|tail)\b'; then
  deny "BLOCKED: verification command piped through head/tail, which masks the real exit code (§1). Run it unpiped and read the exit status. If the output is too long, redirect to a file and grep the file."
fi

exit 0
