# Extraction — sports-domain paper group (2026-08-26)

Six founder-picked papers, full text read 2026-08-26. Fetch provenance: all six
retrieved complete via ar5iv (`ar5iv.labs.arxiv.org/html/<id>`); papers 1 and 5
additionally pulled as arXiv PDFs and text-extracted locally to verify every
load-bearing number quoted below. Nothing in this document is from an abstract
alone; nothing is invented. Companion context: `docs/ops/2026-08-26-EDGE-PATH.md`
(E2 covariate ladder), `docs/ops/ORBIT_NEXT_50.md` rows 59–60, 65–66, 74–75.

Lens corrections below amend the ORBIT rows in place at next review; this doc is
the evidence.

---

## 1. arXiv:2303.05774 — NFL Combine → career success

**"NFL Career Success as Predicted by NFL Scouting Combine"** — Szekely,
Sinnott, Halow, Ryan (Univ. of Nevada Reno / Piedmont Univ.).

### (a) Full-text method content

- **Data (§3.1)**: draft classes 2013–2017; 1,973 players → **805 complete-case**
  (all missing-drill players dropped); 80/20 train/test; 10-fold CV (§3.3).
- **Features (§3.2)**: ONLY the six drill measurements — 40-yard dash, broad
  jump, bench press (reps at 225 lb), vertical jump, shuttle run, 3-cone drill.
  No height/weight, no position, no draft capital, no college production.
- **Labels (§3.2)**: (i) matriculation = played ≥1 NFL snap (classification);
  (ii) total NFL snaps (regression). Snaps "does not distinguish during what
  phase of the game the player is playing."
- **Models & numbers (Table 1, §4)** — five classifiers + five regressors (six
  distinct algorithms across both tasks):
  - Classification (10-fold CV accuracy): random forest **0.81** (best), GB
    0.77, SVM 0.76, logistic 0.75, decision tree 0.73. Tuned RF on **test:
    0.83** (§4; abstract says 83%, §6 says "84%").
  - Regression (CV RMSE, snaps): linear **1,210.1** (best), RF 1,276.0, GB
    1,289.3, SVM 1,298.87, DT 1,731.3. Linear on test: **RMSE 904.6, R² 0.17**.
- **Feature importance (§4, Figs 1–2)**: 3-cone drill "carried the most weight"
  for matriculation; **broad jump** highest importance for snaps; **3-cone the
  LEAST important for snaps** — the drill most rewarded at the gate is the worst
  long-horizon signal. (Internal inconsistency flagged: Fig. 1 caption says
  "support vector machine's coefficients" while the text says random forest.)
- **Failure modes (§5)**: "given the large RMSE value of 1,210.1, we conclude
  that we were unable to predict future NFL career success as quantified by
  snaps"; "while performing well in the drills from the Combine may get a player
  into the NFL, their performance may have little to do with how successful
  their NFL career will be"; scouts "may be over-weighting incorrect metrics."
