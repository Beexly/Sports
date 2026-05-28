# Trade Secret Inventory — Galaxy Sports Edge

This is the master register of trade secrets. Each entry identifies a
specific, economically valuable, non-public element of the Galaxy system,
its location, access controls, and protection posture.

The legal value of a trade secret depends on the owner taking **reasonable
measures** to keep it secret. This inventory is one of those measures.

## Schema

Each entry includes:

- **ID** — stable internal identifier
- **Name** — short label
- **Description** — what the asset is
- **Owner** — person or role responsible
- **Business value** — why this matters competitively
- **Location** — where it lives in the repo or stack
- **Access** — who can read it today
- **Client-side?** — does any part ship to the browser
- **Server-side?** — does the working logic execute server-side
- **Public docs?** — is this disclosed in public copy
- **Controls** — current protective measures
- **Risk level** — Low / Medium / High
- **Public disclosure ok?** — Yes / No / Partial
- **Patent candidate?** — Yes / No / Maybe
- **Trade-secret candidate?** — Yes / No / Maybe
- **Created** — date or commit
- **Last review** — date

---

## 1. PickPilot scoring architecture

- **ID:** TS-001
- **Name:** PickPilot ten-factor scoring engine
- **Description:** The deterministic scoring system that evaluates every
  candidate game across ten weighted factors and produces a 0–100 confidence
  score. Includes the factor list, individual weights, threshold curves,
  factor-interaction rules, and the publish gate.
- **Owner:** Founder
- **Business value:** Core to the product's deterministic posture. The
  factor list itself is described publicly. The weights, interaction rules,
  and thresholds are not.
- **Location:** `packages/prediction-engine/src/` (server-only)
- **Access:** Repo collaborators only
- **Client-side?** No
- **Server-side?** Yes
- **Public docs?** Partial — factor names are public; weights and thresholds
  are not
- **Controls:** Private repo, server-only execution, no factor weights in
  any client component or API response
- **Risk level:** High
- **Public disclosure ok?** No (only factor names)
- **Patent candidate?** Maybe
- **Trade-secret candidate?** Yes
- **Created:** Pre-existing
- **Last review:** 2026-05-28

## 2. No-Bet Engine criteria

- **ID:** TS-002
- **Name:** No-Bet classification rules
- **Description:** The taxonomy and decision tree Galaxy uses to mark a
  candidate game as "no-bet" rather than publishing a pick. Includes the
  reason codes, hard/soft severity classification, multi-factor failure
  rules, and the gating logic that prevents publication.
- **Owner:** Founder
- **Business value:** Discipline moat. The reason taxonomy is public
  (`apps/web/lib/signal-types.ts NO_BET_REASONS`). The actual numeric
  thresholds and the rule that decides which reason fires are not.
- **Location:** `apps/web/lib/signal-types.ts` (public taxonomy);
  scoring rules server-only
- **Access:** Repo collaborators only
- **Client-side?** Taxonomy only — never numeric thresholds
- **Server-side?** Yes
- **Public docs?** Partial — `/no-bet` page describes categories
- **Controls:** Numeric thresholds never ship to client; the page describes
  what each category means, not what triggers it
- **Risk level:** High
- **Public disclosure ok?** Partial (taxonomy yes, thresholds no)
- **Patent candidate?** Maybe
- **Trade-secret candidate?** Yes
- **Created:** Pre-existing
- **Last review:** 2026-05-28

## 3. Market Mirage detection methodology

- **ID:** TS-003
- **Name:** Market Mirage screening algorithm
- **Description:** The six mirage patterns Galaxy distinguishes from real
  market signal, plus the multi-book confirmation logic, velocity scoring,
  handle-vs-bet-count split analysis, and freshness gate that classify a
  movement as Real Signal / Noise / Ambiguous.
- **Owner:** Founder
- **Business value:** Differentiator vs Action Network / OddsJam style
  tools that show line moves without explaining quality.
- **Location:** `apps/web/lib/signal-types.ts MARKET_MIRAGE_REASONS`
  (public taxonomy); screening logic server-only
