# Stamped reasoning template — C-125 Pregame context bridge

| field | value |
|---|---|
| census_id | C-125 |
| home_kind | stamped reasoning template |
| census_status | MEASURED — holdout skill per the source document; NOT PUBLISHABLE per the same document |
| stamp_required | news/event timestamps as of the read |
| stamp_available | PARTIAL |
| stamp_gap | the measurement is stamped to the 2025 holdout (scored 2026-09-27); no forward-window re-measurement exists |
| reasoning_available | QUALITATIVE — the measurement record below is citable in authored reads; the bridge signal itself is NOT invocable (see blockers) |
| emission_status | ZERO_OBJECT |
| homed_by | wiring-surge-a-2026-10-15 |
| source | docs/reasoning/calibration-holdout-2025.md + data/reasoning/calibration-holdout-2025.json (Beexly/Sports main) |

## Template (how an authored read uses this record)

1. **Situation**: "A pregame team-strength context model (the context bridge) was scored on the full 2025 holdout."
2. **Measured record** (cite exactly): 285 games; Brier 0.223743 vs base-rate 0.249848; Brier skill **+0.026190**, 95% bootstrap CI [+0.010734, +0.041393], P(skill > 0) = 0.9997; ECE (10 bins) 0.051868; log loss 0.636548. Out-of-sample by construction (training seasons strictly before 2025).
3. **What the market may not be reading**: nothing additional — see blocker 1.
4. **What would change the read**: a construct that is not a duplicate of the live `historical_strength` family, re-measured on a forward window.
5. **Non-claims**: the skill figure is a measurement record, not a publishable probability and not an invocable signal.

## Blockers (read 2026-10-15 — the "dark until read" unlock is satisfied; both blockers stand)

1. **Duplicate family.** `pregame_context_logit` duplicates the already-LIVE `historical_strength` family (f2 = 1). By the scalarizer, when f2 is the winning term the family is DARK. No amount of skill clears a duplicate.
2. **Policy.** `probabilityClaimsAllowed` stays `false` and the calibration page stays dark. The documented bar is sample ≥ 250 and ECE ≤ 0.06; this clears both (285; 0.0519), which makes it *eligible* and not *published*.

Caution carried from the source: the *confidence* surface attached to such a model is partly an echo of the book (`confidence-market-leak-2026-09-27.md`); a clean Brier score on the probability does not make the surrounding confidence number clean.
