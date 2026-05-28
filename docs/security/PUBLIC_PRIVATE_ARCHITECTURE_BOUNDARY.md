# Public / Private Architecture Boundary — Galaxy Sports Edge

This document defines the **three-layer architecture boundary** that
governs what may live where in the Galaxy system.

The principle is simple:

> The public layer is **sales**. The protected layer is **product**.
> The restricted layer is **secrets**.

Every file, surface, API response, and configuration value belongs to
exactly one layer. The protections compound: anything in a higher layer
must remain in that layer (or higher) for the lifetime of the asset.

## The three layers

### Layer 1 — Public

Anything the world can see by visiting `galaxysportsedge.com` or
inspecting Galaxy's open APIs.

**What lives here:**

- Marketing pages (homepage, about, pricing, FAQ)
- Methodology cluster (`/intelligence/*`, `/methodology`, `/picks/*`,
  `/market-gravity/*`, `/fantasy/*`, `/rumor-radar/*`, `/brain/*`)
- Decision-quality surface explanations (`/parlay-mri`, `/market-mirage`,
  `/roster-shock`, `/coaching-edge`, `/no-bet`, `/autopsy`, `/profile`)
- Sport landing pages (`/nfl`, `/nba`, `/mlb`)
- Public calibration report (output, not the calibration rules)
- Public ledger output (entries, not the ledger structure)
- Academy module summaries (curriculum-level)
- Doctrine library entries
- Brand assets (logo, color palette, typography names)
- Legal pages (terms, privacy, responsible-play)
- JSON-LD schema and meta tags
- SEO copy
- Published commits on `main` (public repo would expose these)

**What must never live here:**

- Any value listed in any other layer

**Public layer rule:** assume every visitor includes a competitor's
research team and an AI model crawling for training data. Write
accordingly.

---

### Layer 2 — Protected

Galaxy product machinery — the working system that turns inputs into
outputs. Visible to authenticated and authorized users, repo
collaborators, and operating infrastructure.

**What lives here:**

- Server-side scoring logic (`packages/prediction-engine/`)
- Factor weights, threshold curves, and publish-gate rules
- No-Bet classification thresholds (the taxonomy is public; the
  per-reason numerical triggers are not)
- Parlay MRI correlation matrix and verdict logic
- Market Mirage screening algorithm
- Roster Shock weighting
- Coaching Edge baselines
- Personal Briefing composition rules
- Autopsy grading rubric (the numeric derivation of A/B/C/D grades)
- Calibration recalibration triggers (the output is public; the trigger
  rules are not)
- Signal Ledger schema and write contracts
- Evidence Vault provenance rules (high-level rules are in ADR 003;
  edge-case classifications private)
- Source Mesh circuit-breaker thresholds and per-source reliability
  scores
- Admin / cockpit pages (`/cockpit/*` — gated server-side on ADMIN role)
- Prisma schema and migrations
- Internal API routes
- User session and entitlement enforcement
- Bootstrap-mode toggles and feature flags
- Test fixtures (when they reveal internal structure)
- ADRs in `docs/adr/` (technical architectural reasoning; usually safe
  to publish but treated as protected by default until intentionally
  released)

**Access controls:**

- Repo collaborators (today: founder only)
- Authenticated ADMIN sessions for cockpit
- Authenticated paid users for entitlement-gated content

**Protected layer rule:** anything that would let a competitor
re-implement a Galaxy feature must live at or above this layer. If a
value is in a client component, in a public API response, or in a
shipped JavaScript bundle, it is no longer protected — it is public.

---

### Layer 3 — Restricted

The most sensitive material. Founder-only access (today) and tightly
controlled access (in any future team).

**What lives here:**

- API keys: `THE_ODDS_API_KEY`, `ANTHROPIC_API_KEY`,
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXTAUTH_SECRET`,
  `GOOGLE_CLIENT_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `REDIS_URL`
- Database credentials (production and staging)
- Production environment secrets in totality
- User PII at rest (emails, OAuth identities)
- Payment data metadata (Stripe customer/subscription IDs)
- Production database contents (especially user records, tracker
  entries, profile responses)
