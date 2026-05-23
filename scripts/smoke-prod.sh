#!/usr/bin/env sh
set -eu

if [ -z "${PROD_BASE_URL:-}" ]; then
  echo "PROD_BASE_URL is required, for example https://galaxysportsedge.com" >&2
  exit 2
fi

BASE_URL=$(printf "%s" "$PROD_BASE_URL" | sed 's:/*$::')
PATHS="/ /vault /vault?cancel=true /vault?source=smoke-prod /methodology /loss-room /passes /ledger /api/vault/seat-count /api/proof/freshness"
FAILURES=""

for PATHNAME in $PATHS; do
  URL="${BASE_URL}${PATHNAME}"
  STATUS=$(curl -L -sS -o /dev/null -w "%{http_code}" --max-time 20 "$URL") || STATUS="000"

  if [ "$STATUS" -ge 200 ] && [ "$STATUS" -lt 400 ]; then
    echo "PASS $STATUS $URL"
  else
    echo "FAIL $STATUS $URL"
    FAILURES="${FAILURES}
- ${URL} returned HTTP ${STATUS}"
  fi
done

if [ -n "$FAILURES" ]; then
  echo ""
  echo "Production smoke failures:"
  printf "%s\n" "$FAILURES"
  exit 1
fi

echo ""
echo "Production smoke passed."
