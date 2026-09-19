# STATISTICS lane — double-check / errata
**Date:** 2026-09-18 (same night, after re-run)  
**Scope:** Audit of `MONDRIAN_BOARD_GROUPS_2026-09-18.md` + what to fix, research, and turn positive.

---

## 1. Errors and overclaims (fix these)

| # | Issue | Correction |
|---|---|---|
| **E1** | Residual target was **always** `marketFairProb` (1,087/1,087). Report language sometimes read as “board/engine residual Mondrian.” | This measures **market-implied** nonconformity by group, not engine Edge Index / rankingP residual. Product-display Mondrian on `confidence/100` is a **separate** analysis (run below). Label every table with the residual definition. |
| **E2** | Own-q̂ coverage ~0.90 on the **same** residuals used to estimate q̂ is **in-sample** and nearly tautological. | Do not treat in-sample per-bin coverage as a product guarantee. **Honest test = time-split** (or slate-split) with q̂ fit on an earlier fold only. |
| **E3** | Naive midpoint time-split on frozenAt **Jul 9 → Sep 7** puts almost all **NCAAF/NFL on the test side** (`n_cal=0`). | Seasonal sport mix ≠ i.i.d. time. **Must stratify the time split within sport (or market×sport)** or fall sports return ∞ for the wrong reason. |
| **E4** | Speculation that ECE pooling (C-293 signed bin-gap cancellation) and residual-q̂ pooling are “the same mathematics.” | **Wrong as stated.** They are both aggregation bias, different objects: ECE pooled−stratum is triangle-inequality cancellation on bin gaps; residual q̂ of a mixture is an order statistic that tracks the **lean mass**. Do not merge the proofs. |
| **E5** | “modelProb” on receipts was assumed potentially useful for independents. | **modelProb finite count = 0** on this snapshot. No independent trueProb in receipts. |
| **E6** | Payload mining: rankingP/bookmakerCount **not hidden** in receipt payloads (keys: asOf, confidence, edgeScore, entryOdds, gameId, line, marketFairProb, modelProb, modelVersion, pickId, pickType, selection, marketFairMethodTag). | Confirmed absent. Right export is **not** receipts — see §3. |
| **E7** | Confidence band shape quoted only from production n=2,385 docs. | On **receipts pre-game** the product score is also **non-monotone**: 50–55 hit **52.5%**, 65–70 hit **35.4%**, 80+ hit **55.0%** (n=20). Different sample, same class of defect. |
| **E8** | Timing proxy = `frozenAt`/`asOf` vs `commenceTime`. | Good enough to **trigger** the in-play kill (+22pp hit). Not a substitute for the C-298 `generatedAt` rule on a full export. |

---

## 2. What still holds (after double-check)

**In-sample pooled vs own (market residuals)** — diagnostic of scale mix, still valid:

| Bin | own q̂ | pooled cov | own cov | Under pooled |
|---|---:|---:|---:|---:|
| MONEYLINE\|MLS | 0.832 | 0.565 | 0.935 | **−37pp** |
| MLB run line 1.5 | 0.622 | 0.805 | 0.906 | **−10pp** |
| MONEYLINE (all) | 0.763 | 0.771 | 0.905 | **−13pp** |
| MLS (sport) | 0.679 | 0.837 | 0.909 | **−7pp** |

**Out-of-time, sport/market-stratified, pre-game only** (q̂ fit on first half **within** stratum, scored on second half):

| Bin | n_cal / n_te | q̂_own | cov_own OOT | cov_pool OOT | own − pool |
|---|---:|---:|---:|---:|---:|
| SPREAD\|MLB_RUN_LINE_1.5 | 150 / 151 | 0.626 | **0.934** | 0.828 | **+10.6pp** |
| MLS sport | 68 / 69 | 0.673 | **0.928** | 0.841 | **+8.7pp** |
| MONEYLINE\|MLS | 17 / 18 | 0.795 | **1.000** | 0.667 | **+33.3pp** |
| MLB sport | 298 / 299 | 0.599 | 0.920 | 0.903 | +1.7pp |
| NCAAF sport | 88 / 89 | 0.504 | 0.865 | 1.000 | **−13.5pp** |
| SPREAD\|NCAAF | 52 / 53 | 0.504 | 0.811 | 1.000 | **−18.9pp** |
| SPREAD\|MLS | 28 / 28 | 0.543 | 0.786 | 0.821 | −3.6pp |

