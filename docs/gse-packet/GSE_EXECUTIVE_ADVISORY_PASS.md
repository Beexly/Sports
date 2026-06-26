# Galaxy Sports Edge — Executive Advisory Pass
**A section-by-section upgrade review of `GSE_INTERNAL_MASTER.md`**
Produced 2026-06-23 · Companion to the Internal Master Document and the Forecasting Methodology Atlas.
Method: every one of the 19 units of the master document was reviewed by an eight-lens executive panel — Auditor, Engineer, Developer, Architect, Researcher, plus Contextual / Situational / Psychological leads — pushing each section on structure, intelligence, mechanics, engagement, functionality, and visual form. A four-stream research wing cataloged 169 prediction/forecasting methodologies (delivered separately in the Atlas).

## How to read this

This document is in two parts. **PART I is the executive brief** — the verdict on GSE as it stands today, a doc-vs-code reconciliation note that should be read before anything else, and the master prioritized backlog of cross-cluster "Top Moves" ranked by leverage. **PART II is the full section-by-section panel review** in document order: front matter, then §0 through §17, each block carrying its panel findings, prediction-method relevance, and paste-ready rewrite seeds, with each cluster's own ranked Top-N appended at the end of its section group. Every recommendation in both parts is routed *through* GSE's existing integrity gates — Model Court, calibration at settled n≥100 with non-worsening ECE, server-side entitlement enforcement, and the no-banned-certainty-language rule — rather than around them; the upgrade path strengthens the gates, it never bypasses them. Read PART I for the decision; read PART II for the evidence and the exact code-level moves behind each call.

---

## PART I — Executive brief

GSE's architecture is unusually disciplined: a market-first reader, an honest additive confidence score, a proof multiplier, and a governance cathedral (Model Court, readiness gates, evidence-readiness matrix, claim compiler) that most betting-content businesses never build. The platform's ceiling is not its honesty — it is that the honesty is mostly expressed in prose and gates rather than in shipped, calibrated, independently-validated prediction signals. The upgrade path is therefore not a rewrite; it is to (a) make "The One Ladder" literally true in the schema, (b) evolve the additive points score into a calibratable probability model that can only go live after it beats the current model out-of-sample through Model Court, (c) ship the thin, real tamper-evident proof layer as a public, verifiable trust artifact, and (d) reconcile the document against the actual code branch.

### Doc-vs-code reconciliation (read first)

Three of the four advisory teams inspected the local working clone and could not find many of the engine files the master document names (e.g. `clv.ts`, `shin-devig.ts`, `edge-engine.ts`, `calibration-apply.ts`, `lib/pricing/*`), and found the live entitlements to be a flat tier→boolean map rather than the phased pricing ladder described. IMPORTANT: the master document is published from the `research/proven-edge` branch, while the local scratch clone is on a different branch and is known to truncate — so "not found locally" is expected and is NOT evidence the engines are missing. Treat this as the single highest-priority verification action: diff `GSE_INTERNAL_MASTER.md` against the real `research/proven-edge` tree and mark each named faculty as Shipped / Partial / Aspirational. Where the panel reasoned against code it could actually read (e.g. the additive sum with a hardcoded `+10` baseline and `priced=false` independent estimators), its findings are consistent with the document's own "PRICED vs R&D" labeling — the engine genuinely has no independent model signal priced yet, exactly as the doc states.

### Master Top Moves backlog (cross-cluster, ranked)

| # | Move | Source cluster | Why it matters | Effort | Smallest validation |
|---|---|---|---|---|---|
| 1 | Make "The One Ladder" real in schema — one event-sourced LadderEvent registry that BOTH pricing tiers and the `priced` flag read | Thesis | Turns "revenue maturity = engine maturity" from prose into an enforced invariant; the spine of the pitch | M | A test asserting a tier advance and a `priced=false→true` flip fire from the same settled-milestone event |
| 2 | Build a `replayRun(runId)` backtest harness over stored snapshots | Data/Engine | Keystone — unblocks every estimator backtest at zero API cost and makes Model Court evidence cheap | M | Replay one historical slate and reproduce its published picks deterministically |
| 3 | Ship the thin REAL tamper-evident proof layer + public client-side verify page | Data/Engine + Thesis | Converts the moat into a viral, independently-checkable trust artifact | M | A user re-hashes a pre-kickoff receipt and matches the published Merkle root in-browser |
| 4 | Reconcile doc-vs-code with a CI registry/matrix test | Data/Engine | Closes the integrity gap above so the spec can never silently drift from shipped reality | S | CI fails if a documented faculty has no corresponding module/flag |
| 5 | Ship `ECE()` + standing calibration reliability audits (Wilson-banded deciles) | Intelligence + Thesis | ECE is one function from existing per-bucket Brier/delta and is the gate that governs every "priced" decision | S | ECE computed on a calibration set and asserted non-worsening in a test |
| 6 | Evolve the additive confidence into a calibratable log-odds (penalized-logistic / boosted) model, shipped shadow at weight 0 | Thesis | Raises the intelligence ceiling while staying honest — priced only after beating the additive sum on OOS Brier/ECE via Model Court | L | Shadow model logged alongside live picks for one season, scored OOS |
| 7 | First independent estimator toward priced: opponent-adjusted EPA + Elo/Glicko-2, wired as shadow to the evidence matrix | Data/Engine + Intelligence | The cheapest credible non-market signal, buildable from public PBP with no rights/fabrication risk | M | Shadow Elo backtest beats a coin-flip baseline on settled games |
| 8 | Upgrade the market read: Shin + alternative de-vig ensemble (multiplicative/additive/power) + book-weighted median + market-implied power ratings + steam/RLM detectors | Data/Engine + Intelligence | Sharpens the core edge and cross-checks the single point of failure (one de-vig method) | S/M | Emit all de-vig methods into the receipt and alert when they disagree > threshold |
| 9 | Ship the proof-gated pricing ladder module and fix the entitlement grace leak | Business | Revenue integrity — today PAST_DUE appears to drop straight to FREE instead of the documented 7-day grace | S | A PAST_DUE user retains access for the grace window in a test |
| 10 | Make the real Agent OS legible — the shipped roles, 6 departments, capability bounds, an org-chart + escalation visual, and a pure golden-tested `attentionScore()` (WSJF/cost-of-delay) | Business | Convert an impressive-sounding registry into an honest, legible operating system without over-promising autonomy | S/M | `attentionScore()` unit-tested; org chart renders from the registry |
| 11 | Type the Status taxonomy (enum + census script + maturity dashboard) and GENERATE §16 live/roadmap status from real gate state | Thesis + Business | Truth that cannot drift; a five-second maturity read for partners/investors | S | Status counts generated, not hand-written; CI guards them |
| 12 | Convert the War Room from DEMO into an evidence-cited council (each agent = a real signal with provenance + falsifier + signalLineageId; reliability-weighted log-odds fusion; recency half-lives) | Intelligence | Makes the most engaging surface credible and reconciles it with the §5 governance spine | M | Each council verdict links to its signals' lineage and a falsifier |
| 13 | Wire analytics (PostHog) + the proof-loop funnel events | Business | Stop launching blind on the very funnel that justifies the price ladder | S/M | The 4 proof-of-value events fire end-to-end in staging |
| 14 | Package the governance stack as a licensable trust toolkit + a public "Truth in Picks" trust ledger | Business + Governance | Turns the compliance cathedral into revenue line #5 and a differentiator; map to SR 11-7, responsible-gambling codes, provenance standards | L | One external-style trust report generated from real integrity-ledger data |
| 15 | Multi-sport via the dormant `poisson.ts` — MLB bivariate Poisson (Lahman), NHL MoneyPuck xG→Poisson totals + Skellam puck-line — behind per-sport go-live gates | Intelligence | Expansion is a data/rights problem, not an engine rewrite; proves the engine generalizes | L | One sport produces shadow projections gated on rights→data→≥100 settled→non-worsening ECE |

Each cluster's own ranked Top-N (with risk notes) appears at the end of its section group in PART II.

---

## PART II — Section-by-section panel review

### Front matter — Status taxonomy, "Scale at a glance," Table of contents
**Panel assigned:** Auditor (status-claim falsifiability) · Engineer (taxonomy as state machine) · Developer (status as typed enum + lint) · Architect (taxonomy ↔ surface-map coupling) · Researcher (maturity-model precedents) · Contextual (investor/partner legibility) · Situational (launch-posture signaling) · Psychological (trust via honest labeling)
**Verdict:** The seven-state taxonomy (PRICED/LIVE/DRAFT-ONLY/DEMO/R&D/PLANNED/ADMIN) is genuinely differentiated — it is the integrity doctrine made visible, and almost no competitor would dare publish it. But right now it lives as a prose sentence, so it can drift from code and a reader can't see the *shape* of the system at a glance. The opportunity is large and cheap: turn the taxonomy into a typed, testable, single-source-of-truth that renders both a partner-facing maturity dashboard and a per-surface badge — making "we label what's real" a feature, not a footnote.

#### Findings & ambitious upgrades
- **The Auditor —** The taxonomy's credibility depends on the *boundary* between PRICED and LIVE being enforced, not declared. Today the doc asserts "served as fact/process-grade not a wired projection," but nothing in the front matter proves a LIVE surface can't leak a number into a published score. Add a falsifiable invariant: *every Status is a function of facts the system can check* — PRICED ⇔ (weight > 0 in active engine version AND calibration applied AND Model Court passed); DEMO ⇔ fixtures flagged `isFixture:true`. Then the taxonomy can be unit-tested, and any prose claim that contradicts the registry is a build failure. Also: "Scale at a glance" uses `~` on every number (~161, ~114, ~70, ~60). Approximate counts in a *master* document read as not-yet-counted; pin exact counts behind a generated census so the tilde disappears.
- **The Engineer —** Treat status as a **state machine**, not a label set. The legal transitions are the interesting object: PLANNED→R&D→LIVE→PRICED (forward), and the *reverse* edges (PRICED→R&D on a failed re-calibration; LIVE→DEMO on a source outage) are where integrity is actually defended. Define the transition table explicitly with guard conditions, so "what does it take to move from R&D to PRICED?" has one answer. The seven states collapse cleanly onto two orthogonal axes — **Data reality** (fixture → real-shadowed → real-wired) × **Pricing authority** (weight 0 → weight >0 priced) — which is a far more compressible mental model than a flat 7-tuple and makes the dashboard a 2-D grid.
- **The Developer —** Ship `packages/types/src/status.ts` exporting `type SurfaceStatus = 'PRICED'|'LIVE'|'DRAFT_ONLY'|'DEMO'|'RND'|'PLANNED'|'ADMIN'` plus a `STATUS_META` record (label, color token, sortRank, investorVisible). Every page route and API route carries a `status` field; a `scripts/status-census.ts` walks the route tree and emits the counts for "Scale at a glance" so the doc's numbers are generated, never hand-typed. Add an ESLint/CI check: a surface tagged PRICED whose handler imports a fixture module fails the build. This converts the taxonomy from documentation into a guardrail with a test.
- **The Architect —** The taxonomy is the natural **seam between §13 (surface map) and §15 (the ladder)** — a surface's status is exactly its position on the maturity axis. Make that explicit: status is owned in one registry, consumed by the surface map, the cockpit (§11), the public badges, and the ladder. This kills the coupling risk where three different docs describe maturity three different ways. Long-term, the registry becomes the API for "what is real today," which is queryable by the B2B/trust-toolkit buyers in §9/§12.
- **The Researcher —** This is a **Technology Readiness Level (TRL)** scheme applied to a prediction product — lean into that lineage; it's a language investors already trust from deep-tech diligence. Pair it with a **two-axis capability-maturity grid** (the data×pricing axes above) the way model-risk frameworks (e.g., SR 11-7-style model lifecycle: develop → validate → deploy → monitor → retire) separate "built" from "validated" from "in production." Naming the precedent ("our status taxonomy is TRL for sports models, gated like SR 11-7") instantly elevates the perceived rigor.
- **Contextual Lead —** A partner or acquirer skimming the front matter should grasp three things in five seconds: how big the system is, how much of it is *real money* (PRICED), and how much runway is *built but not yet priced* (the latent upside). The current prose buries all three. The maturity dashboard below answers "what % of surfaces are revenue-bearing vs. proven-and-waiting vs. roadmap" — which is precisely the question a strategic buyer asks about a young intelligence asset.
- **Situational Lead —** Pre-PROVEN, the honest posture is "mostly LIVE/R&D, a disciplined sliver PRICED." That is a *strength* to signal now, not hide: it says the founder refuses to price what isn't proven. The dashboard should timestamp itself ("as of 2026-06-22, NFL only") and show the taxonomy mid-migration, so the reader sees a system climbing a ladder rather than a static brochure. This directly sets up §15's narrative.
- **Psychological Lead —** Labeling your own unproven work "DEMO" and "R&D" in your flagship document is a powerful trust signal — it pre-empts the skeptic's "but is this real?" by answering before they ask (the *stolen-thunder* effect: disclosing a limitation yourself increases perceived credibility). Make the badges visible on the *public* surfaces too, color-coded, so the honesty is experienced by users, not just stated to investors. The cognitive-load win of a colored grid over a comma-separated sentence is large; people remember spatial position, not prose lists.

#### Prediction-method relevance
The taxonomy *is* the governance layer for every method in this doc: a method (Elo, Dixon-Coles, isotonic calibration, a gradient-boosted ensemble) enters at R&D (weight 0, possibly shadow-scored), and may only reach PRICED after Model Court + calibration gating. So the front matter should name the ladder rung at which each *family* of method becomes eligible to be priced — making the taxonomy the index into §15. Brief here; deep in the §1 and §15 reviews below.

#### Section rewrite seeds
- **Maturity dashboard (paste-ready spec).** A one-glance table the front matter should lead with:

  | Status | Meaning (1 line) | Moves a published score? | Data reality | Count | % of surfaces |
  |---|---|---|---|---|---|
  | **PRICED** | Weight in active engine; calibration applied | **Yes** | Real, wired | _gen_ | _gen_ |
  | **LIVE** | Real data to a real surface, served as fact/process-grade | No (not a wired projection) | Real, wired | _gen_ | _gen_ |
  | **DRAFT-ONLY** | Produces drafts; never auto-publishes | No | Real | _gen_ | _gen_ |
  | **DEMO** | Illustrative personas/fixtures; math real, inputs not | No | Fixture | _gen_ | _gen_ |
  | **R&D / NOT-WIRED** | Built/shadowed; weight 0; or blocked on a source | No (shadow only) | Real-shadowed | _gen_ | _gen_ |
  | **PLANNED / STUB** | Scaffolded, not built out | No | — | _gen_ | _gen_ |
  | **ADMIN** | Operator-only | No | — | _gen_ | _gen_ |

  Counts are emitted by `scripts/status-census.ts`; the doc embeds the generated values so they never drift.
- **"Scale at a glance," rewritten as a buyer reads it.** Replace the tilde list with: *"Galaxy Sports Edge is a 160-route sports-intelligence OS: ~114 API surfaces over ~70 analytics subsystems, 5 core packages, 4 workers, ~60 data models. Today, **N surfaces are PRICED** (move real money against a calibrated, court-passed model), **M are LIVE** (real data, served as fact not projection), and the remainder are built-but-unpriced runway that the proof ladder (§15) converts to revenue as milestones clear. NFL is live; MLB/NHL/GSN are scaffolded."* — one paragraph that states size, what's real, and where the upside is.
- **Status-as-state-machine table (new front-matter sub-block).** A 7×7 (or compressed) transition matrix listing each legal transition and its guard, e.g. `R&D → PRICED : requires(settledN ≥ 100, ECE_nonworsening, modelCourt = PASS, engineVersionBump)`; `PRICED → R&D : triggeredBy(recalibration_regression OR source_outage)`. This is the single artifact the Engineer, Architect, and §15 all reference.
- **Visual spec — the 2×3 maturity grid.** A small SVG/figure: x-axis = Data reality (Fixture | Real-shadowed | Real-wired), y-axis = Pricing authority (Weight 0 | Priced). Plot each status as a cell; PRICED sits top-right, DEMO bottom-left. Annotate the diagonal arrow "the migration §15 drives." This is the front-matter hero image and it previews the ladder.
- **Test to add.** `status.invariants.test.ts`: (1) no PRICED surface imports a `*fixtures*` module; (2) every route's declared status ∈ enum; (3) census counts in the doc match the generated census (snapshot test) — so the doc can't silently go stale.

---

### §0 — Executive summary
**Panel assigned:** Auditor (claim load-bearing vs. aspirational) · Engineer (the "one method, three phases" framing) · Developer (summary ↔ code traceability) · Architect (moat decomposition) · Researcher (positioning vs. forecasting literature) · Contextual (wedge/moat sharpness) · Situational (what to claim pre-PROVEN) · Psychological (the "index not probability" promise)
**Verdict:** The summary already does the single hardest thing well — it states plainly that the GSE Score is a *ranking index, not a win probability*, which is the integrity backbone and the line that separates GSE from every "guaranteed lock" competitor. It is dense and credible but reads like an internal table of contents narrated; it lists five monetization paths and a pillar acronym before it has made the reader *feel* the one idea that makes the company fundable. Tighten it around a single spine — **"engine maturity and revenue maturity are the same ladder"** — and the summary goes from competent to magnetic.

