# OVERNIGHT RUN — Laguna on Hermes, night of 2026-08-20

You are the build seat (F-13). The founder is asleep and will not answer
anything until morning. There are no approvals available tonight. Work top to
bottom. Do not ask what to do next. Do not wait for a merge before starting
the next task.

**Stop conditions, exactly two:** (1) every lane below is DONE or
BLOCKED-on-founder, or (2) your runner hits its iteration cap, in which case
the founder relaunches you and you resume from the ledger.

**The one thing that matters most tonight:** an honest MVE. A BLOCKED MVE that
invented nothing is a good night. A run that quietly used the wrong model, or a
capital path with a number nobody can reproduce, is a catastrophic night that
ends this company's only real asset, which is its credibility. When in doubt,
stop and write BLOCKED.

**The one recipe for Lane A:** this pasted file. Do not re-derive James-Stein
from DeepSeek chats, from the literature dossier, or from mixing two formulas.
Do not hunt pitcher IDs. If a choice is not in Lane A below, it is out of scope
tonight.

**Supersession (read once):** PR #438 already contains
`docs/ops/hermes/OVERNIGHT-2026-08-20-LAGUNA.md`. That draft is **void**. Do
not check it out, do not implement `D_i = 1/(4 n_i)` from it, do not hunt
pitcher/park/weather, do not impute missing features into `q`. PR #439's
builder brief is the same recipe as this file except its printed θ vector is
wrong (it used B as the data weight). If any git file disagrees with this
paste, this paste wins for tonight's code.

---

## Standing law (unchanged, non-negotiable)

- Branch per task from latest `origin/main`. **Never push `main`.** Push
  feature branches freely tonight without asking.
- Guards with REAL exit codes, never piped away: `npx tsc --noEmit -p apps/web`,
  `node scripts/guardrails/trust-gate.mjs`,
  `node scripts/ops/check-agent-ledger.mjs`, then check `$?`. Piping through
  `tail` has masked a true failure twice in this project's history.
- Sealed paths untouched: `packages/db/prisma/schema.prisma`,
  `packages/db/prisma/migrations/**`. No migrations, no schema push, no gate or
  env-flag flips.
- Never weaken a guard to make a check pass. Never commit with `--no-verify`.
- One row in `docs/ops/AGENT_LEDGER.md` per task, with a resolvable commit SHA
  in Evidence. Report only what your diff and your command exit codes prove.
- Mandatory public metric language from the charter's HONESTY GATES, verbatim.
- Never print a secret, not even partially, not even a masked fragment.
- Do not deploy to Vercel. F-11 was a different seat.

---

## Ground state (verified, do not re-litigate)

- `main` was `2e016327` when this prompt was written. Re-fetch. Branch from
  **current** `origin/main`, not from a remembered SHA.
- **CI is red on `main`.** Pre-existing. Do not let Lane C eat Lane A. Timebox
  C after A1 is committed (or after A is BLOCKED-on-DB).
- PR **#438** (`claude/mlb-totals-prereg-eprocess-0j5rfd`, draft): prospective
  prereg, Amendment v2.1, `scripts/edge-lab/freeze-model-hash.mjs`. Manifest
  **requires** these paths to exist or the hash script exits 1:
  - `packages/prediction-engine/src/research/mve-eprocess.ts`
  - `packages/prediction-engine/src/research/mve-model-js.ts`  ← you create this
  - `scripts/edge-lab/run-mve.ts`
  - `docs/ops/edge/2026-08-20-mve-prereg-v2.md`
  - `docs/ops/edge/2026-08-20-prospective-prereg-mlb-totals-js.md`
- PR **#439** (`docs/ten-cluster-literature`): map, not an edge. Builder brief
  lives there as `docs/ops/edge/2026-08-20-mve-builder-brief.md`. Lane A below
  **is** that brief, inlined so you do not need the PR to merge first.
