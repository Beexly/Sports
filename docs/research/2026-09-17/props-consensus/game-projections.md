# Game Projections — Bills vs Lions, 2026-09-17 (7:15 PM CT, New Highmark Stadium)

**Status:** projections for Garrett's eyes only. Not picks, not edges, never framed as bets. Every number below is computed from our own lab data (nflverse play-by-play + FTN charting), 2025 full regular season as the base, 2026 Week 1 as role-check only. Full metric inventory: `our-metric-stack.md`. Computation details: `~/workspace/gse-research/nfl-2026/COMPUTATION_NOTES.md`.

**Market context:** BUF −5.5, total 54.5 (implied BUF 30.0 / DET 24.5). Detroit down two starting OL (Mahogany, Miller — ruled out) and both starting safeties (Branch, Joseph — PUP).

**Known limitations (read first):** our numbers are NOT opponent-adjusted — raw EPA, the known next step. 2026 = one game each. No weather, rest, or officiating inputs. Fumble recovery and pressure-to-sack conversion are treated as noise per the literature. Individual sack props are NULL by the literature veto.

---

## 1. Team-level projections

| Projection | BUF | DET | Method |
|---|---|---|---|
| Points | 28 [21, 36] | 25 [17, 33] | Drive method: own pts/drive × ~10.5 drives (BUF 2.63, DET 2.53) |
| Total plays | 64 [56, 72] | 64 [56, 72] | League baseline ~63/game; both teams were top-12 in plays in 2025 |
| Dropbacks | 35 [28, 42] | 39 [31, 47] | Script-adjusted: BUF ~55% as favorite; DET ~61% trailing |
| Designed rushes | 29 [22, 36] | 25 [18, 32] | Remainder of plays |
| Turnovers lost | 1.1 [0, 3] | 1.2 [0, 3] | Takeaway rate/drive (BUF forces 11.6%, DET forces 10.5%) × drives |
| Sacks taken | 2.4 [0, 5] | 2.6 [0, 5] | Opp sack-forced rate × dropbacks; DET bumped qualitatively for backup OL (kept out of the number, stated here) |
| INTs thrown | 0.7 [0, 2] | 1.0 [0, 2] | INT thrown rate/db (BUF 1.87%, DET 1.42%) × dropbacks; DET's 2025 INT luck (−2.5 vs expected) partially priced as regression |
| Points allowed | 25 [15, 35] | 28 [18, 38] | Pts allowed/drive (BUF 2.12, DET 2.28) × drives |

**Score projection:** BUF 28 – DET 25. **Total:** ~53 (market 54.5 — agreement). **Margin:** drive method implies ~BUF −3; the EPA method (net EPA/play edge × 63 + 2.0 home field) implies ~BUF −7. They disagree — that disagreement IS the model uncertainty, not an edge. Market −5.5 sits between them.

## 2. The matchup through our advanced metrics

- **Efficiency:** BUF +0.132 EPA/play (dropback +0.174, rush +0.078); DET +0.078 (dropback +0.168, rush −0.055). Both top-10 passing offenses; Detroit cannot run it (−0.055 rush EPA, 5th percentile).
- **Defense:** BUF +0.032 EPA/play allowed (good); DET +0.008 (average). BUF stuffs the run (10.8% TFL/rush, 92nd pct); DET does not (5.0%, 8th pct) — and now starts backup linemen.
- **Pressure:** BUF rushes 4 on 70.4% of dropbacks (2025) and 64.3% in Week 1 2026 — top-5 four-man rate both years; pressure proxy forced 15.9% (2025), 21.4% (Wk1). DET allowed pressure proxy on 18.9% (2025), 19.5% (Wk1) — bottom-third protection, now with two backup starters. This is the game's structural mismatch.
- **Luck layer:** DET forced fumbles at 2.10%/play (+6.5 over expected) but recovered only 26.3% (−20 pts vs league) — textbook positive regression candidate: more takeaways coming than 2025's box score shows. BUF's takeaway profile was neutral-to-lucky (13 INTs vs 8.9 expected — regresses down).
- **QB profiles (2025):** Allen aDOT 7.12 (25th pct — short-area passer) with +2.8 CPOE (82nd pct); Goff aDOT 6.43 with +2.1 CPOE. Both accurate; neither pushes it deep by volume. Week 1 2026 small-sample noise aside.
- **Special teams:** both return units positive on kickoffs (+0.38 EPA/return each); BUF's punt-return unit was negative (−0.32) vs DET's +0.32. Touchback rates low both ways (11.5% / 17.2%) — returns will happen.

