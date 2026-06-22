# Galaxy Sports Edge — Claude Code Handoff

**Branch**: `claude/laughing-wozniak-gyryjx`
**Date**: 2026-06-22
**Status**: All tests passing · Build clean · 23 commits ahead of main

---

## 1. Project Context

Galaxy Sports Edge (GSE) is a production-grade sports picks platform. The architecture:

- **Next.js 14 App Router** + TypeScript strict mode
- **PostgreSQL + Prisma** (schema in `packages/db/prisma/schema.prisma`)
- **NextAuth v5**, Stripe subscriptions, BullMQ/Redis background jobs
- **The Odds API** as primary sports data source
- **Claude API** for content generation only (never source of truth for picks)
- Tests: **Vitest** — run `npx vitest run` from repo root
- Build: `npm run build` from repo root

**Non-negotiables** (enforced by tests):
1. No fake data — all picks from real API data
2. All cockpit pages must be in the sidebar nav (`cockpit-nav-coverage.test.ts` catches orphans)
3. TypeScript strict mode — no `any`, no unchecked indexing
4. Scraping must pass through `checkClearance()` before any extraction job

---

## 2. What Was Built This Sprint

### A. DFS Optimizer (Phases 1–10) — Full Stack

A complete Daily Fantasy Sports optimizer shipped across 10 phases:

**Schema** (`packages/db/prisma/schema.prisma`):
- 23 new Prisma models, 8 enums: `DfsSlate`, `DfsPlayer`, `DfsLineup`, `DfsOptimizerRun`, `DfsNarrativeSignal`, `DfsLinupPlayer`, etc.

**Types** (`packages/types/src/dfs.ts`):
- 297 lines of shared TypeScript types for DFS (enums, interfaces)

**Core libraries** (`apps/web/lib/dfs/`):
| File | What it does |
|---|---|
| `optimizer/solver.ts` | Full lineup optimizer — CASH/GPP/CONTRARIAN/LEVERAGE modes, salary cap, stack rules, exposure control, 150-lineup generation |
| `optimizer/rules.ts` | Constraint rules engine (QB-DST, stack enforcement, exposure caps) |
| `parsers/dk-csv.ts` | DraftKings slate CSV parser |
| `parsers/projection-csv.ts` | Projection upload CSV parser |
| `parsers/ownership-csv.ts` | Ownership CSV parser |
| `narrative/signals.ts` | Narrative signal classifier (weather, injury, usage, game-script) |
| `portfolio/analytics.ts` | Portfolio analytics engine (exposure, chalk, duplication risk, Jaccard) |
| `thesis/lineup-thesis.ts` | Per-lineup thesis generator |
| `simulation/engine.ts` | Monte Carlo simulation engine |
| `late-swap/engine.ts` | Late-swap constraint engine |
| `calibration/autopsy.ts` | Post-slate autopsy and calibration |
| `service.ts` | DFS service layer (orchestrates all of the above) |
| `salaries.ts` | Salary normalization utilities |

**API routes** (`apps/web/app/api/dfs/`):
| Route | Purpose |
|---|---|
| `POST /api/dfs/slates` | Create slate |
| `POST /api/dfs/slates/import-dk-csv` | Import DK CSV |
| `POST /api/dfs/projections/upload` | Upload projections |
| `GET /api/dfs/projections/template` | Download template |
| `POST /api/dfs/ownership/upload` | Upload ownership |
| `GET /api/dfs/ownership/template` | Download template |
| `POST /api/dfs/optimize` | Run optimizer (returns lineups) |
| `GET /api/dfs/optimizer-runs/[id]` | Get run result |
| `POST /api/dfs/signals` | Classify narrative signals |
| `GET /api/dfs/lineups/[id]/thesis` | Generate lineup thesis |
| `POST /api/dfs/slates/[id]/autopsy` | Run post-slate autopsy |

