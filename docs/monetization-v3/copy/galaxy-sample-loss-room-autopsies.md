# Sample Loss Room Autopsies — 3 Worked Examples

**Audience:** Garrett. Internal.
**Purpose:** The Loss Room autopsy template is documented in `copy/loss-room-page-copy.md`. The samples below show the template filled in for 3 different scenarios, demonstrating the voice + structure in action.

**Status:** Sample / illustrative content. Not actual Galaxy autopsies. Use as voice-calibration reference for the first real autopsies.

---

## Sample Autopsy 1: NFL Divisional Round — confidence band 70%

**Published call:** Bills -3.5 vs Chiefs, confidence 70%.
**Result:** Chiefs 27, Bills 24. Bills covered the spread — wait, no: Chiefs won by 3. Bills did not cover.
**Loss Room status:** Wrong call.

---

### What we said

On January 19, the model surfaced the Bills -3.5 vs Chiefs at 70% confidence. The factors that drove the call:

- **Quantitative performance:** Bills had outperformed Chiefs in opponent-adjusted offensive efficiency over the previous 8 weeks (Bills +0.24 EPA/play; Chiefs +0.18).
- **Situational context:** Bills were +4.5 in red-zone differential over the prior 4 games; Chiefs were -1.2. Home-field advantage neutralized (neutral-site game).
- **Personnel:** Kelce listed as questionable but expected to play; Bills' DL fully healthy.
- **Market efficiency:** Line opened at Chiefs -2.5; moved to Bills -3.5 over 96 hours. The sharp-money move was substantial + supported the call.

The factor model surfaced a 70% confidence on Bills -3.5. Above the 65% threshold; published.

---

### What happened

Chiefs 27, Bills 24. Chiefs won by 3, didn't cover the -3.5. The Bills lost outright.

The game was decided by a 4th-quarter Chiefs touchdown drive that included a 41-yard reception from Kelce on 3rd-and-12 with under 5 minutes left. Bills had a final possession that ended in a missed 51-yard field goal.

---

### Why we were wrong

Two factor categories misfired:

1. **Situational context — red-zone differential factor was overweighted.** Bills' red-zone differential was based on regular-season data. Playoffs compress the sample + the Chiefs' divisional defense had specifically been better in red-zone scenarios over the preceding 3 playoff games. The factor weight didn't adjust for playoff-specific data.

2. **Market efficiency — sharp-money signal was misread.** The line movement from -2.5 to -3.5 was interpreted as sharp money on Bills. Post-game review of betting data suggests the actual sharp money was the other direction — taking Chiefs at the inflated -3.5 number — and the public money was on Bills, which moved the line. The factor model treated the line movement as sharp signal rather than public-pushed line.

The other two factor categories (quantitative performance + personnel) were correctly weighted; both pointed mildly toward Bills.

---

### What we learned

Three methodology-level observations:

1. **Playoff sample sizes matter more than regular-season ones for specific factors.** Red-zone differential, third-down efficiency, and other situational factors should weight the most recent playoff games at minimum 2x the regular-season weight. The current factor model treats playoffs as continuous with regular season; it shouldn't.

2. **Line-movement signal needs the public/sharp split, not just the direction.** The factor model uses line movement as a sharp-money proxy. That works in early-week markets but not in late-week playoff markets where public money can move lines significantly. The factor needs a public-money percentage input, not just line direction.

3. **The 70% confidence band is the most-overrepresented band in our Loss Room.** Looking back at the last 6 months of autopsies, 70%-confidence calls have a hit rate closer to 64% than 70%. The factor model is over-confident in the 65-72% band. This is the third autopsy that surfaces this pattern.

---

### What changes

Two methodology revisions are now queued:

**Revision 1 (MINOR, v2.X.Y → v2.X.(Y+1)):** Playoff-specific factor weighting. Red-zone differential, third-down efficiency, situational factors weight recent playoff games at 2x regular-season weight. Effective starting next playoff game.

**Revision 2 (MINOR, v2.X.Y → v2.(X+1).0):** Line-movement factor restructured. Replace pure-direction signal with public/sharp split. Effective when public-money percentage data integration is complete (estimated 2-3 weeks).

**Calibration discipline:** The 70%-confidence band pattern is now under quarterly audit. If the band continues to hit at 64%, the band itself may need recalibration. Tracked in the Q1 2026 calibration audit once that file exists.

