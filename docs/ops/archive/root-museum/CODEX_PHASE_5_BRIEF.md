# Codex Brief — Phase 5: Platform + Adversarial + Programmable + B2B

**Date:** 2026-05-22
**Author:** Claude
**Status:** Hand-off, ready to execute once Phase 4 verification gate passes.
**Source of truth:** master plan `docs/galaxy-sports-edge-master-action-plan.md` Part 5 (Phase 5). Detailed specs at `docs/product/*-spec.md`.

---

## TL;DR

Phase 5 turns Galaxy from "consumer subscription + creator tools" into a full Sports Intelligence OS. Six major deliverables, mostly parallel-shippable:

1. **Programmable DSL** — `/dsl` parser + sandbox + runtime, save/share/star, alert scripts (Elite).
2. **Anti-Galaxy parallel adversary model** — `/anti-galaxy` parallel slate, methodology page section.
3. **Live war room** — `/warroom/[episodeId]` YouTube Live with real-time overlay.
4. **Cross-sport correlation engine** — `/correlate` query builder + DSL mode.
5. **B2B widgets + API** — embed routes + `/api/intelligence/*` paid endpoints + key management.
6. **Trust + Compliance toolkit packaging** — extract `packages/galaxy-compliance/` for B2B sale.

Plus: Researcher Program kickoff (DEC-006 Phase 2). Native mobile app (if not already started in Phase 4).

Roughly 6-8 weeks of work — the largest phase by scope. Phase 5 is when the OS frame becomes commercially real.

---

## Phase 4 prerequisites (must be true before Phase 5 starts)

1. Phase 4 verification gate passed (all 12 conditions in `CODEX_PHASE_4_BRIEF.md`).
2. Model Court conversational layer in production for at least 4 weeks with measurable refusal rate consistent with the spec.
3. Calibration training has at least 100 opted-in users — sample large enough to validate the insight prompt's voice and accuracy.
4. Chrome extension shipped to Chrome Web Store with at least 1000 installs.
5. GitHub Issues for the model has at least 20 issues filed with public triage history.
6. Trust gate decision (DEC-OPEN-E) resolved one way or the other.
7. Affiliate program enrollment (DEC-OPEN-A) resolved — at least one program live.

If any are not true, escalate to `docs/ops/stuck-queue.md`.

---

## Phase 5 deliverables, in order

### Step 1 — Programmable DSL (Bloomberg-Terminal-for-sports-betting)

**Routes:** `/dsl` (Pro+ editor), `/dsl/community` (public starred queries), `/dsl/alerts` (Elite), `/dsl/docs` (public docs).
**Spec:** `docs/product/programmable-dsl-spec.md`.
**Location:** `packages/galaxy-dsl/`, `apps/web/app/dsl/`, `apps/web/lib/dsl/`.

**Build:**

1. **Parser** — hand-rolled or PEG.js (Codex picks). Outputs typed AST.
2. **Type checker** — catches unknown fields, type mismatches, unsupported operators, reserved-keyword misuse at parse time. Helpful error messages.
3. **Sandbox** — enforces the 6 hard constraints from the spec (no eval, no Function ctor, no file/network, no mutation, no loops/recursion, bounded time + memory).
4. **Runtime** — walks AST against `Pick` + `GameSignal` data. No code generation.
5. **Field reference** — Codex implements the field schema. Claude curates the field list + docs. Match the spec exactly.
6. **Save / share / star** — `UserDSLQuery` + `UserDSLQueryStar` tables. Public queries get `/dsl/q/[queryId]` permalinks.
7. **Alert runtime** — `UserDSLAlert` schema + scheduler hooking into 30-min refresh cycle. Elite tier only. Notification channels: email, SMS (Twilio), Discord DM, webhook.
8. **Backtest invocation** — `correlate ... between ... and ...` clause runs against historical data.
9. **`/dsl/docs` page** — public, Claude writes the content.
10. **`/dsl/community`** — shows most-starred public queries with one-click fork.

