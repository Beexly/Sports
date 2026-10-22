# Reverse Engineering Deep Dive: nflverse, Betalytics, Scores24, and REA Architecture

**Dossier Date:** 2026-10-21  
**Target Systems:**  
1. `nflverse.r-universe.dev/nflreadr` & `nflfastr.com` (Direct Parquet Data Pipelines)  
2. `betalytics.com/app` & `betalytics.com/sports/nfl` (Projection Engine & Edge Grading)  
3. `scores24.live` (Live In-Play Odds & Event Feeds)  
4. `github.com/morluto/rea` (Reverse Engineer Anything Framework)  
**Classification:** Class-A Data Sources & Competitive Architecture Reverse Engineering  
**Application:** Galaxy Sports Edge (GSE) Omni-Cognitive Ingestion, Reasoning, and Market Exploitation Core  

---

## 1. Executive Summary & Strategic Positioning

To achieve sovereign predictive superiority over the betting market and fantasy/DFS ecosystem, GSE does not operate on secondhand summaries or lagging commercial black boxes. We reverse engineer the underlying architectures of industry data providers and analytics platforms to identify:
1. **Unthrottled Raw Ingestion Pipelines:** Accessing upstream source data at zero cost and zero latency.
2. **Model Blind Spots & Vulnerabilities:** Exploiting the naive mathematical simplifications used by commercial services (such as Betalytics and Scores24).
3. **Automated Reverse-Engineering Workflows:** Deploying REA (Reverse Engineer Anything) to passively trace APIs, decompile closed web apps, and extract live data pipelines.

```
       ┌─────────────────────────────────────────────────────────────┐
       │             REA (Reverse Engineer Anything)                 │
       │   Passive Tracing • Network Interception • AST Extraction   │
       └──────────────────────────────┬──────────────────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         ▼                            ▼                            ▼
┌─────────────────┐          ┌─────────────────┐          ┌─────────────────┐
│ nflverse /      │          │ Betalytics      │          │ Scores24        │
│ nflfastR        │          │ Architecture    │          │ Live Feed       │
│ Parquet Stream  │          │ Blind Spots     │          │ In-Play Engine  │
└────────┬────────┘          └────────┬────────┘          └────────┬────────┘
         │                            │                            │
         ▼                            ▼                            ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                     Galaxy Sports Edge (GSE) Core                         │
│  Layer 1 (Sharp Market Close) + Layer 2 (Causal Omni-Cognitive Reasoning) │
│  • HTTPS Parquet Stream (0 API Cost)                                      │
│  • Causal Do-Calculus & Copula SGP (Exceeds Betalytics Point Models)     │
│  • Sub-Second In-Play Win Probability (Exceeds Scores24 Trend Feeds)      │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 2. nflverse & nflfastR Reverse Engineering: The HTTPS Parquet Stream

### Upstream Infrastructure Architecture
Rather than scraping web tables or consuming rate-limited REST APIs, the entire `nflverse` and `nflreadr` infrastructure is backed by continuous, versioned release assets published on GitHub:
- **Host Repository:** `https://github.com/nflverse/nflverse-data/releases/`
- **Native Data Encoding:** Apache Parquet with Snappy/ZSTD column-oriented compression.
- **Direct Parquet Endpoint URLs:**
  - `play_by_play`: `https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_{year}.parquet`
  - `player_stats`: `https://github.com/nflverse/nflverse-data/releases/download/player_stats/player_stats_{year}.parquet`
  - `participation`: `https://github.com/nflverse/nflverse-data/releases/download/pbp_participation/pbp_participation_{year}.parquet`
  - `ftn_charting`: `https://github.com/nflverse/nflverse-data/releases/download/ftn_charting/ftn_charting_{year}.parquet`
  - `nextgen_stats`: `https://github.com/nflverse/nflverse-data/releases/download/nextgen_stats/ngs_{passing|rushing|receiving}_{year}.parquet`
  - `injuries`: `https://github.com/nflverse/nflverse-data/releases/download/injuries/injuries_{year}.parquet`
  - `depth_charts`: `https://github.com/nflverse/nflverse-data/releases/download/depth_charts/depth_charts_{year}.parquet`

### GSE Engineering Improvement: Direct Zero-Disk HTTPS Stream
By leveraging `pyarrow.parquet` or DuckDB over HTTP, GSE can stream and filter millions of historical plays directly over the wire without local disk footprint or database ingestion lag:

```sql
-- GSE Zero-Latency DuckDB Extraction
SELECT 
    season, week, game_id, posteam, defteam, down, ydstogo, yardline_100,
    ep, epa, wp, wpa, cpoe, air_yards, yards_after_catch, pass_location
FROM read_parquet('https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_2026.parquet')
WHERE season_type = 'REG' AND down IS NOT NULL;
```

**Strategic Advantages:**
1. **Zero API Cost & Unlimited Requests:** Bypasses commercial stats APIs entirely.
2. **Sub-Second Incremental Refresh:** Play-by-play files are updated within hours of game completion.
3. **Personnel & Alignment Fusion:** Merging `pbp_participation` provides route participation and exact offensive personnel packages (11, 12, 13, 21 personnel), directly powering GSE's situational split engine.

