# CLV Forensics Artifacts (L-7 → L-8)

Hand spot-check (10/10 verdict matches) and ML/bucket census for CLV sign conventions.

## Recompute Formulas

```
SPREAD:   HOME lock−close   | AWAY close−lock
TOTAL:    OVER close−lock   | UNDER lock−close
ML:       implied(close)−implied(lock),  ε=0.005
```

Where `implied(price) = 1 / (1 + (price>0 ? price/100 : -100/price))`.

### Verdict rules

| Market | Beat when (HOME/OVER/ML favorite) |
|---|---|
| SPREAD | lock−close < 0 (line moved in pick's favor) |
| TOTAL  | close−lock > 0 for OVER, lock−close > 0 for UNDER |
| ML     | implied(close) < implied(lock) (price shortened = pick won) |

### Spot check

`spot_check` in `raw.json` contains 10 hand-verified rows (0/10 mismatches).

### ML buckets

| Bucket | Count |
|---|---|
| extreme < -10000 | 3 |
| american < -500 | 72 |
| american -500..500 | 65 |
| **Total** | **140** |

Key finding: `lock_min = -21200`, `lock_max = 105`; `close_min = -390`, `close_max = 204`. All 140 close prices fall in [-390, 204] (normal range), while 3 locks are extreme negatives (< -10000) and 1 lock is +105 (positive, which is impossible for a legitimate ML lock price — model-derived).

### Per-book

`per-book.json` contains join rows and per-book beat rates computed via batch-mean joins at `clv_captured_at`.
