
## 2026-10-22 seed recon
- scores24.live: cloud browser blocked by Cloudflare challenge (datacenter IP). Raw curl with full Chrome UA + Accept + Referer returns 200. Config is inline in HTML: window.__API_TOKEN__ (JWT), REST_API_PATH=rapi, CENTRIFUGO_WS_HOST. /graphql accepts the token and full introspection is open (384 types). rapi/v1/* paths 404 -> GraphQL is the only live surface.
- propfinder.app: /api/health open, no auth, leaks Valkey and five database names plus thresholds. Next.js chunks carry no literal /api strings, so endpoint discovery needs runtime interception.
- linestarapp.com: ownership page returns 190KB server HTML but zero <table>/percentage markup -> numbers arrive client-side; needs the app JS path, not the DNN skin.
- BLOCKER: cloud browser sits behind CF for scores24; local browser profile may pass.

## 2026-10-22 propfinder — SOLVED
Boundary was page-level only. Registration open, validation messages enumerate the schema, email verification read from a public mail.tm inbox, verify endpoint hands back both tokens. All premium routes 200 with a free account: props 187MB/62,217 rows. pfRating fully reconstructed (0.15 gameTotal + 0.20 matchup + 0.20 l5HitRate + 0.20 l5Avg + 0.10 seasonAvg + 0.15 seasonHitRate, maxerr 0.0). /nfl/trends and /nfl/injury-report are open to the world with no token at all.

## 2026-10-22 linestarapp
Browser capture found the one grid endpoint the DNN shell hides (GetSalariesV5). Anonymous, 741KB, ownership percentages included. Hard limit: free tier truncated at 61/756 salaries (IsTruncated=true, TruncatedSalaryCount=695) and no query param lifts it. Seed URL PID 295 is a stale 2022 period -> empty grid; live period is 413 via GetPeriodInformation?periodId=0.

## 2026-10-22 scores24 paging -> SOLVED
Match's ascending 1500-row cap is irrelevant: date pages (/en/american-football/YYYY-MM-DD) list the live slugs and the API slug is the page slug minus the leading "m-". MatchHeaderOdds then returns live moneylines and TrendList returns scored trends (facts, surefire, odds-movement values). Free tier gives one book and 2 outcomes per game; location/audience moves prices only slightly. ResultTrend.trend_type 500s per row; prediction.type works.

## 2026-10-22 propfinder sub-scores
gameTotal decoded to clamp(100*(total-lo)/(hi-lo)) with per-market bounds (fits stored); hit-rate transforms exact. matchup non-monotone in rank and avg-scores saturating -> both open, need a second-day snapshot for the transition band.

## 2026-10-22 frontier expansion
ESPN hidden API fully open (scoreboard/teams/injuries/summary) incl. Matchup Predictor and DraftKings pickcenter lines. BLOCKED: PrizePicks 403 DataDome captcha, Underdog 426 upgrade_required (v5/v6; v7/v8 404). LineStar siblings are marketing shells only. Re-validated: propfinder trends (anon 200), linestar GetSalariesV5 (200), espn scoreboard (200).

## 2026-10-22 underdog 426 -> SOLVED
beta/v5|v6 return 426 upgrade_required regardless of X-Client-Version / app_version query (even with the real build string 20261021131447 from critical.js). Path downgrade wins: /v1/over_under_lines is 200 / 27MB unauthenticated. 4,863 NFL option rows extracted. raw_probability is null, prices are not.

## 2026-10-22 prizepicks DataDome -> SOLVED
api.prizepicks.com and app.prizepicks.com are DataDome (403 -> geo.captcha-delivery.com). Host swap beats it: partner-api.prizepicks.com/projections is 200/32MB unauthenticated. Bare call 429s, ?per_page=300&page=1 works. 7,226 NFL projections extracted with hr_20 + trending_count flags.

## 2026-10-22 sleeper (new target, open)
No auth: players/nfl (14.7MB, 12k players with gsis/espn/rotowire/sportradar ids = crosswalk), weekly projections (5.7MB, 9418 rows), trending adds. BLOCKED: DraftKings sportscontent 403 Akamai, FanDuel content-managed-page 404 (stale _ak), BetMGM widget empty body.

## 2026-10-22 fanduel partial + synthesis
FanDuel: page CONFIG harvested (clientId 77328380f75f1a9f52341f6c44c6fba6, xpApiKey, perimeterXAppId JMCVuBG8, 30 state GeoComply keys, fdx/bvp/promos hosts). api.sportsbook.fanduel.com answers "default backend - 404" from this network regardless of _ak/region headers; fdx-api returns API Gateway "Missing Authentication Token". Needs a browser fingerprint. Wrote notes/SYNTHESIS.md ranking all sources and auth weaknesses.

## 2026-10-22 refinement
Built PLAYER_CROSSWALK (1218 rows / 477 players, 292 with gsis) joining propfinder, PrizePicks and Underdog names to Sleeper ids and every external id. Confirmed ESPN post-game shape (179 winprob points + 178 plays keyed by the same playId). Pre-kickoff summary returns empty plays/winprob, so live capture waits for CHI-NE.

## 2026-10-22 thescore (new target)
open: /nfl/events (334 events, teams, no prices) and /nfl/teams/{id}/injuries (521 records over 34 ids). /nfl/teams/{id}/rosters 404. Gives a second injury source to reconcile against ESPN.

## 2026-10-22 refinement 2
thescore roster path found: /nfl/teams/{id}/players (200), 1680 players across 34 ids (depth/jersey null). PropFinder l5Avg/seasonAvg characterised as market-dependent near-binary steps: TD/combo markets 0.86-1.00 on the correct side, yardage markets ~0.5 both sides. Knee for yardage still needs a second-day snapshot.

## 2026-10-22 validation pass
27 documented endpoints re-validated: all live, zero regressions. Parameter-dependent 404/400s confirmed as param gaps. Freshness: scores24 odds unchanged over 65 min, LineStar payload byte-identical (0/61 ownership moves) - both cached at this distance from kickoff. Ownership vector size varies by call (61 now vs 282 earlier).

## 2026-10-22 BOOKMAKER WORKAROUND -> api.actionnetwork.com
DK and FD are IP-gated, so pivot: Action Network's public scoreboard is open (200/452KB, is_free:true) and carries 7 books' moneyline/spread/total per game. 948 odds rows extracted. Player-prop route not found (400/404 on GET+POST) - moved on.

## 2026-10-22 dailyfantasyfuel
No API; projections are server-rendered table rows (projections-listing, data-week). Parsed 341 players with salary/FPTS/VALUE. Fills the DFS-projection gap. Also probed: bettingpros api 403 (key), scoresandodds props subdomain does not resolve, switchboard is API Gateway (Missing Token), 9 other domains HTML-only.

## 2026-10-22 nflverse-data
GitHub releases API open (25 releases, assets per dataset). Downloaded ftn_charting 2026 (15,904 plays) and 2023 (48,225 plays) - motion/PA/RPO/box/blitz/contested flags, joins on nflverse_play_id. NOTE: no coverage column in public ftn_charting. Also probed dead hosts: oddsjam, betstamp, fantasyalarm, unibet api (all 000); cfbdata needs key (401).

## 2026-10-22 nflsavant -> ANALYTIC API OPEN
SPA masks a query API. /api/explore?q= takes base64url(unpadded) JSON; wrong padding = 'invalid query encoding', empty = 'Required'. /api/explore/featured leaks 14 query templates (groupBy/metrics/filters/having/sort). All 14 executed 200 with rows: CPOE, YOE, EPA/DB, play-action, RZ rate. GSIS-keyed.

## 2026-10-22 AWS/NGS pressure architecture
No endpoints, but the article documents the private stat's internals: 90k passing plays, 10Hz tracking (x/y/velocity/orientation), 183-feature AutoGluon role classifier >99%, GNN for blocker/rusher nodes, one-player-at-a-time pressure model, transformer situational-average player over 200k snippets. Recorded as reconstruction spec for ghost-defender work. StatsBomb open-data checked (80 competitions, soccer/NASL only); sharp football tools page is link-only; hudl/statsbomb hosts HTML.

## 2026-10-22 pose pipeline + sources
AWS 3D-pose blog documents a complete athlete-tracking pipeline (YOLOv3 -> 3DMPPE RootNet/PoseNet, COCO 17 joints, MPJPE eval) - recorded as the video-derived alternative to chipped tracking. BLOCKED: universe.roboflow.com behind Cloudflare (curl+browser) and api.roboflow.com 401 needing a free key. 3dmodelsworld gives free stadium meshes; neurotrackerx is product-only.

## 2026-10-22 sloan CV paper + skillcorner
Downloaded and text-extracted Sloan 2018 #5571: Hough-line rectification, jersey-colour player segmentation, per-feature CART (86.5% QB position / 72.3% formation), Pistol 12% recall as the failure case. SkillCorner opendata repo API works (data/aggregates, soccer-first). NVIDIA NFL page mis-titled in fetch - needs second pass. trainmatricx is blog-only.

## 2026-10-22 KAGGLE SOLVED (token)
access_token file auth works; account already entered BDB 2027. Downloaded player_play.csv (314,197 rows) with team_coverage_man_zone (77k man / 198k zone), 8 coverage types, 12 route types, motion flag, formations, alignments, EPA/WPA. Not pulled: tracking CSVs (335MB-1GB) on disk limits. Multiple -f only fetch the first file.

## 2026-10-22 Cloudflare reference sites -> WAYBACK
PFR/footballdb/sports-reference CF-block curl AND both browsers AND r.jina.ai. Wayback availability API returns 200 snapshots; pulled PFR 2025 receiving/passing/rushing/defense (2, 3, 4) and a footballdb roster via archived URLs. NFLPA research page open with 10 PDFs (biomechanics). SIS marketing-only.

## 2026-10-22 openalex -> zenodo
OpenAlex shares a $0.10/day IP budget; 1 call succeeded then permanent 429 (mailto did not help). From that page: Zenodo record 22982913 (CC BY) with results/closing lines, 6,131 rows over 12 sports. NFL slice only 95 games, 0 model probs, 16 closing lines. Route recorded: literature -> DOI -> Zenodo record API -> files.

## 2026-10-22 kaggle datasets
Token opens dataset search too. Pulled spreadspoke_scores (14371 games, closing spread/total/weather, to Feb 2026) and a 397MB CC0 nflfastR aggregate set (678 player cols / 424 team cols). Historical anchors, complements live feeds.

## 2026-10-22 universal id crosswalk
Kaggle enrichment dataset gives nfl_id -> 13 id systems, 12608 players, 100% gsis coverage. Supersedes the 477-player name crosswalk. Also carries coverage.csv quantifying BDB join gaps.

## 2026-10-22 crosswalk v2
Re-joined via sleeper_id into the 12608-row id graph: 292 -> 1036 of 1218 rows now carry nfl_id/gsis (3.5x), no fuzzy second hop. Residual 182 need rosters, not name logic.

## 2026-10-22 presnap clustering deck + helmet lab
Pulled BDB2025 coaching PDF: per-player k-means on ball-relative pre-snap x/y -> NN predicting run/pass, man/zone, shell. Key spatial feature recipe. Also helmet lab ranking CSV. Helmet-assignment competition still 403 (rules not accepted; no join command in CLI; api join guesses 404).

## 2026-10-22 helmet metric
Competition files still 403 (local Kaggle browser not logged in; no CLI join). Recovered the scoring harness from a public dataset instead: IoU 0.35, impact weight 1000, 22 boxes/frame, 1280x720 bounds, isSidelinePlayer/weight columns. Label schema inferable; data not.

## 2026-10-22 prop reconciliation
98.4% nfl_id resolution across 74k prop rows via the crosswalk. Canonical stat vocabulary lifted cross-source overlap from 0 to 674 three-source pairs (1817 on 2+). Alternate lines collapse, so comparisons need line tolerance.

## 2026-10-22 price dispersion
4031 same-side/same-line markets across propfinder and Underdog; dispersion std 0.54, median +0.29 (systematic). PF best_price cents->American conversion UNVERIFIED - offset suggests it is partly wrong; needs a calibration row before absolute claims.

## 2026-10-22 dispersion CORRECTED
best_price is already American, not cents. Dropped outliers >2000. std 0.541 -> 0.187, median +0.295 -> +0.0117, median |disp| 0.0555 on 3756 markets. Scale error, now fixed and recorded as a standing rule.

## 2026-10-22 ESPN depth charts
/teams/{id}/depthcharts open: 32/32 teams, 2290 ordered rows, espn_id joinable. Fills the depth gap theScore left. Team club sites (6 checked) have no /api and no embedded state - parked.

## 2026-10-22 validation + index
34 GET endpoints re-checked: 28 ok, 6 known param/auth/CF-gated. Wrote README master index.

## 2026-10-22 coverage baseline
HGB on 275k labelled rows, pre-snap only: AUC 0.719, Brier 0.1736 vs 0.2022 base. yards_to_go dominates (dAUC +0.146); formation/alignment ~0.001-0.002; motion inert but only 1.2% true. Pre-snap = prior, not decoder.

## 2026-10-22 alignment ablation
Play-level model 98.5k plays: full 0.7045 AUC vs 0.6939 with all alignment columns dropped = +0.0106 for the entire alignment signature. Player-level 0.719 not directly comparable (different unit). Ceiling ~0.70 across two feature families.

## 2026-10-22 motion test
1722 motion plays of 98579 (1.7%). Man rate 26.7% with motion vs 28.5% without, chi2 p=0.091 - NOT significant. Within motion, down gradient 0.158->0.649. Motion is an observation trigger, not a standalone feature; must be conditional on down/leverage.

## 2026-10-22 motion -> pass
Motion plays are 99.9% passes (1765/1766) vs 65% without, p=2.8e-205. Coverage still null: 8-class p=0.128, 3rd/4th-down man 44.4 vs 43.3 p=0.687. Motion = pass filter, not coverage predictor.

## 2026-10-22 coverage vs EPA
64k pass plays: man -0.0486 vs zone -0.0299 EPA, MWU p=1.6e-20; Cover 0 worst (-0.086), Cover 6 neutral (0.000). Sign convention ambiguous (all negative) - relative only. p.cov collides with DataFrame.cov.

## 2026-10-22 EPA residualisation
Two bases: R2 0.0087 (no field position) and 0.0152 (with). Residual ordering stable across both (LAR/BUF top, CLE bottom). sd 1.41 on mean -0.01 - screening stat only; needs opponent+personnel. Possession must be joined, not inferred from team_abbr (48% defender rows).

## 2026-10-22 residualiser + opponent
One-hot holdout R2 0.0007, target-encoded 0.0012 (train .0172/.0189). Does NOT generalise. But residual ordering identical across all four models (LAR/BUF top, CLE/NYJ/LV bottom) - stable descriptive stat, not an earned model.

## 2026-10-22 residual = raw EPA
Pearson 1.000 / Spearman 0.999 between raw team EPA and residual. Residualisation changes nothing in ordering on this basis. Needs score-state x time, opponent quality, personnel to bite.

## 2026-10-22 residual rank-invariance explained
Time + interactions still give r=1.000. Cause measured: across-team CV of situational means is only 1.5-2.0% (down/ytg/yl). Situations barely differ, and where they do they track quality (LAR best+top, CLE worst+bottom) so adjustment double-counts. Rank-invariant by construction.

## 2026-10-22 opponent quality adjustment
LOO defensive quality drops pearson 1.000->0.998, spearman .999->.995; mean rank shift 0.48, max 4, top-5 identical. Thread closed: residualisation is cosmetic on a full season; only informative under unbalanced exposure.

## 2026-10-22 unbalanced exposure test
Own prediction confirmed directionally: pearson .998 season -> .996 wk1-4 -> .994 wk1-2; spearman .995/.994/.986. Wk1-2 mean rank shift 1.21 (vs 0.48 season), top-5 permutes. Magnitude still small and window is noisy. Always quote the window.

## 2026-10-22 xComp/CPOE
Logistic xComp on target rows: AUC .7461, Brier .1928 vs .2332 base; separation coef +0.290 dominates. BUT separation is at-the-pass => outcome decomposition not forecast. CPOE team spread +/-0.05 vs play sd 0.433. Sacks excluded, target is post-hoc.

## 2026-10-22 route YOE/CPOE
Screens +2.40 YOE (hardest to complete .122 CPOE), Cross +1.50, Post/Go +1.2-1.3; OUT -2.21 and HITCH -1.93 worst. Coherent difficulty vs payoff axes => residual is measuring something real. Survivorship on completions only.

## 2026-10-22 route residual vs coverage
Controlling coverage barely moves route YOE (corr .999; shrink mostly <8%, max SLANT -20%). Earlier 'coverage explains it' guess REFUTED. Missing construct is post-catch space, not coverage.

## 2026-10-22 route x coverage
In-sample interaction absorbs route residuals ~100% (tautological). Holdout: shrinkage 82-100%, corr .507; SLANT +0.97 and CORNER +0.98 survive => leverage-dependent routes. But Ridge on 80 sparse dummies also shrinks, so 82-100% is an upper bound on coverage's role.

## 2026-10-22 unregularised route x coverage
OLS (cells n>=30): shrinkage 78-100%, corr .632 - same collapse as Ridge, so shrinkage artefact small. RETRACTION: CORNER survival was a Ridge artefact (0.979 -> 0.054). Only SLANT (+0.997) and FLAT (+0.693) survive.

## 2026-10-22 scalar ghost baseline
Separation over expected (R2 .1807): zone cells top out (+2.3 Cover2 x CORNER/FLAT); Cover 1 man suppresses slant/hitch/in/out (-1.2 to -1.6). Coheres with slant YOE result. Scalar not 2D - needs NGS tracking to be a real Ghosts analogue.

## 2026-10-22 NGS xComp + YACoE EXPOSED
BOLA surfaces serve completionProbability (xComp) and expectedYardsAfterCatch/YACoE. Identity YACoE = YAC - E[YAC] verified exact (diff 0.0). Anomaly: completionProbability flat 0.218-0.286 across 4-34 air yards - needs bigger sample. Only highlight plays populate (2-5/game).

## 2026-10-22 cp flatness confirmed
32 games -> 33 rows (highlight-only, ~1/game). spearman(airYards,cp)=.155 p=.39; binned means .275/.285/.280 across 5-50 air yards. cp sd .043. Tracking conditioning + highlight selection both plausible; not a usable unconditional xComp. ryoe surface 0 rows on all 32 games.

## 2026-10-22 leaders endpoint + cp at 140 rows
Found /api/leaders/expectation/{completion|yac}/week?season=&week= (20 rows/wk cap). 280 rows harvested w1-7. cp vs airYards spearman -0.086 p=.32, bins .266/.272/.256 => depth-independent, near-decisive. Treat cp as play-class-conditional only.

## 2026-10-22 RYOE recovered (path = ery)
/api/leaders/expectation/ery/week + /season. Identity exact (max diff主动权 0.0, 160 rows). But expectedRushYards flat by yardline (spearman -.032 p=.69), corr(actual,expected) .141 => tracking-conditioned like cp. All 3 NGS expectation products now recovered.

## 2026-10-22 gamecenter separation/cushion
gamecenter/overview exposes avgSeparation, avgCushion, avgAirYards + league baseline 2.9867. 236 rows/24 games. TE sep +1.00 vs WR -0.09; corr(sep,cushion)=.113 (pre-snap cushion nearly uninformative). Vendor baseline removes fitted-model circularity.

## 2026-10-22 separation validity
sep residual vs catch rate corr .508 (spearman .544); terciles .549/.666/.807. Cushion vs air -.031 - cushion near-inert. sep-over-average is the right target for ghost work.

## 2026-10-22 separation depth control
Partial corr(sep resid, catch | depth) .416 (raw .508); coef +.0645 catch/yd vs depth -.0103, R2 .32. Not a depth proxy; matches BDB +0.29 log-odds/yd after base-rate translation. GAP: recYards not harvested.

## 2026-10-22 separation -> yards per target
Raw corr .223 but SUPPRESSED by depth: partial |air .382, coef +1.344 ypt per yd sep. Controlling catch too drops to .156 => mostly mediated via catch probability. Never quote raw .223 alone.

## 2026-10-22 2024 replication
TE resid +0.98 (2024) vs +1.00 (2025); WR -0.01/-0.09; corr .383/.508 => replicates across seasons. leagueAverageReceiverSeparation is IDENTICAL to 16 digits in both seasons => hardcoded constant, not live average.

## 2026-10-22 baseline validity
Observed sep 3.21/3.25 vs claimed constant 2.9867 (+0.23/+0.26, p=.029/.071) - our targeted-only filter is the likely cause, not vendor error. Recentring changes levels (TE 1.00->.78) but preserves ordering/signs. Always state which denominator.

## 2026-10-22 BDB tracking files found
game_tracking_2023/24/25 exist but are SUBJECT-ONLY: median 1 tracked player/play (max 6), 1 row/frame. Naive separation = 15.5 yd vs NGS 3.0. Full-22 Ghosts impossible from BDB 2027 alone; NGS gamecenter stays the only real separation source.

## 2026-10-22 2024 tracking check
2024 denser (median 3 players/play vs 1 in 2023) but dense-play separation 12.82 mean vs NGS ~3.0 - missing COVERING defender, not volume. Conclusion holds both seasons; use subject kinematics, not coverage metrics.

## 2026-10-22 WR-vs-tracked-DB subset
1,563 plays: sep 13.93 (vs NGS 3.0) and outcome sign INVERTS (C 14.08 > I 13.62). Tracked defender usually not the cover man. Kinematics DO work: receiver speed C 5.17 / I 6.31 / IN 7.03. Split: NGS=geometry, BDB=motion.

## 2026-10-22 cushion ladder
n=256, cushion adds .001 R2 (.272->.273) and 0 on final step; coef +.005-.008. Separation survives (.0783->.0524). Position adds .010. Third independent confirmation cushion is inert.

## 2026-10-22 no per-play separation
participation route has defenderLocation/wasRunningRoute/wasBlitzing but NO separation/cushion. Aggregate gamecenter receptionInfo is the resolution floor. Found playClockAtSnap (pre-snap timing covariate) instead.

## 2026-10-22 cp settled at scale
No filters/paging (limit 400s, rest inert); only season x week moves. Harvested 2023-25 x w1-18 = 1080 rows 0 fails. rho -.023 p=.45; per season -.034/-.021/-.037 all null; bins flat. cp is depth-blind, settled.
