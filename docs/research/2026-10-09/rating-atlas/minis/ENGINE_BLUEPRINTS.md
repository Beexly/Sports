# GSE ENGINE BLUEPRINTS — clone dossiers + football-dimension engines (2026-10-10)
_The "how their engines work" layer + the OL/DL, scheme, coverage, coaching engines — every source verified live tonight. PC/agent items marked. iSH items ran or are one command away._

## PART 1 — ENGINE AUTOPSIES (clone their methodology, legally: methods aren't protected, weights/data are ours)

### 1.1 FantasyPros — accuracy-weighted consensus (their public methodology)
- Engine: consensus rank/projection = **weighted average of expert sources, weights = each expert's historical accuracy** (they publish accuracy leaderboards per position). Disagreement = spread of expert ranks.
- Clone: ours already has the pool math (opinion_pool, registry entry I). Add: expert-accuracy weights from their public accuracy pages (keyless HTML), then our own pool over (FP consensus + MFL ADP + FFC ADP + Sleeper + market: DK prop-implied μ̂). Output: GSE consensus + **disagreement z-scores** (the tradable signal — consensus is the base rate; deviation = the angle).
- Data: FP HTML (591KB pages, server-rendered — parse lane proven tonight).

### 1.2 PropFinder — aggregation + EV overlay (reverse-engineered from chunks + product behavior)
- Engine: harvest multi-book props (DK/FD/Caesars/BetMGM/Fanatics/PP/UD/bet365 + Hard Rock/Borgata/Novig links) → de-vig each book → consensus fair p → display EV vs each book's price. Their edge-finder = consensus-vs-price gap (our identical stack: shin_devig + opinion_pool + our 442-fit DK σ table).
- Their differentiator = book coverage breadth + UX, not math. **Clone our version better**: our DK ladder recon gives SHAPE (σ̂), not just fair p — we can flag tail mispricings (EVT angle, registry C) that pure de-vig consensus can't see.
- Their infra: Hangfire workers (hangfire-odds.propfinder.app), DO Spaces static — same architecture class as ours (queue + snapshots). Validation that our design is industry-standard.

### 1.3 LineStar — DFS projections pipeline (DNN app, XHR-pending)
- Structure: per-(Sport×Site) dashboards; projections/ownership served by DNN web services (module JS enumerated tonight: fantasysportsco.*). Their projections = mix of licensed sources (historically their own + partners).
- Clone plan: XHR capture (browser performance-entries recipe) → benchmark their numbers vs OUR engine (props_deep NB2 + EPA usage) — their accuracy becomes OUR calibration target, not gospel.

### 1.4 The public big-model canon (what's documented, what we adopt)
- **ESPN FPI**: documented = EPA + situational covariates + market calibration, Monte Carlo schedule sim. Our version: market_strengths + EPA spine + stack_with_market — same family, ours market-anchored (stronger per GSE doctrine).
- **DVOA (FTN/FO)**: documented method = success-rate adjustments by down/distance/field position, opponent-adjusted, play-by-play value over average. We have every ingredient (ftn charting + pbp). We don't need to clone DVOA — we compute EPA/WPA directly.
- **PFF grades**: proprietary human grading — cannot clone; our substitute chain (FTN charting + NGS + YBC/YAC attribution) covers the same questions with public receipts.
- **numberFire**: their public claims = "proprietary + public data ensemble"; no formula disclosure — benchmark only.

## PART 2 — FOOTBALL-DIMENSION ENGINES (the OL/DL, scheme, coverage, coaching layer)

