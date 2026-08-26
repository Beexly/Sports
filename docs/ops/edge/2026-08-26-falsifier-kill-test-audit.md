# Falsifier audit — two of the four kill tests are inert

**Date:** 2026-08-26 · **Status:** §5 fix **APPLIED** (owner-approved 2026-08-26). §5b decision
rule still **HELD** — see the status note below. Findings below are preserved as written, in the
past tense where they have been repaired, because the record of what was wrong is the point.

> **Status note (post-fix).** §1–§4 describe the defect as found. §5 is the fix that was proposed
> and has now been applied. §5b's *reporting* half was applied; its *decision-rule* half
> (terminal `M` → `supM`) is deliberately **not** applied, because unlike everything else here it
> would make a gate **easier** to pass. That direction needs its own explicit call.
>
> Verification that the repair works, run against the same probe as §3, after the fix:
>
> ```
> NOISE     shuffle=KILLED   split=PASS    overall=KILLED
> ORACLE    shuffle=PASS     split=PASS    overall=SURVIVOR
> INVERTED  shuffle=KILLED   split=PASS    overall=KILLED
>
> shuffle details identical across all three? false
> split   details identical across all three? false
> ```
>
> Before the fix both lines printed `true` and all three rows showed `shuffle=PASS split=PASS`.
> (`split` passing on all three is correct: it tests *stability*, not skill — a consistently bad
> model is stable, and shuffle plus multiplicity are what kill it. Its details now differ, which
> is what proves it reads `modelProb` at all.)
**Subject:** `packages/prediction-engine/src/edge-lab/falsify.ts` (arrived on the main lineage
with the `hermes/w2-audit-settlement` integration).

---

## 1 · The claim, stated precisely

The falsifier funnel is described across the operating prompt and `handoff/EDGE_LEDGER.md` as
**four independent kill tests** — leakage / shuffle / split / multiplicity — and Honesty Law #5
makes a `SURVIVOR` verdict the precondition for any SHIP.

Measured behavior: **only `multiplicity` responds to the model's predictions at all.**
`shuffle` and `split` are computed from a statistic that does not read `modelProb`, so they
return the same verdict — byte-identical detail strings — for a pure-noise model, a perfect
oracle, and a perfectly inverted (anti-predictive) model.

A `SURVIVOR` verdict therefore means *"the e-process grew and there was no temporal
lookahead"*, **not** *"survived four independent kill tests."*

## 2 · Root cause (file:line)

`effectSize` (`falsify.ts:36`) is a function of `outcome` and `marketProb` only:

```ts
function effectSize(rows: readonly BacktestRow[]): number {
  const sum = rows.reduce((a, r) => a + (r.outcome - (r.marketProb ?? 0.5)), 0);
  return sum / rows.length;
}
```

`modelProb` never enters. Two consequences:

**a. SHUFFLE (`falsify.ts:90–108`) can never fire.** The permutation loop Fisher-Yates shuffles
*whole row objects* (`falsify.ts:96–100`) and recomputes `effectSize(perm)` (`:101`). A mean over
a row set is **permutation-invariant**, so `permES === origES` exactly, on every one of the 200
iterations. The comparison at `:103` is therefore `Math.abs(x) >= Math.abs(x)` — trivially true —
so `survive` is always `shuffleB` (200/200), always `>= p95` (190), and the verdict is always
`PASS`. A correct permutation test must break the pairing between prediction and outcome and use
a statistic that reads both.

**b. SPLIT (`falsify.ts:110–122`) is a base-rate check, not a stability check.** `esA`/`esB`
(`:115–116`) are the same `effectSize`, so the sign comparison at `:117` asks only whether the
*outcome base rate* sits on the same side of `marketProb` in both halves. Model stability across
the split is never examined.

`leakage` is also `modelProb`-blind, but legitimately so — it is a temporal ordering check
(`knownAtWeek >= outcomeWeek`) and does its job.

## 3 · Reproduction (run it — do not take this on report)

Save as `packages/prediction-engine/src/probe.ts`, run `npx tsx src/probe.ts` from
`packages/prediction-engine`, then delete it.

