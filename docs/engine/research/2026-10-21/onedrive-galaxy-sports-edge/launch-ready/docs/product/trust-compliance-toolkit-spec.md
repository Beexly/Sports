# Trust + Compliance Toolkit — Packaging Specification

**Status:** Phase 5 packaging. Internal tools built across Phases 2–4 get packaged as a sellable B2B layer.
**Owner of code:** Codex.
**Owner of buyer messaging + integration docs:** Claude.
**Location:** `packages/galaxy-compliance/` (extracted package), `apps/web/app/compliance-toolkit/` (marketing surface).
**Decision reference:** master plan Part 2.F.5, Part 6 DEC-018.

---

## TL;DR

The restraint posture is itself a product. Packaging Galaxy's claim scanner, promo guard, Loss Room, and evidence registry as a sellable layer turns the platform's compliance infrastructure into a fifth monetization stream.

Other operators need this. Galaxy already has it built. Phase 5 packages it without major new engineering — mostly extraction, documentation, and a separate purchase path.

---

## What's in the toolkit

Four products bundled or sold individually.

### 1. Claim Scanner

What it does: scans text for unsupported claims, banned vocabulary, accuracy-percentage claims, profit-guarantee language, certainty assertions.

Galaxy's internal use: the platform-wide compliance scanner Codex builds across Phases 2–4.

External use: third-party content shops, sportsbook affiliate writers, content moderators.

API:

```
POST /api/compliance/scan-claims
{
  "content": "string (markdown or plain text)",
  "context": {
    "platform": "newsletter" | "social" | "blog" | "ad_copy" | "promo",
    "subject": "sports_betting" | "fantasy" | "general"
  }
}

→ {
  "status": "green" | "yellow" | "red",
  "flags": [
    { "layer": 1, "severity": "block", "span": [12, 45], "message": "...", "suggestion": "..." },
    ...
  ],
  "publicReady": boolean
}
```

Pricing dimension: per-scan call.

### 2. Promo Guard

What it does: checks sportsbook promotional copy for regulatory compliance — required disclosures, opt-out language, jurisdiction-appropriate terms, banned promotional patterns.

Galaxy's internal use: the promotions guard chain in `apps/web/lib/promotions/guards.ts` plus the Operator Registry.

External use: sportsbook affiliate content arms, sportsbook in-house compliance teams, affiliate aggregators.

API:

```
POST /api/compliance/scan-promo
{
  "promoCopy": "string",
  "operator": "string (sportsbook name)",
  "jurisdictions": ["state codes"]
}

→ {
  "status": "approved" | "needs_review" | "blocked",
  "rulesFailed": [...],
  "rulesPassed": [...],
  "operatorRegistryFlags": [...]
}
```

Pricing dimension: per-promo or monthly subscription with volume tiers.

### 3. Loss Room (white-label)

What it does: provides a Loss Room surface that an operator can embed on their own site. Shows their settled losses with optional autopsy attachment.

Galaxy's internal use: the `/performance/losses` surface (Phase 2 build).

External use: operators who want to publish restraint as a brand signal — "we publish our losses" — without building the surface from scratch.

Deployment: embedded iframe or hosted at a subdomain (e.g. `losses.theiroperator.com` powered by Galaxy infrastructure).

Pricing dimension: monthly subscription, optionally with white-label setup fee.

### 4. Evidence Registry (data product)

What it does: a structured registry of evidence sources with trust scoring, freshness tracking, and conflict detection.

Galaxy's internal use: `SourceSnapshot` + the evidence-health computation in the Intelligence Graph.

External use: anyone making predictive claims needs an audit trail. The evidence registry is sellable as a generic claim-attribution system.

API:

```
POST /api/compliance/register-evidence
{
  "claim": "string",
  "sources": [
    { "kind": "url" | "report" | "data_feed", "url": "string", "observedAt": "ISO" }
  ]
}

→ {
  "registryEntryId": "string",
  "trustScore": "A" | "B" | "C" | "D" | "F",
  "conflicts": [...],
  "publicProofUrl": "string (link to the registry detail)"
}
```

Pricing dimension: per-claim registration.

---

## Bundling vs unbundling

The four products can be bought individually or as a bundle.

- **Individual:** monthly subscription per product.
- **Bundle:** discounted price for all four. Recommended for any operator considering more than one.
- **Enterprise:** all four + Galaxy's full Intelligence Graph access + custom SLA + account management.

Pricing tiers are owner-only per DEC-OPEN-B. Sketch ranges for planning:

- Individual Claim Scanner: $99-299/month.
- Individual Promo Guard: $199-499/month.
- Individual Loss Room white-label: $499-999/month.
- Individual Evidence Registry: $299-799/month.
- Bundle: $999-2499/month with all four.
- Enterprise: custom, target $5k-50k/month.

---

## Why this is a real product

These are not generic compliance tools. They are specifically calibrated for sports betting + adjacent prediction-market content. Generic content compliance tools (e.g. Grammarly Enterprise) don't catch sports-betting-specific banned patterns. Generic legal review services don't have the per-jurisdiction sportsbook promo knowledge.

The toolkit's value comes from sports-betting domain specificity. Galaxy already operates in this space; the rule sets are already calibrated against real content the platform produces.

---

## Buyer personas

### Persona A — Sportsbook affiliate content shop

- Produces 50-200 articles per month across multiple brands.
- Each article needs compliance review.
- Currently uses Grammarly + a human reviewer.
- Pain: human reviewer is the bottleneck. Bad reviews = legal exposure.
- Sells angle: "Catch unsupported claims before publish. Per-article cost falls."

### Persona B — Fantasy DFS operator

- Publishes content driving users to their main fantasy product.
- Has to maintain compliance with FTC + state regulations.
- Pain: content velocity is high; compliance is slow.
- Sales angle: "Compliance at the speed of content."

### Persona C — Sportsbook in-house affiliate / partnerships

- Manages promotional copy across many affiliate publisher partners.
- Has to ensure all published promos meet regulatory bar.
- Pain: catching non-compliant promo copy AFTER it publishes = fines.
- Sales angle: "Stop promos before they publish, not after."

### Persona D — Mid-tier capper service

- Wants to publish a Loss Room to signal restraint.
- Doesn't have engineering bandwidth.
- Sales angle: "White-label Loss Room. Restraint as a brand signal."

### Persona E — Prediction market / events platform

- Needs a claim-attribution layer for prediction integrity.
- Sales angle: "Audit trail per claim. Galaxy's evidence registry is your trust layer."

---

## Galaxy's own use as the demo

The strongest sales asset is Galaxy's own use of the tools. Sales conversations include:

- "See how Galaxy uses this internally" → walk the buyer through `/methodology` showing the claim scanner output references.
- "See how Galaxy publishes its losses" → walk through `/performance/losses`.
- "See how Galaxy registers its evidence" → walk through a Game Room's Evidence Timeline panel.

Galaxy is the case study.

---

## Risks

- **Risk: buyer might use the tools to compete with Galaxy.** Mitigation: the tools enforce compliance; they don't produce content or compete with Galaxy's consumer subscription. License terms forbid using the tools to build a competing "transparent betting prediction service."
- **Risk: regulatory landscape changes faster than the rule sets update.** Mitigation: rule sets are versioned; subscribers get updates within 30 days of regulatory changes; major changes trigger account-manager outreach for Enterprise tier.
- **Risk: false positives erode buyer trust.** Mitigation: yellow status (advisory) is the default for ambiguous cases; only red blocks publish; buyers can override with audit trail.

---

## Acceptance criteria (Phase 5 toolkit v0 → green)

1. `packages/galaxy-compliance/` extracted as a standalone package.
2. API endpoints documented at `/compliance-toolkit/docs`.
3. Marketing surface at `/compliance-toolkit` with pricing, demo videos, case study links.
4. Authentication + rate limiting + billing integration.
5. White-label Loss Room deployment automation.
6. Rule sets versioned with public changelog.
7. Buyer onboarding documentation.
8. At least 3 paying customers across the 5 personas (commercial measure, not engineering).

When 1-7 hold, the platform is shippable. #8 is the go-to-market gate.

---

## Open items

- **OPEN-TCT-1:** Should the toolkit operate on Galaxy's existing infrastructure or be hosted on isolated infrastructure for enterprise buyers? Default: shared infra in v0, isolated infra for Enterprise tier in v1. Codex confirms.
- **OPEN-TCT-2:** Pricing tiers — DEC-OPEN-B is unresolved. Defer to owner.
- **OPEN-TCT-3:** Should the rule sets be customer-customizable? Default: yes for Enterprise (custom banned-vocabulary lists, custom severity overrides). No for lower tiers — they get Galaxy's calibrated default set.
- **OPEN-TCT-4:** Should the toolkit be open-sourced eventually? Default: no — open-sourcing erodes the moat. Phase 6+ may publish the rule frameworks (without weights) per the methodology page model.

---

*Spec authored by Claude. Codex extracts package + builds API surface. Pricing decisions deferred to owner.*
