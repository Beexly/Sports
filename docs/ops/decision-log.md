# Decision Log

Append-only operating log for Galaxy Sports Edge autonomous work.

## 2026-05-22 - Phase 2 API Slice Starts With Board State

- Decision: implement `/api/board/state`, `/api/board/passes`, and `/api/calibration` before deeper schema work.
- Rationale: the Phase 1 homepage already exposes Gate Cam, Pass List, and Live Calibration surfaces. These contracts let the UI move from static preview data toward real, bootstrap-safe data without breaking existing public shapes.
- Alternatives considered: start with a `GateDecision` schema migration first. Deferred because the current repo already has enough `Game`, `Pick`, and sample-pick structure to establish public API contracts safely.

## 2026-05-22 - Phase 2 Shared Loaders Before More Surfaces

- Decision: extract board state, pass list, and public calibration data into shared server loaders under `apps/web/lib/**`.
- Rationale: route handlers and public pages need the same bootstrap-safe data contracts. Shared loaders avoid importing API `GET` handlers inside server components and give future homepage, board, Game Room, and widget work a stable internal boundary.
- Alternatives considered: keep page-to-route imports until Phase 3. Rejected because it would make the next OS surfaces depend on HTTP-shaped route modules rather than typed read-model functions.

## 2026-05-22 - Correlation Foundation Starts As Typed Query Contract

- Decision: begin the cross-sport correlation engine with a typed query schema and validator, without adding database tables yet.
- Rationale: Phase 2 needs a backend foundation, while saved queries and share/star behavior belong to the later UI phase. A pure contract lets us lock public aggregate gates and sample-size rules before introducing migrations.
- Alternatives considered: add saved-query tables now. Deferred until the Phase 4/5 product surface needs persistence and entitlement gates.

## 2026-05-22 - Gate Decisions Use A Separate Append-Only Table

- Decision: add `GateDecision` as a separate table related to `Game` and optionally `Pick`, instead of extending `Pick` with nullable gate columns.
- Rationale: Gate Cam and Pass List need a history of scoring, published, and gated decisions. A separate table preserves multiple evaluations per game, keeps existing pick semantics stable, and gives bootstrap-era decisions an explicit `isBootstrap` flag.
- Rollback path: drop `gate_decisions` foreign keys and indexes, drop the `gate_decisions` table, then drop the `GateDecisionStatus` enum. No existing production table is rewritten by this migration.
- Alternatives considered: extend `Pick` with pass reasons. Rejected because many evaluated games never become picks, and the pass ledger should not require fake pick rows.

## 2026-05-22 - Correlation Rows Load From Learning-Eligible Settled Picks

- Decision: map cross-sport correlation inputs from published, non-bootstrap, settled picks that have non-bootstrap `PickSignalSnapshot.eligibleForLearning=true`.
- Rationale: Phase 2 correlation work should reuse the same canonical-history discipline as calibration and learning. The query evaluator receives a stable row shape, while Prisma details stay behind a server loader.
- Alternatives considered: load every non-bootstrap settled pick. Deferred because picks without learning-eligible snapshots may lack the immutable signal receipt needed for trustworthy hypothesis testing.

## 2026-05-22 - Phase 3 Architectural Commit Batch Landed

- Decision: continue Phase 3 by shipping code-owned architecture before template-dependent Studio and bot surfaces.
- Commits covered: `241fd33` correlation rows from settled picks, `e0efec1` Loss Room public ledger archive, `8bb10e3` GateDecision loader coverage, `693b5c8` expanded production synthetic probe, `ac34713` read-only Game Intelligence Rooms, and `730c782` public links into Game Rooms.
- Verification: lint, typecheck, build, and the full web test suite were green after the Game Room slice (`120` files, `1456` tests).
- Rationale: these slices do not depend on missing scratch-clone voice templates and give Phase 3 surfaces stable data/navigation foundations.

## 2026-05-22 - Scratch-to-Primary Parity Gap Resolved Locally

- Decision: copy Claude's missing scratch-clone template code, product specs, evals, fixtures, and phase briefs from `C:\Users\Garrett\Documents\Claude\Projects\AI Sports` into the primary checkout.
- Rationale: Studio, Twitter/X bot, Discord bot, Model Journal, Model Court, and calibration-training work need locked voice rules, refusal templates, and compliance contracts before implementation.
- Merge rule: additive template/spec files were copied directly; local append-only ops logs were merged instead of overwritten to preserve Codex's current decision history.
- Alternatives considered: re-implement from memory/spec snippets. Rejected for now because the source files were available locally and copying preserves Claude's locked wording.