- **Weaknesses the paper does not flag but we must**: (i) **no base rate or AUC
  reported** for matriculation — 0.83 accuracy is unanchored against a
  majority-class baseline; (ii) complete-case-only (805/1,973) is a selection —
  players who skip drills are systematically different (top prospects skip);
  (iii) matriculation prediction is partly tautological — teams draft off the
  Combine, so the Combine "predicting" who gets on a field is mediated by the
  draft decision itself (§5 concedes this: "team management makes their initial
  draft decision based on the Combine performance"); (iv) no per-position
  models (§5 limitations).

### (b) THE APPLICATION for GSE

**Rookie-projection feature guidance for the fantasy model** (target:
skill-doc rule + `docs/data/PROP_COVARIATE_GAP.md` note; the fantasy lane's
player board `apps/web/lib/fantasy/players.ts` has no rookie model yet, so this
lands as a codified prior for when one is built, and as an admission prior for
any combine covariate proposed to `covariate-bus`):

1. **Combine drill metrics carry ~zero prior for production/volume outcomes**
   (cross-position R² 0.17 including the best drill). Any proposed combine
   covariate for a production target enters the E2 ladder with prior ≈ 0 and
   must clear walk-forward admission like everything else (priced:false).
2. **The only defensible combine use is binary opportunity**
   ("will this rookie see the field") — and even that is draft-mediated;
   prefer draft capital directly, which subsumes the combine signal.
3. **If a drill is ever weighted, weight the right one**: broad jump is the
   only drill with (weak) production relation; 3-cone/40 are gate signals, not
   production signals. Never let content or projections cite 3-cone/40 as
   evidence a rookie "will produce."
4. Rookie projections rank inputs: draft capital + college production +
   camp/role signals ≫ combine drills (tie-breakers at most).

Data: none needed (guidance, not a fit). Gate: covariate-bus walk-forward
admission for anything combine-derived; check-claims for content phrasing.

### (c) Lens vs ORBIT row 65

Row 65: skill-doc (medium) — "cautions agents against weighting
Combine/athletic-testing features for long-horizon player value."
**CONFIRMED, sharpened**: add the positive half (matriculation/opportunity
signal exists but is draft-decision-mediated) AND the caution against
over-trusting the 83% itself (no reported base rate, complete-case selection).
Priority unchanged (medium).

---

## 2. arXiv:2510.07297 — NFL agentic media content discovery

**"Agentic Generative AI for Media Content Discovery at the National Football
League"** — Wang, Salekin, Lee, Claytor, Zhang (AWS), Chi (NFL).

### (a) Full-text method content

**Architecture — nine-stage flow (§4.1 Agentic Workflow, §4.2 Infrastructure)**:

1. **Intent gate**: Claude 3 Haiku classifier filters non-football queries.
2. **Query decomposition** into **Entities / Actions / Conditions** — e.g.
   "Find all plays where Patrick Mahomes throws a touchdown farther than 10
   yards" → entity: Patrick Mahomes (with ID confirmation for duplicate
   names); action: touchdown throw; condition: >10 yards. No formal DSL — LLM
   reasoning with schema context in the prompt.
3. **Semantic-cache check**: prior query→API-call pairs stored with entity
   redaction ("[PLAYER]", "[TEAM]" placeholders); vector similarity search; on
   high score, **re-execute the cached API call with fresh IDs**, "bypassing
   expensive reformulation." (Embedding model, threshold, invalidation policy
   NOT disclosed.)
4. **Schema router**: LLM selects relevant NGS schemas (passing/rushing/
   defense/offense).
5. **API formulation**: LLM maps conditions to OpenSearch fields; few-shot
   demonstrations + schema context (field names, types, valid values) +
   required step-by-step reasoning.
6. **Execution + bounded auto-correction**: Python runner; on syntax failure,
   retry with the error message, **max 3 attempts**, then ask user to rephrase.
7. **Summarization**: LLM converts result rows to natural language.
8. **MAM linking**: play IDs → Media Asset Management → video URLs.
9. React frontend. Infra: Bedrock Converse API, Redis memory, LangGraph
   orchestration, OpenSearch store.

**Evaluation (§3.2, §5)**: 240 QA pairs (140 dev / 100 test); difficulty mix
30% easy (single API call), 50% medium (multiple filters), 20% complex
(cross-schema). Result: **">95-percent accuracy"** measured as API-construction
correctness + play-count match vs ground truth; average search **30 s vs 10
min** manual (6× simple, 20× complex). Cache hit rate not quantified.
Limitations (§5–6): complex queries needing deep football knowledge score
lower; duplicate-name disambiguation needs user confirmation.

### (b) THE APPLICATION for GSE

**The JARVIS/cockpit query lane over the picks/odds database** — the
architecture ports nearly 1:1, with two GSE-law hardenings:

- Target module: new `apps/web/lib/jarvis/query/` (JARVIS lane; sibling to
  `jarvis-decision-queue.ts` etc.), read path only.
