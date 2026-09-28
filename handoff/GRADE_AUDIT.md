# GRADE AUDIT — pick-grading correctness

**Playbook:** `.claude/commands/grade-audit.md` (read-only; report only, no product code changed)
**Date:** 2026-09-28 · **Branch:** `hermes/live-wip-2026-09-24` · **Ledger:** P4-14
**Method:** pure-function probe (`handoff/grade-audit-probe.ts`, 33 cases) + read-only
production SQL against `gse-postgres/summer-brook-99380762` as role `hermes_ro`
(`handoff/grade-audit-probe{,2,3}.cjs`). Every count below came from a command in
this session; nothing is quoted from a prior note.

---

## VERDICT

The grading core is **sound and unusually well defended**. Push, void, race and
side-derivation all behave correctly, and the one catastrophic failure mode I
hunted — a fabricated PUSH — is unreachable and fails loud. The pre-kickoff
settlement defect the code documents is **confirmed closed** (0 occurrences since
2026-09-13).

Two real findings. **F1 is medium** (38 decided rows graded ~half wrong). **F2 is
the larger one** and is *legacy-only*: 532 already-decided rows were graded
against a number no bettor could have taken. Neither is fixable by editing the
grader; both are about which number reaches the grader.

---

## F1 (medium) — quarter lines are graded as full wins/losses; half the stake is wrong

**Where:** `packages/prediction-engine/src/settlement.ts:24`, `:106`, `:114`
**Mechanism:** `SettlementResult = "WIN" | "LOSS" | "PUSH"`. There is no
`HALF_WIN`/`HALF_LOSS`, and Asian settlement is half-stake:
`UNDER 45.25` = 0.5 × `U45` + 0.5 × `U45.5`. A total of exactly 45 returns
**full WIN**; the correct answer is **half-win**. Same on the spread side.

**Probe, expected vs actual:**

| Case | Expected | Actual |
|---|---|---|
| `UNDER 45.25`, total 45 | HALF_WIN | **WIN** |
| `OVER 45.25`, total 45 | HALF_LOSS | **LOSS** |
| `SPREAD -0.25`, 0-0 draw | HALF_LOSS | **LOSS** |
| `SPREAD +0.25`, 0-0 draw | HALF_WIN | **WIN** |
| `SPREAD -0.75`, home +1 | HALF_WIN | **WIN** |

**Measured reachability (production, today):** 38 rows hold a quarter-grid
locked line and **all 38 are graded WIN or LOSS — zero PUSH, zero VOID**. By
sport: MLB 13, MLS 15, NCAAF 9, NFL 1. So on every one of them the
push-or-half leg is unrecorded. 20 are graded WIN and 18 LOSS; because a
half-line error is asymmetric, a one-unit misgrade flips a decided row roughly
half the time, so this touches on the order of 19–20 rows in either direction.

**Reachability is structural, not historical.** `published-line.ts:36-38` names
"soccer Asian quarter-lines like -0.75" as a case it deliberately supports, and
`formatPublishedLine` renders such a value exactly. The publisher can therefore
emit a line the grader cannot represent. Soccer is the main source (MLS totals
2.25/2.75/3.25 are standard Asian lines) and 5 MLS **SPREAD** rows are already
locked at quarter lines.

**Why not HIGH:** 38 of 2,664 decided rows (1.4%), and the error is a fraction
of a unit on a minority of rows, not an inversion of the track record.

**Fix (proposal only, law 2 seals the code until an owner acts):** either
(a) add `HALF_WIN`/`HALF_LOSS` to `SettlementResult` and teach every consumer
(performance, calibration, streak, CLV, the public win rate) what half a unit is
— a schema and backfill change, i.e. a migration and a model-version decision;
or (b) refuse to publish a line the result set cannot settle, failing closed at
`published-line.ts`. (b) is the cheaper, safer direction and needs no backfill.

---

## F2 (medium, legacy-only) — 532 decided rows were graded at a number no book posted

**Measured, on locked lines only (2,215 rows):**

| Grid | Rows | Decided | Pending |
|---|---|---|---|
| half (x.0 / x.5) | 1,590 | 1,506 | 55 |
| **neither (= a mean)** | **587** | **532** | 51 |
| quarter (x.25 / x.75) | 38 | 38 | 0 |

