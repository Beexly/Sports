/**
 * Airwave Ledger — redaction boundary.
 *
 * The single, enforced doorway from internal claims to anything a user can see.
 * `PublicPunditClaim` structurally omits `sourceClipRef`, so this mapping is the
 * only way to produce a public claim and a leaked clip pointer is a compile
 * error rather than a review miss. Verbatim quotes are never carried — the
 * `assertion` field is a paraphrase by contract.
 */

import type { PublicPunditClaim, PunditClaim } from "./types";

/** Project an internal claim to its public, clip-free shape. */
export function toPublicClaim(claim: PunditClaim): PublicPunditClaim {
  // Explicit field copy (not a spread) so new internal fields never auto-leak.
  return {
    id: claim.id,
    punditId: claim.punditId,
    airedAt: claim.airedAt,
    sport: claim.sport,
    subject: claim.subject,
    claimType: claim.claimType,
    direction: claim.direction,
    assertion: claim.assertion,
    confidence: claim.confidence,
    falsifiable: claim.falsifiable,
    verdict: claim.verdict,
    outcomeNote: claim.outcomeNote,
  };
}

/** Redact a whole ledger for public exposure. */
export function toPublicLedger(claims: readonly PunditClaim[]): PublicPunditClaim[] {
  return claims.map(toPublicClaim);
}
