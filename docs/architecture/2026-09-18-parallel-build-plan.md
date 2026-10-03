# Parallel build plan, 2026-09-18

Supersedes sections 4 through 8 of `docs/architecture/2026-09-18-signal-architecture.md`.
That document's inventory (section 2), its layer invariants (section 3) and its
verification record (section 12) stand. Its build order does not.

## Why this document exists

The first architecture was rejected by the founder as compressing the business, and he
was right. The error was specific: **it put the honesty gate at the build boundary when
that gate belongs only at the publish boundary.** It sequenced nineteen steps serially
behind three measurement fixes, which parked most of the research corpus in DEFERRED and
made the engine look like it was shrinking.

Three rules replace that shape:

1. The certification gate constrains only what number reaches a customer. It never
   constrains what we build, capture, compute, persist or instrument.
2. Build runs at full width, concurrently. A dependency between tracks must be proven
   real, not conventional.
3. Capture starts everywhere immediately. A signal needing an as-of log accrues sample
   in wall-clock time, so a signal logged today has n in weeks and a signal deferred has
   zero forever until we start. **Deferred time is sample we can never buy back.** This
   is the strongest argument in the plan and it was absent from the first version.

A row may be parked only when a founder rights ruling, a founder environment flag, or a
genuinely absent source blocks it. "Nobody has built it" is a build task with an owner.

## What changed, measured

| | First version | This version |
|---|---|---|
| Structure | 19 serial steps | 7 concurrent tracks, 76 work items |
| Registry rows active now | roughly a third | **64 of 81** |
| Rows building this week | not separated | 47 |
| Rows starting capture now | not separated | 9 |
| Rows computing in shadow now | not separated | 8 |
| Rows parked | most of the corpus | **10**, each naming its exact founder ruling or flag |
| Rows killed | a long list | **7**, each naming the measurement that killed it |
| Model version bumps | 1 | 1, unchanged, still founder-only |

Every one of the 76 work items is marked no-bump. Not one of them changes a served
probability, a tier, a rank or a floor. That is the point: the engine gets much larger
underneath a publish boundary that does not move.

## The seven tracks

| Track | What it makes true | Items | Starts now |
|---|---|---|---|
| A. Capture plane | every as-of log that can run today is running | 12 | yes |
| B. Persistence and feature store | captured facts have a durable, rights-tagged home | 10 | yes |
| C. Engine breadth | the engine computes strictly more independent probability than it shows | 13 | yes |
| D. Gate and veto plane | all seven withhold-only signals live in log-only, and the decision record restarts | 12 | yes |
| E. The rulers | the three measurement defects, fixed beside everything else | 8 | yes |
| F. Head trainer and admission mill | the calibrated head exists and the admission harness actually runs | 12 | yes |
| G. Surfaces | the customer gets visibly more, honestly | 9 | yes |

---

## Track A. The capture plane

**Thesis.** Turn on every as-of capture log that can run today, in parallel, without
touching scoring, gates, ranking or the model version. The product is rows carrying an
observation time, a source id and a freshness reading. Not a probability, not a veto,
not a display number.

**The highest-leverage move in the whole plan sits here.** Verified in
`packages/prediction-engine/src/scoring.ts:142-158` and the confidence expressions at
`:576-584`: the shadow-evidence factors are appended to the factor trail with weight
hardcoded to zero and are **never added into the confidence sum**. So replacing today's
constant `BLOCKED_MISSING_SOURCE` placeholder (built at
`packages/ingestion-pipeline/src/process-sport.ts:187-199`, attached at `:1165`) with a
real adapter changes what the factor trail and the snapshot flags show, and changes
nothing about confidence, tier or rank. Eight of fifteen `PickSignalSnapshot` flags stop
being structurally false the moment any writer below lands a row.

