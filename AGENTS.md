# AGENTS.md — autonomous run contract

Auto-loaded by coding agents at workspace root. Read this first, every session.

Repository rules live in `CLAUDE.md` and apply in full. This file governs how an
**unattended agent** works here.

---

## THE LOOP

**UPDATED 2026-08-20 — `handoff/LEDGER.md` and `docs/ops/hermes/CONTINUOUS.md`
below are FROZEN artifacts of an earlier session (last touched 2026-08-17/18).
They are not the live coordination system. Do not resume work from them.**

The live, multi-agent ledger — shared by Hermes, Copilot, the browser agent,
and Claude sessions — is **`docs/ops/AGENT_LEDGER.md`**. It is validated by
`scripts/ops/check-agent-ledger.mjs` (real exit code — never pipe it away) and
enforced in CI. Read its own "Rules" section before touching a row: claim
before starting, never edit a row you do not own, `DONE` requires a
resolvable commit SHA or `#PR`, `UNPUSHED` if you cannot push.

```
1. git fetch origin; open docs/ops/AGENT_LEDGER.md at the latest branch tip
2. Also check docs/ops/hermes/BUILD-QUEUE-*.md (latest date) if present —
   it is the current build task list when one has been issued
3. First unclaimed row you can do -> claim it (Owner + Status: CLAIMED) in
   the SAME commit that begins the work
4. Do exactly that task, nothing else
5. Run its Definition of Done / the repo guards (see WORKING RULES)
6. Mark DONE (with a real SHA) or BLOCKED (with the exact error), one line
7. Commit; push only if explicitly told to for this session — otherwise
   stay UNPUSHED and say so
8. Go to 1
```

Never ask what to do next — the ledger knows. The owner is asleep or busy.
The ledger is how you talk to them, and to every other agent working here.

---

## THE LAWS

Breaking one discards the run.

1. **NEVER `git push` unless the owner said so for this session.** Default is
   commit locally, the owner reviews and pushes. If the owner has explicitly
   told you to push tonight, push only to the branch named, never to `main`
   directly unless that too was explicit.
2. **NEVER modify:** `packages/db/prisma/schema.prisma` · `packages/db/prisma/migrations/**` ·
   `.github/workflows/**` · `scripts/guardrails/**` · `.claude/**` · any `.env*` ·
   `package-lock.json` · `.gitignore` · `.githooks/**` · `apps/web/lib/ai-control-plane/**`
3. **NEVER flip a gate or env flag** — `PUBLIC_PICKS`, `STATS_PUBLIC`, `LIVE_BOARD`,
   `PERFORMANCE_STATS`, any other. Never edit code so a gate resolves differently.
   Never run a cron with a real secret. Never search for credentials. These gates are
   the honesty boundary; opening one publishes an unearned claim.
4. **NEVER write a claim you did not observe.** Every report line traces to a command
   you ran and output you saw. Not run → write `NOT RUN`. Failed → paste the error.
   An honest gap is a contribution; an invented fact is sabotage.
5. **NEVER mark DONE** unless the Definition of Done commands actually passed.
6. **NEVER `git commit --no-verify`.**
7. **NEVER install a package, run a migration, or touch a database.** (Bare
   `npm install` is fine — it is setup, and it still works normally.)
   **Supply-chain controls, added 2026-08-16 — do not disable them.** `.npmrc`
   sets `strict-allow-scripts=true` and `min-release-age=7`. Install scripts run
   only for the version-pinned packages approved in `package.json`'s
   `allowScripts`; anything else HARD FAILS instead of silently running code on
   a machine that holds live production credentials.
   - If an install fails with an unapproved-script error, that is the control
     working. **Do NOT delete `.npmrc`, do NOT set `ignore-scripts`, and do NOT
     run `npm install-scripts approve` to make it pass.** Mark the task BLOCKED
     and report which package wanted to run code.
   - A version bump of an already-approved package also requires re-approval by
     design (the allow-list is pinned per version). Same rule: report, don't
     approve.
8. **NEVER fabricate product data** — no mock picks, sample odds, placeholder win
   rates, invented benchmarks. Anywhere.
9. **NEVER weaken a guard to make a test pass.** Never delete a phrase from a
   forbidden-copy list, never loosen an assertion's intent, never change a guardrail's
   threshold. If a guard is red, either the code is wrong or the guard needs *narrower*
   context — never less power.

---

## WORKING RULES

- **Two attempts per task.** Then revert, mark `BLOCKED` with the exact error text,
  move on. Never a third. A BLOCKED task with an honest error is a success.
- **One task = one commit.** Stage by name — never `git add -A` or `git add .`.
  Tag every message `[hermes-<task-id>]`.
- **Verify block before every code commit:**
  ```bash
  npm run typecheck 2>&1 | grep -c "error TS"   # must print 0
  npm run lint                                   # exit 0
  npx vitest run <this task's test file>         # green
  ```
- TypeScript is strict. Never `any`, `as any`, `@ts-ignore`, `@ts-expect-error`.
- Update the ledger the moment a status changes. Never batch it.

---

## DECISION BUDGET

Per task: **3 file reads · 2 command runs · ONE conclusion · then act.**

If you catch yourself writing *"actually"*, *"wait"*, *"let me reconsider"*, or
*"let me think about this differently"* — **stop. You already have your answer.**
Execute it. If it is wrong, the Definition of Done catches it and you get one retry.
That is what two strikes are for. Never re-derive a conclusion you already reached.

**PRECEDENT FIRST** on any test repair — before analysing anything:
```bash
git grep -l "<the symbol or module the test needs>" -- "*.test.ts"
```
If another test already mocks it, copy that pattern. That is both the answer and the
evidence, in one step.

---

## CONTEXT HYGIENE — this is what keeps you alive

You will be cut off when your context fills. That is expected and survivable, because
the ledger holds your state. Make each session last longer:

- Do not re-read a file you already read this session.
- Do not re-read `CONTINUOUS.md` in full — jump to the section you need.
- Do not summarise your progress unless you are about to be cut off.
- Do not restate a root cause already written in the ledger.
- Ledger evidence is **one line**, not a paragraph.
- After each commit, forget that task completely. It is recorded. Move on.

---

## THE STANDARD

Every commit must be one the owner can read in two minutes and keep or drop with total
confidence. Every report line must trace to output you actually saw. Every uncertainty
must be written down rather than papered over.

This product's entire premise is that it does not lie about its own performance. One
invented number makes every other number suspect.

**Work continuously. Record everything. Invent nothing. Push nothing.**
AGENTS.md — overnight mode — continuing on all night long, without stopping, without asking questions.
--- AGENTS.md update: 2026-08-23 18:22 wave3-laneA missed-tackle bind shipped 7de8ca0f; next queue item ttlos→rushAttempts
08-23 18:33 PRE-6 ttlos bind shipped ba702383; queue: sticks→completions next
FCB36827+ wave3-laneA PRE-7 sticks→completions shipped 2026-08-24; queue clear (all lane A PRE-1 through PRE-7 built + pushed); next: full handoff cycle review then autonomous loop continues; all commits push to origin hermes/w2-audit-settlement

---

## Knowledge Bases

