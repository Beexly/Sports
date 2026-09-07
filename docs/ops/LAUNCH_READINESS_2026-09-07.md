# Launch readiness — 2026-09-07, 21:4x UTC

**Green light: NO.** What it would take is at the bottom, with owners and effort.

Provenance is marked on every claim:
- **[M]** measured by me this session, against production read-only SQL or ESPN, with the query or fetch run.
- **[A]** reported by a triage agent and NOT independently verified by me.
- **[V]** verified by me against a source outside this system (ESPN ground truth).

Two of the agent findings are **superseded** by my own later measurement. They are marked and corrected
in place rather than deleted, because the correction is the point.

---

## 1. The headline correction

I spent most of this session reporting that **117 published picks carry a wrong result**. The count is
right. **The blame was backwards.** [V]

Verified against ESPN, three of three spot-checks:

| ESPN event | true final | our game row |
|---|---|---|
| 401816824 | Mariners 2 - 6 Athletics (total 8) | 6-7 (13) |
| 401816839 | Mariners 2 - 0 Athletics (total 2) | 6-7 (13) |
| 401816841 | Dodgers 7 - 5 Nationals (total 12) | 5-3 (8) |

In all three the **pick is correct** against the true final and the **game row carries another fixture's
score** - the 2026-09-05 Mariners game's 6-7 copied onto two later, distinct fixtures of the same series.

The full causal chain [M]:
1. A score is written wrong (phantom pre-kickoff, or a cross-fixture bind).
2. `SCORE_MISMATCH_CROSS_PATH` refuses to overwrite an existing final with a different one - a correct
   guard, there to stop one lane clobbering another.
3. **The wrong score is therefore permanent.** All six verified-wrong rows are frozen, untouched for
   16h to 1d17h while settle cycles ran several times an hour.
4. The public surface shows a wrong score beside a correct pick, indefinitely.

**The missing capability is an authenticated correction lane**: something that may overwrite a final
when, and only when, a named ground-truth source disagrees with it, writing an audit row per correction.
That one capability fixes C-115 and makes C-114 re-gradeable instead of deletable. It is a new write path
over game scores, so it is founder-gated.

What is NOT broken, checked rather than assumed [M]:
- The **current settlement path is healthy**. C-120's `settledWith` payload went live 20:20 UTC today; on
  all 14 events recorded so far the score each grade was computed from matches the game row exactly,
  written within a fraction of a second. It is not producing new corruption.
- **free-score-persist.ts is already well guarded** - doubleheader placement, nearest-by-kickoff,
  fail-closed on ties, kickoff-drift rejection.

---

## 2. Launch blockers (12)

Ordered by what I would do first. Effort is the agent's estimate [A] unless marked.

### Founder-only

| row | what | note |
|---|---|---|
| **C-114** | 87 picks settled before kickoff | **AGENT RECOMMENDATION SUPERSEDED.** The triage agent said "run the unpublish tool". I checked 4 of the 87 against ESPN afterwards: **3 of 4 stored results are CORRECT** [V]. Unpublishing removes ~3 right rows per wrong one. Correct instrument is **re-grade against ground truth**, not delete. Decision needed. |
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
