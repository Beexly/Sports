# GSE CONTEXTUAL LAYER — the between/beyond-the-numbers atlas (2026-10-10)
_Own computations today from keyless public data (rosters AV × draft picks × Sleeper ages; 28,617 player-seasons). Labels: [OWN] computed here, [LIT] published literature, [HYP] hypothesis needing a kill test. Doctrine: nothing touches μ without passing its pre-registered kill test vs the close._

## 1. TODAY'S OWN FINDINGS — computed from public data, nobody's shipped this

### 1.1 The production aging curves, quantified [OWN]
AV per game by years-in-league (n=28,617 player-seasons, 1999→2026 rosters; sample floor n≥25/pos-year):

| yrs | QB | RB | WR | TE |
|---|---|---|---|---|
| 0 | 0.471 | **0.361** | 0.237 | 0.100 |
| 1 | 0.577 | 0.421 | 0.310 | 0.140 |
| 2 | 0.560 | **0.434** | 0.332 | 0.155 |
| 3 | 0.554 | 0.434 | 0.356 | 0.173 |
| 4 | 0.578 | 0.430 | 0.372 | 0.188 |
| 5 | 0.610 | 0.419 | 0.389 | 0.180 |
| 7 | 0.697 | 0.475 | 0.391 | 0.181 |
| 8 | 0.699 | 0.406 | 0.380 | 0.175 |

**Read-outs (each one is a props/rankings weapon):**
- **RB peak = years 2-3, and it's over by year 8** (0.406 after a survivorship spike at 7). The "RB cliff" is measurable, not folklore.
- **WR is a straight ascent for 7 years** — rookie WRs produce 60% of their year-7 value. "Year-3 breakout" (0.332→0.356) is real but the curve never stops climbing for survivors.
- **Rookie TEs are nearly unusable** (0.100 = 22% of year-4). TE rookie props priced off hype are structurally over.
- **The QB sophomore dip exists** (0.577 → 0.560/0.554 in yrs 2-3): the league's second read on young QBs is visible in the curve. Survivorship inflates years 7-9 (only stars remain — caveated below).

### 1.2 Age curves (joined via Sleeper ages, n=2,135; ±1yr birthday noise) [OWN]
- **RB peaks at AGE 23** (0.500 AV/g) and declines by 24 — younger than the folk "24-26". Age-23 RB seasons are the buying window; age-26+ RB props carry hidden decline risk.
- **QB prime = age 27** (0.763) — matches canon, now computed on our join.
- WR prime 25-26 (0.487/0.447); TE flat then jumps 25+ (role-driven).
- Caveats [OWN]: survivorship inflates late-career cells; Sleeper age is a single snapshot back-dated; n thins after 27. Treat as curve SHAPE, not coefficients.

### 1.3 Draft capital = opportunity, instantly [OWN]
Season AV by draft round (name-join to draft_picks, n=1,391):

| pos/yr | R1 | R2 | R3 | R4 | R5 | R7 |
|---|---|---|---|---|---|---|
| RB y0 | 7.5 | 6.0 | 5.7 | 4.9 | 3.9 | – |
| WR y0 | 5.6 | 4.1 | 3.1 | 2.6 | 3.6 | – |
| WR y1 | 6.4 | 5.1 | 4.7 | 3.9 | 4.9 | 2.5 |
| TE y1 | – | 3.4 | 3.0 | 2.7 | 1.7 | 0.6 |

Career length by round: **6.0 (R1) → 5.0 → 4.0 → 4.0 → 4.0 → 3.0 (R7)** — a perfectly monotonic survival gradient. Capital doesn't just buy chances; it buys seasons.
**Usage**: fantasy rankings + props priors should condition on capital × year-in-league × position BEFORE any narrative. Combine with §1.1: a year-2 day-2 RB is at the exact peak of the curve — "breakout" priced by markets as news is often just the aging curve arriving on schedule. That's the between-the-numbers edge: **separate curve arrival from regime change.**

