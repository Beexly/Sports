# JEV EMISSION-GATE EVAL PROTOCOL — FROZEN 2026-10-16

**Status: PRE-REGISTERED AND FROZEN.** Written 2026-10-16 by Motif, executing the Super Heavy Grok research verdict Garrett adopted the same day (HYBRID: finish our transparent sieve + simulation emission gate, add a selective/calibration layer, test Laya as ONE component inside this harness; do NOT adopt any System One model — public Jev / OpenJev / Laya — as the arbiter; they carry zero published evidence on sports-signal arbitration, EV, or CLV).
**Freeze rule:** any change to dataset, splits, metrics, thresholds, bars, or kill criteria after a run starts converts that run from *evaluation* to *fitting*. A changed protocol requires a fresh eval set and a new frozen document. Threshold re-tuning on scored results is prohibited.
**Companion artifacts (read before running):** eval set `~/workspace/second-pass/laya-eval/eval-set.csv` + `~/workspace/second-pass/laya-eval/README.md` (provenance, counts, biases); design origin `~/workspace/second-pass/stream-e1-laya-eval-design.md` (hypotheses, leakage rules, truncation budget, the frozen decision thresholds and seat/kill bars this protocol carries forward).

---

## 0. Doctrine header (governs every candidate, non-negotiable)

- **Ingestion is universal and ungated.** Every signal enters the engine. No candidate in this eval may filter, rank-down, or discard what the engine is allowed to *know*.
- **The gate rules EMISSION only.** A gate's entire jurisdiction is whether a candidate pick is emitted (published) or withheld. A refused emission keeps its refusal as a status inside the engine, available to the reasoning layer.
- **Arbitration runs on measured evidence only:** calibration, closing-line value, walk-forward results. No heuristics, no vendor claims, no vibes. Vendor/creator numbers for any model named here are unproven on sports distributions and are used nowhere in the bars below.
- **Gates inside the engine are decided by this evidence process** — pre-registered bars, walk-forward, measured outcomes — never by escalation. Garrett's taps remain his property (accounts, money, identity, credentials); nothing in this protocol asks for one except the single named data pull in §7, which is a credential of his, stated as fact.

---

## 1. Dataset (as built — cite exactly, invent nothing)

**File:** `~/workspace/second-pass/laya-eval/eval-set.csv` — 3,081 rows + header, 46 columns, built 2026-10-14 from real on-disk GSE / nflverse data only. No row was fabricated; where no on-disk source existed, the cell is empty and the README says so.

**Columns (46):** `eval_id, tier, sport, season, week, gameday, game_id_or_pick_id, away_team, home_team, market, candidate_side, candidate_team, opponent_team, model_name, model_prob_home, model_prob_candidate, market_fair_prob_candidate, edge_vs_market, closing_line, closing_price, rest_diff, is_dome, neutral_site, is_divisional, home_games_prior, away_games_prior, home_margin_avg, away_margin_avg, home_pts_scored_avg, away_pts_scored_avg, home_pts_allowed_avg, away_pts_allowed_avg, gate_state_text, gate_state_est_tokens, outcome_label, outcome_y, home_score, away_score, margin, total_points, units_result, beat_close, clv_available, clv_value, realized_quality, source_files`.

**Gate-visible vs label:** a candidate may touch only fixture fields, `market`, `candidate_*`, `model_*`, `market_fair_prob_candidate`, `edge_vs_market`, `closing_line`, `closing_price`, context/form fields, and `gate_state_text`. Label columns (`outcome_label`, `outcome_y`, scores, `margin`, `total_points`, `units_result`, `beat_close`, `realized_quality`) are joined by the scoring harness **after** ruling, never by the state builder. Leakage rules from the design doc §2.1 are part of this freeze (prior-form fields only; no same-game outcome fields; in-play picks excluded — 151 such rows were removed at build).

**Tier A — `A_bridge_holdout`, 570 rows** (285 games × 2 markets: MONEYLINE 285, SPREAD 285; no TOTAL — no on-disk totals model output exists to grade honestly). Sealed 2025-season holdout, 2025-09-04 → 2026-02-08 incl. playoffs. Candidate = the bridge model's (`pregame_context_logit`, fit on seasons strictly before 2025) preferred side per game. Real lines, prices, scores, units: moneyline units at the row's closing moneyline, spread units at −110 (+0.9091 / −1 / 0). Outcomes: ML 174 W / 110 L / 1 push; SPREAD 135 W / 149 L / 1 push.