### 2.1 OL vs RB attribution engine [PFR lane PROVEN tonight]
Verified schema (Bijan page, `adv_rushing_and_receiving`): rush_yds_before_contact (812), rush_yds_bc_per_rush (2.8), rush_yac (666), rush_yac_per_rush (2.3), broken_tackles (22), targets/ADOT/drops/target_int/pass_rating allowed.
- **Engine**: per-RB, split value into (OL-created: YBC, box counts from FTN) + (RB-created: YAC, broken tackles). Team-level OL grade = Σ RB YBC/rush adjusted for box/defenders (FTN n_defense_box). DL side: pressure via FTN n_pass_rushers + PFR adv defense (pressures) + NGS qb_hits.
- Also verified present: rec_air_yds_per_rec **negative** (-0.5) for Bijan = screens/checkdowns profile — reception-profile typing for props (ADOT distributions per player = over/under-yardage prop risk shape).
- Scale-out (browser-lane crawl, polite delay, ~60 key RB/WR pages or full rosters on PC): one command per page; tool = pfr_pull.py (write next session, recipe in Part 4).

### 2.2 Scheme/coverage engines [data located; pbp parse = PC/agent lane (pyreadr won't build on iSH)]
- nflfastR pbp (per-game RDS at github.com/nflverse/nflfastR-data/releases/tags/raw_pbp_2026 — 67 assets, current season live) carries: `run_gap`, `run_location` (gap direction), `defense_man_zone_type`, `defense_coverage_shell`, `defenders_in_box`, `xpass`, `xcpoe`, `qb_hit`, pressure flags.
- **Engines to compute on PC** (one pandas pass each):
  a. RB efficiency by gap × location × defenders_in_box → the "zone vs gap" adjacency (gap-assignments: run_gap C/G/T + pull detection via FTN motion? honest note: scheme labels zone/gap are not public; we publish GAP-LOCATION × BOX × YBC — better than most public splits, honest about the label limit).
  b. WR/TE performance by man/zone (`defense_man_zone_type`) + shell (`defense_coverage_shell`) → per-player coverage splits = the man-vs-zone ask, directly.
  c. Blitz-rate & pressure-by-teams (FTN n_blitzers; pbp pressure) → OL pass-pro engine + DC-aggression index (coaching layer).
  d. Play-action/RPO/motion EPA lifts (FTN 2025 8.1MB in hand, cols verified: is_play_action, is_rpo, is_motion, is_screen_pass, is_no_huddle) → offensive-identity fingerprints for totals/props.
- FTN 2025 = ftn_2025.csv (in workspace/data). officials.csv in hand (crew → penalty environments, context_engine refresh).

### 2.3 Coaching & staff engine
- Data located: officials.csv (crews); coaching staff = PFR coaching pages + trades.csv (in nfldata) for coordinator moves; hot-seat tenure table = build from PFR coach history (PC crawl).
- Engines: DC aggression index (blitz rate z-score), OC change shock (synthetic control, registry E), designation honesty (CONTEXTUAL K8), IRL coach reward (registry B).

### 2.4 Birthday/RAE — FINAL PIECE SECURED [iSH-ready]
- players.csv.gz (2.4MB, 24,844 rows) has `birth_date` + draft fields → K3 unblocks: birth-quarter distribution by draft round + age-at-draft vs career-length (§1.3 capital gradients) + age-vs-curve-peak alignment (§1.1). One pandas/stdlib pass on PC or here next session.
- Cross-source ID glue verified: pff_pfr_map_v1.csv (nfldata) + sleeper ids + PFR ids (RobiBi01 pattern) + nflverse gsis ids (players.csv).

