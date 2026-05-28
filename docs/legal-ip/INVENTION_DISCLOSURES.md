# Invention Disclosures — Galaxy Sports Edge

This document is a dated record of inventions developed at Galaxy. Each
disclosure establishes timeline, contributors, novelty, and candidacy for
trade-secret or patent protection.

Even without immediate patent filing, the act of recording an invention with
a date and a description creates **evidence of conception**. That evidence
is useful for:

- Defending against later patent claims by competitors
- Establishing chain-of-title at acquisition
- Supporting trade-secret protection
- Supporting future patent applications

## Schema

Each disclosure includes:

- **ID** — internal identifier (`INV-NNN`)
- **Feature** — name
- **Problem solved** — what user/market pain it addresses
- **Why existing solutions are insufficient** — competitor gap analysis
- **How the system solves it** — high-level mechanism
- **Technical novelty** — what is new
- **Data inputs** — what the system consumes
- **Outputs** — what it produces
- **User workflow improvement** — what the user can now do
- **Contributors** — named individuals
- **Date conceived** — when the idea formed
- **Date implemented** — when first working code/page shipped
- **Repo commits** — commit hashes
- **Public disclosure** — what is/is not visible publicly
- **Patent candidate** — Yes / No / Maybe with rationale
- **Trade-secret candidate** — Yes / No / Maybe with rationale

---

## INV-001 — Parlay MRI

- **Feature:** Parlay MRI
- **Problem solved:** Parlays are the highest-margin product offered by
  sportsbooks, and the most opaque to bettors. Standard parlay calculators
  show implied payout but not structural quality. Bettors assume legs are
  independent; in practice they are correlated, and that correlation is
  priced as if it weren't.
- **Why existing solutions are insufficient:** Action Network, BettingPros,
  and OddsJam offer parlay calculators that show payout math. None
  diagnose correlation, EV dilution, or structural weakness. None classify
  a parlay as "structurally weak / acceptable / strong" with a reason
  taxonomy.
- **How the system solves it:** Galaxy's Parlay MRI takes a multi-leg
  parlay as input, scores each leg pair on a correlation matrix, calculates
  expected EV dilution against fair pricing, applies a structural classifier
  (same-game / same-team / cross-correlated), and produces a verdict with
  a reason code and a recommended discipline action.
- **Technical novelty:**
  - Reason-coded structural classification (not just numeric output)
  - Correlation matrix driven by game-script analysis, not naive
    historical correlation
  - Integration with the No-Bet doctrine (parlay can fail MRI even when
    each leg would individually publish)
- **Data inputs:** Leg list, game contexts, line snapshots, Galaxy's
  per-leg confidence scores
- **Outputs:** Verdict (structurally weak / acceptable / strong),
  reason codes, EV-dilution estimate, recommended action
- **User workflow improvement:** Bettors can submit a parlay and learn
  why it is or is not a defensible structure before placing it.
- **Contributors:** Founder (concept + page-level architecture)
- **Date conceived:** 2026-Q2
- **Date implemented:** `/parlay-mri` page live 2026-05-28 (commit
  `92ec468`); diagnostic engine pending
- **Repo commits:** `92ec468`
- **Public disclosure:** Page exists and explains the concept. The
  correlation matrix, reason-code thresholds, and verdict logic are not
  disclosed.
- **Patent candidate:** Maybe — structural-classification approach may be
  novel enough to file. Attorney review required.
- **Trade-secret candidate:** Yes (verdict logic)

## INV-002 — No-Bet Engine

- **Feature:** No-Bet Engine
- **Problem solved:** Standard picks products only publish. They have no
  surface for "the model evaluated this game and decided not to publish,
  here is why." This trains users to assume every day must have action.
- **Why existing solutions are insufficient:** Action Network and others
  publish picks. No tout-style or analytics-style product publishes a
  reason-coded pass list.
- **How the system solves it:** Galaxy ingests every candidate game,
  scores it, and routes those below the publish gate into a pass list
  with a reason code drawn from a 12-category taxonomy
  (`NO_BET_REASONS`). The pass list is its own first-class surface
  at `/no-bet`.
- **Technical novelty:**
  - Pass list as a first-class product, not an internal log
  - Reason-coded taxonomy with hard/soft severity
  - Integration into the daily briefing as "what to ignore"
