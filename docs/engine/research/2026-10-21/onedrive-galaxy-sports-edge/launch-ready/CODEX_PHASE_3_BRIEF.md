# Codex Brief — Phase 3: Creator Layer + Transparency + Game Rooms + Bots

**Date:** 2026-05-22 (revised 2026-05-22 PM after Phase 2 closed — see "Phase 2 pre-shipped foundations" below)
**Author:** Claude
**Status:** FIRING — Phase 2 verification gate passed (DEC-028). Execute on the primary clone (`C:\Users\Garrett\Sports`).
**Source of truth:** master plan `docs/galaxy-sports-edge-master-action-plan.md` Part 5 (Phase 3), Part 2.C, Part 2.F. Detailed spec docs at `docs/product/*-spec.md`.

This brief is self-contained. Codex should NOT need to re-read the master plan or every spec doc to execute. If you find yourself wanting to, stop and either escalate to the stuck queue or update this brief.

---

## TL;DR

Phase 3 turns the platform into a Sports Intelligence OS surface for creators + community. Six major deliverables, mostly parallel-shippable:

1. **Galaxy Studio v0** at `/cockpit/studio` — turns one game into 8 creator-asset templates.
2. **Game Intelligence Rooms v0** at `/room/[gameId]` — per-game persistent surface, read-only.
3. **Twitter/X bot** posting free picks + slate state + settlements + post-mortems.
4. **Discord bot** mirroring Twitter content via Discord embeds + slash commands.
5. **Model Journal weekly essay** at `/journal` with Friday data pipe + Saturday Claude draft + Sunday publish.
6. **Loss Autopsy schema landing** (deferred from Phase 0/2) — required for Loss Room sub-archive and Galaxy Memory slot.

Three weeks of work. Spec docs cover the contracts; template code is pre-written and importable.

---

## Phase 2 pre-shipped foundations (2026-05-22 PM update)

After Phase 2 verification passed (DEC-028), Codex landed three things that simplify Phase 3:

1. **Deterministic pre-mortem builder is live (DEC-030).** Step 6 below simplifies. The builder + composer logic exists on primary clone; Phase 3 work for pre-mortem becomes "hook into publish path, persist `Pick.preMortemContent`, add re-run trigger on factor delta > 0.15, surface in Game Rooms" — NOT "implement the builder from scratch."

2. **`GateDecision` Prisma model is in place (DEC-029).** Board loaders prefer persisted gate decisions when available. Phase 3 surfaces (Game Rooms, Galaxy Studio) can read `gateDecision` directly from the Intelligence Graph without re-deriving it from `Pick` + `IngestionRun`. The "gate reason" copy in Twitter/Discord bot templates can read the persisted reason directly.

3. **Correlation query schema validator scaffold landed (DEC-031).** Phase 5 Step 3 starts ahead. No Phase 3 impact, but worth flagging.

**Pre-mortem parity note:** Claude shipped equivalent template code to the AI Sports scratch clone (`apps/web/lib/pre-mortem/templates/`, `compose.ts`, `compare.ts`). Codex's primary-clone implementation may have a different file layout but is functionally equivalent. Step 6 below assumes Codex's primary-clone version is the canonical one; reconcile only if owner requests.

---

## Phase 2 prerequisites (status as of 2026-05-22 PM)

All prerequisites met:

1. ✅ Phase 2 verification gate passed — DEC-028 logged. 1,427 tests across 115 files passing. Lint + typecheck + build + browser checks all green.
2. ✅ Retrospective entry in `docs/ops/decision-log.md` (DEC-028 includes retrospective).
3. ⏳ Loss Autopsy schema NOT yet landed — explicit Step 0 of Phase 3 below.
4. ⏳ Template/prompt code parity (IMP-003) — Codex's primary-clone implementations are the canonical versions for what Phase 2 needed (pre-mortem builder, Intelligence Graph). For Phase 3 surfaces (Studio templates, Twitter/Discord bot templates, Model Court prompts, compliance scanner rules, Model Journal prompts), Codex either pulls from `C:\Users\Garrett\Documents\Claude\Projects\AI Sports\apps\web\lib\` (Claude's scratch) or re-implements from the spec docs at `docs/product/*-spec.md`. Either route reaches equivalent output.

Phase 3 fires.

---

## Phase 3 deliverables, in order

Phase 3 is large. The deliverables can ship in parallel where they don't share files, but the recommended order below minimizes integration risk.

---

### Step 0 — Land Loss Autopsy schema (if not done)