| Id | Item | Owner |
|---|---|---|
| CAP-1 | GameSignal and Signal to EvidenceRecord adapter, so `evidence-readiness-matrix.ts` finally has a caller | data-ingestion |
| CAP-2 | Wire the adapter into shadow evidence, plus a read-only readiness report | prediction-engine |
| CAP-3 | Injury to GameSignal writer, per-game availability indicators | data-ingestion |
| CAP-4 | Weather to GameSignal writer for outdoor venues (merged, see correction 1) | data-ingestion |
| CAP-5a | nflverse game id to internal game id crosswalk | data-ingestion |
| CAP-5b | Officials ingester and writer (**depends on CAP-5a**, see correction 2) | data-ingestion |
| CAP-6 | Statcast registry parity fix and Signal-table writer | data-ingestion |
| CAP-7 | Basketball rest and minutes writer | data-ingestion |
| CAP-8 | Verify prop-odds capture already running under the flags the founder turned on | testing-qa |
| CAP-9 | Freshness checks scoped to each new writer, from day one | data-ingestion |
| CAP-10 | Proposal SQL: rights-snapshot column on GameSignal, the one capture table lacking it | founder |
| CAP-11 | Proposal SQL plus dormant writer for a narrative signal category | data-ingestion, founder |

**When each capture reaches a usable stratum.** Injuries reach 100 games around week 7
of this season. Weather, at roughly nine or ten outdoor games a week, reaches it around
week 10 or 11. Officials match the injury pace if the dataset is populated before
kickoff, which is an open question named in CAP-5b. Baseball has only weeks left in the
season, so that capture should start immediately to bank what remains. Basketball cannot
produce a row until the season opens in mid-October, which is a schedule fact and not a
reason to delay the code.

---

## Track B. Persistence and the feature store

**Thesis.** The contract is already correct and has nowhere to land.
`packages/feature-store/src/types.ts` defines a point-in-time validated record with
rights, eligibility and provenance fields, `pit-validate.ts` enforces it, and the whole
package has zero source importers. Give it a durable home, and do not wait for the
migration to start capturing: `GameSignal` takes per-game facts with no schema change at
all, and `TeamWeekStat` already has columns matching the efficiency splits with a writer
that exists and has no caller.

| Id | Item | Owner |
|---|---|---|
| B-1 | Shared license tag; share-alike rows model-ineligible by construction | prediction-engine |
| B-2 | Rights-registry parity test plus the three real disagreements it exposes | data-ingestion |
| B-3 | Proposal SQL for feature values, runs and per-pick vectors, plus a Prisma-backed store | prediction-engine |
| B-4 | Machine-readable signal registry and a live-or-silent gate in `@sports/types` | prediction-engine |
| B-5 | Table-freshness manifest and the archive staleness monitor | data-ingestion |
| B-6 | Wire the two orphan persisters into the cron that already runs | data-ingestion |
| B-7 | Port the 15 lab families to a scheduled job; fix the percentile double inversion | testing-qa |
| B-8 | Provenance hash generator for the record contract | prediction-engine |
| B-9 | Fix the season floor on read-only surfaces, which show last season all year | data-ingestion |
| B-10 | **Merged into CAP-4 and CAP-5b.** See correction 1 | n/a |

**On the two orphan persisters.** `apps/web/lib/ingestion/team-week-stats.ts` and
`rush-tendencies.ts` are complete, tested modules with no caller, writing tables with no
rows. Calling them from the cron that already runs at 07:15 is a one-line change per
module and it populates columns several proposed features need. This is the cheapest
width in the plan.

---

## Track C. Engine breadth

**Thesis.** Make the engine compute and persist strictly more independent probability
than it displays, without touching one served row. Every item is a shadow independent:
it reads real data, writes its opinion into the existing shadow slot, and is provably
unreachable from scoring.

| Id | Item | Owner |
|---|---|---|
| TC-8 | The shadow-independent seam and its isolation tests (**build first within the track**) | prediction-engine |
| TC-1 | Elo-margin cover probability for football spreads, the first spread independent that exists at all | prediction-engine |
| TC-2 | Sibling margin models for basketball and college football, since key numbers do not transfer | prediction-engine |
| TC-3 | Proposal SQL for the efficiency split and turnover-occurrence columns | data-ingestion |
| TC-4 | Extend the efficiency ingester for the dropback and rush split plus a garbage-time filter | data-ingestion |
| TC-5 | Version 2 rating module: opponent adjustment on the split, turnover regression, early-season shrinkage | prediction-engine |
| TC-6 | Wire the already-built Poisson totals independent into the shadow seam | prediction-engine |
| TC-7 | Drive-outcome totals model for football and basketball, the totals independent that does not exist | data-ingestion, prediction-engine |
| TC-9 | Wire the referee-agreement module as a live display feature | prediction-engine, frontend-app |
| TC-10 | Train and shadow-wire the gradient-boosted stump estimator | prediction-engine |
| TC-11 | Resolve the three-way decision-fusion overlap between the score family, the readiness matrix and the agreement module | testing-qa |
| TC-12 | Per-subdirectory audit of the 48-file metrics tree | testing-qa |
| TC-13 | Wire the shadow-versus-live report to a read-only surface and pre-register its own retirement | prediction-engine, testing-qa |

