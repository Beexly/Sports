# SOLUTIONS BATTERY V2 ADDENDUM — measured replacement instruments

**Date:** 2026-09-19  
**Lane:** Mimo stats-lane implementer  
**Worktree:** `C:\Users\Garrett\Sports\.worktrees\stats-books-ordering-2026-09-18`  
**Python:** `C:\Program Files\Xiaomi MiMo AI\resources\runtimes\win32-x64\python\python.exe` (3.13.14)  
**Laws honored:** no unobserved claims · no DB · no gate flips · no fabricated data · every result traces to a run command + n + kill line.

**Helpers used on every new instrument:** `docs/ops/stats-lane/stats_json.write_report`, `docs/ops/stats-lane/opponent_adjusted_epa.{opponent_adjusted,sigmoid}` (imported on path; no invented multi-book odds).

**Data on disk (observed):**
- `docs/ops/stats-lane/incoming/board-export.jsonl` — 3261 rows (PENDING 220 / WIN 1399 / LOSS 1151 / PUSH 9 / VOID 482)
- `C:\Users\Garrett\nfl_ot\games.csv` and `docs/ops/stats-lane/incoming/nflverse-games.csv` — nflverse schedules + MLs
- `docs/ops/stats-lane/incoming/nflverse-pbp/play_by_play_{2023,2024,2025}.csv.gz` — **2023 downloaded this session** via `curl -L` from nflverse-data releases (18.28 MB)
- GSE2 TypeScript ideas under `docs/ops/stats-lane/incoming/GSE2/GSE2/` (ported as ideas only)

**Commands run (all from worktree root):**

```
$py docs/ops/stats-lane/side_agreement_consensus.py --out docs/ops/stats-lane/out/side_agreement_consensus.json
$py docs/ops/stats-lane/adaptive_delta_shadow.py --out docs/ops/stats-lane/out/adaptive_delta_shadow.json
$py docs/ops/stats-lane/coach_go_rate_stickiness.py --out docs/ops/stats-lane/out/coach_go_rate_stickiness.json
$py docs/ops/stats-lane/shin_vs_proportional_devig.py --out docs/ops/stats-lane/out/shin_vs_proportional_devig.json
$py docs/ops/stats-lane/clv_dual_denominator_product.py --out docs/ops/stats-lane/out/clv_dual_denominator_product.json
```

Also referenced (already on disk, not re-run this pass): `out/solutions_battery_v2.json`.

---

## Part A — prior battery H1–H8 (from `out/solutions_battery_v2.json`, already executed)

