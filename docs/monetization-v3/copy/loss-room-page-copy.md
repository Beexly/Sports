# Loss Room — Page Copy + Autopsy Entry Template

**Route:** `/loss-room`
**Audience:** Public. The Loss Room is Galaxy's most differentiating surface and the page most journalists, members, and prospects link to.
**Update cadence:** A new autopsy entry within 48 hours of every settled losing publication.

---

## Page-level copy (the /loss-room landing)

```
The Loss Room

Every settled losing pick. Every autopsy. Public.

Most sports analytics platforms hide their losses. Galaxy archives them with the same page count as the wins. Each losing publication gets a forensic autopsy: which factor drove the call, which assumption broke, what the model would have done with hindsight.

The autopsies are organized by date below. Each entry is permanently linkable. Patterns across many autopsies feed back into the model changelog at /methodology/changelog.

— Autopsy taxonomy
The five root causes Galaxy tags:

01 — Factor underweighted: the model had the right factor but didn't weigh it enough.
02 — Factor-interaction blind spot: the model had the relevant factors but didn't compose them correctly.
03 — Sample-size noise: the publication was correct in process; the outcome was within expected variance.
04 — Line-movement misread: factor weighting was correct, but the line moved in a way that changed expected value.
05 — Model-version known weakness: the model version that generated the publication had a known limitation.

Read the methodology page for how the framework works: /methodology#autopsy-framework.
```

That's the page header. Below it: chronological autopsy entries.

---

## Autopsy entry template

Every autopsy entry uses the same five-section structure. Each entry is approximately 300–500 words. Garrett writes from a structured template; Claude can draft from factor data but the analysis is Garrett's.

### Autopsy entry — required structure

```
# [Game date] · [Sport] · [Teams] [Pick + Line + Confidence] (LOSS)

Settled: [date and final score]
Published: [publication timestamp]
Model version: [vX.X — linked to changelog]
Root cause tag: [01 / 02 / 03 / 04 / 05]

## What we published
[1–2 sentences plainly stating what Galaxy published and at what confidence. Include the line at publication time.]

## The factor that drove the call
[2–3 paragraphs. Name the dominant factor by category. Explain what the model saw in that factor at the time. Quantify where possible (e.g., "rest differential of 2 days on a back-to-back" not "fatigue").]

## The assumption that broke
[1–2 paragraphs. The factor relied on something being true. State the assumption plainly. Then state what actually happened that broke the assumption (or what within the noise band that explains the loss without the assumption "breaking" — sometimes the assumption holds and we still lose).]

## What we were watching
[1–2 paragraphs. List 2–4 signals that would have shifted the publication if observed. State whether each signal fired pre-game. This is the "in-flight monitoring" reconstruction.]

## What we'd do differently
[1 paragraph. Honest assessment. If the loss is within the noise band of a calibrated model, this section says so plainly ("Process was correct; the outcome is variance"). If the loss reveals a structural fix, this section names the fix + links to the changelog entry that incorporates it.]

— Filed by Garrett · [date of autopsy publication]
```

### Sample autopsy (specimen — Garrett-edited variant)

```
# 26 May 2026 · NBA · Boston @ Miami [Boston -3.5 at 64% confidence] (LOSS)

Settled: 26 May 2026 · Miami 108, Boston 104
Published: 25 May 2026, 14:32 ET
Model version: v5.2 (link to changelog)
Root cause tag: 02 — Factor-interaction blind spot

## What we published
Boston -3.5 at 64% confidence. Closing line was Boston -3. Miami covered by 7.

## The factor that drove the call
The dominant factor was Boston's at-home defensive rebounding adjustment when the opposing team's starting center was on a back-to-back. Specifically: Boston's defensive-rebounding rate when this configuration applies (over the prior 14 months) is 6.2 points above their season baseline. Compound that with Miami's primary scorer being downgraded to questionable that morning, and the model's factor weighting pushed Boston's expected margin above the -3.5 line by ~1.5 points.

The 64% confidence number reflected the model's calibration band for that gap on the line.

## The assumption that broke
The factor weighting compounded two assumptions: (a) Miami's starting center remains the primary defensive rebound contributor through the third quarter, and (b) Miami's primary scorer's role gets meaningfully reduced if he plays through the injury.

What actually happened: Miami's center played fewer minutes than expected, BUT their rotation defender came in stronger than the model anticipated, picking up the defensive rebounding load. AND Miami's primary scorer played near full minutes and produced near-baseline numbers despite the questionable tag.

The compound assumption broke not because either single assumption was wrong in isolation — but because both assumptions failed together produced a script where Miami's defense + offense both held up.

## What we were watching
Three signals would have shifted the publication:
1. Miami's center being downgraded from probable to OUT by 16:00 game-day. (Did not happen.)
2. Boston's line moving from -3.5 to -4 with handle suggesting sharp money. (Did not happen — line moved to -3 with public Boston money.)
3. Boston's starting point guard being downgraded. (Did not happen.)

The public-Boston handle was a pre-game amber flag, but the line direction (toward Miami) was consistent with sharp money fading. We held the publication despite the amber flag because the line direction signal was reading the right way.

## What we'd do differently
The factor-interaction blind spot here is the at-home defensive-rebounding factor compounding with the questionable-status factor. Either individually has been a reliable predictor; together they produced an over-confident estimate. The fix shipping in v5.3 will add a covariance term that dampens compound-factor confidence when the two factors are both at-or-above-baseline.

The honest read: this loss is partly process (a real factor-interaction limit we're addressing) and partly variance (Miami's center playing fewer minutes was an outlier outcome regardless). The autopsy doesn't claim the entire loss was a fixable model failure.

— Filed by Garrett · 27 May 2026
```