**What this fixes that nothing else does.** Football, basketball and college spreads
have no independent estimator at all today, which is why they rank on a score measured
anti-predictive and why no edge veto can fire on them. TC-1 and TC-2 are the first
estimators those strata have ever had.

---

## Track D. The gate and veto plane

**Thesis.** Every mechanism in the conviction directory can only withhold, so bringing
all seven signals live in log-only mode carries zero risk to what a customer sees. The
only thing that changes is that the decision record starts accruing rows again after 94
dead days. The superseded plan treated "the gate has no importers" as a reason to defer
it. The correct read is that it is a finished component nobody plugged in.

| Id | Item | Owner |
|---|---|---|
| D-1 | Veto-lane injection seam, since packages may not import the web app | prediction-engine |
| D-2 | Single-writer gate-decision module with the bootstrap flag forced false | prediction-engine |
| D-3 | Reason-code set and customer strings | prediction-engine |
| D-4 | Assemble all seven signals unconditionally and wire the readiness matrix (**host corrected, see correction 4**) | prediction-engine |
| D-5 | Structural log-only guard: reads recorded, verdict never consulted at mint | testing-qa |
| D-6 | Shadow record for withheld fixtures, so the withheld set becomes gradeable | prediction-engine |
| D-7 | Mint-time pass-decision withhold (**call sites corrected, see correction 6**) | prediction-engine |
| D-8 | Single-source tier cap (**founder sign-off, customer-facing**) | prediction-engine, founder |
| D-9 | Central-time day bounds and the UTC date stamps | prediction-engine |
| D-10 | Structural guard: no fictional source can reach a signal | testing-qa |
| D-11 | Narrative and beat capture plumbing (**split, see correction 7**) | data-ingestion |
| D-12 | Freshness probe re-checking two signals' hand-stated liveness | data-ingestion |

**Why the withheld set matters more than the gate.** The promotion path requires proving
a gate's withheld set grades worse than its kept set over at least 100 fixture-clustered
decisions. Nothing in the repo records a withheld fixture today, so that proof is
impossible. D-6 starts the record. Every week it does not run is a week of evidence the
gates can never earn.

---

## Track E. The rulers

**Thesis.** Fix the three ways the platform measures itself dishonestly, as one track
running beside everything else rather than a phase everything waits behind. Every
deliverable is additive: no existing column changes meaning, so the public milestone
keeps its basis while a second, better basis accrues next to it.

| Id | Item | Owner |
|---|---|---|
| E-1 | Same-book closing-value grade, fixing book-mix drift scored as market movement | prediction-engine |
| E-2 | Line-archive staleness monitor, the alarm whose absence hid a three-week outage | data-ingestion |
| E-3 | Post-settlement-rewrite marker and an as-of correction for the retrospective backfill | prediction-engine |
| E-4 | Strict unreadable-clock exclusion for training, leaving eligibility semantics untouched | prediction-engine |
| E-5 | Label-basis resolver for the September settlement-rule cutover | prediction-engine |
| E-6 | Baseline re-measurement script and report (**the one real downstream lock**) | prediction-engine, founder runs it |
| E-7 | Citation-freshness guard so a stale unsafe number cannot be quoted as current | testing-qa |
| E-8 | Schema proposal for the basis columns | prediction-engine writes, founder applies |

**E-3 is the finding that justifies this whole track.** The six-hourly calibration cron
selects settled rows and rewrites their stored independent probability by recomputing it
at backfill time with inputs that are not as-of. Any model fitted on that column is
fitting on the answer. It appeared in none of the three candidate designs and was caught
only by the adversarial pass.

