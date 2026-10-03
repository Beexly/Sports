/**
 * Pure line-movement computation from odds snapshots.
 *
 * WHY THIS EXISTS AS ITS OWN MODULE. `OddsLineSnapshot` rows carry
 * OPEN/INTERIM/CLOSE phases with capture timestamps — the raw material for
 * line-movement and steam detection. Nothing computed a forward
 * line-movement signal from them (the archive-freshness module assesses
 * coverage; settlement grades backward-looking CLV). This module turns the
 * snapshots into the observation the sharp-signal layer needs:
 *   open line → latest line, per game+market, consensus across books.
 *
 * CONVENTIONS:
 * - Consensus = median across books (robust to one stale outlier book).
 * - Open = earliest OPEN-phase snapshot; fall back to the earliest snapshot
 *   of any phase when no OPEN row exists (noted in the output).
 * - Latest = the most recent snapshot (CLOSE when the game settled, else the
 *   freshest INTERIM/OPEN — i.e. "where the line is now").
 * - Steam candidacy: |movement| >= 2.0 points on SPREAD/TOTAL. This is a
 *   conventional large-move flag, not a model verdict — it marks candidates
 *   for the sharp-signal layer, which is default-off until calibrated.
 * - Moneyline rows have null `line`; movement is undefined for them (price
 *   movement lives in a different unit and is not conflated here).
 */

export interface SnapshotLike {
  gameId: string;
  capturedAt: Date;
  phase: string;
  book: string;
  market: string;
  line: number | null;
}

export interface LineMovement {
  gameId: string;
  market: string;
  openLine: number;
  latestLine: number;
  movement: number; // latest − open, in points
  openBooks: number;
  latestBooks: number;
  openPhase: "OPEN" | "EARLIEST_AVAILABLE";
  latestCapturedAt: Date;
  steamCandidate: boolean;
}

export const STEAM_MOVE_POINTS = 2.0;

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

export function computeLineMovements(snapshots: readonly SnapshotLike[]): LineMovement[] {
  // Group by game+market, keeping only rows with a points line.
  const groups = new Map<string, SnapshotLike[]>();
  for (const s of snapshots) {
    if (s.line === null || !Number.isFinite(s.line)) continue;
    const key = `${s.gameId}::${s.market}`;
    const g = groups.get(key);
    if (g) g.push(s);
    else groups.set(key, [s]);
  }

  const out: LineMovement[] = [];
  for (const [, rows] of groups) {
    const openRows = rows.filter((r) => r.phase === "OPEN");
    const openPool = openRows.length > 0 ? openRows : rows;
    // Earliest capture per book, then median across books.
    const earliestByBook = new Map<string, SnapshotLike>();
    for (const r of openPool) {
      const cur = earliestByBook.get(r.book);
      if (!cur || r.capturedAt < cur.capturedAt) earliestByBook.set(r.book, r);
    }
    const latestByBook = new Map<string, SnapshotLike>();
    for (const r of rows) {
      const cur = latestByBook.get(r.book);
      if (!cur || r.capturedAt > cur.capturedAt) latestByBook.set(r.book, r);
    }
    const openLine = median([...earliestByBook.values()].map((r) => r.line as number));
    const latestLine = median([...latestByBook.values()].map((r) => r.line as number));
    if (openLine === null || latestLine === null) continue;

    const latestCapturedAt = [...latestByBook.values()].reduce(
      (max, r) => (r.capturedAt > max ? r.capturedAt : max),
      new Date(0),
    );
    const movement = latestLine - openLine;
    out.push({
      gameId: rows[0]!.gameId,
      market: rows[0]!.market,
      openLine: Number(openLine.toFixed(1)),
      latestLine: Number(latestLine.toFixed(1)),
      movement: Number(movement.toFixed(1)),
      openBooks: earliestByBook.size,
      latestBooks: latestByBook.size,
      openPhase: openRows.length > 0 ? "OPEN" : "EARLIEST_AVAILABLE",
      latestCapturedAt,
      steamCandidate: Math.abs(movement) >= STEAM_MOVE_POINTS,
    });
  }
  return out.sort((a, b) => Math.abs(b.movement) - Math.abs(a.movement));
}
