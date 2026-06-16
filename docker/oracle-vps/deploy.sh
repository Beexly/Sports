#!/usr/bin/env bash
# deploy.sh — one-command deploy for the Oracle Always-Free VPS stack.
#
# Run this on the VPS after:
#   1. Creating the Always-Free Ampere instance at oracle.com/cloud/free
#   2. Opening ports 80, 443, 22 in the security list
#   3. Pointing DNS A records ncaa.<domain> and llm.<domain> → this box's public IP
#
# Usage (on the VPS):
#   git clone https://github.com/beexly/sports.git && cd sports/docker/oracle-vps
#   cp .env.example .env && nano .env   # fill in DOMAIN, REDIS_PASSWORD, LLM_BASICAUTH_HASH
#   bash deploy.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VPS_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> [1/5] Checking Docker..."
if ! command -v docker &>/dev/null; then
  echo "  Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
  echo "  Docker installed. Re-run this script (group refresh needed) or run: newgrp docker && bash deploy.sh"
  exit 0
fi

echo "==> [2/5] Validating .env..."
if [[ ! -f "$VPS_DIR/.env" ]]; then
  echo "  ERROR: $VPS_DIR/.env not found. Copy .env.example and fill in values."
  exit 1
fi
source "$VPS_DIR/.env"
: "${DOMAIN:?DOMAIN is required in .env}"
: "${REDIS_PASSWORD:?REDIS_PASSWORD is required in .env}"
: "${LLM_BASICAUTH_HASH:?LLM_BASICAUTH_HASH is required (generate with: docker run --rm caddy:2-alpine caddy hash-password --plaintext 'yourpass')}"

echo "==> [3/5] Building + starting core stack (ncaa-api, redis, ollama, caddy)..."
cd "$VPS_DIR"
docker compose -f compose.yml pull --ignore-pull-failures 2>/dev/null || true
docker compose -f compose.yml build --build-arg BUILDKIT_INLINE_CACHE=1
docker compose -f compose.yml up -d ncaa-api redis ollama caddy

echo "==> [4/5] Pulling Ollama model (llama3.2 — small enough for free ARM tier)..."
# Wait for ollama to be ready
for i in $(seq 1 30); do
  if docker exec sports_ollama ollama list &>/dev/null; then break; fi
  echo "  Waiting for ollama... ($i/30)"
  sleep 2
done
# Pull a model that fits the 24 GB Always-Free ARM allocation
docker exec sports_ollama ollama pull llama3.2 || \
  echo "  WARN: model pull failed; run manually: docker exec sports_ollama ollama pull llama3.2"

echo "==> [5/5] Verifying core services..."
sleep 3
docker compose -f compose.yml ps

echo ""
echo "✅ Core stack is up."
echo ""
echo "Next steps:"
echo "  • Verify ncaa proxy: curl https://ncaa.${DOMAIN}/rankings/football/fbs/associated-press"
echo "  • Set Vercel env vars:"
echo "      HENRYGD_NCAA_BASE_URL=https://ncaa.${DOMAIN}"
echo "      REDIS_URL=redis://:${REDIS_PASSWORD}@<VPS_IP>:6379  (open port 6379 only from Vercel IPs)"
echo "      INTERNAL_LLM_BASE_URL=https://llm.${DOMAIN}/v1"
echo "      INTERNAL_LLM_MODEL=llama3.2"
echo "  • To start BullMQ workers: docker compose -f compose.yml up -d worker-data-refresh worker-pick-generation worker-content-publishing"
echo "    (Add DATABASE_URL to .env first)"