## 2026-05-22 - Pass 16 Cockpit Specs and Journal Evals Synced

- Decision: copy the Pass 16 scratch-clone additions into primary: cockpit API-cost UI spec, cockpit synthetic-monitoring UI spec, and three Model Journal evals.
- Rationale: Phase 3 operator surfaces now have the same governance specs in primary that Claude produced in scratch, and Model Journal drafting has happy-path, banned-vocabulary, and thin-week honesty eval coverage before implementation.
- Merge rule: additive files only; no existing product specs or evals were overwritten.

## 2026-05-22 - Galaxy Studio Runtime and Cockpit Surface Started

- Decision: ship the first Galaxy Studio implementation slice as a template-backed cockpit surface with a pure runtime for prompt packaging, thin-evidence refusal, citations, and compliance scanning.
- Rationale: Studio should consume the locked Claude-owned templates before adding persistence or Claude API calls. The route gives operators a visible workspace while keeping exports manual and omitting any external posting path.
- Deferred: `CreatorAsset` persistence, Claude API generation, markdown export, and editable re-scan actions remain follow-up slices for Studio v0.

## 2026-05-22 - Studio Draft Generation Boundary Added

- Decision: add an admin-only Studio generation endpoint backed by the Claude API adapter, returning scanner-checked drafts only.
- Rationale: Studio needs one controlled boundary between the operator UI and Claude-owned templates before persistence or export actions are added. The endpoint refuses without `ANTHROPIC_API_KEY`, validates template kind, and carries an explicit no-auto-post policy.
- Deferred: persisted `CreatorAsset` records and UI-triggered generation history remain the next Studio slices.

## 2026-05-22 - Studio Operator Generate Flow Wired

- Decision: move the Studio workspace into a client island that calls the admin-only draft generation endpoint and previews scanner-checked output inline.
- Rationale: operators need a usable draft loop before persistence or export controls. The page keeps DB loading server-side, shows loading/error states per template, and still omits any external publishing action.
- Deferred: copy/download controls and generated asset persistence remain follow-up slices.

## 2026-05-22 - Studio Manual Export Controls Added

- Decision: add copy-to-markdown and save-to-markdown controls to generated Studio drafts without adding any external publishing path.
- Rationale: Studio v0 should let an operator take a scanner-reviewed draft into a human publishing workflow while preserving the plan's no-auto-posting rule.
- Deferred: persisted `CreatorAsset` records and generation history remain a schema-backed follow-up.

## 2026-05-22 - Studio Creator Asset Persistence Added

- Decision: persist generated Studio drafts as internal `CreatorAsset` records with markdown, citations, scanner flags, and compliance status.
- Rationale: operators need a history of generated assets before Studio can support review queues or analytics. The model has no publishing fields and the generation route remains export-only.
- Deferred: cockpit history filters and explicit exported/archive status transitions remain follow-up slices.

## 2026-05-22 - Model Journal Schema Added

- Decision: add `ModelJournalEntry` persistence for weekly draft, published, and retracted Journal essays.
- Rationale: the Friday data pipe, Saturday Claude draft, Sunday operator review, and public `/journal/[slug]` route all need a stable row before implementation.
- Deferred: data-pipe loader, Claude drafting route, cockpit editor, public journal pages, RSS, email, and Twitter teaser remain follow-up slices.

## 2026-05-22 - Model Journal Cockpit Landing Added

- Decision: add `/cockpit/journal` as an operator-only landing page backed by `ModelJournalEntry` rows.
- Rationale: the Journal needs an internal review queue before drafting, publishing, RSS, and distribution actions are wired. The page lists draft/review, published, and retracted entries without adding any public body-edit route.
- Deferred: entry editor, publish/retract actions, public `/journal` pages, RSS, and distribution queues remain follow-up slices.

## 2026-05-22 - Model Journal Entry Editor Shell Added

- Decision: add `/cockpit/journal/[entryId]` as the per-entry review shell with metadata, markdown body, preview, evidence references, and distribution state.
- Rationale: operators need a concrete review surface before publish actions are wired. Body editing is enabled only for `DRAFT` and `REVIEW_PENDING`; published and retracted entries render as preserved records.
- Deferred: save endpoint, compliance scan endpoint, publish/retract transition actions, RSS, email, teaser queue, and public `/journal` pages remain follow-up slices.

