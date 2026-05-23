# Sample Model Journal Entry — Full Draft

**Audience:** Garrett. Internal.
**Purpose:** The Model Journal template is documented in `copy/model-journal-template.md`. The sample below shows the template filled in for a real-feeling weekly entry, demonstrating voice + structure.

**Status:** Sample / illustrative content. Use as voice-calibration reference for the first real Model Journal entry.

---

# Galaxy Model Journal — Week of October 6, 2026

*A weekly note on what the methodology did, what it surfaced, and what it changed.*

---

## The week in numbers

- **Published calls:** 6 (3 NFL, 2 NBA, 1 college football).
- **Pass List entries:** 14 (8 NFL, 4 NBA, 1 college, 1 MLB postseason).
- **Loss Room autopsies posted:** 2 (1 NFL, 1 NBA).
- **Calibration this week:** 4-of-6 published calls hit. Within the expected band for a week.

The Pass List rate (14 held vs 6 published, 70% pass rate) is roughly in line with the season average. Three of the 14 holds were methodology-gap; eight were market-efficient line reads; two were personnel-uncertainty; one was brand-position consideration on a primetime SEC rivalry.

---

## The factor model this week

The model held v2.3.1 across the week — no revisions deployed.

One revision is queued for review next week: the **playoff-weighting adjustment** documented in the September 29 Loss Room autopsy of the Bills/Chiefs game. The backtest is complete; calibration impact is +0.4% in NFL playoff-specific games. Will deploy October 14 if Q4 prep work doesn't surface new issues.

The **star-player minute-load factor** for NBA, queued since August, deployed Monday. First week of live use produced what looks like a modest improvement in 65-72% confidence calibration but the sample is too small to claim. Tracking through November.

---

## A question I'm sitting with

Across this week's Pass List entries, the **market-efficiency category** dominated (8 of 14). That's higher than the 60-day average (about 50% of holds).

Two readings of what that means:

1. **NFL Week 6 is a high-information week.** Books have settled on each team's tendencies; sharp money has cycled through; the market is more efficient than it was Week 1 or 2. The Pass List rate would naturally lean market-efficient at this point in the season.

2. **The factor model is becoming less differentiated from the market.** As the season progresses + the model's inputs converge with public information, the model's 60%+ confidence calls increasingly match what the market has already priced in. The edge is in the gap; the gap is shrinking.

Reading 1 is the optimistic frame. Reading 2 is the brand-position frame.

Both could be true. I'm not certain which dominates. The Q4 quarterly audit will examine whether this is seasonal (typical NFL Week 6 pattern) or structural (factor model converging with the market).

If it's structural: the methodology needs a contrarian-signal layer. Some way to identify when the model has a defensible read *against* what the line is implying. The current factor structure treats market alignment as confirmation; a contrarian layer would treat strong market alignment as a publication penalty.

Considering for v3.0 (MAJOR revision, Year-2). Not for v2.x.

---

## A reader question I'm answering

A Vault member asked in office hours last Tuesday: *"How do you know when a Pass List call should have been published?"*

Honest answer: most of the time, we don't.

Each Pass List entry has a documented reason for the hold. After the game plays out, we know whether the entry would have won or lost. But "would have won" doesn't mean "should have been published." Published calls require a defensible methodology read at the time of decision — not retrospective vindication.

A Pass List entry that turns out to have been a winner doesn't retroactively become a missed publication. The hold was the right call at the time. Galaxy doesn't add "published-after-the-fact" entries; the Pass List archive stays honest.

That said: if a pattern emerges where Pass List entries in a specific category consistently win after the fact, that's signal that the publication threshold for that category is too restrictive. That's how methodology improves — not by chasing individual missed games but by examining the aggregate.

This is brand-position discipline. The Pass List isn't a regret log; it's a methodology log.

---

## A loss I'm still thinking about

The October 1 Lions/Vikings call (published at 67%, lost) is the Loss Room autopsy from earlier this week. The factor read was sound; the variance materialized.

What I'm still sitting with isn't whether the call was wrong (the autopsy concludes it was an honest loss) but whether the **65-72% confidence band** is publishing too aggressively in the divisional-rivalry context.

Across the last 30 NFC divisional-rivalry games published, the actual hit rate is 61%. The band's expected hit rate is 68%. That's a 7-point gap.

Three explanations:
1. Random variance in a 30-game sample (most likely).
2. Divisional rivalries have higher inherent variance the model isn't pricing in.
3. The market specifically prices divisional rivalries differently and the factor model isn't capturing the divergence.

If 2 or 3 is true: methodology revision. If 1 is true: continue tracking.

Next 30 NFC divisional games will clarify. Not making a revision this week on a 30-game sample.

---

## What I'm building next

Two things on the bench:

1. **Public methodology page revision.** The current methodology page documents the four factor categories but doesn't address how the calibration process works week-to-week. Adding a section on "how the model recalibrates" by Q4 close.

2. **Almanac Year-1 essay drafts.** Started the first three essays this week. The "Loss Room: One Year In" essay is the one I want to nail. It anchors the Almanac.

---

## Closing note

This was a quiet week. 6 published calls is the lower end of the typical NFL Week range. 70% Pass List rate is the higher end. The discipline this season is leaning toward restraint over publication.

That's the methodology working as designed. Members who joined Vault for hot-takes-per-game would be disappointed. Members who joined for methodology + transparency get what they paid for.

Year-1, Week 6. The bet continues.

— Garrett

---

## Cross-references

- Model Journal template: `copy/model-journal-template.md`
- Loss Room page copy: `copy/loss-room-page-copy.md`
- Pass List page copy: `copy/pass-list-page-copy.md`
- Methodology page copy: `copy/methodology-page-copy.md`
- Methodology revision protocol: `copy/galaxy-methodology-revision-protocol.md`
- Almanac essay outlines: `copy/galaxy-almanac-essay-outlines.md`

---

*The Model Journal is Galaxy's weekly methodology voice. The sample above demonstrates the form: data, then question, then reader engagement, then loss reflection, then forward direction, then quiet close. Restraint, substance, honest uncertainty.*