**Acceptance criteria:** 11 conditions in `programmable-dsl-spec.md`.

**Compliance:** any public query name + body runs through the compliance scanner (`apps/web/lib/compliance-scanner/rules.ts`).

---

### Step 2 — Anti-Galaxy parallel adversary model

**Routes:** `/anti-galaxy` (Pro+ side-by-side feed), `/anti-galaxy/summary` (FREE comparison chart).
**Spec:** `docs/product/anti-galaxy-spec.md`.
**Location:** `packages/anti-galaxy/`, `apps/web/app/anti-galaxy/`.

**Build:**

1. Schema: `AntiGalaxyPick` table per spec — separate from production `Pick` (clean separation).
2. Parallel worker at `workers/anti-galaxy/` reading the same `PickSignalSnapshot` rows production scores, applying inverted weights + inverted gate logic.
3. Settlement aggregation runs independently for the anti feed.
4. `/anti-galaxy` page — side-by-side feed, tier-gated.
5. Convergence warning: when both Galaxy and anti-Galaxy publish on the same pick direction, log `AgentRunLog` with severity HIGH, surface in cockpit at `/cockpit/anti-galaxy-warnings`, trigger operator review before production pick publishes.
6. Methodology page section explaining the adversary model (Claude writes).
7. Anti-Galaxy worker isolation: cannot read or write `Pick` table. Enforced via separate Prisma client or strict access boundary.

**Acceptance criteria:** 11 conditions in `anti-galaxy-spec.md`.

---

### Step 3 — Cross-sport correlation engine

**Route:** `/correlate` (visual builder + DSL mode), `/correlate/q/[queryId]` (saved query), `/correlate/community` (starred queries).
**Spec:** `docs/product/cross-sport-correlation-engine-spec.md`.

**Build:**

1. Query model: trigger + observation window + outcome, persisted as a parametric query against historical settled-pick + signal data.
2. Visual query builder UI for Pro tier.
3. DSL mode for Elite tier — extends the `programmable-dsl-spec` grammar with `correlate / trigger / observe / outcome / measure` keywords.
4. Result computation: deterministic, against the full historical `Pick` + `GameSignal` table.
5. Result rendering: headline delta, sample size, significance marker (qualitative: WEAK / MODERATE / STRONG — no p-values), confidence interval, sample distribution chart, linked trigger events with `/room/[gameId]` deep links, mandatory disclaimer.
6. Save / share / star.
7. Tier rate limits: Pro 10/day, Elite 100/day.
8. Performance budget: typical query under 10 seconds, full historical data set queryable.

**Acceptance criteria:** 10 conditions in `cross-sport-correlation-engine-spec.md`.

---

### Step 4 — Live war room

**Route:** `/warroom`, `/warroom/[episodeId]`, `/warroom/schedule`, `/warroom/replays`.
**Spec:** `docs/product/live-war-room-spec.md`.
**Decision log required:** WebSocket exception to Part 4 rule 9 — explicit DEC entry before WebSocket gateway lands.

**Build:**

1. WebSocket gateway at `wss://galaxysportsedge.com/api/warroom/stream` exposing `PickSignalSnapshot` updates via Redis pub/sub (Redis already in tree).
2. Polling fallback endpoint at `/api/warroom/state` (15-second cadence).
3. Overlay HTML page at `/warroom/overlay?variant={free,pro,elite}&gameId=...` for OBS browser source.
4. Three overlay variants per tier — parameterized URL.
5. `/warroom/schedule` with .ics subscription.
6. Email reminders 1 hour before each stream (Resend integration from Phase 3).
7. Discord announcement integration with the Discord bot (auto-fire on schedule).
8. Twitter "going live in 30 min" auto-tweet (via Twitter bot).
9. YouTube Live URL embeddable on `/warroom/[episodeId]`.
10. Discord chat channel scoped to Elite tier.
11. Replay archive — playlist embedded on `/warroom/replays`.

