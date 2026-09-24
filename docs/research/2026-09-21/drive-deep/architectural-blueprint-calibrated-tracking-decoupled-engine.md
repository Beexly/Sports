# Deep-Dive Note: Architectural Blueprint for a Calibrated, Tracking-Decoupled Sports Probability Engine

- **Source:** Google Drive doc "Architectural Blueprint for a Calibrated, Tracking-Decoupled Sports Probability Engine" (converted to `/tmp/drive-deep/architectural-blueprint.md`, 425 lines / ~33,171 chars; fully read)
- **Read date:** 2026-09-21
- **Status:** COMPLETE — full document read, no truncation in body text (line 426 empty; the tail reference list ends at "onprediction.xyz / On Prediction — The Knowledge Hub for Prediction Markets")
- **Corpus rule compliance:** raw substance preserved below; metrics, equations, and thresholds are copied from the document; approximations flagged as approximate; gaps recorded in §8.

---

## 1. Research question and thesis

**Question:** How do you build an elite, well-calibrated sports probability engine without paying for live 10Hz spatial tracking data — both economically (licensing "typically exceeding hundreds of thousands of dollars annually") and legally (BDB / token-gated NextGenStats scraping for commercial use violates non-commercial licensing / ToS)?

**Thesis:** Aggressively *decouple* the spatial tracking pipeline from the uncertainty/calibration engine. Harvest all edge from:
1. advanced uncertainty quantification,
2. distribution-free conformal calibration,
3. continuous margin *density* evaluation (not point probabilities),
4. market microstructure exploitation (Shin devigging, B-spline steam detection, state-transition latency arbitrage).

Track raw coordinates only via non-commercial datasets for *offline method validation*; learned architectures are refit onto owned/open-source event data (nflverse) before anything commercial.

The deliverable is a strict **three-tiered roadmap** (Rungs 1–3: data integrity → predictive calibration → priceable execution), with fail-closed gates at every step. The unifying operating principle is survival under **Knightian uncertainty**: no deep learning and no execution until data geometry and finite-sample guarantees are "mathematically absolute."

---

## 2. Methods/models with equations

### 2a. Tracking-decoupled architecture (the core structural claim)

- Live raw-coordinate tracking pipeline is rejected as mandatory infrastructure: 10Hz micro-movement tracking demands zero-copy IPC + dedicated GPU inference (Apache Arrow Flight, NVIDIA Triton) to hold sub-20 ms latency — overhead the architecture refuses to carry.
- Commercially: stop using NFL Big Data Bowl (CC BY-NC) data in any commercial path; use it only offline for method validation and expected-points curve generation; refit learned weights onto nflverse event data.
- The "performance model" (team strength from nflverse + public aggregates) and the "market model" (odds microstructure) are kept **decoupled** to prevent target leakage — closing lines are never input features to team-strength models (would just parrot the oddsmaker).

### 2b. Physical-plausibility gating (Rung 1 ingestion edge)

