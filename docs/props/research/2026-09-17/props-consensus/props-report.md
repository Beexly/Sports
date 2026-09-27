# Props Consensus vs Our Projections — Bills vs Lions, 2026-09-17

**Kickoff:** 7:15 PM CT, New Highmark Stadium. **Lines as of:** ~14:00 CT 2026-09-17 (pre-kickoff, lines moving).
**Status:** RESEARCH ONLY. Nothing here is a pick. The engine gate stands: findings go to Garrett, he decides what ships.

**Files:**
- `consensus_lines.csv` — 52 timestamped book-identified rows (Workstream 1)
- `sources_notes.md` — method, movement log, gaps, source ranking, roster corrections (Workstream 1)
- `our_projections.csv` — 29 projections with uncertainty bands + 7 NULLs (Workstream 2)
- `projection_methods.md` — full method appendix (Workstream 2)
- `scratch/` — raw nflverse downloads, computation script, per-player game logs

---

## 1. Props-lab history: what died before this (do not re-litigate)

From `~/workspace/vendor/Sports/docs/ops/AGENT.md` (2026-09-15 architect verdict) and `~/workspace/gse-discovery/minis-props-followup-prompt.md`:

- **H1 / L1 — Cold/wind x passing exposure.** Spec: `logit P(complete) = a + b·base + c·(ColdWindy × PlayAction)` on FTN charting 2022–2025 joined to pbp. Pre-registered kill lines. **KILLED:** c = +0.082 sign flip vs pre-registered negative; OOS ΔLL ≈ −0.00003 vs 0.002 nats/attempt threshold; game-clustered 90% CI [−0.012, +0.177] covers 0. Kill is clean (1,000 within-season refits + 2,000-draw clustered bootstrap).
- **H2 / L2 — Revenge games, within-player.** Spec: player targets/receptions in revenge games vs same player's trailing-5-game mean, player fixed effects. **KILLED:** FE revenge effect = −0.366 targets/game, CI [−0.598, −0.119] — sign OPPOSITE the hypothesis, confounded with post-transfer role decline. First-pass geometric mean self-flagged as artifact.
- **H3 / L5 — Hierarchical pooled compound test (lane-closing).** Spec: partial pooling of c₃ across four state families. **KILLED:** pooled c₃ = +0.046, SE 0.148, 90% CI [−0.197, +0.290] covers 0; every family CI covers 0. Pre-registered closure condition met: **"compounding is not detectable at NFL game frequencies with public pre-kickoff information."** Game-level branch formally closed.
- **L3 — Starter-weighted unavailability → props pricing gap.** SHELVED (not killed, not supported): data-blocked — no per-player prop odds history (Odds API keys unset; production OddsLineSnapshot is game-level, not per-player).
- **Open:** O-1 (gate amendment file missing on Minis host); Minis mirrors + AGENT.md uncommitted, push awaits Garrett's word.

**Standard carried into this work:** the lab died on honest nulls. A projection that disagrees with the market is a hypothesis, not an edge, until validated. That standard is applied below without exception.

---

## 2. What the market says (Workstream 1 — public sources only)

**Coverage reality:** 52 rows, but nearly everything is single-book FanDuel (via SportsGrid, over-side juice only). No Pinnacle/Circa numbers are public anywhere. No defensive props, no individual kicker props, no first-TD board found. **No true cross-book consensus was reachable** — treat "consensus" below as best-available, not a real median.

**Game lines:** Total 54.5 (FanDuel and BetMGM agree; opened 52.5 → 53.5 → 54.5). Spread Bills −4.5 to −5 (opened −3). Moneyline Bills −225 to −235.

**Book-identified player lines** (standard thresholds only):

| Player | Prop | Line | Book | Juice shown |
|---|---|---|---|---|
| J. Allen | Passing yards | 250.5 | DraftKings | O −111 |
| J. Allen | Pass attempts | 31.5 | FanDuel | O −114 |
| J. Allen | Passing TDs | 1.5 | FanDuel | U +136 |
| J. Allen | Rushing yards | 31.5 | FanDuel | O −113 |
| J. Allen | Anytime TD | −140 | BetMGM | — |
| J. Goff | Passing yards | 257.5 / 267.5 | FanDuel / BetMGM | O −113 / U −115 |
| J. Goff | Pass attempts | 36.5 | FanDuel | O −102 |
| J. Cook | Rushing yards | 78.5 | FanDuel | U −113 |
| J. Cook | Receiving yards | 17.5 | FanDuel | O −113 |
| J. Gibbs | Rushing yards | 89.5 | DraftKings | O −112 |
| J. Gibbs | Receiving yards | 30.5 | FanDuel | O −113 |
| J. Gibbs | Receptions | 4.5 | FanDuel | O +112 |
| J. Gibbs | Anytime TD | −275 | Sports Interaction | — |
| A. St. Brown | Receptions | 7.5 | DraftKings | O −111 |
| A. St. Brown | Anytime TD | +115 | Sports Interaction | — |
| J. Williams | Receiving yards | 57.5 | FanDuel | O −113 |
| J. Williams | Receptions | 3.5 | FanDuel | O −148 |
| S. LaPorta | Receiving yards | 46.5 | FanDuel | O −113 |
| S. LaPorta | Receptions | 4.5 | FanDuel | O +102 |
| S. LaPorta | Anytime TD | +230 (+220 in body) | bet365 | — |
| D. Kincaid | Receiving yards | 52.5 | FanDuel | O −113 |
| D. Kincaid | Receptions | 3.5 | FanDuel | O −162 |
| K. Shakir | Receiving yards | 44.5 | FanDuel | O −113 |
| K. Shakir | Receptions | 4.5 | FanDuel | O +112 |
| DJ Moore | Receiving yards | 63.5 | FanDuel | U −113 |
| DJ Moore | Receptions | 4.5 | FanDuel | U −118 |

