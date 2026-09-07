# Ground-truth audit — published settled picks re-derived against ESPN

2026-09-07, 22:xx UTC. Read-only SELECT via the Neon MCP; no writes. ESPN public
scoreboard fetched by date and keyed by **event id**, never by team-and-time (team-and-time
is the field a duplicate-fixture defect corrupts, so matching on it would hide the defect
being measured).

This closes item 7 of `LAUNCH_READINESS_2026-09-07.md` section 5: "the 117 re-derived against
ESPN rather than against our own rows, so the true size is known."

## 0. Why this was necessary

The settlement-contradiction detector compares a stored result against what the **game row**
implies. A pick that was graded off a corrupt row *agrees* with that row, so the detector
returns CONSISTENT. That blind spot is structural, not a bug in the detector: only an outside
source can find those. Hence ESPN.

## 1. Coverage, stated before the findings

| | picks |
|---|---|
| settled, published, non-VOID picks in production | 2,199 |
| of those, on a game row whose externalId carries an ESPN event id | 774 |
| of those, whose event id is inside the ESPN windows fetched | **670** |

**So 1,529 of 2,199 settled published picks (69.5%) cannot be checked against ground truth by
this method at all**, because their game row carries no ESPN event id. That is itself a
finding and it is not an estimate: it is a count. Nothing below should be extrapolated onto
those rows — the rate on an unmeasured population is unknown, not assumed.

Sports covered: MLB 491, NFL 66, MLS 62, NCAAF 51.

## 2. Game rows carrying a score that is not the true final

| sport | picks checked | on a row whose score ≠ ESPN final |
|---|---|---|
| MLB | 491 | **169 (34.4%)** |
| MLS | 62 | 16 (25.8%) |
| NCAAF | 51 | 2 (3.9%) |
| NFL | 66 | **0** |
| total | 670 | 187 (27.9%) |

Two controls, both run:

- **Orientation.** A bucket for "our score is the true final with home and away swapped"
  returned **zero rows** in every sport. Had the truth table been keyed backwards, that bucket
  would have absorbed most of the population. It did not, so the comparison is oriented right.
- **Coincidence.** "Is the wrong score some other real final that day" is **not** a usable
  control and was discarded after being run: MLB scores are low-cardinality, so 118 of 138
  CORRECT rows also match some other real final. It discriminates nothing. No claim below
  rests on it.

The concentration is the signal. NFL is clean at 0 of 66; MLB is at 34.4%. Whatever writes
the wrong score is not a generic ingestion fault — it is specific to the high-volume,
duplicate-namespace, doubleheader-bearing sport.

## 3. Published results that are wrong against the true final

**Moneyline is the clean measurement.** A moneyline grade involves no line, so there is no
convention to argue about: either the team we picked won, or it did not.

| | moneyline picks | stored result wrong |
|---|---|---|
| MLB | 438 | **62** |
| MLS | 62 | 6 |
| NCAAF | 49 | 0 |
| NFL | 41 | 0 |
| total | 590 | **68 (11.5%)** |

Every one of the 68 sits on a game row whose score is wrong. Not one wrong moneyline result
was found on a row that carries the true final.

Separately, **13 MLS moneylines were settled on matches that ended in a draw.** A two-way
moneyline has no defined result on a three-way market; production stores LOSS
(`settlement.ts:96`). That is the C-118 population, measured here rather than assumed.

Including spread and total picks the count is 87 of 670 (13.0%), but see section 4 before
using that number: for spreads and totals "the correct result" is not a well-defined question.

## 4. Spread and total lines — what is measured, and what was refuted

Measured across **all 1,319** settled published SPREAD and TOTAL picks (not only the ESPN-checkable ones):

| | count | share |
|---|---|---|
| graded line differs from the line stored on the pick | 756 | 57% |
| stored line is not on the half-point ladder | 677 | 51% |
| — MLB totals alone | 275 of 474 | 58% |

`line` is `avgTotal` / `avgSpread` — an average across books (`scoring.ts:653`, `:856`). An
average is not a quotable number: no book offers a total of 8.409090909090908, and the card
renders it "OVER 8.4". This is C-119's scale, measured. `isPublishableSpreadLine` is why the
MLB **spread** half is far cleaner (34 off-ladder graded lines) than the **total** half (218).

**A claim I formed and then refuted before publishing it.** Every settled published spread
selection in production shows a minus sign — 526 of 526 in MLB, 112 of 112 in NCAAF, 13 of 13
in NFL, and zero plus signs anywhere — while 266 of those picks store a positive `line`. That
reads exactly like a renderer hard-coding the favourite's sign and showing subscribers the
wrong side of the spread. It is not. `scoring.ts:588` renders the sign correctly from
`chosenSpread`, and `scoring.ts:651` documents that `line` is stored **home-perspective** on
purpose while `selection` is **chosen-team-perspective**; the two frames disagree exactly when
the pick is on the away team. The absence of plus signs then says something else entirely and
benignly: on the run line the engine only ever takes the favourite. **There is no display sign
defect.** I checked the code before writing it down, and this is the third time tonight that
step killed a false alarm.

## 5. What this changes

1. **Wrong published results exist and are now counted, not estimated.** 68 moneylines,
   all of them downstream of a wrong score on a game row. The picks themselves are not the
   problem; the data layer beside them is.
2. **The earlier "117 contradictions" figure understated the population**, exactly as
   predicted: a pick graded off a corrupt row agrees with it and looked consistent.
3. **MLB is where to look.** NFL 0 of 66 and NCAAF 2 of 51 rule out a generic ingestion fault.
4. **69.5% of settled published picks are unmeasurable this way.** Giving every game row a
   stable ESPN event id is a prerequisite for ever being able to audit the track record — it
   is not housekeeping.
5. Nothing here changes the calibration position. ECE is unaffected by this audit and remains
   the binding floor.

## 6. What is NOT established

- **Why** the wrong scores are written. The causal chain after the write is understood
  (`SCORE_MISMATCH_CROSS_PATH` refuses to overwrite an existing final with a different one, so
  the wrong score is permanent), but the writer is not identified here.
- Whether the unmeasured 1,529 carry the same rate. Unknown. Not assumed.
- Which line is canonical for spreads and totals. Founder decision, C-143.