#### Findings & ambitious upgrades
- **The Auditor —** Two phrases are doing more work than they've earned and need a falsifiable hook. "Auditable tamper-evident track record" is a strong claim — the summary should point to the mechanism (slate Merkle commitments + proof receipts, §1.1/§5) in the same breath, or a skeptic discounts it as marketing. "Deep player/team analytics (StatKing)" is currently **not** priced (`canPublishProjections=false`, §6) — the summary must not imply StatKing moves scores today; phrase it as "built, gating toward priced" so the moat claim stays honest. Recommend a one-line "what is true *today* vs. *on the ladder*" sentence so the whole summary is auto-defensible.
- **The Engineer —** "Read the board → Score the math → Gate the slate" is an excellent three-phase spine — make it the literal section skeleton and tie each phase to its numeric artifact: Read → Shin de-vig + median consensus + Market Gravity Index; Score → the 13-component confidence sum (0–100); Gate → publish ≥50 / premium ≥70 + risk flags + GSE Score multiplier. A reader who finishes §0 should be able to name the three numbers the pipeline produces. Right now the phases are named but not bound to their outputs.
- **The Developer —** The summary should carry a "method ⇒ code" anchor line so the doc is traceable: PRICE → `PRICE_PILLARS` in `gse-method-spec.ts`; confidence sum → `scoring.ts:456-464`; GSE Score → `gse-score.ts`. This makes §0 the entry point an engineer can navigate from, and it signals to a technical diligence reader that the prose maps 1:1 to shipping code (which is itself a credibility multiplier).
- **The Architect —** The moat is currently a flat list ("track record + StatKing + Agent OS"). Reframe it as a **layered defensibility stack**: (L1) proprietary *proof* asset (the tamper-evident settled-pick ledger compounds daily and cannot be back-filled by a competitor); (L2) *analytics depth* (StatKing) that plugs into that ledger; (L3) *operator leverage* (Agent OS) that scales content/ops without headcount. L1 is the durable moat because it is *time-locked* — a new entrant cannot fabricate a year of receipts. Say that explicitly; it is the strongest sentence available and it's currently implicit.
- **The Researcher —** Position GSE inside the *forecasting* tradition, not the *tipster* tradition — this is a category cue worth a lot. The summary can name the lineage in one clause: "scored and calibrated the way modern forecasting is judged (Brier/CRPS, calibration curves), with a track record kept the way superforecasting tournaments keep score." That single sentence tells a sophisticated reader you know the difference between *being confident* and *being calibrated*, which is the entire game.
- **Contextual Lead —** The wedge ("sports-betting intelligence") and the platform ambition ("sports-intelligence operating system") are both present but compete for the first sentence. Resolve the tension explicitly: *wedge now, OS later.* Lead with the wedge (it's the revenue and the urgency), then state the OS as the destination the same ladder unlocks. A reader needs to know what you sell on Monday before they care what you become in three years.
- **Situational Lead —** Pre-PROVEN, the summary should foreground *founding-rate, grandfathered-for-life* and *milestone-unlocked increases* — this is the honest, time-sensitive offer and it doubles as proof of the doctrine (you literally won't raise prices until you've earned it). Frame the current moment as "early, disciplined, climbing," with NFL-only stated up front so the multi-sport line in §17 reads as roadmap, not overreach.
- **Psychological Lead —** "It is a ranking index, NOT a win probability" is the most trust-building sentence in the document — but stated once, defensively, it can read as a disclaimer. Reframe it as a *promise and a differentiator*: "We refuse to sell you a probability we haven't earned the right to publish; until our calibration proves out, we give you a disciplined *ranking* of where the edge is — and we show you the proof." That converts a limitation into the reason to trust GSE over louder competitors. Also: open with one concrete, human sentence (the problem) before the abstraction "operating system," or the first impression is jargon.

#### Prediction-method relevance
§0 should name the *judging* methods even before the *modeling* ones, because GSE's thesis is that it is judged honestly: **Brier score / CRPS** (proper scoring rules), **calibration curves / ECE / reliability diagrams**, **CLV (closing-line value)** as the market-based truth signal, and **Wilson intervals** on hit-rate so small samples aren't oversold. The modeling families (Elo/Glicko, Dixon-Coles/Poisson, gradient boosting, ensembles) are named in §1/§3; §0's job is to promise they will only be *priced* once they beat these scoring rules through the §15 gates. That promise — "models earn the right to be priced by passing proper scoring rules out-of-sample" — is the single most fundable idea in the summary.

#### Section rewrite seeds
- **Opening paragraph, rewritten (paste-ready).** *"Sports bettors drown in confident-sounding picks and have no way to tell which source is actually good. Galaxy Sports Edge fixes that with one idea: we keep score honestly and only charge for what we've proven. Each game gets a flagship **GSE Score (0–100)** — our model's read on the edge, discounted by how provably we can stand behind it. It is a **ranking index, not a win probability**, and we say so on purpose. The wedge is sports-betting intelligence; the destination is a sports-intelligence operating system — and the same proof milestones that let us raise prices are the milestones that let our models go from 'surfaced' to 'priced.' Engine maturity and revenue maturity are one ladder. That ladder is the company."*
- **"What's true today" honesty line (new, ends §0).** *"Today (2026-06-22): NFL is live; a disciplined subset of signals is PRICED; StatKing analytics and the Edge Engine are built and gating toward priced (`priced=false`) pending calibration; MLB/NHL/GSN are scaffolded. We will not price what we have not proven."*
- **Three-phase spine, bound to outputs (new sub-block).** A compact strip: **Read the board** → fair line via Shin de-vig + median consensus → *Market Gravity Index*. **Score the math** → 13-component confidence (0–100) → grade + risk flag. **Gate the slate** → publish ≥50 / premium ≥70, GSE Score = confidence × proof-multiplier. One line each; this is the summary's backbone.
- **Moat-as-stack callout (new).** *"Moat = a time-locked proof asset. Our tamper-evident ledger of settled picks compounds every day and cannot be back-filled by a new entrant. StatKing depth and the operator Agent OS sit on top of it. You can copy our features; you cannot copy a year of receipts you didn't earn."*

---

### §1 — The GSE PRICE Method & the GSE Score
**Panel assigned:** Auditor (additive-model risk, double-count, overstatement) · Engineer (log-odds reformulation, clamp/asymmetry math) · Developer (versioning, test surface, non-double-count proof) · Architect (confidence vs. GSE-Score boundary, Edge-Engine isolation) · Researcher (calibration & de-vig state-of-the-art) · Contextual ("math you can read" positioning) · Situational (what's priced now vs. PROVEN) · Psychological (two-number cognitive load, proof multiplier as trust)
**Verdict:** §1 is the intellectual core and it is impressively concrete — PRICE maps to code, the 13-component sum is fully specified, and the GSE Score's separation of *confidence* (Read/Integrity/Context/Edge) from *provability* (Proof) is a genuinely elegant, non-double-counting design. The two real risks are (1) the **additive points model** is hard to calibrate and has subtle asymmetries (penalties vs. bonuses, the +10 baseline, clamp behavior near the rails), and (2) the **flat 0.80 floor and bucketed proof multiplier** are reasonable v1 heuristics that should be put on an explicit, gated path toward a calibrated probability. Both are fixable *within* the Model Court + calibration regime, and doing so is the difference between "clever index" and "defensible forecasting engine."

#### Findings & ambitious upgrades
- **The Auditor —** The additive sum is **structurally hard to falsify** because the 13 weights are asserted, not fit — there is no statement that the component ceilings (R +30, depth +20, Edge +25 …) were learned from settled outcomes, so a reviewer can't tell whether they're calibrated or vibes. Add a standing audit: publish, per engine version, the *realized* hit-rate and CLV-beat in each confidence decile with Wilson bands — if SOLID (65–74) doesn't out-perform LEAN out-of-sample, the weights are wrong and Model Court should block the version. Second risk: **double-counting across pillars.** Market consensus (R), Edge/pricing (E), and Cross-market (E) all read off the same book prices; line movement (C) and volatility penalty (I) both react to the same price churn. State and test the orthogonality claim, or confidence is silently over-confident exactly when books agree. Third: the doc says the GSE Score is "non-double-counting" with Proof — good — but it must *also* assert that Proof (M) and the Integrity penalties inside confidence aren't penalizing the same staleness twice (canonical/fresh appears in *both* the data-quality penalty and the P term). Confirm in `gse-score.ts`/`scoring.ts` and document the boundary.
- **The Engineer —** The additive-points model is a **linear score in raw feature space with hard clamps**; its weaknesses are exactly the ones the doc half-notices. (a) *Asymmetry*: max upside ≈ +30+20+25+15+10+4+5 = large positive vs. penalties capped at −15−20−8 = −43 — bonuses and penalties live on different scales, so "confidence" is not symmetric around a neutral game and the +10 baseline shifts the whole distribution. (b) *Clamping destroys gradient at the rails*: any game scoring >100 pre-clamp loses all discrimination at the top — two very different elite setups both read 100. (c) *Independence assumption is false*: adding correlated components double-counts. The credible evolution is a **log-odds (logit) formulation**: model `logit(p) = β0 + Σ βᵢ·xᵢ`, fit βᵢ by penalized logistic regression / gradient boosting on settled outcomes, then **map p back to a 0–100 "confidence" via a fixed, documented monotone transform** so the *surface* and *grades* are unchanged while the *internals* become calibratable and correlation-aware. Crucially this can ship **shadowed at weight 0 (R&D)** and only replace the additive sum when it beats it on out-of-sample Brier/ECE through Model Court — i.e., the reform *uses* the gate rather than bypassing it. Until then, at minimum: replace hard clamps with a soft saturator (e.g., scaled logistic squashing) to preserve top-end discrimination, and re-center so the baseline is a stated prior, not a free +10.
- **The Developer —** The non-double-count and versioning claims need to be *executable*, not prose. Add `gse-score.contract.test.ts` asserting: M ∈ [0.80,1.00]; P ∈ {0, .33, .34, .66, .67, 1.0} only (today's buckets) and `round(confidence×M)` matches the worked examples (78→78/68/62). Add a **golden-vector suite** for `scoring.ts:456-464`: a frozen set of input fixtures → expected confidence, so any weight change is a visible, reviewed diff (this is the regression spine for every future Model Court submission). Version *both* numbers independently and stamp every published pick with `{modelVersion, gseScoreVersion}` so a recompute is reproducible — the doc says "versioned, tested"; make that a passing CI artifact, not an adjective. Provide a `explainScore(pick)` dev surface that returns the per-component contributions (the basis for the user-facing "Glass Box," §10) so the math is literally inspectable.
- **The Architect —** The **boundary between `confidence` (scoring.ts) and `GSE Score` (gse-score.ts) is the best architectural decision in the doc** — confidence never sees Proof, Proof never re-touches the scoring engine, and the multiplier composes them. Protect it: Proof inputs (receipt, slate commitment, canonical+fresh) must flow *only* into `gse-score.ts`, never back into a scoring component, or the elegant separation collapses into a feedback loop. Same discipline for the **Edge Engine** (Kalshi/Elo/Poisson/ML, `priced=false`): it must remain a *sidecar* that can be surfaced and shadow-scored but cannot mutate the priced confidence until it clears §15 — keep it behind an interface (`EdgeEngineSignal` with `priced:boolean`) so "surfaced" and "priced" are a type-level distinction, not a convention. This isolation is what lets you innovate aggressively (build the boosted ensemble now) without ever risking the priced number.
- **The Researcher —** State-of-the-art is within reach and each piece plugs into the existing gates:
  - **De-vig:** the doc already uses **Shin** (good — it models insider trading and beats naive proportional de-vig). Add **Shin vs. Wilson-power vs. logarithmic** as an A/B at R&D, judged by which produces fair lines with the lowest out-of-sample CLV residual; let the winner become priced. (Real method comparison; real gate.)
  - **Calibration:** the doc cites **isotonic**. Pair it with **Platt scaling** as the small-sample fallback (isotonic overfits below ~a few hundred points), and choose between them by validation log-loss — exactly the `calibration-apply.ts` PROVEN-rung behavior in §15.
  - **Uncertainty:** add **conformal prediction** to convert the GSE Score into *honest interval coverage* ("this score's 80% band") — conformal gives distribution-free coverage guarantees, which is the most integrity-aligned uncertainty method available and a perfect fit for the doctrine.
  - **Modeling:** **Dixon-Coles/Poisson** for score/totals, **Elo/Glicko** for team strength priors, **Bayesian hierarchical** pooling for thin MLB/NHL data at launch (borrows strength across teams so a stub sport isn't pure noise), **gradient-boosted ensembles** as the priced workhorse once calibrated. Each enters at R&D, shadow-scored, Brier/CRPS-judged, Court-gated.
  - **Scoring rules:** adopt **CRPS** for continuous (totals/spreads) alongside **Brier** for binary, and **walk-forward backtesting** (never random CV — sports are temporal) as the standing evaluation harness.
- **Contextual Lead —** PRICE is a strong mnemonic and "math you can read" is the right banner — but a *bettor* doesn't experience pillars, they experience *a number and a reason*. The contextual win is to make every pillar legible at the point of use: the score card should let a user expand "why 78?" into the five PRICE contributions in plain language ("the market agrees strongly [R], you're getting a real price edge [E], and we can fully prove this pick [P]"). That turns the internal taxonomy into the product's most trust-building surface and operationalizes the brand promise.
- **Situational Lead —** Be explicit about what the GSE Score *is allowed to claim today*: pre-PROVEN, M=1.0 means "fully *provable*," not "fully *accurate*" — the multiplier rewards provability, and the confidence is an *un-calibrated ranking*. The honest framing for this launch window is "ranking + proof," and §1 should say the migration to a true probability fires at PROVEN (§15), not before. This keeps the current claims defensible and turns the limitation into the §15 story.
- **Psychological Lead —** Two numbers (confidence *and* GSE Score) riding together (`GseScoreCard`) is a **cognitive-load risk** — users will ask "which one is the real one?" Resolve it with hierarchy, not addition: lead with the **GSE Score** as the single hero number (it already contains the discount), show confidence + Edge Index as secondary "show-your-work" detail behind a tap. The proof multiplier is a *gift to trust* — when a pick is only receipt-proven (M=0.87) the score visibly drops from 78→68, and *showing that drop* ("we marked this down because we can't fully prove it yet") is more persuasive than any unqualified number. Name that micro-interaction; it is the emotional core of the product.

#### Prediction-method relevance
This is the section where the priced/gated ladder gets its teeth. Mapping, concretely:
- **Read pillar → de-vig + consensus:** Shin de-vig (priced today) sets the fair line; **median consensus across books** is more robust than mean to a single stale outlier (good call in the doc); the **Market Gravity Index** (`round(conviction×quality×100)`) is a sharp, ownable conviction metric. *Gate:* alternative de-vig methods enter at R&D and must lower out-of-sample CLV residual to become priced.
- **Edge pillar → Edge Index + Edge Engine:** `EdgeIndex = clamp(round((edgeComponentScore/25)×100),0,100)`, vanilla −110/−110 ≈ 26 — a clean, interpretable "how much edge" scalar. The independent **Edge Engine (Kalshi/Elo/Poisson/ML)** is correctly `priced=false`; it is the R&D bench. *Gate:* any Edge-Engine signal becomes priced only after settled n≥100 + non-worsening ECE + Model Court.
- **Integrity pillar → calibration + data-quality:** isotonic/Platt calibration is the mechanism that, at PROVEN, turns confidence into a real probability; the **data-quality penalty** (coverage+freshness+breadth) is the input-side guard. *Gate:* `calibration-apply.ts` may emit real probabilities only at the PROVEN rung (§15).
- **Proof pillar → the multiplier:** CLV, Wilson intervals, isotonic curves, tamper-evident receipts, slate Merkle commitments — these are the *evidence* that sets M and advances the ladder. **Conformal prediction** is the recommended addition: it gives the GSE Score a guaranteed-coverage interval the moment there's enough settled data, which is maximally on-brand.
- **Scoring/judging (cross-cutting):** Brier + CRPS + reliability diagrams + walk-forward backtests are the *referees* that decide whether any of the above earns "priced." No method becomes priced by argument; it becomes priced by beating these rules out-of-sample through Court.

#### Section rewrite seeds
- **§1.2 critique-and-evolution paragraph (paste-ready).** *"The confidence sum (`scoring.ts:456-464`) is a clamped linear score: 13 components plus a +10 baseline, summed and clamped to 0–100. This is transparent and shippable, but it has three known limitations we are explicitly managing. (1) **Asymmetry** — bonuses (up to ~+109 pre-clamp) and penalties (down to ~−43) live on different scales, and the +10 baseline shifts the distribution; we treat the baseline as a stated prior, not a free constant. (2) **Clamping** at 100 erases discrimination among elite setups; we are replacing the hard clamp with a monotone soft-saturator so top-end ranking survives. (3) **Correlation** — consensus (R), Edge (E), and cross-market (E) read the same book prices; we publish per-component orthogonality diagnostics and treat any pair with high realized correlation as a double-count to merge. The calibrated successor is a **logistic (log-odds) model**, `logit(p)=β0+Σβᵢxᵢ`, fit on settled outcomes and mapped back to the same 0–100 surface; it ships shadowed at weight 0 and replaces the additive sum only after it beats it on out-of-sample Brier and ECE through Model Court."*
- **New sub-metric — Confidence Decile Reliability (CDR).** *Definition:* for each engine version, bucket published picks into confidence deciles; CDR_d = realized hit-rate in decile d with a Wilson 95% interval; the version is "monotone-valid" iff CDR is non-decreasing across deciles within interval overlap. *Use:* a Model Court gate — a version that isn't monotone-valid on the settled sample cannot be priced. This makes "higher confidence means better" a tested property, not a hope.
- **§1.3 multiplier stress-test + migration block (paste-ready).** *"`M = 0.80 + 0.20·P` caps the proof discount at 20%. The 0.80 floor encodes a deliberate stance: even an unproven pick retains 80% of its confidence as a *ranking*. We will revisit the floor empirically — if unproven picks historically under-perform proven ones by more than 20% on CLV-beat, the floor is too generous and should drop (e.g., to 0.70). P is currently bucketed (receipt .34, commitment .33, canonical+fresh .33). We will move P to a **continuous** form — `P = w_r·receiptQuality + w_c·commitmentDepth + w_f·freshnessScore`, each ∈[0,1] — once we can fit the weights against settled CLV, so partial proof is rewarded smoothly instead of in three steps. **Migration to true probability:** at the PROVEN rung (≥100 settled + published calibration, §15), `calibration-apply.ts` begins emitting calibrated win-probabilities; the GSE Score is then re-expressed as `round(100·p_calibrated)` for proven sports, and the 'ranking index, not win probability' caveat narrows to *un*-proven sports only. Until then it remains a ranking index — by design, and by integrity."*
- **Worked-example table, expanded (new column).** Extend the existing example (confidence 78, Edge Index 64 → SOLID_PLAY/PREMIUM/MODERATE) with a *proof-state* column so the multiplier is legible:

  | Proof state | P | M | GSE Score | What we tell the user |
  |---|---|---|---|---|
  | Fully proven | 1.00 | 1.00 | **78** | "Full proof: receipt + slate commitment + canonical & fresh." |
  | Receipt only | 0.34 | 0.868 | **68** | "Marked down: we can prove the pick, not yet the full slate." |
  | Unproven / bootstrap / stale | 0.00 | 0.80 | **62** | "Ranking only — proof pending; we discounted accordingly." |
- **Test to add.** `confidence.orthogonality.test.ts` — over a fixture slate, compute pairwise correlation of the realized component contributions; assert no pair tagged "independent" in `gse-method-spec.ts` exceeds a documented threshold (flag for Court review if it does). Plus `scoring.golden.test.ts` freezing input→confidence vectors so every weight change is a reviewed diff.

---

> **Data & Engine cluster — method note / ground-truth correction (read first).** The §2–§5 reviews were written against the *actual* repository at `C:\Users\Garrett\Documents\Claude\Projects\AI Sports`, not only the document. Several engines the master doc lists as existing files are **aspirational** — they are not present in `packages/prediction-engine/src/` today. Specifically: `clv.ts`, `clv-capture.ts`, `proof-of-record.ts`, `pick-proof-receipt.ts`, `slate-commitment.ts`, `shin-devig.ts`, `market-read.ts`, `consensus.ts`, `composite-score.ts`, `edge-engine.ts`, `team-rates.ts`, `elo-estimator.ts`, `ml-estimator.ts`, `opponent-adjusted.ts`, `calibration-apply.ts`, `probability-calibration.ts`, `conviction-tier.ts`, `gse-method-spec.ts`, `gse-score.ts`, `integrity-ledger.ts`, `signal-lineage.ts` were **not found**. What *does* exist and is load-bearing: `scoring.ts`, `game-context.ts`, `constants.ts`, `readiness.ts`, `platform-config.ts`, `settlement.ts`, `source-registry.ts`, `evidence-readiness-matrix.ts`, `signal-snapshot.ts`, `pick-memory.ts`, `market-twin.ts`, `kelly.ts`, `poisson.ts`; in data-ingestion: `normalizer.ts`, `odds-api-client.ts`, `config.ts`, `context-enrichment.ts`; in the pipeline package: `process-sport.ts`, `source-snapshot.ts`; in the app: `lib/performance/public-performance-policy.ts`, `lib/intelligence-graph/model-court/prompts.ts`. This advisory therefore distinguishes **"harden what exists"** from **"build what's claimed"** at every turn, because the single biggest integrity risk in this cluster is the **doc-vs-code gap itself** (the Auditor's #1 finding). MODEL_VERSION is `v5.0.0`; the confidence sum is a flat additive of 13 components plus a hardcoded `+10` baseline; `fairProbability` and `trueEvScore` are hardcoded `null` in `FactorBreakdown`; "edge" is derived purely from vig removal, not from an independent model. *(Per the PART I reconciliation note, several "not found locally" results are expected to be branch/truncation artifacts — diff against `research/proven-edge` before concluding a faculty is missing.)*

### §2 — Data ingestion & sources

**Panel assigned:** Auditor (rights/freshness falsifiability) · Engineer (vig math, de-noising) · Developer (adapter contracts, failover code) · Architect (source boundary, registry as gate) · Researcher (consensus/de-vig methods) · Contextual (which feed unlocks which signal) · Situational (launch on one priced feed) · Psychological (operator trust in "real data only").

**Verdict:** The ingestion spine is narrow but genuinely disciplined: one priced feed (The Odds API), a clean `DataNormalizer`, a `SOURCE_REGISTRY` that hard-gates production-evidence writes, and a `recordSourceSnapshot` that hashes every raw payload before it touches scoring. The opportunity is enormous because the registry, the evidence-readiness matrix, and the shadow-evidence plumbing already model a *much* larger data estate than is wired in — the value is in lighting up the next 2–3 feeds **through the existing gate**, not in inventing new governance.

#### Findings & ambitious upgrades

**Auditor —** The headline risk is overstatement: §2 lists nflverse (25+ datasets), Kalshi, Reddit, Sleeper, SportsDataIO/FantasyData, MoneyPuck/Lahman as if ingested, but only `the-odds-api` and `schedule-internal` have `canWriteProductionEvidence: true` in `source-registry.ts`; nflverse is not even an entry. **Upgrade:** add every "LIVE-but-not-wired" feed as an explicit `SHADOW_APPROVED` or `RESEARCH_ONLY` registry row with `canInfluencePublicScore:false`, so the doc's claims are *forced* to match the gate — the registry becomes the single falsifiable source of truth for "what data actually moves a pick." Add a CI test that fails if a provider is referenced in any `lib/**` loader but absent from `SOURCE_REGISTRY`. Second falsifiability gap: `validateFreshness` uses a **1-hour** `FRESHNESS_THRESHOLD_MS` (config.ts), but §2 advertises warn=120min/stale=240min and the registry SLA is **30min** — three different freshness numbers across three files. Reconcile to one `FreshnessPolicy` constant exported from the engine.

**Engineer —** De-vig is currently naive proportional normalization (`removeVig` = `prob / (homeProb+awayProb)`), which is biased on lopsided markets (it inflates favorites). The doc *names* Shin de-vig (`shin-devig.ts`) but the file doesn't exist. **Upgrade:** implement Shin's (1992) method and the additive/Wadhwani logarithmic method as selectable de-vig strategies in a real `devig.ts`; on a 2-way market Shin estimates the insider-trading proportion `z` and removes it, materially changing fair probabilities on heavy favorites where GSE's moneyline `>=0.58` gate fires most. Also: consensus is computed as a raw *count* of books on a side (`homeFavoredCount / spreads.length`), which weights a stale recreational book equal to a sharp book. **Upgrade:** weight each book by a `bookSharpness` coefficient (Pinnacle/Circa-class > retail) and compute a **vig-removed median** rather than mean to resist outlier books.

**Developer —** `OddsApiClient` has no retry, no backoff, no timeout, no circuit breaker — a single 429/5xx throws and `processSport` marks the whole sport `FAILED`. The doc's `odds-failover`/`fetch-failover` don't exist as code. **Upgrade:** wrap `globalThis.fetch` with a typed `resilientFetch(url, {retries, backoffMs, timeoutMs, budgetGuard})`; on `x-requests-remaining` crossing a floor, short-circuit to "served-from-last-snapshot" mode reading the most recent `SourceSnapshot` (which is already hashed and stored) instead of failing. This makes the snapshot store double as a warm cache and a provenance log. Add per-provider adapter conformance tests against recorded fixtures.

**Architect —** The boundary is clean (`data-ingestion` normalizes, `prediction-engine` scores, `ingestion-pipeline` orchestrates) and `recordSourceSnapshot` correctly *asserts* `assertSourceCanWriteProductionEvidence(provider)` before any write — a real architectural seam. **Upgrade:** make that seam universal: every loader that produces an `EvidenceRecord` should route through a single `ingestEvidence(provider, category, payload)` choke point that (a) checks the registry, (b) snapshots+hashes, (c) stamps freshness/trust, (d) returns a typed record. Today shadow evidence is hand-built in `process-sport.ts` (`buildMissingContextEvidence`) — centralize it so nflverse/Sleeper data flows through the *same* door as odds.

**Researcher —** Real methods to adopt now, all rights-clean: (1) **Shin de-vig** and **power/log de-vig** (above) for fair probabilities; (2) **opening-to-close line-movement microstructure** — track per-book first-seen vs current to build a sharp-money proxy (the doc's `market.lineMovement` evidence factor already exists with `maxAgeMs: 2h`); (3) **nflverse `play_by_play` → EPA/play and success-rate** (CC-BY-4.0, attribution-only) as *process-grade* opponent-adjusted team rates; (4) **Massey-Peabody / SRS-style ratings** computable purely from settled scores GSE already ingests. **Upgrade:** stand up an offline notebook (registry class `RESEARCH_ONLY`) that produces these as `SHADOW_ONLY` evidence to accumulate calibration history before any are priced.

**Contextual —** GSE's whole pitch is "math you can read / intelligence not gambling," and the strongest contextual unlock is **provenance as product**: the `SourceSnapshot` hash + the `signal-lineage` concept means GSE can show *where every number came from* — a differentiator PFF/Action Network don't expose. **Upgrade:** wire a "source-expansion map" (below) so each new feed is sold as unlocking a *named* reader-visible signal (e.g., "injuries feed → Player Availability factor goes ACTIVE"), making data investment legible to both operator and subscriber.

**Situational —** Launch posture is correct: ship on the one PAID_LICENSED feed, keep everything else shadow. The timing risk is cost — The Odds API quota is the only thing standing between GSE and a dark board. **Upgrade:** the `cost-governor free-first` discipline should be enforced *in code* via the `x-requests-used`/`x-requests-remaining` headers the client already reads but currently discards into a log line; add a `resource-intelligence` ledger row per cycle and a hard "freeze enrichment, serve snapshot" mode at <10% quota so a launch-day traffic spike can't burn the month's budget.

**Psychological —** Operator trust hinges on never being surprised by stale or fabricated data. The matrix's `failureMode`/`failureHorizon` fields (e.g., "Refresh drift or provider quota exhaustion makes every downstream signal stale," TWO_WEEKS) are a *trust gift* — they pre-state how each feed will betray you. **Upgrade:** surface a single "Board Health" badge (FRESH/AGING/STALE/KILLED) computed from the freshness policy + quota + last successful `IngestionRun`, so the operator sees one honest light instead of reading logs. Pair with the kill-switch already implied by `canExposePublicPicks`.

#### Prediction-method relevance
- **Shin de-vig / logarithmic de-vig** → feeds the **PRICED** core: replaces `removeVig` to produce less-biased fair probabilities, directly improving the existing Edge component and the `>=0.58` ML gate. Priced now (it's a better version of an already-priced calc, not a new weight) but should pass a Model Court "non-worsening" check against current de-vig on settled picks.
- **nflverse EPA/play & success rate** → **SHADOW** first (`team.pace`/`model.independentFairProbability` rows, `canContributeWhenActive:false`), accumulating ≥100 settled samples before any Model Court priced proposal. Respects `canPublishProjections=false` because it ships as *process-grade context*, never a published projection.
- **Line-movement sharp proxy** → already a priced-eligible factor (`market.lineMovement`); the upgrade is data quality (per-book first-seen), not a new gate.
- **SRS/Massey ratings from settled scores** → **SHADOW** independent-rating candidate for `model.independentFairProbability`; the cleanest path to GSE's first non-market signal because it needs zero new rights.

#### Section rewrite seeds

**Paragraph rewrite (§2 opener):**
> Galaxy Sports Edge ingests from exactly one priced production feed today — The Odds API (h2h/spreads/totals across 7 leagues, ~7 books) — and treats everything else as shadow or research until it earns its way in. Every external payload is hashed (SHA-256 over a stably-serialized body) into an immutable `SourceSnapshot` *before* it can influence a number, and no provider may write production evidence unless `SOURCE_REGISTRY` marks it `canWriteProductionEvidence`. nflverse, Sleeper, and DFS feeds are catalogued and collecting in shadow mode; they do not move a single confidence point until they clear calibration and Model Court. This is the data contract: rights-cleared, freshness-stamped, provenance-hashed, gate-enforced.

**New sub-system definition — `FreshnessPolicy` (single source of truth):**
```
FreshnessPolicy = {
  primaryOddsSlaMin: 30,        // registry SLA for the-odds-api
  warnAfterMin: 120,            // board shows AGING
  staleAfterMin: 240,           // board KILLS public picks
  hardRejectAfterMin: 60        // normalizer refuses to score (today's 1h)
}  // reconcile config.ts FRESHNESS_THRESHOLD_MS + registry + doc into ONE export
```

**New table column for the source table —** add `unlocksSignal` (the reader-visible factor that goes ACTIVE when this source is priced) and `priceState` (PRICED / SHADOW / RESEARCH / BLOCKED), so the source table and the evidence-readiness matrix are joinable on intent.

**Data-quality check to add —** a "consensus integrity" guard: reject any book whose quoted line deviates > N median-absolute-deviations from the book-weighted median (stale/typo books), and log the rejection as a `GameSignal` so the operator can see *which* book was excluded and why.

---

### §3 — Prediction / scoring engine

**Panel assigned:** Auditor (calibration honesty, null stubs) · Engineer (additive sum, normalization, Poisson) · Developer (estimator interfaces, drift tests) · Architect (priced/shadow separation) · Researcher (Elo/Glicko, Dixon-Coles, GBM, conformal) · Contextual ("ranking index not win prob") · Situational (what to price first) · Psychological (the "70% tier," reasoning text).

**Verdict:** `scoring.ts` + `game-context.ts` are a competent, *honest* market-reader: 13 transparent components, each clamped, each emitting a human-readable `FactorDetail`, summed into a 0–100 confidence that GSE correctly frames as a **ranking index, not a win probability**. The opportunity is the single largest in the whole platform: GSE has built an elaborate *gating cathedral* (`evidence-readiness-matrix`, `readiness`, shadow evidence) around an engine that currently has **zero independent model signal** — every number ultimately derives from the market. Lighting up the first real independent estimator, through the gate that already exists, is the highest-leverage move in this cluster.

#### Findings & ambitious upgrades

**Auditor —** Three honesty issues. (1) `fairProbability: null` and `trueEvScore: null` are hardcoded in every `FactorBreakdown` — the engine *advertises* fields it never fills, which is a latent overstatement if any surface renders them. Either populate from a real model or delete the fields until earned. (2) The `+10` baseline added to every confidence sum (`scoring.ts` lines ~345, ~524, ~664) is an undocumented floor that makes a near-zero-signal pick read as 10/100 — state it or remove it. (3) Confidence is presented on a 0–100 scale that *looks like* a probability but is a weighted-points sum; the `confidenceDisplayMode` gate exists precisely to manage this — make sure no public surface ever prints "confidence 72" next to odds without the "ranking index, not win probability" caveat. **Upgrade:** add a `model-limitations` assertion test that fails if any null-stubbed field reaches a public DTO.

**Engineer —** The additive sum has a structural flaw: components are *independent additive*, so correlated signals double-count (line-movement + cross-market + uncertainty all read the same sharp-money event from three angles and can stack to +19 / −19). **Upgrade:** move from a flat sum to a **logistic combination** once calibration is live — `confidence = σ(Σ wᵢ·featureᵢ)` calibrated against settled outcomes — which naturally bounds and de-correlates. Until then, add a covariance-aware cap: when line-movement, cross-market, and uncertainty all fire on the same axis, collapse them to a single "market-direction" term. The `poisson.ts` and `kelly.ts` files exist but are not wired into `scoreGame` — `poisson.ts` is the latent engine for a Dixon-Coles totals model; `kelly.ts` (quarter-Kelly, 3u cap) is correctly *not* surfaced (brand-safety), keep it engine-only.

**Developer —** There is no estimator interface — `game-context.ts` is a pile of free functions. To go from one model to several (Elo, Poisson, GBM) you need a contract. **Upgrade:** define `interface Estimator { id; version; estimate(game): {fairProbHome; interval?; provenance}; priced: boolean }` and a registry of estimators that the matrix's `model.independentFairProbability` row reads from. Each estimator ships with **drift-guard tests** (the doc names them) — golden-master fixtures + a tolerance on output distribution so a refactor can't silently move probabilities. This is the DX that makes the priced/shadow ladder mechanically enforceable rather than convention.

**Architect —** The priced/shadow separation is *already modeled* beautifully in `evidence-readiness-matrix.ts`: `model.independentFairProbability` and `model.trueEv` are defined as factors with `canContributeWhenActive:false`, `minSampleSize: 30/100`, and an explicit dependency ("True EV stays blocked until independent fair probability is active"). **Upgrade:** wire the estimator registry *to* this matrix so that the matrix is the runtime authority on whether an estimator's output can enter the sum — i.e., an estimator publishes to scoring only when its matrix row is `ACTIVE`. This turns the matrix from a read-only dashboard into the actual control plane, and it means `priced=false` is enforced by data, not by a developer remembering to comment out a line.

**Researcher —** Sequence the estimators (this is the special ask). The single highest-leverage estimator to price first is **opponent-adjusted EPA/play team ratings** for NFL, because (a) the data is rights-clean (nflverse CC-BY-4.0), (b) it produces a genuinely *independent* fair spread/total to compare against the market, unlocking the `model.independentFairProbability` row, and (c) it's the prerequisite the matrix names for `model.trueEv`. Recommended ladder:
  1. **Elo / Glicko-2** baseline rating from settled scores (zero new data, fastest to a backtest, well-calibrated reference).
  2. **Opponent-adjusted EPA/play** (nflverse) → independent power rating → fair spread.
  3. **Dixon-Coles / bivariate Poisson** for totals and correct-score-style markets (use the existing `poisson.ts`), with the Dixon-Coles low-score correlation correction.
  4. **Gradient-boosted trees (GBM)** over the assembled features (the doc's `ml-estimator.ts` "honesty gate") — only after 1–3 give a feature set with signal.
  5. **Conformal prediction intervals** wrapped around whichever estimator is priced, to ship *honest uncertainty bands* instead of point confidence — a perfect fit for GSE's "calibrated, not certain" brand.

**Contextual —** "Ranking index, not win probability" is the right frame and the engine honors it — but the market will *demand* a win-probability number eventually. **Upgrade:** keep confidence as the ranking index for ordering, and introduce a *separate, gated* `calibratedWinProb` that only appears once isotonic calibration (PAVA) on ≥100 settled picks produces a non-worsening ECE. This cleanly separates the always-on ordering signal from the earned probability claim, matching §1's "13-component sum + GSE Score" and §0's "GSE Score = confidence × proof multiplier."

**Situational —** Do **not** price any estimator before the calibration sample exists; the launch engine should remain the market-reader, which is defensible and shippable today. The right sequencing is: ship market-reader → collect settled `PickSignalSnapshot`s → run Elo in shadow in parallel → first Model Court proposal at ≥100 settled samples. The `OUTCOME_LEARNING_ENABLED` → `FEATURED_PICK_PROMOTION_ENABLED` ladder already encodes this; don't jump it.

**Psychological —** The `reasoning`/`reasoningShort` strings are the product's voice and they're well-built (consensus %, fair value, edge, context clauses). Two risks: (1) the "70% tier" / `conviction-tier.ts` concept (named, not present) is exactly the kind of number that becomes a certainty claim — gate it behind calibration and never let it print as "70% to win." (2) The reasoning text asserts "Model estimates +X% edge" where the edge is vig-removal, not a model — soften to "pricing edge vs market consensus" until a real model backs it. **Upgrade:** add the banned-certainty linter (it exists in `compliance-scanner`) to the reasoning builders as a unit test, so no scoring change can introduce "lock," "guaranteed," or an unhedged probability.

#### Prediction-method relevance
- **Elo / Glicko-2** → first **SHADOW** estimator feeding `model.independentFairProbability`; cheapest path off "market-only." Model Court demands: out-of-sample (forward-chained) calibration over ≥100 settled NFL games, Brier ≤ market-implied baseline, no ECE regression.
- **Opponent-adjusted EPA/play (nflverse)** → **SHADOW → priced** independent rating; the special-ask "single highest-leverage" pick. Court demands: backtest on held-out weeks, reliability diagram, and proof the EPA rating adds *incremental* AUC over Elo (not just correlation).
- **Dixon-Coles / bivariate Poisson** (`poisson.ts`) → **SHADOW** totals/scoreline estimator; Court demands the low-score correlation term be fit, not assumed, and CRPS scoring on totals.
- **Gradient boosting (GBM)** → **R&D** until features exist; Court demands SHAP-style attribution so the "math you can read" promise survives a black-box model, plus a monotonicity check on key features.
- **Conformal intervals** → wraps the *first priced* estimator; converts point confidence into calibrated coverage (e.g., 80% interval covers 80%), the most brand-aligned uncertainty method available.

#### Section rewrite seeds

**Paragraph rewrite (§3 honesty preamble):**
> Today GSE's confidence is a transparent, market-derived ranking index: thirteen clamped components — consensus, market depth, pricing edge, line movement, rest, schedule density, ATS/H2H/venue form (when canonical history is unlocked), cross-market agreement, and conflict penalties — summed and bounded to 0–100. It is deliberately **not** a win probability, and the engine carries zero independent model signal: every number derives from the market it reads. The roadmap to an independent probability is gated, not assumed — an Elo baseline and opponent-adjusted EPA ratings accumulate in shadow until ≥100 settled picks let isotonic calibration produce a non-worsening ECE, at which point Model Court may admit `model.independentFairProbability` to the sum.

**New metric definition — `SignalCorrelationCap`:** before summing, group {lineMovement, crossMarket, uncertainty} as a single "market-direction" cluster and cap their joint contribution at `±LINE_MOVEMENT_COMPONENT_MAX`, preventing one sharp-money event from being counted three times.

**New `FactorBreakdown` discipline —** replace `fairProbability: null` / `trueEvScore: null` with `fairProbability?: {value; estimatorId; estimatorVersion; matrixStatus}` populated **only** when the estimator's matrix row is `ACTIVE`; a CI test asserts the field is absent whenever status ≠ ACTIVE.

**Drift-guard test to add —** `estimator-drift.test.ts`: for each registered estimator, run it over a frozen fixture slate and assert output fair-probabilities stay within ε of a checked-in golden file; fail the build on drift so refactors can't silently move priced numbers.

---

### §4 — Pipeline, workers & workflows

**Panel assigned:** Auditor (idempotency, partial-failure honesty) · Engineer (per-game cost, batch upserts) · Developer (replay, observability, tracing) · Architect (event-sourcing, golden path) · Researcher (workflow/idempotency patterns) · Contextual (30-min cadence vs game clock) · Situational (settlement timing) · Psychological (operator confidence in "it ran").

**Verdict:** `process-sport.ts` is the real, single-source-of-truth golden path and it's well-disciplined — `IngestionRun` records bracket every cycle, `isBootstrap` provenance is derived once and propagated immutably, snapshots and pick-signal-snapshots are non-fatal and idempotent (`update:{}`), and settlement is correctly *always-on* regardless of bootstrap mode. The opportunity is observability and replay: today the pipeline is a `for`-loop with `console.log`s and N+1 DB writes per game; turning it into a traced, idempotent, replayable reliability story is what makes the "14 workflows" claim credible and lets GSE debug a bad slate without re-hitting the paid API.

#### Findings & ambitious upgrades

**Auditor —** Partial-failure honesty is the gap. `processSport` catches everything and returns `status:"failed"`, but enrichment failures, snapshot failures, and per-pick snapshot failures are swallowed as `console.warn` and the run can still report `SUCCESS` with silently-degraded data. **Upgrade:** add a structured `degradations[]` array to `IngestionRun` (e.g., `{stage:"enrichment", gameId, reason}`) so a "successful" run that scored picks on missing context is *auditable*, not invisible. This is the difference between "it ran" and "it ran correctly."

**Engineer —** The pipeline does per-game and per-odds `await db.x.create/upsert` inside loops — for a full NFL+NCAAF Saturday this is hundreds of sequential round-trips and the dominant latency cost. **Upgrade:** batch odds inserts with `createMany`, batch game upserts, and parallelize the per-game enrichment with a bounded concurrency pool (e.g., 5). Also: `getOdds` is fetched once per sport but `getScores(sport, 2)` in settlement re-scans 2 days every cycle — cache settled game IDs to avoid re-grading already-final games.

**Developer —** There is no trace ID and no replay. The doc's "event-sourced workflow-event-store" is not in this package's pipeline. **Upgrade:** stamp every cycle with a `traceId` (already have `run.id` — promote it to a propagated context) and log structured JSON events (`stage`, `sport`, `gameId`, `durationMs`, `outcome`) so a single cycle is reconstructable. Because `SourceSnapshot` already stores the *exact hashed raw payload*, GSE can build a **replay harness**: `replayRun(runId)` re-runs normalize→enrich→score against the stored snapshot with zero API cost — invaluable for reproducing a scoring bug or A/B-ing an estimator on real historical input.

**Architect —** The bootstrap→canonical ladder (`PUBLIC_PICKS_ENABLED` → `CANONICAL_HISTORY_ENABLED` → `DERIVED_MODEL_HISTORY_ENABLED` → `OUTCOME_LEARNING_ENABLED` → `FEATURED_PICK_PROMOTION_ENABLED` → `PERFORMANCE_STATS_ENABLED`) is the platform's spine and `readiness.ts` enforces it cleanly with `canApplyCalibrationAdjustments:false` as a hard constant — excellent. **Upgrade:** make the ladder *visible* as a single `/ops/readiness` artifact that renders each gate's state, the env flag that flips it, and the prerequisite that must be true first — turning six booleans into a legible maturity story. Idempotency: the pick upsert is keyed `[gameId, pickType]` (good), but odds are `create`d unconditionally every cycle — add a natural key or a per-run dedupe so a retried cycle can't double-insert odds rows.

**Researcher —** Adopt three standard patterns: (1) **idempotency keys** per (runId, sport, stage) so retries are safe; (2) **the saga/compensation pattern** for the settlement→learning→game-log chain so a half-settled game is recoverable; (3) **outbox pattern** for any external action (the doc notes "external actions need approval") so the workflow engine and the side-effect are transactionally consistent. The "golden path trace" (special ask) is best expressed as **OpenTelemetry spans**: one root span per cycle, child spans per sport per stage, with the snapshot hash as a span attribute — instant flame-graph of where a slow Saturday spends its time.

**Contextual —** The 30-minute cadence is right for pre-game line movement but blind to the game clock — picks should freeze at kickoff (the proof layer depends on pre-kickoff commitment). **Upgrade:** the pipeline should compute "minutes to commence" per game and stop refreshing a pick's *line* once inside the pre-kickoff window, so the published number matches the committed number. This directly serves §5's pre-kickoff receipt integrity.

**Situational —** Settlement timing is the silent risk: `getScores(sport, 2)` runs in the same loop as refresh, so settlement is coupled to the refresh cadence and a missed cycle delays grading. **Upgrade:** split settlement onto its own cron (the doc lists `settle-picks` as a backfill cron — make it primary), decoupled from odds refresh, so results land promptly even if odds refresh is throttled by quota.

**Psychological —** Operators need to *trust that it ran*. Right now confidence comes from reading `console.log` lines. **Upgrade:** every cycle should write one `WorkerHeartbeat` row (lastRunAt, sportsProcessed, picksGenerated, degradations, quotaRemaining) that powers a single green/amber/red operator badge. The 14 workflows become a reliability story when each one reports a heartbeat and the operator sees "14/14 healthy, last run 6 min ago" instead of inferring health from absence of errors.

#### Prediction-method relevance
- **Replay harness over `SourceSnapshot`** → the enabling infrastructure for *all* shadow-estimator backtests: Elo/EPA/Poisson candidates can be evaluated against real historical odds payloads at zero API cost, producing the out-of-sample evidence Model Court demands before pricing. This is arguably the highest-ROI engineering move in the cluster because it unblocks every §3 estimator's calibration evidence.
- **Forward-chained (walk-forward) evaluation** in the pipeline → ensures any priced estimator's backtest never peeks at future games, the correct cross-validation discipline for time-series sports data.
- **Pre-kickoff line freeze** → prerequisite for honest CLV and receipt integrity (§5).

#### Section rewrite seeds

**Paragraph rewrite (§4 golden path):**
> The golden path is one function — `processSport()` — shared by the scheduled worker and the admin trigger so behavior is identical everywhere. Each cycle opens an `IngestionRun`, fetches odds, hashes the raw payload into an immutable `SourceSnapshot`, validates freshness, upserts games and odds, enriches context, scores via the engine, upserts picks keyed `[gameId, pickType]`, and captures a once-only `PickSignalSnapshot` per pick. Bootstrap provenance is derived a single time per cycle and propagated immutably; snapshot and enrichment failures degrade gracefully and are recorded, never thrown. Settlement is always-on — real outcomes are source truth and are graded regardless of maturity mode.

**New sub-system definition — `replayRun(runId)`:** re-execute normalize→enrich→score against the stored `SourceSnapshot` for a run, writing results to a shadow table; enables zero-cost reproduction of any historical cycle and A/B evaluation of candidate estimators on real inputs.

**New table column for the workflow registry —** add `heartbeatStatus` (HEALTHY/STALE/FAILED), `lastRunAt`, and `lastDegradations` so the 14 workflows render as a live reliability grid.

**Observability check to add —** assert every `IngestionRun` that reports `SUCCESS` has either zero degradations or a populated `degradations[]`; fail an ops check if a run is `SUCCESS` while `picksGenerated=0` and `events>0` (silent scoring collapse).

---

### §5 — Proof, calibration & integrity

**Panel assigned:** Auditor (tamper-evidence, claim falsifiability) · Engineer (hashing, Merkle, scoring rules) · Developer (verifiable-receipt UX surface) · Architect (append-only ledger, lineage) · Researcher (Brier/log-loss/CRPS, PAVA, reliability) · Contextual (proof as the brand moat) · Situational (when gates open) · Psychological (public trust, viral verifiability).

**Verdict:** This is GSE's crown jewel *in concept* and its biggest doc-vs-code gap *in fact*. What exists and is real: `recordSourceSnapshot` (SHA-256 over stable-stringified payloads), `evidence-readiness-matrix` (the integrity control plane), `readiness.ts` with the hard `canApplyCalibrationAdjustments:false` gate, `public-performance-policy.ts` (refuses to show win rates until ≥ canonical sample + non-bootstrap), and the Model Court *prompts*. What's claimed but absent: `proof-of-record`/Merkle, `pick-proof-receipt`, `slate-commitment`, `clv`/`clv-capture`, `probability-calibration` (PAVA/Brier/ECE), `integrity-ledger`, `signal-lineage` as code. The opportunity is to build the *thin, real* version of the proof layer and make it a public, verifiable, viral trust artifact — the one thing competitors structurally cannot copy without rebuilding their integrity from scratch.

#### Findings & ambitious upgrades

**Auditor —** The integrity *doctrine* is strong but currently rests on one hash (`payloadHash` on `SourceSnapshot`) and policy gates — there is no per-pick tamper-evident receipt and no Merkle commitment in code, so "tamper-evident, cherry-pick-proof" is presently a *claim*, not a guarantee. **Upgrade:** ship the minimum real artifact: at pick publication, hash the canonical pick payload (selection, line, confidence, modelVersion, generatedAt) into a `PickProofReceipt.sha256` *before kickoff*, and at slate close compute a Merkle root over the day's receipt hashes + a fixed count, stored append-only. This makes "we didn't change the pick after the fact" and "we didn't hide losers" *verifiable*, not asserted — and it's a few hundred lines on top of the hashing you already have.

**Engineer —** The hashing primitive is correct (stable key-sorted JSON → SHA-256), which is exactly what Merkle inclusion proofs need. **Upgrade:** add `merkleRoot(leaves)`, `inclusionProof(leaf, leaves)`, and `verify(leaf, proof, root)` as pure functions with exhaustive tests (empty set, single leaf, odd leaf count duplication, tamper detection). For calibration, implement the scoring-rule trio the brand needs: **Brier score**, **log-loss**, and **CRPS** (for spread/total distributional picks), plus **ECE** and a **reliability curve** via **PAVA isotonic regression** — all pure, all testable, all the doc names them. These are the numbers that let GSE say "calibrated" with receipts.

**Developer —** The public proof surface is the conversion engine and it doesn't exist yet. **Upgrade:** build `/proof/[receiptId]` — a page that takes a receipt hash, shows the committed pick payload, the Merkle root it belongs to, the inclusion proof, and a **client-side verify button** that re-hashes in the browser and shows a green check. Ship a tiny `verify.js` (or even a documented `openssl`/`sha256sum` recipe) so a skeptic can verify *independently of GSE's servers* — that's what makes it viral and what makes "don't trust, verify" literally true. Gate the numeric performance behind `public-performance-policy` (already built) so the proof surface shows *commitments* always but *win rates* only after the sample gate.

**Architect —** The append-only `integrity-ledger` and `signal-lineage` are described but absent; the matrix is the closest real thing. **Upgrade:** make the ledger real as an append-only `IntegrityEvent` table (eventType, payloadHash, prevHash, createdAt) forming a hash chain — every model-version bump, every Model Court verdict, every calibration apply/deny appends a tamper-evident link. Wire `signal-lineage` to the data already in `process-sport.ts`: each factor in `FactorBreakdown` should carry `{sourceTier, rights, freshnessMinutes, publicSafe}` derived from the registry + matrix, so a per-pick "lineage" view can prove every number's provenance. This is the structural moat: an auditable chain from raw hashed payload → factor → published pick → settled outcome.

**Researcher —** Adopt, in order: (1) **PAVA isotonic calibration** (monotone, non-parametric, the right tool for mapping ranking-index → probability) activating only at sample ≥100 with non-worsening ECE — exactly as `calibration-apply.ts` is *specified* to behave; (2) **reliability diagrams** with **Wilson score intervals** on each bin (the doc names `wilsonInterval` in `model-limitations`) so small bins show honest error bars; (3) **proper scoring rules** Brier/log-loss/CRPS reported per model version; (4) **Murphy decomposition** of the Brier score (reliability − resolution + uncertainty) to *prove* whether GSE's edge is calibration or discrimination — a sophisticated, defensible public claim. (5) **CLV (closing-line value)** as the leading indicator: capture each pick's line at commit and the closing line, report beat-rate and average CLV — CLV is the most respected proof-of-skill in sports analytics and is computable today from the odds GSE already stores.

**Contextual —** Proof *is* the product wedge. Every competitor shows a win rate; almost none show *cryptographic commitment + independent verifiability + calibration with proper scoring rules*. **Upgrade:** position the proof layer as "the receipt for every call" — a public, permalinkable, independently-verifiable artifact per pick and per slate. This is what lets GSE charge on a "proof-gated pricing ladder" (§9) with a straight face: you're not paying for picks, you're paying for *verified* picks.

**Situational —** Sequencing matters: ship **commitment** (receipts + slate Merkle root + CLV capture) *at launch* because it needs no sample, and it immediately makes the integrity claim true. Open the **calibration/scoring-rule** surface (Brier/log-loss/CRPS, reliability diagram) *only when the gates open* (`PERFORMANCE_STATS_ENABLED` + ≥ canonical sample) — `public-performance-policy.ts` already enforces this exact discipline; extend it to also gate the reliability diagram. Never show a calibration curve on 12 settled picks.

**Psychological —** Verifiability converts skeptics; *unverifiable* proof claims do the opposite and invite "where's the receipt?" backlash. **Upgrade:** the client-side verify button is a psychological masterstroke — it transfers trust from "believe GSE" to "check it yourself," which is precisely the posture a credibility-first brand wants. Pair every public win-rate with the always-on `"Past performance does not guarantee future results"` line `public-performance-policy.ts` already returns, and never let a single certainty word near the proof surface (run the compliance scanner on it).

#### Prediction-method relevance
- **PAVA isotonic calibration** → the gated mapping from confidence ranking-index → `calibratedWinProb`; activates at ≥100 settled, non-worsening ECE, requires Model Court sign-off. This is the bridge from "ranking index" (§3) to an earned probability claim.
- **Brier / log-loss / CRPS + Murphy decomposition** → the public scoring-rule report that proves calibration *and* resolution; CRPS specifically scores distributional spread/total picks the Poisson model would produce.
- **CLV capture** → leading-indicator proof of skill, computable now from stored odds; the most respected metric in the field and fully brand-safe (it's about price, not certainty).
- **Merkle commitment + inclusion proofs** → not a prediction method but the cryptographic substrate that makes every prediction *auditable*; underpins the entire priced/gated ladder's credibility.
- **Wilson intervals on reliability bins** → honest small-sample error bars so the reliability diagram never overclaims.

#### Section rewrite seeds

**Paragraph rewrite (§5 proof promise):**
> Galaxy Sports Edge commits before it claims. Every pick is hashed into a tamper-evident `PickProofReceipt` *before kickoff*; every day's slate is sealed under a Merkle root over a fixed count of receipts, so we can prove — to anyone, without trusting our servers — both that a call was never altered after the fact and that no loser was quietly hidden. When enough calls settle, and only then, we publish calibration with proper scoring rules (Brier, log-loss, CRPS) and a reliability diagram with Wilson-interval error bars, alongside closing-line value as our leading proof of skill. Don't trust the win rate — verify the receipt.

**New metric/sub-system definition — `ProofReceipt` + `SlateCommitment`:**
```
PickProofReceipt = { pickId, payloadHash: sha256(canonicalPick), committedAt(<commence), modelVersion }
SlateCommitment  = { date, sport, merkleRoot, leafCount, sealedAt(<firstCommence) }
verify(receipt, inclusionProof, merkleRoot) -> boolean   // pure, client-runnable
```

**New table column for the public proof surface —** add `clvBeat` (bool), `avgClvPct`, `brier`, `logLoss`, `crps`, `eceBin` per published cohort — rendered only when `public-performance-policy` returns `allowed` and sample gate is met.

**Reliability-diagram visual spec —** x-axis = predicted (calibrated) probability bin (deciles), y-axis = observed frequency, 45° identity line, each point a dot with a vertical **Wilson 95% interval**, bin count annotated; a perfectly calibrated model hugs the diagonal. Show the **Murphy decomposition** (reliability / resolution / uncertainty) as a caption so the curve *explains itself*.

**Integrity check to add —** `proof-chain.test.ts`: assert that recomputing the Merkle root from stored receipts equals the sealed root for every slate; assert that mutating any single pick payload breaks its inclusion proof; assert no `SlateCommitment.sealedAt` is later than that slate's first `commenceTime` (pre-kickoff guarantee).

---

### Top 6 moves for the Data & Engine cluster

1. **Reconcile doc-vs-code: make `SOURCE_REGISTRY` + readiness matrix the single source of truth for every data/model claim.**
   *Why:* the largest integrity risk is the master doc asserting engines/feeds that don't exist (`clv.ts`, `proof-of-record.ts`, nflverse wiring, `fairProbability`); a credibility brand cannot ship overstatement. *Effort:* M. *Risk:* Low. *Smallest validation:* a CI test that fails if any provider/estimator referenced in `lib/**` or surfaced in a DTO is absent from the registry/matrix, plus deleting the `null`-stubbed `fairProbability`/`trueEvScore` fields until earned.

2. **Build the `SourceSnapshot` replay harness (`replayRun(runId)`).**
   *Why:* it's the keystone that unblocks *every* shadow-estimator backtest at zero API cost, and it doubles as a warm cache for failover — the highest-ROI engineering move because it turns stored hashed payloads into a calibration testbed. *Effort:* M. *Risk:* Low. *Smallest validation:* replay one historical run and assert scored picks byte-match the original `FactorBreakdown`.

3. **Ship the thin, real proof layer: pre-kickoff `PickProofReceipt` + slate `merkleRoot` + a public client-side verify page.**
   *Why:* converts GSE's #1 differentiator from claim to cryptographic guarantee, needs no sample, and is independently viral. *Effort:* M. *Risk:* Med (must be correct — a broken proof is worse than none). *Smallest validation:* `proof-chain.test.ts` proving root recomputation matches and that any payload mutation breaks the inclusion proof; `sealedAt < firstCommence` enforced.

4. **Stand up the Estimator interface + first shadow estimator (Elo/Glicko-2), wired to the matrix as control plane.**
   *Why:* GSE has an elaborate gating cathedral around an engine with zero independent signal; Elo is the cheapest honest first step and the matrix already defines `model.independentFairProbability` as a blocked factor. *Effort:* M. *Risk:* Low (shadow-only, can't affect picks). *Smallest validation:* Elo runs in shadow over the replay harness and emits a `PickSignalSnapshot`-joinable fair probability; drift-guard golden test passes.

5. **Replace naive `removeVig` with Shin de-vig + book-weighted median consensus, behind a Model Court non-worsening check.**
   *Why:* improves an *already-priced* calculation (fair probability) that gates the ML `>=0.58` threshold and the Edge component, with no new rights and modest math. *Effort:* S. *Risk:* Med (changes live numbers — must clear Court). *Smallest validation:* backtest Shin vs proportional de-vig on settled picks; require Brier ≤ current and ECE not worse before flipping.

6. **Make reliability visible: structured pipeline observability (traceId, `degradations[]`, `WorkerHeartbeat`) + one-light "Board Health" badge.**
   *Why:* turns the 14-workflow + 30-min-cycle claim into a legible reliability story and removes "did it run correctly?" anxiety; also exposes silent scoring collapses (`SUCCESS` with `picksGenerated=0`). *Effort:* S–M. *Risk:* Low. *Smallest validation:* an ops check that flags any `SUCCESS` run with `events>0 && picksGenerated=0`, and a heartbeat row written every cycle that powers the badge.

---

> **Intelligence cluster — how this binds to the existing GSE spine (ground truth from the codebase, read first).** Before the §6/§7/§8/§17 sections, fix the spine these recommendations hook into. These are real files confirmed in the primary clone, and they are the *only* legitimate path to "priced":
>
> - **`packages/prediction-engine/src/readiness.ts`** — `getReadinessGates()`. Every gate defaults to the safest value. The two that govern this cluster: `canLearnFromOutcomes` (data-collection only) and `canApplyCalibrationAdjustments` (**always false** — weight changes require explicit human review). This is the literal definition of "shadow can collect, nothing prices itself."
> - **`packages/prediction-engine/src/platform-config.ts`** — `minSettledPicksForLearning` (default 100). This is the "settled sample ≥100" gate referenced in the integrity doctrine.
> - **`apps/web/lib/calibration/compute.ts`** — `computeCalibration()`. Confidence buckets `50-59 / 60-69 / 70-79 / 80-89 / 90-100`; `MIN_BUCKET_SAMPLE = 30`; `PROPOSAL_DELTA = 0.12`; per-bucket **Brier score**; observed-minus-expected **delta**. Pure function; never writes weights. **ECE = sample-weighted mean of |delta| across these buckets** — already 90% built; just not named or surfaced.
> - **`packages/prediction-engine/src/source-registry.ts`** — `SOURCE_REGISTRY[]` with `canWriteProductionEvidence` / `canInfluencePublicScore` per source. This is the rights/trust gate every new feature source must pass.
> - **`packages/prediction-engine/src/evidence-readiness-matrix.ts`** — `EVIDENCE_FACTOR_DEFINITIONS` (13 factors incl. `player.availability`, `model.independentFairProbability`, `model.trueEv`) with `status: ACTIVE | SHADOW_READY | SHADOW_COLLECTING | BLOCKED | ABSENT`. This is the per-factor lifecycle every player/market feature moves through.
> - **`packages/prediction-engine/src/signal-snapshot.ts`** — `buildPickSignalSnapshot()`, the immutable "what was known at prediction time" record (15 presence flags incl. `hadPlayer`, `hadInjury`). This is the backtest substrate.
> - **`apps/web/lib/intelligence-graph/model-court/prompts.ts`** — the "Model Court" voice/refusal contract (`EVIDENCE_THIN`, `BETTING_CERTAINTY`, `EV_KELLY_WINRATE`, `GAME_NOT_IN_CONTEXT`).
> - **`apps/web/lib/compliance-scanner/rules.ts`** — three-layer banned-language linter ("We're not AI. We're math you can read."). Runs on every public surface.
> - **`packages/prediction-engine/src/poisson.ts`** — `poissonPmf/Cdf`, `jointScoreMatrix`, `moneylineProbabilities`, `overUnderProbabilities`, `assertTeamRatesAvailable` — already shipped, **not yet wired**. This is the multi-sport beachhead.
>
> **The canonical ladder for this whole cluster (the "priced/gated ladder"):** `ABSENT → SHADOW_COLLECTING (logged, never scored) → SHADOW_READY (backtest MAE/bias/Brier on ≥100 settled) → Model Court review (non-worsening ECE, passes refusal contract) → ACTIVE/priced (weight bumped via decision-log, version incremented)`. Player intelligence lives at the front of this ladder permanently for *direct* point projections (`canPublishProjections=false`), but its *derived features* can ride the ladder into game-confidence weight. That distinction is the unlock for §6.

### §6 — Player & team intelligence (StatKing)

**Panel assigned:** Auditor (projection-leak falsifiability) · Engineer (z-score & shrinkage math) · Developer (feature-store + backtest harness) · Architect (3-layer nflverse→proprietary→GPI boundary) · Researcher (hierarchical Bayes / conformal / EB-shrinkage) · Contextual lead (process-grade vs point-projection product fit) · Situational lead (shadow→priced gating posture) · Psychological lead (driver attribution & uncertainty trust).

**Verdict:** StatKing is GSE's deepest moat and its biggest under-monetized asset: nine LIVE engines (`player-composite`, `player-projection`, `opponent-adjusted`, `receiving-opportunity`, `player-model`, `qb-consensus`, `predictiveness`, `player-archetype`, `player-rush-scheme`) producing rich, honest, source-gated player signal that is deliberately walled off from pick confidence by `canPublishProjections=false`. The opportunity is enormous and specific: keep direct point projections gated forever, but route *player-derived team features* (opponent-adjusted receiving efficiency, QB process-grade deltas, availability shocks) through the existing `evidence-readiness-matrix` → `calibration/compute` → Model Court ladder so they earn priced weight in game confidence with a paper trail — the only credible way a player layer this good should touch the line.

#### Findings & ambitious upgrades

**Auditor —** The single biggest falsifiability risk is *projection leakage*: the moment a recency-weighted next-season PPR/g number (`player-projection.ts`) silently flows into a pick's confidence, `canPublishProjections=false` is violated in spirit even if no projection string renders. Mandate a **leakage test**: assert that no field whose lineage traces to `player-projection.ts`/`lib/projections` appears in `FactorBreakdown` while `canPublishProjections=false` (grep the factor `lineage` tag in CI). Second: GPI is presented as a 0–100 composite but has no published falsifier — add a pre-registered claim ("teams in GPI decile 9–10 cover at ≥ decile 1–2 over N games") logged to the same audit store as calibration, so GPI can be *wrong on the record*, not just *exist*. Third: "King Standard (engine honesty score)" is currently a label, not a spec — until it has a formula and a failing condition, it reads as marketing; the rewrite seed below makes it falsifiable.

**Engineer —** `player-composite.ts` builds a 0–100 from a PPR z-score + workload + momentum + availability. Two numerical fixes: (1) z-scores on heavy-tailed fantasy distributions over-reward outliers — **winsorize at the 2nd/98th percentile or switch to robust z (median/MAD)** before the sigmoid, or one 45-burst week distorts the composite (the classic regression-to-the-mean trap). (2) The composite hard-blends four sub-scores with fixed weights; replace fixed weights with **predictiveness-derived weights** from `predictiveness.ts` (weight each input by its measured out-of-sample correlation to next-week production), so the composite is self-justifying. For `opponent-adjusted.ts`, the iterative schedule adjustment is a DVOA-family fixed-point — add a **convergence guard** (stop at ‖Δ‖∞ < ε or 50 iters, log non-convergence) and **ridge-shrink early-season ratings toward league mean** so Week 2 adjOff/adjDef don't swing wildly on 1–2 games.

**Developer —** There is a backtest pathway in spirit (`player-projection.ts` reports MAE/bias) but no shared **feature-store contract** that the gating ladder can read. Ship `lib/projections/feature-registry.ts` mirroring `EVIDENCE_FACTOR_DEFINITIONS`: each player-derived feature declares `{ key, lineage, canPublishProjections, status, backtest: { mae, bias, brier, n }, lastSettledAt }`. Then `calibration/compute.ts` gains a sibling `computeFeatureCalibration(featureKey)` that buckets settled games by that feature's value and returns the same Brier/delta shape — so a player feature is judged by the *exact same machinery* as a confidence bucket. DX win: one harness, one report card, every feature.

**Architect —** The three layers (nflverse foundation → proprietary models → composite GPI) are clean conceptually but need an enforced **one-way dependency rule**: GPI may read proprietary models; proprietary models may read nflverse; nothing reads *up*. Encode it as an import-lint boundary (`player-composite` may import `opponent-adjusted`/`receiving-opportunity`, but `nflverse advanced lib` may import neither). Keep NFL identity resolution (the joinable-records layer) as a *separate package* (`packages/identity/`) so MLB/NHL can reuse the join contract without inheriting NFL feature code — this is what makes §17 a data problem, not a rewrite.

**Researcher —** This is where GSE can leap from "good fantasy metrics" to "defensible player science." Adopt, in priority order: **(1) Bayesian hierarchical models with partial pooling / shrinkage** (Dixon-style multilevel: each player's true rate drawn from a position-level prior; rookies and small-sample players shrink toward the position mean — directly fixes the small-n over-confidence the Auditor flagged). **(2) Empirical-Bayes regression-to-the-mean** as the cheap first version of the above — a James-Stein/EB shrinkage estimator on PPR/g needs no MCMC and slots straight into `player-composite`. **(3) Conformal prediction intervals** around `player-projection` outputs: a distribution-free wrapper on the existing MAE residuals that yields an honest 80%/90% band with finite-sample coverage — this is the *uncertainty band* upgrade to GPI, and crucially it's a "process grade with a range," never a point bet. **(4) Opponent-adjusted EPA** as the headline team-strength signal feeding game confidence (the iterative DVOA-style adjustment `opponent-adjusted.ts` already approximates). **(5) Ridge / gradient-boosted regression** for the projection point estimate, with **WOPR and air-yards share as features whose retained predictiveness is measured** by `predictiveness.ts` (WOPR = 1.5·targetShare + 0.7·airYardsShare is a strong, literature-backed opportunity proxy; let the data confirm its weight rather than asserting it).

**Contextual lead —** The product genius of StatKing is that it sells *process grades and historical fact*, not promises — which is exactly the trust position the brand wants ("math you can read," not "AI picks for you"). Lean into it: market GPI as "what the player's usage and efficiency have actually earned," with the conformal band shown as "and here's how much we *don't* know." This is differentiated against every "AI projection" competitor precisely because it refuses to overclaim. The buy-low/sell-high divergence in `receiving-opportunity.ts` (WOPR up, production down → buy-low) is the single most shareable, most defensible artifact in the whole platform — it's a *falsifiable thesis with a built-in scoreboard*.

**Situational lead —** Sequence the unlock so nothing prices prematurely. Phase A (now): surface GPI + drivers + conformal band on `/players`, `/intelligence`, `/stats` as historical fact only — zero pick-confidence wiring, `canPublishProjections=false` untouched. Phase B (shadow): route opponent-adjusted EPA + availability-shock features into `signal-snapshot` as `SHADOW_COLLECTING` so they accumulate the ≥100 settled sample without touching live confidence. Phase C (review): when `computeFeatureCalibration` shows non-worsening ECE, take the feature to Model Court; only on pass does `canApplyCalibrationAdjustments`-equivalent human sign-off bump the weight and the model version. This is the launch-safe path: the player layer gets *more* impressive at every phase without ever risking the integrity doctrine.

**Psychological lead —** Two cognitive-load wins. (1) **Driver attribution**: GPI as a bare 0–100 is a black box; show the top 3 signed drivers ("+9 from rising target share, −4 from declining aDOT, +3 from soft upcoming schedule") so the score *teaches*. This converts a number into a narrative the user can argue with — the strongest engagement loop for an analytical audience. (2) **Uncertainty as trust, not weakness**: the conformal band, shown as a subtle range rather than a false-precision point, *increases* perceived credibility for sophisticated users (false precision is the tell of a scam product). Color the band by `King Standard` so honesty is visible at a glance.

#### Prediction-method relevance (REQUIRED)

- **Empirical-Bayes / James-Stein shrinkage (regression-to-the-mean):** the minimal-effort fix for small-sample over-confidence in `player-composite.ts`. Plugs in *pre-ladder* (it changes the metric, not the price). No gating change required because it only makes a displayed *historical* grade more honest.
- **Bayesian hierarchical model with partial pooling:** the principled version — position-level priors, per-player posteriors, learned shrinkage. Plugs into `lib/projections` as the projection backbone; its *uncertainty* (posterior SD) feeds the GPI band. Stays `canPublishProjections=false` for the point estimate; only the *team-aggregated, opponent-adjusted* derivative rides the ladder.
- **Conformal prediction intervals:** distribution-free coverage wrapper on `player-projection` residual MAE. Plugs into the *display* layer (GPI band) immediately, and into the *gating* layer later as the honesty check on any priced player-derived feature (interval coverage on held-out settled games becomes a Model Court pass/fail criterion).
- **Opponent-adjusted EPA (DVOA-family iterative adjustment):** the flagship *team* feature derived from player-level play data. Enters the ladder at `SHADOW_COLLECTING` via `signal-snapshot`, is calibrated by `computeFeatureCalibration`, and on non-worsening ECE earns priced weight in `FactorBreakdown`. This is the legitimate bridge from player science to game confidence.
- **WOPR / air-yards-share predictiveness (ridge/GBM feature weighting):** `predictiveness.ts` measures retained out-of-sample signal; `receiving-opportunity.ts` exposes the divergence. These are *features*, weighted by measured predictiveness, never asserted constants — the data earns the weight.

#### Section rewrite seeds

**1. "King Standard" honesty-score spec (falsifiable, paste-ready):**
```
King Standard (per engine, 0–100): a published honesty grade, NOT a performance grade.
KS = 100 · ( w_cov · CoverageScore        // share of inputs present & fresh (from source-registry SLAs)
          + w_cal · CalibrationScore      // 1 − normalized ECE on this engine's settled-feature buckets
          + w_unc · UncertaintyHonesty )  // empirical coverage of the engine's stated interval (target 0.80 → actual)
w_cov=0.3, w_cal=0.4, w_unc=0.3.  Sample gate: KS is "PROVISIONAL" until n_settled ≥ 100 (platform-config.minSettledPicksForLearning).
FAILING CONDITION (the falsifier): if UncertaintyHonesty < 0.70 (stated 80% bands cover <56% of outcomes) OR CalibrationScore < 0.5,
the engine renders a "MISCALIBRATED — under review" badge and is barred from contributing priced weight.
```

**2. GPI v2 composite (drivers + band, predictiveness-weighted):**
```
For player p:  z_k = robustZ(metric_k)            // median/MAD, winsorized 2/98 pct
GPI_raw = Σ_k ( π_k · σ(z_k) )                     // π_k = predictiveness weight from predictiveness.ts, Σπ_k = 1
GPI = round(100 · GPI_raw)
Drivers = top-3 by |π_k · (σ(z_k) − 0.5)|, signed, rendered as "+9 rising target share", etc.
Band = conformal 80% interval from player-projection residuals (display only; NEVER a wired point projection).
Invariant: assert lineage(GPI inputs) ∌ player-projection while canPublishProjections=false.
```

**3. Backtest to add (`lib/projections/__tests__/feature-calibration.test.ts`):**
```
GIVEN ≥100 settled NFL games with opponent-adjusted-EPA feature recorded in signal-snapshot
WHEN computeFeatureCalibration("team.oppAdjEPA") runs
THEN it returns per-bucket {observed, expected, delta, brier} in the same shape as computeCalibration
AND the suite FAILS if adding the feature to a holdout confidence model worsens overall ECE
  (this is the literal Model Court non-worsening gate, encoded as a test).
```

**4. Diagram spec — "The StatKing Ladder" (for /intelligence):**
```
Three stacked lanes left→right with a one-way arrow:
[nflverse foundation: PBP · snaps · NGS · air yards]
   → [proprietary: opponent-adjusted EPA · WOPR opportunity · QB process grade · archetype]
      → [Galaxy Index 0–100 + drivers + conformal band + King Standard badge]
Below the lanes, a GATE STRIP showing each derived feature's chip: ABSENT ▸ SHADOW ▸ READY ▸ COURT ▸ PRICED,
with player POINT projections pinned permanently at "DISPLAY-ONLY (canPublishProjections=false)".
```

---

### §7 — Market intelligence (lib/market, slate-twin, board, game-room)

**Panel assigned:** Auditor (no-fake-clock / no-fabrication) · Engineer (de-vig & no-vig math) · Developer (snapshot store + causal-CLV job) · Architect (market state vs scoring boundary) · Researcher (Shin/power/WOC de-vig, RLM/steam, market-implied ratings) · Contextual lead (best-line shop value position) · Situational lead (DEMO-until-gate posture) · Psychological lead (movement perception without panic).

**Verdict:** The market stack is GSE's most *immediately* world-class surface area — best-line shop, no-vig consensus + movement (`game-market-read`), snapshot/memory history, CLV-candidate flags, the spread-distribution simulation cloud, the gate-respecting Slate Twin, and the lane-organized Board — and it is built with admirable integrity (pick-death-clock is honestly a price-drift meter, not a fake time-to-zero; Slate Twin labels DEMO until `canExposePublicPicks`). The opportunity is to make the *math* best-in-class (multiple de-vig cross-checks, a market-implied power rating, microstructure signals) and the *presentation* genuinely cinematic, while keeping every surface gate-respecting and fabrication-free.

#### Findings & ambitious upgrades

**Auditor —** The integrity instincts here are excellent and must be protected as invariants, not conventions: (1) `pick-death-clock` must *never* render a countdown timer — it is price space only; add a snapshot test asserting the component emits no time unit. (2) Slate Twin must show the DEMO label until `canExposePublicPicks` is true — assert it in CI against the readiness gate, not a hardcoded boolean. (3) The new de-vig cross-checks (below) introduce a subtle risk: if four de-vig methods disagree by a lot, the platform must show *the disagreement*, not silently pick the prettiest number — disagreement is information, and hiding it would be the kind of false precision the brand is built against.

**Engineer —** Today's "no-vig consensus" (`game-market-read`) almost certainly uses one normalization (likely multiplicative/proportional). That is the *weakest* method under favorite-longshot bias. Ship a **de-vig ensemble**: compute fair probability four ways — **multiplicative (proportional), additive, power, and Shin** — and report the spread. On tight -110/-110 two-way lines all four nearly coincide (good — show "consensus tight"); on lopsided lines and any multi-way market they diverge, and **Shin** (iterative, explicitly corrects favorite-longshot bias) is the principled default. For the consensus *price* across books, add a **weight-of-closure / best-of-line cross-check**: the no-vig number should be sanity-checked against the *closing* consensus once available, because the closing line is the most efficient estimate the market produces.

**Developer —** Two build items. (1) A **causal-CLV job** (see Researcher) needs the snapshot store to retain `(book, side, price, ts)` tuples densely around publish time — `line-movement/snapshot/memory` likely keeps deltas; ensure it keeps *timestamps fine enough* (≤5 min near publish) to run a difference-in-differences. (2) A **steam/RLM detector** as a pure function over the snapshot series: `detectSteam(series)` flags synchronized multi-book moves in a short window; `detectRLM(series, publicPct)` flags line moving *against* public ticket share. Both emit a typed signal with provenance, ready for the war room (§8) and the Board.

**Architect —** Keep the hard boundary the codebase already respects: `market-twin.ts` produces *market state* (`READY_TO_SCORE / WATCH_ONLY / CONFLICT / QUIET`), and the prediction engine produces *confidence* — these must not merge. The new market-implied power rating belongs in `lib/market` as an *input feature* that enters the scoring ladder via `signal-snapshot` (shadow first), **not** as a second scoring engine. One scorer, many features. The Board's stale-data fallback is the right pattern; generalize it so every market widget degrades to "last known good + age" rather than blanking.

**Researcher —** Named upgrades, each with a precise role: **(1) Shin de-vig** — the favorite-longshot-bias-correcting fair-probability extractor; default for the no-vig number, with multiplicative/additive/power shown as the disagreement band. **(2) Market-implied power ratings via weighted ridge regression on point spreads** (the inpredictable/Massey-style approach: 32 team dummies regressed on recent spreads, recency-weighted ~5 weeks, ridge for early-season stability). This yields a *market consensus team strength* GSE can compare its own opponent-adjusted EPA against — "where do we disagree with the market, and why." **(3) Microstructure signals** — steam (synchronized sharp multi-book moves) and reverse-line-movement (line vs public ticket share) as the canonical sharp-vs-square reads. **(4) Closing Line Value as the north-star truth metric** — CLV is, by research consensus, the best single predictor of long-run edge; `clv-candidate.ts` should evolve from a flag into a *tracked, settled, charted* series (did flagged picks actually beat the close?). **(5) A causal "did our pick move the line" estimator** — a difference-in-differences / event-study design: treat publish as the event, compare the flagged side's price path to a matched control side/market over the same window; the DiD coefficient is the estimated own-impact, with a placebo (pre-publish) test for parallel trends.

**Contextual lead —** Best-line shop (best price per side across books) is the most *honest commercial* surface GSE has — it gives the user money directly and proves the platform is on their side, which is the entire trust thesis. Frame it as the front door: "we don't tell you to bet, we make sure if you do, you got the best number." The market-implied power rating + GSE-disagreement view is the premium hook — "the market says X, our process says Y, here's the gap" is exactly the analytical-edge product an Elite tier sells.

**Situational lead —** Posture is correct and should be made *mechanical*: Slate Twin and any public pick exposure read `canExposePublicPicks` live; until it opens, everything is labeled DEMO and visibly so. Sequence the math upgrades ahead of the gate flip — ship the de-vig ensemble, market-implied ratings, and steam/RLM in shadow/DEMO now so that when `canExposePublicPicks` flips, the market intelligence is already battle-tested and the CLV scoreboard already has history. Launch with receipts, not promises.

**Psychological lead —** Line movement is emotionally loaded — users panic at drift. Two calming, trust-building moves: (1) Present movement as *information with direction and source* ("line moved toward your side — sharp-consistent" vs "moved against — public-driven"), never as alarm. (2) The **simulation cloud** (spread-distribution geometry) is the single most beautiful, most intuitive artifact for conveying uncertainty — a distribution the eye reads instantly beats any number. Make it the hero of the game-room. Color the cloud by where the current line sits in the distribution so "is this line fair?" is answerable at a glance.

#### Prediction-method relevance (REQUIRED)

- **Shin / power / multiplicative / additive de-vig (ensemble):** four ways to strip vig; Shin corrects favorite-longshot bias and is the principled default. Plugs into `game-market-read.ts` as the no-vig consensus, with the inter-method spread surfaced as honest uncertainty. This is a *display + feature* upgrade; the fair probability it produces is the substrate for edge, which already feeds `FactorBreakdown.edgeScore`.
- **Market-implied power ratings (weighted ridge regression on spreads):** Massey/inpredictable-style 32-dummy regression, recency-weighted, ridge-stabilized. Enters the scoring ladder as a *shadow feature* via `signal-snapshot`; on calibration it can earn priced weight, and immediately it powers the "market vs our process" premium view. One scorer, new feature — not a second engine.
- **Steam / reverse-line-movement detection (market microstructure):** pure functions over the snapshot series producing sharp-vs-square signals with provenance. Feed the war room (§8) as evidence-cited agents and the Board as lane annotations. Shadow until calibrated as a confidence input.
- **Closing Line Value (CLV) as profitability proxy:** the research-consensus best predictor of edge. `clv-candidate.ts` graduates from flag to settled, charted series — the platform's own honesty scoreboard ("we beat the close X% of the time"), governed by the same settlement plumbing as picks.
- **Difference-in-differences / event-study causal estimator:** the rigorous "did our pick move the line" measure — publish = event, matched control side = counterfactual, DiD coefficient = own-impact, pre-publish placebo = parallel-trends test. Runs as an offline analytics job, reported in the cockpit; it tells GSE whether it is a *price-mover* (which has compliance implications worth knowing before it's a problem).

#### Section rewrite seeds

**1. De-vig ensemble metric definition (paste-ready):**
```
For a market with raw implied probs q_i (from American odds), report fair probs p_i four ways:
  Multiplicative:  p_i = q_i / Σ q_j
  Additive:        p_i = q_i − (Σ q_j − 1)/n
  Power:           p_i = q_i^k  with k solved so Σ p_i = 1
  Shin:            solve for insider-share z in p_i = ( sqrt(z² + 4(1−z) q_i²/Σq_j) − z ) / (2(1−z)); iterate to Σ p_i = 1
DEFAULT = Shin. SURFACE = max_i p_i^Shin and the range [min method, max method] as "consensus tightness".
If (max−min) of any side's p across methods > 0.03, render "methods disagree — favorite-longshot zone".
```

**2. Causal own-impact (DiD) backtest spec:**
```
Event = pick publish time t0 for side S in market M.
Treated series: no-vig p_S(t) for [t0−30min, t0+30min].
Control series: matched side (same game opposite market, or league-time-matched game) over same window.
Estimate: ΔΔ = (p_S(post) − p_S(pre)) − (p_control(post) − p_control(pre)).
Placebo: run the same on [t0−60min, t0−30min] (pre-publish). Parallel-trends holds iff placebo ΔΔ ≈ 0.
Report own-impact = ΔΔ with 90% bootstrap CI in cockpit. NEVER shown as "we move lines" marketing; internal integrity metric.
```

**3. Simulation-cloud visual spec (game-room hero):**
```
Horizontal axis = home margin (points). Plot the scoring-model distribution (Poisson/normal-approx) as a soft density cloud.
Vertical guide line at current market spread; shade area beyond it = implied cover probability.
A second faint line at GSE fair spread; the gap between the two lines IS the edge, shown as a labeled bracket.
Color the cloud by King Standard of the inputs (honest = cool/clear, miscalibrated = desaturated). No numbers required to read it.
```

**4. Steam/RLM detector test:**
```
detectSteam: GIVEN ≥3 books moving the same side ≥0.5pt within a 10-min window THEN flag STEAM with the book list + provenance.
detectRLM:  GIVEN line moves toward side A WHILE public ticket% favors side B by ≥15pts THEN flag RLM(sharp-on-A).
Both: emit typed signal {kind, side, magnitude, books[], window, sourceTrust}; suite asserts no flag when moves are unsynchronized or within-noise.
```

---

### §8 — News, signals & the agent council

**Panel assigned:** Auditor (provenance + falsifier per agent) · Engineer (decay & reliability-weight math) · Developer (wire→impact→council pipeline) · Architect (signal-lineage reconciliation with §5) · Researcher (reliability-weighted fusion, recency decay, narrative NLP) · Contextual lead (news-as-edge product fit) · Situational lead (DEMO war room → live council) · Psychological lead (cascade legibility, avoid false authority).

**Verdict:** The news/signals layer has a strong, live foundation (`impact.ts`/`wire.ts`: reliability-tier × signal-magnitude × freshness-decay, tiers Insider/Beat/Verified/Aggregator/Unconfirmed at 1.0/0.85/0.7/0.45/0.2, urgency 0–100 + action, LIVE on `/the-beat`) and a compelling but currently *illustrative* war room (visible agent council that narrates which agent changed and why). The opportunity is to turn the war room from DEMO into a **credible, evidence-cited council** where every agent is a real signal with provenance and a stated falsifier, formalize the decay/reliability math, and reconcile it cleanly with the courtroom/signal-lineage governance from §5 — making the council the platform's most legible, most trustworthy public artifact.

#### Findings & ambitious upgrades

**Auditor —** The war room is explicitly DEMO with no real teams — keep it labeled that way until each agent is backed by a real, settled signal, and assert the label in CI (same pattern as Slate Twin). The transformative requirement: **every agent must carry (a) provenance — which source/engine produced its read — and (b) a falsifier — the condition under which it would be wrong.** A "sharp agent" saying PLAY without "based on steam across FD/DK/MGM at 3:42pm, wrong if reversed by close" is theater. Add a contract test: an agent verdict with no `provenance` and no `falsifier` cannot render. This is what separates GSE's council from every "AI consensus" gimmick.

**Engineer —** The impact formula (reliability × magnitude × freshness-decay) is sound; make the decay *explicit and tunable*. Use **exponential decay with a per-category half-life**: `weight = reliabilityTier × magnitude × exp(−ln2 · age / halfLife(category))`. Injury news decays in hours; line-movement signal in minutes; schedule context in days — these half-lives should live next to the `source-intelligence` freshness budgets, not be hardcoded. For **multi-agent fusion**, move from ad-hoc cascade to **reliability-weighted log-odds pooling**: each agent emits a log-odds nudge, pooled by reliability weight, so two Beat sources don't outvote one Insider by count. This is a principled, auditable consensus rather than a vibe.

**Developer —** The pipeline `wire.ts → impact.ts → council` should be one typed flow with an immutable record at each hop (mirroring `signal-snapshot`): raw wire item → scored impact (with the decay/reliability terms exposed) → agent verdict (with provenance + falsifier) → council decision (PLAY/WATCHLIST/NO-BET with the *diff* that changed it). Persist the diff so "narrate which agent changed and why" is reading a real log, not generating prose. `narrative-signal` (morale/role NLP, currently R&D/shadow) stays shadow and feeds *only* the narrative agent, never priced confidence, until it clears the ladder.

**Architect —** This is the key reconciliation point with §5's courtroom/signal-lineage governance: the war room agents and the Model Court are the *same governance idea at two altitudes*. Unify the vocabulary — an "agent" in the war room is a *signal with a lineage record*; the Model Court is the *appeals court* that decides whether a signal earns priced weight. Concretely: every war-room agent verdict references a `signalLineageId` that the Model Court can pull; a signal that fails Court is demoted to "narrative only" in the council (visible, but non-scoring). One lineage spine, two surfaces (operational council + judicial court).

**Researcher —** Named methods: **(1) Reliability-weighted evidence fusion (log-odds / logarithmic opinion pool)** — the principled way to combine heterogeneous-reliability sources into one consensus; replaces count-based cascade. **(2) Exponential recency decay with category half-lives** — the standard time-discounting for perishable signal; ties to the favorite-longshot-corrected market read so stale news can't override a fresh close. **(3) Source-reliability calibration** — don't *assert* the 1.0/0.85/0.7/0.45/0.2 tier weights forever; *measure* them by tracking, per tier, how often that tier's signals were confirmed by the close/outcome, and recalibrate via the same `computeCalibration` machinery (a Beat source that's been right 70% earns its weight; one that's been right 50% gets demoted). **(4) Narrative/topic NLP for `narrative-signal`** — morale/role-change theme extraction kept strictly shadow, surfaced as *context*, never as a wired number, until backtested.

**Contextual lead —** News-as-edge is the most *alive* surface — `/the-beat` is where the platform feels real-time and indispensable. The product win is *speed with honesty*: be first to surface a credible injury/role signal *and* first to label its reliability and decay, so users trust the urgency score. The war room, once evidence-cited, becomes the flagship "show your work" artifact — the thing that proves GSE reasons rather than guesses, which is the entire brand.

**Situational lead —** Stage the DEMO→live transition agent-by-agent: an agent goes live only when its underlying signal has provenance, a falsifier, and (if it influences confidence) a cleared ladder position. Line/sharp/public/injury/matchup agents can go live earliest (they map to real market + news signals already built); disagree/narrative/responsible agents stay illustrative or context-only longest. This lets the war room become real *incrementally* without ever shipping an unbacked verdict.

**Psychological lead —** A cascading council is mesmerizing but carries a false-authority risk — users may over-trust a confident-looking consensus. Defuse it with **legible disagreement**: when agents conflict, *show the conflict and the WATCHLIST/NO-BET outcome prominently* — the "responsible agent" (the one that can veto to NO-BET) is the trust anchor and should be visually distinct. The cascade should feel like a deliberation that can *decline to bet*, not a hype machine that always finds a play. That restraint is the most persuasive thing the surface can do.

#### Prediction-method relevance (REQUIRED)

- **Reliability-weighted log-odds fusion (logarithmic opinion pool):** combines agents/sources of differing reliability into one consensus log-odds. Plugs into `impact.ts` as the council aggregation step; the pooled log-odds is the council's confidence read. Any contribution to *priced* confidence still routes through the ladder via `signal-snapshot`.
- **Exponential recency decay with per-category half-lives:** formalizes `wire.ts`/`impact.ts` freshness-decay. Lives beside `source-intelligence` freshness budgets; ensures stale signal can't override the (efficient) closing market read.
- **Source-reliability calibration (empirical tier re-weighting):** the 1.0/0.85/0.7/0.45/0.2 tiers become *measured*, not asserted — tracked via `computeCalibration` against confirmation-by-close/outcome. A tier that underperforms is demoted on the record; this is the honesty mechanism that makes the urgency score trustworthy.
- **Topic/narrative NLP (shadow):** `narrative-signal` morale/role extraction, kept strictly context-only and shadow-gated, surfaced as qualitative color, never a wired number, until backtested — the integrity guardrail on the softest signal.
- **Signal-lineage governance (reconciliation with §5):** every agent verdict carries a `signalLineageId`; the Model Court adjudicates whether that lineage earns priced weight. One lineage spine; the council is operational, the Court is judicial.

#### Section rewrite seeds

**1. Agent contract (paste-ready type):**
```
interface CouncilAgentVerdict {
  agent: "line"|"sharp"|"public"|"injury"|"matchup"|"disagree"|"narrative"|"responsible";
  verdict: "PLAY"|"WATCHLIST"|"NO_BET";
  provenance: { sourceId: string; engine: string; observedAt: string; snapshotRef: string }; // REQUIRED
  falsifier: string;        // REQUIRED — the condition that would prove this read wrong, e.g. "reversed by close"
  signalLineageId: string;  // ties to §5 Model Court
  logOddsNudge: number;     // contribution to pooled consensus
  isDemo: boolean;          // true until provenance is a real settled signal
}
// Render guard: a verdict with empty provenance.snapshotRef OR empty falsifier MUST NOT render as live.
```

**2. News-impact formula (explicit, paste-ready):**
```
impact = reliabilityTier(source) · signalMagnitude · exp( −ln2 · ageMinutes / halfLifeMinutes(category) )
reliabilityTier: Insider 1.0 | Beat 0.85 | Verified 0.7 | Aggregator 0.45 | Unconfirmed 0.2   // CALIBRATED, see below
halfLifeMinutes: INJURY_NEWS 240 | LINE_MOVEMENT 20 | MATCHUP 1440 | SCHEDULE 4320
urgency = round( 100 · normalize(impact) ); action = urgency≥70 "ACT" : urgency≥40 "WATCH" : "NOTE"
CALIBRATION: monthly, recompute each tier's effective weight = confirmedRate(tier) via computeCalibration; log any change to decision log.
```

**3. Reliability-calibration backtest:**
```
GIVEN ≥100 settled signals per reliability tier with "confirmed by close/outcome" labels
WHEN computeCalibration buckets by tier
THEN report each tier's observed confirmation rate vs its asserted weight; |delta|≥0.12 raises a TIER_REWEIGHT proposal (human review).
Guard: a tier whose confirmedRate < its weight by ≥0.15 is auto-flagged "OVERWEIGHTED — review" in the cockpit.
```

**4. War-room → Court reconciliation diagram:**
```
[ /the-beat wire item ] → [ impact.ts: reliability×magnitude×decay ] → [ War Room council: agents with provenance+falsifier ]
        every verdict carries signalLineageId ↓
[ §5 Model Court ] adjudicates lineage → PRICED (weight in FactorBreakdown) | NARRATIVE-ONLY (visible, non-scoring) | REFUSED
One lineage spine. Council = operational cascade (PLAY/WATCHLIST/NO-BET). Court = judicial gate (earns-weight / not).
```

---

> **Business, Ops & Surfaces cluster — three load-bearing reality checks the panel found in the code (read these first).** The §9–§14 and §16 reviews are anchored to the real shipped files — `apps/web/lib/entitlements.ts`, `packages/types/src/index.ts` (`getEntitlements`), `apps/web/lib/stripe.ts`, `apps/web/lib/promotions/guards.ts`, `apps/web/lib/cockpit/operator-registry.ts`, `apps/web/lib/cockpit/agents.ts`, `apps/web/lib/cockpit/jarvis.ts`, `apps/web/lib/trust-claims.ts`, `apps/web/lib/product-analytics/event-taxonomy.ts`, `apps/web/lib/bet-tracker/policy.ts`, `apps/web/lib/content/workflow.ts`.
>
> 1. **The proof-gated pricing ladder is a spec, not a shipped surface.** The real entitlement system is `getEntitlements(tier)` in `packages/types/src/index.ts` — a flat boolean map keyed only on `FREE | PRO | ELITE`. There is no `lib/pricing/pricing-phases.ts`, `value-architecture.ts`, or `feature-gates.ts` in the working tree. The FOUNDING→PROVEN→ESTABLISHED→AUTHORITY ladder is the right idea; treat every §9 recommendation below as "build this as the missing pricing module," not "tune the existing one."
> 2. **`getUserEntitlements` does NOT honour a 7-day grace window today.** `apps/web/lib/entitlements.ts` only matches `status: { in: ["ACTIVE","TRIALING"] }`; a `PAST_DUE` subscription falls straight to `FREE`. The brief's "7-day PAST_DUE grace; fail-closed to FREE" is half-true — it fails closed, but the *grace* is not implemented. This is a real revenue + UX leak (a customer whose card declines loses Elite access mid-game). Fix is small and named below.
> 3. **The Agent OS ships 6 roles, not 24.** `apps/web/lib/cockpit/agents.ts` defines exactly `JARVIS, SARAH, TAL, SCOUT, AVA, BOBBY`, each `externalActions: "NONE"`, keyed 1:1 to the Prisma `OperatorAgent` enum. The "24 specialist agents across 6 departments" is an aspiration document. The panel's §11 guidance is built to make the *6 real roles* legible and to give you a credible, non-over-promised path to expand — not to pretend 24 exist.
>
> A fourth, smaller but important one: **`trust-claims.ts` ships the National Problem Gambling Helpline number `1-800-522-4700`, while the doctrine and `operator-registry.ts`'s `responsibleGamingHotline` field point at `1-800-GAMBLER`.** Pick one canonical RG string and make it a single exported constant (detailed in §12). *(Per the PART I reconciliation note, the "module not in the working tree" findings may be branch/truncation artifacts — diff against `research/proven-edge` before concluding the pricing module is unbuilt.)*

### §9 — Monetization & revenue

**Panel assigned:** Auditor (refund/grace/entitlement-leak risk) · Engineer (phase-derived price math, idempotent webhooks) · Developer (`getEntitlements` API surface, feature-gate DX) · Architect (5-line revenue boundaries, ledger isolation) · Researcher (BG/NBD, price-elasticity, uplift, comp benchmarking) · Contextual (sports-info pricing vs PFF/Action/OddsJam) · Situational (FOUNDING posture pre-sample, grandfather mechanics) · Psychological (proof-as-price-justification, anchoring, loss-averse downgrade UX).

**Verdict:** The integrity spine is genuinely differentiated — pricing that *unlocks as proof accrues* is a position no competitor can copy without your gate discipline, and the affiliate ledger being pure double-entry + BUILT-NOT-WIRED is exactly the right posture. But the monetization layer is today a flat 3-tier boolean map with an unimplemented grace window and no shipped phase/elasticity machinery; the opportunity is to ship the pricing-as-a-module that the spec already describes and instrument it so price moves are *earned and measured*, not asserted. Five revenue lines is the right count; only line (1) is real, and lines (3)/(5) are the highest-margin expansions.

#### Findings & ambitious upgrades

- **The Auditor —** Two concrete leaks. (a) `getUserEntitlements` drops `PAST_DUE` users to `FREE` with no grace, contradicting the documented 7-day grace and the `WebhookEvent` idempotency story — a declined-card customer loses access instantly and is more likely to churn than recover. (b) The 7-day refund window (`pricing.money-back-window` in `trust-claims.ts`) is stated but there is no server-side check that a refund request is *inside* the window, nor a guard that refunds never trigger off a sports outcome. Add a `RefundEligibility` pure function and a `graceWindowDays` constant; assert in tests that `PAST_DUE` within grace returns the *paid* tier and outside grace returns `FREE`. Also: the grandfather promise ("locked for life") is a forward liability with no schema anchor — add `priceLockedAt` + `lockedPhase` columns to `Subscription` so the promise is auditable, not just marketing.
- **The Engineer —** "Prices derive from phase, never hardcoded" is the correct invariant but it currently has nowhere to live. Build `lib/pricing/pricing-phases.ts` as a pure resolver `resolvePrice(phase, tier, term) → { amountCents, stripePriceId }` with the four phases and their *gating predicates* expressed as code: `PROVEN` = `settledCanonicalCount ≥ 100 && calibrationPublished`, `ESTABLISHED` = `≥500 && clvBeatPct ≥ 0.524`, `AUTHORITY` = `≥2000 && clvBeatPct ≥ 0.55`. These predicates must read the *same* `JarvisHistoryInput`/`PublicPerformancePolicy` evidence the cockpit already computes — do not let pricing and the trust gates drift. Edge cases to encode: phase can only advance (monotonic, never regress even if CLV dips below threshold for a week — protects member trust), and the Stripe price ID must exist before a phase can be declared active (fail-closed `phase-readiness.ts` check).
- **The Developer —** `getEntitlements` returning a flat object is good DX but the *lock behavior* (what the user sees in place of gated content) lives nowhere typed. Ship `feature-gates.ts` as `Record<FeatureKey, { minTier, lockBehavior: "PAYWALL" | "BLUR" | "TEASER" | "HIDDEN" }>` for the 25+ features, and have the paywall component take a `FeatureKey` so a designer can change lock behavior without touching access logic. Add a single integration test that walks every `FeatureKey`, renders it at each tier, and asserts gated features never leak their payload into the DOM at `FREE` — this is the server-side-enforcement invariant made executable.
- **The Architect —** The five revenue lines must have hard module boundaries so a B2B key can never read a consumer session and the affiliate ledger can never be imported by a render path that could surface a stake recommendation. Today `operator-registry.ts` and `promotions/guards.ts` are clean; keep that discipline as you wire lines 3–5. Specifically: `api-governance.ts` (line 3) should be its own package (`packages/api-governance`) with quota/domain/claim-safety as the *only* public exports, so B2B claim-safety reuses the same `scanForBannedPhrases` source of truth as the consumer surface. The affiliate ledger (line 4) stays a pure function library with no Stripe import — settlement of affiliate revenue is a *different* money rail than subscriptions and must not share idempotency keys.
- **The Researcher —** Adopt named, defensible methods rather than gut pricing. **Revenue/LTV:** BG/NBD + Gamma-Gamma (the Fader–Hardie "Buy-Till-You-Die" family) for a subscription product is the standard; for a fixed-tier sub it degenerates nicely to a discrete-time cohort-survival (Kaplan–Meier) model on monthly renewal — ship that first because it needs only the `Subscription` table. **Churn:** discrete-time hazard / survival regression with covariates (tier, days-since-signup, CLV-tracker engagement, loss-room visits). **Elasticity:** when you move FOUNDING→PROVEN, you have a natural price-change event — estimate own-price elasticity via a log-log regression on the cohort that hit the new price vs the grandfathered cohort (a clean difference-in-differences). **Conversion uplift:** the paywall is the ideal place for *causal uplift modeling* (two-model or uplift-tree) rather than naive A/B — target the paywall variant at users predicted to convert *because of* the variant. Benchmark anchors (see Contextual) keep all of this honest.
- **Contextual Understanding lead —** Position in the *sports-information* category, not the *picks-seller* category, and price against the information comps: PFF (~$20.7M revenue, ~200k subs, roughly $40–200/yr for the serious tier) proves a calm, data-credible product sustains six-figure subs at your price points; OddsJam/Unabated ($80–150+/mo) prove tool-led "do the math for me" pricing the market already pays; Outlier and Action Network prove the *content + edge* bundle. GSE's FOUNDING Pro ($14.99/mo, $99/yr) is *deliberately below* OddsJam and at PFF's level — correct for a pre-proof product. The credible expansion path: as the ladder advances, you are not "raising prices on a picks site," you are "an information product whose evidence base deepened," which is the only narrative that survives a chargeback dispute.
- **Situational Understanding lead —** FOUNDING is the right launch posture *because* you have <100 settled canonical picks and the performance gate is closed — you literally cannot make a track-record claim yet, so a humble entry price is congruent with what you're allowed to say. The grandfather-for-life mechanic is your single best launch-urgency lever that is *also* integrity-safe (it's a billing term, not an outcome claim). Sequence: ship the pricing module + grace fix *before* the first paid signups so no one is grandfathered at a price the code can't honour. Hold lines 3/5 (B2B, trust-toolkit) until you have ≥1 published calibration — selling governance you can't yet demonstrate is the one move that would undercut the brand.
- **Psychological Understanding lead —** The proof-gated ladder is a *trust-building price architecture*: every price increase is pre-justified by visible evidence, which converts the usual "price hike resentment" into "I was early, I'm protected, and they earned it." Make that legible — show the *next* phase and its unlock condition on the pricing page ("Pro is $14.99 during Founding; it unlocks to the Proven tier only after 100 settled picks and a published calibration report") so the user co-watches the proof accrue. Downgrade/cancel flows must be loss-averse-aware but never dark-pattern: surface what they *keep* (CLV tracker history, academy progress) vs what pauses, with `1-800-GAMBLER` present, never a guilt screen. Anchoring rule: always render the annual price as the anchor with the monthly as the "flexible" option, never a fake strikethrough.

#### Prediction-method relevance
- **LTV / revenue forecast:** Kaplan–Meier monthly-renewal survival → cohort LTV (ship first, needs only `Subscription`); upgrade to BG/NBD + Gamma-Gamma once you have ≥6 monthly cohorts.
- **Churn:** discrete-time hazard model with engagement covariates from the `event-taxonomy.ts` funnel (loss-room visits and CLV-tracker logging are likely the strongest retention signals — instrument them as model features).
- **Price elasticity:** difference-in-differences at each phase transition (grandfathered vs new-price cohort) → own-price elasticity; feeds the decision of whether AUTHORITY pricing should step $24.99→$29.99 or hold.
- **Paywall optimization:** causal uplift modeling (two-model / uplift random forest), not vanilla A/B — maximizes *incremental* conversions and avoids cannibalizing users who'd convert anyway.
- **Affiliate yield:** survival model on the click→deposit→hold-window funnel to forecast accrual net of clawback before recognizing affiliate revenue.

#### Section rewrite seeds

**1) Tier-promise rewrite (`value-architecture.ts`, plain-English, proof-forward):**
```
FREE      — "One scored pick a day, the full daily brief, and every transparency
             signal (data freshness, bookmaker coverage, risk level). No confidence
             score until our model is calibrated against settled results."
PRO        — "Every scored pick, the confidence score, line-movement, and the
             factor-by-factor breakdown of how each pick was built. $14.99/mo during
             Founding — your price is locked for life the day you join."
ELITE      — "Everything in Pro, plus early access to the slate, your personal
             CLV/ROI analytics, and alerts. The deepest seat at the table."
NEXT PHASE — "Pricing advances to Proven only after 100 settled picks and a published
             calibration report. Founding members never pay the new price."
```

**2) New feature-gate (`feature-gates.ts` entry):**
```ts
"clv_personal_analytics": {
  minTier: "ELITE",
  lockBehavior: "TEASER",   // show a blurred sample + "Elite unlocks your real CLV"
  rationale: "Personal CLV/ROI is the strongest proof-of-skill retention surface; gate to Elite.",
}
```

**3) KPI definitions to add to the metrics layer:**
- `clvBeatPct` — share of settled canonical picks whose entry line beat the closing line; the *only* metric allowed to advance ESTABLISHED/AUTHORITY phases. Definition must match the engine's CLV computation exactly.
- `graceRecoveryRate` — % of `PAST_DUE` subscriptions that return to `ACTIVE` within the grace window (target >40%; if low, grace is too short or dunning copy is weak).
- `phaseEarnedHeadroom` — settled-pick count vs next-phase threshold; the public "proof accruing" progress bar.

**4) Test/check to add:**
```
test "PAST_DUE within grace retains paid tier; outside grace falls to FREE"
test "resolvePrice fails closed if the phase's Stripe price ID is unset"
test "phase advancement is monotonic — a CLV dip cannot demote ESTABLISHED→PROVEN"
test "no FeatureKey renders its gated payload into the DOM at FREE"
```

---

### §10 — Engagement, growth & content

**Panel assigned:** Auditor (DRAFT-ONLY enforcement, claim-safe content) · Engineer (Cipher SHA-256 + rate limit, CLV math) · Developer (event-taxonomy DX, provider adapter) · Architect (Airwave→Content→Studio→Blog control-plane) · Researcher (growth-loop modeling, North-Star instrumentation) · Contextual (proof-as-loop fit) · Situational (no-provider-wired timing) · Psychological (trust→conversion, loss-room as anti-churn, cognitive load).

**Verdict:** This is GSE's most under-appreciated asset: the proof layer (CLV Tracker, Glass Box Cipher, Academy, Loss Room, Bias Mirror) is *already* a coherent engagement system that competitors don't have, and `event-taxonomy.ts` is a disciplined, PII-safe, surface-scoped event contract ready to wire. The single biggest move is to **make the proof layer the growth loop explicitly** — instrument it as one funnel where transparency drives trust drives conversion drives referral — and pick a provider so the 14 typed events stop being theoretical. Everything outbound is correctly DRAFT-ONLY; do not weaken that to chase virality.

#### Findings & ambitious upgrades

- **The Auditor —** The content path is admirably safe: `workflow.ts` gates on source coverage, `content-generator` is narrative-only and never produces picks, and every outbound channel (`bot-outbox`, `twitter-bot`, `discord-bot`) is queued, never auto-sent, starting at `owner_review`. The audit risk is *drift at the edges*: studio templates (`betting-education`, `tiktok-reels-script`, `x-thread`, `sponsor-safe`) are the likeliest place a banned phrase or an implied-certainty hook slips in. Make the `compliance-scanner/rules.ts` scan a *mandatory* step in the Studio compose path (not just blog), and add a test that every studio template's example output passes `scanForBannedPhrases`. The "thin-week honesty" rule in the journal is a real trust asset — protect it with a test that a losing week cannot be rendered as a winning one.
- **The Engineer —** The Glass Box Cipher's server-side SHA-256 verify + rate limit is the correct shape; harden it against timing attacks (constant-time compare on the shard hash) and make the rate limit per-account *and* per-IP to stop a shared-answer leak from draining the founder-gated reward pool. The CLV Tracker math is the engagement engine's crown jewel — specify CLV as `(closingImpliedProb − entryImpliedProb)` in no-vig terms and surface a calibration reliability curve (predicted vs actual buckets) so the user *sees* their own skill, which is the strongest possible retention hook. Parlay MRI must keep its "illustrative" framing in code, not just copy — tag every leg `illustrative: true` so it can never be mistaken for a recommendation.
- **The Developer —** `event-taxonomy.ts` is genuinely well-built: `validateProductEvent` blocks PII (`email/phone/ssn/...`), rejects non-primitive values, and enforces the surface allow-list. Two gaps: (a) no provider is wired, and (b) the proof-loop events are missing. Add the missing event names below and ship one thin adapter behind a `track(name, props)` facade so swapping providers never touches call sites. Recommended provider: **PostHog** (self-hostable, EU-data-residency option, native funnels + experiments + session replay with PII masking, and *causal/uplift-friendly* cohort exports) — it matches your "free-first, privacy-first, no PII" posture far better than a marketing-cloud SDK. Amplitude is the fallback if you want best-in-class behavioral cohorting and already have the connector listed.
- **The Architect —** The `Airwave → Content → Studio → Blog` control-plane with no auto-publish is the right pipeline topology; formalize it as a state machine (`SOURCED → DRAFTED → STUDIO_VARIANT → OWNER_REVIEW → PUBLISHED`) where the only transition into `PUBLISHED` is gated by `canPublishContent` *and* a passing compliance scan. Keep the analytics taxonomy in `packages/types` or a shared package so the same event contract is importable by web, bots, and any future B2B widget — one taxonomy, many emitters.
- **The Researcher —** Model the engagement system as an explicit *growth loop* and instrument its North Star. Candidate North-Star metric: **weekly proof-engaged members** (logged a bet in the CLV tracker OR opened the Loss Room OR completed an Academy module). The loop: transparency surface viewed → proof action taken → trust delta → conversion/retention → opt-in share → new visitor. Quantify each edge with the taxonomy (`signal_audit_opened → upgrade`, `loss_room_opened → retention`, `bet_share_created → acquisition`). Use **loop-equation / coefficient modeling** (each loop's gain = exposure × action-rate × conversion × amplification) to find the weakest edge and invest there. For content, adopt a simple **marginal-CAC-by-loop** view so you can see whether the Cipher, the Academy, or the Loss Room is the cheapest acquisition/retention engine.
- **Contextual Understanding lead —** The proof layer fits the brand perfectly because it is the *product* (math you can read), not a bolt-on gamification. The Loss Room especially is counter-positioning competitors cannot copy: a picks product that publicizes its losses with autopsies signals a confidence that hype sites can't fake. Frame the whole layer publicly as "The Observatory" — a place you go to *watch the model think and account for itself* — so engagement and trust are the same surface.
- **Situational Understanding lead —** No provider wired is fine *today* (pre-launch), but it means you are currently flying blind on the exact funnel the business depends on. Wire PostHog before the first paid cohort so you have baseline conversion and the phase-elasticity DiD (from §9) has clean data. Keep all bots DRAFT-ONLY through launch; the moment to consider auto-send is *after* you have a published calibration report and the voice standard has held for 30 days — not before.
- **Psychological Understanding lead —** The proof loop is, psychologically, a *trust ledger the user keeps with themselves*: the CLV tracker makes their own discipline visible, the Bias Mirror (nothing stored) lowers the threat of self-reflection, and the Loss Room reframes losses as shared learning instead of betrayal — the three together are a near-optimal anti-churn design. Watch cognitive load: five tools is a lot; sequence them (CLV tracker as the daily habit, Academy as the weekly depth, Cipher as the occasional delight) and never surface all five at once. The Cipher's founder-gated reward pool is powerful but must stay clearly "for fun / learning," never implying paid edge.

#### Prediction-method relevance
- **Growth-loop modeling:** loop-coefficient / system-dynamics gain equations per loop (Cipher, Academy, Loss Room, CLV, referral) → identify and invest in the weakest edge.
- **Activation/retention:** survival analysis on time-to-first-proof-action; cohort retention curves segmented by which proof tool was first used (tests the "Loss Room reduces churn" hypothesis directly).
- **Content attribution:** marginal-CAC-by-loop and a simple media-mix view once outbound is live; uplift modeling for which Studio variant drives the most *incremental* conversions.
- **Anomaly detection:** on Cipher submissions and event streams to catch shard-answer leaks / bot abuse (isolation-forest or rate-of-change z-score on per-account submission velocity).

#### Section rewrite seeds

**1) Missing proof-loop events to add to `event-taxonomy.ts`:**
```ts
{ name: "clv_tracker_bet_settled", category: "BET_TRACKER",
  whyItMatters: "The moment a user sees whether they beat the close — the core skill-proof event.",
  allowedSurfaces: ["/bet-tracker","/dashboard"], requiredProperties: ["beatClose"], optionalProperties: ["sport","clvBps"] },
{ name: "academy_module_completed", category: "TOOL",
  whyItMatters: "Graded reasoning completion is the strongest depth-of-engagement signal and a conversion leading indicator.",
  allowedSurfaces: ["/academy"], requiredProperties: ["module"], optionalProperties: ["score"] },
{ name: "cipher_shard_solved", category: "COMMUNITY",
  whyItMatters: "Delight + return loop; measures whether the weekly puzzle drives habitual return.",
  allowedSurfaces: ["/observatory","/cipher"], requiredProperties: ["week"], optionalProperties: [] },
{ name: "upgrade_from_proof_surface", category: "SIGNAL",
  whyItMatters: "Attributes conversions to the specific transparency surface that earned them.",
  allowedSurfaces: ["/picks","/performance","/dashboard"], requiredProperties: ["fromSurface","toTier"], optionalProperties: [] },
```

**2) North-Star + loop KPI definitions:**
- `weeklyProofEngagedMembers` (North Star) — distinct members with ≥1 of {`clv_tracker_bet_settled`, `loss_room_opened`, `academy_module_completed`} in a rolling 7-day window.
- `proofToConversionRate` — of users who fire any proof event, share who upgrade within 14 days (the trust→revenue edge).
- `lossRoomRetentionLift` — 30-day retention of `loss_room_opened` users vs matched non-openers (validates the anti-churn thesis).

**3) Visual/diagram spec — "The Proof Flywheel":** a 5-node radial loop (Transparency → Proof Action → Trust → Conversion/Retention → Opt-in Share → back to Transparency), each edge labeled with its measuring event and a live coefficient; center hub reads "Math you can read." Use the GSE ultraviolet/galaxy palette; the loop should *animate* clockwise so the growth motion is felt, not just stated.

**4) Test to add:** `every studio template's example output passes scanForBannedPhrases AND contains a risk disclaimer` — wires `compliance-scanner/rules.ts` into the Studio path as a hard gate.

---

### §11 — Operator cockpit & Agent OS

**Panel assigned:** Auditor (autonomy-claim honesty, approval-gate integrity) · Engineer (urgency formula math, queue determinism) · Developer (run-contract API, registry↔enum type-lock) · Architect (departmental org structure, dispatch boundaries) · Researcher (ops-research scheduling, priority queues, ICE/WSJF) · Contextual (single-operator reality) · Situational (DRAFT_ONLY launch posture) · Psychological (operator cognitive load, legible authority, trust in the assistant).

**Verdict:** The cockpit is the most *architecturally honest* part of the system — `jarvis.ts` is a pure, fixture-testable synthesizer that explicitly refuses to fabricate or recommend auto-betting/auto-publishing, and the 6 real agents in `agents.ts` are correctly scoped to `externalActions: "NONE"` and type-locked to the Prisma enum. The opportunity is to make this legible as a *coherent operating system* (an org chart, an escalation map, a single run-contract) and to **sharpen and visualize the command-center urgency formula**, which is a genuine asset — *without* over-promising the 24-agent autonomy that doesn't exist. The honest framing: 6 specialist *roles*, each a draft-only co-pilot, orchestrated by Jarvis into one attention queue.

#### Findings & ambitious upgrades

- **The Auditor —** The single highest-integrity risk in the whole product is *describing the Agent OS as more autonomous than it is.* The shipped reality (6 roles, all `NONE` external actions, every output a human-approved draft) is excellent and defensible; the "24 specialist agents" narrative is not backed by code and would be the easiest thing for a skeptic to puncture. Recommendation: make "draft-only, human-in-the-loop" the *headline*, not the footnote. Add a `capabilityBound` field to `AgentDefinition` (`OBSERVE | ANALYZE | DRAFT | ROUTE | ESCALATE`) so each agent's ceiling is type-enforced and visible — and so no future code can give an agent a `SEND`/`PUBLISH` capability without a deliberate, reviewable type change.
- **The Engineer —** The command-center urgency formula (`urgency = cost-of-delay × severity × reversibility × trust`) is a real asset but it lives in prose, not code. Specify it precisely so it's deterministic and testable: `urgency = costOfDelay(daysOverdue) × severityWeight × (1 / reversibility) × trustImpact`, each factor on a documented 0–1 or small-integer scale, with `reversibility` inverted (irreversible actions float to the top). Make it a pure function `rankAttention(tasks): RankedTask[]` next to `jarvis.ts`, with golden-fixture tests (a few hand-ranked scenarios) so a weight change is caught in review. This is essentially **WSJF (Weighted Shortest Job First)** from cost-of-delay theory — name it that; it's a credible, literature-backed prioritization method.
- **The Developer —** The registry↔enum type-lock ("adding an agent here without adding to the schema is a type error") is a great DX guardrail — extend the same pattern to the run-contract. Define a `RunContract` type per agent: `{ inputs, capabilityBound, sideEffects: "NONE", approvalGate: ReviewGate, sla }`, and a single `dispatch(agentKey, task)` entry point that *cannot* execute an external side effect because the type makes `sideEffects` literally `"NONE"`. Keep `jarvis.ts` I/O-free (it already is) so the whole synthesis layer stays unit-testable with fixtures — that property is worth protecting as you add agents.
- **The Architect —** Give the 6 roles a legible departmental structure without inventing headcount. Map the *real* 6 to the 6 documented departments as **one lead role each**: Jarvis = Command & Governance; Scout = Sports Intelligence; Tal = Data & Automation / Engineering; Sarah = Customer Surface & Quality; Bobby = Growth/Community/Finance; Ava = Content (Results & Calibration narrative). That gives you the 6-department org chart the brief wants, honestly mapped to 6 real agents, with a clear path to add specialists *under* a department later. The worker-dispatch / queue / health primitives stay shared; departments are an organizing lens, not new processes.
- **The Researcher —** The attention queue is a classic operations-research problem; use the established toolkit. **WSJF / cost-of-delay** for the urgency rank (above). For the queue itself, a **priority queue with aging** (so low-urgency items don't starve — bump priority as `daysWaiting` grows) prevents the "important-but-not-urgent" task from never surfacing. For coaching the single operator, **queueing-theory load signals** (is the inbound rate exceeding the resolve rate?) turn "human-performance tracking" into an actual early-warning that the operator is overloaded — which is the honest, humane use of that subsystem.
- **Contextual Understanding lead —** The cockpit must be designed for the truth that there is *one operator* (Garrett). That reframes everything: the agents are not a "team" to manage, they are a *force-multiplier for one person*, and the cockpit's job is to compress a sprawling system into one scannable "what needs me now" view. Jarvis's `oneSentenceAssessment` + `recommendedNextActions` is exactly right; lean into it as the home screen. The 24-agent fantasy actively *hurts* this — it implies a management burden that doesn't exist.
- **Situational Understanding lead —** DRAFT_ONLY / MANUAL is the correct launch posture and should be held well past launch. The transition you can credibly make first is *not* autonomy — it's **richer drafts** (Scout drafting better-sourced research notes, Ava drafting more on-brand copy), still human-approved. Publicly, never claim "AI agents run the platform"; claim "an operator cockpit that drafts and routes, with a human approving everything that ships." That's both true and, to a serious audience, *more* trustworthy than autonomy claims.
- **Psychological Understanding lead —** For the operator, the cockpit's value is *reducing decision fatigue*, so the urgency formula's real job is psychological: surface the 1–3 things that matter and let everything else recede. Visualize urgency as a single ranked stack with a clear "why this is #1" reason string (cost-of-delay + irreversibility), because an operator trusts a priority they understand. For *users* who glimpse the cockpit concept in marketing, "Jarvis" framed as a calm, honest co-pilot (never an oracle) reinforces the brand's calm-precise-protective voice.

#### Prediction-method relevance
- **Prioritization:** WSJF / cost-of-delay (Reinertsen) — the formal basis for the urgency formula; defensible and teachable.
- **Operator-load early warning:** queueing theory (arrival rate λ vs service rate μ; utilization ρ) on the task queue → flag when the single operator is structurally overloaded before things slip.
- **Anomaly/escalation:** statistical process control (control charts) on agent queue depth and ingestion/settlement freshness → auto-escalate when a metric breaches its control limit (ties into §12 synthetic monitoring).
- **No autonomy forecasting:** explicitly *not* recommending any predictive auto-action — the methods here forecast *operator attention*, not platform actions.

#### Section rewrite seeds

**1) `capabilityBound` + run-contract addition to `AgentDefinition`:**
```ts
export type AgentCapabilityBound = "OBSERVE" | "ANALYZE" | "DRAFT" | "ROUTE" | "ESCALATE";
export interface AgentDefinition {
  // …existing fields…
  readonly capabilityBound: AgentCapabilityBound;   // hard ceiling, type-enforced
  readonly department: "COMMAND" | "SPORTS_INTEL" | "DATA_AUTOMATION"
                     | "CUSTOMER_QUALITY" | "GROWTH_FINANCE" | "RESULTS_CALIBRATION";
  readonly externalActions: "NONE";                 // unchanged invariant
}
// e.g. SCOUT.capabilityBound = "DRAFT", JARVIS.capabilityBound = "ROUTE"
```

**2) Urgency formula as a pure function (golden-fixture-tested):**
```ts
// WSJF-style attention rank. Higher = needs the operator sooner.
export function attentionScore(t: AttentionInput): number {
  const costOfDelay = clamp01(t.daysOverdue / t.toleranceDays);   // 0..1+
  const severity    = SEVERITY_WEIGHT[t.severity];                // LOW=1 … CRITICAL=5
  const reversibility = t.reversible ? 1 : 0.25;                  // irreversible floats up
  const trustImpact = t.touchesPublicTrust ? 1.5 : 1;            // brand-safety multiplier
  return (costOfDelay * severity * trustImpact) / reversibility;
}
```

**3) Visual/diagram spec — "Agent OS org chart + escalation map":** a 6-department ring with one named agent per department (the real 6), each node showing its `capabilityBound` as a badge; a single escalation arrow from every agent into Jarvis (Command), and from Jarvis a single "Operator Attention Queue" output. A legend states plainly: *"Every agent is draft-only. No external action ships without human approval."* This is the artifact that makes the OS legible and kills the over-promise risk in one image.

**4) Test to add:** `no AgentDefinition can declare a capabilityBound above ESCALATE or an externalActions other than "NONE"` (compile-time + runtime assert) — makes "draft-only" un-regressable.

---

### §12 — Governance, safety & trust

**Panel assigned:** Auditor (claim-compiler completeness, RG-string consistency) · Engineer (8-gate logic, banned-phrase regex edge cases) · Developer (single-source RG constant, scanner DX) · Architect (governance-as-package, licensable boundary) · Researcher (SR 11-7 model risk, RG codes, provenance standards) · Contextual (trust as the product) · Situational (pre-proof claim posture) · Psychological (protective-not-predatory, trust ledger persuasion).

**Verdict:** This is the strongest section in the entire product and a credible standalone business: `trust-claims.ts` (single source of allowed language + `scanForBannedPhrases`), the promotions compliance gate in `guards.ts`, and the operator-registry's `APPROVED_PARTNER`-only publish rule together form a governance stack most funded competitors don't have. The strategic move is to **package it as the licensable trust toolkit (revenue line #5)** and publish a "trust ledger" artifact — and to fix two small but real inconsistencies (the RG hotline string, and the absence of a single canonical RG constant) before they become public. Map the whole thing to recognized frameworks so the licensing pitch is instantly credible to compliance buyers.

#### Findings & ambitious upgrades

- **The Auditor —** Two real inconsistencies. (a) `trust-claims.ts`'s `risk.gamble-responsibly` ships `1-800-522-4700` (NPGH), while the doctrine and `operator-registry.ts`'s `responsibleGamingHotline` field reference `1-800-GAMBLER` — pick one, define it once, and assert via test that the RG string is identical everywhere it renders. (Both numbers are legitimate; the *inconsistency* is the risk.) (b) The 8-gate public-claim compiler (banned phrases, performance readiness, bootstrap status, settled-sample floor, model-version stamp, data freshness, CLV coverage, calibration publishable) is excellent but its decisions should be *logged with the evidence that produced ALLOW/BLOCK*, so a claim's approval is auditable months later — this is the seed of the trust ledger below.
- **The Engineer —** `scanForBannedPhrases` is well-engineered (word-boundary for short tokens like "lock" to avoid "block/unlock/clock", literal substring for multi-word phrases). Two hardening passes: (1) add unicode/leet normalization (`gu@ranteed`, `l0ck`, fancy quotes in "can't lose") so evasion in user-generated or template content is caught; (2) the regex set is rebuilt per call — precompile the patterns once at module load for the hot path (content pipeline + B2B claim-safety will call this a lot). Add fixture tests for the known false-positive traps and for the new normalization cases.
- **The Developer —** Centralize the RG language as a single exported constant so it can never drift: `export const RESPONSIBLE_GAMING = { hotline: "1-800-GAMBLER", helplineLong: "...", disclosure: "..." }` consumed by the footer, promotions guards, operator registry, and any B2B widget. This also makes the trust toolkit's claim-safety reusable: the *same* `scanForBannedPhrases` + RG constant that protects the consumer surface is what you license to a B2B customer — one source of truth, two markets.
- **The Architect —** Lift the governance stack into its own package (`packages/trust-toolkit`) exporting exactly: `scanForBannedPhrases`, the trust-claim registry types, the 8-gate `compilePublicClaim()`, the promotion-publish gate, and the RG constant — with *no* dependency on the consumer app. That boundary is what makes revenue line #5 real: a B2B customer (a smaller book, a media partner, a content shop) imports the package or calls it behind `api-governance.ts` to get "claim-safety as a service." The consumer app then becomes the *reference implementation and proof* of the toolkit you sell.
- **The Researcher —** Map the stack to named frameworks so the licensing pitch lands with compliance professionals instantly: **SR 11-7 (Fed/OCC model-risk-management)** — your model-versioning, calibration gating, and "no claim without settled sample" map cleanly to SR 11-7's model validation + ongoing monitoring; say so. **Responsible-gambling codes** — align disclosures and RG messaging to the relevant operator/affiliate advertising codes and the AGA Responsible Marketing Code patterns; the `1-800-GAMBLER` placement is exactly that discipline. **Provenance standards** — the SourceSnapshot → pick hash chain is a provenance system; frame it against emerging content-provenance norms (signed, hashed, auditable lineage). This trio turns "we have a banned-words list" into "an auditable model-risk + responsible-marketing + provenance toolkit."
- **Contextual Understanding lead —** In a market full of hype, *governance is the product's moat and its marketing*. The Trust Claim Registry isn't overhead — it's the artifact that lets GSE say "here is literally every claim we're allowed to make, and the evidence behind each" while competitors say "🔒 LOCK OF THE DAY." Make the registry partially *public* (the APPROVED claims and the banned list) as a "Truth in Picks" page — radical transparency that doubles as the trust-toolkit sales demo.
- **Situational Understanding lead —** Pre-proof, the 8-gate compiler is what keeps you *legal and credible while you have nothing to brag about* — it forces honest copy when the performance gate is closed. Sequence the trust-toolkit licensing *after* you've run the gates against your own surface for 30+ days and published one calibration report — then the pitch is "this protected us through launch, now it can protect you," which is far stronger than selling unproven governance.
- **Psychological Understanding lead —** Responsible-gaming done *protectively* (1-800-GAMBLER everywhere, never a predatory upsell) is not just compliance — it's the deepest trust signal a betting-adjacent product can send, and it should be visible by design, not buried. The "trust ledger" (a public, append-only record of what was claimed, when, and on what evidence) is a powerful persuasion artifact *because it constrains you* — visibly tying your own hands is the most credible honesty signal there is. Keep the voice calm/precise/protective in every gate message; even a BLOCK reason shown in the cockpit should read like a careful colleague, not an alarm.

#### Prediction-method relevance
- **Model-risk governance:** SR 11-7-style ongoing monitoring — calibration drift detection (predicted vs actual reliability over time) as a *gate input*, so a model that decalibrates automatically loses its performance-claim privileges.
- **Abuse/moderation anomaly detection:** for community moderation (NUDGE→…→BAN) and distress detection, use text-classification + anomaly scoring (rate-of-change in report velocity, isolation forest on user behavior) to surface straight-to-BAN cases (hate/threats/doxxing) and distress signals for human review — predictive triage, human decision.
- **Cost governance forecasting:** simple per-surface spend run-rate projection against the monthly caps (BLOG $50 / STUDIO $500 / MODEL_COURT $2000) → forecast cap-breach date and pre-emptively switch to the fallback voice before the hard cap.

#### Section rewrite seeds

**1) Single canonical RG constant (kills the hotline drift):**
```ts
// lib/responsible-gaming.ts — the ONLY place this string lives.
export const RESPONSIBLE_GAMING = {
  hotline: "1-800-GAMBLER",
  disclosure:
    "If you or someone you know has a gambling problem, call 1-800-GAMBLER. " +
    "Picks are informational analysis, not guarantees. 21+. Please play responsibly.",
} as const;
// trust-claims.ts risk.gamble-responsibly, promotions/guards.ts, footer, and any
// B2B widget import this — never inline the number again.
```

**2) New gate for the public-claim compiler (provenance):**
```
Gate 9 — PROVENANCE_CHAIN: a claim that references a specific pick or stat
BLOCKS unless that pick has an intact SourceSnapshot→hash chain
(isAuditAvailable === true). No claim may cite a pick we cannot trace.
```

