# B2B sports intelligence API

## Endpoints
| Path | Auth | Posture |
|------|------|---------|
| `GET /api/v1/signals` | `x-api-key` | Model signals — not verified ROI. Sorted by `rankingP` when present. |
| `GET /api/v1/probabilities` | `x-api-key` | Experimental while eligibility RED |

## Founder env
```
GSE_B2B_API_KEYS=key1,key2
```

Rate limit: process-local ~60/min (signals), ~30/min (probabilities).

## Signal payload (v1)
- `modelConfidence` — UX composite 0–100 (may market-echo)
- `rankingP` — 0–1 independent-priced ranking key when finite (incl. PASS path)
- `lineLabel` / `boardSurface` — signal vs market context honesty
- `claimPosture` — `experimental_research_grade_not_verified_roi` while performance unpublished

## Marketing language
“Sports intelligence API” — **not** “guaranteed edge” / PROVEN / verified ROI while RED.

## Free public embed (no key)
| Surface | URL |
|---------|-----|
| Edge Index badge | `/embed/edge-index/[gameId]` |
| How to embed | `/edge-index` |
