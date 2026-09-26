#!/usr/bin/env bash
# Cloud Agent install step — repository bootstrap after checkout.
#
# Idempotent: safe to run repeatedly. `npm install` respects the repo's
# supply-chain controls in .npmrc (strict-allow-scripts + min-release-age) and
# its postinstall runs `prisma generate` (no database required).
set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo /workspace)"

echo "[install] node $(node -v) / npm $(npm -v)"
echo "[install] installing workspace dependencies (this runs prisma generate via postinstall)..."
npm install

echo "[install] done."