## PART 3 — WHAT THE CROSS-RECON SAYS ABOUT "THEIR ENGINES" (meta)
Every cracked competitor (FP consensus, PropFinder EV, LineStar projections, DK's Gaussian ladders, MFL/FFC ADP) reduces to the same skeleton: **harvest → normalize IDs → de-vig/consensus → model overlay → UX**. Nobody in the set publishes: distribution SHAPE reconstruction (our ladders→σ̂), EVT tails, aging/capital priors, or coverage-split props. Those four = the moat. We hold all four paths + the doctrine to keep them honest (kill tests, close-anchored).

## PART 4 — RECIPES (verified tonight)
- **PFR via browser (shell 403)**: navigate any pfr page → in-page fetch same-origin → parse `#adv_rushing_and_receiving` / `#defense_advanced` / `#passing_advanced` tables by `data-stat` cells. Player-id pattern: {LastInitial}{First5}{NN} (RobiBi01). DOB in #meta bio block.
- **nflverse-data release CSVs**: github.com/nflverse/nflverse-data/releases/download/{tag}/{file} (players/players.csv.gz, ftn_charting/ftn_charting_2025.csv, officials/officials.csv verified).
- **pbp RDS**: raw_pbp_{year} releases; parse on PC (pyreadr) — iSH documented-blocked (musl build fail).
- **MFL/FFC/FP lanes**: FANTASY_TOOLING_RECON.md v2.

## QUEUE (next session, priority order)
1. Run RAE/birthday compute on players.csv (iSH, 1 command) → close K3.
2. pfr_pull.py browser crawler: 60 key player pages → OL/DL/coverage engine v1 (YBC/YAC/broken-tackles/pressure tables).
3. PC/agent: pbp man/zone + run_gap compute (engines 2.2a/b) + pbp_participation join.
4. PropFinder XHR capture → their odds API; Novig zero-vig recon.
5. FTN 2025 fingerprints compute (motion/play-action/blitz EPA lifts — iSH-ready, 8MB in hand).

## PART 5 — THE PFR FULL MAP (all surfaces verified live 2026-10-10; browser lane required, shell=403)
| Surface | URL pattern | Verified tables/columns | Engine it feeds |
|---|---|---|---|
| Player page | /players/{L}/{L}{First5}{NN}.htm | adv_rushing_and_receiving (YBC, YAC, broken_tackles, ADOT, drops, target_int, pass_rating), defense, snap_counts, returns, scoring | 2.1 OL/RB attribution, coverage-adjacent, usage/snap engines |
| Team season | /teams/{team}/{year}.htm | games (game-by-game **exp_pts_off/def/st** + full box stats), team_stats, passing, rushing_and_receiving, defense | Team EP archive = independent expected-points source; WPA/EP validation |
| Weekly index | /years/{year}/week_{n}.htm | all boxscore links | crawl driver |
| **Boxscore** | /boxscores/{YYYYMMDD}{away}.htm | **Officials (named crew!)**, stadium, weather/vegas-line present in page (older seasons in HTML comments — parser must unwrap comments) | Referee-environment engine (context_engine refresh), closing-line archive, venue context |
| **Coach page** | /coaches/{Name}{NN}.htm | coaching_results per year: W/L, **srs_total/offense/defense**, playoffs, **chall_num/chall_won**, remarks | Tenure/hot-seat table, challenge-behavior feature (nobody uses), SRS cross-check |
| Draft page | /years/{year}/draft.htm | pick, age, college, career AV | Capital engine extension |
| CFB sibling | sports-reference.com/cfb/... | same structure, college data | CFB/BDB lane (NFL+CFB mandate) |

**Crawl doctrine**: polite (≥2s between pages), browser in-page fetch (same-origin), comments-unwrap parser, store raw HTML + parsed CSVs to snapshots. Player-id pattern {LastInitial}{First5}{NN}; coach ids {Name}{NN} (e.g., MorrRa0). PC/agent can scale the crawl; iSH proof-of-concept done on 5 surfaces tonight.

## PART 6 — FTN 2025 FINGERPRINTS + PFR LINE ARCHIVE (computed live 2026-10-10)
- FTN league baselines (n=47,316 plays): motion 42.0%, play-action 10.7%, RPO 4.5%, screen 3.6%, no-huddle 7.8%, contested 6.0%, drop-when-catchable 5.7% (n=13,510), QB out-of-pocket 9.7%, throwaway 1.7%. read_thrown codes incl. SD (scramble drill) / CHK (checkdown) / 0-2 (depth). Encoding note: flags are TRUE/FALSE strings. Team-level fingerprints = one pbp join away (PC lane) — the baseline table is the normalizer for team z-scores.
- PFR boxscore line archive: closing Over/Under verified LIVE on 2026 boxscores (PHI@JAX O/U 42.0). Spread/weather labels vary by season; parser unwraps comments (66 comment blocks on that page) — pfr_pull.py boxscore_meta handles it.
