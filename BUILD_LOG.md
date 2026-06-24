# Galaxy Dynasty — BUILD LOG

Progress entries per Build Phase: what was built, decisions, tests + results,
stubs, next phase. Final report lives in `BUILD_REPORT.md`.

---

## Phase 0 — Foundations

**Built**
- Canon docs: `GALAXY_DYNASTY_World_and_Build_Bible_v2.md`, `DECISIONS.md`,
  `BUILD_LOG.md`.
- Confirmed the build target: the existing GSN/GSE monorepo. Galaxy Dynasty is
  the playable layer of Galaxy Sports Edge (D-001).
- New engine package `@sports/galaxy-engine` (pure, DB-free): the grading
  adapter (wraps `@sports/prediction-engine` settlement), the Calibration Engine,
  the Credit Constitution, the Signal Check, identity, the Public Trap, the
  Language Law, and the Higgsfield asset-brief pipeline.
- Installed the workspace toolchain.

**Decisions:** D-001 … D-012.
**Tests:** engine unit suite — 51 passing. **Stubs:** Higgsfield API (briefs
only, D-004). **Hard-stops:** none.

---

## Phase 1 — Identity

**Built**
- Archetypes (Sharp, Scout, Collector, GM, Captain, Showman, Street Legend) and
  Factions (Sharps … Grinders) in the engine, with brand-safe copy.
- Prisma `GalaxyProfile` (+ skills, ledger, cards, crew, merch, boss, duels),
  additive enums; `User.galaxyProfile` optional relation. `prisma generate` OK.
- `lib/galaxy/profile.ts` (onboarding, serialization), `assets.ts` (deterministic
  on-brand SVG avatars/cards/crests/badges in lieu of Higgsfield output).
- Pages: `/galaxy/onboarding` (archetype + faction picker), `/galaxy/dynasty`
  (My Dynasty / Locker Room — record, badges, skills, status).

**Tests:** identity registry + schema-sync. **Stubs:** avatar art = SVG
placeholders (briefs available). **Hard-stops:** none.

---

## Phase 2 — Calibration Engine + progression

**Built**
- Sports IQ skills (1–99) keyed by Odds API sport key (D-009); XP from the Brier
  score of stated confidence vs outcome — calibration, not just accuracy.
- Skill/character leveling (`leveling.ts`), perk gates (read-tools only, never
  power), prestige as non-spendable status.
- Galaxy Credits ledger — closed-loop, EARN-ONLY, no cash-out path exists
  (`credit-constitution.ts`); `applyReward` is the single server-side mutation.

**Tests:** calibration (10), leveling (7), credit-constitution (8) — all passing,
including "overconfidence is punished" and "no cash-out path".

---

## Phase 3 — The core loop

**Built**
- The reusable `SignalCheckCard` component (the atomic unit): two options +
  confidence slider → engine grade → transparent glass-box breakdown → XP/Credits.
- `/galaxy/war-room` (real games settled by the engine) + Academy mode
  (`?academy=1`). `lib/galaxy/loop.ts` runners + API `/api/galaxy/signal-check`.
- **Integration test: the full first-session DoD path passes** end-to-end.

**Tests:** signal-check (7), first-session integration (3). The loop produces
real engine outcomes even in DB-stub mode (persisted=false).

---

## Phase 4 — Compete

**Built**
- PvM boss **The Public Trap** (`public-trap.ts` + `/galaxy/depths`): a
  Signal-Check encounter that teaches crowd bias; clear on a 2/3 majority.
- Ghost/AI profiles seeded for ladder/anti-ghost-town; Signal Duel data model
  in place (async duel surface = Stage 2).

**Tests:** public-trap (4) — resist > follow, clear threshold, merch unlock.

---

## Phase 5 — Collect & belong

**Built**
- `/galaxy/vault` — starter card collection with digital companion data (GSE
  rating, form, value trend); collection/display only (no custody/marketplace).
- Crew shell `/galaxy/crew` (create/join + preview crews) and `/galaxy/blacktop`
  mini-game (stat/concept Signal Checks). APIs: `/api/galaxy/crew`.

**Tests:** covered by first-session integration + language-law scan.

---

## Phase 6 — Commerce hooks (test mode)

