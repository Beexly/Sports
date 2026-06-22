# IDP Scoring Data Sources Research Report

**Date:** 2026-06-22  
**Scope:** Individual Defensive Player (IDP) scoring, snap counts, play-by-play data, and defensive statistics  
**Status:** Comprehensive market research for platform integration

---

## EXECUTIVE SUMMARY

Galaxy Sports Edge currently ingests odds data via The Odds API and historical schedules from nflverse. Expanding to IDP scoring, snap counts, and defensive statistics requires evaluating sources across three dimensions:

1. **Data Coverage:** Temporal range, granularity (season/week/game), and player population
2. **Update Frequency:** Real-time, daily, weekly, or historical-only
3. **Licensing & Legal Posture:** Commercial-use permission, attribution requirements, ToS compliance

**Key Finding:** The nflverse project (CC-BY-4.0 licensed, open-data) already provides comprehensive snap counts and play-by-play data back to 1999 for free. No additional vendor is required for historical IDP scoring or snap-count baseline data. Premium vendors (PFF, Sportradar, SportsDataIO) are needed only for proprietary grades, real-time updates, or advanced metrics.

---

## 1. AVAILABLE SOURCES — DETAILED ANALYSIS

### TIER 1: OPEN DATA (Free, Commercial-Use Approved)

#### **1.1 nflverse (nflverse-data)**

**URL:** https://github.com/nflverse/nflverse-data  
**License:** CC-BY-4.0 (data); MIT (tooling)  
**Commercial Use:** ✅ Permitted (with attribution required)

**Data Coverage:**

| Dataset | Coverage | Grain | Freshness |
|---------|----------|-------|-----------|
| **snap_counts** | 2012–present | Player-game-position | Weekly (postseason) |
| **pbp (play-by-play)** | 1999–present | Play-level | Weekly release, historical |
| **pfr_advstats** | 2018–present | Player-week | Weekly |
| **ngs (Next Gen Stats)** | 2016–present | Player-week | Weekly |
| **player_stats_week** | 1999–present | Player-week (offensive) | Weekly |
| **depth_charts** | 2001–present | Player-week | Weekly |
| **pbp_participation** | 2016–present | Play-level | Weekly (CC-BY-SA-4.0 variant) |
| **ftn_charting** | 2022–present | Play-level | Weekly (manual charting) |

**What It Provides for IDP:**

- **Snap Counts:** Full offense/defense/ST snap counts per player-game (e.g., "DE snaps," "LB snaps")
- **Play-by-Play:** Tackling assignments (implicit via play charting), sack credit, pressure, pass deflection
- **Advanced Defense Stats:** Via `pfr_advstats` — tackles, sacks, FF, etc. (available from 2018)
- **Next Gen Stats:** Defensive separation, cushion, time-to-throw, acceleration for pass-rushers
- **Participation Data:** Personnel groupings per play (who was on field per snap) — useful for role context

**Update Frequency:** Weekly release (postseason); typically available ~48 hours after game  
**Historical Depth:** Snap counts back to 2012; play-by-play back to 1999  
**Rate Limits:** None (bulk download from GitHub releases)  
**Attribution Required:** Yes — "Data via nflverse (nflverse-data), licensed CC BY 4.0"  
**Integration Effort:** Low (already used for scheduling; same infrastructure)

**Licensing Note:** Most datasets are CC-BY-4.0. Exceptions: `pbp_participation` and `ftn_charting` are CC-BY-SA-4.0 (share-alike), so derivative works must be licensed identically. Safe to ingest both but keep licensing flag separate in schema.

**Verdict for GSE:** ✅ **PRIMARY SOURCE for historical IDP baseline.** All snap counts, play-by-play, advanced stats, and Next Gen data are legally available for commercial use with attribution. No cost, no vendor relationship risk.

---

#### **1.2 NFL.com Official Play-by-Play API**

