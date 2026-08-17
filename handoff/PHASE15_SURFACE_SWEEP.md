# P15-04 — Sweep: Social & Distribution Bots

**Sweep date:** 2026-08-17
**Auditor:** GSE sprint executor (automated agent)
**Status:** COMPLETE — all surfaces are DRAFT-ONLY; no live external posting path exists

## Scope

Directories:
- `apps/web/lib/twitter-bot/`
- `apps/web/lib/discord-bot/`
- `apps/web/lib/bot-outbox/`
- `apps/web/lib/growth/`
- `apps/web/lib/affiliate/`
- `apps/web/lib/media-revenue/`
- `apps/web/lib/promotions/`
- `apps/web/lib/waitlist/`
- `apps/web/lib/reader-register/`

Also checked:
- `vercel.json` cron registrations
- `workers/content-publishing/`
- `scripts/guardrails/draft-only.mjs`

Spec docs: `docs/product/twitter-bot-voice-spec.md`, `docs/product/discord-bot-spec.md`

## Method

Read every file in each directory. Traced import chains: searched for any code
that imports from `twitter-bot/templates` or `discord-bot/templates`, any env
var that gates Twitter/Discord posting, any cron route that posts externally,
and any worker that performs auto-publish. Ran existing test suites for the
bot-outbox surface.

## Findings

### 1. twitter-bot/ — DRAFT ONLY

`apps/web/lib/twitter-bot/templates/` contains four pure template builders:
- `pick-publication.ts` → `buildPickPublicationTweet()` — returns `TweetOutput` (text, hashtags, linkUrl)
- `settlement.ts` → `buildSettlementTweet()` — same
- `slate-state-gated.ts` → `buildSlateStateGatedTweet()` — same
- `post-mortem-thread.ts` → `buildPostMortemThread()` — returns `string[]` (multi-post thread text)
- `index.ts` — re-exports only
- `types.ts` — type definitions only

**No posting function exists.** There is no `twitter-bot/index.ts`, no
`twitter-bot/post.ts`, no `twitter-bot/client.ts`, no Twitter API SDK import.
No env var `TWITTER_API_KEY`, `TWITTER_BEARER`, `TWITTER_ACCESS_TOKEN`,
`X_API_KEY` appears in any non-ignored source file in the repo.

Templates are consumed ONLY by:
- `apps/web/lib/bot-outbox/plan.ts` — builds `PlannedBotOutboxItem[]` (draft plans)
- `apps/web/lib/bot-outbox/records.ts` — imports `FactorKey` type only
- `apps/web/app/api/cockpit/bot-outbox/preview/route.ts` — the admin preview endpoint
- `apps/web/__tests__/bot-templates.test.ts` — tests only

### 2. discord-bot/ — DRAFT ONLY

`apps/web/lib/discord-bot/templates/` mirrors twitter-bot:
- `pick-publication-embed.ts` → `buildPickPublicationEmbed()` — returns `DiscordEmbed`
- `settlement-embed.ts` → `buildSettlementEmbed()` — same
- `slate-state-gated-embed.ts` → `buildSlateStateGatedEmbed()` — same
- `index.ts` — re-exports only
- `types.ts` — type definitions + `BRAND_COLORS` constant

**No Discord client, no webhook, no bot token.** No `DISCORD_BOT_TOKEN`,
`DISCORD_WEBHOOK_URL`, or `@discordjs` import anywhere in non-ignored source.

Templates consumed ONLY by:
- `apps/web/lib/bot-outbox/plan.ts` — builds `PlannedBotOutboxItem[]` (embeds field)
- `apps/web/__tests__/bot-templates.test.ts` — tests only

### 3. bot-outbox/ — DRAFT-ONLY POLICY ENFORCED

`apps/web/lib/bot-outbox/` has three files:
- `load.ts` — `loadBotOutboxDrafts()` queries DB for recently-published free picks,
  recently-settled picks, and gated slate decisions; transforms them into
  `PlannedBotOutboxItem[]` via `plan.ts`. Returns a `BotOutboxDraftsPayload` with
  `policy: { draftOnly: true, externalDelivery: false, persistence: false }`.
- `records.ts` — maps DB record shapes to input types (`pickRecordToPublicationInput`,
  `pickRecordToSettlementInput`, `gateDecisionRecordToGatedInput`).
- `plan.ts` — `planPickPublicationOutbox()`, `planSettlementOutbox()`,
  `planGatedSlateOutbox()`. Each produces `PlannedBotOutboxItem[]` with
  `shouldPost: true` for non-blocked items but **does NOT send them anywhere**.
  Applies `applyBotComplianceGates()` which runs the compliance scanner; if a
  banned phrase matches, the item is marked `shouldPost: false` with
  `blockedReason: "compliance-blocked"`.

