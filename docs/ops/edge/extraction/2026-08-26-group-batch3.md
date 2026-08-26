# Extraction — founder paper batch 3 (deep pass, full text) · 2026-08-26

Deep-pass correction layer over `ORBIT_NEXT_50.md` rows 62–94 for seven founder-selected
ids. Every paper below was read in FULL TEXT this session (ar5iv HTML for
2601.11528, 2601.00216, 1906.05029, 1312.4699, 2410.00145; arXiv PDF for 2608.18430,
2406.03663 — ar5iv serves only abstract stubs for those two). Nothing here is from an
abs page alone. Verdict vocabulary matches the ORBIT lens: **pattern | dependency |
skill-doc | ignore**. Companion context: `docs/ops/2026-08-26-EDGE-PATH.md` (E1–E3
program), the wave-5 classification in ORBIT rows 62–94.

Batch verdict in one line: **one strong port (1906.05029), one scoped port
(2608.18430), one filed micro-method (2601.00216 BETR), four confirmed non-fits —
with the two founder-flagged "check again" older ids resolving in opposite
directions (1906.05029 up, 1312.4699 conclusively out).**

---

## 1. arXiv:1906.05029 — A Bayesian Approach to In-Game Win Probability in Soccer
Robberechts, Van Haaren, Davis (KU Leuven) · KDD '21. ORBIT row 93.

### (a) Full-text content, method level

- **Core decomposition (§3.1).** Do not classify W/D/L directly. Model the *future
  goals* each team scores after time t as independent Poissons:
  `y_{>t,side} ~ Pois((T−t)·θ_{t,side})`, then convolve with the current score to get
  win/tie/loss. Rationale given: goal-difference distribution carries natural
  uncertainty, and modeling *future* goals (not final score) absorbs post-goal
  momentum shifts.
- **Time-varying coefficients as a temporal stochastic process (§3.1).**
  `θ_t = invlogit(α_t·x_t + β + Ha·1[home])` with a Gaussian random walk on the
  coefficient vector: `α_0 ~ N(0,2)`, `α_t ~ N(α_{t−1},2)`. This shares statistical
  strength across adjacent time frames (vs. the mLR baseline that refits each frame
  independently), which is what lets rare states (red card in minute 1) get sane
  estimates.
- **Stoppage-time normalization (§3.2).** Game time mapped to `T=100` percentage
  frames with halftime pinned at frame 50 — the fix for soccer's variable duration.
  Real-time deployment adds an RF stoppage-time estimator (App. A.1, MAE 46.2s/59.4s
  for H1/H2).
- **Features (§3.2)** per team: game time, score differential; Elo rating diff
  (pre-game strength); goals so far, red-card diff, opponent yellows, goal-scoring
  opportunities, attacking passes (rolling 10 frames), xT (rolling 12), duel strength.
- **Fitting (§3.3, App. A).** ADVI variational inference (PyMC3), minibatch 500
  games, 200k iterations; 2,000 posterior predictive samples at eval; ~76 min train
  on a Xeon. MCMC explicitly rejected for scale.
- **Evaluation (§3.4, §4.2).** Multi-class ECE (their Eq. 2, M=5 bins) and Ranked
  Probability Score (Eq. 3, ordinal-aware). Headline: Table 1 — overall ECE 0.011,
  and **0.002 in the final 10% of the game**, vs LR 0.174 / mLR 0.170 / RF 0.101 in
  that window. The baselines specifically fail on late-game tie probabilities.
- **The load-bearing deployment result (§4.4):** dropping the four event-stream
  features (attacking passes, xT, opportunities, duel strength) costs only
  RPS 0.134 → 0.138. A score/cards/Elo/time model is nearly as good.
- **Use cases (§5):** win-probability "story stat"; AGVp90 clutch-goal metric
  (`Σ 3·ΔP(win)+ΔP(tie)` per 90, pre-game strength removed).
