# Galaxy Dynasty — BUILD REPORT (Rookie Season)

The complete, playable vertical slice — built end to end on the existing GSN/GSE
monorepo, autonomously, to the Definition of Done.

---

## 1. What shipped vs. the Definition of Done

The DoD first session is fully playable. Each step maps to shipped code:

| DoD step | Shipped |
|---|---|
| Create Galaxy Profile | `/galaxy/onboarding` → `POST /api/galaxy/onboard` → `onboardProfile()` |
| Choose archetype | 7 archetypes (`@sports/galaxy-engine` `ARCHETYPES`) |
| Pick faction | 8 factions (`FACTIONS`) |
| Receive starter card pack | `STARTER_CARDS` granted on onboarding |
| Enter the Campus | `/galaxy` Campus hub with district map |
| One Academy Signal Check | `/galaxy/war-room?academy=1` → `runAcademyCheck()` |
| Visit the War Room | `/galaxy/war-room` (engine-settled real games) |
| One confidence-based prediction | `SignalCheckCard` + confidence slider → engine grade |
| One Blacktop mini-game | `/galaxy/blacktop` → `runBlacktopCheck()` |
| Fight The Public Trap | `/galaxy/depths` → `runPublicTrap()` PvM boss |
| Earn Galaxy Credits | closed-loop earn-only ledger via `awardCredits()` |
| Add one card to the Vault | `/galaxy/vault` (collection + companion data) |
| Join/preview a Crew | `/galaxy/crew` (create/join + preview crews) |
| Unlock first merch entitlement | clear The Public Trap → Signal Keeper SKU |
| See the GSE Pro upgrade path | `/galaxy/store` GSE Pro hook → `/pricing` |
| View My Dynasty room | `/galaxy/dynasty` (record, badges, skills, status) |
| Receive the next daily quest | `daily-signal` quest in `STARTER_QUESTS` |

Plus the non-functional bar:
- **Core loop feels good** — Profile → War Room → Signal Check → graded → XP/
  Credits/skill → card/reward → crew/faction → GSE prompt → merch/sub → status.
- **Galaxy Standard & Language/Visual Law** — enforced by tests over every
  surface (`galaxy-language-law.test.ts`, asset-brief visual line).
- **Credit Constitution holds in code** — earn-only, no cash-out path exists;
  `validateLedger` + tests prove it.
- **Grading is transparent** — glass-box breakdown on every Signal Check; an
  appeals/dispute stub (`SignalCheckAttempt.disputed/disputeNote`).
- **Stripe never left test mode** — `assertTestModeOnly()` refuses a live key.
- **Docs exist** — bible, `DECISIONS.md`, `BUILD_LOG.md`, this report.

## 2. Validation run + results

- `@sports/galaxy-engine`: **51 unit tests pass**; `tsc --noEmit` clean.
- Web Galaxy tests: **38 pass** (first-session integration, language law,
  schema-sync, engine-v0).
- Existing **brand-safety suite: 2119 pass** (no regressions).
- Web app `tsc --noEmit`: **0 errors**. ESLint on Galaxy code: **clean**.
- `npm run build`: **succeeds** — 10 Galaxy pages + 6 API routes compiled.

## 3. Key autonomous decisions (why)

- **Built on the existing GSE monorepo** (D-001): the bible names "the existing
  GSN/GSE grading engine" as canon; this repo *is* GSE.
- **Grading adapter wraps the real engine** (D-003): Signal Check correctness
  uses `calculatePickResult`; XP uses the Brier score — the §4.1 spine, no second
  source of truth.
- **Credits earn-only, cash-out impossible by construction** (D-006/D-014): the
  Credit Constitution made architecturally true and unit-tested.
- **War Room reps are real settled games** (D-013): honest and always playable
  with zero live-data dependency.

## 4. What was stubbed, and why

- **Higgsfield asset generation** (D-004): brief pipeline built and enforced
  (mandatory visual line); deterministic SVG placeholders ship instead of API
  calls, to avoid hard-stop #4 (runaway spend) and burning owner credits. Swap-in
  is one function (`buildAssetBrief` → `generate_image`).
- **Live Odds API pre-kickoff predictions**: seeded settled scenarios instead;
  live wiring is Stage-2.
- **Stripe checkout**: test-mode scaffold only (no live charge path) — hard-stop #1.
- **Physical card custody, real marketplace, KYC, 3D world**: out of scope
  (partner/counsel/funding-gated) — stubbed + roadmapped, never faked.
- **Persistence in this environment**: no Postgres connected, so the DB layer
  runs in stub mode; the loop still computes real engine outcomes
  (`persisted:false`). The owner runs the additive Galaxy migration
  (`npm run db:push`) to enable persistence.

## 5. Remaining risks

- **Migration not yet applied**: the additive Galaxy models exist in
  `schema.prisma` and the client is generated, but no migration ran (no DB +
  hard-stop #2). Owner must `db:push`/`db:migrate` against a real database.
- **Reward concurrency**: `applyReward` reads-then-writes; under heavy concurrent
  play the same profile could race. Acceptable for the slice; wrap in a
  transaction / row lock for Stage-2.
- **Auth in demo**: unauthenticated callers fall through to a non-persisting
  "stub" profile so the slice is reviewable; production play requires sign-in.

## 6. Hard-stops hit

None triggered. All four were respected proactively: Stripe test-mode only (#1),
no migration executed / additive schema only (#2), no real-money/likeness/league
marks (#3), no Higgsfield/Odds API spend (#4).

## 7. Single recommended next step

**Stage 2 — "Signal Cup" entry point: ship the async Signal Duel.** The data
model (`SignalDuel`) and the duel surface multiplier already exist; the engine
can grade two reads on the same game (outcome + confidence + line value +
process) today. Build `/galaxy/duel` + `POST /api/galaxy/duel` (create/join/
resolve) and skill-tiered matchmaking seeded by the existing Ghost profiles. That
turns the solo loop into the weekly-retention PvP loop with the least new
surface area, and it unlocks Crew Clash and the ranked ladder behind it.
