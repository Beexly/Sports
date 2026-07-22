/**
 * TEST-INTERNAL re-export of the raw SERVICE/SYSTEM actor constructors.
 *
 * Application code MUST NOT import from this module — use
 * `resolveServiceActor()` from ./actor, which enforces the principal
 * allowlist, verified credential context, and operation scopes.
 *
 * This module exists so tests can mint arbitrary (including deliberately
 * ungoverned) actors to prove the denial paths — e.g. that a SERVICE actor is
 * refused a HUMAN-only operation regardless of how it was minted. The
 * import-boundary guard (scripts/guardrails/actor-minting-boundary.mjs) fails
 * CI when any non-test module imports this file or the raw constructors.
 */
export { serviceActor, systemActor } from "./actor";
export type { ServiceActorParams, SystemActorParams } from "./actor";
