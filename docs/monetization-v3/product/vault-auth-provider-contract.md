# Vault Auth Provider Contract

**Status:** Engineering contract. Provider-neutral.
**Related decision:** DEC-NEXT-075

## DEC-NEXT-075 - Define Vault auth provider requirements before selection

**Decision:** Define the minimum auth/session requirements Vault must satisfy before any provider is selected or member routes unlock.

**Why now:** Auth is a P0 launch blocker. Choosing an auth provider only because it is convenient can create member-access, billing-linkage, support, and privacy problems later. This contract defines what the provider must support without choosing one tonight.

## Minimum Requirements

The chosen auth/session layer must support:

- stable user ID that can link to `vault_members.user_id`;
- verified email address;
- server-side session lookup inside Next.js route handlers;
- session invalidation after account closure or refund-driven access loss;
- admin identity separate from member identity;
- secure secret/session configuration represented by `AUTH_SECRET` or provider equivalent;
- no public exposure of member emails, Stripe IDs, or Discord IDs;
- compatibility with Vercel deployment and local development.

## Vault Access Contract

Member route access must be evaluated server-side:

1. resolve authenticated user;
2. load `VaultMember` by user ID;
3. evaluate `getVaultAccessState(member, now)`;
4. allow or deny route;
5. log denied member attempts only in private/admin telemetry.

Client-side checks can improve UX, but cannot be the source of truth.

## Admin Contract

Admin routes must require:

- authenticated Garrett/admin identity;
- explicit admin role or allowlist;
- no fallback to "any logged-in user";
- private response data only after authorization;
- audit event for sensitive admin repair actions.

The fail-closed [admin launch-readiness route](admin-launch-readiness-route-notes.md) remains closed until this exists.

## Provider Selection Questions

Before choosing a provider, answer:

1. How does this provider expose server-side session identity in route handlers?
2. How does the provider map an existing Stripe customer/user to an app user?
3. How are admin users represented?
4. How does account deletion interact with retained audit events?
5. What happens if provider auth is down during Vault office hours?
6. Can the provider be tested locally without production secrets?

## Rejection Criteria

Reject or pause a provider if:

- it requires unlocking member content client-side only;
- it cannot reliably link user ID to Stripe subscription state;
- admin authorization is awkward or bolted on;
- it pushes member data into public client payloads;
- local testing requires production credentials;
- it adds more operational complexity than it removes.

## Required Tests

Before launch:

- anonymous user cannot access member routes;
- non-Vault user cannot access member routes;
- active Vault member can access member routes;
- canceled-paid-through member can access member routes until paid term ends;
- refunded/expired member cannot access member routes;
- non-admin cannot access admin readiness route;
- admin can access admin readiness route after admin wiring exists.

## Still Unwired

- Provider selection.
- Session middleware or route helper.
- User-to-member database lookup.
- Admin role/allowlist.
- Local auth fixtures.

## Guardrail

This contract does not choose a provider, install SDKs, unlock routes, or alter pricing/checkout. It defines the bar any implementation must clear.
