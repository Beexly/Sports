# Minis heavy work order — props lab completion + L5 closure (2026-09-14, Motif architect)

Owner directive: Minis does the heavy execution; Motif remains architect and
verifier. This order is execution only — specs below are frozen, cite them, do
not redesign them.

Standing rules for everything in this order: v4 gate amendment
(`minis-grout-prompt-v4-gate-amendment.md`) applies to all runs. Every number
from your actual runs — no placeholders, no invented values. Every claim
carries proof (file path, row count, run log) or is written UNVERIFIED.
Deviations from a frozen spec are labeled with what was substituted, what it
approximates, the timed cost of the original, and the cross-check from v4 §A5.
Deliver to both mirrors as before. Do not push without Garrett's word.

## Sequencing

Start **H3's data pull first** (it is the long pole — let it download in the
background), then do H1, then H2, then H3's execution.

## H1 — Deliver the missing artifact (closes the audit gap)

Write and deliver `minis-props-lab-report-2026-09-15.md`: the complete L1
record — stage-1 (already run: c = +0.082131, OOS ΔLL per fold, n = 39,986,
flagged 2,479) and stage-2. Include:

- The prereg hash of the frozen L1 spec you executed.
- Stage-2 null results per the frozen spec, or per your disclosed
  efficient-score substitution — but v4 §A5 now requires the cross-check: run
  BOTH the efficient-score permutation and full refits on at least one
  compound where both are affordable, and report whether they agree. If both
  genuinely are not affordable anywhere, show the timed costs that prove it.
- Lab note: the architect independently recomputed your interaction sign on
  a separate VM (nflverse ftn_charting 2022–2025, 41,568 attempts, join rates
  matching yours exactly) and got the same positive sign. Your stage-1 kill
  stands. This does not replace your stage-2 report — deliver it anyway.

## H2 — L2 unblock and execute; L3 shelving documented

1. Retry the `player_stats` fetch using the exact nflverse-release pattern that
   already worked for rosters/injuries/ftn_charting on your host. If it fails,
   log the actual HTTP status/error in the failures log — "blocked" with no
   error shown is not a result.
2. If the fetch succeeds, execute L2 per the frozen spec
   (`minis-overnight-deep-report-2026-09-14.md` §5, L2) under v4 gates.
3. L3 stays shelved on your host (its estimand is the book-pricing gap and
   there are no book prop lines there) — but document it properly: list
   exactly which props-line sources you checked and what each returned, so
   the shelving is evidence, not assertion.

## H3 — L5 pooled hierarchical closure test (the heavy one)

Once the 1999–2025 pull (schedules + pbp + rosters, same release pattern)
completes, execute L5 per the frozen spec: partially-pooled hierarchical
model across all four state families, the single pre-registered test meant
to close the game-level branch formally rather than by accumulation of
nulls. v4 gates apply, including the SUPPORTED veto rule (A1) — a pooled
estimate that clears the gain threshold but fails Gate 6 is KILLED.

## Done when

- `minis-props-lab-report-2026-09-15.md` exists on both mirrors with prereg
  hash, stage-2 results, and the A5 cross-check (or timed proof it was
  unaffordable).
- L2 is executed or its fetch failure is logged with the real error; L3's
  shelving has a checked-sources list.
- L5 is executed and reported, or its data pull has a logged blocker with
  the real error.