```ts
import { falsifyBind, type BacktestRow } from "./edge-lab/falsify.js";
let seed = 999;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const rows: BacktestRow[] = [];
for (let i = 0; i < 400; i++) rows.push({
  season: 2024, knownAtWeek: 1, outcomeWeek: 5,
  outcome: rnd() > 0.42 ? 1 : 0, modelProb: rnd(), marketProb: 0.5,
});
const noise    = falsifyBind(rows, { minN: 100, seed: 7 });
const oracle   = falsifyBind(rows.map(r => ({ ...r, modelProb: r.outcome === 1 ? 0.99 : 0.01 })), { minN: 100, seed: 7 });
const inverted = falsifyBind(rows.map(r => ({ ...r, modelProb: r.outcome === 1 ? 0.01 : 0.99 })), { minN: 100, seed: 7 });
console.log(noise.shuffle.detail, "\n", oracle.shuffle.detail, "\n", inverted.split.detail);
```

Observed output (2026-08-26, this checkout):

```
split detail  NOISE : firstHalf=0.085 secondHalf=0.060 signMatch=true
split detail ORACLE : firstHalf=0.085 secondHalf=0.060 signMatch=true
split detail INVERT : firstHalf=0.085 secondHalf=0.060 signMatch=true
all three identical? true

multiplicity NOISE : KILLED | e-value decayed M=0.000 (not growing/survivor)
multiplicity ORACLE: PASS   | e-process M=4.635e+118 growing
multiplicity INVERT: KILLED

overall NOISE / ORACLE / INVERT: KILLED / SURVIVOR / KILLED
```

Shuffle, separately, reported `survives 200/200 perm > p95` with an **identical detail string**
for the noise model and the perfect oracle.

## 4 · What this does and does not invalidate

- **Does not** invalidate any recorded `KILLED` verdict. `multiplicity` is sound and did the
  killing (YACoe real-data `e=0.000`, and the noise probe above). Killed stays killed.
- **Does** weaken the evidentiary weight of any `SURVIVOR`/`PASS` on the shuffle and split legs —
  those legs voted PASS unconditionally, so they never contributed information.
- Track E is CLOSED (`AGENT_LEDGER` C-44) and nothing is currently being shipped through the
  funnel, so this is a correctness debt to repay before the next preregistered program, not a
  live incident.

## 5 · The fix — APPLIED (owner-approved 2026-08-26)

All four steps landed, plus a fifth the work surfaced:

1. ✅ The permutation test now decides on `meanLogLikRatio` — the mean per-row log-likelihood
   ratio of model against market, `(1/n) Σ [y·log(p/q) + (1−y)·log((1−p)/(1−q))]`. It reads
   `modelProb`. `effectSize` survives for **reporting only**, with a docblock saying so.
2. ✅ SHUFFLE permutes the **outcome labels** against fixed `(modelProb, marketProb)` pairs, so
   the null actually under test is "the model's probabilities carry no information about the
   outcomes". It is **one-sided** (`origStat >= permStat`) by design: a two-sided `|statistic|`
   comparison would credit a perfectly *anti*-predictive model, which is the opposite of what an
   edge funnel should accept.
3. ✅ SPLIT scores each chronological half with that same model-aware statistic and compares
   signs, rather than asking whether the outcome base rate sits on the same side of the market.
4. ✅ Regression test added (`"shuffle and split must distinguish a noise model from an oracle on
   identical outcomes"`) holding the outcome column fixed and varying only `modelProb`.
5. ✅ **Degenerate outcome vectors** — not in the original proposal, surfaced while fixing §6c. A
   label-permutation test is vacuous when every outcome is identical: each permutation equals the
   original. Returning `PASS` there would be the same silent rubber-stamp the original bug
   produced, so SHUFFLE now returns `STARVED` with an explicit reason, and `overall` treats an
   uninformative gate as `PARKED` — never `SURVIVOR`. The verdict ordering is now: any `KILLED`
   refutes outright; else any `STARVED` means the funnel never actually tested the bind
   (`PARKED`); else `SURVIVOR`.

## 5b · Third finding: the multiplicity gate reads terminal `M`, not the Ville statistic `supM`

