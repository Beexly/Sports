# Kicker & Defensive Props — Bills vs Lions, 2026-09-17 (TNF, 7:15 PM CT, New Highmark Stadium)

**Kickoff:** 7:15 PM CT. **Game context:** BUF −5.5, total 54.5. Detroit down LG Mahogany + RT Miller (ruled out), safeties Branch + Joseph (PUP).
**Status:** RESEARCH ONLY. Nothing here is a pick. A projection disagreeing with a line is a hypothesis, not an edge, until backtested.

**Kickers verified in 2026 Week 1 play-by-play** (nflverse, not memory): **Tyler Bass** (BUF — 3/3 FG, 46/34/33 yds, 3/3 XP vs HOU); **Jake Bates** (DET — 1/1 FG, 23 yds, 4/4 XP vs NO).

---

## 1. Lines found

**ONE book-identified kicker/defensive line surfaced after a genuine dig.** No standard kicker lines (kicking points, FG made, longest FG, PATs made), no team-sack lines, no team-interception lines, and no points-allowed lines were found publicly for this game.

| Prop | Player/team | Line | Book | Timestamp (CT) | Source |
|---|---|---|---|---|---|
| Both teams to make 2+ field goals | BUF + DET (kickers) | +275 | BetMGM | ~08:02 CT 2026-09-17 (article states "Last updated at 9:02 a.m. ET", odds via BetMGM) | https://sportsbookwire.usatoday.com/story/sports/nfl/2026/09/17/thursday-night-football-lions-at-bills-best-prop-bets/91805720007/ |

### Search log (documented absence)

Searches run 2026-09-17 ~14:10–14:30 CT via `browser.search`, plus 2 page fetches (`browser.open`):

