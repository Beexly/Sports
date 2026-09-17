# Our Metric Stack — What Garrett's Numbers Are Built On

Plain-language inventory of every number that powers our NFL analytics. Read this to know exactly what "our numbers" means and where its edges are.

*Written 2026-09-17. Computed data only — no mock data, no copied tables.*

---

## 1. The data sources

- **nflverse play-by-play** — the raw material for everything. nflverse is the open-source project that standardizes official NFL play-by-play data (every snap of every game: down, distance, yards gained, who was on the field) into public CSVs. The `epa`, `ep`, `wp`, `air_epa`, `yac_epa` columns ship in the download — they come from the nflfastR Expected Points model (a multinomial logistic regression on down, distance, and field position). We did not re-estimate the model; EPA is taken as published. License: **CC-BY 4.0** (credit "nflverse").
- **FTN charting subset** — a human-charted overlay published through nflverse, used here for exactly one column: `is_interception_worthy` (whether a throw was charted as turnover-worthy, 2025 only). Joined to plays on (game_id, play_id) at 100% coverage. License: **CC-BY-SA 4.0** (credit "FTN Data via nflverse", share-alike).

**What each contributes:** nflverse gives us every play, its situation, and its EPA — that's the foundation. FTN charting gives us one judgment column: which throws should have been intercepted even if they weren't.

---

## 2. The sample

- **2025 full regular season = the base.** 46,452 regular-season plays → **29,239 plays after filters** (17 games per team; 285 games in the file including postseason, which we exclude). This is the entire foundation of every team rating and player projection we publish.
- **2026 Week 1 = role-check only, explicitly labeled small sample.** 2,756 raw plays → **1,673 after filters** (~45–65 plays per team). One game per team. Used to confirm who is where (roster continuity, target/carry shares) — efficiency numbers from Week 1 are **never blended into rates**. It is 100% 2025 / 0% Week 1 for any efficiency measure. Week-1 leaderboards are dominated by single-game blowouts and are flagged as such everywhere.

---

## 3. The filters (exactly)

Every metric passes through the same sieve:

1. **Regular season only** (`season_type == 'REG'`) — postseason weeks 19–22 are in the file but excluded.
2. **Pass and run plays only** — no punts, field goals, or kickoffs in the efficiency sample.
3. **No kneels or spikes** (453 kneels + 82 spikes removed in 2025).
4. **Garbage time excluded:** plays in the 4th quarter where the possession team's win probability is above 0.95 or below 0.05. This removed 11.2% of 2025 plays. **Overtime is kept** — every OT play is high-leverage by construction.
5. **Success = EPA > 0.** This is the nflfastR convention, and we verified it empirically: the nflverse `success` flag matched `epa > 0` on 100% of pass/run plays, zero mismatches.
6. **Dropback = pass attempt OR scramble.** Sacks count as pass attempts (verified in the data), and scrambles count as dropbacks (4for4 convention).
7. **Explosive play = 15+ yards on a dropback, or 10+ yards on a designed rush** (4for4 convention). Other providers use different thresholds (20-yard passes) — don't compare across conventions.

One deliberate exception: **drive stats** are computed on the *unfiltered* regular-season sample, because punts, field goals, and garbage-time drives are real drives. Drive numbers are therefore not directly comparable to the filtered EPA sample.

---

## 4. Every metric family we compute

One row per team per season, all from the same filtered sample:

- **EPA/play** — average Expected Points Added per play. The core efficiency stat: how many points each play was worth versus expectation. Split into **per dropback** and **per designed rush**, and mirrored on **defense** (computed on opponent plays, sign flipped so positive = good defense).
- **Success rate** — share of plays with EPA > 0. Steadier than EPA; the "do you consistently move the chains" stat. Also computed for defenses (success rate allowed).
- **Explosive-play rate** — share of dropbacks gaining 15+ yards or designed rushes gaining 10+ yards, generated and allowed.
- **EPA distributions** — per team, the median, 10th/25th/75th/90th percentiles, share of negative-EPA plays, and share of chunk plays (EPA > 1.0), for offense and defense, overall and by dropback/rush. Tells you whether a team is consistent or boom-and-bust, not just its average.
- **League percentiles** — every metric ranked 0–100 across the 32 teams; **100 = best, 0 = worst**. Lower-is-better metrics (sack rate allowed, INT rate, success rate allowed, etc.) are inverted so 100 is always the good end.
- **Down splits** — EPA/play and success rate on early downs (1st–2nd) vs late downs (3rd–4th), offense and defense. Reveals teams that live on schedule versus teams that live on conversion downs.
- **Drive stats** — points per drive, TD rate, field-goal rate, punt rate, **three-and-out rate** (exactly 3 plays ending in a punt), turnover-drive rate (INT/fumble drives, including pick-sixes), turnover-on-downs rate, and average drive-start field position. League 2025 norms check out: 2.10 points per drive, 24.0% TD rate, 20.4% three-and-out.
- **Stuff rate** — share of designed rushes gaining zero or negative yards (no gain or tackle for loss), for the offense and allowed by the defense.
- **Air-vs-YAC EPA splits** — per dropback, how much passing EPA came through the air (throw depth) versus after the catch (receiver run). Plus air yards per dropback. Defensive versions measure what a defense allows in each component.
- **Late-and-close performance** — EPA and success rate in the 4th quarter with possession-team win probability between 0.20 and 0.80. True clutch sample, and small: ~50–80 plays per team per season, so it's always reported with its play count.
- **Unit matchups** — pass offense EPA vs pass defense EPA, rush offense vs rush defense, each with success rates and percentile ranks. The sheet we use to line up one team's strength against the other's.
- **Weekly trends** — team × week EPA/play, EPA/dropback, EPA/rush, success rate, and defensive equivalents across all 18 weeks of 2025 (544 rows; bye weeks absent). For spotting form changes and hot/cold streaks. Not produced for 2026 (one week).
- **Turnover components (actual vs expected)** — expected INTs = league-average INT rate per dropback × team dropbacks (2025 baseline 1.867%); expected fumbles lost = league-average fumble-lost rate per play × team plays (2025 baseline 0.640%). The difference (actual minus expected) is the luck meter: negative = lucky, positive = unlucky. Same construction for defensive takeaways, plus opponent fumble recovery rate. The 2025 Dallas case is the textbook demo: 4th in EPA/play, 7-9-1 record, defense 4.6 INTs below expected.
- **Turnover-worthy-play rate (2025 only)** — FTN's `is_interception_worthy` per dropback. ~3.0% of dropbacks flagged; 52.3% of flagged throws became actual INTs. This is the signal behind our INT projections, not the raw INT count.
- **Pressure proxies** — QB-hit rate and sack rate per dropback, allowed and forced. These are **floors, not the true rate**: the play-by-play flags hits and sacks but not hurries, so true pressure is underestimated.

