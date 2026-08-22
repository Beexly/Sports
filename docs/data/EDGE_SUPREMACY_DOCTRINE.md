# Edge Supremacy Doctrine — the complete map of where edges come from

**Status:** doctrine. Sits above `EDGE_FACTORY_MASTERPLAN.md` (merged). Nothing here is
priced; every magnitude is a prior until it passes the masterplan's validation gates (§6
there). The clearance engine gates every new source. Same rules, bigger map.

**FIRST, IN STONE — NFL IS THE FLAGSHIP AND NOTHING HERE DILUTES IT.**
The Edge Factory Masterplan continues at full priority, exactly as scoped: every P2 slice,
the mining engine, the share core, the pre-kickoff freshness edges. This doctrine does not
reallocate one token away from it. What this doctrine does is name the *other seven classes
of edge* that exist in this domain — classes that are attacked with **code that runs free
forever and cheap batch agents**, not with the attention currently pointed at NFL depth.
Supremacy = depth × breadth × class coverage. Multiplication, not substitution.

**The thesis, stated once:** a posted price can only be wrong for a finite number of
reasons. Enumerate the reasons completely, build a standing machine against every one of
them, in every league we cover, and retire nothing until the referee says it's dead. No
book, syndicate, or shop attacks more than two or three of these classes at once — books
defend class by class, so every additional class is a flank they are not staffed to hold.
That is the whole company. Everything else on the site is delivery mechanism.

---

## 0. The universal equation

Every bet's value is `EV = Σ (p_true − p_implied) × payout`, and every edge in existence is
one of two moves: make our `p` closer to `p_true` than their `p_implied` (Classes 1–2, 5),
or exploit structure in *how* `p_implied` is produced, published, and moved (Classes 3–4,
6–8). The merged masterplan is the deepest possible attack on the first move for NFL
props. This doctrine completes the second move and generalizes both.

---

## Class 1 — Information: speed and processing

*Know it before the line does, or extract more from what everyone can see.*

- **C1.1 · News-latency playbooks.** For each news type (injury designation, scratch,
  lineup release, starting pitcher change, weather shift), a pre-built response: which
  props reprice, in which direction, with what magnitude prior — executed inside the
  measured book-latency window (masterplan E-G2 measures the window; this is the payload
  that fires inside it).
- **C1.2 · Transaction-wire scanner.** Official league transaction feeds (elevations,
  activations, waivers — legal, public). A practice-squad elevation at a position signals
  a role change *before* usage data shows it and before lines move. Pure code, zero tokens.
- **C1.3 · Practice-report trajectories.** Already seeded as masterplan territory
  (DNP–LP–FP patterns → play probability *and* effectiveness discount). Class 1 because
  its value is perishable within days.
- **C1.4 · Weather nowcasting.** METAR/NOAA (public domain) hourly, not daily: the
  morning-line vs kickoff-forecast delta is a repricing event books handle unevenly.
- **C1.5 · Processing depth.** The entire masterplan mining engine is Class 1's slow
  half: same public data, more extracted. Already funded; listed for completeness.

Cost profile: scanners are one-time code. Decay: fast (minutes–days) — these edges never
saturate because the news never stops.

## Class 2 — Model: better mapping from information to distributions

**This is `EDGE_FACTORY_MASTERPLAN.md`, whole and untouched** — share core, quantile/
censoring pricing, conditional mining with FDR, reliability shrinkage, edge lifecycle.
Additions that belong to Class 2 and are not yet in the masterplan:

- **C2.1 · Kneel/garbage-time model.** End-of-game absorbing states: kneel-outs delete
  pass attempts for big favorites; hurry-up garbage time inflates trailing QBs. Attempt
  props for heavy favorites are systematically shape-wrong without an explicit end-state
  model. Small, buildable from PBP now, pays week 1.