This was queued from `CODEX_PICKUP_2026-05-22_LOSS_AUTOPSY_AND_PROMO_WIRE.md` and may have been deferred during Phase 2 work. Phase 3 cannot proceed without it because:

- Game Rooms reference `LossAutopsy` in the Galaxy Memory slot (post-settlement).
- The Loss Room sub-archive depends on `LossAutopsy.findMany` (with derived-from-Pick fallback).
- The Twitter bot post-mortem thread references autopsy content.
- The Model Journal weekly essay references autopsies.

Add the `LossAutopsy` model + `LossAutopsyStatus` enum + `LossRootCause` enum to `packages/db/prisma/schema.prisma` per the original pickup spec. Run `db:generate` and `db:migrate -- --name add_loss_autopsy`. Verification suite green.

Also: add the `/cockpit/losses` author route (read-only list with status badges; author UI deferred to Phase 4+).

Reference spec: `docs/product/ledger-and-loss-room-spec.md` section "Loss Room".

---

### Step 1 — Galaxy Studio v0

**Route:** `/cockpit/studio` (operator-only).
**Spec:** `docs/product/galaxy-studio-spec.md`.
**Templates ready to import:** `apps/web/lib/studio/templates/` — 8 template files + types + index. All 8 templates pre-written (fan-explainer, betting-education, x-thread, sponsor-safe, fantasy-angle, tiktok-reels-script, newsletter-block, youtube-titles).

**Build:**

1. Schema: `CreatorAsset` table (or persist as `Json` on a per-asset table — Codex picks). TTL 90 days per `OPEN-STUDIO-2` default.
2. Runtime at `apps/web/lib/studio/build-assets.ts` that calls `STUDIO_TEMPLATES`, passes the game's `GameIntelligenceNode`, and returns generated assets via Claude API.
3. Compliance scanner runs against every output before render via `apps/web/lib/compliance-scanner/rules.ts` and `getRulesForTemplate(templateKind)`.
4. Citations extracted from the asset body and matched against `evidenceRefs` from the node.
5. UI at `/cockpit/studio`:
   - Left rail: game/slate selector.
   - Center: template grid (8 cards).
   - Right rail: generation history, citations, compliance flags.
   - Bottom: export panel (copy to clipboard, download as markdown).
6. **No auto-post endpoint.** Hard-block by design.
7. Thin-evidence refusal: when the input game has no `PickSignalSnapshot` or insufficient `GameSignal`, Studio refuses with "Evidence is thin — no asset generated."

**Acceptance criteria:** 9 conditions in `galaxy-studio-spec.md`. All evals for studio-* pass.

---

### Step 2 — Game Intelligence Rooms v0 (read-only)

**Route:** `/room/[gameId]` (public, free-tier sees public projection).
**Spec:** `docs/product/game-room-spec.md`.

**Build:**

1. New route + page consuming `GameIntelligenceNode` projection via Intelligence Graph from Phase 2.
2. Panels rendering in lens-prioritized order (default lens BETTOR for Pro/Elite; FAN for FREE on a published pick; ANALYST for cockpit):
   - Market Pulse — from `node.marketPulse`
   - Slate Weather context — `SlateWeather` for the game's date plus per-game conditions
   - Evidence Timeline — visualization of `PickSignalSnapshot` history
   - What Would Change Our Mind — read from `Pick.preMortemContent` (built by Phase 2 pipeline)
   - Galaxy Memory slot — populated post-settlement with `LossAutopsy` cross-reference
3. Lens switcher (5 tabs: Fantasy / Fan / Bettor / Creator / Analyst) — reorders panels, does not change data.
4. Tier projection enforced via `projectForSurface(node, surface, viewer)` from Intelligence Graph.
5. Bootstrap-state behavior: "Evidence is thin — check back near game time" empty state.

**Model Court panel is NOT included in this step** — that's Phase 4. Game Rooms v0 ships read-only.

**Acceptance criteria:** 8 conditions in `game-room-spec.md` for Phase 3 read-only Room.

---

### Step 3 — Twitter/X autonomous bot

**Account:** @GalaxySportsAI (existing).
**Spec:** `docs/product/twitter-bot-voice-spec.md`.
**Templates ready to import:** `apps/web/lib/twitter-bot/templates/` — 4 builders (pick-publication, slate-state-gated, settlement, post-mortem-thread) + types + index.

**Build:**