**Tier B — `B_prod_settled`, 2,511 rows.** Real production settled GSE picks (published, non-bootstrap, settled WIN/LOSS, learning-eligible; markets ML 1,105 / SPREAD 776 / TOTAL 630; model versions v5.2.7 1,545 · v5.1.0 515 · v5.2.6 297 · v5.0.0 149 · others 5). Outcomes 1,376 W / 1,135 L (54.8%). **The export preserved almost no state:** no teams, no dates, no lines, no prices, no units, no CLV — market + model probability `p` + version only. Tier B therefore supports discrimination/calibration scoring only (win/loss vs confidence). Pushes do not exist in this tier (source query was WIN/LOSS only — slightly flattering win rates; recorded, not hidden).

**Measured pass-all baselines on this exact set (computed at build; the floor every candidate must beat):** Tier A ML **−0.080 u/pick**; Tier A SPREAD **−0.092 u/pick** (pooled ≈ −0.086); Tier B win rate **54.8%**.

**Known limits (carried into every scorecard):**
- **No true CLV anywhere on disk.** `clv_available = false` and `clv_value` empty on all 3,081 rows. The on-disk sources carry one (closing) line per game. Anyone claiming true CLV from this set is inventing it. §4 defines the honest proxy used until the §7 pull lands.
- Tier A rows are **clustered**: 2 rows per game share one outcome → all Tier A confidence intervals are **cluster-bootstrapped by game** (285 clusters). SE on mean units ≈ ±0.05–0.06u. **INCONCLUSIVE is a legitimate verdict**, distinct from failure (§6.3).
- Tier A is one model, one season, reconstructed candidates (real out-of-sample predictions, but nobody historically submitted these exact candidates to a gate). Tier B is recent-weighted, windowed, and its `p` was measured by GSE's own calibration audit as non-monotone and anti-predictive at the top band (80+ claims ~0.87, realizes ~0.52) — ugly Tier B calibration baselines are the terrain, not a set defect.
- NFL only (the only sport with settled per-pick data on disk; engine scope is multi-sport — a named gap, closed by the §7 pull pattern per sport).
- `realized_quality` is realized, not ex-ante: good picks lose ~45% of the time. Score aggregates, never single rows.

## 2. Temporal split (frozen)

- **Tier A (dated):** order by `gameday`. **Calibration/tuning block:** 2025 Weeks 1–12. **Pure test block:** Week 13 through the Super Bowl (2025-12 → 2026-02-08). The test block is scored exactly once per candidate, after all tuning is finished. No threshold, weight, or feature choice may be revised after the test block is opened.
- **Tier B (undated):** no timestamps exist, so **no temporal split is possible and none is faked**. Tier B is scored whole, as corroboration only, and is **never** used for tuning (its `settledAt`-desc windowed pull would leak recency into any split).
- **Simulation/distributional outputs** are tuned, if at all, on the calibration block only, and validated on the test block under the same one-opening rule.

## 3. Candidates under test (arms — identical harness, identical states)

- **(a) Internal design / minimal selective gate.** Our own emission gate as designed: the transparent sieve + 10,000-run correlated simulation layer (p90/p99, ceiling EV, duplication check) + the selective/calibration layer (calibrated stacking/weights + market/CLV disagreement + selective risk threshold). Phase 1 runs the minimal selective gate if the full sieve is not yet runnable end-to-end; whichever runs is named exactly in the scorecard — no silent substitution.
- **(b) Simple weighted ensemble + market prior baseline.** Diverse base signals combined by fixed or calibration-block-learned weights with the devigged closing line as the strongest prior. The honest simple thing a candidate must beat to justify existing.
- **(c) Market-only baseline.** The devigged closing line alone, with pass-all emission. The floor of floors.
- **(d) Laya as ONE scoring component — PHASE 2 only.** `NandhaKishorM/laya` (Convai Innovations, Apache-2.0; 421M-param English checkpoint), fine-tuned on pre-2025 settled seasons only (never on the 2025 holdout, never on Tier B), contributing one score inside arm (a)'s gate — never the sole arbiter, never a knowledge filter. Same harness, same bars. Zero-shot Laya may also be run in phase 2 as a diagnostic arm under the design doc's frozen ruling rule (PASS if P(should_pass) ≥ 0.50; REJECT if ≤ 0.35; ABSTAIN between) and its truncation discipline (states ≤ ~152 est. tokens on this set; hard cap 800, target ≤ 700, tokenizer-counted before the run, truncation canaries in every batch, over-budget states refused and logged — a silent truncation voids the run).
- **Reference arm (not a candidate): pass-all** — passes every candidate; its measured numbers are in §1.

