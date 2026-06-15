export interface PlayerIdentityCandidate {
  readonly playerId: string;
  readonly gsisId: string | null;
  readonly displayName: string;
  readonly birthDate?: string | null;
  readonly team?: string | null;
}

export interface PlayerIdentityResolution {
  readonly status: "MATCHED_BY_GSIS" | "AMBIGUOUS" | "NO_MATCH";
  readonly playerId: string | null;
  readonly reason: string;
}

export function normalizePlayerName(name: string): string {
  return name.toLowerCase().replace(/\b(jr|sr|ii|iii|iv)\.?\b/g, "").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function resolvePlayerByGsis(gsisId: string | null | undefined, candidates: readonly PlayerIdentityCandidate[]): PlayerIdentityResolution {
  if (!gsisId) return { status: "NO_MATCH", playerId: null, reason: "missing-gsis-id" };
  const matches = candidates.filter((candidate) => candidate.gsisId === gsisId);
  if (matches.length === 1) return { status: "MATCHED_BY_GSIS", playerId: matches[0]!.playerId, reason: "exact-gsis-match" };
  if (matches.length > 1) return { status: "AMBIGUOUS", playerId: null, reason: "duplicate-gsis-id" };
  return { status: "NO_MATCH", playerId: null, reason: "no-gsis-match" };
}

export function unsafeNameOnlyMergeAttempt(name: string, candidates: readonly PlayerIdentityCandidate[]): PlayerIdentityResolution {
  const normalized = normalizePlayerName(name);
  const nameMatches = candidates.filter((candidate) => normalizePlayerName(candidate.displayName) === normalized);
  if (nameMatches.length === 1) return { status: "AMBIGUOUS", playerId: null, reason: "name-only-match-requires-secondary-key" };
  if (nameMatches.length > 1) return { status: "AMBIGUOUS", playerId: null, reason: "multiple-name-matches" };
  return { status: "NO_MATCH", playerId: null, reason: "no-name-match" };
}