**What genuinely waits on this track:** only the head's certification numbers, through
E-6. Everything else in tracks A through D, F and G proceeds regardless.

---

## Track F. Head trainer and admission mill

**Thesis.** Build the calibrated-probability machinery and make the admission harness
actually run. All of it sits below the publish boundary: every artifact is offline or
shadow-served into evidence, and read by nothing a customer sees.

| Id | Item | Owner |
|---|---|---|
| F-1 | Offset-logistic head: the market logit enters as a fixed offset, not a penalized coefficient | prediction-engine |
| F-2 | Hierarchical shrinkage, global to sport to sport-by-market | prediction-engine |
| F-3 | Fixture group key on the walk-forward splitter, which has none today | prediction-engine |
| F-4 | Head artifact format and an interim persisted registry | prediction-engine |
| F-5 | Fixture-clustered certification reader against the conservative bound | prediction-engine |
| F-6 | Nested selection and certification over the sealed holdout | prediction-engine |
| F-7 | Generalize the admission runner beyond its single hard-wired candidate family | prediction-engine |
| F-8 | Two reports per candidate: the as-of null and the closing-price null | prediction-engine |
| F-9 | Kill ledger, so a killed feature can never be silently re-run | prediction-engine |
| F-10 | Committed pre-registrations with a git-ancestor verifier | testing-qa, prediction-engine |
| F-11 | Wire the admission batch into the calibration cron (**measure first, see correction 5**) | testing-qa |
| F-12 | Durable hash-chain-verified trials registry across cron cycles | testing-qa |

**Why the head form matters.** The existing trainer standardizes every feature and
penalizes every coefficient toward zero with an unpenalized intercept, so its shrinkage
limit is the training-fold base rate. A head built naively on it would shrink to the base
rate rather than to the market, losing the entire safety property. F-1 makes the null
hypothesis literally the market.

**The central execution risk, stated plainly.** This harness has existed for months in
`scripts/`, is scheduled by nothing, and has never run once. F-7, F-11 and F-12 exist
because a trainer nobody runs is the same as no trainer. If only one thing from this
track ships, it should be the part that makes it run.

---

## Track G. Surfaces

**Thesis.** The gate governs one number. Everything else the platform already computes is
free to display today, wider than it is now, with zero probability invented.

| Id | Item | Owner |
|---|---|---|
| G-0 | One shared customer-string guard covering every surface below | testing-qa |
| G-1 | **Founder decision, see correction 3** | frontend-app |
| G-2 | Passed-lane evidence card: render the shadow record, not a bare count | frontend-app |
| G-3 | Fixture-date badge on far-horizon rows | frontend-app |
| G-4 | Single-source agreement transparency badge | frontend-app |
| G-5 | Unit-matchup and percentile context panel | frontend-app |
| G-6 | Edge sheet as a recurring draft-only content product | content-publishing |
| G-7 | Sourced narrative content lane, editorial only | content-publishing |
| G-8 | Factor-trail depth audit: what is proprietary versus public arithmetic | testing-qa |

**The honest answer to "the board gets thinner."** It does not, under this plan. The
passed lane gains real explanations instead of a count, far-horizon rows gain the date
context whose absence is a known scope defect, every row gains an agreement badge, and
the free tier gains whatever part of the factor trail turns out to be public arithmetic
rather than proprietary. What narrows is one number on a handful of strata, and only
until a feature earns lift there.

---

## Corrections the adversarial pass forced

Three lenses ran against the seven tracks: is the concurrency real, does the wider plan
still obey the laws, and is it actually wider or just louder. They found real defects.
Each correction below is applied in the tables above and must survive future edits.

**1. Two tracks proposed the same work.** Track B's weather and officials item specified
the same two new file paths, the same owner role and near-identical descriptions as Track
D's, and Track A separately proposed a third design for weather on a different host. Three
parallel paths to one capability is not concurrency, it is a merge conflict with extra
steps. Collapsed into CAP-4 and CAP-5b under Track A, hosted on the board filler that
already runs four times an hour rather than a new cron entry, since a new schedule needs
founder review anyway.