**3) Trust-ledger artifact spec (public + licensable demo):** an append-only, timestamped, hash-stamped record — `{ claimId, copy, status, evidence, gatesPassed[], compilerVersion, decidedAt }` — rendered as a public "Truth in Picks" page (APPROVED claims + the banned list + last-reviewed dates) and exported as a signed JSON feed the trust-toolkit can offer B2B customers as proof-of-governance. Visual: a clean ledger table with a green "ALLOW"/red "BLOCK" column and an expandable "evidence" row per claim.

**4) Test/check to add:**
```
test "the responsible-gaming hotline string is identical across footer, trust-claims, and operator-registry"
test "scanForBannedPhrases catches leet/unicode evasions (gu@ranteed, l0ck, can’t lose with fancy quote)"
test "a claim citing a pick with isAuditAvailable=false is BLOCKED by Gate 9"
```

---

### §13 — Surface map

**Panel assigned:** Auditor (gate-coverage per route) · Engineer (route-gate enforcement, 114-API consistency) · Developer (IA legibility, nav DX) · Architect (161-page sprawl, consolidation) · Researcher (IA / card-sorting methods) · Contextual (which surfaces the market values) · Situational (what to ship vs hide at launch) · Psychological (navigation cognitive load, findability).

**Verdict:** ~161 pages and ~114 APIs is real surface sprawl for a single-operator launch — impressive in ambition, but a findability and maintenance risk, and a place where a gate could be missed. The opportunity is a **single legible information-architecture map** with consolidation: collapse the ~50 StatKing/Intelligence/Player-Lab sub-pages and ~62 admin/cockpit pages behind a smaller number of hub surfaces, and make every route's gate (PUBLIC/FREE/PREMIUM/ELITE/ADMIN) a declared, testable attribute rather than per-page logic.

