/**
 * Pure duplicate-game detection + canonical selection + pick-conflict
 * reporting for scripts/ops/merge-duplicate-games.ts.
 *
 * Production evidence (Neon, 2026-09-02): the same real contest exists up to
 * three times in `games` under different feed ids — Odds API hash,
 * TheRundown hex, `espn:<sportKey>:<id>`, `espn:<short>:<id>` — each with its
 * own picks. `picks` carries @@unique([gameId, pickType]), so a duplicate row
 * cannot always be re-pointed onto the row kept as canonical without a unique
 * collision, and pick history must never be lost or mutated. This module is
 * the no-I/O planning layer: given already-loaded rows, it decides which rows
 * form a duplicate group, which member becomes canonical, and which pending
 * picks would collide — all deterministic and unit-testable without a
 * database. The DB-touching script (scripts/ops/merge-duplicate-games.ts)
 * loads the rows, calls `buildMergePlan`, and — only with `--execute` —
 * writes the plan.
 *
 * Team-pair matching deliberately reuses game-identity.ts's `matchTeamSide`
 * (and its embedded MIN_PREFIX_MATCH_LENGTH / AMBIGUOUS_CITY_TOKENS safety
 * rules) UNCHANGED — a bare "Los Angeles" never prefix-matches a full team
 * name here either, for exactly the same reason it doesn't at ingestion time:
 * MLB alone has two LA clubs, and guessing wrong would merge two different
 * real games. Weakening that guard to catch one more historical duplicate
 * would risk silently corrupting an unrelated one; this module fails closed
 * on the same cases game-identity.ts does; those rows stay un-grouped for a
 * human to resolve by hand rather than being auto-merged on a guess.
 */
import {
  commenceMatchMsFor,
  PREFIX_MATCH_SPORT_KEYS,
  matchTeamSide,
  preferLongerTeamName,
} from "@sports/ingestion-pipeline";

/** A `games` row plus the child-row counts canonical selection needs. */
export type MergeCandidateGame = {
  readonly id: string;
  readonly externalId: string;
  readonly sportId: string;
  /** Odds-API-style sport key (e.g. "baseball_mlb") — Sport.key, denormalized in by the caller. */
  readonly sportKey: string;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly commenceTime: Date;
  readonly createdAt: Date;
  readonly mergedIntoGameId: string | null;
  readonly pickCount: number;
  readonly oddsCount: number;
  readonly oddsLineSnapshotCount: number;
};

export type MergeGroup = {
  readonly sportKey: string;
  readonly members: readonly MergeCandidateGame[];
};

export type CanonicalSelection = {
  readonly canonical: MergeCandidateGame;
  readonly aliases: readonly MergeCandidateGame[];
  readonly resolvedHomeTeamName: string;
  readonly resolvedAwayTeamName: string;
};

export type PickSummary = {
  readonly id: string;
  readonly gameId: string;
  readonly pickType: string; // "SPREAD" | "MONEYLINE" | "TOTAL"
  readonly selection: string;
  readonly result: string; // PickResult, as a string
};

export type PickConflict = {
  readonly aliasGameId: string;
  readonly aliasExternalId: string;
  readonly aliasPickId: string;
  readonly canonicalPickId: string;
  readonly pickType: string;
  readonly aliasSelection: string;
  readonly canonicalSelection: string;
  /** True when both selections normalize to the same text (agreeing picks can still be a duplicate-pick problem, just not a SIDED conflict). */
  readonly sidesAgree: boolean;
};

export type MergePlanGroup = {
  readonly sportKey: string;
  readonly canonicalId: string;
  readonly canonicalExternalId: string;
  readonly resolvedHomeTeamName: string;
  readonly resolvedAwayTeamName: string;
  readonly aliasIds: readonly string[];
  readonly aliasExternalIds: readonly string[];
  readonly pickConflicts: readonly PickConflict[];
};

/**
 * A cluster union-find connected only by CHAINING across the sport window
 * (0h ↔ +1h45 ↔ +3h30: the last row is the second game of a doubleheader).
 * Its members span more than one contest's worth of time, so the tool refuses
 * to merge any of them and reports the cluster for a human to split.
 */
export type RefusedGroup = {
  readonly sportKey: string;
  readonly members: readonly MergeCandidateGame[];
  readonly spanMs: number;
  readonly windowMs: number;
  readonly reason: "span-exceeds-window";
};

export type MergePlanRefusedGroup = {
  readonly sportKey: string;
  readonly memberIds: readonly string[];
  readonly memberExternalIds: readonly string[];
  readonly spanMs: number;
  readonly windowMs: number;
  readonly reason: RefusedGroup["reason"];
};

