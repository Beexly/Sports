# ADR 005 — Claim Governance (PublicClaim schema + approval workflow)

**Date:** 2026-05-28
**Status:** Proposed (awaiting owner approval)
**Author:** Autonomous launch loop
**Related:** ADR 003 (Evidence Vault), ADR 004 (Signal Ledger),
`docs/brain/claim-governance.md`

## Context

Claim Governance is Component 12 of the Sports OS Intelligence Network
(`docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
§4.10). It is the gate between internal intelligence and public-facing
statements. Today there is no `PublicClaim` table and no enforced
approval workflow: claim-language safety is handled by static scanners
(`scripts/guardrails/trust-gate.mjs`, public-copy tests, brand-safety
tests) which only verify the *language* of committed source files. They
cannot verify:

- That every claim in production traces to a specific evidence item
- That the evidence's source tier meets the required minimum for the
  claim type (see table in `docs/brain/claim-governance.md`)
- That stale evidence does not back a live claim
- That a retracted claim is gone from the database in addition to the
  rendered DOM

This ADR proposes a `PublicClaim` model, the seven-step approval
workflow as code, and the first-consumer surface (the `/picks` page
rationale block). **No code is written until this is approved.**

## Decision (proposed)

Add one new Prisma model — `PublicClaim` — and one pure function —
`evaluateClaimApproval` — that runs the seven-step workflow over an
input shape and returns a typed verdict. Same pattern as
`evaluatePublicPerformancePolicy` (ADR 001):

- Pure (no I/O), exhaustively unit-testable
- Returns `verdict: APPROVED | DOWNGRADED | WITHHELD`
- Returns `blockers: string[]` and `primaryReason: string`
- Returns `publicMessage` (customer-safe) and `operatorMessage`
  (cockpit-precise)
- Returns `requiresHumanReview: boolean`

Every server component that renders a claim calls `getApprovedClaim()`
on a `claimId`. That loader runs the approval workflow against
current evidence and either returns the approved claim text or
returns a typed `null` with the reason. There is no path to render an
unapproved claim.

## Prisma model (PROPOSAL — not implemented)

```prisma
// packages/db/prisma/schema.prisma — proposed addition

model PublicClaim {
  id              String   @id @default(uuid())
  claimType       String   // "injury_status" | "line_movement" | "sharp_money" |
                           // "usage_trend" | "scheme_impact" | "performance_stat" |
                           // "win_rate" | "confidence_score" | "pick_rationale"
  claimText       String   // the literal text shown on a public surface
  outputId        String   // pickId, answerId, or null for standalone claims
  outputType      String?  // "pick" | "answer" | "standalone"
  evidenceIds     String[] // EvidenceItem IDs that back this claim
  minTierMet      Int      // lowest sourceTier across evidenceIds — denormalized for index
  requiredTier    Int      // per claim-type table
  humanReviewed   Boolean  @default(false)
  reviewedById    String?
  reviewedAt      DateTime?
  status          String   // "DRAFT" | "APPROVED" | "PUBLISHED" | "WITHHELD" | "RETRACTED"
  withheldReason  String?
  retractedAt     DateTime?
  retractedReason String?
  publishedAt     DateTime?
  surfacePath     String?  // route path where this claim was last rendered
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  reviewedBy      User?    @relation(fields: [reviewedById], references: [id])

  @@index([outputType, outputId])
  @@index([status, publishedAt])
  @@index([claimType, status])
}
```

## Workflow as code (pure function)

```ts
// PROPOSAL — apps/web/lib/claim-governance/evaluate-claim-approval.ts

evaluateClaimApproval({
  claimType,
  claimText,
  evidence,                // EvidenceItem[] linked to the claim
  modelSettledCountForType,// from Signal Ledger
  scannerVerdict,          // result of running public-copy scanner on claimText
}) → {
  verdict: "APPROVED" | "DOWNGRADED" | "WITHHELD",
  blockers: string[],
  primaryReason: string,
  publicMessage: string,
  operatorMessage: string,
  requiresHumanReview: boolean,
  approvedClaimText: string | null,
}
```

Seven steps, evaluated in order, short-circuit on first failure:

1. **Evidence linking.** `evidence.length === 0` → WITHHELD,
   `NO_EVIDENCE_LINKED`.
2. **Source-tier check.** `minTier(evidence) > requiredTier(claimType)`
   → either DOWNGRADED (with caveat) or WITHHELD per claim-type rules.
3. **Contradiction check.** Any evidence row with
   `contradictionStatus === "CONFLICTED"` → WITHHELD until human review.
4. **Freshness check.** Any evidence row with `validUntil < now()` →
   WITHHELD, `STALE_EVIDENCE`.
5. **Language scanner.** `scannerVerdict.banned.length > 0` → WITHHELD,
   `BANNED_LANGUAGE`. Existing trust-gate / brand-safety tests still
   run statically at CI; this is the runtime equivalent for dynamic
   claim text.
6. **Sample threshold (performance claims only).** If
   `claimType ∈ {performance_stat, win_rate}` and
   `modelSettledCountForType < 30` → WITHHELD,
   `INSUFFICIENT_SETTLED_SAMPLE`.
7. **Human review required.** Per the table in
   `docs/brain/claim-governance.md`, certain claim types always require
   review (sharp money, win rate, scheme impact, expected return) →
   `requiresHumanReview: true`. If unreviewed → DOWNGRADED with hold.

## Migration plan

1. ADR 003 (Evidence Vault) and ADR 004 (Signal Ledger) must both be
   Accepted first.
2. Create migration: `prisma migrate dev --name add_public_claim`.
3. Run `prisma generate`.
4. Land `apps/web/lib/claim-governance/evaluate-claim-approval.ts`
   with full Vitest coverage of the seven-step workflow.
5. Land `apps/web/lib/claim-governance/get-approved-claim.ts` —
   the database-touching loader that calls the pure function.
6. Wire the first consumer: the `/picks` page rationale block reads
   each pick's rationale via `getApprovedClaim()` instead of directly
   from `Pick.rationale`. If the loader returns null, the rationale
   block renders the typed reason (e.g. "Evidence under review").
7. Add a Signal Ledger event writer: every `getApprovedClaim()` call
   writes `public_claim_created` (on approval) or
   `public_claim_retracted` (on transition out of PUBLISHED).

## Rollback

1. Revert the `/picks` page rationale block to read `Pick.rationale`
   directly.
2. Drop the table: `DROP TABLE "PublicClaim" CASCADE`.
3. Roll back the migration: `prisma migrate resolve --rolled-back`.

`PublicClaim` is additive and only read by one new code path. Reverting
that one code path takes the system back to ADR 001's existing
guarantees (which are already strong because the static scanners
remain in place).

## First consumer surfaces

| Phase | Consumer | Claim type |
|---|---|---|
| MVP | `/picks` rationale block | `pick_rationale` |
| MVP | `/picks/:id` detail page | `pick_rationale`, `confidence_score` |
| Phase 2 | `/brain` answer surface | `answer_rationale` |
| Phase 2 | `/intelligence/calibration` | `performance_stat`, `win_rate` |
| Phase 3 | Homepage performance band | `win_rate` (only after 30-pick gate) |

## Passing gate

This ADR is implemented successfully when ALL of the following are true:

- `prisma migrate dev` runs green
- `evaluateClaimApproval` has 100% branch coverage in Vitest (every
  step, every short-circuit, every claim-type rule exercised)
- `/picks` page renders rationale only via `getApprovedClaim()` (no
  direct `Pick.rationale` reads in any page component)
- All pre-existing tests still green: 765/765 brand-safety, 42/42 smoke,
  guard:trust 0 hits
- A new test `claim-governance-no-bypass.test.ts` proves no page
  component reads `Pick.rationale` or `Answer.rationale` directly
- A new test `claim-governance-retraction.test.ts` proves that
  transitioning a claim to RETRACTED writes a ledger event and
  removes it from the public surface within one request cycle

## Out of scope (Phase 1)

- Real-time invalidation. If evidence becomes stale mid-request, the
  next request will catch it. Phase 1 does not implement a push
  invalidation channel.
- Automatic downgrade language generation. Phase 1 only marks claims
  as DOWNGRADED; the caveat text is hand-written per claim type. Phase
  2 can introduce a templated downgrade-text generator.
- Multilingual claims. Phase 1 is English-only.
- Per-tier visibility (showing different claim downgrades to Pro vs
  Elite). If added later, it lives inside the workflow function, not
  in the page.

## Dependencies on other ADRs

- **ADR 003 (Evidence Vault MVP)** — must be Accepted first.
  `evidenceIds` references real rows.
- **ADR 004 (Signal Ledger MVP)** — must be Accepted first. Approval
  and retraction both emit ledger events.
- **ADR 001 (Public Performance Policy)** — the win-rate-specific
  rules in this ADR are a strict superset of ADR 001's gate; ADR 001
  remains the authority for the readiness-gate boolean.

## Consequences

**Positive:**
- Every public claim has provable evidence in the database, not just
  in the rendered HTML.
- Retraction is a one-row update with a ledger entry, not a code
  deploy.
- Static scanner pass + runtime gate together close the gap between
  source-file safety and dynamic content safety.
- The 30-pick sample threshold (per `docs/brain/claim-governance.md`)
  is enforced in code, not in documentation.

**Negative:**
- One extra database call per rendered rationale. Acceptable; the
  `/picks` page already does multiple reads.
- A new code path that engineers must use for every new public claim.
  Documented in CONTRIBUTING.md as part of this rollout.

## Open questions for owner

1. Should the workflow function be in `apps/web/lib/` or in a new
   `packages/claim-governance/` workspace package? `apps/web/lib/`
   matches ADR 001's location; new package matches Signal Ledger's
   eventual home.
2. Should DOWNGRADED render a caveat string from a table, or render
   nothing at all and let the WITHHELD path handle it? Phase 1 prefers
   render-with-caveat to keep the surface useful.
3. Confirm the seven steps and short-circuit ordering match the
   doctrine in `docs/brain/claim-governance.md`.