## 2026-05-22 - Public Model Journal Routes Added

- Decision: add `/journal` and `/journal/[slug]` backed only by `ModelJournalEntry` rows with `status: PUBLISHED`.
- Rationale: the public research archive needs to exist before publish automation, RSS, and digest distribution can point at stable URLs. Draft and retracted entries remain excluded from public loaders.
- Deferred: RSS XML generation, retracted-entry 410 responses, email digest delivery, teaser queue, and rich markdown rendering remain follow-up slices.

## 2026-05-22 - Model Journal RSS Added

- Decision: add `/journal/rss.xml` and include `/journal` in the sitemap.
- Rationale: the public Journal archive needs a stable feed target before weekly distribution and synthetic monitoring are wired.
- Deferred: per-entry sitemap expansion, publish-triggered feed invalidation, email digest delivery, and teaser queue remain follow-up slices.

## 2026-05-22 - Model Journal Draft Save Added

- Decision: add `PATCH /api/cockpit/journal/[id]` and a client-side save control for editable Journal drafts.
- Rationale: the cockpit editor must persist owner edits before compliance scan and publish transitions exist. The route is ADMIN-only and refuses updates outside `DRAFT` and `REVIEW_PENDING`.
- Deferred: autosave, compliance scan endpoint, publish/retract transition actions, RSS invalidation, email digest delivery, and teaser queue remain follow-up slices.

## 2026-05-22 - Model Journal Compliance Scan Added

- Decision: add Journal-specific compliance scanning via `scanModelJournalMarkdown()` and `POST /api/cockpit/journal/[id]/scan`.
- Rationale: publish transitions need a red/yellow/green scan result before they can be safely wired. The route is ADMIN-only, read-only, and uses `getRulesForTemplate("MODEL_JOURNAL")` including the first-person confidence block.
- Deferred: inline span highlighting, compliance result persistence, publish/retract transition actions, RSS invalidation, email digest delivery, and teaser queue remain follow-up slices.

## 2026-05-22 - Model Journal Review Submission Added

- Decision: add `POST /api/cockpit/journal/[id]/submit` and wire the editor's submit control to move compliant drafts into `REVIEW_PENDING`.
- Rationale: the current draft-only guardrail forbids non-null `publishedAt` writes and `PUBLISHED` status writes. A compliance-gated review transition advances the workflow without weakening that safety policy.
- Deferred: manual publish route, retraction route, RSS invalidation, email digest delivery, teaser queue, and any guardrail amendment for explicit manual publishing remain follow-up slices.

## 2026-05-22 - Model Journal Draft Creation Added

- Decision: add `POST /api/cockpit/journal` and `/cockpit/journal/new` for manual Journal draft creation.
- Rationale: operators need a safe way to start weekly research entries from the cockpit before automated drafting exists. Creation is ADMIN-only, initializes `DRAFT` rows with the current `MODEL_VERSION`, and triggers no public distribution.
- Deferred: automated Friday data pipe, Claude draft generation, evidence prefill, manual publish route, retraction route, RSS invalidation, email digest delivery, and teaser queue remain follow-up slices.

## 2026-05-22 - Model Journal Retraction Added

- Decision: add `POST /api/cockpit/journal/[id]/retract` and a cockpit retraction control for published Journal entries.
- Rationale: published Journal entries are preserved records, but operators need a controlled removal path when a public essay must leave the archive. Retraction requires an admin-authored reason, moves the entry to `RETRACTED`, and does not send external notices.
- Deferred: public 410 response for retracted slugs, retraction notice feed, manual publish route, RSS invalidation, email digest delivery, and teaser queue remain follow-up slices.

## 2026-05-22 - Model Journal Week Data Loader Added

- Decision: add a deterministic week-data loader for Model Journal drafting.
- Rationale: the Friday data pipe needs one server-side evidence bundle that includes settled canonical public picks, signal snapshot references, and public loss autopsies for an ISO week. The loader excludes bootstrap and seed data before any Claude drafting step can consume it.
- Deferred: Claude draft generation route, cockpit evidence preview, automatic draft creation, publish/retract feed invalidation, email digest delivery, and teaser queue remain follow-up slices.