| ID | Instrument | n (observed) | Key numbers | Kill line | Kill triggered? | Replacement path |
|---|---|---|---|---|---|---|
| **H1** | as-of Elo vs market Brier (nflverse) | 6952 REG scored | Elo Brier **0.2331**; market_spread **0.3470**; market_ml **0.2112**; coin 0.25 | wire independent Elo/adj-EPA only if Brier_model ≤ Brier_market − 0.002 on n≥272 | **YES** (`ELO_BEATS_MARKET_BY_KILL_LINE`) | Elo/adj-EPA is a legitimate independent probability path vs **spread-derived** market p; market **ML** Brier (0.211) remains the harder frozen baseline (see H8) |
| **H2** | CLV population ladder | export 3261; graded 1616; decided+clv 1585 | R1 graded **~0.229–0.231**; R4 beat-vs-lost **~0.406–0.407**; MATCHED win rate ~0.48–0.49 | do not claim CLV skill unless a **named** population rate ≥ **0.524** with n≥30 | pooled populations **do not** reach 0.524 | dual-denominator product card (see I5) |
| **H3** | realised information-edge bits | mfp 741; conf 2550; rankingP 1535; indep 1507 | mfp realised bits **+0.0751** (publishable); conf **−0.0808**; rankingP **−0.0210**; indep **−0.0164** | gate on realised bits > 0.02, never prior basis | conf/rankingP/indep **fail** the gate; **mfp passes** | rank/display on marketFairProb; confidence stays display-only when its bits ≤ mfp |
| **H4** | turnover occurrence vs recovery | team-week 2024 | league TO/g 1.504 / giveaway/g 0.711; shrinkage 0.5; PIT raw TO margin 1.94 → regressed 1.37 | never feed raw takeaway margin into Elo; wire only regressed occurrence after holdout Brier n≥272 | raw margin **banned**; regressed is the only candidate | occurrence rates (forced fumbles / INT-worthy) into adj-EPA residual features |
| **H5** | rest/weather Mondrian on totals | wind_lt5 n=1018; wind_ge15 n=649; dome n=1734; rest_home+3 n=621 | total−line means: wind≥15 **−1.30**, wind<5 **+1.31**, dome **+1.22**, home rest+3 **+1.03** | weather/rest bands replace flat K3 only if Mondrian OOT coverage ≥ 0.85 on held-out board-export cells | coverage gate **not evaluated** on board-export this pass | expand weather Mondrian with rest_diff (free nflverse columns) |
| **H6** | CLV association decomposition | lock+close n=1371 | SPREAD info slope **+1.93** (se 0.42); TOTAL **−1.67** (se 0.57); MONEYLINE n=0 | if info-slope CI straddles 0 on all types, do not sell CLV as information evidence | slopes **do not** straddle 0 on SPREAD/TOTAL (association only) | association report + population ladder; never “sharp money” labels |
| **H7** | per-sport CRPS residual scales | SPREAD margins n=828 ALL; MLB 627 | ALL σ=7.82 CRPS 2.40; MLB σ=4.49 CRPS 1.97; MLB\|v5.2.7 n=216 CRPS 2.07 | keep simplest sigma unless stratum CRPS improves ≥0.01 vs ALL-pooled on n≥150 | MLB stratum CRPS **better** than ALL-pooled on n≥150 → candidate sport-sigma | sport-conditional σ for SPREAD interval surfaces |
| **H8** | NFL ML market Brier | n=5051 REG | market_ml Brier **0.2112**; league base **0.2469**; coin 0.25; home win 0.556 | engine ML must beat market_ml by 0.002+ on n≥272 as-of | engine does **not** currently beat this baseline on the published record | market ML Brier is the frozen scorecard target (Law 11); rank on marketFairProb |

---

## Part B — five NEW instruments (this pass, each run + observed)

### I1 — `side_agreement_consensus.py`
**Status:** ok · **Kill triggered:** **YES** · **n:** 2380 decided pre-game non-bootstrap rows

| Score | n | Spearman(bin score, bin hit rate) |
|---|---|---|
| bookmakerCount | 2380 | **−0.80** |
| marketFairProb | 689 | **+0.90** |
| rankingP | 1483 | **+1.00** |
| confidence/100 | 2380 | **+0.70** |

**Kill line:** if spearman(bookmakerCount) is NOT better than spearman(marketFairProb), depth stays display-only.  
**Observed:** books −0.80 < mfp +0.90 → **DEPTH_DISPLAY_ONLY**.

**MLB SPREAD consensus-pinned defect (n=611 decided pre-game):**  
bookmakerCount unique values 2–11, Spearman **−0.60**; marketFairProb **+0.80**; rankingP **−0.56**; confidence **+0.70**.  
Replacement metric: order MLB SPREAD on **marketFairProb** (or independentEdge/expectedClv when present). True side-agreement consensus needs per-book prices the export does not carry — this is a proxy test, not a consensus rebuild. GSE2 `consensus.ts` (weighted mean over IndependentMarketFairValue sources) is **not portable** from this export alone.

**Per-cell best proxy (n≥50):** MLB SPREAD best=mfp 0.80 · MLB ML best=mfp 0.50 · MLB TOTAL best=rankingP 1.00 · NCAAF ML best=rankingP 0.70 · NFL ML best=bookmakerCount 0.35 (n=51, thin; mfp absent in that cell).

**Replacement path:** public boards order on rankingP / marketFairProb; bookmakerCount is a coverage display, never a rank key, unless a future export carries per-book side prices.

