# Handoff: signal architecture, 2026-09-18

From: Fable architect session. To: the next Opus session.
Read this before touching `docs/architecture/2026-09-18-signal-architecture.md`.

## 1. Where things stand

| Item | State |
|---|---|
| Branch | `claude/pensive-babbage-c7xfdy`, pushed |
| Pull request | Beexly/Sports#863, draft, docs only |
| Architecture document | `docs/architecture/2026-09-18-signal-architecture.md`, committed, ~106 KB |
| Ledger row | ARCH-2, DONE, owner `claude` |
| Guardrails | 26 of 26 green locally |
| CI | `Test, type-check, lint, Prisma` RED, and it is not this pull request's |
| Rebuild in flight | a workflow was running when this session ended; see section 5 |

**The CI failure is founder-only.** `apps/web/__tests__/agent-ledger.test.ts:57` fails on
one assertion: ledger row M-1 carries owner `motif`, which is not in the allowed owner
set. That row is present on `main`, so the base branch is red on this check too. Ledger
rule 2 forbids editing a row another agent owns, and re-owning it would misattribute
that agent's work, so no agent may fix it. The founder re-owns M-1 or cancels it with a
reason, and the check goes green. This is already explained in one comment on the pull
request; do not comment again.

## 2. What the founder rejected, and why he was right

The committed architecture document is correct in its facts and **wrong in its shape**.
He rejected it in these words: it minimizes and compresses the business, the
intelligence, and the engine complexity.

The specific error, named so nobody repeats it: **it put the honesty gate at the build
boundary when that gate belongs only at the publish boundary.** It sequenced roughly
nineteen steps serially behind three measurement fixes, which parked most of the
research corpus in DEFERRED and made the engine look like it was shrinking.

Three corrections follow, and they govern the rebuild:

1. **The certification gate constrains only what number reaches a customer.** It never
   constrains what we build, capture, compute, persist or instrument. The engine should
   carry far more signal than it displays.
2. **Build runs at full width, concurrently.** Tracks are independent unless a
   dependency is proven real rather than conventional.
3. **Capture starts everywhere immediately.** This is the strongest argument in the
   plan and it was missing from the first version: a signal needing an as-of log
   accrues sample in wall-clock time. A signal logged today has n in some weeks; a
   signal deferred has zero forever until we start, and that time is unrecoverable.
   Deferral destroys future sample. So every signal with an available source begins
   logging now, even when it cannot be tested for months.

A row may only be parked when a founder rights ruling, a founder environment flag, or a
genuinely absent source blocks it. "Nobody has built it" is a build task with an owner,
not a deferral.

## 3. The diagnosis worth carrying forward

The founder's standing frustration is that ten months of work has not compounded. The
reason is not a shortage of signals or of ambition. It is that **the learning loop was
never closed.**

Large models improve because a loop runs continuously and automatically: data lands,
the model trains, an eval scores it, the winner deploys, the deployment produces more
data. Every component of that loop exists in this repository and not one of them is
wired:

- `packages/prediction-engine/src/edge-lab/walk-forward.ts` implements purge, embargo
  and a sealed holdout. It is reachable only from `scripts/`, scheduled by nothing.
- `edge-lab/trials-registry.ts` implements a hash chain and Benjamini-Hochberg control.
  Never run.
- `edge-lab/placebo.ts`, `logit-pool.ts`, `logistic.ts`, `calibration-blend.ts`. Never
  run.
- `evidence-readiness-matrix.ts` defines 13 factor keys with trust, sample and age
  floors at `:18-31` and `:82-252`. Exported from the barrel at `index.ts:168` and
  called by nothing at runtime.
- `packages/feature-store` is point-in-time validated and correct, holds zero registered
  features, and has no source importer outside a `package.json` line.
- The conviction gate has zero importers outside its own directory.
- `gate_decisions` has no writer and five readers on fallback paths.
- `GameSignal` has one writer emitting exactly two keys.
- The `Signal` table has no writer and no reader.

Whatever else the next session does, closing that loop is the work that makes everything
else accumulate.

## 4. Verified facts that are expensive to rediscover

Each was checked directly in the tree during this session. Trust them; re-verify only if
you are about to act on one.

- Ledger guard exits 1 on exactly one violation, M-1's owner.
- 22 files under `apps/web` partially mock `@sports/prediction-engine`. Standing notes
  say 19. The count drifts, so any guard must enumerate rather than assert a number. A
  new cross-package import into `lib/board/state.ts` or the picks route would resolve
  undefined under those mocks.
- `apps/web/lib/calibration/cqr.ts:12-15` clamps the finite-sample rank into range
  instead of refusing, so at n 5 and alpha 0.1 it claims 90 percent coverage and
  delivers 83.33.
- `apps/web/lib/calibration/in-play-exclusion.ts:60-66` keeps a row when either clock is
  null. That is a leakage hole.
- `apps/web/components/picks/pick-card.tsx:191-207` renders the market-implied
  probability to **every** tier already. The standing note saying it is gated on
  `canSeeConfidence` is stale. The real gap is spread and total coverage, enforced
  server-side.
- `schema.prisma:675` defaults `GateDecision.isBootstrap` to **true**, and the readers
  filter on it, so any writer omitting it produces rows the lane never shows.
- `SignalCategory` (`schema.prisma:1490-1505`) has no injury-news member. Adding one is
  a schema edit an agent may not make. Use `INJURIES` or `PLAYER_AVAILABILITY`.