- Data provenance note: their training data was scraped from whoscored.com and
  clubelo.com — reproducing *their pipeline* is not clearance-safe for GSE
  (whoscored would sit at `permission_required`/`blocked_technical_controls`);
  the method itself needs neither source.

### (b) THE APPLICATION — implementable (strongest of the batch)

Three concrete lanes, ordered by nearness:

1. **Phase-bucketed calibration audit (portable this week, no new data).** Their
   Table 1 evaluates ECE *by game phase* (H1 / H2 / final 10%) and the failure mode
   it exposes (models calibrated overall, badly miscalibrated late) is exactly the
   kind of aggregation-masking GSE's fit report could hide today. Port: add a
   time-to-event / phase bucketing dimension to
   `packages/prediction-engine/src/calibration-monitor.ts` +
   `calibration-map.ts` reporting (and the fit-report runbook). Gate: none needed —
   it is an audit surface, not a firing surface; but C-series flips should start
   requiring the phase-split view, not just overall ECE.
2. **In-game soccer W/D/L module (new `ingame-soccer.ts` beside `dixon-coles.ts`).**
   The t=0 boundary case of their model *is* the pregame Poisson/Elo path GSE
   already has (`dixon-coles.ts`, `poisson.ts`, `skellam.ts`, `elo-estimator.ts`,
   `elo-from-results.ts`) — so this is an extension, not a rewrite. Port the three
   mechanisms that need no event-stream rights: (i) T=100 percent-time
   normalization with halftime pin; (ii) random-walk time-varying coefficients over
   frames (a simple Kalman/state-space or discretized-frame logistic with an
   α_t ~ N(α_{t−1}, σ²) smoothness penalty — ADVI/PyMC3 not required in TS; the
   penalized-likelihood equivalent is enough); (iii) the *simplified* feature set
   the paper itself validates (score diff, time, cards, Elo diff) — all obtainable
   from `packages/data-ingestion/src/espn-results-client.ts` /
   `espn-schedule-seed.ts` grains GSE already ingests. Data: 8 seasons × top-5
   leagues gave them 12,758 training games; GSE should expect to need multiple
   seasons of settled soccer finals+cards, which the ESPN results path can
   accumulate — start the archive now, fit later.
   Gate: edge-lab law — as-of store, walk-forward, placebo; ECE ≤ 0.05 floor *per
   phase bucket* (their model hits 0.011/0.002 — the bar is achievable);
   `priced:false` until trials-registry admission.
3. **Deferred (gated): in-play value surface.** Per-frame calibrated W/D/L is a
   within-match fair-value curve → e = p − q against live prices, CLV-style scoring
   vs the close of each in-play window. Blocked on an in-play odds source GSE does
   not ingest today; any such source goes through the clearance engine first. Do
   not build ahead of the data. (The AGV clutch metric is a content/Trend-Lab
   nice-to-have from the same posterior — data-backed, no new rights.)

### (c) Corrected lens vs ORBIT row 93