The only consumer route is `/api/cockpit/bot-outbox/preview/route.ts`:
- Requires `session.user.role === "ADMIN"` (line 307)
- Returns JSON with `policy: { draftOnly: true, externalDelivery: false, persistence: false }`
- Never calls any external posting API
- Registered in `_logs/REALITY.md` as `STUB/UNKNOWN` (line 340)

**Compliance gates are real and active:**
- `blockedPublicationReason()` blocks premium picks, bootstrap data, unpublished picks
- `blockedSettlementReason()` blocks premium picks, bootstrap data, unpublished picks,
  pending settlements
- `applyBotComplianceGates()` runs `scanBotCopyForBlock()` which uses
  `getRulesForTemplate("BOT_OUTBOX")` to block banned phrases
- If ANY item is compliance-blocked, ALL items in that batch are blocked (defense in depth)

### 4. workers/content-publishing/ — KILL SWITCH ON

`workers/content-publishing/src/index.ts`:
- `CONTENT_WORKER_ENABLED` must be `"true"` — not set by default
- `INTERNAL_CALIBRATION_ONLY` is ON unless explicitly set to `"false"`
- When `INTERNAL_CALIBRATION_ONLY` is true, ALL publish requests return
  `status: "REFUSED"` with `refusedByInternalCalibrationGates: true`
- Even if the gate is off, it only returns `status: "QUEUED"` (queued for
  operator review) — it never auto-publishes
- `main()` is a no-op when `CONTENT_WORKER_ENABLED !== "true"`

`_logs/REALITY.md` line 365: "Hard-disabled draft-only worker. Code is
intentionally no-op unless explicitly enabled."

### 5. vercel.json — NO SOCIAL CRON JOBS

The `crons` array in `vercel.json` lists 18 scheduled jobs:
`refresh-odds`, `board-fill`, `settle-picks`, `deliver-settlement-alerts`,
`generate-signal-slate`, `generate-drafts`, `reconcile-entitlements`,
`ingest-player-stats`, `hydrate-cold-plane`, `drain-ai-telemetry-recovery`,
`prune-rate-limits`, `repair-checkout-attempts`, `run-formal-receipt`,
`jarvis-snapshot`, `free-spine-health`, `health-alert`, `autonomy-cycle`,
`calibration-metrics`, `backfill-independent-trueprob`, `refresh-player-stats`.

**None** are twitter-bot, discord-bot, or any social/distribution posting job.
The only bot-outbox-related entries in scheduling context are the
`/api/cockpit/bot-outbox/preview` endpoint used by synthetic monitoring
(`CHECK-B1` for twitter, `CHECK-B2` for discord), which only checks that the
preview endpoint returns 200 — it does NOT verify external posting.

### 6. growth/ — COMPUTATION ONLY

`apps/web/lib/growth/` contains pure display-math / scoring modules:
- `cash-os.ts` — Cash OS analysis (own analysis, not a posting engine)
- `moat-score.ts` — R3 Uniqueness / Moat velocity scoring (lead-time indicator only)
- `moat-score.test.ts` — 8 tests, hand-computed fixtures, monotonic non-decreasing
- `runway.ts` — Cash runway display math (no I/O, no DB)

No external posting. No env-key gating for distribution.

### 7. affiliate/ — DATA ONLY

`apps/web/lib/affiliate/ledger.ts` (17,526 chars) — a ledger data module.
Single large file with no posting function. No API calls to affiliate
networks. No env vars for affiliate links.

### 8. media-revenue/ — STRATEGY + DRAFT QUEUE ONLY

`apps/web/lib/media-revenue/` (16 files):
- `index.ts` — barrel re-exports
- `claim-safety.ts` — banned/evidence phrase scanner (`scanMediaClaimText`)
- `content-idea-score.ts` — weighted scoring of content ideas
- `content-kpi.ts` + `content-kpi.test.ts` — KPI scoring (4 tests)
- `content-pillars.ts` — 10 content pillar definitions (1,96 items)
- `creator-identity.ts` — 3 voice strategies (official, founder, gsn)
- `first-month-content-queue.ts` — builds content queue items; **every item has `externalSendAllowed: false` hardcoded** (line 35, 45, 57, 113, 181)
- `first-month-content-seeds.ts` — 4 weekly seed definitions
- `first-month-review-queue.ts` — `liveActionLocks` on every packet:
  `publishAllowed: false`, `externalSendAllowed: false` (lines 29-34)
- `media-calendar.ts` — 29 weekly calendar slots
- `partner-fit.ts` — partner fit scoring
- `platform-strategy.ts` — 9 platform strategies (compliance notes include "No auto-posting")
- `repurposing-plan.ts` — default repurposing plan generator (YouTube Shorts → TikTok → Instagram → newsletter → x_thread → LinkedIn → carousel)
- `script-templates.ts` — 8 script templates with compliance notes
- `seo-pack.ts` — SEO pack validation

