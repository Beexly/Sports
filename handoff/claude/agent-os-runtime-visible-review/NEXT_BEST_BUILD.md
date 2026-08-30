# NEXT BEST BUILD — adoption path + follow-ups

## Recommendation: ADOPT IT
It is real, honest, additive, and weakens no safety gate. It directly delivers the owner's
"truth-first, no fake-green" cockpit. The right way to bring it in is a **clean, owner-visible
integration**, not a silent merge buried in a review branch.

### Adoption path (pick one)
1. **Preferred — Codex rebases the additive tree onto current `main`** and opens a focused PR
   titled "Agent OS operating spine + runtime (additive)". Because it's almost entirely new
   files in new `lib/` subtrees, the rebase is low-conflict. Claude reviews the PR diff and
   merges.
2. **Alternative — cherry-pick the additive `lib/` subtrees** (`agents/`, `tasks/`,
   `workflows/`, `jarvis/`, `cockpit/`, `nfl/`, `statking/`, `projections/`,
   `data-reliability/`, `memory/`, `market/`, `calibration/`) + the cockpit/layout/test
   changes into a branch off current `main`, run gates, PR.

Do **not** fast-merge 138 files across the old `0e70605` base without re-running gates on
current main first.

## Three convergences (after adoption — not blockers)

### A. Fix agent-task persistence (the one real gap) — owner decision required
- Extend Prisma `enum OperatorAgent` from 6 → the 23 registry ids (or add a broader owning
  enum + map), then include `assignedAgent` (mapped to the enum) in
  `agent-task-store.ts`'s `create`/`update` data, plus `status`/`priority` mapped to their
  enums. Author the migration with `prisma migrate diff --from-schema-datamodel … --script`
  (no DB needed). After this, "PERSISTED_TASK_RUNTIME" becomes true.
- **Why owner-gated:** changing the `OperatorAgent` enum is a schema/identity decision that
  ripples to existing `CockpitTask`/`CockpitDecision` rows.

### B. Dedupe calibration math onto the engine
- Make `apps/web/lib/calibration/{brier,ece}.ts` adapt/re-export from
  `@sports/prediction-engine` (`brierDecomposition`, `expectedCalibrationError`) so there is
  one calibration source of truth. Keep Codex's `confidenceBuckets`/`display-safety` as the
  UI layer on top.

### C. Converge CLV onto the engine
- Point DELTA/Market-Twin CLV at the engine's `clv.ts`/`clv-capture.ts` (directional grade)
  rather than the coarse `close.line - open.line` candidate, once line snapshots are wired.

## Then the next real capacity step
The system honestly reports `operationalCapacity = 0`. The highest-leverage *real* move is to
promote the **safest** observe/analyze task path (e.g. TAL stale-data detection) from
in-memory to actually-persisted + surfaced in the decision queue — i.e. turn one agent from
DRAFT_ONLY into a genuinely-wired PARTIAL with tests, so `operationalCapacity` can truthfully
become 1. That requires fix (A) first.