`published-line.ts` exists precisely to stop this ("the mean is not a line anyone
could have bet"), and it is **forward-only by design** — settlement reads the
stored lock, so a row locked before the change keeps its mean. That trade is
stated in its own SCOPE note and I am not calling it a bug.

**The number that matters:** comparing the *displayed* number in `selection`
against the *graded* number in `clvLockLine` on magnitude, **1,085 rows disagree
(1,027 decided)** — the customer was shown a line we then graded a different one
against. This is the exact rule the repo lists under "do not regress": *"Never
publish a pick whose displayed line differs from its clvLockLine."*
Examples: `UNDER 3.5` graded at 3.3 · `OVER 8.5` graded at 8.1875 ·
`Arizona Diamondbacks -1.4` graded at -1.5 · `UNDER 4.5` graded at 8.5 (MLB
doubleheader, worst case found).

Two of my own measurement errors, caught and corrected in this session, because
they would each have produced a false finding:
- A first grid test used `×4` non-integer, which classifies *eighths*, not
  quarters. Corrected to `×2`.
- A first mismatch test compared **signed** values and reported 1,346 "mismatches"
  that were almost entirely `X -1.5` vs stored `1.5`. That is the home-perspective
  spread convention, not a violation. Corrected to magnitude → 1,085.

**Severity is bounded by direction, and the direction is mostly against us**:
`published-line.ts:43-52` resolves exact ties against the published side, and
1,027 of 1,085 are already decided and immutable. So the record is fixed, the
error is one-directional on a minority of rows, and no current customer action is
implied.

**The only forward exposure: 51 PENDING NFL rows still hold a mean lock**
(all 51 mean-locked pending rows are NFL). They will be graded at a line no book
posted. This is the one item with a live consequence, and it is fixable without a
migration.

---

## Verified-correct behaviour (no finding)

- **PUSH, two-sided spread.** `home -3.0` + home wins by 3 → PUSH; `away +3.0` +
  home loses by 3 → PUSH. My first probe asserted LOSS/WIN here; **my expected
  values were wrong**, the code is right. Two rows of this report exist to record
  that correction rather than hide it.
- **Fabricated-PUSH fall-through.** An unsupported `pickType` **throws**
  (`settlement.ts:123`) rather than returning PUSH. Probe: actual `THROW:
  calculatePickResult: unsupported pickType "PROP"`. `PickType` is a closed
  union so it is unreachable today; if it ever becomes reachable it halts that
  pick instead of manufacturing a no-loss result. Correct.
- **No half-line PUSH.** `home -0.5` on a tie → LOSS, not PUSH. Correct.
- **Selection side-derivation.** Word-boundary on both names, longest match
  wins. `LA` (home) vs `LAC` (away) with `LAC …` correctly derives AWAY —
  the prefix-collision case that would otherwise invert WIN/LOSS.
- **Soccer 3-way moneyline.** 1-1 draw → LOSS, not PUSH. Correct for a
  three-way market. 0 PUSH rows exist on moneyline in the record, consistent.
- **Idempotent settle.** Every writer gates on `result: "PENDING"`
  (`settle-sport.ts:668`, free runner, backfill), so a worker/cron race cannot
  re-grade or double-settle.
- **No-drift grading.** All three writers grade through `selectGradingLine`
  (locked line first, `??` so a genuine lock of 0 is honoured). Probe confirms a
  locked pick'em 0 does not fall through to `line`.
- **Postponed/cancelled → VOID.** Free path mints a real VOID with null scores
  and `voidReason: "POSTPONED_OR_CANCELLED"`; it never invents a score. 488 VOID
  rows exist. Holds (`AMBIGUOUS_MATCH` / `DISPUTED`) instead of guessing on
  multiple finals.
- **Kickoff binding.** `finalBindsToKickoff` binds on the clock
  (`MAX_KICKOFF_DRIFT_MS` = 12h) and returns **false** on an unparseable
  timestamp rather than falling through to a looser rule.
- **Cross-path score conflict.** A paid-path score disagreeing with a stored
  FINAL is refused for the write *and* blocks grading of every pick on that
  game, so a pick is never settled against a score the Game row does not hold.
- **Settlement timing.** avg 66.6h after kickoff, max 1,332h (a long backfill
  tail, not a fast-path problem). **87 rows settled before their own kickoff —
  exactly the count the `finalBindsToKickoff` docstring reports from its
  2026-09-06 measurement. All 87 are Aug/Sep 1–12; ZERO since 2026-09-13.**
  The defect the code documents is genuinely closed, measured, not assumed.

---

## Two latent items (no measurement, no claim of impact)

1. `selection.startsWith("OVER")` (`settlement.ts:113`) is case-sensitive.
   **Unreachable today**: zero TOTAL selections in production start with
   anything but `OVER`/`UNDER` (measured: 0 exceptions), and `process-sport.ts:227`
   upper-cases. It becomes live the moment a founder pick is typed by hand —
   `founder-picks/types.ts:94` validates only `length >= 3`, so `Over 45.5`
   is accepted and would grade as UNDER.
2. Neither grader ever *writes* a VOID. VOIDs are minted by the
   postponed/cancelled branch in the free path only; the paid path
   (`settle-sport.ts`) has no VOID branch at all. A postponed game on the paid
   path is left to the zero-sit lane to age out. Not measured — flagged for the
   owner, not asserted as a defect.

---

## What I did not do

No product file was modified. `schema.prisma` is law-2 sealed, so the F1 fix is a
proposal. Nothing was pushed except the two ledger commits for this row; per law
1 the branch is pushed to `origin/hermes/live-wip-2026-09-24` and not to `main`.
