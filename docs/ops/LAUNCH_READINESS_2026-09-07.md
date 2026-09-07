# Launch readiness — 2026-09-07, 21:4x UTC

**Green light: NO.** What it would take is at the bottom, with owners and effort.

Provenance is marked on every claim:
- **[M]** measured by me this session, against production read-only SQL or ESPN, with the query or fetch run.
- **[A]** reported by a triage agent and NOT independently verified by me.
- **[V]** verified by me against a source outside this system (ESPN ground truth).

Two of the agent findings are **superseded** by my own later measurement. They are marked and corrected
in place rather than deleted, because the correction is the point.

---

## 1. The headline correction — and a correction to the correction

I spent most of this session reporting that **117 published picks carry a wrong result**. The count is
right. I then corrected the blame: the picks are right and the game rows are wrong. **That correction was
itself too strong, and adversarial verification caught it.** [V]

### What is verified

Game rows genuinely carry another fixture's final. Verified by ESPN **event id** - not by team-and-time,
which is the field a duplicate-fixture defect corrupts - on 4 rows by me and 45 of 45 by an independent
verifier that rebuilt the population from scratch (605 / 88 / 37 / **51** against my 588 / 81 / 34 / 47;
same structure, live-data drift):

| ESPN event | true final | our game row |
|---|---|---|
| 401816824 | Mariners 2 - 6 Athletics | 6-7 |
| 401816839 | Mariners 2 - 0 Athletics | 6-7 |
| 401816841 | Dodgers 7 - 5 Nationals | 5-3 |

### What I got wrong

I wrote "zero mis-graded pick results; only the reference is corrupt". **There are genuinely mis-graded
published picks.** Confirmed by me on production: [V]

> `cmtp1qor6052dx2r51abbm3ik` - published MONEYLINE "Seattle Mariners ML", v5.2.7, on
> `espn:mlb:401816839`. Settled **18.09 hours BEFORE first pitch**. Stored **LOSS**. ESPN: Mariners won
> 2-0, so the true result is **WIN**. The stored LOSS is exactly what the row's corrupt 6-7 implies.

### The model that actually fits

Two failure modes, separated by **when the pick was graded**:

- **Graded AFTER kickoff** from a fetched payload -> the pick is correct, the row is corrupted later.
  The contradiction is the row's fault. This is the C-115 population.
- **Graded BEFORE kickoff** -> there is nothing to fetch, so it is graded off whatever the row already
  held. The pick **inherits the corruption** and is right or wrong by coincidence. This is C-114, and it
  matches the 3-of-4-correct I measured: a coin flip against a wrong score.

The two populations **overlap** - that moneyline is in both.

### A claim of mine that was refuted

I said the corrupt-score story "explains the 13x timing split". It does not, and the verifier ran the
control I had not: corruption in the CORRECT cohort is **39.6% under 5h vs 50.0% at 5h+** - flat to
inverted. A corrupt baseline cannot produce the population-B gradient. What is time-graded is lane
disagreement, not corruption frequency. **The timing signal is still unexplained.**

### The causal chain (unchanged, and still the fixable part) [M]

1. A score is written wrong.
2. `SCORE_MISMATCH_CROSS_PATH` refuses to overwrite an existing final with a different one - a correct
   guard, there to stop one lane clobbering another.
3. **The wrong score is therefore permanent.** All six verified-wrong rows are frozen, untouched for 16h
   to 1d17h while settle cycles ran several times an hour.

**The missing capability is an authenticated correction lane.** One verifier re-attributed the writer
from the paid lane (dead on the code: the `!conflicts` gate at settle-sport.ts:552 makes that path
unreachable) to the **stale backfill lane**. That narrowing is [A], not yet confirmed by me.

What is NOT broken, checked rather than assumed [M]:
- The **current settlement path is healthy**. C-120's `settledWith` payload went live 20:20 UTC today; on
  all 14 events recorded so far the score each grade was computed from matches the game row exactly.
- **free-score-persist.ts is already well guarded** - doubleheader placement, nearest-by-kickoff,
  fail-closed on ties, kickoff-drift rejection.

## 2. Launch blockers (12)

Ordered by what I would do first. Effort is the agent's estimate [A] unless marked.

### Founder-only