- **Access:** Repo collaborators only
- **Client-side?** Taxonomy only
- **Server-side?** Yes
- **Public docs?** Partial — `/market-mirage` describes patterns
- **Controls:** Pattern names public; screening implementation private
- **Risk level:** High
- **Public disclosure ok?** Partial
- **Patent candidate?** Maybe
- **Trade-secret candidate?** Yes
- **Created:** 2026-05-28 (TS surface live)
- **Last review:** 2026-05-28

## 4. Parlay MRI diagnostic logic

- **ID:** TS-004
- **Name:** Parlay correlation and EV-dilution scoring
- **Description:** The correlation matrix, EV-dilution math, structural
  weakness classifier, and the diagnostic that produces a
  "structurally weak / acceptable / strong" verdict on a multi-leg parlay.
- **Owner:** Founder
- **Business value:** Unique product. Existing tools rarely diagnose
  parlay structure beyond simple math.
- **Location:** Page copy: `apps/web/app/parlay-mri/page.tsx`;
  diagnostic engine to be implemented server-side
- **Access:** Repo collaborators only
- **Client-side?** No (page is conceptual; engine will be server-side)
- **Server-side?** Will be
- **Public docs?** Partial — `/parlay-mri` page explains the concept
- **Controls:** Diagnostic engine must never ship to client
- **Risk level:** High
- **Public disclosure ok?** Partial
- **Patent candidate?** Maybe
- **Trade-secret candidate?** Yes
- **Created:** 2026-05-28
- **Last review:** 2026-05-28

## 5. Roster Shock Index weighting

- **ID:** TS-005
- **Name:** Roster Shock impact scoring
- **Description:** Per-sport, per-position weighting of lineup changes
  against usage redistribution, pace effect, and market-depth timing.
- **Owner:** Founder
- **Business value:** Time-window-sensitive edge identification.
- **Location:** Page copy public; weighting server-only (to be built)
- **Access:** Repo collaborators only
- **Client-side?** No
- **Server-side?** Will be
- **Public docs?** Partial — `/roster-shock` describes categories
- **Controls:** Numeric weighting never client-facing
- **Risk level:** High
- **Public disclosure ok?** Partial
- **Patent candidate?** Maybe
- **Trade-secret candidate?** Yes
- **Created:** 2026-05-28
- **Last review:** 2026-05-28

## 6. Coaching Edge Model

- **ID:** TS-006
- **Name:** Coaching tendency model
- **Description:** Per-coach baseline derivation (pace, rotation depth,
  ATS discipline, fourth-quarter aggression, scheme vs. matchup), the
  factor-mix that adds coaching weight to a pick only when supported by
  schedule/rest, and the structural-misalignment screen.
- **Owner:** Founder
- **Business value:** Most stable signal in a variable game.
- **Location:** Page copy public; coaching baselines and weighting
  server-only
- **Access:** Repo collaborators only
- **Client-side?** No
- **Server-side?** Will be
- **Public docs?** Partial — `/coaching-edge` describes factors
- **Controls:** Baseline data and weights never client-facing
- **Risk level:** High
- **Public disclosure ok?** Partial
- **Patent candidate?** Maybe
- **Trade-secret candidate?** Yes
- **Created:** 2026-05-28
- **Last review:** 2026-05-28

## 7. Signal Ledger structure

- **ID:** TS-007
- **Name:** Append-only signal event ledger
- **Description:** The event schema, settlement mapping (win/loss/push/void →
  resultBinary), idempotency strategy, and replay logic that powers
  calibration and the public ledger.
- **Owner:** Founder
- **Business value:** Calibration honesty depends on this. Any tampering
  would invalidate the public win-rate claims.
- **Location:** `packages/db/`, `apps/web/lib/signal-ledger/`
- **Access:** Repo collaborators only
- **Client-side?** No
- **Server-side?** Yes
- **Public docs?** Partial — `/ledger` page describes the concept
- **Controls:** Append-only, server-side, no destructive operations exposed
- **Risk level:** High (integrity-critical)
- **Public disclosure ok?** Partial (concept yes, schema no)
- **Patent candidate?** No
- **Trade-secret candidate?** Yes
- **Created:** Pre-existing
- **Last review:** 2026-05-28

## 8. Post-Bet Autopsy grading rubric

- **ID:** TS-008
- **Name:** Four-dimensional autopsy grading
- **Description:** The rubric and per-dimension scoring rules for Process
  Grade, Signal Grade, CLV Result, and Outcome — plus the quadrant
  classifier (good process/bad outcome → variance, bad process/good outcome
  → danger, etc.) and the pattern-to-recommendation mapping.
