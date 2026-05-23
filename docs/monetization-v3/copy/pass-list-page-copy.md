# Pass List — Page Copy + Entry Template

**Route:** `/passes`
**Audience:** Public. The Pass List is the second-most-differentiating Galaxy surface after the Loss Room. Pairs with `/loss-room`.
**Update cadence:** New entries within 4 hours of each pass decision. ~10–20 entries per day.

---

## Page-level copy (the /passes landing)

```
The Pass List

Every game we considered publishing and chose not to. Archived.

Most platforms show only what they did publish. Galaxy archives what we didn't — because the discipline of restraint is more visible when it leaves a record.

Each entry below records the game we surfaced, our model's confidence at the moment of pass, the model version, and the category of reason. Mid-difficulty passes carry a short note explaining why the call was close.

— Pass categories

Galaxy passes for one of five reasons:

A — Confidence below floor. Standard publications require 60% confidence; mid-series publications require 65%. Below floor → pass.

B — Factor quality concern. Confidence above floor, but the dominant factor in the call depends on data that's still settling (late injury news, projected lineup, etc.). When the factor data isn't trustworthy at publication time, we pass.

C — Cross-model disagreement. Galaxy's confidence is in band but the two external models we benchmark privately are below our threshold. Disagreement triggers extra review and frequently a pass.

D — Methodology change in flight. A model version is shipping that would affect this publication's confidence; we pass rather than publish under a version we're about to retire.

E — Line-movement disagreement. The line has moved meaningfully against our position between factor computation and publication; we pass rather than chase the new line.

Read the publication process for how passes get categorized: /methodology#publication-process.
```

That's the page header. Below it: chronological pass entries in a compact table.

---

## Pass entry — compact format (the default)

Each pass is one row in a sortable table. ~10–20 rows added daily.

| Date | Game | Sport | Confidence | Version | Category | Notes |
|---|---|---|---:|---|---|---|
| 26 May | NYK @ IND G6 | NBA | 64% | v5.2 | A | Below 65% mid-series floor |
| 26 May | LAL @ DAL | NBA | 58% | v5.2 | A | — |
| 26 May | PIT @ CHC | MLB | 62% | v5.2 | B | Starting catcher status pending |
| 26 May | DET @ KCR | MLB | 63% | v5.2 | C | External models at 56%, 57% |
| 26 May | NJ @ NYR G7 | NHL | 67% | v5.2 | D | v5.3 shipping with rest-factor adj. |

The compact format renders 30+ passes per page. Readers scan; deeper engagement requires clicking through to expanded entries.

---

## Expanded entry — for instructive passes

Some passes are unusually instructive. These get an expanded entry below the table — typically 1 entry per day, 5–7 per week.

### Expanded entry template

```
## [Date] · [Game]
**Category:** [A / B / C / D / E]
**Confidence at pass:** [N%]
**Model version:** [vX.X]

— Why this pass

[2–3 paragraphs. What the model surfaced, what got it close to publication, why the publication threshold caught it.]

— Why this pass is instructive

[1 paragraph. The reader can take something useful from understanding this pass beyond the bare fact of it. Example: "This pass illustrates how the cross-model sanity check (Gate 3) works in practice — confidence in band, but external models below, so we held off." Or: "This pass illustrates the factor quality concern threshold — the call was strong on paper but rested on a player's status that wasn't finalized by 16:00 game-day."]

— What happened post-pass

[1 paragraph. The game outcome + brief reflection on whether the pass was correct in retrospect. Be honest — sometimes the pass was overly cautious; sometimes it was exactly right.]

— Filed by Galaxy · [Date]
```

### Sample expanded entry

```
## 26 May 2026 · NYK @ IND Game 6
**Category:** A — Confidence below mid-series floor
**Confidence at pass:** 64%
**Model version:** v5.2

— Why this pass

The model surfaced Pacers +4.5 at 64% confidence, driven by Pacers' offensive efficiency with Haliburton on the floor (121.8) vs without him (109.2). With Haliburton listed as questionable Monday morning, the model's factor weighting placed a 78% probability on Haliburton playing at near-full minutes, compounded with the team's home offensive baseline.

The 64% confidence was above Galaxy's standard 60% publication floor. But Game 6 in a 3-2 series is mid-series; the 65% floor applies.

64% < 65%. Pass.

— Why this pass is instructive

This pass illustrates the mid-series threshold doing its job. The model's confidence was real (factor data supported it), but the additional caution required for elimination-game contexts kept the publication below threshold by 1 percentage point. Without the mid-series carve-out, this would have been a published call.

— What happened post-pass

Haliburton played 38 minutes at ~85% of normal output. Pacers covered +4.5, winning by 3 in overtime. In retrospect, the publication would have been a win. The pass was correct in process — the methodology said pass — and that's the relevant standard, not the outcome.

— Filed by Galaxy · 27 May 2026
```

### Expanded entry — writing rules

1. **Pick the most instructive pass each day.** Not every pass needs an expanded entry. Pick the one that teaches a meta-lesson about the methodology — typically the close calls (within 2-3 percentage points of the floor) or the procedurally interesting ones (cross-model disagreement, methodology-change-in-flight).

