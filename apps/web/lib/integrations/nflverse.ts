/**
 * nflverse roster-CSV identity join (Wave4 #11).
 *
 * Wave4 intel: the nflverse catalog API lists 136 assets but normalizes 0
 * bytes — the proven path is the roster CSV downloaded directly, joined on
 * normalized identity keys (GSIS / PFR / Sleeper / ESPN ids pass through when
 * present). This module is the pure join layer: key normalization + row
 * matching. No fetching here (caller supplies parsed CSV rows), so tests run
 * on fixtures and nothing depends on network.
 */

export type RosterRow = {
  readonly name: string;
  readonly team: string;
  readonly pos: string;
  readonly gsisId?: string | null;
  readonly pfrId?: string | null;
  readonly sleeperId?: string | null;
  readonly espnId?: string | null;
};

/** Normalize "Brian T. Cook Jr." variants → "brian cook" for join keys. */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "")
    .replace(/\b[a-z]\b/g, "")
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Stable identity key: normalized name + upper team + upper pos. */
export function rosterKey(name: string, team: string, pos: string): string {
  return `${normalizeName(name)}|${team.trim().toUpperCase()}|${pos.trim().toUpperCase()}`;
}

export type RosterMatch = {
  readonly key: string;
  readonly rows: readonly RosterRow[];
};

/** Index roster rows by identity key; collisions kept (never silently dropped). */
export function indexRoster(rows: readonly RosterRow[]): Map<string, RosterRow[]> {
  const idx = new Map<string, RosterRow[]>();
  for (const r of rows) {
    const k = rosterKey(r.name, r.team, r.pos);
    const hit = idx.get(k);
    if (hit) hit.push(r);
    else idx.set(k, [r]);
  }
  return idx;
}

/** Look up one identity; returns all colliding rows (usually exactly one). */
export function matchRoster(
  idx: Map<string, RosterRow[]>,
  name: string,
  team: string,
  pos: string,
): RosterMatch {
  const key = rosterKey(name, team, pos);
  return { key, rows: idx.get(key) ?? [] };
}