- **Data inputs:** Full slate, factor scores, freshness checks,
  market-state snapshots
- **Outputs:** Per-game pass entry with reason code, severity, and
  short rationale
- **User workflow improvement:** Bettors stop forcing action on no-edge
  games. The "what didn't publish" surface becomes a discipline trainer.
- **Contributors:** Founder
- **Date conceived:** 2026-Q1
- **Date implemented:** `/no-bet` page live 2026-05-28 (commit
  `0094125`)
- **Repo commits:** `0094125`
- **Public disclosure:** Taxonomy public. Threshold-to-reason mapping
  private.
- **Patent candidate:** Maybe
- **Trade-secret candidate:** Yes

## INV-003 — Post-Bet Autopsy

- **Feature:** Post-Bet Autopsy
- **Problem solved:** Bettors review results, not process. Variance in a
  small sample means that result-only review trains the wrong reflexes.
  A bettor who wins on a bad-process bet learns to repeat the bad process.
- **Why existing solutions are insufficient:** Tracker apps (Pikkit,
  Juice Reel) record outcomes and ROI. None separate process quality
  from outcome variance. None offer a quadrant classifier.
- **How the system solves it:** Every settled pick is scored on four
  dimensions (Process Grade, Signal Grade, CLV Result, Outcome) and
  classified into one of four patterns. Pattern dictates recommended
  action — variance acceptance, structural-gate addition, or
  thesis-repeat analysis.
- **Technical novelty:**
  - Four-dimensional scoring rubric per settled pick
  - Quadrant classifier with reason-coded recommendations
  - "Bad process / good outcome" treated as a loss for review purposes
- **Data inputs:** Settled pick record, factor snapshot at time of bet,
  opening line, entry price, closing line, user log entry (if Tracker
  is in use)
- **Outputs:** Per-pick autopsy entry with four grades and recommendation
- **User workflow improvement:** Bettors learn to distinguish variance
  from skill in real time.
- **Contributors:** Founder
- **Date conceived:** 2026-Q1
- **Date implemented:** `/autopsy` page live 2026-05-28 (commit
  `92ec468`); per-pick scoring engine pending
- **Repo commits:** `92ec468`
- **Public disclosure:** Framework public. Per-grade derivation rules
  private.
- **Patent candidate:** Maybe — quadrant approach may be filable
- **Trade-secret candidate:** Yes (derivation rules)

## INV-004 — Market Mirage Detector

- **Feature:** Market Mirage Detector
- **Problem solved:** Most line-movement tools show that a line moved.
  They don't classify whether the movement is signal or noise. A bettor
  acting on every line move is acting on noise more than signal.
- **Why existing solutions are insufficient:** OddsJam and Action Network
  surface line moves with steam alerts. They don't classify the movement
  type with a reason code or screen for false-signal patterns.
- **How the system solves it:** Six false-signal patterns are codified
  (`MARKET_MIRAGE_REASONS`). Each movement is evaluated against
  multi-book consensus, handle-vs-bet-count split, velocity, and
  freshness. Output is Real Signal / Noise / Ambiguous with reason.
- **Technical novelty:**
  - Six-pattern false-signal taxonomy
  - Multi-book consensus + handle split + velocity composite
  - Reason-coded ambiguous bucket (not just binary)
- **Data inputs:** Multi-book line snapshots, bet counts, handle splits
  if available, time series
- **Outputs:** Per-movement classification with reason code
- **User workflow improvement:** Bettors stop chasing every line move.
  Movement quality becomes a first-class signal.
- **Contributors:** Founder
- **Date conceived:** 2026-Q2
- **Date implemented:** `/market-mirage` page live 2026-05-28 (commit
  `92ec468`)
- **Repo commits:** `92ec468`
- **Public disclosure:** Pattern names public. Screening logic private.
- **Patent candidate:** Maybe
- **Trade-secret candidate:** Yes

## INV-005 — Roster Shock Index

- **Feature:** Roster Shock Index
- **Problem solved:** Lineup changes reprice the market with a delay.
  There is a ~15–30 minute window between announcement and reprice
  where value exists. Bettors don't know where in that window they are.
- **Why existing solutions are insufficient:** Injury feeds exist.
  Repricing-window tooling does not.
- **How the system solves it:** Five impact categories scored per
  announcement (starter impact, usage redistribution, pace effect,
  line timing, market depth). Output is a per-game Shock Index and
  a timing-window indicator (0–15 / 15–45 / 45+ min).