#### Findings & ambitious upgrades

- **The Auditor —** With 114 APIs across 5 gate levels, the risk is a single route shipping with the wrong (or missing) gate — the exact failure the integrity doctrine forbids. Make the gate a *declared route attribute* (a manifest mapping every route → required gate) and add a CI test that asserts no API route is reachable without a declared gate, and that every PREMIUM/ELITE route calls `getUserEntitlements`/`gateApi` server-side. This converts 114 hand-audited routes into one enforced invariant.
- **The Engineer —** Build a `route-manifest.ts` (single source of truth: path, gate, owner-department) generated/checked against the filesystem, so adding a page without declaring its gate fails typecheck/CI. This also powers the IA map and the consolidation analysis below — you can't simplify what you can't see in one place.
- **The Developer —** 161 pages with no single map is a DX and onboarding tax (every new surface risks duplicating an existing one). The fix is a generated IA map (below) plus a small number of *hub* layouts that own their sub-pages, so navigation is 3 clicks deep max, not a flat 161.
- **The Architect —** Consolidation strategy: group into ~7 top-level domains — (1) Marketing/Public, (2) Picks & Slate, (3) The Observatory (proof: performance, loss room, CLV, cipher, academy — fold the engagement tools here), (4) StatKing/Player Lab (collapse ~50 sub-pages into a few parameterized hub pages with query/segment routing, not one page per stat), (5) Fantasy, (6) Account/Billing, (7) Cockpit/Admin (collapse ~62 into department-tabbed hubs matching the 6 agent departments from §11). Target: ~161 *routes* can remain, but they should resolve to **~7 hubs × parameterized children**, drastically cutting unique layouts and audit surface.
- **The Researcher —** Use real IA methods to drive consolidation: **card sorting** (open + closed) and **tree-testing** to validate that users can find the proof surfaces and the upgrade path; **first-click testing** on the pricing and picks routes. These are cheap, standard, and turn "we have a lot of pages" into "users find what converts them."
- **Contextual Understanding lead —** The market values a *small* set of surfaces intensely: the daily slate, the proof/performance surface, and pricing. Most of the 50 StatKing sub-pages are depth that serious users will love but that should not compete for primary navigation. Make the IA reflect value: 3–4 surfaces in the primary nav, everything else discoverable but secondary.
- **Situational Understanding lead —** At launch, *hide or de-emphasize* STUB/PLANNED surfaces (MLB/NHL/GSN stubs, B2B/creator surfaces) behind gates or feature flags so the public surface looks finished, not half-built. Ship the ~7 hubs; reveal depth as it earns its place.
- **Psychological Understanding lead —** 161 visible choices is cognitive overload and erodes the calm-precise brand feel; a tight, confident IA (few doors, deep rooms) signals competence. The Observatory hub especially should feel like *one place you go to trust the model*, not five scattered tools — co-locating proof surfaces compounds their trust effect.

