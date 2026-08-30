# L-15 MLB close-prediction feasibility

Queried 2026-08-19T17:54:49Z as `hermes_ro` on Neon branch `hermes-census-l15-20260819` (copy-on-write of gse-postgres/neondb). SELECT-only on the append-only `odds` table. Shin de-vig copied from `packages/prediction-engine/src/edge-lab/devig.ts` (refuse decimal odds ≤ 1 or booksum < 1).

**Labels.** Same 241 MLB games per market as L-14 (clean close: ≥3 timestamps, ≥3 books, span ≥2h, last pre-start snapshot aged ≤15 min). One row per (game, market, entry window). Entry = last snapshot in the window. `p` = median per-book Shin probability (TOTALS = P(over); SPREAD/ML = P(home)). Δ = p_close − p_entry.

| Market | Games | 24–12h | 12–6h | 6–3h | 3–1h | Total labels |
|---|---:|---:|---:|---:|---:|---:|
| full-game total | 241 | 236 | 234 | 239 | 238 | 947 |
| spread | 241 | 236 | 234 | 239 | 238 | 947 |
| moneyline | 241 | 236 | 234 | 239 | 238 | 947 |

Ridge: alpha = 1.0 (pre-registered, not tuned). 5-fold GroupKFold **by game**. Features scaled on the train fold only. Primary decision market = totals (over-probability).

## Tests (totals primary)

| Test | What | r | n | p | Also |
|---|---|---:|---:|---:|---|
| 0 mean Δ | 24–12h / 12–6h / 6–3h / 3–1h mean Δ | +0.00126 / −0.00061 / −0.00082 / −0.00026 | 236 / 234 / 239 / 238 | 0.258 / 0.566 / 0.378 / 0.698 | Spearman(hours, Δ) r=0.046 n=947 p=0.154. No systematic sign. No flip near start. |
| 1 dispersion | IQR(book p) vs \|Δ\| | 0.111 | 947 | 6.0e-4 | spread r=0.099; ML r=0.030 (n.s.) |
| 2 deviation | (mean p − median p) vs Δ | 0.402 | 947 | 3.9e-38 | spread r=0.284; ML r=0.038 (n.s.) |
| 3 momentum | (p_t − p_{t−1h}) vs Δ | −0.051 | 776 | 0.159 | spread r=0.087; ML r=0.144 |
| 4 lead-lag | spread move at t vs total move at t+1h | 0.015 | 10369 | 0.129 | remaining-to-close pairing r=−0.098 n=10765 (241 games with both markets) |
| 5 Ridge | grouped-CV Spearman of ŷ vs Δ; R²=0.258 | 0.490 | 776 (216 games) | 3.5e-48 | spread r=0.257 R²=0.150; ML r=0.091 R²=−0.002; pooled r=0.186 R²=0.157 |

## Verdict

**Kill MLB close-prediction. No tradable signal.**

The pre-registered totals Ridge r is 0.490, which would have been "promising" under the r≥0.15 rule. It is not a close-prediction signal. Totals no-vig P(over) lives in a 3-point band around 50% (sd 1.35pp). corr(p_entry, p_close) = 0.40, so corr(p_entry, Δ) = −0.51 is the textbook corr(X, Y−X) identity, not forecast skill. A Ridge on p_entry alone matches the full model (r=0.503, R²=0.284). Moneyline — the market where p actually varies (sd 6.5pp, corr(entry, close)=0.95) — has grouped-CV r=0.091 and negative R², which is a kill under the same rule. Tests 0, 3, and 4 are null. Test 1 is 0.11. Test 2's 0.40 is the same measurement-error story (the mean of this snapshot forecasts the next median better than the median does). Do not freeze features. Do not fit a booster.