- **C2.2 · Discrete margin mass.** NFL margins concentrate on key numbers (3, 7). Books
  price many derivatives off smooth approximations. Anywhere a derivative (teasers, alt
  spreads, margin bands) meets a discrete reality, the approximation error is ours.
- **C2.3 · Counterfactual play-level simulator.** The masterplan's joint simulation (§3.5
  there) extended to answer "what if" (4th-down decisions, pace choices) — feeds C5.

## Class 3 — Market microstructure: how books mechanically produce and move prices

*The price-making process itself has bugs. Scan for them with code, forever, for free.*

- **C3.1 · Alt-ladder coherence scanner.** A book's alt-line ladder for one player is a
  set of quantile claims on ONE distribution. Ladders that imply non-monotone or
  impossible densities are published every day. Detecting them needs our distribution
  (masterplan §3.4) and a loop over the ladder. When a ladder is internally broken, one
  rung is free.
- **C3.2 · Cross-derivative coherence.** Full game ↔ 1H ↔ team totals ↔ player props must
  cohere under any single joint distribution. Books price derivatives semi-independently.
  Our one-simulation architecture prices them jointly — every incoherence is a signal.
  (Generalizes masterplan E-G5 from one player to the whole game graph.)
- **C3.3 · Leader–follower mapping.** Most books copy a market leader with lag and noise.
  Map who copies whom, per market family, from our own line archive. Consequences: the
  follower's lag is a timing edge; and when our `p` disagrees with ALL books at once vs
  one book, those are different situations (leader-error vs follower-error) deserving
  different confidence.
- **C3.4 · Steam classification.** Line moves split into information moves (respect) and
  liability moves (fade or ignore). Classifier features: which book moved first, size,
  cross-book propagation speed, proximity to news events. From our archive; no new data.
- **C3.5 · Boost/promo scanner.** Odds boosts are deliberately mispriced marketing —
  a structurally +EV product class books publish on purpose. A scanner that reads posted
  boosts, prices them against our `p`, and ranks them is the closest thing to a printing
  press this domain offers. Rights note: our own account surfaces / public promo pages
  through the clearance engine; no evasion, no scraping where prohibited.
- **C3.6 · Settlement-rule arbitrage.** The "same" prop settles differently across books
  (OT counts or not, must-play rules, push handling). A rules matrix per book × family
  turns identical-looking lines into different bets — sometimes both sides are good.
- **C3.7 · Attention-allocation targeting.** Books staff markets in proportion to handle.
  Therefore edge density is roughly inverse to handle: obscure props, lower-tier games,
  secondary leagues. A deliberate "low-attention board" strategy outperforms attacking
  the most efficient markets with the same model. Measure via dispersion (E-G1) — this is
  its strategic conclusion.

Cost profile: all code, built once. Decay: slow — these are organizational weaknesses of
books, not secrets.

## Class 4 — Behavioral: other people's money moves the line predictably

- **C4.1 · Public-tax maps.** Favorites, overs, stars, TV games (masterplan E-G4
  generalized): measure the shade by segment from our archive + results, then
  systematically stand on the taxed side.
- **C4.2 · Narrative fade.** Streak-chasing (TD streaks, "revenge games", primetime
  breakouts) moves lines off fundamentals measurably; our reliability table (E-F1) says
  exactly which hot streaks are noise. Fading quantified narrative is a standing edge.
- **C4.3 · Key-number demand clustering.** Public demand clusters at round numbers and
  .5 hooks; books shade accordingly. Exploitable at the margin on alt ladders.
- **C4.4 · Event-salience overreaction.** Nationally televised performance → next-week
  line inflation for the same player. Testable from archive; likely one of the cleanest
  fade signals in props.

## Class 5 — Game-theoretic: the rules and incentives of the sport itself

*Teams don't maximize props; they maximize their season. When incentives shift, every
volume prior breaks — and books reprice this lazily.*

- **C5.1 · Incentive calendar.** A standing per-team state machine: eliminated / seeding
  locked / tanking / auditioning youth / contract-year usage / Week 18 rest / MLB
  September call-ups / NBA rest policies. Each state re-projects usage wholesale. Books
  handle the famous cases and miss the long tail.
