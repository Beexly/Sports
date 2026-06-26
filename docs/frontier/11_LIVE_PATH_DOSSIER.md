# 11 · Live-Path Dossier — designed, NOT activated

PROJECT PARALLAX · Pass 9. The real-data path, specified to one click of owner readiness — and
deliberately left inert. **Nothing here is turned on.** No key is read, no feed is bought, no gate is
flipped, no projection is published. The fixture instrument cannot become live without the owner
crossing every line below.

---

## The activation ladder (per-fact, reusing `FactSupplyPath`)

The slice's two facts move through the existing activation lifecycle (`nfl-stat-universe`):
`DISCOVERED → DOCUMENTED → LICENSE_REVIEW → CONTRACTED → ADAPTER_BUILT → FIXTURE_VERIFIED →
INGESTING_SHADOW → VALIDATED → LIVE`. Today **all are CATALOGUED / FIXTURE_VERIFIED; none is LIVE.**

| Fact (slice) | Provider · endpoint | Direct/derived | Legal | Cadence | Latency | Adapter | Status today | Unlocks |
|---|---|---|---|---|---|---|---|---|
| WR1 designation / inactive | team injury report · NFL feed; nflverse mirror | direct | OPEN (facts) | weekly + gameday | minutes | exists (ingestion) | FIXTURE_VERIFIED | the fork's validity gate |
| WR2 route/target share | nflverse `play_by_play` | derived | CC-BY-4.0 (attribution) | weekly post-game | hours | exists | FIXTURE_VERIFIED | redistribution priors |
| WR2 prop line (BOOK observer) | The Odds API · player props | direct | LICENSED (metered) | sub-hourly | seconds | `OddsApiClient` | CATALOGUED | the BOOK frame |
| ADP / roster% (CROWD observer) | ranking feeds | direct | varies | daily | minutes | partial | CATALOGUED | the CROWD frame |
| projection (FANTASY observer) | vendor projection | direct | LICENSED | daily | minutes | none | CATALOGUED | the FANTASY frame |

## What activation would cost / require (estimates, not commitments)

- **Providers to contract:** The Odds API (props — already the one priced feed), one projection vendor,
  one ranking feed. nflverse + injury facts are open/attribution.
- **Credits:** the player-prop pull dominates the metered cost; bounded by the existing
  `x-requests-remaining` cost-governor (freeze-and-serve-snapshot at low quota). Order-of-magnitude:
  within the existing data budget for one sport, one slate.
- **Snapshot cadence + storage:** point-in-time capture per fact via the existing `SourceSnapshot`
  hash-chain (stores hashes, not payloads) → the corpus the counterfactual residual memory needs. R2
  Parquet for the lake; Neon for serving subsets only.
- **Entity mapping:** player/team/game IDs through the existing normalizer.
- **Source-race capture:** the existing source-race records first-seen ordering — exactly the
  point-in-time substrate PARALLAX's light cone requires; persist `observedAt` per fact.
- **Legal / contract status:** props LICENSED; projection/ranking LICENSE_REVIEW; nflverse attribution.
- **Owner approvals required (each a separate, explicit act):** contract each paid feed · arm
  `sourceReality = LIVE_REAL` for a fact (only after VALIDATED) · flip `priced=true` (≥100 settled +
  ECE) · `canPublishProjections` (backtest beats naive — it does NOT today) · `PERFORMANCE_STATS_ENABLED`
  (PROVEN rung).

## Facts / decision-states unlocked vs still blocked

- **Unlocked at LIVE (per fact):** the fork runs on real availability + real shares; the arena shows the
  real BOOK/FANTASY/CROWD frames; the meet's SOURCE_REALITY layer lifts FIXTURE→LIVE, so the ceiling can
  exceed INFO_ONLY **iff every other layer also permits** (rights, temporal, evidence, model, entitlement,
  owner).
- **Still blocked regardless of data:** any PUBLIC_ACTION expression while the **model-maturity** layer
  is below PUBLIC_ALLOWED (0 settled, gate HELD) or the **owner-action** layer is HELD. Live data alone
  buys WATCH/PERSONALIZED at most — never public action — by the meet (proven, `authority-vector.test`).

## Pass 9 — the Galileo planning CLI, operationally truthful (status)

The audit (`00`, item 6) verified the Galileo CLI is **already** operationally real: the selected
portfolio controls candidate source-ids, unlocked fact classes, catalogued decision states, and the
budget tier; it checks key **presence** without reading values; it refuses LIVE; output is PLAN-only /
$0. Remaining hardening for full Pass-9 truthfulness (proposed, owner-gated, not done here): emit
machine-readable JSON + deterministic exit codes for CI consumption, and assert (test) that LIVE without
owner approval throws. These are additive and reversible; flagged for a follow-up checkpoint.

## The one structural guarantee

There is **no code path** by which the fixture instrument emits a public action. Activation is not a
toggle in this work — it is the owner walking the per-fact lifecycle to VALIDATED, arming
`sourceReality`, and then still being bounded by the model-maturity and owner-action layers of the meet.
The dossier exists so that walk is one informed decision per line, never an accident.