These revisions are documented in DEC-NEXT-MODEL-007 + DEC-NEXT-MODEL-008.

---

### Closing note

This was a loss the model could have avoided with better factor weighting. The Bills game is the third autopsy in the past 90 days that surfaces the playoff-weighting issue. We should have made the revision after the second occurrence.

The discipline of publishing the Loss Room only works if the autopsies actually reshape the model. This one does.

---

---

## Sample Autopsy 2: NBA regular season — confidence band 62%

**Published call:** Nuggets -5.5 vs Spurs, confidence 62%.
**Result:** Nuggets 118, Spurs 116. Nuggets won by 2. Did not cover -5.5.
**Loss Room status:** Wrong call.

---

### What we said

On March 4, the model surfaced Nuggets -5.5 vs Spurs at 62% confidence. The factors:

- **Quantitative performance:** Nuggets had a +6.8 net rating over 10 games; Spurs +2.1.
- **Situational context:** Nuggets at home, Spurs on second night of back-to-back. Rest advantage favored Nuggets.
- **Personnel:** Jokic active; Wembanyama active for Spurs; no other significant injury concerns.
- **Market efficiency:** Line was steady at -5.5 across the day. Modest line shop available.

The model surfaced 62% — just above the 60% publication threshold. A marginal call, but above the bar.

---

### What happened

Nuggets 118, Spurs 116. Nuggets won outright but failed to cover -5.5. The game came down to a Spurs fourth-quarter run + a Jokic three-point miss with 8 seconds left that would have effectively iced the cover.

---

### Why we were wrong

One factor category misfired significantly:

**Personnel — Jokic's minutes load wasn't accounted for.** Going into the game, Jokic had played 39+ minutes in 4 of the previous 5 games. The factor model treats "active vs inactive" as binary; it doesn't yet weight cumulative minute-load for star players. Jokic played 34 minutes in the game but his shooting line (8-of-19) was below his season average. The cumulative-fatigue effect likely cost the Nuggets the cover.

The other three categories (quantitative, situational, market) were correctly weighted.

---

### What we learned

