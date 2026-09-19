# SOLUTIONS BATTERY — multi-path replacements (not one solution)
**Mimo statistics lane · worktree `stats-books-ordering-2026-09-18` · 2026-09-19**

User directive: *I WANT SOLUTIONS — GO FIND ME MORE. Anything except a positive path forward is unacceptable.*  
Every row below traces to a command run tonight. Kills stay kills; each kill gets a successor.

---

## Commands run (observed exits)

```bash
cd C:\Users\Garrett\Sports\.worktrees\stats-books-ordering-2026-09-18
$MIMO_PYTHON docs/ops/stats-lane/solutions_battery.py          # S1–S7 OK
$MIMO_PYTHON docs/ops/stats-lane/solutions_battery_v2.py       # H1–H8 OK
$MIMO_PYTHON docs/ops/stats-lane/stats_lane_selftest.py        # PASS
$MIMO_PYTHON docs/ops/stats-lane/run_mimo_suite.py             # suite done True
npx vitest run packages/prediction-engine/src/__tests__/tweedie-aci.test.ts
npx vitest run packages/prediction-engine/src/__tests__/conformal-margin-set.test.ts
npx vitest run apps/web/__tests__/cqr.test.ts
```

---

## HONEST CORRECTION (check-your-work)

| First-pass claim | Checked | Truth |
|---|---|---|
| H1 `ELO_BEATS_MARKET` Elo Brier 0.233 vs “market” 0.347 | Sigma sweep + moneyline | **Phi(−spread/σ) is misspecified** (Brier 0.32–0.38 across σ). True market baseline = **home_moneyline p, Brier 0.211**, n=5,051. **Elo 0.233 LOSES to market ML.** Kill line NOT met for ranking authority. |
| H2 `any_population_reaches_52_4=True` | Denominator audit | Only **TOTAL R4 = BEAT/(BEAT+LOST) = 0.567** excludes MATCHED_CLOSE. Primary **R1 all-graded TOTAL = 0.424** does **not** beat 52.4%. Publish dual denominators (Law 10). **Do not** claim CLV skill on R4 alone. |

---

## SOLUTIONS THAT ARE LIVE (measured tonight)

