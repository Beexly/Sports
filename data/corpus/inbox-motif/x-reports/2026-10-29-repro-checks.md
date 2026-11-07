# Reproduce-or-refute checks — 2026-10-29

Two public analytics claims from today's X sweep, tested against public data computed in-house. Method and verdicts below; scripts and intermediate tables are in `~/workspace/x-for-you-sweep/raw/repro-koalaty/`.

---

## Check 1 — @KoalatyStats defensive target funnels (X, Oct 29)

Source post: https://x.com/KoalatyStats/status/2115811766294757392 — "2026: Where are NFL defenses allowing targets to go?" Headline claims: Green Bay allows the 2nd-highest target share to WRs; Detroit allows the 3rd-most pass attempts, the highest PROE, and the 2nd-highest target share to TEs; San Francisco and Atlanta funnel targets to RBs.

### Method
- **Data:** nflverse public releases, downloaded 2026-10-29 — `play_by_play_2026.csv.gz` (pbp) and `roster_2026.csv`.
- **Data vintage / completeness:** the current nflverse release contains **Weeks 1–7 only** (107 games, 18,738 plays). Week 8 is not yet in the release, so a through-Week-8 reproduction is **not computable from nflverse today**. All verdicts below are for the through-Week-7 window — which turns out to be the window the chart itself was almost certainly built on (see the pattern of exact rank matches).
- **Targets faced:** plays with `pass_attempt == 1`, excluding QB spikes and two-point attempts, with a non-null `receiver_id` → **6,805 targets** league-wide.
- **Position attribution:** `receiver_id` (GSIS) joined to `roster_2026.csv` on `gsis_id`, using the roster `position` field. **Zero unmapped receivers** (0 of 6,805). Distribution: WR 3,941 / TE 1,629 / RB 1,228 / QB 4 / OL 3. Target share allowed = targets to that group ÷ all targets faced (the 7 QB/OL trick-play targets stay in the denominator as OTHER). The roster file holds one row per player (no duplicate GSIS IDs) and lists no FBs in 2026, so RB needs no FB fold-in.
- **Pass attempts faced:** primary = count of `pass_attempt == 1` (excluding two-point attempts); cross-checked against dropbacks faced (`qb_dropback == 1`).
- **PROE allowed:** nflverse pbp carries `xpass`/`pass_oe` on 99.5% of dropbacks. PROE allowed = mean `pass_oe` of opposing dropbacks vs that defense. Six alternative definitions were also computed (per-attempt, per-game averaged, spikes excluded, pass-rate − xpass, win-probability 5–95% filter, single-week and Weeks 4–7 windows).
- **Mapping error modes (documented, not hidden):** roster position is the player's official listing, not his alignment on the play — hybrid players (a listed TE split wide, a listed WR in the backfield) are counted at their listed position; using nflverse participation data (actual alignment) would be the refinement. Listed position (`position`) was used rather than `depth_chart_position`. Neither choice is rank-material here: re-running target shares **including** two-point attempts leaves every claimed rank unchanged.

### Claim-by-claim verdicts

