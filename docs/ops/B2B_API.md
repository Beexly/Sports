# B2B sports intelligence API

## Endpoints
| Path | Auth | Posture |
|------|------|---------|
| `GET /api/v1/probabilities` | `x-api-key` | Experimental pModel + rankingP/marketFairProb when present; sorted by rankingP. Not verified ROI. |
| `GET /api/v1/openapi` | public | Experimental OpenAPI for signals + probabilities (not-PROVEN claim posture). |
| `GET /api/v1/signals` | `x-api-key` | Model signals — not verified ROI. Sorted by `rankingP` when present. |
| `GET /api/v1/probabilities` | `x-api-key` | Experimental while eligibility RED |

## Founder env
```
GSE_B2B_API_KEYS=key1,key2
```

### Key tier scoping (fail-closed)

A **bare key sees FREE-tier picks only.** Premium access is opt-in per key via a
`:premium` suffix:

```
GSE_B2B_API_KEYS=partnerkey:premium,readonlykey
```

- `readonlykey` → FREE rows only
- `partnerkey`  → the full board, including PREMIUM rows

**Why:** the v1 routes previously filtered on `isPublished` / `isBootstrap` /
`modelVersion` only and emitted `modelConfidence` + `factorBreakdown`
unconditionally — so *any* key holder received Pro-gated confidence for PREMIUM
picks. `Pick.tier` already existed (`@default(FREE)`); the query never used it.
Granting premium now requires saying so explicitly.

Note the key is the part **before** the suffix: presenting the literal
`partnerkey:premium` does not authenticate. The suffix is case-insensitive; the key
itself is case-sensitive and compared in constant time.

Rate limit: durable Postgres-backed limiter, ~60/min (signals), ~30/min (probabilities).

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