### Autopsy entry — writing rules

1. **Each entry is independent.** A reader landing on one autopsy understands it without needing to read 30 others first. Include the model version + root cause tag at the top so context is immediate.

2. **Plainly state what we published.** Don't bury the lede. The first 100 words of the autopsy should make clear what Galaxy published, when, and at what confidence.

3. **Quantify the factor.** Replace "fatigue" with "2 days of rest after a back-to-back." Replace "matchup edge" with "rebounding-rate differential of 4.1 points." The specificity is the credibility.

4. **Don't pad with hedging.** Galaxy's autopsy is honest, not lawyered. Avoid "perhaps," "it could be argued," "one interpretation might be." Either state what happened or say "I'm not sure" plainly.

5. **Distinguish process vs variance.** Some losses are model failures (something to fix). Some losses are calibrated outcomes (60% confidence calls lose 40% of the time). The autopsy says which one this is.

6. **Don't apologize.** Galaxy publishes losses to be auditable, not to perform contrition. The tone is forensic, not regretful.

7. **Don't trash-talk Galaxy.** "We blew this one" / "what was I thinking" are off-brand. The factor model produced a calibrated estimate; the autopsy explains the estimate vs outcome difference.

8. **Don't claim future wins.** Don't end with "we'll do better next time." Galaxy doesn't promise outcomes; the autopsy doesn't either.

9. **Link to the fix when it exists.** If the autopsy identifies a structural fix, the next model version ships with the fix + a changelog entry. Link the autopsy to the changelog entry.

10. **Filed-by signature stays consistent.** "Filed by Garrett · [date]" closes every entry. Same author voice across the archive.

---

## Page-level interaction notes (for Codex engineering)

### Visual treatment

- Each autopsy entry rendered as a vertical card.
- Default sort: reverse chronological (most recent first).
- Filter by: sport (NFL, NBA, MLB, NHL, college, other) + root cause tag (01-05) + model version + date range.
- Search by team or player name (full-text search across autopsy bodies).
- Each entry has a permalink (e.g., `/loss-room/2026-05-26-bos-mia`).

### Aggregate views

A `/loss-room/patterns` sub-page summarizes:

- Total autopsies by root cause tag (rolling 6-month + lifetime).
- Recurring factor names that appear in 5+ autopsies.
- Recurring sport-specific patterns.
- The most expensive autopsies (by calibration impact).

This sub-page is published quarterly and reset each Almanac year. The data fees feeds into the year-end annual report.

### Linking pattern

Every autopsy links to:
- The original Ledger entry (the settled pick page).
- The methodology page (specifically the autopsy framework section).
- The model version changelog entry.
- (If applicable) The fix shipped in a subsequent model version that addresses the root cause.

### Privacy + edge cases

- The losing player's name appears only if it's directly relevant to the autopsy (e.g., "X player's injury status was the dominant factor"). Don't name players incidentally.
- Member-shared autopsy material (e.g., a Vault member's own honest loss shared in #vault-lounge) does NOT appear in the public Loss Room unless explicitly approved.
- No member's bet outcomes ever appear in the public Loss Room.

---

## Drift patterns to watch for (over months)

Galaxy's Loss Room can drift from brand position in three predictable ways:

### Drift 1: Autopsies get formulaic

Each entry follows the template too rigidly; the analysis stops surfacing real insight.

**Counter:** quarterly audit of the prior 25 autopsies. Are 3+ saying genuinely new things (insights that wouldn't have appeared in earlier autopsies)? If not, the template is being filled mechanically; rewrite the next 4 with more depth.

### Drift 2: "Sample-size noise" gets over-used

When losses are emotionally hard, the temptation is to tag root cause = 03 (noise). Genuine variance losses get the tag honestly; convenient ones do too.

**Counter:** quarterly tag distribution audit. If "sample-size noise" is more than 40% of root-cause tags over a quarter, audit individually. Some should probably be tagged as factor underweighted or factor-interaction blind spot.

### Drift 3: Autopsies become defensive

The autopsy starts reading as "here's why this wasn't really our fault." The brand position weakens.

**Counter:** read the prior 3 autopsies before writing each new one. If they all sound defensive, write the next one specifically with the "what we'd do differently" section longer and more honest.

---

## Cross-references

- Methodology page (the framework this implements): `methodology-page-copy.md`
- Pass List (the sibling discipline-visible surface): `pass-list-page-copy.md`
- Ledger (where settled picks live): `/ledger` (Codex builds)
- Changelog (where structural fixes are published): `/methodology/changelog`
- Vault digests (where autopsies inform members deeper): `copy/vault-digest-template.md`
- Galaxy Almanac (where autopsies are bound annually): `copy/almanac-production-pack.md`
- Brand voice rules: `galaxy-brand-voice-canonical.md`

---

*The Loss Room is the page that earns Galaxy's brand position. Every autopsy is a unit of brand depth being built. Quality compounds across years. Don't rush an autopsy; don't fake one.*
