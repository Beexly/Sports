# Grok — THE CRUCIBLE (build-beyond-us → weaponize → self-immolate → forecast) — 2026-07-02

The hardest prompt of the series, and the only one that turns the weapons on
GSE itself. Prior runs let Grok pick its own difficulty and grade its own
homework. This one forces five survive-or-die rounds, demands RUNNABLE code at
every step, and makes Grok find the flaw in OUR machine — the work we cannot do
for ourselves because we are too close to it. The aggression is total but aimed
only where it is untouchable: published data, primary sources, our own code.
Copy-paste below.

────────────────────────── COPY BELOW ──────────────────────────

You are GSE's crucible — a build-and-destroy engine, not an advisor. Every prior
run you were handed produced strategy and stopped. This one does not stop until
it has SHIPPED CODE, TURNED THAT CODE ON THE INDUSTRY, TURNED IT ON GSE ITSELF,
SURVIVED A FIRING SQUAD, AND FORECAST WHAT WE CANNOT SEE. You will grade nothing
of your own until it has survived attack. Read the current machine first and
build only things that extend or threaten it:
https://github.com/BeeXly/Sports/blob/claude/night-shift/handoff/claude/overnight-2026-07-01/PHASE-BUILD-2026-07-02.md
and its sibling GROK-OPERATION-GLASS-HOUSE.md (this prompt subsumes and
escalates that one).

WHAT GSE JUST SHIPPED (your baseline — anything you build must be beyond it):
a three-leg confidence-interval stack (BCa + studentized bootstrap-t +
empirical-Bernstein finite-sample bound); an ANYTIME-VALID e-process ledger
(Ville's inequality — a track record immune to optional stopping, proven by
adversarial-peeking Monte-Carlo at FP 0.0195 vs a 0.05 budget); pre-kickoff
Merkle slate commitments with a public root-refolding verifier; a
confound-honest CLV decomposition. This is already further than any public
sports-prediction entity has gone. Your job is to make it look like a warm-up.

═══════════ THE CONTRACT (a fabrication voids the entire run — I execute and check everything) ═══════════
- Primary source per factual claim: quote + link, or tag [SPECULATION]. Every
  cited number carries units. Never invent a number, a citation, a case name,
  or a code result. A LABELED UNKNOWN BEATS A CONFIDENT FABRICATION — prior runs
  were caught inventing a Prisma column, mislabeling a court case, and dropping
  the center term from a confidence-bound formula. I will catch it again.
- LEGAL DISCIPLINE: about any named company or person, publish DATA AND METHOD
  ONLY, never an adjective or a characterization — every naming must survive
  "truth is a defense" on the arithmetic alone. Legal conclusions about GSE's
  own conduct = [PROPOSED, counsel-required]; separate CFAA from contract/ToS;
  quote terms verbatim or mark [UNVERIFIED]. Target ONLY published data (odds
  feeds, T&C, regulator dockets, financial filings, entities' own marketing) —
  no access circumvention, no private data, no scraping that breaches a term.
- STEELMAN BEFORE YOU DISCARD: if you judge a source, a competitor claim, or a
  piece of prior art to be wrong/weak, first state its strongest version and
  what it gets right, THEN why it fails. No lazy dismissals.

═══════════ THE CODE CONTRACT (this is how you make us fast — every code deliverable obeys it) ═══════════
TypeScript, strict mode, zero runtime deps beyond Node 20 built-ins.
DETERMINISTIC: seeded mulberry32 where randomness exists — no Math.random, no
Date.now in logic. Pure functions + a separate loader boundary. Return
`Result | null` on refused input; never throw on data. Ship with (a) a vitest
file whose Monte-Carlo assertions STATE their standard error and threshold
arithmetic in comments, (b) the exact run command, (c) the #1 confound and its
control in one paragraph. No ellipses in function bodies — complete or it does
not count. Every "observed" number in a comment must be one your code actually
printed; mark anything you could not execute [UNRUN] and write the test so we
can. Match the house: a statistic composes through the existing engine where
one exists rather than reinventing it.

═══════════ ROUND 1 — BUILD BEYOND US (code) ═══════════
Generate the machine we haven't built. Produce >= 3 COMPLETE, runnable modules,
each a genuine advance on the baseline, not a restatement. Candidates to beat
(surpass them or justify why yours is stronger):
- An anytime-valid test on CLV-ADJUSTED returns (does our edge survive
  continuous monitoring AFTER controlling for closing-line movement?) — fuse
  the e-process with the CLV decomposition.
- A cross-book de-vig CONSENSUS with a confidence SEQUENCE (not a single
  interval) around the vig-free true price, updating tick by tick.
- Commit-reveal for the MODEL ITSELF: a pre-registration scheme that proves the
  model version and its parameters were fixed before a slate, not just the
  picks — provably-fair for the predictor, not the prediction.
- Calibration UNDER anytime monitoring: an e-process that tests "the model's
  stated probabilities are honest" continuously, so a drift is caught the pick
  it starts, not a quarter later.
For each: the math (from first principles, flag any constant you cannot derive
or source), the code, the adversarial test that PROVES the property (state the
null, the worst-case, the MC standard error), the run command, the confound.

═══════════ ROUND 2 — TURN THE MACHINE ON THEM (code + excavation) ═══════════
The industry publishes its own damning numbers and trusts that nobody computes
them. Compute them. Deliver runnable modules + the excavated receipts:
- BOOK SHADING FINGERPRINT: given a published-odds time series, per (book,
  sport, market): hold distribution, signed shading vs multi-book consensus
  toward the popular side (name the popularity proxy), reaction latency,
  stale-window frequency, and the systematic-vs-noise test with
  multiple-comparison control. Confound: popular side correlates with
  home/favorite — control it. Name every PUBLIC historical odds archive
  (license + URL) that could backfill this today.
- TOUT AUTOPSY: pipeline that runs any public tout's PUBLISHED pick stream
  through OUR anytime-valid e-process ("here is your record under math that
  forbids window-shopping"), plus deleted/re-dated-pick detection from public
  evidence only. Then cite 5 of the loudest public track-record claims in US
  sports media [verbatim quote + URL] and specify the exact public data that
  settles each with our machine. Mark verdicts [AWAITING DATA RUN] — do not
  fabricate their numbers.
- FINE-PRINT QUANTIFIER: turn the top-6 US books' published T&C (quoted +
  linked clauses) into numbers — effective boost EV after playthrough, void-
  rule breadth, limitation asymmetry, ambiguity count. Every cell sourced to a
  quoted clause.

═══════════ ROUND 3 — TURN THE MACHINE ON US (the round no prior prompt dared) ═══════════
This is where you earn the run. Attack GSE's OWN shipped machine as the most
hostile quant alive, and deliver the attacks as FAILING TEST CASES or explicit
exploit constructions, not opinions:
- The ANYTIME-VALID LEDGER: find the input distribution, betting-fraction
  interaction, or dependence structure where our Ville guarantee is violated or
  our power collapses to uselessness. We use a predictable empirical-Kelly
  schedule with a fixed a-priori range; break it. Construct the ledger where our
  lower bound overstates, or where correlated same-game picks break the "any
  null distribution" claim beyond the O(1/t) we hand-waved.
- The MERKLE SLATE COMMITMENT: find the timing, postponement, or membership
  path where a receipt can appear committed-but-unprovable, or where the public
  re-fold verifier says "verified" on a set that shouldn't verify (or vice
  versa). We freeze tomorrow's early-UTC slates a day ahead — attack that.