- Production AI system prompts and prompt-chain configurations
- Production model evaluation rubrics
- Security logs and audit logs
- Business analytics and conversion data
- Vendor contracts and pricing
- M&A / fundraising materials
- Financial models and forecasts
- Personal data of founder, contractors, customers

**Access controls:**

- Founder only (current state)
- Future: per-role least privilege via dedicated secrets manager
- Never committed to repo
- Never pasted into any AI tool (per AI Tool Confidentiality Policy
  bucket C)
- Never shared in chat, Slack, Discord, email, screenshots, or
  in any non-encrypted channel

**Restricted layer rule:** if exposed, this material requires immediate
rotation, incident response, and potentially user notification.

---

## Boundary enforcement

### Code-level enforcement

| Boundary | Enforcement mechanism |
|---|---|
| Layer 1 / 2 | Trust gate (`scripts/guardrails/trust-gate.mjs`); no-fake-percentages test; no proprietary thresholds in client components; reviewer judgment on public copy |
| Layer 2 / 3 | `.gitignore` for env files; no secrets in source; GitHub secret scanning |
| Server vs client | React Server Components by default; `"use client"` only where required; sensitive imports must remain server-only |
| Public vs admin | `session.user.role !== "ADMIN"` gate in `app/cockpit/layout.tsx`; `app/admin/layout.tsx`; `robots: { index: false }` on cockpit metadata |

### Architectural enforcement

- API responses return outputs, not formulas
  - User sees: `confidence: 78`
  - User does not see: `confidenceFactors: [{name: "x", weight: 0.34}, ...]`
- Public pages may describe what Galaxy does, never how it does it numerically
- Per-pick factor trails (which factors contributed) may be public;
  per-factor exact weights and combination rules are not
- Educational pages may use illustrative numbers (e.g., "roughly
  thirteen-percent expected loss against fair pricing") explicitly
  labeled as illustrative, never as actual model outputs

### Operational enforcement

- Bootstrap mode active when production data unavailable; UI labels
  preview data clearly
- Feature flags for any in-progress feature; default off
- No production data in development environments
- Cockpit `robots: { index: false }` prevents accidental indexing
- AI tool usage governed by `AI_TOOL_CONFIDENTIALITY_POLICY.md`

---

## Cross-cutting rules

### "Secret-safe explainability"

Users need trust. Competitors must not get the recipe. The product
shows the **why** in user-readable terms without exposing the **how**
in machine-readable terms.

Acceptable user-facing explanation:

> Galaxy downgraded this parlay because multiple legs depend on the
> same game script, the price has moved against the user, and one leg
> is exposed to injury uncertainty.

Unacceptable to publish:

> correlation_score: 0.81 (threshold 0.65), priceShiftDelta: -3.2,
> injuryWeight: 0.42, verdict: "structurally weak"

The first is trust-building. The second is a competitor's roadmap.

### "Public doctrine vs private methodology"

Public doctrine is the **what** Galaxy believes:

- "Process matters more than outcome over a small sample."
- "Parlays with correlated legs are mispriced."
- "Lineup announcements create a timing window."
- "Coaching tendencies are the most stable signal in a variable game."

Private methodology is the **how** Galaxy implements:

- Exact correlation thresholds
- Exact timing-window scoring
- Exact per-factor weights
- Exact per-coach baselines
- Exact recalibration triggers

Publish the doctrine. Protect the methodology.

---

## Review and audit

- Each new file added to the repo should be implicitly classified
  during review: "what layer does this belong to?"
- Each new public page should be reviewed against this boundary
  before commit
- Quarterly audit against `COMPETITOR_LEAK_AUDIT.md`
- Pre-launch full sweep
- Post-incident review on any suspected boundary violation

## When in doubt

> If a competitor reading this would learn something they couldn't
> already infer from the public site, it belongs in a higher layer.

Default to **more protected**. Demoting from protected to public is
cheap. Promoting from public to protected, after exposure, is
sometimes impossible.