Hard constraints before any predictive module touches a stream:
- **Spatial:** flag any player movement exceeding **13 m/s** as fatally corrupt (no human athlete sustains it), not an outlier.
- **Market/odds series:** reject non-finite timestamps (a clock that can't be read = `SourceCannotSpeakAsOfError`); scan for fixture triplication, phantom matches from upstream API timeouts, and corrupted consensus metrics (e.g., public betting percentages pinned at exactly 1.0000 across a full MLB run-line slate).
- **Circular statistics trap:** wind direction must not be naively averaged (mean of 0° and 359° incorrectly yields 180°); store as categorical strings or directional cosines.
- Baseline assumption: market-data violation rate "well above five percent" (approximate); spatial datasets: "approaching 19% in some spatial datasets" contain state-transition inconsistencies / impossible telemetry / corrupted formatting (approximate, attributed to audits of raw event logs).
- Every violation logged to map the true corruption rate of each provider.

### 2c. Margin densities and the valuation integral

- **Kill point probabilities:** a point estimate prices exactly one line and obscures bimodal outcomes. Migrate fully to **margin densities** — a density prices every alternate spread/total/teaser and is the only sound basis for pricing middles and mapping where the market's whole probability curve diverges from fair.
- **Valuation:** true value generation is the value function **V = integral of the expected-points curve g_EP evaluated over the density f(y|s)** given state s. (Document states this in prose/heading form; no explicit LaTeX equation given — recorded here as described.)
- Construction: map historical residual standard deviation onto the current point estimate → widened Gaussian baseline density → full PDF answering "what are fair odds at -1.5 through -4.5," not just "does -3.5 hold EV."

### 2d. CRPS as the primary proper scoring rule

- Abandon MAE (ignores variance) and binary Brier (can't evaluate continuous margins) for margin/total forecasting.
- **CRPS definition (prose in doc):** for forecast CDF F and observation y, the integral over x ∈ (−∞, ∞) of **[F(x) − 1{x ≥ y}]² dx**, where 1{x ≥ y} is the empirical step function at the realized outcome. Heavily penalizes mismeasured variance; incentivizes honest calibrated forecasts.
- **Gaussian closed form:** for forecast mean μ, std σ, standardized z (z = (y − μ)/σ implied), CRPS computed via standard normal CDF **Φ(z)** and PDF **φ(z)** — stated in prose, no explicit closed-form equation written in the doc (the standard form is CRPS = σ[z(2Φ(z)−1) + 2φ(z) − 1/√π]; the doc does NOT print this — I am not attributing it to the doc).
- **Operational gate:** a new density model must show measurable CRPS improvement of **< 0.01** (i.e., the kill line is set at an improvement threshold of 0.01 — doc phrasing: "must demonstrate a measurable CRPS improvement of less than 0.01") on **≥ 150 settled spreads** vs. the widened Gaussian baseline before live execution.

### 2e. Conformal calibration: fake-tightness eradication

- Standard split **Conformalized Quantile Regression (CQR)**: non-conformity scores = max error between lower/upper bands and true label on a held-out calibration set; empirical quantile of scores symmetrically inflates intervals.
- **Failure math (exact from doc):** for target coverage 1−α, conformal rank index **k = ⌈(n+1)(1−α)⌉**. If **n < ⌈1/α⌉ − 1**, k exceeds n. Example: α = 0.10, n = 5 → k = ⌈6 × 0.9⌉ = **6 > 5** → empirical quantile at probability > 1.0 forces intervals to ±∞.
- **"Fake tightness" defect:** naive implementations clamp k to max sample size; at n = 5, taking the max residual yields true finite-sample coverage of exactly **5/6 = 83.33%** while reporting 90% confidence. Doc mandates fail-closed: **ban all quantile clamping**; return infinite intervals or issue a **No-Bet** refusal when n can't support the requested coverage.

### 2f. Jackknife+ for scarce samples

- For NFL-scale samples (a season yields only **n ≈ 70** relevant head-to-head analogs; splitting half for calibration is "computationally and predictively devastating"), abandon split CQR → **Jackknife+**: leave-one-out fitted models + LOO residuals; zero data split; still distribution-free coverage guarantee.
- **Critical correction emphasized in doc:** Jackknife+ guarantees coverage **1 − 2α, not 1 − α**. At nominal α = 0.10 → **exactly 80% guaranteed coverage**, not 90%. Must be tracked/logged/reported explicitly.

### 2g. Generalized Venn-Abers for binary moneylines

- Per **Barber et al. (2020)**: bounded-length, distribution-free confidence intervals for binary conditional probabilities are mathematically impossible without structural assumptions. Any per-pick uncertainty band is either infinite or assumption-laden.
- Protocol: (1) name the exchangeability assumption explicitly on the product surface (turned into a brand/transparency asset); (2) replace single point estimates with **Generalized Venn-Abers** calibration — dual monotonic isotonic regressions via **Pool Adjacent Violators Algorithm (PAVA)** on calibration data augmented with both hypothetical test labels → exact epistemic multiprobability interval **[p₀, p₁]**.
- **Epistemic width Δp = p₁ − p₀** quantifies doubt from data paucity + algorithmic uncertainty; feeds the execution orchestrator: **if Δp > 0.20, the market is flagged unpriceable → fail closed, no position.**

### 2h. Adaptive Conformal Inference (ACI)

- Sports violate exchangeability (weather, roster churn, coaching, strategic evolution). ACI monitors empirical coverage error online and updates nominal miscoverage level **α_t after every resolved event** via an online step-error formula (widen when previous outcome fell outside the interval).
- Tuning parameter **γ** controls responsiveness. Guarantees asymptotic coverage without full-model retraining — the mid-season regime-change insulator. (Doc gives no explicit update equation — recorded as prose-described.)

### 2i. Shin devigging

- Reject proportional normalization (overweights favorites as lines grow extreme). **Shin method**: models the overround as asymmetric defense against a modeled fraction of insider trading; **solves a quadratic for the insider-trading parameter z**, disproportionately removing vig from longshot outcomes, shading fair probabilities back toward the midpoint. Most accurate reflection of bookmaker liability. (No explicit quadratic printed in doc.)

### 2j. B-spline steam detection (Hawkes rejected)

- **Hawkes self-exciting point processes rejected** for steam detection on short-horizon odds archives (weeks, not seasons): fitting self-excitation on non-stationary short windows overfits to high-frequency noise → rampant false positives.
- Replacement, fully parameter-free: treat the odds time series as a geometric path.
  1. **Rauch-Tung-Striebel (RTS) Kalman smoother** (forward-backward) strips bid-ask bounce / retail noise first — avoids second-derivative amplification of micro-volatility.
  2. **Cubic B-spline parameterization** → continuous, twice-differentiable trajectory.
  3. Compute instantaneous **curvature κ(t)** at every point.
- Steam signature: **extreme global maximum in κ(t) immediately accompanied by a localized deceleration dip** in trajectory velocity (market maker absorbing the liquidity shock and halting line movement). Gate alerts purely on this geometry — no fitted historical intensities.

### 2k. State-transition cost → latency arbitrage

- Physical analog: a cornerback reacting to a route break pays a **200–400 ms** biomechanical transition penalty (hips flip, forward acceleration → 0), creating an exploitable separation window (framed as an "Expected Separation Over Expected (ESOE)" analog).
- Market analog: after genuine steam, books reprice at different speeds (internal liquidity algorithms, feed latencies). During the forced **200–400 ms repricing window**, stale prices persist at slower secondary books → execute against the stale book inside the verified deceleration window for risk-free closing line value.

### 2l. Forecast-Skill E-Process + robust Kelly

- Before any capital: **anytime-valid sequential likelihood-ratio martingale rooted in Ville's inequality** tests the engine's edge against the Shin-devigged consensus; capital unlocks only when the E-process breaches a predefined confidence boundary.
- Sizing: **worst-case robust Kelly optimization computed over the Venn-Abers epistemic confidence sets** [p₀, p₁].

---

## 3. Key numerical results, tables, benchmarks

The document is an **architecture/specification document, not an empirical paper** — it reports no backtest P&L, no model-vs-model benchmark results, and no dataset experiments with measured outcomes. All numbers below are thresholds, gates, constants, or cited audit figures from the doc — NOT measured results:

| Item | Value (exact per doc) | Nature |
|---|---|---|
| Live tracking licensing cost | "typically exceeding hundreds of thousands of dollars annually" (approximate) | cost claim |
| Spatial dataset corruption | approaching 19% of frames (approximate) | cited audit figure |
| Baseline market-data violation rate | well above 5% (approximate) | design assumption |
| Velocity plausibility cap | 13 m/s — flagged fatally corrupt | hard gate |
| CRPS graduation threshold | improvement of < 0.01 (per doc phrasing) | kill line |
| CRPS graduation sample | minimum 150 settled spreads | kill line |
| Fake-tightness example | α = 0.10, n = 5 → k = 6 > 5; clamped max-residual coverage = exactly 83.33% vs reported 90% | worked math |
| Jackknife+ coverage | 1 − 2α → exactly 80% at α = 0.10 | theorem restatement |
| NFL head-to-head analogs per season | n ≈ 70 (approximate) | design assumption |
| CQR domain | large sample, continuous margins, n > 200 | guidance |
| Venn-Abers no-bet threshold | Δp > 0.20 → unpriceable / fail closed | hard gate |
| ACI tuning | γ controls responsiveness (value unspecified) | parameter |
| Steam repricing window | 200–400 ms | physical/market analog |
| Shin method | solves quadratic for insider parameter z (equation not printed) | method |
| Error type | `SourceCannotSpeakAsOfError` on unreadable clocks | spec |
| Latency target rejected as unnecessary | sub-20 ms envelope (Arrow Flight + Triton) — cited as the overhead being avoided | spec |

**Evaluation-metric comparison table (from doc, § "Continuous Ranked Probability Score Optimization"):**

| Metric | Domain | Characteristic | Vulnerability |
|---|---|---|---|
| MAE | Point estimate accuracy | absolute distance to outcome | ignores variance entirely; no confidence/tail-risk measure |
| Brier Score | Binary discrete outcomes | mean squared error of probabilities | can't evaluate continuous spreads/totals across a distribution |
| CRPS | Full PDFs | integrates squared distance between CDF and observation indicator | computationally intensive without closed-form expressions |

**Conformal methodology table (from doc):**

| Method | Optimal environment | Data split | Coverage guarantee |
|---|---|---|---|
| Split CQR | large sample, continuous margins (n > 200) | requires large withheld calibration set | exact 1−α finite-sample under exchangeability |
| Jackknife+ | scarce samples (NFL, n ≈ 70) | zero split; LOO residuals | guaranteed minimum 1−2α under exchangeability |
| Generalized Venn-Abers | binary moneyline / conditional probs | calibration set + augmented test labels | exact [p₀, p₁] epistemic multiprobability bounds |

**Devigging table (from doc):**

| Method | Mechanism | Optimal domain | Bias/vulnerability |
|---|---|---|---|
| Proportional normalization | divide implied prob by total overround | balanced low-vig markets (e.g., standard −110 spreads) | severely overweights heavy favorites in extreme asymmetric markets |
| Power method | iteratively solve for exponent k with Σ probs = 1 | general two-way spreads/totals | mildly dampens favorite-longshot bias, no theoretical foundation |
| Shin method | solve quadratic for insider parameter z, redistribute by risk | heavy favorites, futures, niche markets susceptible to sharp money | computationally heavier; most accurate reflection of bookmaker liability |

---

## 4. Code/data references

- **Data:** nflverse (open-source play-by-play, the sanctioned commercial data base); NFL Big Data Bowl (non-commercial — offline validation only); public aggregate metrics at point-in-time; odds archives (short-horizon, weeks).
- **Rejected data paths:** token-gated NextGenStats endpoints for commercial scraping; live 10Hz coordinate pipelines.
- **Named algorithms/libraries (no code shipped in doc):** Pool Adjacent Violators Algorithm (PAVA) for isotonic regression; Rauch-Tung-Striebel (RTS) Kalman smoother; cubic B-splines; Ville's inequality (E-process martingale); VERSA-style state-transition validation (referenced by name, not defined in doc).
- **No repositories, no pseudocode, no equations rendered as code** — everything is prose specification. Implementation would be greenfield.
- **Reference trail (tail of doc, unlinked text dump):** Galaxy Sports Edge Research Audit docx, World-Class Sports Probability Engine Corpus Audit docx, GSE_58_independent_research.md, "Institutional Integration of 10Hz NFL Spatial Tracking.pdf", [Beexly/Sports] PR #96 (model-accuracy leaderboard), PR #412 (shadow prediction engine + ops scheduler-liveness diagnostics), "Auditing Conformal Prediction, Small-Sample Calibration, and Sports Market Probabilities for GSE.docx", CQR Research, plus web references on CRPS (towardsdatascience, metricgate, tidyecology, emergentmind, arXiv CRPS decompositions, GitHub scipy CRPS enhancement), devigging (betherosports, clawarbs, arXiv profit–bias identity, teachersbet, wiwi.uni-muenster), tracking/robotics (repositum.tuwien, oro.open.ac.uk, arXiv robotics survey, rt.isy.liu.se), unityhealth.info "Courtsiding Detection: Latency Arbitrage Risk Management", onprediction.xyz. (Recorded as listed; none verified.)

---

## 5. What transfers to GSE's engine and what doesn't

### Transfers (high fit with Garrett's standing directives)

1. **CRPS as the primary metric for spread/total densities** — directly serves the "most calibrated company in the world" goal. GSE currently scores picks as binary outcomes; CRPS on margin densities is the calibration-first evaluation upgrade, with a cheap Gaussian closed form. The 150-settled-spread / 0.01-improvement graduation gate is adoptable as-is for model-version promotion (pairs naturally with PR #96's model-accuracy leaderboard).
2. **The conformal honesty package: no clamped CQR + Jackknife+ with true 1−2α reporting + Venn-Abers [p₀, p₁] with the Δp > 0.20 no-bet rule.** This is a trust product: GSE can publish real coverage numbers and per-pick epistemic intervals with the exchangeability assumption named on the surface — a differentiator no competitor offers. Jackknife+ fits NFL's n≈70 reality better than anything in the current GSE stack.
3. **Shin devigging as the market baseline.** Every GSE edge claim must be measured against a devigged consensus; proportional normalization (likely the current implicit default) systematically overweights favorites — Shin is the academically grounded fix, cheap to implement (one quadratic solve per market).
4. **Physical-plausibility gating at ingestion.** GSE ingests odds feeds; the doc's gate (non-finite timestamps → hard error, triplication/phantom fixtures, pinned 1.0000 consensus) maps directly onto GSE's odds pipelines and the shadow engine (PR #412). The 13 m/s rule itself is tracking-specific, but the *gate philosophy* transfers.
5. **B-spline/RTS steam detection over Hawkes.** If/when GSE builds steam/CLV tooling on short-horizon odds archives, the doc's argument (Hawkes overfits on weeks of data; curvature geometry is parameter-free) is the design decision to copy.
6. **E-process (Ville's inequality) for edge verification** — an anytime-valid sequential test before staking or publishing a model version's edge claims. Fits Garrett's "trust-no-claims" posture and the public posted-pick record.
7. **Robust Kelly over Venn-Abers sets** — worst-case sizing over [p₀, p₁] instead of point-estimate Kelly. Directly compatible with Garrett's Kelly-sizing research lane in the 750-paper program.

### Doesn't transfer / out of scope

- **Latency arbitrage execution (200–400 ms stale-book trading)** — requires live multi-book execution infrastructure, funded accounts, and sub-second automation GSE doesn't operate; also the most legally/ToS-sensitive piece (mirrors the courtsiding-detection reference in the doc's own citations). Strategy value, not build value.
- **Live 10Hz tracking pipeline** — explicitly rejected by the doc itself; nothing to transfer except the *refit-to-nflverse* compliance pattern.
- **ACI online coverage adaptation** — transfers in principle, but GSE's picks settle daily/weekly; the online step-error loop needs per-event resolution plumbing that doesn't exist yet. Park until the calibration layer is live.
- **Full margin-density product (every alternate line priced)** — the right end-state for props/alt-lines, but GSE's current product is SPREAD/MONEYLINE/TOTAL picks; density output is a model-output format change, not a pick-format change. Adopt internally for scoring (CRPS) before exposing it.

---

## 6. Gaps, limitations, conflicts with other GSE research

- **No empirical validation anywhere in the doc.** Zero backtests, zero measured coverage on real data, zero P&L. The 0.01/150 gate, the Δp > 0.20 threshold, and the 200–400 ms window are asserted, not estimated. Garrett's rule: record, don't invent — these are *starting priors*, not findings.
- **Jackknife+ cost is hand-waved.** LOO refits for every prediction on n≈70 with gradient-boosted trees is tractable, but for any deep model it's a heavy compute bill the doc doesn't discuss; "wastes zero data" is true, "free" is not.
- **Conflict risk with GSE's CQR lane:** the doc *bans* clamped split-CQR at small n and pushes Jackknife+ for n<70, while GSE's existing CQR research ("Auditing Conformal Prediction, Small-Sample Calibration, and Sports Market Probabilities for GSE" + the CQR Research doc) may already standardize on split-CQR. These need reconciliation — likely outcome: CQR for large-n props/DFS pools, Jackknife+ for NFL sides/totals. Flag for the Drive-deep read of the conformal audit doc.
- **Shin method's "insider fraction" z is unidentified from two-way odds alone** in the general case — the doc says "solving a complex quadratic" but prints no equation and doesn't discuss identification/regularization of z. Implementation detail missing.
- **VERSA-style state-transition validation is name-dropped, never defined** in the doc — can't be implemented from this text alone.
- **Barber (2020) impossibility is correctly stated** but the doc's "name the assumption on the product surface" is a marketing/UX claim, not a technical resolution — Venn-Abers intervals can still be wide to the point of uselessness, and the doc gives no measured Δp distribution to show the 0.20 gate is workable rather than a permanent no-bet machine.
- **Potential tension with the tracking lane:** the doc's legal posture (BDB = non-commercial only, no commercial NGS scraping) *supports* Garrett's NGS-first directive only if NGS usage stays within the licensed lane — the doc would push NGS material to offline validation, not the live commercial engine. Worth an explicit decision, not an assumption.
- **ESOE metric** ("Expected Separation Over Expected") is invoked as an analogy source for the latency-arbitrage idea but never defined — can't be sourced or checked from this doc.
- **ACI's γ, the E-process confidence boundary, and the robust-Kelly formulation** are all named without equations or values — spec-level only.

---

## 7. Concrete implementation note: what GSE would have to build

Adopted in dependency order (each is a real build, not a config flip):

1. **Ingestion plausibility gate (Rung 1).** A validation layer in front of every odds/data feed in the Sports repo: reject non-finite timestamps (raise, don't coerce), dedupe triplicated fixtures, flag phantom matches, flag pinned 1.0000 consensus slates; log violation rates per provider. Estimated: a new module + provider scorecards; feeds the shadow engine (PR #412).
2. **Density output + CRPS scorer (Rung 2).** Change model output from point spread/total to (μ, σ) Gaussian densities; implement the closed-form Gaussian CRPS; backfill scoring on historical settled spreads; institute the ≥150-settled / 0.01-improvement promotion gate for model versions (ties into PR #96 leaderboard).
3. **Calibration library (Rung 2).** Audit existing CQR code for index clamping and remove it (fail-closed No-Bet instead); implement Jackknife+ LOO intervals for NFL sides/totals with honest 1−2α reporting; implement Venn-Abers dual-PAVA isotonic calibration for moneylines with the Δp > 0.20 no-bet rule and the exchangeability assumption surfaced in output metadata.
4. **Shin devigging module.** Replace proportional normalization wherever implied probabilities feed edge calculations; one quadratic solve per market; log the insider parameter z per market as a sharp-money diagnostic.
5. **E-process edge gate.** Anytime-valid Ville-inequality martingale over the posted-pick record vs. Shin-devigged consensus; model versions and public edge claims graduate only on boundary breach. Then robust Kelly sized over [p₀, p₁].
6. **Later / conditional:** RTS + B-spline steam detector (needs short-horizon odds archive plumbing); ACI online loop (needs per-event resolution plumbing); full alternate-line density product (needs pricing surface).

---

## 8. Inaccessibility log

- **No images, figures, or charts** were present in the converted markdown — none missing, none invented.
- **No equations were rendered as LaTeX/math markup** in the source; all "equations" (CRPS integral, Gaussian CRPS closed form, Shin quadratic, κ(t) curvature, ACI update, E-process martingale, robust Kelly) are described in prose only. Where I restate standard mathematical form (e.g., the Gaussian CRPS closed form), it is my standard-knowledge restatement and is explicitly NOT attributed to the doc.
- **VERSA** (state-transition validation) and **ESOE** (Expected Separation Over Expected) are named but undefined in the doc — cannot be reconstructed from this source.
- **Reference tail** (from "mail.google.com [Beexly/Sports] PR #96" through "onprediction.xyz") is a plain-text dump of titles/domains without URLs — recorded as listed, not verified or followed.
- **Truncation:** none in the body; line 426 is empty and the file ends there.
- **Values I could not verify:** the 19% spatial-corruption figure, the >5% market-violation baseline, the 200–400 ms repricing window, and the "hundreds of thousands" tracking-cost claim are all asserted without citation in the doc — recorded as approximate/asserted, per standing rule.

---

*Note prepared for the drive-deep program (2026-09-21). Next suggested read for reconciliation: "Auditing Conformal Prediction, Small-Sample Calibration, and Sports Market Probabilities for GSE.docx" — the CQR-vs-Jackknife+ conflict in §6 needs that doc's position before any calibration code is written.*
