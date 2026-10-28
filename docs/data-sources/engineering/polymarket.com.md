# polymarket.com — engineering

App bundles beautified: **0**  
JSON endpoints captured: **1**  
Client functions passing filter: **0**

## Captured JSON endpoints

| Endpoint | Bytes |
|---|---|
| `https://polymarket.com/api/gas/polygon` | 271 |

## Response schemas

### `https://polymarket.com/api/gas/polygon`
```
safeLow: dict
safeLow.maxPriorityFee: int
safeLow.maxFee: float
standard: dict
standard.maxPriorityFee: int
standard.maxFee: float
fast: dict
fast.maxPriorityFee: int
fast.maxFee: float
estimatedBaseFee: float
blockTime: float
blockNumber: int
blockTimestamp: int
```

## Client-side functions that passed the filter

_None survived. The model is server-side._

## Gap

Model is server-side. The response schema above is the artifact; no client coefficient exists to read.
