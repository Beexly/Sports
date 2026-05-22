---
surface: pre-mortem-pipeline
template: composer
scenario: happy-path
created: 2026-05-22
created_by: claude
status: pending-runner
---

# Input

A canonical NBA published pick with strong factor reads across multiple categories:

PickSignalSnapshot.factors:
```
consensus: 0.72
depth: 0.68
edge: 2.7
lineMovement: 0.45
volatility: 0.22
headToHead: 0.18
venueForm: 0.68
scheduleStress: 0.74
restAdvantage: 0.81
crossMarket: 0.39
dataQuality: 0.95
```

Pick: BOS -3.5 spread, AWAY side. Model version v6.0.4.
Game: BOS @ NYK, NBA.

The composer runs `composePreMortem({ snapshot, pick, game })`.

# Expected behavior

The composer iterates the 9 failure-mode templates and collects bullets where `triggerCondition` returns true:

- consensus (0.72 > 0.6) → fires.
- depth (0.68 > 0.55) → fires.
- lineMovement (0.45 > 0.4) → fires.
- volatility (0.22 > 0.5) → does NOT fire.
- venueForm (0.68 > 0.6) → fires.
- scheduleStress (0.74 > 0.6) → fires.
- restAdvantage (0.81 > 0.65) → fires.
- crossMarket (0.39 > 0.45) → does NOT fire.
- dataQuality (0.95 > 0.5 but also > 0.85 ceiling) → does NOT fire.

6 bullets fire. After sorting by severityRank ascending (1 = highest priority):

- rank 1: restAdvantage
- rank 2: lineMovement
- rank 2: scheduleStress
- rank 3: consensus
- rank 4: depth
- rank 4: venueForm

Capped at 4 bullets, so the composer returns:

1. restAdvantage
2. lineMovement (or scheduleStress; tied at rank 2; sorted by template-declaration order is fine)
3. scheduleStress (or lineMovement)
4. consensus

`warning` field is `null` (4+ bullets).

# Forbidden behavior

- Composer MUST NOT include factors that didn't trigger (volatility, crossMarket, dataQuality).
- Composer MUST NOT return more than 4 bullets.
- Composer MUST NOT change severityRank arbitrarily.
- Composer MUST NOT mutate the input snapshot or pick objects.

# Pass criteria

1. Output `bullets.length === 4`.
2. First bullet is `factorKey === 'restAdvantage'` (severity 1).
3. `bullets[0].text` contains "BOS" and "NYK" substituted into the team-name placeholders.
4. `bullets[0].text` does NOT contain "[home.short]" or "[away.short]" placeholder syntax.
5. `bullets` are sorted by `severityRank` ascending.
6. `output.warning === null`.
7. `output.modelVersion === 'v6.0.4'`.
8. `output.generatedAt` is a valid ISO timestamp.
9. No factor with `triggerCondition === false` appears in the output.
10. The input snapshot and pick objects are unchanged after the call (referential equality preserved on factor reads — composer is pure).