1. "Tyler Bass Jake Bates kicker prop bets Bills Lions Thursday" (since 9/15) — found the SportsbookWire article above; also RotoWire's **Week 1** article citing **"Jake Bates — Over 8.5 Kicking Points (−111 DraftKings)" for DET vs NO (Week 1, not tonight)** — evidence DK prices Bates kicking-points lines for marquee games, but tonight's is not published publicly.
2. "Bills Lions Thursday Night Football defensive props sacks interceptions odds" — nothing but standard offensive prop roundups (SI, Action Network, USA Today FTW).
3. "Jake Bates kicking points over under line Bills Lions FanDuel DraftKings tonight" — only fantasy content (FantasyPros Wk2 Bates projection: 1.6 FG / 1.9 FGA / 2.7 XPT / 7.4 pts from 29 experts; fantasyfootballcalculator: Bass 7.9 pts, Bates 7.6 pts). These are **fantasy projections, not betting lines** — cited only as external context.
4. `Lions Bills props "kicking points" OR "field goals made" OR "longest field goal" line` — returned only ancient Super Bowl prop PDFs (2021–2024), no tonight lines.
5. "pickswise Lions Bills player props Thursday" + "sportsgrid Bills Lions props odds" + "covers Lions Bills props odds" — no dedicated kicker/defense prop pages surfaced; articles cover QB/RB/WR/TE props only.
6. RotoWire betting game page for tonight (https://www.rotowire.com/betting/nfl/game/bills-vs-lions-odds-2026-09-17-2978435) — fetched; its "Player Props" section renders as "Loading Possible Bets…" (JS, no props in fetched text). Team implied points shown: BUF 30.0 / DET 24.5.
7. `Bills Lions "team total sacks" OR "defensive props" OR "points allowed" betting` — nothing.

**What individual kicker lines usually look like (for reference only, NOT found tonight):** FanDuel/DraftKings price kicker props in-app (kicking points, FG made O/U, longest FG, PATs) for TNF, but they are not exposed on any public page we could read without a logged-in session. This is a data-access limit, not proof the lines don't exist.

---

## 2. Our projections

Method (same as `projection_methods.md`): 2025 per-game base (filtered sample; efficiency 100% 2025 / 0% Wk1), garbage-time corrected where volume matters, uncertainty bands everywhere. Key data, all computed from nflverse 2025 REG (no copied tables):

- **Team kick volume 2025:** BUF 1.24 FG att/g (21 in 17g), 3.18 XP att/g | DET 2.00 FG att/g (34), 3.29 XP att/g.
- **Bates 2025:** 27/34 FG (79.4%; buckets 9/9, 5/5, 9/11, 4/8, 0/1), XP 54/56 (96.4%), 7.94 kick pts/g. League-weighted make-rate on his mix: 84.7% → blended make-rate used: **81%**.
- **Bass 2025:** **zero kicks in nflverse 2025** (missed the whole season — SportsbookWire independently confirms he "missed all of 2025"). Prior from **2024** nflverse: 24/29 FG (82.8%; buckets 7/8, 6/6, 7/11, 3/3, 1/1), XP 59/64 (92.2%). League-weighted on his mix: 87.1% → blended make-rate used: **85%**. RUST RISK after a full season out is unmodeled and named.
- **Defense 2025:** BUF forced 2.12 sacks/g (36), 0.76 INT/g (13, +4.1 over expected — negative takeaway regression risk), allowed 21.47 pts/g. DET forced 2.88 sacks/g (49), 0.76 INT/g (12, +1.5 over expected), opp-fumble recovery rate 26.3% (positive regression signal), allowed 24.29 pts/g. BUF allowed 2.35 sacks/g; DET allowed 2.29 sacks/g — but DET's qb_hit_rate_allowed (18.9%) was 2nd-worst in 2025, and tonight's OL has two backups.
- INT rates use the FTN original angle (`projection_methods.md` §7): Allen 3.66% worthy × 27.0 exp dropbacks × 52.3% conversion = 0.5; Goff 1.44% × 34.2 × 52.3% = 0.3.

| # | Prop | Projection | Low / High | Method (one-liner) | Key assumptions | Unmodeled risks |
|---|---|---|---|---|---|---|
| 1 | Bass kicking points | **6.8** | [3, 10] | 1.2 FG att × 85% (3.06 pts) + 4.0 XP att × 94% (3.76) | BUF drives ~10.5 in 54.5-total game; ~4.2 BUF TDs (market implies 30 pts); XP blend of Bass 2024 (92.2%) and league (95.4%) | Rust after missing all of 2025; rain/wind forecast (per fantasyfootballcalculator 9/16) hurts kicking; Wk1's 3 FG att is n=1 |
| 2 | Bates kicking points | **7.2** | [4, 11] | 1.7 FG att × 81% (4.13) + 3.2 XP att × 96.4% (3.08) | DET trailing script → ~10.7 drives; ~3.4 DET TDs; his own XP rate 96.4% | Campbell 4th-down aggression truncates FG volume both ways (fatter tails than band); rain/wind; OT-inflated 2025 attempt rate |
| 3 | Bass FG made | **1.0** | [0, 2] | 1.2 att × 85% make | Attempts driven by offense, not kicker | Distance mix (Wk1: 33/34/46) |
| 4 | Bates FG made | **1.4** | [0, 3] | 1.7 att × 81% make | Campbell attempts still go for it on 4th at a similar rate | Long-ball weakness (4/8 from 50–59 in 2025) |
| 5 | Bass PATs made | **3.8** | [2, 5] | 4.0 att × 94% | 2-pt tries folded into attempt count (~0.2/g noise) | — |
| 6 | Bates PATs made | **3.1** | [1, 5] | 3.2 att × 96.4% | Same 2-pt caveat | — |
| 7 | Bass longest FG | NULL | — | Single-play extreme = noise (per props-report precedent) | — | — |
| 8 | Bates longest FG | NULL | — | Same | — | — |
| 9 | BUF team sacks | **2.1** | [0, 4] | BUF forced-rate 5.86% × DET 34.7 exp dropbacks, garbage-corrected; cross-check: DET allowed-rate 6.05% × 34.7 ≈ 2.1 | Goff's dropback volume from script model (63%); conversion noise dominates | **DET backup OL (Mahogany/Miller out) is a REAL upside risk, stated qualitatively, not in the number** |
| 10 | DET team sacks | **2.2** | [0, 4] | DET forced-rate 6.95% × BUF 29.7 exp dropbacks, garbage-corrected | Allen's 71%-scramble rushing composition partially avoids sacks (mechanism from §7) | — |
| 11 | Hutchinson sacks | NULL | — | **Literature veto stands:** pressure→sack conversion luck, R² < 0.005 (per props-report §3) | — | (Context: 2.0 sacks Wk1; 11.5 in 2025 on 27 credited QB hits — sticky pressure, not sticky sacks) |
| 12 | Rousseau sacks | NULL | — | Same veto | — | (Context: 2.0 sacks Wk1; 7.0 in 2025 on 23 hits) |
| 13 | BUF team INTs (def takeaways) | **0.3** | [0, 1] | FTN worthy-rate: Goff 1.44% × 34.2 db × 52.3% conv | FTN 2025 charting only; conversion at league average | BUF's +4.1 INTs-over-expected in 2025 → negative regression risk on this line |
| 14 | DET team INTs | **0.5** | [0, 2] | Allen 3.66% worthy × 27.0 db × 52.3% | Allen's danger volume is the signal, not his 10 actual 2025 INTs | Single-game INTs are ~Poisson noise |
| 15 | BUF total takeaways | **1.1** | [0, 3] | 13 INT + 5 fumble-rec / 17g = 1.06/g | Fumble recovery year-to-year corr ≈ 0 — priced at base, not regressed | Takeaway clustering (none of BUF's 5 fumble recoveries are "due") |
| 16 | DET total takeaways | **1.0** | [0, 3] | 12 INT + 5 fumble-rec / 17g = 1.00/g | DET's 26.3% opp-fumble recovery rate argues mild positive regression (not in number) | — |
| 17 | BUF points allowed | **25** | [15, 35] | Naive midpoint: BUF allowed 21.47/g vs DET scored 28.29/g → 24.9 | NO opponent adjustment anywhere | Market implies DET 24.5 (RotoWire) — we agree; short-week/road fatigue for DET unmodeled |
| 18 | DET points allowed | **26** | [16, 36] | Midpoint: DET allowed 24.29/g vs BUF scored 28.29/g → 26.3 | Same | **DET missing both starting safeties is unmodeled upside for BUF scoring** — our 26 sits below market-implied 30.0; that gap is a model-vs-market difference, not an edge |
| 19 | Defensive/ST TD (either team) | NULL | — | ~0.09/g per team in 2025 — not projectable at game frequency | — | — |

*Data: nflverse (CC-BY 4.0); FTN charting via nflverse (CC-BY-SA 4.0). Bass 2024 from `/tmp/pbp2024.csv.gz` (same nflverse release). Computation scripts: `/tmp/kicker_analysis.py`, `/tmp/kicker_defense_analysis.py`, `/tmp/kicker_defense2.py`.*

---

## 3. Comparison with the found line

**"Both teams to make 2+ field goals" +275 (BetMGM)** vs our projections:

- Our numbers imply P(Bates ≥ 2 made) ≈ 40% (Poisson ≈1.38 makes) and P(Bass ≥ 2 made) ≈ 27% (Poisson ≈1.02 makes) → joint ≈ **11%** → fair price ≈ +800.
- Market at +275 implies ≈ 26.7%. **Our number says the line is overpriced by roughly 3× on probability — a directional lean AGAINST, not a pick.**
- Honest caveats: kicker FG volume is bimodal (Campbell's 4th-down calls and McDermott's red-zone conservatism both create fat tails the Poisson model misses); Bass's attempt rate rests on a 2025 team number with a new kicker; and the prop grades on MADE field goals, where our 81–85% make rates are the softest input. A 15-point probability gap with bands this wide is a lean, never a call.

Everything else in §2 has no public line to compare against — those projections stand alone as research inventory for when lines surface (e.g., the parent's odds tooling pulls FanDuel/DraftKings kicker tabs closer to kickoff).

---

## 4. Verdict: is anything here actionable?

**No.** The same bar as the main props report:

1. **One found line, and we lean against it** (both-teams-2+-FGs at +275 vs our ~11%): real directional disagreement, but the uncertainty bands and the bimodal-attempt caveat mean it cannot graduate past "lean."
2. **Our Bass/Bates kicking-points projections (6.8 / 7.2) sit within ~0.5 of independent fantasy projections** (FFC: 7.9/7.6; FantasyPros: Bates 7.4) — convergent, not contrarian. No disagreement worth naming.
3. **The loudest directional factors are qualitative and stay out of the numbers:** DET's backup OL → more sacks allowed (upside on BUF team sacks, our 2.1); DET's missing safeties → more BUF points (upside on DET points allowed, our 26 vs market-implied 30); Bass's rust after a full season out (downside on everything Bass).
4. **Individual sack props stay NULL by the literature veto** — unchanged from the props lab's standing.

**Recommended next steps (not picks):** (a) pull live FanDuel/DraftKings kicker tabs pre-kickoff via odds tooling — the standard kicking-points/FG-made lines exist in-app even when not public; (b) backtest the FG-attempt model (drives × FG-rate) against 2025 Thursday games to see if the ~11% fair price on the both-teams-2+ prop is calibrated; (c) confirm rain/wind at kickoff — it's the one input that would move both kicker rows down simultaneously.
