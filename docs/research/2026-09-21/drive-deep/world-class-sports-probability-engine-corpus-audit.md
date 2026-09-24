# World-Class Sports Probability Engine Corpus Audit — Deep Dive

Source: Google Drive doc "World-Class Sports Probability Engine Corpus Audit"
(converted docx → `/tmp/drive-deep/corpus-audit.md`, 412 markdown lines / ~67k chars;
source docx 3.1MB). Deep read 2026-09-21. Full-text read; no skimming.

---

## 1. Research question and thesis

**Research question:** What architecture would let the Beexly/Sports shadow
prediction engine become the most calibrated, accurate sports prediction and
fantasy sports engine globally, and what does an audit of the existing 1,300-row
arXiv research spreadsheet (58 High-tier dossiers) say about which literature
actually serves that goal?

**Thesis (the audit's central claim):** The most calibrated engine requires an
architecture that (a) explicitly decouples latent performance forecasting from
market pricing dynamics, (b) models team/player strength as a stochastic process
with sport-specific noise and likelihoods — never a single global calibration
head, (c) secures finite-sample validity via conformal methods (CQR for
intervals, Venn-Abers for binary moneylines) with a fail-closed policy under
data scarcity, and (d) evaluates market-beating skill with anytime-valid
sequential E-processes rather than fixed-n p-values. A large share of the
audited corpus is keyword-inflated "feature bloat" or dead domains and must be
excised from the research pipeline.

---

## 2. Methods/models with equations

### 2.1 Engine architecture (Beexly/Sports PR #412 design)

- **Shadow evaluation loop:** `shadow-evaluation-pass.ts` orchestrates advanced
  modules in a persistent shadow-only evaluation loop — no live picks committed.
- **TeamStrengthFilter:** Ensemble Transform Kalman Filter (ETKF) modeling latent
  team strength as a sequential Monte Carlo particle filter. Survives serverless
  cold starts via PostgreSQL persistence (`FilterStateSnapshot`, `ShadowSignal`).
- **VERSA:** state-transition verification gates guarding against silent data
  corruption during ingestion.
- **Liveness:** `scheduler-liveness.ts` diagnostics + `traffic-heartbeat.ts`
  traffic-driven failsafe.
- **Hawkes steam detection:** `hawkes-steam.ts` — per-side exponential-decay
  Hawkes self-exciting process with online intensity updates to detect clustered,
  informed betting pressure ("steam"), separating organic background volatility
  from momentum-driven line movement.
- **Forecast-Skill E-process:** `forecast-skill-eprocess.ts` in the LiveOrchestrator
  — an anytime-valid sequential likelihood-ratio martingale based on Ville's
  inequality, testing H0: model probabilities are no better than market consensus.
- **Sizing gate:** `robust-kelly.ts` — robust Kelly fraction calculator as the
  barrier between theoretical probability and financial deployment.

### 2.2 State-space modeling (the "state-space imperative")

- Latent team/player strength must be a stochastic process with sport-specific
  noise parameter **σ_game** (equation-image recovered; denotes game-level
  randomness) and sport-specific likelihoods mapping to that sport's scoring
  rules. Signal-to-noise ratios are strictly domain-specific: an NBA-calibrated
  model catastrophically miscalibrates on MLB (high-variance) and vice versa.
- Recommended diagnostic baselines before any deep net: independent Poisson
  processes and iWinRNFL tools.
- **Mandatory loss-function shift:** BCE → Brier loss optimization. Empirical
  evaluations on NCAA data prove training directly under Brier loss "drastically
  optimizes baseline point-estimate calibration."
- **Failure mode named:** passing raw box scores into unconstrained ML heads
  (e.g., gradient-boosted trees on a binary classification framing) discards
  domain topology and produces severe empirical miscalibration.

### 2.3 Conformalized Quantile Regression (CQR)

- Un-conformalized quantile regression systematically under-covers in finite
  samples; parameter estimation error is proportional to **d/n** (d = feature
  dimension, n = sample size). Raw neural/boosted quantile outputs are strictly
  *uncalibrated proposal distributions*.
- CQR recipe: train lower/upper quantile regressors with asymmetric pinball
  loss; evaluate residuals on a strictly held-out calibration set as
  non-conformity scores; take the empirical quantile of scores; inflate/deflate
  the bounds to guarantee coverage **1 − α** under exchangeability.
- Non-conformity score (exact, recovered from docx equation image):
  **E_i = max(q̂_{α_lo}(X_i) − Y_i, Y_i − q̂_{α_hi}(X_i))**
- Conformal rank index: **k = ⌈(n + 1)(1 − α)⌉**

**The quantile-clamping result (central numerical argument):**
- For α = 0.10 (90% coverage) with calibration size n = 5:
  k = ⌈6 × 0.9⌉ = 6 > 5. The empirical CDF cannot exceed 1.0, forcing the
  empirical quantile to evaluate to **+∞**.
- The common software heuristic — clamp the index to n = 5 to keep running —
  is "mathematically catastrophic": the delivered true finite-sample coverage
  is **n/(n + 1) ≈ 83.33%**, i.e., a **6.67 percentage-point under-coverage
  defect** while the interval is presented as 90%-confident ("fake tightness").
- **Rule:** elite engines must explicitly ban quantile clamping. When
  **n < ⌈1/α⌉ − 1**, systems must fail closed: emit infinite intervals
  **[−∞, +∞]** or abstain entirely via an automated No-Bet execution block.
- Scarcity alternative: **Jackknife+** (leave-one-out fitted regression functions
  and residuals) gives coverage guarantees of at least **1 − 2α** without a
  dedicated calibration holdout — specified for early-season prop markets where
  splitting is too costly.

### 2.4 Binary probability calibration — Generalized Venn-Abers

- Structural claim: CQR conformalizes continuous numeric lines (game totals,
  player yardage props) with pinball loss; applying continuous residual math to
  binary moneyline outcomes **Y ∈ {0, 1}** is mathematically invalid.
  Distribution-free coverage of the conditional label probability is impossible
  without unverified structural assumptions.
- Mandated solution: **Generalized Venn-Abers calibration** — instead of a
  single probability score, compute exact multiprobability bounds **[p_0, p_1]**
  by fitting dual isotonic regressions to the calibration set.
- Interval width **(p_1 − p_0)** is the rigorous measure of epistemic uncertainty
  from data paucity. The selective gate consumes these bounds directly: if
  **p_1 − p_0 > 0.20** (example safety threshold given), refuse the moneyline pick
  and issue a No-Bet pass.
- Pair with Platt scaling for well-calibrated large-n environments to output
  precise point probabilities alongside narrow calibrated bounds for EV
  calculation against market odds.

### 2.5 Market efficiency, target leakage, sequential E-processes

- **Target-leakage rule:** closing lines / near-game odds as input features to
  team-strength models = severe target leakage; the model parrots bookmaker
  consensus and can never measure true Closing Line Value (CLV).
- Pure performance engine must derive signal only from play-by-play efficiency,
  spatial tracking, and box-score aggregates; market dynamics live in a separate
  subsystem (the Hawkes steam detector).
- **Testing by betting:** the Forecast-Skill E-process — anytime-valid
  sequential likelihood-ratio martingale under Ville's inequality — tests H0:
  model no better than market consensus. Traditional p-values require fixed
  sample sizes and fail under continuous monitoring; the E-process lets the
  engine compound evidence continuously. If the martingale multiplies theoretical
  risked capital by a significant factor, that is mathematically sound proof of
  edge without absorbing-zero failures or p-hacking.

### 2.6 Cross-domain horizons: fluid dynamics + AGI agent swarms

- Player/ball movement on a soccer pitch modeled as smooth, predominantly
  **irrotational velocity vector fields** (Navier-Stokes-inspired); pitch as a
  continuous fluid environment rather than discrete event logs.
- Latent scalar potentials act as team-specific fingerprints; potential gradients
  quantitatively associate with effective ball progression.
- **Stamina factor:** top speed modeled as variable parameter **ξ** adjusting
  the dynamic pressure gradient — quantifies individual physical decline and its
  direct mathematical impact on team pitch control.
- Drag coefficients / drafting modeled explicitly in multi-competitor
  environments to separate individual ability from within-race spatial strategy.
- MARL frameworks proposed to simulate counterfactual game states and
  auto-test game-theory boundaries.

---

## 3. Key numerical results, tables, benchmarks

### 3.1 Exact numerical claims

| Claim | Value | Status |
|---|---|---|
| Un-conformalized QR under-coverage driver | parameter error ∝ d/n | exact form, per audit |
| CQR non-conformity score | E_i = max(q̂_{α_lo}(X_i) − Y_i, Y_i − q̂_{α_hi}(X_i)) | exact, recovered from docx |
| Conformal rank index | k = ⌈(n+1)(1−α)⌉ | exact |
| n=5, α=0.10 → k = 6 > n | empirical quantile forced to +∞ | exact arithmetic |
| Clamp index to n=5 → true coverage | n/(n+1) ≈ 83.33% | exact |
| Clamping under-coverage defect | 90% − 83.33% = 6.67 percentage points | exact |
| Fail-closed trigger | n < ⌈1/α⌉ − 1 | exact rule |
| Fail-closed output | emit [−∞, +∞] or No-Bet | exact |
| Jackknife+ coverage floor | at least 1 − 2α | exact |
| Venn-Abers bounds | [p_0, p_1]; width p_1 − p_0 | exact form |
| Venn-Abers No-Bet threshold | p_1 − p_0 > 0.20 (example threshold) | exact as stated; threshold is a policy choice, not a derived constant |
| Corpus spreadsheet scale | 1,300+ rows, 58 High-tier dossiers | per audit |
| Table 3 ledger (verified in this read) | 278 rows; dispositions SHEET=258, READ=20 | exact count |
| Table 3 GSE-relevant=Y | 155 / 278 | exact count |
| Table 3 sheet_inflated=Y | 123 / 278 | exact count |
| Remaining PDF queue | ~hundreds of arXiv IDs queued for "standard disposition" (list spans 0806.1224 → 2609.13966; count not computed — see gap note) | approximate |

### 3.2 Table 1 — State-space structural components (4 rows)

| Structural Component | Methodology | Operational Impact |
|---|---|---|
| Observation Mapping | Betting-market point spreads and totals-implied margins | Standardizes evaluation across NFL, NBA, NHL, MLB despite different scoring mechanisms |
| Temporal Evolution | AR(1) decay between seasons; random walk within seasons | Captures roster turnover and intra-season momentum/fatigue shifts |
| Variance Heterogeneity | Sport-specific estimation of game-level randomness (σ_game) | NBA shows massive talent dispersion and home advantage; NHL and MLB outcomes "approach coin-flips given equal talent" |
| Generative Likelihoods | Truncated negative binomials (Volleyball); Log-linear Poisson (Rugby/Soccer) | Outputs respect domain constraints (no negative scores, win-by-two rules) |

### 3.3 Table 2 — Fluid dynamics → sports analytics (4 rows)

| Concept | Application | Impact |
|---|---|---|
| Irrotational Vector Fields | Aggregate player trajectories → empirical velocity vectors on mesoscale grid | Captures continuous multi-agent movement fluxes |
| Latent Scalar Potentials | Encode how teams control/constrain play across space in attacking/defensive phases | Physically interpretable off-ball gravity / defensive fragility |
| Stamina Factor & Velocity | Top speed as variable parameter (ξ) adjusting the dynamic pressure gradient | Quantifies physical decline → mathematical impact on pitch control |
| Drag Coefficients & Drafting | Explicit race-level drafting effects in multi-competitor environments | Separates individual ability from within-race spatial strategy for counter-factual analysis |

### 3.4 Table 3 — Corpus ledger (278 rows, summary; full rows preserved in source md)

Columns: `id | sheet_tier | your_cluster | disposition | 12 words on what it actually is | GSE-relevant | sheet_inflated`.

Cluster coverage among the 278: Diagnostics, State-Space, Tracking, Market,
Ranking, Feature Bloat. Tiers: Medium and Low only in this extracted segment
(the High tier was covered in prose sections A–C, not this table segment).

Notable READ-disposition rows (the 20 the auditor says to actually read):
- 2607.06495 — calibrated real-time Monte Carlo engine, natural-language
  race-strategy briefings (Diagnostics/READ, GSE=Y)
- 2602.00676 — large-scale imperfect-information game benchmark, GuanDan card
  games (Diagnostics/READ, GSE=N)
- 2402.07004 — min-max transformation for PIR metric sports performance
  (State-Space/READ, GSE=Y)
- 2101.05388 — evaluating soccer players from live camera feeds via deep RL
  (Tracking/READ, GSE=Y)
- 2012.04380 — combining ML and human expert text to predict football outcomes
  (Diagnostics/READ, GSE=Y)
- 2010.15891 — multi-agent trajectory prediction, fuzzy query attention
  (Tracking/READ, GSE=Y)
- 2010.12508 — **proves profitability by explicitly decorrelating predictions
  from consensus market pricing lines** (Market/READ, GSE=Y) — direct evidence
  for the decoupling thesis
- 2405.19125 — early detection of critical urban events via mobile network data
  (Feature Bloat/READ, GSE=N, inflated=Y)
- 2306.14462 — multi-task item-attribute graph pre-training, cold-start
  e-commerce (Feature Bloat/READ, GSE=N, inflated=Y)
- 1910.08670 — context-driven data mining, bias removal, incompleteness
  mitigation (Diagnostics/READ, GSE=Y)
- 1904.13178 — fine-grained entity recognition (Diagnostics/READ, GSE=Y)
- 2302.00911 — conditional expectation with regularization for missing-data
  imputation in sparse datasets (Diagnostics/READ, GSE=Y)
- 2301.10052 — football event detection via GCN (Tracking/READ, GSE=Y)
- 2410.07401 — soccer camera calibration via keypoint exploitation (Tracking/READ, GSE=N, inflated=Y)
- 2311.04726 — social motion prediction with cognitive hierarchies, multi-person
  team-sports trajectory forecasting (Tracking/READ, GSE=Y)
- 2607.07498 — reward-adaptive iterative discovery, automated game testing /
  exploit finding for NHL26 (Diagnostics/READ, GSE=Y)
- 2603.24023 — two-phase fine-tuning for high-efficiency Text-to-SQL at scale
  in cricket apps (Diagnostics/READ, GSE=Y)
- 2302.06569 — inferring multi-agent player locations from sparse event data,
  LSTM+GNN (Tracking/READ, GSE=Y)
- 2301.08190 — Tsetlin Machine clause-size constraints for interpretability
  (Diagnostics/READ, GSE=Y)
- 2402.10979 — SportsMetrics benchmark, LLMs fusing textual+numerical sports
  data (Diagnostics/READ, GSE=Y)

Inflation call-outs named in prose: 2501.17711 (STGCN-LSTM for Olympic medal
counts — ranked "High", Score 19; Zero-Inflated Compound Poisson head usable for
rare props like shutouts, but STGCN core is premature feature bloat);
1607.00379 (2014 frozen-PyMC3 Six Nations tutorial — conceptual only);
2607.23509 (TDA for ATP tennis while core engines still struggle vs simple MAE
baselines — mis-prioritized). Dead domains to exclude: brain strain criteria /
head impact biomechanics, parallel MRI reconstruction, neutron star equations of
state, automotive CFD.

### 3.5 Remaining PDF queue (section D)

Hundreds of verified arXiv IDs (oldest: astro-ph/0201205, astro-ph/0209505,
0706.1758; newest: 2609.13966, 2608.25246) queued for "standard disposition"
(SHEET) — excluded from the density table "for token constraints." The full
list is preserved in the source markdown; it was not individually analyzed.

---

## 4. Code/data references

- Beexly/Sports PR #412: "feat: shadow prediction engine (persistent,
  shadow-only) + ops scheduler-liveness diagnostics"
  (https://mail.google.com/mail/?extsrc=sync&client=h&plid=ACUX6DPegrLItz9LhtZ7NUcE6AH5LGg7bgqeGCI&mid=19fedaeef89b9a4b)
- Modules named: `shadow-evaluation-pass.ts`, `TeamStrengthFilter` (ETKF),
  `FilterStateSnapshot`, `ShadowSignal` (PostgreSQL), VERSA gates,
  `scheduler-liveness.ts`, `traffic-heartbeat.ts`, `hawkes-steam.ts`,
  `forecast-skill-eprocess.ts` (LiveOrchestrator), `robust-kelly.ts`
- Drive doc: "Auditing Conformal Prediction, Small-Sample Calibration, and
  Sports Market Probabilities for GSE" (companion doc — not this file)
- Drive doc: "Galaxy Sports Edge Research Audit"
  (https://drive.google.com/open?id=1uAWL2CCfV-FNqpkRrRyOiFf1DVuXbGVAjr00UA6drN0)
- Papers: arXiv 1905.03222 (CQR), arXiv 1905.02928 (Jackknife+), arXiv
  2306.07133 (randomness/early termination), papers.cool/arxiv/2608.12291
  (sequential stopping), Oxford Academic "Testing by betting" (JRSSA 184(2):465),
  ResearchGate generative multi-competitor races, arXiv 2607.27838 (vector
  field theory in motion / latent potentials in soccer), ResearchGate pitch
  control × top speed (stamina factor), YouTube Shorts on the 2026 Navier-Stokes
  AGI proof, ResearchGate "From Chess and Atari to StarCraft and Beyond."

---

## 5. What transfers to GSE's engine and what doesn't

### Transfers — high value

1. **Quantile-clamping ban + fail-closed conformal policy (CQR).** GSE publishes
   SPREAD/TOTAL picks; any interval the engine shows must carry honest
   finite-sample coverage. The n=5/α=0.10 worked example (k=6>n → +∞, clamp →
   fake 83.33% presented as 90%) is a concrete defect class to grep the
   codebase for today. Directly applicable to props/totals calibration,
   especially early-season scarcity regimes where Jackknife+ (≥1−2α) substitutes
   for split conformal.
2. **Venn-Abers multiprobability bounds for moneylines.** GSE's SPREAD/MONEYLINE
   picks are binary outcomes; the audit's argument that CQR math is invalid for
   Y∈{0,1} and that Venn-Abers [p_0, p_1] with a No-Bet gate on p_1−p_0 > 0.20
   captures epistemic uncertainty is the cleanest stated calibration discipline
   for the binary side. Gives GSE a principled "refuse the pick" mechanism.
3. **Decoupling pure performance from market pricing (target-leakage ban) +
   Hawkes steam + Forecast-Skill E-process.** This matches the engine's existing
   architecture (shadow pipeline, hawkes-steam.ts, e-process module) and
   supplies the mathematical justification: never feed closing lines into
   strength models, detect informed pressure separately, and prove edge with an
   anytime-valid martingale instead of p-values — directly supports GSE's CLV
   tracking and public record-keeping.

### Transfers — medium value

4. **Per-sport state-space parameterizations with σ_game; BCE→Brier loss.**
   Aligns with GSE's existing per-sport modeling; the NCAA-data claim for Brier
   loss is a cheap experiment to run against GSE's own training.
5. **Robust Kelly gating** between probability and deployment — already exists
   as robust-kelly.ts; the audit endorses it as the correct barrier.
6. **Table 3 READ-disposition shortlist** (esp. 2010.12508 on decorrelating from
   consensus pricing; 2302.06569 on inferring player locations from sparse event
   data — relevant to NFL Next Gen Stats work without full tracking feeds).

### Does not transfer

- **AGI agent-swarm / Navier-Stokes proof narrative** (10,000 agents,
  130 billion tokens, "$15 OpenAI solution to the $1M Navier-Stokes problem").
  Unverifiable from this document; no implementation path given; classified as
  vision/horizon material, not engineering.
- **Fluid-dynamics-as-engine** for GSE's current NFL-first scope: soccer-pitch
  vector fields are interesting for NFL tracking work eventually, but the audit
  itself warns against premature complexity (the 2607.23509 TDA critique cuts
  both ways — GSE's tracking layer is nascent).
- **123 of 278 ledger rows flagged sheet_inflated=Y** plus named dead domains
  (MRI, neutron stars, automotive CFD) — explicitly excluded by the audit.
- The full 26x/25x arXiv-ID queue: disposition SHEET with no per-paper analysis;
  usable as a reading list only, not as findings.

---

## 6. Gaps, limitations, conflicts with other GSE research

- **Unverifiable flagship claims.** The 2026 "OpenAI solved Navier-Stokes with
  $15 / 10,000-agent swarm / 130B tokens" narrative is sourced to a YouTube
  Shorts link, not a paper. Treat as anecdote, not evidence. (This also
  conflicts with the standing GSE rule: no claim published or built on without
  lab execution — nothing here is executable.)
- **No empirical results of GSE's own.** The audit describes an architecture and
  cites literature; it contains no backtest numbers, no CLV measurements, no
  calibration plots from the actual Sports repo pipeline. The equations are
  literature-standard (CQR, Jackknife+, Venn-Abers), not novel findings.
- **Missing equations in the text layer.** All math lived in equation images;
  the markdown conversion dropped them (recovered here by rendering the PNGs —
  see section 8). Anyone reading only the .md misses the actual formulas.
- **Threshold arbitrariness.** The p_1 − p_0 > 0.20 Venn-Abers No-Bet threshold
  is an example policy value, not derived. The audit does not calibrate it.
- **Jackknife+ cost.** 1−2α guarantee (≥80% for α=0.10) is notably weaker than
  split-conformal's 1−α; the audit prescribes it for scarcity but doesn't
  quantify the interval-width cost of LOO refits at GSE's scale.
- **Potential conflict — global vs per-sport:** fully consistent with GSE's
  per-sport direction; no conflict.
- **Potential conflict — "ban ML heads":** the audit's polemic against
  gradient-boosted trees on raw box scores could be read as anti-ML; the actual
  claim is narrower (unconstrained binary-classification heads discard domain
  topology). GSE's tree/NN components remain valid as quantile-regressor
  *proposal* distributions inside conformal wrappers — the audit explicitly
  endorses that usage.
- **Corpus-audit overlap:** this doc audits the same 1,300-row spreadsheet and
  sibling Drive docs ("Research Audit", "Auditing Conformal Prediction…").
  Findings here should be cross-checked against those two deep dives before
  being treated as independent evidence.

---

## 7. Concrete implementation note: what GSE would have to build to apply it

1. **Clamp audit (days):** grep the Sports repo calibration code for any
   `min(index, n)` / rank-clamping in conformal interval construction; replace
   with the fail-closed rule: if n < ⌈1/α⌉ − 1 → return [−∞,+∞] interval or emit
   a machine-readable No-Bet signal that the LiveOrchestrator honors.
2. **CQR wrapper on existing quantile outputs (1–2 weeks):** keep current
   quantile regressors as proposal distributions; add a held-out calibration
   set per sport/market, compute E_i = max(q̂_lo − Y, Y − q̂_hi), take empirical
   1−α quantile, inflate/deflate bounds. Per-market α targets (e.g., 0.10).
3. **Venn-Abers module for moneylines (2–4 weeks):** dual isotonic regressions
   on calibration set → [p_0, p_1] per moneyline pick; wire p_1 − p_0 into the
   selective gate with a tunable threshold (start 0.20, calibrate on shadow
   data); below-threshold width + Platt-scaled point estimate feed EV vs market.
4. **Jackknife+ path for scarce regimes (2–3 weeks):** LOO refit loop for
   early-season props / new markets where a calibration split is unaffordable;
   accept ≥1−2α guarantee; monitor interval widths in shadow.
5. **E-process edge accounting (1–2 weeks):** implement/verify the sequential
   likelihood-ratio martingale in forecast-skill-eprocess.ts against market
   consensus probabilities; log the running capital multiplier as the
   always-on "do we have edge" statistic; define the significance threshold in
   the selective gate (audit leaves the multiplier threshold unspecified —
   GSE must set it).
6. **Loss-function experiment (days):** retrain one sport's head under Brier
   loss vs BCE; compare calibration (ECE/Brier decomposition) on the shadow
   evaluation set.
7. **Do NOT build:** the fluid-dynamics/MARL layer, the AGI swarm — no
   executable spec exists.

---

## 8. Inaccessibility log

- **Equation images (22 PNGs, `word/media/image1.png` … `image22.png`) were
  dropped by the python-docx → markdown conversion** and appeared as empty `()`
  placeholders in corpus-audit.md. All 22 were recovered for this note by
  rendering the PNGs (black glyphs on transparent background; required
  alpha-compositing onto white before they were legible). Recovered formulas:
  σ_game; d/n; d; n; E_i = max(q̂_{α_lo}(X_i) − Y_i, Y_i − q̂_{α_hi}(X_i));
  1−α; n=5; n=500; α=0.10; k=⌈(n+1)(1−α)⌉; +∞; [p_0,p_1]; Y∈{0,1}; p_1−p_0;
  p_1−p_0>0.20; p; ξ; [−∞,+∞]; 1−2α; n/(n+1)≈83.33%; n<⌈1/α⌉−1. All are
  transcribed in section 2/3 above.
- **No charts, figures, or data plots** are embedded in the docx (0 chart rels,
  26 drawings all equation/typographic images). There is nothing visual beyond
  the math glyphs — the "3.1MB" is bulk from 22 PNGs plus document XML, not
  hidden figures.
- **Table 3 continuation:** the ledger jumps from the Medium tier to Low tier
  with a "D) REMAINING PDF Queue" section; sections labeled A) "Analyzed Corpus
  Ledger (Continued)" reference prose tiers (High) not present in the extracted
  text — the High-tier analysis exists only as narrative, not as table rows in
  this file.
- **Queue count:** the remaining-PDF ID list was not counted to the exact
  integer (stated as approximate; full list preserved verbatim in source md).
- **External sources** (Gmail PR link, Drive links, YouTube Shorts, ResearchGate
  pages, arXiv PDFs) were not fetched; claims resting on them (notably the
  2026 Navier-Stokes AGI anecdote) are unverified.
- **Superscript citation numbers** (1–12) map to the Works Cited list at the end
  of the source md; mapping is preserved there, not duplicated here.