## 3. Kicker & defensive props

| Prop | Our projection | Band | Market line (if public) | Note |
|---|---|---|---|---|
| Bass (BUF) kicking points | 6.8 | [3, 10] | none public | Missed all of 2025 (rust = qualitative risk); 2024 blended make rate 85%; 3/3 FG + 3/3 XP in Wk1 |
| Bates (DET) kicking points | 7.2 | [4, 11] | none public | 2025: 27/34 FG (79.4%), 7.94 pts/gm; 4/9 from 50+ (44%) — long attempts are live misses |
| BUF team sacks | 2.1 | [0, 4] | none public | Forced-rate × script dropbacks; DET backup OL is a real upward risk, kept qualitative |
| DET team sacks | 2.2 | [0, 4] | none public | BUF allowed pressure on only 12.1% (2025) |
| BUF team INTs | 0.3 | [0, 1] | none public | FTN worthy-rate method; Goff threw 8 INTs on 10.5 expected in 2025 |
| DET team INTs | 0.5 | [0, 2] | none public | Allen 10 INTs on 10.1 expected — no luck edge either way |
| Total takeaways (each) | ~1.1 | [0, 3] | none public | Takeaway rate/drive × drives |
| Both teams 2+ FGs | ~11% fair | — | +275 (BetMGM) | Lean against at our number; bimodal 4th-down tails — not a call |

Individual player sacks (Hutchinson, Rousseau): **NULL** — pressure-to-sack conversion is near-pure luck (R² < 0.005). No false precision.

## 4. Skill-position props vs consensus (from prior workstream)

- Allen passing yards: market 250.5 vs our 201 — UNDER lean, band [135, 265] covers the line; market weights Week 1 (334 yds) + missing DET safeties, partially unmodeled. Lean, never a call.
- LaPorta receiving yards: market 46.5 vs our 79 — OVER lean on role (17.2% when-active share); n=9 active games. Not a strong call.
- Gibbs rushing yards: market 89.5 vs our 95 — coin flip.
- 9 other props at the market (Allen rush yds, Allen pass TDs 1.5, Goff attempts, Gibbs receptions, Shakir yds/rec, Moore yds/rec).

## 5. Unmodeled risks (the qualitative layer, kept out of the numbers)

1. Detroit's two backup starting linemen vs Buffalo's top-5 four-man rush — the single biggest game variable, directionally favors BUF sacks and short DET drives.
2. Detroit's missing safeties (Branch, Joseph) vs Allen — passing upside for BUF not in our numbers.
3. Bass rust — zero 2025 kicks; Wk1 was clean but n=1.
4. New-stadium crowd noise on DET's silent counts/audibles, especially with backup linemen.
5. No opponent adjustment anywhere in our stack — both teams' 2025 efficiency came against different schedules.
6. Game script: if DET leads, our trailing-script assumptions (61% dropback) invert.

## 6. Verdict

Nothing here is actionable as a bet. The projections agree with the market total (~53 vs 54.5) and sit inside the market spread's uncertainty cone (our two methods bracket −5.5 at −3 and −7). The 12 prior leans all sit inside their bands. The recommended next step remains: backtest the projection method against 2025 Weeks 1–18 closing prop lines — if the gaps predict line errors out-of-sample, leans graduate to edges. Until then, this is a scouting document, not a betting one.