**Key: `first-month-content-queue.ts` line 181:**
```ts
approval: { externalSendAllowed: false, manualReviewRequired: true, publishAllowed: false, status: "DRAFT_ONLY" }
```
**And `first-month-review-queue.ts` lines 29-34:**
```ts
liveActionLocks: {
  publishAllowed: false,
  externalSendAllowed: false,
  routeExposureAllowed: false,
  liveIntegrationAllowed: false,
}
```

### 9. promotions/ — READ-ONLY GATE

`apps/web/lib/promotions/`:
- `guards.ts` — `evaluatePromotionForPublish()` — decides if a promotion passes
  compliance gates (terms URL required, disclosure presence, state eligibility,
  expiration); returns `publishable: boolean`
- `public-payload.ts` — `toPublicPromotion()` / `buildPublicPromotionsResponse()`
  — public-facing API shape; if a promotion fails the gate it is **omitted**
  from results, never blanked inline

No posting to external distribution. `SPONSOR_CANNOT_CONTROL` list
(line 11) includes: picks, model outputs, no-bet decisions, loss autopsies,
calibration claims, editorial conclusions — all cannot be controlled by sponsors.

### 10. waitlist/ — ACCESS GATE ONLY

`apps/web/lib/waitlist/access-gate.ts` — Basic Auth helper for waitlist gating.
- Opt-in: only when `GSE_WAITLIST_GATE_ENABLED === "true"` AND
  `GSE_WAITLIST_BASIC_FORCE === "true"` (see `lib/env/flags.ts:28-33`)
- Reads credentials from server-side env vars only
- Never logged, never reaches client bundle
- `lib/env/flags.ts:4`: "FOUNDING launch default is OPEN (flag false/unset)"

No social posting.

### 11. reader-register/ — CLIENT HOOK ONLY

`apps/web/lib/reader-register/use-reader-register.ts` — React client hook
that reads/writes `localStorage` under `gse-reader-register`. No server
posting. No env-key gating.

### 12. Guardrail verification: draft-only.mjs PASS

`scripts/guardrails/draft-only.mjs` scans for imports/calls of:
- `sendgrid`, `mailgun`, `nodemailer`, `resend`
- `twilio`, `discord-webhook`, `twitter-api`, `twitterPost()`
- `discordWebhook()`, tweep APIs

Result from `_logs/REALITY.md` line 382: **PASS — scanned 455 files, 0 violations.**

## VERIFY

Ran the existing test suites that touch the bot-outbox surface. All pass:

```
npx vitest run __tests__/bot-outbox-load.test.ts __tests__/bot-outbox-plan.test.ts __tests__/bot-outbox-records.test.ts __tests__/bot-outbox-preview-route.test.ts __tests__/bot-templates.test.ts
```

Result: 5 test files, 22 tests, 0 failures (run from `apps/web/`).

Typecheck: `npx tsc --noEmit` from `apps/web/` — EXIT 0, no errors (re-run this session).

## Conclusion

**All social/distribution surfaces are DRAFT-ONLY.** No cron job, worker, or
route posts to Twitter/X, Discord, or any external distribution channel.
The architecture is:

1. Template builders (`twitter-bot/templates/*`, `discord-bot/templates/*`)
   produce draft text/embeds — pure functions, no I/O
2. `bot-outbox/plan.ts` orchestrates drafts + compliance gates — no I/O
3. `bot-outbox/load.ts` loads candidate records from DB — read-only, policy
   explicitly declares `externalDelivery: false`
4. `/api/cockpit/bot-outbox/preview/route.ts` is admin-only and returns
   drafts as JSON — no posting
5. `workers/content-publishing/` is hard-disabled (kill switch default ON,
   `CONTENT_WORKER_ENABLED` unset)

There is **no path** where unvalidated data can reach an external post,
because there is no external posting mechanism at all. The only "send" path
is the future manual operator surface (not yet implemented), which is gated
by `EXTERNAL_SEND_DISABLED` in `cockpit-operating-map.ts` (status `DRAFT_ONLY`).

**Live vs dormant split:**
- **DORMANT:** `twitter-bot/templates/*`, `discord-bot/templates/*`,
  `bot-outbox/*` — draft generators, no posting consumer
- **DORMANT:** `workers/content-publishing/*` — kill switch enforced
- **DRAFT-ONLY POLICY:** `media-revenue/first-month-content-queue.ts`,
  `media-revenue/first-month-review-queue.ts` — `externalSendAllowed: false`
  on every item, hardcoded
- **COMPUTATION ONLY (never was a distributor):**
  `growth/*`, `affiliate/*`, `promotions/*`, `waitlist/*`, `reader-register/*`,
  `media-revenue/content-pillars.ts`, `media-revenue/script-templates.ts`,
  `media-revenue/platform-strategy.ts`
