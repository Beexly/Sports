#!/usr/bin/env bash
# Configure Toxiproxy proxy + optional toxics for GSE staging chaos.
# Requires: curl, docker compose chaos stack running.
set -euo pipefail

API="${TOXIPROXY_API:-http://127.0.0.1:8474}"
PROXY_NAME="odds-api"
LISTEN=":22220"
# Inside compose network, mock service DNS name:
UPSTREAM="${TOXIPROXY_UPSTREAM:-odds-api-mock:8080}"

echo "==> Toxiproxy API: $API"
echo "==> Upstream: $UPSTREAM  listen: $LISTEN"

# Delete existing proxy if present (idempotent bootstrap)
curl -sS -o /dev/null -w "" -X DELETE "$API/proxies/$PROXY_NAME" || true

curl -sS -X POST "$API/proxies" \
  -H 'content-type: application/json' \
  -d "{
    \"name\": \"$PROXY_NAME\",
    \"listen\": \"$LISTEN\",
    \"upstream\": \"$UPSTREAM\",
    \"enabled\": true
  }"
echo
echo "==> Proxy $PROXY_NAME created"

# Optional toxic via env: TOXIC=latency|timeout|reset|none (default none)
TOXIC="${TOXIC:-none}"

remove_toxics() {
  local toxics
  toxics=$(curl -sS "$API/proxies/$PROXY_NAME/toxics" || echo "[]")
  echo "$toxics" | sed -n 's/.*"name":"\([^"]*\)".*/\1/p' | while read -r name; do
    [ -n "$name" ] && curl -sS -X DELETE "$API/proxies/$PROXY_NAME/toxics/$name" || true
  done
}

remove_toxics

case "$TOXIC" in
  latency)
    curl -sS -X POST "$API/proxies/$PROXY_NAME/toxics" \
      -H 'content-type: application/json' \
      -d '{
        "name": "odds_latency",
        "type": "latency",
        "stream": "downstream",
        "toxicity": 1.0,
        "attributes": { "latency": 3000, "jitter": 500 }
      }'
    echo
    echo "==> toxic: latency ~3s"
    ;;
  timeout)
    # timeout toxic: connection holds then closes (attributes.timeout in ms)
    curl -sS -X POST "$API/proxies/$PROXY_NAME/toxics" \
      -H 'content-type: application/json' \
      -d '{
        "name": "odds_timeout",
        "type": "timeout",
        "stream": "downstream",
        "toxicity": 1.0,
        "attributes": { "timeout": 20000 }
      }'
    echo
    echo "==> toxic: timeout 20s"
    ;;
  reset)
    curl -sS -X POST "$API/proxies/$PROXY_NAME/toxics" \
      -H 'content-type: application/json' \
      -d '{
        "name": "odds_reset",
        "type": "reset_peer",
        "stream": "downstream",
        "toxicity": 1.0,
        "attributes": { "timeout": 100 }
      }'
    echo
    echo "==> toxic: reset_peer"
    ;;
  none|"")
    echo "==> no network toxic (HTTP mode comes from MOCK_ODDS_MODE on mock)"
    ;;
  *)
    echo "Unknown TOXIC=$TOXIC (use latency|timeout|reset|none)" >&2
    exit 1
    ;;
esac

echo
echo "Point the app at the proxy:"
echo "  export ODDS_API_BASE_URL=http://127.0.0.1:22220/v4"
echo "  export THE_ODDS_API_KEY=staging-chaos-key"
echo "Mock mode is controlled by MOCK_ODDS_MODE on compose (default 402)."