## 2026-05-22 - Model Journal Evidence Preview Added

- Decision: add `GET /api/cockpit/journal/week-data` and wire `/cockpit/journal/new` to preview weekly Journal evidence counts.
- Rationale: operators should see whether an ISO week has enough settled canonical evidence before creating a Journal draft. The endpoint is ADMIN-only and read-only, returning counts from the deterministic week-data loader without creating drafts or sending public output.
- Deferred: full evidence table in cockpit, Claude draft generation route, automatic draft creation, publish/retract feed invalidation, email digest delivery, and teaser queue remain follow-up slices.

## 2026-05-22 - Model Journal Draft Composer Added

- Decision: add `composeJournalDraftMarkdown()` and use it as the default body for manual Journal draft creation.
- Rationale: draft creation should start from the same deterministic evidence bundle the future Claude drafting step will consume. The composer creates an operator-editable markdown skeleton with weekly counts, held/missed pick references, and public loss-autopsy references without calling an LLM or publishing anything.
- Deferred: Claude draft generation route, richer factor extraction, cockpit full evidence table, automatic draft creation, publish/retract feed invalidation, email digest delivery, and teaser queue remain follow-up slices.

## 2026-05-22 - Model Journal Sitemap Entries Added

- Decision: include published Model Journal detail URLs in `sitemap.xml`.
- Rationale: once a Journal entry is manually published, public discovery should not depend only on the index page or RSS feed. The sitemap reads the same published-only loader as `/journal`, so drafts and retracted entries remain excluded.
- Deferred: retracted-slug 410 handling, per-entry sitemap freshness after manual publish, email digest delivery, and teaser queue remain follow-up slices.

## 2026-05-22 - Model Journal Evidence Detail Preview Added

- Decision: expand the `/cockpit/journal/new` evidence preview to show concrete settled pick and public loss-autopsy references.
- Rationale: counts alone are not enough for operator review. The draft creator now surfaces the first settled pick references and loss-autopsy references from the read-only week-data endpoint before the draft row is created.
- Deferred: full evidence table with filters, cited-factor extraction, Claude draft generation route, publish/retract feed invalidation, email digest delivery, and teaser queue remain follow-up slices.

## 2026-05-22 - Model Journal Prompt Shape Aligned

- Decision: update the Model Journal prompt helper to consume the typed `JournalWeekData` shape.
- Rationale: the prompt builder still referenced an older ad hoc payload. Aligning it to `picks`, `lossAutopsies`, `counts`, and the evidence window removes translation risk before the Claude draft route is wired.
- Deferred: Claude draft generation route, cost tracking wrapper integration, richer factor extraction, pre-mortem tag feed, factor-change feed, and teaser queue remain follow-up slices.

## 2026-05-22 - Model Journal Drafts Persist Evidence References

- Decision: Model Journal draft creation now stores weekly settled-pick and public loss-autopsy IDs from the deterministic evidence loader.
- Rationale: the cockpit evidence rail, public Journal citations, and future Galaxy Memory links need durable references from the moment a draft is created.
- Deferred: full evidence table with filters, cited-factor extraction, Claude draft generation route, publish/retract feed invalidation, email digest delivery, and teaser queue remain follow-up slices.

## 2026-05-22 - Model Journal Draft Skeleton Matches Seven-Section Eval

- Decision: the deterministic Journal composer now mirrors the seven-section weekly draft structure and adds an explicit thin-week scope note when settled evidence is sparse.
- Rationale: manual drafts should start from the same editorial contract as the Claude drafting evals, including honest handling of low-sample weeks.
- Deferred: gate-count summaries, pre-mortem called/missed tags, factor-change summaries, Claude draft generation route, and cost tracking wrapper integration remain follow-up slices.

## 2026-05-22 - Model Journal Editor Refreshes After Status Transitions

- Decision: the cockpit Journal editor refreshes server-rendered entry state after review submission and retraction succeed.
- Rationale: status, immutability, and evidence rails should reflect the persisted transition immediately without requiring an operator reload.
- Deferred: publish scheduling, RSS invalidation, email digest delivery, teaser queue, and Game Memory cross-reference updates remain follow-up slices.

## 2026-05-22 - Model Journal Review Transition Stamps Audit Time