Row said **pattern (high)** — CONFIRMED, and sharpened: this is the batch's only
paper whose method lands on *existing in-repo modules* with data GSE already
holds. Correction to the row text: "enables live-line value/CLV comparisons" is the
*gated third* lane, not the entry point; the immediately implementable parts are
phase-bucketed ECE, time normalization, and the TVC random-walk on the simplified
feature set (licensed by the paper's own §4.4 ablation). Priority: **high**.

---

## 2. arXiv:2608.18430 — Multi-Level Bayesian Calibration of a Multi-Component Dynamic System Model
Kapusuzoglu, Mahadevan (Vanderbilt) + Mitsubishi Heavy Industries · JCISE 23(1) 2023. ORBIT row 91.

### (a) Full-text content, method level (from PDF; ar5iv is abstract-only)

- **Setup.** Kennedy–O'Hagan calibration frame (§2.2):
  `Y_obs = Y_m + δ(X) + ε_obs`, ε_obs ~ N(0, σ²_obs), discrepancy δ with its own
  parameters θ; calibration quantities Θ = [ψ, θ, σ_obs] (their Eqs. 3–6).
- **The contribution (§3.1, Eqs. 7–8).** Multi-component system with **local**
  parameters ψ_local (unique per component) and **global** ψ_global (shared), and
  *asynchronous heterogeneous* data (different quantities, different components,
  different times). Hierarchical-BN factorization: with independent level data,
  `Π(ψ⁽¹⁾,ψ⁽²⁾|D₁,D₂) ∝ [L(D₁|ψ⁽¹⁾)Π(ψ⁽¹⁾)] · L(D₂|ψ⁽¹⁾,ψ⁽²⁾)Π(ψ⁽²⁾)` — i.e.
  **lower-level posterior becomes higher-level prior** (two-step chaining).
- **Algorithm 1 (§3.2), the EM-like alternation:** (a) fix ψ_global at prior,
  calibrate ψ_local per component; (b) fix ψ_local at posterior, update ψ_global;
  repeat to convergence (threshold on ψ_global posterior moments); then
  re-calibrate with the single-component data. **Offline** = all time steps at
  once; **online** = same loop run per arrival, posteriors propagated forward as
  priors (particle filter, not MCMC, for tractability).
- **Machinery not portable:** Extra-Trees surrogate over an rSVD 20-feature
  reduction of a 1.46M-dim FEM output; gas-turbine blade data (100 blades' tip
  elongation, one blade's 3D deformation, 3 blades' destructive CEEQ — Table 1).
- **The honest finding to keep (§4.3, Figs. 13/16 + Conclusion):** offline
  posteriors are *significantly sharper*; online + model-discrepancy parameters +
  sparse data can leave uncertainty under-quantified. Online buys recency, pays in
  width — and can silently pay in honesty.

### (b) THE APPLICATION — implementable, scoped

GSE's calibration problem has exactly this shape: **components = sport × market
calibration cells with asynchronous, wildly unequal settled counts** (MONEYLINE 483
settled and honest; SPREAD/TOTAL ~990 and miscalibrated; per-sport slices thinner
still — many cells will never individually reach the ~250-settled refit threshold).

Port the *structure*, not the machinery:

- **Hierarchical (partial-pooling) calibration layer.** Local ψ = per-cell beta
  calibration params (or PAVA-then-beta smoothing params); global ψ = cross-cell
  prior (shrinkage center + strength). Fit by the Algorithm-1 alternation: fix
  global, fit cells; fix cells, update global; iterate. Thin cells shrink toward
  the pooled map instead of (a) being unusable or (b) overfitting 40 samples.
  Target: `packages/prediction-engine/src/calibration-map.ts` +
  `calibration/aggregation.ts` (new `hierarchical-calibration.ts` if the layer is
  kept separate). Data: settled picks by sport×market via the proven Neon
  SQL-over-HTTP read path.
- **Posterior→prior chaining for the streaming path.** GSE already has
  `online-beta-recalibration.ts` / `online-beta-sliding-window.ts`; Eq. 7's
  chaining is the principled recipe for carrying the last full-fit posterior as
  the online prior between the ~250-settled offline refits — rather than a window
  restart.
- **Ported honesty rule (their offline-vs-online finding):** the offline
  apply-matrix refit stays the gold standard; online updates are advisory between
  refits and never flip C-series gates on their own. Gate: held-out per-cell ECE
  must not degrade vs the pooled fit (paired comparison), and any surface change
  ships only via the existing C6 rule (`calibratedEce ≤ rawEce` re-confirmed).

### (c) Corrected lens vs ORBIT row 91

Row said **pattern (medium)** — CONFIRMED with a re-weighting: the row led with
"streaming recalibration," which is the *weaker* half (and the paper itself shows
its uncertainty risk); the stronger half is the **local/global split + partial
pooling for thin markets + posterior→prior chaining**. Honesty caveat for the
record: hierarchical shrinkage per se is textbook Bayes — what this paper
contributes is the asynchronous-data sequencing recipe and the measured
offline>online sharpness result. Cite as recipe, not novelty. Priority: **medium**.

---

## 3. arXiv:2601.11528 — Knowledge Graph Construction for Stock Markets with LLM-Based Explainable Reasoning
Lee et al. (Hana Institute of Technology et al.) · CIKM '25 short. ORBIT row 90.

### (a) Full-text content, method level

Four-page applied paper. Neo4j KG over 2,879 Korean listed companies, 2023–2025:
node types Company/Sector/Indicator/StockPrice/FinancialStatements/Date/Quarter/Year,
relations incl. COMPETES_WITH, BELONGS_TO, HAS_INDICATOR (their Tables 1–2); data
from KIS, OpenDART, KRX APIs, competitor edges from crawled broker reports. LLM
layer (§3.4) is a three-step GPT-4.1 pipeline: schema-in-system-prompt NL→Cypher,
execute, generate answer grounded in query results. Validation is **two narrative
case studies only** (Samsung vs SK Hynix financials; semiconductor-sector PER/PBR/EPS
screen) — no benchmark, no baselines, no accuracy metrics, no error analysis
anywhere in the full text. Case study 2 has the LLM label stocks "undervalued /
high growth potential" from raw ratio thresholds, unvalidated.

### (b) NONE AFTER FULL READ

Specific reason: the paper's only reusable element — schema-prompted
NL→graph-query→grounded-answer — is generic Text-to-Cypher, and for GSE it is
**strictly dominated by the already-classified SPORTSQL row** (arXiv:2508.17157,
ORBIT row 85, pattern-medium), which does the same NL-over-live-sports-data job
*with* a snapshot-annotated benchmark and freshness handling. A bespoke sports KG
would be speculative scope (factor trails are already structured), and the paper
offers no evaluation evidence to import. Secondary use as a **negative exhibit**:
case study 2 is precisely the unvalidated-LLM-investment-claim anti-pattern GSE's
no-fabricated-stats rule and `check-claims` exist to block.

### (c) Corrected lens vs ORBIT row 90

Row said **ignore** — CONFIRMED, now from full text and *stronger*: the triage
assumed "case-study KG+LLM with no portable method"; the full text confirms there
is additionally **zero quantitative evaluation**. No change in verdict.

---

## 4. arXiv:2601.00216 — From Evidence-Based Medicine to Knowledge Graph: RAG for Sports Rehabilitation (SR-RAG)
Zhang et al. (Beijing Sport University). ORBIT row 92.

### (a) Full-text content, method level

- Domain is **clinical rehabilitation medicine** (21 conditions, ACSM guidelines,
  congenital-heart-disease rehab, etc.) — "sports" is adjacency, not sports
  analytics. Corpus manually graded A–E (A guidelines, B systematic reviews/MA,
  C RCTs, D cohort, E other).
- Pipeline (§2.3): Youtu-GraphRAG with the extraction schema replaced by PICO
  entity types; KG of 357,844 nodes / 371,226 edges; PICO-guided HyDE with
  explicit no-fabrication soft constraints (reuse extractable P/I/C/O/T anchors,
  never invent missing fields); three-channel RRF fusion (their Eq. 1);
  ColBERT → cross-encoder cascade; dual-track recall (grade-A corpus recalled
  separately from B–E so guidelines aren't diluted); soft quota at final selection.
- **BETR — the transferable algorithm (§4.2, Alg. 1, Eqs. 3–8).** A 5-parameter
  learned re-ranking calibrator: Bradley–Terry pairwise preference
  `P(d⁺ ≻ d⁻) = σ(a·Δs + u_{t⁺} − u_{t⁻})` where s is the reranker logit and u_t
  are **ordered evidence-tier biases** parameterized monotonically
  (u_A = 0, u_B = −δ_B, u_C = −(δ_B+δ_C), … with δ ≥ 0, Eq. 4), truncated-Gaussian
  shrinkage priors centered at zero (Eq. 5 — default = "semantics only"), MAP fit
  (Eq. 8). Learned result (Table 1): near-constant ≈0.129 penalty per grade,
  scale a ≈ 1.03 — i.e. tier bias only breaks ties among semantically comparable
  candidates, by construction and by fit. Online score: `r = â·s + û_grade`.
- Eval: released 1,637-QA benchmark; nugget coverage 0.830, faithfulness 0.819,
  semantic sim 0.882, PICOT match 0.788 (Table 2, DeepSeek-V3); ablations show the
  PICO schema drives PICOT match (0.788→0.701 without) while *raising* naive
  semantic similarity — their own demonstration that cosine similarity can't see
  population mismatch. Five-clinician Likert 4.66–4.84.

### (b) Application status: no implementable target today; one micro-method filed

The KG, PICO framing, and benchmark have no GSE use (clinical medicine). The
honest extract is **BETR as a filed recipe**: a domain-agnostic, tiny (5-param)
calibrator for any ranking surface that combines a relevance score with an
**ordered trust hierarchy**, learning the tier offsets from pairwise outcome data
with shrinkage toward "ignore tiers" — no hand-set weights, monotonicity
guaranteed. GSE has **no document-retrieval surface today** (content generation is
grounded in structured in-repo data), so there is no target module now. If/when a
tiered-trust document ingestion lane ships (e.g., injury-news with source tiers
official report ≻ beat reporter ≻ aggregator — itself clearance-gated), BETR is
the designated ranking calibrator; the pairwise-MAP-with-monotone-tiers idea could
also inform future source-reliability weighting in consensus code, learned from
settled outcomes. Explicit non-application: BETR must NOT be used to soft-weight
quarantined confidence tiers into firing surfaces — binding invariant #2 (never
fire on raw κ) is a hard gate, not a rank bias.

### (c) Corrected lens vs ORBIT row 92

Row said **skill-doc (low)** — verdict CONFIRMED at skill-doc, note corrected: the
triage's "evidence-tier-aware reranking is a loose reference" undersold that BETR
(§4.2) is a self-contained, directly reusable algorithm with its equations and
learned-parameter behavior fully specified. Priority stays **low** solely because
no GSE retrieval surface exists to host it; this doc §4(a) is now the reference.

---

## 5. arXiv:1312.4699 — πBUSS: parallel BEAST/BEAGLE utility for sequence simulation
Bielejec et al. (KU Leuven / Edinburgh / UCLA) · 2013. ORBIT row 94. Founder-flagged "check for missed significance."

### (a) Full-text content, method level

Software paper for the BEAST phylogenetics ecosystem: Monte-Carlo simulation of
nucleotide/amino-acid/codon sequences along phylogenies (HKY/TN93/GTR/GY94 + AA
models, partitions, strict/relaxed clocks, coalescent tree simulation, epoch
models with time-varying CTMC matrices), GUI/CLI/XML, BEAGLE-parallelized.
Validation section: (i) analytic site-pattern probabilities vs long-run simulated
frequencies (χ², p=0.42); (ii) simulate-then-reestimate on synthetic replicates,
checking posterior means, **nominal coverage, bias, MSE** of the estimator.
Example application: shows tMRCA estimation saturates/levels off beyond ~1,000
years under time-increasing purifying selection — i.e., uses simulation with known
ground truth to expose an inference instrument's blind spot.

### (b) NONE AFTER FULL READ

The founder hypothesis (missed foundational stats/sports paper) is **disconfirmed
from full text**: it is genuinely domain-specific phylogenetics tooling — no
betting-market, ranking, or calibration content. The only transferable idea —
*validate an inference instrument on synthetic data with known ground truth: null
case, planted effect, coverage/power* — is exactly what GSE's MVE independent
audit already mandates verbatim as re-run conditions (null + planted-edge tests,
power curve published), so there is nothing left to port from this paper
specifically. Provenance hypothesis for how it entered the corpus: KU Leuven
author-affiliation overlap with 1906.05029 (both corpus items) — a harvesting
collision, not a founder signal.

### (c) Corrected lens vs ORBIT row 94

Row said **ignore — no fit** — CONFIRMED, now with the specific reason recorded
(above) rather than a bare "no fit," and the founder's "maybe foundational" flag
explicitly resolved negative.

---

## 6. arXiv:2410.00145 — Constraint-Aware Refinement for Safety Verification of Neural Feedback Loops (CARV)
Rober & How (MIT ACL). ORBIT row 70. Founder-flagged: "does reachability verification map onto verifying bounds on model/agent behavior?"

### (a) Full-text content, method level

- Object verified: NFL = **neural feedback loop**, `x_{t+1} = f_cl(x_t; π)` with a
  trained NN policy π (ReLU MLPs) inside known dynamics (§II-A). Safety = state
  stays in constraint set C over horizon t_f.
- Bounds: CROWN/AutoLiRPA linear relaxations of the closed-loop computational
  graph (Thm II.1) give reachable-set over-approximations (RSOAs). **Concrete**
  one-step RSOAs (Eq. 4) are cheap but compound conservativeness (wrapping
  effect); **symbolic** t-step RSOAs (Eq. 5) avoid wrapping but cost explodes in
  horizon.
- **CARV's idea (§III, Algs. 1–3):** over-conservativeness is *only a problem
  where it collides with the constraint*. So: compute cheap concrete RSOAs by
  default; when one intersects the unsafe set, lazily re-derive just that set
  symbolically, anchored at earlier symbolic sets, bounded by max horizon k_max,
  recursing (`refine_sequence`) back to X₀ in k_max-sized symbolic steps if needed.
- Results (§IV, Table I): verifies a 52-step nonlinear unicycle+NN problem in
  9.32 s where partitioning needs 540 s + 32 GB and pure symbolic OOMs; verifies
  strictly harder obstacle inflations than either baseline (Fig. 6); insensitive
  to k_max above a threshold (Fig. 5).

### (b) NONE AFTER FULL READ — founder's mapping question answered directly

The proposed mapping (reachability → verifying bounds on GSE model/agent
behavior) **fails at the method level for two structural reasons**:

1. The machinery requires the verified object to be a *bound-propagatable
   computational graph in closed loop with known dynamics*. GSE's agents are
   LLM+tools — categorically outside CROWN-style relaxation — and GSE's numeric
   models (isotonic maps, logistic, Poisson/Dixon-Coles) are simple enough that
   exact bounds/monotonicity are checkable directly; RSOA relaxation solves a
   tractability problem GSE does not have.
2. GSE's safety layer is invariant gates on individual decisions (clearance,
   fire-authority, eligibility), not trajectories through a state space with an
   unsafe region; there is no multi-step closed loop whose wrapping effect needs
   taming.