| ID | Instrument | Observed | Replacement path (positive) | Kill line |
|---|---|---|---|---|
| **H3** | Realised information-edge bits (GSE2 port) on export n settled | **marketFairProb +0.075 bits** (n=741, Brier 0.225) · confidence/100 **−0.081** · rankingP **−0.021** · indep trueProb **−0.016** | **Public/rank p = marketFairProb** when books priced the row. Confidence stays Edge Index display score. Independent p needs recalibration before bits > 0. | Publish gate: realised bits > 0.02; never prior basis |
| **H8** | NFL market ML Brier vs coin/base | market ML **0.211** (n=5,051) · base 0.247 · coin 0.25 | **Frozen scorecard target** for MODEL_VERSION (Law 11): engine must beat **0.211−0.002** as-of, not invent a number | Engine ML claims withheld until Brier ≤ 0.209 n≥272 |
| **H1c** | As-of Elo vs market ML | Elo 0.233 vs ML 0.211 paired | Elo stays **research shadow**; PATH kill stands. Positive: we now have the **correct market baseline instrument** | Brier_model ≤ market_ml − 0.002 |
| **H2** | CLV population ladder | R1 graded **0.229** · decided **0.231** · BEAT\|LOST **0.406** · MATCHED win **0.479** · TOTAL R4 **0.567** (ex-MATCHED) | **Totals-first dual-denominator product narrative** + sport×type cells with n. Never single pooled CLV headline | Any public CLV rate must name population + n + exclusions |
| **H4** | Turnover occurrence 50% shrink | league takeaway/giveaway measured on team_week 2024 | Feed **regressed** def INT/FF into adj-EPA residual features — never raw TO margin in Elo | Holdout Brier ≥0.002 n≥272 vs adj-EPA alone |
| **H5** | Rest/weather total residuals | Buckets from games.csv rest_diff + wind | Expand MIMO-6 weather Mondrian with **rest_diff** (free nflverse cols) | Mondrian OOT ≥0.85 on board-export cells |
| **H6** | CLV association (not causation) | SPREAD info slope **+1.93** (se 0.42, CI excludes 0) · TOTAL **−1.67** · ML lock/close n=0 | Replace CLV-as-information theatre with **association report** + H2 ladder. ML needs lock lines on export | If CI straddles 0 → no information story |
| **H7** | Per-sport residual CRPS | Sport×modelVersion σ on SPREAD margins when present | **Never one global σ_game**; Mondrian residual stores | Sport-σ must beat pooled CRPS by ≥0.01 n≥150 |
| **S1–S6** | Battery v1 (PBP 2025) | RZ pass EPA SF/GB/DET top; 4th-short go CAR 0.59–DEN 0.30; def/ST ingest path; dropback vs rush adj-EPA pairs; wind totals buckets; prop combo prior | Situational features **A5/A22/coaching** as research candidates with holdout kill lines — not narrative edges | Brier/Cover improve n≥272 or stay research |
| **Weather Mondrian** | Prior MIMO-6 | **6/6 bins OOT ≥0.85** | **PROMOTED** NFL margin UQ replacement for killed K3 bands | Stay promoted only while OOT holds |
| **Totals logit-pool** | Prior | **MODEL_ADDS_INFORMATION** (β~1.42) | Totals density/CRPS path advances; ML stays FIRE_NOTHING | e-process M_max≥20 before skill language (now 4.4–10.3) |
| **Fail-closed CQR** | Prior cqr.ts + **tonight** tweedie-aci.ts + conformal-margin-set.ts | Clamp → **+Inf + qhatInfinite** | All split-conformal product paths refuse thin-n bands | Never ship finite band when k>n |
| **Market dual score** | `compute.ts` **tonight** `computeMarketAnchoredDualScore` | Additive Brier/bits market vs confidence on same settled rows | **Withdraw confidence-as-probability** from dual score path; floors stay market-anchored in live-calibration-metrics | No MODEL_VERSION bump; dual is evidence |
| **Adj-EPA 2024/2025** | Prior live ratings | BAL +0.282 … CAR −0.242 (2024); 2025 on disk | Independent fair-value **research** path + dropback/rush splits | Same as H1c kill vs market ML |
| **Typecheck** | Prior `679c6e1aa` | tsc exit 0 on 3 workspaces | Signal-arch branch green after poisson/SignalResult fix | Full fleet re-run before trusting bus |
| **PASS veto export** | Script **already emits** `independentEdge*` + `passVeto` | Disk export **stale** — fields absent | **Ops re-export** (`board-export.mjs`) then `loop_pass_veto_totals.py` census | Never mint PASS / expectedClv<0 |
| **Hex32** | Prior | **98.95%** resolved | Alias/date retry on remainder; non-football scoreboards | Report UNRESOLVED_ID, never silent drop |

---

## CODE REPLACEMENTS SHIPPED THIS PASS (branch `stats/books-ordering-2026-09-18`)

| File | Change | Why |
|---|---|---|
| `packages/prediction-engine/src/tweedie-aci.ts` | Quantile **fail-closed +Inf**; AciInterval `status`/`qhatInfinite` | Explore-2: clamp still live; fake tightness |
| `packages/prediction-engine/src/conformal-margin-set.ts` | `splitConformalQuantile` +Inf; status `fail_closed_insufficient_n` | Same defect class as cqr.ts |
| `packages/prediction-engine/src/__tests__/tweedie-aci.test.ts` | Pins fail-closed + prior (n+1) behavior | Tests must pin refusal, not clamp |
| `packages/prediction-engine/src/__tests__/conformal-margin-set.test.ts` | Empty → +Inf; k>n → fail_closed | Same |
| `apps/web/lib/calibration/compute.ts` | Optional `marketFairProb`/`independentTrueProb` + **`computeMarketAnchoredDualScore`** additive on report | H3 + architecture Phase 2 path; confidence never fallback in dual |
| `docs/ops/stats-lane/solutions_battery.py` | S1–S7 measured instruments | Multi-path research features |
| `docs/ops/stats-lane/solutions_battery_v2.py` | H1–H8 + **H1 correction** vs market ML | Check-your-work |
| `docs/ops/stats-lane/SOLUTIONS_BATTERY_MASTER.md` | This ledger | Fleet-readable multi-solution map |

