# Galaxy Dynasty Verification Status

Updated: 2026-07-03
Branch: `codex/galaxy-dynasty-v2-autonomous`

## Current Playable Slice

- Route: `/galaxy-dynasty`
- Room snapshot API: `/api/galaxy/rookie-plaza`
- Runtime: direct Three.js inside the existing Next app
- Asset contract: `apps/web/public/galaxy-dynasty/assets/higgsfield-manifest.json`
- GLB kit: `apps/web/public/galaxy-dynasty/assets/rookie-plaza-city-kit.glb`
- Smoke driver: `scripts/galaxy-dynasty-smoke.mjs`

## Green Checks So Far

- `npm ci --ignore-scripts`
- `npm run db:generate`
- `npm run typecheck --workspace=apps/web`
- `npm run lint --workspace=apps/web`
- `npm run test --workspace=apps/web -- __tests__/galaxy-dynasty-room.test.ts`
- `GALAXY_DYNASTY_URL=http://127.0.0.1:3094 node scripts/galaxy-dynasty-smoke.mjs`
- `npm run build --workspace=apps/web`
- `npm run guard:trust`

## QA Evidence

- Desktop screenshot: `reports/game-qa/galaxy-dynasty-desktop.png`
- Mobile screenshot: `reports/game-qa/galaxy-dynasty-mobile.png`
- Browser smoke result: `reports/game-qa/galaxy-dynasty-smoke.json`
- Build log: `reports/game-qa/web-build.log`
- Build exit: `reports/game-qa/web-build.exit`
- Trust gate log: `reports/game-qa/trust-gate.log`
- Trust gate exit: `reports/game-qa/trust-gate.exit`
- Review/debug gate: `reports/game-qa/GALAXY_DYNASTY_V2_REPORT.md`

## Dependency Decision

This branch ships the slice through the existing `apps/web` runtime because the clean `origin/main` worktree does not contain `packages/galaxy-spatial`, `packages/galaxy-engine`, `world-builder.ts`, or `rookie-plaza-client.tsx`.

Chosen now:

- Three.js, already present in `apps/web`, for the playable browser route.
- Three.js GLB loading via `GLTFLoader`.
- Three.js post-processing via `EffectComposer`, `UnrealBloomPass`, and `OutputPass`.
- Next in-memory live room snapshot for `/api/galaxy/rookie-plaza`.

Not added in this green slice:

- Babylon and Phaser.
- R3F/drei, because this pass uses direct engine-style Three.js control inside the existing app shell.
- Colyseus server runtime, because this checkout has no standalone Node/WebSocket process wired to production. The ghost placeholder is replaced with a live local room API, but true Colyseus needs a separate server topology rather than a Next App Router route.
