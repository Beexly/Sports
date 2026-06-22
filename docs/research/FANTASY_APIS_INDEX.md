# Fantasy Football League APIs Research Index
**Date:** June 22, 2026  
**Status:** Complete

---

## Quick Navigation

### For Product Managers & Decision Makers
**Start here:** [Comparative Matrix](./FANTASY_LEAGUE_API_RESEARCH_2026.md#5-comparative-matrix)
- Platform comparison table (Sleeper, Yahoo, ESPN, MFL)
- Authentication, cost, rate limits, data quality
- Recommended implementation roadmap (Phases 1-4)

### For Engineers & Developers
**Start here:** [League Metrics Breakdown](./LEAGUE_METRICS_BREAKDOWN_BY_API.md)
- 30+ metrics availability matrix by platform
- Metric definitions and calculation formulas
- Implementation strategy (Tier 1-4)
- Data freshness requirements

### For Legal & Compliance
**Start here:** [Codebase Integration Points](./FANTASY_LEAGUE_API_RESEARCH_2026.md#9-codebase-integration-points)
- Source rights classification framework
- API Terms of Service summary
- ESPN risk assessment (unofficial API)
- Recommendation: Legal review before ESPN implementation

---

## Document Summaries

### 1. FANTASY_LEAGUE_API_RESEARCH_2026.md (441 lines)

**Sections:**
1. Sleeper API — Free, public, no authentication
2. Yahoo Fantasy Sports API — Official, OAuth 2.0, multi-sport
3. ESPN Fantasy API — Unofficial, cookie-based, largest user base
4. MyFantasyLeague (MFL) — Paid API, best for dynasty
5. Comparative Matrix — Feature comparison table
6. League Benchmarking Data — Available metrics by platform
7. Technical Requirements — Implementation guidance
8. Rate Limits & Access Restrictions — Per platform
9. Codebase Integration Points — Current status in repo
10. Phased Recommendations — MVP → Multi-platform → ESPN → Advanced

**Key Statistics:**
- Sleeper: 90-1000 req/min (documentation varies)
- Yahoo: Lenient, undocumented (after OAuth approval)
- ESPN: ~60-100 req/min (estimated, unofficial)
- MFL: Lenient (paid subscribers only)

**Best For:**
- Sleeper: MVP, zero authentication overhead
- Yahoo: Official long-term integration, transactions
- ESPN: Largest user base, but TOS risk
- MFL: Dynasty/keeper leagues with history

---

### 2. LEAGUE_METRICS_BREAKDOWN_BY_API.md (304 lines)

**Sections:**
1. Metrics Availability Matrix — 30+ metrics, all platforms
2. Metric Definitions & Calculations — Win-loss, PF, PA, etc.
3. Advanced Benchmarking Metrics — Expected wins, luck factor, SOS
4. Roster Composition Metrics — Bench depth, injury impact
5. Transaction Data Metrics — Waivers, trades, FAAB
6. Market Signal Metrics — Add/drop trending, ownership
7. Dynasty & Long-term Metrics — Franchise records, keeper data
8. Recommended Hierarchy — Tier 1-4 implementation
9. Implementation Strategy — Phased approach
10. Data Freshness Requirements — Update intervals

**Key Findings:**
- **All platforms** support: W-L, PF, PA
- **Advanced** (most platforms): Expected wins, luck factor
- **Sleeper only**: Add/drop trending (market momentum)
- **Yahoo/MFL best**: Transaction history, multi-season data
- **ESPN limitation**: Historical data deleted Aug 2025

**MVP Metrics (Tier 1):**
- Win-Loss Record
- Points For / Points Against
- Point Differential
- Bench vs Active Roster

**Advanced Metrics (Tier 2):**
- Winning Streak
- Expected Wins (computed)
- Luck Factor (computed)
- Strength of Schedule

---

## Integration Status in Codebase

### Active Integrations
```
✓ /apps/web/lib/integrations/sleeper.ts
  └─ Full read-only sync (pure + tested)
  └─ Normalizes user, league, roster data
  └─ Trending endpoints (add/drop momentum)

✓ /apps/web/lib/sleeper/source.ts
  └─ Shared player-map cache (6-hour TTL)
  └─ Prevents redundant ~14MB player data fetches
```

### Stubbed Adapters (Ready for Implementation)
```
○ /lib/statking/sources/adapters/sleeperAdapter.ts
○ /lib/statking/sources/adapters/yahooFantasyAdapter.ts
○ /lib/statking/sources/adapters/espnFantasyAdapter.ts
```

### Roadmap Documents
```
📋 /docs/managed-leagues-vision.md — League Twin, GM Autopilot, GM Ledger
📋 /docs/fantasy-os-vision.md — Fantasy OS architecture
📋 /apps/web/lib/fantasy/league-memory-roadmap.ts — Data model
📋 /apps/web/lib/scraping/source-rights-registry.ts — Rights classification
```

---

## Implementation Roadmap

### Phase 1: MVP (Sleeper Only) — 2-3 weeks
**Status:** Partially complete (Sleeper integration exists)
- Weekly league snapshot ingestion
- Core metrics dashboard (W-L, PF, PA)
- Rate limiting: 90 req/min
- Caching: Player map (6hr), league data (weekly)

### Phase 2: Multi-Platform (Sleeper + Yahoo + MFL) — 4-6 weeks
**Requires:** Yahoo OAuth approval (formal request needed)
- Yahoo OAuth flow implementation
- MFL API key integration (for paid subscribers)
- Data normalization across platforms
- Transaction history layer (Yahoo/MFL)

### Phase 3: ESPN (With Legal Review) — Post-legal review
**Requires:** Legal sign-off on unofficial API usage
- Cookie-based auth (espn_s2 + SWID from user)
- Endpoint change contingency plan
- TOS risk documentation
- Restriction to illustrative data until approved

### Phase 4: Advanced Benchmarking (8-10 weeks)
**Features:**
- Luck factor calculation (actual W-L vs expected)
- Strength of schedule analysis
- Playoff probability models
- Draft pick retrospectives
- Manager profiling (GM IQ)

---

## Rate Limit Summary Table

| Platform | Rate Limit | Auth Type | Risk | Notes |
|----------|-----------|-----------|------|-------|
| Sleeper | 90 req/min | None | Low | IP blocking after limit; exponential backoff recommended |
| Yahoo | Undocumented | OAuth 2.0 | Low | Lenient; approval required (5-10 days) |
| ESPN | ~60-100 req/min | Cookies | Medium | Undocumented; endpoints may change; historical data gaps |
| MFL | Undocumented | API Key | Low | Lenient; $50-100/yr subscription required |

---

## Data Freshness Requirements

| Metric | Interval | Source | Notes |
|--------|----------|--------|-------|
| Standings (W-L) | After each game | All APIs | ~30 min latency |
| Points (PF/PA) | After each game | All APIs | ~30 min latency |
| Market Trending | Hourly | Sleeper | Real-time add/drop momentum |
| Transactions | Daily | Yahoo/MFL | Next-day reporting |
| Strength of Schedule | Weekly | Computed | Set before season |
| Playoff Probability | Weekly | Computed | Mid-season updates |

---

## Decision Tree: Which API to Use?

```
START
  │
  ├─ Do you need to launch MVP quickly?
  │   └─ YES → Use SLEEPER (no auth, ready now)
  │   └─ NO  → Continue below
  │
  ├─ Do you need official sanctioned access?
  │   └─ YES → Use YAHOO (submit OAuth request, wait 5-10 days)
  │   └─ NO  → Continue below
  │
  ├─ Do you need transaction history (trades/waivers)?
  │   └─ YES → Use YAHOO or MFL
  │   └─ NO  → Use SLEEPER
  │
  ├─ Is your target user a dynasty/keeper player?
  │   └─ YES → Use MFL (best historical data)
  │   └─ NO  → Use SLEEPER or YAHOO
  │
  ├─ Do you have legal approval for unofficial APIs?
  │   └─ YES → Consider ESPN (largest user base)
  │   └─ NO  → Skip ESPN, use above
  │
  └─ RECOMMENDED APPROACH:
      Phase 1: SLEEPER only (MVP)
      Phase 2: Add YAHOO + MFL (multi-platform)
      Phase 3: Add ESPN (after legal review)
```

---

## External Resources

### Official Documentation
- [Sleeper API Docs](https://docs.sleeper.com/)
- [Yahoo Fantasy API](https://developer.yahoo.com/fantasysports/guide/)
- [MFL Developers API](https://home.myfantasyleague.com/features/developers-api/)

### Community Libraries
- [ffscrapr R Package](https://ffscrapr.ffverse.com/) — Multi-platform client
- [ESPN Fantasy API (Unofficial)](https://github.com/cwendt94/espn-api) — Python wrapper
- [Fantasy Football Metrics Report](https://github.com/uberfastman/fantasy-football-metrics-weekly-report) — Weekly reports

### Analysis & Comparison
- [Sleeper vs Yahoo vs ESPN vs CBS (2026)](https://lordskunk.com/guides/sleeper-vs-yahoo-fantasy-football/)
- [Fantasy League Standings Metrics](https://leaderboarded.com/blog/posts/fantasy-league-standings-stats/)
- [Fantasy Pros League Analyzer](https://www.fantasypros.com/nfl/myplaybook/league-analyzer.php)

---

## Next Steps

1. **Prioritize MVP Platform:** Sleeper (integration exists, ready to extend)
2. **Submit Yahoo OAuth Request:** If multi-platform needed (approval: 5-10 days)
3. **Build Benchmarking Dashboard:** Core metrics (W-L, PF, PA, differential)
4. **Implement Weekly Sync:** Cron job for league snapshots
5. **Add Advanced Metrics:** Luck factor, SOS (computed from data)
6. **Extend to Multi-Platform:** After Yahoo approval
7. **Legal Review:** Before ESPN cookie-based auth implementation
8. **Dynasty Features:** MFL integration for keeper/dynasty support

---

## Questions for Stakeholders

### Product
- [ ] What's the MVP launch target?
- [ ] Are transaction features (trades/waivers) in MVP?
- [ ] Do we support dynasty/keeper leagues?
- [ ] What's the user overlap: Sleeper/Yahoo/ESPN/MFL?

### Engineering
- [ ] Should we normalize across platforms into a single schema?
- [ ] Cache strategy: Per-league weekly snapshots or real-time?
- [ ] Database schema: Extend existing `League`/`Team` models or new tables?
- [ ] Rate limiting: Exponential backoff or token bucket?

### Legal & Compliance
- [ ] Are we compliant with ESPN's TOS (unofficial API)?
- [ ] Do we need user consent for league data ingestion?
- [ ] Any privacy considerations for league/manager profiles?
- [ ] GDPR/CCPA: How do we handle user data retention?

---

## Document Version History

- **2026-06-22**: Initial comprehensive research (441 + 304 lines)
  - Sleeper, Yahoo, ESPN, MFL APIs analyzed
  - 30+ benchmarking metrics documented
  - Phased implementation roadmap defined
  - Codebase integration points mapped
