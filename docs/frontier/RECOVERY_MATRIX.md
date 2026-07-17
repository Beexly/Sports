# GSE Frontier Recovery Matrix

Live evidence as of 2026-07-17, verified against `origin/main @ c179a78`. Recover before rewriting.

| PR/capability | Role | Main overlap (verified) | Dependencies/conflicts | Disposition |
|---|---|---|---|---|
| #119 `claude/salvage-settlement-guardrails` | settlement correctness + scanner/CI hardening | Absent from main; live mis-grade bug confirmed | Two files auto-merge vs #120; one doc-comment drift fixed | **RECOVERED (W000 slice 1)** onto `claude/galaxy-sports-edge-pdcswh`; commit 9b61a60 proved already-on-main |
| #123 | per-page Cockpit ADMIN checks (32 pages, scan-enforced) | Absent from main (layout-level gate only) | shares `require-admin.ts` with #121; re-verify vs #120's `cockpit/page.tsx` | RECOVER next W000 slice or founder merge |
| #124 | Agent Foundry + Assurance + Resource Radar + shadow router | Absent from main | added-file-only port, proven disjoint; guard-script interplay with recovered #119 needs re-check | RECOVER, do not recreate (W006 substrate) |
| #112 (draft) | evidence envelope + event lifecycle + epistemic deltas + playback | Absent from main; scout mapped closure 2026-07-17 | 12-file lib is clean; 3 semantic grafts (`load.ts`, room page, `projectForLens` access param); branch also carries #119-lineage hardening already recovered | **CANONICAL CANDIDATE — W001 ACTIVE**: port slice, do not merge draft wholesale |
| #122 | CLV/Pedersen additive schema re-land | Absent from main; migration-safety proven on disposable PG | founder-applied migrations | HOLD_PROD; OWNER_GATE OG-001 |
| #101 | older CLV re-land | — | superseded by #122's hardened rebase | SUPERSEDED; close in favor of #122 (founder action) |
| #121 | fantasy engine foundation | Absent from main | ~350 competitor-trademark occurrences must rename before public surfaces | HOLD_PUBLIC; ADMIN-only until rename |
| #52 | Galaxy Dynasty world graph | Absent from main; 13-month-stale base | additive `packages/galaxy-engine` likely portable alone | PRESERVE/FUTURE (Dynasty convergence) |
| `claude/fix-metric-source-fixture-alignment` | fixture drift fix | Equivalent already on main (carried by #117/#118 lineage) | — | ALREADY_ON_MAIN; no action |