- `hermes/hf5-mve`: e-process module is CORRECT and frozen. Runner ordering is
  prediction-clean (`predictOver` before `update`). **Its `q_t` is `NbRbpf`
  with `nPitchers: 1`, `nUmpires: 1`, pitchers pinned to 0, park = home index.**
  That is not the James-Stein model. **Do not run the MVE on NbRbpf.**
- The MVE has NOT run. No capital, no `n`, no exclusion count exists anywhere.
- `jamesSteinShrink` in `packages/prediction-engine/src/edge-lab/kelly.ts` is a
  **staking haircut toward zero**. Never import it into `q`.
- `Game` in Prisma has **no starting-pitcher ID**. Do not join ESPN, mlbverse,
  or StatsAPI tonight. Logging "pitcher unavailable, 100% of games" is honest.
  Inventing FIP is not.
- `forecast-skill-eprocess.ts` and `bernoulli-eprocess.ts` are **wrong nulls**
  for H-F5. Do not use them. Search `eprocess` on GitHub hits the Windows
  kernel. Our file is `mve-eprocess.ts`.

### Copy these files onto your Lane A branch (do not rewrite them)

Exact commands, from a branch off current `origin/main`:

```
git fetch origin hermes/hf5-mve claude/mlb-totals-prereg-eprocess-0j5rfd
git checkout origin/hermes/hf5-mve -- packages/prediction-engine/src/research/mve-eprocess.ts packages/prediction-engine/src/research/mve-eprocess.test.ts scripts/edge-lab/run-mve.ts
git checkout origin/claude/mlb-totals-prereg-eprocess-0j5rfd -- docs/ops/edge/2026-08-20-mve-prereg-v2.md docs/ops/edge/2026-08-20-prospective-prereg-mlb-totals-js.md scripts/edge-lab/freeze-model-hash.mjs scripts/edge-lab/freeze-model-hash.test.mjs
```

Do **not** checkout `docs/ops/hermes/OVERNIGHT-2026-08-20-LAGUNA.md` from #438.

Do not change `mve-eprocess.ts`. Wire `run-mve.ts` so `qOver` comes from
`mve-model-js.ts`, not from `NbRbpf`. Prefer deleting the `NbRbpf` construction
from the runner entirely so there is one `q`.

`m` tonight is the **existing Shin-devigged median** from `entryForGame` (MVE
prereg-v2). The prospective-track document pins a *later* live null to
vig-inclusive `1/D_i`. Do not swap `m` to vig-inclusive tonight; that would
be a different experiment. Do not treat Shin as a bug.

---

## Resolved contradictions (read once, then stop arguing with the docs)

PR #438 section 3 is the **prospective-track** wish list (pitcher FIP, bullpen,
park, weather, umpire, rest). The schema cannot serve those tonight. Implementing
phantom features is a false model.

Tonight's MVE model is a **recorded subset**:

| #438 section 3 says | Tonight you do |
|---|---|
| Hierarchical Poisson or NB on total runs | **NB2**, φ frozen at **12**, recorded in the `mve-model-js.ts` header |
| Arc-sine / Anscombe, `D_i = 1/(4 n_i)` | **Log totals**, `D_i = s² / n_i`. `1/(4n)` is for those transforms, not for `log(y+0.5)` |
| Shrink team **and pitcher** after park/weather/market partialled out | **Team-level only.** No pitcher column. No park/weather join. Do not partial what you do not have |
| Fay-Herriot residuals vs market | Shrink team log-means. Market `m` enters **only** the e-process, never the shrinker |
| Charter `(p-2) σ² / sum(...)` | **Do not implement.** Equal-variance special case. Efron-Morris §3 only |
| WSR `λ ∈ (-1/(1-m), 1/m)` as a game filter | **Do not apply.** Wrong functional. λ stays 0.3 |
| Abort if `\|q-m\|` looks like an echo | **Do not abort.** Print `mean\|q-m\|` and `corr(q-m, 1{over}-m)` in RESULTS.md. Capital path is the verdict |

If #438 and this prompt disagree, **this prompt wins for tonight's code.** After A1
lands, add a 10-line "Tonight's subset" note at the top of
`mve-model-js.ts` listing φ=12, team-only, log scale, `D_i = s²/n_i`, c=1.5.
The freeze hash will bind that file.