- **Claude Academy corpus**: `docs/CLAUDE-ACADEMY-PLAYBOOK.md` (this repo) — indexed map of all 755 academy.claude.com pages (courses, use-cases by department, tutorials by product, master index). Full page texts live outside the repo at `C:\Users\Garrett\academy-corpus\`. When a task touches Claude usage, prompting, API/MCP/agents/Cowork patterns: check the playbook's Scope Router first, then read only the referenced file(s).

## Sports Betting & Prop Sites Research

### Optimizer Sites (20+)
1. SaberSim - https://www.sabersim.com/dfs/draftkings - Best DraftKings Lineup Optimizer with upside understanding
2. RotoWire - https://www.rotowire.com/daily/nfl/optimizer.php - NFL Lineup Optimizer with news-reactive projections
3. V12 DFS - https://www.v12dfs.com/best-dfs-optimizer - AI-agent workspace + MCP server for building lineups in plain English
4. Stokastic - ~$120/mo all-access - Contest SIMS + elite ownership projections
5. RotoGrinders / LineupHQ - https://rotogrinders.com/fantasy - LineupHQ + THE BAT projections + SimLabs + deep community
6. FantasyLabs - https://www.fantasylabs.com/articles/top-dfs-sites/ - Customizable, backtestable Player Models + Trends
7. FantasyCruncher - MME Lineup Cruncher + Late Swaptimizer for mass-multi-entry & late-swap grinders
8. Daily Fantasy Fuel - https://www.dailyfantasyfuel.com/ - Free projections + free optimizer (freemium)
9. Lineups.com - Free optimizer bundled into a betting-data hub
10. DraftEdge - https://draftedge.com/ - DFS Lineup Optimizer for DraftKings & FanDuel
11. Outlier.bet - https://outlier.bet/ - #1 Rated betting tool for player prop research and trends
12. LineStar - https://www.linestarapp.com/ - DFS Lineup Optimizer and manager
13. PropsBot.AI - https://propsbot.ai/dfs-lineup-optimizer/ - DFS lineup optimizer that reviews entries against player props
14. OddsShopper - https://www.oddsshopper.com/articles/comparisons/best-sports-betting-software - Best Sports Betting Software 2026: Top 5 +EV Tools
15. BettingPros - https://www.bettingpros.com/ - Free Sports Betting Picks, Odds & Expert Analysis
16. FTN Prop Shop - https://ftnfantasy.com/bets/prop-shop - Find the best betting props
17. PropsMadness - https://propsmadness.com/ - Bet the data, not the feelings prop betting tool
18. Props.Cash - https://props.cash/ | Prop & Pick Finder - Helps bettors make better player prop bets using relevant analytics
19. PlayerProps.ai - https://playerprops.ai/ - AI Sports Betting & Player Prop Predictions
20. PickFinder - https://www.pickfinder.app/ - The Ultimate Sports & E-Sports Analytical Tool

### Prop Sites (20+)
1. PropFinder.app - https://propfinder.app/ - Player Prop Research Tool for NBA, NFL, MLB, NHL & CFB
2. Props.Cash - https://props.cash/ - Prop & Pick Finder - Helps bettors make better player prop bets using relevant analytics
3. Outlier.bet - https://outlier.bet/ - #1 Rated betting tool for player prop research and trends
4. LegalSportsReport - https://www.legalsportsreport.com/sports-betting/props/ - Best Prop Betting Sites Today
5. PropsMadness - https://propsmadness.com/ - Bet the data, not the feelings prop betting tool
6. PlayerProps.ai - https://playerprops.ai/ - AI Sports Betting & Player Prop Predictions
7. FTN Prop Shop - https://ftnfantasy.com/bets/prop-shop - Find the best betting props
8. Fox Sports - https://www.foxsports.com/stories/betting/best-prop-betting-sites - Best Prop Betting Sites 2026: Top Sportsbook Apps and Promos
9. SI.com - https://www.si.com/betting/usa/prop-betting-sites - Best Prop Betting Sites and Apps: Top Platforms for August 2026
10. PickFinder - https://www.pickfinder.app/ - The Ultimate Sports & E-Sports Analytical Tool
11. Covers.com - https://www.covers.com/betting/nfl-prop-bets - Best Prop Betting Sites & Apps in Aug. 2026
12. OddsJam - https://fantasy.oddsjam.com/fantasy-odds/prizepicks - Fantasy Optimizer - Prizepicks
13. Daily Grind Fantasy - https://dgfantasy.com/ - Best Prizepicks Tools
14. BetMGM - (mentioned in SI article) - Top prop betting site
15. bet365 - (mentioned in SI article) - Top prop betting site
16. Fanatics Sportsbook - (mentioned in SI article) - Top prop betting site
17. Caesars Sportsbook - (mentioned in PropFinder) - Top prop betting site
18. DraftKings - (mentioned in PropFinder) - Top prop betting site
19. FanDuel - (mentioned in PropFinder) - Top prop betting site
20. ESPN Bet - (mentioned in PropFinder) - Top prop betting site


# Galaxy Sports Edge (GSE) Optimization Plan
# Galaxy Sports Edge (GSE) Optimization Plan
## Integrating Sports Betting & Prop Sites Research

### Executive Summary
This plan outlines how to integrate the 20+ optimizer sites and 20+ prop sites researched into the Galaxy Sports Edge (GSE) system to enhance its predictive capabilities, data diversity, and edge detection algorithms.

### Current GSE Architecture Overview
Based on codebase analysis:
- **Data Ingestion**: `packages/data-ingestion` with existing clients for ESPN, Kalshi, NFLverse, etc.
- **Source Registry**: Legal source governance in `packages/data-ingestion/src/source-registry.ts`
- **Prediction Engine**: `packages/prediction-engine` with CLV, Poisson, edge engines
- **Types**: Shared interfaces in `packages/types/src/`
- **Worker System**: Specialized workers for data refresh, pick generation, etc.

### Integration Strategy
Following GSE's principles:
1. **Verified Edge Only**: Only integrate sources that provide reproducible, auditable data
2. **No Fabrication**: Never invent data; soft-fail to null when data unavailable
3. **Attribution**: Maintain source provenance for all ingested data
4. **Founder-Gated**: New integrations require explicit approval via source registry
5. **Free/Free-Tier Priority**: Prefer free data sources to maintain $0 budget constraint

---

## OPTIMIZER SITES INTEGRATION MAP

### 1. SaberSim (https://www.sabersim.com/dfs/draftkings)
- **Data Type**: DFS lineup projections, ownership percentages, upside projections
- **GSE Integration**: 
  - Enhance player projection models in prediction engine
  - Add to data-ingestion as `sabersim-client.ts`
  - Integrate with existing projection-evaluation components
  - Use for: Player performance baseline comparisons, ownership-aware contrarian plays
- **Data Structure**: Would map to existing `PlayerProjection` or similar types
- **Integration Point**: `prediction-engine/src/player-projection.ts`

### 2. RotoWire (https://www.rotowire.com/daily/nfl/optimizer.php)
- **Data Type**: NFL-specific lineup optimizer with news-reactive projections
- **GSE Integration**:
  - News sentiment integration for real-time adjustment factors
  - Injury news feed for player availability modeling
  - Weather impact projections for game-time conditions
  - Integrate with: `prediction-engine/src/nfl-epa-fair-value.ts` or similar
- **Value**: Timeliness factor for in-week adjustments

### 3. V12 DFS (https://www.v12dfs.com/best-dfs-optimizer)
- **Data Type**: AI-agent workspace, natural language lineup building
- **GSE Integration**:
  - Natural language interface for query-driven edge exploration
  - Could enhance the `gse-truth.ps1` or agent interaction layer
  - Integration point: Through GSE's agent/autonomy systems
  - Less direct data integration, more UX/enhancement opportunity

### 4. Stokastic (~$120/mo all-access)
- **Data Type**: Contest SIMS, elite ownership projections, simulation engine
- **GSE Integration**:
  - Ownership projection data for contrarian play detection
  - Simulation results for outcome distribution modeling
  - Could enhance: `prediction-engine/src/ensemble/` components
  - Integration via: Ownership-adjusted expected value calculations
  - Note: Paid service - would require founder approval for budget

### 5. RotoGrinders / LineupHQ (https://rotogrinders.com/fantasy)
- **Data Type**: LineupHQ + THE BAT projections + SimLabs + community insights
- **GSE Integration**:
  - THE BAT projections as independent fair-value estimates
  - SimLabs simulation data for outcome distributions
  - Community sentiment as alternative data signal
  - Integration: Independent estimator for Kalshi/Poisson comparison
  - Files: Would add `rotogrinders-client.ts` to data-ingestion

### 6. FantasyLabs (https://www.fantasylabs.com/articles/top-dfs-sites/)
- **Data Type**: Customizable, backtestable Player Models + Trends
- **GSE Integration**:
  - Custom model backtesting framework comparison
  - Trend analysis for player performance trajectories
  - Could enhance: `prediction-engine/src/model-limitations.ts` validation
  - Integration point: Model evaluation and comparison system

### 7. FantasyCruncher (MME Lineup Cruncher + Late Swaptimizer)
- **Data Type**: Mass-multi-entry lineup optimization, late swap opportunities
- **GSE Integration**:
  - Late-breaking news integration for last-minute adjustments
  - MME strategy insights for portfolio construction
  - Integration: Late-game adjustment factors in pick-generation worker
  - Worker: `packages/workers/pick-generation/`

### 8. Daily Fantasy Fuel (https://www.dailyfantasyfuel.com/)
- **Data Type**: Free projections + free optimizer (freemium)
- **GSE Integration**:
  - Free tier projections as baseline comparisons
  - Could supplement existing free data sources (ESPN, NFLverse)
  - Integration: Additional projection source for ensemble methods
  - Low barrier entry point for testing

### 9. Lineups.com
- **Data Type**: Free optimizer bundled into betting-data hub
- **GSE Integration**:
  - Consolidated betting data + optimization in one feed
  - Potential line movement and public betting percentages
  - Integration: Public betting sentiment for contrarian signals
  - Maps to: Existing odds ingestion with additional sentiment fields

### 10. DraftEdge (https://draftedge.com/)
- **Data Type**: DFS Lineup Optimizer for DraftKings & FanDuel
- **GSE Integration**:
  - Site-specific optimization for major DFS platforms
  - Salary projection and value detection algorithms
  - Integration: Salary-based projected ROI calculations
  - Enhances: Existing salary-aware components in pick generation

### 11. Outlier.bet (https://outlier.bet/)
- **Data Type**: #1 Rated betting tool for player prop research and trends
- **GSE Integration**:
  - Player prop trends and research signals
  - Community sentiment and sharp money indicators
  - Integration: Proprietary research as independent signal layer
  - Maps well to: Existing prop research in `docs/nfl-osint-props-research.md`

### 12. LineStar (https://www.linestarapp.com/)
- **Data Type**: DFS Lineup Optimizer and manager
- **GSE Integration**:
  - Lineup construction and export capabilities
  - Could enhance GSE's pick generation and export formats
  - Integration: Output format compatibility and lineup construction insights

### 13. PropsBot.AI (https://propsbot.ai/dfs-lineup-optimizer/)
- **Data Type**: DFS lineup optimizer that reviews entries against player props
- **GSE Integration**:
  - Direct alignment with GSE's prop betting focus
  - Lineup validation against prop constraints
  - Integration: Prop-feasibility filtering in pick-generation pipeline
  - Natural fit: Would enhance existing prop-related workers

### 14. OddsShopper (https://www.oddsshopper.com/articles/comparisons/best-sports-betting-software)
- **Data Type**: Best Sports Betting Software 2026: Top 5 +EV Tools
- **GSE Integration**:
  - Comparative analysis of betting tools and methodologies
  - Could inform GSE's own tool selection and validation
  - Integration: Benchmarking framework for GSE components
  - More methodological than direct data integration

### 15. BettingPros (https://www.bettingpros.com/)
- **Data Type**: Free Sports Betting Picks, Odds & Expert Analysis
- **GSE Integration**:
  - Expert consensus picks as signal validation
  - Odds comparison and line movement tracking
  - Integration: Expert signal tracking for performance attribution
  - Maps to: Existing odds ingestion with expert overlay

### 16. FTN Prop Shop (https://ftnfantasy.com/bets/prop-shop)
- **Data Type**: Prop betting recommendations and analysis
- **GSE Integration**:
  - Direct prop betting focus aligns with GSE strengths
  - Could enhance prop-specific prediction engines
  - Integration: Proprietary prop models for ensemble methods
  - Natural enhancement: Prop-focused prediction improvements

### 17. PropsMadness (https://propsmadness.com/)
- **Data Type**: Bet the data, not the feelings prop betting tool
- **GSE Integration**:
  - Data-driven prop analysis aligns with GSE thesis
  - Statistical prop models for comparison/validation
  - Integration: Alternative prop modeling approaches
  - Enhances: Existing prop modeling in prediction engine

### 18. Props.Cash (https://props.cash/)
- **Data Type**: Prop & Pick Finder - analytics-based prop betting
- **GSE Integration**:
  - Analytics-driven prop selection aligns with GSE approach
  - Relevant analytics for prop probability calculations
  - Integration: Additional analytics layer for prop engines
  - Maps well to: Existing prop analysis components

### 19. PlayerProps.ai (https://playerprops.ai/)
- **Data Type**: AI Sports Betting & Player Prop Predictions
- **GSE Integration**:
  - AI-powered prop predictions as independent estimator
  - Could validate or enhance GSE's own ML models
  - Integration: AI model ensemble or comparison baseline
  - Maps to: ML evaluation and comparison frameworks

### 20. PickFinder (https://www.pickfinder.app/)
- **Data Type**: Ultimate Sports & E-Sports Analytical Tool
- **GSE Integration**:
  - Cross-sport analytical capabilities
  - Could enhance GSE's multi-sport expansion capabilities
  - Integration: Analytical framework for sport-agnostic approaches
  - Future enhancement: Multi-sport analytical tools

---

## PROP SITES INTEGRATION MAP

### 1. PropFinder.app (https://propfinder.app/)
- **Data Type**: Player Prop Research Tool for NBA, NFL, MLB, NHL & CFB
- **GSE Integration**:
  - Direct prop research alignment
  - Statistical trends and insights for prop modeling
  - Integration: Prop research ingestion and trend analysis
  - Natural enhancement: Would feed into prop prediction engines

### 2. Props.Cash (https://props.cash/)
- **Data Type**: Prop & Pick Finder - Helps bettors make better player prop bets using relevant analytics
- **GSE Integration**:
  - Analytics-based prop selection (see optimizer sites above)
  - Integration: Analytics pipeline for prop probability enhancements

### 3. Outlier.bet (https://outlier.bet/)
- **Data Type**: #1 Rated betting tool for player prop research and trends
- **GSE Integration**:
  - Prop research and trend analysis (see optimizer sites above)
  - Integration: Trend detection and signaling systems

### 4. LegalSportsReport (https://www.legalsportsreport.com/sports-betting/props/)
- **Data Type**: Best Prop Betting Sites Today
- **GSE Integration**:
  - Site evaluations and recommendations
  - Integration: Regulatory and compliance insights for prop offerings
  - Enhances: Compliance and legal review components

### 5. PropsMadness (https://propsmadness.com/)
- **Data Type**: Bet the data, not the feelings prop betting tool
- **GSE Integration**:
  - Data-driven prop analysis (see optimizer sites above)
  - Integration: Statistical modeling enhancements for props

### 6. PlayerProps.ai (https://playerprops.ai/)
- **Data Type**: AI Sports Betting & Player Prop Predictions
- **GSE Integration**:
  - AI prop predictions (see optimizer sites above)
  - Integration: AI/ML model comparison and ensemble methods

### 7. FTN Prop Shop (https://ftnfantasy.com/bets/prop-shop)
- **Data Type**: Find the best betting props
- **GSE Integration**:
  - Prop betting recommendations (see optimizer sites above)
  - Integration: Prop opportunity detection and ranking

### 8. Fox Sports (https://www.foxsports.com/stories/betting/best-prop-betting-sites)
- **Data Type**: Best Prop Betting Sites 2026: Top Sportsbook Apps and Promos
- **GSE Integration**:
  - Sportsbook prop offerings and promotions
  - Integration: Market intelligence for competitive prop landscapes
  - Enhances: Market analysis and competitive positioning

### 9. SI.com (https://www.si.com/betting/usa/prop-betting-sites)
- **Data Type**: Best Prop Betting Sites and Apps: Top Platforms for August 2026
- **GSE Integration**:
  - Platform analysis for prop betting
  - Integration: Technology stack and feature benchmarking
  - Enhances: Product development and feature prioritization

### 10. PickFinder (https://www.pickfinder.app/)
- **Data Type**: Ultimate Sports & E-Sports Analytical Tool
- **GSE Integration**:
  - Cross-sport analytics (see optimizer sites above)
  - Integration: Analytical framework expansion

### 11. Covers.com (https://www.covers.com/betting/nfl-prop-bets)
- **Data Type**: Best Prop Betting Sites & Apps in Aug. 2026
- **GSE Integration**:
  - NFL-specific prop betting analysis
  - Integration: NFL prop market intelligence and trends
  - Enhances: NFL-focused prop modeling

### 12. OddsJam (https://fantasy.oddsjam.com/fantasy-odds/prizepicks)
- **Data Type**: Fantasy Optimizer - Prizepicks
- **GSE Integration**:
  - Prizepicks-specific optimization and projections
  - Integration: Specialized prop type handling (Prizepicks format)
  - Enhances: Prop type diversification capabilities

### 13. Daily Grind Fantasy (https://dgfantasy.com/)
- **Data Type**: Best Prizepicks Tools
- **GSE Integration**:
  - Prizepicks-focused tools and analysis
  - Integration: Specialized Prizepicks prop handling
  - Enhances: Alternative prop format support

### 14-20. Major Sportsbooks
**Sportsbooks Mentioned**: BetMGM, bet365, Fanatics Sportsbook, Caesars Sportsbook, DraftKings, FanDuel, ESPN Bet

- **Data Type**: Sportsbook prop offerings, odds, and markets
- **GSE Integration**:
  - Primary source for prop market odds and lines
  - Integration: Existing odds ingestion already handles many of these
  - Enhancement: Additional prop-specific fields and metadata
  - Current system: `packages/data-ingestion/src/odds-api-client.ts` etc.
  - Opportunity: Extend to capture more prop-specific markets

---

## TECHNICAL IMPLEMENTATION ROADMAP

### Phase 1: Assessment and Planning (Week 1)
1. **Data Source Evaluation**
   - Audit each site for API availability, data structure, update frequency
   - Determine compliance and terms of service for each source
   - Categorize by data type: odds, props, projections, news, analytics

2. **Architecture Review**
   - Review existing data ingestion patterns in `packages/data-ingestion/src/`
   - Examine source registry patterns in `source-registry.ts`
   - Study prediction engine integration points
   - Identify minimal viable integration patterns

### Phase 2: Pilot Integrations (Weeks 2-3)
1. **High-Value, Low-Complexity Targets**
   - Start with free, well-documented APIs that align with existing patterns
   - Examples: Additional ESPN endpoints, free prop APIs, open data sources

2. **Implementation Pattern**
   - Create new client in `packages/data-ingestion/src/` (e.g., `newsource-client.ts`)
   - Follow existing patterns: `noStoreFetch`, proper typing, error handling
   - Add to source registry with appropriate licensing and attribution
   - Create corresponding tests in `__tests__/` directory
   - Integrate with prediction engine where appropriate

3. **Initial Integration Targets**
   - **Props.Cash**: Analytics API for prop probability enhancements
   - **PlayerProps.ai**: AI prop predictions as independent estimator
   - **FantasyLabs**: Projection data for model validation
   - **Outlier.bet**: Trend signals for adjustment factors

### Phase 3: Core Integrations (Weeks 4-6)
1. **High-Value Targets**
   - Sites providing unique data types not currently covered
   - Sites with strong alignment to GSE's edge detection thesis

2. **Integration Examples**
   - **SaberSim**: Projection data for player baseline enhancement
   - **RotoWire**: News-driven adjustment factors
   - **V12 DFS**: Natural language query interface exploration
   - **Stokastic**: Ownership data for contrarian plays (if budget approved)

### Phase 4: Advanced Features and Optimization (Weeks 7-8)
1. **Ensemble Methods**
   - Combine multiple independent estimators for improved accuracy
   - Implement weighted averaging based on historical performance
   - Create confidence intervals from multiple data sources

2. **Edge Detection Enhancements**
   - Use diverse data sources to identify market inefficiencies
   - Implement cross-validation between independent estimators
   - Enhance CLV calculations with multi-source closing lines

3. **Performance Attribution**
   - Track which data sources contribute most to profitable edges
   - Implement source-specific performance tracking
   - Optimize resource allocation based on source ROI

### Phase 5: Production Readiness and Validation (Ongoing)
1. **Verification Protocols**
   - Implement reproducibility checks for all integrated sources
   - Create audit trails for data lineage and transformation
   - Establish false positive detection and correction mechanisms

2. **Documentation and Knowledge Transfer**
   - Update `docs/` with integration patterns and source documentation
   - Create runbooks for source maintenance and troubleshooting
   - Train team on new integration patterns and validation procedures

---

## INTEGRATION PATTERNS AND BEST PRACTICES

### Data Ingestion Client Pattern
Following the existing pattern in `packages/data-ingestion/src/`:
```typescript
// Example: newsource-client.ts
import type { RelevantGSEType } from "@sports/types";
import { noStoreFetch } from "./no-store-fetch.js";