Every candidate emits, per row: emit/withhold, a confidence in [0,1] where the design supports one, and — where the design produces them — predicted p90/p99 of the emitted set's units distribution. Candidates that cannot produce a field score N/A for that field's metric; N/A is reported, never imputed.

## 4. Metrics (ALL reported, per tier, per market, and pooled; units never dollars)

1. **CLV + expected CLV.** *On this set:* the realized proxy — **beat-close rate** on Tier A spread rows (fraction of emitted spread candidates with `beat_close = true`; −110 breakeven = 52.4%) and passed-set mean `units_result` as the value proxy. *After the §7 pull:* true CLV from `clvValue`/`clvVerdict` (lock vs close) becomes the primary CLV metric and the proxy is retired to a footnote. Expected CLV = mean CLV of the emitted set.
2. **Calibration:** **Brier** score, **log-loss**, **ECE** (10 bins) of each candidate's confidence vs realized quality — **with the reliability read printed** (per-bin claimed vs realized), not just the scalar. Reference scale: the bridge model's published holdout Brier 0.2237 / ECE 0.0519.
3. **Selective risk vs coverage:** risk–coverage curve at coverage levels {20%, 40%, 60%, 80%, 100%}: emitted-set mean units and false-pass rate (fraction of realized-bad, `units_result < 0`, that were emitted) at each level. Headline comparison is **at matched coverage** against arms (b) and (c).
4. **Walk-forward economics (Tier A):** ROI per emitted pick, **profit factor**, **max drawdown** — all in units, computed over the time-ordered test block in weekly sub-blocks (walk-forward stability is judged here, §5).
5. **Tail honesty:** **realized vs predicted p90/p99** of emitted-set units, for candidates that emit distributional outputs (arm (a), and (d)-in-(a)): realized exceedance rates vs the predicted 10% / 1%.
6. **Duplication rate:** share of emitted candidates that are the second emitted candidate on the same `game_id_or_pick_id` (Tier A construction emits up to 2 per game), plus emitted-set concentration by game. A gate that doubles exposure on one game without knowing it fails the duplication check even if its units clear.
7. **Discipline metrics:** coverage (emit rate), abstention rate where supported, false-reject rate on realized-good picks (`units_result > 0`), schema failure / invalid-output rate for any model-backed component (must be < 1%; ≥ 5% is a kill, §6).
8. **Tier B corroboration:** emitted-set win rate overall and per market vs the 54.8% pass-all rate, and confidence calibration vs `outcome_y`. No units, CLV, or per-game claims may be drawn from Tier B.

## 5. Bars (pre-registered — ALL must hold for a candidate to earn a shadow seat)

On **Tier A test block** (primary), cluster-bootstrapped by game:

1. **Value:** emitted-set mean units **≥ +0.02 u/pick** pooled, 95% CI lower bound **> −0.02**, and **≥ +0.02 u/pick above arm (b)** and **≥ +0.10 u/pick above pass-all** at matched coverage.
2. **CLV proxy:** emitted spread candidates' beat-close rate **≥ 52.4%** and **≥ arm (b)'s rate + 2 points**.
3. **Calibration:** **Brier ≤ 0.24** and **≥ 0.005 better than arm (c)** (market-only); **ECE ≤ 0.07**; AUC of confidence as a quality ranker **≥ 0.58**.
4. **Selective risk:** at matched coverage, emitted-set mean units **≥ both baselines'**, with false-pass rate on realized-bad picks **≤ 0.40**.
5. **Coverage sanity:** emit rate between **15% and 85%**; false-reject rate on realized-good picks **≤ 0.60** (selective, not indiscriminate); abstention rate ≤ 25% where abstention exists, with abstained-set mean units < emitted-set mean units.
6. **Walk-forward stability:** no weekly test sub-block with ≥ 30 emitted picks shows mean units **< −0.10 u/pick** (no catastrophic period).
7. **Tail honesty (where distributional outputs exist):** realized exceedance of predicted p90 within **5–15%**, of predicted p99 within **0.2–2.5%**.
8. **Integrity:** zero truncation-canary failures; schema failure rate **< 1%**.

On **Tier B** (corroboration): emitted-set win rate **≥ 58%** overall (vs 54.8% pass-all) at an emit rate ≥ 20%, and emitted win rate above pass-all **in each market separately**.

## 6. Kill criteria (ANY one kills the candidate — verdict recorded with evidence)

