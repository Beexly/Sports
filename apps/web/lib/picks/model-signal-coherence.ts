/**
 * One game, one story.
 *
 * A "model signal" pick is the free-spine fallback: when no two-way book price
 * can be formed for a market, the engine publishes an independent estimate and
 * says so in the selection text ("X ML (model signal)") and the reasoning
 * ("Model signal (no book line): independent sources ..."). Its defining fact
 * is `bookmakerCount === 0`.
 *
 * That claim is only true of a game we could not price. Measured on production
 * 2026-09-13T16:00Z, the signal slate had also written model-signal moneylines
 * onto games that ALREADY carried a live book-priced pick, and on two of them
 * it took the OTHER SIDE:
 *
 *   Chicago Bears @ Carolina Panthers
 *     SPREAD    "Chicago Bears -3.0"                 PREMIUM  conf 72  11 books
 *     MONEYLINE "Carolina Panthers ML (model signal)" FREE    conf 63   0 books
 *
 *   Baltimore Orioles @ Toronto Blue Jays
 *     SPREAD    "Toronto Blue Jays -1.5"              FREE    conf 58  11 books
 *     MONEYLINE "Baltimore Orioles ML (model signal)" FREE    conf 69   0 books
 *
 * A Pro subscriber saw the first pair together; a free visitor saw the second
 * pair together. Backing Chicago to cover -3 and backing Carolina to win are
 * opposite positions, and the site was selling both at once while the
 * model-signal row asserted "no book line" about a game it had eleven books
 * for. Two answers to one game is the failure this product exists to avoid.
 *
 * The rule here is the narrowest one that makes that impossible to display: a
 * model-signal row is dropped when the SAME viewer's slate already carries a
 * book-priced row for the SAME game. It is viewer-scoped on purpose — it
 * decides what one person is shown, so it cannot be defeated by a tier filter
 * running earlier in the query.
 *
 * What it deliberately does NOT do:
 *   - It never drops a book-priced pick, and never reorders or re-scores
 *     anything. The surviving set is a subset of what was already published.
 *   - It never touches a game whose ONLY pick is a model signal. Those are the
 *     honest case the free spine exists for and they stay exactly as they are.
 *   - It writes nothing. `isPublished` is unchanged, so a dropped row still
 *     settles and still counts in the public record. This suppresses a
 *     contradictory DISPLAY, it does not retract a pick.
 *
 * The real fix is upstream — the generator should not mint a model signal for
 * a game it can price — and that is recorded separately. This is the guard
 * that holds until it lands.
 */

/** The shape this rule needs. Callers may carry any other fields alongside. */
export type CoherenceRow = {
  readonly gameId: string;
  readonly bookmakerCount: number | null;
};

/** A row the engine published without any book behind it. */
export function isModelSignalRow(row: CoherenceRow): boolean {
  return (row.bookmakerCount ?? 0) <= 0;
}

/**
 * Drop model-signal rows for any game that also has a book-priced row in the
 * same set. Input order is preserved; callers rank afterwards.
 */
export function dropContradictedModelSignals<T extends CoherenceRow>(
  rows: readonly T[],
): T[] {
  const bookPricedGameIds = new Set<string>();
  for (const row of rows) {
    if (!isModelSignalRow(row)) bookPricedGameIds.add(row.gameId);
  }
  if (bookPricedGameIds.size === 0) return [...rows];
  return rows.filter(
    (row) => !(isModelSignalRow(row) && bookPricedGameIds.has(row.gameId)),
  );
}

/** How many rows the rule removed, for logging and the ops truth surface. */
export function countContradictedModelSignals(rows: readonly CoherenceRow[]): number {
  return rows.length - dropContradictedModelSignals(rows).length;
}
