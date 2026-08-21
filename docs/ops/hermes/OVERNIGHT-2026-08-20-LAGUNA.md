# OVERNIGHT RUN — Laguna on Hermes, night of 2026-08-20

You are the build seat (F-13). The founder is asleep and will not answer
anything until morning. There are no approvals available tonight. Work top to
bottom, do not ask what to do next, do not wait for a merge before starting the
next task.

**Stop conditions, exactly two:** (1) every lane below is DONE or
BLOCKED-on-founder, or (2) your runner hits its iteration cap, in which case the
founder relaunches you and you resume from the ledger.

**The one thing that matters most tonight:** an honest MVE. A BLOCKED MVE that
invented nothing is a good night. A run that quietly used the wrong model, or a
capital path with a number nobody can reproduce, is a catastrophic night that
ends this company's only real asset, which is its credibility. When in doubt,
stop and write BLOCKED.

## Standing law (unchanged, non-negotiable)

- Branch per task from latest `origin/main`. **Never push `main`.** Push feature
  branches freely tonight without asking.
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

## Ground state you are starting from (verified, do not re-litigate)

- `main` = `2e016327`. **CI is red on `main`** and has been for at least six
  commits. Three failing jobs, all pre-existing: `AI transport import boundary`,
  `All guardrails`, and `Test, type-check, lint, Prisma` (failing step is
  `Run tests (all workspaces)`; Lint and Type check both PASS). Evidence: CI run
  `32326750573` on `main` at `2e016327`; the other nine jobs are green.
- PR **#438** (`claude/mlb-totals-prereg-eprocess-0j5rfd`) carries three things
  you need tonight: the prospective pre-registration with the **James-Stein
  model spec in section 3**, **Amendment v2.1** binding the MVE's model to that
  spec, and `scripts/edge-lab/freeze-model-hash.mjs`. Read all three before
  starting Lane A.
- PR **#439** (`docs/ten-cluster-literature`) carries the literature dossier.
  It is a map, not an edge. Read its James-Stein and e-process sections before
  Lane A; they are what corrected the shrinkage formula below.
- `hermes/hf5-mve` @ `0035e3b4`: the e-process module is CORRECT and frozen, and
  the runner's ordering is prediction-clean (`predictOver` before `update`;
  `predictOver` reads only unit indices and the line, never the realized total).
  **But its `q_t` source is `NbRbpf` with `nPitchers: 1`, `nUmpires: 1`,
  pitcher/umpire pinned to 0 and park aliased to the home-team index** — so not
  one item from the charter's feature list reaches the model. The dossier
  reaches the same conclusion independently (cluster 9, and the James-Stein
  section).
- The MVE has NOT run. No capital, no `n`, no exclusion count exists anywhere,
  in any file, in anyone's head.
- `jamesSteinShrink` in `packages/prediction-engine/src/edge-lab/kelly.ts` is a
  **staking haircut toward zero**. It is NOT the outcome model and must not be
  copied into the predictive `q`. The dossier says this explicitly. Do not
  shortcut Lane A by reusing it.

---

## LANE A — the MVE. Highest value. Start here.

### A1. Implement the team-level Efron-Morris outcome layer (does NOT need a database)

