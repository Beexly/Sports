# DFS GATE 09 — Simulations

- census_id: C-072
- family: dfs-process
- kind: stamped reasoning template
- cadence: Saturday–Sunday — after gates 00–08, before final lock
- inputs: the registered active slate (see the slate seam: apps/web/lib/integrations/dfs-active-slate.ts; first provider espn-dfs-slate-provider.ts) and the repo's payout simulation (payout-sim / payout-framework) + correlation GPP layer
- stamp_discipline: weekly slate lock timestamps (process record) — simulation runs are stamped with slate provenance (which provider produced the slate), sim count, and run time; a run against an unregistered/sample slate is recorded as such and cannot clear the gate
- reasoning_availability: NO
- emission: ZERO_OBJECT
- depends_on: the live slate provider registration (census C-076) — at census time never registered; the seam + first provider land with this tranche
- failure_lesson: Lessons log 10 (2026-09-27, process gap) — "No rushing — gates don't clear, lineup doesn't ship."

## Rule

10,000+ correlated slates before lock; lineups need top-decile ceiling and positive sim ROI vs field.

## Enforcement

The artifact's own text names the machinery: correlated player distributions (QB-WR stacks, DST matchups), a simulated field for cash-line estimation, leverage and exposure analysis — running on the repo's tools once the live slate provider is registered. A simulation over the illustrative sample slate measures the optimizer against fictional players; that is why this gate's stamp includes slate provenance, and why an unregistered slate fails this gate even if every other gate passes.

## Record

Per week: slate provider + provenance stamp, sims run, ceiling percentile and sim ROI per submitted lineup, lock decision.