**Roster corrections (verified in play-by-play and rosters):** David Montgomery plays for **Houston** (no Detroit prop exists — omitted, not missed). DJ Moore plays for **Buffalo** (trade from Chicago). Detroit's RB2 is Sion Vaki by Week 1 usage. Detroit is down LG Mahogany + RT Miller (ruled out), safeties Branch + Joseph (PUP); CB D.J. Reed questionable.

---

## 3. What our data says (Workstream 2 — our nflverse computations)

29 projections from re-downloaded nflverse play-by-play (2025: 29,239 filtered plays; 2026 Wk1: 1,673), filters reproduced exactly from `COMPUTATION_NOTES.md`. Base = 2025 per-game means; Week 1 = role-check only (efficiency never blended). Volume uses **script-adjusted dropback rates measured by WP bucket** (BUF 53% as −5.5 favorite, DET 63% as trailing underdog), carry/target shares with overlap-game denominators, and **measured garbage-time ratios** (+3–11%) since props settle on full games. Deeper metrics used: unit EPA splits (qualitative modifiers only — our numbers are NOT opponent-adjusted), drive stats (BUF 35.3% TD rate, DET 29.0%; both ~20% three-and-out), early-down run splits (all three backs >86% early-down — game-script sensitive), explosive rates. Originality angles: INT props from FTN interception-worthy rates (Allen 3.66% worthy vs Goff 1.44%); **sack props deliberately NULL** (pressure→sack conversion luck, R²<0.005 — literature applied as veto); Allen's 71%-scramble rushing composition and 48% RZ rushing-TD rate flagged as his real TD mechanism.

7 NULLs with stated reasons: Montgomery (VOID — on HOU), Vaki (role too thin), longest reception (pure noise), individual sacks (conversion luck), Milano/Bernard tackles (rotational noise).

---

## 4. The comparison: agreements and disagreements

**How to read this:** "Gap" = our projection minus the line. Every line below sits INSIDE our uncertainty band — there is not a single statistically defensible edge on this slate. Leans are directional only.

### Agreements — we are at the market (9 props, no edge either way)

| Prop | Line | Ours | Gap |
|---|---|---|---|
| Gibbs rushing yards | 89.5 (DK) | 95 [50,140] | +5.5 — coin flip |
| Allen rushing yards | 31.5 (FD) | 34 [14,54] | +2.5 |
| Allen passing TDs | 1.5 (FD) | 1.5 [0,3] | 0 |
| Goff pass attempts | 36.5 (FD) | 35.5 | −1 |
| Gibbs receptions | 4.5 (FD) | 4.7 [2,7] | +0.2 |
| Shakir receiving yards | 44.5 (FD) | 41 [16,70] | −3.5 |
| Shakir receptions | 4.5 (FD) | 4.2 [2,7] | −0.3 |
| Moore receiving yards | 63.5 (FD) | 60 [25,95] | −3.5 |
| Moore receptions | 4.5 (FD) | 4.5 [2,7] | 0 |

### Disagreements — directional leans, all inside our bands (12 props)

| Prop | Line | Ours | Gap | Honest read |
|---|---|---|---|---|
| Allen passing yards | 250.5 (DK) | 201 [135,265] | **−49.5** | Largest raw gap. UNDER lean, but band covers the line; market weights Wk1 form (334 yds) + DET safety absences + 54.5 total — legitimate, partially unmodeled in our numbers. Lean, not a call. |
| LaPorta receiving yards | 46.5 (FD) | 79 [38,108] | **+32.5** | Largest receiving gap. OVER lean on role (when-active 17.2% share, Wk1 confirms), but n=9 active games + real injury history. Not a strong call. |
| Cook rushing yards | 78.5 (FD) | 102 [52,150] | +23.5 | OVER lean; Cook's 5.42 YPC is elite and may regress; band is ±50. |
| J. Williams receiving yards | 57.5 (FD) | 77 [25,120] | +19.5 | Weak OVER lean; boom/bust deep-threat role, band ±47. |
| Goff passing yards | 257.5–267.5 | 282 [215,355] | +15 to +25 | Weak OVER lean; band ±70 swallows it. |
| Kincaid receiving yards | 52.5 (FD) | 63 [29,96] | +10.5 | Weak OVER lean; Wk1 role bigger than 2025 (n=1). |
| Gibbs receiving yards | 30.5 (FD) | 38 [10,70] | +7.5 | Weak OVER lean. |
| Allen pass attempts | 31.5 (FD) | 26 [20,32] | −5.5 | Mild UNDER lean; line at top of band. Favorite-script effect. |
| LaPorta receptions | 4.5 (FD) | 6.2 [4,8] | +1.7 | Weak OVER lean. |
| J. Williams receptions | 3.5 (FD) | 4.6 [2,7] | +1.1 | Weak OVER lean; note −148 juice on the over. |
| Kincaid receptions | 3.5 (FD) | 4.2 [2,6] | +0.7 | Weak OVER lean; −162 juice. |
| St. Brown receptions | 7.5 (DK) | 8.0 [4,12] | +0.5 | Hair over; most stable role on the slate. |

