/**
 * Stable team-name → particle-filter-index mapping.
 *
 * WHY THIS IS ITS OWN MODULE, AND WHY IT IS APPEND-ONLY.
 * `TeamStrengthFilter` addresses teams by integer index into a fixed-size latent
 * state. The index is therefore an IDENTITY: slot 7's accumulated posterior *is*
 * whichever team was assigned slot 7. If a slot is ever reassigned, that team's
 * entire learned strength is silently transferred to a different team — the
 * filter keeps returning confident, well-formed, completely wrong probabilities,
 * with nothing in the output to indicate anything happened. There is no
 * downstream check that can catch it. So assignment here is append-only and
 * total: an index, once handed out, is never reused, never compacted, and never
 * reordered, even if the team stops appearing.
 *
 * That is also why a registry exists at all rather than, say, hashing the team
 * name modulo nTeams: a hash collides, and a collision is exactly the silent
 * identity-merge described above.
 *
 * CAPACITY IS REFUSED, NOT WRAPPED. When the registry is full, `assignTeamIndex`
 * returns `full` and the caller skips that team. Wrapping around would reuse a
 * slot; growing in place would require rebuilding the filter, which would
 * discard every observation it has absorbed. Both are worse than declining to
 * track one team, so the honest failure is the one implemented.
 *
 * Pure: no I/O. The caller persists `indexByTeam` alongside the filter snapshot
 * (they must travel together — a snapshot restored against a different registry
 * is the identity-merge bug by another route).
 */

/** Registry capacity used for a single league scope. */
export const DEFAULT_TEAM_CAPACITY = 128;

export interface TeamIndexRegistry {
  /** Which filter/league this registry addresses (e.g. "basketball_nba"). */
  readonly scope: string;
  /** Hard upper bound; must equal the filter's `nTeams`. */
  readonly capacity: number;
  /** team key → index. Append-only: entries are never removed or renumbered. */
  readonly indexByTeam: Readonly<Record<string, number>>;
}

export type AssignTeamIndexResult =
  | { readonly ok: true; readonly registry: TeamIndexRegistry; readonly index: number; readonly created: boolean }
  | { readonly ok: false; readonly reason: "full" | "invalid-key" };

export function createTeamIndexRegistry(
  scope: string,
  capacity: number = DEFAULT_TEAM_CAPACITY,
): TeamIndexRegistry {
  if (!Number.isInteger(capacity) || capacity < 2) {
    throw new RangeError(`createTeamIndexRegistry: capacity must be an integer >= 2, got ${capacity}`);
  }
  return { scope, capacity, indexByTeam: {} };
}

/**
 * Normalised lookup key. Team names arrive from several providers (ESPN, The
 * Odds API, Rundown) with inconsistent casing and padding; without
 * normalisation "Boston Celtics" and "boston celtics " would occupy two slots
 * and split one team's history across them, halving the evidence behind both.
 * Deliberately conservative — case and surrounding/collapsed whitespace only. It
 * does NOT try to reconcile genuinely different strings ("LA Lakers" vs "Los
 * Angeles Lakers"); that is a real alias problem which must be solved with a
 * real alias table, not guessed at here.
 */
export function normalizeTeamKey(team: string): string {
  return team.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Look up `team`, assigning the next free index if it is new. Returns a NEW
 * registry (immutable); the caller must persist it or the assignment is lost —
 * and an assignment that reached the filter but not storage would be handed to a
 * different team on the next run.
 */
export function assignTeamIndex(registry: TeamIndexRegistry, team: string): AssignTeamIndexResult {
  const key = normalizeTeamKey(team);
  if (key.length === 0) return { ok: false, reason: "invalid-key" };

  const existing = registry.indexByTeam[key];
  if (existing !== undefined) {
    return { ok: true, registry, index: existing, created: false };
  }

  // Next index is the COUNT of assigned teams: append-only means indices are
  // exactly 0..n-1 with no holes, so the count is always the next free slot.
  const index = Object.keys(registry.indexByTeam).length;
  if (index >= registry.capacity) return { ok: false, reason: "full" };

  return {
    ok: true,
    registry: {
      scope: registry.scope,
      capacity: registry.capacity,
      indexByTeam: { ...registry.indexByTeam, [key]: index },
    },
    index,
    created: true,
  };
}

/** Read-only lookup; null when the team has never been assigned. */
export function lookupTeamIndex(registry: TeamIndexRegistry, team: string): number | null {
  const index = registry.indexByTeam[normalizeTeamKey(team)];
  return index === undefined ? null : index;
}

export function teamCount(registry: TeamIndexRegistry): number {
  return Object.keys(registry.indexByTeam).length;
}

/**
 * Validate a registry deserialized from storage. Rejects the shapes that would
 * cause a silent identity merge: duplicate indices (two teams sharing a slot),
 * out-of-range indices, and holes (which would make the next assignment collide
 * with an existing team, since assignment derives the next slot from the count).
 */
export function isValidTeamIndexRegistry(value: unknown): value is TeamIndexRegistry {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Partial<TeamIndexRegistry>;
  if (typeof candidate.scope !== "string") return false;
  if (!Number.isInteger(candidate.capacity) || (candidate.capacity as number) < 2) return false;
  if (candidate.indexByTeam === null || typeof candidate.indexByTeam !== "object") return false;

  const indices = Object.values(candidate.indexByTeam as Record<string, unknown>);
  const seen = new Set<number>();
  for (const index of indices) {
    if (!Number.isInteger(index)) return false;
    const n = index as number;
    if (n < 0 || n >= (candidate.capacity as number)) return false;
    if (seen.has(n)) return false; // two teams in one slot
    seen.add(n);
  }
  // Contiguity: indices must be exactly 0..count-1.
  for (let i = 0; i < indices.length; i++) {
    if (!seen.has(i)) return false;
  }
  return true;
}