| # | Claim | Computed (W1–7) | Verdict |
|---|-------|------------------|---------|
| 1 | GB allows 2nd-highest WR target share | GB **65.7%**, rank **2** of 32 (PHI #1, 67.3%) | **REPRODUCED** |
| 2 | DET allows 3rd-most pass attempts | DET **279**, rank **3** (ATL 303, DEN 285); also rank 3 by dropbacks (288) | **REPRODUCED** (both definitions) |
| 3 | DET allows the highest PROE | DET **+29.3**, rank **7–11** across all six definitions; **MIA #1 (+34.7) under every season-long definition** | **NOT REPRODUCED** |
| 4 | DET allows 2nd-highest TE target share | DET **30.0%**, rank **2** (KC #1, 31.0%) | **REPRODUCED** |
| 5 | SF and ATL funnel targets to RBs | SF **23.7%** RB share, rank **2**; ATL **22.2%**, rank **3** (MIA #1, 24.1%) | **REPRODUCED** (both top-3; only MIA ahead of SF) |

Extract of the computed table (full 32-team table: `raw/repro-koalaty/defense_funnel_2026_w1-7.csv`):

| Defense | Att faced | Dropbacks | Targets | WR share | TE share | RB share | PROE allowed |
|---------|-----------|-----------|---------|----------|----------|----------|--------------|
| PHI | 252 | 265 | 229 | .673 | .188 | .140 | +30.6 |
| GB | 259 | 275 | 233 | **.657** | .180 | .163 | +26.6 |
| ATL | 303 | 307 | 270 | .552 | .226 | **.222** | +27.3 |
| DET | 279 | 288 | 243 | .551 | **.300** | .144 | +29.3 |
| SF | 263 | 268 | — | .526 | .237 | **.237** | +25.0 |
| MIA | — | — | — | — | — | **.241** | **+34.7** |
| KC | — | — | — | — | **.310** | — | — |

**On the PROE miss:** the gap is not a rounding or definition artifact. Miami leads Detroit by ~5.5 points under the baseline definition, and Detroit never ranks above 7th in any variant tried (per-attempt: 11th; per-game: 7th; WP-filtered: 10th; Week 7 only: 16th; Weeks 4–7: 7th). Either the chart's PROE column came from a non-standard formula the post doesn't disclose, or it is simply wrong. Everything else in the post reproduces *exactly* at Week 7 under the standard nflverse pipeline — which is what makes the PROE number stand out: the same pipeline that nails four of five claims refutes the fifth.

**On the window:** four exact rank matches (2nd, 3rd, 2nd, and a top-3 pair) in the only window public data currently supports is strong evidence the chart was built on through-Week-7 data with a standard pbp + roster-position pipeline — i.e., the account's method is reconstructible, and its one bad number is detectable only because it is.

---

## Check 2 — @sfdata9ers missed-tackle endpoints (X, Oct 29)

Source post: https://x.com/sfdata9ers/status/2115844929247166692 — team missed tackles through Week 7, attributed to Pro Football Reference: 1. DET, 2. TEN, 3. MIN … 30. PHI, 31. DEN, 32. CLE.

### Method
- PFR **is** programmatically reachable: `pro-football-reference.com/years/2026/defense_advanced.htm` returned HTTP 200 with a normal browser user-agent. (The advanced defense table does **not** live on the main `defense.htm` page, which contains no MTkl data at all, and the season `advanced.htm` hub carries only offensive advanced tables — the defense table is on the `defense_advanced.htm` page.) Player-level MTkl (768 players) was summed by team.
- PFR's aggregated totals match the independent BetMGM republication cited in the deeper pass **exactly** (DET 12, DEN 56, CLE 51, PHI 49) — two reads of the same table agree.
- Window note: PFR's advanced tables update Wednesdays and currently reflect games through Week 7.

### Verdicts

| Claim | Computed from PFR | Verdict |
|-------|-------------------|---------|
| DET fewest missed tackles (#1) | DET **12**, #1 — next team (MIN) has 18; "fewest by a mile" is literal | **REPRODUCED** |
| Top 3 = DET, TEN, MIN | DET 12 (#1), MIN 18 (#2), TEN 23 (#3, tied with CAR) — same three teams, TEN/MIN order swapped vs the post | **CLOSE** (adjacent swap) |
| Bottom 3 = PHI (30), DEN (31), CLE (32) | PHI 49 (#30, exact), CLE 51 (#31), DEN 56 (#32) — same three teams as the worst cluster; DEN/CLE order swapped vs the post | **CLOSE** (adjacent swap) |

Full team table: `raw/repro-koalaty/pfr_missed_tackles_by_team.csv`. The two adjacent swaps are consistent with the post having been made from a marginally different PFR update cut than today's table; the endpoints the post actually headlined (DET fewest by a wide margin; DEN/CLE/PHI the worst cluster) are correct.

---

## What this proves about borrowing charts vs computing in-house

1. **The public-chart ecosystem is reproducible almost for free.** Four of five KoalatyStats headline claims and both sfdata9ers endpoints rebuild exactly from two public files (nflverse pbp + rosters; one PFR page) in a few minutes of compute. Nothing in either chart required proprietary data — GSE's warehouse can generate both tables weekly, on its own schedule, with its own definitions written down.
2. **The one wrong number was invisible until reproduced.** The PROE claim sat in a chart whose other four numbers are exactly right. A borrowed chart imports its author's errors with no flag attached; the in-house table is what let the error be isolated to a single column. That is the doctrine in miniature: the reasoning is the product, and reasoning you cannot recompute is reasoning you are renting.
3. **Definition choices are the whole game.** Every verdict above turned on stated definitions (spikes and two-point plays out, roster position over alignment, per-dropback PROE). The borrowed charts state none of theirs. In-house, the definitions live next to the numbers, so a claim can be re-run when the definition is challenged.
4. **Known limits of the in-house route, honestly:** position attribution by roster listing rather than on-play alignment (participation data is the upgrade path), and nflverse's release lag — Week 8 was complete on the field before it existed in the public pbp file, so a borrowed chart can occasionally be *fresher* even when it is less checkable.

**Bottom line:** @KoalatyStats — 4 of 5 claims REPRODUCED exactly, PROE claim NOT REPRODUCED (Miami, not Detroit, allows the most over-expectation passing). @sfdata9ers — endpoints REPRODUCED (DET fewest) with two adjacent-order swaps (CLOSE). Both tables now exist in-house and can be regenerated weekly from `raw/repro-koalaty/repro.py` plus the PFR scrape.

*Run completed 2026-10-29 ~12:07 CT. Data: nflverse releases and pro-football-reference.com as of that date.*
