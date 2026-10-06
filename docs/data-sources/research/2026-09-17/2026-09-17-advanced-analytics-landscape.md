# Advanced NFL Analytics Landscape
### Galaxy Sports Edge — engine benchmarking dossier

**Last verified:** 2026-09-17
**Purpose:** Catalog the advanced NFL analytics accounts, metrics, and data sources that set the public standard, so GSE's Elo-based engine (v5.2.7) can be benchmarked against them and the gap closed deliberately.
**Companion files:**
- 26-metric deep catalog (definitions, evidence, limitations, source tables): `~/workspace/gse-research/advanced-metrics-data-source-catalog.md`
- Account-hunter raw dossier (101 lines, per-account notes): `~/workspace/nfl-analytics-x-dossier.md`

**How to use this doc:** Section 1 is the people map (who to learn from and engage). Section 2 is the metrics map (what to build). Section 3 is the sourcing map (what's free, what's paid, what's legally usable). Section 4 is the gap analysis (what the engine lacks, ranked). Section 5 is the engagement plan. Nothing here changes the posting gate: posted picks still carry the engine's confidence or Garrett's called pick, never an analyst's read.

**Standing caveat (applies to everything):** predicting team quality is not predicting covers. Markets price public information (open EPA numbers, FPI, PFF grades). These metrics enter the engine as feature candidates for spread/total modeling, not as free edges. The edge comes from implementation quality (opponent adjustment, luck regression, timeliness), not from knowing a metric exists.

**Handle-correction log (seeds that changed on verification, 2026-09-17):** @FO_ASchatz is now @ASchatzNFL. @RichHribar is now @LordReebs. @KevinColePFF is stale, now @KevinCole___. @DrewDinsick is now @whale_capper. @DianteLeeNFL is now @DianteLeeFB. Do not use the old handles.

---

## 1. The analysts

36 X accounts verified via public web search on 2026-09-17. Principle: learn from, do not copy, the analysts.

### 1a. Ray Carpenter — @csv_enjoyer (anchor analyst, verified by Motif)

The analyst whose EPA matchup infographic started this project. Triple-confirmed: his own site raycarp.com signs pages "Ray Carpenter · TheSpade.Substack.com · @csv_enjoyer"; his GitHub org array-carpenter lists "Ray Carpenter — @csv_enjoyer | thespade.substack.com"; multiple outlets (Pride of Detroit, SI, Sporting News, Musket Fire) credit "@csv_enjoyer" on X.

What he builds (all on nflfastR/nflverse, all public at raycarp.com): run-gap EPA charts with league ranks; personnel-grouping EPA/play and success-rate tools with down/quarter/week filters; RayCarp Rankings (Bayesian NFL power ratings, opponent-adjusted, points/game vs average on neutral); NFL on/off EPA tool and player rankings; The Spade weekly newsletter (thespade.substack.com); CFB Stupid Simple Rankings; NFL Draft Comps.

Why he matters: the model of the lane we want. Open data, rigorous definitions, interactive tools, clean visualizations, cited by major outlets. His on/off EPA work is directly relevant to injury-adjustment modeling.

### 1b. Verified accounts — master table

**Data science and decision science**

| Handle | Name | Affiliation | What they post | Known for (metrics) | Reply-friendly? |
|---|---|---|---|---|---|
| @csv_enjoyer | Ray Carpenter | Independent; raycarp.com, The Spade | Open-data NFL research as articles, notebooks, interactive tools: EPA/play, success rate, personnel and rush-gap splits. Reproducible open work, empirical-Bayes and Markov-chain modeling in the open. | EPA, success rate, empirical-Bayes/Markov rankings | Thread/comment friendly in evidence seen |
| @benbbaldwin | Ben Baldwin | RBSDM creator; nflfastR/nflverse co-creator | The upstream plumbing of modern NFL analytics: open R packages plus his own research and fourth-down decision tool. Keeps you honest about how numbers are computed. | EPA, CPOE, success rate, fourth-down win probability | Posts/threads regularly |
| @ASchatzNFL | Aaron Schatz | FTN Chief Analytics Officer; DVOA creator | Team and unit analysis through opponent-adjusted efficiency, plus DYAR-style player valuations. Oldest continuously-maintained public team rating system. | DVOA, DYAR, opponent-adjusted ratings | Posts regularly |
| @bburkeESPN | Brian Burke | ESPN sports data scientist; analytics pioneer | Win probability models, fourth-down recommendations, ESPN lineman metrics. Decision-oriented, calibrated on real game states. | Win probability, fourth-down recommendations, RBWR/RSWR | Posts regularly |
| @StatsbyLopez | Michael Lopez | NFL Football Data and Analytics (leadership) | Causal research on fourth-down decision-making, win-probability calibration, matching methods, tracking and Big Data Bowl work. The causal-inference voice. | Causal fourth-down research, WP calibration, matching methods | Posts/threads regularly |
| @KeeganAbdoo | Keegan Abdoo | Next Gen Stats, Senior Manager of Research and Analytics (per 2026 material) | Research threads on official tracking data: pressure probability, completion/conversion probability, combine athletic scoring. Shows what raw measurements can support. | Pressure probability, completion/conversion probability | Posts research threads |
| @SethWalder | Seth Walder | ESPN analytics writer | Pass-rush/pass-block win rates, Receiver Tracking Metrics, roster-value and team-building research. Translates tracking into roster-construction arguments. Note: posts more on Bluesky as of 2026. | PRWR/PBWR, Receiver Tracking Metrics, roster value | DMs noted open; X reply rate unestablished |

**Independent metrics builders**

| Handle | Name | Affiliation | What they post | Known for (metrics) | Reply-friendly? |
|---|---|---|---|---|---|
| @KevinCole___ | Kevin Cole | Unexpected Points; former PFF data scientist | QB EPA/play tiers, draft-board reach/steal analysis, Offseason Improvement Index on projected roster point differential (verified 2026 work). Roster-change modeling. | QB EPA/play, draft value above expectation, roster point-differential index | Posts/threads regularly |
| @tejfbanalytics | Tej Seth | Independent | NFL data tutorials and open research: public Rush Yards Over Expectation model with blocking context, aging curves, rushing efficiency. Teaches as much as he analyzes. | RYOE, aging curves, rushing efficiency | Posts tutorials regularly |
| @greerreNFL | Robby Greer | Independent; nfelo creator/maintainer | Open NFL Elo rating system with game predictions, betting-model context, Weighted EPA components. Fully public, replicable power rating. Ideal benchmarking peer for our Elo engine. | NFL Elo power ratings, predictions, Weighted EPA | Project docs explicitly invite DMs |
| @MathBomb | Kent Lee Platte | RAS.football creator | Relative Athletic Scores: position-adjusted combine/pro-day size, speed, explosion, agility on a 0-10 historical scale. Most-cited athletic composite in draft media. | Relative Athletic Score (RAS) | Posts regularly |

**Film and scheme**

| Handle | Name | Affiliation | What they post | Known for (metrics) | Reply-friendly? |
|---|---|---|---|---|---|
| @BrandonThornNFL | Brandon Thorn | Trench Warfare (independent); 2026 material associates Bleacher Report | OL tiers, prospect grading, OL/DL mismatch analysis with technique and scheme context. The most respected independent OL/DL evaluator. | OL tiers, True Sack Rate, trench matchups | Posts regularly |
| @BaldyNFL | Brian Baldinger | NFL Network; former NFL OL | "Baldy's Breakdowns": film clips on protection schemes, line technique, pass rush (active Sep 2026). Former-player eyes on tape. | Film-based protection/technique analysis | Posts regularly |
| @BenjaminSolak | Benjamin Solak | ESPN NFL analyst | Tape-driven QB processing, pressure looks, route concepts, scheme and player evaluation (active Sep 2026). Connects scheme intent to statistical output. | Scheme/QB film evaluation | Posts regularly |
| @Nate_Tice | Nate Tice | Yahoo Sports; Football 301 | Scheme, personnel, trench and draft evaluation layered with selected analytics (DVOA, tracking). Bridge between film and analytics. | Scheme/personnel; cites DVOA and tracking | Posts regularly |

**Fantasy and projections**

| Handle | Name | Affiliation | What they post | Known for (metrics) | Reply-friendly? |
|---|---|---|---|---|---|
| @MikeClayNFL | Mike Clay | ESPN senior NFL/fantasy writer | Annual player/team projections, projected standings, strength of schedule, win probabilities, unit grades, WR/CB shadow reports. Largest-audience projection set in fantasy. | Projections, SOS, shadow reports | **Reply-friendly: 2026 draft guide explicitly invites questions and error reports** |
| @LordReebs | Rich Hribar | Sharp Football Analysis | The Worksheet: usage/scoring splits, matchup trends, fantasy projections with heavy chart support. Relentlessly usage-first. | Usage/scoring splits, matchup trends | Q&A-friendly on shows |
| @ihartitz | Ian Hartitz | RotoWire analyst (2026) | Film-backed usage analysis: targets/routes, broken tackles per touch, "Sheesh" series on missed/nullified scoring (fresh Week 2 work Sep 15, 2026). | Targets/routes, broken tackles, nullified-scoring analysis | Posts regularly |
| @DwainMcFarland | Dwain McFarland | Fantasy Life | Snap share, route participation, target share, utilization framework (active Sep 14-15, 2026). Clearest utilization thinker in the space. | Snap share, route participation, utilization | Posts regularly |

**Betting markets**

| Handle | Name | Affiliation | What they post | Known for (metrics) | Reply-friendly? |
|---|---|---|---|---|---|
| @RufusPeabody | Rufus Peabody | Pro bettor; Unabated co-founder | Betting modeling: opponent adjustment, garbage-time and penalty-noise removal, regression toward market, power ratings. The gold standard for noise removal. | Opponent-adjusted ratings, noise removal, power ratings | Q&A-friendly in appearances |
| @ClevTA | ClevTA | ClevAnalytics founder; NFL handicapper | Matchup/team ratings, blended win probabilities, survivor optimization, transparently tracked ATS/ROI records. Radical transparency (self-published records). | Blended win probabilities, survivor optimization, tracked ATS | Posts regularly |
| @whale_capper | Drew Dinsick | NBC Sports betting analyst | Market pricing: sides, totals, futures, player props (verified 2026 NFL content). Clean fundamentals-based market analysis. | Market pricing, sides/totals/futures | Posts regularly |

**Essential brands (original data/charting companies, not aggregators)**

| Handle | Name | What they post | Known for | Note |
|---|---|---|---|---|
| @NextGenStats | NFL Next Gen Stats | Player-tracking visualizations, probability graphics, research highlights from league sensors | Completion probability, expected rush yards, separation, win probability | Primary source; expect broadcasts, not replies |
| @PFF | Pro Football Focus | Play-by-play grades, pressures, blocking grades, charting-driven analysis | PFF grades, pressures, blocking grades | Largest human-charting operation; broadcasts, not replies |
| @SumerSports | SumerSports | EPA, personnel tendencies, pressure-to-sack analysis, frame-level probabilities, SumerScore | EPA, personnel tendencies, SumerScore | Most publicly open charting company; broadcasts, not replies |

### 1c. Strong alternates (verified, didn't make the 25-cut)

| Handle | Name | Lane | Note |
|---|---|---|---|
| @SamHoppen | Sam Hoppen | Data science | NFL data scientist (theScore Bet); EPA/play, expected pass probability, win-probability/EPA waterfalls |
| @DianteLeeFB | Diante Lee | Film/scheme | The Ringer; defensive structure, coverage, pressure, run-defense tendencies |
| @ChrisRaybon | Chris Raybon | Betting/fantasy | Action Network; spreads, totals, props, projections; bets tracked publicly |
| @Josh_Insights | Josh Appelbaum | Betting | VSiN; contrarian betting, sharp-money indicators, market splits, line movement |
| @TheoAshNFL | Theo Ash | Film | Stay Hot/independent; QB, scheme, draft film analysis |
| @notJDaigle | John Daigle | Fantasy | Establish The Run; draft strategy, ADP/value, usage, backfields |
| @adamlevitan | Adam Levitan | DFS | Establish The Run co-founder; DFS process, ownership, props (active Sep 2026) |
| @evansilva | Evan Silva | Fantasy | Establish The Run; team-by-team matchup analysis, rankings (current Sep 16, 2026) |
| @SharpFootball | Warren Sharp | Betting/analytics | Annual preview charts, situational efficiency, personnel tendencies, schedule analysis |
| @FezzikSports | Steve Fezzik | Betting | Pro bettor; power ratings, opening lines, injury adjustments, teaser strategy (fresh Sep 2026) |
| @SportsInfo_SIS | Sports Info Solutions | Essential brand | Original charting company; Total Points, routes/coverages/assignments |

### 1d. Unverified — do not list as current without further verification

- Timo Riske (PFF data scientist): current role and 2026 work verified, but no exact handle confirmed in search results. Keep out until the connection surfaces.
- Nathan Jahnke (PFF fantasy): current role and 2026 work verified, no exact handle confirmed. Keep out.
- Engagement assessments are conservative: only @MikeClayNFL (explicit invitation) and @greerreNFL (nfelo docs invite DMs) have documented outreach channels. Everywhere else, reply frequency is unestablished, not inferred.

### 1e. The five most important follows (account-hunter's ranking)

1. **@csv_enjoyer** — the open-data well; reproducible methods to audit and rebuild from.
2. **@benbbaldwin** — builds the infrastructure everyone stands on; understand computation before arguing meaning.
3. **@ASchatzNFL** — the DVOA standard-bearer; longest track record in public team ratings.
4. **@KeeganAbdoo** — tracking research from inside NGS; separates real signal from tracking-data theater.
5. **@MikeClayNFL** — the actionable-projections follow; most reply-friendly in the set; best public baseline for comparing any forecast engine.

---

## 2. The metrics

Full definitions, predictive evidence, and limitations for 26 metrics live in the companion file (`~/workspace/gse-research/advanced-metrics-data-source-catalog.md`). This section is the executive map plus the definitional traps that would corrupt an engine mixing providers.

### 2a. Efficiency core (the engine's missing foundation)

| Metric | One-line definition | Trap to avoid |
|---|---|---|
| EPA/play (team) | Change in Expected Points per play; EP from down/distance/field position baselines | nflfastR vs ESPN EP models differ slightly; filter garbage time and kneels |
| Dropback EPA / Rush EPA | EPA per pass play (incl. sacks/scrambles per convention) vs per designed run | Scramble classification differs by provider; state the convention |
| Success rate | Share of "successful" plays | THREE competing definitions: nflfastR (EPA>0), Football Outsiders (40/60/100), Connelly (50/70/100). Never mix. |
| DVOA (FTN) | Per-play value vs situational average, opponent-adjusted; 0% = average | Proprietary; no public feed; weekly tables only |
| DAVE | DVOA blended with preseason forecast, decaying weight (verified: Week 1 2026 was 83% prior on offense, 98% on defense/ST) | The prior is proprietary; the concept (shrinkage) is what we need |
| EPA+CPOE composite | QB index blending EPA value with accuracy-over-expected | Canonical weighting UNVERIFIED; build our own weights, don't borrow |

Key research: passing efficiency explains wins far more than rushing efficiency (corr ~0.53-0.61 vs ~0.13-0.19). A 2026 early-season study found passing EPA predicts future point differential (r ~ 0.42 at 6 games) better than success rate, though success rate stabilizes faster (~r = 0.60 by game 6).

### 2b. Quarterback efficiency

| Metric | One-line definition | Trap to avoid |
|---|---|---|
| CPOE | Completion rate minus expected rate given throw difficulty | Entirely model-dependent; nflfastR's CPOE is one specification |
| DYAR/DVOA (player) | Opponent-adjusted value above replacement, in yards | Cumulative; convert to per-play before using for spreads |

### 2c. Trenches and pressure (the most predictive matchup lens)

| Metric | One-line definition | Trap to avoid |
|---|---|---|
| Pressure rate | Share of pass plays producing hurry/hit/sack | "Pressure" is charted; definitions differ. PFF research: pressure CREATION is the stable skill; sacks are the noisy outcome |
| PRWR / PBWR (ESPN) | Pass rush win within 2.5s / pass block sustain for 2.5s+ | Proprietary; rankings only, no feed. 2026 methodology update (bull rushes, chips, stunts) supersedes legacy descriptions |
| RBWR / RSWR (ESPN) | Run block / run stop win rates from tracking | Same sourcing problem; run game matters less than pass game |
| SIS blown block | Blocker fails to engage his defender | Primary SIS glossary NOT located; exact wording unverified |
| Time to throw | Snap-to-release seconds (NGS) | Descriptive, not normative; pair with pressure data |

### 2d. Explosiveness and finishing

| Metric | One-line definition | Trap to avoid |
|---|---|---|
| Explosive-play rate | Share of chunk-gain plays | Threshold varies (15/10 vs 20-yard conventions); state it |
| Havoc rate | Share of defensive plays with TFL/forced fumble/PD | NO NFL standard definition; fix one before computing |
| Stuff rate | Share of rushes for no gain or loss | Boundary (does zero count?) varies |
| Red-zone EPA | EPA/play inside the 20 | Red-zone CONVERSION is near-noise (Schatz's critique); red-zone TRIP rate is the sticky part |
| Late-down efficiency | 3rd/4th down conversion | 2012 hierarchical-Bayes study: raw 3rd-down conversion "nearly meaningless." Use early-down success / all-downs efficiency (predictive r ~ 0.36) |

### 2e. The luck layer (where Elo bleeds)

| Metric | One-line definition | Trap to avoid |
|---|---|---|
| Turnover margin/luck | Realized turnovers vs expected | Turnovers regress hard to zero; model the PROCESS (turnover-worthy plays, fumble recovery rates, INT vs expected), never carry raw margin forward |
| Special-teams EPA | EPA on kicks/punts/returns | Small weight; Wharton study: +1.9% RMSE improvement. Real but rarely flips a pick alone |

### 2f. Game-state and situational

| Metric | One-line definition | Trap to avoid |
|---|---|---|
| Situation-neutral pace | Seconds per play excluding garbage time | Filter choices change the number; trailing teams hurry (confounds intent) |
| 4th-down aggressiveness | Go-rate vs WP-model recommendation | Models disagree at margins; aggressiveness correlates with roster quality |
| Wind/weather | Wind effects on passing/kicking/totals | Nonlinear; interacts with stadium/roof/direction. No flat "X mph = Y points." HIGH for totals, LOW for moneyline |
| Rest (bye/mini-bye/short week) | Days-of-rest differentials | 2024 analysis: bye-week edge largely VANISHED post-2011 CBA. Tiny coefficients only |
| Travel/time zones/altitude | Circadian and venue effects | No verified NFL coefficient; FPI includes an altitude term (weak evidence nonzero). Experimental only |
| Strength of schedule | Opponent-quality correction | Forward SOS = market-based (projected win totals); backward = efficiency-based. Never raw prior-season win% |

### 2g. Composite ratings (benchmarks, not inputs)

| Metric | One-line definition | Trap to avoid |
|---|---|---|
| ESPN FPI | Predictive margin vs average on neutral; EPA/play-based, Vegas-anchored preseason prior | No feed; partially IS the market (limited edge vs close) |
| PFF grades | Per-play execution grades, -2 to +2 scaled 0-100 | Analyst judgment; assignment ambiguity; paywalled database |
| SIS Total Points | EPA distributed across positions via charting | Proprietary; no public download |
| Separation / open rate | WR/TE distance from nearest defender (NGS SEP), ESPN all-routes Open/Catch/YAC, PFF charted "open" | Three incompatible implementations; NGS SEP conditions on targets (selection bias). NGS tables free via nflverse |
| RYOE | Rush yards over tracking-expected | Rushing weakly predicts wins; best for RB/OL decomposition |

---

## 3. Data sources: free vs paid vs social-only

### 3a. Free (the legal foundation)

| Source | What's available | License |
|---|---|---|
| nflverse (nflfastR/nflreadR) | Play-by-play 1999+, rosters, schedules, depth charts, injuries, snap counts, participation, NGS tables, PFR advanced mirror, FTN charting subset (2022+) | Code MIT; data CC-BY 4.0 (credit "nflverse"); FTN charting CC-BY-SA 4.0 (share-alike) |
| RBSDM.com (Ben Baldwin) | Public EPA/success/CPOE leaderboards | Public site; underlying data is nflverse |
| Pro Football Reference (free) | Box scores, splits, game logs, history | Free to read; no scraping/API right in ToS (bulk = Stathead) |
| NFL official / ESPN public endpoints | Scores, schedules, published FPI/win-rate rankings | Public reading only; ESPN endpoints are not a licensed API |
| Kaggle/GitHub mirrors | Community datasets incl. betting-line archives | Varies; validate against nflverse |
| The Spade (Ray Carpenter) | Weekly viz newsletter, methods inspiration | Author IP; methods R&D, not a data feed |

### 3b. Paid

| Source | What's available | Cost (verified 2026-09-17) |
|---|---|---|
| PFF (Pro tier) | Grades database, programmatic access for modeling | $9.99/mo, $99.99/yr, $199.99/yr Pro (Sep 2026 price drop). Cheapest legitimate path to grade-level data |
| FTN consumer (NFL Pro) | DVOA/DYAR, StatsHub, projections | $109.99/yr. DVOA is FTN IP |
| Stathead | Full Play Index queries | Historical $8/mo single / $16/mo all (2020); verify current |
| SIS | Charting DB, Total Points, blown blocks | Enterprise; pricing not public |
| SumerSports | Team platform; SumerPass consumer (free trial ~Sep 2026) | Enterprise; pricing not public |
| TruMedia/Stats Perform, Sportradar, Stats Perform, SportsDataIO | Feeds, tracking products, odds data | Enterprise; pricing not public. Sportradar is the NFL's official data-rights partner (nine-figure territory) |

### 3c. Scraped / social-only

ESPN published rankings, FTN DVOA tables, X charting accounts, Substacks. Research inputs, not redistribution sources.

### 3d. Licensing reality (five rules)

1. Facts aren't copyrightable; compiled databases and presentations are. Computing our own EPA from nflverse is clean; republishing PFF's grades table is not.
2. nflverse is the engine's legal foundation: CC-BY 4.0 (credit "nflverse"), FTN charting subset CC-BY-SA 4.0. The only source here that affirmatively grants reuse. Build the v1 feature set here.
3. Public reading is not redistribution. ESPN, PFR free tier, RBSDM: free to read, no scraping/redistribution right. Scraped tables for internal research are low-risk; publishing or serving them is not.
4. The NFL owns the tracking data. NGS raw tracking is licensed commercially via Sportradar. Summary NGS tables via nflverse are usable; the raw RFID feed is enterprise-only.
5. "Pricing not public — enterprise/consulting" is the honest label for SIS, SumerSports (team tier), TruMedia/Stats Perform, Sportradar, Stats Perform. Budget five-to-six figures and verify with sales before planning around them.

**Hard rule: we read and learn from public posts; we never republish anyone's proprietary charts as our own.**

---

## 4. Gap analysis: what the Elo engine does not use (ranked by expected value)

Engine context (Sports AGENTS.md, 2026-09-13): v5.2.7 is Elo-based; the 2026-09-13 factor audit found all signal picks single-source Elo (`sources:["elo"]`, `agreement:"SOLO"`); NFL has only ~70 settled picks ever, so the NFL calibration head is CLV-only; the ESTABLISHED blocker is CLV beat-close 23.0% vs 52.4%; v5.3.0 (in build) adds a conjunction gate comparing model p against live de-vigged market p, a beat desk, and context/narrative factors. The scraping queue already targets coverage splits, public consensus, coach news, and prop closing lines. The engine already reads nflverse (GSE Score processGrade) and has a factor-breakdown scaffold. What follows is what's still missing.

### The top 5 (build these first)

**1. Opponent-adjusted EPA/play team ratings, dropback/rush split (HIGH).**
Elo adjusts for opponent through score margins only. It never sees per-play efficiency, and it weights a 3-yard run the same as a 30-yard pass in its information set. A DVOA-style opponent-adjusted EPA/play (with the dropback/rush split, since passing efficiency predicts at corr ~0.53-0.61 and rushing at ~0.13-0.19) is the single biggest structural upgrade available. Implementable entirely on free nflverse data. This is the power-rating core the engine should grow into; Elo becomes one input among several rather than the whole model.

**2. Turnover regression: expected turnover differential (HIGH).**
Raw Elo bakes turnover luck into team strength. Turnover margin regresses hard toward zero, which means teams with great efficiency but bad turnover records are systematically UNDERVALUED by record-based ratings, and vice versa. The catalog calls this "the single biggest upgrade available to an Elo-based engine." Implementable from free data: fumble rates, fumble recovery rates, INT rates vs expected. No charting required for v1.

**3. OL vs DL pressure matchup: pressure rate, PBWR/PRWR-style features (HIGH).**
The engine is completely blind to the trenches, and pressure is the most predictive single matchup lens in football. Pressure CREATION is the stable skill (predicts future sacks better than prior sacks do); pressure-to-sack conversion is noisy and QB-influenced. FTN charting inside nflverse (free, CC-BY-SA) gives pressure data now; ESPN's PRWR/PBWR tables are manual-only (no feed) but usable as a research benchmark.

**4. QB efficiency: EPA/dropback + CPOE (HIGH).**
The highest-leverage single position input in the sport, and the engine has no QB-efficiency term distinct from team Elo. CPOE (completion % over expected) is the cleanest public QB-accuracy signal and it's free via nflverse. A QB prior built on EPA/dropback + CPOE also powers the injury/substitution adjustment (backup QB downgrade), which Elo handles crudely.

**5. Market-relative calibration features: CLV tracking, consensus, line movement (HIGH).**
This attacks the ESTABLISHED blocker directly (CLV 23% vs 52.4%). The v5.3.0 conjunction gate compares model p to de-vigged market p at publish time; the missing piece is learning FROM the market: closing-line value as a training label, public consensus splits (already in the scraping queue), and line-movement features. The market is the best available ensemble of everyone in sections 1-2; calibrating against it is not surrender, it's the fastest path to the 52.4% bar.

### Next tier (build after the top 5)

6. **Explosive-play differential (HIGH for spreads/totals):** free to compute, stable team trait, decides most games. Offense-creates vs defense-prevents.
7. **DAVE-style early-season shrinkage (HIGH, esp. early season):** blend observed efficiency toward a Vegas-anchored preseason prior with decaying weight. Verified FTN behavior: Week 1 2026 was 83% prior on offense. Critical for a thin-sample engine; directly addresses the "NFL n=70" problem.
8. **Situation-neutral pace + stadium-specific wind modeling (HIGH for totals):** the two biggest totals inputs the engine likely lacks. Pace from nflverse game-seconds fields; wind modeled per stadium, never as a flat deduction.
9. **Special-teams EPA (MEDIUM):** small, real, systematically unpriced (~2% RMSE improvement per Wharton). Additive adjustment, free from nflverse.
10. **Coaching aggressiveness prior (MEDIUM):** 4th-down go-rate vs model; systematic ~0.5-1.5 pts/game hiding in coaching tendencies. Implementable free via nflverse + nfl4th-style decision models.
11. **Coverage/box-count splits (MEDIUM):** already in the scraping queue; "this QB reads zone better than man," "this RB vs stacked boxes." More prop-relevant than spread-relevant at first.
12. **Red-zone trip rate (MEDIUM):** track opportunity (predictive), not conversion (noise).
13. **PFF grades / SIS charting (MEDIUM, paid):** the first paid upgrade worth evaluating AFTER the free stack is exhausted. PFF Pro at $199.99/yr with programmatic access is the cheapest legitimate path. No paid data until the free features are live and measured.

### Explicitly deprioritized (evidence says small or zero)

- **Rest/bye-week coefficients (LOW):** the 2024 analysis finds the bye edge largely vanished post-2011 CBA. Tiny experimental terms only.
- **Travel/time-zone/altitude (LOW):** no verified NFL coefficient. Experimental label, no shipped number without backtest.
- **Raw 3rd-down conversion (TRAP):** "nearly meaningless" per hierarchical-Bayes literature. Use early-down success instead.
- **Rush EPA as a team-strength driver (LOW):** rushing efficiency predicts at a fraction of passing efficiency. Keep for matchup texture, not power ratings.

---

## 5. Engagement targets: 10 accounts to follow and reply to first

Selection criteria: high signal, original analysis (not aggregation), reply-accessible where documented, and relevance to a prediction engine's needs. Engagement rules: reply with substantive observations, never pitch; quote-post charts only with our own computed angle and real numbers; no engagement pods (zero ranking impact); replies are engagement, not reach, but they build the analyst relationships that surface methods early.

| # | Handle | Why first | Best reply angle |
|---|---|---|---|
| 1 | @csv_enjoyer | Anchor analyst; open-data methods we can audit and rebuild; the lane model | His EPA charts: reply with a computed extension (e.g. our on/off split for the same matchup) |
| 2 | @benbbaldwin | Builds the infrastructure (nflfastR/nflverse); methodology threads | Computation questions: how a number is built, not what it means |
| 3 | @ASchatzNFL | DVOA standard-bearer; weekly ratings are the benchmark to beat | Unit-level DVOA breakdowns; compare our efficiency splits when they diverge |
| 4 | @MikeClayNFL | Only explicitly reply-friendly analyst in the set; largest public projection baseline | Methodological questions on projections; he invites error reports |
| 5 | @KeeganAbdoo | NGS tracking research from inside the source; pressure/completion probability | Tracking-data interpretation; what the sensors genuinely support |
| 6 | @SethWalder | ESPN win rates + receiver tracking; front-office roster-value thinking | OL/DL win-rate matchups; note he is more active on Bluesky in 2026 |
| 7 | @KevinCole___ | QB EPA tiers; roster-change point-differential modeling | QB efficiency priors; offseason roster-change quantification |
| 8 | @SharpFootball | Warren Sharp; situational efficiency + personnel tendencies; betting-adjacent audience | Situational splits; schedule and personnel-tendency angles |
| 9 | @RufusPeabody | Pro bettor; noise-removal and opponent-adjustment methodology | Power-rating construction; garbage-time and penalty-noise handling |
| 10 | @greerreNFL | Open Elo (nfelo); direct benchmarking peer for our Elo core; DMs explicitly invited | Head-to-head rating comparisons; Weighted EPA components |

Also follow (broadcast value, low reply expectation): @NextGenStats, @PFF, @SumerSports, @SportsInfo_SIS.
Second wave: @whale_capper, @ClevTA, @LordReebs, @ihartitz, @DwainMcFarland, @TheoAshNFL, @bburkeESPN, @StatsbyLopez, @tejfbanalytics, @BrandonThornNFL, @ChrisRaybon, @Josh_Insights, @SamHoppen, @FezzikSports, @Nate_Tice, @BenjaminSolak, @BaldyNFL, @DianteLeeFB, @notJDaigle, @adamlevitan, @evansilva, @MathBomb.

---

## Appendix: verification log

| Claim | Status | Evidence |
|---|---|---|
| Ray Carpenter X handle = @csv_enjoyer | VERIFIED | raycarp.com footer; array-carpenter GitHub; Pride of Detroit / SI / Sporting News / Musket Fire credits (Motif) |
| raycarp.com real, nflfastR-based tools | VERIFIED | Live site: run-gap charts, personnel groupings, RayCarp Rankings, on/off tool, The Spade (Motif) |
| TheSpade.substack.com | VERIFIED | Linked from raycarp.com as weekly football analytics newsletter (Motif) |
| 36 X accounts (25 main + 11 alternates) | VERIFIED | Public web search, 2026-09-17 (account-hunter worker) |
| Handle corrections (@ASchatzNFL, @LordReebs, @KevinCole___, @whale_capper, @DianteLeeFB) | VERIFIED | Search results supersede seed list (account-hunter worker) |
| Timo Riske / Nathan Jahnke handles | UNVERIFIED | Roles verified; exact handles not confirmed. Excluded from tables |
| DAVE Week 1 2026 weights (83% off / 98% def+ST) | VERIFIED | FTN live tables (metrics worker) |
| PFF pricing $9.99/$99.99/$199.99 Pro | VERIFIED | PFF.com, Sep 2026 price drop (metrics worker) |
| FTN NFL Pro $109.99/yr | VERIFIED | ftnfantasy.com (metrics worker) |
| nflverse data CC-BY 4.0; FTN charting CC-BY-SA 4.0 | VERIFIED | nflreadr docs (metrics worker) |
| Bye-week edge vanished post-2011 CBA | VERIFIED | 2024 arXiv analysis (metrics worker) |
| Raw 3rd-down conversion "nearly meaningless" | VERIFIED | 2012 hierarchical-Bayes study via de Gruyter (metrics worker) |
| EPA+CPOE composite canonical weights | UNVERIFIED | No primary source found; do not cite as standard |
| SIS blown-block exact glossary wording | UNVERIFIED | Primary SIS glossary not located |

---

*End of dossier. AGENTS.md section to be written by parent from this file. Do not edit Sports AGENTS.md from this task.*
