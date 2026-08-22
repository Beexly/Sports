# Share-Core Wiring Cards — K11 → props stack (Wave SC)

**Deck data class: CROWN.** This file describes the share-core design (masterplan §3.2)
and the covariate bus — both named CROWN in `docs/ops/FREE_WINDOW_BLITZ.md` §3b. This
file must NEVER be pasted, in whole or in part, to any free endpoint (stealth/Ox Alpha,
Laguna, Inkling — any training-on-input tier). Individual cards below carry their own
class; none is PUBLIC and none goes to the free fleet.

---

## Routing summary (which lanes)

| Class | Cards | Lane |
|---|---|---|
| INTERNAL | SC1, SC2, SC3, SC4, SC5 | Grok / Hermes only (no-training endpoints per FREE_WINDOW_BLITZ §3b — never stealth, never any train-on-input tier) |
| CROWN | SC6, SC7, SC8, SC9, SC10 | Grok / Hermes on paid/contractual endpoints ONLY. Card text already minimizes crown content; do not paste the masterplan or this deck's header into a worker prompt — send the one card. |
| PUBLIC | (none) | — the free fleet's contribution to this program is Wave K (`docs/data/KERNEL_SLOT_CARDS.md`), already routed. |

**Cross-family verification rule (same as Wave K):** the verifier is a different model
family than the author; the verifier runs the card's Verify command, checks type fidelity
against the embedded shapes, then works the ATTACK list — each attack decided by a
computation, not by reading. A test that recomputes the implementation's own formula and
compares is vacuous — reject it.

## Dependency order within the deck

```
SC1 (research: sources)
  └─► SC2 (usage matrix) ─► SC3 (masked fit; needs K11 landed)
                              ├─► SC5 (volume marginal) ──┐
        SC4 (trials baseline) ─┘                          │
                              ├─► SC6 (alpha projection)  ├─► SC10 (shadow harness;
                              ├─► SC7 (injury reproject)  │        needs K1, K2, K11)
                              └─► SC8 (teammate corr) ────┘
SC9 (research: bus registration) — independent; BLOCKED until PR #555 + #556 merge
```

**External preconditions ledger** (checked mechanically inside each card's Verify — a
blocked card is left unstarted, never improvised):

| Precondition | Needed by | Mechanical check |
|---|---|---|
| K11 slot landed: `packages/prediction-engine/src/edge-lab/kernel/slots/dirichlet-multinomial.ts` | SC3, SC10 | `test -f` that path |
| K1 + K2 slots landed (`kernel/slots/crps.ts`, `kernel/slots/pit.ts`) | SC10 | `test -f` both |
| PR #555 merged (CovariateCell has `layer` + `knownAtWeek`; `P_SIDE_COVARIATE_REGISTRY` exists) | SC9 | `grep -q knownAtWeek covariate-bus.ts` |
| PR #556 merged (`est-routes-tprr.ts` on main) | SC9; optional input to SC6/SC10 | `test -f` that path |

## Common contract — applies to EVERY card in this deck

Every implementation card in this deck states, and every implementation must satisfy:

- **priced:false** on every exported result record. Research-only. Live p admits an edge
  only when `rank.priced` (`packages/prediction-engine/src/scoring.ts` L510/L523/L580-581/L926)
  — nothing in this deck may set `priced:true`.
- **Nothing enters live p without masterplan §6 validation**
  (`docs/data/EDGE_FACTORY_MASTERPLAN.md` §6: as-of discipline, temporal CV only,
  CRPS/PIT/Brier, economic referee, CANDIDATE→VALIDATED gates). Everything here is
  HYPOTHESIS / shadow.
- **No MODEL_VERSION change.** `packages/prediction-engine/src/constants.ts` L25 stays
  `v5.2.7`. Same norm as `props-fire-gate.ts` header L10.
- **Fail-closed on missing data.** Missing/NaN/contradictory input ⇒ typed refusal or
  `KernelError` — never a default, never an imputed value, never a silently dropped row
  that changes semantics. Refused samples are DROPPED with a reason, not filled (the
  bind-module norm: `props-hb-adot-sep-bind.ts` L87, `props-hb-air-yac-bind.ts` L113).