- Pipeline: intent gate (Haiku-class) → entity/action/condition decomposition
  (entities = player/team/pick-id/market; conditions = date, sport, tier,
  confidence band, CLV sign) → **schema router over GSE domains** (picks
  board, line archive/odds snapshots, CLV ledger, settlement, calibration
  reports) → **templated, parameterized queries against a read-only DB role**
  (safer than the paper's free-form construction; the Neon read-only role from
  EDGE-PATH §0.4 is the model) → bounded auto-correct ≤3 → summarizer that may
  state **only what the executed query returned** (trust-gate/check-claims: the
  no-fabricated-stats law applied at the summarization stage) → answers link
  back to pick/board URLs (the MAM-linking analogue).
- **The key trick that survives GSE's freshness law**: cache the *plan*, never
  the *answer*. Entity-redacted query → query-plan pairs; on similarity hit,
  re-execute the plan against live data with fresh IDs. Stale-answer caching
  would violate no-stale-data; plan caching cannot.
- **Eval-first gate**: build the QA-pair harness before wiring (≈100–240 pairs
  over the real DB, easy/medium/complex split, accuracy = plan correctness +
  row-count match). Admission bar: ≥95% on held-out pairs, mirroring the
  paper. Founder-gated to wire, per ops-lane rules.

Data: existing Prisma models; no new ingestion. Gate: read-only role +
QA harness + check-claims on summaries.

### (c) Lens vs ORBIT row 66

Row 66: skill-doc (low) — "no modeling content."
**UPGRADED: pattern (medium, ops lane).** "No modeling content" stands, but the
full text yields a complete implementable architecture + an eval design, and
the entity-redacted plan-cache is the piece that makes semantic caching
compatible with the no-stale-data law. Aligns with row 85 (SPORTSQL) — the two
should be implemented as one lane, this paper supplying the
decomposition/caching/eval skeleton.

---

## 3. arXiv:1805.01271 — NFL injuries before/after the 2011 CBA

**"NFL Injuries Before and After the 2011 Collective Bargaining Agreement
(CBA)"** — Binney, Hammond, Klein, Goodman, Janssens (Emory).

### (a) Full-text method content

- **Data (§2.1–2.2)**: Football Outsiders DB built from official NFL injury
  reports + IR lists, 2007–2016 (4 pre-CBA seasons, 6 post). 22,331 injuries →
  **7,425 analyzed** after exclusions: preseason 2,643 (11.8%); **non-game-loss
  11,399 (51.0%)** — dropped "to account for the more complete reporting of
  minor injuries in recent years"; head injuries 685 (4.1%) — dropped to avoid
  concussion-diagnosis drift; illness 179 (0.8%).
- **Design (§2.4)**: Poisson **interrupted time series** at player-season
  level with games-at-risk offset and player random intercept:
  `ln(Y_ij) = ln(G_ij) + β₀ + β₁·t + β₂·CBA + β₃·PostCBA + β₄·Age + b₀ᵢ + e`,
  where β₂ (exponentiated) = post-CBA level shift, β₁+β₃ = post-CBA trend.
  Stratified by **conditioning-dependent** (soft tissue: hamstring, groin,
  calf, Achilles, ACL…) vs **non-conditioning** (contact: fractures, high
  ankle, ribs…) vs unknown. Sustained-change criterion: ≥1/1,000
  athlete-exposures for ≥3 seasons. Four sensitivity analyses incl.
  hamstring-only.
- **Findings (§3)**: overall game-loss injuries 701 (2007) → 804 (2016). CBA
  level effect **−7% (95% CI −17% to +3%)** — null. Conditioning-dependent:
  197 → 271 by 2011 (+38%) then plateau 220–240/season; CBA +5% (−13, +27) —
  null. Non-conditioning −10% (−31, +16) — null. **Games missed: CBA −10%
  (−15, −4), significant**; hamstring games missed **−27% (−39, −12),
  significant**. Secular trends ≈ +3%/yr injuries, +13%/yr → +4%/yr games
  missed. Unexplained 2014 jump in unknown-conditioning-status injuries.