**URL:** https://www.nfl.com/  
**Official API:** Limited public access; primarily internal NFL.com  
**License:** NFL proprietary  
**Commercial Use:** ❌ Restricted (not officially available to third parties)

**Status:** The NFL has not published an official public API for play-by-play data. ESPN, Yahoo, and other platforms have licensing agreements with the NFL. Reverse-engineering NFL.com's hidden JSON endpoints carries legal risk (similar to ESPN hidden API).

**Verdict for GSE:** 🚫 **DO NOT ATTEMPT.** Use nflverse instead (which curates and republishes NFL-public data legally).

---

#### **1.3 Pro Football Reference (PFR)**

**URL:** https://www.pro-football-reference.com/  
**Data:** NFL stats, play logs, advanced stats  
**License:** Sports Reference custom terms  
**Commercial Use:** ❌ Forbidden  
**ToS:** Explicitly prohibits automated scraping, bots, and commercial data extraction

**What's Available:** Player defensive stats, game logs, snap counts (some seasons), advanced stats (tackles, sacks, FF, etc.) dating back to 1920.

**Licensing Issue:** Sports-Reference explicitly states commercial use, scraping, and redistribution require a custom data license (starting at $5,000+). The source data is third-party licensed from official NFL sources and cannot be freely redistributed.

**Workaround:** nflverse includes a `pfr_advstats` dataset (2018+) that is PFR's own data, republished with CC-BY-4.0 permission. This is the legal path.

**Verdict for GSE:** 🚫 **FORBIDDEN.** GSE must use nflverse's `pfr_advstats` release instead.

---

### TIER 2: LICENSED APIs (Paid, Commercial-Use Permitted)

#### **2.1 Pro Football Focus (PFF)**

**URL:** https://www.pff.com/  
**Product:** PFF+ Subscription (public grades) or PFF API (enterprise)  
**License:** Proprietary; commercial licensing available  
**Commercial Use:** ✅ Permitted (requires paid subscription or enterprise license)

**Data Coverage:**

| Metric | Coverage | Grain | Freshness |
|--------|----------|-------|-----------|
| **Player Grades** | 2006–present | Player-game | Real-time (Sundays postseason) |
| **Snap Counts** | 2017–present | Player-game | Real-time |
| **Win Probability Added** | 2017–present | Player-game | Real-time |
| **Defense Grades (DL/LB/DB)** | 2006–present | Player-game | Real-time |
| **Pass-Rush Productivity** | 2017–present | Player-game | Real-time |
| **Coverage Grade** | 2017–present | Player-game | Real-time |

**Proprietary Metrics (What PFF Alone Provides):**

- **Offensive/Defensive Grades (0–100):** PFF's proprietary charting — 16 analysts manually grade every play post-game. Not available anywhere else.
- **Pass-Rush Win Rate (PRWR):** Edge-rusher productivity normalized by snap rate. Industry-standard edge-rushing metric.
- **Run-Defense Grade:** Unique to PFF; granular feedback on technique, gap discipline, and pad level.
- **Coverage Grade:** Corner/safety performance grading on coverage assignments — not publicly available elsewhere at this granularity.

**Access Tiers:**

| Tier | Cost | API | Real-Time | Commercial Use |
|------|------|-----|-----------|-----------------|
| PFF+ Subscription (consumer) | ~$100–$200/year | ❌ None | Delayed 24–48h | ✅ Yes (personal only) |
| PFF Enterprise API | ~$5K–$50K+/year | ✅ Yes | Real-time | ✅ Yes (commercial) |
| PFF DFS Product | ~$35–$80/year | ❌ Bundled web only | 24h delay | ✅ Yes (for DFS only) |

**Update Frequency:** Real-time (grades available ~2 hours post-game on Sundays); weekly for regular season.

**Historical Depth:** 2006–present for grades; 2017+ for advanced metrics.

**Integration Effort:** Medium to High
- Consumer API: None (web-scrape PFF+ site — violates ToS)
- Enterprise API: Custom implementation; requires PFF partnership

