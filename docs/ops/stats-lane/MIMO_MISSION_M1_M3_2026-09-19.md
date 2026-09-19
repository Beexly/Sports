# MIMO M1–M3 mission report — 2026-09-19
**Worktree:** `stats-books-ordering-2026-09-18` · **Export:** `board-export.jsonl` (3,261 rows)

---

## M1 — Mondrian CQR on key numbers {3, 7, 10}

**Method:** Strata K1 = min\|μ−{3,7,10}\|≤0.5 · K2 = \|μ\|&lt;3 not K1 · K3 = else.  
Base bands μ±σ_train (BASELINE, no quantile regressors). Nonconformity E=max(lo−y, y−hi).  
**q̂_k fail-closed per stratum; no borrowing.** Time-split cal/te.

| Stratum | n all | n_cal / n_te | Mondrian q̂ | Mondrian cov | Pooled q̂ | Pooled cov |
|---|---:|---:|---:|---:|---:|---:|
| K1 key numbers | 59 | 43 / 16 | 4.48 | **0.750** | 3.43 | 0.750 |
| K2 tight | 576 | 250 / 326 | 0.48 | **0.911** | 3.43 | 0.948 |
| K3 open/blowout | 170 | 109 / 61 | **11.98** | **0.738** | 3.43 | **0.541** |
| **min cov** | | | | **0.738** | | **0.541** |

| | Mondrian | Pooled |
|---|---:|---:|
| Mean holdout cov | 0.800 | 0.746 |
| Mean width | 25.3 | 20.9 |

**Football-only (NFL+NCAAF):** thin after split — K2 cal n=3 **fail-closed**; K3 Mondrian cov 0.878 vs pooled 0.667 on K2 with same wide q̂.

**Mission kill line:** *Kill Mondrian product path if any stratum n_te≥30 has cov&lt;0.85 OR min-cov gain &lt;0.02 without width blow-up.*  
**Result:** K3 n_te=61 cov **0.738&lt;0.85** → **`KILL_mondrian_min_cov_lt_0.85`** at current residual model.  
**However:** Mondrian **does** beat pooled on min coverage (**+0.20**) — the strata are real; the **bands** (σ±q from point μ) are too narrow for K1/K3 mass at FG/TD keys and blowouts. Replacement path: true quantile regressors or wider sport/market σ per stratum, then re-test — **not** “delete Mondrian.”

**Kill line (pre-registered, stands):** Fail-closed forever when n_k &lt; 9; report 1−α vs actual coverage with n on every cell (L10).

---

## M2 — Hex32 event-id resolution

| Quantity | Observed |
|---|---:|
| Export rows | 3,261 |
| `espnEventId` already `espn:` | 1,174 |
| **hex32** espnEventId | **2,087** |
| NCAAF 0-book hex32 (mission “45”) | **125** all / **~45** decided subset |
| **RESOLVED** (ESPN scoreboard) | **301** (14.4% of hex) |
| UNRESOLVED_LEAGUE_OR_NON_FOOTBALL | 1,781 |
| UNRESOLVED_NO_SCOREBOARD_MATCH | 5 |
| default/unassigned sport resolver | **0** |

**100% resolution NOT achieved** (law 4). Football scoreboard join works when league + teams + date match. Remaining hex32 are largely **MLB/NBA/NHL/MLS** — need sport-specific ESPN scoreboards (next loop). **Do not invent** closingSpread/closingTotal — left null; no close archive join.

**Replacement:** keep `sport_resolve.py` (espn: + CUID-safe); add per-league scoreboards; never silent-default sport.

---

## M3 — Stratified CLV

**Recomputed on export (matches Opus):**

| Denominator | n | BEAT | rate | Wilson 95% |
|---|---:|---:|---:|---|
| All graded (incl MATCHED_CLOSE) | 1,616 | 370 | **22.9%** | [20.9, 25.0] |
| Non-push (BEAT vs LOST) | 911 | 370 | **40.6%** | [37.5, 43.8] |
| Required | | | **52.4%** | |

**By generation path (non-push):**

| Path | n | rate | Wilson | vs 52.4 |
|---|---:|---:|---|---|
| SIGNAL_PATH | **1** | 1.00 | [0.21, 1.00] | overlap — **THIN** |
| BOOK_PATH | **910** | **40.5%** | [37.4, 43.8] | **below** |

**SIGNAL_PATH all-graded n=20:** 1 BEAT / **19 MATCHED_CLOSE** — signal rows mostly **do not move** vs close; not enough non-push to test skill.

**By books (non-push):** 0 n=1 thin · 1–2 n=21 52.4% thin · **3–9 n=654 36.1% [32.5,39.8] worst** · 10+ n=235 **51.9% [45.5,58.2]** overlaps 52.4.

**By market (non-push):** **TOTAL n=473 56.7% [52.2,61.1]** closest (LB 0.521 just under 52.4) · SPREAD n=248 30.2% · **MONEYLINE n=190 14.2% [10.0,19.9]** far below.

**By edge proxy:** INDEPENDENT_ONLY n=166 **10.2%** · INDEPENDENT_PRICED n=87 28.7% · CONFIDENCE_ECHO n=231 50.2% · EDGE_UNKNOWN n=427 49.6%.

**Hypothesis (deficit = book path only):** **`THIN_CELLS`** — signal non-push n=1 cannot support the test. **Observation:** nearly all CLV mass is **BOOK_PATH**, and that path is **well below 52.4%** on non-push. Kill line for “book-path-only”: **not refuted** (signal LB is not ≥52.4) and **not cleanly supported** (no power on signal).

**INFERENCE:** CLV deficit is **market-shaped** (ML/spreads) not purely confidence-band-shaped; totals are the only cell near break-even. Independent-priced proxy **underperforms** confidence-echo on CLV — do not treat rankingSource=independent as automatic CLV edge.

---

## Related code fixes (this sprint)

| Module | Change |
|---|---|
| `apps/web/lib/calibration/cqr.ts` | Fail-closed Inf; J+ theorem 1−2α export |
| `apps/web/lib/calibration/conformal-calibration.ts` | Same quantile fix |
| `packages/prediction-engine/src/conformal/mondrian.ts` | `finiteSampleQuantile` +Inf when k&gt;n (no clamp) |
| `packages/prediction-engine/src/conformal-intervals.ts` | Same |
| `apps/web/__tests__/cqr.test.ts` | **7/7 PASS** on main `apps/web` vitest |

**Test note:** PE vitest blocked (worktree package `node_modules` missing); Python pin `FAIL_CLOSED_QUANTILE` PASS. Run `npx vitest run` in `packages/prediction-engine` after `npm ci` if suite asserts old clamp behavior.

---

## Next autonomous steps

1. ESPN **mlb / nba / nhl / mls** scoreboards → push hex32 resolve toward 100% (honest rate until then).
2. Export v2: `independentEdge.decision` (PASS/LEAN/VALUE), `publicMlImpliedProb`, league sport keys, `clvKind`.
3. Mondrian CQR v2: per-stratum **σ** or true quantile models on K1/K3; re-test kill line 0.85.
4. CLV: accumulate signal-path **non-push** rows; do not publish path skill until n≥100 non-push.
5. Standing OOT + CRPS on every new export; bus findings with n+Wilson (L10).

**Artifacts:** `mondrian_cqr.py` · `resolve_hex32_espn.mjs` · `stratified_clv_audit.py` · `out/mondrian_cqr_results.json` · `out/resolved_game_ids.json` · `out/stratified_clv_audit.json`
