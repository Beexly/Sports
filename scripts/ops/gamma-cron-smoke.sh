#!/usr/bin/env bash
# Gamma cron 401/200 smoke — Production or preview HOST.
# Usage:
#   HOST=https://your-app.vercel.app CRON_SECRET=... ./scripts/ops/gamma-cron-smoke.sh
# Optional: CRON_SECRET_PREVIOUS for dual-secret check.
set -euo pipefail

HOST="${HOST:-}"
if [[ -z "$HOST" ]]; then
  echo "HOST required (e.g. https://app.example.com)" >&2
  exit 2
fi
HOST="${HOST%/}"
PATH_URL="${HOST}/api/cron/gamma"

echo "== gamma cron smoke against ${PATH_URL} =="

code_no_auth=$(curl -s -o /tmp/gamma-smoke-noauth.json -w "%{http_code}" --max-time 30 "${PATH_URL}" || true)
echo "no auth:     HTTP ${code_no_auth} (expect 401 or 500 if secret unset)"
if [[ "${code_no_auth}" != "401" && "${code_no_auth}" != "500" ]]; then
  echo "FAIL: unauthenticated must not be 200" >&2
  exit 1
fi

code_bad=$(curl -s -o /tmp/gamma-smoke-bad.json -w "%{http_code}" --max-time 30 \
  -H "Authorization: Bearer definitely-wrong-token" "${PATH_URL}" || true)
echo "bad bearer:  HTTP ${code_bad} (expect 401 or 500)"
if [[ "${code_bad}" == "200" ]]; then
  echo "FAIL: bad bearer must not be 200" >&2
  exit 1
fi

if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "CRON_SECRET unset — skipping authorized 200 check (set to complete smoke)"
  echo "PASS (partial): refuse path holds"
  exit 0
fi

code_ok=$(curl -s -o /tmp/gamma-smoke-ok.json -w "%{http_code}" --max-time 60 \
  -H "Authorization: Bearer ${CRON_SECRET}" "${PATH_URL}" || true)
echo "primary:     HTTP ${code_ok} (expect 200 or 207 partial)"
if [[ "${code_ok}" != "200" && "${code_ok}" != "207" ]]; then
  echo "FAIL: primary secret did not authorize" >&2
  cat /tmp/gamma-smoke-ok.json 2>/dev/null || true
  exit 1
fi
if ! grep -q '"oddsApiRequired":false\|"oddsApiRequired": false' /tmp/gamma-smoke-ok.json 2>/dev/null; then
  echo "WARN: body should include oddsApiRequired:false"
fi

if [[ -n "${CRON_SECRET_PREVIOUS:-}" ]]; then
  code_prev=$(curl -s -o /tmp/gamma-smoke-prev.json -w "%{http_code}" --max-time 60 \
    -H "Authorization: Bearer ${CRON_SECRET_PREVIOUS}" "${PATH_URL}" || true)
  echo "previous:    HTTP ${code_prev} (expect 200 or 207)"
  if [[ "${code_prev}" != "200" && "${code_prev}" != "207" ]]; then
    echo "FAIL: previous secret should authorize during rotation" >&2
    exit 1
  fi
fi

echo "PASS: gamma cron dual-secret refuse + authorize smoke"