**Tests** (`apps/web/lib/dfs/optimizer/__tests__/`):
- `solver.test.ts` — 8 tests covering modes, stacking, locks, excludes, exposure
- `rules.test.ts` — constraint rules coverage
- `apps/web/lib/dfs/parsers/__tests__/dk-csv.test.ts` — parser tests
- `apps/web/lib/dfs/simulation/__tests__/engine.test.ts` — Monte Carlo tests
- `apps/web/lib/dfs/narrative/__tests__/signals.test.ts` — signal tests

---

### B. Research Intelligence — TypeScript Data Contracts

All research findings are encoded as typed, queryable TypeScript — not inert documents.

**GSE contracts** (`apps/web/lib/gse/`):
| File | Contents |
|---|---|
| `decision-graph-roadmap.ts` | 8 decision OS nodes across 3 tiers; helpers: `graphNodeById`, `auditRequiredNodes`, `blockingGateNodes`, `tierConfig` |
| `revenue-operating-model.ts` | 4 trust tiers, unit economics, ARR projections; helpers: `currentTierDefinition`, `proAnnualSavings`, `eliteAnnualSavings` |
| `source-rights-gates.ts` | 9 source registry entries, 11 integrity invariants; helpers: `approvedSources`, `excludedSources`, `fantasyPlatformSources`, `sourceById` |

**Research contracts** (`apps/web/lib/research/`):
| File | Contents |
|---|---|
| `competitor-intelligence.ts` | 32+ competitors with 20+ boolean feature flags each; `summarizeCompetitorCategories(entries)`, `gseGapSummary(entries)`, `topCompetitorMechanics(entries)` |
| `revenue-intelligence.ts` | 15 revenue models, 9 competitor pricing entries, `GSE_REVENUE_PHASES`; helpers: `coreRevenueModels()`, `highRiskModels()`, `competitorPricingRange()`, `revenueModelsForStage(stage)` |
| `prediction-methods.ts` | 9 calibration metrics, 8 signal definitions, 7 no-play doctrine entries; `BREAKEVEN_WIN_RATE = 0.5238`; helpers: `primarySignals()`, `sharpSignals()`, `calibrationMetricById(id)` |
| `first-of-kind-systems.ts` | 35 product systems across 12 build phases, 7 scoring models; helpers: `confirmedUniqueCount()`, `liveOrInSprintSystems()`, `criticalTrustImpactSystems()`, `systemsByCategory(cat)` |
| `outside-domain-transfer.ts` | 15 domain transfers (finance quant, chess engines, aviation checklists, etc.); helpers: `v1ReadyTransfers()`, `v2RoadmapTransfers()` |

**Fantasy contracts** (`apps/web/lib/fantasy/`):
| File | Contents |
|---|---|
| `draft-intelligence-roadmap.ts` | 5 build phases, 5 roster configs, draft intelligence feature matrix |
| `voice-jarvis-roadmap.ts` | 7 command templates, 5 platform postures (Sleeper/ESPN/Yahoo/FFPC/NFL), 5 privacy requirements |
| `league-memory-roadmap.ts` | 6 import format specs (Sleeper, ESPN, Yahoo, FFPC, NFL, MFL) |
| `historical-draft-intelligence.ts` | 3 archetype profiles (ILLUSTRATIVE), 3 data sources |

**Tests** (`apps/web/lib/gse/__tests__/gse-contracts.test.ts` + `apps/web/lib/research/__tests__/data-contracts.test.ts`):
- 31 + 36 = **67 tests**, all passing

---

### C. Cockpit Pages — 6 New Internal Views

All pages are admin-only (`session.user.role === "ADMIN"`) and wired into the sidebar nav.

| Page | Route | Source data |
|---|---|---|
| Competitors | `/cockpit/competitors` | `competitor-intelligence.ts` — 32 competitors, gap matrix, category distribution |
| Research | `/cockpit/research` | `revenue-intelligence.ts` + `prediction-methods.ts` — revenue models, pricing intel, calibration metrics |
| Product Map | `/cockpit/product-map` | `first-of-kind-systems.ts` — 35 systems, readiness heatmap, scoring models |
| Revenue | `/cockpit/revenue` | `revenue-intelligence.ts` + `revenue-operating-model.ts` — ARR ladder, competitor pricing, revenue phases |
| Fantasy War Room | `/cockpit/fantasy-war-room` | `draft-intelligence-roadmap.ts` + `voice-jarvis-roadmap.ts` + `league-memory-roadmap.ts` |
| Source Rights | `/cockpit/source-rights` | `source-rights-gates.ts` — GSE source registry, integrity invariants |

