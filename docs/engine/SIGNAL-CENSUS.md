# Signal census — disposition every family

Started 2026-10-23 on `hermes/ship-night-findings`. Every row here is grounded in a
file:line that was opened, not in a commit title. Three dispositions only:

- **REACHES THE DECISION** — output changes the side, line, or no-bet.
- **REACHES ONLY THE TRAIL** — output is published as reasoning, does not move the play.
- **DISPOSITIONED** — with the exact reason (dead, blocked, or not built).

The 49-row audit described by the founder (20 NOT BUILT / 12 BUILT-DISCONNECTED /
17 BUILT-DRIFTED / 0 WIRED-VERIFIED) is **not in this tree** — no file in the repo
contains its rows, and `.worktrees/calib-boundary` has only the doctrine prose.
Rows below are therefore re-derived from code. Where the founder's list names a
family, that row is first.

## L0 / L1 producers (added since the census opened)

- `L0 USAGE` — `engine/usage-factors.ts` (2,296 bytes) on the remote. Emits who got
  the ball, in what situation, with prior/recent share, source and freshness. **Zero
  call sites in `scoring.ts`** → DISCONNECTED, not built.
- `L1 HEALTH` — `engine/availability-factors.ts` (2,659 bytes) on the remote. Emits
  named outages. Same: zero call sites → DISCONNECTED.
- **NOW WIRED TO THE TRAIL (2026-10-23).** `OddsInput.coachTrail` carries the
  packet; `coachTrailFactors` is called at all three scoring sites and the note is
  prefixed to the reasoning, ahead of every market clause. Proof quote, BAL/CIN
  week 7 fixture:
  `"J.Chase (WR1, Cincinnati Bengals) downtick in targets, weeks 1-3 v 4-5:
  24.50 → 15.50 (Δ-0.09). Source: nflverse pbp receiver_player_name, fetched
  ... Zay Flowers (WR, Baltimore Ravens) is Out — Ankle. Source: ESPN summary injuries"`
- **NOT YET THE DECISION.** Under mutation (Questionable → Out → plus the Chase
  downtick) the trail changes and confidence stays 50 / edge 67. The composite
  does not read `factors[]`, so trail weight is cosmetic until it does. That is
  the next row, not a claim to be quietly rounded up.

## Verified disconnected — the five named families

### 1. Sovereign signal plane — DISPOSITIONED: no bridge exists

- Computed: `intelligence/matchups/matchup_engine.py:311` (`_sovereign_signal_plane`),
  consumed there at `:439`, emitted at `:460` as `sovereign_signals`.
- No TypeScript consumer: `grep -rn sovereign packages/prediction-engine/src apps/web/lib`
  returns nothing outside Python.
- Disposition: the plane is real and reaches nothing. Needs an explicit bridge
  (Python emits JSON → a typed ingestion module → the reasoning input). Until then
  it is neither decision nor trail.

### 2. Trench continuity — DISPOSITIONED: weighted at zero by construction

- `packages/prediction-engine/src/reasoning/corpus-evaluator.ts:975` and `:1002`
  set `trench_bipartite_matching: 0` in both weight maps.
- Disposition: the evaluator names the domain, assigns zero, and the zero is never
  revisited. Either it earns weight or it is removed from the claim list.

### 3. Situational / mind lane — DISPOSITIONED: stored, never read

- `situationalReading` appears in the picks payload (11 rows in production at
  measure time) and in **zero** TypeScript files: `grep -rn situationalReading
  apps/web/lib packages/prediction-engine/src` returns nothing.
- Disposition: the lane writes to the record and nothing downstream reads the
  record. Same class as #1 — storage is not wiring.

### 4. Web intelligence layer — DISPOSITIONED: runs after the pick and averages leans

- Founder-reported; not yet code-verified this session (confirm the call site
  before acting). The layer executes in the web app after `scoreGame` has already produced the
  pick, and its output is an average of observation leans rather than an input.
- Disposition: order-of-operations violation. Averaging leans after the fact cannot
  select a side, so the market keeps selecting it.

### 5. Conviction registry rows — DISPOSITIONED: declared NOT LIVE

- Scheme-matchup, narrative-incentive and beat-report are declared NOT LIVE in the
  conviction registry. A NOT LIVE row cannot reach anything by definition.
- Disposition: each needs either a live signal or removal from the claim set.

## The market-factors problem (why the trail is not yet the product)

`engine/factor-narrative.ts` (committed, 13 tests, unwired) narrates the `factors[]`
array. That array is dominantly market: `Bookmaker Consensus` (3,488 rows),
`Pricing Edge` (3,479), `Market Coverage` (3,479) — against nine `Shadow …`
families at **average weight 0.0** reading literally nothing:

> "tracked in shadow mode only; no licensed context provider is configured"

3,477 occurrences each. So wiring the narrator alone would publish an argument
made of the market — the exact failure the work exists to kill. The narrator is
the right MECHANISM (weighted reasons + a collapsed "watching" clause for shadow
families) and the wrong SOURCE OF TRUTH.

## Order of work

1. Availability and venue have free registered sources already (`nflverse injuries`,
   `nws-weather`). Wire those two to the trail first so the shadow set starts
   emptying, then to the decision.
2. Bridge the sovereign plane (#1) and the situational lane (#3) — both are
   storage-only today.
3. Price check last: demote `process-sport.ts → scoring.ts` to PLAY / ALT /
   PASS-on-price over plays the reasoning already chose.
4. Only then re-point the narrator at reasoning factors rather than market ones.

## Open gaps (named, not zeroed)

- The 49-row audit is missing from the tree; re-derivation is in progress.
- Provider interface for shadow families: no typed contract exists yet, so "wire a
  provider" has nothing to plug into. That contract is step 0 for families 1–2.