What survives is **one design principle, not a port** (recorded here so the ignore
is evidenced, per the founder's instruction): *constraint-aware lazy refinement* —
run cheap conservative checks everywhere, and spend the expensive tight instrument
only where a cheap bound actually crosses the decision constraint, re-anchoring on
previously-paid-for tight results. GSE already has the shape (always-on
conformal/e-process bounds = concrete; MVE-grade powered instruments =
symbolic-on-demand); the CARV lesson for edge-lab/eval-harness scheduling is to
make that triggering explicit (tight re-audit fires when the cheap bound conflicts
with a gate, not on a calendar). One sentence of process capital; no module.

### (c) Corrected lens vs ORBIT row 70

Row said **ignore — keyword collision** — verdict CONFIRMED, basis upgraded: the
triage dismissed it as an 'NFL' collision without reading; the deep pass read the
method and answers the founder's specific reachability question with the two
reasons above plus the salvaged scheduling principle. Verdict unchanged: ignore
(with §6(b) as the recorded rationale).

---

## 7. arXiv:2406.03663 — Hybrid Deep Learning Classification of Perimetric Glaucoma Using Peripapillary Nerve Fiber Layer Reflectance and Other OCT Parameters
Tan, Choi et al. (OHSU Casey Eye Institute et al.). ORBIT row 71.

### (a) Full-text content, method level (from PDF; ar5iv is abstract-only)

Prospective ophthalmology study (AIG study baseline data): 106 normal subjects /
164 perimetric-glaucoma patients, spectral-domain OCT. "NFL" = **nerve fiber
layer** throughout. Method: NFL reflectance normalized by the
photoreceptor/pigment-epithelium band, azimuthal spatial-frequency filtering to
remove incident-angle bias, 2.1–4.2 mm annulus, dimension reduction to a 32×3
superpixel grid along fiber trajectories (§2.3, Fig. 1); hybrid model = 2-channel
CNN (thickness + reflectance superpixel maps, circular padding) + FCN
(disc/macula OCT parameters, age, gender, axial length) (§2.4, Fig. 2). Results
(Table 2): test AROC 0.979 vs 0.923–0.931 for logistic-regression baselines
(p<0.001); sensitivity 0.909 at 99% specificity; reflectance adds only marginal
gain over thickness within the DL model on this dataset (§4 attributes this to
scan density/eye-motion limits of the 27 kHz device).

### (b) NONE AFTER FULL READ

Specific reason: pure clinical diagnostics; the full text confirms the 'NFL'
keyword collision end to end. The residual generalities (multimodal
tabular+spatial fusion; reporting sensitivity at a fixed high-specificity
operating point) are generic ML practice with no sports-, market-, or
calibration-specific content worth citing over standard references.

### (c) Corrected lens vs ORBIT row 71

Row said **ignore — nerve fiber layer collision** — CONFIRMED from full text. No
change.

---

## Batch summary

| arXiv | Paper (short) | ORBIT row → verdict | Deep-pass verdict | Change |
|---|---|---|---|---|
| 1906.05029 | Bayesian in-game soccer win prob (KDD'21) | 93 → pattern (high) | **pattern (high)** — 3 lanes: phase-bucketed ECE now; `ingame-soccer.ts` on simplified features; in-play value gated on cleared source | Confirmed; entry point corrected (audit + simplified model first, live CLV last) |
| 2608.18430 | Multi-level Bayesian calibration (JCISE'23) | 91 → pattern (medium) | **pattern (medium)** — local/global partial pooling for thin sport×market calibration cells + posterior→prior chaining; offline stays gold standard | Confirmed; re-scoped (pooling ≻ streaming; textbook-Bayes caveat recorded) |
| 2601.00216 | SR-RAG / EBM GraphRAG (rehab medicine) | 92 → skill-doc (low) | **skill-doc (low)** — BETR (§4.2) filed as the learned monotone tier-bias reranker recipe; no GSE retrieval surface to host it today | Confirmed; note upgraded (BETR fully specified here) |
| 2601.11528 | Stock-market KG + LLM (CIKM'25) | 90 → ignore | **ignore — NONE AFTER FULL READ** (no evaluation at all; NL-to-query subsumed by SPORTSQL row 85; case study 2 is our anti-pattern) | Confirmed, stronger |
| 2410.00145 | CARV neural-feedback-loop verification | 70 → ignore (keyword) | **ignore — NONE AFTER FULL READ**; founder's reachability→agent-bounds mapping fails for 2 structural reasons; lazy constraint-triggered refinement kept as a scheduling principle | Confirmed; basis upgraded from keyword-triage to method-level |
| 1312.4699 | πBUSS phylogenetic sequence simulation | 94 → ignore | **ignore — NONE AFTER FULL READ**; "foundational classic" hypothesis disconfirmed; sim-based instrument validation already mandated by MVE audit; likely KU-Leuven harvesting collision | Confirmed; founder flag resolved negative |
| 2406.03663 | OCT glaucoma hybrid DL | 71 → ignore (keyword) | **ignore — NONE AFTER FULL READ** (nerve-fiber-layer collision confirmed end to end) | Confirmed |

Fetch record: all 7 ids fetched full-text 2026-08-26 (ar5iv HTML ×5; arXiv PDF ×2
where ar5iv served abstract stubs). Zero NOT FETCHED.