**Acceptance criteria:** 10 conditions in `live-war-room-spec.md`.

---

### Step 5 — B2B widgets + API

**Routes:** `/embed/{edge-index,market-pulse,slate-weather,model-court}/[gameId|date]`, `/api/intelligence/{game/[id],slate,creator-pack,explain,ledger}`.
**Spec:** `docs/product/b2b-widgets-and-api-spec.md`.
**Decision required:** `DEC-OPEN-C` (B2B API pricing tiers) resolves before launch.

**Build:**

1. Schema: `ApiKey` + `ApiKeyUsage` per spec.
2. Key management UI at `/b2b/keys` — issue, revoke, set domain whitelist, set rate limit.
3. All 5 API endpoints implemented as thin wrappers around Intelligence Graph projections (`projectForSurface(node, B2B_*, viewer)`).
4. Four widgets shipped — each is a server-rendered standalone page that other sites embed via `<iframe>`:
   - `/embed/edge-index/[gameId]` — FREE, public.
   - `/embed/market-pulse/[gameId]` — paid.
   - `/embed/slate-weather` — paid.
   - `/embed/model-court/[gameId]` — paid Enterprise.
5. Domain whitelist enforced per key.
6. Usage metering per key, recorded in `ApiKeyUsage`.
7. Compliance scanner runs on any Claude-generated response (Model Court widget, creator-pack API).
8. `/b2b/docs` documentation site with per-endpoint examples + JS SDK reference.
9. Status page at `status.galaxysportsedge.com`.
10. 99.9% uptime SLA for Enterprise tier (operational, not just claimed).

**Acceptance criteria:** 10 conditions in `b2b-widgets-and-api-spec.md`. Plus #11 (commercial gate): at least 3 buyer personas have pilot agreements signed.

---

### Step 6 — Trust + Compliance toolkit packaging

**Spec:** `docs/product/trust-compliance-toolkit-spec.md`.
**Location:** new package at `packages/galaxy-compliance/`.

**Build:**

1. Extract claim scanner (`apps/web/lib/compliance-scanner/`) into a standalone package usable by external operators.
2. Extract promo guard (`apps/web/lib/promotions/guards.ts`) into the package.
3. Extract Loss Room renderer into a white-label embeddable iframe — operator embeds at their own subdomain.
4. Extract evidence registry into a structured API.
5. Marketing surface at `/compliance-toolkit` with pricing (deferred per DEC-OPEN-B), demo videos, case study (Galaxy itself).
6. `/compliance-toolkit/docs` API documentation.
7. Authentication + billing integration.
8. Rule sets versioned with public changelog.
9. Buyer onboarding flow.

**Acceptance criteria:** 8 conditions in `trust-compliance-toolkit-spec.md`.

---

### Step 7 — Researcher Program kickoff

Phase 2 of DEC-006. Manual access, paid-or-free-with-co-authorship for university researchers, hedge fund desks, academic departments.

**Build:**

1. Application page at `/research`.
2. Operator review flow at `/cockpit/research-applications`.
3. Researcher accounts get full historical-data API access (extends the `/api/intelligence/ledger` endpoint).
4. Co-authorship + citation requirements documented.
5. Quarterly anti-Galaxy synthesis published as a research artifact.

Small surface, big trust win.

---

### Step 8 — Adversarial models v1 graduation (DEC-005)

After 4-6 weeks of internal-only operation (started in Phase 5 Step 2), the challenger model has its first 100 settled picks of independent track record. If anti-Galaxy meets the criteria, public surface flips on.

**Decision required:** DEC-OPEN-F (anti-Galaxy public surface activation timing). Owner approves the flip in `docs/ops/decision-log.md` after reviewing the 100-pick track record.

---

## Verification gate for Phase 5 → Phase 6+

Phase 5 is "done" when:

1. All 8 deliverables shipped and merged.
2. Production deploy green.
3. Smoke test passes.
4. DSL has at least 50 saved queries from at least 20 distinct users.
5. Anti-Galaxy worker has been running for 4+ weeks with at least 200 settled anti-picks.
6. Cross-sport correlation engine has shipped at least 20 community queries.
7. Live war room has aired at least 4 episodes.
8. B2B API has at least 3 paying customers (commercial measure).
9. Trust + compliance toolkit has at least 1 paying licensee (commercial measure).
10. Researcher Program has at least 2 active researchers with citation agreements.
11. Brand-safety scan against production HTML returns zero hits.
12. Retrospective note added to `docs/ops/decision-log.md`.

When all 12 are true, Phase 6+ planning fires per master plan Part 5 closing section.

---

## Technical conventions to honor

Same as Phases 3-4 plus:

- **WebSocket exception** for war room — must be logged in `docs/ops/decision-log.md` before the gateway lands.
- **Sandbox isolation** for the DSL — all 6 hard constraints enforced or PR rejected.
- **Anti-Galaxy isolation** — separate Prisma client OR strict access boundary. Worker MUST NOT touch production `Pick` table.
- **B2B compliance** — every API response + widget render runs through the compliance scanner.
- **No public EV/Kelly/win-rate leakage** through B2B surfaces — projections strip these for FREE/Pro/Enterprise tiers per the spec.

---

## What Phase 5 does NOT touch

- White-label engine licensing (Phase 6+).
- Multi-contributor House picks (Phase 6+).
- Full self-service paid API tier with key self-management (this is Phase 5 v0 — owner-issued keys; Phase 6+ adds self-service).
- Native mobile app (Phase 5 or 6 — Codex chooses based on bandwidth).
- WhatsApp Business API (Phase 6+).
- Local + Youth Sports expansion (Phase 6+).

---

## Open items Claude is tracking for Phase 5

- **OPEN-P5-A:** DSL execution-time ceiling — 5 seconds per spec. Tune if real queries demand more.
- **OPEN-P5-B:** Anti-Galaxy public surface activation timing — DEC-OPEN-F. Owner decision after 100-pick track record.
- **OPEN-P5-C:** Live war room broadcast cadence — Sundays during NFL season; mid-week for major events. Owner's call on scheduling.
- **OPEN-P5-D:** B2B API pricing tiers — DEC-OPEN-C. Owner decision before public launch.
- **OPEN-P5-E:** Trust toolkit pricing — DEC-OPEN-B. Owner decision before public launch.
- **OPEN-P5-F:** White-label vs co-branded for B2B widgets — DEC-OPEN-G (new). Owner decision.

---

## PR strategy

Phase 5 is large. Recommended PR splits, each tagged `@claude-review`:

1. **PR-5.1 — Anti-Galaxy worker + schema** (Step 2 part 1, internal only)
2. **PR-5.2 — DSL parser + sandbox** (Step 1 part 1)
3. **PR-5.3 — DSL save/share/star + community** (Step 1 part 2)
4. **PR-5.4 — DSL alerts** (Step 1 part 3)
5. **PR-5.5 — DSL docs page** (Step 1 part 4)
6. **PR-5.6 — Cross-sport correlation engine** (Step 3)
7. **PR-5.7 — War room WebSocket gateway + overlay** (Step 4 part 1, with decision-log entry for WS exception)
8. **PR-5.8 — War room scheduling + email + Discord integration** (Step 4 part 2)
9. **PR-5.9 — B2B API + key management** (Step 5 part 1)
10. **PR-5.10 — B2B widgets** (Step 5 part 2)
11. **PR-5.11 — Trust + compliance toolkit extraction** (Step 6)
12. **PR-5.12 — Researcher Program** (Step 7)
13. **PR-5.13 — Anti-Galaxy public surface flip** (Step 8, after DEC-OPEN-F)

Each PR description: what changed, what surfaces, what tests, screenshots, `@claude-review`.

---

*Brief authored by Claude. Codex executes. Questions → escalate to `docs/ops/stuck-queue.md`.*
