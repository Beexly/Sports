# X overnight corpus pass — inventoried-but-never-dissected posts, dissected (2026-10-30, slot ON-CORPUS)

## Scope and method

**Target:** every X post that earlier sessions *captured or inventoried* but never gave a dossier — hunted across (a) the Oct 19–24 analyst pull (Session 6 of the consolidated record: 559 posts, 81 analysts, raw corpus at `~/workspace/goals/gse-advanced-metrics-benchmark-sweep/hidden_files/x-pull-2026-10-24/posts.json`), (b) the never-delivered Session 4 **Batch D** accounts (@jmthrivept, @MagicSportsGuy, @DevyEusuf, @DonAtkinsonNFL, @DynatyzeFF, @32BeatWriters), (c) residue from the Oct 29 keyword-explore candidate list that the explore triage and the ON-EARLIER pass left open, and (d) the benchmark-sweep goal files.

**What was already dossiered and therefore excluded:** everything in the sweep seen index through the PM catch-up and ON-EARLIER passes (Oct 29–30 For You runs); Session 1's cited knowledge base (1,476 entries with engine-use notes); Session 2's bookmarks/likes verdicts; Session 3's homed ledger records C-280→C-325; Session 4's condensed timeline captures; Session 5's 80 themed records; the goal files' synthesized corpora (the methods corpus and `nfl-analytics-reverse-engineering.md` are digests, not inventories — see gap audit).

**Method:** all 559 Session 6 posts were read at full text level from the pull's own JSON (the browser-capture inventory equivalent for this lane). Every named metric, model, site, or paper was verified at its off-X primary source where one exists (12 primary sources fetched/read, listed in the gap audit). x.com was not fetched — per standing policy for agent passes. Posts whose payload lives only in an unread chart image get an honest inventoried/context grade with the gap stated. Poster numbers are UNVERIFIED unless a check is stated. Note on names/teams: the pull is the corpus's own Oct 2026 record and is dissected as captured.

## Counts

| Pool | Posts | Treatment |
|---|---|---|
| Session 6 pull — Batch D accounts (6) | 113 | Full + cluster dossiers (Part 1 & 2) |
| Session 6 pull — accounts new to this pass | 218 | Full + cluster dossiers (Part 1 & 2) |
| Session 6 pull — accounts deep-captured in Sessions 3/4 (15 sectioned accounts) | 228 | Cluster dossiers; method-novel posts upgraded (Part 1 & 2) |
| **Session 6 total** | **559** | **All 559 read; all 559 appended to the seen index (slot ON-CORPUS)** |
| Full uncompressed dossiers | 14 clusters / 85 posts | Part 1 |
| Explore residue | 3 items verified & dossiered; 10 documented open | Part 3 |
| Batch D deep capture itself | 0 posts exist anywhere | Part 4 — unclosable tonight, stated plainly |

---

# PART 1 — FULL DOSSIERS (football method first)

## D1 — @Timo_NFL — Playoff-leverage selection bias in dynamic-rating simulations (10-post thread, Oct 23)

