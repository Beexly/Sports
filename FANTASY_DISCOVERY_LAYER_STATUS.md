# Fantasy Discovery Layer — Galaxy Fantasy Reality Twin — Status

*Additive, shadow-only. No live gate, priced flag, customer recommendation, or roster move touched.
`packages/engine/src/fantasy` — 62 fixture tests green (53 module + 9 acceptance), full engine
suite 236 green, typecheck clean. Betting GSE studies how books absorb truth; Fantasy GSE studies
how managers, platforms, analysts, salaries, ownership, and draft rooms absorb truth — and they are
not separate systems, they are different sensors in the same belief economy.*

Thesis: **fantasy edge is not "who scores more."** It is a temporary non-equilibrium where real
player role, team context, platform belief, analyst consensus, DFS salary/ownership, roster %,
start %, manager psychology, and timing have not reconciled. The unit of intelligence is a
**Fantasy Belief-State Transition**, not a projection.

## What is real (built + unit-tested on fixtures)

| # | Module | What it does |
|---|---|---|
| F1 | `fantasy-belief-state-transition.ts` | the core object — assembles role truth + every market belief + light-cone + ghost check → fail-closed disposition (ACTIONABLE_SHADOW / WATCHLIST / POST_LOCK_ONLY / REJECTED / DATA_QUALITY_FAIL) |
| F2 | `fantasy-role-state-vector.ts` | a player is a ROLE STATE; scores role *quality* and detects silent-breakout vs box-score-fraud divergence |
| F3 | `role-mass-transfer-engine.ts` | where vacated targets/carries/RZ/air-yards go, and WHO inherits the valuable core (not just volume) |
| F4 | `fantasy-conservation-engine.ts` | incoherent fantasy worlds (ownership without role, stale salary overcorrected, rank without support…) |
| F5 | `fantasy-absorption-half-life.ts` | how slowly each surface absorbs role truth — the slow absorbers are the decision windows |
| F6 | `fantasy-format-relativity.ts` | same player, different asset across PPR/superflex/TE-premium/dynasty/best-ball/DFS/guillotine/bench-depth |
| F7 | `fantasy-light-cone.ts` | knowability before waiver/FAAB/trade/kickoff/inactive/salary/contest/late-swap/draft/dynasty locks; fails closed on hindsight |
| F8 | `platform-dna-genome.ts` | per-platform fingerprint → predicts where/how long a role shock sits un-absorbed (slow vs overreacts) |
| F9 | `manager-dna-genome.ts` | league-specific buy-low counterparty ranking; **privacy-gated** (consented data only), negotiation prior, executes nothing |
| F10 | `fantasy-decision-leverage-index.ts` | a stat matters only if it changes a roster decision per unit cost; coach-speak/false-confidence scores negative |
| F11 | `fantasy-ghost-bench.ts` | buries fantasy traps (TD-spike, empty-route, backup mirage, coach-speak fraud, chalk collapse…) and penalizes resemblance |
| F12 | `waiver-leverage-engine.ts` | role value × scarcity × need × playoff utility × acquisition − costs → FAAB band + AGGRESSIVE/DISCIPLINED/WATCHLIST/PASS |
| F13 | `trade-mri.ts` | buy-low / sell-high / hold by separating role truth from perception; names the distortion |
| F14 | `lineup-court.ts` | start/sit prosecuted by 8 prosecutors; same player START on one roster, SIT on another |
| F15 | `dfs-leverage-lab.ts` | good vs fragile chalk, real vs fake leverage → OVERWEIGHT/FADE/CASH_ONLY/TOURNAMENT_ONLY/LATE_SWAP |
| F16 | `bestball-draft-twin.ts` | ceiling × spike weeks × correlation × playoff fit × ADP discount − fragility |
| F17 | `dynasty-asset-physics.ts` | future role × durability × team × age curve × sentiment gap × liquidity → window-aware BUY/SELL/LIQUIDATE |
| F18 | `fantasy-autopsy.ts` | was the process deserved *before* the outcome? CLV-style anti-overfit guard: a variance loss on a sound, knowable, role-grounded call emits NO lesson |
| F19 | `fantasy-experiment-governor.ts` | ranks fantasy studies by Expected Discovery Yield; net-negative data buys flagged "do not spend" |
| F20 | `fantasy-scientific-discovery-council.ts` | 10 typed roles run one cycle (theorize → ghost-check → select → experiment → actionability → govern → archive → route); reuses the Discovery tournament + compression primitives |

**Acceptance scenarios proven end-to-end** (`__tests__/acceptance.test.ts`, real modules, no mocks):

- **A. Silent role breakout** — high role / low box score → `silent_breakout`; an underpriced, knowable, pre-lock ADD → ACTIONABLE_SHADOW with no certainty language.
- **B. Box-score fraud** — production > role → `box_score_fraud`; matches the TD-spike ghost (suppressed); trade → SELL_HIGH; DFS → FADE.
- **C. Injury role mass transfer** — a vacated role splits across early-down / receiving / TE; exactly one valuable-core inheritor named; the public's pet backup is a *disciplined* add, not an aggressive smash.
- **D. DFS salary lag** — the same stale-salary play is OVERWEIGHT/TOURNAMENT_ONLY under-owned, and FADE when ownership explodes past the role's fair share.
- **E. Trade distortion** — a role-strong player depressed by a two-week dip → BUY_LOW, pointed at the panic-prone, consented counterparty.
- **F. Dynasty sentiment shock** — rookie hype without a role path → SELL into the narrative (sentiment gap < 0).
- **G. Light-cone failure** — a call "right" only after the lock → POST_LOCK_ONLY → the transition refuses to credit it (PASS); a hindsight-contaminated call → REJECTED.