- **No market-prop inputs anywhere on the p-side.** The share model never sees a book's
  prop line (norm stated at `props-hb-rush-attempts.ts` L27: "Do not ingest the book's
  attempt line into the prior"). MARKET_PROP provenance in p fails CI post-#555.
- **No `Math.random`.** Injected rng only, via `makeRng` (`kernel/contract.ts` L152) and
  `boxMuller` (`kernel/numeric.ts` L189 — the only normal sampler allowed).
- **Sealed holdout untouched.** Evaluate inner walk-forward folds only. Never call
  `openHoldout(` (static belt: `scripts/guardrails/sealed-holdout-open-scan.mjs` fails the
  build; `walk-forward.ts` L149-188).
- **Forbidden zones:** `packages/db/` prisma schema, any event-odds-ingest write path,
  secrets/`.env`, `vercel.json`, `apps/web/lib/scraping/*`. Also: do NOT edit
  `kernel/contract.ts`, `kernel/numeric.ts`, `kernel/conformance.ts`, and do NOT touch the
  `packages/prediction-engine/src/index.ts` barrel (three open PRs collide there; barrel
  exports are a deliberate follow-up decision, see Open Questions).
- **Strict TS**, `noUncheckedIndexedAccess` on, no `any`, ESM `.js` import extensions.
- **One artifact per card** = the named module + its test file (the Wave-K pairing).
  If a card seems to need a third file, it is two cards — stop and split.
- **Idempotent/restartable:** every card creates new files only (except where a card says
  otherwise); re-running from scratch after a dead session is correct and cheap; nothing
  is left only in a session buffer.
- **Commit-on-pass:** one commit per card, only after Verify passes, message given per card.

**Verify pattern** (deterministic — a model's opinion is not a gate):

```
cd packages/prediction-engine && npx vitest run src/edge-lab/share-core/__tests__/<key>.test.ts && npx tsc --noEmit
```

All new modules live in `packages/prediction-engine/src/edge-lab/share-core/` (new
directory), tests in `share-core/__tests__/`. Import kernel numerics as
`"../kernel/numeric.js"`, contract types as `"../kernel/contract.js"`, conformance as
`"../kernel/conformance.js"`, K11 as `"../kernel/slots/dirichlet-multinomial.js"`.

**Sequencing doctrine for the whole deck:** shadow mode first — the share core runs
log-only NEXT TO the existing per-player NB volume models and is compared by the SC10
harness. Promotion into any live path happens only through masterplan §6 gates, in a
later deck. Masterplan L465 names the failure mode this deck must not commit:
*"Dirichlet share model merged without renormalization + teammate-correlation tests."*
Renormalization and teammate-correlation tests are therefore mandatory attacks below.

---

## SC1 · RESEARCH — usage/roster source map

**DATA CLASS: INTERNAL** (repo architecture + CC-BY field semantics; no edge content).

**Artifact:** `docs/data/_gen/share-core-source-map.md` (research deliverable — a
generated doc, so downstream cards read one file instead of exploring).

**Why research, not implementation:** the recon confirms the assets exist but not the
join keys and field names the SC2 builder needs. Known starting facts (verify, don't
re-discover):

- `packages/data-ingestion/src/nflverse-source.ts` defines asset `player_stats_week`
  (L75-77: grain player-week, "targets, receptions, air yards, EPA, attempts", since
  1999) and asset `snap_counts` (L81-85: grain player-week, since 2012, seasonal, file
  `snap_counts_${s}.csv`). Both CC-BY-4.0, attribution "Data via nflverse, licensed
  CC BY 4.0". Fetch entrypoint: `fetchNflverse` (imported by
  `scripts/edge-lab/props-hb-validation.ts` L69; note its header: live fetch needs
  `NODE_OPTIONS=--use-system-ca`).
- Kickoff timestamps: candidate loader `packages/prediction-engine/src/edge-lab/loaders/nfl-games.ts`.
- ID crosswalk doc exists: `docs/ops/NFLVERSE_GSIS_CROSSWALK.md` (nflverse `snap_counts`
  is historically PFR-keyed, NOT gsis-keyed — this is the join hazard).

**Questions the doc MUST answer, each with repo path + line/column citation, or a live
sample-row citation from the fetched asset:**

1. Exact `player_stats_week` column names for: player gsis id, team, season, week,
   targets, rushing attempts (carries), receptions.
2. Exact `snap_counts` column names for: player id (and WHICH id system), team, week,
   offensive snaps. The concrete crosswalk to gsisId (which mapping, coverage %, and the
   refusal rule for unmapped players — unmapped ⇒ team-week refused, never guessed).
3. Team offensive snaps per game: taken from a column or derived (state the exact rule,
   e.g. max over the team's rows for that game) — must match the denominator semantics of
   `SnapSample.teamOffSnaps` in `props-hb-snap-exposure.ts`.
4. Kickoff UTC timestamp per (team, season, week) from `loaders/nfl-games.ts` (exact
   exported fields), for TimedRow `decisionAt`/`eventEndAt` construction in SC2.
5. Inactive/DNP discrimination: does ANY in-repo, cleared source distinguish
   injury-out from healthy scratch at decision time? If none, say so explicitly — SC2's
   activity mask then remains "offSnaps ≥ 1" and the limitation is documented (this feeds
   Open Question 4).
6. Week-number domain: confirm weeks run 1..22 and that no week=0 aggregate rows exist in
   either asset (the covariate-bus norm — `covariate-bus.ts` `latestPriorRow` L119
   excludes week 0 and same-week).

**Doc structure (fixed headings, machine-checked):** `## Assets`, `## Join keys`,
`## Field map`, `## Team snaps rule`, `## Kickoff timestamps`, `## Activity mask rule`,
`## Gaps`.

**Discipline:** research only; no code, no fetch results committed beyond ≤5 cited sample
rows (facts, CC-BY, attributed); priced:false n/a; forbidden zones per common contract.

**Verify (deterministic):**

```
bash -c 'f=docs/data/_gen/share-core-source-map.md; for h in "## Assets" "## Join keys" "## Field map" "## Team snaps rule" "## Kickoff timestamps" "## Activity mask rule" "## Gaps"; do grep -qF "$h" "$f" || { echo "MISSING: $h"; exit 1; }; done; grep -oE "packages/[A-Za-z0-9_/.-]+\.ts|docs/[A-Za-z0-9_/.-]+\.md" "$f" | sort -u | { ok=0; while read p; do [ -f "$p" ] || { echo "DEAD PATH: $p"; ok=1; }; done; exit $ok; } || exit 1; echo PASS'
```

**Idempotent:** regenerating the doc from scratch is correct; no state.

**Commit on pass:** `docs(share-core): SC1 usage/roster source map (research)`

**ATTACK LIST (verifier):**
- Every claimed column name spot-checked against the actual adapter code or one fetched
  row — not taken from nflverse folklore.
- The snap_counts id-system claim tested: pick 3 players, show the crosswalk actually
  resolves them (or the doc says it cannot and refuses).
- "Team snaps rule" cross-checked for double-counting (sum over player rows is WRONG if
  rows are per-player snaps; the doc must prove its rule on one real game).
- Week-0 claim checked by an actual filter count, not assertion.

---

## SC2 · usage-matrix — per-team-week count matrix builder

**DATA CLASS: INTERNAL.**

**Artifact:** `packages/prediction-engine/src/edge-lab/share-core/usage-matrix.ts`
+ `share-core/__tests__/usage-matrix.test.ts`

**Depends:** SC1 merged (for the caller's field mapping — but this module itself is PURE:
no I/O, no fetch; the caller maps raw assets into `UsageGameRow`).

**Spec.** Closes the recon gap "no per-game share dataset builder" and half of "no
active-roster/DNP conditioning". Exact shapes (define in this file):

```ts
export interface UsageGameRow {
  gsisId: string;
  teamId: string;
  season: number;
  week: number;            // 1..22; week 0 refused (season aggregates never enter)
  targets: number;         // integer ≥ 0
  rushAtt: number;         // integer ≥ 0
  offSnaps: number;        // integer ≥ 0 (player offensive snaps this game)
  teamOffSnaps: number;    // integer > 0
  kickoffIso: string;      // game kickoff, UTC ISO-8601
}

export interface ShareMatrixRow {
  // TimedRow-compliant (walk-forward.ts L31: { id, decisionAt, eventEndAt }) so
  // walkForwardSplits' purge/embargo machinery applies unchanged.
  id: string;              // `${teamId}-${season}-W${week}`
  decisionAt: string;      // kickoffIso minus opts.decisionLeadHours (default 6)
  eventEndAt: string;      // kickoffIso plus 5 hours
  teamId: string; season: number; week: number;
  players: string[];       // ACTIVE columns this game, sorted ascending by gsisId
  targetCounts: number[];  // aligned to players; integers
  carryCounts: number[];   // aligned to players; integers
  teamTargets: number;     // = sum(targetCounts)
  teamRushes: number;      // = sum(carryCounts)
}

export type UsageRefusalReason =
  | "week_zero" | "non_finite" | "negative_count" | "non_integer_count"
  | "zero_team_snaps" | "count_without_snap"   // counts>0 while offSnaps=0: data error
  | "duplicate_player" | "empty_active_set" | "bad_kickoff";

export interface UsageRefusal { refused: true; key: string; reason: UsageRefusalReason }

export function buildShareMatrix(
  rows: readonly UsageGameRow[],
  opts?: { decisionLeadHours?: number }   // default 6
): { rows: ShareMatrixRow[]; refusals: UsageRefusal[] };
```

Rules (all mandatory):

- **Activity mask:** a player is a column of a team-week row iff `offSnaps ≥ 1` in that
  game. A player with `offSnaps = 0` contributes NOTHING to that row — a zero-count row
  entry for an inactive player is the healthy-scratch-as-talent bug (#519/#530/#531; same
  semantics as `snapShare`'s `zero_player` refusal in `props-hb-snap-exposure.ts` L42:
  exposure, not talent).
- `targets>0 || rushAtt>0` while `offSnaps=0` ⇒ refuse the ENTIRE team-week
  (`count_without_snap`) — contradictory data is never partially salvaged.
- Any refusal reason hit within a team-week refuses the whole team-week; refusals are
  returned with reasons, never thrown (builder is total).
- Deterministic: same input (any order) ⇒ identical output; rows grouped by
  (teamId, season, week), players sorted ascending by gsisId, output rows sorted by
  (season, week, teamId).
- Never mutate input. No market fields exist in the input type — keep it that way.

**Discipline:** priced:false (records carry no price fields at all); fail-closed per
refusal table; nothing enters live p without §6; no MODEL_VERSION; forbidden zones per
common contract.

**Verify:**
```
cd packages/prediction-engine && npx vitest run src/edge-lab/share-core/__tests__/usage-matrix.test.ts && npx tsc --noEmit
```

**Idempotent:** pure module, new files only; safe to redo from scratch.

**Commit on pass:** `feat(share-core): SC2 team-week usage matrix builder (priced:false, fail-closed)`

**ATTACK LIST (verifier):**
- Healthy-scratch attack: a player with offSnaps=0 and counts=0 must be ABSENT from
  `players` (not present with a 0), and the same player active elsewhere must appear
  there — assert both in one fixture.
- `count_without_snap` refuses the whole team-week, not just the player.
- Column alignment: shuffle input row order; `targetCounts[i]` must still belong to
  `players[i]` (verifier builds a fixture where misalignment changes an answer).
- TimedRow arithmetic: decisionAt = kickoff − 6h and eventEndAt = kickoff + 5h checked
  against a hand-computed timestamp crossing a UTC date boundary.
- `teamTargets`/`teamRushes` equal the sums exactly (integers, no float drift).
- Input mutation: deep-freeze the fixture; any mutation throws.
- week 0 and week 23 both refused.

---

## SC3 · fit-shares — masked Minka fit over team-week rows (wires K11)

**DATA CLASS: INTERNAL.**

**Artifact:** `packages/prediction-engine/src/edge-lab/share-core/fit-shares.ts`
+ `share-core/__tests__/fit-shares.test.ts`

**Depends:** SC2 types. **PRECONDITION (mechanical):**
`test -f packages/prediction-engine/src/edge-lab/kernel/slots/dirichlet-multinomial.ts`
— K11 landed. If absent, this card is BLOCKED; do not re-implement K11.

**Spec.** Real rosters vary game to game, so the dense
`FitDirichletMultinomialFn(countRows: number[][])` (kernel/contract.ts L440-456) cannot
be fed raw team-weeks: an inactive player is structurally missing, not a zero. This card
implements the masked Minka fixed-point and DELEGATES to K11 on the dense special case.

```ts
import { KernelError } from "../kernel/contract.js";      // per contract error type
import { digamma } from "../kernel/numeric.js";           // NEVER re-derive (numeric.ts L201)
import { fitDirichletMultinomial } from "../kernel/slots/dirichlet-multinomial.js";

export interface MaskedCountInput {
  players: string[];                 // union roster, sorted ascending by gsisId
  rows: { counts: number[]; active: boolean[] }[];  // both aligned to players
}
export interface TeamShareFit {
  players: string[];
  alpha: number[];                   // all > 0, aligned to players
  concentration: number;             // A = Σ alpha
  iterations: number;
  priced: false;
}
export function fitMaskedDirichletMultinomial(
  input: MaskedCountInput,
  opts?: { budget?: number; tol?: number; alphaFloor?: number } // 500, 1e-9, 1e-6
): TeamShareFit;

// Convenience adapters over SC2 output (pure):
export function targetsInput(rows: readonly ShareMatrixRow[]): MaskedCountInput;
export function carriesInput(rows: readonly ShareMatrixRow[]): MaskedCountInput;
```

Fixed-point (masked Minka; ψ = digamma):

- Row totals over ACTIVE columns only: `n_i = Σ_{j: active_ij} x_ij`;
  per-row active concentration `A_i = Σ_{j: active_ij} α_j`.
- Update per player j:
  `α_j ← α_j · ( Σ_{i: active_ij} [ψ(x_ij + α_j) − ψ(α_j)] ) / ( Σ_{i: active_ij} [ψ(n_i + A_i) − ψ(A_i)] )`
- Init: `2 × mean observed share of j over rows where j is active`, floored at `1e-3`
  (matches K11's init discipline). α floor `1e-6` after every update.
- Convergence: max abs α change < tol ⇒ done; past budget ⇒
  `KernelError` `NO_CONVERGENCE` — throw, never degrade.
- Input validation (throw `KernelError` `BAD_INPUT`): ragged arrays, non-integer or
  negative counts, count > 0 where active=false, a player active in zero rows, fewer
  than 2 players active in some row? (no — a 1-active-player row is legal and
  informative only about totals; document), fewer than `opts.minRows ?? 3` usable rows
  overall ⇒ `KernelError` `INSUFFICIENT_ROWS` (fail-closed, never a made-up prior).
- **Dense delegation:** when every row has all players active, the result must be the
  K11 `fitDirichletMultinomial` result exactly — implement by delegating on that branch,
  not by hoping two implementations agree.

Masked-count evidence semantics (document in the header): an ACTIVE row with x_ij = 0 is
real evidence player j was passed over; an INACTIVE cell is no evidence at all. This is
the module-level resolution of the DNP gap.

**Discipline:** priced:false on `TeamShareFit`; fail-closed (`KernelError`, never NaN);
nothing enters live p without §6; no MODEL_VERSION; no market inputs (the input type has
no price fields — keep it that way); forbidden zones per common contract.

**Verify:**
```
test -f packages/prediction-engine/src/edge-lab/kernel/slots/dirichlet-multinomial.ts && cd packages/prediction-engine && npx vitest run src/edge-lab/share-core/__tests__/fit-shares.test.ts && npx tsc --noEmit
```

**Idempotent:** pure module, new files only.

**Commit on pass:** `feat(share-core): SC3 masked Dirichlet-multinomial fit, dense path delegated to K11`

**ATTACK LIST (verifier):**
- **Dense equivalence:** full-mask input ⇒ α identical (1e-12) to calling K11's
  `fitDirichletMultinomial` directly. (This is the wiring claim of the card.)
- **Mask invariance:** fill INACTIVE cells with garbage counts paired with active=false —
  fit must be bit-identical to the same input with zeros there... and if the validator
  (count>0 where inactive ⇒ BAD_INPUT) makes this unrepresentable, assert the throw
  instead. Either behavior must be the one the header documents.
- **Scratch-vs-DNP:** appending a row where player j is ACTIVE with 0 counts must LOWER
  α_j's share; appending a row where j is INACTIVE must leave the fit unchanged
  (1e-9). Both asserted in one test — this is the bug class the card exists for.
- **Round-trip:** generate 2000 masked rows from known α = [5,3,2,1] with random ~20%
  inactive masks, trials 25..45, using a TEST-LOCAL seeded generator built from
  `makeRng` + `boxMuller` (Marsaglia–Tsang in the test file — generation is independent
  of the fit, so this is not vacuous); recovered shares within 20%.
- Budget exhaustion actually throws NO_CONVERGENCE (construct with tol=0).
- `digamma` imported from `../kernel/numeric.js` — grep the module; a re-derived digamma
  fails the card.
- Determinism: two runs on the same input are bit-identical.

---

## SC4 · team-trials — Gamma-Poisson team totals baseline (NOT the script core)

**DATA CLASS: INTERNAL.**

**Artifact:** `packages/prediction-engine/src/edge-lab/share-core/team-trials.ts`
+ `share-core/__tests__/team-trials.test.ts`

**Depends:** SC2 types only.

**Spec.** `DirichletMultinomialParams.trials` needs a team-total distribution; the real
script core (masterplan §3.1: spread/total/rest/pace → plays, PROE) does not exist yet
and is NOT this card. This is an honest, exchangeable baseline so shadow mode can run.
Mandatory header text: *"SHADOW-ONLY STAND-IN for the §3.1 script core. Exchangeable
Gamma-Poisson over team totals. Deliberately blind to spread/total/pace — script
covariates enter only through the §6-gated script core. Retire this module when the
script core lands. priced:false."*

```ts
import { fitGroupPrior, posteriorRate, type RateSample } from "../props-hb.js"; // L160, L206
// nbPmf: import from ../props-hb.js — it is the same export props-hb-catch.ts uses in
// its k-loop (props-hb-catch.ts L172-177 calls nbPmf(k, targetPost, games)).

export interface TeamTrialsSample { teamId: string; games: number; total: number } // per team: games played, summed totals
export interface TeamTrialsDist {
  teamId: string;
  pmf: (n: number) => number;        // NB posterior predictive for ONE future game
  supportMax: number;                // smallest N with tail mass < 1e-12, hard cap 300
  mean: number;
  priced: false;
}
export function fitTeamTrials(
  samples: readonly TeamTrialsSample[],   // one entry per team, ≥ opts.minTeams (default 8)
  target: "targets" | "rushes"            // label only; carried through for logging
): { prior: ReturnType<typeof fitGroupPrior>; forTeam: (s: TeamTrialsSample) => TeamTrialsDist };
```

- `fitGroupPrior` pools across teams (method-of-moments EB, exactly as props families
  pool across players); `posteriorRate(prior, total, games)` per team; predictive pmf for
  one future game via `nbPmf(n, post, 1)` — mirror the props-hb-catch call shape exactly,
  do not re-derive an NB.
- **Recency: NONE in this module.** props-hb-obs owns recency (capGameLog /
  discountGameLog / aggregateGameLog, regimeShift — props-hb-obs.ts L402-451). Applying
  recency both here and there double-counts; this module takes already-aggregated
  (games,total) and documents that the CALLER chose the window. (PR #557's
  kneel/garbage adjusters are trials-side HYPOTHESIS — not imported here; branch-only.)
- Fail-closed: fewer than minTeams, games=0, non-finite, negative ⇒ typed refusal
  `{ refused: true, reason: ... }`, never a default prior.

**Discipline:** priced:false; fail-closed; nothing enters live p without §6; no
MODEL_VERSION; no market inputs — the module must contain NO reference to spread, total,
moneyline, odds, or any market covariate; forbidden zones per common contract.

**Verify:**
```
cd packages/prediction-engine && npx vitest run src/edge-lab/share-core/__tests__/team-trials.test.ts && npx tsc --noEmit && ! grep -nE "spread|total_line|moneyline|odds" packages/prediction-engine/src/edge-lab/share-core/team-trials.ts
```
(Note: name interior variables so the grep stays clean — e.g. `summedCount`, not `total_line`.)

**Idempotent:** pure module, new files only.

**Commit on pass:** `feat(share-core): SC4 team trials Gamma-Poisson baseline (shadow stand-in for script core)`

**ATTACK LIST (verifier):**
- pmf sums to 1 within 1e-9 over [0, supportMax] and supportMax honors the 1e-12 tail
  rule (cross-check by summing beyond it).
- `mean` matches Σ n·pmf(n) AND the closed-form posterior-predictive mean.
- The grep gate is real: verifier greps the module for market vocabulary themselves.
- Double-recency attack: confirm the module never imports discountGameLog/regimeShift
  (grep) and its header carries the caller-owns-window statement.
- Pooling sanity: a team with 0 observed games refuses; a team with extreme totals
  shrinks TOWARD the pooled prior (assert direction, not magnitude).

---

## SC5 · volume-marginal — per-player count distribution (share × trials)

**DATA CLASS: INTERNAL.**

**Artifact:** `packages/prediction-engine/src/edge-lab/share-core/volume-marginal.ts`
+ `share-core/__tests__/volume-marginal.test.ts`

**Depends:** SC3 (`TeamShareFit`), SC4 (`TeamTrialsDist`).

**Spec.** The per-player marginal the props k-loops will consume. For player i with
α_i, A = Σα: given team trials N = n, X_i ~ BetaBinomial(n, α_i, A − α_i). Mixed over
trials:

```
pmf(k) = Σ_{n ≥ k} trialsPmf(n) · exp( logChoose(n,k) + logBeta(k+α_i, n−k+A−α_i) − logBeta(α_i, A−α_i) )
```

`logChoose`/`logBeta` from `../kernel/numeric.js`. Export:

```ts
export function makeShareVolumeMarginal(input: {
  fit: TeamShareFit;                // from SC3
  gsisId: string;                   // must be in fit.players, else KernelError BAD_INPUT
  trials: TeamTrialsDist;           // from SC4 (or, later, the real script core)
}): DiscreteDistribution;           // kernel/contract.ts L178 — the exact contract type
```

- **Conformance is mandatory:** the returned object must pass
  `assertDistributionConformance` (`kernel/conformance.ts` L154) — pmf sums to 1, cdf
  monotone, quantile = generalized inverse, 20k-draw sample moments track declared
  moments, KernelError on bad input.
- Support `[0, trials.supportMax]`; cdf(supportMax) must be ≥ 1 − 1e-9 (the
  TARGET_K_MAX-style truncation guarantee from the recon risk list — a cdf that stalls
  below 1 fails conformance and breaks every downstream k-loop).
- Declared moments closed-form, with s_i = α_i/A:
  `mean = E[N]·s_i`;
  `variance = Σ_n pmf_N(n)·n·s_i(1−s_i)·(A+n)/(A+1)  +  s_i²·Var(N)`
  (law of total variance; derive in comments).
- `sample(rng)`: draw N by cdf inversion on trialsPmf; draw p ~ Beta(α_i, A−α_i) via two
  Marsaglia–Tsang gammas using ONLY the injected rng + `boxMuller`; then Binomial(N,p) by
  N Bernoulli draws. No `Math.random`.
- This module does NOT edit any props family. The k-loop swap
  (`props-hb-catch.ts:172-177`, `props-hb-rush.ts:120-126`, `props-hb-atd.ts:142-148`,
  `props-hb-rec-td.ts:141`, `props-hb-rush-td.ts:139`) is composed EXTERNALLY by SC10
  in shadow; editing those files is out of scope for this whole deck.

**Discipline:** priced:false (research object; attach `priced:false` where records are
emitted — the DiscreteDistribution itself is the contract type, unmodified); fail-closed;
nothing enters live p without §6; no MODEL_VERSION; forbidden zones per common contract.

**Verify:**
```
cd packages/prediction-engine && npx vitest run src/edge-lab/share-core/__tests__/volume-marginal.test.ts && npx tsc --noEmit
```

**Idempotent:** pure module, new files only.

**Commit on pass:** `feat(share-core): SC5 player volume marginal (BB×trials mixture, conformance-passing)`

**ATTACK LIST (verifier):**
- `assertDistributionConformance` actually called in tests (grep) AND passes.
- Degenerate identities, both asserted to tight tolerance:
  (a) single-player fit (α = [α_1]) ⇒ marginal equals the trials distribution exactly;
  (b) trials point-mass at n ⇒ marginal equals a pure BetaBinomial(n, α_i, A−α_i) —
  cross-checked against an INDEPENDENT BB pmf written in the test from
  logChoose/logBeta (not by calling the module's internals).
- Declared mean/variance vs 200000-draw empirical within 2% (seeded rng).
- cdf(supportMax) ≥ 1 − 1e-9 for a heavy-tail case (small A, large trials variance).
- Teammate sanity: Σ_i mean_i over all players = E[N] within 1e-9 (shares are
  compositional — means must add up to the trials mean; independent-NB stacks fail this).
- Math.random ban: grep module + tests.

---

## SC6 · alpha-projection — exposure offsets into α (est-routes hook)

**DATA CLASS: CROWN** (α construction is share-core design — §3b crown row; this card
embeds only the offset rule the implementer strictly needs).

**Artifact:** `packages/prediction-engine/src/edge-lab/share-core/alpha-projection.ts`
+ `share-core/__tests__/alpha-projection.test.ts`

**Depends:** SC3 (`TeamShareFit`).

**Spec.** Masterplan §3.2's α is a log-linear model; this deck wires ONLY the exposure
offset (E-C1) and leaves typed hooks where role/recency/QB/matchup terms will attach in
later, §6-gated decks. Rule (shares first, then rescale):

```
s_i^fit = α_i / A
s'_i ∝ s_i^fit · (eNext_i / eHist_i)^β        (β default 1)
α'_i  = A · s'_i                              (concentrationPolicy "preserve_total")
```

```ts
export type ExposureField = "est_route" | "snap_pooled";  // ONE field per projection, never mixed
export interface ExposureInput {
  gsisId: string;
  eHist: number;   // historical exposure share over the fit window, in (0,1]
  eNext: number;   // decision-time projection for the next game, in (0,1]
}
export interface AlphaProjection {
  players: string[]; alpha: number[]; concentration: number;
  exposureField: ExposureField; beta: number;
  honesty: "exposure_offset_only";           // hooks not yet active
  priced: false;
}
export type ProjectionRefusal = { refused: true; reason:
  "missing_exposure" | "mixed_fields" | "unknown_player" | "non_finite"
  | "out_of_range"; gsisIds: string[] };

export function projectAlpha(
  fit: TeamShareFit,
  exposures: readonly ExposureInput[],
  opts: { field: ExposureField; beta?: number }
): AlphaProjection | ProjectionRefusal;
```

- **Fail-closed, whole-projection:** if ANY player in `fit.players` lacks a valid
  exposure pair, refuse the entire projection listing the offenders. Never impute 1.0,
  never drop-and-renormalize silently (imputation by omission). The caller's honest
  fallback is the unprojected `TeamShareFit`, which is still a valid DM.
- Exposure sources (caller-supplied numbers; this module takes shares, not raw data):
  `est_route` from `estRoutesTprr` (`est-routes-tprr.ts`, PR #556 — layer L1, the E-C1
  CC-BY proxy; do NOT import the branch module here — the caller computes the share) or
  `snap_pooled` from `pooledSnapShare` (`props-hb-snap-exposure.ts` L60). The two have
  different denominators — mixing fields within one projection is a refusal.
- Renormalization invariant: Σ s'_i = 1 exactly (compensated summation or normalize at
  the end); `concentration` preserved under `preserve_total` (masterplan L465 kill
  condition: no share model without renormalization tests).
- **No market inputs by construction:** the input type admits exposure shares only. The
  module must not import from covariate-bus, odds, or pricing modules.

**Discipline:** priced:false; fail-closed; nothing enters live p without §6; no
MODEL_VERSION; forbidden zones per common contract.

**Verify:**
```
cd packages/prediction-engine && npx vitest run src/edge-lab/share-core/__tests__/alpha-projection.test.ts && npx tsc --noEmit && ! grep -nE "covariate-bus|props-priced-edge|odds" packages/prediction-engine/src/edge-lab/share-core/alpha-projection.ts
```

**Idempotent:** pure module, new files only.

**Commit on pass:** `feat(share-core): SC6 alpha exposure-offset projection (est-routes hook, fail-closed)`

**ATTACK LIST (verifier):**
- Σ shares after projection = 1 to 1e-12; concentration unchanged to 1e-12.
- β sign/direction: raising eNext for one player raises his share AND lowers every
  teammate's (compositional — assert both).
- β = 0 ⇒ projection identical to fit (1e-12).
- Missing one player's exposure ⇒ whole-projection refusal naming exactly that gsisId;
  the returned object must NOT contain a partial α.
- Mixed-denominator attack: exposures labeled correctly but caller passes opts.field
  inconsistent with a second call's field — confirm the type/API makes per-player field
  mixing unrepresentable (single field per call) and mixed input refuses.
- eNext = 0 or eHist = 0 ⇒ `out_of_range` refusal (log of zero must be unreachable).
- Grep gate for market imports run by the verifier, not trusted.

---

## SC7 · reproject — injury re-projection (drop + renormalize + vacancy hook)

**DATA CLASS: CROWN** (injury re-projection is §3.2 design; E-C3 vacancy elasticity is a
crown catalog entry — this card embeds only the hook contract, not any measured values).

**Artifact:** `packages/prediction-engine/src/edge-lab/share-core/reproject.ts`
+ `share-core/__tests__/reproject.test.ts`

**Depends:** SC3/SC6 (`TeamShareFit` | `AlphaProjection`).

**Spec.** Masterplan §3.2: *"Injury re-projection = drop the inactive player's α,
renormalize, then apply measured vacancy elasticity (§4-C3) as a correction — not naive
pro-rata."* The measured elasticity does not exist yet (E-C3 is HYPOTHESIS), so this card
ships the mechanism with an honestly-labeled pro-rata baseline default and a typed hook
where the measured redistribution will plug in.

```ts
export type VacancyElasticityFn = (input: {
  vacatedShare: number;                                  // Σ shares of dropped players
  survivors: readonly { gsisId: string; baseShare: number }[];
}) => readonly { gsisId: string; multiplier: number }[]; // one entry PER survivor, all > 0

export interface Reprojection {
  players: string[]; alpha: number[]; concentration: number;
  droppedGsisIds: string[];
  elasticity: "none_prorata_baseline" | "hook";          // honesty label — REQUIRED
  priced: false;
}
export type ReprojectRefusal = { refused: true; reason:
  "unknown_inactive" | "all_inactive" | "bad_multiplier" | "hook_missing_survivor"
  | "non_finite"; gsisIds: string[] };

export function reprojectForInactives(
  base: TeamShareFit | AlphaProjection,
  inactiveGsisIds: readonly string[],
  opts?: {
    elasticity?: VacancyElasticityFn;
    concentrationPolicy?: "drop_mass" | "preserve_total";  // default "drop_mass"
  }
): Reprojection | ReprojectRefusal;
```

Mechanism, in order:

1. Validate: every inactive id must exist in `base.players` (`unknown_inactive` refusal —
   silently ignoring an unknown id means projecting the wrong roster); at least one
   survivor (`all_inactive`).
2. Drop inactive α entries. Survivor shares renormalize to sum 1.
3. If `elasticity` provided: apply multipliers to survivor shares, then renormalize to
   sum 1 AGAIN (the hook proposes redistribution; renormalization is non-negotiable —
   masterplan L465). Hook output must cover every survivor exactly once, multipliers
   finite and > 0; anything else refuses.
4. Concentration: `drop_mass` (default) ⇒ A' = Σ surviving α before renormalization is
   applied as scale — i.e. α' = A'·s'; dispersion honestly widens when a big share
   leaves. `preserve_total` ⇒ A' = original A. Both must be exact and documented in the
   header; the choice is the caller's, never silent.
5. `inactiveGsisIds = []` ⇒ output identical to input (1e-12), elasticity label still set.

Zero-snap semantics note (mandatory header text): this module handles DECISION-TIME
inactives. Fit-time DNP handling lives in SC2/SC3's activity mask — the two must share
the roster source (SC1) or shares and exposure offsets disagree on who exists (the
#519/#530/#531 bug class, recon risk "zero-snap semantics").

**Discipline:** priced:false; fail-closed; nothing enters live p without §6 (E-C3's
measured elasticity in particular is HYPOTHESIS until leave-one-out tested on past
inactives per masterplan); no MODEL_VERSION; forbidden zones per common contract.

**Verify:**
```
cd packages/prediction-engine && npx vitest run src/edge-lab/share-core/__tests__/reproject.test.ts && npx tsc --noEmit
```

**Idempotent:** pure module, new files only.

**Commit on pass:** `feat(share-core): SC7 injury re-projection (drop+renormalize, vacancy elasticity hook)`

**ATTACK LIST (verifier):**
- Mass conservation: survivor shares sum to 1 (1e-12) BOTH with and without an
  elasticity fn — the hook must not be able to break normalization no matter what
  multipliers it returns.
- Dropped player really gone: `players`/`alpha` exclude him; his mass is redistributed
  proportionally in the baseline case (hand-computed 3-player fixture).
- `unknown_inactive` fires on an id not in the roster — verifier tries a plausible
  gsisId to confirm no silent ignore.
- Hook contract abuse: multiplier 0, negative, NaN, a missing survivor, a duplicate
  survivor ⇒ each refuses with the right reason.
- Concentration policies: `drop_mass` shrinks A by exactly the dropped α mass;
  `preserve_total` keeps A to 1e-12; verify variance direction of the implied DM
  actually widens under drop_mass (compute Var of a share under both A values).
- Empty-inactive identity to 1e-12.
- `elasticity` honesty label present on every success path.

---

## SC8 · teammate-corr — negative-correlation surface for Parlay MRI / same-game coherence

**DATA CLASS: CROWN** (same-game correlation structure over our fits is crown analytics).

**Artifact:** `packages/prediction-engine/src/edge-lab/share-core/teammate-corr.ts`
+ `share-core/__tests__/teammate-corr.test.ts`

**Depends:** SC3 (`TeamShareFit`), SC4 (`TeamTrialsDist`).

**Spec.** The point of the share core (masterplan §3.2): teammates are negatively
correlated automatically. This card exposes that structure as data for Parlay MRI and
same-game coherence — research-only records; wiring INTO the Parlay MRI scorer is a
later deck (its seam is not in the recon — Open Question 1).

Closed forms (derive in comments; s_i = α_i/A):

- Conditional on N = n:
  `Var(X_i | n) = n·s_i(1−s_i)·(A+n)/(A+1)`
  `Cov(X_i, X_j | n) = −n·s_i·s_j·(A+n)/(A+1)   (i ≠ j)`
- Unconditional over random N with pmf from SC4 (law of total covariance):
  `Cov(X_i, X_j) = s_i·s_j·[ Var(N) − (A·E[N] + E[N²]) / (A+1) ]`
  — the first term (shared team total) pushes teammates POSITIVE, the second
  (compositional shares) pushes NEGATIVE. Both components must be reported; the sign of
  the sum is an empirical fact per team, not an assumption.

```ts
export interface TeammatePairCorr {
  gsisIdA: string; gsisIdB: string;
  corrConditional: number;     // at n = round(E[N]); always < 0 for i ≠ j
  corrUnconditional: number;   // sign depends on Var(N) — report honestly
  components: { sharePart: number; trialsPart: number };  // the two Cov terms above
  priced: false;
}
export function teammateCorrSurface(
  fit: TeamShareFit,
  trials: TeamTrialsDist
): { teamId: string; pairs: TeammatePairCorr[]; priced: false };
```

- All pairs i < j over `fit.players`; correlations from the closed forms (E[N], E[N²],
  Var(N) computed from `trials.pmf` over `[0, supportMax]`).
- Bounds: every corr in [−1, 1]; i = j unrepresentable (pairs only).
- Consumers named in the header (documentation, no imports): Parlay MRI same-game legs
  and §3.5 joint-simulation coherence; consumption is post-§6, records are priced:false.

**Discipline:** priced:false; fail-closed (non-finite α, empty roster, degenerate trials
⇒ KernelError); nothing enters live p or live Parlay MRI without §6; no MODEL_VERSION;
forbidden zones per common contract.

**Verify:**
```
cd packages/prediction-engine && npx vitest run src/edge-lab/share-core/__tests__/teammate-corr.test.ts && npx tsc --noEmit
```

**Idempotent:** pure module, new files only.

**Commit on pass:** `feat(share-core): SC8 teammate correlation surface (analytic DM covariance, priced:false)`

**ATTACK LIST (verifier):**
- **Empirical cross-check (the K11 attack, upgraded):** α = [2,2,2], trials fixed at 30
  (point-mass trials dist) ⇒ `corrConditional` < 0 for every pair AND matches the
  empirical correlation of 3000 draws from K11's `sampleDirichletMultinomial` (seeded
  rng) within 0.05. This wires the analytic surface to the sampled truth.
- Fixed-trials consistency: with a point-mass trials dist, `corrUnconditional` equals
  `corrConditional` (Var(N)=0) to 1e-9.
- **Sign-flip construction:** verifier builds a high-variance trials dist (e.g. mixture
  of n=10 and n=70) where `corrUnconditional` > 0 while `corrConditional` < 0, and
  checks `components` explain it (sharePart < 0, trialsPart > 0, sum matches). An
  implementation that hard-codes "teammates negative" fails here — the honesty is the
  product.
- E[N²] vs Var(N) slip: perturb the formula mentally — the test must pin
  `trialsPart = s_i·s_j·Var(N)` and `sharePart = −s_i·s_j·(A·E[N]+E[N²])/(A+1)`
  numerically on a hand-computed 2-player fixture.
- Bounds property: random α/trials fuzz (seeded), all corrs in [−1,1], matrix symmetric.

---

## SC9 · RESEARCH — bus registration plan for share-core exposure covariates

**DATA CLASS: CROWN** (covariate-bus design).

**Artifact:** `docs/data/_gen/share-core-bus-plan.md`

**BLOCKED until:** PR #555 merged to main
(`grep -q "knownAtWeek" packages/prediction-engine/src/edge-lab/covariate-bus.ts`) AND
PR #556 merged
(`test -f packages/prediction-engine/src/edge-lab/est-routes-tprr.ts`).
Do not start before both greps pass — main's `CovariateCell` today has neither `layer`
nor `knownAtWeek`, and building against the 3-field shape guarantees a typecheck break
at merge (recon risk #1).

**Why research, not implementation:** the recon shows the POST-merge cell/registry
shapes (`CovariateCell` + `layer: 'L0'|'L1'|'L2'|'L3'|'MARKET_GAME'|'MARKET_PROP'` +
`knownAtWeek`; `P_SIDE_COVARIATE_REGISTRY` entries `{field, layer, honesty}`;
`assertPSideHasNoMarketProp` CI walk) but NOT how a DERIVED L1 covariate becomes a bus
row: `CovariateRow` (covariate-bus.ts L50) is an NGS-L2 ingest shape, and
`estRoutesTprr` is a standalone function. Whether est_route_share becomes (a) a new
nullable field on `CovariateRow` (rippling into the NGS ingest at
`packages/data-ingestion/src/nflverse-ngs.ts`), (b) a parallel L1 row source feeding the
same cell API, or (c) a bind-module-only input that never lives on the bus, is a design
decision that needs the merged code in front of it.

**The doc MUST resolve, with merged-main line citations:**

1. The exact merged shapes: `CovariateCell`, `CovariateLayer`,
   `P_SIDE_COVARIATE_REGISTRY`, `assertPSideHasNoMarketProp`, and the #555-edited bind
   at `props-hb-air-yac-bind.ts` (~L157, full-cell construction) — copied verbatim as
   the binding target.
2. Chosen path (a)/(b)/(c) for `est_route_share` and `pooled_snap_share`, with the
   registry entries to add ({field, layer:"L1", honesty:"proxy — snaps×dropbacks/team_snaps,
   not measured routes" per E-C1's honest-label rule) and the `knownAtWeek` rule
   (strictly < kickoffWeek; week 0 never emitted).
3. The follow-up implementation card list (each one-artifact), including the share-core
   "role bind" module following the request→ok|refuse pattern of
   `bindSepSamples` (`props-hb-adot-sep-bind.ts` L87), keyed on (gsisId, season,
   kickoffWeek), refusing rather than imputing.
4. Confirmation that NOTHING in the plan puts a MARKET_PROP-layer value within reach of
   α (the q-contamination walk covers only the static registry — recon risk #2 — so the
   plan must also name the grep/CI belt for ad-hoc call sites it proposes).

**Doc structure (fixed headings):** `## Merged shapes`, `## Chosen path`,
`## Registry entries`, `## knownAtWeek rule`, `## Follow-up cards`,
`## q-contamination belt`.

**Discipline:** research only; the doc itself is CROWN — never leaves paid endpoints.

**Verify:**
```
bash -c 'grep -q "knownAtWeek" packages/prediction-engine/src/edge-lab/covariate-bus.ts && test -f packages/prediction-engine/src/edge-lab/est-routes-tprr.ts || { echo BLOCKED; exit 1; }; f=docs/data/_gen/share-core-bus-plan.md; for h in "## Merged shapes" "## Chosen path" "## Registry entries" "## knownAtWeek rule" "## Follow-up cards" "## q-contamination belt"; do grep -qF "$h" "$f" || { echo "MISSING: $h"; exit 1; }; done; echo PASS'
```

**Idempotent:** regenerate from merged main at any time.

**Commit on pass:** `docs(share-core): SC9 bus registration plan for L1 exposure covariates (research)`

**ATTACK LIST (verifier):**
- Every "merged shape" citation re-read against actual main (not the recon, not this
  deck) — line numbers drift; content must match.
- The honesty labels checked against E-C1's wording (proxy, not measured routes).
- The proposed registry entries dry-run against `assertPSideHasNoMarketProp` semantics:
  layer L1, never MARKET_*.
- The follow-up card list checked for one-artifact discipline (any card needing two
  files is split).

---

## SC10 · share-core-shadow — the log-only validation harness CLI

**DATA CLASS: CROWN** (its OUTPUT is calibration results over our fits — crown per
FREE_WINDOW_BLITZ §3b "calibration/CLV results". The code composes crown design. Output
files stay in-repo and must never reach apps/web public surfaces, artifacts, or any free
endpoint.)

**Artifact:** `scripts/edge-lab/share-core-shadow.ts` (CLI; no package.json edit — run
via `npx tsx`; an npm alias is a follow-up decision, Open Question 7). Test:
`packages/prediction-engine/src/edge-lab/share-core/__tests__/shadow-selftest.test.ts`
exercising the CLI's exported pure functions (the CLI must export its core loop for
testing, like other `scripts/edge-lab/` CLIs are structured).

**Depends:** SC1 (source map), SC2, SC3, SC4, SC5, SC6, SC7, SC8.
**PRECONDITIONS (mechanical, all three):**
`kernel/slots/dirichlet-multinomial.ts` (K11 — joint draws),
`kernel/slots/crps.ts` (K1), `kernel/slots/pit.ts` (K2) all present. BLOCKED otherwise.

**Spec.** Shadow mode as the deck doctrine demands: the share core runs NEXT TO the
incumbent per-player NB models, log-only, compared under the walk-forward machinery.
No props module is edited; the k-loop swap is composed externally.

Pipeline (import style follows `scripts/edge-lab/props-hb-validation.ts` L65-72 —
relative deep imports, `fetchNflverse` from
`../../packages/data-ingestion/src/nflverse-source.js`, `NODE_OPTIONS=--use-system-ca`
for live fetch):

1. **Load** `player_stats_week` + `snap_counts` per the SC1 source map (seasons
   2022–2024; the field/join rules come from that doc, not re-derived). Map to
   `UsageGameRow[]`. Any SC1-documented join failure ⇒ refusal logged, row dropped
   with reason (fail-closed; refusal counts reported).
2. **Build** the share matrix (SC2 `buildShareMatrix`). Rows are TimedRow-compliant.
3. **Folds:** `walkForwardSplits` (`walk-forward.ts` L80) over the ShareMatrixRows —
   expanding window, purge, embargo. INNER FOLDS ONLY; the CLI must not contain the
   string `openHoldout` (the guardrail scan `scripts/guardrails/sealed-holdout-open-scan.mjs`
   enforces this repo-wide; do not test its patience).
4. **Per fold, per team:** SC3 masked fit on train rows only; SC4 trials fit on train
   rows only; SC6 projection with `field: "snap_pooled"` computed from train-window
   snaps (est_route upgrade is post-#556 — Open Question 3); SC7 not exercised in v0
   (no decision-time inactive feed — Open Question 4); SC5 marginal per player.
5. **Shadow vs incumbent, per eval row, per player, at lines k+0.5 for k in 0..6:**
   - Shadow receptions-volume path: `P(T > line)` from the SC5 TARGET marginal, and the
     full receptions prop by composing the marginal with the existing SKILL layer — the
     Beta-Binomial catch mix that `probOverReceptions` applies per T=k
     (props-hb-catch.ts L160-179), reusing its exported given-k pieces, never
     reimplementing the catch model.
   - Shadow carries path: SC5 CARRY marginal vs `probOverRushAttempts`
     (props-hb-rush-attempts.ts L90) fitted on the same train window.
   - Incumbent: the existing per-player NB constructions
     (`scoreReceptionsOver`'s targetPost path, props-hb-catch.ts L187-204;
     `posteriorRushAttempts`, props-hb-rush-attempts.ts L76) on identical train data.
6. **Referee metrics per fold and pooled, per family (targets, carries):** Brier +
   log-loss on over/under outcomes; **CRPS** via K1 `crpsDiscrete` on the count
   marginals vs realized counts; **PIT** via K2 (randomized PIT, seeded `makeRng`) with
   histogram + chi-square p. Hit rate reported, never decisive (§6).
7. **Teammate coherence log (the structural claim):** per eval team-week, 2000 joint
   draws via K11 `sampleDirichletMultinomial` (+ trials draw) — report empirical
   teammate count correlations next to SC8's analytic `corrConditional`/
   `corrUnconditional`, and the incumbent's implied correlation (0 by construction).
   This is the evidence row masterplan L465 demands exist before any merge into live.
8. **Output:** JSONL rows + a summary MD to `reports/edge-lab/share-core-shadow/`
   (create dir). Every record: `priced: false`, `model: "share-core-shadow"`,
   `mode: "log_only"`, provenance stamped via `stampProvenance`
   (`packages/prediction-engine/src/edge-lab/provenance.js`, as props-hb-validation
   does), CC-BY attribution string included. NO qClose/CLV columns — there is no
   prop-line archive yet (recon gap; the economic referee waits for it — state this in
   the summary header, mirroring props-hb-validation's honesty block).
9. **`--selftest` mode (the deterministic gate):** no network. Generate synthetic data
   with `makeRng(7)`: (a) null world — players truly independent NB ⇒ assert shadow does
   NOT beat incumbent Brier by more than noise (no fabricated coherence win); (b) DM
   world — counts drawn from known shares via K11's sampler ⇒ assert shadow beats
   incumbent CRPS AND empirical teammate corr < 0 matches SC8 within 0.05. Print PASS
   and exit 0 only if all assertions hold.

Log-only discipline: the CLI imports NOTHING from `src/scoring.ts`, writes NO database
rows, touches NO live pick path. It reads public CC-BY data and writes report files.

**Discipline:** priced:false on every record; fail-closed on missing data (refusal
counts in the report, never imputation); nothing enters live p without §6 — this harness
IS the §6 evidence generator, not a promotion mechanism; no MODEL_VERSION; forbidden
zones per common contract (plus: no scoring.ts import, no DB, no event-odds-ingest).

**Verify:**
```
test -f packages/prediction-engine/src/edge-lab/kernel/slots/dirichlet-multinomial.ts && test -f packages/prediction-engine/src/edge-lab/kernel/slots/crps.ts && test -f packages/prediction-engine/src/edge-lab/kernel/slots/pit.ts && npx tsx scripts/edge-lab/share-core-shadow.ts --selftest && cd packages/prediction-engine && npx vitest run src/edge-lab/share-core/__tests__/shadow-selftest.test.ts && npx tsc --noEmit && ! grep -n "openHoldout" scripts/edge-lab/share-core-shadow.ts && ! grep -n "scoring" scripts/edge-lab/share-core-shadow.ts
```

**Idempotent:** re-running overwrites the report dir deterministically under `--selftest`;
live runs are timestamped subdirs; a dead session loses nothing but an unfinished report.

**Commit on pass:** `feat(edge-lab): SC10 share-core shadow harness (log-only, walk-forward, CRPS/PIT, teammate coherence)`

**ATTACK LIST (verifier):**
- Leak hunt: pick one fold; confirm by direct inspection of the exported fold objects
  that every train row's `eventEndAt` < every eval row's `decisionAt` minus embargo, and
  that SC3/SC4/SC6 fits for that fold consumed train rows only (instrument the exported
  core loop; do not trust log lines).
- Selftest null-world attack: re-run (a) with 5 different seeds — shadow must not
  "win" the null world on any of them beyond the stated noise band.
- Incumbent parity: for a single player-week, hand-wire `scoreReceptionsOver` /
  `posteriorRushAttempts` on the same train slice and confirm the harness's incumbent
  numbers match — the comparison is worthless if the baseline is mis-fit.
- Randomized-PIT honesty: verify K2 is called with a seeded rng and that the
  non-randomized variant would fail uniformity on the same data (K2's own attack,
  re-run here on real marginals).
- Coherence row: delete the teammate-correlation section from a report and confirm the
  selftest FAILS — the L465 evidence must be load-bearing, not decorative.
- Output hygiene: grep the report files for any market/odds/qClose field (must be
  absent) and for `priced":false` on every JSONL row; confirm nothing under `apps/web/`
  changed (`git status`).
- CROWN handling: confirm the report dir is not referenced by any `apps/web` public
  route or artifact publisher (grep `reports/edge-lab/share-core-shadow` repo-wide —
  only the CLI and docs may name it).

---

## Open questions (tracked; none blocks the cards above except as stated)

1. **Parlay MRI consumer seam** — the recon does not locate the Parlay MRI module; SC8
   produces the correlation surface but the consumer wiring card needs its own recon.
2. **snap_counts ID system** — PFR-keyed vs gsis; SC1 resolves coverage and the refusal
   rule via `docs/ops/NFLVERSE_GSIS_CROSSWALK.md`.
3. **L1 covariate bus-ification** — path (a)/(b)/(c) for est_route_share awaits merged
   #555+#556 shapes (SC9); until then SC6/SC10 take caller-supplied exposure shares.
4. **Decision-time inactive feed** — no as-of injury/inactive source in the recon; SC7
   ships the mechanism, SC10 v0 cannot exercise it on real slates; healthy-scratch vs
   injury-out is indistinguishable from snaps alone.
5. **Script core (§3.1)** — SC4 is an exchangeable stand-in; when the script core lands
   (spread/total as script covariates, §6-gated), SC4 retires and SC5/SC8/SC10 take the
   real trials distribution through the same `TeamTrialsDist` interface.
6. **No prop-line close archive** — `EvalRow.qClose` has no props feed, so the §6
   economic referee (CLV vs close) cannot run; SC10 reports the statistical referee only
   and says so in its output header.
7. **Barrel + npm alias** — share-core exports into `packages/prediction-engine/src/index.ts`
   and an `edge:share-shadow` npm script are deferred until the three open PRs
   (#555/#556/#557) clear the barrel merge churn.
8. **Kernel branch merge** — this deck assumes the Wave-K contract files
   (`kernel/contract.ts`/`numeric.ts`/`conformance.ts`, on `claude/grok-stats-analysis-i8muyp`,
   PR #554) and the K1/K2/K11 slots reach main before SC3/SC10 run their preconditions
   on main; on the branch itself the preconditions already check mechanically.