Raised by CodeRabbit on PR #672 and **verified against the code and empirically** — it is correct,
and it is the same family as §2 (the funnel's statistical semantics), so it is recorded here.

`falsify.ts` gates multiplicity on `epRes.M > 1` — the **terminal** wealth of the e-process. But
`bernoulli-eprocess.ts`'s own header (line 11) states the Ville result as
`P(exists t: M_t >= 1/alpha) <= alpha` and says, verbatim:

> `supM` is the statistic, not only terminal M.

The module exports `supM` (the running maximum) alongside `M`; the gate ignored it. A bind whose
wealth crosses the evidence threshold early and decays afterwards is therefore reported KILLED on
its terminal value.

Reproduced: 120 rows where the model is right (`outcome:1, modelProb:0.80, marketProb:0.50`)
followed by 120 where it is wrong (`outcome:0`, same probabilities):

```
supM (Ville statistic) = 3.122e+24     <- crossed 1/alpha = 20 by 23 orders of magnitude
M    (terminal wealth) = 5.516e-24
falsifyBind multiplicity: KILLED
  detail: e-value decayed M=0.000 (not growing/survivor)
```

**Two separable problems, and they were handled differently.**

1. **The decision rule** (terminal `M` vs `supM`). Reading terminal `M` is still a valid level-α
   test by Markov, just not anytime-valid and strictly less powerful. Critically its error
   direction is **conservative** — it can over-kill, never over-pass — so it cannot manufacture a
   false SURVIVOR. It is therefore left in force pending the same owner decision as §5, and a
   test now pins the current behavior so any change to it is deliberate.

2. **The record.** This half was fixed immediately, because it is a pure honesty defect with no
   verdict consequences: the old detail read only `e-value decayed M=0.000`, which is
   *indistinguishable* from a bind that never accumulated any evidence at all. A run that peaked
   at `supM=3e24` and one that never moved produced the same recorded string. `supM` is now
   carried in the detail on both the PASS and KILLED branches, so a crossing can never again be
   silently erased.

**Consequence for verdicts already on record:** any recorded `e=0.000` is ambiguous between
"never had evidence" and "had decisive evidence, then decayed" — the old detail string cannot
distinguish them. This is *not* a claim that any specific recorded verdict (YACoe included) was
wrong; re-running those binds with `supM` reporting is what would settle it, and that needs the
real data this container does not have.

## 6 · The acceptance tests encoded the defect too — all three now repaired

This is why the fix waited for an owner call: applying it required **changing the falsifier's own
acceptance tests**, and rewriting acceptance tests so a self-authored change passes is the pattern
the Honesty Laws exist to prevent. With approval given, all three were repaired — and each one
failed exactly as predicted below when the §5 fix landed, which is itself the confirmation that
the analysis was right. Three of them, in `__tests__/falsify.test.ts`:

**a. `"pure-noise outcomes fail shuffle"` asserts nothing.** Its assertion is

```ts
expect(["PASS", "KILLED"].includes(res.shuffle.verdict)).toBe(true);
```

In the `n >= minN` path, `shuffle` is assigned exactly one of `PASS` or `KILLED`
(`falsify.ts:106–108`) — so this is a tautology. A test named for the kill it verifies, which
cannot fail, is the same class of defect as the inert test it is guarding.

**b. `"sign-flipped second half fails split"` flips the outcome base rate, not the model edge.**
First half is `outcome:1, modelProb:0.7`; second is `outcome:0, modelProb:0.3` — a model that is
*right in both halves*. Under a model-aware split, per-row LLR is `log(0.7/0.5) = +0.336` in
**both** halves — stable and positive, so it would (correctly) PASS, contradicting the test's
stated expectation of `KILLED`. Making split model-aware means rewriting this fixture to flip the
model's edge (e.g. second half `outcome:0, modelProb:0.7`), not the base rate.

**c. `"clean data passes all 4: SURVIVOR"` uses a degenerate outcome vector.** `cleanRows()` sets
`outcome: 1` on every row. A label-permutation test is **vacuous** when the outcome vector is
constant — every permutation is identical to the original — so the repaired shuffle test still
could not discriminate on this fixture. It also asks the funnel to bless a model claiming `0.65`
where the outcome is always `1`, which is badly calibrated.

**How each was repaired:**

- **(a)** now asserts `shuffle.verdict === "KILLED"` on a genuinely independent model, built from
  a seeded LCG rather than an outcome-derived `modelProb`. The old fixture was a perfect oracle
  mislabelled "noise".
- **(b)** the fixture now flips the **model's** edge — first half `outcome:1/modelProb:0.7`
  (LLR `+0.336`), second half `outcome:0/modelProb:0.7` (LLR `−0.511`) — so the signs genuinely
  disagree and split kills it, asserting `signMatch=false`.
- **(c)** split in two: the degenerate `cleanRows()` fixture now has its own test asserting
  `shuffle=STARVED` / `overall=PARKED`, and a new non-degenerate `signalRows()` fixture carries
  the `SURVIVOR` case.

Also fixed while here: `Math.random()` in a falsifier acceptance test made the funnel's own suite
non-deterministic. Replaced with a seeded LCG.

**Still open — the one call not taken.** §5b's decision rule (terminal `M` → `supM`) remains
unapplied. Every change above makes a gate *harder* to pass; that one makes a gate *easier*, and
it is the only remaining gate that was ever doing real work. It needs its own explicit decision,
along with whether recorded verdicts get re-run under the repaired funnel.

## 7 · YACoe 341-row kill: reproduction attempt and honest status

Follow-up to §5b and to `2026-08-26-edge-program-verification.md` §2 row 8, which flagged the
recorded kill as unreproducible but capped its own sweep before independently re-running it. This
section is that re-run.

**Verdict: does not reproduce. `MULTIPLICITY KILLED (e=0.000)` cannot be regenerated from anything
committed to this repository — running the current converter on 341 harness-shaped rows yields
`SURVIVOR` with `M` on the order of `1.6e+55`, not `KILLED`.**

**a. The recorded claim, exactly.** `handoff/EDGE_LEDGER.md:207`:
```
[overnight-2026-08-24] EDGE HUNT RESUME — continued autonomously (no ask, no stop):
- Falsifier (falsifyBind, 341 row real-data YACoe backtest, 2022-2025): MULTIPLICITY KILLED (e=0.000). SURVIVOR not claimed. Honest.
```
No script name, no data file path, no `minN`, no seed — anywhere in the ledger entry.

**b. The commit that recorded it carries no evidence.** The entry landed in `ddf415fa4`
(`git log --all --oneline --grep=YACoe -i`), authored `Sun Aug 23 17:30:55 2026 -0500`, message
`[overnight-autonomous] falsify KILLED (YACoe real-data, multiplicity); ...`. `git show --stat
ddf415fa4` touches exactly three files: `AGENTS.md` (+1 boilerplate line), `handoff/EDGE_LEDGER.md`
(+6 lines — the claim quoted above), `memory/2026-08-24.md` (+1 summary line). **Zero code, zero
data file, zero test, zero script in the commit that recorded the kill.** Nothing to re-run.

**c. The converter's logic never changed.** `git log --all --follow --oneline -- packages/
prediction-engine/src/edge-lab/yacoe-edge-candidate.ts` returns exactly one commit ever:
`a2a2073ab` (`[wave3-w1] YACoe edge candidate: pre-registered, funneled`), authored
`2026-08-23 14:12:08 -0500` — three hours *before* the kill commit. So the file being run today is
the same file that (allegedly) produced `KILLED` then; `1c630fe1` (the shuffle/split fix) never
touched `yacoe-edge-candidate.ts` or the multiplicity gate, confirmed by the same `--follow` log
showing no second entry.

**d. The one committed data artifact is the wrong shape and the wrong run.** `data/nflverse/`
in this checkout contains exactly one file, `yacoe_real_backtest_results.json` (1855 bytes),
added in `14d53794a` (`[wave3-r36] first real-data YACoe backtest run`) — a *different*, earlier,
non-falsifier run (a Spearman-correlation study, `runId: "swarm-R36"`). Read in full: it is a
JSON **object** of aggregate fields (`runId`, `correlations`, `verdict` prose, ...), not an array
of `{season, week, playerId, yacAboveExpected}` rows. Its own metadata reads
`buildSeasons: [2021,2022,2023]`, `valSeason: 2024`, `holdoutSeason: 2025`, `rowsTotal: 7351` —
none of which is "341 rows, 2022-2025." Feeding it directly to `convertYacoeToBacktestRows()`
throws immediately: `harnessRows.map is not a function` (confirmed by execution — the function
signature at `yacoe-edge-candidate.ts:24-26` requires a `readonly {...}[]`, and this file is a
plain object).

**e. The real row-level data was never committed, at any point in history.**
`git log --all --oneline --diff-filter=A -- 'data/nflverse/*'` returns only `14d53794a` (the
summary file above). The row-level source R36 actually read,
`data/nflverse/ngs_receiving_2021_2025_harness_rows.json` (7351 rows, per
`EDGE_LEDGER.md:174`), and the raw `ngs_receiving.csv.gz` (981KB) it was built from, were never
`git add`-ed — not gitignored, simply never committed — and do not exist on disk in this
container either (`ls data/nflverse/` shows only the one JSON). There is no git ref, branch, or
stash anywhere (`--all`) containing a row-level YACoe dataset of any size, 341 or otherwise.

**f. Reproduction executed.** A throwaway script (`packages/prediction-engine/src/repro-yacoe-
probe.ts`, `npx tsx`, deleted after the run — not part of this diff) did two things: (1) loaded
the committed JSON and confirmed (d) by direct execution; (2) built 341 harness-shaped rows
(`{season, week, playerId, yacAboveExpected}`, seasons 2022-2025, deterministic seeded LCG) and
ran them through the *current, committed* `convertYacoeToBacktestRows()` and `falsifyBind(rows,
{minN: 100, seed: 7})` — the same options named in the converter's own constants
(`PRIOR_SEASON_KNOWN_AT_WEEK`, `MARKET_PROXY`). Observed output:
```
leakage:      PASS
shuffle:      PASS   model LLR=0.3728/row beats 200/200 label permutations
split:        PASS   firstHalfLLR=0.3608 secondHalfLLR=0.3847 signMatch=true
multiplicity: PASS   e-process M=1.6122007819591628e+55 growing (peak supM=1.612e+55)
overall:      SURVIVOR (all 4 PASS)
```
This independently reproduces the verification doc's own probe (`M=1.6122e+55`, same order and
same leading digits) and directly contradicts the ledger's `MULTIPLICITY KILLED (e=0.000)`. Two
probes, built independently, on the current committed code, both land on `SURVIVOR` with an
e-value roughly 55 orders of magnitude above the kill threshold — not a borderline case that the
§5b terminal-`M`-vs-`supM` ambiguity could flip either way (this run's `M` and `supM` agree).

**g. Why this is not a coincidence of seed choice — a structural finding.** Read
`yacoe-edge-candidate.ts:31-38`: `modelProb = clamp((yacAboveExpected + 2) / 4, 0.01, 0.99)` and
`outcome = yacAboveExpected > 0 ? 1 : 0` are **both derived from the same input number**, and
`modelProb` crosses `0.5` at exactly `yacAboveExpected = 0` — the same point where `outcome`
flips. So `sign(modelProb − 0.5) === sign(yacAboveExpected) === (outcome === 1)` by construction,
for every row, always (excepting the zero-measure case `yacAboveExpected = 0`). The converter
cannot produce a row where the model disagrees with the outcome's sign. That makes a `KILLED`
multiplicity verdict effectively unreachable for *any* well-formed input — real or synthetic — fed
through this converter, which is an independent reason to distrust the original claim beyond the
missing-evidence problem in (a)-(e): even if the true 341-row dataset resurfaces, this converter
would need unusually degenerate data (e.g. `yacAboveExpected` clustered at exactly `0`, or a
different converter entirely) to produce `KILLED`.

**h. Precisely what's missing, vs. what's just different.** Not a different git ref of the
converter (only one has ever existed). Not a different `falsifyBind` decision rule — the SURVIVOR
margin here is too large for the §5b terminal-M/supM ambiguity to matter. Not primarily a data-
size mismatch (341 is a specific, plausible number, and could not be checked against the
committed JSON because that file carries no row array at all — the "does 341 match the row count"
question in the task is unanswerable in this checkout, full stop, not merely "no"). What is
missing is the actual row-level artifact the `ddf415fa4` commit claims was run: no filename, no
script, no seed was ever recorded for it, no such file was ever committed to git (at any ref), and
the one committed artifact under `data/nflverse/` is provably a different, earlier, differently-
shaped run. Given (g), even recovering that exact file would only be dispositive if the original
run used a materially different mapping from `yacAboveExpected` to `modelProb`/`outcome` than the
one currently committed — because the current one structurally cannot KILL.

**What would settle this.** A future session with (1) the original `ngs_receiving_2021_2025_
harness_rows.json` or equivalent raw NGS rows, and (2) either the original (uncommitted, lost)
falsifier-run script or confirmation that the committed `yacoe-edge-candidate.ts` was in fact what
ran that night, would need to re-run the exact pipeline and compare. Absent (1), the honest status
is: **the 2026-08-24 `KILLED (e=0.000)` verdict is unsupported by any artifact in this repository,
contradicted by two independent reproductions on the current committed code (`SURVIVOR`,
`M≈1.6e+55`), and structurally implausible under the current converter's construction (g).** This
does not retroactively prove the original run never happened or that its 341 rows would survive if
recovered — only that nothing in the repository today can confirm, reproduce, or falsify it either
way.