const NEW_SOURCE_BASE = "https://api.newsource.com";

export interface NewSourceData {
  // Define the data structure returned by the API
  // Map to existing GSE types where possible
}

export class NewSourceClient {
  static async fetchData(params): Promise<NewSourceData[]> {
    // Implement using noStoreFetch for consistency
    // Handle errors gracefully (soft-fail to empty array/null)
    // Apply any necessary data normalization/transformation
    // Return data in GSE-compatible format
  }
}
```

### Source Registry Integration
Following the pattern in `packages/data-ingestion/src/source-registry.ts`:
```typescript
// Add to SOURCE_REGISTRY
"newsource": {
  license: { spdx: "CC-BY-4.0" }, // or appropriate license
  attributionRequired: true,
  commercialUse: true, // verify from ToS
  attributionText: "Data provided by NewSource",
  // Add any additional metadata required
}
```

### Prediction Engine Integration Points
Depending on data type:
- **Projections/Tips**: `prediction-engine/src/player-projection.ts`
- **Odds/Lines**: Enhance existing odds ingestion or create new normalizer
- **News/Signals**: `prediction-engine/src/game-context.ts` or similar
- **Analytics**: `prediction-engine/src/analytics/` or new module
- **Independent Estimates**: Compare against existing models in `prediction-engine/src/`

### Testing Pattern
Following existing test patterns in `__tests__/` directories:
```typescript
// Example: newsource-client.test.ts
import { describe, it, expect } from "vitest";
import { NewSourceClient } from "./newsource-client.js";

