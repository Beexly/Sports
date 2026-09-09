# A published pick's "publish time" moves on every refresh — 2026-09-08

Found by Devin Review on PR #720 (🔴), verified here against the source. **Not fixed. Founder
decision.** Ledger C-265.

> **Renumbered 2026-09-09.** This was filed as C-262. While this branch was open, PR #725 merged
> to `main` carrying its own C-261, C-262 and C-263 for unrelated work, so the three rows added
> on this branch were renumbered C-264, C-265 and C-266 when `main` was merged in. `main`'s rows
> keep the original numbers because they landed first. Commit messages and PR comments written
> before that merge still say C-261 / C-262 / C-263; they mean these rows.

This matters more than its size suggests, because the number it moves is the one the calibration
gate reads.

---

## What is verified

**1. The calibration recompute is bounded by the pick's `generatedAt`.**
`apps/web/lib/calibration/publish-time-market-p-loader.ts` reads the odds table with
`fetchedAt: { lte: latestGeneratedAt }`, then resolves each pick against
`resolvePublishTimeMarketP`, which bounds per pick by that pick's own `generatedAt`. So
`generatedAt` IS the cut-off that decides which market price counts as "the price at publish".

**2. The signal slate rewrites `generatedAt` on every refresh of a still-PENDING pick.**
`packages/ingestion-pipeline/src/generate-signal-slate.ts`, the `existing` branch:

```ts
const updated = await db.pick.updateMany({
  where: { id: existing.id, result: "PENDING" },
  data: { ...shared, ...publicationUpdate, generatedAt: now },
});
```

The `where` is scoped to `result: "PENDING"` so a settled pick is frozen. It is **not** scoped on
`isPublished`, so a pick that is live to customers and still pending has its `generatedAt` pushed
forward every run.

**3. The market anchor is inside `shared`, and is resolved at `now`.**
`shared` carries `factorBreakdown`, which holds the C-253 anchor, and the anchor is resolved with
`generatedAt: now` (line 461-471). So the stored anchor is also recomputed each run.

**Consequence.** For a published, still-PENDING signal pick, both the stored anchor and the
recompute cut-off move toward kickoff on every slate run. C-253 committed in writing that the
anchor read is bounded "at or before generatedAt ... never toward the close". That bound holds
against `generatedAt` — but `generatedAt` itself is not fixed, so the guarantee is weaker than it
was stated to be. Later, closer-to-close prices can end up being what "publish time" means for
that pick, in the sample the calibration floors are computed on.

## What is NOT established

- **No production measurement.** `Pick` has **no `createdAt` column** and `generatedAt` is
  overwritten in place, so the drift leaves no trace: it cannot be measured after the fact from
  the picks table. The size of the effect on the current calibration sample is **UNKNOWN**, and
  nobody should state one.
- **Direction is not assumed either.** Moving the cut-off later means a price closer to the
  close, which is generally sharper. Whether that flatters or penalises our measured ECE is not
  established and would need the aligned per-bin work nobody has run.
- **How many rows are affected.** Not measured. The 2026-09-07 note in the same file says 70
  published PENDING moneylines were subject to the neighbouring C-92 issue; that is a different
  query and must not be reused as this number.

## Attribution, stated honestly

`generatedAt: now` on the update path **pre-dates** this branch — it belongs to the race-safe
update (GSE-SEC-043). What C-253 changed is that `generatedAt` became **load-bearing for a market
measurement**: before, a moving timestamp moved only model fields; now it also moves which
bookmaker prices are treated as publish-time. So this branch did not introduce the moving
timestamp, but it made the moving timestamp consequential.

## Why it was not fixed here

Devin's proposal is to separate a mutable model-refresh time from an immutable first-publication
time. That is the right shape and it needs a **new column**, which is a Prisma schema change:
AGENTS.md law 2 forbids an agent touching `schema.prisma` or `migrations/**`, and it is
founder-gated regardless.

The no-schema alternatives are **product decisions, not bug fixes**, which is why an agent should
not pick one silently:

- **Option A — freeze the published row.** Skip the refresh update entirely for a pick that is
  already published (keeping the one-directional gate close from C-92, which must survive any
  option). What was published is then exactly what is measured and exactly what the customer
  sees. Cost: a published pick stops receiving model refreshes, which is a real behaviour change.
- **Option B — freeze only publish-time state.** Keep refreshing model fields but stop rewriting
  `generatedAt` and the anchor once published. Cost: `generatedAt` would then no longer describe
  when the model output was produced while the model fields keep moving, which is the
  count-labelled-as-something-else defect class this branch has removed eight times. It needs a
  second, honestly named field to avoid that, and that is Option C by another route.
- **Option C — the schema change Devin proposes.** Cleanest, founder-gated.

**There is a precedent that points at the answer.** `clvLockLine` / `clvLockPrice` are documented
in `schema.prisma` as *"captured ONCE at creation (absent from the refresh `update`, so they are
immutable) and record the line/price we actually published at."* The repo already solves
"preserve first-publication state without a new column" by omitting the field from the refresh.
The anchor is the same kind of value and plausibly belongs in the same lane.

Why that was not just done here: the anchor is resolved at line 461, the existing-pick lookup
happens at line 583, and between them the anchor feeds `edge`, `signalDecision`, `edgePts`, the
rationale and the factor description. Making the anchor write-once means reordering that loop and
keeping the C-255 invariant that all three customer-facing sentences agree with the machine
decision. That is a restructure with real blast radius, not a small reversible change — and it
would still leave the `generatedAt` half, which is the half the calibration gate actually reads.

## What this does NOT block

Nothing that is already true stops being true. This does not touch the settled record, and it is
a separate problem from C-247 (stored finals contradicted by the feed). It is one more reason the
PROVEN flip is not an agent's to make.