**Command:**  
`$py docs/ops/stats-lane/side_agreement_consensus.py --out docs/ops/stats-lane/out/side_agreement_consensus.json`  
**JSON:** `docs/ops/stats-lane/out/side_agreement_consensus.json`

---

### I2 — `adaptive_delta_shadow.py`
**Status:** ok · **Kill triggered:** honesty gate (no OOS promotion) · **n_eligible:** 689

**Publish definition (ONE, documented):** `|marketFairProb − 0.5| ≥ δ`  
(rankingP-disagreement variant unused — basis collinear with MODEL_VERSION.)

| δ | n_pub | coverage | hit_rate | Brier | realised bits vs 0.5 |
|---|---|---|---|---|---|
| 0.00 | 689 | 1.000 | 0.5269 | 0.2249 | −0.9190 |
| 0.02 | 353 | 0.512 | 0.5439 | 0.2013 | −0.8428 |
| 0.05 | 286 | 0.415 | 0.5594 | 0.1895 | −0.8046 |
| 0.08 | 243 | 0.353 | 0.5761 | 0.1799 | −0.7732 |
| **0.10 (baseline)** | **201** | **0.292** | **0.6020** | **0.1655** | **−0.7265** |
| 0.12 | 172 | 0.250 | 0.6512 | 0.1600 | −0.7061 |
| 0.15 | 108 | 0.157 | 0.7778 | 0.1228 | −0.5792 |
| **0.20 (best bits IN-SAMPLE)** | **95** | **0.138** | **0.8211** | **0.1064** | **−0.5245** |

**Chronological 70/30 descriptive split:** insample n=482, OOS n=207.  
In-sample best δ by bits = 0.20 (n_pub=79, hit 0.797, Brier 0.117).  
OOS at that δ: **n_pub=16**, hit 0.9375, Brier 0.0527 — **too thin to claim**.

**Kill line:** best in-sample δ is **SHADOW only**; no OOS skill claim without a pre-registration; never write `SELECTIVE_PUBLISH_DELTA` from this instrument.

**Positive path (shadow):** as market distance from 0.5 rises, hit rate and bits improve monotonically on this export — selective withhold on `|mfp−0.5|` is a **plausible asymmetric gate** (withhold-only, no MODEL_VERSION bump). Promotion needs a frozen holdout after pre-registration. Withholding is the safe direction (same asymmetry doctrine as the conviction gate).

**Command:**  
`$py docs/ops/stats-lane/adaptive_delta_shadow.py --out docs/ops/stats-lane/out/adaptive_delta_shadow.json`  
**JSON:** `docs/ops/stats-lane/out/adaptive_delta_shadow.json`

---

### I3 — `coach_go_rate_stickiness.py`
**Status:** ok · **Kill triggered:** **NO** · **Factor status:** **CANDIDATE**

**Definitions (observed meta):** down==4 and 1≤ydstogo≤2; eligible play_type ∈ {run,pass,punt,field_goal}; go = {run,pass}; coach = home_coach if posteam==home else away_coach; min 5 eligible attempts per coach/team-season.

| Season | PBP rows scanned | 4th&short eligible | coach keys (n≥5) | team keys |
|---|---|---|---|---|
| 2023 | 49,665 | 802 | 35 | 32 |
| 2024 | 49,492 | 732 | 32 | 32 |
| 2025 | 48,771 | 802 | 32 | 32 |

| Pair | Unit | n overlap | Spearman | mean rate a→b |
|---|---|---|---|---|
| 2023→2024 | coach | 25 | **0.473** | 0.566 → 0.612 |
| 2024→2025 | coach | 25 | **0.383** | 0.610 → 0.634 |
| 2023→2024 | team | 32 | **0.310** | 0.562 → 0.607 |
| 2024→2025 | team | 32 | **0.308** | 0.607 → 0.644 |

**coach mean Spearman = 0.428** · **team mean Spearman = 0.309** · kill threshold r < 0.20 → **not triggered**.