- Decision: the compliance-gated review transition now sets `reviewedAt` when a Journal draft moves to `REVIEW_PENDING`.
- Rationale: operator review actions need a durable timestamp before later publish scheduling exists.
- Deferred: publish approval identity, RSS invalidation, email digest delivery, teaser queue, and Game Memory cross-reference updates remain follow-up slices.

## 2026-05-22 - Claude API Cost Policy Module Added

- Decision: add a shared typed Claude API cost policy module with surfaces, initial budgets, threshold evaluation, and locked budget fallback copy.
- Rationale: Phase 3 Studio and Model Journal generation need one policy source before schema persistence and wrapper rewrites land.
- Deferred: Prisma cost-tracking migration, persistent call records, wrapper enforcement at every Claude call site, cockpit API-costs page, owner-channel alerts, and budget override controls remain follow-up slices.

## 2026-05-22 - Studio Claude Calls Respect Budget Policy Hook

- Decision: Studio Claude generation now checks the shared cost policy when a monthly spend value is supplied, refusing before the external API call at the red threshold.
- Rationale: the Phase 3 Studio path can adopt budget behavior before the persistent cost-record schema lands, and tests can verify no request is sent when capacity is exhausted.
- Deferred: database-backed spend lookup, call-record persistence, cockpit API-costs page, owner-channel alerts, and budget override controls remain follow-up slices.

## 2026-05-22 - Claude API Cost Records Reach Schema

- Decision: add `ClaudeApiCallRecord` and `ClaudeApiBudget` persistence with a UTC current-month spend loader, and wire Studio generation to read persisted Studio spend before calling Claude.
- Rationale: budget enforcement needs a database-backed aggregation point before Phase 3 Studio traffic grows and before the full shared wrapper migration is complete.
- Deferred: automatic call-record writes, seeded budget rows, cockpit API-costs page, owner-channel alerts, budget override controls, and wrapper migration for blog, Model Journal, Model Court, calibration, and pre-mortem surfaces remain follow-up slices.

## 2026-05-22 - Studio Claude Usage Is Recorded

- Decision: Studio Claude generation now records successful and failed Claude calls with surface, model, token counts, estimated cost, user, game, template, duration, and error state.
- Rationale: the monthly spend gate needs fresh call records from the highest-priority Phase 3 generation surface before the cockpit API-costs page can show useful data.
- Deferred: seeded budget rows, budget override controls, owner-channel alerts, and wrapper migration for blog, Model Journal, Model Court, calibration, and pre-mortem surfaces remain follow-up slices.

## 2026-05-22 - Claude API Budgets Seed Via Migration

- Decision: seed the initial per-surface Claude API monthly budgets through an idempotent Prisma migration instead of the local demo seed file.
- Rationale: budgets are production policy, not local demo data, and deploy-time rows keep cockpit API-costs wiring independent of optional seed runs.
- Deferred: runtime budget override reads, owner-channel alerts, and wrapper migration for remaining Claude surfaces remain follow-up slices.

## 2026-05-22 - Studio Reads Claude Budget Rows

- Decision: Studio generation now loads the persisted budget policy and active override state before enforcing the monthly spend gate.
- Rationale: the production budget rows seeded by migration should control runtime behavior, and an operator override must be honored without changing code.
- Deferred: cockpit override mutation UI, owner-channel alerts, and wrapper migration for remaining Claude surfaces remain follow-up slices.

## 2026-05-22 - Cockpit API Costs Read-Only Monitor

- Decision: add `/cockpit/api-costs` as an admin-only read-only monitor for current-month Claude API spend, budgets, call counts, error counts, override state, and recent failures.
- Rationale: operators need visibility before override mutation and alerting controls ship; the page also verifies that seeded budgets and persisted call records have a usable read model.
- Deferred: budget override mutation UI, owner-channel alerts, 30-day trend chart, top consumers by user/game, and wrapper migration for remaining Claude surfaces remain follow-up slices.

## 2026-05-22 - Blog Generator Uses Claude Budget Controls

- Decision: the legacy blog content generator now checks the persisted BLOG_GENERATION budget, honors active overrides, and records successful and failed Claude calls.
- Rationale: content generation was the remaining direct Claude path predating Studio, and it needs the same spend controls before Phase 3 traffic expands.
- Deferred: a single shared wrapper abstraction, owner-channel alerts, and budget controls for future Model Journal, Model Court, calibration, and pre-mortem Claude surfaces remain follow-up slices.

