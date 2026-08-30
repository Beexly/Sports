---
surface: pre-mortem-pipeline
template: comparator
scenario: called-vs-missed
created: 2026-05-22
created_by: claude
status: pending-runner
---

# Input

A settled losing pick with a published pre-mortem and an authored LossAutopsy.

Pre-mortem at publish (3 bullets):
```
[
  { factorKey: 'restAdvantage', severityRank: 1, text: '...' },
  { factorKey: 'venueForm', severityRank: 2, text: '...' },
  { factorKey: 'lineMovement', severityRank: 3, text: '...' },
]
```

LossAutopsy authored:
```
{
  rootCause: 'INJURY_SHOCK',
  lessonTags: ['late-injury', 'feed-latency'],
  ...
}
```

The comparator runs `comparePreMortem({ bullets, rootCause, lessonTags })`.

# Expected behavior — Scenario A: actual cause NOT in pre-mortem (MISSED)

Per the `ROOT_CAUSE_TO_FACTORS` mapping:
- `INJURY_SHOCK` maps to `['restAdvantage']`.
- The pre-mortem's restAdvantage bullet matches.

Wait — re-check. INJURY_SHOCK maps to restAdvantage in the spec. The bullets include restAdvantage. So the bullet should be tagged CALLED, not MISSED.

Let me re-spec the scenario for the MISSED case. Use a different rootCause:

Pre-mortem at publish (3 bullets):
```
[
  { factorKey: 'restAdvantage', severityRank: 1, text: '...' },
  { factorKey: 'venueForm', severityRank: 2, text: '...' },
  { factorKey: 'lineMovement', severityRank: 3, text: '...' },
]
```

LossAutopsy authored:
```
{
  rootCause: 'WEATHER',
  lessonTags: ['weather-flag'],
}
```

Per `ROOT_CAUSE_TO_FACTORS`, WEATHER maps to `[]` (no factor template covers it).

# Expected output for Scenario A — MISSED

```ts
{
  called: [],
  didNotHappen: ['restAdvantage', 'venueForm', 'lineMovement'],
  missed: ['WEATHER'],
  coverage: 'INCOMPLETE',
  perBullet: [
    { factorKey: 'restAdvantage', tag: 'DID_NOT_HAPPEN', ... },
    { factorKey: 'venueForm', tag: 'DID_NOT_HAPPEN', ... },
    { factorKey: 'lineMovement', tag: 'DID_NOT_HAPPEN', ... },
  ],
}
```

# Scenario B — actual cause IS in pre-mortem (CALLED)

LossAutopsy authored:
```
{
  rootCause: 'INJURY_SHOCK',
}
```

Per `ROOT_CAUSE_TO_FACTORS`, INJURY_SHOCK maps to `['restAdvantage']`.

# Expected output for Scenario B — CALLED

```ts
{
  called: ['restAdvantage'],
  didNotHappen: ['venueForm', 'lineMovement'],
  missed: [],  // empty because at least one bullet called it
  coverage: 'COMPLETE',
  perBullet: [
    { factorKey: 'restAdvantage', tag: 'CALLED', ... },
    { factorKey: 'venueForm', tag: 'DID_NOT_HAPPEN', ... },
    { factorKey: 'lineMovement', tag: 'DID_NOT_HAPPEN', ... },
  ],
}
```

# Scenario C — STALE_LINE maps to multiple factors

LossAutopsy authored:
```
{
  rootCause: 'STALE_LINE',
}
```

Per `ROOT_CAUSE_TO_FACTORS`, STALE_LINE maps to `['lineMovement', 'consensus']`.

Pre-mortem bullets include lineMovement (yes) and consensus (no).

# Expected output for Scenario C

```ts
{
  called: ['lineMovement'],  // matched on one of the mapped factors
  didNotHappen: ['restAdvantage', 'venueForm'],
  missed: [],  // empty because at least one bullet called it
  coverage: 'COMPLETE',
  ...
}
```

# Narrative summary helper

Run `summarizeComparison(result, friendlyName)` on each scenario:

- Scenario A: `"Pre-mortem missed — the actual cause (WEATHER) was not in any bullet. Coverage gap to address."`
- Scenario B: `"Pre-mortem called it — the rest advantage bullet matched the actual cause."`
- Scenario C: `"Pre-mortem called it — the line movement bullet matched the actual cause."`

# Forbidden behavior

- Comparator MUST NOT mutate input.
- Comparator MUST NOT tag a bullet as both CALLED and DID_NOT_HAPPEN.
- `coverage: 'COMPLETE'` MUST require at least one CALLED bullet.
- The narrative summary MUST NOT make excuses for incomplete coverage.

# Pass criteria

For each scenario:

1. Output `called` array contains the expected factor names.
2. Output `didNotHappen` array contains all remaining factors.
3. `missed` is empty for COMPLETE, non-empty for INCOMPLETE.
4. `coverage` reflects the called-vs-not state correctly.
5. `perBullet` has exactly the same number of entries as input `bullets`.
6. Each `perBullet` entry tag is exactly one of "CALLED" / "DID_NOT_HAPPEN".
7. `summarizeComparison` returns the expected narrative for each scenario.

This eval verifies that the comparator accurately tags bullets against the autopsy's root cause, including the multi-factor mapping (Scenario C) and the no-mapping case (Scenario A — WEATHER has no factor template, so it always reads as MISSED).
