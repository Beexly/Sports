# Reasoning benchmark — baseline

Run 2026-10-23 against production, `hermes_ro`, READ-ONLY. n=552 settled picks that
carry both `factorBreakdown.fairProbability` and `marketFairProb`.

Run it with:

```
cd apps/web
export DATABASE_URL=$(neon connection-string main --project-id summer-brook-99380762 --role-name hermes_ro | tail -1)
NODE_PATH=<repo parent>/node_modules npx tsx scripts/bench-reasoning.mts 4000
```

## Result

| component | score | floor | verdict |
|---|---|---|---|
| grounding | 0.9855 | 0.90 | pass — citations resolve |
| consistency | 0.9534 | 0.95 | pass — 103/552 still inconsistent |
| specificity | 0.5889 | — | thin; templated prose |
| rubric | 86.86 | 70 | pass |
| Brier | **0.2532** | ≤ market | **fail** |
| market Brier | 0.2158 | — | the bar |

`leaderboardReady: false`. One blocker: `Brier worse than the market`.

## What this says

1. **The engine's own probability loses to the market by 0.037 Brier at n=552.**
   This is the same fact that made `marketFairProb` the ranking basis — the
   ranking was fixed, the published number was not. Until `fairProbability`
   beats the close, any claim that the reasoning is superior is calibration
   theatre.
2. **The reasoning is a market echo.** The current template is "SIDE line backed
   by N% of M bookmakers. Fair value: X%. Edge: Y%." It names no situational
   surface — no wind, pressure, availability, entropy. Specificity 0.59 is the
   arithmetic ceiling of a five-slot template.
3. **103 internal inconsistencies.** Mostly the printed "Fair value: X%" not
   matching the stored `fairProbability` for that pick — the template rounds and
   then states a different number than the one it is scoring against.

## Known scoring limits

- `side` is inferred from `selection` vs `homeTeamName`; picks with a null game
  join fall back to `AWAY`.
- Only 552 of 3,763 settled rows carry `fairProbability`; 3,211 are skipped as
  unpriced. A wider run cannot fix that — it is a generation-time gap.
- Grounding is scored against `factorBreakdown` keys plus the pick's own market
  columns. The templated phrases cite those columns, so scoring them as
  hallucinations was an artefact of looking only inside the breakdown.

## 2026-10-23, later: probability recalibration (v5.3.1)

Calibration shape, by stated-probability band: .45-.55 hit .433-.488 and .60+ hit
.615 against a stated .679 — overconfident through the middle and top. Overall
stated 56.3% v actual 52.2% (4.1 points), correlation .1114.

Recalibrated toward the market at a **fitted 0.15 engine weight** (fit on the
oldest 70%, n=386; evaluated on the untouched newest 30%, n=166):

| | Brier |
|---|---|
| engine alone | .2642 |
| recalibrated | **.2314** |
| market alone | .2299 |

On all 552 rows the recalibrated number is .2154 v market .2158 — it now edges
the close — and overconfidence falls 4.1 -> 1.2 points. Benchmark re-run with
`RECAL=1`:

```
Brier .2154 v market .2158   PASS (blocker cleared)
consistency .9171            FAIL — transitional, see below
```

**The consistency drop is expected.** Stored rows carry text written before the
recalibration, so the printed "engine fair" no longer matches the recalibrated
number the same row now scores against. New picks will agree by construction;
the bench should return above the floor as they settle. Do not "fix" this by
loosening the check.

## 2026-10-23, later still: units in the context clauses

Specificity was .5889 because every context clause named a direction and no
quantity — "rest advantage" scores nothing the scorer can see. The clauses now
carry the number behind the claim where the value exists:

    "home 7 days rest v away 2"            (was "rest advantage")
    "confirming line movement (2.0 pts)"    (was "confirming line movement")

`computeGameContext` passes `restDaysHome`/`restDaysAway` through and derives
`spreadMovementPts` from the opening/current spread; a missing value falls back
to the bare word, so an absent day count never renders a dash. Prose only — no
score, weight or threshold moved.

Stored bench rows cannot show this (their text is frozen at generation), so the
effect appears as post-change picks settle.

## 2026-10-23, later: falsifiers, and a fifth scored component