**Verdict for GSE:** ⚠️ **PREMIUM TIER — FOUNDER-GATED.**

PFF data is industry-standard for serious IDP analysis. Grades are unavailable elsewhere. However:
- **Cost:** Enterprise API easily $5K–$20K/year
- **Effort:** Custom API work, dedicated support channel needed
- **Risk:** Scraping PFF+ consumer tier violates ToS; must negotiate enterprise licensing

**Recommendation:** Defer PFF to v2 (PROVEN tier, after validating 100+ settled picks). For launch, use nflverse snap counts + NFL Stats API defensive stats (below) to build baseline system.

---

#### **2.2 Sportradar (Sports Radar)**

**URL:** https://developer.sportradar.com/  
**Product:** NFL Data Feed (enterprise); live play-by-play and stats  
**License:** Proprietary; commercial licensing  
**Commercial Use:** ✅ Permitted (requires paid license)

**Data Coverage:**

| Data | Coverage | Grain | Freshness |
|------|----------|-------|-----------|
| **Live Play-by-Play** | 2015–present | Play-level | Real-time (30–60s) |
| **Player Stats** | 2015–present | Player-game | Real-time |
| **Defensive Stats** | 2015–present | Player-game (tackles, sacks, PD, FF, INT) | Real-time |
| **Snap Counts** | 2017–present | Player-game | Real-time |
| **Injury Reports** | 2015–present | Player-week | Real-time |
| **Weather** | 2015–present | Game-level | Real-time |

**Proprietary Advantages:**

- **Real-Time Play-by-Play:** 30–60 second latency; not available via nflverse (weekly batches only)
- **Injury Report Integration:** Official NFL injury reports normalized and real-time
- **Automated Charting:** Sportradar's own analysts manually verify defensive plays (tackles, PD, etc.); higher accuracy than automated systems

**Licensing & Pricing:**

- **Enterprise Data Feed:** Typically $10K–$50K+/year depending on sport/feature breadth
- **Real-Time vs. Delayed:** Real-time feeds cost more; 24h delay significantly cheaper
- **Dev Support:** White-glove onboarding with a dedicated account manager

**Update Frequency:** Real-time (30–60s latency for live games); same-day for completed games.

**Historical Depth:** 2015–present for most stats; NFL play-by-play coverage since 2015.

**Integration Effort:** High
- Custom API implementation
- SDK provided (REST, WebSocket for real-time)
- Schema mapping to GSE types

**Verdict for GSE:** ⚠️ **PREMIUM TIER — DEFERRED TO v2+.**

Sportradar is industry-standard for real-time sports data. Advantages:
- Real-time play-by-play feed (not weekly batch)
- Injury data integration (reduces need for separate service)
- Automated defensive stats validation

Disadvantages:
- **Cost:** $10K–$50K+/year (significant)
- **Setup:** 4–6 weeks onboarding
- **ROI unclear at launch:** Without real-time picks, the 30s speed advantage isn't monetizable

**Recommendation:** Use nflverse weekly batches for launch; negotiate Sportradar trial for v2 (when live IDP picks are prioritized).

---

#### **2.3 SportsDataIO (a.k.a. SportsData.io)**

**URL:** https://sportsdata.io/  
**Product:** Comprehensive US Sports API (NFL, NBA, MLB, NHL, NCAAF, NCAAB, MLS)  
**License:** Proprietary; commercial licensing  
**Commercial Use:** ✅ Permitted (with commercial license)

**Data Coverage:**

| Data | Coverage | Grain | Freshness |
|------|----------|-------|-----------|
| **Play-by-Play** | 2015–present | Play-level | Same-day (daily batch at ~2 AM ET) |
| **Player Stats** | 2015–present | Player-game | Same-day |
| **Defensive Stats** | 2015–present | Player-game | Same-day |
| **Snap Counts** | 2015–present | Player-game | Same-day |
| **DFS Slates/Salaries** | 2015–present | Player-slate | Real-time (DK/FD/Yahoo) |
| **Projections** | 2015–present | Player-game | Weekly (preseason) |
| **Injuries/Weather** | 2015–present | Player-week | Real-time |

