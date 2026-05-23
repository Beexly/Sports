#!/usr/bin/env sh
set -eu

if [ -z "${PROD_BASE_URL:-}" ]; then
  echo "PROD_BASE_URL is required, for example https://galaxysportsedge.com" >&2
  exit 2
fi

BASE_URL=$(printf "%s" "$PROD_BASE_URL" | sed 's:/*$::')
PATHS="/ /vault /vault?cancel=true /vault?source=smoke-prod /methodology /loss-room /passes /ledger"
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

check_json_markers() {
  PATHNAME="$1"
  shift
  URL="${BASE_URL}${PATHNAME}"
  BODY=$(mktemp)
  STATUS=$(curl -L -sS -o "$BODY" -w "%{http_code}" --max-time 20 "$URL") || STATUS="000"

  if [ "$STATUS" -lt 200 ] || [ "$STATUS" -ge 400 ]; then
    echo "FAIL $STATUS $URL"
    FAILURES="${FAILURES}
- ${URL} returned HTTP ${STATUS}"
    rm -f "$BODY"
    return
  fi

  MISSING=""
  for MARKER in "$@"; do
    if ! grep -Fq "$MARKER" "$BODY"; then
      MISSING="${MISSING} ${MARKER}"
    fi
  done

  if [ -n "$MISSING" ]; then
    echo "FAIL JSON $URL"
    FAILURES="${FAILURES}
- ${URL} response missing marker(s):${MISSING}"
  else
    echo "PASS JSON $URL"
  fi

  rm -f "$BODY"
}

check_json_markers "/api/health" '"ok":true' '"service":"galaxy-sports-edge-web"'
check_json_markers "/api/vault/seat-count" '"cap":1000' '"remaining"'
check_json_markers "/api/proof/freshness" '"surfaces"' '"methodology"'

check_expected_status() {
  PATHNAME="$1"
  EXPECTED="$2"
  URL="${BASE_URL}${PATHNAME}"
  STATUS=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 20 "$URL") || STATUS="000"

  if [ "$STATUS" = "$EXPECTED" ]; then
    echo "PASS expected $EXPECTED $URL"
  else
    echo "FAIL expected $EXPECTED got $STATUS $URL"
    FAILURES="${FAILURES}
- ${URL} returned HTTP ${STATUS}; expected ${EXPECTED}"
  fi
}

check_expected_status "/api/admin/launch-readiness" "403"
check_expected_status "/api/vault/member" "401"
check_expected_status "/api/cron/vault-welcome-emails" "501"

if [ -n "$FAILURES" ]; then
  echo ""
  echo "Production smoke failures:"
  printf "%s\n" "$FAILURES"
  exit 1
fi

echo ""
echo "Production smoke passed."