---

## 3. Betalytics Architecture Deconstruction & GSE Competitive Edge

### Deconstructed Architecture of Betalytics
Through inspection of Betalytics (`/app` and `/sports/nfl`), the platform operates a classic quantitative sports betting model with the following components:
1. **Opponent-Adjusted EPA / Efficiency:**
   Adjusts basic EPA per play by opponent defensive schedule strength.
2. **QB Change Delta:**
   Static downward adjustments when backup quarterbacks enter (e.g. $-3.5$ to $-5.0$ points).
3. **MVProps (Player Prop Projections):**
   Univariate Gaussian / Poisson distribution models projecting passing, rushing, and receiving lines against market numbers.
4. **Edge & Star Grading:**
   Calculates edge as $\text{Edge} = p_{\text{model}} - p_{\text{no\_vig}}$, categorizing plays into A/B/C/D tiers and 1-to-5 star ratings.
5. **Cadence:**
   Re-runs model projections after official Friday/Saturday injury reports are finalized.

### Betalytics Vulnerabilities & GSE Superiority

| Dimension | Betalytics Commercial Model | Galaxy Sports Edge (GSE) Superiority |
|---|---|---|
| **Causal Structure** | Associative regression (correlations between EPA and scores). Fails on scheme shifts. | **Causal Do-Calculus & ADMG DAGs:** Separates true interventional effects from confounding. |
| **Same-Game Parlays (SGPs)** | Independent marginal multiplication or basic heuristics; no joint distribution. | **APMM Copula Pricing:** High-dimensional Clayton/Gumbel copulas pricing joint market correlations. |
| **Devigging Methodology** | Multiplicative or additive no-vig margins; vulnerable to favorite-longshot bias. | **Shin / Power De-vigging:** Accounts for bookmaker shading and informed insider flow $\mathbf{z}$. |
| **Personnel Granularity** | Team-level aggregates; cannot see 12 vs 11 personnel splits. | **Personnel Package Conditioning:** Exact dropback EPA conditioned on personnel package and route tree. |
| **Probability Honesty** | Stated star confidence often inverts under live testing. | **Murphy (1973) Calibration Loop:** Continuous Brier resolution-reliability updates with zero inversion. |

---

## 4. Scores24 In-Play & Live Feed Reverse Engineering

### Scores24 Backend Architecture
- Operates high-frequency polling and WebSocket streams (`score24.com`) delivering real-time clock, scores, head-to-head (H2H) trend averages, and algorithmic match forecasts.
- Designed primarily as an affiliate-marketing and live-score tracker for recreational bettors.

### The GSE Arbitrage Advantage
- **Scores24 Limitation:** Uses naive historical H2H trends (e.g. "Team A won 4 of last 5 meetings") which have near-zero predictive power in modern NFL games.
- **GSE Implementation:** GSE's live in-play engine uses continuous Markov game states ($t$, score differential, down, distance, timeouts, possession) and leverage weighting ($dW/d\text{EPA}$). This allows GSE to exploit recreational in-play lines that overreact to early trailing scores before mean reversion occurs.

---

## 5. REA (Reverse Engineer Anything) Operational Integration

### Overview & Capabilities
`morluto/rea` serves as the agentic bridge connecting AI coding agents to reverse-engineering engines:
- **Dynamic Binary Inspection:** Integrates with Ghidra, Hopper, and JADX for compiled native binaries and mobile packages.
- **JavaScript & Electron AST Extraction:** Analyzes bundled web apps, Electron clients, and minified client-side scripts to recover internal API schemas and endpoints.
- **Traffic Interception:** Pairs with `mitmproxy` and HAR dumps to extract undocumented WebSocket and REST endpoints from live sportsbooks and odds platforms.

### Action Plan for Ongoing Competitive Intelligence
1. **Automated Sportsbook Protocol Capture:** Use REA network traffic analysis on public web apps to extract sub-second live line updates and bookmaker risk shading parameters.
2. **Client-Side AST Recovery:** Inspect minified frontends of competitive tools to identify proprietary feature formulas (e.g. custom situational metrics).
3. **Fail-Closed Hardening:** Ensure all extracted feeds pass GSE's strict data gates (`no-raw-ngs-fence.ts`, `trust-gate.mjs`, and fail-closed validation) before entering the reasoning plane.

---

## 6. Immediate Implementation Roadmap

1. **Ingest nflverse Parquet Pipelines into GSE:**
   - Wire DuckDB HTTPS streaming for `pbp_participation` and `ftn_charting` to eliminate manual CSV dependencies.
2. **Activate Personnel Grouping Features:**
   - Incorporate 12-personnel and heavy package splits into the prediction engine's offensive feature matrix.
3. **Enforce Shin Devig on Public Odds Comparison:**
   - Replace naive proportional devigging in odds ingestion with exact `shin_devig` from `intelligence/ratings/engine_math.py`.
