# DFS Lessons Ledger

Every entry is a loss we actually took, the rule it produced, and where that rule
now lives in code. A lesson that lives only in a document is a lesson you get to
relearn, so each one names the test that fails if someone removes it.

Format: what shipped, what happened, why, the rule, where it is enforced.

Status legend: **WIRED** (enforced in code, covered by a test) ·
**PARTIAL** (encoded but not yet wired into a caller) · **OPEN** (documented only).

---

## Week 2, 2026 (2026-09-20) — 15-game Sunday-Monday slate, 75-entry winner-take-all

The lineup that prompted this file:

| Slot | Player | Salary | Own | Result |
|---|---|---|---|---|
| QB | Jayden Daniels | $6,300 | 9.2% | |
| RB | Christian McCaffrey | $8,000 | 26.7% | |
| RB | Kenneth Walker III | $6,500 | 5.1% | |
| WR | Stefon Diggs | $5,300 | 8.8% | |
| WR | Terry McLaurin | $5,200 | 5.1% | |
| WR | **Justin Jefferson** | $7,800 | **1.8%** | **8.50 DK** |
| TE | Dalton Schultz | $3,200 | 15.6% | |
| FLEX | **DK Metcalf** | $5,200 | **1.3%** | **6.70 DK** |
| DST | Jaguars | $2,400 | 9.6% | |

Both failures were the same mistake, made twice in one afternoon, and both were
players selected **because** their ownership was low.

---

### L-1 — Low ownership is only edge in a clean environment

**WIRED.**

**What happened.** Justin Jefferson was rostered at 1.8% projected ownership, the
largest ownership dislocation on the slate for a receiver with a 39.1% target
share. He scored 8.50. Final score: **MIN 9, CHI 3** against a 47.5 total.

**Why.** The NWS Chicago point forecast, issued 10:21 AM CDT that morning, read
"northeast wind 15 to 25 mph, with gusts as high as 30 mph. Chance of
precipitation is 90%." That forecast was read, written down, and cited more than
once before lock. It was then overridden by the ownership number.

**The error, precisely.** `dfs-slate.ts` scores contrarian upside as:

```ts
leverage(p) = p.ceiling / (p.own * 100 + 1.5)
```

That expression cannot distinguish *"the field has not noticed this player"*
from *"the field noticed something you did not."* Both present as low ownership
and both receive identical credit. Jefferson's 1.8% was not a market error. It
was the market correctly pricing a receiver in a 30 mph crosswind, and we read
their correctness as our edge.

**The rule.** When a player carries a visible, public suppressor, the field's low
ownership is an assessment, not an oversight, and the contrarian credit is
cancelled in proportion to severity.

**Where enforced.** `lib/fantasy/dfs-signals.ts` — `buildPenalty()` adds
`leverage(p) * 6 * worstSeverity(...)` in `leverage` mode, cancelling exactly the
credit `objVal` grants. Suppressors: `wind`, `precipitation`.
**Test:** `dfs-signals.test.ts` → *"THE ASYMMETRY RULE: low ownership earns no
leverage credit under a suppressor"* and *"L-1: suppresses Justin Jefferson for
the wind, despite 1.8% ownership."*

**Corollary that also bit us.** Naming a risk and then not acting on it is worse
than missing it, because it produces false confidence in the rest of the build.
The weather was flagged in writing three times and the player stayed in the
lineup. A flag that does not change the lineup is not a flag, it is a note.

---

### L-2 — Role cannot pay in an offense that does not score

**WIRED.**

**What happened.** DK Metcalf was rostered at 1.3% ownership on a strong role
case: Michael Pittman ruled out made him the outright alpha, New England's CB1
Carlton Davis was inactive having not practiced all week, and he had a 27% target
share with 204 air yards in Week 1. He scored 6.70. Final score: **PIT 3, NE 20.**

**Why.** Pittsburgh's implied team total was **18.0 — third-lowest on the slate**
— in a 41.5-point game, the fourth-lowest. That number was in our own Vegas table
the entire time. Target share was allowed to override scoring environment.

**The rule.** A pass catcher's usage metrics are a *share of a quantity*. When the
quantity is bottom-of-slate, the share is worth little regardless of how dominant
it is. Implied team total gates role, not the other way round.

**Where enforced.** `dfs-signals.ts` → `low_team_total` suppressor, ramping from
no effect at 20.0 implied to full effect at 15.0. Applies to QB, RB, WR and TE.
**Test:** `dfs-signals.test.ts` → *"L-2: suppresses DK Metcalf for an 18.0 implied
team total, despite 1.3% ownership."*

---

### L-3 — The contest's payout shape decides the objective

**WIRED.**

**What happened.** A "flagship" build was proposed using the repo optimizer's
**cash** solver output (159.2 projected) for a contest paying **one** place out of
75. Measured against a field built from real ownership, it scored roughly half
the win probability of a ceiling-oriented build.

**Why.** `cash` mode maximises `p.proj` — the mean. A contest paying one place is
won in the right tail. Optimising the mean for a top-heavy payout is not a tuning
error, it is the wrong objective function.

**The rule.** Payout rate picks the mode. Above ~5% of the field paid, maximise
the mean. At or below, maximise ceiling — and in a *small* top-heavy field prefer
`gpp` over `leverage`, because the extreme differentiation `leverage` buys is
priced for a 100k-entry field, not a 75-entry one.

**Where enforced.** `dfs-signals.ts` → `adviseMode(contest, chosen)`, surfaced on
every solve via `dfs-solve.ts` → `SolveResult.modeAdvice`.
**Test:** `dfs-signals.test.ts` → *"adviseMode — L-3"* block.

