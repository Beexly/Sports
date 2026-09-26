#!/bin/bash
# guard-sealed-paths.sh — PreToolUse on Edit|Write|NotebookEdit
#
# Converts SONNET-MAX-LEVERAGE-PROMPT.md §5 "Never modify" from prose into enforcement.
#
# WHY THIS BEATS THE PROSE VERSION:
#   PreToolUse hooks fire BEFORE any permission-mode check, in EVERY mode --
#   including dontAsk and bypassPermissions. A hook that exits 2 blocks the call
#   even under --dangerously-skip-permissions. Settings `permissions.deny` rules
#   do NOT have this property against a hook-less bypass session.
#
# Exit 2 = block, stderr becomes the reason Claude sees.
# Exit 0 = no decision; normal permission flow continues.

set -uo pipefail

INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty')

[ -z "$FILE_PATH" ] && exit 0

# Normalize Windows separators so patterns match on any platform.
FILE_PATH="${FILE_PATH//\\//}"

# §5 never-modify list, verbatim from the operating prompt.
SEALED=(
  "packages/db/prisma/schema.prisma"
  "packages/db/prisma/migrations/"
  ".github/workflows/"
  "scripts/guardrails/"
  ".claude/"
  "package-lock.json"
  ".gitignore"
  ".githooks/"
  "apps/web/lib/ai-control-plane/"
)

for pattern in "${SEALED[@]}"; do
  if [[ "$FILE_PATH" == *"$pattern"* ]]; then
    echo "SEALED PATH: '$FILE_PATH' matches '$pattern' (SONNET-MAX-LEVERAGE §5 never-modify list). This is enforced by hook, not convention. If this change is genuinely required, it is a founder/operator action -- write it up as an owner ask citing docs/ops/OPERATOR.md." >&2
    exit 2
  fi
done

# Any .env* file, at any depth.
case "$FILE_PATH" in
  *.env|*.env.*|*/.env|*/.env.*)
    echo "SEALED PATH: '$FILE_PATH' is an environment file. Never edited by an agent seat. Surface as an owner ask (docs/ops/OPERATOR.md)." >&2
    exit 2
    ;;
esac

exit 0
