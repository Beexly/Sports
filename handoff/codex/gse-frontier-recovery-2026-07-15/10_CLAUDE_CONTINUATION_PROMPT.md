# Claude Continuation Prompt

You are continuing the verified GSE frontier recovery in `Beexly/Sports`.

## Start here

```powershell
git fetch origin --prune
git switch codex/gse-frontier-recovery-2026-07-13
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
```

Read this packet in numeric order, then read:

- `reports/agent-handoffs/FRONTIER_RECOVERY_LEDGER.md`
- `reports/agent-handoffs/FRONTIER_RECOVERY_REALITY_MAP.md`
- `docs/architecture/INTELLIGENCE_DECISION_PERSISTENCE_PROPOSAL.md`

## Commands that define current proof

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
$env:DATABASE_URL='postgresql://gse_build:gse_build@127.0.0.1:65432/gse_build?connect_timeout=1'
$env:AUTH_SECRET='local-build-placeholder-not-production'
npm.cmd run build
npm.cmd run guardrails
git diff --check
```

## Completed continuation task

`buildPlaybackConsumerBundle()` is now wired into an owner-only, selected-game Cockpit surface using the existing `GameRoomPlayback`/envelope path:

- Route: `/cockpit/market-twin/[gameId]`
- Loader: `apps/web/lib/cockpit/load-selected-game-playback.ts`
- Renderer: `apps/web/components/cockpit/selected-game-playback.tsx`
- Browser QA: `scripts/qa/cockpit-selected-game-playback-browser.mjs`
- Surface: selected-game Twin, deterministic cited Brain, postgame autopsy projection, and draft-only Studio package all come from the same `buildPlaybackConsumerBundle()` result.
- Safety: the Studio package is read-only, `DRAFT_ONLY`, human-review-blocked, and has no external posting action. Unavailable playback renders none of Brain/autopsy/Studio.
- Evidence: focused Cockpit/static suite 165/165; browser QA desktop/mobile; root lint/typecheck/test/guardrails/build; exact TypeScript no-excuse checker; diff check.
- Boundary: local browser proof used real production-board game ID `cmrm6vyzq00b5ozb9rjmuw9hw` against a deliberate stub DB. This proves the actual route's honest unavailable path, not a live eligible playback row.

## Next task

Add live-row proof when an eligible persisted playback record exists. Capture the available route in browser QA with populated Twin, Brain, postgame autopsy, and draft-only Studio sections. Do not add fixture events, do not create another truth store, and do not open any publication path.

## Hard directives

- **DO NOT RE-AUDIT.** The audit and reality map are complete.
- **DO NOT REBUILD** the envelope/event/delta/certificate architecture.
- **DO NOT REOPEN** the closed #76-#96 PRs.
- **DO NOT WEAKEN** any trust, entitlement, admin, stale, outage, rights, proof, or draft-only gate.
- Do not change migrations, production DB, billing, auth persistence, legal, canonical URLs, webhooks, secrets, DNS, Vercel protection, or auto-publication without explicit owner authority.
- Preserve untracked `g.id)`, `s.id`, `{`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml`.
- Update draft PR #112; do not create a competing replacement PR.

When blocked by an owner gate, record the exact command and evidence needed, continue the safe queue, and never invent completion.