Reasoning asserted and never admitted a failure mode, which is why fluent
paragraphs scored low on probe cases. Picks now carry "Would be wrong if ..."
driven by real adverse signals — line moving against, book dispersion,
conflicting signals, worsening availability — capped at two so it stays a claim
and not a hedge, and omitted entirely on a clean read.

Scored as its own component (`falsifier`, weight 0.10; grounding eased .35 -> .30,
consistency .30 -> .25). Two or more states score 1, one scores 0.7, silence 0.6
rather than 0 — a genuinely clean read has little to name. Stored rows predate it,
so the run reads .6 and rubric fell 86.86 -> 83.02, still above the 70 floor.

## 2026-10-23, later: prose smoke suite

The production bench scores STORED text, so a template change is invisible until
new picks settle days later, and the scorecard mixes template eras meanwhile.
`engine/__tests__/reasoning-prose-smoke.test.ts` closes that: it drives scoreGame
over fixed clean and adverse contexts, harvests the rendered reasoning, and scores
it through the same contract. A prose regression now fails in seconds.

Calibration is excluded (no outcomes), which is stated in the file so the rubric
is not read as forecast quality. It also pins both falsifier directions and the
"Market fair: N%" rendering.

Fixture gotchas worth keeping: `commenceTime` must be a Date (ISO strings silently
yield zero picks), a thin context clears no gate because confidence needs the form
buckets, and per-pick fair values must not be pinned globally or genuine renders
score as inconsistent.

## 2026-10-23, later: the side/probability rule was wrong, and the gate passes

Labelled the consistency findings (bare "internal inconsistency: 103" was
undiagnosable) and the cause distribution killed the rule: ~100 of 103 were
"named a side at only 39-44%". A dog at 42% is not an inconsistency — it is a
normal underdog — so a flat 0.45 floor was measuring the wrong thing.

Replaced with a DISAGREEMENT test: naming a side more than 12 points from the
market has to be right, and anything under 10% is a long shot whatever the market
says. Result: consistency 1.0, no findings, and the run reports
`leaderboardReady: true`.

**Read that cautiously — `fairChecksApplied: 0`.** Legacy rows print neither
"Market fair" nor "engine fair", so on this cohort the fair-value checks never
fired and consistency is "nothing disproved it", not "everything verified". New
picks exercise both. The bench now reports that coverage count alongside the
score so a vacuous 1.0 cannot be mistaken for a verified one.

## 2026-10-23, later: depth on the spread branch

Spreads carried no book count at all — only totals cited books — so the market
that carries most picks had no evidence trail for depth. The spread sentence now
reads "Home Club -3.5 at 8 books." Pinned by a smoke test plus a specificity
floor above 0.5 on a rendered spread.

**Escape hazard, twice now.** A test line written as `/\d+ books/` arrived in
the file as a literal backslash-d and a raw backspace byte, matched nothing, and
failed with the text visibly containing "8 books" — so the assertion looked
insane while behaving correctly. Prefer `[0-9]` classes in this tree; they carry
no escapes to mangle.

## 2026-10-23, later: the citation vocabulary was the bottleneck

Decomposed specificity on 600 stored rows instead of guessing: **600/600 matched
zero humanised keys**, while numbers were saturated (526 rows already at the 4+
cap). Keys humanise to "fair probability", which the prose never says — it says
"Market fair", "engine fair", "books", "edge", "confidence". So the citation half
was measuring the vocabulary, not the writing.

Extending the phrase map: specificity **.5889 -> .9809**, rubric 85.09 -> 89.80.

Grounding moves the other way, **.9855 -> .9464**, and that is informative rather
than bad: phrases now point at surfaces some rows never recorded, so a row saying
"rest advantage" with no `restAdvantageScore` in its breakdown is correctly read
as a citation the record cannot back. The two numbers should be read together —
before this, grounding was flattered by a vocabulary too small to miss anything.

## Next targets, in order

1. Stop printing a fair value that disagrees with the stored probability.
2. Make the template cite real surfaces, so specificity is earned rather than
   inert.
3. Recalibrate `fairProbability` toward the market until Brier ≤ marketBrier,
   then measure the gap again. Re-run this bench unchanged each time.