## What is shadow / fixture-only

All of it. Every module is pure and deterministic (no I/O, clock, or RNG; `Date.parse` of provided
ISO strings only) and unit-tested on hand-built fixtures — **not yet fed real role/usage/market
feeds.** No recommendation is emitted to a customer, no roster move is executed, no gate is flipped,
no public claim is made.

## Supported fantasy formats

standard · half-PPR · full-PPR · superflex · TE-premium · dynasty · keeper · best ball · DFS ·
guillotine/survivor · shallow bench · deep bench (transparent, auditable multipliers — no black box).

## Supported action types

Waiver: AGGRESSIVE_FAAB · DISCIPLINED_FAAB · CLAIM_ONLY_IF_FREE · WATCHLIST · PASS.
Trade: BUY_LOW · SELL_HIGH · HOLD. Lineup: START · SIT · FLEX · CEILING_PLAY · FLOOR_PLAY ·
INJURY_DEPENDENT · LATE_SWAP_REQUIRED · PASS. DFS: OVERWEIGHT · UNDERWEIGHT · FADE · NEUTRAL ·
CASH_ONLY · TOURNAMENT_ONLY · LATE_SWAP_OPTION. Best ball: BEST_BALL_TARGET · VALUE_PICK · NEUTRAL ·
AVOID. Dynasty: BUY · SELL · HOLD · REBUILD_BUY · CONTENDER_BUY · LIQUIDATE · WATCHLIST.

## Ghosts defined / experiments ranked

- **Ghosts:** TD-spike trap, empty-route trap, preseason-hype trap, backup mirage, coach-speak
  fraud, one-week-usage trap, garbage-time production, injury panic, DFS chalk collapse,
  ownership-leverage mirage. New candidates resembling a buried ghost are auto-suppressed past
  WATCHLIST until new evidence defeats the failure mode.
- **Experiments ranked:** waiver lag, DFS salary lag, route-rate breakout, box-score fraud, dynasty
  sentiment gap, best-ball ADP lag, platform projection lag, analyst ranking inertia, manager DNA,
  injury role-mass transfer — ordered by Expected Discovery Yield; high-rights/low-information feeds
  flagged "do not spend."

## Missing data (what would make the laws real)

Snap/route/target/carry timestamps; injury/practice/depth-chart timelines; player props + team
totals (the external truth signal); platform projections + analyst ranks with update timestamps;
roster %, start %, add/drop velocity; DFS salaries + ownership; ADP / best-ball draft movement;
waiver/FAAB timing. Manager-DNA studies require **explicitly consented** league history only.

## Known limitations

- Role-quality weights, format multipliers, and all decision thresholds are *reasonable priors*
  calibrated on fixtures, not fit to outcomes. They are starting points for empirical calibration.
- The age curve is a simple position-aware peak/decay, not a fitted survival model.
- Manager DNA is a behavioral prior, never a guarantee, and never operates on non-consented data.
- Nothing is validated out-of-sample yet — these are method demonstrations on synthetic data.

## Exact next empirical calibration plan

One real fantasy week (paired with the same dense, timestamped NFL week the Einstein/Discovery
atlases need — no separate cost), run through the layer end-to-end:

1. **Reconstruct** the week's fantasy belief-state transitions from real role + market feeds (role
   state vector → light cone → ghost check → disposition).
2. **Measure** absorption half-life per surface (props vs salary vs ownership vs ranks vs roster %)
   and fit the first real Platform-DNA and Absorption genomes.
3. **Calibrate** role-quality weights and decision thresholds against realized outcomes — replacing
   the fixture priors.
4. **Seed** the ghost bench with the week's real traps (TD-spike fades, chalk collapses).
5. **Rank** next week's studies by Expected Discovery Yield; spend only on positive-yield feeds.
6. **Gate:** a fantasy law becomes a `PROPOSED` promotion only after K consecutive independent OOS
   weeks — the same cross-night discipline as the betting nightly-discovery worker.

Deliverable: a **Fantasy Market Calibration Atlas** — which surfaces lead, which lag, which player
types are absorbed slowly, which role shocks create real value vs fake hype, which adds/trades were
deserved before the result. No recommendation shipped, no gate flipped, no public claim.

## Guardrails honored

No live gate touched. No `priced=true` changes. No public claims. No fabricated data. No hindsight
(light cone fails closed; the autopsy refuses to credit post-lock calls). No betting/fantasy
certainty language (asserted in the acceptance test). No private league data (manager DNA is
consented-only). Fixture-safe, deterministic, typed (strict, no `any`), tested. Every output carries
provenance, knowability, rights, data-quality, prosecutor verdict, and ghost-ledger status. Branch
`claude/keen-ptolemy-t38f1g`.