**2. The officials work assumed a module that does not exist.** Both designs described
calling "the existing officials mapper." There is no officials mapper anywhere in the
repo, only a bare dataset key with no caller. The real prerequisite is the game-id
crosswalk, which also does not exist. CAP-5b now depends on CAP-5a explicitly and is
sequenced after it, not beside it.

**3. One surface item would have reversed a founder decision.** Extending the
market-implied display to spreads and totals was framed as filling an unimplemented gap.
It is not a gap. The file's own header records it as a shipped design decision: those
markets carry cover probabilities near 0.5 and deliberately show no percentage. G-1 is
therefore not an agent task. It requires the founder to explicitly overturn that
decision, or to scope it to only those rows whose cover probability is far enough from
even money to be worth showing.

**4. The seven-signal assembly had an interchangeable host, and it is not.** The design
allowed either the odds-refresh path or the board filler. They are not equivalent: the
board filler's slate path is deliberately market-free by design, while the odds-refresh
path carries the market. The existing shadow pass already documents this distinction.
D-4 now names the odds-refresh path as its sole host.

**5. The admission block cannot be assumed to fit.** The calibration cron it would join is
already 646 lines running many stages inside a 300-second platform limit. F-11 must
measure that route's current wall-clock cost and report it before adding a block, and its
own definition of done already asks for that measurement. It must be run, not assumed.

**6. The pass-decision withhold could not reach one market.** The design said to apply the
new predicate "at every existing call site" of the adverse-price predicate. The cited
line numbers were wrong, and more importantly the totals scorer has no such call site at
all, so totals would have been silently exempt. D-7 now adds an explicit new call site
there, and its regression test includes a totals fixture.

**7. The narrative family was parked as one row and should be two.** The signal module's
own documentation separates three sub-cases by difficulty. Contract incentives genuinely
have no source and stay founder-blocked. Milestones and record chases are buildable now
from season statistics plus a small citation-gated table of publicly documented
thresholds. Parking all three together was exactly the confusion between "we cannot serve
this" and "we cannot build this" that this rewrite exists to remove. Split accordingly.

Also corrected, smaller but load-bearing:

- The shadow probability slot is a single field under a unique key per game and model
  version. Three track items proposed writing to it independently, which would clobber.
  A read-merge-write helper lands in TC-8 before any second writer ships.
- The `Signal` table does not carry a source name, a trust level or a bootstrap flag.
  Those live on `GameSignal` only. The adapter must define how entity-level rows map into
  trust semantics rather than assuming fields that are not there.
- The book-depth term is not a constant. It scales with book count and only saturates
  above the ideal-book threshold. The shadow experiment tests its behavior in the
  saturating regime against the low-count regime rather than dropping the term outright.
- Three tracks edit the mint orchestrator. That file goes on a shared concurrent-edit
  list so the pull requests are sequenced deliberately instead of colliding at merge.
- The partial-mock count is 22 today and the standing document says nineteen. Any item
  citing it must note the drift rather than quoting a new number silently, and the guard
  must enumerate the files rather than assert a count.

---

## The registry, re-adjudicated

All 81 rows were re-classified under the rule that the default is to start.

| Status | Count | Meaning |
|---|---|---|
| BUILDING-NOW | 47 | code can be written this week by an agent |
| CAPTURING-NOW | 9 | cannot be tested yet, but its log starts today so the clock runs |
| SHADOW-NOW | 8 | computes and persists per fixture immediately, touching no served number |
| FOUNDER-BLOCKED | 10 | a named rights ruling, environment flag or absent source |
| KILLED | 7 | a named measurement or a structural rule |

### The ten that are genuinely blocked, and by exactly what

| Signal | Blocker |
|---|---|
| Exchange prices | A developer-agreement restriction on direct access, plus a standing compliance hold |
| Public money splits | No cleared consensus source exists |
| Power index ratings | A licence flag, default closed, pending a decision only the founder can make |
| Club rating feed | Permission required per the stricter of the two registries; needs written commercial permission |
| Beat and coach reports | Real per-team feed URLs are a genuinely absent source |
| Narrative: contract incentives | No source of any kind exists in the repo |
| Scheme, coverage, box counts | Coverage granularity needs tracking data we do not hold |
| Discovery families | The corpus lives on an unmerged branch, so its paths do not resolve |
| Vendor grades and charted metrics | We do not hold the underlying proprietary charting and cannot lawfully reproduce it |
| Interception-worthy rate | The column is share-alike licensed; the founder rules on share-alike into a served number |

