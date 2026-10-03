#!/usr/bin/env bash
# Smoke: hit proxied mock and assert HTTP 402 (or configured mode).
set -euo pipefail
BASE="${ODDS_API_BASE_URL:-http://127.0.0.1:22220/v4}"
CODE=$(curl -sS -o /tmp/gse-chaos-body.txt -w "%{http_code}" \
  "${BASE}/sports?apiKey=staging-chaos-key&all=false" || true)
echo "HTTP $CODE"
head -c 400 /tmp/gse-chaos-body.txt || true
echo
if [ "${EXPECT_CODE:-402}" != "$CODE" ]; then
  echo "Expected HTTP ${EXPECT_CODE:-402}, got $CODE" >&2
  exit 1
fi
echo "smoke ok"