---

## LANE A — the MVE. Highest value. Start here.

### A1. James-Stein outcome layer (does NOT need a database)

Do this FIRST so a connectivity blocker cannot waste the night.

Create **`packages/prediction-engine/src/research/mve-model-js.ts`**
(that exact path — the hash manifest names it) plus
`packages/prediction-engine/src/research/mve-model-js.test.ts`.

Pure. No fs, no env, no Prisma, no NbRbpf.

**Public API (keep it this small):**

```ts
export const MVE_JS_PHI = 12;
export const MVE_JS_C = 1.5;
export const MVE_JS_POOLED_VAR_FALLBACK = 0.04;

export function shrinkLogMeans(
  units: readonly { id: string; x: number; n: number }[],
  pooledVar: number,
): ReadonlyMap<string, number>; // id -> theta

export function qOverFromPast(input: {
  homeId: string;
  awayId: string;
  line: number;
  past: readonly { homeId: string; awayId: string; y: number }[];
}): number; // P(Y > line)
```

**Shrinkage (the only formula):**

Scale is `X_i = mean of log(y_g + 0.5)` over team i's past games in `past`
(y = homeScore+awayScore of those games). If n_i = 0, θ_i = Xbar and B_i = 1.

- Xbar = **unweighted** mean of the k team-level X_i (not game-weighted).
- Pooled s² = Bessel sample variance (denom n−1) of all past **game-level**
  log(y+0.5) values. If fewer than 8 past games league-wide, s² = 0.04.
- D_i = s² / n_i
- k = number of teams with n_i ≥ 1. If k < 3, no shrinkage (θ_i = X_i;
  n=0 units still get Xbar).
- A_hat = max(0, (sum_i (X_i - Xbar)² - sum_i D_i) / k)
- B_i = D_i / (A_hat + D_i); if denominator is 0, B_i = 1.
  **B_i is the weight on the grand mean**, not on the data.
- θ_i = Xbar + (1 - B_i) (X_i - Xbar)
  Equivalent: θ_i = (1-B_i) X_i + B_i Xbar.
  **Never** `Xbar + B_i (X_i - Xbar)`.
- Limited translation: the step from X_i toward Xbar is
  `δ = B_i (X_i - Xbar)`; θ = X_i − δ. If `|δ| > 1.5 * sqrt(D_i)`, replace
  δ with `sign(δ) * 1.5 * sqrt(D_i)`. Frozen c = 1.5.

Predicted log-mean for a game: (θ_home + θ_away) / 2.
μ = exp(that).
qOver = P(Y > line | μ, φ=12).

`nbOverProb` in `nb-rbpf.ts` is **private**. `logNbPmf` is already exported.
Implement the 8-line NB2 tail `P(Y > line)` inside `mve-model-js.ts` using
`logNbPmf`. Do not import `NbRbpf`. Do not create `efron-morris-js.ts` — the
hash manifest names `mve-model-js.ts` only. Line is the **entry** median
total, never close.

**Worked numbers (lock these in the test, tol 1e-3). These θ values are
arithmetic, not a copy from #439:**

```
k=4, X=[2.1, 2.2, 2.0, 2.4], n=[4, 20, 4, 8], s²=0.04
D=[0.01, 0.002, 0.01, 0.005]
Xbar=2.175
sum (X-Xbar)²=0.0875
sum D=0.027
A_hat=max(0,(0.0875-0.027)/4)=0.015125
B=[0.397015, 0.116788, 0.397015, 0.248447]
θ=[2.129776, 2.197080, 2.069478, 2.344099]
```

If your test expects [2.145, 2.197, 2.105, 2.231] you used B as the data
weight. Fix the test, not the formula.

Limited translation does not bind on this vector. Add a second case: one unit
with D_i=0.01 so far from Xbar that |B(X-Xbar)| > 1.5*sqrt(D_i); assert
|θ-X| equals 1.5*sqrt(D_i) within 1e-9.