2. **Don't reveal exact factor weights.** Like the autopsies, expanded pass entries describe factor categories (e.g., "offensive efficiency with player on floor") without naming the specific weight assignment.

3. **Be honest about outcome reflection.** If a pass was overly cautious and would have been a win, say so. If it was right and the game played out as the model expected, say so. Don't selectively narrate.

4. **The instructiveness must be real.** If today's most-instructive pass is genuinely no more interesting than the others, skip the expanded entry. Don't manufacture significance.

---

## Page-level interaction notes (for Codex engineering)

### Visual treatment

- Compact table: dense rows, sortable + filterable.
- Expanded entries: below the table, anchored.
- Filters: sport, date range, pass category, confidence band.
- Search: by team name, game date, model version.
- Each pass has a permalink (e.g., `/passes/2026-05-26-nyk-ind`).

### Aggregate views

A `/passes/patterns` sub-page surfaces:

- Pass distribution by category over the rolling 6 months.
- Sport-specific pass patterns (e.g., "NHL passes for line-movement disagreement happen 2x more often than NBA").
- Confidence-band distribution (where in the 60–65% band do most "A" passes land?).
- Hindsight calibration: of passes Galaxy made in the prior 90 days, what % would have been wins if published? (This is the "we held back" check — if the percentage is way above or below 50%, the floor may be miscalibrated.)

The hindsight calibration sub-page is rare honesty. Most platforms don't quantify their passes. Galaxy publishes the data because the data is part of the methodology audit.

### Linking pattern

Every pass entry can link out to:
- The methodology page (specifically the relevant publication-process gate).
- The model version changelog (so a reader knows which version made the pass).
- A relevant Vault digest (if the pass was discussed in members-only depth).

### Privacy + edge cases

- The Pass List does NOT include games the model didn't surface at all. Galaxy surfaces ~25–35 games per day; ~5 become publications, ~10–20 become passes, the rest don't surface above the model's initial threshold and don't appear on either list.
- Pass List entries are public. Vault members can see the same entries — there's no Vault-only version.
- Pass List entries are permanent. Galaxy does not delete passes after the fact.

---

## What the Pass List page is FOR

Galaxy's brand position depends on the discipline of restraint being visible. The Pass List makes restraint visible.

A reader who clicks /passes and sees 200 entries from the past week understands viscerally that Galaxy considered a lot more games than it published. The volume is the point.

The Pass List also:
- Lets members audit Galaxy's publication threshold. If a member disagrees with a specific pass, the entry is referenceable.
- Provides material for autopsy comparisons. A pass that was hindsight-correct is reusable as a methodology validation.
- Serves as the Almanac's Chapter 4 (Pass List Archive). Annual snapshot is bound in the book.

---

## What the Pass List page is NOT

1. **Not a "shoulda picked these" archive.** Galaxy doesn't second-guess passes by aggregating "we would have won X% of these" stats in a way that suggests floors should be lower. The hindsight check exists, but as a calibration tool, not as a critique of restraint.

2. **Not a public reasoning trace.** Galaxy doesn't publish the full factor model evaluation for each pass. The category (A-E) + confidence number is the visible level; the deeper reasoning lives in the methodology + autopsies + Vault digests.

3. **Not a pre-publication pipeline view.** Games the model is still evaluating that haven't yet reached pass-or-publish don't appear. Only final pass decisions get archived.

4. **Not a future-game indicator.** Pass List archives are historical. They are not signals about how Galaxy might publish future games involving the same teams.

---

## Drift patterns to watch for

Like the Loss Room, the Pass List can drift from brand position predictably.

### Drift 1: Pass volume drops as Garrett gets tired

The publication threshold is the discipline. If Garrett gets tired or pressure-feels-needed, the floor may move down without explicit decision-log entry.

**Counter:** monthly KPI ritual tracks pass volume. If pass count drops below 200 in a typical month (down from baseline ~300–400), investigate. Either the model is surfacing fewer candidate games (real signal) or Garrett is publishing more aggressively (drift).

### Drift 2: Expanded entries get sparse

The "most instructive pass of the day" entries are extra work. They can get skipped.

**Counter:** weekly retrospective includes a check on expanded entries. Target: 5 expanded entries per week. If consistently under 3, the Pass List loses its "show-the-work" quality.

### Drift 3: Aggregate patterns get stale

The `/passes/patterns` page updates quarterly. If the quarterly update slips, the page becomes a dead artifact.

**Counter:** quarterly retrospective explicitly schedules the patterns update. Block calendar time.

---

## Cross-references

- Methodology page (the publication-process framework this implements): `methodology-page-copy.md`
- Loss Room (the sibling discipline-visible surface): `loss-room-page-copy.md`
- The board (where live publications are): `/board` (Codex builds)
- The Ledger (where settled picks land): `/ledger` (Codex builds)
- Galaxy Almanac chapter 4 (Pass List Archive): `copy/almanac-production-pack.md`
- Brand voice rules: `galaxy-brand-voice-canonical.md`
- Operating values (restraint as identity): `galaxy-operating-values.md`

---

*The Pass List is the surface Galaxy is hardest to copy. Competitors can ship a Loss Room equivalent in a quarter. A working Pass List requires real publication discipline, an honest hindsight calibration tool, and years of accumulated entries. Build entries patiently; the archive becomes the moat.*