describe("NewSourceClient", () => {
  it("should fetch and parse data correctly", async () => {
    // Mock API responses
    // Test data transformation
    // Test error handling
    // Test empty response handling
  });
});
```

---

## RISK ASSESSMENT AND MITIGATION

### 1. Data Quality and Reliability
- **Risk**: Inconsistent or low-quality data from new sources
- **Mitigation**: Implement source health checks (`source-health.ts` pattern), 
  gradual rollout with monitoring, fallback to existing sources

### 2. Legal and Compliance Risk
- **Risk**: Violating terms of service or licensing agreements
- **Mitigation**: Strict adherence to source registry, legal review before 
  integration, attribution compliance, non-commercial use where required

### 3. Operational Complexity
- **Risk**: Increased system complexity and maintenance burden
- **Mitigation**: Follow existing patterns strictly, modular design, 
  comprehensive testing, clear documentation

### 4. Performance Impact
- **Risk**: Degraded system performance from additional data sources
- **Mitigation**: Asynchronous processing, caching where appropriate, 
  rate limiting, background workers for non-critical updates

### 5. Signal Noise
- **Risk**: Low signal-to-noise ratio from new data sources
- **Mitigation**: Rigorous backtesting, performance attribution, 
  source-specific weighting based on historical accuracy

---

## SUCCESS METRICS AND EVALUATION CRITERIA

### Short-Term Metrics (Month 1)
- Number of new sources successfully integrated and verified
- Data latency and reliability metrics for each source
- Integration test coverage (>90% for new components)
- Compliance verification completion (100% of new sources)

### Medium-Term Metrics (Months 2-3)
- Performance improvement from new data sources (measured via backtesting)
- Edge detection accuracy improvement with multi-source validation
- Reduction in false positives through cross-source verification
- Attribution accuracy and audit trail completeness

### Long-Term Metrics (Ongoing)
- Sustainable edge generation from integrated data sources
- System stability and reliability with expanded data sources
- Attribution completeness for all displayed predictions
- Continuous improvement through source performance monitoring

---

## RECOMMENDED PRIORITIZATION

### Tier 1: Immediate Opportunities (Weeks 1-2)
1. **Props.Cash** - Analytics API, low complexity, high relevance
2. **PlayerProps.ai** - AI predictions, direct alignment with prop focus
3. **FantasyLabs** - Projection data for model validation
4. **Outlier.bet** - Trend signals for adjustment factors

### Tier 2: High Value Targets (Weeks 3-4)
1. **SaberSim** - Projection data for player baseline enhancement
2. **RotoWire** - News-driven adjustment factors
3. **LineStar** - Lineup construction and export compatibility
4. **PropsBot.AI** - Prop-validation for lineup generation

### Tier 3: Strategic Enhancements (Weeks 5-8)
1. **Stokastic** - Ownership data (budget permitting)
2. **V12 DFS** - Natural language interface exploration
3. **OddsShopper** - Methodological benchmarking
4. **BettingPros** - Expert signal tracking

### Tier 4: Future Considerations
1. **Major Sportsbooks** - Extended prop market coverage
2. **Specialized Prop Sites** - Niche prop type expansion
3. **Cross-Platform Tools** - Multi-sport analytical capabilities
4. **Emerging Prop Markets** - New bet types and formats

---

## CONCLUSION

The 40+ sites researched represent significant opportunity to enhance GSE's capabilities through:
1. **Data Diversity**: Reduced reliance on any single source
2. **Model Validation**: Multiple independent estimators for robust validation
3. **Signal Enrichment**: Additional contextual factors for improved predictions
4. **Edge Detection**: Increased opportunities to identify market inefficiencies
5. **Attribution Strength**: Improved provenance and audit capabilities

By following GSE's existing patterns and principles, these integrations can be performed systematically and safely, enhancing the system's ability to generate verifiable edges while maintaining its core thesis of "calibrated, not just confident" predictions.

The key to success will be selective integration based on data quality, compliance alignment, and demonstrable improvement to GSE's edge detection capabilities, all while maintaining the system's commitment to honesty, verification, and founder-gated decision making.
## Integrating Sports Betting & Prop Sites Research

### Executive Summary
This plan outlines how to integrate the 20+ optimizer sites and 20+ prop sites researched into the Galaxy Sports Edge (GSE) system to enhance its predictive capabilities, data diversity, and edge detection algorithms.

### Current GSE Architecture Overview
Based on codebase analysis:
- **Data Ingestion**: `packages/data-ingestion` with existing clients for ESPN, Kalshi, NFLverse, etc.
- **Source Registry**: Legal source governance in `packages/data-ingestion/src/source-registry.ts`
- **Prediction Engine**: `packages/prediction-engine` with CLV, Poisson, edge engines
- **Types**: Shared interfaces in `packages/types/src/`
- **Worker System**: Specialized workers for data refresh, pick generation, etc.

### Integration Strategy
Following GSE's principles:
1. **Verified Edge Only**: Only integrate sources that provide reproducible, auditable data
2. **No Fabrication**: Never invent data; soft-fail to null when data unavailable
3. **Attribution**: Maintain source provenance for all ingested data
4. **Founder-Gated**: New integrations require explicit approval via source registry
5. **Free/Free-Tier Priority**: Prefer free data sources to maintain $0 budget constraint

---

## OPTIMIZER SITES INTEGRATION MAP

### 1. SaberSim (https://www.sabersim.com/dfs/draftkings)
- **Data Type**: DFS lineup projections, ownership percentages, upside projections
- **GSE Integration**: 
  - Enhance player projection models in prediction engine
  - Add to data-ingestion as `sabersim-client.ts`
  - Integrate with existing projection-evaluation components
  - Use for: Player performance baseline comparisons, ownership-aware contrarian plays
- **Data Structure**: Would map to existing `PlayerProjection` or similar types
- **Integration Point**: `prediction-engine/src/player-projection.ts`

### 2. RotoWire (https://www.rotowire.com/daily/nfl/optimizer.php)
- **Data Type**: NFL-specific lineup optimizer with news-reactive projections
- **GSE Integration**:
  - News sentiment integration for real-time adjustment factors
  - Injury news feed for player availability modeling
  - Weather impact projections for game-time conditions
  - Integrate with: `prediction-engine/src/nfl-epa-fair-value.ts` or similar
- **Value**: Timeliness factor for in-week adjustments

### 3. V12 DFS (https://www.v12dfs.com/best-dfs-optimizer)
- **Data Type**: AI-agent workspace, natural language lineup building
- **GSE Integration**:
  - Natural language interface for query-driven edge exploration
  - Could enhance the `gse-truth.ps1` or agent interaction layer
  - Integration point: Through GSE's agent/autonomy systems
  - Less direct data integration, more UX/enhancement opportunity

### 4. Stokastic (~$120/mo all-access)
- **Data Type**: Contest SIMS, elite ownership projections, simulation engine
- **GSE Integration**:
  - Ownership projection data for contrarian play detection
  - Simulation results for outcome distribution modeling
  - Could enhance: `prediction-engine/src/ensemble/` components
  - Integration via: Ownership-adjusted expected value calculations
  - Note: Paid service - would require founder approval for budget

### 5. RotoGrinders / LineupHQ (https://rotogrinders.com/fantasy)
- **Data Type**: LineupHQ + THE BAT projections + SimLabs + community insights
- **GSE Integration**:
  - THE BAT projections as independent fair-value estimates
  - SimLabs simulation data for outcome distributions
  - Community sentiment as alternative data signal
  - Integration: Independent estimator for Kalshi/Poisson comparison
  - Files: Would add `rotogrinders-client.ts` to data-ingestion

### 6. FantasyLabs (https://www.fantasylabs.com/articles/top-dfs-sites/)
- **Data Type**: Customizable, backtestable Player Models + Trends
- **GSE Integration**:
  - Custom model backtesting framework comparison
  - Trend analysis for player performance trajectories
  - Could enhance: `prediction-engine/src/model-limitations.ts` validation
  - Integration point: Model evaluation and comparison system

### 7. FantasyCruncher (MME Lineup Cruncher + Late Swaptimizer)
- **Data Type**: Mass-multi-entry lineup optimization, late swap opportunities
- **GSE Integration**:
  - Late-breaking news integration for last-minute adjustments
  - MME strategy insights for portfolio construction
  - Integration: Late-game adjustment factors in pick-generation worker
  - Worker: `packages/workers/pick-generation/`

### 8. Daily Fantasy Fuel (https://www.dailyfantasyfuel.com/)
- **Data Type**: Free projections + free optimizer (freemium)
- **GSE Integration**:
  - Free tier projections as baseline comparisons
  - Could supplement existing free data sources (ESPN, NFLverse)
  - Integration: Additional projection source for ensemble methods
  - Low barrier entry point for testing

### 9. Lineups.com
- **Data Type**: Free optimizer bundled into betting-data hub
- **GSE Integration**:
  - Consolidated betting data + optimization in one feed
  - Potential line movement and public betting percentages
  - Integration: Public betting sentiment for contrarian signals
  - Maps to: Existing odds ingestion with additional sentiment fields

### 10. DraftEdge (https://draftedge.com/)
- **Data Type**: DFS Lineup Optimizer for DraftKings & FanDuel
- **GSE Integration**:
  - Site-specific optimization for major DFS platforms
  - Salary projection and value detection algorithms
  - Integration: Salary-based projected ROI calculations
  - Enhances: Existing salary-aware components in pick generation

### 11. Outlier.bet (https://outlier.bet/)
- **Data Type**: #1 Rated betting tool for player prop research and trends
- **GSE Integration**:
  - Player prop trends and research signals
  - Community sentiment and sharp money indicators
  - Integration: Proprietary research as independent signal layer
  - Maps well to: Existing prop research in `docs/nfl-osint-props-research.md`

### 12. LineStar (https://www.linestarapp.com/)
- **Data Type**: DFS Lineup Optimizer and manager
- **GSE Integration**:
  - Lineup construction and export capabilities
  - Could enhance GSE's pick generation and export formats
  - Integration: Output format compatibility and lineup construction insights

### 13. PropsBot.AI (https://propsbot.ai/dfs-lineup-optimizer/)
- **Data Type**: DFS lineup optimizer that reviews entries against player props
- **GSE Integration**:
  - Direct alignment with GSE's prop betting focus
  - Lineup validation against prop constraints
  - Integration: Prop-feasibility filtering in pick-generation pipeline
  - Natural fit: Would enhance existing prop-related workers

### 14. OddsShopper (https://www.oddsshopper.com/articles/comparisons/best-sports-betting-software)
- **Data Type**: Best Sports Betting Software 2026: Top 5 +EV Tools
- **GSE Integration**:
  - Comparative analysis of betting tools and methodologies
  - Could inform GSE's own tool selection and validation
  - Integration: Benchmarking framework for GSE components
  - More methodological than direct data integration

### 15. BettingPros (https://www.bettingpros.com/)
- **Data Type**: Free Sports Betting Picks, Odds & Expert Analysis
- **GSE Integration**:
  - Expert consensus picks as signal validation
  - Odds comparison and line movement tracking
  - Integration: Expert signal tracking for performance attribution
  - Maps to: Existing odds ingestion with expert overlay

### 16. FTN Prop Shop (https://ftnfantasy.com/bets/prop-shop)
- **Data Type**: Prop betting recommendations and analysis
- **GSE Integration**:
  - Direct prop betting focus aligns with GSE strengths
  - Could enhance prop-specific prediction engines
  - Integration: Proprietary prop models for ensemble methods
  - Natural enhancement: Prop-focused prediction improvements

### 17. PropsMadness (https://propsmadness.com/)
- **Data Type**: Bet the data, not the feelings prop betting tool
- **GSE Integration**:
  - Data-driven prop analysis aligns with GSE thesis
  - Statistical prop models for comparison/validation
  - Integration: Alternative prop modeling approaches
  - Enhances: Existing prop modeling in prediction engine

### 18. Props.Cash (https://props.cash/)
- **Data Type**: Prop & Pick Finder - analytics-based prop betting
- **GSE Integration**:
  - Analytics-driven prop selection aligns with GSE approach
  - Relevant analytics for prop probability calculations
  - Integration: Additional analytics layer for prop engines
  - Maps well to: Existing prop analysis components

### 19. PlayerProps.ai (https://playerprops.ai/)
- **Data Type**: AI Sports Betting & Player Prop Predictions
- **GSE Integration**:
  - AI-powered prop predictions as independent estimator
  - Could validate or enhance GSE's own ML models
  - Integration: AI model ensemble or comparison baseline
  - Maps to: ML evaluation and comparison frameworks

### 20. PickFinder (https://www.pickfinder.app/)
- **Data Type**: Ultimate Sports & E-Sports Analytical Tool
- **GSE Integration**:
  - Cross-sport analytical capabilities
  - Could enhance GSE's multi-sport expansion capabilities
  - Integration: Analytical framework for sport-agnostic approaches
  - Future enhancement: Multi-sport analytical tools

---

## PROP SITES INTEGRATION MAP

### 1. PropFinder.app (https://propfinder.app/)
- **Data Type**: Player Prop Research Tool for NBA, NFL, MLB, NHL & CFB
- **GSE Integration**:
  - Direct prop research alignment
  - Statistical trends and insights for prop modeling
  - Integration: Prop research ingestion and trend analysis
  - Natural enhancement: Would feed into prop prediction engines

### 2. Props.Cash (https://props.cash/)
- **Data Type**: Prop & Pick Finder - Helps bettors make better player prop bets using relevant analytics
- **GSE Integration**:
  - Analytics-based prop selection (see optimizer sites above)
  - Integration: Analytics pipeline for prop probability enhancements

### 3. Outlier.bet (https://outlier.bet/)
- **Data Type**: #1 Rated betting tool for player prop research and trends
- **GSE Integration**:
  - Prop research and trend analysis (see optimizer sites above)
  - Integration: Trend detection and signaling systems

### 4. LegalSportsReport (https://www.legalsportsreport.com/sports-betting/props/)
- **Data Type**: Best Prop Betting Sites Today
- **GSE Integration**:
  - Site evaluations and recommendations
  - Integration: Regulatory and compliance insights for prop offerings
  - Enhances: Compliance and legal review components

### 5. PropsMadness (https://propsmadness.com/)
- **Data Type**: Bet the data, not the feelings prop betting tool
- **GSE Integration**:
  - Data-driven prop analysis (see optimizer sites above)
  - Integration: Statistical modeling enhancements for props

### 6. PlayerProps.ai (https://playerprops.ai/)
- **Data Type**: AI Sports Betting & Player Prop Predictions
- **GSE Integration**:
  - AI prop predictions (see optimizer sites above)
  - Integration: AI/ML model comparison and ensemble methods

### 7. FTN Prop Shop (https://ftnfantasy.com/bets/prop-shop)
- **Data Type**: Find the best betting props
- **GSE Integration**:
  - Prop betting recommendations (see optimizer sites above)
  - Integration: Prop opportunity detection and ranking

### 8. Fox Sports (https://www.foxsports.com/stories/betting/best-prop-betting-sites)
- **Data Type**: Best Prop Betting Sites 2026: Top Sportsbook Apps and Promos
- **GSE Integration**:
  - Sportsbook prop offerings and promotions
  - Integration: Market intelligence for competitive prop landscapes
  - Enhances: Market analysis and competitive positioning

### 9. SI.com (https://www.si.com/betting/usa/prop-betting-sites)
- **Data Type**: Best Prop Betting Sites and Apps: Top Platforms for August 2026
- **GSE Integration**:
  - Platform analysis for prop betting
  - Integration: Technology stack and feature benchmarking
  - Enhances: Product development and feature prioritization

### 10. PickFinder (https://www.pickfinder.app/)
- **Data Type**: Ultimate Sports & E-Sports Analytical Tool
- **GSE Integration**:
  - Cross-sport analytics (see optimizer sites above)
  - Integration: Analytical framework expansion

### 11. Covers.com (https://www.covers.com/betting/nfl-prop-bets)
- **Data Type**: Best Prop Betting Sites & Apps in Aug. 2026
- **GSE Integration**:
  - NFL-specific prop betting analysis
  - Integration: NFL prop market intelligence and trends
  - Enhances: NFL-focused prop modeling

### 12. OddsJam (https://fantasy.oddsjam.com/fantasy-odds/prizepicks)
- **Data Type**: Fantasy Optimizer - Prizepicks
- **GSE Integration**:
  - Prizepicks-specific optimization and projections
  - Integration: Specialized prop type handling (Prizepicks format)
  - Enhances: Prop type diversification capabilities

### 13. Daily Grind Fantasy (https://dgfantasy.com/)
- **Data Type**: Best Prizepicks Tools
- **GSE Integration**:
  - Prizepicks-focused tools and analysis
  - Integration: Specialized Prizepicks prop handling
  - Enhances: Alternative prop format support

### 14-20. Major Sportsbooks
**Sportsbooks Mentioned**: BetMGM, bet365, Fanatics Sportsbook, Caesars Sportsbook, DraftKings, FanDuel, ESPN Bet

- **Data Type**: Sportsbook prop offerings, odds, and markets
- **GSE Integration**:
  - Primary source for prop market odds and lines
  - Integration: Existing odds ingestion already handles many of these
  - Enhancement: Additional prop-specific fields and metadata
  - Current system: `packages/data-ingestion/src/odds-api-client.ts` etc.
  - Opportunity: Extend to capture more prop-specific markets

---

## TECHNICAL IMPLEMENTATION ROADMAP

### Phase 1: Assessment and Planning (Week 1)
1. **Data Source Evaluation**
   - Audit each site for API availability, data structure, update frequency
   - Determine compliance and terms of service for each source
   - Categorize by data type: odds, props, projections, news, analytics

2. **Architecture Review**
   - Review existing data ingestion patterns in `packages/data-ingestion/src/`
   - Examine source registry patterns in `source-registry.ts`
   - Study prediction engine integration points
   - Identify minimal viable integration patterns

### Phase 2: Pilot Integrations (Weeks 2-3)
1. **High-Value, Low-Complexity Targets**
   - Start with free, well-documented APIs that align with existing patterns
   - Examples: Additional ESPN endpoints, free prop APIs, open data sources

2. **Implementation Pattern**
   - Create new client in `packages/data-ingestion/src/` (e.g., `newsource-client.ts`)
   - Follow existing patterns: `noStoreFetch`, proper typing, error handling
   - Add to source registry with appropriate licensing and attribution
   - Create corresponding tests in `__tests__/` directory
   - Integrate with prediction engine where appropriate

3. **Initial Integration Targets**
   - **Props.Cash**: Analytics API for prop probability enhancements
   - **PlayerProps.ai**: AI prop predictions as independent estimator
   - **FantasyLabs**: Projection data for model validation
   - **Outlier.bet**: Trend signals for adjustment factors

### Phase 3: Core Integrations (Weeks 4-6)
1. **High-Value Targets**
   - Sites providing unique data types not currently covered
   - Sites with strong alignment to GSE's edge detection thesis

2. **Integration Examples**
   - **SaberSim**: Projection data for player baseline enhancement
   - **RotoWire**: News-driven adjustment factors
   - **V12 DFS**: Natural language query interface exploration
   - **Stokastic**: Ownership data for contrarian plays (if budget approved)

### Phase 4: Advanced Features and Optimization (Weeks 7-8)
1. **Ensemble Methods**
   - Combine multiple independent estimators for improved accuracy
   - Implement weighted averaging based on historical performance
   - Create confidence intervals from multiple data sources

2. **Edge Detection Enhancements**
   - Use diverse data sources to identify market inefficiencies
   - Implement cross-validation between independent estimators
   - Enhance CLV calculations with multi-source closing lines

3. **Performance Attribution**
   - Track which data sources contribute most to profitable edges
   - Implement source-specific performance tracking
   - Optimize resource allocation based on source ROI

### Phase 5: Production Readiness and Validation (Ongoing)
1. **Verification Protocols**
   - Implement reproducibility checks for all integrated sources
   - Create audit trails for data lineage and transformation
   - Establish false positive detection and correction mechanisms

2. **Documentation and Knowledge Transfer**
   - Update `docs/` with integration patterns and source documentation
   - Create runbooks for source maintenance and troubleshooting
   - Train team on new integration patterns and validation procedures

---

## INTEGRATION PATTERNS AND BEST PRACTICES

### Data Ingestion Client Pattern
Following the existing pattern in `packages/data-ingestion/src/`:
```typescript
// Example: newsource-client.ts
import type { RelevantGSEType } from "@sports/types";
import { noStoreFetch } from "./no-store-fetch.js";