Other tests: k=1 and k=2 → identity; n=0 unit → θ=Xbar; A_hat floors at 0
when between-team SS < sum D.

**Runner loop (copy this; do not improvise order):**

```
load FINAL MLB games in the runner's existing CORPUS window
load TOTALS odds for those ids
past = []
for each game in commenceTime order:
  entry = entryForGame(...)          // existing 6–3h, ≥3 books, ≤15 min, Shin
  if entry is null: excluded++; continue
  qOver = qOverFromPast({ homeId, awayId, line: entry.line, past })
  y = homeScore + awayScore
  if y == line: pushes++; past.push(...); continue
  observations.push({ qOver, mOver: entry.mOver, y, line })
  past.push({ homeId, awayId, y })   // AFTER qOver
path = runSideAdaptivePath(observations)
write RESULTS.md + path.json
```

Add to RESULTS.md (report, do not gate): `mean|q-m|`, `corr(q-m, 1{over}-m)`
on graded bets. Imputation line: `pitcher/park/weather/umpire: not in Game
schema, 100% unused (not imputed into q).`

**If you cannot finish A1 tonight, that is an acceptable outcome. Do NOT run
the MVE with NbRbpf in order to have something to show.** Amendment v2.1
forbids certifying one model while intending to trade another.

Existing `mve-eprocess.test.ts` must stay green. Do not change λ, side rule,
or miss term.

### A2. Database triage (bounded: 30 minutes, then move on)

Runtime `DATABASE_URL` has pointed at localhost and failed `28P01`. In order,
try the unpooled variable, the pooled and direct Neon hosts, and the read-only
`hermes_ro` role used for the H-F7 archive count. Print no secret and no
fragment of one.

If none connect: write BLOCKED with the exact SQLSTATE / driver error name
(not the connection string), stop Lane A, move to Lane B. **Invent nothing.**
No capital, no `n`, no exclusion count, no "approximate" or "expected" anything.

`run-mve.ts` must still exit 2 on auth failure. Do not swallow it.

### A3. Freeze the hash

Once A1 lands and the runner points at `mve-model-js.ts`, from repo root:

`node scripts/edge-lab/freeze-model-hash.mjs`

It exits 1 and names missing files until the manifest is complete. When it
exits 0, paste the composite digest into section 5 of
`docs/ops/edge/2026-08-20-prospective-prereg-mlb-totals-js.md`, replacing
"NOT RECORDED", and commit it in the same change. Do not type a hash from
memory.

### A4. Run ONE cycle

One. Ever.

- Do not retune anything after seeing the path.
- Do not compute an alternate window, lambda, side rule, or variant, not even
  diagnostically, not even "just to check".
- Do not re-run because you dislike the number.
- Apply `bindingOutcome` in `mve-eprocess.ts`: KILL, CERTIFY_DRAFT, or
  DID_NOT_CERTIFY_DID_NOT_SURVIVE. No fourth state.
- Report: final capital, n graded, chronological capital path, max drawdown,
  crossings at 2/5/10/20, exclusion count with reasons, push count,
  mean|q-m|, corr, and the unused-feature line from A1.

---

## LANE B — finish the H-F5 audit document

A previous seat got most of the way through this. **Re-derive; do not trust.**
Write `docs/ops/hermes/hf5-mve/AUDIT.md` covering:

- formula vs prereg-v2 vs `mve-eprocess.ts` (miss term is `(1-q_bet)`, not
  `(1-q_bet)/(1-m_bet)`)
- walk-forward: `qOverFromPast` / predict must not see game N's y. Cite the
  loop order as evidence.
- entry-price cleanliness: 6-3h, quote age <= 15 min, >= 3 books, ESPN
  excluded, exclusions counted
