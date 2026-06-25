# Decision-State Grammar, Evidence Contract & Supply Graph

**One grammar (canonical):** `packages/decision-field-runtime/src/decision-state.ts` — `DecisionState` +
`ALL_DECISION_STATES`. There is no second taxonomy.
**Evidence contract:** `packages/decision-field-runtime/src/decision-state-stat-contract.ts` —
`STAT_CONTRACTS` (per state, `requiredGroups` with `anyOf` + `capIfMissing`).
**Supply graph:** `packages/nfl-stat-universe/src/decision-state-matrix.ts` — `FACT_SUPPLY_GRAPH` +
`DECISION_STATE_ACQUISITION`.
**Tests:** `packages/nfl-stat-universe/src/__tests__/decision-state-matrix.test.ts`.

## Three layers, one source of truth

1. **Grammar** — the canonical `DecisionState` union (the single enumerable witness `ALL_DECISION_STATES`).
   Every layer consumes this and nothing else; a compile-time guard proves the union and the array agree.
2. **Evidence contract** (`STAT_CONTRACTS`) — for each state, which fact *groups* are required. A group is
   satisfied if **any** of its facts is creditable (`anyOf`); an unsatisfied group caps the card at
   `capIfMissing`. This is what the runtime enforces.
3. **Supply graph** (`FACT_SUPPLY_GRAPH`) — for each fact, the real ways to obtain it. The acquisition
   view (`DECISION_STATE_ACQUISITION`) asks the supply graph whether each *canonical* required fact is
   actually available. It does **not** redefine required facts — it reads them from `STAT_CONTRACTS`.

## The canonical states

`ACTIONABLE`, `ROLE_UP_FANTASY_LATE`, `GOOD_IDEA_BAD_PRICE`, `PUBLIC_OVERREACTION`,
`ROLE_MASS_MISALLOCATED`, `DATA_CONFLICT`, `NEEDS_CONFIRMATION`, `TOO_LATE`, `PASS`, `TRAP`, `WATCHLIST`,
`NEEDS_LIVE_DATA`, `DFS_SALARY_LAG`, `OWNERSHIP_OVERREACTION`.

Deliberate set decisions: `NEEDS_CONFIRMATION` and `PASS` are **kept**. The two genuinely DFS-specific
states (`DFS_SALARY_LAG`, `OWNERSHIP_OVERREACTION`) were **added** to the canonical union (with real
`STAT_CONTRACTS`). A prior prototype's `INJURY_SOURCE_CONFLICT` folds into `DATA_CONFLICT` and a
prop/market lag folds into `GOOD_IDEA_BAD_PRICE` / `TOO_LATE` — they are not separate states.

## FactSupplyPath — capability per fact, per endpoint

Each entry in `FACT_SUPPLY_GRAPH` is one verified way to get one fact:

| Field | Meaning |
|---|---|
| `factType` / `sourceId` / `endpointId` | the fact and the specific endpoint that supplies it |
| `mode` | `DIRECT` (the source ships it) or `DERIVED` (we compute it — `derivation` says how) |
| `activation` | `CATALOGUED → ADAPTER_BUILT → INGESTING_SHADOW → VALIDATED → LIVE`. **CATALOGUED ≠ LIVE.** |
| `cadence` / `historyDepth` / `latencyClass` | how often, how far back, how fresh |
| `legalStatus` / `contractStatus` | rights lane + whether we've actually acquired it (`NOT_ACQUIRED` ≠ available) |
| `derivation` / `evidenceRef` | the formula (if derived) and the proof the endpoint/derivation is real |

**A provider's marketing never unlocks a fact** — only a verified endpoint or a tested derivation does.

## Honesty invariants (enforced by tests)

- **Nothing is LIVE.** Every path is `CATALOGUED`; no state is `liveReady`. The pipeline isn't wired —
  the graph says so plainly rather than implying live coverage.
- **`route_rate` is not falsely available.** Base nflverse ships snaps/targets, **not** route rate. The
  only path is `DERIVED`, `NOT_ACQUIRED`, with the derivation unbuilt and the participation source
  share-alike-licensed and excluded from ingestion.
- **`betting_splits` has no supplier.** The Odds API catalog documents no public-splits endpoint, so no
  source unlocks it (the old, false `the_odds_api → betting_splits` mapping is removed).
- **Weekly ≠ real-time.** `injury_report` is a weekly practice report; `inactive_status` from the weekly
  roster file is **not** a ~90-minutes-to-kickoff real-time inactive feed.
- **DFS pricing is paid + unacquired.** `dfs_salary` is supplied only by licensed feeds (FantasyData /
  SportsDataIO), all `PAID_REQUIRED` and `NOT_ACQUIRED`.
- **Forbidden sources supply nothing** — `DO_NOT_USE` / `RIGHTS_REVIEW` sources never appear in the graph.

## How to extend

- **Add a decision state:** add it to `DecisionState` *and* `ALL_DECISION_STATES` (the compile guard
  forces both), add a `STAT_CONTRACTS` entry, and `routeFor` + the public `STATE_VIEW` mapping. The
  acquisition view and exhaustiveness tests update automatically.
- **Claim a fact is available:** add a `FactSupplyPath` with a real `endpointId` and `evidenceRef`. To
  call it usable in production, raise `activation` toward `LIVE` *as the adapter is actually built and
  validated* — not before.
