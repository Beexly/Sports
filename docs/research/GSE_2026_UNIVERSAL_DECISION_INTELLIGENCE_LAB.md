# GSE 2026 — Universal Decision Intelligence Lab (Workstream A)

> **Internal research doc.** No live signals, no claims, no marketing copy. This is a design
> source for the GSE decision layer. Where a fact is general knowledge it is stated plainly;
> where it is uncertain it is marked `(uncertain)`. Nothing here is a track-record assertion.

## 1. Thesis + the universal operating loop

**Most sites display data. GSE must judge data.** A scoreboard, a line, an injury tag — these
are *inputs*, not *answers*. The category-defining move is to stop being a feed and become a
**decision instrument**: a system that takes in messy reality, interrogates it, and returns a
defensible recommendation *plus the reasoning that would let a human overrule it*. "Think for
people" means reduce cognitive load and surface tradeoffs — never manipulate, never remove
agency. Every mature decision discipline outside sports — from a hospital triage bay to a
mission-control flight-rules binder to a chess engine's eval bar — already implements some slice
of this. The job of this doc is to mine those disciplines for *mechanics we can port*.

The universal operating loop GSE organizes reality around:

```
source → data → quality check → evidence → context → contradiction →
uncertainty → recommendation → decision → action → outcome →
autopsy → calibration → memory → better future strategy
```

Each external domain below is read as a partial implementation of this loop. The discipline that
nails *quality check* (data observability) is weak at *autopsy*; the one that nails *autopsy*
(aviation, NASA) is weak at *real-time uncertainty*; the one that nails *uncertainty*
(superforecasting, weather) is weak at *contradiction surfacing*. GSE's edge is assembling the
**whole loop** from the best-in-class slice of each.

**Coherence note — systems being built in parallel (referenced, not redefined here):**
**Evidence Engine** (`apps/web/lib/gse/evidence-engine.ts` — Claim / Evidence / CounterEvidence /
Falsifier / Verdict) *generalizes* the existing **Signal Courtroom**
(`apps/web/lib/courtroom/courtroom.ts`), whose verdict vocabulary is already
`PLAY | WATCHLIST | NO-BET | FRAGILE EDGE` with explicit falsifiers and a `whatWouldChange` field;
**Data Excellence** (`apps/web/lib/gse/data-excellence.ts` — quality, freshness, lineage);
**Decision Ontology** (`apps/web/lib/gse/decision-ontology.ts` — the typed graph of the loop);
**20 GSE scoring systems** (`apps/web/lib/gse/gse-scoring-systems.ts`); **Trust Ledger**
(`apps/web/lib/trust-ledger/` — tamper-evident Merkle proof-of-record). The mappings below target
these primitives by name. Nothing here introduces a new namespace.

---

## 2. Twenty domains, mined for transferable mechanics

Each entry: **Reference systems · Decision mechanic · Evidence/uncertainty mechanic ·
Human-in-the-loop mechanic · Failure mode · GSE translation · V1 build · Risk.**

### (1) Intelligence analysis — ACH & structured analytic techniques (SATs)

- **Reference systems:** CIA tradecraft; Heuer's *Psychology of Intelligence Analysis*; Analysis of
  Competing Hypotheses (ACH); Key Assumptions Check; Devil's Advocacy; the ICD-203 analytic
  standards (source quality + confidence + dissent are mandatory).
- **Decision mechanic:** ACH inverts the natural instinct. Instead of building a case *for* the
  favored hypothesis, you enumerate *all* hypotheses and score each piece of evidence by how well
  it **discriminates** between them. You then seek evidence that would **disconfirm**, not confirm.
- **Evidence/uncertainty mechanic:** Each item rated for *diagnosticity* (does it distinguish
  hypotheses?) and *source reliability*. Confidence is expressed verbally on a standardized scale
  with a stated rationale; dissent is recorded, not buried.
- **Human-in-the-loop:** The analyst owns the call; the technique is scaffolding that *forces*
  consideration of alternatives and explicit assumptions. Red-team / devil's advocate is a role.
- **Failure mode:** Analysis paralysis; false rigor (a tidy matrix that launders a guess);
  anchoring on the first hypothesis the matrix was built around.
- **Concrete GSE translation:** This is the spine of the **Evidence Engine**. A signal is a *case*,
  not a badge: enumerate competing reads (favorite covers / dog covers / no edge), and score each
  Evidence item by **diagnosticity** — how much it *separates* hypotheses — not raw strength. Wire a
  mandatory **Falsifier** list per claim (already in the Courtroom shape). The honest **NO-BET**
  verdict is the analytic equivalent of "evidence is non-diagnostic."
- **V1 build:** Add a `diagnosticity` weight to each `Evidence`/`CounterEvidence` in
  `evidence-engine.ts`; render an ACH-style matrix (hypotheses × evidence) in the cockpit; require
  ≥1 falsifier or the verdict cannot exceed WATCHLIST.
- **Risk:** Over-engineering the UI into an unreadable matrix. Mitigate: matrix is a drill-down,
  the default surface is the verdict + the single `whatWouldChange`.

### (2) Incident command systems (ICS)

