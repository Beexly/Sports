# ADR-0005: Week 9 Plays (`62-23-1` Baseline), 360-Degree Full-Board Market Review & DraftKings/FanDuel DFS Engine

## Status

Accepted (`2026-11-06`)

## Context

Entering NFL Week 9, the Official New Engine Verified Record stands at **`62-23-1` (`72.9%`, `+26.50 Units`: `16-5` `+10.45u` pre-Week 8 + `46-18-1` `+16.05u` Week 8 audited settlement)**. Historically, evaluating only full-game sides and standard yardage props left massive structural edges on the table across derivative markets (`1Q–4Q`, `1H/2H`, Kicking, Defense/IDP Sacks & Tackles, Longest Rush/Reception, and cross-derivative bookmaker contradictions) as well as DraftKings and FanDuel DFS contests (`/fantasy/dfs`).

## Decision Drivers

* **360-Degree Full-Board Market Coverage**: Every game evaluation must inspect all `77+` DraftKings/sportsbook market types (`~1,800+` props per game), including Quarters/Halves (`1Q–4Q`, `1H/2H`), `1Q`/`1H` Player Props, QB Full-Game Suite (`INTs`, Attempts, Completions, Longest), Skill Player Suite, Kicking Suite (`FGs O/U 1.5`, Kicking Points `O/U 6.5/7.5`, PATs), Defense/IDP Suite (`0.25` half-sack lines, Solo/Total Tackles), and Touchdown Scorers (`Anytime`, `First`, `1Q`, `1H`, `2+`, `D/ST`).
* **Cross-Derivative Contradiction Detection (`Wave 16B`)**: Exploit internal bookmaker pricing silos where `Team Total O/U` disagrees with the sum of `Team TDs O/U`, `Kicker FGs O/U`, and `Anytime TD` marginal probabilities via Bregman / KL projection.
* **Unified Game Picks + DFS Contest Construction**: Drive DraftKings (`50,000` salary cap, full-PPR + `300-yd`/`100-yd` bonuses) and FanDuel (`60,000` salary cap, `0.5`-PPR) Cash Core and 150-Max GPP Leverage Stacks from the exact same situational simulation trajectories (`Pyomo` MILP + `pyribs` MAP-Elites quality-diversity archive).

## Considered Options

### Option 1: Separate Models for Game Picks, Player Props, and DFS Lineups
- **Pros**: Independent scripts.
- **Cons**: Produces contradictory recommendations (for example, betting a team Under while stacking its passing game in DFS) and misses cross-derivative arbitrage.

### Option 2: Unified Situational Trajectory Engine Driving 360-Board Derivatives + DK/FD Cash & GPP Lineup Portfolios
- **Pros**: Guarantees mathematical coherence across game sides/totals, `1Q/1H` derivatives, kicking/IDP props, SGP copulas, and DFS lineup stacks; anchors all public reporting to the single verified `62-23-1` (`+26.50u`) ledger.
- **Cons**: Requires full-board ingestion and strict paywall gating so official tickets are reserved for subscribers.

## Decision

We adopt **Option 2**: Every NFL slate runs the 360-Degree Full-Board Market Review, the `Wave 16B` Cross-Derivative Contradiction Detector, and the unified DraftKings/FanDuel DFS Cash + GPP Leverage Engine (`/fantasy/dfs`).

## Rationale

1. **Softness Follows Inattention**: Sportsbook pricing algorithms heavily police main spreads and totals but leave wide mispricings in `1Q` receiving yards, `0.25` individual sack lines, kicking points under wind shear, and correlated DFS bring-back stacks.
2. **Single Truth Ledger**: Enforcing `62-23-1` (`72.9%`, `+26.50u`) across all surfaces eliminates legacy bucket confusion.

## Consequences

### Positive
- Complete alignment between `/picks` (gated official plays), `/props` (360-degree prop explorer), and `/fantasy/dfs` (DK/FD optimizer & leverage stacks).
- Automated detection of internal bookmaker scoring/volume identity violations.

### Negative
- Requires strict paywall separation between free game-environment previews and paid official selections.

## Implementation Notes

- Week 9 Execution Packet Builder: `intelligence/ops/gse_video_social_and_revenue_growth_engine.py`
- Generated Master JSON: `data/engine/week9_video_social_dfs_and_revenue_master_packet_2026_11_06.json`
- Generated DFS & Plays Markdown: `docs/dfs/research/2026-11-06/WEEK9_PLAYS_DFS_VIDEO_AND_REVENUE_EXECUTION_PACKET.md`

## Related Decisions

- [ADR-0002](0002-situational-first-5-stage-pre-projection-and-jev-simulation-pipeline.md): Situational-First 5-Stage Engine Gate
- [ADR-0006](0006-multi-channel-video-social-follower-growth-and-ad-affiliate-revenue-engine.md): Multi-Channel Video, Social & Revenue Engine

## References

- `data/engine/new_engine_official_ledger_2026.json`
- `docs/predictions/research/2026-11-06/XAI_32_TEAM_TACTICAL_DOSSIERS_AND_UNSEEN_ALPHA_BIBLE.md`