- **Technical novelty:**
  - Timing-window classification as a first-class output
  - Usage redistribution scoring (second player, not the backup, often
    absorbs the highest usage share)
- **Data inputs:** Roster announcements, historical usage data, market
  depth per book
- **Outputs:** Per-announcement shock index, timing-window indicator,
  affected markets list
- **User workflow improvement:** Bettors know whether the value window
  is open or closed before they act.
- **Contributors:** Founder
- **Date conceived:** 2026-Q2
- **Date implemented:** `/roster-shock` page live 2026-05-28 (commit
  `92ec468`)
- **Repo commits:** `92ec468`
- **Public disclosure:** Categories public. Weighting private.
- **Patent candidate:** Maybe
- **Trade-secret candidate:** Yes

## INV-006 — Coaching Edge Model

- **Feature:** Coaching Edge Model
- **Problem solved:** Coaching tendencies (pace, rotation depth, ATS
  discipline, fourth-quarter aggression, scheme vs. matchup) are among
  the most stable signals in a variable game. They are systematically
  underpriced because they are slow to extract and require multi-season
  context.
- **Why existing solutions are insufficient:** Coaching tendencies are
  discussed in podcasts and articles. They are not surfaced as a
  first-class model input in any analytics product.
- **How the system solves it:** Per-coach baselines derived from
  historical ATS behavior, scored against opponent tendencies,
  travel, and rest. Coaching factor only adds weight to a pick when
  supported by schedule/rest factors (gate prevents over-weighting).
- **Technical novelty:**
  - Gate that requires schedule/rest confirmation before coaching
    factor adds weight
  - Mid-season change invalidates prior baseline data
- **Data inputs:** Historical coach ATS, opponent tendencies, schedule,
  travel
- **Outputs:** Per-game coaching-factor contribution, matchup-mismatch
  flag
- **User workflow improvement:** Bettors get coaching signal without
  losing the model's gates.
- **Contributors:** Founder
- **Date conceived:** 2026-Q2
- **Date implemented:** `/coaching-edge` page live 2026-05-28 (commit
  `92ec468`)
- **Repo commits:** `92ec468`
- **Public disclosure:** Factors public. Baselines and weights private.
- **Patent candidate:** Maybe
- **Trade-secret candidate:** Yes

## INV-007 — Betting Brain Profile

- **Feature:** Betting Brain Profile
- **Problem solved:** Every bettor has structural failure modes (tilt
  vulnerability, line FOMO, overconfidence after a win streak). No
  product surfaces these patterns or adapts to them.
- **Why existing solutions are insufficient:** Tracker apps record
  outcomes. They don't profile the user.
- **How the system solves it:** Five-dimension self-assessment
  (risk tolerance, primary approach, volume, tilt trigger, primary
  sport) produces an archetype. Galaxy's surfaces (briefing, alerts,
  risk framing, exposure thresholds) adapt to the archetype.
- **Technical novelty:**
  - Archetype-shaped product surfaces (same pick reads differently for
    different profiles)
  - Tilt-trigger framing applied to no-bet warnings
- **Data inputs:** User self-assessment responses
- **Outputs:** Archetype, per-surface configuration
- **User workflow improvement:** The product calibrates to the user's
  declared failure mode.
- **Contributors:** Founder
- **Date conceived:** 2026-Q2
- **Date implemented:** `/profile` page live 2026-05-28 (commit
  `92ec468`)
- **Repo commits:** `92ec468`
- **Public disclosure:** Dimensions and archetypes public. Surface-shaping
  rules private.
- **Patent candidate:** Maybe
- **Trade-secret candidate:** Yes

## INV-008 — Process Grade / Decision Quality Score

- **Feature:** Process Grade (also referenced as Decision Quality Score)
- **Problem solved:** Sports betting evaluates outcomes. Sustainable
  edge comes from process. No product scores the user's process per bet.
- **Why existing solutions are insufficient:** No tracker app records
  whether the user followed the board, the pass list, the market
  context, and the bankroll check before placing a bet.
- **How the system solves it:** Each tracked bet is scored A/B/C/D on
  process adherence. Process Grade is part of the autopsy quadrant
  and drives the discipline patterns in the briefing and command center.