const NEW_SOURCE_BASE = "https://api.newsource.com";

export interface NewSourceData {
  // Define the data structure returned by the API
  // Map to existing GSE types where possible
}

export class NewSourceClient {
  static async fetchData(params): Promise<NewSourceData[]> {
    // Implement using noStoreFetch for consistency
    // Handle errors gracefully (soft-fail to empty array/null)
    // Apply any necessary data normalization/transformation
    // Return data in GSE-compatible format
  }
}
```

### Source Registry Integration
Following the pattern in `packages/data-ingestion/src/source-registry.ts`:
```typescript
// Add to SOURCE_REGISTRY
"newsource": {
  license: { spdx: "CC-BY-4.0" }, // or appropriate license
  attributionRequired: true,
  commercialUse: true, // verify from ToS
  attributionText: "Data provided by NewSource",
  // Add any additional metadata required
}
```

### Prediction Engine Integration Points
Depending on data type:
- **Projections/Tips**: `prediction-engine/src/player-projection.ts`
- **Odds/Lines**: Enhance existing odds ingestion or create new normalizer
- **News/Signals**: `prediction-engine/src/game-context.ts` or similar
- **Analytics**: `prediction-engine/src/analytics/` or new module
- **Independent Estimates**: Compare against existing models in `prediction-engine/src/`

### Testing Pattern
Following existing test patterns in `__tests__/` directories:
```typescript
// Example: newsource-client.test.ts
import { describe, it, expect } from "vitest";
import { NewSourceClient } from "./newsource-client.js";