## 2026-05-22 - Claude Budget Override API

- Decision: add an admin-only `/api/cockpit/api-costs/override` route that validates Claude surfaces, requires a decision-log reason, and updates only override state.
- Rationale: red and hard-cap budget states need an auditable runtime escape hatch without redeploying or editing policy constants.
- Deferred: cockpit override buttons, owner-channel alerts, and richer audit persistence beyond the response payload remain follow-up slices.

## 2026-05-22 - Cockpit Claude Budget Override Control

- Decision: expose the Claude API budget override route from `/cockpit/api-costs` with a per-surface reason field and 24-hour enable action.
- Rationale: the operator should be able to resolve a legitimate budget block from the same monitor that shows the block, while preserving an explicit decision-log rationale.
- Deferred: durable audit rows for override decisions and owner-channel notification remain follow-up slices.

## 2026-05-22 - Claude API Direct-Call Guardrail

- Decision: add `scripts/guardrails/claude-api-usage.mjs` and include it in the root `guardrails` script to reject new direct Anthropic message calls outside approved paths.
- Rationale: Phase 3 adds several content surfaces, and each Claude API path must be budget-gated, usage-recorded, and intentionally reviewed.
- Deferred: consolidating Studio and blog generation onto a single shared wrapper remains a follow-up refactor.

## 2026-05-22 - Shared Claude Messages Client

- Decision: centralize Anthropic `/v1/messages` access in `apps/web/lib/claude-api/messages.ts` and move Studio plus blog generation onto that client.
- Rationale: the direct-call guardrail should approve one application path, so every Phase 3 Claude surface inherits consistent request shape, error typing, token accounting, and review visibility.
- Deferred: moving Model Journal, Model Court, calibration, and pre-mortem generation onto this client as each surface receives its runtime generator.

## 2026-05-22 - Budgeted Model Journal Draft Generation

- Decision: add an optional Model Journal Claude draft path that uses weekly evidence, the locked Journal prompt, the shared Claude messages client, and `MODEL_JOURNAL_DRAFT` budget accounting.
- Rationale: the cockpit can now create either a deterministic outline or a Claude-authored first draft without changing the draft-only publication gate.
- Deferred: publish scheduling, RSS/email distribution triggers, and Game Memory cross-references remain separate gated work.

## 2026-05-22 - Model Court Answer Runtime Starts Backend-Only

- Decision: add a backend Model Court answer runtime that enforces deterministic refusals and `MODEL_COURT_ANSWER` budget accounting before any Claude call.
- Rationale: the conversational Game Room layer needs evidence, certainty, personal-advice, competitor, and budget gates before UI wiring begins.
- Deferred: `/room/[gameId]` chat UI, request persistence, and slate-wide Model Court routing remain Phase 4 implementation slices.

## 2026-05-22 - Model Court API Is Game-Scoped First

- Decision: add `/api/room/[gameId]/model-court` as a Pro-or-Elite, game-scoped POST endpoint backed by the Game Room evidence loader and Model Court answer runtime.
- Rationale: the first route should prove server-side entitlement, evidence loading, deterministic refusals, API-key gating, and usage accounting before any public chat UI is exposed.
- Deferred: room-page chat controls, slate-wide questions, stored Model Court cases, and lens-specific UI affordances remain future slices.

## 2026-05-22 - Calibration Insight Generation Is Budgeted

- Decision: add a `CALIBRATION_WEEKLY_INSIGHT` Claude wrapper with a deterministic thin-week fallback, shared messages client usage, and call-record accounting.
- Rationale: calibration training needs weekly feedback without spending on insufficient samples or bypassing the Claude API budget monitor.
- Deferred: persistence to user calibration snapshots and the on-site calibration curve UI remain Phase 4 slices.

## 2026-05-22 - Bot Templates Must Render Clean Public Text

- Decision: normalize Twitter/X and Discord bot templates so settlement symbols, separators, and footers render as clean public text instead of mojibake.
- Rationale: bot posts are public trust surfaces; a broken glyph in a settlement or gated-slate update makes the feed look automated in the wrong way.
- Deferred: schedulers, delivery clients, rate limiting, and outbox persistence remain separate Phase 3 runtime work.

## 2026-05-22 - Bot Outbox Planning Is Draft-Only

