# Research ↔ Canonical Reconciliation — 2026-06-08

Reconciles the R&D packet (produced in `C:\Users\Garrett\Sports` @ `safety/sports-wip-2026-06-04`, docs-only, 158 files / 120 build cards) against the **canonical** product branch (`C:\Users\Garrett\Sports-canonical-2026-06-03` @ `claude/edge-map-rebuild-2026-06-04`).

The full research tree was ported here **losslessly** (`docs/research/`). Nothing was dropped — the strategy docs (source inventory, signal taxonomy, world state machine, risk register, analog signals, FREE/PRO/ELITE split, Do-Not-Touch rules) are knowledge assets independent of the build queue.

## The headline: the two branches diverged

The packet's "current data state" (`gse-current-data-state.md`) describes a repo where **"The Odds API is the only live provider; no coded adapters for injuries, weather, depth charts, NGS, officials, participation."** That is **stale relative to canonical.** The research branch predates the nflverse + odds work that already shipped on `edge-map-rebuild`:

| Domain | Research's view | Canonical reality (verified) |
|---|---|---|
| Odds providers | The Odds API only | **Multi-provider + failover + Kalshi CLV** — `kalshi-client.ts`, `odds-api-client.ts`, `odds-failover.ts`; env: `THE_ODDS_API_KEY` + `ODDS_API_IO_KEY` + `API_SPORTS_KEY` + Kalshi |
| nflverse adapters | "none coded" | **16 loaders** (`lib/nflverse/*`) + ~21 derived engines (`lib/intelligence/*`): injuries, snaps, NGS, depth charts, pressure-coverage, schedule/weather/roof/surface, combine, play-design, scoring-zone, … |
| Ingestion gate | proposed (BUILD-001) | **`assertIngestible()`** already gates every loader |
| Provenance | proposed (BUILD-004) | `prediction-engine/provenance.ts` + `sourceUrl`/`generatedAt` on every loader output |
| FREE/PRO/ELITE | proposed split | **shipped** — `lib/access.ts` + Phase 6 gating |
| Backtest/calibration | proposed (BUILD-007) | `predictiveness.ts` multi-year backtest + `clv-calibration.ts` |

**Implication:** a large fraction of the 120 cards is already built on our branch. Executing the queue blind would duplicate (the packet's own risk #3, "duplicate truth domains").

## Deduped P0 (foundation) — substantive deltas, not binary

| Card | Canonical status | The real net-new delta |
|---|---|---|
| 001 license registry + allow/deny gate | **PARTIAL** — `catalog.ts`/`providers.ts` + `assertIngestible()` gate exist | A unified **license-metadata registry** (per-source terms/quota/risk) feeding the gate + the founder view (010). The 42-source inventory CSV is the seed. |
| 002 entity graph (teams/players/coaches/venues/seasons) | **NET-NEW** | Real gap — canonical does ad-hoc `player_id`/name joins; no canonical graph. Foundational; unblocks 013, venue/weather. |
| 003 provider adapter + contract tests | **PARTIAL** — `providers.ts`/`projections.ts`/`odds-failover.ts` | Formalized **mocked licensed-feed contract tests**. |
| 004 provenance ledger | **PARTIAL** — provenance.ts + per-output fields | A unified, queryable **ledger** across stat→feature→output. |
| 005 historical warehouse | **NET-NEW (mostly)** | Canonical fetches nflverse live per request; no persisted, replayable warehouse. Real gap for backtests. |
| 006 feature store (versioned defs) | **NET-NEW** | Real gap. |
| 007 eval harness + leakage checks | **PARTIAL** — predictiveness backtest | A **general** harness + explicit leakage controls. |
| 008 stadium map (roof/turf/altitude/coords) | **PARTIAL** — schedule-context roof/surface + NWS | **Altitude + coordinates + a canonical stadium registry** (feeds 043-045). |
| 009 injury normalization + confidence ladder | **PARTIAL** — injury-report.ts + availability.ts | The **confidence ladder** + normalization schema. |
| 010 founder source-risk dashboard | **NET-NEW** | Real gap — `/cockpit/sources` is a stub. Founder-only, **no external approval**, directly renders the ported registry + risk register. |

## Recommended build order (net-new, no external approval, no grade/MODEL_VERSION change)

1. **010 founder source-risk dashboard** — founder-only, zero approval, fills the `/cockpit/sources` stub, renders the 42-source inventory + risk register we just ported. Immediate ops value.
2. **002 entity graph** — foundational; unblocks entity-resolution QA + venue/weather joins.
3. **008 + 043/044/045 stadium registry + wind/travel/altitude** — builds on NWS already present; matches the accuracy-audit's weather/stadium gaps.
4. **006 feature store** / **005 warehouse** — heavier infra; enable reproducible backtests.
5. **024 referee tendency**, **the 20 video-game analog signals** — differentiation, public-data only, no Madden.

## Approval-gated — DO NOT auto-build (per packet's "What Needs Human Approval" + Do-Not-Touch rules)

- All `market` cards (031-040, legal_risk **High**) — provider contracts, compliance copy, no-wager jurisdiction gates.
- `news_reporting` publisher feeds; `social/video` attention (Reddit/YouTube) — API terms + quota + privacy.
- Licensed providers (SportsDataIO/Sportradar/API-Sports paid tiers), public launch, migrations.
- Most `nfl_core` model cards (016-030) **touch scoring/MODEL_VERSION → founder-gated** (the packet's own rule: "Do not bump MODEL_VERSION to consume unlicensed/shadow stats"). Build as **shadow/illustrative** only until founder sign-off.

## Verification correction (checked against canonical code, not the packet's claims)

The packet **systematically understates canonical** — verify every "net-new" against code before building:

- **010 founder source-risk dashboard — ALREADY EXISTS.** The packet calls `/cockpit/sources` a stub; in canonical it is a built founder dashboard (`DATA_SOURCE_STACK` + live evidence + provider statuses + status/freshness/cost + R/A/G tones). Do **not** rebuild. Possible delta only: a legal-risk-tier / next-action overlay (the packet's BUILD-118 "source war room").
- **002 entity graph — genuinely net-new** (only `operator-registry.ts`, unrelated).
- **005 historical warehouse — genuinely net-new** (loaders fetch live; no persistence).
- **006 feature store — genuinely net-new.**
- **008 stadium registry — partial** (weather/environment exist; lat-long + altitude registry net-new).

**Revised first build: BUILD-002 entity graph** — highest value because it also hardens the join fragility the NFL-accuracy audit patched ad-hoc (M1 team-column drift, M7 relocation aliases, GSIS↔PFR id namespaces). One canonical team/player/venue/season graph replaces the scattered `normTeam` maps in `graded-pool.ts` + `matchup.ts`.

## Quality assets to mine into canonical (independent of the queue)
- `gse-free-source-inventory.csv` — 42 risk-tiered sources; **superset** of `catalog.ts` (officials, draft picks, CFBD, Wikidata venue graph, GDELT, attention layers, cross-sport analog). Fold the net-new lanes into the catalog as `status: mapped, approval-gated`.
- `gse-source-risk-register.md`, `nfl-world-state-machine.md`, `gse-nfl-signal-taxonomy.md`, `gse-video-game-analog-builds.jsonl` (78 analog signals) — design inputs for the net-new builds.
- The **Do-Not-Touch Expansion Rules** (gse-current-data-state §19) match our integrity guardrails verbatim — adopt as canon.