**WHAT IT IS.** A methodological correction to a chart genre the whole industry publishes. Season simulations often update team ratings *inside* the simulation (a simulated Week 7 win raises the team's rating for simulated Weeks 8–18). If "playoff leverage" for this week's game is then computed by comparing playoff odds across sims filtered to wins vs sims filtered to losses, the number is inflated: the win-filter doesn't just select the game outcome, it also selects sims where the team drew a higher rating path — so the team wins more *future* games for reasons that have nothing to do with this game. His measurement for Week 7 games: the filter method inflates leverage by a factor of **1.3–1.6× per team**, with ~1.3 as the floor for any team still in the hunt. His published leverage chart corrects for this and shows the single-game effect only. His test: if a game truly doesn't matter, its leverage should be 0 — the filter method returns a positive number anyway, which proves the contamination.

**WHERE IT COMES FROM.** Timo Riske — verified as the author of PFF's playoff-picture series (PFF, 2021–2025), where playoff leverage is his signature chart and where his documented causal method is the *paired simulation*: copy each sim, flip only the game in question, and difference the outcomes. The thread is the same author explaining why the dynamic-ratings variant of the chart — used by other sim publishers — cannot be read at face value. Dynamic ratings exist for real reasons (they keep the sim from being overconfident off extreme current ratings, and the update factor K is a tuning lever), but they "do not necessarily reflect reality," and they poison the leverage filter.

**HOW TO USE IT / INPUTS.** Any Monte Carlo season sim with team ratings. Rule: compute leverage from paired/flipped sims or with ratings frozen at their pre-game values; never by outcome-filtering a dynamic-rating sim. The 1.3–1.6× factor is his measurement on his setup — the *mechanism* (conditioning on a post-outcome variable) is not in doubt, the exact factor is UNVERIFIED independently.

**WHICH LAYER.** Everything-else (season context / playoff picture) — and a standing audit question for any third-party sim output GSE cites, including the LineOfEvidence Sim Lab class of tools: *which leverage construction produced this number?*

**CREATIVE ANGLES.** If GSE ever publishes leverage or rooting-interest content, the paired-flip construction is the defensible one and the bias explanation is itself publishable reasoning — a "why the popular chart overstates this game by ~40%" explainer is exactly the reasoning-as-product genre. The same selection-bias pattern applies anywhere an outcome filter is applied to a path-dependent sim (DFS ownership sims, survivor WPs).

**RISKS.** Factor range is single-source (the author's own sims). Not a betting input by itself; it disciplines other inputs.

**VERDICT: LEARN-ONLY** (method doctrine). Posts: 2113646016050180154, 2113646652208697733, 2113646896611045690, 2113647404645842970, 2113647697907638421, 2113648290936045868, 2113648791995953370, 2113649441085493649, 2113654108272075166, 2113661482588422520.

## D2 — @PattonAnalytics — Play-Caller Evaluation Model v3.0 (Substack article read in full)

**Posts.** "Play Caller Tendencies 🎮" (Oct 22 — Declan Doyle 9th, Brad Idzik 11th ranked as first-time callers; David Blough 21st, Sean Mannion 29th), the tendency-vs-design follow-up, and the two "full breakdown of v3.0" posts linking the article (Oct 22).

**WHAT IT IS (verified at the primary source — pattonanalytics365.substack.com/p/evaluating-play-callers, "Evaluating Play Callers," Part III — Offense, published 2026-10-22).** A process-only play-caller rating built from six tendency components, deliberately *not* built from outcomes:
1. **Personnel diversification** — for every play, a model predicts the probability of 11/12/21/other personnel from the game situation; the component is the **Shannon entropy** of that distribution. Credit goes not for using many packages but for using them *without the situation giving them away*.
2. **Play-sequencing predictability** — whether the previous few calls predict the next call beyond what down/distance/score already explain.
3. **Play-sequencing volatility** — drive-to-drive variance of (2); two offenses can average the same predictability with very different shapes.
4. **PROE Plus** — pass rate over expectation combined with offensive pace (aggressiveness × tempo profile).
5. **Motion rate.**
6. **Play-action rate.**
The six are transformed, **oriented by their historical relationship to offensive EPA** (the "Y-aware" step — EPA is a compass, not an input), passed through **PCA**, weighted by variance explained, and combined into the rating. Callers are also grouped into four *style clusters*, explicitly not quality tiers. An "Easy Button %" (RPO + screen + play-action share) is computed but kept out of the score as a descriptive stat. Top of the board through Week 6: Shanahan and Reid; Payton near the top despite Denver's negative EPA/play — the author names that process/outcome gap as the model's point, not its flaw. His own limits, on the record: it is not a pure estimate of coaching value above replacement, it cannot see reads/protection adjustments/wrong routes, and the defensive version is exploratory only.

**HOW TO USE IT / INPUTS.** Play-by-play with personnel groupings (nflverse pbp carries personnel fields), down/distance/score state, and play-action flags (in nflverse). Motion rate is the one component needing charted data (Fantasy Points Data class) — five of six components are computable from public pbp. The sequencing components need a situation-conditioned call-prediction model (a multinomial model on state features; the residual predictability from recent-call features is the metric).

**WHICH LAYER.** Matchups — coach-vs-coach is an explicit signal family in GSE's reasoning doctrine, and this is the most fully specified public framework for the offensive half of it. Personnel entropy in particular is a matchup input GSE does not currently have: an offense whose personnel doesn't leak its intentions is harder to match up against, independent of its EPA.

**CREATIVE ANGLES.** (a) Build the 5-of-6 public approximation and compare its rankings to Patton's published tendencies posts as a validation target. (b) The entropy construction ports to defense: coverage-shell entropy given situation is the defensive mirror. (c) Sequencing predictability is a live in-game signal class (drive 1 vs drive 3 predictability drift) that no GSE layer currently touches.

**RISKS.** The Y-aware orientation can smuggle EPA back into a "process" score (the author acknowledges the tension); rankings beyond the article's named examples are UNVERIFIED; six-week samples; motion component is charted-data-gated.

**VERDICT: LEARN-ONLY.** Register-worthy. Gap: Parts I–II of the series (linked from Part III) were not read this pass.

## D3 — @MagicSportsGuy — aDOT is six different numbers (measurement-provenance post, Oct 20)

**WHAT IT IS.** One post that does more for data hygiene than most threads: JJ McCarthy's aDOT as published by six top sources — StatRankings **12.0**, PFR **12.0**, Sumer **14.76**, PFF **15.6**, Fantasy Points **11.57**, FTN **10.9**. A 4.7-yard spread on the same player and the same named stat, because each source's air-yards equation differs (which attempts count, how throwaways/spikes/behind-the-line throws are treated). His conclusion: "None of them are wrong; they are all run by sharp people, but they use slightly different equations (except PFR & StatRankings)" — PFR and StatRankings share the same equation, which is why they agree to the decimal. First-party note: the poster is StatRankings' own operator (see D4), so the StatRankings/PFR figures are first-party; the other four are as cited by him.

**WHICH LAYER.** All of them — this is the general form of the Oct 29 Catchable Ball Rate finding: *a charted stat is not a number, it is a number plus a definition plus a source.* Any external chart ingested into the engine (aDOT, catchable rate, pressure rate) needs its source pinned before its values can be compared or trended.

**CREATIVE ANGLES.** A standing "definition registry" for every external stat GSE ingests (source, equation notes, agreement class — e.g., PFR≡StatRankings) would convert this recurring surprise into a lookup. Cross-source spreads like this one are also a free data-quality alarm: when two sources in the same agreement class diverge, something changed upstream.

**VERDICT: LEARN-ONLY.** Post: 2112694980196303172.

## D4 — StatRankings platform, its AI connector, and its two-model provenance problem (posts Oct 20–23; site verified)

**Posts.** NBA projections launch (free all month), a McCarthy target-share breakdown produced "per the AI connector @StatRankings," the DFSArmy ownership partnership announcement, the Week 7 injury-summary format post, and the projections availability rule (all @MagicSportsGuy); plus three @PattonAnalytics replies disclosing model provenance.

**WHAT IT IS (verified at statrankings.com, fetched 2026-10-30).** A subscription data platform: 1,048 NFL stats, StatBuilder+, Coverage IQ+ (man/zone splits across all eight coverage shells; 132 WR coverage stats), custom splits, a 19-book odds board with vig removed, betting-trends back to 2000, and downloadable stat archives back to 2021 (CSV add-on $60/yr; standalone $179.99/yr; statrankings+ $34.99/mo or $139.99/yr). Founded by Kevin Adams; **Steven Patton (@PattonAnalytics) is its Data Scientist** — confirming the §6 Patton posts are first-party. The "AI connector" from the posts is real: a subscription unlocks a connector letting Claude/ChatGPT/Grok query the stat base (PDF connection guide after purchase; no API keys). Two operational rules disclosed in posts: DFS ownership projections are DFSArmy's, integrated into the projections tool at no extra cost; and the projection model's availability rule is mechanical — *two consecutive DNPs (Thu+Fri) = OUT in the model*, ahead of the official report, by design.

**THE PROVENANCE PROBLEM (from Patton's own replies in this pull).** Asked about a model output, he states: "This isn't the public model, it's StatRankings proprietary internal model," and "The model was designed back in February. I modified the public framework with two additional variables to account for game situation." So StatRankings numbers in the wild can come from either of two models, and the internal one is a modified version of a public framework plus two undisclosed game-situation variables. Not a scandal — a labeling fact: StatRankings-sourced model claims carry an unknowable model identity unless the post says which one.

**WHICH LAYER.** Data-source shelf for matchups/usage inputs; the AI-connector distribution pattern (a stat base sold as an LLM connector rather than a website) is also a direct competitive reference for GSE's own data products.

**VERDICT: WATCH** (platform). Posts: 2112603433077456999, 2112621956231245896, 2113682273187070446, 2113691595149377850, 2113747253483684122; provenance replies 2112652727104737640, 2112658683905921186, 2112660061931831790.

## D5 — @jmthrivept — injury prognosis by mechanism + historical comps (Batch D; method posts Oct 20–23)

**WHAT IT IS.** A physical therapist's injury-analysis practice, and the pull captures its two working methods:
1. **Historical-comp prognosis tables.** On Terry McLaurin's confirmed torn patellar tendon (Oct 20), he posts the comp set: David Boston (24 — next season 70-880-7 in 14 games, then tore the *other* patellar tendon in year 2), Victor Cruz (28 — missed the next season entirely to a calf injury during rehab, returned year 2 at 39-586-1 in 15 games), Jimmy Graham (29 — next season 65-923-6 in 16 games, year 2: 57-520-10), framing McLaurin at 31 against them.
2. **Mechanism reasoning.** Calf strains elevate Achilles-rupture risk through faulty force transmission (applied to the Rams' conservative RTP handling and Puka Nacua); a prior core/groin injury can make the nervous system redistribute load and alter activation timing, suppressing distal (calf) peak output — with the practical distinction that a neural re-activation problem can play this week while a true strain cannot (examples cited: Marshawn Lloyd, Christian Watson); plus a reporting-epistemics post: an initially mislabeled injury type propagates through the insider telephone chain and corrupts every downstream expectation (the Lamar Jackson case).

**VERIFICATION.** The comp table checks out where independently verifiable: Cruz's 2016 return line (39-586-1) and Graham's 2016 line (65-923-6) match the historical record as republished in SI's own Oct 2026 McLaurin history pieces and the standard comp tables; SI's coverage of the same injury cites a 2025 *Orthopaedic Journal of Sports Medicine* study (45 NFL patellar-tendon tears; 57.8% returned to play; median return 11.4 months) — the account's method is the published clinical-historical method, executed accurately. His week-level availability leans (e.g., Lamar plays, Puka misses Week 7) are his stated opinion, labeled by him as "best medical education guess," and are graded as opinion here.

**WHICH LAYER.** Health — this is the input class the health layer actually needs: not in/out status but *mechanism, expected timeline, and reinjury pathway* per named player. The comp-table format is directly reusable as an engine artifact: injury → age-matched historical comps → distribution of outcomes, including the year-2 second-injury pattern (Boston) that a simple "returns in ~11 months" line hides.

**RISKS.** Single-operator medical opinion at social-media distance (no examinations); comp sets are small-n by nature; his fantasy-league asides are noise around the signal.

**VERDICT: LEARN-ONLY.** Posts: 2112624699847098817, 2112640237080039845, 2113686523099144227, 2113686857867571609, 2113705033141489864, 2113754973800640861, 2113755555177390467. (His remaining 28 pull posts are replies, availability notes, and chatter — cluster entry in Part 2.)

## D6 — @DynatyzeFF — Dynatyze metric suite and the WAR Board (Batch D; dynatyze.com verified)

**WHAT IT IS.** A fantasy-analytics product (dynatyze.com) publishing a family of named metrics in tier/list form: **RB Independent Creation** tiers (last-2-weeks leaders: Walker/Bijan/Warren tier 1), **Alpha Role** leaders (usage-role dominance; Mike Evans tier 1), TE **boom %** and **RZ Role**, route-participation lists — and the flagship **WAR Board**: positional fantasy WAR with "Field Graph" visualizations. The WAR definition is verified at the primary source (dynatyze.com/football/war-board, fetched 2026-10-30): *"wins added over the replacement player at a chosen league size, lineup and scoring format, from weekly positional finishes, for every season since 1999"* — free to view. The posts' Week 7 board: JSN the clear WR WAR leader; Gibbs/Walker III the top-2 RB race; Isaiah Likely the #1 TE (the breakout nobody predicted); Josh Allen far ahead at QB. And the board's most instructive output, which the account owns rather than hides: asked whether Parker Washington is really better than Ja'Marr Chase, the answer is "According to the board? Yes" — a replacement-level artifact (Washington's wins-added are inflated by availability and a low positional replacement bar), published with the artifact visible.

**WHAT'S NOT DEFINED.** Independent Creation, Alpha Role, boom %, and RZ Role formulas do not appear in the posts; the site's tape tool (dynatyze.com/football/tape, parameterized by position/week/column) exists, but this pass did not extract definitions for the four — they stay named-but-undefined, UNVERIFIED as constructions.

**WHICH LAYER.** Usage — WAR is a season-arc value frame (who has actually added wins), not a weekly matchup input; the role metrics (Alpha Role, RZ Role) are usage-layer concepts whose definitions would need pinning before any imitation.

**CREATIVE ANGLES.** The "own the artifact" behavior is the lesson: a WAR board that prints Washington > Chase *and says so* teaches users what WAR measures; GSE's published reasoning can use the same move — when a metric produces a counterintuitive output, explain the mechanism instead of burying the output.

**VERDICT: WATCH** (WAR Board is a free, defined, since-1999 artifact; the rest of the suite is undefined in the record). Posts: 2112528630068973744, 2112528639237792043, 2112528648976933037, 2112528653427052587, 2112528661903757613, 2112528670338294255, 2112528678219403357, 2112528687329591667, 2113610136073756717, 2113610143430516823, 2113610148178702435, 2113610151471051080, 2113610156009566647, 2113610163567349969, 2113610161117966644, 2113610167531274418, 2113612486188437565.

## D7 — @MossPicks — model architecture disclosure (Oct 21)

**WHAT IT IS.** The model behind the account, described in its own post: it outputs two numbers per game — a **Calculated Spread** and a **Score Prediction**. The Calculated Spread combines all advanced stats available through Week 6 with five explicit weighted adjustments: (1) Home Field Advantage, (2) Situational Edge, (3) Player Adjustments, (4) Matchup Edge, (5) Play Calling Edge. Companion to the explore pass's B3 dossier (his Week 7 input list: EPA/play, DVOA, CPOE, PFF grades, YAC/Comp, OnTgt%). Weights are not disclosed; his posted record claims elsewhere are UNVERIFIED.

**WHY IT EARNS A DOSSIER.** The architecture is a public, independent implementation of the same shape GSE's doctrine prescribes — a stats base priced through situational, personnel, matchup, and coaching adjustment layers, in that order, with the market nowhere in the construction. It is evidence the layer order is converging across independent builders; it also names the two layers most public models skip (situational edge, play-calling edge) as first-class weights.

**WHICH LAYER.** Meta — model-architecture reference for the engine's own build; components map to situations, health (player adjustments), matchups, and coaching.

**VERDICT: LEARN-ONLY.** Post: 2113047211911057858. (His three other pull posts are pick/result posts — Part 2.)

## D8 — @FantasyProsLabs — two first-party studies: ECR deviation cost, and absence-effect asymmetries (Oct 21–23)

**STUDY 1 — deviating from consensus costs more than it gains.** From millions of real synced lineups, Weeks 1–6: over half of all lineups differed from the "optimal" lineup implied by Expert Consensus Rankings. Of the start/sit decisions that went off-script, **55% lost points** versus the ECR choice (after removing lineups with injured/bye starters), and the asymmetry is in the magnitudes: losses averaged **−8.8 points**, gains **+7.1**. Status: FIRST-PARTY STATED — FantasyPros owns the lineup data and the ECR; the design is stated plainly and the numbers were not independently reproduced.

**STUDY 2 — "Fantasy Mythbusters Ep. I," every case 2018–25.** Three absence myths tested: (a) the star WR being out does **not** symmetrically boost the WR2 (no hypertargeting windfall in reverse); (b) without the WR2, the star WR1's target share rises only modestly — stars are already near their ceilings; (c) a backup QB does **not** hyper-target his WR1 — the WR1 keeps his share but scores **1.2 fewer points per game** because the whole offense degrades (worked example: CeeDee Lamb 2022 with Cooper Rush — share rose 26%→37% and he *still* lost 2.5 ppg).

**WHICH LAYER.** Usage — this is the correction term for the engine's role-shift logic (Session 3's C-301 role shift alerts): the naive adjustment "absent player's share flows to the next man" is empirically wrong in both directions; the offense-level degradation term dominates the share-transfer term for QB changes.

**VERDICT: LEARN-ONLY.** Posts: 2113036324747813188, 2113036327335731413, 2113704490037555398, 2113704497767735582, 2113704491127295240, 2113704501127295240 (one post in the thread was captured twice under two status IDs — a pull artifact, counted once for substance).

## D9 — @sethwalder — evaluate fourth-down decisions on two planes (Oct 21, applied Oct 23)

**WHAT IT IS.** A decision-grading standard from ESPN's analytics writer: a fourth-down call should be evaluated on **(1) effect size** — win probability gained/lost — and **(2) certainty** — the gap between the *breakeven* conversion probability and the model's *estimated* conversion probability. ESPN's fourth-down page displays both (hover the card). Applied post: Patriots 4th-and-2 — breakeven 46%, conversion probability 62% → "green light go," a call that is right by 16 points of certainty margin, not merely by the sign of a WP delta.

**VERIFICATION.** Walder runs ESPN's win-probability/fourth-down model publicly and its breakeven framing is his documented standard output (ESPN's WP model takes pregame WP as an input — the main documented difference from SIS's version). The two-plane display design is as he describes it in the post.

**WHICH LAYER.** Situations — and a publishing standard: a decision grade without a certainty plane is half a grade. The same two-plane discipline maps onto GSE's pick publishing (the play, plus how much room the number has to be wrong).

**VERDICT: LEARN-ONLY.** Posts: 2112953570647843104, 2113459433116487723.

## D10 — @PRFFBall — "Process/Results," a probability-first fantasy platform (prffball.com verified)

**WHAT IT IS.** The account is the public face of prffball.com — verified on the site (fetched 2026-10-30): *"Superforecasting Fantasy Football — the probability-based forecasting platform… Rankings project a static order and give off the illusion of certainty. Our projections estimate the probability of those outcomes."* The posts show the machinery: (a) a **Results Check** page comparing expected vs actual counts by rank band (Week 4: the model expected **3.05** WRs from the WR13–24 band to finish top-12; exactly **3** did); (b) a **Start/Sit Analyzer** built on historical positional outscore distributions ("60% of the time, the RB26 outscores the TE13" — cross-position decisions made from empirical outscore rates, not rankings); (c) **Numbers Mode** — enter your own finish-position beliefs and get the historical outscore probabilities back; (d) the variance catechism, arithmetically correct (a fair coin flipped 10 times lands 70/30 or more extreme 23.43% of the time); (e) a situation-first content rule backed by a checked number — 762 of 1,321 offensive TDs in 2025 came from inside the 10-yard line (**57.68%**; the division checks: 762/1321 = 0.5768), and 75% of the top-12 inside-10 TD teams were top-12 scoring teams, so roster construction should start from "can this team reach the 10" rather than from player talent.

**WHICH LAYER.** Usage / DFS-package surface. The transferable artifact is the *expected-count calibration display* (3.05 expected vs 3 actual) — a one-line public calibration proof that costs nothing to publish and almost nobody publishes.

**VERDICT: LEARN-ONLY** (site: WATCH for the DFS package lane). Posts: 2112295596505931853, 2113389315476906320, 2113772174591013191, 2113774438776967348, 2113774435807449308, 2113776687993569596.

## D11 — @xEP_Network — xep.ai projections with an honest grading system (site verified)

**WHAT IT IS.** A subscription research desk (xep.ai — verified, fetched 2026-10-30) that publishes a projection for every game and every posted prop, printed beside the book's line, across NFL/CFB/NBA (11+ books, lines captured hourly; $29/mo or $99/yr NFL+CFB). The posts are the product working in public: game projections vs market (TCU by 17.9 vs spread 11; total projected 52.8 vs lined 57.5 — "a bigger margin and fewer points than the market expects"), prop projections vs lines (Doncic threes: projection 4.0, line 3.5), hit-rate matrices, and a usage "NFL Vault" (snaps, targets, air yards, red-zone usage for every team). The grading system is the dossier-worthy part, stated on the site: every prop gets a grade A+→C− for **one thing only — the distance between their number and the best available line** — with the disclaimers printed in the same breath: *"A wide gap says we disagree, not that we're right"* and *"Not a pick, not a probability."* Projections are published pre-kickoff and **frozen there**.

**DOCTRINE READ.** This is the market-anchored genre (the gap *is* the product) — the construction GSE's books-last doctrine rejects. But it is the honest version of that genre: frozen numbers, a published glossary, and a grade that explicitly does not claim correctness. Filed as competitive landscape plus a presentation-discipline reference (freeze + glossary + graded disagreement), not as a method to adopt.

**VERDICT: WATCH.** Register-worthy. Posts: 2113327542623252745, 2113348681651073404, 2113706528117342583, 2113713070908576180, 2113723639963271496, 2113737734720495663, 2113745031907696798, 2113752832327537140, 2113764403791507509, 2113772964303049110.

## D12 — @cmain7 — ownership-projection calibration audit + survivor WP table (Oct 20–23)

**WHAT IT IS.** ETR's ownership modeler auditing his own product in public, through Week 6 (showdown slates): projected ownership is **too flat** — the 10–25% band is slightly overprojected, 50%+ players are underprojected; TEs projected 25–50% come in **+3.8%** higher on average; DST (**+2.5%**) and kickers (**+2.1%**) come in *lower* than projected; mid-tier QBs are **+3.6%** overprojected while high-end QBs are **−1.6%** underprojected; accuracy improved in Weeks 5–6 vs 1–4. Companion construction posts: CPT-QB stacking distributions (the field plays 0–1 same-team pass catchers more than top-1% finishing lineups do); the $3,200–$4,000 price band has beaten its showdown projection by ≥5 points **26.9%** of the time (why DST/K lineups are failing — cheap skill players are hitting); a field-behavior observation from the Splash championship (single-entry users hold the three most popular teams 13.1% more than 10+-entry users; 100+-entry portfolios have shrunk to a median of 9 live entries); and a Week 7 survivor table giving each candidate's WP, field availability, and future-value note (HOU 82.9% WP — the WP figures are his model's, UNVERIFIED as numbers; the *format* — WP × availability × future utility in one line per team — is the artifact).

**STATUS.** First-party self-audit (ETR's projections vs ETR-observed actuals). The bias-band table is exactly the calibration artifact a DFS product should publish about itself; GSE's DFS lane has no equivalent yet.

**WHICH LAYER.** Usage (DFS construction) — and a methods note: ownership projections that are "a little too flat" is the generic failure mode of any mean-reverting projection; the band-by-band bias table is how you find out.

**VERDICT: LEARN-ONLY.** Posts: 2112566454981693682, 2112562029781565662, 2112634808757354933, 2112657467704475768, 2113634564702929104.

## D13 — @ihartitz — the Mismatch Manifesto's additive matchup index (Oct 22)

**WHAT IT IS.** A weekly chart series built on one transparent construction: for each matchup stat, publish a **single combined number = the offense's rate + the defense's allowed rate** — combined EPA/play, combined yards before contact per rush ("Kyren Williams + Blake Corum boom weeks?" is what a high combined YBC looks like), plus combined explosive pass/run rates, pressure, and yards per dropback. Data: TruMedia, 2026 season only. His stated purpose: "One metric to show a mismatch instead of going 'Offense ranks x, defense ranks y.'"

**ASSESSMENT.** An additive matchup index: honest, reproducible from any pbp source (the YBC variant needs charted/tracking data; the EPA variant is pure nflverse), and deliberately simple — no interaction term, no shrinkage, no opponent adjustment beyond the addition itself. It is the quick-look version of what a matchup layer does with more structure, and its failure mode is known: it double-counts when both sides' numbers were built against weak schedules.

**WHICH LAYER.** Matchups — as a presentation format (one number per mismatch, components visible) more than as a model.

**VERDICT: LEARN-ONLY.** Posts: 2113269088256749571, 2113269093545529441, 2113269097198764488.

## D14 — @pfn365 — PFN Impact grades (methodology verified at primary source)

**WHAT IT IS.** Pro Football Network's proprietary player grades, used across the pull posts alongside public EPA/CPOE tables (QB Impact: Maye 82.7 vs Williams 82.8 in one post; Williams 84.4, 4th, in another; RB Impact: Jonathan Taylor 80.2, 10th). The methodology is published and was verified at profootballnetwork.com/nfl-hq/rankings/methodology: a single **era-adjusted 50–100 scale** for every position, unit, and team, with history back to 1999; QB Impact is built from EPA per dropback, success rate, ANY/A, and CPOE plus designed-run value; components are **stability-weighted** (clean-pocket performance counts more than pressure performance) with an added **high-leverage "clutch" component**; skill-player production is measured **against replacement-level expectation**, so volume alone doesn't grade. The live 2026 board is consistent with the posts' figures (Williams 84.1 at #5 on the board as crawled, vs 84.4 in-post — different weeks of the same season).

**WHICH LAYER.** Matchups (QB/player evaluation input) — a free, *documented* alternative in the PFF-grade class, with the documentation itself being the differentiator: weights philosophy published, era adjustment stated, replacement baseline stated.

**VERDICT: LEARN-ONLY.** Register-worthy (methodology page). Posts: 2112032330965569818, 2113401018926965003, 2113706873677377589, 2113729836115956186, 2113759903080677580.

---
# PART 2 — ACCOUNT-CLUSTER DOSSIERS (every remaining Session 6 post)

Format per cluster: what the account's pull posts actually contain, the method content if any, and the verdict applied to its posts in the seen index. Pure reply-chatter and one-word posts are counted, not quoted.

## Batch D remainder

**@jmthrivept — remaining 28 posts.** Availability reporting and reactions around the method posts in D5: McLaurin/CMC/Evans injury notes, a Josh Downs trade-rumor note ("agent says phones are ringing"), Week 7 inactive confirmations (Evans/Deebo out; Charbonnet out), a deleted-video note on Charbonnet's status, fantasy-roster asides, and ~10 pure replies ("Yes", "Over", emoji, flame replies). The availability *facts* are week-old news value only; the account's durable value is D5. **Verdict: LEARN-ONLY for the availability/method posts; CONTEXT-ONLY for replies and asides.**

**@MagicSportsGuy — remaining 7 posts.** Customer-support and reaction posts ("They are live! Are you signed in?"), one troll reply about the model ("our site created a model to help Steven's twitter bias. Troll." — notable only as the moment the two-model question in D4 was live), a PROE one-liner, a Catchable Air Yards leaders teaser (chart image; only "JSN is in his own tier" is text — values unread, gap stated), and a bare t.co link with no text (payload unrecoverable from the pull). **Verdict: CONTEXT-ONLY.**

**@DevyEusuf — all 18 posts.** A dynasty-football account captured mid-flame-war: every post in the pull is a bet-challenge or insult reply ("You deflected a bet", "I accept the apology"). Zero metrics, zero method, zero dissectible payload. His Session 1/6 roster presence is the only record value. This is the honest floor of the pull: inventoried for two sessions, and on content read there is nothing to dissect. **Verdict: CONTEXT-ONLY (account-level).**

**@DonAtkinsonNFL — 20 posts.** A 49ers film/opinion account. The substantive cluster is a manually built **attrition ledger**: SF playing with 17 players out or on IR (22 ten days earlier), missing 5 of 6 starting receivers, DE room down to third-string — argued as "depth, not luck" for a 6-0 start; a follow-up names the six missing starters (Bosa, Mykel Williams, Stribling, Pearsall, Collins, Tonges) and quantifies the Rams comparison ("twice the first-level reserves"). A roster-management argument post (sit Mike Evans until the Achilles risk clears — "playing him this week would be malpractice") and a Purdy route-precision film read (Watkins not getting targets because his routes aren't precise — inferred from Purdy's protection of the ball) carry the rest; the remainder is rivalry chatter and one-liners. No formal metrics; the attrition ledger is health-layer raw material in narrative form. **Verdict: LEARN-ONLY for the three attrition/management posts; CONTEXT-ONLY for the rest.**

**@DynatyzeFF — remaining 4 posts.** Two product promos (3-day free trial; WAR Board link post) and an IDP-content pointer. Covered by D6's verdicts. **CONTEXT-ONLY.**

**@32BeatWriters — 4 posts.** A draft-content brand: a Cowboys-defense joke, a 2027 mock-draft video promo, a "fix the Colts" franchise-makeover series promo, and a shoutout to an offseason simulator. No analytics payload. (The account's Session 1 value is beat-writer news aggregation, which this pull window doesn't show.) **Verdict: CONTEXT-ONLY.**

## Session 6 — accounts new to this pass

**@Timo_NFL — the thread is D1; no other posts in the pull.**

**@sethwalder — remaining 2 posts.** A Barnwell fake-trades endorsement and a Vrabel end-of-half aggression note (9 seconds, two timeouts, at the −34: "a lot of head coaches are kneeling" — with the Rams' 46-seconds/0-timeouts surrender as the contrast). Both are situations-layer color consistent with D9. **CONTEXT-ONLY / LEARN-ONLY (noted).**

**@FantasyProsLabs — covered in D8 (all 6 captured posts, one duplicated by the pull).**

**@PRFFBall — covered in D10 (all 6 posts).**

**@xEP_Network — covered in D11 (all 10 posts).**

**@SetProb — 12 posts.** A probability-posting model account, tennis-first. The format is the content: daily pick lists with model probabilities (ATP/WTA/NBA), plus a **weekly tracker** that grades itself in public — X-post accuracy vs overall model accuracy, broken into probability tiers (tennis: 75%+ "Elite" tier 72–16, 81.8%; 58–62% "Close" tier 62–57, 52.1% — a tier table whose low end sits near coin-flip, which is what an honest tier table looks like). The NFL tracker is tiny (Week 6: 5–2 posted, 5–3 overall). All records are self-published, UNVERIFIED; no methodology is disclosed. **Verdict: LEARN-ONLY for the two tracker posts (tiered self-grading format); CONTEXT-ONLY for the ten pick lists.**

**@LimitlessSlate — 7 posts.** An AI-picks service (limitlesssports.ai — signup page verified live) whose posts are **full graded results, losing days included**: "Intel" tier 8–6 +8.6u with every play listed; "Executive" tier 6–10 −4.5u one day, 11–4 +9.6u another; a 30-day all-picks line (239–238, +14.82u, 2.4% ROI). The transparency format — every play, flat units, losses posted, cumulative ROI — is the same honesty standard GSE holds; the numbers themselves are self-reported and UNVERIFIED, and the underlying "AI system" is a black box. Filed as a competitive-format reference for the paywall lane, not as a model. **Verdict: LEARN-ONLY for the four results posts; CONTEXT-ONLY for the pick/win posts.**

**@FBResearchDesk — 10 posts.** A picks account with an unusual discipline: every play is tagged with the **rule that generated it** ("Rule: Player prop model", "Rule: Teaser through key numbers", "Rule: First-half number vs the market (developing)"), the projection delta vs the line ("our projection has Jefferson about 1.5 catches under this line"), personnel context, a price timestamp ("Price as of Fri 4:46 PM ET"), a play ID (NFL7-10…NFL7-18), and "Info, not advice." The teaser construction is textbook-correct (both legs cross 3 and 7). The picks are picks; the *labeled-rule + frozen-price + ID* format is a process-transparency artifact worth copying into any public picks surface. **Verdict: LEARN-ONLY (format); the plays themselves CONTEXT-ONLY.**

**@jhnhrris — 1 post.** A model operator's weekly self-audit, and the most honest single post in the pull: Week: 45.7% ATS, MAE 11.05 vs Vegas 10.97 ("pretty bad week overall"); Season: 52.9% ATS across all games, 55.7% on the >coin-flip-confidence subset (113 games), MAE 11.44 — *tied with Vegas*, stated without spin; plus contest standings (2nd overall in a picker pool where "numbers 1,3,4,5,6 all feed into my model"). Self-reported, UNVERIFIED — but MAE-vs-Vegas is the right benchmark and he publishes it when it says he's average. **Verdict: LEARN-ONLY (benchmark discipline).**

**@sportsindexapp — 4 posts.** Sports Index (sportsindex.io — site verified; stat leaders back to 2004). The substantive post describes its research product: **one-line betting strategies paper-traded at Novig prices on a $1,000 paper account**, graded publicly ("Best free one so far: big home dogs getting 14+ — 17–10, +$326"), with the disclaimer "paper results for research, not betting advice." Strategy results are self-reported, UNVERIFIED; the paper-account-at-real-prices format is the transferable piece. Rest: a CFB stat note and a TD-leaders table. **Verdict: LEARN-ONLY / CONTEXT-ONLY.**

**@trevorwinstral — 8 posts.** A fan account doing real analysis in a thread about Cam Skattebo: year-over-year RB efficiency splits (EPA/rush, success rate, YPC, YBC/att, YaCo/att, stuff %, EPA/tgt) and the thread's method core — isolating scheme from runner via **rushing yards expected at the handoff** (the NGS RYOE concept: 3.6/att in 2025 vs 3.08 in 2026 — "measured at the point in time of the handoff, so it is just what the offense has set up for the runner"). Two further posts defend model-uncertainty reasoning against a coach's critique (the model is an expectation around which there is noise — the intellectually stronger framing, argued fairly). Values as posted, UNVERIFIED. **Verdict: LEARN-ONLY.**

**@blackmambadfs — 2 posts.** A full coverage-split matchup breakdown for AJ Brown vs Chicago: his production vs single-high (0.33 TPRR, 3.05 YPRR among ≥100-route WR/TEs) and vs man (0.35 TPRR, 32.8% share), Chicago's man (32.8%, 4th-highest) and single-high (56%, 9th) rates, Chicago vs outside WRs (11.72 yards/target allowed, 1st), Brown's 87% outside alignment, plus his history vs CHI — a complete matchup-layer argument assembled from Fantasy Points Data, ending in the markets he is targeting (stated plainly). The second post is a Drake London/Penix splits teaser (full text truncated in the pull — recorded as such). Method: standard coverage-split matchup work, done completely. **Verdict: LEARN-ONLY.**

**@beattherecords — 10 posts.** A props-content account publishing concept-split tables: rush-concept efficiency allowed (Zone YPC vs Man/Gap YPC by defense — with the GB split as the headline: 5.29 allowed vs zone, 4th-most; 2.57 vs man/gap, league-lowest — and Gibbs' own zone 5.16 vs man/gap 4.38 as the matchup pairing), WR alignment yards allowed (outside vs slot), deep-passing vulnerability/frequency tables, blitz-rate TPRR splits (MIN's 66% blitz rate vs Colts receivers' TPRR-when-blitzed), plus volume notes and one plays post. The concept-split tables are matchup-layer material in raw form; values as posted, UNVERIFIED, source not named in the posts. **Verdict: LEARN-ONLY.**

**@chriswechtff — 11 posts.** A Fantasy Points Data power user publishing single-stat findings: route-share/screen-rate personnel notes (Bears' 8 screens = Ben Johnson era high; 21 plays of 13 personnel), TPRR/YPRR single-week extremes with small-sample structure visible in the posts themselves (the Jets' two highest YPRR weeks are each player's *only* 25+ route week), since-2021 leader claims for Maye (CPOE +7.3, adj. completion 79.9) and Purdy (EPA/DB 0.245, yards/aimed attempt 9.23, catchable rate 80.1%) — all FPD-sourced, as cited; one product post for FPD Suite 2.0's in-game usage-change tool (find usage exactly when a player leaves a game — the tool @ScottBarrettDFB's Kittle post in this same pull demonstrates). **Verdict: LEARN-ONLY (downstream-of-FPD nuggets; the Suite 2.0 in-game usage tool is the durable item).**

**@DhananiZain — 3 posts.** Blitz-split QB notes (Bryce Young vs blitz: 41/76, 7.7 YPA, 0 INT, EPA/DB +0.29, 5th of 33; TB blitz rate 50%, 3rd) — matching @Panthers_Stats' and @rickyboboddy's posts on the same matchup from the other side (Panthers version: Young 6th in EPA/DB at +0.21, 30th in completion % vs blitz; TB Top-5 blitz rate; rickyboboddy: Young 7th-best blitz EPA, TB 43.5% blitz rate 4th-highest, TB defensive blitz EPA −0.31, 3rd). *Three accounts, three slightly different versions of the same split* — a live demonstration of D3's provenance problem inside one pull. Plus a detailed Week 7 usage thread (truncated in the pull) and a DeVonta Smith hamstring-history availability note (health layer). **Verdict: LEARN-ONLY.**

**@Panthers_Stats (2) / @rickyboboddy (1) / @joelvmoran (1).** Team-stat accounts: Panthers EPA/success-rate context and the Young-vs-blitz split (see @DhananiZain — the three-way discrepancy is the finding); Bears blitz rate 28.7%→42.3% under Dennis Allen. **Verdict: LEARN-ONLY.**

**@TheRealForno — 1 post.** Minnesota's defense ranked first in nine listed categories simultaneously (blitz rate, pressure rate, scoring defense 12.8 ppg, 3rd-down %, red-zone %, TD-drive %, turnover %, points/drive 1.09, EPA/play −0.235, success rate 32.0%) — a defensive-dominance inventory consistent with the Flores material across the Oct 29 runs; values as posted, UNVERIFIED. **LEARN-ONLY.**

**@sheilkapadia — 2 posts.** Situational-split notes: Saints outscored by a league-worst 128 points in first quarters across 23 Kellen Moore games (with the distribution observation that the gap from #32 to #31 equals #31 to #19 — a skew note, not just a ranking); Patriots' offense has lost more EPA on turnovers than any team despite Maye's 4th-ranked dropback success rate. **LEARN-ONLY.**

**@benbbaldwin — 6 posts.** Mostly chatter (including AI-coding remarks). One method line worth keeping: on kickers — "You can't just group all 50+ yard kicks together... (and you can't include indoor kicks)" — a stratification rule for any kicking model (distance bands × venue), relevant to the kicking section of GSE's 360° cards. **Verdict: CONTEXT-ONLY; the kicker line LEARN-ONLY.**

**@thunderwood6 — 1 post.** A model-opacity flag: an unnamed model ranks Buffalo's defense 7th while RBSDM has them 3rd-worst by defensive EPA/play and 2nd-worst by success rate; "smallish sample but 6 games is not nothing." The unnamed model cannot be resolved from the post — the question is the content. **LEARN-ONLY.**

**@nerd_dorkian — 1 post.** A broadcast-model critique: ESPN's NGS alt-cast projected a 54% run probability on a 3rd-&-2 empty-backfield formation — a fan's "AI slop" complaint that is also a legitimate face-validity test for play-call models. **CONTEXT-ONLY.**

**@pass_the_mike_ — 5 posts.** A metrics-debate thread defending passer rating ("actually a really good metric... when you're not upset that Lamar Jackson has a higher one"), with the strongest counter-considerations stated by the poster himself (EPA is environment-laden for single-player judgment; CPOE ignores scoring/turnovers; EPA charges a QB for a blindside sack). No new metric; the debate is a fair map of the public argument. **CONTEXT-ONLY.**

**@noexpertfs — 4 posts.** Prop-pick posts built on defense-vs-position splits (DVOA vs TEs, EPA allowed per dropback) — competent matchup citations in service of picks; one usage-opportunity note (Germie Bernard's target line with Pittman/Wilson on IR). **CONTEXT-ONLY.**

**@daily_chiefs_ — 11 posts.** A Chiefs fan account republishing NGS and @statyxio nuggets (Walker's +277.4 RYOE / +2.62 per carry via statyxio; SEA's 45.5% success rate allowed on outside-right runs via statyxio; Mahomes primetime counts via NGS). Downstream republication — the primary sources are NGS/statyxio, covered elsewhere. **CONTEXT-ONLY.**

**@dabearstakeover — 3 posts.** Bears fan account republishing @statyxio Caleb Williams ranking tables (CPOE +9.8/+9.0 1st, EPA/DB +0.332/+0.348, clean-pocket and no-blitz completion % 1st — two snapshots a week apart, values drift slightly between them, as live tables do). Republication; statyxio is the source. **CONTEXT-ONLY.**

**@pdubyaa — 2 posts.** A Goff statyxio rankings table (1st in passing EPA and EPA-when-blitzed 0.453) and an on/off-numbers caution ("On/Off numbers can be tricky") attached to Branch/LaPorta. **CONTEXT-ONLY.**

**@KyleM_FF — 2 posts.** An FPD quadrant chart post (team success rate × explosive play rate) and a detailed AJ Brown route-tree post: 53.6% of Week 7 routes were Go or In/Dig routes; Average Separation Score −0.107 and 14.3% Route Win Rate across 28 routes (FPD) — with the injury-pattern read (mirrors last year's hamstring-affected first half). Route-level charted data, as cited. **LEARN-ONLY.**

**@Armando_Marsal — 2 posts.** Pointers to his FantasyGuru weekly Usage Report and Red Zone Review (targets, snap rates, backfield splits; inside-20 leaders) — standing usage-layer products, linked not read (the articles sit off-X; see gap audit). **CONTEXT-ONLY.**

**@FANTASYINFRAMES — 2 posts.** Usage-note posts (Irving's 85% snap / 76% rush share; Que Robinson's rising snap share for IDP). **CONTEXT-ONLY.**

**@linesshines — 4 posts.** Defensive-line evaluation notes (Mafe vs Hendrickson age/win-rate/cost tradeoffs; Maliek Collins' career year at 31 off a quad injury; Abdul Carter "single-handedly carrying" the NYG pass rush with an excellent win rate). Film/grade-class opinion, no tables. **LEARN-ONLY (light).**

**@Prof_Fantasy1 — 1 post.** A Week 6 snap report (positional usage heatmap; extreme high-WR/low-TE teams PHI/TEN/DAL/TB "still sticky") — full content in a heatmap image; the text carries the headline only (gap stated). **LEARN-ONLY (inventoried).**

**@ASchatzNFL — 1 post.** A pointer to FTN's Stats iQ piece on Green Bay's pass defense (tight coverage + quick pressures). Article off-X, not read this pass. **CONTEXT-ONLY.**

**@The33rdTeamFB — 2 posts.** Parcells interview clips (finding Romo; managing Lawrence Taylor) — coaching-history content, no analytics payload. **CONTEXT-ONLY.**

**@FFNateJahnke — 3 posts.** A PFF recap link, a rankings link, and the pull's most complete **game-status list** (Out/Doubtful/Questionable by position for Week 7 Sunday) — health-layer raw material, superseded by time. **CONTEXT-ONLY.**

**@golfodds — 3 posts.** Week 8 early lines via Circa (a full lookahead card — market data, recorded as captured) and golf items. **CONTEXT-ONLY.**

**@watch_eve — 1 post.** A tout line ("Book 79-70-5 · +$18,210") with a Week 8 spread pick. Self-stated record, UNVERIFIED, no method. **CONTEXT-ONLY.**

**@blitzlink_ — 5 posts.** Start/sit content posts with real split citations (Pitts vs single coverage: 0.25 YPRR, 10% TPRR; TEN's TE suppression; DET's TE generosity). Competent matchup content in a start/sit wrapper. **CONTEXT-ONLY.**

**@simplefantasy — 3 posts.** A postgame usage thread (Loveland's TE1 usage line: 12 targets, 44.4% TPRR; Henry's target lead) — usage-layer recap content. **CONTEXT-ONLY.**

**@occupyfantasy — 4 posts.** DFS model content promos (Occupy Model / Daily Plug) and a routes-run table for a depleted NE receiver room. **CONTEXT-ONLY.**

**@_betlogic — 1 post.** A weekly player-usage report announcement (snap/rush/target share, red-zone and inside-10 usage for every player whose role moved) — "no takes, just the numbers." A usage-layer product pointer; the report itself is off-X. **LEARN-ONLY (light).**

**@LovelessEnt — 1 post.** A one-line reply fragment (stacked box rate / YPC) with no antecedent in the pull. **CONTEXT-ONLY.**

**@ChaBoyJRich — 2 posts.** A bottom-5/bottom-10 team-stat indictment post and a Loveland usage-share post (30.2% target share, 38.5% air-yard share, 50% RZ share since Williams returned). **CONTEXT-ONLY.**

**@nflfantasy — 5 posts.** The NFL's official fantasy account: scoring-play reactions and two defense-vs-throw-depth matchup notes (Goedert's 68% short-throw rate vs Dallas's short-TE suppression ranks; Bernard's underneath yardage vs NO). **CONTEXT-ONLY.**

**@NextGenStats — 2 posts.** Official NGS nuggets (SF's multi-RB-set yardage; Stevenson's TD win-probability swing 10.2%→24.5% with +23 YACOE and a 4.3% TD probability). The NGS program lane owns NGS content; these are recorded here for completeness of the pull. **CONTEXT-ONLY.**

**@Ramlytics — 1 post.** An early-down pass/run efficiency correction with numbers (Rams early downs: +0.138 EPA/pass at 50% SR vs −0.068 EPA/rush at 40.2% SR) — the run-the-ball argument answered with the team's own splits. **LEARN-ONLY.**

**@MBFantasyLife — 5 posts.** Fantasy Life content: a Utilization Score nugget (Likely: 28% TPRR, Utilization Score 98 — Dwain McFarland's metric, as cited), an air-yards-vs-actual divergence note (A.J. Brown: 261 air yards, 75 actual in two weeks), a sponsored mismatch post. **CONTEXT-ONLY.**

**@DanFiel51114192 — 1 post.** A single-game pass-rush line (Gabe Jacas: 28.6% PRWR, 80.6 PFF rush grade, team-highs). **CONTEXT-ONLY.** @JT4630 and @e23plumer — one-line PRWR exchanges. **CONTEXT-ONLY.** @PFF_College — one grade leaderboard line (Formby 93.3 pass-pro). **CONTEXT-ONLY.** @jonas_shaffer — an OL-split observation (Ravens lead in blown-block rate *and* unblocked-pressure rate — a combination worth a second look; one post, no table). **LEARN-ONLY (light).** @natalygibsonbea — an adjusted-completion note (Williams 86.1% adjusted, leads the ranking). **CONTEXT-ONLY.** @Stone316ColdSA / @6LombardisNE — QB-debate posts. **CONTEXT-ONLY.** @dreamkiss7_t — a PRWR definition question (wins counted even when the QB releases clean — the standard definition question about the metric). **CONTEXT-ONLY.**

**@PolymarketBlitz — 5 posts.** Stat-nugget content under a prediction-market brand: a David Walker efficiency claim (26.0% PRWR 1st of 108, 7.0% sack rate 1st — PFF-class numbers, as posted, UNVERIFIED), Rodgers/Kelce history-watch items, a Raridon PFF-grade note. Not trading-bot content; it is a news-nugget account. **CONTEXT-ONLY.**

## Session 6 — accounts deep-captured in Sessions 3/4 (new posts, Oct 19–24)

**@sfdata9ers — 20 posts.** His standard chart program, one week further on: QB EPA/play vs success rate, QB EPA by quarter, turnover rates, explosive plays, points per drive, target-depth distribution, contested catches, time-to-throw vs target depth, EPA vs man/zone — **chart titles with values in images (unread; gap stated per the standing rule)**. Three posts carry text-level substance: (a) **post-game win expectancy vs actual wins** ("how many wins each team should have had" — CLE/MIN/BUF biggest overperformers, HOU/TB/LAR under) — a luck-accounting method post, LEARN-ONLY; (b) **Special Teams EPA since 2016** full ranking (SEA/BAL/DET top; GB 30th, DEN 31st, LAC 32nd) — a decade-scale ST table in text, LEARN-ONLY; (c) the **NET EPA/play three-phase ranking** (KC #1 with OFF #4/DEF #3/ST #21; MIN #2 with DEF #1/ST #1) — the three-phase decomposition in one line, LEARN-ONLY. The rest: CONTEXT-ONLY (inventoried).

**@SumerSports — 16 posts.** Chart posts in their house style (EPA/play maps, run-concept mix, coverage mix, run-game outliers — titles only, values in images). Text-carried items: the **Trend Tracker** (league-level risers through six weeks: blitz rate, penalties, under-center snaps, middle-of-field EPA — a league-environment watchlist, LEARN-ONLY); Karlaftis' non-blitz pressure rate (22% of non-blitz rushes vs 12.9% league average — a pressure-without-blitz split, text-carried, LEARN-ONLY); a QB-vs-pressure EPA progression (2023 −0.51 → 2026 −0.26, LEARN-ONLY); and a **SumerPass product note** — player stats now viewable *by role in addition to position* (role-based stat views as a product feature, LEARN-ONLY). Rest: CONTEXT-ONLY.

**@PattonAnalytics — remaining 13 posts.** Replies and color around D2/D4: the air-yards source duel (RBSDM air yards Maye 9.3/Williams 6.1 vs NGS intended air yards 9.6/5.8 — another D3-class provenance exhibit, LEARN-ONLY), "Play Caller Tendencies" discussion replies, and pure chatter (milkshake order, highlights). Verdicts per index.

**@cmain7 — remaining 14 posts.** Splash-championship and DFS color, short replies, and banter; the analysis posts are D12. **CONTEXT-ONLY** except as indexed.

**@RyanPaganetti — 22 posts.** Three full text-carried tables (all reproducible from pbp-class data; values as posted): **yards before contact per rush by team** (BUF 2.29 top, CLE 0.38 bottom), **% of runs hit at or behind the line** (CLE 56.7% worst, CIN 35.0% best — "ranking 1st in this is bad"), **EPA/play vs the blitz by team** (DET +0.38 top, LAC −0.34 bottom) — a matched set: the same run-game story told from the blocking side and the defense side. Two decision/method posts: the **Jets' end-of-half collapse** (outscored 100–6 in the final 2:00 of first halves across a 23-game streak since 2025 — a −94 differential worse than every other 23-game stretch among ~13,000 since 2000; a situational-split find, LEARN-ONLY) and the **2nd-and-1 QB sneak as a negative-EPA decision** (>90% conversion that still leaves the offense worse off in EPA than the 2nd-and-1 state — the cleanest one-line statement of EPA-vs-conversion thinking in the pull, LEARN-ONLY), plus an endgame-WP thread citing a historical base rate (1 comeback win in 25 comparable spots since 2010) and cross-model WP comparison (79% vs 81%). The duplicated Santos field-goal story appears twice in the pull under two status IDs (pull artifact; one substance). Rest: replies. **Verdicts per index.**

**@ScottBarrettDFB — 20 posts.** FPD-based matchup content: coverage-split efficiency posts (Boston vs TEN's zone/two-high: 2.39/3.33 YPRR vs 0.36 vs man; London's zone split 2.86 vs man 1.57; CIN as a slot funnel for Flowers; CIN's low-blitz/high-pressure profile vs BAL's blitz-split EPA), leader tables (total EPA last 2 years: Maye 242.1 top), the FPD in-game usage tool demonstration (Kittle's 44% target share after Evans' exit; Cooks' route share 23%→83% — pairs with @chriswechtff's product post), and a model-vs-intuition philosophy exchange (the weighted-coin/Shanahan analogy — "decades of experience flipping coins" as the case for expert priors over base rates; filed as the standing counter-argument to pure model output). **Verdict: LEARN-ONLY for the data posts; CONTEXT-ONLY for chatter.**

**@FantasyPtsData — 12 posts.** House account nuggets: top QB EPA/play seasons of the last 5 years (2026 Purdy 0.380 top), the Bell Cow Report, position-targets-allowed funnels, a zone-fit RB note (Allen 4.77 YPC on zone vs Hall 2.93). The account's substance lives in Sessions 2/4; these are its weekly content surface. **CONTEXT-ONLY except the EPA-seasons table (LEARN-ONLY).**

**@GridironInfo_ — 12 posts.** Chart-card posts (EPA leaders/worst, red-zone EPA, matchup cards, drive-ending shares, chain-moving downs) — titles and occasional text values (JSN/Olave tied at 28 catches of 10+; DET TD on 38% of drives, highest). Values mostly in images. **CONTEXT-ONLY (inventoried).**

**@hawkblogger — 19 posts.** Seahawks beat coverage: press-conference transcripts (Macdonald on process/self-scouting), injury-report notes (Lawrence questionable; edge group thin), roster moves, and a Taylor-trade skepticism note using YAC/MTF comps. Quality beat work; no method payload beyond the comp note. **CONTEXT-ONLY.**

**@EstablishTheRun — 11 posts.** Product/slate coverage posts (showdown breakdowns, projections/ownership, Sims on Solver, Thorman's Snaps & Pace, Man vs Machine) — links to establishtherun.com content, not read off-X (gap noted). **CONTEXT-ONLY.**

**@4for4football — 19 posts.** Article/broadcast link posts (Noonan's lookahead-lines market report, revenge-games, showdown strategy, prop shows) — 4for4.com content pointers, not read off-X. One content note: the lookahead-lines format (Week 8 lines moving 6/4 points and a favorite flip before Week 7 is played) is market-context content. **CONTEXT-ONLY.**

**@FTNFantasy — 4 posts.** Chart nuggets (highest avoided-tackle rate — Walker III "in a tier of his own"; highest YPRR — Evans/JSN/Flowers; checkdown rate — Goff 18.8% leads) and a usage-report link. FTN charted-data surface in miniature. **CONTEXT-ONLY.**

**@statyxio — 8 posts.** The data brand behind several republications above. In its own posts: two NBA matchup-analysis posts (Synergy-class PPP splits — Towns P&R finishing 1.37 PPP vs post-ups 0.90, with Boston's defensive ranks by play type — real method content in another sport's lane), a detailed **Friday injury check** (designations with target/air-yard context — Evans+Deebo out = 38% of SF targets and ~half the air yards; the quantified-absence format, LEARN-ONLY), a **Route IQ** product note (receiver role vs each defense — the account's matchup product), and chatter. **Verdicts per index.**

---
# PART 3 — OCT 29 EXPLORE RESIDUE: closed tonight, and what stays open

The explore candidate list (`raw/2026-10-29-explore-candidates.md`) was mostly closed by the triage report and the ON-EARLIER pass. Three residue items were still open and are closed here at primary source; the rest of the residue is documented with why it cannot be closed tonight.

## E1 — Mistral Large 4 / "Le Chonk" — the two explore items are one model (VERIFIED)

The candidate list carried "Mistral Large 4 (trillion-param, license catch)" and "Mistral Le Chonk (agentic coding/cybersecurity)" as separate items. They are the same artifact: **Mistral Large 4, nicknamed Le Chonk** — a 1-trillion-parameter multimodal MoE (128 routed experts, 4 active; ~49–52B active per token; 1M-token context), previewed early October and **released as open weights on Oct 29, 2026** (HF: Mistral-Large-4-1T-A52B; also Mistral API, OpenRouter, NVIDIA endpoints; vLLM/SGLang serving).
- **The license catch, precisely:** the Mistral Ecosystem Open-Weight License is a modified MIT — free to use, modify, fine-tune, and commercialize, **except** that operating the model as a Model-as-a-Service requires a separate commercial license. Open-weight in the Llama sense, not the Apache sense.
- **Price:** API $0.70/M input, $0.07/M cached input, $2.10/M output — roughly half the preview pricing.
- **Claims:** best-open-weight coding positioning (Terminal-Bench 4.0 41%, Artificial Analysis Coding Agent Index 48% at 47% fewer tokens than GLM-5.3, Cyber Index 51%) — all vendor-run, **UNVERIFIED** independently. Self-hosting needs datacenter hardware even quantized (≈4× B200/B300 class) — not a local lane for Garrett's hosts; the API/OpenRouter route is the usable surface, and it is *not* a free route.
- **System fit:** model-routing stack — a candidate paid coding/reasoning endpoint on OpenRouter, behind the free-first rule. **Verdict: LEARN-ONLY.** Register-worthy.

## E2 — Hi3D V1.0 — a geometry *refiner*, not an image-to-3D generator (VERIFIED)

The candidate note said "Hi3D (2D-to-3D)." The artifact, open-sourced **Oct 23, 2026** (github.com/hi3d-official/Hi3Dv1.0; formerly Sparc3D): it takes a **reference image plus a coarse mesh** and returns high-resolution *geometry* (sparse-grid refinement up to 1536³, up to three passes). Corrections to the note's framing: it does not generate from an image alone (a coarse mesh is a required input; the demo borrows a Hunyuan3D-2 mini adapter to make one); output is **geometry only** — no textures, materials, or vertex colors; it is **inference-only** (no training code, no eval harness; the repo cannot reproduce the paper's tables, per its own model card); the license is the Hi3D Open License 1.0 — commercial use with a scale trigger (200K MAU / $1M monthly revenue); measured hardware is a 96 GB H20 — Kaggle-class or nothing on Garrett's current hosts. Vendor performance numbers UNVERIFIED.
- **System fit:** Content OS 3D side-lane (printable/editable object refinement) — dormant until a GPU lane session exists. **Verdict: LEARN-ONLY.** Register-worthy.

## E3 — "DeepSeek V4 Flash free API" — the free routes, pinned (VERIFIED)

The candidate note's claim resolves into specific, dated routes: the Flash family (284B MoE; V4.1-Flash is 552B MoE per DeepSeek's September announcement) has **free listings on OpenRouter** (e.g., `deepseek/deepseek-v4.1-flash-1017:free`) and a limited-time free listing on OpenCode. The current checkpoint is **V4.1-Flash-1017** (released Oct 17, 2026; MIT-licensed weights on HF; the `deepseek-flash` API endpoint now serves it with no migration step — a silent-swap operational fact worth knowing for anything pinned to that endpoint). Vendor benchmark claims (DeepSWE 77.0 etc.) UNVERIFIED. Also new and directly relevant to a research fleet: DeepSeek opened its own **Search and Fetch APIs** at $0.75 per 1,000 calls, with calls made through DeepSeek Harness / Claude Code / Codex free **only until Oct 31, 2026, 16:00 UTC** — that window closes tomorrow.
- **System fit:** model-routing stack, free-first lane — consistent with the existing OpenRouter free-model routing; the dated Search/Fetch free window is the only time-sensitive item in this report. **Verdict: LEARN-ONLY.** Register-worthy (with the date).

## E4 — Residue that stays open, with the reason on each

- **VEED free API credits via Chroma Awards** — a promo claim from the "free API" search; no primary-source terms were pinned tonight. Low lane value (video-API credits for a lane with a standing footage doctrine). Stays inventoried.
- **OpenAlex + 9 research-agent tools list** — a listicle from the "free API" search; the posting account was not captured in the candidate file. OpenAlex itself is a known free scholarly-graph API; the list's other eight are unrecoverable from the capture.
- **@Obots_ai "MCP building lessons"** — name-level only; no post URL or lesson text captured. Unresolvable from the record.
- **@neromtoobad hackathon agents (Zetaris / Nemotron / Meterless)** — name-level only; three project names with no repos captured. Unresolvable from the record.
- **"Gemini 4 Carbon" news item; "GPT-6.1 Terra computer use" claim** — news-level claims from the "just shipped" search, flagged UNVERIFIED in the original capture; no primary source was located tonight and neither is repeated as fact here.
- **Local-MacBook marketing fine-tune case study** ("LoRA training" search) — no handle, no URL, no artifact name captured. Unresolvable from the record.
- **@TommyJaggi Steelers splits** (explore sweep note, "EPA per play" search) — brief dossier from the note only: Steelers offensive EPA splits by concept, posted as analysis content; no post URL was captured, so nothing further can be verified. **LEARN-ONLY (note-level).**
- **CPOE "contextualized-stats accounts"** (garbage-time adjustment argument) — the candidate file names no account. The *argument* (raw CPOE needs game-state contextualization) is recorded; the posters are unrecoverable.
- **Simmons pressure/double-team data points; Deebo separation** ("Next Gen Stats" search) — data points without a captured poster or URL. Unresolvable from the record.

---

# PART 4 — BATCH D: the definitive statement

**The Batch D deep timeline capture does not exist.** The Oct 16 Session 4 capture report was cut off before delivery; no partial file, draft, or raw capture for @jmthrivept, @MagicSportsGuy, @DevyEusuf, @DonAtkinsonNFL, @DynatyzeFF, or @32BeatWriters exists in the consolidated record, the sweep workspaces, or the benchmark-sweep goal files (all searched this pass). It cannot be dissected tonight because there is nothing to dissect, and x.com text-fetch is policy-blocked for agent passes — the capture can only be re-run by the browser lane, in smaller pieces, as the consolidated gap audit already prescribes.

**What this pass did instead:** the six accounts' Session 6 pull posts — 113 posts, Oct 19–24 — are the deepest capture of Batch D that exists anywhere in the corpus, and they are now fully dossiered (D4, D5, D6 + Part 2 clusters). Net Batch D yield: one verified platform (StatRankings + AI connector), one verified method practice (injury comps), one verified metric artifact (WAR Board), one measurement-provenance exhibit (aDOT), and one account (@DevyEusuf) now documented at content level as having no dissectible payload in the window. The deep-capture re-run remains owed by the browser lane for the *pre-Oct 19* timeline depth only; the accounts themselves are no longer unexamined.

---

# SYNTHESIS

**The pull's center of gravity is not what its roster promised.** A pull aimed at "advanced data and analytics" returned, by volume, mostly fantasy content and fan republication — but its method residue is unusually high-quality, and it clusters into four groups:

1. **Calibration as a publishing act.** cmain7's band-by-band ownership bias table, FantasyPros Labs' expected-vs-actual design, PRFFBall's "expected 3.05, actual 3," jhnhrris publishing an MAE that ties Vegas, SetProb's tier table whose bottom tier sits at 52%, LimitlessSlate posting its −4.5u day. Six independent operators in one week's pull publish their own error measurements. That is the honesty standard GSE already claims; the pull shows the *formats* — each one cheap, each one different, all of them more credible than a record line.
2. **Provenance is the recurring failure.** One stat (aDOT) is six numbers; one matchup split (Young vs the blitz) appears three times with three different values; one platform (StatRankings) runs two models under one name; one metric (Catchable Ball Rate, from the Oct 29 runs) is uncomputable from public data at all. D3 is not an anecdote — it is the week's theme, and the fix is boring: pin every external number to a named source and definition before it enters the engine.
3. **The adjustment layers are where public modeling is differentiating.** MossPicks' five weighted adjustments, Patton's six tendency components, FantasyPros' absence asymmetries, Timo's leverage correction — none of these are new base stats. All of them are *corrections and adjustments applied to base stats*: situational, personnel, coaching, selection-bias. That is precisely GSE's doctrine order (matchup/situation/health adjustments over a stats base, market last), arriving independently from four directions in a single week's pull.
4. **Coach quantification is real now.** Patton's v3.0 is a complete, published, process-only play-caller framework whose construction (personnel entropy, sequencing predictability, PROE+pace) is 5/6 reproducible from public play-by-play. Coach-vs-coach has been a named doctrine layer without a public reference implementation; it has one now.

**Test order (proposed):** (1) Patton approximation — build the 5 public components on nflverse and compare rankings to his published tendencies posts (validates both his model and GSE's personnel/sequencing data plumbing). (2) Definition registry — seed it with the aDOT agreement classes and the three blitz-split variants found here. (3) Paired-flip leverage — adopt as the standing construction before any leverage content is published. (4) Absence-asymmetry correction — fold the FantasyPros findings into the role-shift adjustment as a documented prior until GSE's own absence data can estimate it.

---

# GAP AUDIT

**Read at content level this pass:** all 559 Session 6 posts (full text from the pull JSON); the Patton v3.0 article (full); 11 primary-source pages/searches (StatRankings, Dynatyze WAR Board, xEP.ai, PRFFBall, PFN methodology, SI/Arrowhead patellar records, PFF Timo archive, Mistral release coverage, Hi3D release coverage, DeepSeek release coverage, Limitless Sports, Sports Index).

**Not read / not closable tonight, with reasons:**
- **Batch D deep capture** — never existed; browser-lane re-run owed (Part 4). 6 accounts' pre-Oct 19 timelines remain uncaptured.
- **Chart-image values** in §6 posts: @sfdata9ers (~17 chart posts), @SumerSports (~9), @GridironInfo_ (~10), @Prof_Fantasy1's heatmap, @MagicSportsGuy's Catchable Air Yards chart — values live in images the pull captured only as post text. Same class as Session 4's illegible-chart gap and Session 7's unread images (@naturevx0, @TheHonestNFL's 4 images, @DavidZach16's column, the Catchable Ball Rate values, the SumerSports Bryce Young map sighted three times and never legible). Closing path: browser-lane image reads, one account at a time.
- **Off-X articles linked but not read:** Patton series Parts I–II; 4for4's Week 7 article set (19 link posts); ETR's Week 7 pieces (11); FTN's Packers/Stats iQ article; Armando Marsal's Usage Report and Red Zone Review; the FPD Suite 2.0 tool documentation. Each is inventoried at its pointer post above.
- **Truncated-in-pull posts:** @blackmambadfs' London post and @DhananiZain's usage thread are marked truncated in the pull JSON itself; the missing tails are unrecoverable from the record.
- **Pull duplicates:** two posts were captured twice (FantasyProsLabs' hypertargeting post; Paganetti's Santos story) — counted once for substance, both status IDs indexed.
- **Session 1 KB (1,476 entries)** — citation-level by design, each with an engine-use note; not post-dossiered in this pass and not re-opened. If Garrett wants dossier depth there, it is a separate, larger pass (the KB's own closing section already lists which citations could not be completed).
- **Session 2's 9 unrecovered DM article-shares** (incl. @seeconvm's Aug 14 share) — unrecoverable per the consolidated audit; unchanged.
- **The 39 broad-lane companion files** (news/market/engine-idea sections of the 8-hourly job) — not part of the consolidated X record and not inventoried as posts; their metric content already lives in the Session 1 KB.
- **Verification limits:** self-published records (SetProb, LimitlessSlate, MossPicks, jhnhrris, sportsindexapp strategies, @the_waldman-class claims) remain UNVERIFIED — no independent audit trail exists for any of them. FantasyPros Labs and cmain7 numbers are first-party stated (the data owners reporting their own measurements), graded above anonymous claims but below reproduction.

**Register-worthy items (for the register lane — this pass did not write to the shared register):**
1. Timo Riske leverage correction (paired-flip construction; 1.3–1.6× filter-bias factor).
2. Patton Play-Caller Evaluation Model v3.0 (six components; Substack Part III; Parts I–II unread).
3. StatRankings platform + AI connector (pricing, archive, Coverage IQ+; two-model provenance note).
4. Dynatyze WAR Board (definition verified; since 1999; free).
5. xEP.ai grading system (projection-vs-line distance grades; frozen projections).
6. PRFFBall / Process-Results (probability projections; Results Check expected-count format).
7. PFN Impact methodology page (era-adjusted 50–100; stability weighting; replacement baseline).
8. Mistral Large 4 "Le Chonk" (open weights Oct 29, 2026; MaaS license carve-out; API pricing).
9. Hi3D V1.0 (geometry refinement; license scale trigger; 96 GB hardware gate).
10. DeepSeek V4.1-Flash-1017 free routes + Search/Fetch API (free harness window ends Oct 31, 2026, 16:00 UTC).
11. FantasyPros Labs absence-asymmetry findings (2018–25 case base).
12. MagicSportsGuy aDOT divergence table (PFR≡StatRankings agreement class).

*Pass closed: the reachable inventory is exhausted. Every remaining item above carries the specific reason it cannot be closed tonight and the lane that could close it.*
