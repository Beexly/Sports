# Reverse-Engineering NFL Analytics Creators — Full Report

Mission: reverse-engineer HOW 9 NFL analytics creators (charts published on X ~Sept 17–18, 2026) produce their numbers so an independent team can replicate, improve, or find feeds. Research conducted 2026-09-18 (UTC). Sources below are marked **verified live** (read directly this mission) or **index** (via search index, read 2026-09-18). Factual claims are marked **confirmed** (two sources agree or one primary source), **inferred** (single-source or reconstructed), or **unknown/proprietary**.

Common public foundation used by most creators: nflverse play-by-play data. The nflverse organization page (index, https://github.com/nflverse) documents data releases in CSV/Parquet/RDS/QS, and the `nflreadr`/`nflfastR` packages; nflfastR cleans PBP and applies EPA/WPA models. The nflfastR reference manual (index, https://cran.r-project.org/web/packages/nflfastR/nflfastR.pdf) documents the `epa`, `wp`, `wpa`, `vegas_wp`, `vegas_wpa` fields. A mirror of the same manual (index, https://ftp.openbsd.dk/pub/mirrors/pub/cran/web/packages/nflfastR/nflfastR.pdf) documents the required inputs to `calculate_win_probability()`: possession, score differential, clock, spread, down, distance, yard line, timeouts, and second-half kickoff indicator. EPA/WPA formal definition (ending-state value minus starting-state value) is documented in the nflWAR paper (index, https://www.degruyterbrill.com/document/doi/10.1515/jqas-2018-0010/html).

---

## 1. @sfdata9ers

**Metric (three charts):** (a) Week 1 Offensive Playcalling Tendencies table, credited to @FTNFantasy — per-team motion, screen, play-action, no-huddle, RPO rates; (b) Kickoff Coverage: Average Opponent Drive Start — per-team average opponent starting field position after kickoffs; (c) "Josh Allen Career EPA/Play" — career heatmap of Allen EPA/play.

**Inputs:** (a) FTN Fantasy proprietary in-house charting. FTN's official stats page (index, http://ftnfantasy.com/nfl/stats) states FTN uses an in-house team to chart every NFL play and logs every route, motion, coverage and situation, with filters for coverage, play concept, pressure, stacked box, offense/defense/ST. That is the exact tag set needed for (a). Aaron Schatz confirms FTN holds route data and that route-denominator metrics are more stable/predictive (index, https://www.acmepackingcompany.com/2024/8/14/24219745/packers-2024-projections-advanced-stats-aaron-schatz-ftn-interview-route-dvoa-dyar-jeff-hafley). (b) Likely nflverse kickoff PBP or FTN special-teams charting — **unknown/proprietary**. (c) nflverse PBP (Allen dropbacks/rushes) — **inferred**.

Identity/source support: SI articles embedding his X posts confirm @sfdata9ers is a popular X account posting NFL data-analytics charts, e.g. (index, https://www.si.com/nfl/panthers/onsi/panthers-can-easily-free-up-money-for-david-njoku-deebo-samuel; https://www.si.com/nfl/bengals/onsi/allbengals-insiders-plus/fresh-update-on-bengals-top-draft-target-availabilities-across-mock-drafts-01khrvbv5m7s). His other known outputs use Mock Draft Database probabilities (probability matrix from 79 mock drafts, each team's probabilities summing to 1) and consensus-board "reach factor" vs actual draft slot — simple frequency/probability math on public inputs, supporting the view that he combines proprietary charting (FTN) with public PBP.

**Computation:** Likely rate formulas (all **inferred**, denominators not documented):
- `motion_rate` = motion-tagged eligible offensive plays / offensive plays
- `screen_rate`, `play_action_rate` = screen/PA plays / relevant pass/dropback plays
- `no_huddle_rate` = no-huddle snaps / offensive snaps
- `rpo_rate` = RPO-tagged plays / charted offensive plays
- `avg_opponent_drive_start_yardline` = mean start yard line of the first offensive drive after a team's kickoffs; treatment of penalties, onside kicks, return TDs, end-of-half = **unknown**
- Allen heatmap cell = mean EPA/play over qualifying plays; exact axes (season×game, field position, play type) **unknown**

**Data access:** FTN charting = paid/proprietary (FTN Fantasy StatsHub subscription; no public API documented). nflverse = free/public (https://github.com/nflverse).

**Replicability verdict:** Partially replicable. (a) Not publicly replicable — motion/screen/PA/RPO tags require private charting. (c) Fully replicable from nflverse EPA/play with team-chosen binning. (b) Likely replicable from nflverse kickoff PBP once exclusions are defined (needs field-name verification).

**New columns unlocked:** `motion_rate`, `screen_rate`, `play_action_rate`, `no_huddle_rate`, `rpo_rate`, `avg_opponent_drive_start_yardline`, `kickoff_touchback_rate`, `kickoff_return_start_ep`, `qb_epa_cell`, `mock_availability_prob`, `reach_factor`.

---

## 2. @ThunderDanDFS

**Metric:** Week 2 offensive passing/rushing matchup grades (team-level) and RB grades incorporating O-line data. **Confidence: confirmed input sources, black-box composite.**

**Inputs (confirmed):** His Week 1 article (index, https://www.rotoballer.com/nfl-dfs-picks-running-backs-to-target-in-week-1-2/1923472) states the "Thunder Dan Matchup Grade" incorporates **PFF** (grades, O-line data) and **FTN DVOA**, and evaluates blocker quality, offensive scheme, projected role/usage, and projected game script — explicitly NOT the RB's own elusiveness/explosiveness/broken tackles. Week 1 used 2025 data with manual personnel/coaching adjustments (analyst override). The Week 2 prompt says 2026-only, so the 2026 version presumably replaces prior-season defense/team features with 2026 samples (two-week sample ⇒ high variance; he likely applies priors/weights — **inferred**).

**Computation (inferred):** Team passing matchup grade = f(defense pass DVOA, CB coverage grades, pressure rate, OL pass-block grades); rushing matchup grade = f(defense run DVOA, DL/LB run-defense grades, adjusted line yards, OL run-block grades, RB projected role/share, game script from spread/total). A related 2026 D/ST method (index, https://www.rotoballer.com/fantasy-football-d-st-matchups-strength-of-schedule-analysis-2026/1925785) uses offensive/defensive DVOA, adjusted sack rate, turnover rate, scaled 0–100 — suggesting his preferred 0–100 normalization, but **does not prove** his passing/rushing grade weights. Implied totals come from spread/total via `team_implied_total = total/2 − signed_spread/2`. Exact weights/normalization/percentile transforms = **unknown/proprietary**.

**Data access:** PFF = paid (subscriptions; raw PFF data via paid PFF data products). FTN DVOA = paid/proprietary (ftnfantasy.com subscription). Odds = commercial odds APIs (see §4 for a verified endpoint) or sportsbook pages.

**Replicability verdict:** Not replicable exactly — inputs are paid and the blend is a black box. Approximable: nflverse EPA/success by pass/rush × opponent, free OL metrics, implied totals from odds. Public approximation will differ because PFF grades and FTN DVOA have no free equivalent.

**New columns unlocked:** `passing_matchup_grade`, `rushing_matchup_grade`, `ol_run_block_grade`, `ol_pass_block_grade`, `def_run_dvoa`, `def_pass_dvoa`, `team_implied_total`, `projected_role_share`, `game_script_adjustment`.

---

## 3. @SamHoppen

**Metric:** "How the game was won" — single-game WPA/EPA decomposed into ten facets: Pass Off, Run Off, Pass Def, Run Def, Takeaways, Giveaways, Off Pen, Def Pen, Special Teams, Other. **Confidence: confirmed data feed (nflfastR/nflverse), inferred categorization.**

**Inputs:** nflfastR/nflverse PBP (`epa`, `wpa` fields) — confirmed via task statement and nflfastR docs (index, https://github.com/nflverse; https://cran.r-project.org/web/packages/nflfastR/nflfastR.pdf). His own older methodology page (index, https://www.4for4.com/2021/w8/hoppen-conclusions-week-8-insights-and-analysis) shows his nflfastR-style processing (e.g., "neutral script" = outside two-minute warning, offensive WP 20%–80%), but not the ten-facet code.

**Computation (inferred, implementable):**
1. Orient every play's `epa` and `wpa` to the selected team: offense's EPA as-is when the selected team possesses; negate when the opponent possesses; handle special-teams plays by assigning possession outcome carefully.
2. Assign each play to exactly one mutually exclusive facet with precedence **(inferred, needs confirmation)**: turnovers (Takeaways/Giveaways) > penalties (Off Pen/Def Pen) > pass/run on offense (Pass Off/Run Off) > pass/run on defense (Pass Def/Run Def) > kicks/punts/returns/FG/PAT (Special Teams) > Other (kneel-downs, timeouts, etc.).
3. Sum team-oriented EPA and WPA within facet.
4. Sanity checks: total EPA is additive over all plays; WPA should telescope to ≈ final WP − initial WP if every play is assigned exactly once (the WP model sums, since each play's WPA = WP_after − WP_before from the team's perspective).

**Data access:** Free/public — nflverse releases, nflfastR R package, `nflreadpy` Python package (all via https://github.com/nflverse).

**Replicability verdict:** Fully replicable. The only risk is the exact turnover/penalty precedence rule, which must be discovered from the chart or stated as our convention.

**New columns unlocked:** `pass_off_epa`, `run_off_epa`, `pass_def_epa`, `run_def_epa`, `takeaway_epa`, `giveaway_epa`, `off_pen_epa`, `def_pen_epa`, `st_epa`, `other_epa` (and WPA analogues). Note: `qb_epa_cell` and `qb_positive_epa_rate`/`qb_negative_epa_rate` also fall out of the same PBP.

---

## 4. @benbbaldwin

**Metric:** Team Tiers — market-implied win probabilities blending near-term DraftKings game lines with division/conference/Super Bowl/playoff/#1-seed futures (posted 2026-09-18; blend is the signature of this chart). **Confidence: confirmed concept (market-implied ratings), inferred blend formula.**

**Inputs:** DraftKings point spreads/totals (near-term games) and DK futures prices. The rbsdm.com page could not be opened directly (terminal page-load failure; do not re-attempt).

**Computation:**
- Confirmed methodology lineage: posted game spreads → market-implied power ratings. PFF's explainer (index, https://www.pff.com/news/bet-2021-nfl-betting-broad-insights-market-implied-power-rankings/) documents transforming spreads into market-implied ratings with a home-field adjustment (2021 market HFA ≈ 0.62 spread points). The implied-SRS recipe (index, https://www.footballperspective.com/implied-srs-ratings-and-strength-of-schedule-ratings-for-the-nfl-in-2021/): adjust each spread for HFA, then solve team ratings iteratively (transitive spreads). Implementation pattern (index, https://gist.github.com/boooeee/ed393cdf93723fab517bb6d596d48a47): build team-incidence matrix (home − away), regress spread/margin on it; intercept estimates HFA; team coefficients demeaned to league-average zero.
- Blend with futures (**inferred reconstruction**): convert American futures odds to raw implied probabilities; de-vig mutually exclusive markets (division/conference/SB) by normalizing within market; for playoff/#1-seed yes/no, normalize paired sides; fit latent team strengths `r_i` and HFA so that predicted home margin = `r_h − r_a + HFA` matches near-term spreads, while neutral-field win probability (via calibrated margin→win logistic/CDF) matches futures-implied probabilities; minimize weighted loss, weighting liquid near-term lines above long-tail futures. Exact Baldwin weights/optimizer = **unknown/proprietary**.

**Data access:** No single free DK feed. Verified options:
- The Odds API v4: `https://api.the-odds-api.com/v4/` (docs at the-odds-api.com/liveapi/guides/v4/); sport key `americanfootball_nfl`; markets `h2h,spreads,totals`; bookmakers include draftkings, fanduel, pinnacle; API-key auth; paid/freemium with free tier (index: https://github.com/spablog25/nfl25-agent/blob/HEAD/docs/odds_api_v4_capability_map.md; https://github.com/danjhi/nfl-db/blob/HEAD/CLAUDE.md).
- DraftKings NFL game-lines public page: https://sportsbook.draftkings.com/leagues/football/nfl?category=game-lines&subcategory=game (underlying SPA JSON is undocumented; scraping posture unverified — treat as rumored, not confirmed).
- Free simulation tooling: nflseedR (https://github.com/nflverse) reproduces remaining-schedule/playoff simulation from ratings.

**Replicability verdict:** Replicable to high fidelity with an odds API subscription. The novel, unreplicable part is only the exact blend weights between game lines and futures; an independent team can choose defensible weights (e.g., inverse-variance by market liquidity).

**New columns unlocked:** `market_neutral_win_prob`, `market_power_points`, `market_hfa_estimate`, `futures_residual` (futures-implied vs spread-implied team strength), `market_rating_change`.

---

## 5. @MagicSportsGuy (Kevin Adams, StatRankings)

**Metric:** CB/WR assignment maps, alignment shares (left/right/slot/backfield), man/zone splits, shell coverage reports, target distributions, percentile ranks vs peers. **Confidence: confirmed product, inferred inputs.**

**Inputs:** StatRankings launch release (index, https://www.accessnewswire.com/newsroom/en/sports-leisure-and-entertainment/statrankings-launches-with-aim-to-deliver-faster-cleaner-and-smart-1067463) claims 24+ years of continuously updated NFL data, base/advanced stats, projection models, betting trends back to 2000 — but discloses no data provider and no public API. Kevin Adams' published methodology examples (index, https://oneweekseason.com/one-week-stats-6-25/ — zone rate, QB production vs zone; https://oneweekseason.com/one-week-stats-4-25/ — accuracy/pressure/ANY/A) show the metric style but not the charting source. **Do not assert FTN is the source merely because Adams founded FTN** — no source confirms it. Commercial precedent for matchup ratings from charting data: RotoViz GPS Matchup Rater (index, https://www.rotoviz.com/2021/11/going-deep-week-12-fantasy-passing-preview-wr-cb-matchups/).

**Computation (inferred, formulas standard):**
- `target_share` = player targets / team targets; `first_read_share` = first-read targets / team first-read targets
- `tprr` = targets / routes run; `yprr` = receiving yards / routes; `fp_per_route` = scoring-format points / routes
- `alignment_share` = routes at left/right/slot/backfield / routes
- Man/zone or shell splits: filter the above by charted coverage on the play
- Assignment/overlap map: projected offensive alignment distribution × defender side/slot assignment rates, normalized to 100%
- Percentiles: empirical percentile rank vs same-position/alignment peer group (minimum-route cutoff unpublished — **unknown**)

**Data access:** Unknown/proprietary or paid charting (PFF/Fantasy Points/FTN-style). Public PBP cannot supply first reads, untargeted routes, coverage assignments, shells, or true alignments. ESPN's shadow reports (index, https://www.espn.ph/ffl/insider/story/_/id/32166443/fantasy-football-week-1-shadow-report-key-wr-cb-matchups) show alignment/shadow identification is done from play-by-play + charting, confirming the charting requirement.

**Replicability verdict:** Not publicly replicable at the charting level (routes, coverage, assignment). Partially replicable with paid PFF data (man/zone splits by routes/targets/FP-per-route are standard PFF premium outputs — index, https://www.pff.com/news/fantasy-football-wide-receiver-report-man-zone-coverage-performance-nfl-week-16-2025).

**New columns unlocked:** `wr_cb_assignment_share`, `alignment_overlap`, `man_tprr`, `zone_tprr`, `man_yprr`, `zone_yprr`, `first_read_share_by_shell`, `shell_weighted_yprr`, `cb_shadow_rate`.

---

## 6. @tejfbanalytics / @QBgami / SumerSports

**Metric:** Team under-center rate vs under-center EPA/play scatter. **Confidence: confirmed product/pricing (live), inferred filters.**

**Inputs:** SumerSports proprietary play/frame charting. Home page (verified live 2026-09-18, https://sumersports.com/): Sumer charts "300+ data points many times per second" with real-time pressure/route/coverage charting and formation/coverage/personnel/game-state filters. LinkedIn company page (index, https://www.linkedin.com/company/sumersports): SumerLive includes live WR-CB matchups, schemes, route trees; filters include formation, coverage, personnel, game state. Public approximation is possible if nflverse formation fields reliably mark under-center vs shotgun/pistol (field-name verification still needed).

**Computation (inferred):**
- `under_center_rate` = qualifying under-center offensive snaps / qualifying offensive snaps
- `under_center_epa_per_play` = Σ EPA on qualifying under-center plays / count
- Exclusions (no-plays, spikes, penalties, kneels) unpublished. Public code pattern (index, https://gist.github.com/morganandrew/08d550f232dddf27259e9095ed9d50fe): filter regular-season Week 1 `play_type` to pass/run, drop NA EPA, mean EPA by offense — adapt by adding an under-center formation filter.

**Data access (verified live 2026-09-18):** No public or documented API — the SumerSports site exposes subscriber web UI only; nav has no developer docs/API links; data tables require sign-in. Stats feature page (verified live, https://sumersports.com/features/stats/): same play-level data powers SumerBrain and SumerLive, exposed across player/team positions, situational filters, slates update within two hours after the final game. **SumerPass pricing confirmed on the public home page: $10/week, $20/month, $100/year, seven-day free trial for first-time subscribers** (notes/sumersports-app-lead.md also records this). **Unconfirmed (from parent's lead, not independently sourced):** Sep. 18 launch of LB, defensive interior, and edge tables; preseason/postseason coverage from 2022; `WELCOME15` promo code — flag as unverified. The app serves data via its authenticated web app (no public endpoint); do not reverse-engineer gated network calls.

**Replicability verdict:** Aggregate scatter is approximable publicly with nflverse if formation tagging is present; Sumer's proprietary charting (and any formation-definition edge cases) is not fully replicable.

**New columns unlocked:** `under_center_rate`, `under_center_epa_per_play`, `under_center_success_rate`, `shotgun_epa_per_play` (contrast), `formation_epa_delta`.

---

## 7. @RyanJ_Heath (Fantasy Points Advanced Matchups)

**Metric:** Week 2 Advanced Matchups — player-level matchup edges from schematic coverage data. **Confidence: confirmed data suite, black-box computation.**

**Inputs:** Fantasy Points Data Suite — proprietary coverage/schematic charting (shells, man/zone, alignments, route concepts). Heath states publicly that Advanced Matchups uses schematic coverage data in the Fantasy Points Data Suite for DFS/betting (index, https://podscan.fm/podcasts/all-in-speed-run/episodes/week-10-fantasy-football-rankings-starts-sits-with-ryan-heath). Public examples show coverage-shell trends, individual matchup analysis, and player-prop angles from the Data Suite (index, https://www.fantasypoints.com/nfl/articles/dfs/2024/super-bowl-lix-advanced-matchups), plus O-line/run-defense, route, target-rate, and game-script analysis (index, https://static2.fantasypoints.com/nfl/articles/2021/week-2-advanced-matchups). The exact 2026 Week 2 edition is paywalled and was **not** accessed, per mission rules.

**Computation (inferred):** Likely derived columns: opponent shell rates (e.g., 2-high share), player target/route/FP splits by shell, projected shell-weighted TPRR/YPRR, line/run mismatch index, pressure mismatch index, matchup adjustment added to base projection. Exact weighting = **unknown/proprietary**.

**Data access:** Paid/subscription (fantasypoints.com; Data Suite is a commercial product). No public API.

**Replicability verdict:** Partially replicable: public PBP + FTN/PFF-style charting is unavailable free, but a coverage-agnostic version (opponent EPA/success allowed to position groups, OL/DL mismatch from free sources, implied totals) is buildable. The schematic layer (shell-specific splits) requires paid charting.

**New columns unlocked:** `projected_shell_rate`, `coverage_matchup_delta`, `shell_weighted_tprr`, `shell_weighted_yprr`, `pressure_mismatch`, `run_front_mismatch`.

---

## 8. @Shauncore (PFF)

**Metric:** PFF QB scatter — positive-graded-play rate vs negative-graded-play rate per QB. **Confidence: confirmed grading system, inferred denominators.**

**Inputs:** PFF proprietary per-play grades. PFF's grading page (index, https://www.pff.com/grades): every player/play graded −2 to +2 in 0.5 increments (0 = expected), with position-specific rubrics and situational adjustment, converted to 0–100 facets (passing, rushing, etc.). Confirmed current explanation (index, https://www.pff.com/news/nfl-caleb-williams-pff-grade-explained): every play graded −2..+2; final grade accounts for frequency and magnitude of positive/negative grades.

**Computation (inferred):**
- `pff_positive_grade_rate` = count(grade > 0 on eligible QB pass plays) / eligible graded QB pass plays
- `pff_negative_grade_rate` = count(grade < 0) / same denominator
- Zero-graded plays stay in the denominator but neither numerator. Exact eligibility (dropbacks vs attempts; minimum-dropback cutoff) = **unknown** — label as inferred until confirmed from the chart's caption.

**Data access:** Raw per-play PFF grades = paid/proprietary (PFF data products). Public box-score/PBP cannot reproduce subjective throw/decision/read grades.

**Replicability verdict:** Not replicable exactly (subjective grades are the input). Public proxy: `qb_positive_epa_rate` / `qb_negative_epa_rate` on dropbacks — directionally related but not a PFF replica; EPA rewards outcomes, PFF grades process.

**New columns unlocked:** `pff_positive_grade_rate`, `pff_negative_grade_rate`, `pff_grade_balance`, and as public proxies `qb_positive_epa_rate`, `qb_negative_epa_rate`.

---

## 9. @b_peters12

**Metric:** Manually film-charted game-planning concepts and coverage reads (e.g., Dagger, Shallow, Funnel, Choice/Diagonal, Cover 3 rotation). **Confidence: confirmed method via his own descriptions.**

**Inputs:** Licensed game film/All-22 plus playbooks/coaching terminology where available. Peters describes identifying concepts from film — bang/drift/strike mini-dig, orbit motion, guard pull, primary read, curl-flat/checkdown progression, diagrams (index, https://www.fieldgulls.com/2025/7/27/24473505/nfl-breakdown-football-analyst-bobby-peters-breaks-down-klint-kubiak-seattle-seahawks-offense); Dagger, Shallow, Funnel, Choice/Diagonal, bunch adjustments, defensive Cover 3 rotation from game film (index, https://muckrack.com/bobby-peters/articles). His labels are manual charting = private intellectual work, not a statistical feed.

**Computation:** There is no closed-form formula — it's a qualitative coding task. Reimplementation schema per play (inferred from his output): personnel, formation, splits, motion; protection/run action; each eligible receiver's route; concept family; defensive pre/post-snap shell and rotation; QB progression/key defender; target/outcome. Concept names are NOT universally standardized (e.g., "Funnel" vs "Choice/Diagonal" overlap) — distinguish observed geometry from inferred team terminology.

**Data access:** Film via licensed sources (e.g., NFL Game Pass/All-22) — may be paid. His charted labels and playbook library = private.

**Replicability verdict:** Replicable as a process, not as data: an independent team can build the same charting operation (analysts + codebook). To improve on him: double-charting with adjudication, inter-rater reliability metrics, timestamped video evidence per label, versioned codebook.

**New columns unlocked:** `concept_frequency`, `coverage_rotation_rate`, `concept_vs_shell_epa`, `first_read_concept_share`, `motion_concept_interaction`.

---

## Cross-creator: Top 5 most valuable replicable metrics for NFL player-prop/game models

Ranked by (predictive value × replicability × uniqueness vs. public baselines):

1. **Market-implied neutral team strength** (after @benbbaldwin). Blend of game lines + futures into latent ratings; de-vigged probabilities; HFA extracted by regression. Why #1: the market is the strongest publicly observable prior; the futures-blend adds a longer-horizon signal that pure spread-SRS lacks. Fully buildable with an odds API (The Odds API v4, verified above) + nflseedR. Unlocks `market_neutral_win_prob`, `market_power_points`, `futures_residual`.
2. **Coverage/shell-weighted receiver matchup** (after @MagicSportsGuy + @RyanJ_Heath). Shell- and man/zone-conditioned TPRR/YPRR using the best affordable charting (PFF or Fantasy Points feeds; partial version from public data). Why #2: target-earning is coverage-dependent and most public projections are coverage-agnostic — this is the biggest edge per dollar of data spend. Unlocks `shell_weighted_tprr`, `coverage_matchup_delta`.
3. **Offense/defense EPA–WPA facet decomposition** (after @SamHoppen). Ten-facet win-attribution from free nflverse PBP. Why #3: free, fully replicable, and directly yields matchup features (pass-off vs pass-def EPA splits) plus "how games are actually won" priors for game-script modeling. Unlocks the full facet column family.
4. **Under-center usage × efficiency** (after @tejfbanalytics/SumerSports). Formation-conditioned EPA/play. Why #4: formation usage shifts are sticky week-to-week and interact with play-action/RPO rates; cheap to compute, partially free. Unlocks `under_center_rate`, `under_center_epa_per_play`, `formation_epa_delta`.
5. **Playcalling tendency rates + O-line/run matchup composite** (after @sfdata9ers + @ThunderDanDFS). Motion/screen/PA/RPO/no-huddle rates and OL-vs-front matchup grades. Why #5: scheme tendencies are predictive of play-type mix (prop-relevant), but the best inputs are paywalled and ThunderDan's blend is a black box — hence ranked below the fully replicable items. Build the free subset (EPA/success-based matchup grades, implied totals) and buy PFF/FTN only if the free version underperforms.

Honorable mention: PFF-graded-play rates (@Shauncore) and manual concept charting (@b_peters12) are valuable but not publicly replicable — buy the feed or build the charting operation rather than reverse-engineering.

---

## Could not verify / open questions

- Exact denominators and exclusions for @sfdata9ers' playcalling rates and kickoff drive-start chart; Josh Allen heatmap axes.
- Exact facet-precedence rules for @SamHoppen's ten-facet chart (no public code found).
- @benbbaldwin's exact blend weights between DraftKings game lines and futures (rbsdm.com page failed to load; do not re-attempt).
- StatRankings' data provider and whether any public/documented API exists (launch release discloses none).
- SumerSports Sep. 18 claims from the parent's lead: LB/defensive-interior/edge tables going live, preseason/postseason from 2022, `WELCOME15` promo — not independently confirmed on public pages; pricing ($10/wk, $20/mo, $100/yr, 7-day trial) IS confirmed live on sumersports.com.
- Fantasy Points Data Suite exact 2026 Advanced Matchups formula (paywalled; not accessed).
- @Shauncore chart's eligibility/minimum-dropback cutoff.
- Exact nflverse field names for kickoff plays and under-center formation tags (not verified in this mission).

## Sources

- index: https://github.com/nflverse (nflverse org — free PBP data, nflreadr/nflfastR)
- index: https://cran.r-project.org/web/packages/nflfastR/nflfastR.pdf (epa/wp/wpa fields)
- index: https://ftp.openbsd.dk/pub/mirrors/pub/cran/web/packages/nflfastR/nflfastR.pdf (WP model inputs)
- index: https://www.degruyterbrill.com/document/doi/10.1515/jqas-2018-0010/html (EPA/WPA definition)
- index: https://gist.github.com/Deryck97/fa4abc0e66b77922634be9f51f9a1052?permalink_comment_id=3119393 (EPA aggregation pattern)
- index: http://ftnfantasy.com/nfl/stats (FTN in-house charting)
- index: https://www.acmepackingcompany.com/2024/8/14/24219745/packers-2024-projections-advanced-stats-aaron-schatz-ftn-interview-route-dvoa-dyar-jeff-hafley (FTN route data)
- index: https://www.rotoballer.com/nfl-dfs-picks-running-backs-to-target-in-week-1-2/1923472 (ThunderDan method)
- index: https://www.rotoballer.com/fantasy-football-d-st-matchups-strength-of-schedule-analysis-2026/1925785 (0–100 scaling style)
- index: https://www.4for4.com/2021/w8/hoppen-conclusions-week-8-insights-and-analysis (Hoppen processing style)
- index: https://www.pff.com/news/bet-2021-nfl-betting-broad-insights-market-implied-power-rankings/ (market-implied ratings, HFA)
- index: https://www.footballperspective.com/implied-srs-ratings-and-strength-of-schedule-ratings-for-the-nfl-in-2021/ (implied SRS)
- index: https://gist.github.com/boooeee/ed393cdf93723fab517bb6d596d48a47 (spread regression implementation)
- index: https://github.com/spablog25/nfl25-agent/blob/HEAD/docs/odds_api_v4_capability_map.md (The Odds API v4 capabilities)
- index: https://github.com/danjhi/nfl-db/blob/HEAD/CLAUDE.md (Odds API base URL https://api.the-odds-api.com/v4/)
- index: https://github.com/nchemb/sports-odds-fetch/blob/HEAD/references/endpoint-discovery.md (DK game-lines page URL)
- index: https://www.accessnewswire.com/newsroom/en/sports-leisure-and-entertainment/statrankings-launches-with-aim-to-deliver-faster-cleaner-and-smart-1067463 (StatRankings launch)
- index: https://oneweekseason.com/one-week-stats-6-25/ and https://oneweekseason.com/one-week-stats-4-25/ (Adams methodology examples)
- index: https://www.espn.ph/ffl/insider/story/_/id/32166443/fantasy-football-week-1-shadow-report-key-wr-cb-matchups (alignment/shadow charting)
- index: https://www.pff.com/news/fantasy-football-week-11-wr-cb-mismatches-shadow-coverage-dfs-fantasy-football-leagues-2021/ (WR/CB matchup chart methodology)
- index: https://www.pff.com/news/fantasy-football-wide-receiver-report-man-zone-coverage-performance-nfl-week-16-2025 (man/zone split tables)
- verified live 2026-09-18: https://sumersports.com/ (300+ data points, SumerPass pricing)
- verified live 2026-09-18: https://sumersports.com/features/stats/ (data powers SumerBrain/SumerLive, position tables, 2-hour updates; no public API)
- index: https://www.linkedin.com/company/sumersports (SumerLive WR-CB matchups, filters)
- index: https://gist.github.com/morganandrew/08d550f232dddf27259e9095ed9d50fe (EPA aggregation code pattern)
- index: https://podscan.fm/podcasts/all-in-speed-run/episodes/week-10-fantasy-football-rankings-starts-sits-with-ryan-heath (Heath on Data Suite)
- index: https://www.fantasypoints.com/nfl/articles/dfs/2024/super-bowl-lix-advanced-matchups (Advanced Matchups example)
- index: https://static2.fantasypoints.com/nfl/articles/2021/week-2-advanced-matchups (coverage + OL/run analysis)
- index: https://www.pff.com/grades (PFF grading system)
- index: https://www.pff.com/news/nfl-caleb-williams-pff-grade-explained (per-play grading → 0–100)
- index: https://www.fieldgulls.com/2025/7/27/24473505/nfl-breakdown-football-analyst-bobby-peters-breaks-down-klint-kubiak-seattle-seahawks-offense (Peters film method)
- index: https://muckrack.com/bobby-peters/articles (Peters concept identification)
- index: https://www.si.com/nfl/panthers/onsi/panthers-can-easily-free-up-money-for-david-njoku-deebo-samuel and companion SI/Bengals/Dolphins/49ers articles (sfdata9ers identity/outputs)
- index: https://www.dejavu.org/cgi-bin/get.cgi?ver=95&url=https://sports.yahoo.com/betting/%2Fnfl%2Fbetting%2Farticle%2Foddsmakers-rank-every-nfl-starting-qbs-by-point-spread-value-josh-allen-is-clear-no-1-130725555.html (oddsmaker market-implied value context)
- index: https://www.rotoviz.com/2021/11/going-deep-week-12-fantasy-passing-preview-wr-cb-matchups/ (GPS Matchup Rater precedent)
- notes: notes/sfdata9ers.md, notes/thunderdan.md, notes/samhoppen.md, notes/benbbaldwin.md, notes/magicsportsguy.md, notes/sumersports.md, notes/ryanjheath.md, notes/shauncore.md, notes/bpeters12.md, notes/sumersports-app-lead.md