1. **Star-player minute load is a real factor the current model doesn't capture.** This is the 5th autopsy in 90 days where a key player's cumulative minutes appear to have affected output. The pattern is clearer in NBA than in NFL (where games are weekly + load doesn't compound the same way).

2. **62% confidence calls are at the publication-threshold floor. The Loss Room rate in this band should be ~38%.** It currently is. The math is honest; the call was within methodology bounds even though it lost.

3. **Marginal calls (60-65% confidence) make the Loss Room more often, by construction.** This isn't a failure mode; it's the methodology working as designed.

---

### What changes

**Revision (MINOR, v2.X.Y → v2.(X+1).0):** Star-player cumulative-minute factor added to the Personnel category for NBA. Definition: cumulative minutes played in the prior 5 games above 175 minutes triggers a downweight on offensive efficiency for that player. Effective when the data ingestion update completes (estimated 1 week).

The 60-65% confidence band remains. Marginal calls are part of the methodology.

---

### Closing note

This loss doesn't suggest the model is wrong about the broader Nuggets-Spurs matchup. It suggests the model is missing one specific Personnel-category factor for NBA. The revision queued is targeted, not structural.

Calls in the 60-65% band will continue to make the Loss Room. That's the math, honestly published.

---

---

## Sample Autopsy 3: MLB Regular Season — confidence band 68%

**Published call:** Dodgers ML (-180) vs Pirates, confidence 68%.
**Result:** Pirates 4, Dodgers 3. Dodgers lost.
**Loss Room status:** Wrong call.

---

### What we said

On June 12, the model surfaced Dodgers ML at 68% confidence. The factors:

- **Quantitative performance:** Dodgers +0.18 expected runs/game over 30 games; Pirates -0.21.
- **Situational context:** Dodgers home, day game, optimal weather for pitching. Pirates traveling from a road trip.
- **Personnel:** Yamamoto pitching for Dodgers (3.12 ERA on the season); Mitch Keller for Pirates (4.62 ERA).
- **Market efficiency:** Line opened at Dodgers -165; moved to -180 by game time. The line move supported the model's read.

The model surfaced 68%. Above the 65% threshold; published.

---

### What happened

Pirates 4, Dodgers 3. The Pirates scored 3 runs in the first inning off Yamamoto including a 2-run home run. The Dodgers came back to tie the game in the 6th but a Pirates solo home run in the 8th proved decisive.

---

### Why we were wrong

This one is the hardest type of loss to autopsy: the model was directionally correct, the inputs were sound, and the outcome was a variance-driven loss.

**Quantitative performance:** Dodgers' expected runs/game was correct.
**Situational context:** Conditions favored the Dodgers; played out roughly as expected.
**Personnel:** Yamamoto had a bad first inning — his ERA on the season is 3.12, but on this specific day he gave up 3 runs in the first inning. This happens.
**Market efficiency:** Line move was correctly interpreted; just didn't predict outcome.

The factor weighting was correct. The probability of the outcome was always 32%. Today, the 32% materialized.

---

### What we learned

1. **68% confidence calls should hit at ~68% over time.** A single loss at 68% is not a methodology signal; it's calibration working. The Loss Room records the loss even when the model isn't structurally wrong.

2. **MLB variance is higher than NFL or NBA per game.** Daily MLB calls in the 60-70% band will produce a steady stream of Loss Room entries even when the factor model is correctly calibrated. The Almanac will show this pattern clearly.

3. **The autopsy doesn't always surface a methodology revision.** Some losses are honest variance. The transparency is in saying so, not in inventing causes.

---

### What changes

**No methodology revision triggered.** This is the second 68%-confidence MLB loss in the past 30 days where the factor weighting appears correct + the loss appears variance-driven. The pattern doesn't yet warrant a revision; the calibration tracker continues to monitor.

**Calibration check:** Through 60 published MLB calls in the 65-75% confidence band over the past 90 days, the actual hit rate is 69% (target: ~70%). Calibration is holding.

---

### Closing note

Galaxy publishes the Loss Room not because every loss is a methodology failure, but because every loss is part of the record. Some losses surface revisions. Some losses are honest variance.

This one is the second category. The model called the game correctly, the factor weights were sound, the outcome materialized in the 32% world. Recording the loss + naming it as variance-driven is the discipline.

The methodology is the bet. The bet doesn't change because of one Dodgers loss.

---

---

## What these samples demonstrate

Across the 3 autopsies:

| Sample | Methodology issue surfaced | Revision triggered |
|---|---|---|
| 1 (NFL) | Yes — playoff weighting + line movement signal | Yes (2 revisions) |
| 2 (NBA) | Yes — star-player minute load not modeled | Yes (1 revision) |
| 3 (MLB) | No — variance-driven loss | No revision |

The Loss Room handles all three cases honestly. Each autopsy:

- States the original call + reasoning in detail.
- Names what happened factually.
- Diagnoses the factor-level cause (or names variance).
- Documents the methodology revision (or lack thereof).
- Closes with brand-position-aligned framing.

---

## Voice constraints to maintain

When writing real Loss Room autopsies, hold these:

1. **Specific over generic.** Each autopsy names the exact factors + the exact weights.
2. **Honest over performative.** No flagellation; no "we're terrible at this." Calibrated honesty.
3. **Methodology-first.** Every autopsy connects back to factor categories + confidence bands.
4. **Variance-acknowledged when real.** Not every loss is a methodology failure; say so when true.
5. **Brand-position closing.** Each autopsy closes with a sentence anchoring the discipline.

---

## What these samples deliberately AVOID

1. **Apologies for losing.** The autopsy isn't a sorry; it's a record.
2. **Speculation about outcomes.** No "if only X had happened" counterfactuals.
3. **References to specific bettors.** The autopsy isn't about anyone's results except Galaxy's call.
4. **Sportsbook critique.** Galaxy doesn't take shots at the books in the autopsy.
5. **Marketing of methodology improvements.** The revision is documented; the marketing isn't.

---

## Cross-references

- Loss Room page copy: `copy/loss-room-page-copy.md`
- Loss Room autopsy template: `copy/loss-room-page-copy.md` § "Autopsy structure"
- Methodology page copy: `copy/methodology-page-copy.md`
- Methodology revision protocol: `copy/galaxy-methodology-revision-protocol.md`
- Galaxy brand voice canonical: `galaxy-brand-voice-canonical.md`
- Decision rights matrix: `galaxy-decision-rights-matrix.md`
- Quarterly data review template: `copy/vault-quarterly-data-review-template.md`

---

*The Loss Room is Galaxy's central brand artifact. The autopsies above are calibration references for the first real entries. Voice + structure + honesty — the discipline is the practice.*