- push handling, one-bet-per-game, checkpoint cadence, bindingOutcome
- NbRbpf-vs-James-Stein gap and what Lane A actually shipped (team-only log
  EM, not the full #438 feature list)

**The builder may not be the sole auditor of A1.** If you implemented A1, say
so in AUDIT.md and mark "A1 needs a different seat" rather than signing it off.

---

## LANE C — CI red on `main` (timebox 90 minutes after A1 or A-blocked)

This blocks merges. It is not more important than an honest MVE.

1. Root-cause `Run tests (all workspaces)` on `origin/main`. Read the CI log.
   Name the failing suite. Fix only if the fix is real and local. **Never
   delete, skip, or quarantine a test to get green.**
2. `AI transport import boundary`: 8 violations in
   `apps/web/lib/claude-api/jynx-errors.ts`, `jynx.ts`, and
   `scripts/ops/smoke-free-lane.mjs`, introduced in `17b06990`. The only two
   fixes are routing those imports through `callClaude`, or allowlisting.
   **Do not allowlist.** If the routing refactor is clean and local, do it.
   If not, write the proposed patch into the ledger and leave it. Say which
   you chose.

If 90 minutes is up, ledger NOT REACHED remainder and move on.

---

## LANE D — documentation integrity (cheap, do it)

`docs/ops/hermes/FINAL-RUN-2026-08-20.md` around line 98 still states

`E_t = 1 + 0.3(Y·q/m + (1-Y)(1-q)/(1-m) - 1)`

That is the **point-null** miss term. Frozen form in `mve-eprocess.ts` and
prereg-v2 is `(1 - q_bet)`. Correct the doc to match the frozen spec. Commit
message must say **only the doc was wrong; the code was right.**

---

## LANE E — C-62 CLOSE stamps (needs a database)

`odds_line_snapshots` showed CLOSE = 0 for MLB and NFL. Stamps are written at
settle by `markClosingSnapshotsIfEnabled`; the flag only bound at the
`7294739c` deploy, so zero was expected then. **MLB games have since settled.**
If CLOSE is still 0, Definition-of-Done item 7 is NOT satisfied. Re-count as
`hermes_ro`, SELECT only. Record the number either way. If A2 is BLOCKED, this
lane is BLOCKED with the same error code. Do not invent a count.

---

## Founder-morning report

Leave `docs/ops/hermes/hf5-mve/MORNING.md` as the first file the founder reads,
and append matching rows to `docs/ops/AGENT_LEDGER.md`.

1. Lane by lane: DONE / BLOCKED / NOT REACHED, each with a command and its
   exit code, or the exact error text (no secrets).
2. The MVE's state in **one sentence**, no hedging: not run / killed /
   did-not-survive / certify-draft. If not run, the blocker in the same sentence.
3. Founder-only action list, in order, with the exact command or console step.
4. Anything you chose not to do, and why.
5. Confirm: NbRbpf was **not** the `q` that entered the e-process.
6. Confirm: you implemented this paste, not PR #438's overnight file.

---

## Do not, under any circumstances

- Run the MVE more than once, or with NbRbpf as `q`.
- Implement `docs/ops/hermes/OVERNIGHT-2026-08-20-LAGUNA.md` from PR #438.
  That file is the superseded draft.
- Swap Shin-devigged `m` to vig-inclusive `1/D_i` tonight.
- Import `jamesSteinShrink` from `kelly.ts`.
- Implement `D_i = 1/(4 n_i)` on log totals, or the charter `(p-2)` factor as
  the general case.
- Hunt pitcher/weather/umpire data. Not in `Game`. Log unused.
- Invent a capital number, an `n`, an exclusion count, or a CLOSE count.
- Push `main`, touch a sealed path, flip a gate or env flag, or run a migration.
- Weaken, skip, or quarantine a guard or a test to turn a check green.
- Publish anything to a public surface as a claim of edge. Prospective track
  is ARMED, NOT FIRED, until the founder signs it.
- Describe "asymmetric fractional e-variable" as established literature. House
  name for our increment, not a citation.
- Deploy to Vercel.
- Reopen L-15, L-16, or L-17 as edge mechanisms.
- Apply a WSR λ-interval filter, GROW mixture, or point-null LR.
- Abort the cycle because mean|q-m| looks small. Report it.
