#!/usr/bin/env bash
set -euo pipefail
# Blocks destructive git operations (reset --hard, push --force, clean -fd, branch -D main)
CMD_INPUT="${1:-}"
if echo "$CMD_INPUT" | grep -Eq "git\s+(reset\s+--hard|push\s+.*--force|clean\s+-f|checkout\s+--\s+\.)"; then
  echo "BLOCKED by .claude/hooks/block-dangerous-git.sh: Destructive git command rejected: $CMD_INPUT" >&2
  exit 2
fi
exit 0