**Single authority for the model: section 3 of
`docs/ops/edge/2026-08-20-prospective-prereg-mlb-totals-js.md`, as amended
2026-08-21 (Amendment v2.2). Read it in full before writing code.** It replaces
the pitcher/bullpen/park/weather/umpire feature list this file used to point
you at — that list is confirmed unbuildable tonight without fabricating data.
`docs/ops/edge/2026-08-20-mve-builder-brief.md` (PR #439) is background and
implementation detail only — its file layout and runner-loop shape are useful,
but wherever it conflicts with the amended section 3 (its limited-translation
cap, its `log` transform, its own worked-example `theta` values), **section 3
governs, not the brief.**

**Before touching any code, confirm the gating condition:** check the ledger,
`docs/ops/hermes/hf5-mve/RESULTS.md`, and any capital-path file for evidence
that an MVE observation has already been graded on this branch or any branch
that fed it. If one has, **stop** — do not proceed with this amendment, write
BLOCKED with the evidence, and escalate to the founder; Amendment v2.1 (and
now v2.2) both close further amendment once a single observation is graded.
The 2026-08-20 ground state above states zero observations exist, but that
note is now a day old — re-verify it yourself before relying on it.

Build `packages/prediction-engine/src/research/efron-morris-js.ts` implementing
section 3 exactly. Binding points, all frozen:

- Team-level shrinkage of each team's own history of game totals
  (`homeScore + awayScore`), **square-root (Anscombe) transformed**
  (`y = sqrt(x + 3/8)`), not `log`.
- **Efron-Morris (1975) section 3**, unequal-sample-size, positive-part:
  `theta_i = Xbar + (1 - B_i)(X_i - Xbar)`, `B_i = D_i / (A_hat + D_i)`,
  `A_hat = max(0, (sum_i(X_i - Xbar)^2 - sum_i D_i) / k)`. `Xbar` is the
  **simple, unweighted mean** across the `k` teams with `n_i >= 1` — not
  precision-weighted.
- `k >= 3` required for shrinkage to apply; below that, `theta_i = X_i`
  (or `Xbar` if `n_i = 0`, with `B_i = 1`).
- **No limited-translation cap.** Do not implement one. It is mis-cited,
  un-frozen, and the literature dossier's own verdict on it is GATE, not
  ADOPT.
- Back-transform: `mu = max(MU_FLOOR, ((theta_home + theta_away) / 2)^2 - 3/8)`
  — the section's own square-root back-transform, applied once to the
  home/away average. **Not `exp()`.** `MU_FLOOR` (e.g. `0.5`) guards
  `nbOverProb` against a non-positive mean; log every game where it binds.
- `phi = 12` fixed. `q_t^O = nbOverProb(mu, phi, L)` using the existing NB2
  tail helper in `nb-rbpf.ts`.
- **Export `nbOverProb` from `nb-rbpf.ts`** (currently module-private, line
  131 — add the `export` keyword). Call it directly. Do not reimplement a
  second PMF.
- **Do not implement a placeholder/imputation fallback for pitcher, bullpen,
  park, weather, or umpire.** These are not occasionally missing — they are
  structurally absent from every game today. A frozen "group mean" for a
  feature that is identical on every game is fabricated data, not a richer
  model. Section 3's earlier text permitted imputation for occasionally-absent
  features; that permission does not apply to these four, and does not survive
  this amendment for them.
- **Do not wire in `restDaysHome/Away`, `isBackToBackHome/Away`, or
  `scheduleDensityHome/Away`** this cycle, even though they are real and
  reachable. Section 3 defines no mechanism for a second covariate to enter
  this shrinkage estimator; leave them out and note them in your report as the
  named first candidate for the next amendment.

Unit tests required in
`packages/prediction-engine/src/research/efron-morris-js.test.ts`, and they
must include: the locked worked example from section 3 point 12
(`theta = [2.129851, 2.197080, 2.069652, 2.344099]`, tolerance `1e-3` — **not**
the builder brief's `[2.145, 2.197, 2.105, 2.231]`, which is arithmetically
wrong for 3 of 4 teams); `k < 3` returns identity; `n_i = 0` returns `Xbar`
with `B_i = 1`; `A_hat` floors at 0; the Anscombe back-transform round-trips;
`mu` stays positive (`MU_FLOOR` binds correctly) on a constructed low-scoring
input.

Then point the runner's `q_t` source at it. Order of operations in
`scripts/edge-lab/run-mve.ts` (unchanged from the builder brief — this part of
it is correct and independently verified to preserve walk-forward causal
validity):

```
for each game in commenceTime order:
  entry = entryForGame(...)          // existing: 6-3h, >=3 books, <=15 min, Shin, median line
  if entry is null: excluded++; continue
  qOver = efronMorrisQOver(home, away, entry.line, pastGames)   // reads history only, never this game's y
  y = homeScore + awayScore
  if y == line: pushes++; record past game; continue
  observations.push({ qOver, mOver: entry.mOver, y, line })
  record this game into pastGames    // AFTER qOver — walk-forward, never before
```

`filter.predictOver`/`NbRbpf` may still run for a logged diagnostic column, but
the e-process uses this module's `qOver` only. Prefer skipping the particle
path entirely this cycle if it is extra work — one `q`, no dual model.

**If you cannot finish A1 tonight, that is an acceptable outcome. Do NOT run
the MVE with `NbRbpf`, and do NOT run it with the original six-feature spec
using imputed placeholders, in order to have something to show.** Both are
prohibited — the first by Amendment v2.1/v2.2, the second by CLAUDE.md rules
#1/#2.

### A2. Database triage (bounded: 30 minutes, then move on)

The runtime connection string points at localhost and fails `28P01`. A
previous seat also failed against the Neon host. In order, try the unpooled
variable, the pooled and direct Neon hosts, and the read-only `hermes_ro` role
used for the H-F7 archive count. Print no secret and no fragment of one.

If none connect: write BLOCKED with the exact error codes, stop Lane A, and
move to Lane B. **Invent nothing.** No capital, no `n`, no exclusion count, no
"approximate" or "expected" anything.

### A3. Freeze the hash

`freeze-model-hash.mjs`'s `MANIFEST` already names
`packages/prediction-engine/src/research/efron-morris-js.ts` (renamed from the
old `mve-model-js.ts` placeholder in the same commit as this amendment — no
action needed on the manifest itself). Once A1 lands and the runner points at
it, run `node scripts/edge-lab/freeze-model-hash.mjs`. It exits 1 and names any
missing manifest files until the manifest is complete. When it exits 0, paste
the composite digest into section 5 of
`docs/ops/edge/2026-08-20-prospective-prereg-mlb-totals-js.md`, replacing "NOT
RECORDED", and commit it in the same change.

### A4. Run ONE cycle

One. Ever.

- Re-confirm the gating condition from A1 one more time immediately before
  running: zero observations graded, Amendment v2.2 committed. If either is no
  longer true, stop and escalate instead of running.
- Do not retune anything after seeing the path.
- Do not compute an alternate window, lambda, side rule, transform, or
  variant, not even diagnostically, not even "just to check".
- Do not re-run because you dislike the number.
- Apply the pre-drafted binding outcome: KILL to the Kill Ledger, or
  CERTIFY_DRAFT to the prospective pre-registration, or "did not certify, did
  not survive". No middle state may persist.
- Report: final capital, `n` graded, the chronological capital path, max
  drawdown, crossings at 2 / 5 / 10 / 20, exclusion count with reasons, push
  count, and explicit confirmation that no feature was imputed as a
  placeholder constant this cycle (the only inputs are each team's own real
  historical game totals) — and that rest-days/schedule-density were left out
  by design, logged as the next amendment's first candidate.

---

## LANE B — finish the H-F5 audit document

A previous seat got most of the way through this and ran out of tool calls. Its
findings are summarized in the session thread. **Re-derive them; do not trust
them.** Write `docs/ops/hermes/hf5-mve/AUDIT.md` covering:

- formula vs pre-registration, and the side-selection rule
- walk-forward causality: does `predictOver` for game N ever touch data from
  game N or later? Answer with the call ordering as evidence, not an assurance
- entry-price cleanliness: 6-3h window, quote age <= 15 min, >= 3 books, ESPN
  excluded, exclusions counted rather than silently dropped
- push handling, one-bet-per-game, checkpoint cadence, binding-outcome function
- the `NbRbpf`-vs-James-Stein model gap and what Lane A did about it

**The builder may not verify its own work.** Audit the Grok-built artifacts
freely. If you implement A1, you may not be the sole auditor of A1 — flag it for
a different seat and say so in the doc.

---

## LANE C — CI has been red on `main` for six commits. Nothing merges green.

This blocks every PR in the repo and is worth real time tonight.

1. Root-cause `Run tests (all workspaces)` on `main` at `2e016327`. Read the CI
   log for that step and name the failing suite. Fix it if the fix is real and
   local. **Never delete, skip, or quarantine a test to get green.**
2. `AI transport import boundary`: 8 violations in
   `apps/web/lib/claude-api/jynx-errors.ts`, `jynx.ts`, and
   `scripts/ops/smoke-free-lane.mjs`, introduced in `17b06990` (2026-08-06). The
   only two fixes are routing those imports through `callClaude`, or
   allowlisting them. **Allowlisting is weakening a security guard. Do not do
   it.** If the routing refactor is clean and local, do it. If it is not, write
   the proposed patch into the ledger and leave it for the founder. Say which
   you chose and why.

---

## LANE D — documentation integrity (cheap, do it)

`docs/ops/hermes/FINAL-RUN-2026-08-20.md` around line 98 still states the
e-process as `E_t = 1 + 0.3(Y·q/m + (1-Y)(1-q)/(1-m) - 1)` — the **point-null**
miss term. The frozen form in `mve-eprocess.ts` and in prereg-v2 is
`(1 - q_bet)`, the composite-null form. That stale line is exactly how the next
agent reimplements the invalid version. Correct it to match the frozen spec, and
note in the commit message that only the doc was wrong and the code was right.

---

## LANE E — C-62, the open observation (needs a database)

`odds_line_snapshots` showed `CLOSE = 0` for both MLB and NFL. Close stamps are
written at settle time by `markClosingSnapshotsIfEnabled`, and the flag only
bound at the `7294739c` deploy, so zero was expected at the time. **MLB games
have since settled.** If CLOSE is still 0, the close-stamp path is broken and
Definition-of-Done item 7 is NOT satisfied. Re-count as `hermes_ro`, SELECT
only, and record the number either way.

---

## Founder-morning report (write it even if the night went badly)

Append to the ledger, and leave one file the founder reads first:

1. Lane by lane: DONE / BLOCKED / NOT REACHED, each with a command and its exit
   code, or the exact error text.
2. The MVE's state in one sentence, with no hedging in either direction.
3. Every founder-only blocker as an action list: the exact thing he must do, in
   order, with the command or console step.
4. Anything you chose not to do, and why.

## Do not, under any circumstances

- Run the MVE more than once, or with any model other than the James-Stein spec.
- Invent a capital number, an `n`, an exclusion count, or a CLOSE count.
- Push `main`, touch a sealed path, flip a gate or env flag, or run a migration.
- Weaken, skip, or quarantine a guard or a test to turn a check green.
- Publish anything to a public surface as a claim of edge. The prospective track
  is ARMED, NOT FIRED, and stays that way until the founder signs it.
- Describe "asymmetric fractional e-variable" as established literature. It is a
  house name for our increment, not a citation.
- Deploy to Vercel. That override (F-11) was scoped to a different seat.
- Reopen L-15, L-16 or L-17 as edge mechanisms. They are closed.