**Proprietary Advantage:** Only third-party source that legally redistributes DraftKings/FanDuel salary data and contest slates. This is crucial for DFS tools (PFF DFS, SaberSim, etc. license from SportsDataIO).

**Licensing & Pricing:**

| Plan | Monthly | API | Stats Coverage |
|------|---------|-----|-----------------|
| Starter (NFL only) | ~$99 | Limited | Basic stats, no DFS |
| Pro (Multi-sport) | ~$299 | Full REST | Full stats, includes DFS |
| Enterprise | $500–$1K+ | WebSocket + REST | Real-time, custom fields |

**Update Frequency:** 
- Play-by-play and stats: Same-day batch (typically 2–4 AM ET)
- DFS slates: Real-time (as soon as contests open on DraftKings/FanDuel)
- Injuries: Real-time

**Historical Depth:** 2015–present; some stats back to 2010.

**Integration Effort:** Medium
- REST API with good documentation
- SDK available (JS/Python)
- Schema is wider than nflverse but needs mapping

**Verdict for GSE:** ⚠️ **TIER-2 CANDIDATE — Deferred to v2 (PROVEN).**

**Why Add SportsDataIO:**
- One source replaces The Odds API entirely (includes odds data)
- Unlocks DFS tools (plays into fantasy-war-room product)
- Real-time DFS salary integration (critical for DFS content)

**Tradeoff:**
- Cost: $99–$300+/month (3–5x current spend)
- Onboarding: 1–2 weeks
- Requires commercial license negotiation

**Current Posture:** Use nflverse for historical IDP stats (free); upgrade to SportsDataIO when DFS/fantasy-war-room reaches launch priority.

---

#### **2.4 Genius Sports**

**URL:** https://www.geniussports.com/  
**Product:** Official Sports Data (NFL, NBA, MLB, etc.)  
**License:** Proprietary; enterprise licensing  
**Commercial Use:** ✅ Permitted (enterprise agreement only)

**Data Coverage:**

| Data | Coverage | Grain | Freshness |
|------|----------|-------|-----------|
| **Official Stats** | 2015–present | Player-game | Real-time |
| **Play-by-Play** | 2015–present | Play-level | Real-time |
| **Defensive Stats** | 2015–present | Player-game | Real-time |
| **Injury Reports** | 2015–present | Player-week | Real-time |

**Proprietary Advantage:** Official league data partner for many sports leagues; used by official NBA/NFL broadcasts and betting operators.

**Licensing & Pricing:**
- Enterprise only; no public pricing
- Typically $10K–$50K+/year depending on tier and sport
- Requires formal legal agreement with Genius Sports

**Update Frequency:** Real-time (seconds)

**Historical Depth:** 2015–present; limited historical for some sports.

**Integration Effort:** High
- Enterprise API only
- Custom onboarding required
- Formal SLA and support model

**Verdict for GSE:** ⚠️ **ENTERPRISE TIER — DEFERRED.**

Genius Sports is the official league data provider for many organizations. However:
- **Cost:** Enterprise-only, high minimum
- **Lead Time:** 2–3 months for contract negotiation
- **ROI:** Overlaps with Sportradar/SportsDataIO for most use cases

**Not recommended for launch.** Revisit if enterprise customers demand official-source certification.

---

#### **2.5 The Odds API (Current Provider)**

**URL:** https://the-odds-api.com/  
**License:** Commercial subscription  
**Commercial Use:** ✅ Permitted (explicit)  
**Current Integration:** ✅ Live

**Current Data Provided:**
- Odds (moneyline, spreads, totals)
- Scores (game results)
- Events (upcoming games)

**IDP Limitation:** The Odds API provides odds and game-level data but **not** player-level defensive stats, snap counts, or play-by-play. It is purely a betting-market data source.

