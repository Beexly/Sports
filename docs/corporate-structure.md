# Corporate Structure

> Canonical reference for how the corporate entity and the consumer brand relate.
> Resolves the "GSE vs GSN" question. Salvaged from branch
> `galaxy-sports-corporate-structure-Cni9A` (see `docs/BRANCH_RECONCILIATION_2026-06-03.md`).

## The arrangement

**Galaxy Sports Network LLC** (a Texas limited liability company, filed May 22, 2026) is the corporate
parent. **Galaxy Sports Edge** is the flagship consumer product operated under that entity.

All user-facing branding stays "Galaxy Sports Edge." The LLC surfaces only where the legal entity
legitimately needs to appear:

| Surface | Uses |
|---|---|
| Footer copyright line | `© YYYY Galaxy Sports Network LLC. All rights reserved.` / "Galaxy Sports Edge is a product of Galaxy Sports Network" |
| Terms of Service | LLC named as operator, IP holder, and "we / us / our" reference |
| Privacy Policy | LLC named as data controller |
| About page | One-line corporate disclosure at the foot |
| Stripe payment processing entity | Galaxy Sports Network LLC |
| Trademark filings | Galaxy Sports Network LLC holds all marks (`Galaxy Sports Edge`, `Edge Index`, `Gate Cam`, `Galaxy IQ`, `Galaxy Studio`, future product names) |
| Sportsbook affiliate enrollments | Galaxy Sports Network LLC |
| White-label / B2B licensing | Galaxy Sports Network LLC |
| Hiring / vendor contracts | Galaxy Sports Network LLC |

Everywhere else — homepage, methodology, pricing, marketing copy, social, email digests, the domain —
stays **Galaxy Sports Edge**.

## Why

The consumer wedge is one product. The platform behind it will host multiple products over time —
Galaxy Studio, a Galaxy B2B API, future verticals. A parent entity gives those products a clean shared
home for IP, contracts, and licensing without restructuring later (mirrors the Meta Platforms / Anthropic
shape: corporate parent, distinct consumer products). Keep "Galaxy Sports Edge" as the brand users know;
route the legal entity (contracts, IP, payments, affiliates) through Galaxy Sports Network LLC.

## Implementation

`apps/web/lib/brand.ts` is the single source of truth. `PARENT_COMPANY` holds the legal-entity constants:

```ts
export const PARENT_COMPANY = {
  legalName: "Galaxy Sports Network LLC",
  shortName: "Galaxy Sports Network",
  jurisdiction: "Texas",
  relationship: "Galaxy Sports Edge is a product of Galaxy Sports Network LLC.",
  copyrightLine: (year: number) =>
    `© ${year} Galaxy Sports Network LLC. All rights reserved.`,
} as const;
```

Components import from there — never hard-code the LLC name in a template. If the corporate entity ever
changes (jurisdiction, name, restructure), every surface updates from this one constant.

## Texas operating note

Texas restricts traditional sports betting (DFS only, no licensed sportsbooks). Galaxy Sports Edge
operates as informational / research content, which is fine under Texas law. Sportsbook affiliate
enrollment requires per-program licensing review (DraftKings, FanDuel, BetMGM, Caesars all have
state-by-state operator licensing requirements that interact with the affiliate's home jurisdiction).
Flag for whoever runs that enrollment.

## Open commercial actions (owner-only)

These carry commercial or legal weight and remain with the product owner:

- **Trademark filings** via counsel — file `Galaxy Sports Edge`, `Edge Index`, `Gate Cam`, `Galaxy IQ`,
  `Galaxy Studio`, `Galaxy Sports Network` as marks held by Galaxy Sports Network LLC (one batch).
- **Domain registration audit** — confirm `galaxysportsedge.com` is registered to Galaxy Sports Network LLC;
  register `galaxysportsnetwork.com` as the corporate domain.
- **Stripe account entity check** — confirm the Stripe account beneficial owner is Galaxy Sports Network LLC,
  not an individual.
- **Sportsbook affiliate program enrollments** — per-program legal review against the Texas LLC jurisdiction.
