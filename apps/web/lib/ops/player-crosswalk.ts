/**
 * Player-identity crosswalk — the join the scale table says does not exist.
 *
 * Measured 2026-09-30: NGS rows are keyed by gsisId while settled outcomes
 * use the internal playerId, and 0 of 380 distinct NGS gsisIds matched a
 * playerId — so four NGS keys carry weight 0 ("no join, no fit"). The schema
 * already declares the canonical key (`Player.gsisId`, "nflverse player_id /
 * gsis_id (canonical)"); what never existed was a single lookup every
 * producer/consumer calls, plus an honest report of where the join breaks.
 *
 * This module is that lookup. It is read-only and takes a minimal injected
 * DB interface so it stays unit-testable without a database.
 *
 * HONESTY RULE: a miss returns null — never a guessed id. A wrong playerId
 * joins one real player's signals to another real player's outcomes, which is
 * worse than no join. The health report exists so a sparse `players` table
 * shows up as a measured gap, not a silent zero.
 */

export interface CrosswalkDb {
  readonly player: {
    findUnique(args: {
      where: { gsisId: string } | { id: string };
      select: { id: true; gsisId: true; fullName: true };
    }): Promise<{ id: string; gsisId: string; fullName: string } | null>;
  };
}

export interface PlayerIdentity {
  readonly playerId: string;
  readonly gsisId: string;
  readonly fullName: string;
}

/**
 * gsisId (the key NGS/nflverse rows carry) → internal player identity.
 * Null when the `players` table has no row for the gsisId — the join gap,
 * not a default.
 */
export async function resolvePlayerByGsis(
  db: CrosswalkDb,
  gsisId: string,
): Promise<PlayerIdentity | null> {
  const needle = gsisId.trim();
  if (!needle) return null;
  const row = await db.player.findUnique({
    where: { gsisId: needle },
    select: { id: true, gsisId: true, fullName: true },
  });
  return row ? { playerId: row.id, gsisId: row.gsisId, fullName: row.fullName } : null;
}

/**
 * Internal playerId → gsisId (the key to join NGS rows onto).
 * Null when the player row does not exist — never a fabricated gsisId.
 */
export async function resolveGsisByPlayer(
  db: CrosswalkDb,
  playerId: string,
): Promise<PlayerIdentity | null> {
  const needle = playerId.trim();
  if (!needle) return null;
  const row = await db.player.findUnique({
    where: { id: needle },
    select: { id: true, gsisId: true, fullName: true },
  });
  return row ? { playerId: row.id, gsisId: row.gsisId, fullName: row.fullName } : null;
}

/**
 * Batch-resolve many gsisIds to internal playerIds.
 * Returns the hits; misses are listed separately so the caller can report
 * the join gap instead of silently dropping rows.
 */
export async function resolveManyGsis(
  db: CrosswalkDb,
  gsisIds: readonly string[],
): Promise<{ readonly hits: ReadonlyMap<string, PlayerIdentity>; readonly misses: readonly string[] }> {
  const hits = new Map<string, PlayerIdentity>();
  const misses: string[] = [];
  const seen = new Set<string>();
  for (const raw of gsisIds) {
    const gsisId = raw.trim();
    if (!gsisId || seen.has(gsisId)) continue;
    seen.add(gsisId);
    const hit = await resolvePlayerByGsis(db, gsisId);
    if (hit) hits.set(gsisId, hit);
    else misses.push(gsisId);
  }
  return { hits, misses };
}