- **Pitfalls the authors codify (§4)**: (i) concurrent rule changes (kickoff
  moved, defenseless-player list expanded) — "difficult to disentangle";
  (ii) **the chosen counterfactual drives the conclusion** ("if we assume
  injury counts would have continued rising unabated, the CBA's practice
  restrictions may appear beneficial…"); (iii) body-part-only coding →
  misclassification; (iv) roster-size changes (80→90, practice squad 8→10)
  broke preseason comparability; (v) reporting-completeness drift is why half
  the raw data was excluded.

### (b) THE APPLICATION for GSE

Two-part, both implementable now:

1. **Injury-narrative discipline — an injury-claims checklist for the content
   lane** (target: `check-claims` skill companion rules + the content workflow
   guard in `apps/web/lib/content/workflow.ts` draft checks):
   - Never attribute an injury-rate change to a single cause (rule changes are
     always confounded).
   - Game-loss vs merely-listed injuries must be distinguished in any injury
     stat cited (51% of listed injuries were non-game-loss, and listing
     completeness drifts over time).
   - Concussion-rate trends ≈ diagnosis trends — off limits as
     behavior/safety-change claims.
   - A wide CI is reported as "no detectable change," never "no change."
   - Any before/after claim must state its counterfactual.
2. **Priors + taxonomy for fantasy availability modeling** (target: future
   availability priors in the fantasy lane; data: current nflverse injury
   report aggregates, which are public): the **conditioning-dependent vs
   contact taxonomy** is the portable structure (soft-tissue ≈ 28–34% of
   game-loss injuries; hamstring the largest single class; ~3–4%/yr secular
   upward drift in game-loss injury rates 2007–2016). The 2007–2016 rates
   themselves are a decade stale — under the no-stale-data law they are usable
   only with explicit vintage disclosure, or refit on current nflverse injury
   reports before entering any model.

Bonus portable method: the Poisson-ITS-with-offset design itself is the right
instrument for any before/after claim GSE ever wants to publish (e.g.
"scoring is up since rule X"), with pitfall (ii) as mandatory discipline.

### (c) Lens vs ORBIT row 74

Row 74: skill-doc (low) — "no portable method."
**PARTIALLY CORRECTED → skill-doc (medium).** The "no portable method" clause
is wrong: the Poisson ITS design + exclusion discipline + the
conditioning/contact taxonomy are all portable. The injury-claims checklist is
immediately wireable into check-claims.

---

## 4. arXiv:2206.13222 — DPI prediction from GPS tracking

**"ML-Based Approach for NFL Defensive Pass Interference Prediction Using GPS
Tracking Data"** — Skoki, Lerga, Štajduhar (Univ. of Rijeka).

### (a) Full-text method content

- **Data (§II-A)**: Big Data Bowl 2021 (Kaggle), 2018 season, 17 weeks,
  tracking at ≥100 ms intervals. Raw DPI: 259 of all pass plays (**1.46%**).
- **Feature engineering (§II-B)**: nearest defender + targeted receiver
  identified by Euclidean distance to ball at play end; play segment from
  `pass_forward` to outcome event; normalized so offense always moves right.
  Features per frame: speed/acceleration/orientation/direction for attacker,
  defender, ball; pairwise Euclidean distances (defender–attacker,
  attacker–ball, defender–ball); binary event flags (pass_arrived, caught,
  tackle, first_contact, incomplete, out_of_bounds).
- **Domain prefilter**: 90th percentile of max defender–attacker distance on
  DPI plays = **5.56 yd** → threshold filter removes implausible-foul plays.
  Final set: 9,760 plays, 231 DPI (**2.32%**); splits 5,336/130 train,
  1,334/32 val, 2,859/69 test (Table I).
- **Imbalance handling (§II-D)**: undersampling tested and rejected
  (unsatisfying performance); SMOTE rejected — synthetic generation "deemed
  impractical due to multiple time-varying variables." Adopted:
  inverse-frequency **class weights** (Eq. 1)
  `w_class = n_inst / (n_classes × n_inst_class)` → 0.51 (non-DPI) / **20.52**
  (DPI).
- **Recall-first design (§III)**: recall "the most important" metric ("we want
  as few missed DPI classifications as possible"); models tuned for best
  **precision at recall ≥ 0.8**; rationale: "it would be better to predict a
  false DPI and then check it manually."
- **Results (Table II)**: best recall 0.884 (LSTM-128; also GRU-128, ANN-64)
  at precision ≈ 0.07–0.09; F1 ≤ 0.164; best AUC 0.821 (LSTM-64). Single
  hidden layer sufficed; deeper nets didn't help.
- **Two-stage proposal (§IV)**: GPS model as the high-recall Stage-1 candidate
  screen feeding a video-analysis Stage-2 verifier.
- **Failure mode / conclusion (§IV–V)**: "when players are close to each
  other, there is no information from which one can determine if a DPI was
  made" — the modality lacks discriminative information exactly where the
  event happens; "GPS tracking data alone does not contain enough information
  in order to classify this complex event correctly."

### (b) THE APPLICATION for GSE

Yes — applicable without tracking data. The tracking features die at our data
boundary, but the **rare-event pipeline conventions port whole** to GSE's
rare-event props (INT, TD-scorer, first-TD):

1. **Domain prefilter before modeling** (their 5.56-yd rule): shrink the
   negative space with a leak-safe domain rule computed from prior weeks via
   `covariate-bus` — e.g., red-zone-role floor for TD props, attempts floor for
   INT props. Raises the effective base rate the model sees; identical in
   spirit to the bind's fail-closed drops.
2. **Class weighting over synthetic resampling** for structured/sequential
   features. SMOTE on player-weeks is fabrication; GSE never synthesizes
   samples. If any classifier screen is ever added, the Eq.-1 inverse-frequency
   weight is the convention.
3. **Precision-at-fixed-recall as the operating metric** for rare-event
   screens in the edge-lab admission harness — and the hard honesty lesson:
   **AUC 0.82 at a 2.3% base rate still yields 7.5% precision.** A good-looking
   discriminative score is not a publishable "hit probability." This is the
   concrete argument for keeping GSE's rare-event props on count models
   (Gamma-Poisson NB, `props-hb-int.ts`) with the e = p − q LCB gate, never on
   raw classifier scores.
4. Their Stage-1-screen → Stage-2-verifier funnel maps to: cheap high-recall
   candidate screen for possibly-mispriced rare props → expensive verification
   (walk-forward + LCB gate) as Stage 2.

Target: edge-lab admission-harness convention (report precision@recall for any
rare-event bind) + a §-note in `docs/data/PROP_COVARIATE_GAP.md`. Data: none
new. Gate: existing edge-lab law.

### (c) Lens vs ORBIT row 75

Row 75: skill-doc (low) — "documents limits of positional data… GSE lacks the
GPS data to port it directly."
**CONFIRMED, sharpened to skill-doc (medium)**: the "recall-first filter
pipeline idea" now has an exact recipe (prefilter → class weights →
precision@recall≥0.8 → two-stage), and the AUC-vs-precision base-rate lesson is
a standing guard for every rare-event surface.

---

## 5. arXiv:2606.18805 — reference-dependent emotions and post-game risky driving

**"Emotional driving: Reference-dependent emotions and risky driving behavior
after sporting events"** — Richardson, Bickley, Chan, Torgler, Yasmin,
Pawlowski (Tübingen / QUT), Aug 2026. PDF text-verified.

### (a) Full-text method content

- **Data (§3.1)**: HERE Technologies average vehicle speed at Traffic Message
  Channel (TMC) segment level in 10-minute increments + Florida statewide
  crash records with exact coordinates/timestamps; 5-km radii around five
  Florida venues; 2015–2019. **84 NFL Sunday home games** (kickoffs 1:00–4:25
  pm ET; Dolphins 2018–19 excluded for missing traffic data) and **308 NBA
  home games**. Baseline speeds ≈ 23–29 mph (NFL bands).
- **Theory (§2)**: reference-dependent preferences (Kőszegi–Rabin). Games
  decomposed into **suspense** (pre-game closeness), **surprise** (deviation
  from expectation), **valence** (positive/negative outcome). Profiles
  (Table 1): predicted-close loss = suspense + negative valence; upset loss =
  surprise + negative; upset win = surprise + positive. "A predicted-close win
  resolves with positive affect — relief or celebration — whereas a
  predicted-close loss resolves with frustration, disappointment, and anger,
  the emotions most strongly linked to aggressive driving."
- **Expectation anchor (§3.2)**: closing point spreads. NFL: ±4 (Card & Dahl
  2011 — a −4 spread ≈ 63% home-win probability). NBA: asymmetric −6.75/+4.75
  (Cardazzi et al. 2024).
- **Design (§3.3, Eq. 1)**: `Speed_it = α_i + f(p_it, y_it; λ) + θ_it + δ_it + ε_it`
  — TMC fixed-effects panels; 90 models per sport (5 distance bands × 18
  ten-minute windows: 60 min pre, 120 min post); weather/holiday/DOW/season
  controls; crash-presence dummy θ; SEs clustered by TMC. Identification:
  "conditional on the pre-game point spread, the actual game outcome is as
  good as random." Robustness (§4.2): two-way clustering, wild bootstrap,
  spread cutoffs ±3/±5/±6, kickoff restrictions.
- **Findings (§4.1)** — the load-bearing correction: the robust effect is
  **predicted-CLOSE losses, not upsets**. "Average speed following
  predicted-close losses increases by up to 3 mph relative to predicted-close
  wins — a difference several times larger than the average game day versus
  non-game day speed differential" (<1 mph). Concentrated 0–3 km, first
  post-game hour, decaying in time and distance. **Upset losses "mainly
  oscillate around zero"** — but the sample held only **5 upset losses**
  (fn. 16: 58 close games, 16 predicted wins, 10 predicted losses) —
  underpowered, not refuted. Upset wins: "smaller though less precise positive
  effects," significant in some robustness specs. **NBA: null on all
  profiles** (Fig. 2); only ordinary congestion patterns.
- **Crash analysis (§4.3, Table 6)** — Poisson FE on sparse counts, direction
  only: post-game-60 crashes **+404%** on gamedays vs matched non-gamedays
  (est. 1.618, p<0.001; 40 crashes total), **losses +505% vs wins +408%**;
  post-120: +243% overall, losses +353% vs wins +181%; pre-game-60 **+154%**
  (p=0.008). Authors: interpret "with appropriate caution" given tiny counts.
- **Stated boundary (§4.1)**: speed is aggregate traffic behavior —
  "suggestive of more aggressive driving behavior, though we cannot test this
  directly."

### (b) THE APPLICATION for GSE

Two lanes:

1. **Responsible-gaming content + Bias Mirror framing** (target:
   `apps/web/lib/bias-mirror/mirror.ts` guidance strings — the `chase` and
   `timing` dimensions and Cool-down mode copy — plus the
   `RESPONSIBLE_BETTING_EDUCATION` content kind in
   `apps/web/lib/content/workflow.ts`): the evidence-backed angle is a
   **post-close-loss cool-down window** — the first hour after a
   high-suspense loss is when emotional regulation measurably degrades.
   Content correction that matters: the trigger is **close losses**, not
   blowout upsets — "the game that could have gone either way and didn't" is
   the danger window. Honesty boundary (check-claims): the paper measures
   traffic speed and crashes near stadiums and is explicit that this is
   *suggestive* of aggressive driving; content must phrase it as "in a driving
   study…" and must NOT claim it proves bet-chasing. The crash percentages are
   quotable only with the low-absolute-count caveat.
2. **Behavioral-bias covariate primitive** (target: `covariate-bus` E2
   candidate; data: the line archive — closing spreads are pre-game, so the
   classification is leak-safe by construction): the portable structure is the
   **spread-anchored expectation profile** — classify each game predicted
   win/close/loss at ±4 (NFL), then expose *previous-game profile* (e.g.,
   "coming off a predicted-close loss") as a context covariate for next-game
   modeling. Honest prior: **weak** — the paper shows fan behavior, not player
   performance or betting-market flows; the presumed "public money after
   disappointing favorites" lens has no support in this text (the paper is
   silent on betting volume). Strictly priced:false → walk-forward admission,
   like every E2 candidate.