**INFERENCE (updated):**

1. **Fat bins still undercover a pooled q̂ out of time** (run line, MLS, ML|MLS). Pooling-understates-fat-scale **survives** the honest split where n_cal ≥ ~17–150.
2. **Own-q̂ is not magic OOT.** Lean/mid bins (NCAAF spreads/totals) can **undercover** their own historical q̂ when residual scale drifts (0.81–0.87 vs 0.90). That is **exchangeability failure**, not a reason to pool — pooling those bins **over-covers** (1.00) while still **failing fat bins**.
3. **Mondrian partitions a score; it does not fix inversion; it also does not manufacture OOT 90% under drift.** Carry all three caveats.
4. **In-play kill remains triggered** — refuse mixed-sample ordering work.
5. **Books / rankingP / margins still NOT RUN** on this export — field absence is real.

---

## 3. What I was not seeing / forgetting

| Miss | Why it matters |
|---|---|
| **Residual ≠ engine score** | Product confidence is an Edge Index (repo: never a win probability). Mondrian on mfp ≠ Mondrian on what the card prints. |
| **Season structure in “time” split** | Jul–Sep receipts are MLB-heavy early, football later — midpoint split **confounds sport with fold**. |
| **Selective publication** | Receipts are **published settled** picks only (pass MIN_PUBLISH, model gates, etc.). Conditional coverage claims apply to **that population**, not all scored candidates. |
| **C-160 placeability** | Ledger: placeable (on-ladder) MLB totals/spreads **worse** than off-ladder (36% vs 49% totals). Residual width on market p does **not** measure that edge defect — different question. Underweighted in first pass. |
| **Correct export already exists** | `scripts/export-settled-picks-for-calibration.mjs` selects **bookmakerCount**, **rankingP**, **rankingSource**, **marketFairProb**, **independentTrueProb**, **game.startTime**, CLV columns. Receipts snapshot was the **wrong** primary corpus for board Mondrian/ordering. |
| **rankingP calibration already measured** | v5.2.8 proposal: rankingP n=1,390 monotone but over-confident upper-middle; marketFairProb n=622 books≥2 monotone gaps ≤0.07; confidence inverted. Ordering design can lean on that + new export — not on receipts alone. |
| **Totals rankingP = confidence** | Code comment: totals have no independent model — `rankingP` may be **echo of confidence** on TOTAL rows. Ordering duel must **stratify by pickType** or TOTAL pollutes O1 vs O2. |
| **Law 7 / DATABASE_URL** | Cannot invent DB access. Export is founder-run or ops-cron; lane consumes files. |
| **Wilson CIs** | Computed in JSON for some bins; under-emphasized in narrative. Thin bins (n_te=18 ML|MLS) need wide intervals beside point coverage. |

---

## 4. Turn negative → positive

| Negative | Positive action |
|---|---|
| BOOKS NOT RUN | **Instrument next export** — already in `export-settled-picks-for-calibration.mjs` (`bookmakerCount`). Pre-registered buckets 0 / 1 / 2–4 / 5–9 / 10+. Kill line ready in YAML. |
| rankingP absent on receipts | **Stop using receipts as primary.** Run Mondrian + ordering on `settled-picks-for-calibration.jsonl` when founder/ops writes it. Script ready. |
| Full board NOT RUN | Same export path; PICKS-H1 / verifier export in parallel for L11 scorecards. |
| In-play contamination | **Positive:** kill line **armed** — every future public rate / ordering claim filters pre-game and **prints exclusion counts** (L10). |
| Infinite q̂ on thin bins | **Positive product rule:** UI/ops show **“insufficient n for 90% residual band”** instead of a fake narrow interval. Honesty is the feature. |
| Own-q̂ OOT miss on NCAAF | **Positive research:** scale-drift monitor — flag bin when OOT coverage < 0.85 two weeks running; widen or go infinite, never silently keep stale q̂. |
| Confidence non-monotone on receipts | **Confirms D17:** retire confidence as rank key; publish market-anchored p (v5.2.8 display path) + rankingP only where it is **not** a confidence echo (ML moneylines with true independents). |
| Pooled ECE / residual pooling | **Positive ops rule:** never publish pooled coverage/ECE without **per-stratum n + value on the same surface** (L10 + C-275 false-green risk). |
| Hierarchical Mondrian code borrows | **Positive engineering:** board-claim path uses `mondrianResidualThresholds` semantics (Inf on thin) or `MondrianResidualManager({useGlobalFallback:false, minSamples:ceil(1/α)-1})` + treat fallback as **forbidden for published group-conditional claims**. |
| Heteroscedastic CQR margin-blocked | **Positive interim:** market×sport residual stores + OOT coverage monitor is Step 2 delivered on probability residuals; margin CQR waits on export with final scores. |
| ACI kickoff-stream blocked | **Positive:** Step 4 n-table done; ACI remains parked until kickoff-ordered slate exists — not idle, **blocked with named data**. |

