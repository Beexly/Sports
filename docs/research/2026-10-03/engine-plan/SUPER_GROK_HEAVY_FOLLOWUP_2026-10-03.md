# Super Grok Heavy, round 2: GSE (2026-10-03, 03:00 CT)

Paste everything below the line. Attach your round-1 answer, plus GSE_STATUS_AND_PLAN_FOR_DEEP_RESEARCH_2026-10-03.md.

---

Round 1 was strong. It was also conservative, and it left 40+ items UNVERIFIED. This round gives no ground on rigor and goes deeper on the one thing that matters most: where an all-signal reasoning engine can produce probabilities better than the price available at decision time, and exactly what data, rules and archives make that measurable. Keep round-1 rules: URL + date for every claim, UNVERIFIED instead of guessing, licence and PIT status for every source.

WHAT WE MEASURED SINCE ROUND 1 (walk-forward 2019–2026, n = 1,914 games, game-block bootstrap):
- Switching QB from the actual starter to a point-in-time expected starter (last starter unless listed Out/Doubtful, then the team's top recent backup) costs the independent model 0.0035 log loss (95% CI 0.0007–0.0062). The old QB number was leaky. PIT starter matches the actual starter in 81.5% of games.
- Market-anchored engine (market offset + home/neutral flag + PIT QB + Elo residual): log loss 0.6107 vs the de-vigged close 0.6098. Adding snap-weighted availability by position group (OL, skill, front, DB, Questionable): 0.6106; Δ vs without = CI [−0.0012, +0.0009]. Nothing public and numeric beats the close at the ML level.
- Empirical conditional score distribution (neighbour games by spread, unshifted margins so key numbers keep their mass; totals shifted by line): ATS predicted cover 0.4875 vs realized 0.4882; over 0.485 vs 0.4905. ML implied from the spread neighbourhood 0.6117 vs the de-vigged ML 0.6098.
- The neutral-site bug is fixed (home_flag = 0 for London).
- Our Neon store holds 1.10M NFL odds snapshots (13 books, OPEN/INTERIM/CLOSE, since 2026-08-19) and live nfl.com injury reports with GSIS ids.

TASK A: Where the price is beatable, with evidence. This is the centre of the round.
Rank every NFL market segment with documented inefficiency against the price available at that time.
Give published effect sizes and n. For each, say whether a coherent score/player distribution plus availability and weather inputs could exploit it.
Segments:
- (a) openers vs closers: how much open-to-close movement is predictable at the open
- (b) derivative markets (team totals, halves, quarters, alt spreads/totals, winning margin bands) priced off the main line
- (c) player props by stat type, book and time to kickoff: hold, limits, closing-line efficiency
- (d) same-game parlays: documented book correlation errors
- (e) Kalshi/Polymarket vs sportsbooks: lead/lag and divergence
- (f) injury-news latency: minutes between first public signal and the line move
- (g) live in-game markets
- (h) DFS (soft field, ownership leverage)
Name the published sharp-bettor and syndicate methods (books, interviews, papers, talks) and what they say about where edge lives.
Deliver a ranked table: segment, evidence, effect size, n, years, still present after 2020 (yes/no/unknown), data we need, test design.

TASK B: Point-in-time truth without a vintage archive.
Some facts have a regulated release time. Inactives are posted 90 minutes before kickoff. Final injury designations come out the day before the game. Practice reports come out on fixed days.
For those facts, the content can come from any later archive, and the as-of time is the rule.
1. Verify, with NFL policy documents, the exact release-time rules for practice reports, final designations, inactives, IR/designated-to-return and elevations, and how they changed by season since 2012.
2. Find every source of the content: NFL gamebooks (official PDFs list inactives), nfl.com game pages, ESPN boxscores, PFR, team press releases, Wayback CDX snapshots of nfl.com/injuries by date.
   - Give coverage counts per season where you can.
   - Give exact Wayback CDX query patterns.
3. Rebuild Wed/Thu/Fri practice sequences 2012–2025 (they exist inside nfl.com weekly report pages).
   - Name the archived URL patterns.
   - Report the share of team-weeks recoverable.
4. Get the full Glazer, Binney and Seth 2025 cell counts: P(play | designation × practice sequence × position). Try author preprints, SSRN and ResearchGate.
   - Then give the best open estimate of P(active) and P(full snap share) by practice-sequence pattern.

TASK C: Timestamped text with no social API.
Find free or cheap timestamped news and insider sources that can be replayed:
- GDELT 2.0 (coverage of NFL beat outlets, latency, query recipes)
- Common Crawl News
- team-site RSS archives
- Google News RSS
- Bluesky/Mastodon firehoses (beat reporters migrating)
- X archive options after the API changes
- Reddit dumps after Pushshift
- podcast and presser transcripts
For each: earliest timestamp fidelity, licence, and how to measure news-to-line-move latency against our odds snapshots.
Then the evidence that injury or insider news moves NFL lines, and how fast.

TASK D: Props and DFS at the frontier.
1. Open, reproducible player-prop models with out-of-sample results against the prop close or against FantasyPros/ECR: GitHub repos, Kaggle notebooks, theses, blog series with code.
2. The best open approach to opportunity: routes run, snaps, target share, carries, red-zone share, with lag-1 inputs only.
3. Zero-inflated and count models for receptions/TDs and their calibration.
4. Free projected-ownership and actual-ownership archives for DraftKings and FanDuel (contest CSV exports, community sites). Licence for each.
5. Which prop types and books show the weakest closing efficiency, with numbers.

TASK E: Exact backfill costing and engineering.
Using the-odds-api.com historical pricing from round 1, compute exact credits and dollars for each:
- (a) NFL 2020-06 to 2026: h2h/spreads/totals at T-90 and at close, us and eu regions
- (b) the same plus alternate lines and team totals
- (c) player props from 2023-05: every NFL prop market, T-90 and close
Give the cheapest plan that covers (a)+(c). Say which bookmaker keys represent Pinnacle and Circa, and whether Pinnacle is in that feed for US sports.
Also check: Open-Meteo historical-forecast licence for commercial modelling; CFBD terms; nbainjuries licence; any free NFL inactive archive.

TASK F: The coherent distribution, done right.
1. The best open method for a pregame NFL joint score PMF that matches key-number mass (3, 6, 7, 10, 14) and the line-implied mean and variance at the same time: nfelo's model, Wilson's work, integer-lattice smoothing, copula approaches.
2. How to shift that PMF coherently when the engine's probability differs from the market (location shift vs reweighting), with any evidence on which preserves calibration.
3. Evidence on how books price team totals, halves and alt lines from the main line, and the known mispricings.

TASK G: Signals no one is pricing, outside the game.
For each candidate, find the strongest evidence and a replayable source. Candidates:
- officials' assignment announcements
- long-haul travel plus kickoff body clock, after 2015
- practice-weather disruption
- coordinator/play-caller changes and in-season firings
- QB pressure-to-sack vs OL continuity (games started together)
- special-teams personnel churn
- elevated practice-squad players
- concussion-protocol timelines
- turf type × injury
- referee crew × pass interference × totals since 2022
- schedule compression across bye weeks
- division-rematch familiarity
- clock/tempo regime changes after a coaching change
Kill anything without a replayable, timestamped source.

TASK H: Computer vision and Madden, the honest path. The founder ranks these highly. Do not dismiss them; find the real path.
1. Licensed or permissive football video and tracking for training: NFL Films licensing, All-22 (NFL+ terms), college All-22 sources, high-school film platforms (Hudl terms), BDB data licences by year, SportsTrackingTransformer, open football detection weights (Roboflow Universe licences).
2. The fastest credible route to pre-snap formation and personnel recognition from broadcast with ≥ 90% accuracy, with numbers.
3. Whether broadcast-derived alignment or coverage-shell features have been shown to predict play outcome or game result beyond play-by-play.
4. Madden:
   - the exact EA policy clauses on ratings use
   - whether ratings published on ea.com are considered game content
   - legal alternatives that encode the same priors (PFF grades, SIS, Next Gen athleticism, combine/pro-day data, college production)
   - evidence that these predict backups and rookies
   - a legal football play-concept ontology (coaching manuals, open playbook datasets, academic route-concept taxonomies) to replace a Madden playbook import

TASK I: Push past the limit.
1. List the 15 most valuable things a top NFL betting syndicate or a sportsbook trading desk has that GSE lacks.
2. For each, give the cheapest legal way to approximate it within 7 days, with sources.
3. Then name 5 non-obvious, testable hypotheses with real mechanisms (not folklore) that combine on-field, around-the-game and outside-the-game data, which nobody appears to have published.
   - Give the exact test for each: data, PIT rule, estimand, game-blocked test, kill criterion.

FINAL OUTPUT
1. A ranked master table: item, task, segment, source URL, licence, PIT rule, effect size + n + citation, cost, build hours, BUILD-NOW/LATER/KILL.
2. Sections A–I.
3. A list of everything still UNVERIFIED, each with the single best next query that would verify it.
