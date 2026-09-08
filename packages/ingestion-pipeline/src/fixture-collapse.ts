/**
 * Collapse duplicate `games` rows to one row per real contest.
 *
 * Used by the signal slate's candidate list (C-169) and by the board's fallback
 * lanes (C-171). It is deliberately shared: both were showing or slating the
 * same contest more than once, for the same reason.
 *
 * WHY THIS EXISTS (C-166, measured on production 2026-09-08). The slate took
 * the next 80 game rows by kickoff and treated each as a fixture. It is not:
 * three writers key `games` on three different `externalId` shapes for the same
 * contest (game-identity.ts documents all four), so the table holds about 2.5
 * rows per real NFL fixture with ZERO of them tombstoned. Measured inside the
 * slate's own window: 744 rows over 658 real fixtures, the cap reached only 71
 * fixtures, and 9 of the 80 slots (11%) were spent on duplicate rows.
 *
 * That is a CAP APPLIED BEFORE THE COLLAPSE — the third instance of that exact
 * defect class found in one night, after the board's pass lane (C-153) and its
 * withdrawal watermark (C-161). The fix is the same one both of those took: let
 * the query bound rows SCANNED, collapse per fixture, and cap on FIXTURES.
 *
 * WHICH ROW SURVIVES is not a new rule. It is `selectCanonical`'s rule
 * (apps/web/lib/ops/game-merge-plan.ts), restated here because a package cannot
 * import from the app: most picks, then most odds children, then a non-ESPN
 * externalId, then oldest createdAt. Reusing it is the point rather than a
 * convenience — the slate then writes today's picks to the SAME row the merge
 * would later choose as survivor, so every pick it generates from now on is one
 * fewer pick for that merge to strand (C-163).
 *
 * A FLIPPED TWIN IS NOT COLLAPSED. `findTwinCandidate` matches a team pair
 * order-insensitively and reports orientation; two rows that disagree about who
 * is home disagree about the sign of every line derived from them. Collapsing
 * them would pick one orientation and grade against it. Same fail-closed rule
 * `resolveCanonicalGame` already applies: an ambiguity keeps today's behaviour
 * (both rows), never a guess.
 */

import { findTwinCandidate, type GameTwinCandidate } from "./game-identity.js";

/** The fields the collapse needs. A caller may carry any others alongside. */
export type FixtureCollapseRow = {
  readonly id: string;
  readonly externalId: string;
  readonly sportId: string;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly commenceTime: Date;
  readonly createdAt: Date;
  readonly mergedIntoGameId: string | null;
  /**
   * Sport key, when the caller selected it. It is not decoration: it chooses
   * the twin window (baseball gets 2h so a doubleheader is two contests, not
   * one) and whether city-prefix matching is allowed. A caller that omits it
   * gets the conservative 18h default and exact-name matching only, so a
   * BASEBALL caller must select it.
   */
  readonly sport?: { readonly key?: string | null } | null;
  /** Prisma relation counts; absent is treated as zero, never as "unknown". */
  readonly _count?: {
    readonly picks?: number;
    readonly odds?: number;
    readonly oddsLineSnapshots?: number;
  } | null;
};

function isEspnExternalId(externalId: string): boolean {
  return externalId.startsWith("espn:");
}

function childCount(row: FixtureCollapseRow): number {
  return (row._count?.odds ?? 0) + (row._count?.oddsLineSnapshots ?? 0);
}

/**
 * True when `candidate` should replace `held` as the surviving row.
 * Mirrors selectCanonical's comparator exactly; ties keep `held`, which makes
 * the result stable under the caller's kickoff ordering.
 */
export function isBetterFixtureCanonical(
  candidate: FixtureCollapseRow,
  held: FixtureCollapseRow,
): boolean {
  const candidatePicks = candidate._count?.picks ?? 0;
  const heldPicks = held._count?.picks ?? 0;
  if (candidatePicks !== heldPicks) return candidatePicks > heldPicks;

  const candidateChildren = childCount(candidate);
  const heldChildren = childCount(held);
  if (candidateChildren !== heldChildren) return candidateChildren > heldChildren;

  const candidateEspn = isEspnExternalId(candidate.externalId);
  const heldEspn = isEspnExternalId(held.externalId);
  if (candidateEspn !== heldEspn) return heldEspn; // non-ESPN wins

  return candidate.createdAt.getTime() < held.createdAt.getTime(); // oldest wins
}

function toTwinCandidate(row: FixtureCollapseRow): GameTwinCandidate {
  return {
    id: row.id,
    externalId: row.externalId,
    sportId: row.sportId,
    homeTeamName: row.homeTeamName,
    awayTeamName: row.awayTeamName,
    commenceTime: row.commenceTime,
    mergedIntoGameId: row.mergedIntoGameId,
  };
}