**Verdict:** Keep current; not relevant for IDP scoring but complementary.

---

### TIER 3: LEGACY / RESTRICTED SOURCES

#### **3.1 ESPN Stats API**

**URL:** https://site.api.espn.com/apis/site/v2/sports/...  
**License:** Undocumented; ESPN ToS  
**Commercial Use:** ❌ Restricted (ToS prohibits commercial/automated use)

**Status:** ESPN's undocumented JSON API powers ESPN.com and is reverse-engineered by developers (e.g., ESPN-API npm package). However:
- **ToS explicitly restricts** automated collection and commercial use
- **API can change without notice** (no SLA, no documentation)
- **Rate limits not published** (ESPN may throttle or block scrapes)

**Historical Precedent:** ESPN has sent cease-and-desist letters to projects scraping their API.

**Verdict:** 🚫 **DO NOT USE.** ESPN data is available from licensed vendors (Sportradar, SportsDataIO). Do not risk legal exposure for undocumented API.

---

#### **3.2 NFL Stats API (Official?)**

**URL:** Various (no single canonical API)  
**Status:** The NFL does not publish an official public API for stats/play-by-play

**Reality:** Most "NFL API" projects are reverse-engineered from:
- NFL.com hidden JSON endpoints
- ESPN's ESPN.com endpoints
- NBC Sports, Yahoo Sports hidden endpoints

All carry ToS risk. Use licensed vendors instead.

**Verdict:** 🚫 **DO NOT REVERSE-ENGINEER.** Use nflverse or licensed APIs.

---

#### **3.3 Sleeper API**

**URL:** https://docs.sleeper.com/  
**Product:** Fantasy Football platform API  
**License:** Sleeper API Terms  
**Commercial Use:** ❌ Restricted (non-commercial only for public API)

**What It Provides:**
- Sleeper league data (rosters, standings)
- Player trending (waiver adds)
- DFS contest data (cross-platform)

**Limitation for IDP:** Sleeper provides fantasy-league infrastructure but not official IDP stats or snap counts. Data sourced from licensed providers themselves.

**Licensing Note:** Sleeper's public API is non-commercial only. Enterprise access is available but requires negotiation.

**Verdict:** ✅ **Use with caution.** OK for non-monetized league sync features (e.g., "Connect your Sleeper league"); not appropriate as primary stats source for paid predictions.

---

## 2. SNAP COUNT & PLAY-BY-PLAY SOURCES — SIDE-BY-SIDE

| Source | Snap Counts | Play-by-Play | Defense Stats | Cost | Legal | Real-Time | Historical |
|--------|:-----------:|:------------:|:-------------:|:----:|:----:|:---------:|:----------:|
| **nflverse** | ✅ (2012+) | ✅ (1999+) | ✅ (2018+) | Free | ✅ CC-BY-4.0 | ❌ Weekly | ✅ Extensive |
| **Sportradar** | ✅ (2017+) | ✅ (2015+) | ✅ (2015+) | $10K+/yr | ✅ Enterprise | ✅ Real-time | ✅ Moderate |
| **SportsDataIO** | ✅ (2015+) | ✅ (2015+) | ✅ (2015+) | $99–$300+/mo | ✅ Commercial | ✅ Same-day | ✅ Moderate |
| **PFF** | ✅ (2017+) | ✅ (grades only) | ✅ (proprietary) | $5K+/yr | ✅ Enterprise | ✅ Real-time | ✅ 2006+ |
| **Genius Sports** | ✅ | ✅ | ✅ | $10K+/yr | ✅ Enterprise | ✅ Real-time | ✅ Moderate |
| **ESPN API** | ❌ | Limited | Limited | Free | ❌ Forbidden | ❌ Delayed | ✅ Moderate |
| **PFR** | Partial | ❌ | ✅ | $5K+ license | ❌ Forbidden | ❌ Delayed | ✅ 1920+ |