#### Prediction-method relevance
- **IA validation:** tree-testing / first-click success rates as predictors of conversion-path completion; card-sort cluster analysis to derive the hub grouping empirically.
- **Findability:** funnel drop-off analysis (from §10 taxonomy) to detect surfaces that leak users — candidates for consolidation or promotion.

#### Section rewrite seeds

**1) `route-manifest.ts` shape (the gate-as-data invariant):**
```ts
export const ROUTE_MANIFEST = [
  { path: "/api/picks",        gate: "FREE",    domain: "PICKS" },
  { path: "/api/performance",  gate: "PUBLIC",  domain: "OBSERVATORY" },
  { path: "/api/factor-breakdown", gate: "PREMIUM", domain: "PICKS" },
  { path: "/api/alerts",       gate: "ELITE",   domain: "ACCOUNT" },
  // …every route declared exactly once…
] as const;
```
**2) Test/check to add:** `every API route file has exactly one ROUTE_MANIFEST entry; every PREMIUM/ELITE entry's handler calls a server-side entitlement gate`.

**3) Visual/diagram spec — "GSE Information Architecture (1 page)":** 7 top-level domain columns; under each, the hub page and its parameterized children; every node color-coded by gate (grey=PUBLIC, blue=FREE, ultraviolet=PRO, gold→ultraviolet=ELITE, red=ADMIN). A side panel counts routes per gate so sprawl is visible and trackable over time.