/**
 * One row per contest, in the input's order.
 *
 * The input order is preserved rather than re-sorted, deliberately: the caller
 * orders by kickoff and then slices a fixture cap off the front, so a re-sort
 * here would silently change WHICH fixtures make the slate.
 */
export function collapseGameRowsToFixtures<T extends FixtureCollapseRow>(rows: readonly T[]): T[] {
  const kept: T[] = [];
  const keptCandidates: GameTwinCandidate[] = [];

  for (const row of rows) {
    // A row this function cannot reason about is KEPT, never dropped and never
    // thrown on. Both callers are read paths whose catch returns an empty
    // board, so a TypeError here would blank a public surface rather than
    // surface itself - the collapse must not be able to do that.
    if (!(row.commenceTime instanceof Date) || !Number.isFinite(row.commenceTime.getTime())) {
      kept.push(row);
      continue;
    }

    const twin = findTwinCandidate(keptCandidates, {
      sportId: row.sportId,
      externalId: row.externalId,
      homeTeamName: row.homeTeamName,
      awayTeamName: row.awayTeamName,
      commenceTime: row.commenceTime,
      sportKey: row.sport?.key ?? undefined,
    });

    // C-194. A FLIPPED BEST MATCH MUST NOT MASK A SAME-ORIENTATION TWIN.
    //
    // findTwinCandidate returns the single best match, ranked partly by
    // kickoff proximity. When the table holds a flipped twin AND a
    // same-orientation duplicate, the flipped row can be the closer of the
    // two - so the refusal below fired and the real duplicate survived. The
    // observable result is the same fixture rendered twice, in the SAME
    // orientation, on a surface whose whole job is one row per contest.
    // Measured by property fuzz: rows at +0min (H/A), +5min (A/H flipped) and
    // +10min (H/A) collapsed to all three.
    //
    // Refusing to merge a flipped pair is still correct and unchanged - two
    // rows that disagree about who is home disagree about the sign of every
    // derived line. What is fixed is only the MASKING: retry against the
    // candidates that share this row's orientation before giving up. The
    // flipped row stays kept either way.
    // The retry fires on NULL too, not only on an explicit flipped verdict.
    // findTwinCandidate fails CLOSED when a probe matches more than one kept
    // candidate, and a fixture that has both a flipped row and a
    // same-orientation duplicate is exactly that ambiguity - so the masking
    // case arrives as `null`, not as `orientation: "flipped"`. Filtering to
    // this row's own orientation REMOVES the ambiguity rather than resolving
    // it by guess, which is what the fail-closed rule is protecting. If the
    // filtered list is still ambiguous, it still returns null and we still
    // keep the row.
    const orientedTwin =
      !twin || twin.orientation === "flipped"
        ? findTwinCandidate(
            keptCandidates.filter(
              (c) =>
                c.homeTeamName === row.homeTeamName && c.awayTeamName === row.awayTeamName,
            ),
            {
              sportId: row.sportId,
              externalId: row.externalId,
              homeTeamName: row.homeTeamName,
              awayTeamName: row.awayTeamName,
              commenceTime: row.commenceTime,
              sportKey: row.sport?.key ?? undefined,
            },
          )
        : twin;

    // No twin, or a twin we refuse to act on: keep the row. "flipped" is the
    // refusal — see the module doc.
    if (!orientedTwin || orientedTwin.orientation === "flipped") {
      kept.push(row);
      keptCandidates.push(toTwinCandidate(row));
      continue;
    }

    // C-194. `kept` and `keptCandidates` are NOT parallel arrays. The
    // unusable-commenceTime branch above pushes to `kept` and continues, so
    // from the first such row the two arrays are offset. Reusing a `kept`
    // index to write into `keptCandidates` therefore corrupted an unrelated
    // slot - or wrote past the end and left an `undefined` hole, which
    // findTwinCandidate then dereferenced (`for (const c of candidates)
    // byId.set(c.id, c)`), throwing TypeError. Both callers catch and return
    // an empty board, so the guard written to stop a throw from blanking a
    // public surface was itself the throw. Index each array by its own id.
    const index = kept.findIndex((k) => k.id === orientedTwin.candidate.id);
    const candidateIndex = keptCandidates.findIndex((c) => c.id === orientedTwin.candidate.id);
    if (index === -1) {
      // The twin resolved through an alias chain to a row we are not holding.
      // Nothing to compare against, so fail closed and keep this row.
      kept.push(row);
      keptCandidates.push(toTwinCandidate(row));
      continue;
    }

    if (isBetterFixtureCanonical(row, kept[index]!)) {
      kept[index] = row;
      // Alias resolution can return a candidate we no longer hold; skip rather
      // than append, which would reintroduce the desync this fixes.
      if (candidateIndex !== -1) {
        keptCandidates[candidateIndex] = toTwinCandidate(row);
      }
    }
  }

  return kept;
}
