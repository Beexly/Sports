# PropFinder & Scores24 UI/UX Benchmark Spec for GSE

- **Date:** 2026-11-15
- **Bucket:** `docs/props/research/2026-11-15/`
- **Benchmark Targets:** `https://propfinder.app/` (PropFinder) + `https://scores24.live/` (Scores24)
- **Status:** WIRE-FIRST MIND INGESTION -- READ-ONLY BENCHMARK & PRODUCT ARCHITECTURE SPEC

---

## 1. PropFinder (`propfinder.app`) Breakdown & GSE Mapping

### 1.1 Observed Product Strengths
1. **Prop-Centric Player Dashboards & Rolling Logs:**
   - Displays individual player cards with multi-window usage splits (`L5`, `L10`, `L15`), snap counts, target shares, and game logs in one dense scannable view.
2. **Defense vs. Position (DvP) Matchup Context:**
   - Evaluates how each opposing defense ranks against specific positions (e.g., WR perimeter vs. slot yardage allowed, RB rushing volume allowed, TE seam production).
3. **Historical Hit-Rate & Cheatsheet Tables:**
   - Surfacing clear hit rates across sliding sample stretches paired with defensive/team cheatsheets makes complex statistical edges scannable in seconds.
4. **Cross-Book Line & Pick'em Shopping:**
   - Side-by-side comparison across DraftKings, FanDuel, BetMGM, and DFS pick'em operators (PrizePicks, Underdog) highlights soft lines immediately.

### 1.2 How GSE Translates This Without Compromising Quantitative Rigor
PropFinder stops at descriptive historical hit rates (which suffer from survivor bias, opponent schedule noise, and stale team-GP denominators). GSE keeps PropFinder's scannable UX layout while powering every cell with strict causal & situational simulation data:

| PropFinder Surface Pattern | GSE Causal & Fail-Closed Upgrade |
|---|---|
| `L5 / L10 / L15` rolling logs | Always divide per-player stats strictly by `player_gp` (active games played), never team games played, so returning injured stars are never diluted. |
| Defense vs. Position (DvP) badge | Pair DvP rank with coaching charting (`man/zone %`, `two-high %`, `blitz %`, primary CB matchup `FP/rt`) and Stage 1-2 trench pressure / weather adjustments. |
| Raw historical hit-rate bars | Render matchup-conditioned projection band (`p25 / median / p90`) + market comparison and `XX/100` grade (NEVER display `XX.X%` win probability percentages; honor anti-percentage guardrail). |
| Multi-book prop comparator | Pair Stage 5 de-vigged fair probability against live consensus / DraftKings prop board (`propBets` paginated full board: `1Q`, `1H`, kicking, IDP tackles/sacks, TDs, longest plays); gate below threshold as strict `PASS`. |

---

## 2. Scores24 (`scores24.live`) Breakdown & GSE Mapping

### 2.1 Observed Product Strengths
1. **Live Match Center Timeline:**
   - Real-time, minute-by-minute score progression, event timeline, and status indicators in a low-latency view.
2. **Pre-Kickoff & In-Game Tactical Lineups + Team Form:**
   - Confirmed starting lineups, recent form streaks, head-to-head history, and live in-game box score metrics.
3. **Targeted Push/Alert Loop:**
   - Event-driven notifications tied to user-tracked games and live scoring milestones.

### 2.2 Integration into GSE Pre-Game -> Live -> Post-Game Workflow
1. **Pre-Game (Stage 0 Starter Lock):** Like Scores24 tactical lineups, GSE Stage 0 verifies active `qb1_starter` and `Out / Doubtful / IR` status 90 minutes pre-kickoff before allowing live slate transitions.
2. **In-Game Learning Loop (`THE LEARNING LOOP`):** Live drive/quarter telemetry maps pre-play expectations (snap pace, pass rate over expectation, pressure rate) against observed game script (`Q1..Q4`) without contaminating closed pre-kickoff pricing.
3. **Mobile & Web Parity (`apps/web`, `apps/mobile`):** Live status badges follow `apps/mobile/scripts/lint-rules.js` and `scripts/trust-gate.mjs` constraints -- compact game-state timelines, zero raw `confidence%`, client-side trust filter only removing stale/adverse rows and never revealing redacted subscriber legs.
