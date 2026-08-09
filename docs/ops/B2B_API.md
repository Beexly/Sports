# B2B sports intelligence API

## Endpoints
| Path | Auth | Posture |
|------|------|---------|
| `GET /api/v1/signals` | `x-api-key` | Model signals — not verified ROI |
| `GET /api/v1/probabilities` | `x-api-key` | Experimental while eligibility RED |

## Founder env
```
GSE_B2B_API_KEYS=key1,key2
```

Rate limit: process-local ~60/min (signals), ~30/min (probabilities).

## Marketing language
“Sports intelligence API” — **not** “guaranteed edge” / PROVEN / verified ROI while RED.
