# MIMO-4 report — 2026-09-19
**Worktree:** `stats-books-ordering-2026-09-18` · base `e16124d13`

---

## Mission 1 — Mondrian CQR v2/v3 (stratified bands)

| Mode | K3 holdout cov | min cov | mean width | Mission |
|---|---:|---:|---:|---|
| v1 pooled σ | 0.738 | 0.738 | 25.3 | KILL_K3 |
| v2 stratum σ | 0.738 | 0.738 | 25.3 | KILL_K3 |
| v2 sport σ | **0.803** | 0.750 | 26.6 | KILL_K3 |
| v3 A abs conformal | 0.738 | 0.738 | 25.3 | KILL_K3 |
| **v3 B quantile bands** | **0.770** | 0.750 | 27.0 | KILL_K3 |
| v3 C max(qhat,p90) | 0.738 | 0.738 | 25.3 | KILL_K3 |

**Target K3 ≥ 0.890 NOT met** at any cal-derived finite half-width tried.

### Diagnostic — K3 residual scale shift (OBSERVATION)

| Stratum | cal p90 \|resid\| | holdout p90 \|resid\| | holdout p85 | holdout max |
|---|---:|---:|---:|---:|
| K1 | 10.7 | **27.0** | 16.5 | 41.8 |
| K2 | 7.5 | **7.5** | 6.5 | 36.3 |
| **K3** | 19.0 | **26.5** | **24.7** | 38.8 |

**INFERENCE:** K3/K1 holdout residuals are **larger than calibration** — non-exchangeability / regime shift on blowouts and key numbers. Widening bands from CAL q̂ **cannot** hit 0.89 without essentially publishing the holdout’s own scale (leakage) or unbounded intervals.

### Replacement strength (No Graveyards)

| Weakness | Strength |
|---|---|
| K3 OOT coverage stuck ~0.74–0.77 | **Product rule: No-Bet / no numeric band on K3 (and thin K1)** until **rolling-origin** window provides matching residual scale (m≥32 games in-stratum). Mondrian still **lifts pooled min 0.54→0.74+** and correctly **widens** fat strata. |
| Constant σ undercover blowouts | **Per-stratum/sport σ** (v2) + **quantile bands** (v3B) — keep both as diagnostics; ship **fail-closed** when OOT monitor flags cov&lt;0.85. |
| Fake 90% labels | **Never clamp**; report actual cov + n + 1−α target (L10). |

**Kill line honored:** n_te≥30 & cov&lt;0.85 → that band model is **not** a product path.

---

## Mission 2 — Multi-sport ESPN hex32 resolve

| | |
|---|---:|
| hex32 `espnEventId` | **2,087** |
| **RESOLVED** | **2,040 (97.75%)** |
| UNRESOLVED_NO_SCOREBOARD_MATCH | **47** |
| Silent sport default | **0** |
| Already `espn:` prefixed | 1,174 |

**≥90% target EXCEEDED.** 100% **not** claimed — 47 remain (name/date mismatches, postponed, or non-scoreboard rows). `closingSpread`/`closingTotal` still **null** (no close archive in export).

---

## Mission 3 — Moneyline CLV turnaround (14.2% → winner?)

**Baseline:** n_graded 245 · non-push **n=190 · 14.2% [10.0, 19.9]** — confirmed.

| Filter | pass | non-push n | rate | Wilson | Verdict |
|---|---:|---:|---:|---|---|
| ALL_ML | 245 | 190 | 14.2% | [10.0, 19.9] | FAIL_below_50 |
| **A edge≥+3pp** | 2 | 2 | 50% | [9.5, 90.5] | **THIN** |
| B not heavy fav (mfp&lt;0.714) | 172 | 145 | **9.7%** | [5.8, 15.6] | **FAIL — worse** |
| **C books≥10** | 60 | 45 | **28.9%** | [17.7, 43.4] | FAIL_below_50 (best powered) |
| A+B / A+C / A+B+C | 2 | 2 | 50% | wide | THIN |
| B+C | 28 | 23 | 17.4% | [7.0, 37.1] | THIN |

**OBSERVATION — mechanism:**  
- `mean(p_model − marketFairProb)` on rows with both = **−0.28** (n=84) — engine ML picks often price the side **below** the market’s own de-vig.  
- Only **2.4%** of ML rows have edge ≥ +3pp.  
- `p_model` source: independentTrueProb **183**, confidence/100 **57**, rankingP **5**.  
- Heavy favorites (mfp≥0.714) are **~30%** of ML and **outperform** non-heavy on CLV (filter B is worse) — dogs/”value” sides lose to close.

**KILL LINE:** *Filter turns ML CLV into winner only if non-push ≥50% AND Wilson LB&gt;0.40 AND n≥30.*  
**RESULT:** **NO filter passes.** ML CLV **cannot** be filtered into a winner on this sample with available columns.

### Replacement strength (not graveyard)

1. **Totals-first CLV narrative:** TOTAL non-push **56.7% [52.2, 61.1]** is the only cell near/at break-even — product performance copy leads with totals + books≥10, not blended ML.  
2. **ML gate replacement:** do **not** publish “beat the close” on ML; show **market-implied p + model p side-by-side** (L10) and **withhold ML from PROVEN/CLV claims** until export carries a **true edge column** and n≥100 non-pass filter.  
3. **Deep books help somewhat** (28.9% vs 14.2%) — books≥10 is a **honest stratification**, not a cure.  
4. **Hypothesis partly supported:** weak-edge / unpriced-feeling MLs drag CLV; **heavy-favorite exclusion backfires** — closing lines on favorites are hard to beat; “value dogs” in this engine lose more to close.

---

## Second pass — underleveraged / outside the box

| Opportunity | Action |
|---|---|
| Hex32 97.7% map | Join **team + kickoff** → future K1 public-price, ground-truth K3 re-grades |
| K3 no-band zone | **Feature:** “uncertainty band unavailable — blowout regime” on card; avoid fake 90% |
| Rolling-origin Mondrian | Next data window: calibrate K3 on **last m≥32** in-stratum games only |
| Totals CLV spine | E-process / sequential skill test **on TOTALS only** vs market (blueprint) |
| ML mean_edge −0.28 | Selection gate: **no publish** when p_model &lt; marketFairProb (or flag “market disagrees”) |
| CRPS by sport | MLB CRPS 2.38 / MLS 0.92 / NCAAF 9.15 — **never pool** margin metrics across sports |
| Standing OOT 6 alerts | Ops surface: books×market under-pooled cells |
| Signal-path CLV | n_nonpush=1 — accumulate; do not claim skill |
| PE vitest | `npm ci` in `packages/prediction-engine` when offline; fail-closed quantile pin already green |

---

## Artifacts

`mondrian_cqr_v3.py` · `moneyline_clv_turnaround.py` · `resolve_hex32_multileague.mjs` ·  
`out/mondrian_cqr_v2_results.json` · `out/moneyline_clv_turnaround.json` · `out/resolved_game_ids_v2.json`

**Bus:** post MIMO-4 findings (hex32 97.7%, K3 still killed at 0.77 max, ML filters fail kill line, totals CLV spine).