---

## 5. Known limitations (stated plainly)

- **No opponent adjustment.** Our lab numbers are raw EPA. We know this, and we know it matters — in Week 1 2026, our unadjusted EPA had Jacksonville #1 after they beat Cleveland, while FTN's DVOA ranked San Francisco #1 *after* opponent adjustment. DVOA-style adjustment is the known next step. We use cross-unit EPA as qualitative modifiers only, never smuggled into numbers.
- **Pressure rate is a proxy, not a measurement.** True pressure rate needs tracking or charting data (PFF/SIS/ESPN — paid or manual). Hurries without a hit or sack are invisible in our data, so our pressure columns are lower bounds. Per the methods literature: pressure generation is sticky, but **pressure-to-sack conversion is near-pure luck (R² < 0.005)**. That's why we deliberately project no individual sack props — the literature is applied as a veto.
- **FTN 2026 interception-worthy data is not yet published.** The 2026 `int_worthy_*` columns are NaN by design, not missing by accident.
- **Fumble recovery is noise.** Year-to-year correlation is ~0.00. A team recovering 26% of opponent fumbles should expect positive regression; a team forcing +4 INTs over expected should expect negative regression. We note it; we don't price it.
- **No weather, injury, or rest inputs.** The DET linemen/safety absences, short-week Thursday fatigue, stadium noise — these are named qualitatively, never baked into a number.
- **2026 = one game per team.** Percentiles, distributions, and matchups computed from it are single-game artifacts. Labeled as such everywhere.
- **points_per_drive is approximate** — drive counts come from the filtered sample (excludes garbage-time/kneel drives), so the denominator is slightly understated.
- **The single league INT/fumble baseline** would be better if adjusted for downfield-throw rate. Not attempted; documented.

---

## 6. What we do NOT use, and why

- **No proprietary charts republished — ever.** We read PFF grades, DVOA tables, and Next Gen Stats visuals to learn and to sanity-check our own numbers (e.g., our Seattle defensive EPA rank matched The Athletic's TruMedia report; our Buffalo EPA rank sat within filter noise of PFF's). We never republish their tables, grades, or visuals. Learn, don't lift.
- **No DVOA formula.** The full DVOA computation is proprietary and unverified by us. We compare against it qualitatively (see the JAX/SF case above) but never claim to compute it.
- **No whole-highlight video.** Standing rule from the 2026-09-15 legal check (Richardson v. Townsquare Media, 2d Cir.): real-footage clips stay 2–4 seconds, commentary-led, never the whole play.

---

## 7. How a number becomes a projection

**Base prior = 2025 full-season per-game means** computed from our filtered sample (never quoted from anywhere). **Week 1 2026 is a role-check only:** it confirms roster continuity and target/carry shares (and caught real structural breaks, like Montgomery now playing for Houston and DJ Moore for Buffalo) but contributes zero weight to any efficiency rate. Volume is **script-adjusted** — measured 2025 dropback rates by win-probability bucket move a favorite toward running and an underdog toward passing — then **garbage-time corrected**, because props settle on full games and our filters remove ~11% of plays: each volume projection is multiplied by the measured unfiltered/filtered per-game ratio for that exact stat, a bias correction, not a fudge. Every projection carries **uncertainty bands**, and **unmodeled risks are named in writing** (injuries, weather, roster thin spots) rather than hidden in the number. Where the data cannot support a projection, the row is NULL with a one-line reason — and a projection that disagrees with the market is a hypothesis, not an edge, until validated. That is the H1/H2/H3 standard: three pre-registered hypotheses were killed on honest nulls in the props lab before this work began, and the same bar applies here.

---
*Data: nflverse (CC-BY 4.0). FTN charting via nflverse (CC-BY-SA 4.0). Scripts: `compute_team_metrics.py`, `compute_advanced_metrics.py` in `~/workspace/gse-research/nfl-2026/` — re-runnable, no mock data, no copied tables.*
