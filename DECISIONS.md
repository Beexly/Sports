# Galaxy Dynasty — DECISIONS log

Autonomous build decisions (reversible choices: decide, log, proceed). One line
of rationale each. Hard-stops are recorded in `BUILD_LOG.md`.

## Phase 0 — Foundations

- **D-001 — Build inside the existing GSN/GSE monorepo, not a fresh repo.** The
  bible names "the existing GSN/GSE grading engine" as canon; this repo *is* GSE
  (`apps/web` brand = "Galaxy Sports Edge"). Galaxy Dynasty is the playable layer
  of this product, so it ships as new packages + routes here, reusing the engine.
- **D-002 — New engine package `@sports/galaxy-engine`.** Pure, DB-free, fully
  unit-tested game logic (Signal Check grading, calibration→Sports IQ, Credit
  Constitution, boss logic, brand/language law, asset briefs). Mirrors the
  existing `@sports/prediction-engine` package shape so it slots into the
  workspace and the same test runner.
- **D-003 — Grading adapter wraps the real engine, never reinvents it.** Signal
  Check correctness uses `calculatePickResult` (settlement) from
  `@sports/prediction-engine`; calibration XP uses the Brier score of the
  user's stated confidence vs the binary outcome. This is the bible's §4.1 spine.
- **D-004 — Higgsfield: build the brief pipeline, do NOT call the API in this
  run.** Generating dozens of assets autonomously would risk hard-stop #4
  (runaway third-party spend) and burn the owner's credits without approval.
  Instead, `asset-brief.ts` produces compliant prompts (mandatory visual line
  enforced) and we ship deterministic SVG placeholder art. Swapping in real
  Higgsfield output is a one-function change, logged as a roadmap item.
- **D-005 — Stripe stays in test mode (hard-stop #1).** Cosmetic store +
  subscription hooks are scaffolded against the existing `lib/stripe.ts` test
  client; no live keys, no charge path, no cash-out path anywhere.
- **D-006 — Galaxy Credits are EARN-ONLY this build.** The ledger is
  append-only with non-negative amounts and no debit/cash-out operation exists in
  code — the Credit Constitution made architecturally true and unit-tested.
  Cosmetics use Nova (Stripe test mode); achievement-gated merch is an
  entitlement unlock (no currency spent). No code path converts any currency to
  cash.
- **D-007 — Additive Prisma only (hard-stop #2 avoidance).** New models, new
  enums, new optional relations on `User`. No column drops, no type changes, no
  destructive migration. `prisma db push`/`migrate` is owner-run; we ship the
  schema + `prisma generate`.
- **D-008 — Galaxy routes live under `/galaxy/*`.** Keeps the slice
  self-contained, avoids colliding with the existing public surface, and lets the
  brand/language-law scanner target it precisely.
- **D-009 — Sports IQ skill key = the Odds API sport key** (e.g.
  `americanfootball_nfl`), so skills map 1:1 to real graded markets and the
  existing data layer, not invented categories.
- **D-010 — One live sport for the slice: NFL** (`americanfootball_nfl`) when
  real odds exist, with deterministic Ghost/seed fixtures as fallback so the loop
  is never empty (anti-ghost-town tenet).
- **D-011 — Language Law enforced by a test that scans `/galaxy` surfaces** for
  the forbidden vocabulary, complementing the existing GSE public-copy scanner.
- **D-012 — Credits/XP are awarded server-side only.** API routes own all state
  mutation and re-grade against the engine; the client never asserts a reward
  (mirrors the platform's "no frontend-only paywalls" rule).

## Phases 1–8

- **D-013 — War Room reps are real, fully-specified game settlements (not live
  pre-kickoff picks) for the slice.** Each scenario carries a real final and is
  graded by the engine, so the loop is honest and always playable with no live
  data. Wiring the Odds API for pre-kickoff predictions (graded later by the
  settlement worker) is a Stage-2 roadmap item.
- **D-014 — Store stays test-mode by a code guard, not just config.**
  `assertTestModeOnly()` throws if a LIVE Stripe key is present; the only
  real-money surface (Nova packs) returns a test-mode scaffold and never charges.
  Honors hard-stop #1 architecturally.
- **D-015 — Galaxy Engine v0 generated content is owner-approval gated.** Every
  AI-proposed quest ships `approved:false` and is brand-safety-scanned before it
  could reach a queue; nothing auto-publishes (bible §Phase 7 / §4.5).
- **D-016 — DB-stub resilience is a first-class mode.** Every server lib path is
  guarded so, with no database, the loop still computes and shows REAL engine
  outcomes (`persisted:false`) instead of crashing — the slice is reviewable
  before Postgres is provisioned. The Galaxy migration is owner-run
  (`db:push`/`db:migrate`); no migration was executed autonomously (hard-stop #2).
- **D-017 — No new required env vars.** The slice reuses existing
  `DATABASE_URL`/`STRIPE_*`; `env-example-coverage` stays green.

## Stage 2 — Signal Cup

- **D-018 — Duels resolve immediately against seeded scenarios.** Both reads are
  engine-graded against a known final, so a duel resolves the moment the second
  read lands (instantly vs a Ghost, on-join vs a human). This keeps PvP always
  playable (anti-ghost-town) without long-lived async state; live pre-kickoff
  duels graded by the settlement worker are a Stage-3 item.
- **D-019 — Ratings are Elo-on-calibration; ladders are skill-tiered.** Rating
  moves on duel results only; tiers (Rookie→Legend) gate matchmaking, never power
  (§4.1 anti-pay-to-win, §4.3 skill-tiered ladders). Ghost ratings derive from
  their calibration so the ladder is never empty.
- **D-020 — One generalized boss engine, five bosses.** `bosses.ts` replaces the
  Public-Trap-specific path with a registry; `runPublicTrap` stays as a thin
  back-compat wrapper. Each boss has a unique merch SKU; clearing is the only way
  to unlock it (achievement-gated, no purchase).
- **D-021 — Vault Market is a card-for-card prototype, never currency.** Trade
  offers record interest only; acceptance/settlement and any value exchange are
  Stage-3 partner-gated. This keeps the Credit Constitution intact — no currency,
  no cash, no custody touches the market this stage.