| row | what | note |
|---|---|---|
| **C-114** | 87 picks settled before kickoff | **AGENT RECOMMENDATION SUPERSEDED.** The triage agent said "run the unpublish tool". I checked 4 of the 87 against ESPN: **3 of 4 stored results are CORRECT** [V]. These picks were graded off the corrupt row before kickoff, so each is right or wrong by coincidence - and a confirmed wrong one exists (`cmtp1qor6052dx2r51abbm3ik`). Unpublishing removes ~3 right rows per wrong one; re-grading against ground truth fixes all of them. Correct instrument is **re-grade**, not delete. Decision needed. |
| **C-137** | the remediation tool itself | 87 / 148 / 352 rows still live [A, matches my 586 figure]. Soccer and off-ladder populations are safe to run; **settled-before-kickoff is not**, per above. |
| **C-118** | 148 soccer two-way moneylines | Code guard confirmed fixed forward; the data half is one of the tool's three cohorts. Safe to run. |
| **C-143** | displayed line ≠ graded line | Card renders `pick.line`; grading uses `selectGradingLine` (prefers `clvLockLine`). 602 settled TOTALs affected [A]; I measured 432 of 588 differing and 46 outcome-flipping [M]. **You decide which number is canonical**, then the code follows. |

### Money path

| row | what | effort |
|---|---|---|
| **C-91** | Stripe `unpaid` is access-granting in the webhook (PAST_DUE, 7-day grace) while the reconciler treats it as a downgrade; no Stripe-side double-subscription guard before session create | days [A] |

### Honesty of published numbers

| row | what | effort |
|---|---|---|
| **C-88** | `confidence/100` still published as a win probability on the B2B `/api/v1/probabilities` route and the proof page; home copy still says "calibrated" | hours [A] |
| **C-28** | the public `/calibration` chart still buckets by confidence while the gate scores market-anchored p — the two disagree about what is being measured | days [A] |
| **C-15 / C-29** | CLV closing-line capture has no lower staleness bound, and `take: 80` truncates the pre-kickoff odds fetch | hours-days [A] |
| **C-119** | MLB **totals** have no step guard (the spread half was fixed; totals like `OVER 11.9` are still published on lines no book quotes) | hours [A] |

### Product surface

| row | what | effort |
|---|---|---|
| **C-92** | the signal slate writes `isPublished` on UPDATE, so **a withdrawn pick is re-published by the next slate run** — this alone would undo any remediation | hours [A] |
| **C-94** | fantasy: a live-data badge ("Projections: live · Data via nflverse") renders above **fictional players** on six paid-tier pages | days [A] |

> **C-92 deserves emphasis.** If it is real as described, any unpublish is temporary — the next slate
> run puts the rows back. That must be fixed *before* any remediation runs, and it is not founder-gated.

---

## 3. Ledger cleanup — 9 rows closeable now [A]

Never closed, work already done elsewhere. Closing these is part of "zero gaps".

- **Already fixed forward:** C-23, C-62, C-85, C-86, C-96, C-120
- **Obsolete:** C-38, C-125, L-7

## 4. Still real, not launch-blocking — 24 rows [A]

C-18, C-20, C-21, C-22, C-26, C-27, C-32, C-33, C-41, C-87, C-93, C-95, C-97, C-98, C-99, C-100, C-101,
C-102, C-103, C-104, C-107, C-112, C-121, C-141.

Every one now carries a verdict and an entry action. That is the ledger triage the "zero gaps"
requirement asked for: 49 of ~50 engineering rows reviewed, 1 batch still running.

---

## 5. What the green light requires

1. **C-92** fixed, or no remediation is durable.
2. The **correction lane** built and the wrong scores repaired against ground truth (founder-gated).
3. **C-114 decision**: re-grade, not unpublish.
4. **C-143 decision**: which line is canonical.
5. **C-88 + C-28** landed, or the public performance claims scoped to what is actually measured.
6. **C-91** landed before real volume hits checkout.
7. The 117 **re-derived against ESPN** rather than against our own rows, so the true size is known.

Calibration (ECE 0.0524 against a 0.05 floor) is NOT on this list. It is a gate correctly refusing an
unearned claim, and it resolves with more settled rows, not with work.

---

## 6. The pattern that matters most

Seven consecutive review rounds tonight each found a defect in the previous round's work. Three separate
remediations I had queued as "ready" would each have caused the damage they were meant to repair:

1. unpublishing rows the board would still show as published (C-147),
2. unpublishing legitimate postponement VOIDs (C-145),
3. unpublishing correct results (C-114, above).

Every one was caught by verification, not by my getting it right first. That is the strongest evidence
I have about launch readiness, and it is why the answer is still no. The underlying product looks
**better** than I reported - the picks are largely right. The data layer beside them is not trustworthy
yet, and the remediation tooling needs the same scepticism the picks got.