- **C5.2 · Coach decision models.** 4th-down aggressiveness, pace preferences, red-zone
  play-calling fingerprints (extends masterplan E-F6): coach effects on *distributions*,
  not just means.
- **C5.3 · THE RULE-CHANGE GOLD RUSH.** Every rule change temporarily breaks every prior
  — the books', the public's, and stale models'. Whoever re-estimates fastest owns the
  window (precedent: pitch-clock era stolen-base explosion was mispriced for months).
  Standing asset: a rule-change watchlist per league with a pre-planned re-estimation
  sprint. This is a *recurring, scheduled* edge — leagues change rules every single year.
- **C5.4 · Return-to-play scripts.** Pitch counts, snap counts, minutes restrictions —
  announced or inferrable from precedent — cap volume distributions in ways season data
  never shows.

## Class 6 — Temporal: when you bet is a decision variable

- **C6.1 · Opener attack maps.** Masterplan E-G3, promoted to policy: per family, a
  measured verdict on whether openers are soft (hit early) or sharpen late (wait).
- **C6.2 · Closing-line forecaster.** Predicting where the line will CLOSE is a separate,
  easier problem than predicting the game — and it converts directly to CLV, which is the
  business's proof metric. A model of line trajectories (from our archive) that
  front-runs predictable moves is an edge even on games where our `p` has no opinion.
- **C6.3 · Event-window execution.** C1 playbooks + E-G2 latency measurements fused into
  ops: for each news class, the window, the payload, the books.
- **C6.4 · In-play (Horizon 2 — flagged honestly).** The largest untapped ocean; in-play
  algos overreact to momentum and underprocess mid-game injuries. Requires latency infra
  we don't build until pregame classes are compounding. Named so we never pretend we
  didn't see it.

## Class 7 — Portfolio and correlation: edges that only exist across bets

- **C7.1 · Exact SGP pricing.** Books price same-game-parlay correlation with crude
  copulas; our joint simulation prices it exactly. SGP is widely considered the softest
  large market in the industry, and Parlay MRI is already productized — this aims the
  masterplan's §3.5 straight at it.
- **C7.2 · Correlation-aware sizing.** Kelly with the covariance matrix from the joint
  sim: same picks, materially better growth and drawdown. An edge in the mathematical
  sense — more EV per unit of risk — with zero new predictions.
- **C7.3 · Middles and scalps.** Cross-book line divergence occasionally brackets the
  truth; a standing scanner (archive + live board) catches structural middles the
  dispersion map (E-G1) already implies.

## Class 8 — Meta: edges about the edge process itself

- **C8.1 · Book scouting dossiers.** Per book: worst prop families, ladder quality,
  news latency, boost patterns, settlement quirks, follower rank. Books scout teams;
  nobody scouts books like a team. Compiled entirely from our own archive + results.
- **C8.2 · The edge genealogy library.** Every hypothesis, validation, and retirement
  timestamped forever. After 2–3 seasons this is a time-series of how books learn — which
  predicts where the next soft spots open. It is the one asset a competitor cannot buy at
  any price, because it requires elapsed seasons to exist. The catalog IS the moat;
  compounding starts the day entries start getting graded.
- **C8.3 · Second-order self-model.** A model of our own model's errors: from graded
  history, learn the regimes (weather, backup QBs, low-snap games…) where our `p` is
  least trustworthy, and scale stakes accordingly. Honesty, weaponized.

---

## The Machine v2 — how one shop runs eight classes at once

The claim "no man and no machine has done this" has a precise, defensible form: **coupling
LLM-scale, mechanism-backed hypothesis generation to statistically disciplined validation
on legal data — across all eight classes — at solo-shop cost.** Quant syndicates have the
discipline but generate hypotheses at human speed, in one or two classes. Books defend
class-by-class with siloed teams. The fleet changes the production function of hypotheses;
the masterplan's gates keep the fleet honest. Neither half is novel; the coupling is.