1. Emitted-set mean units **≤ 0** on the Tier A test block, or its 95% CI sits entirely below arm (b)'s emitted-set mean.
2. **Baseline-margin failure:** does not beat arms (b) and (c) by the §5 margins on CLV-proxy and calibration — a complex gate that adds nothing over a weighted ensemble + market prior, or over the market alone, has no seat to earn.
3. **Coverage theft:** coverage of realized-good picks falls without commensurate risk reduction — false-reject rate > 0.60, or selective risk at matched coverage is not lower than the baselines'.
4. **Inverted or empty confidence:** AUC < 0.50, or ECE > 0.10 with overconfidence concentrated in the top bin (wrong options chosen with a confident face), or the abstained set realizes **better** than the emitted set (uncertainty signal pointing the wrong way).
5. **Systematically miscalibrated tails:** realized exceedance of predicted p90/p99 outside the §5.7 bands on the test block.
6. **Walk-forward collapse:** any weekly test sub-block breaching the §5.6 floor.
7. **Integrity failure:** any look-ahead (a label field reaching a candidate), any threshold/weight/feature tuned after the test block was opened, any silent truncation reaching a model-backed component, or schema failure rate ≥ 5%.
8. **Knowledge filtering:** any candidate found to suppress ingestion — dropping, hiding, or ranking-down signals before the reasoning layer — is killed on doctrine regardless of its numbers. The gate rules emission only.

"Kill" = the experiment verdict for that candidate on this data: recorded with its numbers (honest-negative doctrine), the harness and set remain as the standing test for the next candidate. It is a current status, not a permanent ban (nothing-gets-killed corpus rule).

### 6.3 Inconclusive

If point estimates clear §5's direction but the cluster-bootstrapped CIs cannot separate the candidate from the baselines (a real risk at 285 games), the verdict is **INCONCLUSIVE** and the prescribed next step is the §7 data pull — not promotion, and not a re-run on the same set with tuned thresholds.

## 7. The one named blocker for RUNNING the eval (fact + exact next step)

This protocol is frozen and the harness can be built today. The eval's **CLV-bearing run** — the run whose scorecard carries true CLV instead of the §4 proxy — requires the completing data pull, and that pull requires **`DATABASE_URL`** (the Neon production credential), which is **not stored on Motif's VM and was not hunted**.

**Exact next step:** when Garrett supplies `DATABASE_URL` through his credential path (his property — a credential tap, not a decision this protocol escalates), the fleet runs the repo's existing read-only export — `scripts/export-settled-picks-for-calibration.mjs` in Beexly/Sports — once. That single run returns settled non-bootstrap picks with selection, line, price, confidence, edgeScore, tier, grade, timestamps, game linkage, and the true CLV fields (`clvLock*` / `clvClose*` / `clvValue` / `clvVerdict`) plus factor breakdowns. It **supersedes Tier B entirely** (full state replaces the thin export) and adds dated, CLV-scored rows that extend the set. Companion pull in the same pass: refresh the nflverse schedules file from the upstream URL in `data/gse-dataset/holdout.manifest.json` and re-join `data/gse-dataset/current/week3-engine-readings.jsonl` to settle the 16 live 2026 Week-3 engine readings (15 additional settled games — the only rows whose candidate is a live engine reading).

**The day the credential lands, the frozen run starts** — dataset v2 is built from the pull, the split in §2 is applied to the dated rows, and the scorecard is produced under this document unchanged. Until then, the proxy-scored run on the on-disk set (§4) may proceed and be reported **labeled PROXY-CLV**, never as the CLV run.

## 8. What a run produces (acceptance output)

A single scorecard, published internally regardless of outcome: per candidate × tier × market — every §4 metric with cluster-bootstrapped CIs, the reliability read, the risk–coverage table, walk-forward sub-block results, tail-exceedance table, duplication rate, integrity log (canaries, schema failures, leakage checks) — and a verdict per candidate: **SHADOW SEAT / KILLED / INCONCLUSIVE**, each tied to the §5/§6 line that decided it. Honest negatives are published, not hidden (the Hermes pattern).

*Frozen 2026-10-16 by Motif. Sources: eval set README + CSV (verified on disk this date: 3,081 rows, 46 fields, `clv_available=false` × 3,081); design doc 2026-10-14 (frozen ruling thresholds, truncation budget, seat/kill bars carried forward); Super Heavy Grok Jev-alternatives research verdict, adopted by Garrett 2026-10-16 (hybrid recommendation, eval design, kill criteria).*