---

### L-4 — In a small field, the popular correlation is a liability

**PARTIAL.**

**What happened.** The first recommended build was a 5-man Dallas game stack.
LineStar's ownership feed for the exact 15-game slate showed the Dallas stack was
**the field's single most-duplicated correlation.** In a 75-entry winner-take-all
where second place pays nothing, hitting the same stack as several other entrants
converts a win into a coin flip.

**The rule.** Duplication risk is a real cost in small fields, separate from
ownership. Rank on correlated tournament score, not raw projection.

**Where enforced.** `dfs-correlation.ts` already implements `duplicationRisk()`
and `rankByTournamentScore()`; `dfs-solve.ts` now ranks every solve through them
instead of by projection. **Still open:** neither reads `ContestShape`, so
`dupWeight` does not yet scale with field size. A 75-entry contest should punish
duplication harder than a 100k-entry one.

---

### L-5 — A one-game sample is not a weakness

**PARTIAL.**

**What happened.** The central thesis for the Washington stack was "Dallas pass
defense grades 3.2nd percentile, the worst unit in the lab." That figure came
from **one game.** The same lab's 2025 full-season table had Dallas at **-0.179
defensive EPA per play, which is a good defense.**

The thesis survived anyway on evidence that did not depend on the sample — the
slate-high 50.5 total, both teams implied above 23, two confirmed defensive
starters inactive, and a rushing quarterback's floor. But it was argued from the
percentile, and the percentile was noise.

**The rule.** 2026 single-game defensive splits are noise and may not carry a
build on their own. Pair every early-season defensive claim with a prior-season
baseline and say which is which. Where a bull case rests on n=1, it earns **no
contrarian credit.**

**Where enforced.** `dfs-signals.ts` → `thin_sample` suppressor. Deliberately
costs **zero points** but cancels leverage credit, because the problem is
confidence, not projection.
**Test:** `dfs-signals.test.ts` → *"records a thin-sample flag that costs no
points but cancels leverage credit."*
**Still open:** `WEEK2_2026_THIN_SAMPLE` is empty. Populating it requires a
source of per-claim sample sizes that does not exist yet. Empty is correct and
inert, per "absent data is not evidence" — it is not a silent pass.

---

### L-6 — The airwave is a signal layer, not background reading

**WIRED.**

**What happened.** Ten shows' worth of analyst consensus was supplied as a
document and treated as prose to skim for colour. It contained hard, repeated,
multi-source reads — four independent shows fading Drake London on the Cooper
Rush quarterback change, three fading the entire Titans offense — that never
entered any calculation.

**The rule.** Analyst consensus is a typed input with a source count. Two or more
independent sources constitute a consensus; one is an opinion and carries no
weight. **FADE reads penalise. START reads do nothing** — a chorus of people
liking a player is not a reason for the solver to like him more, it is the reason
his ownership will be high, which `leverage` already prices.

**Where enforced.** `dfs-signals.ts` → `AirwaveRead`, `airwave_fade` suppressor.
Week 2's corpus is transcribed in `dfs-signals-week2-2026.ts`.
**Test:** *"a single airwave source is an opinion, not a consensus"* and *"a START
airwave read carries no weight."*

---

## Week 1, 2026 — carried forward from the corpus

### L-7 — Week 1 is a liar

**OPEN.**

Usage is signal in Week 1; efficiency and box score are not. The Week 1 2026 DK
Millionaire winner (273.98, 832,342 entries) was made by three running backs over
35 points — Gibbs, Henry and Swift — a trio **0.06% of the field** rostered. The
winning edge was role concentration, not the stack.

**The rule.** Do not chase last week's points. Weight route participation, snap
share and target share; discount yards and touchdowns. Not yet encoded — it
belongs upstream in whatever produces `proj`, not in a penalty layer.

### L-8 — Stack structure, from two years of winners

**OPEN.**

89% of winning DK NFL lineups paired the QB with at least one pass catcher, 83%
ran a game stack with a bring-back, and every other construction strategy tested
appeared in 60% or less. Small-field research adds that roughly **two chalk
anchors plus three sub-10% differentiators** is the winning shape, and that an
~85th percentile score takes down a 60-person contest, against 99.9th in a
large field.

**The rule.** `stack: true` is close to mandatory; a bring-back should be a
first-class constraint, not an accident. `dfs-optimizer.ts` enforces a QB stack
but has no bring-back concept.

---

## The shape of every mistake in this file

Five of the six Week 2 entries are the same failure wearing different clothes:

**A number that looked like an edge was actually the market, or the sample, or
the field, telling us something we did not want to hear.**

Low ownership was the market. The 3.2nd percentile was the sample. The popular
stack was the field. In each case the correct reading was available before lock,
in writing, from a source we had already fetched.

The signal layer exists so that none of those readings depends on a human
remembering to care about them at 11:55 AM.

---

## Known pre-existing defect, found while wiring this (not caused by it)

`dfs-optimizer.ts` line 79 calls `Math.random()` inside `buildRandom()`. The
module docblock claims the solver is "fully deterministic", and
`dfs-optimizer.test.ts` asserts *"contains no Math.random anywhere"*. That test,
and 11 others in the same file, **fail on a clean tree** — verified by stashing
all signal-layer work and re-running.

Consequence for DFS specifically: repeated solves of the same slate can return
different lineups, and the exact branch-and-bound is seeded by a randomised
heuristic, so its "optimum" is not reproducible. Not fixed here — out of scope
for the signal layer and a separate change with its own risk. Recorded so it is
not rediscovered as a regression.