- **Owner:** Founder
- **Business value:** Decision-quality moat. No existing product does this.
- **Location:** `apps/web/app/autopsy/page.tsx` (public framework);
  scoring rules server-only
- **Access:** Repo collaborators only
- **Client-side?** Framework only
- **Server-side?** Scoring will be
- **Public docs?** Partial — framework on `/autopsy`
- **Controls:** Numeric thresholds for process-grade derivation private
- **Risk level:** High
- **Public disclosure ok?** Partial
- **Patent candidate?** Maybe
- **Trade-secret candidate?** Yes
- **Created:** 2026-05-28
- **Last review:** 2026-05-28

## 9. Calibration methodology

- **ID:** TS-009
- **Name:** Confidence-band calibration system
- **Description:** The thirty-settled-pick gate, the per-confidence-band
  accuracy tracking, the recalibration trigger, and the per-model-version
  accuracy ledger.
- **Owner:** Founder
- **Business value:** Calibration is the truth claim. Tampering = fraud.
- **Location:** `apps/web/lib/calibration/`,
  `packages/prediction-engine/src/settlement.ts`
- **Access:** Repo collaborators only
- **Client-side?** Only the public report output
- **Server-side?** Yes
- **Public docs?** Partial — `/intelligence/calibration` describes the gate
- **Controls:** Recalibration trigger rules private; raw output public
- **Risk level:** High (integrity-critical)
- **Public disclosure ok?** Partial
- **Patent candidate?** No
- **Trade-secret candidate?** Yes
- **Created:** Pre-existing
- **Last review:** 2026-05-28

## 10. Betting Brain Profile scoring

- **ID:** TS-010
- **Name:** Bettor archetype derivation rules
- **Description:** The five-dimension self-assessment, the archetype
  classifier (Sharp & Disciplined / Situational Reader / Market Follower /
  Action-Driven), and the per-archetype surface-shaping rules (briefing
  framing, alert priority, exposure thresholds).
- **Owner:** Founder
- **Business value:** Personalization moat. The surfaces adapt to the user's
  declared profile.
- **Location:** `apps/web/app/profile/page.tsx` (public framework);
  shaping rules server-only (to be built)
- **Access:** Repo collaborators only
- **Client-side?** Framework only
- **Server-side?** Shaping rules will be
- **Public docs?** Partial — `/profile` describes dimensions and archetypes
- **Controls:** Per-archetype rule sets server-only
- **Risk level:** Medium
- **Public disclosure ok?** Partial
- **Patent candidate?** Maybe
- **Trade-secret candidate?** Yes
- **Created:** 2026-05-28
- **Last review:** 2026-05-28

## 11. Personal Briefing composition rules

- **ID:** TS-011
- **Name:** Daily briefing personalization engine
- **Description:** The rules that select the day's top pick, identify "what
  changed," "what matters," "what to ignore," and exposure flags, including
  the academy-module rotation logic.
- **Owner:** Founder
- **Business value:** Habit-loop anchor.
- **Location:** `apps/web/app/briefing/page.tsx`; selection logic
  server-side
- **Access:** Repo collaborators only
- **Client-side?** Output only
- **Server-side?** Yes
- **Public docs?** Concept only
- **Controls:** Selection rules private
- **Risk level:** Medium
- **Public disclosure ok?** Partial
- **Patent candidate?** Maybe
- **Trade-secret candidate?** Yes
- **Created:** 2026-05-28
- **Last review:** 2026-05-28

## 12. Evidence Vault provenance and public-safety rules

- **ID:** TS-012
- **Name:** Evidence Vault classification rules
- **Description:** The source-tier taxonomy, TTL rules per claim type,
  and the publicSafe gate (`publicSafe = true` iff sourceTier ∈ {1, 2}
  AND claimType ∉ {rumor, sharp_action}).
- **Owner:** Founder
- **Business value:** Compliance and credibility moat.
- **Location:** `apps/web/lib/evidence-vault/`, ADR 003
- **Access:** Repo collaborators only
- **Client-side?** Output classification visible
- **Server-side?** Yes
- **Public docs?** Yes (ADR 003 is in `docs/adr/`)
- **Controls:** Logic public for trust; thresholds and tier rules baseline
  documented