describe("NewSourceClient", () => {
  it("should fetch and parse data correctly", async () => {
    // Mock API responses
    // Test data transformation
    // Test error handling
    // Test empty response handling
  });
});
```

---

## RISK ASSESSMENT AND MITIGATION

### 1. Data Quality and Reliability
- **Risk**: Inconsistent or low-quality data from new sources
- **Mitigation**: Implement source health checks (`source-health.ts` pattern), 
  gradual rollout with monitoring, fallback to existing sources

### 2. Legal and Compliance Risk
- **Risk**: Violating terms of service or licensing agreements
- **Mitigation**: Strict adherence to source registry, legal review before 
  integration, attribution compliance, non-commercial use where required

### 3. Operational Complexity
- **Risk**: Increased system complexity and maintenance burden
- **Mitigation**: Follow existing patterns strictly, modular design, 
  comprehensive testing, clear documentation

### 4. Performance Impact
- **Risk**: Degraded system performance from additional data sources
- **Mitigation**: Asynchronous processing, caching where appropriate, 
  rate limiting, background workers for non-critical updates

### 5. Signal Noise
- **Risk**: Low signal-to-noise ratio from new data sources
- **Mitigation**: Rigorous backtesting, performance attribution, 
  source-specific weighting based on historical accuracy

---

## SUCCESS METRICS AND EVALUATION CRITERIA

### Short-Term Metrics (Month 1)
- Number of new sources successfully integrated and verified
- Data latency and reliability metrics for each source
- Integration test coverage (>90% for new components)
- Compliance verification completion (100% of new sources)

### Medium-Term Metrics (Months 2-3)
- Performance improvement from new data sources (measured via backtesting)
- Edge detection accuracy improvement with multi-source validation
- Reduction in false positives through cross-source verification
- Attribution accuracy and audit trail completeness

### Long-Term Metrics (Ongoing)
- Sustainable edge generation from integrated data sources
- System stability and reliability with expanded data sources
- Attribution completeness for all displayed predictions
- Continuous improvement through source performance monitoring

---

## RECOMMENDED PRIORITIZATION

### Tier 1: Immediate Opportunities (Weeks 1-2)
1. **Props.Cash** - Analytics API, low complexity, high relevance
2. **PlayerProps.ai** - AI predictions, direct alignment with prop focus
3. **FantasyLabs** - Projection data for model validation
4. **Outlier.bet** - Trend signals for adjustment factors

### Tier 2: High Value Targets (Weeks 3-4)
1. **SaberSim** - Projection data for player baseline enhancement
2. **RotoWire** - News-driven adjustment factors
3. **LineStar** - Lineup construction and export compatibility
4. **PropsBot.AI** - Prop-validation for lineup generation

### Tier 3: Strategic Enhancements (Weeks 5-8)
1. **Stokastic** - Ownership data (budget permitting)
2. **V12 DFS** - Natural language interface exploration
3. **OddsShopper** - Methodological benchmarking
4. **BettingPros** - Expert signal tracking

### Tier 4: Future Considerations
1. **Major Sportsbooks** - Extended prop market coverage
2. **Specialized Prop Sites** - Niche prop type expansion
3. **Cross-Platform Tools** - Multi-sport analytical capabilities
4. **Emerging Prop Markets** - New bet types and formats

---

## CONCLUSION

The 40+ sites researched represent significant opportunity to enhance GSE's capabilities through:
1. **Data Diversity**: Reduced reliance on any single source
2. **Model Validation**: Multiple independent estimators for robust validation
3. **Signal Enrichment**: Additional contextual factors for improved predictions
4. **Edge Detection**: Increased opportunities to identify market inefficiencies
5. **Attribution Strength**: Improved provenance and audit capabilities

By following GSE's existing patterns and principles, these integrations can be performed systematically and safely, enhancing the system's ability to generate verifiable edges while maintaining its core thesis of "calibrated, not just confident" predictions.

The key to success will be selective integration based on data quality, compliance alignment, and demonstrable improvement to GSE's edge detection capabilities, all while maintaining the system's commitment to honesty, verification, and founder-gated decision making.