---

## STILL OPEN — each has a positive successor (do not stop at “blocked”)

| Gap | Successor path (actionable) |
|---|---|
| Export lacks `passVeto`/`independentEdge*` on disk | Founder/ops: `node scripts/ops/board-export.mjs --out docs/ops/stats-lane/incoming/board-export.jsonl` then re-run suite + pass-veto census |
| 2026 nflverse PBP missing (as-of adj-EPA on current season) | Historical replay on **games.csv** already instruments market baseline; fetch pbp_2023/2026 when release drops; keep kill line |
| EVENT_ODDS prop lines absent | Props fire-gate waits on lines; S3 roster prior is ready |
| Def+ST not in production ingestion | S5 instrument + EDGE_LEDGER #6 path — wire into adj-EPA residual after holdout |
| ML CLV 14.2% / FIRE_NOTHING | **Not a dead end:** rank/display market p (H3); totals-first; ML withheld until H8 scorecard |
| Ranking-candidates.ts unused on live board | Shadow recompute on same v5.2.2–v5.2.7 rows (PRE-REG yaml); founder flips switch after scorecard |
| Ingestion mock tests red on main | Fix mock factories for `isThreeWayMoneylineSport` etc. in **separate** testing commit (not this stats PR) |
| `expectedFromConfidence` still used for confidence ordinal buckets | Intentional for discrimination; dual score is the probability replacement; public floors already market-first in ops metrics |
| Consensus/depth 30+20 weights | Display-only copy + side-agreement fraction; founder MODEL_VERSION for weight zero |
| Shin de-vig vs proportional | H-instrument in flight (general-2); kill ΔBrier≥0 |
| Coach 4th-down stickiness | S2 rates live; year-over-year Spearman instrument in flight |
| Full nflverse schedules census | Report observed n (7,548 games.csv), never claim 14k unobserved |

---

## POSITIVE PATH FORWARD (ordered — multiple, not exclusive)

1. **Display + rank book-priced rows on marketFairProb** — only source with **positive realised bits** tonight.  
2. **Confidence = Edge Index** (display), never % — H3 −0.081 bits is the measurement.  
3. **Totals-first CLV dual denominators** — H2/H6; never a single pooled headline.  
4. **Market ML Brier 0.211 = frozen baseline** for any future independent ML claim (H8 + Law 11).  
5. **Weather/roof Mondrian** remains the live NFL UQ replacement (6/6 OOT).  
6. **Fail-closed conformal everywhere** — shipped on remaining clamp sites this pass.  
7. **Adj-EPA + turnover occurrence + dropback/rush** — research shadow until as-of duel vs **market ML** clears kill.  
8. **PASS veto + export v3** — founder re-export unblocks census; product rule already never-mint PASS.  
9. **Ranking-candidates shadow** — measurement without MODEL_VERSION bump.  
10. **Sample accumulation** — every settle raises n; standing OOT watches books×market cells.

---

## FORGOTTEN / NOT RESEARCHED ENOUGH (now named)

- We treated **Phi(spread)** as market authority once — corrected. Always duel vs **moneyline market p** for NFL ML/win probability.  
- **MATCHED_CLOSE ≠ BEAT** — pooled CLV mixes three events.  
- **Prior-basis information bits are gameable** — gate on realised only (GSE2 discipline).  
- **GSE2 has 67 modules** — many unported; inventory done; ports prioritized by data-on-disk.  
- **Research corpus rights** — BDB NC / NGS 401 stay offline-only.  
- **CLV is never signal admission** — founder doctrine; Brier vs realized outcomes is the gate.

---

**A number that went up without these replacements would still be the lie.**  
**Multiple instruments > one slogan. Every kill keeps a successor.**
