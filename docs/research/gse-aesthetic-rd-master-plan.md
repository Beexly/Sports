# Galaxy Sports Edge Aesthetic R&D Master Plan

Generated: 2026-06-09

## Executive Direction

GSE should not look like a typical fantasy site, sportsbook affiliate page, or generic dark SaaS dashboard. The strongest position is a dual-mode product:

- Operator cockpit: dense, quiet, highly legible, source-first, keyboardable, and trustworthy.
- Public intelligence brand: premium sports/data storytelling with controlled motion, real assets, and clear evidence.

The competitor landscape is split: optimizers sell power through dense tables and controls; pick'em/social apps sell speed through mobile cards and rewards; media sites sell expert trust through articles and rankings; betting intelligence apps sell edge through live odds, +EV, alerts, and calculators. GSE can beat them by making the data supply chain visible: source health, fallback state, freshness, conflict, model reason, and operator action.

## What Competitors Teach Us

| Competitor Lane | What They Look Like | What They Sell | What GSE Should Add |
| --- | --- | --- | --- |
| High-stakes contest platforms | Prize-first cards, draft schedules, rules, testimonials, app links | Trust, payouts, league formats, tradition | Format cards, clear data needs, draft/slate readiness, responsible framing |
| Pick'em/social casino apps | Mobile cards, pick slips, live sport chips, feed/reward/leaderboard mechanics | Speed, social proof, rewards, play loops | Fast player context cards and streak/alert mechanics without legal or hype risk |
| DFS optimizers | Dense projection tables, locks, excludes, exposures, stacks, lineup exports | Control, power, multi-entry workflow | Explainable optimizer with source provenance, scenario diffs, confidence and fallback states |
| Betting intelligence tools | Odds tables, +EV/arbitrage feeds, line movement, calculators, alerts | Real-time edge and workflow efficiency | Free calculators plus paid live intelligence with stale-line and source-health gates |
| Media/tool suites | Articles, rankings, analyst pages, plan gates, podcasts/videos | Expert trust and subscription bundle | Evidence-led analyst/product voice tied directly to model state |

## 2025/2026 Award-Site Takeaways

- Use award sites as motion and craft references, not as usability defaults.
- 2025 references show brand-world depth, scroll storytelling, typographic craft, and high-production visual systems.
- 2026 year-to-date references show stronger AI/finance/product storytelling, spatial depth, luxury detail, and current motion polish.
- GSE should reserve immersive treatment for explainers, season/draft launches, model education, and premium reports. Daily cockpit work must stay fast and inspectable.

## Top Build Priorities

1. A real cockpit design-token layer for source states, confidence, conflict, fallback, stale data, and autonomous system health.
2. TanStack Table + Virtual spike for player/source/optimizer grids.
3. Motion system for state transitions, not decoration.
4. Evidence drawer for every important data claim.
5. Command palette for operator navigation/debugging.
6. Graph/topology surface for autonomous systems and fallback chains.
7. Recharts baseline for source health, freshness, confidence, and retention dashboards.
8. Public premium explainer page that uses real sports/data visuals and source proof.
9. Visual QA with desktop/mobile screenshots and reduced-motion checks.
10. Dependency governance: every UI library must map to an actual GSE workflow.

## Design Language

Use a premium intelligence palette with sport-energy accents, not sportsbook neon. Keep radius at 8px or below unless the existing system demands otherwise. Let tables and toolbars feel engineered; let public pages feel cinematic only when the content deserves it.

Recommended component language:

- Tables: compact rows, sticky headers, column controls, confidence/status cells, source tooltips, row details.
- Cards: only for repeated items, summaries, and compact status modules. No cards inside cards.
- Drawers: evidence, player context, source conflicts, fallback explanations.
- Tabs/segmented controls: mode switching, not decorative navigation.
- Motion: small transitions on state changes, loading, filter changes, drawer entry, and graph updates.
- Graphs: use for system topology and dependencies, not for every data relationship.

## Repo/Dependency Direction

Immediate candidate stack:

- shadcn-ui/ui and Radix primitives for accessible, locally owned component foundations.
- TanStack Table and TanStack Virtual for dense data.
- Motion for React/JS animation.
- cmdk and Vaul for command palette and drawers.
- Recharts for fast data visualization.
- xyflow for autonomous topology maps.

Later/conditional:

- react-three-fiber and drei only where full-bleed 3D helps source/world explanation.
- Nivo for advanced dataviz after Recharts limits are reached.
- Remotion for automated recap/report videos.
- GSAP, Lenis, Lottie, parallax only after license, accessibility, and performance proof.

## Claude Handoff

Use docs/research/gse-aesthetic-claude-handoff.md as the implementation prompt. Use docs/research/gse-aesthetic-build-queue.jsonl as the work queue.

## Source Ledger

- Awwwards Sites Of The Year: https://www.awwwards.com/websites/sites_of_the_year/ - Verified 2025 SOTY references including Lando Norris and Messenger.
- Awwwards winning websites/SOTD: https://www.awwwards.com/websites/ - Verified current 2026 site-of-the-day stream through Jun 08, 2026.
- CSSDA WOTY 2025 winners: https://www.cssdesignawards.com/blog/2025-website-of-the-year-winners/430/ - Verified Dropbox Brand as WOTY 2025 winner announcement.
- CSSDA WOTY 2025 nominees: https://www.cssdesignawards.com/woty2025/ - Verified 2025 finalist/reference set.
- CSSDA WOTD winners: https://www.cssdesignawards.com/wotd-award-winners?page=1 - Verified current 2026 WOTD references and tags.
- CSSDA WOTM winners: https://www.cssdesignawards.com/wotm-award-winners?page=1 - Verified 2025/2026 month winners and scores.
- Web Design Awards 2025: https://www.webdesignawards.io/winners/2025 - Secondary 2025 award archive.
- Web Design Awards 2026: https://www.webdesignawards.io/winners/2026 - Secondary 2026 year-to-date award archive.
- FFPC public homepage: https://www.myffpc.com/ - Verified contest-card, live draft, prize-first public layout.
- DraftKings Pick6 public app: https://pick6.draftkings.com/ - Verified pick-slip, league chips, card/table hybrid public layout.
- Rebet public homepage: https://rebet.app/ - Verified social sportsbook/casino positioning, feed/rewards/challenge mechanics.
- Dimers public homepage: https://www.dimers.com/ - Verified in-house model and +EV public explanation pattern.
- FantasyPros DFS optimizer: https://www.fantasypros.com/daily-fantasy/nfl/lineup-optimizer.php - Verified lock/exclude, 150 lineups, GPP, custom projections, export feature framing.
- Footballguys optimizer guide: https://www.footballguys.com/article/guide-dfs-lineup-optimizer?article=guide-dfs-lineup-optimizer - Verified exposure, stack, cap, randomness, export, chart/report feature framing.
- Action Network app page: https://www.actionnetwork.com/app - Verified expert picks, live odds, PRO tools, My Action, BetSync framing.
- OddsJam tools page: https://dev.oddsjam.com/betting-tools - Verified odds tools/calculators, arbitrage, +EV, sportsbook count, and free tool framing.
- GitHub REST API: https://api.github.com/repos - Pulled current stars/forks/pushed dates for the design/motion repo watchlist on 2026-06-09.
