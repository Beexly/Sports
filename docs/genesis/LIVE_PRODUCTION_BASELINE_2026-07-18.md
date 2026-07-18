# Galaxy Sports Edge — Live Production Baseline

**Evidence as of:** 2026-07-18 17:18 UTC  
**Target:** `https://www.galaxysportsedge.com`  
**Purpose:** establish an evidence-backed starting point for launch, revenue, monitoring, and gate convergence.  
**Boundary:** this is a point-in-time observation, not a permanent health claim and not authorization to change production.

## Executive finding

Galaxy Sports Edge is online and serving a functional public product, including proof surfaces, pricing, legal pages, navigation, fantasy tools, and the public sports-intelligence experience. The production deployment is `READY`, the canonical host responds, and the connected Vercel runtime-error query returned no errors for the preceding 24-hour window.

The production environment is **not yet converged with the active recovery and frontier branch**. Production is serving commit:

```text
0e56c4770e715630eaaac974702336447e367b5a
```

The large recovery program in draft PR `#129` is not part of that deployed commit. Therefore, code proven on PR #129 must not be described as production behavior until it enters an approved release candidate and is deployed.

## Verified live surface matrix

| Surface | Observed result | Interpretation |
|---|---|---|
| `/` | `200` | Public site is online and renders the current product shell. |
| `/llms.txt` | `200` | Machine-readable product/proof guidance is present. |
| `/api/proof/ledger` | `200`; `published:false`; reason reports `PUBLISH_LEDGER` is unset | Endpoint is healthy and fails honestly. Public ledger publication remains deliberately gated. |
| `/api/proof/receipts` | `200`; paginated receipts returned | Receipt surface is live. A sampled receipt leaf hash was independently recomputed and matched. |
| `/api/proof/verification-spec.json` | `200` | Known-answer verification material is available. |
| `/api/proof/openapi.json` | `200` | Proof API contract is publicly available. |
| `/robots.txt` | `200` | Robots policy is present and advertises sitemaps. |
| `/news-sitemap.xml` | `200`; empty URL set at observation time | Technically healthy, but publication intent must be confirmed. Empty may be correct when no eligible news URLs exist; it may also indicate an ingestion/publication gap. |
| `/pricing` | `200` | Free, Core, and Elite plans and checkout calls-to-action are publicly presented. |
| `/terms` | `200` | Terms are publicly presented, but current production copy conflicts with the pricing refund promise. |

## Confirmed production defects and truth gaps

### PROD-001 — Refund promise contradiction

The live pricing surface promises a **3-day money-back guarantee**. The live Terms page says refunds may be offered **at company discretion** within the checkout period.

These are materially different promises. The recovery branch records a fix under DEC-050, but that fix is not in the deployed production commit. Until production is updated, the revenue path contains a public legal/commercial inconsistency.

Required disposition:

```text
one canonical refund promise
→ pricing, checkout, FAQ, tier panels, Terms, support copy
→ exact source constant or contract
→ automated cross-surface test
→ production verification after deployment
```

### PROD-002 — Microsoft Clarity is configured with an undefined project identifier

The rendered production HTML attempts to initialize Clarity using the literal identifier `undefined`.

This creates false confidence in product analytics: the script is present, but meaningful Clarity data may not be collected.

Required disposition:

- provide a valid production identifier through the approved environment path; or
- intentionally omit the script when the identifier is absent;
- add a build/runtime test preventing `clarity.ms/tag/undefined`;
- verify an actual event/session reaches the intended analytics property.

### PROD-003 — Nightly Sentinel has zero unattended coverage

The scheduled GSE Nightly Sentinel report was blocked before running any check because every Claude `WebFetch` request required interactive provenance approval. The scheduled environment had no human approver, while its guardrails prohibited alternative fetch mechanisms.

This is a monitoring-architecture failure, not a site failure and not a clean bill of health.

Required disposition: replace the Claude-WebFetch dependency with a deterministic repo-native sentinel executed in an environment where outbound access to the canonical GSE host is explicitly allowed and narrowly scoped.

### PROD-004 — Paid-feature promise parity is not yet proven

The live pricing page includes promises such as real-time email/push alerts and premium feature access. The launch campaign must map every paid-plan sentence to:

- a canonical entitlement;
- a real implementation path;
- an end-to-end test;
- an operational dependency;
- an honest unavailable/degraded state;
- a production probe.

A plan card or test fixture is not proof that the paid feature operates in production.

### PROD-005 — Production code does not contain the current recovery program

The active recovery/frontier branch has accumulated correctness, proof, playback, SportsIR, fantasy, market-value, legal-copy, and reconciliation work that is not present in production.

This does not authorize a bulk merge. It establishes the need for a release-convergence campaign that converts the large branch into bounded, verified, dependency-ordered release slices.

## Honest gate interpretation

The launch objective is **not** to force every feature flag to `true`.

The correct terminal state is:

```text
all technically and legally eligible gates OPEN
all evidence-dependent gates either OPEN with proof or CLOSED_BY_DESIGN
all founder/external-service gates surfaced as OWNER_GATE with exact instructions
zero hidden blockers
zero unsupported paid promises
zero public claims whose evidence gate is bypassed
```

Examples:

- `PUBLISH_LEDGER` remains evidence-gated until the publication population, proof semantics, and public copy are approved.
- performance-stat publication remains evidence-gated until the required sample, calibration, population, and claim rules pass.
- Stripe live activation, production migrations, production secrets, and final production promotion remain owner-controlled operations.

## Launch implications

The site is running, but the launch/revenue campaign is not complete until all of the following are proven together:

1. current work and branch accounting are complete;
2. one release candidate owns each capability exactly once;
3. CI, preview, browser, accessibility, and security gates pass on that candidate;
4. pricing, legal, checkout, entitlement, cancellation, and refund behavior agree;
5. production monitoring is unattended and produces evidence;
6. production points to the approved release commit;
7. payment and entitlement flows are verified in test mode and then through an owner-approved live transaction;
8. every gate has an owner, prerequisite, current state, proof, rollback, and next action;
9. post-deploy observation confirms no material runtime, conversion, evidence, or data-freshness regression.

## Evidence limits

This baseline does not prove:

- that Stripe live credentials, price IDs, webhook delivery, tax/payout configuration, or customer-portal settings are correct;
- that every paid feature works for a real subscribed account;
- that production database migrations are fully converged;
- that every scheduled ingestion and settlement job is currently running;
- that every analytics event is arriving;
- that the empty news sitemap is intentional;
- that no application error exists outside the observed Vercel window;
- that PR #129 is safe to merge wholesale.

Those unknowns are converted into explicit launch gates in `LAUNCH_GATE_MATRIX.json` and workstreams in `LAUNCH_REVENUE_CONVERGENCE_CONTRACT.md`.