### 1.4 Durability/availability curve [OWN]
Games played by years: QB rookies play the fewest (10.4 — committees + injury risk), RB flat ~13 all career (they're built to absorb it), WR/TE rise then hold. QB year-4 dip (9.9) coincides with 5th-year-option decision seasons — [HYP] risk-taking/playing-through-injuries; testable vs injury reports.

## 2. THE BIRTHDAY LAYER (the ask)
- **Relative Age Effect (RAE)** [LIT]: in age-cutoff youth systems, Q1-born kids are overrepresented in elite pipelines (hockey: Barnsley & Thompson 1985; soccer: Helsen et al 2005; MLB: the "July 1 cutoff" effect — Thompson, Barnsley & Stebelsky 1991). Mechanism: selection + mature-age coaching investment, not born talent.
- **NFL/football specifics** [LIT, mixed]: school-cutoff RAE appears in HS→college pipelines; at the NFL level the effect attenuates (the league already selected for outliers) — found in football studies as weaker/smaller than hockey. The NFL's own filter is the draft class, not a birth cutoff: the real NFL "birthday" variable is **age-at-draft / early-entry status**.
- [OWN, proxy]: our career-length × capital gradients (§1.3) are the NFL-relevant expression of developmental-age advantages — day-2 early entrants who "arrive" at their position's curve peak early are mispriced by narrative.
- **What we still need for the true test** [NEXT]: player DOB at scale (PFR DOB scrape or nfldb) → test: (a) birth-quarter distribution by draft round among equal-capital players; (b) age-vs-peak alignment: fraction of players hitting §1.1 curve peaks early/late; (c) redshirt effect. Pre-registered kill: if birth-quarter share among R1-R3 picks deviates <2pp from uniform, RAE-in-NFL = dead, mark KILLED, stop re-testing.
- **Cognitive tie-in** [LIT]: "selection year" effects also show up as persistent confidence/training-history differences — the honest summary is: in NFL, use age-at-curve-peak alignment, not birth month alone.

## 3. CIRCADIAN / SLEEP / TRAVEL (inside-body, testable)
- **West-coast evening advantage** [LIT]: Smith, Guilleminault & Efron, SLEEP 36(12) 2013 — 40 seasons: WC teams win more evening games vs EC (body-clock peak aligns with night kickoffs); no day-game effect. [OUR RULE] binary feature (evening × coast mismatch), walk-forward vs close before ingestion. GSE brain doc already carded this — stays a stratum, not a coefficient.
- **Jet-lag direction asymmetry** [LIT]: eastward travel disrupts sleep more than westward (phase-delay easier than phase-advance) — [HYP] road teams traveling east for 1pm body-clock games underperform; kill test on nflverse travel via venue/timezone joins (our context_engine already builds haversine+tz).
- **TNF short week** [LIT+OWN]: our slate_context2 has game-window effects; [LIT] consensus: home TNF edge has compressed as the league professionalized Thursdays — re-test on 2023-26 data before trusting priors.
- **Sleep science honesty** [LIT]: sleep extension improves reaction/vigor in collegiate athletes (Mah et al, Stanford) — but pro-level, pre-kickoff-public sleep data does not exist. OUT-OF-CORPUS per brain doctrine until a dated public source exists.

## 4. NUTRITION / BODY — the honest version (user asked "do they have a nutritional edge they know about")
- Team nutrition programs are private, individualized, and NOT observable pre-kickoff by us. Any "nutritional edge" number would be invented — forbidden by doctrine. [HYP-TIER ONLY]
- What IS observable: roster weight listings season-over-season (nflverse rosters), age-related body-comp drift (§1 curves), altitude physiology (hemoglobin mass adapts in ~2-3 weeks — residency advantage for DEN has mixed field evidence; our fatigue_efficiency.py carries the physics), heat/humidity dose-response (own market_efficiency2 temperature bands).
- Practical edge we CAN ship: **weight-change flags** (listed weight jumps >10 lbs between seasons) as a prop-risk stratum. [HYP] kill test vs prop-close residuals.

## 5. EMOTIONAL / MOTIVATIONAL SPOTS
- [OWN] division games −0.96 vs close (motivation_spots.py), post-bye −2.33 (slate_context2.py) — already in the stack.
- **Revenge games** [LIT]: little rigorous NFL evidence that "revenge" predicts beats the close; treat as narrative noise until tested: build revenge flag (former-QB/HC/coordinator returns) → kill test vs spread residual.
- **Hot-seat risk-taking** [LIT-adjacent]: coaches on the hot seat go aggressive late-season (4th-down/go-for-2 behavior) → totals angle. Testable from nfl4th-style PBP counts by coach tenure. [HYP]
- **Contract incentives** [LIT, mixed]: incentives (per-game roster bonuses, reception/yardage escalators) skew usage in weeks 16-18 — testable from Spotrac-style public incentive lists cross our props data. [HYP] — needs as-of incentive table before it's legal.
- **Holdouts/return-to-form** [HYP]: post-holdout conditioning lag — first-3-games usage dip. Testable from snap counts (we hold snap-count corpus).
- **Rookie wall** [HYP]: games 10-17 decline for high-volume rookie RBs — directly testable with our snap counts + §1.1 baseline.

## 6. COACH / GAME-MANAGEMENT PSYCHOLOGY
- **4th-down aggression** [LIT]: nfl4th/Romer framing — aggressive teams gain WP by going; market knows TENDENCIES but lags CHANGES (new OC, in-season aggression shifts). [HYP] engine: coach-aggression z-score vs league, re-computed rolling-8-games; angle = 4th-down conversion props + totals drift.
- **OC/DC mid-season changes** [HYP]: first-4-games scheme shock (new DC → unders on opponent total?). Kill test on coordinator-change flags.
- **Interim coaches** [LIT, weak]: small emotional bump week 1-2, decays — re-test vs close.
- **Two-for-one clock management** [OWN, small]: end-of-half possessions drive 1H totals — our 1H prop σ table (from DK ladders: pass 51.4 etc.) prices half-markets; check if 2-for-1 offenses (fast pace by situation) beat 1H closes more often than full-game. [HYP, data-ready]

## 7. NARRATIVE & MARKET PSYCHOLOGY (the outside-sports canon, mapped to testables)
- **Prospect theory → favorite-longshot bias** [LIT]: loss aversion + probability weighting (Kahneman-Tversky 1979; Snowberg-Wolfers 2010 on racetrack) → retail overpays longshots. [OWN] our FLB slope 0.943 + Shin devig — done, keep as pricing diagnostic.
- **Hot hand fallacy is half-false** [LIT]: Miller & Sanjurjo (2018) — selection bias hides real hot hand in streak data. For props: [HYP] "streaking" players' props may be genuinely shaded but STILL exploitable when books overcorrect for regression — test streak-adjusted prop residuals.
- **Information cascades / herding** [LIT]: Bikhchandani-Hirshleifer-Welch 1992 → PrizePicks `trending_count` (we harvest it!) = a public herding meter. [HYP-READY, data in hand]: back-test trending-vs-nontrending prop outcomes once we accumulate graded picks — the contrarian-leaning version is the PP "fade the stampede" stratum.
- **Anchoring on round numbers** [LIT: Tversky-Kahneman anchoring]: prop lines cluster at round yards (99.5 vs 94.5). [OWN-READY]: DK ladder recon shows the spacing — test whether books shade prices NEAR round-number lines (disutility clusters) = free mispricing map. This one is uniquely ours via the ladder files.
- **Base-rate neglect / superforecasting** [LIT]: Tetlock — outside-view base rates beat inside-view stories. Operational: every "narrative" claim must clear its base rate (e.g., "wr X is due" → base rate = §1.1 curve position).
- **Wisdom of crowds vs rankings** [LIT]: consensus ranks beat expert tails on average; edge lives in constrained deviations (curve + capital + usage), not wholesale fades. [HYP] GSE rankings = consensus + structured tilts, logged.
- **Gambler's fallacy in totals** [HYP]: after 2 straight unders, retail overs overprice — measurable in line moves post-streaks from our Pinnacle version diffs.

## 8. INJURY PSYCHOLOGY & REPORT GAMING
- **Friday/Saturday designations matter** [LIT-adjacent]: late downgrades to Out correlate with worse outcomes & market moves; questionable-tag usage varies by coach (some never list honestly). [HYP] coach-level "designation honesty" score from historical practice-participation vs game status — directly testable from ESPN injuries (we hold 800-row digest + 8.7MB full).
- **Turf vs grass** [LIT]: non-contact injury rates higher on artificial turf in several NFL-era studies (e.g., 2012-2018 analyses; league moved some stadiums back to grass) → injury-risk stratum by venue surface for props. Kill test: same-player same-season prop-miss rates by surface. [DATA-READY: games carry surface + our injury corpus]
- **QB-change cascade** [OWN, stack]: injury_adj QB 5.5 pts (engine_math) + opportunity-transfer logic; the cognitive add: backup-QB first-start = target-funnel to TE/checkdowns [HYP] — testable from next-gen-target data when wired.

## 9. IN-GAME SITUATIONAL (eyes-open list, all data-ready or data-near)
- **Garbage-time inflation** for props [HYP]: junk-time receptions/carries pad unders/overs asymmetrically — needs PBP re-pull (data/download_deep.py) then game-script strata.
- **Wind → props not totals** [LIT/OWN]: wind kills DEEP passing more than short (documented punting/FG physics in fatigue_efficiency) — the prop expression (long-reception unders, FG overs) is fresher than the total angle. Wish #8 lives here.
- **Referee crews** [OWN]: context_engine EB environments 1.09 — penalties/total micro-edges; refresh annually.
- **Acoustic false starts** [LIT, old but real]: road-team false-start rates in loud venues — testable from PBP penalty columns; angle = road-OL props & drive-kill unders. [HYP]
- **OT rules (3rd-era)** [OWN-adjacent]: both-possess OT → unders on full-game closes that priced old OT; our market_efficiency refits 2023+ will capture.
- **Pace/no-huddle in deficits** [HYP]: trailing teams' 4th-quarter tempo inflates garbage props — script-conditional over/under asymmetry.

## 10. KILL-TEST REGISTRY (pre-registered; nothing here touches μ until it passes)
| # | Factor | Data (have today?) | Test | Status |
|---|---|---|---|---|
| K1 | Aging-curve arrival vs narrative | ✅ rosters AV | Props residual by curve-position bucket | READY — needs graded props outcomes |
| K2 | Draft-capital × year as props prior | ✅ picks+rosters | same | READY |
| K3 | RAE birth-quarter | ⏳ need DOB source | uniformity + peak-alignment | BLOCKED on DOB |
| K4 | WC-evening body clock | ✅ schedule tz | binary walk-forward vs close | READY |
| K5 | PP trending contrarian | ✅ trending_count live | fade/top-strata outcomes | ACCUMULATING |
| K6 | Round-number anchoring shade | ✅ DK ladders | price-shade-by-line-spacing map | READY (analysis pass) |
| K7 | Turf prop-miss rate | ✅ injuries+surface | surface stratum | READY |
| K8 | Designation honesty by coach | ✅ ESPN injuries | late-downgrade outcomes | READY |
| K9 | Rookie wall games 10-17 | ✅ snaps (re-pull needed) | volume-stratified decline | READY post re-pull |
| K10 | Hot-seat aggression → totals | ⏳ coach tenure table | 4th-down rate trend vs totals | BLOCKED on table |
| K11 | Revenge/return flags | ✅ buildable | residual test | BUILD |
| K12 | Contract-incentive week 16-18 | ⏳ incentive table | usage bump | BLOCKED on as-of data |

## 11. NEXT CRACKS (deeper than anyone, queued)
1. **DOB at scale** → finish the birthday question properly (K3).
2. **player_stats.csv (nflverse weekly)** → aging curves on EPA/fantasy instead of AV proxy; snap-share curves; rookie-wall quantified.
3. **SGP over-correlation test**: DK SGP prices vs our margin-total copula — is retail SGP priced with ρ too high (overpriced correlated parlays)? The copula premium we built is the ruler.
4. **Line-cluster shading map** (K6) from tonight's 5,981 ladder rows — publishable alone.
5. **BDB 2027 tie-in**: combine-age (age at combine) × §1 curves = "developmental runway" feature — nobody will control for it. Our unfair edge on the Football-score 30%.
