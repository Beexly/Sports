# Next Autonomous Loop — Galaxy Sports Edge

**Generated:** 2026-05-29 · **By:** Claude (Opus 4.8) · **Branch:** `claude/awesome-sagan-LOyCa`

## State entering next loop
- Operating backbone now exists (`docs/ops/ROUTE_SURFACE_CONTRACT.md`,
  `GOLDEN_PATH_PROOF.md`, `GALAXY_2026_WORLD_CLASS_SCORECARD.md`,
  `AUTONOMOUS_RELEASE_BOARD.md`, this file, `reports/claude/CLAUDE_STATE_SYNC_*`).
- Golden path: all core surfaces present; Decision Room dead-end fixed. Open gaps are
  mapped + flagged. No open SEV0/SEV1.

## Next highest-leverage UNBLOCKED item
**Release Board Pri 1 — in-content trust strip on `/picks`.** It is the highest commercial
surface and its trust context lives only in the global Footer. Compose the existing
`RiskDisclosure` (`card` variant) + a methodology link near the paywall. Keep it small;
add/extend a brand-safety test. Do **not** add redundant disclosures elsewhere.

## Exact next Codex audit prompt
> Audit branch `claude/awesome-sagan-LOyCa` against `docs/ops/ROUTE_SURFACE_CONTRACT.md`
> and `docs/ops/GOLDEN_PATH_PROOF.md`. Verify, without trusting claims:
> 1. `apps/web/app/room/[gameId]/page.tsx` renders onward links to `/ledger`,
>    `/performance`, `/methodology`, `/responsible-play` and contains no banned phrases
>    (run `node scripts/guardrails/trust-gate.mjs`).
> 2. No protected engine value (weights/thresholds) is serialized to public props in any
>    `/room`, `/board`, `/picks`, `/performance` payload.
> 3. `npm run typecheck`, `npm test`, `npm run guardrails`, `npm run build` are green
>    (after `npm run db:generate`).
> 4. The Scorecard deltas match the diff (Decision Room next-action/failure-lens).
> Report any drift as SEV-graded findings; do not over-correct clean code.

## Loop hygiene reminders
- `npm run db:generate` BEFORE typecheck/build in a fresh container (Prisma client is not
  committed; otherwise typecheck reports missing `@prisma/client` exports).
- Owner gates remain owner-only. No deploy / no PR / no launch-state flip.
- Prefer composition over rewrite; deduplicate findings; calibrate severity.
