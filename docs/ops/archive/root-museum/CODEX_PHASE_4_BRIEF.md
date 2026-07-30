# Codex Brief — Phase 4: Engagement + Tools + Community + Model Court

**Date:** 2026-05-22
**Author:** Claude
**Status:** Hand-off, ready to execute once Phase 3 verification gate passes.
**Source of truth:** master plan `docs/galaxy-sports-edge-master-action-plan.md` Part 5 (Phase 4). Detailed specs at `docs/product/*-spec.md`.

---

## TL;DR

Phase 4 turns the platform from "transparent picks service" into "tool the user becomes sharper with." Eight major deliverables:

1. **Calibration training** at `/picks/[id]/calibrate` + `/calibration/me` — the radical #5 inversion.
2. **Edge Lab expansion** — 9 new free tools at `/tools`.
3. **GitHub Issues for the model** at `/model-issues` — community bug tracker.
4. **Model Court conversational layer** — adds the Q&A panel to Game Rooms.
5. **Chrome extension MVP** — DK/FD/MGM/Caesars overlay.
6. **Public stats CSV downloads** — researcher precursor (DEC-006 Phase 1).
7. **Reproducibility receipts** — per-pick input data downloadable.
8. **Sportsbook affiliate deeplinks** — one subtle link per pick detail page (DEC-012).

Plus: pick-along (tail/fade) tracking, reaction system, loss leaderboard, "fade me" badge.

Roughly 4-6 weeks of work. Phase 4 is the broadest phase by scope; ships as parallel work streams.

---

## Phase 3 prerequisites (must be true before Phase 4 starts)

1. Phase 3 verification gate passed (all 11 conditions in `CODEX_PHASE_3_BRIEF.md`).
2. Game Rooms read-only shipped — Model Court conversational layer (Step 4 below) extends the read-only surface.
3. Galaxy Studio v0 operational — Studio expansion (TikTok/Reels via HyperFrames, Canva integration) builds on it.
4. Twitter + Discord bots in production — bots are the primary distribution channel for calibration training prompts to start.
5. Model Journal has shipped at least 4 weekly entries — Model Court refusal templates reference Journal essays.
6. Loss Autopsy schema landed + at least 10 authored autopsies — Model Court "what would change our mind" answers reference them.
7. Pre-mortem pipeline running on every published pick — Model Court refusal templates point to pre-mortems.

If any are not true, escalate to `docs/ops/stuck-queue.md` rather than proceeding.

---

## Phase 4 deliverables, in order

Phase 4 is large. Recommended order minimizes integration risk; many items can ship in parallel.

---

### Step 1 — Trust gate decision

Before doing anything else, the owner must explicitly decide whether `PERFORMANCE_STATS_ENABLED` flips from `false` to `true` during Phase 4. This is the single biggest content-policy decision in the entire master plan.

**The case for flipping:**

- Phase 3 will have shipped substantial canonical pick history.
- Live Calibration chart can finally show real data.
- The Public Ledger can show its full content.
- Performance summaries can populate.

**The case against:**

- We've explicitly said we don't publish a marketing win rate.
- The Ledger already shows the data; aggregate stats add risk without clear upside.

**Decision required:** Owner resolves in `docs/ops/decision-log.md`. DEC-OPEN-E (Phase 4 trust gate flip) is added to the open list.

Phase 4 surfaces below assume `PERFORMANCE_STATS_ENABLED=true` for the Public Ledger view to populate fully. If the owner decides to keep it false, Phase 4 still ships — the surfaces just continue rendering bootstrap-state empty views.

---

### Step 2 — Model Court conversational layer (Game Rooms Phase 4 extension)

**Route:** existing `/room/[gameId]` (no new route).
**Spec:** `docs/product/model-court-prompts.md`.
**Code ready:** `apps/web/lib/intelligence-graph/model-court/prompts.ts` — system prompt + 6 refusal templates + 3 mode-prelude builders.

**Build:**

