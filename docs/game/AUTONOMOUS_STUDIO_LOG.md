# Galaxy Dynasty Autonomous Studio Log

## 2026-06-20

Branch: `codex/galaxy-dynasty-autonomous-studio`

Baseline:

- Checked out from `origin/claude/gracious-albattani-f63wx1` at `39775749`.
- `npm run guard:trust` passed: 1002 scanned files, no banned phrases.
- `npm run test --workspace=packages/galaxy-engine -- --run` passed at baseline: 84 tests.
- Selected web Galaxy tests failed at baseline because Vitest could not resolve `@sports/galaxy-engine`; fixed web test/build resolution for that package.

Build slice:

- Added `packages/galaxy-engine/src/game-kernel/` with Rookie Plaza map, entities, 20 quests, missions, 10 game skills, 25 rights-safe items/cards, NPCs, dialogue, weather effects, progression actions, anti-abuse rules, and GTA-shaped future systems.
- Exported the Game Kernel through `@sports/galaxy-engine`.
- Added `packages/galaxy-spatial/` with scene shell, materials, camera presets, input contract, performance budgets, and quality scoring.
- Added `/galaxy/campus/rookie-plaza` with a client 3D plaza, NPC dialogue, First Signal mission, inventory drawer, quest panel, and district routing.
- Added `/api/galaxy/rookie-plaza` and `apps/web/lib/galaxy/rookie-plaza.ts` with the required state/action facade.
- Added Campus entry point for Rookie Plaza.

Important decision:

- Superseded by Rescue v2: the first pass used the available spatial dependency, but this branch now uses Babylon for the Spatial OS package, Phaser for Blacktop, and Colyseus for presence contracts.

External repos:

- GitHub metadata fetch returned unusable shell responses. No external code or assets were copied. The extraction matrix is conservative and requires license verification before copying.

Verification:

- `npm run guard:trust` passed after implementation: 1028 scanned files.
- `npm run test --workspace=packages/galaxy-engine -- --run` passed: 10 files, 92 tests.
- `npm run test --workspace=packages/galaxy-spatial -- --run` passed: 1 file, 3 tests.
- `npm run typecheck --workspace=packages/galaxy-engine` passed.
- `npm run typecheck --workspace=packages/galaxy-spatial` passed.
- Focused Galaxy web tests passed: Rookie Plaza contract, brand gates, language law, first session, and Stage 2.
- Scoped ESLint on changed Rookie Plaza web files passed with zero warnings.
- Browser QA passed at `http://127.0.0.1:3078/galaxy/campus/rookie-plaza`; screenshots were written to `reports/rookie-plaza-playwright.png` and `reports/rookie-plaza-playwright-after-action.png`.
- Direct API POST for `signal_check` returned a reward payload with `persisted:false`, XP, credits, and the Rookie Signal Card.

Blocked environment checks:

- `npm run db:generate --workspace=packages/db` hit a Windows file-lock `EPERM` while renaming Prisma's `query_engine-windows.dll.node`.
- `npm run typecheck --workspace=apps/web` remains blocked by pre-existing generated Prisma client model errors; Rookie Plaza and Vitest config errors were cleared.
- `npm run build --workspace=apps/web` needed `NODE_OPTIONS=--use-system-ca` to pass local font certificate fetching, then failed during static generation because local Postgres credentials for user `sports` are invalid on admin routes.

## 2026-06-20 Rescue v2

Branch: `codex/galaxy-dynasty-studio-rescue-v2`

The first pass was corrected and deepened:

- Babylon is now installed and used for the Spatial OS package.
- Phaser is installed and used for Blacktop Signal Sprint.
- Colyseus is installed and used for the Rookie Plaza presence room package.
- Rookie Plaza now has keyboard movement, touch joystick movement, position sync,
  heartbeat, disclosed ghost roster, NPCs, quest board, inventory, Blacktop,
  Beat, and Depths routing.
- The Beat Broadcast Wall is now a spatial instrument, not a single route node.
- The procedural Babylon asset kit is tracked separately from final authored art.
- The Rockstar-style video prompt was converted into IP-safe Galaxy cinematic
  shot rules and launch teaser beats.

Verification:

- `packages/galaxy-spatial` tests/typecheck passed.
- `packages/galaxy-presence` tests/typecheck passed.
- `packages/galaxy-engine` tests/typecheck passed.
- `apps/web` typecheck passed.
- Focused Rookie Plaza web contract test passed.

Remaining caveats:

- Colyseus websocket hosting is not deployed yet; current app uses a local
  live-room adapter.
- Final authored environment/character assets remain gated by the asset pipeline.
- Full mobile browser QA and clean final Playwright rerun remain required.