```
HYPOTHESIS FLEET (cheap-tier agents, batched)
  each agent: ONE class × ONE league × ONE data slice + the doctrine section — never the repo
  output: structured hypothesis cards (claim, mechanism, estimand, data, entry point)
        ↓
VERIFIER PASS (strong model, ONE pass per batch)
  kills slop, dedupes vs catalog, ranks by materiality (E-G1 softness map)
        ↓
VALIDATION BENCH (code, not LLMs — the masterplan mining engine + gates §6)
  pre-registered, FDR-controlled, sign-stable, CLV-refereed
        ↓
EDGE CATALOG + LIFECYCLE (HYPOTHESIS → CANDIDATE → VALIDATED → LIVE → RETIRED)
        ↓
STANDING SCANNERS (pure code: C1.2, C3.1–C3.7, C7.3 — zero marginal tokens, run forever)
```

**Token economics (the constraint, engineered):** LLM tokens are spent only on (a) building
permanent code assets and (b) generating/verifying hypotheses. Scanners and the validation
bench run on compute, not tokens. Cheap tier generates; strong tier verifies once;
deterministic code does everything repetitive. Front-load token spend into things that run
free forever. A class attacked by a scanner costs tokens once, ever.

**Sport invariance (read carefully — this is where "breadth" actually lives):** the machine
— fleet, bench, lifecycle, scanners — is league-agnostic. Adding a league is a *copy* of
the machine, not a division of NFL attention: run the clearance engine on that league's
sources, point the fleet at its rule book and data, let the scanners cover its board.
Live leagues additionally settle picks daily, which feeds the proof ladder (≥100 settled +
published calibration) and the genealogy library at a cadence NFL's weekly calendar cannot.
NFL keeps the deepest Class-2 stack; every league gets all eight classes. Depth everywhere,
because depth is machinery, and machinery replicates.

---

## Horizons

**H0 — now → NFL kickoff (~Sep 10). NFL masterplan P2 continues untouched, plus, in
parallel on cheap/code tracks:**
1. C2.1 kneel/garbage-time model (small, pays week 1)
2. C3.1 alt-ladder coherence scanner + C3.5 boost scanner (code once, free forever)
3. C5.1 incentive calendar skeleton + C5.3 rule-change watchlist (this season's changes
   re-estimated before the public catches up)
4. C6.2 closing-line forecaster v0 from the archive (it directly manufactures CLV — the
   proof metric)
5. Hypothesis-fleet pilot: one batch, one class (C4 or C5), structured cards, one
   verifier pass — proves the production line

**H1 — season 1:** full C3/C4/C6 build-out, book dossiers (C8.1), exact SGP (C7.1),
steam classifier (C3.4), settlement matrix (C3.6), fleet at steady cadence, second league
running the full machine.

**H2 — after compounding starts:** in-play (C6.4), every covered league on all eight
classes, genealogy library (C8.2) as the published-methodology moat and the marketing
weapon ("we scout the books like teams scout film").

---

## Legality (unchanged, restated because the surface grew)

Every new source — promo pages, transaction feeds, officials/umpire data, any league's
data ecosystem — passes the Scraping Clearance Engine and source-rights registry BEFORE
first read. Rights snapshots on every record. No evasion, ever, regardless of how good
the edge looks. Class 3–8 edges are built overwhelmingly from our OWN archive, results,
and simulations — the safest data we have because we made it.

## What this doctrine forbids

Treating any class as "the" edge (the classes hedge each other's decay); letting fleet
output skip the validation bench (unvalidated volume is anti-moat); spending premium
tokens on work a scanner or cheap agent can do; pausing Class-2 NFL depth for anything in
this document; and ever describing breadth as an alternative to depth again — the machine
replicates, attention doesn't, and the plan is built on that distinction.