1. Worker at `workers/twitter-bot/` running on a 5-minute heartbeat (BullMQ since Redis is already in tree).
2. Watch for: new `Pick.publishedAt` on FREE-tier picks, new gate decisions on operationally-significant games, new `Pick.settledAt` for free-tier picks, new `LossAutopsy` for free-tier losses.
3. For each event, call the appropriate builder from `lib/twitter-bot/templates`, run compliance scanner, post via Twitter API v2.
4. Rate limits per spec: max 12 slate-state posts per day, 20 total daily ceiling.
5. `MUTE_BOT=true` env flag halts all posts.
6. `AgentRunLog` row per attempt with success/failure metadata.
7. Hard refusals enforced: never post paid picks, never post engagement bait, never post outcome predictions.

**Acceptance criteria:** 9 conditions in `twitter-bot-voice-spec.md`. All twitter-bot-* evals pass.

---

### Step 4 — Discord bot

**Spec:** `docs/product/discord-bot-spec.md`.
**Templates ready to import:** `apps/web/lib/discord-bot/templates/` — 3 embed builders (pick-publication-embed, slate-state-gated-embed, settlement-embed) + types + index + BRAND_COLORS constants.

**Build:**

1. Bot at `workers/discord-bot/` running same heartbeat as Twitter bot.
2. OAuth-driven install flow at `/integrations/discord`.
3. 5 slash commands: `/pick today`, `/board status`, `/methodology`, `/explain [gameId]`, `/calibration`.
4. Per-server channel routing (server owner picks the pick-feed channel at install).
5. Post-mortem threads constructed using the settlement embed as parent + follow-up messages whose text comes from `lib/twitter-bot/templates/post-mortem-thread.ts` (same content, Discord-formatted).
6. Optional Galaxy account linkage for tier-aware slash command output.
7. Same rate limits + compliance scanner integration as Twitter bot.

**Acceptance criteria:** 11 conditions in `discord-bot-spec.md`.

---

### Step 5 — Model Journal weekly essay

**Spec:** `docs/product/model-journal-spec.md`.
**Drafting prompt ready to import:** `apps/web/lib/journal/prompts.ts` — JOURNAL_DRAFTING_SYSTEM_PROMPT + buildJournalDraftPromptUser(weekData).

**Build:**

1. Schema: `ModelJournalEntry` model + `ModelJournalEntryStatus` enum per spec.
2. Friday data pipe — scheduled job at `workers/journal-pipe/` runs every Friday afternoon. Collects:
   - Settled picks from previous ISO week.
   - Loss autopsies authored that week.
   - Pre-mortem hit/miss tagging via `lib/pre-mortem/compare.ts`.
   - Factor weight changes pending or shipped.
   - Notable gates.
3. Saturday drafting — second job calls Claude API with the canonical drafting prompt, persists draft to `ModelJournalEntry` with `status: 'DRAFT'`.
4. Owner reviews at `/cockpit/journal/[entryId]`, runs compliance scanner via `getRulesForTemplate`, publishes.
5. Sunday distribution:
   - Public surface at `/journal/[slug]` + index at `/journal`.
   - RSS feed at `/journal/rss.xml`.
   - Email digest to Elite subscribers (transactional via Resend).
   - Monday Twitter teaser auto-post.

**Acceptance criteria:** 11 conditions in `model-journal-spec.md`. Synthetic week-data evals pass.

---

### Step 6 — Pre-mortem pipeline wiring (SIMPLIFIED by Phase 2 pre-ship)

**Spec:** `docs/product/pre-mortem-pipeline-spec.md`.
**DEC-030 status:** Deterministic builder + composer logic already live on primary clone after Phase 2 work. This step is now WIRING the existing builder, not implementing it.

**Build (reduced scope):**

1. Schema additions to `Pick` (if not already done): `preMortemContent Json?`, `preMortemAt DateTime?`, `preMortemVersion String?`. Run migration.
2. Hook the existing builder into the publish path — after a `Pick.publishedAt` transition, invoke the builder and persist the result. Best-effort: if generation fails, the pick still publishes; missing pre-mortem surfaces in cockpit for manual authoring.
3. Re-run logic: when an underlying `PickSignalSnapshot` factor moves by more than 0.15 before settlement, re-invoke the builder.
4. Surface the persisted pre-mortem in Game Rooms (Step 2) and on pick detail pages.
5. Compliance scanner runs on output before render — via Codex's compliance-scanner equivalent OR Claude's scratch-clone `apps/web/lib/compliance-scanner/rules.ts` (`getRulesForTemplate`).
6. Loss Room cross-references the pre-mortem against the actual loss reason via a comparator (Claude's `compare.ts` shape or Codex's equivalent — DEC-030 includes the comparator logic on primary clone).

