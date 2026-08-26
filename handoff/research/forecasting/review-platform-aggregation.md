# Critical Audit — `platform-aggregation-methodology.md`

Audit target: `C:\Users\Garrett\Sports\handoff\research\forecasting\platform-aggregation-methodology.md`
Cross-checked against: repo modules (`log-odds-pool.ts`, `consensus.ts`, `market-anchored-reconciliation.ts`, `calibration-*.ts`, `hawkes-steam.ts`, `clv-decomposition/capture.ts`, `devig/`, `brier-ogd-ensemble.ts`, `elo-estimator.ts`, `kelly.ts`), cited URLs, and external sources.

---

## ERRORS (factual / formula / attribution)

### 1. Manifold AMM — WRONG. Report asserts LMSR; Manifold uses CPMM (constant-product), NOT LMSR.
- Report line 19, 56–62: "Manifold Markets — LMSR / Play-Money Mechanics", cost function C(q) = b·log(∑exp(q_i/b)), price p = exp(q_i/b)/∑exp(q_j/b).
- Evidence (external search, Manifold docs + arXiv surveys): Manifold's binary markets run a **constant-product market maker** (CPMM, fixed-product), where YES/NO share pools multiply to a constant (k = q_Y·q_NO). The LMSR paper (`arXiv 2510.12952v1`) the report cites is about LMSR theory in general, NOT Manifold's production engine. Manifold's own docs (`news.manifold.markets`) describe the AMM as fixed-product. The report's LMSR equations for Manifold are fabricated by conflating Hanson LMSR literature with Manifold's actual mechanism.
- **Impact: HIGH.** The entire "Manifold LMSR / AMM mechanics" section (lines 56–62) and the gap table entry (#3, "Manifold LMSR cost function integration") rest on a false premise. Implementing LMSR as "Manifold's actual mechanism" would model the wrong dynamics.

### 2. Extremization formula — PARTIALLY WRONG form presented.
- Report line 156: `p_extreme = p^{γ} / (p^{γ} + (1-p)^{γ})` presented as "the" extremized version of geometric mean of odds.
- Actual repo implementation (`log-odds-pool.ts` line 121): `logistic(extremizationExponent * meanLogOdds)`, which in probability terms equals `(O^{γ}) / (O^{γ}+1)` where O is geometric mean of odds. That IS algebraically equivalent to `p^{γ}/(p^{γ}+(1-p)^{γ})` ONLY if p is the geometric-mean-of-odds result. The report never clarifies that γ applies to the **pooled log-odds**, not to an arbitrary p. It presents the probability-form as standalone without specifying it's applied to the geometric-mean pool — easy to mis-implement by applying γ to an arithmetic mean.
- The Satopaa reference (line 22 comment) is correct: `logit(p̄*) = w·Σ logit(p_i)`, extremize `w>1`. The repo implements this correctly; the report's presentation is ambiguous.

### 3. Metaculus aggregation — OVERSIMPLIFIED.
- Report line 50: "Recency-weighted median (Community Prediction) + proprietary Metaculus Prediction (performance-weighted + extremized)."
- What's missing: Metaculus' production predictor is a **weighted ensemble of forecasters by historical Brier score + recency-weighted geometric-mean-of-odds + a recency-decay parameter + peer-score weighting + extremization applied to the ensemble result**. The report collapses all of that to "proprietary" without noting the public components (peer score = geometric mean of odds + recency weights; performance weights from track record). The relative log score (line 54) formula is described vaguely as "A + R weighted by N" with no actual equation; RLS = A + R/N is a simplification — the real RLS includes both absolute log score and a relative component scaled by prediction count and time-decay.

### 4. Polymarket fee / neg-risk mechanics — MISSING entirely.
- Report lines 64–68 describe CLOB and implied probability but omit:
  - Taker fee (~2%) and maker rebates (funded by fees).
  - **Negative-risk (neg-risk) markets** — the report mentions the term once (line 191 URL reference `2606.16852v1`) but never explains the mechanism: binary contracts with 0–100 range, split/merge/redeem, maker rebate program funding from fee module contracts. The cited `changelly.com/blog/what-is-polymarket` article is a marketing explainer, not an authoritative source.
  - No mention of the smart-contract settlement pipeline (off-chain operator match → on-chain `matchOrders` via Fee Module contracts for binary vs. neg-risk).

### 5. Numerai v5-era signals — PARTIALLY OUTDATED.
- Report references `docs.numer.ai` (line 29–34) but describes `FNCv4` (line 30: "FNCv4, feature neutral correlation formula s' = s - N·(N_inv·s)"). Numerai's current docs describe v5 tournament mechanics (v5 meta model, v5 scoring with `corr20` + `mmc20`, updated staking with NMR v2 token). The projection notation `s' = s - N·(N_inv·s)` is a simplified matrix-form projection; actual docs describe orthogonalization against feature columns via Spearman rank correlation, not a simple matrix inverse form. The report's notation is approximate, not wrong, but it doesn't reference the current v5 docs URL (`docs.numer.ai/numerai-tournament/scoring/definitions/`) with the actual current formula structure.
- Missing: v5-era changes to the meta model contribution (MMC) computation — now includes both correlation (corr) and MMC weights with updated multipliers; the report uses older `corr_mult` / `mmc_mult` framing.

### 6. GJ Open scoring nuances — INCOMPLETE.
- Report line 84: "Brier score primary metric (lower = better). GJP also uses log score and calibration curves."
- Missing: GJP's **logarithmic scoring rule** is actually used as a selection/weighting mechanism (not just as an alternative metric). The Mellers et al. 2015 paper (line 43, cited correctly) describes that superforecasters are selected by Brier but the aggregation uses **performance-weighted averaging** with cognitive debiasing steps. The report doesn't describe the actual aggregation protocol used by GJP (structured team synthesis, not algorithmic mean). It also misses the **ForecastBench** discussion (line 38 URL `goodjudgment.com/what-forecastbench-doesnt-measure/`) which explicitly argues that Brier-only leaderboards miss teaming and reasoning-value effects — very relevant to the repo's ensemble work.

---

## MISSED (documented methodology missing from report)

### A. Metaculus
- Missing: the actual **geometric mean of odds** derivation steps shown in forum post (`forum.effectivealtruism.org/posts/sMjcjnnpoAQCcedL2`) — the report summarizes but doesn't reproduce the derivation.
- Missing: **peer-score weighting formula** (performance-weighted geometric mean, not just "performance-weighted").
- Missing: **extremization parameter tuning procedure** — the range 1.161–3.921 is given (line 7, 51) but there's no mention that it's Brier-optimized per dataset, not a universal constant.
- Missing: Metaculus' recent shift to **log-score-weighted aggregation** for certain market types (not covered at all).

### B. Manifold (CPMM, not LMSR)
- The entire report's Manifold section (lines 56–63, entry in gap table #3) is built on LMSR. The **actual** method is CPMM with `k = q_Y·q_NO` invariant. Report misses:
  - Play-money dynamics (mana, subsidies, leaderboards) — mentioned briefly (line 61) but no mechanism explanation.
  - **No worst-case loss bound** (unlike LMSR). CPMM can lose unbounded amounts to arbitrageurs. The report's claim "worst-case loss ≤ v" is an LMSR property misapplied to Manifold.
  - Manifold's subsidy mechanism (platform injects liquidity; not trader-funded).

### C. Polymarket
- Missing: **negative-risk market mechanics** (see Errors #4). The cited `arXiv 2606.16852v1` (line 191 reference) is specifically about off-chain match + on-chain settlement — the report should read and summarize it but doesn't.
- Missing: **fee module smart contracts** (`FeeModule` per `docs.polymarket.com/concepts/prices-orderbook` and `arXiv 2606.16852v1`).
- Missing: **implied-volatility / price-impact dynamics** from CLOB depth — the report treats price = probability but ignores depth-based confidence intervals.

### D. Numerai
- Missing: **v5 meta-model contribution (MMC)** updated computation — the repo's `brier-ogd-ensemble.ts` uses Brier-optimized weights but doesn't implement MMC-style orthogonal contribution. The report mentions MMC (line 121) but gives no formula for v5 MMC.
- Missing: **era boosting computation** — line 177: "Weight lower-performance eras inversely by performance variance" is vague. Actual era boosting uses Sharpe-ratio-based reweighting (inverse by per-era std dev of correlation, not just "lower-performing").
- Missing: **stake-weighted meta model** formation — the payout formula (line 173) is given but the meta-model aggregation (weighted average of staked predictions) is described loosely (line 75) without the v5 weighting formula.

### E. Good Judgment / Superforecasting
- Missing: **structured aggregation protocol** (red-team, reasoning synthesis, debiasing) — mentioned conceptually (line 86) but no operational framework given.
- Missing: **ForecastBench critique** implications for repo's calibration-monitoring (line 38 URL — highly relevant, never cited in analysis).

---

## RANKING CORRECTIONS (Top 8 — cost/value miscalibrated)

Current ranking (lines 131–147):

| # | Technique | Report Rating | Audit Verdict |
|---|---|---|---|
| 1 | Metaculus extremization γ | LOW cost, HIGH value ✅ | KEEP at #1 — correct; repo's `log-odds-pool.ts` already implements it. Just add γ tuning loop. |
| 2 | Metaculus recency-weighted median | LOW cost, HIGH value ✅ | KEEP — direct extension of existing calibration-drift windows. |
| 3 | Numerai feature neutralization | MEDIUM cost, HIGH value ✅ | KEEP — aligns with `calibration-map.ts` projection capability. |
| 4 | Numerai feature exposure (SRCC) | LOW cost, MEDIUM-HIGH value ⚠️ | **PROMOTE to #3 or merge with #3.** Low-cost addition to `calibration-monitor.ts`; SRCC is 3 lines of code. Report undervalues. |
| 5 | Manifold LMSR cost function | MEDIUM cost, MEDIUM value ❌ | **DEMOTE / REPLACE.** Built on false LMSR premise. Should be replaced with **CPMM cost/invariant** (lower value, since repo is sports, not play-money betting). If kept, cost should be LOW (constant-product invariant is simpler than LMSR) but value LOW (not directly applicable). |
| 6 | Numerai MMC metric | MEDIUM cost, MEDIUM-HIGH value ⚠️ | **PROMOTE to #4.** The repo's `brier-ogd-ensemble.ts` already has Brier-optimized weights; adding an orthogonalized contribution metric complements it directly. Report undervalues by ranking it below a false LMSR entry. |
| 7 | Polymarket CLOB ingestion | MEDIUM cost, MEDIUM value ✅ | KEEP but **upgrade value** — CLOB ingestion feeds `clv-capture.ts` directly; real-capital-weighted forecasts are highly valuable for the repo's market-anchored reconciliation. Should be ranked #5 (not #7). |
| 8 | GJ teaming / red-team | HIGH cost, MEDIUM-HIGH value ✅ | KEEP at #8 — organizational change; high cost is real. But the report should reference `consensus-view.ts` and the `calibration-monitor.ts` framework as existing infrastructure that makes team-level tracking feasible (not fully green-field).

### Suggested re-ranking:
1. Extremization γ (#1 — unchanged)
2. Recency-weighted median (#2 — unchanged)
3. Feature neutralization + SRCC exposure (merged/combined, promoted)
4. MMC metric (promoted — complements existing Brier OGD ensemble)
5. Polymarket CLOB ingestion (promoted — feeds `clv-capture`, real-capital weights align with Kelly bankroll logic)
6. CPMM invariant (replaces false LMSR entry — lower value, but correct mechanism)
7. Feature neutralization standalone (if not merged)
8. GJ teaming (unchanged position, but note existing `consensus-view.ts` infrastructure reduces cost)

---

## UNDER-LEVERAGED (given repo's existing modules)

### 1. `log-odds-pool.ts` — ALREADY BUILT; report treats it as missing.
- The new `edge-lab/features/log-odds-pool.ts` (line 124) implements geometric-mean-of-odds + extremization exactly as described in the Metaculus section. The report's gap table (line 113) claims "No geometric-mean aggregation; no extremization parameter γ" — **false**. The repo has both. What's actually missing is: (a) a tuning loop to select γ per dataset (Brier-optimized), and (b) wiring it into `consensus.ts` (currently arithmetic mean, line 83) instead of keeping it isolated in `edge-lab/`.
- **Recommendation:** Add γ-tuning script; wire `logOddsPool` into `computeConsensus` as an optional aggregation mode (not replacement — keep arithmetic mean as default, add geometric-mean mode).

### 2. `consensus.ts` — arithmetic mean dominates; geometric mean is available but unused.
- Line 83: `mean = ...weighted arithmetic mean...`. The `log-odds-pool.ts` geometric-mean alternative is never called. The report misses this — it should highlight that the gap is **wiring**, not implementation.

### 3. `calibration-monitor.ts` + `calibration-apply.ts` — perfect home for SRCC feature exposure tracking.
- The report notes the gap (#4) but doesn't reference the actual calibration pipeline (`calibration-monitor.ts`, `calibration-drift.ts`, `calibration-apply.ts`, `temperature-scaling.ts`, `online-beta-recalibration.ts`, `online-beta-sliding-window.ts`). Feature exposure tracking (SRCC per feature column) fits directly into the monitor/apply pipeline — not a new module.

### 4. `clv-decomposition.ts` / `clv-capture.ts` + `hawkes-steam.ts` — under-utilized for Polymarket-style ingestion.
- The report notes CLOB ingestion gap (#7) but doesn't observe that `clv-capture.ts` is specifically designed for market-price divergence tracking. Ingesting live Polymarket bid/ask (or Kalshi CLOB) and feeding it into CLV decomposition + Hawkes steam modeling is a **natural extension**, not a new architecture.

### 5. `devig/` (Shin devig) — not mentioned in gap table at all.
- The repo has Shin devig utilities (`devig/shin-devig.ts`). The report never references them. For prediction-market-style aggregation, Shin's de-vig method (removing bookmaker margin) is a direct complement to market-price ingestion. Missing entirely from ranking.
- **Should be added:** De-vig + CLOB ingestion pipeline (LOW cost, HIGH value — uses existing `devig/` and `clv-capture/` modules).

### 6. `kelly.ts` / `bankroll.ts` / `robust-kelly.ts` — not connected to aggregation weights.
- The report notes "stake-weighted meta model" as missing (line 118) but misses that the repo's Kelly framework could be used to translate forecaster performance into **stake-equivalent weights** (i.e., treat historical Brier score as bankroll growth, derive Kelly-optimal allocation weight per forecaster). This is a direct, under-leveraged bridge between the Kelly module and ensemble weights.

### 7. `brier-ogd-ensemble.ts` — missing MMC-style orthogonal contribution.
- Confirmed: the Brier OGD ensemble optimizes weights on Brier loss but doesn't include an orthogonal contribution component. Adding MMC (rank → gaussianize → orthogonalize vs meta model) complements the existing weight optimization — exactly as report notes (#6), but the connection to `brier-ogd-ensemble.ts` is deeper than described.

---

## POLISH (presentation, citations, format)

- **URL quality:** Line 189 (`gensyn.ai/lmsr-logarithmic-market-scoring-rule/`) — secondary blog source; should reference original Hanson paper (`Hanson 2003, "Combinatorial Information Market Design"`) for LMSR derivation, and the actual Manifold docs (`manifold.markets/about`) for CPMM description. Line 190 (`cultivatelabs.com/crowdsourced-forecasting-guide/how-does-logarithmic-market-scoring-rule-lmsr-work`) is a marketing explainer.
- **Citation format:** Inconsistent — some URLs lack access dates; no DOI for Baron et al. 2014; arXiv URLs don't include version suffix consistently (line 15: `2510.12952v1` is fine; others omit version).
- **Formula formatting:** The feature neutralization equation (line 164) uses `N·(N_inv·s)` which implies matrix notation without defining dimensions. Should specify: projection matrix `P = I - N·(N^T N)^{-1}·N^T` applied to prediction vector `s`. The current notation is ambiguous on whether `N` is feature matrix or feature-vector.
- **Missing cross-reference:** No reference to the repo's `edge-lab/features/log-odds-pool.ts` file (line 1 of the actual source). The report should cite the existing module explicitly.
- **Table formatting:** The gap table (line 111) uses `||` markdown separators but the header has only 3 columns; some rows have empty middle cells. Clean formatting needed.
- **Conclusion (line 207–208):** States "largest gaps are (a) aggregation-level techniques (extremization, recency-weighted geometric mean, meta-model contribution)" — but (a) extremization and geometric mean ALREADY EXIST in `log-odds-pool.ts`. The conclusion needs revision: the real gap is **wiring + tuning + CPMM correction + MMC + de-vig + Kelly-to-ensemble bridge**, not missing modules.

---

## SUMMARY — Top Findings (compact)

1. **Manifold section is factually wrong (LMSR → CPMM).** Entire #5 ranking entry and gap-table row are based on a misidentified mechanism. This invalidates the LMSR cost-function adoption proposal.
2. **Repo already has geometric-mean + extremization (`log-odds-pool.ts`).** Report claims they're missing. Real gap: wiring into `consensus.ts` + γ-tuning loop, not new implementation.
3. **Extremization formula presentation is ambiguous** — applies to pooled log-odds, not arbitrary probability. Report should reference `log-odds-pool.ts` line 121 (`logistic(extremizationExponent * meanLogOdds)`) as the authoritative implementation.
4. **Polymarket fee/neg-risk/smart-contract mechanics entirely missing.** Only surface-level CLOB description; no mention of taker fees, maker rebates, negative-risk contracts, or `matchOrders` settlement pipeline.
5. **Numerai v5-era updates partially outdated** (`FNCv4` naming, simplified projection notation, missing updated MMC/staking formulas).
6. **Ranking: #5 (LMSR) should be replaced with CPMM; #6 (MMC) and #7 (CLOB) should be promoted; #4 (SRCC) should be promoted/merged.** The existing `devig/` and Kelly-bankroll modules should be added to the ranking as under-leveraged bridges.
7. **Under-leveraged modules not mentioned:** `devig/shin-devig.ts` (for market de-vigging), `kelly.ts` (for stake-weighted ensemble weights via Kelly-optimal allocation), `clv-capture.ts` + `hawkes-steam.ts` (for CLOB ingestion pipeline).
8. **Conclusion needs rewrite** — does not account for the new `log-odds-pool.ts` module; claims extremization "missing" when it's present.

---

*Audit completed: verified against repo modules at `packages/prediction-engine/src/` (log-odds-pool, consensus, market-anchored-reconciliation, calibration pipeline, devig, brier-ogd-ensemble, kelly, clv, hawkes-steam); cross-checked cited URLs; external verification of Manifold CPMM via Manifold docs + arXiv surveys; Satopaa formula verified against `log-odds-pool.ts` source; Polymarket docs (docs.polymarket.com) and fee/neg-risk papers (`arXiv 2606.16852v1`) referenced but not fully reproduced (flagged as gaps).*