**Built**
- `/galaxy/store` (Merch Foundry): cosmetics priced in Nova, Nova packs via
  **Stripe test mode only** (`store.ts` `assertTestModeOnly` refuses a live key —
  hard-stop #1 enforced in code), the achievement-gated **Signal Keeper** merch
  unlock (from clearing The Public Trap), and the **GSE Pro** upgrade hook.

**Tests:** store guard exercised via brand-law + integration; no live charge path.
**Hard-stops:** #1 honored — test mode only, no activation.

---

## Phase 7 — Galaxy Engine v0 + Admin

**Built**
- `galaxy-engine-v0.ts`: detect sports triggers (upset/blowout/shootout) →
  propose a quest + a compliant Higgsfield asset brief; generated content is
  owner-approval gated (`approved: false`).
- `/galaxy/admin` owner console (role-gated): profiles, DAU proxy, credits
  issued/liability (redemption structurally 0), calibration, PvM, conversions,
  Higgsfield usage. `admin-metrics.ts` is crash-safe in stub mode.

**Tests:** galaxy-engine-v0 (4) — trigger detection + owner-gated, brand-safe.

---

## Phase 8 — Polish & harden

**Built**
- Brand Law pass: every `/galaxy` surface scanned by `galaxy-language-law.test.ts`
  (28 files) — clean. Visual law: shared cosmic shell, Galaxy palette everywhere.
- Schema ↔ engine sync test prevents enum drift.
- Full validation: web typecheck 0 errors, engine typecheck 0, lint clean,
  production build succeeds (all 10 pages + 6 API routes compiled), existing
  brand-safety suite (2119) still green.

**Final tally (Stage 1):** 89 Galaxy tests (51 engine + 38 web) passing.

---

## STAGE 2 — Signal Cup (weekly-retention loop)

**Built**
- **Async Signal Duel (ranked PvP):** engine `duel.ts` scores two reads on the
  same game (outcome + calibration + process), ties break to the better-calibrated
  read. Server `duel.ts`: Ghost duels (always playable), open duel create/join,
  Elo-on-calibration rating updates, skill-tiered Ghost matchmaking. UI: Proving
  Grounds `/galaxy/duel` + ranked `/galaxy/leaderboard`.
- **5 PvM bosses (The Depths):** generalized boss registry `bosses.ts` — The
  Public Trap, Overconfidence King, Recency Chaser, Narrative Trap, The Anchor —
  each teaches a cognitive bias; unique merch unlock per boss. `/galaxy/depths`
  now a 5-boss selector.
- **Season Program ("Signal Cup"):** `season.ts` tier track; points accrue from
  every graded check; idempotent reward claim (`/galaxy/season`). Rating + Season
  surfaced on My Dynasty and the header.
- **Crew Clash:** computed crew "clash power" (avg member calibration × activity)
  vs a seeded rival, on the Crew page.
- **Vault Market prototype + watchlist:** `market.ts` — watch cards, post
  card-for-card trade offers (no currency, no cash, no custody). `/galaxy/market`.

**Schema (additive):** `GalaxyProfile.rating/seasonPoints/seasonTierClaimed`,
`SignalDuel.scenarioId`, `CardWatch`, `CardTradeOffer` (+ enum). `prisma generate` OK.

**Decisions:** D-018 … D-021 (see `DECISIONS.md`).

**Tests:** engine +15 (rating/duel/season/bosses) → **66 engine**; web +5 Stage-2
integration → **54 web**. All green. Web typecheck 0, lint clean, build succeeds
(14 Galaxy pages + 9 API routes). Brand-safety suite (2147) unaffected.

**Hard-stops:** none. No cash-out (duels/season/market never touch cash); Stripe
untouched; additive schema only; no Higgsfield/Odds spend.

### Stage 2 round-out + Stage-4 starters

- **Faction War standings** (`/galaxy/factions`): per-faction power (avg rating ×
  size), Ghost-seeded so it's never empty — buildable Stage-4 social identity.
- **Daily streak with STREAK INSURANCE** (`/galaxy` claim): a single missed day
  never resets the streak (wellbeing §4.3); reward via the earn-only ledger.
- **Creator Gauntlet** (`/galaxy/creators`): curated challenge boards (open UGC is
  moderation-gated, logged for later).
- **Merch Foundry drops**: achievement/season/ladder-gated cosmetic drops on the
  store ("merch as proof").

All green: web typecheck 0, lint clean, build succeeds (16 Galaxy pages + 10 API
routes), language-law scans 44 files clean, 52 web + 66 engine Galaxy tests pass.

---

## DEEPENING OS + STAGE 3 STARTERS

Built per the owner's Deepening OS (deepen, don't sprawl) and the GTA/MMORPG
"everything feeds one character" north star (see `DECISIONS.md` D-022..D-028 and
`STAGE_2_BUILD_REPORT.md`):