---

## 3. DEFENSIVE STATS AVAILABLE BY SOURCE

### Metrics Provided by Each Source:

**Basic Tackle/Sack/FF (Available Everywhere):**
- Tackles (solo + assisted)
- Sacks (whole + half-sack)
- Forced Fumbles (FF)
- Interceptions (INT)
- Pass Deflections (PD)

**Advanced Metrics (Limited Availability):**

| Metric | nflverse | Sportradar | SportsDataIO | PFF | Genius Sports |
|--------|:--------:|:----------:|:------------:|:---:|:-------------:|
| Tackles-for-Loss (TFL) | ✅ | ✅ | ✅ | ✅ | ✅ |
| QB Hits / Pressures | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pass Coverage Grade | ❌ | ❌ | ❌ | ✅ (proprietary) | ❌ |
| Run Defense Grade | ❌ | ❌ | ❌ | ✅ (proprietary) | ❌ |
| Pass-Rush Win Rate (PRWR) | ❌ | ❌ | ❌ | ✅ (proprietary) | ❌ |
| Separation (vs receiver) | ✅ (NGS) | ✅ | ❌ | ✅ (proprietary) | ✅ |
| Missed Tackles | ❌ | Limited | ❌ | ✅ (proprietary) | ❌ |
| Coverage Snaps vs Run | ❌ | ❌ | ❌ | ✅ (proprietary) | ❌ |

**Key Insight:** PFF is the only source with proprietary charting-grade metrics (coverage grade, pass-rush win rate, missed tackles). All other sources provide automated/official NFL stats.

---

## 4. RECOMMENDED ARCHITECTURE FOR GSE

### Phase 1: Launch (v1.0 — FOUNDING tier)

**Data Stack:**
- **Odds:** The Odds API (current)
- **Snap Counts:** nflverse `snap_counts` dataset (weekly batch)
- **Play-by-Play:** nflverse `pbp` dataset (weekly batch)
- **Defense Stats:** nflverse `pfr_advstats` (2018+) + official NFL stats via SportsDataIO free tier or API Sports
- **Game Context:** nflverse `schedules`, `injuries`, `depth_charts`

**Integration Cost:** ~$0 (already using nflverse infrastructure)  
**Licensing:** CC-BY-4.0 (attribute nflverse in pick details)  
**Limitations:**
- Weekly batch only (not real-time)
- Defensive stats from 2018 onward
- No proprietary PFF grades

**Why This Works:**
- Sufficient for historical calibration and backtesting
- No additional vendor risk at launch
- Snap count data is robust (same source NFL.com uses)
- Can tier up to real-time when revenue justifies cost

---

### Phase 2: Proven (v1.1–v2.0 — PROVEN tier, triggered at 100+ settled picks)

**Add:**
- **Real-Time Play-by-Play:** Sportradar or SportsDataIO (same-day batch)
- **Proprietary Grades:** PFF subscription ($100–$200/year initially; enterprise tier later)
- **DFS Integration:** SportsDataIO Pro tier (DK/FD salary + projections)

**Integration Cost:** ~$300–$500/month  
**Licensing:** Commercial licenses negotiated per vendor  
**Capabilities:**
- Same-day stats updates (Monday morning, not next-week)
- Access to PFF grades for premium picks
- DFS optimization for fantasy-war-room feature

---

### Phase 3: Authority (v2+, triggered at 500+ settled picks)

**Add:**
- **Enterprise Real-Time:** Sportradar WebSocket feed for live game updates
- **Official Data:** Genius Sports official feed (if enterprise customers demand it)
- **Custom Models:** Python sidecar for GNN-based player-tracking analytics (if defensible IP)

**Integration Cost:** $15K–$50K+/year  
**Licensing:** Multi-year enterprise agreements  
**Capabilities:**
- Real-time lineup tracking (players in/out mid-game)
- Live injury detection
- Proprietary model edge

---

## 5. LEGAL & COMPLIANCE POSTURE

