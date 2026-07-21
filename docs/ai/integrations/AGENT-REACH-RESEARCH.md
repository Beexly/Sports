# Agent-Reach: Internet Research for GSN

> Source: `Panniantong/Agent-Reach` (Python, 58k★)
> Purpose: Give Claude Code eyes on Twitter, Reddit, YouTube, GitHub, and more — zero API fees

## What This Solves

GSN needs real-world signal beyond The Odds API:
- Injury chatter (Reddit beat reporters, Twitter)
- Sharp money narratives (r/sportsbook)
- Polymarket probability signals
- Competitor monitoring (DraftKings, FanDuel, PrizePicks moves)
- Line movement context

Agent-Reach gives Claude Code access to 15+ platforms with primary + fallback routing and no API keys for most platforms.

## Installation

```bash
pip install agent-reach
agent-reach install
agent-reach doctor  # verify all channels
```

## Supported Platforms

**Zero-config (no auth needed):**
- Web pages (Jina Reader)
- YouTube (subtitle extraction)
- RSS feeds
- GitHub (public repos)
- V2EX
- Stock data

**Auth-required (login once):**
- Twitter/X (twitter-cli)
- Reddit (OAuth)
- Facebook, Instagram, LinkedIn
- Xiaohongshu (XHS)

**Premium (free tier via mcporter):**
- Exa semantic search across the full web

## Sports Market Research Workflow

```bash
# Injury sweep before game
agent-reach search "Patrick Mahomes injury week 12" --platforms twitter,reddit

# Line movement signal
agent-reach search "Bills Chiefs line movement sharp action" --platforms reddit

# Community sentiment
agent-reach search "site:reddit.com/r/sportsbook NBA Tonight" --platforms web

# Competitor monitoring
agent-reach search "DraftKings promo offer this week" --platforms twitter,web

# Polymarket check
agent-reach search "Polymarket NFL playoffs odds" --platforms web

# Beat reporter sweep
agent-reach search "injury report questionable [team]" --platforms twitter
```

## Claude Code Integration

Once installed, Agent-Reach tools become available to Claude Code via MCP:

```
# In a research session:
"Use Agent-Reach to find Reddit sentiment on tonight's Celtics game"
"Search Twitter for injury reports on starting QBs this week"
"Check Polymarket for current Super Bowl odds"
```

## Privacy and Rate Limits

- Public data only (no credential misuse per GSN scraping posture)
- Agent-Reach uses primary + fallback backends automatically
- If one source blocks, it retries via alternate backend
- Respects `robots.txt` and rate limits

## Integration with GSN `/market-research` Command

The `/market-research` slash command in `.claude/commands/market-research.md` documents the full workflow. Agent-Reach is the tool that executes it.

## MCP Config

```json
{
  "mcpServers": {
    "agent-reach": {
      "command": "agent-reach",
      "args": ["mcp", "serve"],
      "env": {}
    }
  }
}
```

## Status

- [ ] Install Agent-Reach locally: `pip install agent-reach && agent-reach install`
- [ ] Run `agent-reach doctor` to verify platform connectivity
- [ ] Configure Twitter auth for injury report monitoring
- [ ] Test Reddit r/sportsbook sweep
- [ ] Wire up Polymarket research in weekly research workflow