Nav location: `apps/web/app/cockpit/layout.tsx` — two new sections: **Intelligence** and **Fantasy & DFS**.

---

## 3. Research Findings

### 3A. Competitive Landscape

**32 competitors tracked** across 7 categories: `fantasy_platform`, `dfs_optimizer`, `analytics_subscription`, `betting_tool`, `content_creator`, `data_provider`, `adjacent_tool`.

**Key gap**: No competitor has all four of these:
- Manager Genome (personalized decision fingerprinting)
- Calibration tracking (Brier score, ECE, CLV accountability)
- Voice assistant integration
- Process grading (decision quality separate from outcome quality)

**Top competitors by category**:
- Fantasy platforms: Sleeper (mobile-first, free, 10M+ users), ESPN (scale), Yahoo (casual), FFPC (serious), Underdog (best ball)
- DFS optimizers: FantasyPros (bundled, $9.99–$39.99/mo), DraftKings Optimizer (walled garden), Awesemo, Rotogrinders
- Analytics subscriptions: Warren Sharp ($99–$199/mo), The Athletic ($12.99/mo, no picks), Sharp Football Analysis
- Prediction tools: Establish The Run, Rotoballer, ProFootballFocus

**GSE's moat**: Manager genome + calibration science + trust tier ladder is unmatched. No competitor publishes Brier scores. No competitor links outcomes to decision quality across time.

---

### 3B. Expansion Opportunity Priorities

**TIER 1 — Build immediately** (high ROI, low complexity, defensible):

1. **Narrative Velocity Tracking**
   - What: Track which player narratives (injury recoveries, coaching changes, scheme fits, target share shifts) are gaining/losing velocity across media, social, and Vegas lines in real-time
   - Why now: Feeds directly into voice Jarvis ("what's heating up?") and manager genome (who catches narratives early vs. late)
   - TAM: $40M–$80M (advanced analytics subscriptions)
   - Data: Public news APIs (NewsAPI, GDELT), odds line movement (The Odds API already integrated), social sentiment
   - Pricing precedent: Warren Sharp ($199/mo) has nothing like this; Awesemo ($79/mo) has trend tables but no velocity scoring
   - Build: Signal aggregation engine → velocity scorer → Jarvis voice hook → cockpit view (~4–6 weeks)

2. **Playoff Schedule Strength (SOS)**
   - What: Dynamic remaining-schedule strength calculator with strength-of-schedule ratings updated weekly, playoff bracket probability, and streaming/waiver priority queues
   - Why now: Massive seasonal marketing window (weeks 10–17 in NFL). "Playoff Schedule Strength" is a top fantasy search term
   - TAM: Addresses all 60M+ fantasy football players
   - Data: Schedule data (free from nflverse), efficiency ratings (PFF API or our own computed ratings)
   - Pricing: Gate behind Pro tier; drives conversion
   - Build: Schedule model → efficiency ratings → playoff SOS calculator → public-facing viz + Pro-gated deep cuts (~3 weeks)

