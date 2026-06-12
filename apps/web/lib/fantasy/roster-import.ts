/**
 * Universal roster import — league sync "in some form" for EVERY platform.
 *
 * ESPN and Yahoo need OAuth apps we haven't registered; Sleeper is the
 * only live API sync. This closes the gap the honest way: the user
 * pastes their roster (one player per line, any platform's copy/paste
 * format) and we match names against the active player pool. Matched
 * players power lineup/trade/waiver tools exactly like a synced roster;
 * unmatched names are reported, never guessed.
 */

import type { Player } from "./players";

/** Client-safe copy of the qb-consensus normalizer (that module chains to
 *  server-only pbp loaders, which cannot enter a client bundle). */
export function normName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.'`]/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "")
    .replace(/[^a-z\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface RosterImportResult {
  readonly matched: readonly Player[];
  /** Lines we could not match — shown to the user, never silently dropped. */
  readonly unmatched: readonly string[];
  /** Lines that matched more than one pool player (matched on the best). */
  readonly ambiguous: readonly string[];
}

/** Strip platform noise: positions, teams, statuses, bullets, numbering. */
export function cleanRosterLine(line: string): string {
  return line
    .replace(/^\s*[\d#*•·\-–.]+\s*/, "") // bullets / numbering
    .replace(/\b(QB|RB|WR|TE|K|DST|DEF|D\/ST|FLEX|BN|IR|O|Q|D|P|SSPD)\b/gi, "")
    .replace(/\b[A-Z]{2,4}\s*[-–]\s*$/g, "") // trailing team codes
    .replace(/\(([^)]*)\)/g, "") // parentheticals (team, status)
    .replace(/[,|@].*$/, "") // anything after a comma/pipe/@ (matchup info)
    .replace(/[\s\-–—]+$/, "") // trailing dashes left by stripped suffixes
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Match pasted lines against the pool. Exact normalized-name matches win;
 * a unique "last name + first initial" match is accepted; everything else
 * is unmatched or ambiguous — honesty over guessing.
 */
export function importRoster(
  pasted: string,
  pool: readonly Player[]
): RosterImportResult {
  const byNorm = new Map<string, Player[]>();
  for (const p of pool) {
    const key = normName(p.name);
    const list = byNorm.get(key) ?? [];
    list.push(p);
    byNorm.set(key, list);
  }

  const matched: Player[] = [];
  const unmatched: string[] = [];
  const ambiguous: string[] = [];
  const seen = new Set<string>();

  for (const raw of pasted.split(/\r?\n/)) {
    const cleaned = cleanRosterLine(raw);
    if (cleaned.length < 2) continue;
    const key = normName(cleaned);

    let candidates = byNorm.get(key) ?? [];
    if (candidates.length === 0) {
      // Fallback: unique last-name + first-initial match.
      const parts = key.split(" ").filter(Boolean);
      const last = parts[parts.length - 1];
      const initial = parts[0]?.[0];
      if (last && initial) {
        candidates = pool.filter((p) => {
          const pn = normName(p.name).split(" ").filter(Boolean);
          return pn[pn.length - 1] === last && pn[0]?.[0] === initial;
        });
      }
    }

    if (candidates.length === 0) {
      unmatched.push(cleaned);
    } else {
      if (candidates.length > 1) ambiguous.push(cleaned);
      const best = candidates[0]!;
      if (!seen.has(best.id)) {
        seen.add(best.id);
        matched.push(best);
      }
    }
  }

  return { matched, unmatched, ambiguous };
}
