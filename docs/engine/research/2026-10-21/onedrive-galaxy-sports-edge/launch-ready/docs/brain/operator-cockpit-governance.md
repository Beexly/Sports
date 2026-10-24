# Sports OS — Operator Cockpit Governance

**Status**: Doctrine only. Implementation requires approved change proposal.
**Source**: Prompt 1 §3.4 · Component 10
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**: `docs/adr/public-cockpit-boundary-and-gate-integrity-contract.md`

---

## Purpose

The Operator Cockpit is Sports OS's internal mission control. It surfaces
the full state of the intelligence pipeline to operators — what is known,
what is stale, what is contradicted, what requires review, and what should
not be published.

The cockpit is the operator's workspace. It is not a public product. No
cockpit surface may be made public without owner approval and completion
of the full component dependency chain.

---

## What the Cockpit Answers for Operators

The cockpit must answer the following questions at a glance:

| Question | Panel responsible |
|---|---|
| What does the Brain know right now? | Brain Answer Panel |
| What data is stale and needs refresh? | Source Health Panel |
| What changed since last check? | Signal Activity Feed |
| What is currently contradicted? | Contradiction Alert Panel |
| What is rumor only (unverified)? | Rumor Radar Panel |
| What has been verified (Tier 1–2)? | Evidence Review Panel |
| What is public-safe vs. cockpit-only? | Publication Gate Panel |
| What requires human review? | Review Queue Panel |
| What is bootstrap data vs. real data? | Data Status Banner |
| What is the canonical source for each entity? | Source Health Panel |
| What should be researched next? | Research Lab Queue |
| What should not be published? | Publication Gate Panel (withheld) |

---

## Current Cockpit Panel Inventory

These panels are cockpit-internal. All require authentication.
See `docs/adr/public-cockpit-boundary-and-gate-integrity-contract.md`
for the full route list.

| Panel / Route | Description | Status |
|---|---|---|
| `/cockpit` | Cockpit home — summary dashboard | Existing |
| `/cockpit/sources` | Source health — freshness and reliability | Existing |
| `/cockpit/agent-runs` | Agent run history and observability | Existing |
| `/cockpit/market-twin` | Market gravity cockpit | Existing |
| `/cockpit/jarvis/trend` | Jarvis synthesizer trend view (lab) | Existing |
| `/cockpit/calibration` | Model calibration cockpit (lab) | Existing |
| `/cockpit/pick-memory` | Pick memory and history | Existing |
| `/cockpit/promo-desk` | Promotion desk — review and publish | Existing |
| `/cockpit/operator-registry` | Registered operator tools | Existing |
| Review Queue Panel | Pending — requires Evidence Vault | Blocked |
| Evidence Review Panel | Pending — requires Evidence Vault | Blocked |
| Contradiction Alert Panel | Pending — requires Evidence Vault | Blocked |
| Publication Gate Panel | Pending — requires Claim Governance | Blocked |
| Signal Activity Feed | Pending — requires Signal Ledger | Blocked |

---

## Operator Actions

Operators may perform the following actions in the cockpit:

**Permitted operator actions**:
- View any intelligence panel
- Queue a verification task for a Tier-5 signal
- Approve or reject a pick for publication
- Approve or reject a Brain answer for public release
- Override a model confidence score (with logged reason)
- Mark an evidence item as human-reviewed
- Retract a published claim
- Trigger a manual data refresh
- File a source quality note
- Assign a research brief to the lab queue

**Forbidden operator actions**:
- Publish a cockpit surface to a public URL
- Bypass the Evidence Vault or Signal Ledger gates
- Approve a claim whose evidence does not meet the minimum tier requirement
- Delete a Signal Ledger entry (append-only)
- Share cockpit URLs with non-operators
- Use cockpit data in public statements without going through the claim approval workflow

---

## Cockpit → Public Promotion Workflow

When an operator wants to make cockpit intelligence available on a public surface:

