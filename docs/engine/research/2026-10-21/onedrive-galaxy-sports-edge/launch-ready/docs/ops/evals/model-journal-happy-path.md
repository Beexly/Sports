---
surface: model-journal
template: weekly-draft
scenario: happy-path
created: 2026-05-22
created_by: claude
status: pending-runner
---

# Input

Friday data-pipe produces a `JournalWeekData` object representing a normal week with mixed outcomes:

```ts
{
  isoWeek: 21,
  isoYear: 2026,
  modelVersion: 'v6.0.5',
  settledPicksCount: 14,
  settledPicksSummary: 'BOS -3.5 W, CLE -7 W, LAL +145 L, MIN +6 L, TOR +1.5 W, ...',
  autopsyCount: 4,
  autopsiesSummary: 'INJURY_SHOCK on LAL+145, VARIANCE on MIN+6, ...',
  preMortemTagsSummary: '11 of 14 pre-mortems CALLED; 3 INCOMPLETE',
  factorChangesSummary: 'consensus weight tuned 0.18→0.20 in v6.0.5',
  notableGatesSummary: '23 gates this week; most common reason: EDGE_BELOW_THRESHOLD',
  nextWeekStressTests: 'NFL Week 12 has 4 division games with rest-day imbalances',
}
```

The Saturday drafting job calls Claude API with `JOURNAL_DRAFTING_SYSTEM_PROMPT` + `buildJournalDraftPromptUser(weekData)`.

# Expected behavior

Claude API returns a markdown essay between 800 and 1500 words. The essay has the 7 structural sections from the prompt:

1. Cold open (one sentence, direct).
2. The week in numbers.
3. What the model got right (1-2 wins with specific factor reads).
4. What the model got wrong (1-2 losses with autopsy references).
5. Pre-mortem performance (called vs missed).
6. What's changing (factor weight changes shipping).
7. Forward look.

The essay:

- Uses past tense for the week + present for the model.
- References specific factor names + scores.
- Cites at least 2 specific game IDs.
- References the consensus weight tuning shipping in v6.0.5.
- Closes with the NFL Week 12 stress-test forward look.

Compliance scanner runs against the output and returns `status: 'green'`.

# Forbidden behavior

- Essay MUST NOT contain "AI-powered" / "AI-driven" / "powered by AI" / "multimodal" / any L1 banned vocabulary.
- Essay MUST NOT contain aggregate win-rate claims ("we hit 78% this week").
- Essay MUST NOT contain first-person singular ("I think the model...").
- Essay MUST NOT contain marketing-style adjectives ("powerful," "robust," "sophisticated").
- Essay MUST NOT contain hedging language ("might," "could possibly," "we'll see").
- Essay MUST NOT contain comparison to other operators.
- Essay MUST NOT contain emoji.
- Essay MUST NOT have a marketing CTA ("subscribe to Pro!").

# Pass criteria

1. Output word count is between 800 and 1500.
2. Output contains markdown H2 headings (`##` not `#`).
3. Output contains references to at least 2 specific game IDs from the week's settled picks.
4. Output references at least one factor name explicitly (rest advantage, schedule stress, consensus, etc.).
5. Output references the v6.0.5 factor weight change.
6. Output references the NFL Week 12 forward look.
7. Output does NOT match `/(AI[\s-]powered|multimodal|powered by AI)/i`.
8. Output does NOT match `/\bwe hit \d{2,}%/i` (aggregate win rate).
9. Output does NOT match `/\b(I think|I see|I believe)\b/`.
10. Output does NOT match `/\b(powerful|robust|sophisticated|game-changing)\b/i` (marketing adjectives).
11. Output does NOT contain emoji.
12. Compliance scanner returns `status: 'green'`.
13. Cost: this generation counts against the Model Journal budget ($50/month). One call should cost under $1.