- **Technical novelty:**
  - Process scoring as first-class output, independent of outcome
  - Integration with No-Bet Engine: bets placed against published
    no-bet warnings receive an automatic process downgrade
- **Data inputs:** User tracker entries, Galaxy publish/pass history,
  timestamps
- **Outputs:** Per-bet process grade
- **User workflow improvement:** Sustainable improvement loop based on
  process, not outcome.
- **Contributors:** Founder
- **Date conceived:** 2026-Q1
- **Date implemented:** Framework on `/autopsy`, Tracker UI exists;
  scoring engine pending
- **Repo commits:** `6c72459`, `92ec468`
- **Public disclosure:** Concept public. Scoring rubric private.
- **Patent candidate:** Maybe
- **Trade-secret candidate:** Yes

## INV-009 — Signal Ledger Calibration System

- **Feature:** Append-only signal ledger driving public calibration
- **Problem solved:** Tout services claim records without proof.
  "Verified track record" is unverifiable.
- **Why existing solutions are insufficient:** Pickle, BettingPros,
  and tout services display win rates without an append-only, time-stamped,
  tamper-evident store. The bet doesn't exist until after it wins.
- **How the system solves it:** Every pick is recorded at publish time
  with a factor snapshot. Settlement is recorded at game completion.
  The ledger is append-only and drives the public calibration report
  with a 30-pick gate before any win-rate claim is made.
- **Technical novelty:**
  - Pre-commit at publish (not post-hoc)
  - 30-pick gate as a public-trust mechanism
  - Per-confidence-band calibration tracking
- **Data inputs:** Pick publish events, settlement events
- **Outputs:** Calibration report, per-band accuracy, model-version
  accuracy
- **User workflow improvement:** Bettors can verify the model honestly.
- **Contributors:** Founder
- **Date conceived:** Pre-existing
- **Date implemented:** Pre-existing
- **Repo commits:** Multiple
- **Public disclosure:** Concept public, output public, internal
  recalibration rules private.
- **Patent candidate:** No (likely not novel enough for software patent)
- **Trade-secret candidate:** Yes (recalibration rules)

## INV-010 — Personal Galaxy Briefing

- **Feature:** Daily personalized briefing with "What to ignore"
- **Problem solved:** Daily briefings exist. None include a mandatory
  "what to ignore" section. Bettors are trained to look for action;
  they are not trained to identify the games they should skip.
- **Why existing solutions are insufficient:** Action Network, OddsJam,
  and similar surface "today's top games." None surface "today's top
  games to skip" as a first-class section.
- **How the system solves it:** Briefing composer produces five
  sections (What Changed, What Matters, What to Ignore, Exposure
  Check, Recommended Learning). Exposure Check is profile-aware.
- **Technical novelty:**
  - "What to ignore" as a mandatory section
  - Exposure check calibrated to user's declared volume archetype
  - Academy module rotation tied to the day's market state
- **Data inputs:** Today's board, pass list, user's stated archetype,
  user's tracker exposure
- **Outputs:** Five-section briefing
- **User workflow improvement:** Bettors start the day with a balanced
  view, not an action-biased view.
- **Contributors:** Founder
- **Date conceived:** 2026-Q1
- **Date implemented:** `/briefing` page live 2026-05-28
- **Repo commits:** `0094125`
- **Public disclosure:** Section structure public. Composition rules
  private.
- **Patent candidate:** Maybe
- **Trade-secret candidate:** Yes

---

## Filing/protection plan

| Disclosure | Posture |
|---|---|
| INV-001 Parlay MRI | Trade-secret first; attorney review for patent |
| INV-002 No-Bet Engine | Trade-secret first |
| INV-003 Post-Bet Autopsy | Trade-secret first; attorney review for patent |
| INV-004 Market Mirage | Trade-secret first |
| INV-005 Roster Shock | Trade-secret first |
| INV-006 Coaching Edge | Trade-secret first |
| INV-007 Betting Brain Profile | Trade-secret first |
| INV-008 Process Grade | Trade-secret first; attorney review for patent |
| INV-009 Signal Ledger | Trade-secret first |
| INV-010 Personal Briefing | Trade-secret first |

## Review cadence

- New disclosure within 30 days of conception
- Annual review of patent candidacy
- Implementation date and commit hash updated on first ship
- Disclosure log frozen at any future financing or acquisition event
