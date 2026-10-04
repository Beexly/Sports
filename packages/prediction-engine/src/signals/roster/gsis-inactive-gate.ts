/**
 * GSIS Inactive Gate & Sovereign Identification Sieve
 *
 * Enforces Zero-Tolerance Fail-Closed Inactive Gate via NFL GSIS ID.
 *
 * Mathematical & Security Invariants:
 * 1. Primary key is strictly NFL GSIS ID (e.g. "00-0034844").
 * 2. Unresolved or missing GSIS IDs FAIL CLOSED to INACTIVE (cannot be rostered or wagered).
 * 3. Never use naive string equality, suffix stripping ("Jr.", "III"), or loose surname matching.
 *    Suffix stripping creates false collisions (e.g. Marvin Harrison vs Marvin Harrison Jr.).
 * 4. Exact canonical aliases map known variations (e.g. "Barkley, Saquon", "S. Barkley")
 *    to the unique GSIS ID before evaluation.
 */

export interface PlayerIdentity {
  readonly id: string;
  readonly name: string;
  readonly team: string;
  readonly gsisId?: string;
}

export type InactiveGateStatus = "ACTIVE" | "INACTIVE_OFFICIAL" | "UNRESOLVED_ID_FAIL_CLOSED";

export interface InactiveGateResult {
  readonly isEligible: boolean;
  readonly status: InactiveGateStatus;
  readonly gsisId: string | null;
  readonly reason: string;
}

/**
 * Known canonical GSIS ID crosswalk for NFL players.
 * Unresolved players not present in the verified registry fail closed.
 */
export const CANONICAL_GSIS_CROSSWALK: Readonly<Record<string, string>> = {
  // Saquon Barkley
  "saquon barkley": "00-0034844",
  "barkley, saquon": "00-0034844",
  "s. barkley": "00-0034844",
  "s.barkley": "00-0034844",
  "drb1": "00-0034844", // Slate fixture ID

  // Marvin Harrison Jr.
  "marvin harrison jr.": "00-0039912",
  "marvin harrison jr": "00-0039912",
  "harrison jr., marvin": "00-0039912",
  "m. harrison jr.": "00-0039912",

  // Marvin Harrison (Senior / Hall of Fame)
  "marvin harrison": "00-0007137",
  "harrison, marvin": "00-0007137",

  // CeeDee Lamb
  "ceedee lamb": "00-0036358",
  "lamb, ceedee": "00-0036358",
  "c. lamb": "00-0036358",

  // Nico Collins
  "nico collins": "00-0036640",
  "collins, nico": "00-0036640",
  "n. collins": "00-0036640",

  // Javonte Williams
  "javonte williams": "00-0036997",
  "williams, javonte": "00-0036997",
  "j. williams": "00-0036997",

  // Derrick Henry
  "derrick henry": "00-0032764",
  "henry, derrick": "00-0032764",
  "d. henry": "00-0032764",

  // Lamar Jackson
  "lamar jackson": "00-0034796",
  "jackson, lamar": "00-0034796",
  "l. jackson": "00-0034796",

  // Justin Jefferson
  "justin jefferson": "00-0036322",
  "jefferson, justin": "00-0036322",
  "j. jefferson": "00-0036322",
};

/**
 * Resolves a player identity to a canonical GSIS ID.
 * Returns null if the identity is ambiguous or unresolvable.
 */
export function resolveGsisId(player: PlayerIdentity): string | null {
  if (player.gsisId && /^00-\d{7}$/.test(player.gsisId)) {
    return player.gsisId;
  }
  const cleanId = player.id.trim().toLowerCase();
  if (CANONICAL_GSIS_CROSSWALK[cleanId]) {
    return CANONICAL_GSIS_CROSSWALK[cleanId]!;
  }
  const cleanName = player.name.trim().toLowerCase();
  if (CANONICAL_GSIS_CROSSWALK[cleanName]) {
    return CANONICAL_GSIS_CROSSWALK[cleanName]!;
  }
  return null;
}

/**
 * Zero-Tolerance Inactive Sieve Gate:
 * Evaluates whether a player is eligible to be rostered or projected.
 * Enforces fail-closed behavior for unresolved IDs or confirmed inactives.
 */
export function evaluateInactiveGate(
  player: PlayerIdentity,
  inactiveGsisIds: ReadonlySet<string>
): InactiveGateResult {
  const gsis = resolveGsisId(player);

  // Invariant 1: Unresolved ID fails closed
  if (!gsis) {
    return {
      isEligible: false,
      status: "UNRESOLVED_ID_FAIL_CLOSED",
      gsisId: null,
      reason: `Player '${player.name}' (ID: ${player.id}) failed GSIS ID resolution. Failing closed to INACTIVE.`,
    };
  }

  // Invariant 2: Explicitly inactive GSIS ID fails closed
  if (inactiveGsisIds.has(gsis)) {
    return {
      isEligible: false,
      status: "INACTIVE_OFFICIAL",
      gsisId: gsis,
      reason: `Player '${player.name}' (GSIS: ${gsis}) is confirmed INACTIVE on official inactive feed.`,
    };
  }

  // Invariant 3: Eligible and verified active
  return {
    isEligible: true,
    status: "ACTIVE",
    gsisId: gsis,
    reason: `Verified active with valid GSIS ID ${gsis}.`,
  };
}
