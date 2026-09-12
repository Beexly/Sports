# Launch execution evidence — 2026-09-12

## L0 — release identity and scope
- Local HEAD: `5ddafd37e826793cbc78dd623e8a68b7765e3af6`
- Local branch: `hermes/c298-inplay-parity-2026-09-12`
- Local status at check: `M AGENTS.md`, `M docs/intelligence/LEVERAGE_STATUS.md`, untracked handoff plan + scratch files (preexisting, not staged)
- Public truth: HTTP 200, `generatedAt=2026-09-12T15:04:44.345Z`
- Deployed SHA (endpoint): `abceb40e1f22aa6d78f5e6cae47206daba3778de`
- `git cat-file -t abceb40...` locally: object NOT present (fatal: could not get object info)
- Verdict: SHAs DIFFER; ancestry/newer NOT established. Intended release NOT yet confirmed — do not treat local fixes as production fixes until resolved.
- Endpoint-reported cohort (not independently recomputed): eligibility GREEN n=407, Brier 0.2103, raw ECE 0.0549, debiased 0.038688; gates statsPublic=true, canExposePublicPicks=true, canExposePerformanceStats=true, calibrationPublished=true.
- No code edited in L0. No flags changed. Tests NOT RUN in L0.

## Next
- L1: DFS customer-data contract (files listed in handoff). BLOCKED on nothing yet; unstarted.