**4) Consolidation KPI:** `uniqueLayoutCount` (target: drive ~161 pages down to a tracked number of unique layouts/hubs) and `maxNavDepth` (target ≤3).

---

### §14 — Data model & types

**Panel assigned:** Auditor (PII/retention, gated-field leakage) · Engineer (~60-model integrity, enum↔type sync) · Developer (`@sports/types` ergonomics, `getEntitlements` purity) · Architect (domain boundaries across 60 models) · Researcher (event-sourcing/provenance modeling) · Contextual (model fits the proof-first product) · Situational (what's populated vs stub) · Psychological (the data model *is* the honesty — gated vs public fields).

**Verdict:** The type layer is a real strength: `packages/types/src/index.ts` cleanly separates the internal `ScoredPick` from the server-gated `PublicPick` (FREE sees `confidence: null`), the `FactorBreakdown` encodes priced-vs-shadow scores honestly, and the `AuditPayload` summary/detailed split makes provenance a typed product surface. With ~60 Prisma models the priorities are: keep the TS types authoritative over the Prisma enums (the file already says so for `SignalCategory`), enforce that gated fields can never serialize to the wrong tier, and add the few revenue/grace columns §9 needs.

#### Findings & ambitious upgrades

- **The Auditor —** The `PublicPick` type is the integrity doctrine made executable — `confidence/edgeScore/factorBreakdown` are `| null` precisely so FREE can't receive them — but *type-nullability is not runtime enforcement*. Add a `toPublicPick(scored, entitlements)` serializer that is the *only* way to build a `PublicPick`, nulling gated fields by tier, and a test that FREE serialization never contains a non-null confidence. For ~60 models, also document retention/PII per model (the event taxonomy already blocks PII at the analytics edge; mirror that discipline in the data model).
- **The Engineer —** The "keep TS in sync with the Prisma enum" convention (stated for `SignalCategory` and enforced for `OperatorAgent` via `agents.ts`) is the right pattern — make it a *test*, not a comment: a generated check that every Prisma enum has a matching TS union and vice-versa, so a schema change that outruns the types fails CI. Across 60 models, this prevents the most common drift bug.
- **The Developer —** `getEntitlements(tier)` being pure and in `@sports/types` is excellent (importable by server, tests, and the pricing module). As §9's ladder lands, keep the *pure tier→entitlements* function separate from the *async user→entitlements* lookup (it already is) — pricing-phase resolution should compose with the pure function, never re-implement it.
- **The Architect —** Group the ~60 models into the documented domains (Auth/billing, Sports core, Picks/proof, Signals, Player stats, Content/moderation, Ops/agents, Revenue/brief/calibration) and make those boundaries real with a per-domain barrel export, so a content path can't accidentally import a billing model. The `Subscription` model is the seam for §9's grace + grandfather columns (`priceLockedAt`, `lockedPhase`, `graceUntil`).
- **The Researcher —** The SourceSnapshot→pick provenance is effectively an *event-sourced audit log*; lean into that modeling — append-only snapshots, hashes, ingestion-run IDs are already there. For calibration/results, a *bitemporal* stance (what we knew at prediction time vs what we know now) is worth formalizing so a recomputed calibration never silently rewrites history (the `gatesAtPrediction` field in `AuditPayloadDetailed` already gestures at this — extend it).
- **Contextual Understanding lead —** The data model fits the proof-first product better than most: surfacing `dataQualityScore` as *always public* on `PublicPick` is a brand decision encoded in a type — transparency as a field. Keep extending that (e.g., `isAuditAvailable` already distinguishes real picks from demo rows — exactly right).
- **Situational Understanding lead —** Be honest about what's populated vs stub: MLB/NHL/GSN are STUB, derived-history fields are gated. The types should make "not yet available" representable (nullable + activation status) rather than faked — they largely do (`EvidenceActivationStatus`, `freshnessStatus: "MISSING"`). Don't let a stub sport emit a non-null confidence.
- **Psychological Understanding lead —** The data model is, quietly, the most honest thing in the product: a FREE user *structurally* cannot receive a confidence score because the type says `null`. That's trust built into the schema. Surface this in marketing — "our free tier doesn't *hide* the confidence score behind a blur; it genuinely isn't sent" is a credibility claim the architecture actually backs.

#### Prediction-method relevance
- **Calibration as a typed, monitored output:** reliability-curve computation (predicted bucket vs actual hit-rate) stored bitemporally → feeds both the public calibration claim and the SR 11-7-style drift gate (§12).
- **Provenance/event-sourcing:** append-only snapshot lineage supports reproducible re-scoring and "what did we know when" forecasting audits.

#### Section rewrite seeds

**1) The only-way-to-build-a-PublicPick serializer (runtime gate):**
```ts
export function toPublicPick(p: ScoredPick, ent: Entitlements, meta: {...}): PublicPick {
  const paid = ent.canSeeConfidence;
  return {
    /* …always-public fields… */
    dataQualityScore: p.dataQualityScore,
    confidence: paid ? p.confidence : null,
    edgeScore: paid ? p.edgeScore : null,
    factorBreakdown: ent.canSeeFactorBreakdown ? p.factorBreakdown : null,
    reasoning: paid ? p.reasoning : p.reasoningShort,
    // …
  };
}
```
**2) `Subscription` schema additions (for §9):** `priceLockedAt DateTime?`, `lockedPhase String?`, `graceUntil DateTime?` — make the grandfather + grace promises auditable data, not copy.