- **Risk level:** Medium
- **Public disclosure ok?** Yes (intentional transparency)
- **Patent candidate?** No
- **Trade-secret candidate?** Partial — taxonomy public, edge cases private
- **Created:** Pre-existing
- **Last review:** 2026-05-28

## 13. Source acquisition mesh and circuit-breaker rules

- **ID:** TS-013
- **Name:** Multi-source ingestion and reliability scoring
- **Description:** The circuit-breaker thresholds, per-source reliability
  scoring, fallback chains, and the rules that downgrade or quarantine an
  unreliable source.
- **Owner:** Founder
- **Business value:** Infrastructure resilience.
- **Location:** `apps/web/lib/source-mesh/`, ADR 007
- **Access:** Repo collaborators only
- **Client-side?** No
- **Server-side?** Yes
- **Public docs?** Partial — ADR 007
- **Controls:** Per-source thresholds private
- **Risk level:** Medium
- **Public disclosure ok?** Partial
- **Patent candidate?** No
- **Trade-secret candidate?** Yes
- **Created:** Pre-existing
- **Last review:** 2026-05-28

## 14. AI prompt chains and model instructions

- **ID:** TS-014
- **Name:** Claude prompt library and system instructions
- **Description:** Every system prompt, agent instruction, evaluation
  rubric, and prompt chain used to drive the Brain, content generator,
  and any user-facing AI surface.
- **Owner:** Founder
- **Business value:** A competitor with the prompts can clone the behavior.
- **Location:** TBD — currently in scattered code files; should be
  centralized in `apps/web/lib/prompts/` (server-only)
- **Access:** Repo collaborators only
- **Client-side?** Must never be
- **Server-side?** Yes
- **Public docs?** No
- **Controls:** Centralization pending; no system prompt should leak via
  API response, error message, or client component
- **Risk level:** High
- **Public disclosure ok?** No
- **Patent candidate?** No
- **Trade-secret candidate?** Yes
- **Created:** Ongoing
- **Last review:** 2026-05-28

## 15. Pricing experiments and conversion analytics

- **ID:** TS-015
- **Name:** Pricing, conversion, and retention models
- **Description:** Tier-pricing experiments, conversion funnels, cohort
  retention analysis, and the rules behind any future churn-prediction or
  upgrade-recommendation logic.
- **Owner:** Founder
- **Business value:** Commercial.
- **Location:** TBD — analytics pipeline not yet built
- **Access:** Founder only
- **Client-side?** No
- **Server-side?** Will be
- **Public docs?** No
- **Controls:** Analytics warehouse to be access-controlled
- **Risk level:** Medium
- **Public disclosure ok?** No
- **Patent candidate?** No
- **Trade-secret candidate?** Yes
- **Created:** N/A
- **Last review:** 2026-05-28

## 16. Internal admin / Cockpit workflows

- **ID:** TS-016
- **Name:** Cockpit operator workflows
- **Description:** Admin-only views and tools at `/cockpit/*` including
  Pick Engine performance, Calibration, Source Mesh health, Promo Desk,
  Studio, Journal authoring, and Promo registry.
- **Owner:** Founder
- **Business value:** Operational moat. Reveals how Galaxy is run.
- **Location:** `apps/web/app/cockpit/*`
- **Access:** Admin-only (`session.user.role !== "ADMIN"` gate)
- **Client-side?** Pages render in browser but only for ADMIN sessions
- **Server-side?** Auth gate is server-side
- **Public docs?** No
- **Controls:** Role gate in `apps/web/app/cockpit/layout.tsx`,
  `robots: { index: false }`
- **Risk level:** High
- **Public disclosure ok?** No
- **Patent candidate?** No
- **Trade-secret candidate?** Yes
- **Created:** Pre-existing
- **Last review:** 2026-05-28

---

## Review cadence

This inventory should be reviewed:

- Whenever a new product surface is added
- Whenever a contributor gains repo access
- Whenever a new data provider is integrated
- Quarterly, regardless of activity

## What this inventory is NOT

- Not a substitute for an attorney
- Not a substitute for executed NDAs and IP assignments
- Not a substitute for technical security controls
- Not a filing — it is an internal record