export type MergePlan = {
  readonly generatedAt: string;
  readonly groupCount: number;
  readonly aliasCount: number;
  readonly conflictCount: number;
  readonly refusedGroupCount: number;
  readonly groups: readonly MergePlanGroup[];
  readonly refusedGroups: readonly MergePlanRefusedGroup[];
};

/** True for every externalId format odds ingestion does NOT write (see game-identity.ts header). */
function isEspnExternalId(externalId: string): boolean {
  return externalId.startsWith("espn:");
}

/**
 * Aligned-orientation-only pair match (never flipped — a flip means home/away
 * are swapped between the two rows, which would grade picks against a
 * swapped line if merged; same refusal as game-identity.ts's
 * resolveCanonicalGame for a flipped twin).
 */
function pairMatches(a: MergeCandidateGame, b: MergeCandidateGame): boolean {
  if (a.sportId !== b.sportId) return false;
  // Same window as ingestion identity (2h for baseball so a doubleheader is
  // never grouped as one contest; 18h otherwise).
  const delta = Math.abs(a.commenceTime.getTime() - b.commenceTime.getTime());
  if (delta > commenceMatchMsFor(a.sportKey)) return false;
  const allowPrefix = PREFIX_MATCH_SPORT_KEYS.has(a.sportKey);
  const home = matchTeamSide(a.homeTeamName, b.homeTeamName, allowPrefix);
  const away = matchTeamSide(a.awayTeamName, b.awayTeamName, allowPrefix);
  return home != null && away != null;
}

/**
 * Union-find duplicate detection over every NON-aliased row: same sportId,
 * commence within 18h, team pair aligned-matches (see pairMatches). A row
 * already aliased (`mergedIntoGameId` set) is excluded entirely — it is not
 * a duplicate-group MEMBER, it is settled history, so re-running after an
 * `--execute` finds nothing left to merge (idempotent).
 *
 * Transitive: connects THROUGH intermediate matches so a 3- or 4-way
 * duplicate (the real MLB/MLS/NFL/NCAAF pattern) becomes one group, not
 * several overlapping pairs. Singletons (no duplicate found) are dropped —
 * only groups of 2+ are duplicate groups.
 */
export function groupDuplicateGames(
  games: readonly MergeCandidateGame[],
): MergeGroup[] {
  return groupDuplicateGamesDetailed(games).groups;
}

/**
 * Same clustering, plus the clusters that were REFUSED: union-find is
 * transitive, so pairwise-in-window rows can chain a cluster whose total span
 * exceeds the sport window (a doubleheader bridged by a row in between). Such a
 * cluster describes more than one contest; merging any of it would attach one
 * game's picks and odds to another. It is dropped from `groups` and returned in
 * `refused` with its span so the dry-run plan shows it.
 */
export function groupDuplicateGamesDetailed(
  games: readonly MergeCandidateGame[],
): { groups: MergeGroup[]; refused: RefusedGroup[] } {
  const eligible = games.filter((g) => g.mergedIntoGameId == null);
  const parent = new Map<string, string>();
  for (const g of eligible) parent.set(g.id, g.id);

  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    // Path compression.
    let cur = id;
    while (parent.get(cur) !== root) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };
  const union = (a: string, b: string): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      if (pairMatches(eligible[i]!, eligible[j]!)) {
        union(eligible[i]!.id, eligible[j]!.id);
      }
    }
  }

  const clusters = new Map<string, MergeCandidateGame[]>();
  for (const g of eligible) {
    const root = find(g.id);
    const list = clusters.get(root);
    if (list) list.push(g);
    else clusters.set(root, [g]);
  }

  const groups: MergeGroup[] = [];
  const refused: RefusedGroup[] = [];
  for (const members of clusters.values()) {
    if (members.length < 2) continue;
    const sportKey = members[0]!.sportKey;
    const times = members.map((m) => m.commenceTime.getTime());
    const spanMs = Math.max(...times) - Math.min(...times);
    const windowMs = commenceMatchMsFor(sportKey);
    if (spanMs > windowMs) {
      refused.push({ sportKey, members, spanMs, windowMs, reason: "span-exceeds-window" });
      continue;
    }
    groups.push({ sportKey, members });
  }
  return { groups, refused };
}

/**
 * Canonical selection, in order (design spec — scripts/ops/merge-duplicate-games.ts):
 *  1. Most picks.
 *  2. Most child rows in odds + odds_line_snapshots.
 *  3. externalId is NOT an espn: id (Odds API / TheRundown ids are what odds
 *     ingestion writes to, so keeping THAT row keeps the odds pipeline
 *     writing to the same row it already writes to).
 *  4. Oldest createdAt.
 *
 * The resolved home/away team names take the longer (more specific) name
 * across every member — never just the winning row's own name — via
 * `preferLongerTeamName` (a TheRundown-city-only loser must not cost the
 * group its full team name).
 */