1. New schema: `ModelCourtCase` table with the shape from the spec — `(userId?, gameId, question, answer, refusalKind, evidenceRefs, modelVersion, latencyMs, responseId, askedAt)`.
2. API endpoint at `/api/room/[gameId]/court` accepting `POST { question, mode, lens? }` and returning a `ModelCourtAnswer`.
3. Game Room UI panel: text input → answer area with inline citations.
4. Caching: per `(gameId, questionHash)` for 7 days (OPEN-MC-1 default).
5. Quotas per tier (FREE 3/day, PRO 30/day, ELITE unlimited — OPEN-MC-2 default).
6. Three modes wired: `ASK_THIS_GAME`, `ASK_THE_SLATE`, `EXPLAIN_FOR_MY_LENS`.
7. Refusal rendering: when `refusal !== null`, render the refusal template prominently rather than burying it in an answer body.
8. Cost + latency targets: under $0.05/query, under 3s p50, under 6s p95.

**Compliance:**

- System prompt locked. Modify only via decision-log entry.
- All 6 refusal templates rendered as-is when the corresponding trigger fires.
- Compliance scanner runs on every Claude API response before display.

**Acceptance criteria:** 9 conditions in `model-court-prompts.md`. Eval suite at `docs/ops/evals/model-court-*` passes.

---

### Step 3 — Calibration training

**Routes:** `/picks/[id]/calibrate`, `/calibration/me`, `/settings/calibration`.
**Spec:** `docs/product/calibration-training-spec.md`.
**Code ready:** `apps/web/lib/calibration-training/insight-prompt.ts` — system prompt + builder.

**Build:**

1. Schema: `UserPickEstimate` + `UserCalibrationSnapshot` per spec.
2. Pre-show prompt UI on pick detail pages (Pro/Elite tier only when user has not opted out):
   - Slider 50%-95%, default 50%.
   - Inline above the model's confidence number.
   - "Show me the model's number" button reveals after submit.
3. `UserPickEstimate` persistence on submit.
4. Settlement integration — when a `Pick` settles, populate `outcome` + `estimateAccuracy` on matching `UserPickEstimate` rows.
5. Settlement notification — email + in-app + optional Discord DM if linked.
6. Weekly insight job at `workers/calibration-insights/` running Saturdays:
   - For each user with 20+ estimates this week.
   - Computes per-band, per-sport, per-pick-kind calibration deltas.
   - Calls Claude API with the insight prompt.
   - Persists to `UserCalibrationSnapshot`.
7. `/calibration/me` page rendering personal curve + comparison + insights archive.
8. Opt-in / opt-out flow at `/settings/calibration`.
9. Privacy default: opt-IN (user must affirmatively enable).

**Acceptance criteria:** 10 conditions in `calibration-training-spec.md`.

---

### Step 4 — Edge Lab expansion

**Route:** existing `/tools` gets 9 new sub-routes.
**Spec:** `docs/product/edge-lab-expansion-spec.md`.

**Build:**

1. Kelly Criterion sizer (full + fractional).
2. Hedge calculator.
3. Closing Line Value tracker (with optional Pro+ persistence into `BetTracker`).
4. Arbitrage finder.
5. Middling opportunity scanner.
6. Same-Game Parlay correlation matrix.
7. Live Game Simulator (Monte Carlo, 10k rollouts, in-browser).
8. Backtesting (Pro+ only — Phase 5 DSL replaces the form-based filter).
9. Bankroll Tracker / Paper Trading (linked to user account if Pro+).

**Conventions:**

- All FREE except backtesting + bankroll persistence.
- All tools run on user input — never call Galaxy's published confidence as a Kelly input.
- No auto-execution. Math + display only.
- URL-hashable state per `OPEN-LAB-1` default.
- Mobile-first.

**Acceptance criteria:** 8 conditions in `edge-lab-expansion-spec.md`.

---

### Step 5 — GitHub Issues for the model