### (c) Lens vs ORBIT row 59

Row 59: skill-doc (bias-mirror + RG content angle).
**CONFIRMED, with a substantive content correction**: the effect is
suspense-resolution (predicted-close losses), not upset losses — RG copy
written to the "disappointing favorite" frame would misstate the evidence.
Added: one new E2 covariate primitive (expectation-profile classification from
closing spreads). Priority unchanged.

---

## 6. arXiv:2603.17866 — Bayesian multilevel step-and-turn player movement

**"Bayesian multilevel step-and-turn models for evaluating player movement in
American football"** — Nguyen & Yurko (CMU Statistics & Data Science).

### (a) Full-text method content

- **Data (§2)**: NFL Big Data Bowl 2025 tracking (10 Hz, RFID); weeks 1–9 of
  2022; running backs on rushing plays; **5,400 plays across 136 games**;
  frames from handoff to termination event.
- **Step-length model (§3.2, Eq. 1)**: scaled arcsine-transformed step length,
  Gaussian: `s̃ ~ N(μ^(SL), σ²)` with
  `μ^(SL) = α₀ + X β + u_j + v_k`, where **u_j = ball-carrier random
  intercept** and **v_k = defensive-team random intercept** (both Gaussian).
  Standard positive distributions (Gamma, log-normal, Weibull) "do not provide
  a good fit"; hence the transform. Covariates: ball-carrier location, closest
  defender distance, player counts by direction, prior frame's step length.
