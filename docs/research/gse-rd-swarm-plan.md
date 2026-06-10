# GSE / GSN NFL World-Model R&D Swarm Plan

## Mission

Create a repo-grounded research packet for Galaxy Sports Edge / GSN that maps the current codebase, legal source boundaries, high-value free and low-limit source families, NFL world-state modeling, game-like analog signals, product tiering, and a Claude Code implementation queue.

## Execution Constraints

- No migrations.
- No production feature changes.
- No scraping behind logins or against source terms.
- No copying Madden, EA, NFL, ESPN, sportsbook, publisher, social, or video content.
- No founder formula, weighting, or source-risk detail should be public by default.
- Every external source must have provenance, freshness, legal-risk, and fallback behavior before implementation.

## Workstreams

0. Coordinator and repo auditor: Confirmed real repo root, branch, existing docs, current integrated provider, and no production code edits. Artifact: ./workstreams/agent-00-coordinator-repo-auditor.md
1. Current data state mapper: Mapped Odds API ingestion, SourceSnapshot, shadowEvidence, readiness flags, entitlements, and current sample/demo boundaries. Artifact: ./workstreams/agent-01-current-data-state.md
2. Free and low-limit source discovery: Mapped open, free-key, licensed, and blocked source families with legal and maintenance notes. Artifact: ./workstreams/agent-02-source-discovery.md
3. Redundancy and canonical-source reviewer: Removed duplicate direct sports data page scraping in favor of canonical APIs, nflverse, and licensed provider abstractions. Artifact: ./workstreams/agent-03-dedupe.md
4. NFL world state machine designer: Defined offseason, weekly, live-game, settlement, availability, market, news, weather, and product state transitions. Artifact: ./workstreams/agent-04-world-state-machine.md
5. Signal taxonomy designer: Grouped signals by market, schedule, weather, injury, roster, usage, team, coaching, officials, news, attention, development, analog, and provenance. Artifact: ./workstreams/agent-05-signal-taxonomy.md
6. Video-game analog signal designer: Translated game-like ratings and franchise-mode concepts into original GSE-derived signal proxies without copying proprietary ratings. Artifact: ./workstreams/agent-06-video-game-analog.md
7. Weather, stadium, and travel strategist: Selected NWS as primary weather layer and separated stadium metadata, roof/surface, travel, and alert features. Artifact: ./workstreams/agent-07-weather-stadium-travel.md
8. Injury and availability strategist: Designed availability status ladder, no-diagnosis language, status volatility, snap reentry, and replacement-impact strategy. Artifact: ./workstreams/agent-08-injury-availability.md
9. Training, camp, and development strategist: Mapped camp reports, roster battles, preseason usage, combine/draft/CFB priors, and player development curves. Artifact: ./workstreams/agent-09-training-development.md
10. News and reporting strategist: Designed source registry, claim cards, contradiction detection, quote controls, and publisher-risk gates. Artifact: ./workstreams/agent-10-news-reporting.md
11. Market and odds strategist: Kept current Odds API layer as canonical until a licensed provider decision is made; blocked direct sportsbook scraping. Artifact: ./workstreams/agent-11-market-odds.md
12. FREE/PRO/ELITE/founder product splitter: Separated public-safe, subscriber, elite, and founder-only signals while protecting weights, formulas, and source-risk details. Artifact: ./workstreams/agent-12-product-tiering.md
13. Data architecture mapper: Mapped raw source snapshots, normalized entities, feature store, model outputs, audit snapshots, and product surfaces. Artifact: ./workstreams/agent-13-data-architecture.md
14. Claude Code build-queue author: Generated 120 implementation cards with priorities, dependencies, source families, risk notes, and expected repo touchpoints. Artifact: ./workstreams/agent-14-claude-build-queue.md
15. Risk, legal, and source-policy reviewer: Flagged NFL/ESPN/media/sportsbook/social/video/injury data as approval-gated before monetized or automated use. Artifact: ./workstreams/agent-15-risk-legal.md
16. Source validation reviewer: Recorded primary source URLs, repo-file evidence, unknowns, and what was not tested or called. Artifact: ./workstreams/agent-16-validation.md
17. Differentiation strategist: Identified high-differentiation analog, scenario, and founder-only strategy surfaces. Artifact: ./workstreams/agent-17-product-differentiation.md
18. Final report editor: Assembled the final R&D report and cross-linked packet artifacts. Artifact: ./workstreams/agent-18-final-editor.md

## Repo-First Rule

The real repo used for this packet is C:\Users\Garrett\Sports on branch safety/sports-wip-2026-06-04. The OneDrive Galaxy path was not used as the implementation target because it resolves to a broad home-level git root and is not safe for scoped repo edits.

## Output Files

This packet writes docs only under docs/research. The build queue is intentionally implementation-ready but not implementation-approved.
