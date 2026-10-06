# Public/Private Surface Doctrine (2026-09-28 — Garrett, HARD)

Standing rule. Not a suggestion. This extends the NGS internal-only doctrine to **all** proprietary GSE data and metrics.

## The rule in three lines

1. The public website shows ONLY **projections** and **rankings** (and published picks with their outcomes).
2. The **underlying data, metrics, signals, and methodology** behind them stay 100% internal — never on a public page, never in a public API response, never in public docs, copy, or agent-readable surfaces.
3. A lot of GSE's data and metrics are currently customer-facing. That gets pulled behind the fence. **Keep** list is projections, rankings, pick records/proof. Everything else on the public side is inventory for the fence work.

## What may appear publicly

- Player/team projections (numbers only, no decomposition).
- Rankings — rest-of-season, week-by-week, positional (the rankings program scope).
- Published picks and their outcomes; proof/ledger of the record.
- Honest risk disclosures required by compliance surfaces.

## What stays internal (the keep-out list)

- Raw data rows and data feeds (player-week rows, tracking rows, usage pulses, salary boards beyond gated tiers).
- Metric values and metric names beyond what a projection implies (EPA, QBR, WOPR, target share, separation — none of it).
- Signal values and signal identifiers (the signal ledger, weak-signal registry, calibration internals).
- Methodology: frameworks, factor lists, weights, aggregation formulas, model internals, source registries, "how we read the numbers" write-ups.
- Data sources: which sources are used *and* which were refused (that is competitive intel).

## The fence pattern (existing evidence, not a prescription)

The repo already fences internal material in two places:

- `apps/web/lib/fences/no-raw-ngs-fence.ts` — a `FencePlugin` (`block`/`pass`) matching restricted patterns in text, payload, and metadata. The NGS internal-only doctrine's CI fence extends this pattern.
- `scripts/guardrails/trust-gate.mjs`, `scripts/guardrails/model-freeze.mjs`, `scripts/guardrails/draft-only.mjs` — per-slice gates that already block unauthorized state changes in build paths.
- Readiness gates (`getReadinessGates().canExposePerformanceStats`, `PUBLISH_LEDGER`, `canPublishProjections`) — the proof ledger route (`apps/web/app/api/proof/ledger/route.ts`) inherits honesty from `loadLedgerView()` and is 200-only with gated content; that is the template for a gate that cannot leak by construction.

The surface-fence work follows the same evidence: gate the route/page, not the narrative.

## Exposure inventory (2026-09-28, from `origin/main`, code-search verified)

Each item: file path, what it exposes, verdict. Verdicts are findings ("pull behind fence", "review", "keep") — the coding agent reads them as evidence of where the doctrine is currently violated, not as build instructions.

### Pages — pull behind fence

| Path | Exposes | Verdict |
|---|---|---|
| `apps/web/app/methodology/page.tsx` | Full methodology write-up: factor list (market consensus, book depth, line movement, volatility, venue form, rest differential, cross-market agreement, data quality), three-stage stack ("Read the board / Score the math / Gate the slate") | pull behind fence |
| `apps/web/app/intelligence/metrics/page.tsx` | "Glass box on every signal the engine uses" — named metrics with abbreviations and stability labels (anchor/signal/noise) | pull behind fence |
| `apps/web/app/nflverse/page.tsx` | Live player-week rows: opportunities, target share, WOPR, QB-age trends (~26k chars) | pull behind fence |
| `apps/web/app/players/page.tsx` | PlayerLab tables, PlayerLens rail, MetricExplainer, season lines | pull behind fence |
| `apps/web/app/stats/*` (overview, players, teams, compare, status & movement, media, sources, ask) | Full stats surface incl. injury/status movement and source pages | pull behind fence |
| `apps/web/app/parlay-mri/page.tsx` | "Parlay genome": per-leg risk, survivability, expected value, compounded house edge, same-game correlation — rendered interactively | pull behind fence or reduce to outcome-only |
| `apps/web/app/fantasy/dfs/page.tsx` | Salary/teaser rows (top 24 teaser currently) | review — teaser is marketing surface; full board is gated |
| `apps/web/app/trends/page.tsx`, `apps/web/app/edge-index/page.tsx`, `apps/web/app/observatory/page.tsx`, `apps/web/app/academy/*` | Trend/metric/methodology content surfaces | review |

### API routes — pull behind fence

| Path | Exposes | Verdict |
|---|---|---|
| `apps/web/app/api/clv/route.ts` | Public, anonymous CLV JSON (programmatic sibling of `/clv` page) | pull behind fence — CLV is a signal |
| `apps/web/app/api/calibration/route.ts` | Public calibration report JSON | pull behind fence |
| `apps/web/app/api/gse/v1/truth/route.ts` | Real-time truth topology + "law" | pull behind fence — topology is methodology |
| `apps/web/app/api/v1/signals/route.ts` | Signal rows (currently behind B2B API-key gate, scope-tiered) | review — keyed, not anonymous; under the doctrine signals are internal, so this surface either stays keyed-only or closes |
| `apps/web/app/api/nflverse/qbr/route.ts` | QBR data (premium rate-limit gate) | review — gated but exposes a metric family |

### Keep (already compliant)

| Path | Why it stays |
|---|---|
| `apps/web/app/api/projections/route.ts` | Player projections, premium-gated — projections are the allowed surface |
| `apps/web/app/api/dfs/salaries/route.ts` | Salary board gated behind fantasy floor tiers; denial-of-wallet pattern keeps it shut for unentitled callers |
| `apps/web/app/api/proof/ledger/route.ts` | Proof ledger, founder-gated (`PUBLISH_LEDGER`), honesty-gated by construction — published picks and their record are the allowed proof surface |
| `apps/web/app/api/performance/route.ts` | Public performance stats, hard 503 until `canExposePerformanceStats` — gate pattern matches the doctrine |
| `apps/web/app/data/page.tsx` | Source registry page — **review**: the cleared/forbidden source registry is trust-building copy but also competitive intel (reveals which sources were refused). Keep-or-cut is Garrett's call, not the agent's |

### Notes for the record

- `/methodology` currently states "The framework is public; weights, constants, and aggregation formula stay proprietary." Under the doctrine the framework itself goes internal too — the public side keeps *what the projections are*, never *how they are made*.
- nflverse data is openly licensed (CC-BY-4.0 with attribution), so showing it is not a legal exposure the way NGS would be. It is pulled under this doctrine anyway because the website's surface rule is product posture, not just legal posture.
- The `no-raw-ngs-fence` is a text/payload pattern fence, not a route gate. Extending it to cover metric/signal identifiers follows the existing pattern; the route-level gates (`canExposePerformanceStats`, `PUBLISH_LEDGER`) are the structural precedent.
- This inventory is from code search on `origin/main` as of 2026-09-28. Routes behind env gates that are currently *off* (performance stats, ledger) are compliant today; the doctrine binds their future content, not just today's.