### The seven that are killed, and by what

| Signal | Kill |
|---|---|
| Legacy composite confidence | Measured: at 80 and above, n 235, claims .8663 and realizes .5191, z of -10.7 |
| Isotonic calibrator on confidence | Structural: a monotone map cannot invert a non-monotone score |
| Confidence-vector logistic head | Superseded by the offset head, which uses the market as its null |
| Market-regressed public rating | Structural: regressed toward market spreads by construction, so not a market-blind referee |
| Pressure-to-sack conversion | Measured: conversion luck explains under half a percent of outcome variance |
| Stake sizing on public surfaces | Structural and already enforced as a compliance rule |
| Social sentiment for the engine | Structural: we read public posts and never republish proprietary output |

Nothing else is parked. Every remaining row has an owner and a first action this week.

---

## Sequencing inside tracks

Only four real dependencies survived the concurrency lens. Everything else runs beside
everything else.

1. CAP-1 before CAP-2. The adapter exists before anything reads it.
2. CAP-5a before CAP-5b. The crosswalk exists before officials can resolve a game.
3. TC-8 before every other Track C item. The shadow seam and its isolation tests exist
   before any candidate writes a probability.
4. E-6 before the head's certification numbers, and before any registry evidence cell
   marked for re-measurement is quoted as current. Nothing else waits on it.

The mint orchestrator is edited by tracks A, C and D. Those three pull requests are
sequenced against each other by whoever merges first, and the later ones rebase.

---

## What a customer sees while all of this runs

Nothing changes, until it changes for the better. Every one of the 76 items is no-bump
and none of them alters a served probability, a tier or a rank. The visible changes are
additive and land on Track G: real explanations in the passed lane, date context on
far-horizon rows, an agreement badge, more of the factor trail once the audit says which
parts are public arithmetic.

The one narrowing in the whole plan is the pass-decision withhold in D-7, which stops the
engine publishing rows its own independent model says to decline. That is a correction,
not a compression.

---

## Founder decisions this plan needs

Unchanged from the first document except where noted:

1. Re-own or cancel the ledger row whose owner value fails the guard, so CI can pass.
2. Run or delegate the read-only production probe. No agent touches the database.
3. Apply the proposal SQL that tracks A, B, C and E write under `docs/ops/proposals/`:
   the rights-snapshot column, the narrative category, the feature tables, the efficiency
   split columns, the basis columns.
4. Set the news feed list, if the beat lane is wanted this season.
5. Review the one new cron entry, if CAP-4 does not end up hosted on the existing filler.
6. Sign off the single-source tier cap in D-8, which a paying customer feels.
7. Decide G-1: overturn the recorded near-even-money display decision, scope it
   narrowly, or leave it.
8. Approve and name the single model-version bump when the head certifies. Still one
   bump, still the only one.

---

## Verification record

Produced by seven track designers, three registry re-adjudicators and three adversarial
lenses, thirteen agents, all completed, no errors. Workers ran on the smaller model by
instruction, to conserve the founder's usage; assembly and correction were done in the
main session.

Verified this session by direct read, not assumed:

- The shadow-evidence factors carry weight zero and are absent from every confidence sum.
- The totals scorer has no adverse-price call site.
- The `Signal` table lacks the three fields one track claimed it has.
- The book-depth term scales with count and saturates rather than being constant.
- The market-implied display restriction is a documented decision, not a gap.
- The percentile function inverts twice for lower-is-better metrics.
- 22 files partially mock the engine package; the standing document says nineteen.
- No officials mapper exists anywhere in the repo.

Not verified, and stated as open: whether the officials dataset is populated before
kickoff, which decides whether that capture is a pre-game signal or a post-hoc one; the
current wall-clock cost of the calibration cron; and every production row count, which
requires the probe no agent may run.