**Positive path:** register **CANDIDATE** coach-go-rate factor (early-down / 4th-short aggressiveness prior). Join key exists in nflverse (`home_coach`/`away_coach` + schedules).  
**Wire kill (pre-registered):** holdout Brier must improve ≥ 0.002 on n≥272 decided pre-game NFL rows after a real join into the factor engine — not wired this pass.

**Fix note (first run was wrong):** naive `split(",")` on PBP misaligned columns (`desc` has commas/quotes); coach keys became surface types (`fieldturf`, …) and every rate read 1.0. Re-run used `csv.reader`. Do not trust any PBP parse that is not csv-aware.

**Command:**  
`$py docs/ops/stats-lane/coach_go_rate_stickiness.py --out docs/ops/stats-lane/out/coach_go_rate_stickiness.json`  
**JSON:** `docs/ops/stats-lane/out/coach_go_rate_stickiness.json`

---

### I4 — `shin_vs_proportional_devig.py`
**Status:** ok · **Kill triggered:** **NO** · **Verdict:** **PROPORTIONAL_STAYS** · **n_pair:** 5050

**No fabrication:** board-export has no per-book American odds; 2-way implied built only from nflverse `home_moneyline` + `away_moneyline`.

| Quantity | Observed |
|---|---|
| n REG games | 7239 |
| n both MLs present | 5177 |
| n paired duel (both methods) | **5050** |
| skip overround < 1 | 1 |
| skip overround > 2.5 | 0 |
| skip Shin z-solve fail | 0 |
| **Brier proportional (paired)** | **0.210773** |
| **Brier Shin (paired)** | **0.210752** |
| **Δ = Brier_prop − Brier_shin** | **0.0000204** |

**Kill line:** adopt Shin product path only if ΔBrier > **0.002** on n≥272 (Shin better).  
**Observed:** Δ ≈ 2.0e-5 ≪ 0.002 → proportional stays. Season-level Δs hover around ±5e-4 (2024 +0.00070 n=272; 2025 −0.00022 n=271) — noise scale, not a product switch.

**Formula documented in JSON:** Shin `p_i(z) = (sqrt(z² + 4(1−z)q_i²/Q) − z) / (2(1−z))`, z bisected so Σp_i=1; proportional `p_h = q_h/(q_h+q_a)`.

**Replacement path:** keep proportional de-vig as the product default when recomputing from raw MLs. Board `marketFairProb` remains the engine-facing de-vigged p.

**Command:**  
`$py docs/ops/stats-lane/shin_vs_proportional_devig.py --out docs/ops/stats-lane/out/shin_vs_proportional_devig.json`  
**JSON:** `docs/ops/stats-lane/out/shin_vs_proportional_devig.json`

---

### I5 — `clv_dual_denominator_product.py`
**Status:** ok · **n_export:** 3261 · **grade of record:** `clvVerdict` (never `clvValue>0`)

**Population ladder (decided non-bootstrap primary):**

| Rate | Value | n denominator | Beats 0.524? |
|---|---|---|---|
| **R1** BEAT / (BEAT+MATCHED+LOST) | **0.2309** | 1585 graded | **NO** |
| **R4** BEAT / (BEAT+LOST) | **0.4071** | 899 beat-or-lost | **NO** |

Pooled primary does **not** reach the ESTABLISHED 0.524 break-even under either denominator. This matches H2 and the AGENTS.md correction (engine BEAT_CLOSE ~23.2%; beat-vs-lost ~40.8%).

**Sport×pickType cells reaching 0.524 (n≥30 on that denominator) — cell-scoped claim only:**

| Sport | Type | n_graded | n_BEAT+LOST | R1 | R4 | Clears |
|---|---|---|---|---|---|---|
| MLB | TOTAL | 492 | 366 | 0.445 | **0.598** | R4 only |
| NCAAF | SPREAD | 65 | 30 | 0.292 | **0.633** | R4 only (n=30 boundary) |

**Thin cells above the bar, NOT claimable (listed, suppressed):** NFL TOTAL R1 0.667 n_graded=12 · NFL MONEYLINE R4 0.667 n=3 · NHL SPREAD 1.0 n=1.