**Acceptance criteria:** 9 conditions in `pre-mortem-pipeline-spec.md`. This step ships ahead of Steps 1-5 to unblock Game Room rendering.

---

## Verification gate for Phase 3 → Phase 4

Phase 3 is "done" when:

1. All 6 deliverables shipped and merged.
2. Production deploy green.
3. Smoke test passes.
4. `/cockpit/studio`, `/room/[gameId]`, `/journal/[slug]`, `/journal` all render in production.
5. Twitter bot has posted at least one event of each kind in production.
6. Discord bot installable + posting in at least one test server.
7. Model Journal has shipped at least one published entry.
8. Loss Autopsy schema landed; at least one authored autopsy exists.
9. Pre-mortem pipeline running on every published pick.
10. Brand-safety scan against production HTML returns zero hits.
11. Retrospective note added to `docs/ops/decision-log.md`.

When all 11 are true, Phase 4 fires per the autonomous loop.

---

## Technical conventions to honor

These were established during Phase 1+2 and apply to all Phase 3 work:

- **Loader-extraction pattern (DEC-026):** new server-rendered surfaces follow page-reads-loader pattern. Routes are thin JSON wrappers.
- **Trust gates stay OFF:** `PUBLIC_PICKS_ENABLED`, `PERFORMANCE_STATS_ENABLED`, `OUTCOME_LEARNING_ENABLED`, `PUBLIC_BLOG_ENABLED` remain off in Phase 3. Phase 3 does NOT flip them; that's a Phase 4 conversation.
- **Mobile-first:** every new surface works at 390px. Tap targets 44px+.
- **No new dependencies** unless absolutely required. Phase 3 should not introduce new charting libraries, animation libraries, or LLM vendors. Claude API for everything LLM-shaped (DEC-020).
- **Banned vocabulary:** the compliance scanner (`apps/web/lib/compliance-scanner/rules.ts`) is the enforcement layer. Run on every AI-generated surface output before render or send.
- **No web sockets** unless explicitly approved. Phase 5 war room adds WebSocket; Phase 3 surfaces use polling or SSE.

---

## What Phase 3 does NOT touch

Codex does not modify these in Phase 3:

- Pricing tiers or tier narrative (DEC-010 locked).
- Brand name or domain (DEC-011 locked).
- Engine math (`packages/prediction-engine/`).
- Pick / PickSignalSnapshot / GameSignal core scoring logic.
- Edge Lab tools at `/tools` (Phase 4 work per master plan Part 4 rule 11).
- Trust gates (Phase 4 conversation).
- Anti-Galaxy parallel adversary model (Phase 5).
- Programmable DSL (Phase 5).
- B2B widgets + API (Phase 5).

---

## Open items Claude is tracking for Phase 3

- **OPEN-P3-A:** Studio's TTL on `CreatorAsset` rows — default 90 days. Reconsider after first 30 days of usage.
- **OPEN-P3-B:** Discord bot — should the bot maintain a Galaxy-operated official server? Default: no in v0, community-server distribution first.
- **OPEN-P3-C:** Model Journal — owner confirms whether to enable Elite email digest at first-essay publish or wait for Phase 4 calibration training to expand the digest content.
- **OPEN-P3-D:** Twitter bot — should it cross-post to Threads / IG / FB? Default: no in v0 (per spec). Reconsider in Phase 5+.

If any open items become blockers, escalate to `docs/ops/stuck-queue.md`.

---

## PR strategy

Phase 3 is too large for a single PR. Recommended PR splits, each tagged `@claude-review`:

1. **PR-3.1 — Loss Autopsy schema + Loss Room product surface** (Step 0)
2. **PR-3.2 — Pre-mortem pipeline wiring** (Step 6 — can land early since Game Rooms reference pre-mortem content)
3. **PR-3.3 — Galaxy Studio v0** (Step 1)
4. **PR-3.4 — Game Intelligence Rooms v0 read-only** (Step 2)
5. **PR-3.5 — Twitter bot** (Step 3)
6. **PR-3.6 — Discord bot** (Step 4)
7. **PR-3.7 — Model Journal** (Step 5)

Each PR description includes: what changed, what surfaces, what tests cover, screenshots if visual, mobile + desktop. `@claude-review` triggers Claude's 10-point auto-review checklist.

---

*Brief authored by Claude. Codex executes. Questions → escalate to `docs/ops/stuck-queue.md`.*
