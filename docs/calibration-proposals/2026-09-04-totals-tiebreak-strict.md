---
modelVersion: v5.2.7
status: PROPOSED
date: 2026-09-04
author: hermes (night Wave 5, H-N5)
decision: OWNER — flipping the default changes published picks
---

# Calibration proposal — totals side-selection tie-break: strict (opt-in today, default flip proposed)

## Observation

`scoreTotalPick` (packages/prediction-engine/src/scoring.ts, totals consensus
block) derives the OVER/UNDER side from bookmaker JUICE:

    const overFavored = pricedTotals.filter(o => o.overPrice! <= o.underPrice!).length;
    const overIsChosen = overFavoredPct >= 0.5;

The `<=` makes the standard -110/-110 quote — the default price for a total —
an OVER vote at every book. Consequences, all verified in this repo:

1. A symmetric board reads as UNANIMOUS OVER consensus (`consensusPct = 1.0`),
   the maximum consensus factor, even though not one book expressed a
   preference. The customer-facing reasoning string then says "backed by 100%
   of bookmakers" for what is a coin flip.
2. An exact 50/50 split of genuinely juiced books deterministically picks OVER
   by fiat (`>= 0.5`).
3. The historical replay prices both sides at -110 by construction
   (`buildHistoricalOddsInput`, STD_VIG_PRICE), so every replayed total pick in
   the corpus resolved its side through this tie-break. Pinned in
   packages/prediction-engine/src/__tests__/totals-consensus-tiebreak.test.ts
   (which documents 6,868/6,868 OVER on the 1999-2025 replay corpus).
4. The contrast is in the same file: the SPREAD path counts books with a
   home-favoured LINE — real agreement about the market, not about vig.

This is the same failure class the file already guards against for MISSING
prices: `pricedTotals` refuses to let an unpriced book fabricate a one-sided
consensus. An AMBIGUOUS price (equal juice) is no different: it carries no
side information.

## Proposed change

A strict tie-break, shipped in this branch as an OPT-IN and proposed here as
the future DEFAULT:

- Only books whose over/under prices DISCRIMINATE (`overPrice !== underPrice`)
  vote. Equal-juice books abstain.
- An exact 50/50 vote produces NO pick (a coin flip must not be published).
- Mechanism: `context.totalsTiebreak: "strict"` (new optional field on
  `GameContextInput`, threaded through `HistoricalReplayOptions` for replay).
- ABSENT context → legacy behaviour, byte-for-byte. The pinned legacy tests
  stay green on this branch. Nothing live changes until the owner flips the
  default (a one-line change + MODEL_VERSION decision, out of scope here).

## Before/after replay evidence

scripts/analytics/totals-tiebreak-replay.ts replays the SAME 3 completed NFL
seasons through the unchanged `replayAndSettleGame` pipeline, once per mode,
differing ONLY in `totalsTiebreak` (raw JSON output; committed verbatim as
evidence/2026-09-04-totals-tiebreak-replay-legacy.json and
evidence/2026-09-04-totals-tiebreak-replay-strict.json — re-audit 2026-09-04
10:36 CST, previously only in a temp dir that does not survive the machine):

| metric | legacy (BEFORE) | strict (AFTER) |
|---|---|---|
| seasons | 2023, 2024, 2025 | 2023, 2024, 2025 |
| games processed | 816 | 816 |
| total picks | 816 | 0 |
| OVER picks | 816 (100.0%) | 0 |
| UNDER picks | 0 | 0 |
| win rate (decided) | 0.5068 (411-400) | n/a (no picks) |
| pushes | 5 | 0 |
| mean confidence of published totals | 67 | n/a (no picks) |

Expected shape (confirmed by the pinned tests and the -110-only corpus): legacy
publishes ~100% OVER; strict publishes far fewer total picks, two-sided, with
any picks present decided by real juice. Direction-of-effect caveat stated
plainly: because the replay corpus has NO real juice, strict REMOVES the
coin-flip picks rather than reassigning them — the honest comparison is pick
count and mean confidence, not win rate on the small strict remainder.

## Why this is a proposal, not a live change

- Flipping the default changes which picks get published → retroactive
  re-labelling territory → MODEL_VERSION decision by the owner
  (docs/calibration-proposals/FROZEN.md contract; model-freeze guardrail).
- The night's standing rule for this wave: no MODEL_VERSION bump, no live-path
  merge, fix and evidence on a branch.

## Verification on this branch

- New strict-mode suite in scoring.test.ts (5 tests incl. an A/B test proving
  the flag changes behaviour on identical input): green.
- Pinned legacy file totals-consensus-tiebreak.test.ts: UNCHANGED and green
  (the opt-in does not alter the default).
- historical-replay*.test.ts (4 files): green with the plumbing change.
- Full verify block recorded in the night log and ledger row H-N5.

## Recommendation

Adopt strict as the default in the next scheduled model version bump, with the
replay table above as supporting evidence and a fresh per-season strict replay
run at bump time. The opt-in flag lets the board A/B the behaviour behind a
gate before that flip.

## Re-audit addendum — SPREAD sibling (2026-09-04, post-merge)

A same-day re-audit probed the SPREAD path this doc's point 4 cites as the
sound contrast. Point 4 survives for OPPOSING lines: an exact 50/50 split of
genuinely juiced books publishes nothing (consensus 0.5 < CONSENSUS_MIN_PCT
0.55). But `scoreSpreadPick` (scoring.ts:390-392) counts a book as a HOME vote
only when `spread < 0`, so:

- A book posting spread === 0 (pick'em) is counted as an AWAY vote — the same
  equal-information failure as the totals `<=`, mirrored.
- An all-pick'em board publishes a phantom SPREAD pick. Probed empirically
  2026-09-04 (throwaway `scoreGame` run, six synthetic books all at spread 0,
  ±110 prices, since deleted): one SPREAD pick returned, line 0, confidence 59
  ≥ MIN_PUBLISH_CONFIDENCE 50 → published. Side is AWAY by exclusion
  (homeFavoredCount = 0 → homeIsChosen = false → chosenTeam = awayTeam) and
  consensusPct = 1.0 by the same arithmetic — unanimity from a board where no
  book expressed a preference.

Scope note: unlike totals, no synthetic corpus path feeds spreadLine === 0
(nflverse pick'em games carry spreadLine null → no SPREADS book at all), so
this is not measurable in replay — live-path reachable only, on real PK
boards. The strict-opt-in pattern from this proposal (only discriminating
books vote; no preference on the board → no pick) applies to the spread path
unchanged; filed as a follow-up rather than extending this proposal's scope.