- **Galaxy Score v1** — one transparent 0–1000 identity metric (calibration-first).
- **Boss canon** retheme to the five named bad-logic bosses + rich metadata.
- **Season objectives** (daily/weekly/seasonal) + Pro track (depth, not outcomes).
- **Cosmetics economy** — 23-item Wardrobe (kicks, fits, emotes, anthems, scenes,
  banners, frames, ticket stubs, titles); earn / season-drop / Nova (test mode);
  never affects outcomes.
- **Cribs** (`/galaxy/u/[handle]`) — visitable public profiles decorated by
  equipped cosmetics; **Friends/follow** social graph + Friends page.
- **Crew Utility** — 8 lanes + weekly missions, crew XP, signal board, leaderboard.
- **Crew Co-op Raids** — the week's boss tackled together (the first play-together
  mode), crew-wide raid-banner entitlement on clear.
- **Faction War**, **Creator Gauntlet**, **card momentum tags + detail/sparkline**,
  **daily streak with streak-insurance**.
- **Brand enforcement gates** (automated) + expanded **admin observability**.

**Final tally:** 164 Galaxy tests (77 engine + 87 web); web typecheck 0; lint
clean; build succeeds (~20 pages + 12 API routes); brand-safety suite (2191)
unaffected. Stripe test-mode only; additive schema only; no external spend.

The autonomously-buildable web trunk is comprehensive. What remains —
**real-time 3D open world, real-money marketplace/custody, KYC, live wagering,
literal action/violence tuning** — is the funded/partner/counsel-gated endgame
behind the four hard-stops (bible §2/§4.4), with design + asset briefs ready to
extend the trunk into a 3D client.

---

## 2026-06-20 — Rookie Plaza floor + Game Kernel + Spatial OS

Built the first playable town slice from the autonomous studio contract:

- `packages/galaxy-engine/src/game-kernel/`: world map, entities, 20 quests,
  missions, 10 skills, 25 safe items/cards, NPC/dialogue, weather effects,
  progression, anti-abuse, and GTA-shaped future systems.
- `packages/galaxy-spatial/`: initial spatial boundary with scene shell,
  materials, camera presets, input contract, performance budgets, and quality
  scoring. Superseded in Studio Rescue v2 by the Babylon-first package.
- `/galaxy/campus/rookie-plaza`: 3D Rookie Plaza, NPC dialogue, First Signal,
  inventory, quest panel, and route exits.
- `/api/galaxy/rookie-plaza`: state/action facade that reuses the existing
  Signal Check reward loop.
- Campus now surfaces `Enter Rookie Plaza` as the first playable action.

Notes: Trust gate was green before implementation. This baseline initially used
the available spatial dependency; Studio Rescue v2 superseded it with
Babylon-first Rookie Plaza and Beat implementations.

Validation:

- Trust gate passed after implementation: 1028 scanned files.
- Engine test suite passed: 10 files, 92 tests.
- Spatial package tests passed: 1 file, 3 tests.
- Engine and Spatial package typechecks passed.
- Focused Galaxy web tests passed: Rookie Plaza contract, brand gates, language
  law, first session, and Stage 2.
- Scoped ESLint on changed Rookie Plaza web files passed with zero warnings.
- Browser QA passed on `http://127.0.0.1:3078/galaxy/campus/rookie-plaza`;
  Playwright screenshots are in `reports/`.

Blocked checks:

- Prisma generate hit a Windows `EPERM` file lock while renaming Prisma's query
  engine DLL.
- Web typecheck remains blocked by pre-existing generated Prisma client model
  errors, not Rookie Plaza or Vitest config errors.
- Web build got through certificate-gated font fetching with
  `NODE_OPTIONS=--use-system-ca`, then failed static generation because local
  Postgres credentials for user `sports` are invalid on admin routes.

---

## 2026-06-20 — Studio Rescue v2

Built over the first Rookie Plaza pass:

- Converted `packages/galaxy-spatial` to Babylon-first, with a scene shell,
  materials, procedural asset kit, multi-part entity decoration, Rookie Plaza
  world builder, Beat visual layers, and quality gates.
- Added `packages/galaxy-presence` with a Colyseus Rookie Plaza room/schema and
  tests.