- Decision: add pure bot outbox planners that render Twitter/X and Discord draft payloads with stable idempotency keys, entitlement blocks, bootstrap blocks, and no external delivery calls.
- Rationale: schedulers need deterministic, testable payload planning before delivery clients, persistence, and rate limiting are introduced.
- Deferred: persisted outbox tables, delivery clients, retry state, and channel-specific rate limiting remain separate Phase 3 runtime work.

## 2026-05-22 - Bot Outbox Preview Starts Cockpit-Only

- Decision: add an admin-only `/api/cockpit/bot-outbox/preview` endpoint that validates supplied event payloads and returns draft outbox items without persistence or external delivery.
- Rationale: operators and tests need a safe way to inspect bot event rendering before the scheduler and delivery runtime exist.
- Deferred: database-backed outbox rows, scheduled event discovery, delivery clients, and retry/rate-limit state remain separate Phase 3 runtime work.

## 2026-05-22 - Bot Outbox Uses Record Mappers

- Decision: add structural mappers that convert pick and gate-decision records into bot outbox planner inputs, including factor-breakdown normalization into approved factor keys.
- Rationale: the scheduler should depend on one tested translation layer instead of reconstructing bot payloads inside cron code.
- Deferred: live database discovery windows, persisted outbox rows, and channel delivery remain separate Phase 3 runtime work.

## 2026-05-22 - Bot Outbox Discovery Is Previewable

- Decision: add a draft discovery loader for recent free/public/canonical pick publications, settlements, and gated slate states, and expose it through cockpit preview GET.
- Rationale: operators need to inspect what the scheduler would consider before any outbox persistence or delivery clients exist.
- Deferred: durable outbox records, deduplication storage, delivery clients, and retry/rate-limit state remain separate Phase 3 runtime work.

## 2026-05-22 - Bot Outbox Gets A Read-Only Cockpit Surface

- Decision: add `/cockpit/bot-outbox` as an admin-only read-only view over draft bot outbox discovery, including counts, item state, channel, event kind, preview text, and idempotency key.
- Rationale: Phase 3 bot work needs operator visibility before any delivery controls exist.
- Deferred: delivery controls, retry controls, persisted outbox rows, and channel health telemetry remain separate Phase 3 runtime work.

## 2026-05-22 - Synthetic Monitoring Starts As Read-Only Cockpit Visibility

- Decision: implement `/cockpit/synthetic-monitoring` as a read-only operator dashboard backed by typed check definitions, plus `/api/health/synthetic-monitoring` as a runner heartbeat.
- Rationale: the production probe already checks critical public routes and banned positioning phrases. Before wiring durable scheduled history, operators need one place to see the expected check map, pending runner-owned checks, cadence, and safe configuration.
- Deferred: manual run controls, pause/resume controls, durable history, issue-queue auto-filing, and owner-channel alerts remain separate synthetic-runner slices.

## 2026-05-22 - Production Probe Emits Structured Results

- Decision: add `PROD_PROBE_JSON=1` support to `scripts/prod-probe.mjs`, emitting sanitized structured probe results while keeping the existing one-line console output as the default.
- Rationale: the synthetic monitoring runner needs machine-readable status before durable history exists. The JSON payload includes paths, status codes, latency, banned-phrase findings, and admin-probe flags without response bodies or cookies.
- Deferred: storing probe output, deduplicating failures, and auto-filing issue-queue entries remain separate runner slices.

## 2026-05-22 - Synthetic Runner Writes Latest Probe Artifact

- Decision: add `scripts/synthetic-monitoring-runner.mjs` and the root `synthetic:run` script to execute the production probe in structured mode and write `.synthetic-monitoring/latest.json`.
- Rationale: the monitoring loop now has a scheduler-friendly command that preserves probe exit codes while leaving a machine-readable artifact for later cockpit/history ingestion.
- Deferred: database persistence, 24-hour history, issue-queue filing, and owner-channel notification remain separate runner slices.

## 2026-05-22 - Cockpit Synthetic Monitoring Reads Latest Artifact

- Decision: update the synthetic monitoring dashboard loader to read `.synthetic-monitoring/latest.json` when present and hydrate covered checks from the latest probe result.
- Rationale: the cockpit page now reflects runner output instead of only static expectations, while still keeping unsupported checks pending until the scheduled runner captures those signals.
- Deferred: historical sparklines from durable runs, issue cards from auto-filed queue entries, and manual rerun controls remain separate slices.
