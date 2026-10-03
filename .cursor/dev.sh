#!/usr/bin/env bash
# Cloud Agent "web" terminal — the Next.js dev server (apps/web).
# Reads apps/web/.env.local written by start.sh. Serves http://localhost:3000.
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo /workspace)"
exec npm run dev