- Added a local live-room adapter in `apps/web/lib/galaxy/rookie-plaza-presence.ts`
  so the current Next route has load, heartbeat, position sync, ghost disclosure,
  and room roster state before websocket hosting.
- Added touch joystick movement to Rookie Plaza and merged it with keyboard
  movement.
- Expanded The Beat from a route node into a Babylon spatial instrument with
  ledger backplane, broadcast rings, source ticks, urgency towers, confidence
  rings, calibration rings, route trails, and UI controls.
- Added Phaser Signal Sprint for Blacktop.
- Added IP-safe Galaxy cinematic shot rules and launch teaser beats derived from
  the Rockstar-style video prompt without copying proprietary GTA/Rockstar
  assets.

Validation in this rescue pass:

- Spatial tests and typecheck passed.
- Presence tests and typecheck passed.
- Game engine tests passed: 10 files, 94 tests.
- Web Rookie Plaza contract tests passed: 3 tests.
- Web typecheck passed after the presence fix.

Known environment blockers:

- Prisma generate can still hit Windows DLL file locks.
- Browser QA captured every target route and screenshot once, but that pass hit a
  stale `.next` cache file-open error. A clean rerun remains required after the
  final code/doc changes.

---

## 2026-06-20 — Studio Rescue v2 polish and browser QA closeout

Focused the pass on first-slice quality instead of adding more world breadth:

- Collapsed Rookie Plaza quest/inventory/progression tools by default so first
  load reads as a playable 3D room, not a dashboard.
- Hid the touch joystick on desktop and made it a deliberate coarse-pointer
  control for mobile/tablet movement.
- Hardened Rookie Plaza Babylon graphics with denser field-grid geometry, a
  center verification ring, boundary rails, corner light masts, reduced glow,
  and lower weather-light blowout.
- Updated the Playwright smoke to exercise the new quest-drawer flow.
- Documented the safe free/open asset intake rule for FMHY-style discovery,
  OpenGameArt/Kenney-style sources, and any future Higgsfield generation.

Validation:

- `npm run typecheck --workspace=packages/galaxy-spatial`
- `npm run test --workspace=packages/galaxy-spatial -- --run`
- `npm run typecheck --workspace=apps/web`
- `npm run test --workspace=apps/web -- __tests__/rookie-plaza-contract.test.ts --run`
- `npm run lint --workspace=apps/web -- components/galaxy/rookie-plaza-client.tsx`
- `node reports/game-qa/playwright-smoke.cjs`

Browser QA result:

- `reports/game-qa/playwright-result.json` is green with no console errors, page
  errors, or material console errors.
- Screenshots refreshed under `reports/game-qa/` for Rookie Plaza, Blacktop,
  Depths, My Dynasty, and Beat Broadcast Wall.

Remaining honest launch blockers:

- Final authored GLB/texture art remains a launch-quality art pass, not a code
  dependency for the current playable slice.
- Colyseus is integrated as a package and room contract, but public multiplayer
  still requires websocket deployment and browser client hookup.
- `packages/galaxy-spatial` has no package-local lint script; use typecheck and
  Vitest until lint config is added there.

---

## 2026-06-24 — Session-wide audit and hardening

Audited all session work, including the uncommitted Galaxy Dynasty Studio worktree in `C:\Users\Garrett\Sports`, not just the `codex/intelligence-core` branch.

Corrections:

- Hardened Rookie Plaza local presence with bounded live players, normalized session IDs/labels/signals, and regression coverage.
- Removed the scene-remount path caused by NPC selection changes in the Rookie Plaza client.
- Removed visible keyboard-instruction copy and tightened new Galaxy card radii.
- Reconciled the stale autonomous studio report with the current Babylon-first rescue state.
- Fixed full-suite test issues that were exposed only under Windows/full-web concurrency: resource dump SHA drift, path separators in the no-fake-percentage scanner, migration helper importability, and cold-import route/loader budgets.

Validation:

- `NODE_OPTIONS=--use-system-ca npm run typecheck`
- `NODE_OPTIONS=--use-system-ca npm run lint`
- `cd apps/web && NODE_OPTIONS=--use-system-ca npx vitest run`
- `NODE_OPTIONS=--use-system-ca DATABASE_URL=stub npm run build`
- `NODE_OPTIONS=--use-system-ca npm run guard:trust`
- `NODE_OPTIONS=--use-system-ca npm run guard:model-freeze`
- `NODE_OPTIONS=--use-system-ca npm run guard:draft-only`
- Changed-file risk scan and `git diff --check` both clean.