**Routes:** `/model-issues`, `/model-issues/new`, `/model-issues/[number]`.
**Spec:** `docs/product/github-issues-for-model-spec.md`.

**Build:**

1. Schema: `ModelIssue`, `ModelIssueComment`, `ModelIssueUpvote`, `ModelIssueGame` per spec.
2. Filing form at `/model-issues/new` — issue kind selector + title + description + affected factor/gate/source + severity.
3. Index page with filters by status, kind, factor, sport, severity.
4. Detail page per issue with comments + triage history + affected games linked.
5. Triage workflow operable from `/cockpit/model-issues` — operator sets status with required public comment.
6. Upvote + comment functionality.
7. Rate limit: 5 issues filed per user per day. Duplicate detection on submit.
8. Cross-references from Model Journal (Phase 3) + changelog (existing).
9. Compliance scanner on triage comments.

**Acceptance criteria:** 10 conditions in `github-issues-for-model-spec.md`.

---

### Step 6 — Chrome extension MVP

**Location:** new workspace package `apps/extension/`.
**Spec:** `docs/product/chrome-extension-spec.md`.

**Build:**

1. Extension manifest (Chrome v3).
2. Per-book parsers at `apps/extension/parsers/{draftkings,fanduel,betmgm,caesars}.ts`.
3. Content script injecting Galaxy badge on tracked games.
4. Expanded card on hover/tap with factor breakdown (PRO+) or simple Edge Index (FREE).
5. API endpoint at `/api/extension/match-game` for matchup lookup.
6. API endpoint at `/api/extension/factor-breakdown` for PRO+ data.
7. OAuth linkage flow at `/integrations/extension/connect`.
8. Anonymous mode (no auth) shows Edge Index only.
9. Linked mode (Pro+) shows factor breakdown inline.
10. Privacy default: no betting-behavior tracking. Extension reads game tiles, injects badge, period.
11. Affiliate link toggle in settings, default OFF.

**Acceptance criteria:** 10 conditions in `chrome-extension-spec.md`. Test against the 4 supported books' main game-listing views.

**Chrome Web Store submission:** prepare listing copy, screenshots, privacy policy. Owner submits.

---

### Step 7 — Public stats CSV downloads + Reproducibility receipts

**Route:** new `/stats` (public) and `/picks/[id]/receipt` (Pro+ download).
**Spec:** master plan Part 2.E (research transparency moves) + DEC-006.

**Build:**

1. CSV exporter for settled picks with signal snapshots — public endpoint at `/api/stats/settled-picks.csv?from=...&to=...&sport=...`.
2. CSV exporter for daily slates — public at `/api/stats/slates.csv?from=...&to=...`.
3. Per-pick reproducibility receipt — Pro+ tier, downloadable at `/picks/[id]/receipt.json` returning the full `PickSignalSnapshot` + `evidenceRefs` + `modelVersion` + `gateDecision` at publish.
4. `/stats` index page listing available CSV exports + a one-line description each.
5. Public schema docs at `/stats/schema` describing every column.

This is the Researcher Program precursor per DEC-006 Phase 1.

---

### Step 8 — Sportsbook affiliate deeplinks

**Surface:** pick detail page only (per DEC-012 — no banners, no homepage, no upsell modals).
**Spec:** master plan Part 2.E (monetization).

**Build:**

1. Per-book affiliate link table mapped to game IDs / pick types.
2. Single "Place this at [book]" link on pick detail pages — minimal styling, below the pre-mortem.
3. Click tracking via the existing analytics surface.
4. Settings toggle for users to hide affiliate links entirely (default on).
5. Disclosure label "Affiliate link" inline.

**Decision required:** `DEC-OPEN-A` resolves before this ships. Which programs enrolled (DK, FD, MGM, Caesars, BetRivers, Underdog, PrizePicks)? Needs owner + licensing review.

---

### Step 9 — Pick-along, reactions, loss leaderboard, "fade me" badge

Smaller community + transparency surfaces.

**Build:**

