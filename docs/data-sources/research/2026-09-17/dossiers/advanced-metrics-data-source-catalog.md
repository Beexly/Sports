# Advanced NFL Metrics & Data-Source Catalog
### Galaxy Sports Edge — engine gap analysis, as of September 2026

**Purpose:** benchmark GSE's Elo-based engine (v5.2.7, moneyline-focused, thin NFL sample) against the advanced metrics the sharpest public NFL analysts use, and map where every data input can be sourced. Compiled 2026-09-17 from primary sources (linked inline). Every formula, price, and license claim below comes from a cited source; where it does not, it is flagged **unverified**.

**How to read this:** each `### Metric` section gives a precise definition, the reason it predicts wins/covers (with the evidence), its limitations, and a one-line **Engine relevance** tag for GSE. Metrics whose meaning varies by provider are labeled **family (definition varies by provider)** so the engine never silently swaps one implementation for another.

> **Caveat that applies to everything:** predicting *team quality* is not the same as predicting *covers*. Efficient betting markets already price public information (open EPA numbers, FPI ratings, PFF grades), so most of these metrics enter the engine as feature candidates for a spread/total model, not as free edges. The edge comes from implementation quality (opponent adjustment, regression of luck, timeliness), not from knowing the metric exists.

---

## PART 1 — METRIC CATALOG

### EPA per play (team)

