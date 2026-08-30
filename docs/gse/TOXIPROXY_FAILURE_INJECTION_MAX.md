# Toxiproxy failure injection — max leverage (GSE)

Staging/local only. Prove fail-closed: no invented quotes, no LIVE_BOARD, no 6h widen.

## Two planes

- **mock-odds-api**: HTTP 402/401/429/500/empty/timeout
- **Toxiproxy**: latency, jitter, timeout, bandwidth, slicer, limit_data, slow_close, reset_peer

402 needs the mock. Proxy :22220 → mock.

## Toxic types to run

| Toxic | Attributes | Tests |
|-------|------------|-------|
| latency | latency, jitter | client abort, no invent |
| timeout | timeout ms | 408/abort |
| bandwidth | rate KB/s | slow body |
| slicer | average_size, delay | partial reads |
| limit_data | bytes | truncated JSON |
| slow_close | delay | pool pressure |
| reset_peer | timeout | RST |
| toxicity 0.3 | any | intermittent |

Combine mock modes × toxics (402+none, ok+latency, empty+latency, 500+reset).

## Assertions

1. No fabricated prices on upstream fail
2. fetchedAt does not advance on hard fail
3. Circuit opens on repeated 402
4. Stats plane bulkheaded if designed
5. LIVE_BOARD stays off

## Commands

```bash
docker compose -f docker/chaos/docker-compose.chaos.yml up -d
./docker/chaos/bootstrap-toxiproxy.sh
export ODDS_API_BASE_URL=http://127.0.0.1:22220/v4
./docker/chaos/smoke-402.sh
```

## Follow-ons

CI chaos job (scheduled), property test fail⇒no invent, formal-regression suite — not production Toxiproxy.