```
1. Intelligence item exists in cockpit (pick, Brain answer, or data insight)
2. Operator initiates publication review
3. Claim Governance workflow runs automatically:
   - Evidence link check
   - Source tier check
   - Contradiction check
   - Freshness check
   - Language check (public-copy scanner, brand-voice tests)
4. If all checks pass: item is placed in the publication queue
5. Human review step (if required by claim type)
6. Operator confirms publication
7. Item is published to the appropriate tier surface
8. Signal Ledger records publication event
```

No intelligence item bypasses this workflow. Direct cockpit-to-public
publication without the governance steps is forbidden.

---

## Data Status Classification

The cockpit must always display the data status of each panel.
Operators must be able to distinguish between:

| Status | Meaning |
|---|---|
| `LIVE` | Data retrieved within TTL from a Tier 1–2 source |
| `REFRESHING` | Data fetch in progress |
| `STALE` | Data has exceeded its TTL — last known value displayed |
| `BOOTSTRAP` | Placeholder or seed data — not real production data |
| `DEMO` | Demo data (dev/staging only — must never appear in production) |
| `ERROR` | Data source is unavailable |

`BOOTSTRAP` and `DEMO` status must never be hidden from operators.
Any pick or recommendation generated while data is in `STALE`, `BOOTSTRAP`,
or `DEMO` status must be explicitly flagged and must not be published.

---

## Gate Integrity Rules

These rules apply at all times and may not be overridden without owner approval:

1. **No cockpit route is public.** All cockpit routes require authentication.
2. **No cockpit URL may appear in a public API response.**
3. **No cockpit panel may be embedded in a public page.**
4. **Bootstrap/demo data must never reach a public surface.** The seed data
   detection gate (`readiness-gate-enforcement.test.ts`) must always pass.
5. **The 13 mandatory gate tests must always pass before any deployment.**
   See `docs/adr/public-cockpit-boundary-and-gate-integrity-contract.md`
   for the full list.
6. **Cockpit routes added without a change proposal are considered gate violations.**

---

## Mandatory Gate Tests

These tests enforce the cockpit boundary. They must pass on every commit
that touches any cockpit route, auth config, or public surface:

1. `public-copy-scanner.test.ts`
2. `public-copy-scan-strong.test.ts`
3. `trust-claims.test.ts`
4. `brand-voice-vocabulary.test.ts`
5. `no-fake-percentages.test.ts`
6. `readiness-gate-enforcement.test.ts`
7. `readiness-gates-contract.test.ts`
8. `public-performance-policy.test.ts`
9. `performance-gate.tsx`
10. `promotions-guards.test.ts`
11. `route-smoke.test.ts`
12. `admin-routes-gating.test.ts`
13. `cockpit-page-a11y.test.ts`

---

## Cockpit vs. Innovation Lab

The Innovation Lab (lab surfaces under `/cockpit/jarvis/`, `/cockpit/calibration/`,
`/cockpit/market-twin/`) is the sandbox for prototyping new intelligence
capabilities. Lab surfaces:

- Are cockpit-internal (authentication required)
- May have rougher UX than production cockpit panels
- May use incomplete or experimental models
- Must not be promoted to public surfaces without completing the standard
  component dependency chain and receiving owner approval

The cockpit is production-ready intelligence operations.
The lab is experimental intelligence development.
Neither is public.

---

## Cross-Reference

- ADR Cockpit Boundary: `docs/adr/public-cockpit-boundary-and-gate-integrity-contract.md`
- Claim Governance: `docs/brain/claim-governance.md` — publication gate
- Evidence Vault: `docs/brain/evidence-vault.md` — evidence panel data source
- Signal Ledger: `docs/brain/signal-ledger.md` — activity feed data source
- Ask the Brain: `docs/brain/ask-the-brain.md` — Brain answer review workflow
- Weak Signal Engine: `docs/brain/weak-signal-engine.md` — rumor radar input
- Research Lab: `docs/brain/research-lab.md` — lab queue integration