---

## 5. Research / fix queue (priority)

1. **Run `scripts/export-settled-picks-for-calibration.mjs`** (founder/ops, law 7): full settled non-bootstrap rows with bookmakerCount + rankingP + startTime.  
   *Kill line for “export useful”:* file exists, n≥500, rankingP finite share >0 on v5.2.2+ moneylines.
2. **Re-run board Mondrian on that export:** residual A = marketFairProb; residual B = rankingP where finite else mark missing; residual C = confidence/100 diagnostic only. Books buckets live. Stratified time or slate split.
3. **Ordering duel on sample P** per `PRE-REG-ordering-comparison-2026-09-18.yaml`, **stratified MONEYLINE vs SPREAD vs TOTAL** (totals rankingP≈confidence).
4. **OOT coverage monitor design:** per-bin rolling OOT coverage vs 0.90; action = widen / infinite / retire bin.
5. **Strict Mondrian claim helper:** one function, no fallback, returns `{qhat: Infinity}` — unit test that n=8 never returns finite q̂.
6. **Do not research:** CLV as promotion label; isotonic on confidence; sleep/narrative features; pick’em scrapes (forbidden terms); inventing margins from receipts.

---

## 6. Product recommendations (what “good” looks like)

| Surface | Recommendation |
|---|---|
| Calibration / proof pages | Render **stratum** ECE/coverage with n + exclusions; pooled only as secondary, labeled “not any bin.” |
| Pick card uncertainty (if any) | If residual bands are shown, **Mondrian by market×sport**, n&lt;9 → hide band / “n too small”, never clamp. |
| Confidence badge | Keep as **score**, never %; D17/v5.2.8 market-implied for moneylines with books≥2. |
| Board sort | rankingP only when `rankingSource` ≠ pure confidence echo **or** label “selection score”; marketFairProb for ML display. |
| Public win rates | Pre-game eligibility sample only; print in_play excluded count (L10). |
| Group-conditional claims | Publish only if bin n≥138 and method is strict Mondrian on a **held-out** fold. |

---

## 7. Standing loop status (updated)

| Step | Status after double-check |
|---|---|
| 1 Mondrian board groups | **DONE diagnostic** on receipts; **method corrected** (E1–E3); **OOT stratified results** in §2; production export still next |
| 2 Heteroscedastic CQR | Probability-scale split **measured** OOT; margin CQR **blocked** on score/margin export; drift monitor designed |
| 3 ACI | Still **blocked** on kickoff-ordered stream (named) |
| 4 n requirements | **DONE** (n≥9 finite; n≥138 product publish; n≥200/bin for 8pp coverage gaps) |
| Ordering comparison | Design **(c)** + YAML pre-reg; **must stratify pickType**; run only on calibration export |

---

## 8. Bottom line

- **First pass core finding survives:** pooled residual thresholds **under-cover fat board groups** (run line, MLS, moneylines) — now shown **out-of-time** on stratified pre-game folds, not only in-sample.
- **First pass method was incomplete:** wrong residual target for product score, in-sample coverage over-read, naive time-split seasonally confounded, ECE≡residual speculation withdrawn.
- **Next real measurement is an export, not more receipts analysis** — the script that already carries `bookmakerCount` + `rankingP` is the corpus.
- **Negatives convert to product rules:** infinite on thin n, pre-game-only claims, per-stratum denominators, confidence never a probability, rankingP duel stratified by market.