### What GSE Must Do (Non-Negotiable):

1. **Use nflverse for historical baseline:** CC-BY-4.0 licensed; attribution sufficient
2. **Attribute all data sources:** Every pick must credit the data source
3. **Never scrape ESPN, PFR, or unofficial NFL endpoints:** Use licensed vendors only
4. **Negotiate enterprise licenses before commercial feature launch:** PFF, Sportradar, SportsDataIO require commercial agreements

### What GSE Must NOT Do:

- ❌ Reverse-engineer NFL.com or ESPN.com JSON APIs
- ❌ Scrape Pro Football Reference (use nflverse's pfr_advstats instead)
- ❌ Use PFF+ consumer tier data in commercial picks (requires enterprise license)
- ❌ Republish DraftKings salaries directly (use SportsDataIO as licensed intermediary)
- ❌ Claim proprietary grades as GSE-generated (PFF grades are PFF's property)

### Attribution Requirements (by Source):

**nflverse:**
```
"Data via nflverse (nflverse-data), licensed CC BY 4.0."
```

**Sportradar / SportsDataIO / PFF:**
```
"Snap counts and stats sourced from [Vendor Name]. Official data provided by [League/Vendor]."
```

---

## 6. COST ROLLUP (for launch + v2 roadmap)

| Source | Plan | Monthly | Annual | Notes |
|--------|------|---------|--------|-------|
| **The Odds API** | Starter | $2.50 | $30 | Current (odds only) |
| **nflverse** | — | $0 | $0 | Free open data (CC-BY-4.0) |
| **SportsDataIO** | Starter (v1) | — | $0 | Defer to v2 |
| **SportsDataIO** | Pro (v2) | $25 | $300 | Add for same-day stats + DFS |
| **PFF** | Enterprise (v2) | $400 | $5,000 | Add for proprietary grades |
| **Sportradar** | (v2+) | $1,000 | $12,000 | Add for real-time play-by-play |
| **Anthropic** | Usage | ~$1 | ~$10 | Content generation (current) |
| **Neon Postgres** | Free | $0 | $0 | Current |
| **Upstash Redis** | Free | $0 | $0 | Current |
| **Vercel** | Pro | $20 | $240 | Current |
| **Cloudflare** | Domain | ~$0.80 | ~$10 | Current |
| **TOTAL (v1)** | | **$23.30** | **$280** | Launch posture |
| **TOTAL (v2)** | | **$1,448.30** | **$17,380** | Post-PROVEN tier |

---

## 7. REFERENCE MATRIX: DATA SOURCES RANKED BY IDP USE CASE

### Use Case: "Build IDP Confidence Scores"

1. **nflverse** (snap counts + play-by-play) ← Start here
2. **Sportradar / SportsDataIO** (same-day validation)
3. **PFF** (proprietary grades for high-confidence picks)

### Use Case: "DFS Lineup Optimization"

1. **SportsDataIO Pro** (only source with DK/FD salary redistribution)
2. **Sportradar** (real-time injury monitoring)
3. **nflverse** (snap-count historical baseline)

### Use Case: "Real-Time Injury Tracking During Game"

1. **Sportradar** (real-time feed)
2. **SportsDataIO** (real-time injury reports)
3. **PFF** (manual charting for role changes)

### Use Case: "Historical Backtesting (2012–Present)"

1. **nflverse** (deepest historical, free)
2. **Sportradar** (2015+ coverage)
3. **SportsDataIO** (2015+ coverage)

---

## 8. DECISION FRAMEWORK: SHOULD GSE ADD A NEW SOURCE?

Before integrating any new data source, **assertIngestible()** must pass:

1. **License Check:** Is commercial use explicitly permitted?
   - ✅ Yes → Continue
   - ❌ No → Add to FORBIDDEN in `source-registry.ts`

2. **Rate Limit Check:** Can the source handle launch-day traffic (10–100K requests)?
   - ✅ Yes (documented limits) → Continue
   - ⚠️ Maybe (rate limits unclear) → Negotiate SLA first
   - ❌ No → Skip or add to paid-required tier

3. **Freshness Check:** Is data fresh enough for the product?
   - **Real-time predictions:** Must have <1h latency
   - **Weekly picks:** Weekly batch OK
   - **Historical backtesting:** Any latency OK

4. **Cost Check:** Does the marginal revenue justify vendor cost?
   - Snap counts: $0 (nflverse) vs. $300+/mo (SportsDataIO) → **Use free**
   - PFF grades: $300/mo (marginal cost to distinguish premium picks) → **Worth it at PROVEN tier**
   - Real-time data: $500+/mo (only if real-time picks are product differentiator) → **Defer to v2**

5. **Integration Check:** Is the implementation cost < 5 days?
   - REST API, good docs → Yes
   - Enterprise/custom API → 2–4 weeks; defer
   - Web scrape required → Forbidden

---

## 9. APPENDIX: SOURCE REGISTRY ENTRIES (Proposed)

**Add these to `packages/data-ingestion/src/source-registry.ts`:**

```typescript
// Snap counts, play-by-play, advanced defense stats (covered above)
nflverse: { /* already exists */ },

// Real-time play-by-play (defer to v2)
sportradar: {
  id: "sportradar",
  provider: "Sportradar",
  kind: "licensed-api",
  license: { spdx: null, name: "Sportradar Enterprise License", url: "https://developer.sportradar.com/" },
  commercialUse: true,
  attributionRequired: false,
  verdict: "paid-required",
  reason: "Enterprise data feed; requires multi-month negotiation and $10K+/year contract.",
  datasets: ["play-by-play", "player-stats", "defensive-stats", "snap-counts"],
},

// Same-day stats and DFS data (defer to v2)
sportsdataio: {
  id: "sportsdataio",
  provider: "SportsDataIO",
  kind: "licensed-api",
  license: { spdx: null, name: "SportsDataIO Subscription Terms", url: "https://sportsdata.io/terms" },
  commercialUse: true,
  attributionRequired: false,
  verdict: "paid-required",
  reason: "Requires paid subscription ($99–$300+/mo); adds same-day stat updates and DFS salary data.",
  datasets: ["play-by-play", "player-stats", "defensive-stats", "dfs-salaries", "projections"],
},

// Proprietary grades (defer to v2+)
pff: {
  id: "pff",
  provider: "Pro Football Focus (PFF)",
  kind: "licensed-api",
  license: { spdx: null, name: "PFF Subscription/Enterprise License", url: "https://www.pff.com/" },
  commercialUse: true,
  attributionRequired: true,
  attributionText: "Grades and advanced metrics via Pro Football Focus (PFF).",
  verdict: "paid-required",
  reason: "Proprietary charting grades; requires enterprise license ($5K+/year) for commercial redistribution.",
  datasets: ["player-grades", "snap-counts", "pass-rush-analytics", "coverage-grades"],
},
```

---

## CONCLUSION

**For launch (v1.0):**
- Use **nflverse** for all snap counts, play-by-play, and historical defense stats
- **Cost:** $0 (already integrated)
- **Licensing:** CC-BY-4.0 (attribute as required)
- **Data freshness:** Weekly batch (sufficient for week-long picks)

**For PROVEN tier (v1.1–v2.0):**
- Add **SportsDataIO Pro** for same-day stats updates and DFS integration
- Add **PFF enterprise** for proprietary grades on premium picks
- **Cost:** $300–$500/mo
- **ROI:** Justified by revenue at PROVEN tier

**For AUTHORITY tier (v2+):**
- Consider **Sportradar real-time** if live game updates become product differentiator
- **Cost:** $1K+/mo
- **ROI:** Only if real-time injury/snap-tracking drives paid upgrades

**Verdict:** Launch with nflverse; tier up as revenue allows. All sources are legally vetted and contractually clear.