- `docs/research/2026-09-17/gse-lab/compute_advanced_metrics.py:41-50` inverts twice for
  lower-is-better metrics: the rank is taken descending and then inverted again, so the
  worst team reads 100. Every percentile claim sourced from those files is suspect.
- `packages/ingestion-pipeline/src/backfill-independent-trueprob.ts:96-101, 172-183,
  235-257` runs inside the six-hourly calibration cron, selects settled rows, and
  rewrites `factorBreakdown.independentEdge.trueProb` using inputs that are not as-of.
  **Any model fitted on that column is fitting on the answer.** This is the single most
  important finding of the session and it was in none of the three candidate designs.
- `packages/prediction-engine/src/edge-lab/logistic.ts:59-101` penalizes every
  coefficient toward zero with an unpenalized intercept, so a head built naively on it
  shrinks to the base rate, not to the market. The market logit must enter as a fixed
  offset.
- `edge-lab/walk-forward.ts:80-137` has no group key; it cuts folds by row index.
  Fixture grouping is proposed, not existing.
- `packages/prediction-engine/src/clv-capture.ts:90-144` reads an odds batch with no book
  identifier, while `odds_line_snapshots` does carry a `book` column
  (`schema.prisma:467`). Book-mix drift is currently scored as market movement, which is
  why the 23 percent beat-close cannot be attributed to the model or to the ruler.
- `packages/data-ingestion/src/nflverse-season.ts:486-492, 533-540` floors the season at
  the last completed one unless a database probe is passed. Only the player-stats cron
  passes it, so read-only surfaces show last season all year.
- `edge-lab/features/nfl-team-form.ts:1-11` records a real prior kill: schedule-derived
  reference features carry no information beyond the closing price, probe p 0.060,
  verdict FIRE_NOTHING. Do not re-promote schedule features without a pre-registration
  naming that kill.

## 5. The rebuild that was in flight

A workflow was running when this session ended, rebuilding the architecture on the
parallel frame. Its run directory:

```
/root/.claude/projects/-home-user-Sports/59d8c38d-4207-5f81-8e1e-fbd050adcce4/subagents/workflows/wf_57e2d551-32b
```

`journal.jsonl` there carries one result line per completed agent with its full return
value. The script that produced it is at:

```
/root/.claude/projects/-home-user-Sports/59d8c38d-4207-5f81-8e1e-fbd050adcce4/workflows/scripts/gse-parallel-architecture-wf_57e2d551-32b.js
```

It designs seven concurrent tracks (capture plane, feature store and persistence, engine
breadth and new estimators, gate and veto plane, the rulers, the head trainer and
admission mill, customer surfaces), re-adjudicates the roughly ninety registry rows into
BUILDING-NOW, CAPTURING-NOW, SHADOW-NOW, FOUNDER-BLOCKED or KILLED, and runs three
adversarial lenses over the result.

**If the journal holds results**, extract them and assemble the rebuilt document. If the
run died partway, re-invoke with `resumeFromRunId: "wf_57e2d551-32b"` and the same
`scriptPath`; completed agents replay from cache instantly. Note that these workers ran
on Sonnet by explicit instruction, because the founder is conserving credits. Keep that
unless he says otherwise.

The rebuilt document replaces sections 3 through 8 of the committed architecture. Its
inventory (section 2) and its verification record are sound and should survive intact.

## 6. What the next session should do, in order

1. Extract the workflow results and assemble the rebuilt architecture on the parallel
   frame. Commit to the same branch so pull request 863 carries it.
2. Do not re-derive the inventory. It is verified and it cost nine readers to produce.
3. Hold the line on exactly one thing: no uncertified probability reaches a customer.
   Everything else in the first document is negotiable and most of it was too narrow.
4. Do not comment again on pull request 863 about the ledger failure. It is reported.
5. Keep the hourly pull request check-in armed until the pull request is merged or
   closed.

## 7. Open founder decisions

Carried forward from the architecture document, still unanswered:

- Re-own or cancel ledger row M-1 so CI can pass.
- Run or delegate the read-only production probe. No agent may touch the database.
- Approve and name the single model-version bump, when the time comes. It is the only
  bump in the plan.
- Apply the proposal SQL for the per-pick feature vectors, the head registry, the
  closing-value grades, and the feature tables. Agents write the SQL under
  `docs/ops/proposals/`, never under the migrations directory.
- Rights rulings: share-alike charting into any served probability; the two registry
  disagreements; the scoreboard storage question.
- Decide the retention rule for `gate_decisions` before its writer ships.
- Decide the research-branch merge scope. Recommendation is code only: roughly 9.6 MB of
  documents and logs stay out of git history, and one of them is an activity log
  containing personal search history that should not be committed at all.

## 8. Standing instruction from the founder

He has said plainly, more than once, that the work keeps compressing his business. Treat
that as a design constraint with the same force as the laws. When a choice presents
itself between a narrower plan that is easy to defend and a wider plan that is harder to
execute, the wider plan is the brief, and the honest answer is to build it wide and gate
only the published number.

A separate research brief was written this session for an outside agent, covering the
machine learning that could genuinely improve this engine: hierarchical pooling for the
small-sample problem, representation learning on play-by-play, market-relative learning,
conformal uncertainty, interpretable high-capacity models, and the continuous learning
loop. It lives at `docs/research/2026-09-18-ml-research-brief.md`.
