# NEXT BEST BUILD

## Immediate (unblock the review) — Codex's task
The Agent OS Runtime work is stranded in Codex's worktree (no shared remote). To review it:
1. **Push `3bfc262` to `beexly/sports`** (branch `codex/agent-os-runtime-visible`) and open a PR — best, gives full diff + history; OR
2. commit the `.patch` file to a pushed branch (then I `git apply` + review); OR
3. paste `git diff --stat HEAD~1..HEAD` + the cockpit panel + the 3 test files.

## When visible, review priorities (in order)
1. **Duplication check** — layers 3–7 (player models, clearance-gated ingestion, signal-snapshot,
   historical/projections) ALREADY exist as shipped work on `claude/zealous-noether-inaaa3`.
   A Codex patch re-adding them = duplicate architecture / merge conflict. Reconcile first.
2. Safety gates, gate-by-gate (source-rights, RG, owner-approval, public-picks, no-fake-data).
3. Truthfulness of the cockpit panel (NOT_WIRED not counted as capacity; revenue=unknown not healthy; calibration ≠ public readiness).
4. Whether task/workflow "runtime" actually runs a safe internal stage or is typed structure.

## The build-gate premise is moot
The brief assumed `npm run build` is blocked by Google Fonts. **It is green in this repo
(187/187 pages).** So build-gate repair is NOT the next priority here. The real frontier is
unchanged from my session handoff: **deploy + run the backfills** so the (real, gate-green) data
+ metrics produce real numbers — then tune weights against actual outcomes. Persisted task
runtime / workflow-event runtime / the BullMQ orchestration layer remain genuinely unbuilt, but
those are owner-directed and should follow, not precede, getting real data flowing.
