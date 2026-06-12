#!/usr/bin/env bash
# web-session-setup.sh
#
# Idempotent bootstrap for Claude Code on the web (and any fresh clone).
# The remote container is cloned fresh with no node_modules and no generated
# Prisma client, which makes every gate (typecheck/test/build) fail until
# dependencies are installed and the client is generated. This script makes
# the workspace green-able on session start. It is fast on warm containers
# because each step is guarded.
#
# Wired as a SessionStart hook in .claude/settings.json.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 0

# 1. Install workspace dependencies if they're missing.
if [ ! -d node_modules ] || [ ! -d node_modules/@types/node ]; then
  echo "[web-session-setup] installing dependencies…"
  npm install --no-audit --no-fund >/tmp/web-session-setup-install.log 2>&1 \
    && echo "[web-session-setup] dependencies installed" \
    || echo "[web-session-setup] npm install failed — see /tmp/web-session-setup-install.log"
fi

# 2. Generate the Prisma client if it's missing (drives @prisma/client types).
if [ ! -d node_modules/.prisma/client ]; then
  echo "[web-session-setup] generating Prisma client…"
  npm run db:generate >/tmp/web-session-setup-prisma.log 2>&1 \
    && echo "[web-session-setup] Prisma client generated" \
    || echo "[web-session-setup] prisma generate failed — see /tmp/web-session-setup-prisma.log"
fi

echo "[web-session-setup] ready — gates: npm run typecheck && npm run test && npm run build"
exit 0