EPA is the change in Expected Points from before a play to after it; Expected Points is the historical average net point value of a game state defined by down, distance, and field position. EPA/play is the total of those values divided by play count. [PFF](https://www.pff.com/news/bet-nfl-bet-terms-metrics-game-script-handicapping-success-rate-epa) treats it as normalized for play volume and calls it fairly reliable for identifying strong teams; [Sports Reference](https://www.sports-reference.com/blog/2012/03/features-expected-points/?__hstc=223721476.9efbef7fa1432b5b7e16b86bba1c0b26.1718098848096.1718098848096.1718098848096.1&__hssc=223721476.1.1718098848096&__hsfp=3933029790) explains the EP baseline.

**Why it predicts:** EPA/play compresses down, distance, field position, and score context into one additive, per-play efficiency number, so it separates teams that sustain drives from teams that flatter raw yardage. Independent work (see Late-down section) finds pass EPA a top early-season predictor of future point differential.

**Limitations:** models differ slightly (nflfastR vs ESPN QBR-based EP), garbage-time plays and kneels need filtering, and raw season-to-date EPA mixes opponent strength with team strength.

**Engine relevance:** HIGH — the single most useful team-efficiency input; compute from free nflverse data with opponent adjustment and situational filtering.

### Dropback EPA / Rush EPA

**Family (definition varies by provider).** Dropback EPA is EPA per pass play, i.e. EPA on plays where the QB attempted a pass, including sacks and scrambles in the [4for4 convention](https://www.4for4.com/2022/preseason/nfl-team-stat-explorer-glossary); rush EPA is EPA per designed run, excluding QB scrambles there. Other providers classify scrambles differently, so **state the filtering convention** before comparing.

**Why it predicts:** passing efficiency drives NFL outcomes far more than rushing efficiency; the classic [Advanced Football Analytics expected-wins model](https://github.com/topfunky/r-nfl-expected-wins) shows offensive passing efficiency (corr ~0.53-0.61) vastly outweighs rushing efficiency (corr ~0.13-0.19) in explaining wins. An independent 2026 early-season study found **passing EPA a better predictor of future point differential (r ≈ 0.42 at 6 games) than success rate**, despite stabilizing later. ([Medium/M. Zhou](https://medium.com/@mrz9144/which-early-season-nfl-stats-can-you-actually-trust-1356b4784863))

**Limitations:** small samples early in the season; scrambles classification changes the split; sacks-as-passing-plays convention must match the EPA model.

**Engine relevance:** HIGH — dropback EPA (split from rush EPA) is the strongest single offensive feature candidate for spread/total modeling.

### Success rate

**Family (definition varies by provider).** Three common definitions: (1) the [nflfastR convention](https://ontapsportsnet.com/nfl/football-stats-glossary-guidebook-nfl-advanced-metrics/): a play is successful if EPA > 0; (2) the [Football Outsiders convention](https://www.espn.ph:443/nfl/news/story?id=3079031): gain ≥40% of line-to-gain on 1st down, ≥60% on 2nd, 100% on 3rd/4th; (3) the [Bill Connelly/college convention](https://247sports.com/college/utah/longformarticle/utah-utes-introduction-to-advanced-stats-152235041/): 50%/70%/100%. Never present one as universal.

**Why it predicts:** success rate measures play-to-play consistency, which stabilizes faster than EPA (the Medium study above: offensive success rate reaches ~r = 0.60 stability by game 6). Consistent offenses stay on schedule and convert.

**Limitations:** it weights all successful plays equally, so it undervalues explosives; and despite stabilizing first, it is *less* predictive of future scoring than passing EPA, per the same study. It describes the past efficiently but is the weaker forward input.

**Engine relevance:** MEDIUM — useful as a secondary/early-season feature alongside EPA; do not rank it above dropback EPA.

### CPOE (Completion Percentage Over Expected)

Actual completion outcome (or rate) minus the model's estimated completion probability, where the expected rate reflects throw difficulty (air yards, field placement, and other variables). [FantasyLife](https://www.fantasylife.com/articles/fantasy/what-is-cpoe-grading-a-quarterbacks-accuracy-on-a-curve) and [SIS](https://www.sportsinfosolutions.com/2020/04/02/evaluating-draft-prospects-using-predicted-completion-percentage/) describe it as grading QB accuracy "on a curve." PFF notes college CPOE shows some stability translating to the NFL. ([PFF](https://www.pff.com/news/college-football-what-college-completion-percentage-over-expected-cpoe-tells-us-about-the-2022-nfl-draft-qb-class))

**Why it predicts:** CPOE isolates QB accuracy from scheme/depth of target, and QB accuracy persists, so it separates sustainable passing from completion-rate mirages built on screens and checkdowns.

**Limitations:** it is entirely model-dependent (different expected-completion models give different CPOEs); the public nflfastR CPOE is proprietary to that model's specification.

**Engine relevance:** HIGH — the best public QB-efficiency signal for moneyline/spread team-strength priors.

### EPA+CPOE composite

A composite index that combines a QB's EPA-based efficiency with CPOE (used in public QB rankings and cited as a next-year predictor). [Source](https://mfootballanalytics.com/2020/08/29/creating-a-model-for-quarterback-rankings-in-2020/)

**Why it predicts:** it blends value (EPA) with a stable accuracy signal (CPOE), smoothing the high-variance explosive events in EPA.

**Limitations:** **canonical weighting/formula unverified** — secondary material describes the index, but no primary (Ben Baldwin) source for the exact weights was found. If GSE uses it, define the formula explicitly and backtest it; do not cite it as a standard.

**Engine relevance:** MEDIUM — fine as a custom-built QB prior, but build and validate the weights in-house rather than borrowing an unverified one.

### DVOA

**Family (FTN implementation is canonical now).** DVOA (Defense-adjusted Value Over Average) evaluates every play against a situational league-average baseline and adjusts for opponent quality; expressed as a percentage with league average 0% (defenses are better when negative). Now published by [FTN Fantasy](https://www.si.com/nfl/nfl-standings-ordered-by-total-dvoa), originally Football Outsiders. It is built on official play-by-play, not charting.

**Why it predicts:** opponent adjustment is the single biggest correction raw efficiency needs (see the 2026 SOS debate below), and DVOA has a decades-long track record as the canonical opponent-adjusted efficiency metric.

**Limitations:** proprietary formula details; weekly numbers move with opponent adjustments retroactively; DVOA does not publish a public API — it is a published ranking, not a feed.

**Engine relevance:** HIGH — as a *benchmark* the engine must correlate with/beat; as an input, scrape only the published weekly tables (redistribution of scraped tables has license risk — see Part 3).

### DAVE

DAVE is DVOA Adjusted for Early-season: a weighted blend of the preseason forecast and current-season DVOA, where the preseason weight decays as games accumulate. Verified from FTN's live tables: after Week 1 of 2026, DAVE was **83% preseason forecast for offense and 98% for defense/special teams**; by Week 11 of 2025 it was **12% offense / 35% defense+ST**. ([Week 1 2026](https://ftnfantasy.com/nfl/week-1-dvoa-san-franciscos-big-victory), [Week 11 2025](https://ftnfantasy.com/nfl/week-11-dvoa-ratings-the-topsy-turvy-year))

**Why it predicts:** early-season observed efficiency is mostly noise; blending toward a preseason prior is the textbook shrinkage solution, and DAVE operationalizes exactly that.

**Limitations:** the preseason projection is itself proprietary and possibly stale (injuries, trades); the decay schedule is fixed, not adaptive.

**Engine relevance:** MEDIUM — the *concept* (shrinkage toward a prior) should be built into GSE's own early-season ratings; the FTN number is a useful benchmark, not a required input.

### DYAR

Defense-adjusted Yards Above Replacement: a player's situationally- and opponent-adjusted performance (in the DVOA manner) translated into approximate yardage value versus a replacement-level player. It rewards useful volume, since average play over heavy usage accumulates. ([ESPN/Football Outsiders explainer](https://www.espn.ph:443/nfl/news/story?id=3079031))

**Why it predicts:** for QBs and high-usage skill players, DYAR separates "efficient on low volume" from "moves the needle on real volume," which maps to team points.

**Limitations:** replacement-level definitions are judgment calls; cumulative stat — needs conversion to per-play or per-game rates before it means anything for a spread.

**Engine relevance:** LOW–MEDIUM — player-level; useful for injury/absence adjustments, weak as a direct team-strength input.

### PFF grades

Every player on every play is graded around expected execution on a −2 to +2 scale, converted to a 0–100 grade; facets include passing, pass blocking, run blocking, coverage, etc. ([PFF](https://www.pff.com/grades), [PFF explainer](https://www.pff.com/news/nfl-caleb-williams-pff-grade-explained))

**Why it predicts:** grades attempt to isolate *player execution* from *play outcome* (e.g., a perfect throw dropped still grades well), giving a cleaner signal of underlying ability than box-score stats.

**Limitations:** analyst judgments with assignment ambiguity (was that the guard's or the center's man?); small samples; the full play-level database is paywalled, and grade *methodology* is proprietary.

**Engine relevance:** MEDIUM — premium unit-level signal (OL/DL, coverage), but only via the paid tier; free-tier engine should first exhaust nflverse features.

### RYOE (Rushing Yards Over Expected)

Actual rushing yards minus expected rushing yards, where expected yards come from tracking-based relative locations, speeds, and directions of blockers and defenders. ([GeekWire/NFL announcement](https://www.geekwire.com/2020/nfl-reveals-new-expected-rush-yards-stat-help-amazon-web-services/))

**Why it predicts:** RYOE strips blocking quality out of RB production, identifying backs who create yards independently — the part of rushing that is actually a player skill.

**Limitations:** rushing itself is weakly predictive of wins (see the EPA section correlations); RYOE needs tracking-derived inputs not in free play-by-play.

**Engine relevance:** MEDIUM — best use is RB/OL decomposition for injury and matchup adjustments, not as a team-strength driver.

### Separation / open rate

**Family (definition varies by provider).** Three distinct implementations: (1) **Next Gen Stats Average Separation (SEP):** distance between WR/TE and nearest defender at catch/incompletion, from GPS tracking; Average Cushion (CUSH) is the same distance at the snap. ([RotoBaller/NGS](https://www.rotoballer.com/nfl-nextgen-stats-analysis-wr-te-air-yards-and-yac/678502)) (2) **ESPN Receiver Tracking Metrics:** analyze *all* routes including untargeted ones, splitting receiving into Open, Catch, and YAC scores. ([ESPN](https://www.espn.ph/nfl/story/_/id/34649390/espn-receiver-tracking-metrics-how-nfl-wideout-stats-work-open-catch-yac-scores)) (3) **PFF charted "open":** receiver outside a defender's arm length (≥1 step of separation) within route timing; PFF separation % uses qualifying routes, not just targets. ([PFF](https://www.pff.com/news/nfl-pff-route-concept-and-separation-study-which-receivers-and-routes-are-creating-the-most-separation-for-nfl-offenses))

**Why it predicts:** separation measures the QB-independent part of the passing game — whether receivers are actually winning. ESPN's all-routes approach is the most predictive-flavored since it doesn't condition on the QB's target choice.

**Limitations:** provider definitions are not interchangeable; NGS SEP conditions on targets (selection bias toward open receivers); ESPN's metrics are published rankings, not feeds.

**Engine relevance:** MEDIUM — receiver-corps quality signal for matchup modeling; NGS SEP is free via nflverse `load_nextgen_stats`.

### Time to throw

Snap-to-release time in seconds (Next Gen Stats). ([NBC Sports/NGS](https://www.nbcsportsphiladelphia.com/nfl/nfls-next-gen-stats-open-new-world-to-gauge-player-performance/358646/), [PFF deep dive](https://www.pff.com/news/nfl-the-perfect-timing-a-deeper-dive-into-time-to-throw-data))

**Why it predicts:** it captures QB style × protection × route depth in one number — quick release neutralizes pass rush; long time-to-throw creates explosives but also sacks.

**Limitations:** it is descriptive, not normative — there is no "good" time to throw; it reflects scheme as much as skill, so it must be paired with pressure data.

**Engine relevance:** MEDIUM — matchup feature (fast-release QB vs elite rush); free from NGS tables.

### Pressure rate

**Family (definition varies by provider).** Share of pass plays/rushes producing a hurry, hit, or sack, depending on the provider's charting. [PFF research](https://www.pff.com/news/nfl-pff-data-study-sack-artist-pass-rushers): pressure *creation* is more repeatable and predicts future sacks better than prior sack totals; pressure-to-sack conversion is noisy and heavily QB/scheme-influenced.

**Why it predicts:** because pressure generation is the stable skill while sacks are the noisy outcome, pressure rate forecasts future defensive disruption (and QB mistakes) better than sack counts do.

**Limitations:** charting-dependent; "pressure" definitions differ (PFF vs ESPN vs SIS); QB behavior (time to throw, mobility) contaminates defensive pressure rate.

**Engine relevance:** HIGH — one of the most actionable defensive matchup features; available via FTN charting in nflverse (free, CC-BY-SA) with a stated convention.

### PRWR / PBWR (ESPN pass rush/block win rates)

As of the [2026 methodology update](https://www.espn.ph/nfl/story/_/id/49742016/2026-win-rates-team-player-rankings-pass-rush-run-stop-blocking): **PRWR** = how often a rusher beats his blocker within 2.5 seconds; **PBWR** = how often a blocker sustains for at least 2.5 seconds. The 2026 revision added/refined bull rushes, chips, and stunts; ESPN claims improved year-over-year reliability and EPA correlation — use the current methodology, not the legacy description.

**Why it predicts:** win rates measure the *process* of line play rather than its outcomes (sacks/pressures), and ESPN reports the 2026 version correlates better with EPA.

**Limitations:** ESPN proprietary and published as rankings/articles, not a data feed; the 2.5-second cutoff is a modeling choice.

**Engine relevance:** HIGH — trench matchup is where spread edges live; but sourcing is the problem (see Part 2) since there is no public feed.

### RBWR / RSWR (ESPN run block/stop win rates)

Tracking-based assignment wins in the run game. A defender wins by defeating/displacing a blocker, forcing the runner to alter the lane, or making a tackle within three yards; the responsible blocker receives the inverse result. ([ESPN](https://www.espn.ph/nfl/story/_/id/29813062/introducing-new-nfl-run-blocking-run-stopping-stats-how-run-block-win-rate-run-stop-win-rate-work))

**Why it predicts:** isolates run-game line play from RB talent, giving a true OL/DL matchup read.

**Limitations:** same as PRWR/PBWR — proprietary, published as content, no feed; run-game outcomes matter less than pass-game ones anyway.

**Engine relevance:** MEDIUM — useful for totals (run-game control → clock) and matchup edges, but secondary to pass-game line metrics.

### SIS Total Points

An EPA-denominated player valuation that distributes play value across positions and actions using SIS charting, so a block, a route, or a tackle gets fractional credit for the play's EPA. ([SIS primer](https://www.sportsinfosolutions.com/2020/12/01/a-primer-on-total-points/))

**Why it predicts:** it converts charting into a single cross-position currency (points), letting you value non-box-score contributions (blocking, coverage) in the same units as touchdowns.

**Limitations:** proprietary SIS methodology and data; not publicly downloadable; allocation choices are judgment calls.

**Engine relevance:** LOW–MEDIUM — excellent concept, but inaccessible without an SIS relationship; GSE can approximate the *idea* with nflverse + participation data.

### SIS blown block

**Family (SIS charting definition).** A blocker fails to block the defender he attempted to engage, giving that defender an opportunity to negatively affect the play. Adjusted blown-block rate reportedly adjusts for opponent ability. (Secondary sources: [Mile High Report](https://www.milehighreport.com/2025/2/6/24358697/full-league-offensive-line-performance-analysis-2024-from), [Silver and Black Pride](https://www.silverandblackpride.com/2020/1/8/21057173/how-many-blown-blocks-did-the-raiders-offensive-line-surrender-in-2019); **primary SIS glossary not located — treat exact wording as unverified**.)

**Why it predicts:** blown blocks are the OL-side mechanism behind pressures and stuffed runs — a direct, attributable cause of negative plays.

**Limitations:** charting judgment (who "attempted to engage" whom); SIS data is not public.

**Engine relevance:** MEDIUM — if SIS data ever becomes accessible; otherwise approximate with pressure-allowed data from FTN charting (free).

### Havoc rate

**Family (no NFL standard — state the definition used).** Traditional formula: defensive plays with a tackle for loss, forced fumble, or defended pass, divided by total defensive plays; variants explicitly list sacks/interceptions/PBUs or use no-gain runs. ([Action Network](https://www.actionnetwork.com/ncaaf/college-football-betting-defenses-havoc-handicapping), [PFF](https://www.pff.com/news/nfl-havoc-using-big-plays-to-profile-2022s-playoff-defenses))

**Why it predicts:** havoc plays are the highest-leverage defensive events — they end drives and create turnovers, the two things that swing both wins and covers.

**Limitations:** no standard definition means cross-source comparisons are invalid; TFL-heavy vs PBU-heavy havoc are different skills.

**Engine relevance:** MEDIUM — computable from free data once the engine fixes a definition; a good defensive-disruption feature.

### Stuff rate

**Family (boundary varies).** Share of rushes stopped for no gain or negative yardage; providers differ on whether exactly-zero-yard runs count, so specify. ([Saturday Down South](https://www.saturdaydownsouth.com/news/college-football/cfb-film-room-sec-stuff-rate-stat-shows-one-quarter-of-tennessees-runs-stop-at-the-line/))

**Why it predicts:** stuffed runs create long 2nd/3rd downs, the situation where EPA collapses and drives die.

**Limitations:** run-defense outcomes are less predictive of wins than pass-defense ones; boundary definition changes the number.

**Engine relevance:** MEDIUM — totals-relevant (run-game control) and cheap to compute; secondary for spreads.

### Explosive-play rate

**Family (threshold varies).** Share of plays gaining chunk yardage; one common convention is pass gains ≥15 yards and rush gains ≥10 ([4for4](https://www.4for4.com/2022/preseason/nfl-team-stat-explorer-glossary)); others use 20-yard passes. [PFF's reasoning](https://www.pff.com/news/nfl-explosive-plays-and-re-thinking-offensive-success): explosives materially raise drive scoring expectation because long, error-free drives are hard to sustain.

**Why it predicts:** scoring is heavy-tailed — a few explosive plays decide most games — and explosive *differential* (offense creates, defense prevents) is one of the most stable team traits.

**Limitations:** threshold choice changes rankings; explosives are high-variance week to week; already partially priced in totals.

**Engine relevance:** HIGH — core feature for both spreads and totals; trivially computable from free play-by-play.

### Turnover margin / turnover luck

Turnover margin strongly explains *realized* game outcomes, but turnovers are rare and noisy: season-to-date turnover differential regresses toward zero ([PMC meta-review](http://pmc.ncbi.nlm.nih.gov/articles/PMC5969004/)). Model the *process* — turnover-worthy throws, interception opportunities, fumbles, fumble-recovery luck — rather than carrying raw margin forward.

**Why it predicts (inverted):** because turnovers regress, a team with great efficiency but a bad turnover record is systematically *undervalued* by record-based ratings like Elo — this is one of the largest documented edges over naive models.

**Limitations:** "luck" decomposition needs charting or at least fumble-recovery splits; interception luck is harder to isolate without All-22/charting data.

**Engine relevance:** HIGH — turnover regression is the single biggest upgrade available to an Elo-based engine; implement expected-turnover differentials from free data (fumble rates, recovery rates, INT rates vs expected).

### Red-zone EPA

EPA/play (or EPA/drive) restricted to plays inside the opponent's 20-yard line — not mere TD percentage. Conventional red-zone conversion rate is noisy, opportunity is volatile, and Aaron Schatz has explicitly questioned its predictive persistence. ([ESPN](https://www.espn.ph/nfl/insider/story/_/id/7170232/red-zone-efficiency-meaningless-predictor-future-performance-nfl), [NBC Sports](https://www.nbcsports.com/fantasy/football/news/article-worksheet-red-zone-worksheet))

**Why it predicts:** red-zone trips are where EPA concentrates; a team that moves the ball but can't finish is mispriced by yardage-based ratings.

**Limitations:** small samples, high variance, weak year-to-year persistence — Schatz's critique stands: red-zone *efficiency* is close to noise, red-zone *opportunity* (trips) is the stickier part.

**Engine relevance:** MEDIUM — track red-zone trip rate (predictive) separately from red-zone conversion (mostly noise); don't overweight the latter.

### Late-down efficiency (3rd/4th down conversion)

Share of 3rd/4th downs converted. A 2012 hierarchical-Bayes study found raw third-down conversion rate "a nearly meaningless measure of the efficiency of an offense" — even adjusted for yards-to-go, teams barely differ in conversion ability. ([de Gruyter](https://www.degruyterbrill.com:443/document/doi/10.1515/1559-0410.1383/html)) What *does* work: **all-downs efficiency** (first downs per play across every down), whose 8-game predictive correlation with wins (~0.36) is the highest of the common offensive stats tested. ([Stampede Blue](https://www.stampedeblue.com/2017/9/5/16243598/third-down-efficiency-three-and-outs-and-other-stats-i-hate-win-correlation-predictive))

**Why it predicts (the right version):** avoiding 3rd down entirely — converting on early downs — is the repeatable skill; 3rd-down conversion itself is mostly a function of distance, which is a function of early-down success.

**Limitations:** 4th-quarter game script contaminates the numbers (leaders go conservative, trailers face soft defenses); filter by win probability or quarter.

**Engine relevance:** MEDIUM — use early-down success rate / all-downs efficiency, not raw 3rd-down %; the latter is a known trap stat.

### Situation-neutral pace

**Family (filters vary).** Seconds of game clock used per play after excluding garbage-time/final-minutes situations. The [Football Outsiders definition](https://www.espn.ph:443/nfl/news/story?id=3079031): exclude 4th quarter and final five minutes of the first half, require score within six points; lower seconds/play = faster. Other vendors use different filters.

**Why it predicts:** pace directly scales play volume, which scales scoring — it is a first-order input to totals, and pace *matchups* (fast vs slow) determine game flow.

**Limitations:** filter choices change the number materially; pace is partly a *choice* (trailing teams hurry) so raw pace confounds intent with situation.

**Engine relevance:** HIGH for totals, MEDIUM for spreads — essential for any total model; computable free from nflverse game-seconds fields.

### Fourth-down aggressiveness

Observed go-for-it rate versus a win-probability/expected-points model's recommended action, controlling for field position, yards to go, score, clock, and timeouts. Literature consistently finds coaches more conservative than model prescriptions (see the [4th-down decision literature](https://arxiv.org/html/2309.00756v2) and [ESPN's game-management research](http://espn.ph/nfl/story/_/id/33059528/nfl-game-management-cheat-sheet-punt-go-kick-field-goal-fourth-downs-plus-2-point-conversion-recommendations)).

**Why it predicts:** aggressive coaches convert 4th downs into extra possessions and points; a coaching-aggressiveness prior captures 0.5–1.5 points/game of systematic value the market is slow to price because it looks like "luck."

**Limitations:** models are assumption-sensitive (WP models disagree at the margins); aggressiveness correlates with roster quality (good coaches get hired by good teams).

**Engine relevance:** MEDIUM — a coaching adjustment on top of team strength; implementable free via nflverse + nfl4th-style decision models.

### ESPN FPI

A predictive team-strength rating: expected point margin versus an average team on a neutral field, built from predicted offensive, defensive, and special-teams efficiency as measured by EPA/play. Preseason FPI is anchored on **Vegas expectations** (win totals, moneylines) plus prior-year unit efficiencies, returning starters, coaching/coordinator/QB changes, and QB injuries; it adjusts for altitude, seasonal effects, and QB injury/suspension/absence probability. ([ESPN guide](https://www.espn.ph/blog/statsinfo/post/_/id/123048/a-guide-to-nfl-fpi), [Wikipedia](https://en.wikipedia.org/wiki/Football_Power_Index)) In 2016, FPI favorites won 73% of regular-season games, beating the Vegas closing line's hit rate that year.

**Why it predicts:** it is explicitly engineered as a *forward* predictor (not a resume ranker), with a principled preseason prior and unit-level decomposition.

**Limitations:** ESPN proprietary; published as ratings/articles with no public feed; the Vegas-anchored preseason prior means it partially *is* the market — limited edge versus the closing line.

**Engine relevance:** MEDIUM — best used as the benchmark GSE must beat in backtests, not as an input (no feed, and it embeds market prices).

### Special-teams EPA

EPA on kicking/punting/return plays: field-goal make/miss value vs. expectation, punt hang/net, return value. A [Wharton study](https://wsb.wharton.upenn.edu/wp-content/uploads/2024/05/Impact-of-Special-Teams-Paper-FINAL.pdf) built a Special Teams Performance Index from standardized unit EPAs and found adding it to offense/defense ratings cut prediction RMSE by 1.9% — small but real, from plays that are only ~15% of the game.

**Why it predicts:** special teams are systematically ignored by most power ratings, so the residual edge is unpriced; elite kicking/punting is worth a point or more per game.

**Limitations:** kicking efficiency is fairly stable but punt/return units are volatile; small per-game weight means it rarely flips a pick alone.

**Engine relevance:** MEDIUM — include as a small additive adjustment; free from nflverse (kicking/punting EPA computable).

### Strength-of-schedule adjustment

**Family (method varies).** Any correction of observed efficiency for opponent quality: opponent-adjusted EPA (iterative/SRS-style), DVOA-style per-play opponent baselines, or forward-looking SOS from market win totals. The 2026 debate is instructive: [SI's 2026 SOS rankings](https://www.si.com/nfl/nfl-2026-strength-of-schedule-rankings) argue prior-season win% is "outdated and misleading" (2024's 4–13 Patriots and Jaguars became 2025's 14–3/13–4 teams) and instead use DraftKings projected win totals — i.e., forward SOS should be market-based, backward adjustment should be efficiency-based.

**Why it predicts:** unadjusted stats confound *who you played* with *how good you are*; every credible rating (DVOA, FPI, SRS) adjusts, and failing to do so is the classic flaw of raw EPA leaderboards.

**Limitations:** early-season opponent adjustments are circular (everyone's rating depends on everyone else's); forward SOS embeds market opinion.

**Engine relevance:** HIGH — non-negotiable; GSE's Elo already does this implicitly via score margins, but efficiency-based opponent adjustment (not just score-based) is the upgrade.

### Wind / weather

Wind has the clearest weather relationship with passing and kicking production and with totals; effects are nonlinear and interact with stadium/roof, wind direction, precipitation, and offensive style. ([academic source](https://fileserver-az.core.ac.uk/download/pdf/84113379.pdf), [PFF](https://www.pff.com/news/fantasy-football-the-factors-week-14-2017))

**Why it predicts:** heavy wind demonstrably suppresses downfield passing and field-goal range — it moves totals more than sides, and books shade but don't fully solve crosswind-vs-headwind geometry.

**Limitations:** market movement often prices the signal by kickoff; avoid fixed unsourced rules like "X mph = Y points" — the interaction terms dominate.

**Engine relevance:** HIGH for totals, LOW for moneyline — a totals-model input with stadium-specific wind modeling, not a flat deduction.

### Rest (bye / mini-bye / short week)

A modern analysis (2024) estimates the historical bye-week advantage largely disappeared after the 2011 CBA; mini-byes showed no obvious benefit and the Monday-rest differential was small. ([arXiv](https://export.arxiv.org/pdf/2408.10867))

**Why it predicts (weakly):** rest *should* matter via preparation time and injury recovery, and Thursday-night short weeks remain the one spot with a plausible structural edge.

**Limitations:** the measured effect is near zero in the modern era — this is mostly a narrative stat now; bye teams are also disproportionately good teams (selection bias).

**Engine relevance:** LOW–MEDIUM — model rest continuously and contextually (days of rest, travel, Thursday) with a small coefficient; never a large automatic edge.

### Travel / time zones / altitude

Evidence is mixed and heavily confounded by team strength and standard home advantage; circadian and Denver-altitude studies exist ([The Upside](https://www.theupside.us/p/upside-research-paper-investigating), [MSU Denver](https://red.msudenver.edu/2018/advantage-altitude-exploring-the-largest-home-advantage-in-sports/)) but no robust NFL-specific coefficient was verified. Notably, ESPN's FPI *does* include an altitude adjustment for NFL games, which is weak evidence the effect is nonzero.

**Why it might predict:** west-coast teams traveling east for 1pm ET games face a genuine circadian disadvantage; Denver's altitude is the most documented venue effect in sports.

**Limitations:** confounded, small samples, no verified coefficient — assigning a number here is fabrication.

**Engine relevance:** LOW — include only as a tiny, explicitly-labeled experimental term; do not ship a coefficient without backtesting.

---

## PART 2 — DATA-SOURCE LANDSCAPE

### FREE

| Source | What's available | Cost | License notes |
|---|---|---|---|
| nflverse (nflfastR / nflreadR / nflreadpy) | Play-by-play 1999+, rosters, schedules, player/team stats, depth charts, injuries (2009+), snap counts (2012+), participation (2016+), NGS passing/receiving/rushing (2016+), PFR advanced stats mirror (2018+), draft/combine/contracts, **FTN charting subset (2022+)** | $0 | Code is MIT. **Data: CC-BY 4.0** (attribution required — "Data: nflverse" credit); **FTN charting data is CC-BY-SA 4.0** (share-alike). Confirm per-file in nflreadr docs. ([GitHub](https://github.com/albertov5/nflreadpy), [nflreadr docs](https://rdrr.io/cran/nflreadr/man/load_ftn_charting.html)) |
| RBSDM.com (Ben Baldwin) | Team/QB leaderboards: EPA, success rate, CPOE, dropback stats; the public face of nflfastR analytics | $0 | Public website; no bulk redistribution right. Underlying data is nflverse (CC-BY 4.0). |
| Pro Football Reference (free tier) | Box scores, splits, play index lite, game logs, historical stats back decades | $0 | Free for public reading. No scraping/API right in ToS; bulk use requires Stathead. |
| NFL official (nfl.com / NFLGSIS) | Scores, stats, standings, injury reports | $0 | Public reading only. **The NFL owns its tracking data** and licenses it commercially (via Sportradar); no redistribution right. ([SBJ](https://www.sportsbusinessjournal.com/Journal/Issues/2015/04/20/Leagues-and-Governing-Bodies/NFL-sportradar/)) |
| ESPN public endpoints | Scores, schedules, FPI rankings (published), win-rate articles | $0 | Unofficial public JSON endpoints exist but are **not a licensed API**; published rankings are ESPN IP — read, don't redistribute. |
| Kaggle / GitHub mirrors | Community NFL datasets (play-by-play extracts, betting lines archives) | $0 | License varies by uploader; verify per dataset. Quality varies — validate against nflverse before use. |
| The Spade (thespade.substack.com, Ray Carpenter) | Weekly free football data-viz newsletter; EPA/run-gap charts, on/off studies, pace research — all built on nflfastR | Free tier | Newsletter content; good methods inspiration and sanity checks, not a data feed. ([The Spade](https://thespade.substack.com/p/run-gap-charts-version-15)) |

### PAID

| Source | What's available | Cost | License notes |
|---|---|---|---|
| PFF (PFF+ / PFF Pro) | Player grades (0–100, every snap), Premium Stats, Premium Stats Pro, betting tools; **PFF Pro tier includes programmatic data access (API/scrape) for modeling** | **$9.99/mo monthly; $99.99/yr annual; $199.99/yr PFF Pro** (Sep 2026 price drop, [PFF](https://www.pff.com/news/a-new-chapter-of-pff-pricing)) | Consumer license; team/media/enterprise data deals are separate and priced privately. Grades are proprietary — no redistribution. |
| Stathead (Sports Reference) | Full Play Index query tools across PFR databases; ad-free | Historical pricing **$8/mo single sport, $16/mo all sports** (2020 launch, [Sports Reference](http://www.sports-reference.com/blog/category/pro-football-reference-com/page/6/)); **verify current price on stathead.com** | Personal subscription; data is SRL proprietary ([ToS](https://stathead.com/termsofuse.html)). No redistribution/API. |
| FTN (consumer: NFL Pro / FTN Pro) | DVOA/DYAR ratings, StatsHub charting-derived tools, projections, betting tools | **$109.99/yr ($9.17/mo)** for NFL Pro ([FTN](https://ftnfantasy.com/nfl-pro)) | Consumer license. **FTN Data (B2B)** — the charting feed and API behind the nflverse subset — is enterprise; pricing not public. DVOA is FTN IP. |
| Sports Info Solutions (SIS) | Charting database, Total Points metric, blown-block and OL/DL charting; team/media products | Pricing not public — enterprise/consulting | Proprietary charting; licensed to teams and media. No public feed. |
| SumerSports | Team analytics platform (roster construction, scouting evals, Team Builder); **SumerPass** consumer product (SumerLive, SumerPass Stats, SumerBrain) launched ~Sep 2026 with free trial | Pricing not public — enterprise/consulting for teams; SumerPass has a free entry point ([LinkedIn](https://www.linkedin.com/company/sumersports)) | Proprietary. Founded 2022; team deals are bespoke. |
| TruMedia / Stats Perform | ProVision analytics platform (joint TruMedia–Stats Perform product, 5-yr extension; 90+ pro teams/clubs), custom KPIs, live API | Pricing not public — enterprise/consulting | Enterprise licenses; sold to clubs/media/betting. ([Insider Sport](https://insidersport.com/2021/10/26/trumedia-and-stats-perform-to-continue-sports-analytics-partnership/)) |
| Sportradar | Official NFL data distribution partner (incl. Next Gen Stats feeds); live scores, tracking-data products | Pricing not public — enterprise/consulting | **NFL's official data-rights partner**; the league reportedly seeks $100M+/yr for data rights ([NBC](https://www.nbcsports.com/nfl/profootballtalk/rumor-mill/news/nfl-turns-attention-to-data-rights-deal/)). Commercial redistribution requires a license. |
| Stats Perform (Opta) | Global sports data feeds, betting data products | Pricing not public — enterprise/consulting | Enterprise; official data partner to leagues worldwide. |
| SportsDataIO (formerly FantasyData) | Real-time NFL feeds, odds data; exclusive PFF statistics/odds distribution relationship | Pricing not public — enterprise/consulting ([PRWeb](https://www.prweb.com/releases/sportsdataio-enters-exclusive-relationship-with-pro-football-focus-to-provide-statistics-and-odds-data-847948684.html)) | Licensed feeds; redistribution per contract. |

### SCRAPED / SOCIAL-ONLY (no licensed feed; use for research, not redistribution)

| Source | What's available | Cost | License notes |
|---|---|---|---|
| ESPN published rankings (FPI, QBR, win rates) | Weekly FPI top-to-bottom, PRWR/PBWR/RBWR/RSWR leaderboards, receiver tracking scores — as articles | $0 (ad-supported) | ESPN IP. Read and cite; do not scrape-and-republish tables. No API. |
| FTN DVOA tables | Weekly team DVOA/DAVE tables with offense/defense/ST splits | $0 (free articles; full tools paywalled) | FTN IP. Benchmark use only. |
| X/Twitter charting accounts | Independent chartists posting coverage, pressure, and alignment breakdowns | $0 | Their charts are their IP; embedding with credit is the norm, rehosting without credit is not. Verify methodology per account — quality varies wildly. |
| Substacks/newsletters (The Spade et al.) | Methods write-ups, viz, early findings built on public data | Free–paid tiers | Author IP; great for methods R&D, not data inputs. |

---

## PART 3 — LICENSING REALITY

1. **Facts aren't copyrightable; databases and presentations are.** Game scores, EPA values you compute yourself, and win/loss records are facts. But a provider's *compiled database* (Stathead's queryable DB, PFF's grade database, SIS charting), its *chart designs/images*, and its *proprietary grades and metrics* (PFF grades, DVOA, FPI, Total Points) are protected IP. Computing your own EPA from nflverse play-by-play is clean; republishing PFF's grades table is not.
2. **nflverse is the engine's legal foundation.** Code MIT; the bulk of the data CC-BY 4.0 (credit "nflverse"); the FTN charting subset CC-BY-SA 4.0 (credit FTN via nflverse, share adaptations alike). This is the only source in this catalog that affirmatively grants reuse — build the v1 feature set here.
3. **Public reading ≠ redistribution ≠ API rights.** ESPN's site, PFR's free tier, and RBSDM are free to *read*. None grants a scraping or redistribution right, and their Terms (e.g., Stathead's ToS) explicitly reserve the content. Scraped tables used internally for research are low-risk; publishing them or serving them via an API is not.
4. **The NFL owns the tracking data.** Next Gen Stats raw tracking is NFL property licensed commercially through Sportradar (nine-figure data-rights territory). The *summary* NGS tables distributed via nflverse are usable; the raw RFID feed is enterprise-only.
5. **"Pricing not public — enterprise/consulting" is the honest label.** SIS, SumerSports (team tier), TruMedia/Stats Perform, Sportradar, and Stats Perform do not publish prices; budget five-to-six figures annually based on industry reporting, and verify with a sales conversation before planning around any of them. Only PFF, Stathead (historical), and FTN consumer tiers have public prices, listed above.

---

## Gap analysis: what GSE's engine is missing (v5.2.7)

Ranked by expected lift for a moneyline/spread/total engine with a thin sample:

1. **Opponent-adjusted efficiency (HIGH).** Elo adjusts for opponent via score; it does not adjust *efficiency* for opponent. DVOA-style per-play opponent baselines on EPA is the single biggest structural upgrade.
2. **Turnover regression (HIGH).** Raw Elo bakes in turnover luck. Expected-turnover differentials (fumble rates/recovery, INT rates vs. expected) are computable from free data.
3. **Dropback vs. rush EPA split (HIGH).** Passing efficiency predicts; rushing efficiency mostly doesn't. The engine should weight them accordingly.
4. **Explosive-play differential (HIGH).** Free to compute; stable; moves both spreads and totals.
5. **Early-season shrinkage (HIGH).** DAVE's lesson: blend observed efficiency toward a preseason prior (Vegas-anchored, like FPI) with a decaying weight. Critical for a thin-sample engine.
6. **Pressure/win-rate matchup features (HIGH).** FTN charting (free, CC-BY-SA) gives pressure data now; PRWR/PBWR-style features need ESPN tables (manual) until a feed exists.
7. **Special-teams EPA adjustment (MEDIUM).** Small, real, unpriced — ~2% RMSE improvement per the Wharton study.
8. **Pace + weather for totals (HIGH for totals).** Situation-neutral pace and stadium-specific wind modeling are the two biggest totals inputs the engine likely lacks.
9. **Fourth-down aggressiveness coaching prior (MEDIUM).** Systematic ~1 pt/game edges hiding in coaching tendencies.
10. **QB accuracy (CPOE) priors (MEDIUM–HIGH).** For moneyline team strength, CPOE is the cleanest QB signal available free.
11. **Rest/travel/altitude (LOW).** Near-zero verified effects; keep as tiny experimental terms only.
12. **PFF grades / SIS charting (MEDIUM, paid).** The first paid upgrade worth evaluating once the free stack is exhausted — PFF Pro's $199.99/yr programmatic access is the cheapest legitimate path to grade-level data.

*Methodology note: relevance tags reflect predictive evidence and cost-to-implement for GSE specifically, not universal metric quality. "Predicts wins" claims above describe team quality; covers require beating the market's price of that quality.*