**3) ERD visual spec — "GSE data model, 8 domains on a page":** 8 clustered domains (color-coded), each box listing its key models; draw only the *cross-domain* foreign keys (e.g., `Pick → SourceSnapshot`, `Subscription → User`, `Promotion → Operator`) so the diagram shows the seams, not all 60 boxes' internals. Highlight the `PublicPick` gated fields in a callout: "these are nulled server-side for FREE."

**4) Test/check to add:**
```
test "every Prisma enum has a matching @sports/types union (and vice-versa)"
test "toPublicPick at FREE tier never emits non-null confidence/edgeScore/factorBreakdown"
test "a STUB-sport pick cannot serialize a non-null confidence"
```

---

### §15 — The One Ladder
**Panel assigned:** Auditor (milestone events falsifiable & immutable) · Engineer (rung thresholds, monotonicity, ratchet) · Developer (ladder as event-sourced state) · Architect (one registry gates pricing AND weight) · Researcher (calibration-unlock methodology) · Contextual (investor-narrative spine) · Situational (rung timing vs launch) · Psychological (grandfathering, milestone trust)
**Verdict:** "The same settled-and-calibrated proof milestones gate both the pricing ladder AND model-weight activation" is the **best single idea in the entire document** — it makes integrity and monetization the *same* motion, which is rare and genuinely fundable. Right now it is stated as a paragraph; it deserves to be the load-bearing diagram of the company, with each rung defined by an exact, observable, immutable proof *event*. Make the ladder canonical and it becomes the spine of the pitch, the roadmap, and the trust story simultaneously.

#### Findings & ambitious upgrades
- **The Auditor —** A ladder is only as honest as its rung-trigger events are *immutable and observable*. Define each rung as firing on a specific, append-only, tamper-evident event (settled-pick count crossing a threshold + a *published* calibration artifact with a content hash), and make rungs a **ratchet** — once PROVEN fires, a later bad week can pause *new* pricing actions but cannot silently un-fire the published milestone (the receipt is permanent). Critically: the calibration that unlocks PROVEN must be **out-of-sample and walk-forward**, or "≥100 settled" can be gamed by in-sample fitting. State the anti-gaming rule: the calibration sample that justifies a rung cannot overlap the data used to fit the weights being activated.
- **The Engineer —** Pin the thresholds and make monotonicity explicit. Today only PROVEN is quantified (≥100 settled + published calibration). Specify the full ladder with **both** a sample-size floor *and* a quality gate per rung so it can't advance on volume alone — e.g., FOUNDING (n≥0, launch), PROVEN (n≥100 settled **and** ECE_nonworsening **and** CLV-beat>0 with Wilson lower-bound>0), ESTABLISHED (n≥500 **and** sustained calibration across ≥2 recalibrations), AUTHORITY (n≥1500 **and** multi-sport calibration **and** positive CLV across regimes). The "non-worsening ECE" guard already in the doctrine is exactly the right monotonicity constraint — apply it at *every* rung, not just at calibration-apply time.
- **The Developer —** Model the ladder as an **event-sourced** projection: a `LadderEvent` append-only table (`{rung, firedAt, settledN, eceBefore, eceAfter, clvBeat, calibrationArtifactHash, engineVersion}`) and a derived current-rung view. Pricing tiers and `priced` flags both *read the same derived rung* — one source, two consumers — so "engine maturity and revenue maturity are one ladder" is literally true in the schema, not just the prose. Add `ladder.invariants.test.ts`: rung index is non-decreasing; no `priced=true` weight exists at a version whose rung is below the weight's required rung; every fired rung has a calibration artifact hash on file. This is also the cleanest possible artifact for a diligence data-room: "here is the immutable log of every time we earned the right to charge more or price a new signal."
- **The Architect —** The ladder is the **single coupling point** the whole system should bend around: §9 pricing phases, §1.3's `priced=false→priced` transition, §5's `calibration-apply.ts`, and the §12 `PERFORMANCE_STATS_ENABLED` flag are *four expressions of one state*. Collapse them onto the ladder registry so they cannot disagree. This also resolves a latent risk: today those four could drift (pricing advances but calibration didn't, or stats open before PROVEN). One registry, consumed everywhere, makes drift a type error.
- **The Researcher —** The unlock methodology should be named and rigorous: PROVEN fires when **walk-forward out-of-sample calibration** (isotonic for ≥~300 pts, Platt below) shows **non-worsening ECE** and a **reliability diagram** within tolerance, *and* **CLV-beat** has a Wilson lower bound above 0 (market-based truth, robust to outcome variance). This is the same toolkit modern model-risk validation uses (challenger-vs-champion, out-of-time validation) and it's the precise moment a *ranking* is allowed to become a *probability*. Add **conformal coverage** as a secondary unlock check so the first published probabilities ship with guaranteed interval coverage.
- **Contextual Lead —** This is the slide. The investor narrative is: *"We don't ask you to believe our model is good — we show you a ladder where the only way we make more money is by proving the model is good, on an immutable public record. Revenue and rigor are the same lever."* That sentence, over the canonical ladder diagram, is the pitch. It pre-empts the two killer objections to any prediction startup at once ("is the model real?" and "how do you grow revenue without overclaiming?") because the ladder's design answers both with one mechanism.
- **Situational Lead —** Show the marker on the ladder: *we are at FOUNDING, NFL-only, climbing toward PROVEN.* The grandfathered-for-life founding rate is the time-sensitive offer that makes "early" attractive rather than risky, and it is *itself* proof of the doctrine — you have pre-committed to never clawing back the early price. State the expected trigger window for PROVEN ("first ~100 settled NFL picks across the season") so the reader can see the next rung is *near and observable*, not vague.
- **Psychological Lead —** The ladder is a masterclass in **earned trust**: each rung is a public promise kept, and grandfathering converts early believers into permanent advocates (loss-aversion working *for* you — they'd never give up a locked-in rate). Surface a *user-facing* ladder ("here's exactly what we've proven, and what unlocks next") so members feel they're early to something rising, not buying a static product. The single most persuasive UI in the company is a progress bar toward PROVEN with the live settled-pick count — it makes the abstraction visceral and gives users a reason to check back.

#### Prediction-method relevance
§15 is where the methods *graduate*. The ladder is the gate function for the whole method portfolio:
- **Settled-sample accumulation → Wilson intervals on hit-rate** keep early claims honest (no overselling 12-2).
- **CLV beat-rate** is the market-truth signal that gates rung advancement — superforecasting/market-efficiency logic: beating the closing line is the cleanest evidence of edge.
- **Isotonic/Platt calibration + reliability diagrams + non-worsening ECE** are the exact unlock for PROVEN, at which `calibration-apply.ts` may emit real probabilities — the migration point named in §1.3.
- **Walk-forward (out-of-time) backtesting** is the anti-gaming discipline that makes "≥100 settled" meaningful rather than in-sample.
- **Model Court** is the human/process gate that signs off each promotion; **conformal prediction** is the recommended add so the first probabilities carry guaranteed coverage. Every modeling family from §1 (Elo, Dixon-Coles, boosted ensembles, the logit confidence successor) climbs *this* ladder to reach `priced=true` — there is no other door.

#### Section rewrite seeds
- **Canonical ladder diagram (spec — make this the company's hero figure).** A single vertical ladder, four rungs, each rung a card:

  | Rung | Fires when (observable event) | Unlocks (pricing) | Unlocks (engine) |
  |---|---|---|---|
  | **FOUNDING** | Launch | Founding rates (Pro $14.99 / Elite $24.99), grandfathered for life | Priced subset only; Edge Engine `priced=false` |
  | **PROVEN** | settled n≥100 **+ published walk-forward calibration (non-worsening ECE) + CLV-beat Wilson-LB>0** | First milestone price increase | `calibration-apply.ts` emits real probabilities; `PERFORMANCE_STATS_ENABLED` opens; first `priced=false→priced` promotions |
  | **ESTABLISHED** | n≥500 **+ sustained calibration across ≥2 recalibrations** | Second increase | Broader weight activation; Edge-Engine signals eligible to price |
  | **AUTHORITY** | n≥1500 **+ multi-sport calibration + positive CLV across regimes** | Authority pricing / B2B | Full multi-sport priced engine |

  Left rail: "Engine maturity." Right rail: "Revenue maturity." One arrow up the middle labeled *"the same proof events fire both sides."* Bottom: a live marker — *"You are here: FOUNDING · NFL · N of 100 toward PROVEN."*
- **§15 opening, rewritten (paste-ready).** *"GSE runs on one ladder. The same settled-and-calibrated proof milestones that let us raise prices are the milestones that let a model go from *surfaced* to *priced*. A new entrant can copy our pillars; they cannot fast-forward our ladder, because every rung is an immutable, published proof event — a settled-pick count crossing a threshold, paired with an out-of-sample calibration artifact whose hash is on record. PROVEN — ≥100 settled picks with non-worsening calibration and a positive closing-line edge — is the single threshold at which our pricing takes its first earned step up *and* `calibration-apply.ts` is first allowed to publish real win-probabilities. Engine maturity and revenue maturity are not analogous. They are the same ladder, and that ladder is the core of the pitch."*
- **`LadderEvent` schema (paste-ready, for §14 cross-ref).** ```LadderEvent { id; rung: 'FOUNDING'|'PROVEN'|'ESTABLISHED'|'AUTHORITY'; firedAt; settledN:int; eceBefore:float; eceAfter:float; clvBeatWilsonLB:float; calibrationArtifactHash:string; engineVersion:string; immutable:true }``` — append-only; pricing tier and every `priced` flag derive from the max fired rung.
- **Test to add.** `one-ladder.consistency.test.ts`: assert (1) no surface is PRICED whose required rung exceeds the current fired rung; (2) `PERFORMANCE_STATS_ENABLED` is false unless rung ≥ PROVEN; (3) `calibration-apply.ts` refuses to emit probabilities below PROVEN; (4) rung index is monotone non-decreasing in the event log. This single test makes the doc's central claim machine-enforced.

---

### Top 6 moves for the Thesis & Method cluster
Ranked by leverage (impact × credibility × low integrity-risk).

1. **Make "The One Ladder" canonical — one registry, one diagram, immutable rung events.** · *Why:* it is the most fundable idea in the doc and the spine of both the product and the pitch; collapsing §9 pricing, §1.3 `priced` flags, §5 calibration, and §12 stats-flag onto one event-sourced `LadderEvent` registry kills drift and makes "revenue = rigor" literally true in the schema. · *Effort:* M (schema + projection + 4 consumers re-pointed). · *Risk:* Low — it *strengthens* the integrity gates. · *Smallest validation:* write `one-ladder.consistency.test.ts` against the current code and see what already violates it.
2. **Reformulate confidence toward a log-odds model, shipped shadowed at weight 0.** · *Why:* the additive-points sum has real asymmetry/clamping/correlation defects; a logistic model fit on settled outcomes is calibratable and correlation-aware while preserving the 0–100 surface and grades. · *Effort:* L (modeling + backtest harness). · *Risk:* Low *if* it enters at R&D and must beat the additive model on out-of-sample Brier/ECE through Model Court before pricing — i.e., it uses the gate. · *Smallest validation:* fit a penalized logistic on existing settled picks, compare Brier vs. the additive sum offline — no production change.
3. **Turn the Status taxonomy into a typed, tested single-source-of-truth + a maturity dashboard.** · *Why:* converts the integrity doctrine from prose into a guardrail and gives partners/investors a five-second read of "what's real money vs. proven-and-waiting vs. roadmap." · *Effort:* S–M (`status.ts` enum + census script + invariant test). · *Risk:* Very low. · *Smallest validation:* ship the enum + `status-census.ts` and replace the tilde counts in "Scale at a glance" with generated numbers.
4. **Put the proof multiplier on an explicit, gated migration to a calibrated probability.** · *Why:* answers the panel's stress-test on M=0.80/bucketed-P and on "ranking index forever?" — defines exactly when (PROVEN) and how (`calibration-apply.ts` walk-forward) the GSE Score becomes a real win-probability, and makes the 0.80 floor empirically revisable. · *Effort:* M (continuous-P spec + migration rule + tests). · *Risk:* Low — fully inside the calibration gate. · *Smallest validation:* add the proof-state column to the worked-example table and the §1.3 migration paragraph; spec the continuous-P formula.
5. **Add standing reliability + orthogonality audits to Model Court (CDR + component-correlation).** · *Why:* makes "higher confidence = better" and "no double-counting" *tested properties* per engine version, not assertions — directly raises the falsifiability of the whole §1 thesis. · *Effort:* M. · *Risk:* Low (it's a gate, not a score change). · *Smallest validation:* compute Confidence Decile Reliability on existing settled picks with Wilson bands and eyeball monotonicity.
6. **Rewrite §0 around the one-ladder spine + a one-line "what's true today" honesty statement.** · *Why:* the summary currently lists features before it lands the single fundable idea; leading with "engine maturity and revenue maturity are one ladder" + an explicit today/roadmap line makes the whole document magnetic and auto-defensible. · *Effort:* S. · *Risk:* None. · *Smallest validation:* drop in the rewritten opening paragraph and the honesty line; read it cold against the old version.

---

### §16 — Live-now vs roadmap (consolidated table)

**Panel assigned:** Auditor (live-claim honesty per row) · Engineer (gate-flag wiring) · Developer (status-as-data) · Architect (build-not-wired boundaries) · Researcher (activation-threshold methods) · Contextual (what "live" should mean to the market) · Situational (launch sequencing) · Psychological (honest status as a trust signal).

**Verdict:** The live-now/roadmap discipline is itself a trust asset — explicitly labeling PRICED vs BUILT-but-gated vs PLANNED vs STUB is exactly the honesty the brand sells, and it's largely backed by code (the gates, the `EvidenceActivationStatus`, the operator registry's empty APPROVED_PARTNER list). The opportunity is to make this table *generated from the code's actual gate/flag state* rather than hand-maintained, so "live-now" can never drift from reality, and to sequence the gated-BUILT items (calibrated win probabilities, public performance/CLV) for activation the moment their sample thresholds clear.

#### Findings & ambitious upgrades

- **The Auditor —** The biggest honesty win available: make the live/roadmap status *derived from the same gates the product enforces* (the `JarvisReadinessGates`, `PublicPerformancePolicy`, `OperatorRegistry` summary, feature flags). A hand-maintained table can lie; a generated one can't. Audit rule: nothing may be labeled "LIVE" unless its enforcing gate is actually open in the running config.
- **The Engineer —** Several items are "BUILT, activate at sample ≥100" (calibrated win probabilities) or "BUILT NOT-WIRED" (affiliate ledger). Encode the activation predicate as code (`canActivateCalibratedProbabilities = settledCanonical ≥ 100 && calibrationPublished`) reading the real counts, so activation is a flag flip with a test, not a judgment call. The affiliate ledger's NOT-WIRED status is correct and safe — keep crypto + ad-pixel excluded as the code already specifies.
- **The Developer —** Represent status as data: a `FEATURE_STATUS` map (`PRICED | BUILT_GATED | BUILT_NOT_WIRED | PLANNED | STUB | RND`) with the gate/flag that controls each, so the §16 table, the cockpit, and the roadmap page all read one source. This is the same "status-as-data" move as §11's capability bounds and §13's route manifest — one pattern, applied consistently.
- **The Architect —** "BUILT NOT-WIRED" is a legitimate, even admirable, architectural state (the affiliate ledger is fully tested pure logic with the wiring deliberately withheld) — but it needs a clear boundary so a future PR can't accidentally wire it without review. Gate the wiring behind an explicit `AFFILIATE_LEDGER_WIRED` flag that defaults off and whose flip requires the operator-registry to contain ≥1 APPROVED_PARTNER.
- **The Researcher —** The activation thresholds (≥100 settled for calibrated probabilities, CLV beat ≥52.4%/55% for phase advance) are the right *kind* of trigger; ground them statistically — a ≥100 sample is roughly where a win-rate/calibration estimate's confidence interval tightens enough to publish, and 52.4% is the break-even against standard -110 vig (name that explicitly; it's a credible, recognizable number). Consider a *sequential-test / confidence-interval* gate rather than a raw count so you activate when the estimate is *statistically* ready, not just at an arbitrary N.
- **Contextual Understanding lead —** To the market, "live" should mean "you can use it today and trust the label." GSE's table mostly honors that; the risk is letting R&D items (Kalshi edge, Poisson/Elo/ML) read as more imminent than they are. Keep R&D clearly R&D — the brand's credibility comes from *under*-claiming.
- **Situational Understanding lead —** Sequencing: subs + promotions compliance are LIVE (correct launch core); the first *new* activations to plan for are the BUILT-gated proof surfaces (public performance, CLV, calibrated probabilities) because they directly justify the §9 phase advance and the price increase — they're the bridge from FOUNDING to PROVEN. B2B/creator/trust-toolkit (PLANNED) come after the first published calibration.
- **Psychological Understanding lead —** The live/roadmap table *is* a trust artifact — publishing it (even partially) signals "we'll tell you exactly what's real," which is rare and disarming in this category. The "BUILT but held back until we have enough data to do it honestly" framing is genuinely persuasive: it shows restraint, which reads as integrity. Lean into it on the public roadmap.

#### Prediction-method relevance
- **Activation thresholds:** confidence-interval / sequential-testing gates (activate a public stat when its CI is tight enough), not raw counts — statistically defensible "we're ready now."
- **Phase-advance triggers:** 52.4% = -110 break-even (name it); CLV-beat thresholds validated by the §9 elasticity/DiD analysis before each price step.
- **Calibration readiness:** reliability-curve stability over a rolling window as the publish trigger for calibrated win probabilities.

#### Section rewrite seeds

**1) `FEATURE_STATUS` as data (single source for §16 table + cockpit + roadmap):**
```ts
export const FEATURE_STATUS = {
  consensus_signal:        { status: "PRICED",          gate: null },
  ats_h2h_venue:           { status: "PRICED_GATED",    gate: "DERIVED_MODEL_HISTORY_ENABLED" },
  calibrated_win_prob:     { status: "BUILT_GATED",     gate: "canActivateCalibratedProbabilities" },
  public_performance_clv:  { status: "BUILT_GATED",     gate: "canExposePerformanceStats" },
  affiliate_ledger:        { status: "BUILT_NOT_WIRED", gate: "AFFILIATE_LEDGER_WIRED" },
  b2b_widgets_api:         { status: "PLANNED",         gate: null },
  trust_toolkit_licensing: { status: "PLANNED",         gate: null },
  mlb_nhl_gsn:             { status: "STUB",            gate: null },
} as const;
```
**2) Activation predicate (statistically grounded):**
```ts
export const canActivateCalibratedProbabilities = (s: {settledCanonical:number; calibrationPublished:boolean}) =>
  s.settledCanonical >= 100 && s.calibrationPublished; // ≥100 ≈ CI tightens enough to publish honestly
```
**3) Visual/diagram spec — "Live-now vs roadmap, generated":** a single status board grouped by status (PRICED / BUILT-GATED / BUILT-NOT-WIRED / PLANNED / R&D / STUB), each row showing the controlling gate/flag and (for gated items) a progress bar toward its activation threshold. Generated from `FEATURE_STATUS` + live gate state so it can never lie.

