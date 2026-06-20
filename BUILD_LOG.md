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

**Next:** Stage 3 commerce depth + remaining Stage-2 polish (Creator Gauntlet
board, Merch Foundry drops) — tracked in `BUILD_REPORT.md`.