export function selectCanonical(
  members: readonly MergeCandidateGame[],
): CanonicalSelection {
  const sorted = [...members].sort((a, b) => {
    if (a.pickCount !== b.pickCount) return b.pickCount - a.pickCount;
    const aChildren = a.oddsCount + a.oddsLineSnapshotCount;
    const bChildren = b.oddsCount + b.oddsLineSnapshotCount;
    if (aChildren !== bChildren) return bChildren - aChildren;
    const aEspn = isEspnExternalId(a.externalId) ? 1 : 0;
    const bEspn = isEspnExternalId(b.externalId) ? 1 : 0;
    if (aEspn !== bEspn) return aEspn - bEspn; // non-ESPN (0) sorts first
    return a.createdAt.getTime() - b.createdAt.getTime(); // oldest first
  });

  const canonical = sorted[0]!;
  const aliases = sorted.slice(1);
  let resolvedHomeTeamName = canonical.homeTeamName;
  let resolvedAwayTeamName = canonical.awayTeamName;
  for (const alias of aliases) {
    resolvedHomeTeamName = preferLongerTeamName(resolvedHomeTeamName, alias.homeTeamName);
    resolvedAwayTeamName = preferLongerTeamName(resolvedAwayTeamName, alias.awayTeamName);
  }
  return { canonical, aliases, resolvedHomeTeamName, resolvedAwayTeamName };
}

function normalizeSelection(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Pending-pick conflicts (design spec): a PENDING pick on an alias row whose
 * pickType the canonical ALSO has a pick for. `picks` is never modified by
 * the merge script — this is a report only, for a human to resolve
 * separately. `sidesAgree` compares normalized `selection` text; false means
 * the two picks disagree on which side to take.
 */
export function findPickConflicts(
  canonical: MergeCandidateGame,
  aliases: readonly MergeCandidateGame[],
  picksByGameId: ReadonlyMap<string, readonly PickSummary[]>,
): PickConflict[] {
  const canonicalPicks = picksByGameId.get(canonical.id) ?? [];
  const conflicts: PickConflict[] = [];
  for (const alias of aliases) {
    const aliasPendingPicks = (picksByGameId.get(alias.id) ?? []).filter(
      (p) => p.result === "PENDING",
    );
    for (const aliasPick of aliasPendingPicks) {
      const canonicalPick = canonicalPicks.find((p) => p.pickType === aliasPick.pickType);
      if (!canonicalPick) continue;
      conflicts.push({
        aliasGameId: alias.id,
        aliasExternalId: alias.externalId,
        aliasPickId: aliasPick.id,
        canonicalPickId: canonicalPick.id,
        pickType: aliasPick.pickType,
        aliasSelection: aliasPick.selection,
        canonicalSelection: canonicalPick.selection,
        sidesAgree: normalizeSelection(aliasPick.selection) === normalizeSelection(canonicalPick.selection),
      });
    }
  }
  return conflicts;
}

/**
 * Orchestrates the three pure steps above into one JSON-able plan — exactly
 * what the script prints (dry run) and, with `--execute`, also writes to
 * scripts/ops/out/. No I/O: `games` and `picksByGameId` must already be
 * loaded by the caller.
 */
export function buildMergePlan(
  games: readonly MergeCandidateGame[],
  picksByGameId: ReadonlyMap<string, readonly PickSummary[]>,
  options: { readonly now?: Date } = {},
): MergePlan {
  const { groups: rawGroups, refused } = groupDuplicateGamesDetailed(games);
  const groups: MergePlanGroup[] = rawGroups.map((group) => {
    const { canonical, aliases, resolvedHomeTeamName, resolvedAwayTeamName } =
      selectCanonical(group.members);
    const pickConflicts = findPickConflicts(canonical, aliases, picksByGameId);
    return {
      sportKey: group.sportKey,
      canonicalId: canonical.id,
      canonicalExternalId: canonical.externalId,
      resolvedHomeTeamName,
      resolvedAwayTeamName,
      aliasIds: aliases.map((a) => a.id),
      aliasExternalIds: aliases.map((a) => a.externalId),
      pickConflicts,
    };
  });

  return {
    generatedAt: (options.now ?? new Date()).toISOString(),
    groupCount: groups.length,
    aliasCount: groups.reduce((sum, g) => sum + g.aliasIds.length, 0),
    conflictCount: groups.reduce((sum, g) => sum + g.pickConflicts.length, 0),
    refusedGroupCount: refused.length,
    groups,
    refusedGroups: refused.map((r) => ({
      sportKey: r.sportKey,
      memberIds: r.members.map((m) => m.id),
      memberExternalIds: r.members.map((m) => m.externalId),
      spanMs: r.spanMs,
      windowMs: r.windowMs,
      reason: r.reason,
    })),
  };
}
