# C-14 verdict: CLV forensics — artifact vs anti-signal vs honest no-edge

**Verdict: MIXED, confidence MEDIUM.** The measurement pipeline's math is correct.
The measured numbers are still not trustworthy, for reasons the forensics pass
found and reasons an adversarial re-check found that it missed.

## What's confirmed correct (code-path forensics)

- Sign conventions in `packages/prediction-engine/src/clv.ts` are internally
  consistent across SPREAD/TOTAL/MONEYLINE (hand-derived and verified twice,
  independently, against worked examples — ML -150→-170 = +0.0296 BEAT;
  SPREAD -3.5→-4.5 HOME = +1.0 BEAT; TOTAL 44.5 OVER→46 = +1.5 BEAT).
- American-odds handling is correct: prices convert to implied probability
  before any subtraction/averaging, never subtracted as raw American numbers.
- **CLV is NOT de-vigged** (`computeMoneylineClv` has no `removeVig()` call,
  unlike the pick-scoring edge calc which does) — a real methodology fact,
  not a bug, but it means the reported beat rates are raw, not vig-adjusted.

## The structural clue that pointed at a real, already-fixed bug

SPREAD and MONEYLINE both derive side via the same shared function
(`selectionIsHomeSide`, `settlement.ts`); TOTAL derives OVER/UNDER
independently with no team-name matching at all. That line matches the
observed pattern exactly (SPREAD 10.31%, MONEYLINE 7.14%, both low; TOTAL
46.19%, near-honest). A real side-derivation bug in that shared function
**did exist and was fixed** on 2026-07-17 (commit `0e56c477`, "the live
money-truth bug" — a team-name-prefix collision like "Jets" vs "Jets Metro"
inverted WIN/LOSS and CLV grading). The fix is on current `main`.

## Why that story is not sufficient — two real, unpatched bugs it missed

An adversarial re-check confirmed every citation above but rejected the
side-collision story as the primary explanation on both magnitude and
completeness grounds:

**Magnitude problem:** a rare team-name-prefix collision (like "Jets" vs
"Jets Metro") only touches a small subset of games. Flipping a handful of
picks in an otherwise-~50/50 population doesn't crash the aggregate beat rate
to 7–10% — you'd need near-universal contamination for that effect, and a
naming collision doesn't produce it.

**Completeness problem — two real, confirmed, currently-unmerged bugs directly
on this exact code path were never checked:**

1. **No staleness bound on the closing snapshot.** `deriveClosingSnapshotFromOdds`
   accepts *any* latest pre-kickoff odds batch as "the close" — no
   `MAX_CLOSE_AGE_MS`. If the odds feed goes quiet hours before kickoff, a
   stale mid-afternoon batch gets graded as the close. Diagnosed and fixed on
   branch `origin/claude/hotfix-settle-refresh-races` (commit `8e2af6f1`,
   "M-F7: honest closing-line bounds") — **not merged, not applied to main.**
   This corrupts the *shared* closing snapshot that SPREAD, TOTAL, and
   MONEYLINE are all derived from per game — a far better candidate for an
   effect that hits multiple markets than a name-collision story that should
   only hit a handful of games.
2. **Closing-line book coverage is truncated.** The settle-side odds read is
   still `take:80` in `settle-sport.ts:321` today. A fix raising it to
   `take:240` exists on branch `origin/claude/galaxy-sports-edge-pdcswh`
   (commit `6f0353e1`, "heal orphaned CLV grades (M-F4)") with the documented
   rationale that 27+ books × 3 markets need more than 80 rows and the old
   cap was arbitrarily dropping books from the consensus close — **also not
   merged.**

Both are real, both are unpatched on `main` right now, both directly touch
the exact mechanism this forensics pass audited, and neither was in scope of
the original investigation.

## Verdict

Not honest-no-edge (the code is measuring something, not producing noise by
construction) and not confirmed real anti-signal (the measurement pipeline
itself has two known, unpatched defects that could each independently
produce the pattern). **Artifact is the better-supported read, but via a
different mechanism than the forensics pass proposed** — stale/truncated
closing-line capture, not side-derivation collision (that bug is already
fixed).

## What this means for the TOTAL 58.5% and the ML -27.4pp headline numbers

Neither can be trusted as-is. TOTAL's near-honest 46–58% range is *consistent
with* a market with no side-derivation exposure but still riding a corrupted
closing snapshot; the ML -27.4pp mean remains most plausibly explained by
L-9's independent finding (0/909 picks have a matching `odds_batch` row at
`clv_captured_at` — locks appear model-derived, not real book quotes) layered
on top of the closing-snapshot defects above. Multiple candidate defects,
not one clean story — that itself is a reason not to publish either number
yet.

## Recommended path (C-15, scope for the next session)

1. Pull `8e2af6f1` (closing-snapshot staleness bound) and `6f0353e1`
   (`take:80`→`take:240`) into a reviewed branch — both are pre-built,
   pre-tested fixes on other branches, not new work.
2. Re-grade the census with both fixes applied and compare beat rates before
   drawing any conclusion.
3. Separately design the lock-price provenance fix (real book quote at lock
   time vs model-derived) that L-9 flagged — that's additive to, not
   redundant with, the two fixes above.
4. No CLV performance claim ships to a customer-facing surface until a
   re-grade under the e-process preregistration protocol clears, per
   standing doctrine.