**Totals-first recommendation (observed):** largest CLV-graded cell is MLB SPREAD (582) but its rates are poor (R1 0.072 / R4 0.259). The **first cell that clears 0.524 with real n is MLB TOTAL (R4 0.598, n_BEAT+LOST=366)**. Product order for any CLV surface: **name the population + denominator + n first**, then the rate. Do not pool R4-clearing cells into a headline that reads like the engine beat the close league-wide.

**Law-10 surface strings (emitted in JSON `law10_surface_strings`):** each carries rate + n + population + exclusions (MATCHED count, ungraded count). Dual doctrine: always publish **both** R1 and R4; MATCHED is the CLV analogue of a push; 0.524 is a decided-only break-even and the gate’s target population is still an open owner question — do not pick the flattering denominator.

**Command:**  
`$py docs/ops/stats-lane/clv_dual_denominator_product.py --out docs/ops/stats-lane/out/clv_dual_denominator_product.json`  
**JSON:** `docs/ops/stats-lane/out/clv_dual_denominator_product.json`

---

## Part C — combined positive-path summary (what to build next)

1. **Order boards on rankingP / marketFairProb, never bookmakerCount** (I1 kill confirmed; H3 bits confirm mfp is the only score with positive realised bits on this export).
2. **Selective publish on |mfp−0.5| is measurable and monotone in-sample** (I2) — candidate withhold-only gate at δ≈0.10–0.20; promote only after pre-registered holdout. Asymmetric (withhold never alters selection/probability).
3. **Coach 4th-short go-rate is stickier than the SPEC kill line** (I3, r=0.428) — register as CANDIDATE factor; wire only after holdout Brier n≥272.
4. **Do not switch de-vig formula** (I4): proportional ≈ Shin on 5050 NFL REG pairs (ΔBrier 2e-5).
5. **CLV product = dual denominators + cell+n** (I5): pooled ~23% / ~41%, neither reaches 52.4; MLB TOTAL R4 59.8% on n=366 is the only large-n cell that clears, and it is **cell-scoped**, not an engine-wide claim.
6. **2023 PBP is now on disk** — coach stickiness and any 3-season rate work can extend without another download.

## Files written this pass

| Path | Role |
|---|---|
| `docs/ops/stats-lane/side_agreement_consensus.py` | I1 instrument |
| `docs/ops/stats-lane/adaptive_delta_shadow.py` | I2 instrument |
| `docs/ops/stats-lane/coach_go_rate_stickiness.py` | I3 instrument |
| `docs/ops/stats-lane/shin_vs_proportional_devig.py` | I4 instrument |
| `docs/ops/stats-lane/clv_dual_denominator_product.py` | I5 instrument |
| `docs/ops/stats-lane/out/side_agreement_consensus.json` | I1 result |
| `docs/ops/stats-lane/out/adaptive_delta_shadow.json` | I2 result |
| `docs/ops/stats-lane/out/coach_go_rate_stickiness.json` | I3 result |
| `docs/ops/stats-lane/out/shin_vs_proportional_devig.json` | I4 result |
| `docs/ops/stats-lane/out/clv_dual_denominator_product.json` | I5 result |
| `docs/ops/stats-lane/SOLUTIONS_BATTERY_V2_ADDENDUM.md` | this document |
| `docs/ops/stats-lane/incoming/nflverse-pbp/play_by_play_2023.csv.gz` | downloaded 2023 PBP |

## NOT RUN / residual

- Monitor-style DB readers (line-archive freshness, ranking-basis census on live rows) remain **NOT RUN** here — law 7, no DB in agent session.
- H5 Mondrian OOT coverage on board-export sport cells: **NOT RUN** this pass.
- True multi-book side-agreement consensus: **DATA_BLOCKED** until an export carries per-book prices.
- Adaptive δ OOS promotion: **NOT CLAIM** (n_pub OOS=16 at best in-sample δ).
- Coach factor into the mint path: **CANDIDATE only**, not wired.