- **Reference systems:** FEMA/NIMS Incident Command System; firefighting command; hospital HICS.
- **Decision mechanic:** Single accountable Incident Commander; explicit **span of control**;
  pre-defined roles activated by incident *type and scale*; a written **Incident Action Plan** per
  operational period.
- **Evidence/uncertainty mechanic:** Situation reports (SITREPs) on a cadence; a common operating
  picture so everyone reasons off the same state.
- **Human-in-the-loop:** Authority is explicit and singular; escalation paths are pre-wired so no
  one waits to ask "who decides?"
- **Failure mode:** Bureaucratic overhead on small incidents; rigid roles when the situation is
  novel.
- **Concrete GSE translation:** A **slate** (a day's games) is an "incident." One orchestrator owns
  the operational period; sub-agents (roster-shock, line-movement, calibration) are roles activated
  by slate scale. The cockpit's "common operating picture" = one freshness-stamped state every
  surface reads from — no two views disagreeing on the line.
- **V1 build:** A per-slate "Action Plan" object: which agents ran, what they own, the
  operational-period timestamp. Maps onto Decision Ontology nodes.
- **Risk:** Ceremony for low-stakes slates. Mitigate: scale the role set to slate size.

### (3) Emergency-medicine triage

- **Reference systems:** START triage; ESI (Emergency Severity Index, 5 levels); Manchester
  Triage System.
- **Decision mechanic:** Sort by **acuity and resource need**, not arrival order. A small set of
  fast discriminators routes each patient to a tier in seconds.
- **Evidence/uncertainty mechanic:** Deliberately *coarse* — speed over precision. **Re-triage** is
  built in: a patient's category is re-evaluated as their state changes.
- **Human-in-the-loop:** Clinician judgment overrides the algorithm; the algorithm is a floor, not
  a ceiling.
- **Failure mode:** Under-triage (missing a sick patient) is far costlier than over-triage; the
  system is intentionally biased toward caution.
- **Concrete GSE translation:** Attention triage across a slate. Most games are "walk-and-talk"
  (no edge, no attention needed). A coarse first pass routes the few games worth deep analysis to
  the analyst's attention. **Re-triage** = re-score when an injury status or line moves. Bias the
  system toward *under-claiming* edges (the NO-BET default), the safe analog of caution.
- **V1 build:** An **Attention-Triage Score** in `gse-scoring-systems.ts` (coarse, 4–5 buckets) that
  ranks slate games by "deserves a full Evidence-Engine case." Re-trigger on freshness change.
- **Risk:** A coarse score read as a precise edge. Mitigate: present as a *queue position*, never a
  probability.

### (4) Aviation checklists & Crew Resource Management (CRM)

- **Reference systems:** Boeing/Airbus normal & non-normal checklists; the surgical safety
  checklist adapted from aviation (Gawande); CRM training after the 1977 Tenerife and 1978
  Portland (United 173) accidents `(uncertain on exact program dates)`.
- **Decision mechanic:** A checklist offloads memory for *known, killable* failure modes —
  especially "do-confirm" and "read-do" steps. CRM flattens hierarchy so a junior crew member can
  challenge a captain ("assertive inquiry").
- **Evidence/uncertainty mechanic:** Cross-check and call-out: two crew confirm a state aloud.
  Errors are caught by *redundant verification*, not heroics.
- **Human-in-the-loop:** The checklist supports the pilot; it never flies the plane. CRM is
  entirely about *who can speak up*.
- **Failure mode:** Checklist-as-ritual (ticking boxes without reading); automation complacency.
- **Concrete GSE translation:** A **pre-publish checklist** for every signal: freshness confirmed,
  ≥1 falsifier present, no banned-phrase claim, source rights cleared, calibration band attached.
  CRM → the **counter-evidence is structurally required**: the Evidence Engine cannot reach PLAY
  without the "defense" having spoken (the Courtroom already enforces a defense array). This is
  assertive inquiry encoded.
- **V1 build:** A `preflightChecklist()` gate in the publish path that returns blocking failures;
  reuse the banned-phrase scanner (`trust-claims.ts`) as one checklist item.
- **Risk:** Box-ticking theater. Mitigate: each item is a *machine check* with a real failure, not
  a human attestation.

### (5) NASA mission control — flight rules

- **Reference systems:** NASA Mission Operations flight rules; Go/No-Go polls; the Mission
  Operations Directorate culture (Kranz's "tough and competent").
- **Decision mechanic:** **Flight rules are decided *before* the mission**, when no one is under
  time pressure or sunk-cost stress. In the moment, you execute the pre-agreed rule rather than
  re-litigating. Go/No-Go polls each discipline explicitly.
- **Evidence/uncertainty mechanic:** Each console owns a domain and reports a binary readiness with
  a reason; abort criteria are quantified and pre-set.
- **Human-in-the-loop:** The Flight Director can override, but overriding a flight rule is a logged,
  accountable act — friction is intentional.
- **Failure mode:** A rule written for one regime applied blindly to a novel one (the *Challenger*
  O-ring discussion is the canonical caution about normalizing deviance).
- **Concrete GSE translation:** **Pre-commit decision rules**, version-stamped, set when calm. E.g.
  "if a starter's status flips to OUT after the case was built, auto-downgrade to NO-BET." Encode
  abort criteria as **Falsifiers** with *automatic* effect, not advisory text. A Go/No-Go poll =
  each scoring sub-system votes readiness before a signal publishes.
- **V1 build:** A `decisionRules` registry (versioned) consumed by the Evidence Engine; falsifiers
  that *fire* downgrade the verdict automatically and log the override if a human reverses it.
- **Risk:** Stale rules outliving their regime. Mitigate: every rule carries a review date and a
  calibration link; the autopsy step flags rules that mis-fired.

### (6) Formula 1 pit-wall telemetry

- **Reference systems:** Team strategy software (e.g. AWS-backed analytics for some teams),
  real-time telemetry, undercut/overcut tyre models.
- **Decision mechanic:** Continuous Monte-Carlo race simulation updates pit-stop strategy every lap
  as conditions (safety car, tyre deg, gaps) change. The pit wall recommends; the driver and race
  engineer decide.
- **Evidence/uncertainty mechanic:** Probabilistic outcome of each strategy ("box this lap → P3
  with 65% `(illustrative)`"); the *delta* between strategies is what's shown, not raw lap times.
- **Human-in-the-loop:** Driver feel + engineer judgment can veto the model; the model's job is to
  make the tradeoff legible fast.
- **Failure mode:** Over-reacting to noise (a single slow lap); model assumes rivals behave
  rationally when they don't.
- **Concrete GSE translation:** **Show the delta, not the datum.** A line moving from −3 to −3.5 is
  meaningless raw; what matters is the *change to the recommendation* and *why*. Re-simulate the
  case as inputs stream in (the F1 "every lap" cadence = GSE's freshness re-check). Surface the
  decision-relevant delta in the cockpit, mirroring `whatWouldChange`.
- **V1 build:** A `lineMovementDelta` evidence type that records *which way the recommendation
  moved* and the trigger; debounce so single-tick noise doesn't churn the verdict.
- **Risk:** Churn — flickering verdicts erode trust. Mitigate: hysteresis bands on verdict changes.

### (7) Bloomberg Terminal

- **Reference systems:** Bloomberg Terminal; Refinitiv Eikon.
- **Decision mechanic:** Not a model — a **dense, trusted, cross-linked information cockpit** with a
  common command grammar and instant pivot from instrument to news to comparables. Its moat is
  *consistency, breadth, and the workflow*, not any single number.
- **Evidence/uncertainty mechanic:** Every datum is sourced and timestamped; provenance is a
  first-class citizen; users trust it because it's auditable.
- **Human-in-the-loop:** Pure decision-support; the human is always the trader. The terminal *never*
  tells you to buy.
- **Failure mode:** Information overload; expertise required to use it (a feature for pros, a wall
  for novices).
- **Concrete GSE translation:** The cockpit aspiration. **Provenance + timestamp on every datum** is
  non-negotiable (Data Excellence). A consistent "command grammar" — the same Evidence-Engine shape
  on every signal so users learn one mental model. Crucially: GSE goes *one step past* Bloomberg by
  also offering a **recommendation with reasoning**, while keeping the raw-data cockpit for pros.
- **V1 build:** Enforce a `provenance` + `asOf` field on every value rendered (Data Excellence
  contract); a uniform signal layout driven by the Evidence Engine.
- **Risk:** Becoming a feed (Bloomberg's strength) and forgetting the *judgment* layer (GSE's
  thesis). Mitigate: the verdict is always the headline, the data the drill-down.

### (8) Quant trading risk systems

- **Reference systems:** Pre-trade risk checks; position limits; VaR / expected shortfall; circuit
  breakers; kill switches (post-Knight Capital `(uncertain on internal specifics)`).
- **Decision mechanic:** The *risk system has veto power over the alpha model*. A trade with edge is
  still blocked if it breaches a limit. Separation of "find edge" from "is this safe to take."
- **Evidence/uncertainty mechanic:** Position sizing scales with conviction *and* uncertainty
  (Kelly-style intuition, usually fractional). Tail risk is modeled separately from expected value.
- **Human-in-the-loop:** Risk officers independent of the desk; a kill switch any human can pull.
- **Failure mode:** Model risk (the limit was calibrated to a regime that ended); correlated
  positions that look diversified.
- **Concrete GSE translation:** **Separate the edge-finder from the risk-gate.** The Evidence Engine
  finds the case; a *distinct* gate enforces hard stops (already a repo invariant: server-side
  paywall, no fabricated stats, banned phrases). Conviction *and* uncertainty both feed the
  confidence band — high edge + high uncertainty = FRAGILE EDGE, not PLAY. A "kill switch" =
  data-staleness or rights-clearance failure that suppresses the whole slate.
- **V1 build:** A `riskGate()` independent of scoring that can suppress/downgrade regardless of
  edge; wire staleness and `clearance.allowed=false` as hard suppressors.
- **Risk:** Two systems drifting out of sync. Mitigate: the gate is the *last* node in the Decision
  Ontology; nothing publishes around it.

### (9) Insurance underwriting

- **Reference systems:** Actuarial pricing; underwriting guidelines; rating factors; reinsurance.
- **Decision mechanic:** Price risk from a structured factor set with documented weights; refer
  edge cases to a senior underwriter. The **rate is explainable** to a regulator factor-by-factor.
- **Evidence/uncertainty mechanic:** Base rate + adjustments; explicit loadings for uncertainty;
  large-loss tail handled by reinsurance.
- **Human-in-the-loop:** Referral thresholds — automated below a line, human above it.
- **Failure mode:** Adverse selection; stale factor tables; proxy factors that smuggle in bias.
- **Concrete GSE translation:** **Explainable factor weights.** Every confidence band must decompose
  into named factors with weights (the Courtroom already weights arguments `low/moderate/high`).
  Make the "factor trail" a Pro-tier feature (already in the tier spec). **Referral threshold** =
  cases above an uncertainty bound get flagged for human review before publish.
- **V1 build:** Surface the factor decomposition behind each confidence band; a referral flag when
  uncertainty exceeds a configured bound.
- **Risk:** False precision in the weights. Mitigate: present weights as ordinal bands, validate
  against calibration before claiming numeric ones.

### (10) Fraud detection

- **Reference systems:** Card-network fraud scoring; anomaly detection; rules + ML hybrids; manual
  review queues.
- **Decision mechanic:** Score every event in real time; auto-approve the safe mass, auto-block the
  obvious, route the **ambiguous middle to human review**. Tune the precision/recall tradeoff to
  the cost asymmetry.
- **Evidence/uncertainty mechanic:** Reason codes accompany every flag ("velocity anomaly +
  geo-mismatch"); feedback from confirmed fraud retrains the model (closing the loop).
- **Human-in-the-loop:** Review queues; analysts label cases that become training data.
- **Failure mode:** False positives erode trust (blocked legit cards); concept drift as fraud
  patterns evolve.
- **Concrete GSE translation:** **Reason codes on every verdict.** A signal never says PLAY without
  the machine-readable reasons (this is the Evidence array). The "ambiguous middle" → WATCHLIST,
  routed to human attention. Confirmed-outcome feedback retrains calibration (the **autopsy →
  calibration** arc of the loop).
- **V1 build:** Ensure every `Verdict` carries structured reason codes; pipe settled outcomes into
  the calibration system as labeled feedback.
- **Risk:** Drift — patterns that worked last season decay. Mitigate: calibration-health score with
  a recency window flags stale models.

### (11) Credit risk scoring

- **Reference systems:** FICO/VantageScore; scorecards; reason codes (the legally-required "adverse
  action" reasons in the US `(uncertain on exact statute citation)`); champion/challenger model
  testing.
- **Decision mechanic:** A monotonic, *explainable* score from a small factor set; a cutoff turns
  score into decision; reject-inference handles censored data.
- **Evidence/uncertainty mechanic:** Scores are **calibrated to observed default rates** — a 700 is
  defined by what 700s actually do, not by vibes. This is the gold standard for the loop's
  calibration node.
- **Human-in-the-loop:** Manual review / appeals above/below cutoffs; adverse-action explanations
  are mandatory.
- **Failure mode:** Disparate impact via proxy variables; gaming once the factors are known.
- **Concrete GSE translation:** **Calibrate confidence to observed outcomes.** A GSE "65% band" must
  mean roughly 65% historically — this is the single most important transferable mechanic and is
  exactly what `calibration*/` exists to enforce. Champion/challenger → **model versioning** (every
  pick already carries `model_version`); run a challenger silently and compare Brier scores before
  promotion.
- **V1 build:** Publish a calibration curve (band vs realized rate) as the public "calibration/track
  record" surface promised to the free tier; gate any numeric confidence claim on it.
- **Risk:** Thin samples making early calibration noisy. Mitigate: show sample size and confidence
  intervals; suppress numeric claims under a minimum N.

### (12) Cybersecurity SOC / SIEM

- **Reference systems:** SIEM (Splunk/Sentinel-class); SOAR playbooks; the MITRE ATT&CK framework;
  alert triage tiers (T1/T2/T3).
- **Decision mechanic:** **Correlate** raw events into incidents (reduce noise → signal); playbooks
  encode the response for known patterns; severity routes the analyst's time.
- **Evidence/uncertainty mechanic:** Alert enrichment (add context before a human sees it);
  confidence + severity as separate axes; suppression rules for known-benign noise.
- **Human-in-the-loop:** Tiered analysts; escalation; post-incident review.
- **Failure mode:** **Alert fatigue** — the #1 SOC failure. Too many low-value alerts and analysts
  miss the real one.
- **Concrete GSE translation:** **Correlation over raw events** and a fanatical war on alert
  fatigue. Don't surface 50 line moves; correlate them into the few that change a verdict. Every
  signal arrives *enriched* (context attached) so the analyst/user doesn't go gather it. Severity
  (edge size) and confidence (certainty) are distinct axes in the cockpit, never collapsed.
- **V1 build:** A correlation pass that collapses raw freshness events into verdict-relevant
  changes; enforce two distinct axes (edge magnitude, confidence band) in the signal schema.
- **Risk:** Re-creating alert fatigue with too many notifications (Elite tier sends alerts).
  Mitigate: alerts only on *verdict-state changes*, not raw data ticks; user-set thresholds.

### (13) Legal evidence & case management

- **Reference systems:** Rules of Evidence; chain of custody; burden/standard of proof; discovery;
  the adversarial system itself.
- **Decision mechanic:** A claim must be *proven to a standard* on *admissible* evidence; the
  opposing side gets to contest it; the trier of fact issues a reasoned verdict.
- **Evidence/uncertainty mechanic:** Tiered standards ("preponderance" vs "beyond reasonable
  doubt"); hearsay/admissibility rules filter what counts; chain of custody guarantees provenance.
- **Human-in-the-loop:** Judge/jury; the adversarial structure *forces* counter-argument.
- **Failure mode:** Procedure over truth; expensive; a skilled advocate can win a weak case.
- **Concrete GSE translation:** This is the literal metaphor the **Signal Courtroom** already uses
  — a signal is a *case* with prosecution, defense, falsifiers, and a verdict. The Evidence Engine
  generalizes it. Add **admissibility**: data that fails rights-clearance or freshness is
  *inadmissible* and cannot enter the case (ties to `scraping/clearance-engine.ts` and the
  `RightsSnapshot` envelope). **Chain of custody** = lineage in Data Excellence. **Standard of
  proof** = the verdict tier ladder (NO-BET ⇢ FRAGILE ⇢ WATCHLIST ⇢ PLAY).
- **V1 build:** An `admissible()` predicate on Evidence (clearance + freshness + provenance present);
  inadmissible items are excluded with a logged reason, not silently dropped.
- **Risk:** The courtroom metaphor read as adversarial-for-show. Mitigate: the defense must cite
  *real* counter-evidence; a defense of empty filler fails a lint check.

### (14) Medical diagnosis support / differential diagnosis

- **Reference systems:** Differential diagnosis; Bayesian reasoning (pre/post-test probability);
  clinical decision-support (e.g. Isabel-class tools); "VINDICATE"-style mnemonics; "rule out the
  worst first."
- **Decision mechanic:** Generate a *ranked differential* (multiple hypotheses), then order tests by
  how much each **updates the probabilities**; treat the most-likely-and-most-dangerous first.
- **Evidence/uncertainty mechanic:** Likelihood ratios; base rates ("when you hear hoofbeats think
  horses, not zebras"); explicit "can't-miss" diagnoses even when unlikely.
- **Human-in-the-loop:** The clinician synthesizes; decision-support *augments*, and over-reliance
  ("automation bias") is a known harm.
- **Failure mode:** Anchoring on the first diagnosis; premature closure; base-rate neglect.
- **Concrete GSE translation:** **Ranked differential of reads**, not a single answer. The Evidence
  Engine should hold *multiple* live hypotheses with relative probabilities and update them as
  evidence arrives (Bayesian). "Rule out the worst first" → surface the disqualifying falsifier
  before the supporting case (fail-fast on NO-BET). Guard against the user's automation bias by
  *always* showing the counter-case.
- **V1 build:** Represent each signal as a ranked hypothesis set in the Decision Ontology; show the
  top-2 reads with their separation, not just the winner.
- **Risk:** Confusing users with too many hypotheses. Mitigate: default to the leading read; the
  differential is an expandable drill-down.

### (15) Weather ensemble forecasting

- **Reference systems:** ECMWF / GFS ensembles; the European/American model "spread"; cone-of-
  uncertainty hurricane tracks; probability-of-precipitation as a public-facing calibrated number.
- **Decision mechanic:** Run *many* perturbed simulations; the **spread of the ensemble is the
  uncertainty estimate**. Forecast the *distribution*, not a point.
- **Evidence/uncertainty mechanic:** Ensemble spread → confidence; tight cluster = high confidence,
  wide = low. Probabilities are publicly calibrated and trusted (PoP is one of the most successful
  public uncertainty communications ever).
- **Human-in-the-loop:** Human forecasters adjudicate when models disagree; communicate uncertainty
  to the public without a stats degree.
- **Failure mode:** Model agreement on a *shared* error (correlated models = false confidence);
  public misreads "30% rain" `(common misconception)`.
- **Concrete GSE translation:** **Disagreement = uncertainty.** GSE already runs multiple estimators;
  treat their *spread* as the confidence signal — tight agreement narrows the band, divergence
  widens it (or triggers NO-BET). Communicate uncertainty *as a band/cone*, never a false-precision
  point. The hurricane cone is the model for the cockpit's confidence visual.
- **V1 build:** Compute an ensemble-spread metric across estimators; map spread → confidence band
  width; render a "cone," not a single number.
- **Risk:** Correlated estimators (sharing an input) faking agreement. Mitigate: track input
  independence in lineage; down-weight agreement among estimators that share a source.

### (16) Supply / demand forecasting

- **Reference systems:** Retail/operations S&OP; demand sensing; safety stock; backtesting;
  hierarchical reconciliation.
- **Decision mechanic:** Forecast → decision (order quantity) → measure error → adjust. The forecast
  is judged by **downstream decision quality**, not forecast accuracy in the abstract.
- **Evidence/uncertainty mechanic:** Prediction intervals drive safety stock; forecast error
  (MAPE/bias) tracked relentlessly; decompose trend/seasonality/promo effects.
- **Human-in-the-loop:** Planner overrides for known one-offs (a promotion the model can't see).
- **Failure mode:** Bullwhip effect; chasing noise; optimizing forecast accuracy instead of business
  outcome.
- **Concrete GSE translation:** **Judge the recommendation by the decision, not the prediction.**
  The autopsy must ask "was the *decision* right given what was knowable?" not merely "did the
  result land?" — separating process from outcome (the repo's stated doctrine: "we grade the
  thinking, not the scoreboard"). Track *bias* (systematic over/under-confidence) as relentlessly as
  hit rate.
- **V1 build:** An autopsy record per settled signal capturing process-quality vs outcome
  separately; a running bias metric feeding calibration.
- **Risk:** Outcome bias creeping into the autopsy. Mitigate: log the decision rationale *at lock
  time* (immutable, via Trust Ledger) so the autopsy can't rewrite history.

### (17) Superforecasting / prediction tournaments

- **Reference systems:** Tetlock's Good Judgment Project; Brier scores; the IARPA forecasting
  tournaments; the "ten commandments of superforecasting."
- **Decision mechanic:** Break big questions into tractable sub-questions; start from base rates;
  update *incrementally* on news; aggregate diverse forecasters; **keep score with Brier**.
- **Evidence/uncertainty mechanic:** Probabilistic, granular (a 63% is meaningfully different from
  60%); the Brier score rewards calibration *and* resolution and punishes overconfidence.
- **Human-in-the-loop:** It's *all* human-in-the-loop — the finding is that trained, scored,
  open-minded humans beat pundits. The discipline is the scoring + feedback culture.
- **Failure mode:** Over-updating on vivid news; herding; losing the base rate.
- **Concrete GSE translation:** **Brier-score everything and show the score.** This is the
  intellectual core of GSE's credibility: keep a public, falsifiable scorecard of calibration.
  Base-rate-first reasoning → every Evidence case starts from the market/historical base rate before
  adjusting. The "outside view" guards against narrative-driven overconfidence.
- **V1 build:** Compute Brier (and calibration + resolution decomposition) on settled signals;
  surface it on the public calibration page; use it to gate confidence claims (ties to (11)).
- **Risk:** A bad early Brier is discouraging but *honest* — the temptation to hide it violates the
  integrity rules. Mitigate: always show N and the trend, never cherry-pick a window.

### (18) Poker solvers (GTO / exploitative)

- **Reference systems:** GTO solvers (PioSOLVER-class); equity calculators; range-vs-range thinking;
  the EV-of-a-decision framing.
- **Decision mechanic:** Reason about **ranges, not single hands**; compute the EV of each action;
  separate *baseline GTO* (unexploitable) from *exploitative* deviation (when you read a specific
  opponent). Crucially: a correct decision can lose ("bad beat") — **EV ≠ outcome.**
- **Evidence/uncertainty mechanic:** Everything is a distribution over opponent holdings; pot odds
  vs equity is the explicit math; variance is understood and tolerated.
- **Human-in-the-loop:** The player chooses GTO vs exploit based on a read; the solver gives the
  baseline.
- **Failure mode:** Results-oriented thinking (judging the decision by the result); mis-reading the
  opponent and over-exploiting.
- **Concrete GSE translation:** **EV-of-the-decision, decoupled from outcome.** This is the single
  most important *cultural* import: a NO-BET that "would have won" was still correct if the case
  didn't support it; a PLAY that lost can still have been right. The autopsy grades EV/process. The
  market line is the "GTO baseline"; GSE's edge case is the documented *exploitative deviation* with
  a stated reason.
- **V1 build:** The autopsy schema separates `processGrade` from `outcome`; the cockpit teaches this
  distinction explicitly so users don't results-orient.
- **Risk:** Users (and us) still feel the sting of a lost "good" decision. Mitigate: report
  long-run process metrics prominently so single outcomes don't dominate perception.

### (19) Chess engines (eval bars, principal variation)

- **Reference systems:** Stockfish / Leela; the eval bar; principal variation (PV); centipawn loss;
  multi-PV analysis.
- **Decision mechanic:** A single **continuous evaluation** (the bar) summarizes a complex position;
  the **principal variation** shows the *line of reasoning* behind it; multi-PV shows the top-N
  candidate moves with their evals.
- **Evidence/uncertainty mechanic:** Eval is a number but engines also show *sharpness* (is the
  position forcing/only-move, or quiet?); "blunder/inaccuracy" labels are calibrated to centipawn
  loss.
- **Human-in-the-loop:** The player decides; the engine explains *why* via the PV — the most
  legible "show your work" UI in any decision tool.
- **Failure mode:** Eval without the PV is uninterpretable; horizon effects; trusting the bar in
  positions the engine evaluates poorly `(uncertain — engine-specific)`.
- **Concrete GSE translation:** **The eval bar + principal variation is the gold-standard cockpit
  UI.** One legible summary (the verdict/confidence) *plus* the line of reasoning that produced it
  (the Evidence chain = GSE's "principal variation"). Multi-PV → show the top reads, not just one.
  Label "sharpness" — is this a knife-edge call (FRAGILE EDGE) or a quiet, robust one?
- **V1 build:** A cockpit component pairing the verdict/confidence "bar" with an expandable
  Evidence-chain "PV"; a sharpness indicator derived from ensemble spread + falsifier proximity.
- **Risk:** A confidence bar read as certainty (chess evals look more precise than they are).
  Mitigate: pair every bar with its band/spread and the `whatWouldChange`.

### (20) Data observability / enterprise data catalogs

- **Reference systems:** Data catalogs (DataHub/Amundsen-class); observability (Monte Carlo-class);
  data contracts; lineage; freshness/volume/schema/distribution monitors; SLAs.
- **Decision mechanic:** **You cannot trust a decision on data you don't trust.** Observability
  treats *data quality as a monitored SLA*: freshness, volume, schema-drift, distribution anomalies,
  and full lineage from source to consumer.
- **Evidence/uncertainty mechanic:** Each dataset carries a health score and an SLA; anomalies fire
  before bad data reaches a decision; lineage answers "where did this come from?"
- **Human-in-the-loop:** Data stewards own catalog entries; incident workflows for data breakage.
- **Failure mode:** Catalog rot (stale docs); monitoring noise; trusting a green check that doesn't
  measure the thing that broke.
- **Concrete GSE translation:** This *is* **Data Excellence** (`data-excellence.ts`). Quality check
  is a first-class node in the loop, *before* evidence. Freshness SLAs (the repo's "no stale data"
  rule), schema/distribution monitors on The Odds API ingestion, and full lineage so every datum's
  provenance is auditable (Bloomberg-grade). A failed quality check makes data *inadmissible* (ties
  to (13)).
- **V1 build:** Per-source health scores + freshness SLA in Data Excellence; lineage stamped on
  every record; a red health score suppresses dependent signals (ties to the risk-gate (8)).
- **Risk:** Green-check theater (monitoring the wrong dimension). Mitigate: monitor *distribution*
  drift, not just presence/freshness; tie health to downstream calibration outcomes.

---

## 3. Summary table

| Domain | Mechanic | Why it works there | GSE translation | Risk | V1 build |
|---|---|---|---|---|---|
| Intel / ACH | Score evidence by diagnosticity; seek disconfirmation | Forces alternatives, kills confirmation bias | Diagnosticity weights + mandatory falsifiers in Evidence Engine | Unreadable matrix | `diagnosticity` field; ACH matrix as drill-down |
| Incident command | Single accountable owner, span of control, action plan | Clear authority under chaos | Per-slate orchestrator + common operating picture | Ceremony on small slates | Per-slate Action Plan object |
| ER triage | Coarse, fast acuity sort + re-triage | Speed > precision when stakes asymmetric | Attention-Triage Score; re-score on change | Coarse read as precise | 4–5 bucket triage score |
| Aviation / CRM | Checklist offloads memory; juniors can challenge | Redundant verification catches errors | Pre-publish checklist + required counter-evidence | Box-ticking theater | `preflightChecklist()` machine checks |
| NASA flight rules | Decide rules when calm; execute under pressure | Removes in-the-moment bias | Versioned pre-commit decision rules; auto-firing falsifiers | Stale rules | `decisionRules` registry + review dates |
| F1 pit wall | Show the decision-delta; re-sim every lap | Makes tradeoff legible fast | `lineMovementDelta`; re-check on freshness | Verdict churn | Debounced delta evidence type |
| Bloomberg | Sourced, timestamped, cross-linked cockpit | Provenance = trust | Provenance+`asOf` on every datum; uniform layout | Becomes a mere feed | Enforced provenance contract |
| Quant risk | Risk-gate vetoes the alpha model | Separation of edge from safety | `riskGate()` independent of scoring | Two systems drift | Gate as last ontology node |
| Underwriting | Explainable factor weights; referral thresholds | Auditable, regulator-proof | Factor-trail decomposition; human-review flag | False precision | Surface weighted factor trail |
| Fraud | Reason codes; route the ambiguous middle | Cost-asymmetry-aware; closes loop | Reason codes on verdicts; outcomes → calibration | Concept drift | Structured reason codes + feedback pipe |
| Credit scoring | Calibrate score to observed outcomes | A 700 means what 700s do | Calibrate confidence bands to realized rates | Thin-sample noise | Public calibration curve, min-N gate |
| SOC / SIEM | Correlate events; fight alert fatigue | Noise → signal; protect attention | Correlation pass; severity≠confidence axes | Notification fatigue | Alert only on verdict-state change |
| Legal evidence | Standard of proof on admissible evidence | Adversarial test of claims | Admissibility predicate; verdict-tier ladder | Adversarial theater | `admissible()` + real counter-evidence |
| Differential dx | Ranked differential; rule out worst first | Avoids premature closure | Ranked hypothesis set; show top-2 separation | Hypothesis overload | Top-2 reads w/ separation |
| Weather ensemble | Spread of ensemble = uncertainty | Distribution, not point | Estimator spread → band width; cone visual | Correlated estimators | Spread metric + independence in lineage |
| Demand forecasting | Judge by decision quality; track bias | Outcome of the decision, not the forecast | Process-vs-outcome autopsy; bias metric | Outcome bias | Immutable lock-time rationale (Trust Ledger) |
| Superforecasting | Base rates + incremental updates + Brier | Scored, open-minded humans beat pundits | Public Brier + calibration/resolution decomposition | Honest-but-bad early score | Brier on settled signals, show N |
| Poker solvers | EV-of-decision ≠ outcome; ranges | Variance-tolerant, process-focused | `processGrade` separate from `outcome` | Results-orientation | Autopsy splits process/outcome |
| Chess engines | Eval bar + principal variation | One summary + the reasoning line | Verdict bar + Evidence-chain "PV"; sharpness | Bar read as certainty | Bar+PV component w/ band |
| Data observability | Quality as monitored SLA; lineage | Can't trust decisions on untrusted data | Data Excellence health + SLA; inadmissible on red | Green-check theater | Health score, distribution drift, suppress |

---

## 4. What does NOT transfer to sports (caution list)

- **No regulator forcing rigor.** Credit/insurance/aviation have legal mandates for explainability
  and safety. GSE must self-impose that discipline; nothing external enforces it. Treat the repo's
  integrity rules as our "regulator."
- **Far thinner, noisier feedback.** A SOC sees millions of events; a quant desk thousands of
  trades; GSE sees a bounded number of settled signals per week. **Small-sample calibration is
  fragile** — borrow the *mechanic* (Brier, calibration curves) but respect the N. Hold numeric
  claims until samples justify them.
- **Adversarial, efficient counterparty.** Unlike weather (nature isn't trying to fool you), sports
  markets are **near-efficient and adaptive** — the line already encodes most signal, and edges
  decay as they're found. Quant's "alpha decay" caution applies; weather's "stationary system"
  assumption does not.
- **No closed-form ground truth.** Chess/poker have a definable optimum (a solver, an eval). Sports
  outcomes are irreducibly stochastic with no oracle — there is no "correct eval," only a
  distribution. Resist importing chess-engine *certainty aesthetics*.
- **Outcome ≠ decision quality, and the public conflates them.** Poker culture internalizes this;
  the general sports audience does not. The product must *actively teach* the distinction, which is
  a UX burden the source domains don't carry.
- **Liability/regulatory surface of "advice."** Medicine/law/credit operate under licensure and
  duty-of-care regimes. GSE is decision-*support*, must preserve user agency, and must avoid
  tout-style claims (per the banned-phrase scanner) — the metaphors transfer; the authority posture
  does not.
- **Real-time-control domains assume actuation.** F1/NASA/ICS close the loop by *acting* on the
  world within the operational period. GSE informs a human who acts elsewhere; we get the recommend
  step, not the actuate step — don't over-model control we don't have.

---

## 5. Top 10 transferable mechanics, ranked by leverage for GSE

1. **Calibrate confidence to observed outcomes + keep a public Brier score** (credit scoring +
   superforecasting). The foundation of all credibility. Ties to `calibration*/` and the public
   free-tier calibration surface. Without this, every other mechanic is decoration.
2. **EV-of-the-decision, decoupled from outcome — grade the thinking, not the scoreboard** (poker +
   demand forecasting). The cultural keystone; protects against results-orientation in users *and*
   in our own autopsies. Already the repo's stated doctrine.
3. **Signal-as-case with mandatory counter-evidence and falsifiers** (legal + ACH + CRM). The
   Evidence Engine / Signal Courtroom spine. A claim that can't be falsified can't be PLAY.
4. **Quality check as a gating SLA, with inadmissibility on failure** (data observability + legal
   admissibility). Data Excellence as a *blocking* node before evidence — "no stale data" enforced,
   not aspired to.
5. **Eval bar + principal variation as the cockpit UI** (chess). The most legible "summary +
   show-your-work" pattern in existence; pairs the verdict with its reasoning chain.
6. **Independent risk-gate with veto power over the edge-finder** (quant trading). Hard stops
   (staleness, clearance, banned phrases) suppress regardless of edge; the last node in the ontology.
7. **Provenance + timestamp on every datum** (Bloomberg + chain of custody). Non-negotiable for
   trust and auditability; the difference between a feed and an instrument.
8. **Ensemble spread → uncertainty band, communicated as a cone not a point** (weather). Turns
   estimator disagreement into honest, legible uncertainty and guards against false precision.
9. **Reason codes + route the ambiguous middle to human review** (fraud + underwriting). Every
   verdict explains itself; WATCHLIST is the "review queue"; outcomes feed back to calibration.
10. **Pre-committed decision rules set when calm, executed under pressure** (NASA flight rules).
    Versioned, auto-firing falsifiers remove in-the-moment bias and make overrides accountable.

---

*Cross-references: Evidence Engine (`apps/web/lib/gse/evidence-engine.ts`), Data Excellence
(`apps/web/lib/gse/data-excellence.ts`), Decision Ontology (`apps/web/lib/gse/decision-ontology.ts`),
scoring systems (`apps/web/lib/gse/gse-scoring-systems.ts`), Signal Courtroom
(`apps/web/lib/courtroom/courtroom.ts`), Trust Ledger (`apps/web/lib/trust-ledger/`),
calibration (`apps/web/lib/calibration*/`), scraping clearance (`apps/web/lib/scraping/`).*
