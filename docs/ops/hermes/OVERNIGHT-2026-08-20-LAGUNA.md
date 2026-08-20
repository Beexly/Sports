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

### A1. Implement the James-Stein outcome layer (does NOT need a database)

Do this FIRST, before any database work, so a connectivity blocker cannot waste
the whole night.

Build `packages/prediction-engine/src/research/mve-model-js.ts` implementing
section 3 of `docs/ops/edge/2026-08-20-prospective-prereg-mlb-totals-js.md`
(on PR #438's branch). Binding points, all frozen:

- Hierarchical Poisson on total runs (or on home/away runs, summed). A
  negative-binomial link is permitted ONLY if that choice is recorded in the
  frozen hash before anything runs.
- **Shrinkage is Efron-Morris (1975) section 3**, the unequal-sample-size form:
  `theta_hat_i = theta_bar + (1 - B_i)(theta_i - theta_bar)` with
  `B_i = D_i / (A_hat + D_i)`, `D_i = sigma_i^2 = 1/(4 n_i)`, and
  `A_hat = max(0, tau2_hat)` for the positive part.
  **Do not implement the charter's `(p-2) * sigma^2 / sum(...)` factor as the
  general case.** That is the equal-variance special case; the two agree only
  when every `n_i` is equal. The unequal-variance display in James-Stein (1961)
  is an existence bound, not an operational estimator, and names no analogue of
  `p - 2`. This correction came from the dossier and is now binding in the
  pre-registration.
- `p >= 3` required for shrinkage to apply. A family with `p < 3` is left
  unshrunk (identity). Do not silently shrink a two-parameter family and call it
  James-Stein.
- Arc-sine for proportion metrics (`Var ~ 1/(4n)`), sqrt/Anscombe for count-rate
  metrics. The per-metric assignment is a frozen table in code, never a runtime
  choice.
- Shrink team and pitcher effects **after** park, weather and market are
  partialled out (Fay-Herriot shape: shrink residuals, not raw rates). Shrinking
  toward a grand mean that still contains park and weather signal throws away
  the only thing that could differ from the market.
- Refit online from expanding history only. No same-slate leakage: no game on a
  slate may inform a pick on that slate.
- `q_t^O = P(total runs > L)` from the posterior predictive at the entry line.
- Deterministic: seeded, and reproducible bit-for-bit on the same inputs. A
  model that cannot reproduce its own probabilities cannot be audited.

Then point the runner's `q_t` source at it, replacing `NbRbpf`, and stop pinning
`nPitchers` / `nUmpires` / `park`. Wire the real features the schema can serve.
For any feature the data cannot serve tonight, impute the frozen group mean
**and log the imputation per game**, then state plainly in your report which
features were imputed for how many games. An imputed feature is honest. A
silently absent one is not.

Unit tests required, and they must include: `B_i` goes to 1 as `n_i` goes to 0;
`B_i` goes to 0 as `n_i` grows; `p < 3` returns identity; positive part clamps at
`A_hat = 0`; and the back-transforms round-trip.

**If you cannot finish A1 tonight, that is an acceptable outcome. Do NOT run the
MVE with `NbRbpf` in order to have something to show.** Amendment v2.1 forbids
it, and certifying one model while intending to trade another is the exact
failure this entire protocol exists to prevent.

### A2. Database triage (bounded: 30 minutes, then move on)

The runtime connection string points at localhost and fails `28P01`. A previous
seat also failed against the Neon host. In order, try the unpooled variable, the
pooled and direct Neon hosts, and the read-only `hermes_ro` role used for the
H-F7 archive count. Print no secret and no fragment of one.

If none connect: write BLOCKED with the exact error codes, stop Lane A, and move
to Lane B. **Invent nothing.** No capital, no `n`, no exclusion count, no
"approximate" or "expected" anything.

### A3. Freeze the hash

Once A1 lands and the runner points at it, run
`node scripts/edge-lab/freeze-model-hash.mjs`. It exits 1 and names the missing
files until the manifest is complete. When it exits 0, paste the composite digest
into section 5 of the prospective pre-registration, replacing "NOT RECORDED", and
commit it in the same change.

### A4. Run ONE cycle

One. Ever.

- Do not retune anything after seeing the path.
- Do not compute an alternate window, lambda, side rule, or variant, not even
  diagnostically, not even "just to check".
- Do not re-run because you dislike the number.
- Apply the pre-drafted binding outcome: KILL to the Kill Ledger, or
  CERTIFY_DRAFT to the prospective pre-registration, or "did not certify, did
  not survive". No middle state may persist.
- Report: final capital, `n` graded, the chronological capital path, max
  drawdown, crossings at 2 / 5 / 10 / 20, exclusion count with reasons, push
  count, and the imputed-feature counts from A1.

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
