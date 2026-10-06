#!/bin/bash
# trim-verbose-output.sh — PreToolUse on Bash
#
# CONTEXT ECONOMY. Rewrites known-verbose commands so only the signal returns.
# Uses `updatedInput` (PreToolUse only) to rewrite rather than deny.
#
# Why this matters here specifically: NORTHSTAR names founder attention as the
# real bottleneck, and the fleet "produces faster than one human can absorb."
# Context is the machine-side version of the same constraint -- a 10k-line test
# log costs the same context whether or not anyone needed it.
#
# IMPORTANT: this must NOT trim the commands the Stop hook gates on, or it would
# mask exit codes. It only touches read-only inspection commands.

set -uo pipefail

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')

[ -z "$CMD" ] && { echo '{}'; exit 0; }

rewrite() {
  jq -n --arg c "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      updatedInput: { command: $c }
    }
  }'
  exit 0
}

case "$CMD" in
  # Full git log with no limit -- almost never what is wanted.
  "git log")
    rewrite "git log --oneline -20" ;;

  # Branch listing in a repo with 400+ branches floods context.
  "git branch -a"|"git branch -r")
    rewrite "$CMD | head -40 && echo '--- (truncated by hook; use git branch -r --list <pattern> to filter) ---'" ;;

  # Bare vitest with no file target runs the whole suite and prints everything.
  "npx vitest run"|"npm test")
    rewrite "$CMD 2>&1 | grep -E '(FAIL|✗|Tests |Test Files |Error)' | head -60" ;;
esac

echo '{}'
exit 0
