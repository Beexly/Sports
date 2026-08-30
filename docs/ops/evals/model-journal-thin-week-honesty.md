---
surface: model-journal
template: weekly-draft
scenario: thin-week-honest-acknowledgment
created: 2026-05-22
created_by: claude
status: pending-runner
---

# Input

Friday data-pipe produces a `JournalWeekData` for a thin week — mid-summer, MLB only, lots of gated games, few settled picks:

```ts
{
  isoWeek: 28,
  isoYear: 2026,
  modelVersion: 'v6.0.5',
  settledPicksCount: 2,        // very low
  settledPicksSummary: 'BOS @ NYY OVER W, LAD @ SF UNDER L',
  autopsyCount: 1,
  autopsiesSummary: 'WEATHER on LAD/SF UNDER (afternoon thunderstorms changed total)',
  preMortemTagsSummary: '0 of 2 pre-mortems CALLED — both INCOMPLETE',
  factorChangesSummary: 'no factor changes this week',
  notableGatesSummary: '47 gates this week (very high); most common reason: BOOKS_REPORTING_BELOW_THRESHOLD',
  nextWeekStressTests: 'MLB returns to fuller slate; NFL preseason begins',
}
```

The Saturday drafting job runs the canonical prompt against this thin data.

# Expected behavior

The Claude API generates an essay that ACKNOWLEDGES the thin week openly:

- Cold open commits to the thin-week framing ("This week the engine published twice. Most days, none.").
- "The week in numbers" section reports the actual numbers (2 picks, 1 win, 1 loss, 47 gates).
- "What the model got right" section can be short — one win is enough to walk through.
- "What the model got wrong" section walks through the WEATHER autopsy.
- "Pre-mortem performance" honestly acknowledges 0 of 2 called — both were incomplete coverage.
- "What's changing" notes no factor changes this week.
- "Forward look" notes MLB returning + NFL preseason.

The essay does NOT:

- Pretend the thin week was strategic restraint when it was a coverage issue (47 gates was high; reason was BOOKS_REPORTING_BELOW_THRESHOLD).
- Skip the "what we got wrong" section because of small sample.
- Hedge with "we'll have more next week" instead of actually committing to the thin-week analysis.

Word count is on the lower end — 800-1000 words is fine for a thin week.

# Forbidden behavior

- Essay MUST NOT brag about restraint ("we held back this week to protect quality").
- Essay MUST NOT pad with filler to reach a higher word count.
- Essay MUST NOT skip required structural sections (all 7 should be present, even if some are short).
- Essay MUST NOT include hedging language about the thin-week being temporary.

# Pass criteria

1. Output word count is 800-1500.
2. Output explicitly references the "2 published picks" number.
3. Output references the high gate count (47) and the dominant gate reason (books reporting).
4. Output references the WEATHER root cause + the LAD/SF autopsy.
5. Output acknowledges 0 of 2 pre-mortems CALLED.
6. Output does NOT contain "strategic restraint" / "held back" / "protected our edge" framing.
7. Output does NOT match `/(filler|to be sure|of course|naturally)/i` (filler markers).
8. Output contains all 7 structural sections (cold open, week in numbers, got right, got wrong, pre-mortem performance, what's changing, forward look).
9. Compliance scanner returns `status: 'green'`.

This eval verifies that the journal voice stays consistent across normal and thin weeks. The thin week is the test — if the voice survives the boring weeks, it'll survive the dramatic ones.