1. Pick-along (tail/fade) tracking — when a user marks "tailed" or "faded" on a published pick, persist; compute the user's per-track-record stats.
2. Reactions on pick detail pages — agree / disagree / fade (no like/love emoji-style reactions; the three options are semantically tied to the bet).
3. Threaded comments on picks (Pro+ tier).
4. Loss leaderboard — this week's worst picks sorted by miss magnitude. Anti-marketing-as-marketing.
5. "Fade me" badge — the model publishes its weakest factor categories at the top of `/methodology`.

These five are individually small; ship as a single PR-4.9 grouping.

---

## Verification gate for Phase 4 → Phase 5

Phase 4 is "done" when:

1. All 9 deliverables shipped and merged.
2. Production deploy green.
3. Smoke test passes.
4. Calibration training has at least 10 active opted-in users with weekly insights generating.
5. Model Court answering with citations on at least 80% of FREE-tier queries (the rest are refusals — which is correct).
6. Edge Lab has all 9 tools functional with URL-hashable state.
7. At least 5 model issues filed and triaged.
8. Chrome extension submitted to Chrome Web Store.
9. Public stats CSVs downloadable.
10. Affiliate deeplinks live (assuming DEC-OPEN-A resolved).
11. Brand-safety scan against production HTML returns zero hits.
12. Retrospective note added to `docs/ops/decision-log.md`.

When all 12 are true, Phase 5 fires per the autonomous loop.

---

## Technical conventions to honor

Same as Phase 3 plus:

- **Trust-gate flip decision (Step 1 above) logged before any data-display surface changes behavior.**
- **No new LLM vendors.** Claude API for Model Court, calibration insight, any other LLM-shaped surface. DEC-020 locked.
- **Privacy default opt-IN for calibration training.** Strong default per spec.
- **Compliance scanner runs on every AI-generated surface output.** No exceptions.

---

## What Phase 4 does NOT touch

- Anti-Galaxy parallel model (Phase 5).
- Programmable DSL (Phase 5).
- B2B widgets + API (Phase 5).
- Live war room (Phase 5).
- Cross-sport correlation engine (Phase 5).
- Trust + compliance toolkit packaging for sale (Phase 5+).
- Native mobile app (Phase 5/6).

---

## Open items Claude is tracking for Phase 4

- **OPEN-P4-A:** Trust gate flip timing — Step 1 above. Owner-only decision.
- **OPEN-P4-B:** Affiliate program enrollment — `DEC-OPEN-A`. Owner-only.
- **OPEN-P4-C:** Calibration training first prompt copy — Claude drafts; owner approves before first 100 users see it.
- **OPEN-P4-D:** Chrome extension Firefox build timing — default: defer to Phase 5+.

If any become blockers, escalate to `docs/ops/stuck-queue.md`.

---

## PR strategy

Phase 4 is too large for a single PR. Recommended PR splits, each tagged `@claude-review`:

1. **PR-4.1 — Trust gate decision + Model Court** (Step 1 + Step 2)
2. **PR-4.2 — Calibration training schema + opt-in flow** (Step 3 part 1)
3. **PR-4.3 — Calibration training weekly insight pipeline** (Step 3 part 2)
4. **PR-4.4 — Calibration training surfaces** (Step 3 part 3)
5. **PR-4.5 — Edge Lab 9 tools** (Step 4) — may further split per tool
6. **PR-4.6 — GitHub Issues for the model** (Step 5)
7. **PR-4.7 — Chrome extension MVP** (Step 6)
8. **PR-4.8 — Public stats CSVs + reproducibility receipts** (Step 7)
9. **PR-4.9 — Pick-along + reactions + loss leaderboard + fade-me badge** (Step 9)
10. **PR-4.10 — Affiliate deeplinks** (Step 8, after DEC-OPEN-A resolves)

Each PR description: what changed, what surfaces, what tests, screenshots, `@claude-review`.

---

*Brief authored by Claude. Codex executes. Questions → escalate to `docs/ops/stuck-queue.md`.*