**4) Test/check to add:** `nothing in FEATURE_STATUS labeled a live status (PRICED/BUILT_GATED-open) without its controlling gate actually open in config; AFFILIATE_LEDGER_WIRED cannot be true with zero APPROVED_PARTNER operators`.

---

### Top 7 moves for the Business, Ops & Surfaces cluster
Ranked by leverage (impact × how cheaply it de-risks or unlocks revenue/trust).

1. **Ship the pricing-as-a-module (`lib/pricing/`) the spec already describes — and fix the grace window first.**
   *Why:* The proof-gated ladder is GSE's core monetization differentiator but is *not in the code* (only a flat `getEntitlements` map exists), and `getUserEntitlements` drops `PAST_DUE` users to FREE with no grace — a live revenue + churn leak. *Effort:* M. *Risk:* Low (pure resolver + one query change; mostly additive). *Smallest validation:* a test proving `PAST_DUE` within grace keeps the paid tier, and `resolvePrice` fails closed without a Stripe price ID.

2. **Wire one analytics provider (PostHog) and add the proof-loop events so the funnel the business depends on stops being theoretical.**
   *Why:* `event-taxonomy.ts` is built and PII-safe but no provider is wired; you launch blind on conversion, churn, and the phase-elasticity data §9 needs. *Effort:* S–M. *Risk:* Low (thin `track()` facade; privacy-first provider matches the brand). *Smallest validation:* the 4 new proof-loop events flow into a PostHog funnel from a staging session with PII masking confirmed.

3. **Make the Agent OS *legible and honest*: 6 real agents → 6 departments, add `capabilityBound`, ship the org-chart + escalation visual.**
   *Why:* The "24 agents" narrative is the single biggest integrity-puncture risk; the real 6-role, draft-only system is *more* trustworthy when shown plainly. *Effort:* S (type field + one diagram; no new agents). *Risk:* Very low. *Smallest validation:* a compile/runtime test that no agent can declare `externalActions !== "NONE"` or a capability above `ESCALATE`.

4. **Sharpen the command-center urgency formula into a pure, golden-tested `attentionScore()` (WSJF) and visualize the ranked stack.**
   *Why:* It's a genuine asset living in prose; as code it becomes deterministic, testable, and the cockpit's home-screen value for a single overloaded operator. *Effort:* S. *Risk:* Low. *Smallest validation:* a handful of hand-ranked fixtures the function must reproduce; weight changes caught in review.

5. **Package the governance stack as `packages/trust-toolkit` (revenue line #5) and publish a public "Truth in Picks" trust ledger.**
   *Why:* The strongest, most differentiated part of the product is also a credible standalone B2B business and a marketing moat; mapping it to SR 11-7 + RG codes + provenance makes the pitch instant. *Effort:* M. *Risk:* Medium (don't sell until proven on your own surface 30+ days). *Smallest validation:* the consumer app imports the package with zero behavior change; a one-page trust-ledger renders the APPROVED + banned claims.

6. **Fix the responsible-gaming string drift: one canonical `RESPONSIBLE_GAMING` constant (1-800-GAMBLER) consumed everywhere, plus banned-phrase evasion hardening.**
   *Why:* `trust-claims.ts` ships `1-800-522-4700` while the registry/doctrine say `1-800-GAMBLER`; inconsistency in *protective* messaging is both a compliance and a trust risk, and `scanForBannedPhrases` can be evaded by leet/unicode. *Effort:* S. *Risk:* Very low (centralization + regex normalization). *Smallest validation:* a test asserting the RG string is identical across footer/trust-claims/operator-registry and that `gu@ranteed`/`l0ck` are caught.

7. **Tame surface sprawl with a `route-manifest.ts` gate-as-data invariant and a 1-page IA map (161 pages → ~7 hubs).**
   *Why:* 114 APIs × 5 gate levels is where a paywall gets missed (a doctrine violation), and 161 pages with no map is a findability + maintenance tax that dulls the calm-precise brand. *Effort:* M. *Risk:* Low (additive manifest + CI test; consolidation is incremental). *Smallest validation:* a CI test that every API route has exactly one declared gate and every PREMIUM/ELITE handler calls a server-side entitlement check.

---

### §17 — Multi-sport posture

**Panel assigned:** Auditor (no-overclaim on stub sports) · Engineer (Poisson/bivariate/Skellam math) · Developer (per-sport adapter + identity reuse) · Architect (sport-agnostic engine vs sport-specific depth boundary) · Researcher (bivariate-Poisson/Dixon-Coles/MoneyPuck-xG/Skellam) · Contextual lead (which sport earns build next) · Situational lead (rights/data sequencing) · Psychological lead (honest "coming soon" vs live depth).

**Verdict:** The posture is exactly right and unusually honest: NFL is fully instrumented (odds + nflverse depth); The Odds API already returns 7 sports so the *pick engine generalizes*; `/mlb`, `/nhl`, `/gsn` are stubs; `lib/lahman` (MLB) and `lib/moneypuck` (NHL) are early source-gated footholds; and `poisson.ts` is already shipped but unwired. The opportunity is a concrete, proof-laddered expansion playbook that treats each new sport as a *data-depth + rights* problem riding the existing engine and gating spine — MLB via Poisson/bivariate-Poisson on Lahman, NHL via MoneyPuck-style xG + Poisson/Skellam, soccer via Dixon-Coles only if/when rights justify it — never an engine rewrite.

#### Findings & ambitious upgrades

**Auditor —** The honesty of "stubs are stubs" must be enforced: `/mlb`, `/nhl`, `/gsn` must render a clear "instrumented for odds, depth in development" state and must NOT borrow NFL's depth visuals to imply parity that doesn't exist. Assert per-sport that depth widgets only render when that sport's depth source is `ACTIVE` in `source-registry`. The `assertTeamRatesAvailable()` guard in `poisson.ts` is the right instinct — extend it so any Poisson-derived number refuses to render for a sport whose rate inputs aren't present (no silent zeros masquerading as predictions).

**Engineer —** `poisson.ts` already has `poissonPmf/Cdf`, `jointScoreMatrix`, `moneylineProbabilities`, `overUnderProbabilities`. Wire it sport-by-sport with the *right* distribution per sport: **MLB/NHL** → independent or bivariate Poisson on team scoring rates; **NHL win margin** → the **Skellam distribution** (difference of two Poissons) is the natural, low-parameter model for goal margin and slots directly into a spread/puck-line probability; **soccer** (if ever) → **bivariate Poisson with the Dixon-Coles low-score (ρ) correction** for the 0-0/1-0/0-1/1-1 dependence and draw inflation. Add **dispersion checks**: baseball run distributions are often over-dispersed (negative-binomial or Conway-Maxwell-Poisson fits better than vanilla Poisson) — measure dispersion on Lahman before committing to Poisson.

**Developer —** The expansion unit is a **sport adapter** implementing one interface: `{ ingest (Odds API already covers), teamRates(source), scoreDistribution(rates), settle(rules) }`. MLB and NHL adapters reuse the `packages/identity/` join contract (extracted in §6) so records stay joinable without NFL feature code. `lib/lahman` and `lib/moneypuck` become the `teamRates` providers for their sports, source-gated exactly like the-odds-api. The settlement rules already differ correctly (soccer ML draw = LOSS, per `settlement.ts`) — extend that table per sport.

**Architect —** This is the cleanest architectural story in the platform and should be stated as doctrine: **one sport-agnostic scoring engine + one gating spine + per-sport feature depth.** The engine (`scoring.ts`), the ladder (`readiness`/`calibration`/`signal-snapshot`), and the market stack (§7, de-vig, CLV) are *already* sport-general. Only the *depth* layer (nflverse / lahman / moneypuck) is sport-specific, and it plugs in as features. This is why "expansion is a data-depth + rights problem, not an engine rewrite" is literally true — encode it as the layering rule so no one accidentally forks the scorer per sport.

**Researcher —** Named methods per sport: **(1) MLB** — independent/bivariate Poisson on team run rates from Lahman; check over-dispersion and fall back to **negative-binomial / Conway-Maxwell-Poisson** if runs/game are over-dispersed; pitcher adjustments via a Poisson MLE rate model. **(2) NHL** — **MoneyPuck-style expected-goals (xG)** as the team-rate input (gradient-boosted shot-quality model on location/type with rebound/flurry adjustments), then **Poisson for totals and Skellam for the goal-margin / puck-line**. **(3) Soccer** — **Dixon-Coles** (bivariate Poisson + ρ low-score correction + time-weighting) is the academic gold standard; only build if rights/audience justify it. **(4) Cross-sport** — every sport's model output is *just another fair-probability feature* entering the same ladder, so calibration (`computeCalibration` Brier/ECE) is identical across sports — the proof ladder is sport-independent.

**Contextual lead —** Sequence by *audience × data-readiness × rights*, not by engineering ease. NFL depth is the moat — finish it. NHL is the strongest *next* technical fit (MoneyPuck-style public xG methodology is mature and the math is clean Poisson/Skellam) and a passionate, under-served bettor base. MLB has the richest free historical data (Lahman) but the longest season and highest variance — great for *content/almanac* authority even before live depth. `/gsn` (a house/original property) is the wildcard — only instrument it once the core sports prove the model.

**Situational lead —** Gate expansion on rights first, data second, proof third. For each sport: (1) confirm the depth source's `commercialUseStatus` is `APPROVED` in `source-registry` *before* building visuals; (2) run the sport in **shadow** (score + settle internally, no public picks) until it has ≥100 settled games and non-worsening ECE on that sport's buckets; (3) only then flip that sport's `canExposePublicPicks`-equivalent. Launch each sport the same disciplined way NFL is launching — with receipts.

**Psychological lead —** The honest stub is a *trust asset*, not an embarrassment. "We're instrumented for odds here, and we don't fake depth we don't have" reinforces the entire brand promise. When a sport goes live, the conformal/Brier scoreboard from day one ("here's our calibration on NHL across N settled games") converts skeptics faster than any launch hype. Show the proof ladder publicly per sport — users trust a platform that says "not yet" far more than one that pretends.

#### Prediction-method relevance (REQUIRED)

- **Independent / bivariate Poisson (MLB, NHL totals):** team scoring rates → `jointScoreMatrix` → moneyline/total fair probabilities via the already-shipped `poisson.ts`. Each output is a fair-probability feature entering the ladder; calibrated by `computeCalibration` per sport.
- **Skellam distribution (NHL/soccer margin):** difference of two Poissons → direct goal-margin / puck-line probability without modeling score correlation explicitly. Wires into the spread-probability path; ideal for hockey puck lines.
- **MoneyPuck-style expected goals (xG, gradient-boosted shot model):** the NHL *team-rate provider* feeding the Poisson/Skellam layer; lives in `lib/moneypuck`, source-gated. Its uncertainty can carry a conformal band like §6's player metrics.
- **Negative-binomial / Conway-Maxwell-Poisson (MLB over-dispersion):** the principled fallback when run distributions are over-dispersed relative to Poisson; a dispersion test on Lahman decides Poisson vs NB/CMP before launch.
- **Dixon-Coles bivariate Poisson with ρ low-score correction + time-weighting (soccer, conditional):** the academic gold standard for football scorelines and draw inflation; build only if rights/audience justify. Plugs in as the soccer `scoreDistribution`, same ladder.

#### Section rewrite seeds

**1. Sport-adapter interface (paste-ready, the expansion unit):**
```
interface SportAdapter {
  sport: "NFL"|"MLB"|"NHL"|"SOCCER"|"GSN";
  teamRates(gameId): Promise<{ home: number; away: number; source: SourceId; freshness: FreshnessStatus }>; // lahman|moneypuck|...
  scoreDistribution(rates): { joint: number[][]; ml: {home:number;away:number}; total: (line:number)=>{over:number;under:number};
                              margin: (line:number)=>number /* Skellam for NHL/soccer */ };
  settle(final, line, type): "WIN"|"LOSS"|"PUSH";   // per-sport rules (soccer ML draw = LOSS)
}
// Guard: scoreDistribution refuses (assertTeamRatesAvailable) if rates.source is not ACTIVE in source-registry for this sport.
```

**2. NHL Skellam puck-line formula:**
```
Let λ_home, λ_away = expected goals (from MoneyPuck-style xG). Margin M = Goals_home − Goals_away ~ Skellam(λ_home, λ_away).
P(home covers −1.5) = P(M ≥ 2) = 1 − Skellam_CDF(1; λ_home, λ_away).
P(away +1.5)        = P(M ≤ 1).
Totals: Goals_home+Goals_away ~ Poisson(λ_home+λ_away) → over/under via poissonCdf. Wire through existing poisson.ts helpers.
```

**3. Per-sport launch gate (checklist artifact):**
```
SPORT GO-LIVE GATE (all must pass, in order):
[ ] depth source commercialUseStatus = APPROVED in source-registry
[ ] teamRates source freshness SLA defined + ACTIVE
[ ] ≥100 settled games for this sport (platform-config.minSettledPicksForLearning)
[ ] non-worsening ECE on this sport's confidence buckets (computeCalibration)
[ ] Model Court review of the sport's scoreDistribution features
[ ] flip canExposePublicPicks-equivalent for THIS sport only
Until all pass: route renders "instrumented for odds; depth in development" — no borrowed NFL depth visuals.
```

**4. Dispersion backtest (MLB, pre-launch):**
```
GIVEN Lahman team runs/game over ≥5 seasons
WHEN comparing fit of Poisson vs Negative-Binomial vs Conway-Maxwell-Poisson (AIC + dispersion index Var/Mean)
THEN if dispersion index > 1.2 (over-dispersed), adopt NB/CMP for MLB scoreDistribution; else Poisson.
Log the decision + AIC table to the model decision log; re-test annually.
```

---

### Top 6 moves for the Intelligence cluster
Ranked by leverage. Each: move · why · effort · risk · smallest validation.

1. **Name and surface ECE + the calibration scoreboard from the existing `calibration/compute.ts`.**
   *Why:* The Brier/delta/bucket machinery is already built; ECE = sample-weighted mean of |delta| is one function away. This is the single gate that governs every "priced" decision in §6/§7/§8/§17 and the most credible public trust artifact GSE can ship. *Effort:* S. *Risk:* Low (read-only addition). *Smallest validation:* add `computeECE(report)` + a unit test asserting it equals the hand-computed weighted-mean |delta| on a fixture; render one reliability-diagram bucket chart.

2. **Build the player-feature ladder: `lib/projections/feature-registry.ts` + `computeFeatureCalibration()` so opponent-adjusted EPA can ride shadow→Court→priced WITHOUT touching `canPublishProjections`.**
   *Why:* Unlocks StatKing's moat into game confidence legitimately — the cluster's biggest upside, fully integrity-safe. *Effort:* M. *Risk:* Medium (must enforce the projection-leakage invariant). *Smallest validation:* the §6 leakage test (no `player-projection` lineage in `FactorBreakdown` while gated) + `computeFeatureCalibration("team.oppAdjEPA")` returns the calibration shape on a ≥100-game fixture.

3. **Ship the de-vig ensemble (Shin default + multiplicative/additive/power spread) in `game-market-read.ts`.**
   *Why:* The current single-method no-vig is the weakest under favorite-longshot bias; Shin is principled and the disagreement band is honest information. Improves every downstream edge/CLV number. *Effort:* M. *Risk:* Low–Medium (must surface disagreement, not hide it). *Smallest validation:* unit test that all four methods coincide within 0.005 on -110/-110 and diverge on a lopsided 3-way; snapshot the "methods disagree" badge trigger.

4. **Give every war-room agent a provenance + falsifier contract and a `signalLineageId`, reconciled with §5 Model Court.**
   *Why:* Converts the council from DEMO theater into the platform's flagship "show your work" surface; unifies governance across the cluster. *Effort:* M. *Risk:* Low (DEMO stays labeled until backed). *Smallest validation:* the render-guard test (verdict with empty provenance/falsifier cannot render live) + one agent (sharp) wired to the real steam/RLM detector.

5. **Add conformal prediction bands to GPI / `player-projection` and color them by King Standard.**
   *Why:* Turns false-precision numbers into honest ranges — the strongest trust signal for an analytical audience, and the spec that makes "King Standard" falsifiable. *Effort:* S–M. *Risk:* Low (display-only; never a wired projection). *Smallest validation:* compute 80% conformal interval from `player-projection` residuals on a holdout; assert empirical coverage ∈ [0.74, 0.86]; render the band + King Standard badge.

6. **Wire `poisson.ts` for NHL via MoneyPuck-style xG → Poisson totals + Skellam puck-line, behind the per-sport go-live gate.**
   *Why:* Strongest next-sport technical fit, proves the "one engine, per-sport depth" doctrine, and the math is already shipped and unwired. *Effort:* M–L (rights + data dependent). *Risk:* Medium (rights confirmation on MoneyPuck-class source first; shadow-only until ≥100 settled + non-worsening ECE). *Smallest validation:* NHL adapter `scoreDistribution` produces puck-line probs via Skellam on a fixture; `assertTeamRatesAvailable` refuses when the NHL depth source is not ACTIVE; sport renders "depth in development" until the gate passes.

---

*Companion document: `GSE_FORECASTING_METHODOLOGY_ATLAS.md` — 169 named prediction/forecasting methods rated for GSE relevance.*
