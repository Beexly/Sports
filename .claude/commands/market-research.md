---
description: Sports market research — Reddit, Twitter/X, YouTube, GitHub, Polymarket signals
---

Run multi-platform market intelligence gathering for GSN. Aggregates social sentiment, injury signals, line movement narratives, and Polymarket odds.

## Research targets by use case

### Pre-game signal sweep
- Reddit: r/sportsbook, r/nfl, r/nba, r/mlb — community line discussion
- Twitter/X: injury reports, beat reporters, sharp money signals
- YouTube: pregame analysis, line movement explainers
- Polymarket: current odds on game outcomes (market-implied probabilities)

### GSE trend tracking
- Monitor competitor mentions: DraftKings, FanDuel, PrizePicks
- Track "value picks" and "sharp action" discussions
- Injury news chatter timing vs. odds movement

### Model calibration signal
- "Bang value" and "CLV" discussions for model tuning
- Public bet percentage vs. closing line value
- Reverse line movement events

## Tool chain

### Using Agent-Reach (local install)
```bash
# Install
pip install agent-reach
agent-reach install

# Research sweep
agent-reach search "NFL week 12 line movement sharp money" --platforms reddit,twitter
agent-reach search "Polymarket NFL odds" --platforms web
agent-reach search "injury report [PLAYER_NAME]" --platforms twitter,reddit
```

### Manual research protocol
1. **Reddit sweep**: Search `site:reddit.com/r/sportsbook` + query in search
2. **Twitter signals**: Monitor beat reporters for injury designations
3. **Polymarket**: `https://polymarket.com/sports` — NFL/NBA/MLB markets
4. **Odds comparison**: The Odds API (`/api/odds`) for our own data vs. market

### Using mvanhorn/last30days-skill (Claude Code plugin)
After installing the skill locally, use it for:
```
/last30days research: sports betting market sentiment NFL week [N]
/last30days polymarket: NFL game outcomes current odds
/last30days research: sharp money line movement this week
```

## Output format

```markdown
## Market Research: <topic> — <date>

### Signal summary
<2-3 sentence synthesis of what the market is doing>

### Reddit sentiment
<Top signals from r/sportsbook + sport-specific subs>

### Sharp indicators
<Reverse line movement / CLV / unusual steam>

### Injury chatter
<Notable injury reports and timing vs. line movement>

### Polymarket odds
<Market-implied probabilities for key games>

### Sources
<List of URLs checked, with access time>
```

## Scraping clearance reminder

Before any automated research job:
1. Call `checkClearance()` for each source
2. Approved sources: Twitter public search (public_logged_off), Reddit public (public_logged_off), YouTube public, GitHub public
3. NOT approved for automation: scores24.live (requires written consent), score24.com (vendor evaluation needed)
4. All extracted facts must be wrapped with `wrapExtractedRecord()`

## Notes on Agent-Reach vs. The Odds API

Agent-Reach gives social signals + community sentiment. The Odds API gives structured market data. Use both together:
- Odds API = ground truth for lines and market prices
- Agent-Reach = directional signal for narrative/sentiment layer