3. **Dynasty/Keeper Trade AI**
   - What: Dynasty trade valuation engine (buy/sell/hold per player), startup draft rankings, positional scarcity modeling, and multi-year contract value analysis
   - Market: 1.7–4.5M dynasty players, $85/yr willingness to pay (research confirmed)
   - Competitors: KTC (free, community-driven), FantasyCalc, Dynasty Nerds ($49.99/yr), Underdog
   - Our edge: Tie valuations to calibration science (how confident are we in this player's 3-year projection vs. what our model actually grades)
   - Data: Historical ADP (free via MFL/Sleeper APIs), contract data (sportradar or free roster APIs)
   - Build: Valuation model → trade analyzer API → UI → Pro/Elite gating (~6 weeks)

**TIER 2 — Research and prototype** (good market, needs validation):

4. **Best Ball Intelligence** — $20M+ TAM, Underdog dominates but no calibration layer. White space: reliability scoring on floor/ceiling variance (best ball rewards ceiling, not floor).
5. **Injury Impact Engine** — Saturated (PFF, Rotoballer, FantasyPros all bundle this), but narrow white space in predictive cascade modeling (how does an injury affect teammates' target shares vs. usage shares 2+ weeks out).

**TIER 3 — Defer**:
6. **Auction Efficiency** — $13M–$22M TAM, niche, slow adoption curve
7. **IDP Scoring Intelligence** — 500K–2M fragmented market, proprietary scoring barriers across leagues
8. **Peer Benchmarking** — Heavy affiliate compliance requirements, geographic restrictions

---

### 3C. Revenue Intelligence

**Competitor pricing floor/ceiling**:
- Freemium entry: $0 (FantasyPros free, Sleeper free)
- Paid floor: $9.99/mo (FantasyPros Sync)
- Mid-tier: $14.99–$24.99/mo (our Pro/Elite — on-market)
- Premium analytics: $49–$199/mo (Warren Sharp, PFF, RotoViz)
- DFS-specific: $15–$79/mo (Awesemo, Rotogrinders)

**GSE's current ladder** (single source of truth: `apps/web/lib/pricing/pricing-phases.ts`):
- Free: $0 — 1 pick/day, no confidence scores
- Pro: $14.99/mo · $99/yr — All picks, factor trail, 7 sports
- Elite: $24.99/mo · $179/yr — All Pro + real-time alerts

**Named step-ups** (proof-gated, not arbitrary):
- FOUNDING → PROVEN (≥100 settled picks + published calibration)
- PROVEN → ESTABLISHED (≥500 settled + verified CLV ≥52.4%)
- ESTABLISHED → AUTHORITY (multi-season ROI)

**Revenue models to build toward** (from `revenue-intelligence.ts`):
- Affiliate revenue (DraftKings 25–40% RevShare, FanDuel 35% RevShare) — see compliance section below
- Entry-fee competitions (requires regulatory review)
- B2B data licensing (build calibration dataset → sell to research firms)
- API tier (expose picks/signals programmatically)

---

### 3D. Affiliate Compliance Summary

**This is a compliance minefield. Key facts for any affiliate feature build:**

Geographic availability: DraftKings + FanDuel affiliate programs cover **38 US states + Ontario only**.

Prohibited states: Alaska, Alabama, Georgia, Hawaii, Idaho, Mississippi, Nevada, New Mexico, South Dakota, Utah, Washington.

State licensing requirements (for the platform as affiliate):
- Free: NJ (vendor registration only)
- $200–$500: CO, IN, MI (CPA), TN, VA
- $1,500+: AZ, PA, MI (revenue share tier)
- No requirement: IA, CT

**Critical compliance rules:**
- FTC requires clear affiliate disclosure on all promotions ("Paid partnership" / "#ad")
- Cannot use "risk-free," "free bet," or guaranteed return language — triggers $150K–$350K fines
- Cannot target college campuses or college athletes
- Must include state-specific problem gambling helpline (1-800-GAMBLER nationally)
- Illinois prohibits CPA-model affiliate compensation entirely (can't pay per-bet-placed)
- CCPA: Must get explicit consent before Meta Pixel fires; $100–$750/user exposure per violation
- NFL players cannot endorse sportsbooks; NBA players can (for non-NBA betting only)

Full research: `DFS_AFFILIATE_RESEARCH_INDEX.md` + `RESEARCH_SUMMARY_DFS_AFFILIATE_RESTRICTIONS.md` at repo root.

---

### 3E. Data Sources and APIs

**Already integrated:**
- The Odds API (real odds/lines — primary source of truth)
- nflverse (public NFL data — free, high quality)

**High-priority additions for expansion features:**

| API | Data | Cost | Priority |
|---|---|---|---|
| Sleeper API | Rosters, trades, ADP, waiver wire | Free | HIGH — dynasty trade AI |
| ESPN Fantasy API | Unofficial but well-documented | Free | HIGH — league memory import |
| MFL API | Dynasty-specific data | Requires MFL account | HIGH — dynasty/keeper |
| Yahoo Fantasy API | OAuth, official | Free with rate limits | MEDIUM — league memory |
| NewsAPI | News articles for narrative tracking | $449/mo commercial | HIGH — narrative velocity |
| GDELT | Global news graph | Free | MEDIUM — narrative velocity fallback |
| nflverse satellites | Snap counts, air yards, target share, separation | Free | HIGH — injury cascade modeling |
| PFF API | Grades, snap counts, depth charts | $5K–$50K/yr | LOW — cost barrier |

**Research documents:**
- `docs/research/FANTASY_LEAGUE_API_RESEARCH_2026.md` — comprehensive API comparison
- `docs/research/FANTASY_APIS_INDEX.md` — quick navigation and decision tree
- `docs/research/LEAGUE_METRICS_BREAKDOWN_BY_API.md` — metric availability matrix by API
- `docs/IDP_SCORING_DATA_SOURCES.md` — IDP-specific data source audit

---

### 3F. First-of-Kind Systems

35 systems documented in `apps/web/lib/research/first-of-kind-systems.ts`. Key ones for next build phase:

| System | Status | What no competitor does |
|---|---|---|
| Manager Genome | designed_not_built | Personalized decision fingerprint — tracks *how* each user picks, not just outcomes |
| Voice Jarvis | in_sprint | Voice-first fantasy assistant with contextual memory |
| Calibration-as-Content | live | Publishing Brier scores + ECE publicly as trust proof |
| Narrative Velocity Engine | concept | Real-time narrative momentum scoring across media + odds |
| Process Grading | designed_not_built | Rates decision quality independent of outcome quality |
| Dynasty Trade Confidence | concept | Trade valuations with confidence intervals from calibrated projections |
| Playoff SOS Optimizer | concept | Dynamic playoff schedule strength with streaming priority queue |

---

### 3G. Outside-Domain Transfers

15 domain transfers documented in `apps/web/lib/research/outside-domain-transfer.ts`. Most impactful for near-term build:

| Domain | Mechanic | GSE Transfer |
|---|---|---|
| Finance quant | Kelly Criterion bet sizing | Confidence-weighted exposure model |
| Chess engines | Positional evaluation over tactics | Manager genome trait scoring |
| Aviation checklists | Pre-flight gate reviews | No-play doctrine checklist system |
| Poker (GTO) | Range-based thinking vs. individual hands | Portfolio construction vs. single picks |
| Weather forecasting | Probabilistic ensemble models | Calibrated pick confidence with ensemble |

---

## 4. Architecture Notes for Next Agent

### TypeScript Patterns

All data contracts follow this pattern — **read before extending**:

```typescript
// Typed registry entry
export interface FooEntry {
  readonly id: string;
  readonly name: string;
  // ... fields with no `any`
}

// Registry as ReadonlyArray — use `as const` on inner objects
export const FOO_REGISTRY: ReadonlyArray<FooEntry> = [
  { id: "example", name: "Example", /* ... */ },
];

// Helper functions take the registry as a parameter (testable, pure)
export function filteredFoo(entries: ReadonlyArray<FooEntry>): ReadonlyArray<FooEntry> {
  return entries.filter((e) => /* condition */);
}
```

**Do not** use compile-time type assertions that break under `noUncheckedIndexedAccess`.

### Cockpit Page Pattern

Every new cockpit page:
1. Goes in `apps/web/app/cockpit/<slug>/page.tsx`
2. Has `export const dynamic = "force-dynamic"` at the top
3. Must be added to the NAV in `apps/web/app/cockpit/layout.tsx` (or `cockpit-nav-coverage.test.ts` will fail)
4. Is server-only (no `"use client"` on the page itself; client components can be imported)

### DFS Optimizer Entry Point

The optimizer's public API is `apps/web/lib/dfs/optimizer/solver.ts`:

```typescript
import { solve, modeDefaults } from "@/lib/dfs/optimizer/solver";

const result = solve(players, "SMALL_FIELD_GPP", 20, {
  stackRequired: true,
  minStackSize: 2,
  noQbVsDst: true,
  maxExposure: 0.6,
});
// result.lineups: Lineup[]
// result.exposure: Record<playerId, exposurePct>
// result.warnings: string[]
```

The API route at `POST /api/dfs/optimize` is the HTTP entry point. It validates input, calls `solve()`, persists the run, and returns lineups.

### GSE Source Rights

Before any new data scraping/ingestion:

```typescript
import { checkClearance, wrapExtractedRecord } from "@/lib/scraping/clearance-engine";

const clearance = await checkClearance(sourceId, requestedDataTypes);
if (!clearance.allowed) throw new Error(clearance.reason);
const record = wrapExtractedRecord(rawData, clearance.rightsSnapshot);
```

See `apps/web/lib/gse/source-rights-gates.ts` for the source registry.

---

## 5. Recommended Next Steps

### Immediate (this week)

1. **Narrative Velocity Tracking — MVP**
   - Build `apps/web/lib/narrative/velocity-engine.ts` — signal aggregator + momentum scorer
   - Sources: NewsAPI (or GDELT fallback) + The Odds API line movement (already integrated)
   - Connect to voice Jarvis command registry (`voice-jarvis-roadmap.ts` has the template)
   - Add cockpit view at `/cockpit/narrative-velocity`
   - Gate Pro/Elite only (behind `api-entitlement.ts`)

2. **Playoff Schedule Strength — MVP**
   - Build `apps/web/lib/fantasy/playoff-sos.ts` — schedule strength calculator
   - Data: nflverse schedule data (free, already partially integrated)
   - Output: weekly SOS ratings per team, playoff probability, streaming recommendations
   - Public-facing page (free users get rankings; Pro gets underlying factors)

3. **Wire DFS UI to optimizer**
   - The optimizer API routes exist but there's no user-facing DFS cockpit page yet
   - Need: `/cockpit/dfs` page that lets the operator load a slate, run the optimizer, and review lineups
   - Also need: DFS public-facing page for subscribers

### Medium-term (next 2–4 weeks)

4. **Dynasty Trade AI — Foundation**
   - Integrate Sleeper API (free) for ADP data
   - Build `apps/web/lib/fantasy/dynasty-trade.ts` — valuation model
   - Connect to calibrated projections (link confidence to trade value)

5. **League Memory Import**
   - `league-memory-roadmap.ts` has the spec for Sleeper/ESPN/Yahoo import formats
   - Build the actual import handlers
   - This is infrastructure for the Manager Genome feature

---

## 6. Files to Read First

Before touching anything, read these in order:

1. `CLAUDE.md` — project rules, subscription tiers, legal scraping posture
2. `apps/web/lib/pricing/pricing-phases.ts` — subscription tier source of truth
3. `apps/web/lib/scraping/clearance-engine.ts` — scraping gate (mandatory before any new data ingestion)
4. `apps/web/lib/research/competitor-intelligence.ts` — understand the competitive landscape data
5. `apps/web/lib/gse/source-rights-gates.ts` — what data sources are cleared
6. `apps/web/lib/dfs/optimizer/solver.ts` — DFS optimizer core

---

## 7. Key Commands

```bash
npx vitest run                    # run all tests (from repo root)
npx vitest run --reporter=verbose # verbose test output
npm run build                     # full build (typecheck + lint + next build)
npm run typecheck                 # tsc --noEmit only
npm run lint                      # eslint only
npm run db:generate               # after schema changes
npm run db:push                   # push schema to DB (dev only)
```

---

## 8. Branch State

```
Branch: claude/laughing-wozniak-gyryjx
Remote: origin/claude/laughing-wozniak-gyryjx
Commits ahead of main: 23
Tests: all passing
Build: clean (exit 0)
Untracked files: none
```

All work is committed and pushed. No open TODO items from this sprint.