**Structural pattern:** our model systematically projects MORE Detroit receiving production than FanDuel's lines (LaPorta +32.5, J. Williams +19.5, Gibbs +7.5 receiving, ASB +0.5 catches). The mechanism is our script model: DET at a 63% dropback rate as a trailing underdog throws ~35 times; Goff's 2025 target concentration (ASB 30%, J. Williams 17%, Gibbs 16.5%, LaPorta 17% when active) distributes that volume generously. If the market is pricing a closer, lower-volume Detroit script — or pricing in the two missing starting linemen degrading dropback efficiency — the gap is model-vs-model, not model-vs-mistake. Our numbers are not opponent-adjusted and do not price the OL injuries; the market line may be doing both.

**The Allen-250.5 gap, dissected** (the slate's most interesting disagreement): HelloRookie documented Allen steaming from ~219.5–223.5 to 250.5 on Week 1 form (334 yards, 4 TDs). Our 201 comes from 2025 base (7.83 yds/att) × script-adjusted volume (24.9 attempts as a −5.5 favorite). The truth likely sits between: our number ignores that Detroit is missing both starting safeties (genuine deep-ball upside risk for BUF), while the market may be over-weighting one game. A 50-yard gap with a ±65-yard band and a named unmodeled risk on the other side = a lean, never a play.

---

## 5. Assumptions (all of them — see projection_methods.md §8 for full text)

Pace 56/55 plays; script 53%/63% dropback rates; QB full-game shares; Montgomery on HOU (Gibbs ~88% of designed rushes); BUF target shares from Wk1 n=1 (Moore's arrival makes 2025 shares stale) with SE ~8pp stated; DET shares from 2025; overlap-game denominators for missed games; 2025 efficiency carried forward; NO opponent adjustment anywhere. Unmodeled qualitative factors (not smuggled into numbers): DET down two starting OL (Mahogany, Miller — downside for Goff/Gibbs), DET missing both starting safeties (upside for entire BUF pass game; the main counterweight to the Allen-under lean), D.J. Reed questionable, new-stadium crowd noise, Thursday short-week road fatigue for DET.

## 6. Nulls (7)

Montgomery DET rows VOID (on HOU). Vaki rushing NULL (2 Wk1 carries, zero 2025 touches — no projectable role). Longest reception NULL (single-play extreme = noise). Individual sacks NULL — deliberate literature veto (conversion luck R²<0.005). Milano/Bernard tackles NULL (per-game sd ≈ mean; rotational noise; Bernard's 11-tackle Wk1 is n=1).

## 7. Verdict: is anything here actionable?

**No.** The honest summary of this slate:

1. **9 props where we agree with the market** (coin flips — including Gibbs rushing yards, the most-bet Detroit prop).
2. **12 directional leans, every one inside our uncertainty bands.** The two largest raw gaps (Allen passing yards under ~50, LaPorta receiving yards over ~33) both carry named, unmodeled risks that cut against them.
3. **A structural model-vs-market difference** on Detroit's passing volume (trailing-script dropback rate vs a market possibly pricing OL injuries and a closer game) — interesting, but our side lacks opponent adjustment, so it cannot be scored as edge.

**What would make this stronger:** (a) opponent-adjusted efficiency in the numbers, not as qualitative modifiers; (b) a real multi-book consensus (we had single-book FanDuel for most props; no Pinnacle/Circa anywhere); (c) inactives confirmation (Reed, Vaki's role, Moore's status); (d) a backtest — do our projections beat market lines historically? Without (d), every gap above is a hypothesis. That is the props-lab lesson, applied.

**Recommended next step (not a pick):** backtest the projection method against 2025 Weeks 1–18 closing prop lines. If the method's gaps predict line errors out-of-sample, the leans graduate to edges. Until then, this work stays research.

---
*Research only. Nothing here is a pick. Data: nflverse (CC-BY 4.0); FTN charting via nflverse (CC-BY-SA 4.0). Lines: public book pages, fair-use line values only, fetched 2026-09-17 ~14:00 CT.*