- **Turn-angle model (§3.3, Eq. 2)**: von Mises with tan-half link on the
  mean and **log-link concentration conditioned on step length**:
  `log κ = γ₀ + γ₁·s + w_j` (player random effect w_j) — capturing that
  "variability in turn angle decreases as step length increases." Prior-frame
  turn angle enters for directional persistence.
- **Priors & fit (§3.4)**: half-t₃ on variances, t₃/t₁ intercepts,
  γ₀ ~ N(5, 0.8²); Stan via brms, NUTS, 4 chains × 5,000 iters (2,500
  warmup) = 10,000 draws; R̂ ≈ 1.
- **Counterfactual-simulation evaluation (§4)**: at each observed frame,
  (1) draw posterior params + a **fresh random effect** (a "generic average
  player"), simulate a step length; (2) draw turn angle conditional on that
  step; (3) advance the position — **H = 100 hypothetical one-step moves per
  frame, all 21 other players held at observed positions**. A CatBoost
  yards-gained model (1,000 iters, lr 0.03, depth 6; features via
  distance-ordered anchoring, 11 per group; **leave-one-week-out CV**) scores
  observed vs each hypothetical step; δ = observed-step value − hypothetical
  value, averaged over H (Eqs. 5–7).
- **Metrics (§5.2.2, ≥70 attempts)**: **yards success rate** = share of
  hypothetical draws the observed step beat (top: Josh Jacobs 0.526, Miles
  Sanders 0.524; bottom: A.J. Dillon 0.431); **explosiveness** = share of
  frames where the observed step exceeds the 95th percentile of the
  hypothetical distribution (top: Etienne 0.089, Walker 0.089; bottom:
  Allgeier 0.036). Step/turn random effects correlate r = 0.279 (two distinct
  styles: straight-line speed vs lateral agility; Jonathan Taylor lowest
  turn variability, McCaffrey shortest steps). Player-specific-baseline
  variant correlates r = 0.863 / 0.778 with the generic baseline (§S.4).
- **Limitations (§6)**: one-frame-ahead only, other players frozen (bias if
  rolled forward); full-trajectory rollout would need a calibrated
  tackle-probability termination model; deliberately simple covariates.

### (b) THE APPLICATION for GSE — split port

**GATED on cleared tracking**: the step-and-turn likelihoods, trajectory
simulation, and frame-level counterfactuals all require raw tracking. Big Data
Bowl licenses are research-only — the same clearance posture EDGE-PATH §2/E2
already applies to the coverage transformer (2603.25901). No commercial
tracking source is cleared; this half waits.

**PORTS NOW to nflverse aggregates** (three concrete slices):

1. **Opponent as a random effect** (from the v_k defensive-team intercept):
   add a partially-pooled defensive-team random effect to the Gamma-Poisson
   props binds (e.g., `props-hb-int`, rush-yards binds) instead of raw
   opponent averages — hierarchical shrinkage over opponents is exactly the
   small-sample discipline those models already use for players. Target:
   `packages/prediction-engine/src/edge-lab/` bind revisions; priced:false →
   walk-forward.
2. **Distributional-baseline evaluation → CPAE spec amendment**: score
   outcomes against a *distribution* of a generic-player baseline and emit
   **two metrics** — success rate above baseline AND tail-exceedance
   (explosiveness, P > 95th pct) — rather than mean-above-expectation only.
   Implementable delta to
   `docs/ops/edge/2026-08-26-paper-spec-cpae-gam-surface.md` (the CPAE surface
   can emit P(above expectation) and tail-rate per player from play-level
   nflverse data). Tail-exceedance is a natural fantasy-ceiling signal the
   mean hides.
3. **Leave-one-week-out CV** for any supervised layer = GSE's walk-forward
   discipline, independently arrived at — reinforces edge-lab law as the
   admission instrument.

### (c) Lens vs ORBIT row 60

Row 60: pattern (player-movement → props/fantasy).
**CORRECTED — split verdict**: "pattern (medium) — core model GATED on a
cleared tracking source (same gate as 2603.25901); port-now slice = opponent
random effects into props binds + distributional-baseline
(success-rate/explosiveness) metrics into the CPAE-GAM surface spec."
Un-annotated, the row invites building on uncleared Big Data Bowl data.

---

## Summary table

| # | arXiv | Fetched | Application (target · gate) | Lens vs ORBIT row |
|---|---|---|---|---|
| 1 | 2303.05774 | FULL (ar5iv + PDF-verified) | Rookie-projection feature guidance: combine drills ≈ zero prior for production (R² 0.17), draft-mediated opportunity signal only; broad jump the lone weak production drill · covariate-bus walk-forward | Row 65 CONFIRMED (skill-doc medium), sharpened both directions |
| 2 | 2510.07297 | FULL (ar5iv) | JARVIS query lane blueprint: intent gate → entity/action/condition → schema router → templated read-only queries → plan-level (not answer-level) semantic cache → cite-only summaries · QA-pair eval ≥95% before wiring | Row 66 **UPGRADED** skill-doc(low) → pattern(medium, ops); merge with row 85 SPORTSQL lane |
| 3 | 1805.01271 | FULL (ar5iv) | Injury-claims checklist for check-claims/content guards + conditioning-vs-contact taxonomy for availability priors (rates stale — refit on current nflverse) · content trust-gate | Row 74 **CORRECTED** skill-doc(low)→(medium): Poisson-ITS design IS portable |
| 4 | 2206.13222 | FULL (ar5iv) | Rare-event conventions for props: domain prefilter, class weights over SMOTE, precision@recall≥0.8 as harness metric; AUC 0.82 @ 2.3% base → 7.5% precision = why count models + LCB gate, not classifier scores · edge-lab law | Row 75 CONFIRMED, sharpened to skill-doc(medium) with exact recipe |
| 5 | 2606.18805 | FULL (ar5iv + PDF-verified) | RG "post-close-loss cool-down hour" for bias-mirror/content (driving evidence, phrased honestly) + spread-anchored expectation-profile covariate (prev-game predicted-close-loss) · check-claims; covariate-bus walk-forward | Row 59 CONFIRMED with **content correction**: effect is predicted-close losses (+3 mph, crashes +505% post-loss), upset losses null/underpowered (n=5) |
| 6 | 2603.17866 | FULL (ar5iv) | Split port: opponent random effects → props binds now; success-rate + explosiveness distributional metrics → CPAE spec now; step-and-turn simulation GATED on cleared tracking · priced:false, walk-forward | Row 60 **CORRECTED** to split verdict (gated core + port-now hierarchy/eval slice) |

No paper came back "NONE AFTER FULL READ"; every one yielded at least a
codifiable guard or convention, and papers 2, 5, 6 yielded implementable
modules/spec deltas. Nothing here is committed to code; every model-side item
enters through the E2 ladder (priced:false → walk-forward → trials-registry)
and every content-side item through check-claims.
