# ADR 007 — User Compliance State

**Date:** 2026-08-13
**Status:** Proposed — no implementation (owner approves with counsel before build)
**Author:** Hermes continuous run (PHASE 1c, item 1 of 3)
**Scope:** durable per-user compliance facts only.

## Context

The informational compliance layer is real and good: `/responsible-play` (NCPG,
GamTalk, Gamblers Anonymous, the `HELPLINE` constant in `lib/brand`),
`/terms`, `/privacy`, all in the site-wide footer, plus
`lib/compliance-scanner/rules.ts` and the affiliate-separation and
partner-offer-compliance guards. The product *points at* help.

What is genuinely absent: **the product enforces nothing about the user's own
state.** There is no age attestation and no self-exclusion mechanism. A user
cannot tell this platform their age, and cannot ask this platform to shut them
out. Pointing outward is not the same as an internal gate.

Both missing mechanisms need to persist per-user state → `schema.prisma` →
**LAW 4 off-limits without an approved proposal.** This ADR is the proposal.
It builds mechanism only; it sets **no policy thresholds.**

> **THE LINE.** This ADR never specifies a minimum age, a permitted/restricted
> state list, a retention period, or any statutory claim. Every such value is an
> `OWNER+COUNSEL VALUE — placeholder`, left unset. A mechanism with the wrong
> threshold hardcoded is worse than none, because it *looks* compliant.

## Decision

Add two additive models. No existing model, column, or index modified. No data
migrated at write time. No policy value is set in this ADR — placeholders only.

### `UserCompliance`

One row per user, the durable compliance facts.

| Field | Type | Notes |
|---|---|---|
| `userId` | `String` `@id` | FK to the auth user id. Plain indexed column (not a Prisma relation to the auth model) to keep the change additive and avoid touching that model. |
| `ageAttestedAt` | `DateTime?` | set when the user affirms they meet the minimum age. null = not yet attested. |
| `termsVersionAttested` | `String?` | the `TERMS_VERSION` they attested against, so a terms change can re-prompt. |
| `selfExcludedAt` | `DateTime?` | set when a self-exclusion starts; null = not excluded. |
| `selfExclusionExpiresAt` | `DateTime?` | owner-configured duration from `selfExcludedAt`. null only if owner chooses indefinite. |
| `createdAt` / `updatedAt` | `DateTime` | |

### `SelfExclusionEvent`

Append-only log of self-exclusion requests — the audit trail that makes
"cannot be self-reversed" enforceable and reviewable.

| Field | Type | Notes |
|---|---|---|
| `id` | `String @id @default(cuid())` | |
| `userId` | `String` | indexed; not a hard relation (same reason as above). |
| `requestedAt` | `DateTime` | |
| `expiresAt` | `DateTime?` | the computed expiry. |
| `reversedAt` | `DateTime?` | **must remain null unless an owner action sets it.** A self-service reversal writes here and is rejected by the application gate (see Consequences). |
| `reversedBy` | `String?` | owner/admin id; never the user themselves. |

### Mechanism, not policy

- **Age attestation** is recorded by a checkbox at signup + a re-prompt when
  `TERMS_VERSION` changes. It stores *that the user affirmed*, not *their age*.
  **Attestation vs verification** is an explicit owner choice (below) — this ADR
  proposes the storage for both but picks neither.
- **Self-exclusion** creates a `SelfExclusionEvent` and sets
  `UserCompliance.selfExcludedAt` + `selfExclusionExpiresAt`. The application gate
  refuses access while `now < selfExclusionExpiresAt`. **Reversal requires an owner
  action**; any self-service reversal request is rejected by the gate and logged.

### Alternatives considered

**Age attestation**

1. *(Chosen, storage-only)* Record attestation (self-declared): `ageAttestedAt` +
   `termsVersionAttested`. Cheap, standard for *analysis* products, no PII. Does
   not satisfy jurisdictions that require verification.
2. Identity-document verification (what a sportsbook does): higher assurance but
   needs a vendor + PII handling + retention rules → **explicitly out of scope**
   of this ADR (see below).
3. No attestation, rely on footer links only: the current state. Rejected because
   it enforces nothing and the product thesis is honesty.

**Self-exclusion**

1. *(Chosen)* User-initiated, owner-duration, **irreversible by the user** via
   `SelfExclusionEvent.reversedAt` gated to owner actions. This is the mechanism
   with teeth; the duration value is the placeholder.
2. Self-reversible exclusion (user can undo anytime): rejected — a self-exclusion
   undone in a weak moment is theater. The point is the user *cannot* reverse it.
3. Hard account deletion instead of exclusion: rejected — deletion is
   irreversible and loses the audit trail; exclusion is the reversible-by-owner,
   data-preserving control.

### Blast radius

- Touches `CLAUDE.md` rules: #1 (no fake data — exclusion state is real, not
  cosmetic), #4 (no secrets in code — none added; placeholders only), #7 (types —
  strict, additive model). Does NOT touch paywall/auth enforcement internals — it
  adds a *parallel* gate the owner wires in per P1c-2.
- No public surface change beyond the signup attestation checkbox and a
  responsible-play "exclude me" control.
- No policy value hardcoded anywhere. Any threshold is `OWNER+COUNSEL VALUE`.

### Rollback

`DROP TABLE "SelfExclusionEvent"; DROP TABLE "UserCompliance";` — affects no other
object. The auth user model is untouched.

## Consequences

**Enables:** a real (if minimal) internal compliance gate; the signup/checkout/
session hooks P1c-2 maps; a defensible audit trail.

**Costs:** two additive tables, one migration (owner-run), Prisma client regen.

**Explicitly not in scope (separate owner+counsel decisions):**

- Identity verification (vendor, PII, retention) — alt 2 above.
- Geolocation / state-by-state permitted-region rules.
- Any specific minimum age, restricted-state list, or retention period.
- Anything requiring a third-party vendor.

## Safety

- Additive only; no `ALTER`/`DROP` on existing objects; no auth-model column.
- Every policy threshold is a `OWNER+COUNSEL VALUE — placeholder`. None set here.
- Self-exclusion reversal is owner-only; enforced in the application gate, not by
  trusting client input (the `SelfExclusionEvent.reversedAt` column is written
  solely by the owner path).
- Migration committed but **not applied** (agent holds no production `DATABASE_URL`).

## Operator step (not automated)

```bash
npm run db:generate
npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
```

After approval, the actual gating code is built per the integration-point map
(P1c-2) and the disclosure audit (P1c-3) — both read-only companion tasks in this
phase.

## Follow-ups

1. P1c-2: integration-point map (where each gate hooks in).
2. P1c-3: disclosure-consistency audit (risk copy across pages).
3. Build task (post-approval): write the gate that reads `UserCompliance` at
   session establishment and refuses access while excluded.
