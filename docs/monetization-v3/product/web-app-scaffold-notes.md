# Web App Scaffold Notes

**Status:** Internal engineering scaffold.
**Created:** 2026-05-23
**Related decision:** DEC-NEXT-023

## What changed

Galaxy now has a minimal `apps/web` Next.js App Router scaffold for the public proof surfaces that carry the monetization plan:

- `/` - route index for proof surfaces.
- `/methodology` - static methodology scaffold with canonical anchors represented.
- `/loss-room` - static Loss Room table pattern and contextual Vault CTA.
- `/passes` - static Pass List table pattern and contextual Vault CTA.
- `/ledger` - static settlement-record table pattern and contextual Vault CTA.
- `/vault` - placeholder route for the canonical Vault page and future checkout flow.

The scaffold also includes:

- `ContextualVaultCta` - a feature-safe CTA pattern with source-aware Vault links.
- `ProofSurfaceEmailCapture` - a disabled static form shell for future Model Journal capture.
- Feature flag helpers for keeping monetization modules off until the implementation is wired.
- Root `package.json` scripts for `dev:web`, `build:web`, `typecheck:web`, and monetization validation.

## What this deliberately does not implement

- No Stripe Checkout sessions.
- No Discord role assignment.
- No transactional email sending.
- No member dashboard.
- No production deploy.
- No replacement for the canonical Vault landing copy governed by DEC-NEXT-003.

## DEC-NEXT-023 - Create a compileable proof-surface web scaffold before integration work

**Decision:** Add a minimal Next.js scaffold around Galaxy's proof surfaces before implementing paid Vault integrations.

**Rationale:** The docs now define the public surfaces clearly enough to create an implementation target. Building the static shell first lets morning engineering sequence Stripe, Discord, email, and gating work against real routes instead of abstract docs.

**Constraints:**

- Keep all paid-flow integrations unimplemented tonight.
- Keep proof-surface monetization modules feature-flagged.
- Do not deploy.
- Treat the content as scaffolding, not canonical replacement copy.

**Follow-up:** Wire Phase-N integration gaps from `product/engineering-issue-pack.md` once Garrett confirms the morning implementation sequence.
