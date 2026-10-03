# Staging chaos: Toxiproxy + mock Odds API

**Scope:** local/staging only. Never deploy this path as production odds.

**Product law:** chaos must prove **fail-closed** behavior (no invented quotes, no LIVE_BOARD flip, 6h gate unchanged).

## Why two pieces?

| Piece | Injects |
|-------|--------|
| **mock-odds-api** | HTTP semantics: `402`, `401`, `429`, `500`, empty body, hung request |
| **Toxiproxy** | Network semantics: latency, timeout, connection reset |

Toxiproxy alone cannot synthesize an HTTP 402 — that needs an upstream that speaks HTTP. The mock is that upstream.

## Quick start

```bash
# 1) Start mock (default mode=402) + Toxiproxy
docker compose -f docker/chaos/docker-compose.chaos.yml up -d

# 2) Create proxy :22220 → odds-api-mock:8080
chmod +x docker/chaos/bootstrap-toxiproxy.sh
./docker/chaos/bootstrap-toxiproxy.sh

# 3) Point ingestion client at the proxy
export ODDS_API_BASE_URL=http://127.0.0.1:22220/v4
export THE_ODDS_API_KEY=staging-chaos-key

# 4) Exercise client / refresh path — expect OddsApiError 402, circuit open
```

## Switch mock modes

```bash
MOCK_ODDS_MODE=402 docker compose -f docker/chaos/docker-compose.chaos.yml up -d odds-api-mock
# modes: ok | 402 | 401 | 429 | 500 | empty | timeout
```

## Network toxics

```bash
TOXIC=latency ./docker/chaos/bootstrap-toxiproxy.sh
TOXIC=timeout ./docker/chaos/bootstrap-toxiproxy.sh
TOXIC=reset   ./docker/chaos/bootstrap-toxiproxy.sh
TOXIC=none    ./docker/chaos/bootstrap-toxiproxy.sh
```

## Hypotheses to verify

1. **402** → client throws `OddsApiError` status 402 → circuit breaker opens (PR #218) → later calls fail fast without upstream.
2. **timeout** toxic or `MOCK_ODDS_MODE=timeout` → client 408 / abort → no partial invented rows.
3. **empty** → HTTP 200 + `[]` → refresh writes nothing usable; gate stays unevaluable.
4. **Stats plane** still importable while quotes plane is on fire (bulkhead).

## What this is not

- Not a production Odds API substitute
- Not a reason to enable `LIVE_BOARD_GATE_SLATE`
- Not permission to backdate `fetchedAt` or mint synthetic -110 lines

## Ports

| Port | Service |
|------|--------|
| 8474 | Toxiproxy API |
| 22220 | Proxied Odds API (app `ODDS_API_BASE_URL`) |
| (internal 8080) | mock upstream |
