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
