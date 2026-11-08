# Mega Sweep 2026-11-06 — IG Wave IG-1 (Lanes A + B)

**Wave:** IG-1 · **Date:** 2026-11-06 · **Lanes:** A = football analytics / situational data; B = football medical / concussion / CTE science
**Collection route:** browser.search `site:instagram.com` discovery (22 queries) + search-result content summaries. instagram-cli `accounts` worked (Garrett's accounts confirmed); `post --url` failed with "check for expired transient grants" — NOT a 429 — so the CLI caption route was unavailable and the wave ran search-only per the task fallback. No 429 was received from any route.
**Dedupe:** all 154 candidate shortcodes checked programmatically against shortcodes extracted from `~/workspace/ig-for-you-sweep/seen-index.md` + `~/workspace/your_files/SHARED-ITEMS-REGISTER.md` (1,103 unique codes) and the mega-sweep folder (no prior SEEN-*.md fragments existed). Result: 0 collisions in the counted set. 4 additional search hits were excluded pre-count as off-scope (betting-model board, meme-only fencing posts) — listed as exclusions, not dupe-skips.
**Counted:** 154 NEW items = 40 full dossiers (IG1-01…IG1-40; 20 A / 20 B) + 114 inventoried-only.
**Evidence level:** dossier facts come from the search index's post-content summaries (spoken/on-screen/caption content as indexed), not full CLI captions. Every dossier flags this in §6. No one was contacted. Comments were not analyzed (per spec).

---

## DOSSIERS — LANE A (football analytics / situational)

### IG1-01 — EPA, finally explained for a general audience — @lindsayrhodesnfl (educator; origin: Sumer Sports / 2026-09-14 podcast)
Post: https://www.instagram.com/reel/DdcNUeDSfZ-/ · Lane A · Posted 2026-09-18
1. **WHAT IT IS** — Lindsay Rhodes demystifies EPA (Expected Points Added): a play's change in expected points given down, distance, field position and historical data, applying to offense and defense. She plays a clip of male hosts joking EPA = Environmental Protection Agency, then defines it plainly ("EPA just means good stuff"), notes 3rd-and-2 is valued differently from 3rd-and-10, and criticizes broadcasters for avoiding the term the way they once avoided passer rating.
2. **WHERE TO FIND IT** — Post URL above; references Sumer Sports and a Sept 14, 2026 podcast segment.
3. **HOW TO USE IT** — GSE's public-facing EPA explainer template: the same "acronym joke → plain definition → one worked contrast (3rd-and-2 vs 3rd-and-10)" arc can be reused for CPOE, success rate, win probability. It is a voice/teaching specimen, not a dataset.
4. **WHICH SYSTEM IT PLUGS INTO** — GSE content layer + reasoning layer: EPA is the base metric of the engine's play-value track; the post is how the metric gets explained to the audience without engine-speak.
5. **CREATIVE ANGLES** — (a) The EPA-vs-Environmental-Protection-Agency cold open is a reusable hook for every metric explainer. (b) Her "broadcasters avoid it because audiences don't understand the math" point is a content-gap argument for GSE: explain the metric on-site and the audience follows.
6. **RISKS/UNVERIFIED** — Content-summary evidence only (no CLI caption). No numbers to verify; the EPA definition as given is standard and correct.
7. **FIRST TEST + VERDICT** — No test needed; adopt the explainer arc. **Verdict: LEARN-ONLY.**
8. **§8 ENGINE-TRAINING VALUE** — None as data. Training value is stylistic: (metric, plain-language definition, worked contrast) triples for the reasoning layer's explanation templates. No labels.

### IG1-02 — "EPA > passer rating": NET EPA/play team rankings chart — @itsfickybaby (creator)
Post: https://www.instagram.com/reel/DTlwp40AD7F/ · Lane A · Posted 2026-01-16
1. **WHAT IT IS** — A creator argues total yards and passer rating "lie," using the 2023 Panthers defense as the case study (fewer yards allowed than Super Bowl teams, but a bad offense forced short fields), then credits EPA's invention to former QB Virgil Carter and shows a NET EPA/play ranking chart for all 32 teams for 2025 (offense/defense/special teams), calling top teams contenders and bottom teams (Panthers, Steelers) "fraud teams."
2. **WHERE TO FIND IT** — Post URL above; the chart itself is the artifact (values not transcribed in the summary).
3. **HOW TO USE IT** — A worked example of the "metric exposes fraud teams" framing GSE uses for its own boards; the Panthers short-field argument is a clean illustration of why raw yardage misleads and EPA does not.
4. **WHICH SYSTEM IT PLUGS INTO** — GSE reasoning layer (situational adjustment: field position / offensive support contaminating defensive yardage) + public board framing.
5. **CREATIVE ANGLES** — (a) The "fraud team" label tied to a chart is engagement bait that still carries a real signal — worth a GSE version with the engine's own NET EPA. (b) Pair with IG1-01: definition post → ranking post is a two-post funnel.
6. **RISKS/UNVERIFIED** — Chart values not independently verified; "Virgil Carter invented EPA" is the standard origin story (Carter's 1971 work) but stated as the creator's claim. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Recompute NET EPA/play for 2025 from nflfastR and compare rankings to the post's chart before citing it. **Verdict: LEARN-ONLY** (pending that recompute).
8. **§8 ENGINE-TRAINING VALUE** — The chart, once transcribed, is (team, NET EPA/play by phase, season) labeled rows — directly comparable to the engine's own phase splits. Labels exist (the chart's own values); transcription is the missing step.

### IG1-03 — How the NFL actually tracks every player: UWB chips, 20×/sec — @ogehezeonu (educator)
Post: https://www.instagram.com/reel/DdZbTS-R5ny/ · Lane A · Posted 2026-09-17 · 5.5K likes
1. **WHAT IT IS** — An explainer of the NFL's tracking stack: small UWB (ultra-wideband) chips in shoulder pads (two per player, plus a third on the back for linemen who crouch), receivers around the stadium, location sampled up to 20×/sec, ~250 tags per game (players, ball, officials, pylons, chains), producing a live digital twin of the field; tags also carry impact sensors. On-screen speed readings (21.93, 22.36 mph) shown.
2. **WHERE TO FIND IT** — Post URL above. Underlying system: NFL Next Gen Stats (Zebra Technologies UWB + AWS).
3. **HOW TO USE IT** — The canonical public explainer of the data pipeline behind every NGS-derived GSE feature (speed, separation, acceleration, impact). Use it to ground any claim about what tracking can and cannot measure: position at 10–20 Hz, plus impact sensing.
4. **WHICH SYSTEM IT PLUGS INTO** — GSE tracking-data layer (NGS features: speed/acceleration/separation/route) and Lane B's head-impact layer (impact sensors in the same tags).
5. **CREATIVE ANGLES** — (a) The "250 tags, digital twin" framing is the best one-line description of NGS for the site's methodology page. (b) The impact-sensor detail is the bridge to the concussion lane: the same hardware feeds both performance and safety analytics.
6. **RISKS/UNVERIFIED** — "20×/sec" vs the commonly cited 10×/sec — the two figures appear across posts (IG1-04 says 10×); treat sampling rate as ~10–20 Hz pending NGS docs. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Cross-check sampling rate and tag count against Zebra/NFL NGS documentation. **Verdict: LEARN-ONLY.**
8. **§8 ENGINE-TRAINING VALUE** — System-level metadata, not a dataset: (sensor, placement, sampling rate, tag count) — the schema facts needed to interpret NGS-derived features and their noise. No player labels in the post itself.

### IG1-04 — NFL Tech EP 01: the tracking pipeline, and the metrics it spawns — @sujar.tech (educator)
Post: https://www.instagram.com/reel/Dd_ccbMhowG/ · Lane A · Posted 2026-10-02
1. **WHAT IT IS** — Episode 1 of an "NFL Tech" series: UWB receivers (20–30/stadium), shoulder-pad tags + ball tag, location/speed/direction 10×/sec, 200+ data points per play, spawning receiver separation (0.6 yd), time to throw, pressure distance (0.3 yd), completion probability (41.8%), expected rushing yards, win probability (45.8%). Notes the NFL–AWS partnership building ML models that identify defender–receiver assignments in real time. Episode 2 teased: completion probability deep dive.
2. **WHERE TO FIND IT** — Post URL above; origin: NFL Next Gen Stats / AWS.
3. **HOW TO USE IT** — A metric inventory: each named derived metric (separation, time to throw, completion probability, expected rush yards, win probability) is a candidate GSE feature with a named provenance (NGS/AWS). The episode-2 tease is a watch item.
4. **WHICH SYSTEM IT PLUGS INTO** — GSE tracking layer + model layer (completion-probability and win-probability features; assignment-identification ML as a reference build).
5. **CREATIVE ANGLES** — (a) The "one sensor stream → six metrics" chain is the cleanest public map of NGS's feature factory. (b) Assignment-identification ML (who is covering whom, live) is the hardest sub-problem in the tracking stack — a named research target for the engine.
6. **RISKS/UNVERIFIED** — The example metric values (0.6 yd, 41.8%) are single-play illustrations, not season data. 10× vs 20× sampling conflict with IG1-03. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Verify the metric list against nextgenstats.nfl.com's glossary; watch for EP 2. **Verdict: LEARN-ONLY.**
8. **§8 ENGINE-TRAINING VALUE** — Metric inventory with definitions: (metric name, unit, example value) — feature-catalog entries for the tracking layer. Labels live in the NGS data itself, not in the post.

### IG1-05 — Next Gen Stats explained, with the full derived-stat glossary — @all32nfl (educator)
Post: https://www.instagram.com/reel/DCj-qXhxLFh/ · Lane A · Posted 2024-11-19
1. **WHAT IT IS** — A walkthrough of NGS: RFID/UWB tags in shoulder pads, on officials and in the ball, 20–30 receivers per venue (~250 devices), three human operators per game, built with Zebra Technologies and Wilson, running on AWS. Derived stats named on screen: aggressiveness (pass attempts with a defender in coverage), cushion (receiver–defender distance at snap), separation, average intended air yards, time to throw, longest tackle (distance covered to make the tackle). Notes 200+ new data points per play, used for game planning, player health and safety, and context beyond the box score.
2. **WHERE TO FIND IT** — Post URL above; origin: NFL Next Gen Stats / Zebra / AWS.
3. **HOW TO USE IT** — The most complete public glossary of NGS derived stats found in this wave — use as the reference when naming engine features (cushion, aggressiveness, longest tackle are rarely cited elsewhere).
4. **WHICH SYSTEM IT PLUGS INTO** — GSE tracking layer (feature definitions) + health/safety layer (the post explicitly ties tracking to player safety).
5. **CREATIVE ANGLES** — "Longest tackle" (distance a defender covers to make the tackle) is an underused effort metric — a candidate feature for defensive hustle/closing-speed modelling. "Three human operators per game" is a data-quality note: NGS is not fully automated.
6. **RISKS/UNVERIFIED** — "RFID" vs UWB terminology is loose in the post (the system is UWB-based); figures are as-presented. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Confirm the glossary terms against NGS docs. **Verdict: LEARN-ONLY.**
8. **§8 ENGINE-TRAINING VALUE** — Glossary entries: (metric, definition, unit) for aggressiveness, cushion, separation, intended air yards, time to throw, longest tackle. Labels live in NGS data.

### IG1-06 — Rams disguise: man-press look → zone, two INTs off Sam Darnold — @hunt_xxvii (analyst)
Post: https://www.instagram.com/reel/DSdGU3oCcYH/ · Lane A · Posted 2025-12-19
1. **WHAT IT IS** — Whiteboard + game-film breakdown of the Rams forcing 2 INTs vs Seattle: 2x2 formation, LA shows man-press pre-snap, nickel follows motion then drops into zone reading the QB's eyes and jumps a slant for a pick-six; second disguise: empty formation, Cover Zero blitz look, defenders drop into coverage instead, Darnold throws quickly into disguised zone.
2. **WHERE TO FIND IT** — Post URL above; game: Rams vs Seahawks.
3. **HOW TO USE IT** — A textbook disguise specimen: pre-snap look vs post-snap reality, with the mechanism (motion-follow then drop) named. Log as a (pre-snap shell, post-snap structure, QB error) triple for the coverage-disguise track.
4. **WHICH SYSTEM IT PLUGS INTO** — GSE scheme-matchup layer (defensive disguise / coverage rotation) and QB-behavior track (Darnold vs disguised zone).
5. **CREATIVE ANGLES** — The comment note that "non-traditional Tampa coverage leads the league in interceptions" is a checkable claim worth testing against coverage-type INT rates.
6. **RISKS/UNVERIFIED** — Single-game, single-analyst breakdown; coverage labels as-presented. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Verify the two plays against All-22 / NGS coverage data if available. **Verdict: CONTEXT-ONLY** (situational input).
8. **§8 ENGINE-TRAINING VALUE** — Two labeled disguise episodes: (pre-snap look, post-snap coverage, result) — exactly the triples a disguise-detection feature trains on. Labels exist in the post's own account.

### IG1-07 — Quarters vs Cover 4 vs match: how to beat it — @hunt_xxvii (analyst)
Post: https://www.instagram.com/reel/DQhKDffgNId/ · Lane A · Posted 2025-11-01
1. **WHAT IT IS** — An instructional breakdown of "quarters" coverage, contrasting it with Cover 4 and match schemes, and how to beat it: high-inside routes, trips, underneath concepts, deep post, flats. Illustrated with Madden gameplay (creator's own caveat: the game often misrepresents real execution).
2. **WHERE TO FIND IT** — Post URL above.
3. **HOW TO USE IT** — A concise quarters-coverage primer for the scheme layer: definition (field split into four deep zones), distinction from Cover 4/match, and the route combinations that stress it.
4. **WHICH SYSTEM IT PLUGS INTO** — GSE scheme-matchup layer (coverage taxonomy) + QB-behavior track (route concepts vs quarters).
5. **CREATIVE ANGLES** — The Madden-as-whiteboard choice is itself a method note: a cheap, repeatable way to diagram coverage — but the creator's own warning (Madden misrepresents execution) is the right caution to carry.
6. **RISKS/UNVERIFIED** — Madden visuals, not real All-22; scheme claims are standard coaching taxonomy, not new data. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — No test; use as a taxonomy reference. **Verdict: LEARN-ONLY.**
8. **§8 ENGINE-TRAINING VALUE** — Taxonomy entries: (coverage name, structure, beaters) — labeled scheme knowledge for the matchup layer. No play-level labels.

### IG1-08 — The four free football-data sources: nflfastR, nfl_data_py, SportsPlays, SportsDataIO — @mar_antaya (educator)
Post: https://www.instagram.com/reel/DOKLTrvAaR0/ · Lane A · Posted 2025-09-03
1. **WHAT IT IS** — "Top websites and APIs for football data": (1) nflfastR — R package, play-by-play since 1999, with a beginner's guide; (2) nfl_data_py — Python library sourcing nflfastR data; (3) SportsPlays API — free/paid tiers ($195/$499/mo); (4) SportsDataIO — real-time stats via paid APIs.
2. **WHERE TO FIND IT** — Post URL above. Originals: nflfastR (github.com/nflverse/nflfastR, MIT), nfl_data_py (github.com/nflverse/nfl_data_py), sportsdata.io.
3. **HOW TO USE IT** — The wave's single best data-source signpost: nflfastR + nfl_data_py are the free backbone of GSE's play-by-play work; the post is a citable pointer for anyone onboarding to the stack.
4. **WHICH SYSTEM IT PLUGS INTO** — GSE data-ingestion layer (nflfastR/nfl_data_py are already the engine's PBP source — this post confirms the public consensus choice).
5. **CREATIVE ANGLES** — The creator's "I would use nfl_data_py myself" is a routing signal: Python over R for new GSE work. The paid tiers are priced and named — useful for cost comparisons.
6. **RISKS/UNVERIFIED** — Prices as-presented (Sept 2025); verify current tiers before quoting. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — None needed; the two open-source libraries are already verified in the corpus. **Verdict: LEARN-ONLY** (source pointer).
8. **§8 ENGINE-TRAINING VALUE** — Provenance map: (library, language, coverage since 1999, license) — the data-lineage entries the engine's ingestion docs need. The datasets themselves are the training data (PBP since 1999, labeled by play outcome).

### IG1-09 — Build a game-winner model in Python: nflreadpy + logistic regression — @askdatadawn (data scientist; ex-NFL cheerleader)
Post: https://www.instagram.com/reel/DR2BVMzDQb9/ · Lane A · Posted 2025-12-04
1. **WHAT IT IS** — A step-by-step build: predict Cowboys–Lions winner with Python — import nflreadpy, 18 independent variables from prior-game stats (passing/rushing yards, sacks, INTs), binary target home_team_win, 80/20 train-test split, Random Forest for feature importance (top 10 kept to avoid overfitting), logistic regression; ~64% train/test accuracy; prediction: DET wins, 76.2% confidence.
2. **WHERE TO FIND IT** — Post URL above. Library: nflreadpy (Python port of the nflverse reader; github.com/nflverse/nflreadpy).
3. **HOW TO USE IT** — A worked baseline recipe: the 64% accuracy figure is the honest number for a naive prior-game-stats logistic model — the floor GSE's reasoning layer must beat, and the feature list is a starter set.
4. **WHICH SYSTEM IT PLUGS INTO** — GSE model layer (baseline win-probability model; feature-importance pruning via Random Forest).
5. **CREATIVE ANGLES** — (a) The comment critique (60% ≈ near-random baseline) is the right adversarial note — the post's own audience supplied it. (b) Her "comment NFL for the code" gate is a distribution pattern, not a source; the code itself was not recovered.
6. **RISKS/UNVERIFIED** — Code not recovered (comment-gate); 64%/76.2% figures as-presented; no out-of-sample validation shown. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Rebuild the recipe from nflreadpy in the lab and check whether 64% reproduces. **Verdict: LEARN-ONLY** (baseline recipe).
8. **§8 ENGINE-TRAINING VALUE** — Recipe + baseline: (18 features, 80/20 split, RF top-10, logistic, 64% acc) — a labeled baseline run the engine can reproduce and beat. Labels: game outcomes from nflfastR.

### IG1-10 — Three resume-grade NFL coding projects: contract value, 4th-down grader, trade analyzer — @ethandojo (educator)
Post: https://www.instagram.com/reel/Dc63VVHpIYw/ · Lane A · Posted 2026-09-05
1. **WHAT IT IS** — Three build specs: (1) Contract Value Analyzer — production-per-dollar, bargains vs overpaid (Dak Prescott named), Python/Pandas/Streamlit; (2) 4th Down Calculator/Decision Grader — go vs punt/FG against league analytics, Python/Pandas/Scikit-learn/Streamlit, illustrated with ESPN Analytics graphics; (3) Fantasy Trade Analyzer — value buckets by performance/matchups/league settings.
2. **WHERE TO FIND IT** — Post URL above; resources behind a "comment 'playbook'" gate (not engaged).
3. **HOW TO USE IT** — The 4th-down grader spec is the directly GSE-relevant build: a decision-grader that scores a coach's actual 4th-down call against the league-analytics optimum — the same shape as the engine's situational grading. The contract analyzer is a roster-construction feature sketch.
4. **WHICH SYSTEM IT PLUGS INTO** — GSE situational layer (4th-down decision grading) + roster/value layer (production-per-dollar).
5. **CREATIVE ANGLES** — A decision-grader is more valuable than a decision-calculator: grading what a coach actually did, post-hoc, produces the (situation, decision, optimal, delta) rows the reasoning layer learns from.
6. **RISKS/UNVERIFIED** — No code or dataset recovered (comment gate); project ideas only. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Prototype the 4th-down grader on one week's games from nflfastR + the nflfastR 4th-down model as the optimum. **Verdict: LEARN-ONLY.**
8. **§8 ENGINE-TRAINING VALUE** — Build spec for (situation, decision, optimal-decision, delta) rows — the exact labeled dataset a decision-grading feature needs. Labels: play outcomes + 4th-down model outputs.

### IG1-11 — 4th-down efficiency, not volume, predicts playoff success — @maxbrowne (analyst)
Post: https://www.instagram.com/reel/DFQtkiwSu4s/ · Lane A · Posted 2025-01-25
1. **WHAT IT IS** — Browne argues 4th-down conversion efficiency predicts playoff success better than attempt volume: four teams converted 70% of 4th downs and all four reached the conference championship; of the top 10 in attempts only two made the playoffs, while seven of the 10 with the fewest attempts did. Case study: Washington went 3-4 on 4th down vs Detroit (NFC Divisional) with four attempts on one drive inside FG range — 14 points instead of 9 — and 3-5 vs Tampa Bay (Wild Card), 14 instead of 6, winning by 3. Claims 4th-down conversion % beats 3rd-down conversion and red-zone TD % as a predictor.
2. **WHERE TO FIND IT** — Post URL above; games: WAS–DET divisional, WAS–TB wild card (2024 playoffs).
3. **HOW TO USE IT** — A testable hypothesis for the situational layer: conversion efficiency (not volume) as a playoff-success feature; the Washington game logs are two concrete (situation, decision, points-forgone) episodes.
4. **WHICH SYSTEM IT PLUGS INTO** — GSE situational layer (4th-down efficiency feature) + reasoning layer (quality-over-quantity framing).
5. **CREATIVE ANGLES** — The "14 instead of 9 / 14 instead of 6" arithmetic is the cleanest illustration of 4th-down value in the wave — a reusable explainer for the site.
6. **RISKS/UNVERIFIED** — Small-sample claim (n=4 teams at 70%); "better predictor" not shown with a statistical test. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Test on nflfastR: correlation of season 4th-down conversion % vs playoff advancement across 5+ seasons, vs 3rd-down and red-zone TD %. **Verdict: LEARN-ONLY** (hypothesis).
8. **§8 ENGINE-TRAINING VALUE** — Hypothesis + two labeled game episodes: (team, game, 4th-down attempts/conversions, points-forgone) — directly computable from nflfastR PBP. Labels exist in the data.

### IG1-12 — Why everyone goes for it on 4th down now: the four reasons — @joshsmoore (creator)
Post: https://www.instagram.com/reel/DfIXc1-v4jw/ · Lane A · Posted 2026-10-30
1. **WHAT IT IS** — An explainer of the analytics-driven 4th-down shift: (1) Possession is king — giving the ball up is the worst outcome; (2) the "dead zone" disappeared — failing at the opponent's 35–40 leaves them at their own ~34, statistically similar to a punt to the 10–20; (3) short-yardage success — 4th-and-1 conversion historically 65–70%, and the Tush Push makes one yard highly reliable; (4) aggressive coaching culture — stigma fading, coaches praised for aggression.
2. **WHERE TO FIND IT** — Post URL above.
3. **HOW TO USE IT** — The four-reason structure is a ready-made situational-layer explainer; reason (2) (dead-zone field-position equivalence) is the least-known and most useful.
4. **WHICH SYSTEM IT PLUGS INTO** — GSE situational layer (4th-down decision model inputs) + content layer.
5. **CREATIVE ANGLES** — Reason (2) can be quantified from nflfastR: expected points of opponent starting at own 34 vs own 15 — a one-chart proof for the site.
6. **RISKS/UNVERIFIED** — 65–70% conversion figure as-presented (broadly consistent with published 4th-and-1 rates); the dead-zone equivalence is asserted, not computed. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Compute the dead-zone EP equivalence from nflfastR. **Verdict: LEARN-ONLY.**
8. **§8 ENGINE-TRAINING VALUE** — Four named features for the 4th-down model: possession value, field-position-after-failure EP, short-yardage conversion rate, coaching-aggression prior. Labels: PBP outcomes.

### IG1-13 — The 2002 paper that started the 4th-down revolution (and the coaches who scoffed) — @espnoriginals (first-party)
Post: https://www.instagram.com/reel/DT-wExGjblC/ · Lane A · Posted 2026-01-26
1. **WHAT IT IS** — A historical snapshot: a 2002 academic study (economic modelling — David Romer's "It's Fourth Down and What Does the Bellman Equation Say?") argued teams could raise win probability by going for it more on 4th down; coaches publicly doubted the model's relevance. The post frames the clash between data theory and entrenched intuition, and how far the league has come.
2. **WHERE TO FIND IT** — Post URL above. Original: Romer (2002), NBER / Journal of Political Economy (2006).
3. **HOW TO USE IT** — Provenance anchor for the entire 4th-down lane: the Romer paper is the origin of the analytics-vs-gut debate that IG1-11/IG1-12 continue. Cite it as the primary source, not the post.
4. **WHICH SYSTEM IT PLUGS INTO** — GSE situational layer (decision theory: dynamic programming / Bellman equation applied to 4th down) + reasoning-layer history.
5. **CREATIVE ANGLES** — The "coaches scoffed, then adopted" arc is the Funnel Doctrine in miniature — the gap between intuition and evidence is the business.
6. **RISKS/UNVERIFIED** — The post names no author; Romer attribution is the standard identification (2002 paper, whiteboard of formulas). Content-summary evidence only.
7. **FIRST TEST + VERDICT** — None; primary source already in the corpus's decision-theory lane. **Verdict: LEARN-ONLY.**
8. **§8 ENGINE-TRAINING VALUE** — Provenance: (Romer 2002, Bellman-equation 4th-down model) — the foundational decision-theory reference for the situational layer. Labels: the paper's own play-by-play dataset.

### IG1-14 — Rest edges: Bears +15 (2nd-most since 1990), Chargers −24 (worst since 2013) — @lacesonleather (aggregator; origin: schedule data)
Post: https://www.instagram.com/p/DdKLa9aGrA5/ · Lane A · Posted 2026-09-11
1. **WHAT IT IS** — A 10-slide carousel of 2026 schedule analytics: Bears best rest advantage (net +15 days, 2nd-most since 1990); Lions easiest schedule, Cardinals hardest; Broncos toughest through Week 6 then easiest; Bills rest advantage vs their five toughest AFC opponents; Eagles face only five top-20 defensive-EPA teams; Dolphins largest schedule-difficulty increase YoY; Chargers largest rest disadvantage (net −24 days, worst since 2013); Bears hardest schedule vs pass defenses, Vikings easiest; Raiders 11 games vs projected top-10 defensive-EPA teams (most since 2010); Ravens face one projected top-20 offense in the second half after six top-10 in the first.
2. **WHERE TO FIND IT** — Post URL above; underlying source is schedule/rest modelling (Warren Sharp's net-rest work is the cited origin for the same numbers in IG1-15).
3. **HOW TO USE IT** — A ready-made situational feature set for 2026: net rest differential, rest-vs-tough-opponents, schedule-difficulty splits (first/second half), defensive-EPA opponent counts. Each slide is a (team, metric, value, historical rank) row.
4. **WHICH SYSTEM IT PLUGS INTO** — GSE situational layer (rest/schedule features — Layer 4 of the weekly cycle) + matchup layer (opponent EPA strength).
5. **CREATIVE ANGLES** — The split-half structure (Broncos tough-then-easy, Ravens hard-then-easy) is the key insight: schedule difficulty is not a season constant, it is a curve — model it as one.
6. **RISKS/UNVERIFIED** — Projected (pre-season) figures; "since 1990/2013" historical ranks as-presented, not independently verified. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Recompute net rest from the 2026 schedule and compare; grade the projections after the season. **Verdict: LEARN-ONLY.**
8. **§8 ENGINE-TRAINING VALUE** — Ten labeled rows: (team, situational metric, value, historical rank) — rest/schedule features with pre-season projections as labels, gradeable against actual results. Labels exist (the carousel's own numbers).

### IG1-15 — Warren Sharp's NFL 2026 Net Rest Edges, charted — @lafbnetwork (recreator; origin: @SharpFootball)
Post: https://www.instagram.com/p/DYctWers5hj/ · Lane A · Posted 2026-05-17
1. **WHAT IT IS** — A graphic of Warren Sharp's "NFL 2026 Net Rest Edges" (net rest = total extra rest days vs opponents summed over the season; negative = bad): LAC −24, PHI −15, LV −13, NYJ −9, NO −7, IND/LAR/MIA/PIT −6, CIN −4, BAL/JAX −3.
2. **WHERE TO FIND IT** — Post URL above; origin: Warren Sharp / Sharp Football Analysis (@SharpFootball).
3. **HOW TO USE IT** — The canonical net-rest table for 2026 — the single number per team that the situational layer consumes. Pair with IG1-14 (same numbers, different presentation) as a cross-check.
4. **WHICH SYSTEM IT PLUGS INTO** — GSE situational layer (net rest differential — a standing weekly-cycle feature).
5. **CREATIVE ANGLES** — Net rest is a one-number schedule feature: cheap to compute, stable across the season, and directly comparable year to year — a good candidate for a permanent feature slot.
6. **RISKS/UNVERIFIED** — Recreated graphic (not Sharp's own post); values match IG1-14's carousel, which corroborates them. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Recompute from the schedule; the two independent presentations agreeing is already a weak verification. **Verdict: LEARN-ONLY.**
8. **§8 ENGINE-TRAINING VALUE** — A labeled table: (team, net rest days, 2026) — 12 rows, gradeable against 2026 outcomes (injuries, ATS, win rate). Labels exist.

### IG1-16 — Highest pass-block win rates: Eluemunor 96.7%, O'Neill 96.5% — @profootballfocus (first-party)
Post: https://www.instagram.com/p/DezOoi2AX45/ · Lane A · Posted 2026-10-22
1. **WHAT IT IS** — PFF graphic: highest pass-block win rate among OTs this season (min 150 pass snaps): Jermaine Eluemunor (Giants) 96.7%, Brian O'Neill 96.5%, Trent Williams 95.6%, Amarius Mims 95.0%, JC Latham 95.0%.
2. **WHERE TO FIND IT** — Post URL above; origin: PFF grading/tracking (proprietary).
3. **HOW TO USE IT** — A snapshot of the OL track's headline metric: pass-block win rate per tackle, with a minimum-snap threshold — the kind of leaderboard the engine's OL layer consumes as a cross-check on its own pressure-allowed numbers.
4. **WHICH SYSTEM IT PLUGS INTO** — GSE offensive-line track (pass protection) + matchup layer (OT vs edge matchups).
5. **CREATIVE ANGLES** — The min-150-snaps threshold is a methodology note worth copying: rate stats without a floor are noise.
6. **RISKS/UNVERIFIED** — PFF proprietary metric; definition and grading not open. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Cross-check against ESPN pass-block win rate for the same players/week. **Verdict: CONTEXT-ONLY.**
8. **§8 ENGINE-TRAINING VALUE** — Five labeled rows: (player, team, pass-block win rate, min snaps) — a small labeled set for OL-feature validation. Labels exist (PFF's own grades).

### IG1-17 — Drake Maye 2025 passing chart: deep-ball green everywhere — @profootballfocus (first-party)
Post: https://www.instagram.com/p/DRAwUcaEqT-/ · Lane A · Posted 2025-11-13
1. **WHAT IT IS** — A passing chart (powered by PFF): three yardage bands (20+, 10+, 0+) × three field zones (outside left, between numbers, outside right), each cell showing PFF grade, Comp/Att, yards, TDs/INTs. The 20+ band is almost entirely bright green (grades 85.2, 95.3, 99.1) — elite deep-ball performance; the 10+ between-numbers cell is red (grade 70.0, 1 TD / 3 INT).
2. **WHERE TO FIND IT** — Post URL above; origin: PFF.
3. **HOW TO USE IT** — The passing-chart format (depth × direction, with grade + efficiency per cell) is the QB evaluation template the engine's QB track should mirror: it separates deep-ball skill from intermediate-zone risk in one view.
4. **WHICH SYSTEM IT PLUGS INTO** — GSE QB-behavior track (depth/direction passing splits) + matchup layer (where a QB is dangerous vs where he turns it over).
5. **CREATIVE ANGLES** — The single red cell (10+ between numbers, 3 INTs) is the actionable insight: a specific zone to attack/avoid — more useful than the headline "elite deep ball."
6. **RISKS/UNVERIFIED** — PFF proprietary grades; cell values as-presented, not independently recomputed. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Rebuild the same depth×direction table from nflfastR for Maye 2025 and compare Comp/Att and TD/INT per cell. **Verdict: LEARN-ONLY** (format + hypothesis).
8. **§8 ENGINE-TRAINING VALUE** — A labeled grid: (depth band, direction, grade, Comp/Att, yards, TD/INT) — 9 cells, reproducible from PBP. Labels exist in nflfastR.

### IG1-18 — SumerScore: Drake Maye 98th percentile, league-leading EPA/play — @sumersports (first-party)
Post: https://www.instagram.com/reel/DSGU86djlTu/ · Lane A · Posted 2025-12-10
1. **WHAT IT IS** — SumerSports' Pro Bowl voting guide built on "Sumer scores": a proprietary framework ranking players on EPA per play and percentile rankings. Drake Maye cited at 98th percentile, dual-threat, league-leading EPA per play — an "all-pro level" season; contrasted with Matthew Stafford to show how the score separates elite from popular.
2. **WHERE TO FIND IT** — Post URL above; origin: SumerSports (sumersports.com; the SumerScore methodology is proprietary).
3. **HOW TO USE IT** — A proprietary-metric case study: how a vendor packages EPA/play + percentiles into a single composite score for public consumption. Use as a reference for GSE's own composite-score presentation — and as a reminder that a composite hides its weights.
4. **WHICH SYSTEM IT PLUGS INTO** — GSE model layer (composite player ratings) + content layer (award-voting content).
5. **CREATIVE ANGLES** — The "vote by metric, not by fandom" frame is a direct content idea for GSE award content. The hidden-weights problem is the caution: GSE's composite should publish its inputs.
6. **RISKS/UNVERIFIED** — SumerScore formula proprietary and unverifiable; Maye's EPA/play lead as-presented. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Check Maye's EPA/play rank on nflfastR for the same window. **Verdict: LEARN-ONLY.**
8. **§8 ENGINE-TRAINING VALUE** — One labeled claim: (player, EPA/play rank, percentile) — checkable against nflfastR. The composite itself is not training data (weights hidden).

### IG1-19 — Baldinger: Abdul Carter beats Paris Johnson, kills a TD — @baldynfl (analyst, first-party)
Post: https://www.instagram.com/reel/DeHZbJTI92a/ · Lane A · Posted 2026-10-05
1. **WHAT IT IS** — Film breakdown: 1st-and-goal, Cardinals trailing 30-24; Giants' Abdul Carter (#51) lines up vs OT Paris Johnson Jr. (#70), beats him clean off the snap, generates immediate pressure on Jacoby Brissett, forcing an incomplete pass to Trey McBride in the end zone — a would-be TD. A second angle shows Carter obstructing Brissett's vision.
2. **WHERE TO FIND IT** — Post URL above; game: Cardinals vs Giants.
3. **HOW TO USE IT** — A single-play pressure specimen for the OL/DL matchup track: (rusher, blocker, situation, outcome) with the mechanism (clean win off the snap + vision obstruction) named.
4. **WHICH SYSTEM IT PLUGS INTO** — GSE OL/DL matchup layer (edge vs OT) + QB-behavior track (pressure → incompletion in the red zone).
5. **CREATIVE ANGLES** — "Obstructing the QB's vision" is a second-order pressure effect rarely coded — a candidate feature: pressure that blocks the throwing lane vs pressure that only hurries.
6. **RISKS/UNVERIFIED** — Single play, analyst's judgment ("would have been a TD"). Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Verify the play in PBP/NGS (pressure, time to throw). **Verdict: CONTEXT-ONLY.**
8. **§8 ENGINE-TRAINING VALUE** — One labeled pressure episode: (rusher, blocker, down/distance/score, outcome, mechanism) — a (pressure → outcome) training row for the matchup layer. Labels exist in the post's account.

### IG1-20 — Benkert: Jordan Love reads a load-mug front, manipulates pressure, hits Watson deep — @kurtbenkert (ex-NFL QB, first-party)
Post: https://www.instagram.com/reel/DerzGooAtf7/ · Lane A · Posted 2026-10-19
1. **WHAT IT IS** — Film breakdown of Jordan Love vs the Cowboys: a "load mug front" (three down linemen, two linebackers over center); Love reads the blitz pre-snap, sets protection, gets a chip from Christian Watson, steps up in the pocket while manipulating defenders, and delivers a deep pass to Watson. Benkert calls it MVP-caliber QB play under pressure.
2. **WHERE TO FIND IT** — Post URL above; game: Packers vs Cowboys.
3. **HOW TO USE IT** — A pre-snap-read specimen for the QB track: (front, read, protection adjustment, pocket movement, result). The "chip from the receiver" detail is a protection-scheme note.
4. **WHICH SYSTEM IT PLUGS INTO** — GSE QB-behavior track (pre-snap recognition, pressure navigation) + OL/protection layer.
5. **CREATIVE ANGLES** — Ex-QB breakdowns are the highest-signal film source in this wave — Benkert's read of the mug front is coach-grade. Worth a standing watch on his account.
6. **RISKS/UNVERIFIED** — Single play; "MVP-caliber" is opinion. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Verify the play's pressure/time-to-throw in NGS. **Verdict: CONTEXT-ONLY.**
8. **§8 ENGINE-TRAINING VALUE** — One labeled QB episode: (front, pre-snap read, protection call, pocket behavior, outcome) — a reasoning-trace row for the QB track. Labels exist in the post's account.

## DOSSIERS — LANE B (football medical / concussion / CTE)

### IG1-21 — BMJ study: at least 1 in 4 dead NFL players (2008–2021) had CTE — @christophernowinski (primary researcher-advocate, first-party)
Post: https://www.instagram.com/reel/Dcdqxb6R8WK/ · Lane B · Posted 2026-08-25
1. **WHAT IT IS** — Chris Nowinski (co-founder/CEO, Concussion & CTE Foundation) presents a BMJ study: of NFL players who died 2016–2021 (878), 235 families (~27%) donated brains (Boston University, UCSF, Mount Sinai); >91% of donated brains showed CTE pathology. Floor estimate: minimum 25% of all dead players had CTE; ceiling up to 98%. Framed as the first step toward prevalence across pro/college/HS/youth; over 20M men played HS football.
2. **WHERE TO FIND IT** — Post URL above. Original: The BMJ (Aug 2026) prevalence study; BU UNITE Brain Bank is the main repository.
3. **HOW TO USE IT** — The headline prevalence anchor for GSI's CTE lane: the honest form is a bounded range (25% floor, 98% ceiling) driven by donation bias — cite the range, never a single point estimate.
4. **WHICH SYSTEM IT PLUGS INTO** — GSI medical lane (CTE prevalence / risk communication) + GSE situational context (player-health background for career-length features).
5. **CREATIVE ANGLES** — The floor/ceiling method (assume non-donors all-negative vs all-positive) is a clean selection-bias teaching example: the same bounding logic applies to any opt-in dataset the engine uses.
6. **RISKS/UNVERIFIED** — Donor sample is heavily selected (families donate when symptoms existed) — the study's own caveat. Figures as-presented by an advocate (Nowinski) of the finding; read the BMJ paper for the primary numbers. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Pull the BMJ paper and confirm 878/235/91%/25% figures. **Verdict: LEARN-ONLY** (primary-source paper is the citable artifact).
8. **§8 ENGINE-TRAINING VALUE** — Population-level labels: (deaths, donors, CTE+ rate among donors, floor/ceiling bounds) — a labeled prevalence dataset for GSI risk models. Labels exist (neuropathology, the gold standard).

### IG1-22 — The BMJ CTE study, hand-drawn: stages 0–4, 166 severe of 215 — @_sportsball (recreator; origin: BMJ / BU / Harvard)
Post: https://www.instagram.com/reel/DcvvaA8JcdK/ · Lane B · Posted 2026-09-01 · 51K likes
1. **WHAT IT IS** — A hand-drawn infographic of the same BMJ study: 878 dead players (2016–2021), 235 brains donated (mostly BU UNITE Brain Bank), 215 (91.4%) with CTE; severity split: stages 0–4, with 166 severe/very severe and 49 milder. Extrapolation: min 24.5% (non-donors all negative), max 97.7% (all positive); "CTE can only be identified via autopsy." Creator clarifies in replies: cohort is mostly 1970s–90s players; cannot be applied to active players.
2. **WHERE TO FIND IT** — Post URL above; origin: BMJ paper (see IG1-21).
3. **HOW TO USE IT** — The severity distribution (166 severe vs 49 mild) is the detail IG1-21 lacks: prevalence alone overstates uniform harm; stage matters for dementia risk (see IG1-23).
4. **WHICH SYSTEM IT PLUGS INTO** — GSI medical lane (CTE staging) + content layer (data-viz specimen: hand-drawn explainer of a hard study).
5. **CREATIVE ANGLES** — Two posts, one study (IG1-21 + IG1-22) is a provenance lesson: the advocate's floor (25%) and the illustrator's bounds (24.5–97.7%) agree — cross-presentation agreement is weak verification of the underlying numbers.
6. **RISKS/UNVERIFIED** — Recreator, not the research team; stage counts as-drawn. Cohort era (70s–90s) limits applicability to today's players. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Confirm stage split against the BMJ paper's table. **Verdict: LEARN-ONLY.**
8. **§8 ENGINE-TRAINING VALUE** — Labeled severity distribution: (CTE stage, case count) for the 215 positives — training data for stage-conditioned risk models. Labels exist (neuropathology staging).

### IG1-23 — BU: advanced CTE → 4× odds of dementia (614 brains) — @bostonu (first-party institution)
Post: https://www.instagram.com/p/DUJvZ92EpoE/ · Lane B · Posted 2026-01-30
1. **WHAT IT IS** — Boston University graphic: people with advanced CTE have four times higher odds of dementia than those without, from examination of 614 brains from donors exposed to repetitive head impacts (primarily contact-sport athletes). Published in Alzheimer's & Dementia; supports recognizing CTE as a cause of dementia, countering "CTE has no clinical symptoms" claims.
2. **WHERE TO FIND IT** — Post URL above; origin: BU CTE Center, Alzheimer's & Dementia paper.
3. **HOW TO USE IT** — The clinical-consequence anchor: CTE is not just a pathology finding — advanced stage carries a quantified dementia odds ratio (4×). Use with IG1-22's staging: stage → odds is the risk chain.
4. **WHICH SYSTEM IT PLUGS INTO** — GSI medical lane (CTE → dementia outcome modelling).
5. **CREATIVE ANGLES** — The 4× figure recurs in IG1-21's cluster (neurodegenerative-death risk) — a convergent number from two BU analyses; worth tracking as one sourced claim, not two independent ones.
6. **RISKS/UNVERIFIED** — Donor brains again (selection); odds ratio as-presented by the institution. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Confirm in the Alzheimer's & Dementia paper (effect size, adjustment set). **Verdict: LEARN-ONLY.**
8. **§8 ENGINE-TRAINING VALUE** — One labeled effect size: (advanced CTE, dementia, OR ≈ 4, n=614) — a prior for GSI outcome models. Labels exist (clinical dementia + neuropathology, both collected by BU).

### IG1-24 — Plasma p-tau217 does NOT detect CTE (but rules out Alzheimer's) — @bu_cte (first-party research center)
Post: https://www.instagram.com/p/DbLTpG_kfS-/ · Lane B · Posted 2026-07-24 · Authors: Miner & Alosco
1. **WHAT IT IS** — A 7-slide research carousel on the BU CTE Center's paper: plasma p-tau217 evaluated as a blood biomarker for CTE and AD in 177 former football players vs 54 unexposed controls, against PET imaging, CSF biomarkers, and postmortem neuropathology. Results: higher baseline p-tau217 in players not significant after amyloid-PET adjustment; NO association with repetitive-head-impact exposure, TES diagnosis, or CTE pathology; strong correlation with amyloid PET, similar performance to CSF for AD pathology; negative p-tau217 reliably rules out AD. Conclusion: p-tau217 is unlikely to detect CTE but may exclude Alzheimer's in RHI-exposed people.
2. **WHERE TO FIND IT** — Post URL above; origin: BU CTE Center paper (Miner, Alosco et al.).
3. **HOW TO USE IT** — A negative-result dossier of high value: do not build a CTE blood test on p-tau217. Its use is differential diagnosis (rule out AD) in former players with cognitive symptoms.
4. **WHICH SYSTEM IT PLUGS INTO** — GSI medical lane (biomarker evaluation; differential diagnosis TES vs AD).
5. **CREATIVE ANGLES** — Pairs with IG1-28 (acute concussion biomarkers GFAP/UCH-L1/NfL): chronic-CTE detection and acute-concussion detection are different biomarker problems with different markers — the wave contains both, and conflating them is the common error.
6. **RISKS/UNVERIFIED** — Single study; null result could reflect assay/cohort limits. All as-presented by the center itself. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Read the paper's methods (PET/CSF/neuropathology ground truth is strong). **Verdict: LEARN-ONLY** (negative result, high value).
8. **§8 ENGINE-TRAINING VALUE** — A labeled biomarker dataset description: (177 players + 54 controls, plasma p-tau217, amyloid PET, CSF, neuropathology) with a null association for CTE — training/eval data for biomarker models, including an honest negative label set. Labels exist (neuropathology + PET).

### IG1-25 — Guardian Cap evidence review: lab yes, field no — @theneuroguy_dpt (clinician, first-party)
Post: https://www.instagram.com/p/DdW_l9UD8fS/ · Lane B · Posted 2026-09-16
1. **WHAT IT IS** — A 7-slide evidence review by Dr. Chris McElderry (neurologic clinical specialist): Guardian Cap NXT lab testing shows modest reductions (peak linear acceleration −7.9%, rotational −14.1%, modeled concussion risk −34.1%); the NFL's observational study reported 54–62% fewer practice concussions after the mandate, but the benefit disappeared for impacts to the padded shell itself; a 2025 college field study of 7,509 instrumented-mouthguard impacts found no significant reduction in impact magnitude or frequency. Five-study summary table: lab benefits vs consistent on-field nulls. Conclusion: behavior/culture (limit contact, safer tackling, helmet fit, immediate removal, no rushed return) over equipment.
2. **WHERE TO FIND IT** — Post URL above; underlying studies: Guardian lab tests, NFL surveillance, 2025 college mouthguard study (7,509 impacts).
3. **HOW TO USE IT** — The wave's most complete Guardian Cap dossier: keep lab and field evidence in separate columns. The 7,509-impact field study is the strongest design (instrumented, in-vivo).
4. **WHICH SYSTEM IT PLUGS INTO** — GSI medical lane (equipment efficacy) + GSE situational layer (practice-contact exposure as an injury-risk input).
5. **CREATIVE ANGLES** — The NXT (NFL) vs XT (retail) model distinction raised by commenters (recorded, not analyzed) is a real confound: field studies may test a different cap than the lab did.
6. **RISKS/UNVERIFIED** — Clinician's synthesis, not a meta-analysis; study citations not linked in the summary. Figures as-presented. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Locate the 2025 college mouthguard study and confirm the null. **Verdict: LEARN-ONLY** (top equipment-evidence item in the wave).
8. **§8 ENGINE-TRAINING VALUE** — Effect-size table: (device, setting lab/field, linear/rotational accel change, concussion change, n impacts) — labeled equipment-efficacy data. Labels exist (mouthguard kinematics + diagnosed concussions in the underlying studies).

### IG1-26 — The case AGAINST Guardian Caps: Virginia Tech lab vs Stanford field — @frankmichaelsmith (creator-investigator)
Post: https://www.instagram.com/reel/DduXFwGTJb4/ · Lane B · Posted 2026-09-25 · 45K likes
1. **WHAT IT IS** — An investigative video arguing there is no hard proof Guardian Caps work: 25 NFL players wear them in games; a Virginia Tech lab test showed reduced impact force, but a Stanford field study using mouthguard sensors over two seasons found benefits disappeared; a second preseason study concluded caps "do not alter or reduce" head-kinematics data; the NFL's own six-year surveillance (practice concussions down >50% after the mandate) lost significance when researchers isolated helmet-to-helmet impacts. Rugby comparison: 25 years of padded-headgear studies, zero concussion reduction, yet ~40% of college players believe soft headgear protects them (false security). Conclusion: tackling technique matters more than padding.
2. **WHERE TO FIND IT** — Post URL above; underlying: Virginia Tech Helmet Lab, Stanford mouthguard studies, NFL surveillance data.
3. **HOW TO USE IT** — The adversarial counterpart to IG1-25: same literature, sharper conclusion. Together they bound the claim: caps reduce some lab kinematics; no field study shows concussion reduction.
4. **WHICH SYSTEM IT PLUGS INTO** — GSI medical lane (equipment efficacy; risk-compensation / false-security as a behavioral factor).
5. **CREATIVE ANGLES** — The rugby 25-year null + 40% belief figure is the risk-compensation specimen: protective belief without protective effect can raise exposure. The same logic applies to any GSE "safety" feature claim.
6. **RISKS/UNVERIFIED** — Advocacy framing ("no hard proof") by a creator, not a clinician; study details (Stanford seasons, n) as-presented. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Cross-check the Stanford and NFL-surveillance claims against IG1-25's review (they agree on the field null). **Verdict: LEARN-ONLY.**
8. **§8 ENGINE-TRAINING VALUE** — Same labeled effect-size structure as IG1-25 (device × setting × outcome) from an independent presenter — a second labeling of the same literature, useful for claim-verification training. Labels live in the underlying studies.

### IG1-27 — Nico Collins concussion biomechanics: 8.3 m/s helmet-to-turf, rotational shear — @medspired (physician, first-party)
Post: https://www.instagram.com/reel/DTcTmBeim1l/ · Lane B · Posted 2026-01-13
1. **WHAT IT IS** — Dr. Nav Badesha (MEDspiration) dissects Texans WR Nico Collins's concussion vs Pittsburgh: Collins extends for a catch, knee hits frozen turf first, helmet then strikes at an oblique angle; the knee impact redirects momentum, increasing fall angle and velocity; NFL video data puts helmet-to-turf impacts ~8.3 m/s (18.6 mph); the combined vertical-horizontal force vector stops the skull while the brain continues, generating rotational acceleration (the primary concussion mechanism), then rebound reverses rotation, shearing axons (visual/vestibular pathways); hands-to-helmet posture = post-concussive sensory overload. Collins's second concussion of the season; typical return 7–21 days, likely multiple games missed.
2. **WHERE TO FIND IT** — Post URL above; play: Texans vs Steelers (Collins injury).
3. **HOW TO USE IT** — A mechanism-level injury breakdown: the transferable model is (impact surface, velocity, angle, rotational acceleration, rebound) → injury. Frozen-turf hardness is a situational variable (weather/venue → impact severity).
4. **WHICH SYSTEM IT PLUGS INTO** — GSI biomechanics lane (impact mechanism taxonomy) + GSE situational layer (cold-weather turf as an injury-risk modifier) + availability forecasting (7–21-day return window).
5. **CREATIVE ANGLES** — Turf condition × temperature is a measurable situational feature: frozen natural grass vs dome turf changes head-impact severity for the same fall — a venue/weather feature the engine can actually build.
6. **RISKS/UNVERIFIED** — Single-case clinical commentary; 8.3 m/s cited as "NFL video data" without a linked source. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Cross-check helmet-to-ground impact speeds against published NFL injury-data papers. **Verdict: LEARN-ONLY.**
8. **§8 ENGINE-TRAINING VALUE** — One richly labeled injury episode: (player, mechanism, impact velocity, surface, rotation direction, prior concussions, expected absence) — a template row for an injury-mechanism dataset. Labels exist (diagnosed concussion + games missed, both public).

### IG1-28 — CARE Consortium: blood biomarkers after concussion — no single marker catches all (n=521) — @andrewjagim (researcher, recreator of Croghan et al.)
Post: https://www.instagram.com/p/DaVPF9Rx68h/ · Lane B · Posted 2026-07-03
1. **WHAT IT IS** — An infographic of Croghan et al. (Sports Medicine, 2026), a CARE Consortium study using Reliable Change Indices (RCI) for individual-level biomarker change: 521 collegiate athletes (323 concussed, 198 controls); blood at baseline and 0–12, 12–36, 36–60 hours post-injury; plasma GFAP, UCH-L1, Tau, NfL, p-tau181 + serum CRP, IL-6, IL-8, IL-10, IL-1RA, TNF, VEGF. Findings: elevations (RCI > 1.65) most common early (0–12h): GFAP 16%, IL-1RA 16.4%, IL-6 15.9%, others ≤10%; NO elevation in 37% (0–12h), 45% (12–36h), 63% (36–60h) of concussed athletes; decreases more common late (p-tau181 21.2%, NfL 18.6% at 36–60h); LOC/post-traumatic amnesia associated with higher GFAP elevation at 12–36h (45% vs 15%, p=0.004). Takeaway: elevations are early, in subsets, in single markers — no single biomarker reliably identifies all concussions; multi-dimensional assessment required.
2. **WHERE TO FIND IT** — Post URL above; origin: Croghan et al., Sports Med 2026; CARE Consortium (NCAA–DoD).
3. **HOW TO USE IT** — The quantitative case against single-marker sideline tests: sensitivity ceilings per marker per time window, with RCI (individual baseline change) rather than group cutoffs as the method.
4. **WHICH SYSTEM IT PLUGS INTO** — GSI medical lane (acute concussion diagnostics; biomarker panel design).
5. **CREATIVE ANGLES** — The RCI method (each athlete vs their own baseline) is a general pattern: individual baselines beat population cutoffs — the same argument GSE makes for player baselines. CARE's preseason-baseline design is the template.
6. **RISKS/UNVERIFIED** — Collegiate athletes, not NFL; percentages as-presented in an infographic. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Read Croghan et al. for the full marker × window table. **Verdict: LEARN-ONLY** (top acute-biomarker item in the wave).
8. **§8 ENGINE-TRAINING VALUE** — A full labeled matrix: (marker, time window, % elevated, % decreased, n=323/198, LOC/PTA subgroup effect) — direct training/eval data for a diagnostic-panel model. Labels exist (clinically diagnosed concussion + baselines, CARE Consortium).

### IG1-29 — The FDA-cleared GFAP + UCH-L1 blood test: concussion answer without a CT — @drlewisclarke (clinician-educator)
Post: https://www.instagram.com/reel/DbrHFyJjBkp/ · Lane B · Posted 2026-08-05
1. **WHAT IT IS** — A blood test measuring GFAP and UCH-L1 (proteins leaking into blood when brain cells are damaged) can confirm/rule out brain injury within hours, with accuracy comparable to CT for deciding who needs a scan — without radiation or waiting. Newer research aims to predict which patients develop lasting symptoms, enabling earlier targeted treatment.
2. **WHERE TO FIND IT** — Post URL above; origin: FDA-cleared GFAP/UCH-L1 tests (Banyan BrainScope/Brain Trauma Indicator lineage; Abbott i-STAT TBI — see inventoried DPwn0PNDkht for device-level detail: GFAP 77 pg/mL vs cutoff 65, UCH-L1 600 vs 360, ~15-min result).
3. **HOW TO USE IT** — The clinical-use case, plainly: the test's validated job is CT triage (rule out intracranial injury), not "diagnosing concussion" — a distinction IG1-28's data reinforces.
4. **WHICH SYSTEM IT PLUGS INTO** — GSI medical lane (acute diagnostics; ED/sideline triage).
5. **CREATIVE ANGLES** — "Ask the ER if they offer blood biomarker testing" is a Family Shield-usable consumer action — one of the few directly actionable items in Lane B.
6. **RISKS/UNVERIFIED** — "Same accuracy as a CT scan" overstates: the test is cleared to aid CT decisions, not replace imaging or diagnose concussion. Creator promotes a comment-gated labs guide (not engaged). Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Confirm intended-use wording on the FDA clearance. **Verdict: LEARN-ONLY** (with the overstatement flagged).
8. **§8 ENGINE-TRAINING VALUE** — Cutoff values: (GFAP 65 pg/mL, UCH-L1 360 pg/mL, window hours, intended use) — labeled decision thresholds for a triage model. Labels exist (CT findings in the clearance studies).

### IG1-30 — Inside the blue tent: the NFL concussion protocol, step by step — @theathletichq (first-party journalism)
Post: https://www.instagram.com/reel/DdbR_D5FOLT/ · Lane B · Posted 2026-09-18
1. **WHAT IT IS** — The Athletic explains what happens after a player enters the blue tent: three independent groups monitor every game — an unaffiliated neurotrauma consultant (UNC) on the sideline and in the booth who can stop play, plus team medical staff; the team physician makes the final return-to-play decision; "no-go" symptoms (loss of consciousness, fencing posture, ataxia, dysfunctional speech, confusion, amnesia) rule a player out immediately; otherwise the player is assessed in the tent by team physician + athletic trainer + sideline UNC with standardized questions/tests. Footage: Kyler Murray, Josh Allen, others.
2. **WHERE TO FIND IT** — Post URL above; origin: NFL–NFLPA concussion protocol (public document).
3. **HOW TO USE IT** — The protocol map for interpreting every in-game concussion event: who decides, what auto-removes a player, and why "cleared" and "ruled out" happen at different speeds.
4. **WHICH SYSTEM IT PLUGS INTO** — GSI medical lane (protocol/in-game decision process) + GSE availability layer (in-game exit → absence probability).
5. **CREATIVE ANGLES** — The no-go list is a observable-feature set: fencing posture and ataxia are visible on broadcast — in principle, a computer-vision label set (Family Shield/Hermes vision lane), with the fencing examples in IG1-31.
6. **RISKS/UNVERIFIED** — Journalistic summary of the protocol; the protocol document itself is the citable source. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Diff against the current NFL protocol PDF. **Verdict: LEARN-ONLY.**
8. **§8 ENGINE-TRAINING VALUE** — A labeled decision tree: (observed sign → actor → decision) with the no-go signs as binary labels — the structure for any protocol-modelling or vision-labelling work. Labels exist (game-day protocol outcomes are reported).

### IG1-31 — Tua's hits, clinically read: ataxia, fencing/posturing, rotation without head contact — @muhealth (institution, clinician-narrated)
Post: https://www.instagram.com/reel/Dcggi2Lofvn/ · Lane B · Posted 2026-08-26
1. **WHAT IT IS** — MU Health Care's brain-injury expert reacts to Tua Tagovailoa hits: (1) unsteady walking labeled "ataxic" (loss of voluntary muscle coordination) — a transient neurologic event with unstable gait/balance; (2) arms-extended posturing on the ground = "almost a fencing" response, suggesting global brain dysfunction; (3) a front-and-back (Saints) hit with NO direct head contact that can still injure via rotational forces.
2. **WHERE TO FIND IT** — Post URL above; game footage: Dolphins (Tagovailoa injury plays, incl. the 2022 Cincinnati fencing play).
3. **HOW TO USE IT** — A clinical vocabulary for visible concussion signs: ataxia, fencing/tonic posturing, and the rotation-without-contact mechanism — the three signs a spotter (human or vision system) actually sees.
4. **WHICH SYSTEM IT PLUGS INTO** — GSI medical lane (visible-sign taxonomy) + the blue-tent no-go list (IG1-30, where fencing/ataxia are automatic removals).
5. **CREATIVE ANGLES** — Clip (3) is the counterintuitive one: no head contact ≠ no brain injury. Any impact-counting feature that only counts helmet contact misses rotational cases.
6. **RISKS/UNVERIFIED** — Retrospective video diagnosis by one clinician; not the treating physician's assessment. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — None; use as taxonomy. **Verdict: LEARN-ONLY.**
8. **§8 ENGINE-TRAINING VALUE** — Three labeled video episodes: (clip, visible sign, clinical label, mechanism) — gold-standard-style labels for a visible-sign dataset. Labels exist (the clinician's own annotations + confirmed concussion outcomes).

### IG1-32 — Youth hits are NOT softer: 20.6 g average, same as college — @concussionandcte (foundation; origin: 2023 helmet-sensor meta-study)
Post: https://www.instagram.com/reel/DIPqwQdO98p/ · Lane B · Posted 2025-04-09
1. **WHAT IT IS** — Nowinski answers "is youth tackle safer because kids hit softer?" with a 2023 helmet-sensor study (first author cited as Daneshvar/Shaver in the summary) aggregating 30+ prior studies: average linear acceleration 20.6 g for youth players — identical to the college average. Mechanism: smaller necks + proportionally heavy helmets → comparable head whiplash. Cumulative-exposure models show equal risk per year across youth/HS/college/NFL; a case of an 18-year-old with stage-2 CTE is cited.
2. **WHERE TO FIND IT** — Post URL above; origin: 2023 helmet-sensor aggregation study (30+ studies).
3. **HOW TO USE IT** — Kills the "lighter kids = lighter impacts" assumption with a measured number: impact magnitude does not scale down with age; exposure years are what accumulate.
4. **WHICH SYSTEM IT PLUGS INTO** — GSI medical lane (youth exposure modelling) + GSE career-exposure features (age of first exposure, years played).
5. **CREATIVE ANGLES** — The physics (head mass fraction + neck strength) explains WHY the number is flat — a mechanism, not just a statistic; mechanisms transfer, statistics alone don't.
6. **RISKS/UNVERIFIED** — Study identification is fuzzy in the summary (author name garbled); 20.6 g figure as-presented by an advocacy account. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Resolve the 2023 study (helmet-sensor meta-analysis) and confirm 20.6 g for both groups. **Verdict: LEARN-ONLY** (pending citation resolution).
8. **§8 ENGINE-TRAINING VALUE** — One labeled comparison: (level youth/college, mean linear acceleration 20.6 g, n=30+ studies) — exposure-model input. Labels exist (sensor-measured impacts in the underlying studies).

### IG1-33 — Delay tackle to high school, fix practice (70% of hits happen there) — @pablotorrefindsout (journalism; guest: Nowinski)
Post: https://www.instagram.com/reel/DeKyFsSy-Gd/ · Lane B · Posted 2026-10-06
1. **WHAT IT IS** — A PTFO conversation on reducing CTE risk without ending football: (1) delay tackle football until high school — most players start ~age 5, so this halves exposure years; cites at least 1 in 4 NFL players developing CTE; (2) reinvent practice — studies show ~70% of head hits occur in practice, not games; cites Buddy Teevens's Dartmouth innovations (no live tackling in practice). Claim: few who play only in high school would develop significant CTE.
2. **WHERE TO FIND IT** — Post URL above; origin: Concussion & CTE Foundation research + Dartmouth/Teevens practice reforms.
3. **HOW TO USE IT** — The two highest-leverage exposure interventions, quantified: start-age (exposure years) and practice share (70%). Both are features, not opinions: years of tackle before HS, and practice-contact policy.
4. **WHICH SYSTEM IT PLUGS INTO** — GSI medical lane (exposure reduction) + GSE situational layer (practice structure as a team-level variable — the Ivy League/Dartmouth model is observable).
5. **CREATIVE ANGLES** — The 70%-in-practice figure reframes the problem: games are the minority exposure. Any head-impact model weighted to games alone misses most of the dose.
6. **RISKS/UNVERIFIED** — "Very few HS-only players develop significant CTE" is a projection, not a measured result. 70% figure as-presented. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Verify the practice-share figure against published sensor studies (Ivy League / Dartmouth). **Verdict: LEARN-ONLY.**
8. **§8 ENGINE-TRAINING VALUE** — Two labeled exposure parameters: (tackle start age → exposure years; practice share of total impacts ≈70%) — dose-model inputs. Labels exist in the underlying sensor literature.

### IG1-34 — Virginia Tech STAR: the 5 safest youth helmets, scored — @sidelinedevon (creator; origin: Virginia Tech Helmet Lab)
Post: https://www.instagram.com/reel/DbRruCPpfPT/ · Lane B · Posted 2026-07-27
1. **WHAT IT IS** — A countdown of Virginia Tech's youth-helmet STAR ratings (43 youth helmets tested; lower STAR score = better): #5 Vicis Zero1 Youth (5 stars, 0.69), #4 Xenith Shadow XR Youth (5 stars, 0.62), #3 LIGHT Apache Tomahawk Youth (0.36, among the lightest), #2 Vicis Zero2 Youth (0.19), #1 LIGHT Apache Lightning Youth (0.14). Creator's caveat: no helmet completely prevents concussions.
2. **WHERE TO FIND IT** — Post URL above; origin: Virginia Tech Helmet Lab ratings (vt.edu/helmet).
3. **HOW TO USE IT** — A ranked, scored equipment table with a public methodology (STAR = Summation of Tests for the Analysis of Risk) — the reference standard for helmet comparison, and the same lab behind the varsity/NFL-relevant ratings.
4. **WHICH SYSTEM IT PLUGS INTO** — GSI medical lane (equipment efficacy — lab side, to be read against IG1-25/26's field nulls for caps).
5. **CREATIVE ANGLES** — The LIGHT helmets (lightweight) topping the list challenges the "more padding = safer" intuition — mass itself is a variable (see IG1-32's youth whiplash mechanism).
6. **RISKS/UNVERIFIED** — Creator's presentation of VT data; scores as-presented. STAR measures lab impact performance, not on-field concussion incidence. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Confirm the five scores on the VT ratings page. **Verdict: LEARN-ONLY.**
8. **§8 ENGINE-TRAINING VALUE** — A labeled ranking: (helmet model, STAR score, stars, n=43 tested) — equipment-feature data. Labels exist (VT lab scores, public).

### IG1-35 — SAFR vs Guardian: 77% claim, VT 52% vs 22% — and why the NFL still can't use it — @tyler.m.webb (creator)
Post: https://www.instagram.com/reel/DeftBJHyJP5/ · Lane B · Posted 2026-10-15
1. **WHAT IT IS** — Why the NFL uses the bulky Guardian Cap instead of the sleeker SAFR cover: SAFR (founded after John Zolinski bought a small helmet maker in 2021) is a thin hard-shell cover with metal hooks/springs; SAFR claims up to 77% concussion-risk reduction, citing Virginia Tech work — the presenter reports VT figures of 52% (SAFR) vs 22% (Guardian) concussion reduction; but NFL game use requires passing the league's own equipment tests, and only Guardian is certified for games.
2. **WHERE TO FIND IT** — Post URL above; origin: SAFR Sports / Virginia Tech Helmet Lab / NFL equipment certification.
3. **HOW TO USE IT** — The certification-gap lesson: a device can lead in independent lab ratings and still be unusable in the NFL because league certification is a separate gate. Track both numbers (lab efficacy, certification status) for any equipment claim.
4. **WHICH SYSTEM IT PLUGS INTO** — GSI medical lane (equipment efficacy + adoption constraints).
5. **CREATIVE ANGLES** — Read against IG1-25/26: the "52% vs 22%" figures are lab-modeled risk reductions — exactly the class of number that field studies (7,509 mouthguard impacts) failed to confirm for Guardian. Apply the same skepticism to SAFR's 77%.
6. **RISKS/UNVERIFIED** — Vendor claims (77%, 52%) relayed by a creator; VT figures as-presented, not confirmed on the VT site in this wave. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Verify SAFR's VT rating and the NFL certification claim. **Verdict: LEARN-ONLY** (claims flagged UNVERIFIED).
8. **§8 ENGINE-TRAINING VALUE** — Claimed effect sizes: (device, claimed risk reduction, lab, certification status) — a claims table, explicitly unverified, for the equipment lane. Labels do NOT yet exist for field outcomes.

### IG1-36 — The flashing mouthguard: sensor triggers a Head Injury Assessment live — @rugbypass (first-party broadcast; origin: World Rugby / Prevent Biometrics)
Post: https://www.instagram.com/reel/DN3ec13UGIf/ · Lane B · Posted 2025-08-27
1. **WHAT IT IS** — From the Women's Rugby World Cup 2025 opener: Samoa's Sinead Ryder's instrumented mouthguard flashes red after an impact above a calibrated threshold; officials announce "blue number six" requires a Head Injury Assessment (HIA); after a 10-minute medical assessment she is cleared and returns. The system: embedded accelerometer in the mouthguard, LED alert, mandatory removal for assessment. In trials since 2021; the flashing LED is the latest iteration.
2. **WHERE TO FIND IT** — Post URL above; origin: World Rugby instrumented-mouthguard program (Prevent Biometrics smart mouthguards).
3. **HOW TO USE IT** — The working deployment of the technology Lane B's field studies (IG1-25) rely on: instrumented mouthguards are not just research tools — rugby uses them as a live removal trigger. The NFL/college studies measure impacts; rugby acts on them in-game.
4. **WHICH SYSTEM IT PLUGS INTO** — GSI medical lane (impact detection → removal protocol) + GSE availability layer (sensor-triggered removals as a new in-game event type).
5. **CREATIVE ANGLES** — Threshold choice is the whole design problem: too sensitive → flow disruption and false positives (the fan complaint in the thread); too lax → missed injuries. Any GSE/GSI use of impact data inherits the same tradeoff.
6. **RISKS/UNVERIFIED** — Rugby, not football (different impact profile); threshold values not stated in the post. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Find World Rugby's published trigger thresholds and HIA outcome rates. **Verdict: LEARN-ONLY.**
8. **§8 ENGINE-TRAINING VALUE** — A labeled deployment episode: (impact above threshold → LED alert → HIA → cleared/returned) — the (sensor event, assessment, outcome) triple a detection system trains on. Labels exist (HIA outcomes are recorded by World Rugby).

### IG1-37 — Hamstring grades 1–3, timed: Williams's wet-turf overstride mechanism — @medspired (physician, first-party)
Post: https://www.instagram.com/reel/Ddh8gVSKtmk/ · Lane B · Posted 2026-09-21
1. **WHAT IT IS** — Dr. Badesha breaks down Caleb Williams's right hamstring injury (rainy game, carted off, could not extend the leg): moving left scanning, left foot loses traction on wet turf, right leg overstrides forward — hip flexion + knee extension + rapid deceleration ("danger zone"), foot lands flat, hamstrings lengthen under eccentric braking load and fail. Grade spectrum: Grade 1 minor fiber damage (~1–2 weeks), Grade 2 partial tear (~3–6 weeks), Grade 3 complete/near-complete tear, possibly musculotendinous junction/tendon (~6–10+ weeks); proximal tendon rupture/avulsion: 4–6+ months. Loss of hip extension needing assistance flags a severe injury.
2. **WHERE TO FIND IT** — Post URL above; game: Bears (Williams injury, wet conditions).
3. **HOW TO USE IT** — The hamstring module for availability forecasting: mechanism (eccentric overstride on a slippery surface) + grade → absence window. Wet turf is again a situational modifier (cf. IG1-27's frozen turf).
4. **WHICH SYSTEM IT PLUGS INTO** — GSI medical lane (soft-tissue injury grading) + GSE availability layer (QB absence windows) + situational layer (weather/surface).
5. **CREATIVE ANGLES** — The severity flag (needs help extending the hip) is observable on broadcast — a visible-severity label, like fencing for concussions (IG1-31).
6. **RISKS/UNVERIFIED** — Remote video assessment; actual grade is the team's medical finding, not the creator's. Timelines are population ranges. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Grade the prediction against Williams's actual games missed. **Verdict: LEARN-ONLY.**
8. **§8 ENGINE-TRAINING VALUE** — A labeled injury row: (player, mechanism, surface/weather, visible severity flag, grade-range → absence-range) — soft-tissue availability training data. Labels exist (games missed is public).

### IG1-38 — Adams's recurring hamstring + Kraft's contact knee blow: mechanism decides prognosis — @fantasydocs (physician, first-party)
Post: https://www.instagram.com/reel/DeqKXerxcG3/ · Lane B · Posted 2026-10-19
1. **WHAT IT IS** — Dr. Nithin Natwa analyzes two injuries with 3D anatomy: (1) Davante Adams — hamstring strain on a long route reaching for the ball; history of recurring hamstring flare-ups in 2025 and a 2024 Jets injury → likely multi-week absence; (2) Tucker Kraft — direct blow to the left knee in slight flexion = a CONTACT injury, distinguished from the more common non-contact ACL mechanism (tibial rotation + valgus collapse).
2. **WHERE TO FIND IT** — Post URL above; games: Rams (Adams), Packers (Kraft).
3. **HOW TO USE IT** — Two prognostic rules: recurrence history raises hamstring absence estimates; contact vs non-contact mechanism changes the knee-injury differential (contusion/bone bruise vs ACL).
4. **WHICH SYSTEM IT PLUGS INTO** — GSI medical lane (injury mechanism taxonomy) + GSE availability layer.
5. **CREATIVE ANGLES** — Mechanism-first triage (contact/non-contact, recurrence count) is a compact feature set: three variables that move an absence estimate more than the headline injury name.
6. **RISKS/UNVERIFIED** — Remote video assessment; timelines are estimates. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Grade against actual absences. **Verdict: LEARN-ONLY.**
8. **§8 ENGINE-TRAINING VALUE** — Two labeled rows: (player, injury, mechanism class, recurrence history, predicted absence) — availability-model training data. Labels exist (games missed).

### IG1-39 — "Strong necks don't prevent concussions" — the meta-analysis, and why he trains necks anyway — @jtperformance__ (S&C coach)
Post: https://www.instagram.com/reel/DVf5VPKjBbj/ · Lane B · Posted 2026-03-05
1. **WHAT IT IS** — A performance coach works through a systematic review ("Evaluation of Neck Strength and Concussion Risk: A Systematic Review," Curr Sports Med Rep 2026) finding little to no effect of neck strength on concussion risk — then explains why he still trains every athlete's neck: stronger necks tolerate impacts better, reduce headaches and chronic pain, and build collision confidence. His standards: neck flexion 25% bodyweight × 10, extension 35% × 10, twice weekly.
2. **WHERE TO FIND IT** — Post URL above; origin: Curr Sports Med Rep 2026 systematic review.
3. **HOW TO USE IT** — The honest version of the neck-strength claim that other posts in this wave oversell (see inventoried theironneck "each pound of neck strength = 5% less concussion likelihood" claim — UNVERIFIED marketing). Use the review's null as the prior; treat neck training as a pain/tolerance intervention unless better evidence arrives.
4. **WHICH SYSTEM IT PLUGS INTO** — GSI medical lane (prevention interventions; claim-verification).
5. **CREATIVE ANGLES** — A creator publishing evidence AGAINST his own practice's headline claim, then justifying the practice on secondary outcomes, is a model of honest claim-handling — the standard GSI dossiers should hold vendors to.
6. **RISKS/UNVERIFIED** — One systematic review as cited by a coach; review's inclusion criteria not examined. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Read the Curr Sports Med Rep review directly. **Verdict: LEARN-ONLY** (null result, high value).
8. **§8 ENGINE-TRAINING VALUE** — A labeled null: (intervention neck strength, outcome concussion risk, effect ≈ none, source systematic review) + quantified training standards (25%/35% BW) as intervention-dose data. Labels exist (the review's pooled studies).

### IG1-40 — REPIMPACT: one season of teen soccer heading — no measurable brain change (yet) — @jeremyallandmd (physician, first-party)
Post: https://www.instagram.com/p/Da1HvwbFZ1Q/ · Lane B · Posted 2026-07-15
1. **WHAT IT IS** — Dr. Jeremy Alland (team physician, Chicago Bulls & White Sox) summarizes Koerte et al., JAMA Network Open, June 2026 (REPIMPACT): 129 male teens aged 14–16 tracked one season at academy clubs in Germany/Belgium/Norway — 82 soccer players vs 47 non-contact athletes (swimming/track/cycling); cognition, behavior, balance, MRI structure/function, blood biomarkers, self-reported heading (~939 average headers/player/season). Result: no significant between-group differences in change on any measure; more heading was not linked to worse outcomes. Nuance: soccer players STARTED the season with higher levels of two brain-injury blood markers (within normal range, cause unclear, not tied to heading frequency). Limitations: one season, self-reported heading, males only, cannot rule out multi-year accumulation. Takeaway as stated: "reassuring, not a green light."
2. **WHERE TO FIND IT** — Post URL above; origin: Koerte et al., JAMA Network Open 2026 (REPIMPACT).
3. **HOW TO USE IT** — The best-designed subconcussive study in the wave (prospective, controlled, multi-modal) with an honest null for ONE season — the correct counterweight to the cross-sectional heading findings (inventoried Columbia 352-player study: >1,000 headers/yr → orbitofrontal changes + memory decline).
4. **WHICH SYSTEM IT PLUGS INTO** — GSI medical lane (subconcussive dose-response; study-design quality grading).
5. **CREATIVE ANGLES** — The preseason biomarker elevation in soccer players is the loose thread: if heading doesn't explain it, prior seasons might — exactly the accumulation question the one-season design cannot answer. A model of how to report a null without overclaiming in either direction.
6. **RISKS/UNVERIFIED** — One season; teens; self-reported exposure. The null is bounded, and the post says so. Content-summary evidence only.
7. **FIRST TEST + VERDICT** — Read Koerte et al. in full; track for multi-season follow-ups. **Verdict: LEARN-ONLY** (top study-design item in Lane B).
8. **§8 ENGINE-TRAINING VALUE** — A labeled prospective dataset description: (n=129, exposure ~939 headers/season, MRI + biomarkers + cognition, null change) — dose-response training data with a true negative. Labels exist (the study's own measures; data via the REPIMPACT investigators).

## INVENTORIED-ONLY (counted, not dossiered)

- `DYXuDdlldUo` · @1067thefan · Lane A — Radio: net rest differential rankings — WAS +15, BUF +14, DAL +11; PHI/LAC -15
- `Da-vuV0Btpu` · @4thand1 · Lane A — Cam Newton teaches play-call anatomy: protection, kill, Cover 0 adjustments
- `DUeTGaNkxav` · @amazon · Lane A — Amazon: NGS infrastructure — chips 10x/sec, 75 ML models on AWS
- `DO98KLADnwe` · @baldynfl · Lane A — Baldinger: Jags DL stunts/twists vs Stroud, rookie LT targeted, 9th takeaway in 3 games
- `DeKJ5XFoCm3` · @brobible · Lane A — Sharp data: 17 TDs nullified by penalties vs 5 last year; red-zone flags at record 0.61/team/game
- `DeNvd8HFLBt` · @cbssports · Lane A — SportsLine Super Bowl LXI chances, all 32 teams (carousel)
- `DfViU9_gX65` · @cbssports · Lane A — CBS Forecasting Super Bowl LXI chances update, Bills 15.5% top (carousel)
- `DSnjxP9kpxH` · @chase_daniel · Lane A — Chase Daniel breakdown: Williams TD vs Cover Zero, in-and-out concept beats coverage
- `DaVmfU2vCBW` · @chase_daniel · Lane A — Chase Daniel: Bo Nix falling-backward throw under pressure vs two-high
- `Dce605svZ_G` · @chase_daniel · Lane A — Chase Daniel: Williams vs single-high replacement pressure — timing critique
- `DfAPH6KgRDs` · @chase_daniel · Lane A — Chase Daniel: Williams 3rd-and-11 pocket reset under zone pressure
- `DevN4SwoJdV` · @chibearsdfa · Lane A — Sharp drop-rate table: Packers 8.4% drops vs Bears 1.9%
- `DYFjPE1EWgR` · @chsn · Lane A — Sharp data: Bears -795 net penalty yards since 2022 ('Bears Tax')
- `Dcy2Svsy-Id` · @connor.burns3 · Lane A — Creator reacts to Sharp's Bears Tax tweet thread, 4-year pattern
- `DF50ESZyAtO` · @emmyxtech · Lane A — Software engineer explains NGS RFID chips, speed/acceleration/pressure metrics
- `DanpDbcgxMi` · @espn · Lane A — Burrow's full play-call verbiage transcribed — QB memory-load specimen
- `DR22yNNk_su` · @ethan_akira_ · Lane A — Monte Carlo + Poisson Lions-Cowboys preview, 77% win probability
- `DSD7kZijfJR` · @film.watchers1 · Lane A — Film Watchers: Packers pick up 7-man blitz, Love TD — protection study
- `DUwMhdDCYd_` · @greenlightpod · Lane A — Green Light pod: analytics vs intangibles in playoff 4th-down decisions
- `DeNLDQNHdX8` · @gridiron.hardwoodpod · Lane A — Red-zone play-calling comedy critique — low data content, context only
- `DfSh_GzDQkn` · @inplaylive · Lane A — Podcast: why teams go for it on 4th down — 7 vs 3 point expectation argument
- `DPPyqIuD87R` · @lindsayrhodesnfl · Lane A — Rhodes walks SumerSports Total EPA QB leaderboard to justify Flacco benching
- `DEkjPeCOREK` · @mattbowen41 · Lane A — Bowen teaching tape: Goff pocket movement vs 7-man pressure, protection rules
- `DDNulKRyVKG` · @nfl · Lane A — NGS Top 5 fastest Week 13 (2024): James Cook 21.85 mph in snow top
- `DPJ5aEhjGmw` · @nfl · Lane A — NGS: Payton Wilson game-saving tackle at ~22.48 mph
- `DT_ft89kljp` · @nfl · Lane A — NFL Films: Redzone HB Scissors play design (Kubiak/JSN) added to Madden playbook
- `DYID3fyBuvj` · @nfl · Lane A — Williams tests Soldier Field wind with a water bottle, then throws a 30-yd TD
- `DYu-tYyyTQ5` · @nfl · Lane A — NFL: fan catches a ball that contains a tracking chip — Romo explains ball retrieval
- `DdcAt9vFRF4` · @nfl · Lane A — NFL Films: Ben Johnson recounts 2015 Dolphins analytics study on 4th downs; Philly Special as payoff
- `DePcY3LhUTb` · @nfl · Lane A — NGS: Bijan Robinson 21.78 mph, 2nd-fastest ball-carrier speed of the season
- `DOr4LsFjvBo` · @nfloncbs · Lane A — NGS: Jonathan Taylor 22.38 mph, fastest ball-carrier speed since 2020
- `DdZkkCJF4kN` · @nfloncbs · Lane A — SportsLine model division-win probabilities for all 8 divisions (carousel)
- `DdrnN4KDKnI` · @nfloncbs · Lane A — SportsLine Super Bowl chances, Seahawks 16.1% top, Week 2 (carousel)
- `DeQvyp8ud4y` · @nfloncbs · Lane A — Analyst critiques Bowles's 4th-down and 2-point decisions vs Cowboys (0-for-2)
- `DP2VbV6ErSF` · @nflonfox · Lane A — NGS Fastest Ball Carriers Week 6: JSN 21.11 mph top
- `DPALw5xEoFM` · @nflonfox · Lane A — NGS Fastest Ball Carriers Week 3: Brian Thomas Jr. 22.13 mph top
- `DeSbiGSML_m` · @omar · Lane A — Hot take: extreme-weather games distort skill — wind kills passing/kicking accuracy
- `DYXycF6kQ0J` · @panthersbran · Lane A — Panthers schedule edge: +8.5 net rest (5th), fewest travel miles 8,740 (32nd)
- `DT9EAwhEX3z` · @pardonmytake · Lane A — Kurt Warner: weather gives climate-adapted teams undue playoff advantage; dome debate
- `DeaUWiXgmy1` · @predtechai · Lane A — PredTech.ai promo: travel miles, time zones, rest, 4th-quarter road fatigue model
- `DOWw8dzgb3y` · @profootballfocus · Lane A — PFF: Parsons 21% pass-rush win rate vs Sewell over 14 snaps
- `DQ7p8WtgUhp` · @profootballfocus · Lane A — PFF highest-graded QBs by quarter: Darnold Q1/Q2, Stafford Q3/Q4
- `DYPcGNRn15r` · @profootballfocus · Lane A — PFF highest career grades, 2023 draft class offense: Nacua 95.6 top
- `Dc9eIfImWG7` · @profootballfocus · Lane A — PFF 2025 team overall grades, Rams 96.0 top, Raiders 58.7 last
- `DdUNoZGGuJv` · @profootballfocus · Lane A — PFF top-graded edge rushers Week 1: Watt 92.3, Crosby 90.5, Carter 90.3
- `DdtbgNFE6Js` · @profootballfocus · Lane A — PFF highest pass block win rate: Austin Barber 98.5% (min 50 plays)
- `DeKstppk-30` · @profootballfocus · Lane A — PFF highest pass block win rate: Lane Johnson 97.2%
- `Dew537kj41q` · @profootballfocus · Lane A — PFF Super Bowl chances from 10,000 simulations, 49ers 15.9% top
- `DfSjzL4j4t2` · @profootballfocus · Lane A — PFF highest pass-rush grade among DI, Week 8: B.J. Hill 91.2
- `DcXldPYJFUx` · @radell_t_lewis · Lane A — EPA per pass play split by targets vs scrambles, 2023 Weeks 1-12 charts
- `DJ4c2qLJJ8B` · @raideralexofficial · Lane A — Sharp: Raiders worst rest disparity 2025 (-19 days, 1 edge game, 6 disadvantage games)
- `Debi1EhCMQV` · @ricardoalonso.football · Lane A — Football data-analysis tools carousel (soccer-leaning; Python/R/SQL/Power BI) — marginal A
- `DW9Ny7xFko2` · @sharpfbanalysis · Lane A — Sharp draft profile: Omar Cooper 39% missed-tackle rate, 19% TD/catch
- `DePbAlxFXWz` · @sportsgridtv · Lane A — SportsGrid on Sharp's penalty-surge data, 'not sustainable' take
- `DfXV3S2Axc9` · @sportsquantified · Lane A — EPA explainer with QB EPA leaderboard (Allen +60, Goff +53.3, Purdy +52.9)
- `DLBGR2XAmg3` · @steelersfans7 · Lane A — Sharp stats on Jaylen Warren: 5+ yds/touch 3 straight seasons, #2 explosive run rate
- `DRAqrBFDkUt` · @sumersports · Lane A — SumerScore midseason All-Pro QB: Herbert #1 in trust/workload/overall
- `DdU5FwZmkIW` · @tfc.gb · Lane A — Packers Week 1: lowest ESPN pass block win rate (9%) and lowest PFF pass-block grade
- `DDKfh_ByuXf` · @the33rdteam · Lane A — 33rd Team: WR separation leaders when targeted 2024 via NGS — Mims 4.9 yds top
- `DDux9pWSxy4` · @the33rdteam · Lane A — 33rd Team: Bucs OL elite pass pro — 127 pressures, 24.1% pressure rate, per-starter rates
- `DYc2z0Sj9nL` · @theoffsznbrand · Lane A — Bears +15 net rest (2nd-highest since 2002), 3rd-fewest travel miles
- `DbGk3B_Fah6` · @thevolumefootball · Lane A — EPA per dropback as the baseline QB stat; scramble production argument
- `DSP4YWojJmU` · @tifo.sports · Lane A — EPA as the NFL equivalent of soccer xG — animated explainer, 1980s origins
- `Dbnx0uXADyK` · @turrondavenport · Lane A — Titans coach presser: situational football (early/3rd down, red zone, 2-minute) + analytics staffer 'Benny' percentages
- `DPwn0PNDkht` · @acedurrani · Lane B — ER physician demos Abbott i-STAT TBI: GFAP 77 (cutoff 65), UCH-L1 600 (cutoff 360), ~15 min
- `DfFY62nvO0n` · @agewellwithdrsteph · Lane B — Doctor unpacks JAMA ~75% CTE estimate vs older 90%+ donor studies; selection-bias correction explained
- `DeI5OVOD-Mp` · @alanpearcephd · Lane B — Pearce: 2016 Stirling TMS study — first to show subconcussive heading acutely alters the brain; led to youth heading bans
- `DfAuDi7uq1r` · @bcope51 · Lane B — Medrick Burnett Jr. died after a kickoff TBI (2024); NCAA kept the old kickoff — advocacy
- `DdmfWWTFr6w` · @bernhelmets · Lane B — Bern DVRT: woodpecker-inspired 4-layer diversion pad, 14 yrs Simon Fraser research
- `DV1ZyAcEfSN` · @beyondconcussion · Lane B — Blood & saliva biomarker overview: GFAP, UCH-L1, Tau, NfL, S100B + saliva microRNAs
- `DU_Z2VfElS1` · @bostonuniversitygms · Lane B — BU GMS profile: UNITE Brain Bank program manager; age-of-first-exposure capstone, J. Neurotrauma
- `DLS0BuKx7fw` · @bu_cte · Lane B — BU CTE Center BANK CTE study recruitment flyer (remote, 40+, brain-donation pledge)
- `Dce-26yFH0A` · @cbschicago · Lane B — CBS Chicago Health Watch on BMJ study: >60% of symptomatic players confirmed at autopsy; risk up with career length
- `DKCo6q_Nttx` · @christophernowinski · Lane B — Nowinski: CTE risk range 10-90% for pros; starting at age 5 vs 14 up to 10x risk; >1 in 4 HS players in one study
- `DY4pnxmk_-r` · @completeconcussions · Lane B — Complete Concussions: blood tests can't reliably diagnose concussion — limits (false positives, timing, standardization)
- `DG8pslKO8ut` · @concussionandcte · Lane B — Ex-NFL FB Shane Bannon: started tackle at 15, still made NFL — #TackleCanWait, flag under 14
- `DMx-sbcxDo3` · @concussionandcte · Lane B — Nowinski: ~2M youth players, a billion head impacts; HS study 31% CTE in 45 players; +15-30% odds per year played
- `DNVi44OONSA` · @concussionandcte · Lane B — Foundation montage of very young kids in full-contact tackle — early-exposure critique
- `DRc_5afjvZe` · @concussionandcte · Lane B — BANK CTE study: first participant (Chip Collins) dies, stage-4 CTE confirmed; blood validation cohort
- `DcezRisv2wx` · @doc_amen · Lane B — Amen: BMJ 1-in-4 CTE + SPECT imaging claims and 80% improvement claim — clinic marketing, UNVERIFIED treatment claims
- `DePNQYaDgDI` · @docbottsny · Lane B — Sports med doctor: how RTP clearance is decided — exam, ocular, balance, reaction time, biomarkers
- `DC4Wr2TMEFf` · @dr.sheg · Lane B — Heading risks infographic: frontal white-matter changes tied to poorer verbal learning
- `Db_EbHsIm1C` · @dr_nisha_vajpeyi · Lane B — Infographic: GFAP + UCH-L1 test in TBI — cutoffs, 12-24h window, CT-decision adjunct only
- `DfHfqbDxXAJ` · @drjaynemorgan · Lane B — FOX5 segment: 75% CTE estimate (2008-2023), tau buildup explained by Dr. Jayne Morgan
- `DNDm4OtuQ5N` · @drjeffyoo · Lane B — ER physician: 4-step concussion recovery carousel (Parachute Canada based), red flags list
- `DGV_U2uPXvp` · @drrichardjbrown · Lane B — How helmets actually work: crushable foam absorbs energy — the un-cracked helmet is NOT safest
- `DO3lfXLiUMW` · @from_quarks_to_quasars · Lane B — Columbia study: 352 amateurs, >1,000 headers/yr → orbitofrontal gray-white blurring + memory decline
- `DMO1G_2MtCf` · @jaredv68 · Lane B — Veldheer neck-strength routine (physio-ball bridges, banded walkouts, iron neck) — 'seatbelt for the brain' framing
- `DWL-mNpkbmD` · @jaredv68 · Lane B — Ex-NFL OL Veldheer: BU CTE 345/376, Guardian caps cut practice concussions >50%, helmets 20-30% better
- `DchqS3GN5dG` · @joelbervell · Lane B — Physician explains BMJ CTE study + NFL race-norming in concussion settlement until 2021
- `DU9WD2-gcAF` · @justin.zimmer61 · Lane B — Ex-NFL DL Zimmer: 4-position isometric neck protocol, 30-sec holds, no gym needed
- `De790-bu2z9` · @kamm.joseph · Lane B — Player's top-3 safety products: fitted shoulder pads, mouthguard, Guardian Cap
- `DbfjOJTCABH` · @mipsprotection · Lane B — MIPS low-friction layer: redirects rotational motion on oblique impact (helmet tech explainer)
- `DUWEOkrEecc` · @nesn · Lane B — NESN: dynamic kickoff results — returns 32% to 75%, injuries/concussions down (Jeff Miller interview)
- `DekzTPvkVGg` · @nfl_interesting_archives · Lane B — History of kickoff rule changes 2011-2024 and the XFL-derived dynamic kickoff
- `De2NTXVj3Bl` · @nflrandr · Lane B — New kickoff landing-zone strategy: kicking into the end zone gifts the 35-yard line
- `DeKfciQP3b6` · @pablotorrefindsout · Lane B — PTFO: NFL players 4x neurodegenerative-death risk — no other exposure reaches 4x
- `DfE__mZt86C` · @realonesknow__ · Lane B — News segment on JAMA CTE estimate: ~3 in 4 dead NFL players (2008-2023); 27.2% had dementia in life
- `DbewaUXx30a` · @richardlehmanmd · Lane B — Physician: modern concussion management — no dark-room rest, staged return, 3 concussions = done
- `DfPxRSChZ_v` · @rubin_allergy · Lane B — Physician on new kickoff: 35% fewer lower-extremity injuries, concussions up (more returns)
- `DbOb4Y5jEOz` · @rugbyontario · Lane B — Rugby Ontario Blue Card + 6-step Graduated Return to Play protocol explainer
- `DOWlq1gCQqK` · @sagesteeleshow · Lane B — Favre recounts Omalu: every 'ding' counts; Omalu advised no tackle until 11th-12th grade
- `DO8F6Z6jzvI` · @science · Lane B — Columbia heading study (352 players) via @science — same study, third presentation
- `DbtqGiNim_L` · @spinalandsportscare · Lane B — Australian guidelines: staged return, 14 symptom-free days and 21-day minimum for community/youth
- `DTkxyWLEe5Y` · @sportingnews · Lane B — Waller theorizes Tua's game hesitation is trauma from head injuries — teammate opinion, NOT medical, flagged
- `DXaf24Djuoy` · @sportsmedanalytics · Lane B — SportsMedAnalytics: Jordyn Tyson ACL/MCL/PCL history + hamstring — career-shortening risk profile
- `DbyQ4mFjtLo` · @sportsmedanalytics · Lane B — SportsMedAnalytics 2026 injury-update carousel: Nabers, Lamb, Evans (per Garrett ruling: SF 49ers), Egbuka, Barkley, Kittle
- `DdWXQMFjjAQ` · @sportsmedanalytics · Lane B — SportsMedAnalytics Week 2 updates: Flowers hamstring re-injury risk, Nabers 2x soft-tissue rate post-ACL, Darnold glute tear ~3 wks
- `DfX8VcVywES` · @survival_expert · Lane B — Fencing response / tonic posturing explainer (Power Slap + UFC + football clips) — visible-sign education
- `DRNDip5DUk_` · @tbionelove · Lane B — Same Columbia heading study as infographic: subconcussive accumulation without diagnosed concussions
- `Dd7nsoplD9D` · @theironneck · Lane B — Iron Neck vendor: 'each pound of neck strength = 5% lower concussion likelihood' — UNVERIFIED marketing claim
- `DVsfriMAYuH` · @trainwrightperformance · Lane B — S&C coach: 5 neck exercises; cites Leung/Brown 2024 — neck strength deficits a risk factor in HS rugby
- `DcMYcwQT4qF` · @umichconcussion · Lane B — Michigan Concussion Center (Lorincz): stepwise return-to-play — rest, light cognitive, low-intensity activity, non-contact drills, physician clearance
- `DecS4WSkb5S` · @vt_ael · Lane B — Tour of the Virginia Tech Helmet Lab: ratings vs certification thresholds, 11 sports tested

## EXCLUDED PRE-COUNT (off-scope, not counted, not dupe-skips)
- `DeW4fC7Nvpe` · @theneuralnetworkapp · A — moneyline model board / signal-seller format (excluded class).
- `DR5F-1KD2O6` · @polymarketsports · B — fencing-posture meme about CeeDee Lamb (meme, no medical content).
- `DR3eSi6DMw8` · @fantasyexpert · B — fencing posture framed as 'gang signs' (mockery, excluded).
- `DdezRewKHuc` · @tackles · B — Guardian Cap meme screenshot (no data content).