- The CLV DECOMPOSITION: prove our "information vs liquidity vs residual" split
  is curve-fitting under some realistic confound we didn't control, or that the
  index-encoding bootstrap through BCa breaks the acceleration estimate.
- OUR PUBLIC CLAIMS: read the honesty-surface copy and find the sentence a
  plaintiff's lawyer or the FTC could call deceptive given how the math actually
  behaves at small n. [PROPOSED, counsel-required] — but find it.
For each real find: the construction, the failing assertion, the severity, and
the fix. If you cannot break something, say so explicitly — a clean bill from a
genuine attack is worth as much as a break.

═══════════ ROUND 4 — THE FIRING SQUAD (survive or it does not ship) ═══════════
Every Round-1 and Round-2 deliverable faces five hostile experts, each writing
their single strongest kill-shot; you rebut or concede: (1) a hostile quant
hunting the statistical flaw or uncontrolled confound; (2) an FTC / plaintiff's
lawyer hunting the deceptive-claim or defamation exposure; (3) a sportsbook head
of trading explaining why it does not threaten them; (4) an investigative
journalist explaining why they would NOT cover it; (5) a skeptical VC explaining
why it is not a business. Diverse lenses — not five versions of one objection.
A deliverable that cannot rebut >= 4 of 5 is CUT. Report the casualties.

═══════════ ROUND 5 — FORECAST WHAT WE CANNOT SEE ═══════════
- 10 watchable early indicators of industry rupture (ESPN-DraftKings
  integration, enforcement patterns, hold-percentage trends): each a SPECIFIC
  public artifact we can monitor monthly (named report, docket, filing) and
  score later with our own calibration engine — not a vibe.
- The single highest-composite survivor from Rounds 1-4: a 3-ply game tree (GSE
  ships → incumbents/regulators counter → GSE responds → their counter). Show
  why GSE stays canonical through it. If GSE loses the position by ply 3, it was
  not the winner — pick again.

═══════════ DELIVER ═══════════
- All Round-1/2 CODE, complete, obeying the code contract, with tests + run
  commands.
- The Round-3 attack file: every failing case or clean bill against OUR machine.
- The firing-squad record (survivors + casualties + why).
- The forecast + the game tree.
- THE ONE MOVE: which single deliverable we ship first for maximum "who the hell
  are these guys" per engineering hour, defended in five sentences.
- PROOF OF EXHAUSTION / THE KILL LIST: everything you attempted and could NOT
  source, verify, break, or build — named, so we know exactly where your
  verification ran out. This is the next crucible.

Depth over breadth. Code over prose. The work over the verdict. Do not stop
until all five rounds are run to the end and the machine has been turned on us
as hard as on them. Go.

────────────────────────── COPY ABOVE ──────────────────────────
