/**
 * Pick'em optimizer — rank-by-edge over the active pick'em lines (Wave4 #6).
 *
 * Reads every line through readProp() (vig-stripped edge e = p − q, best-alt
 * EV) and ranks priced edges first, then unpriced conviction. Never invents
 * lines: input comes from activePickemLines() (illustrative until a licensed
 * live provider is registered). Ranking is not a prediction.
 */

import { activePickemLines } from "../integrations/pickem";
import { readProp, type Prop, type PropRead } from "./props";

export type RankedPick = {
  readonly rank: number;
  readonly read: PropRead;
  /** sort key: priced edge first, then best-alt EV, then conviction */
  readonly sortKey: number;
};

export function rankPickem(props: readonly Prop[] = activePickemLines()): RankedPick[] {
  const rows = props.map((prop) => {
    const read = readProp(prop);
    const altEv = read.bestAlt?.ev ?? Number.NEGATIVE_INFINITY;
    const sortKey = (read.priced ? read.edge * 1000 : Number.NEGATIVE_INFINITY) + (Number.isFinite(altEv) ? altEv : -1000);
    return { read, sortKey };
  });
  const sorted = [...rows].sort(
    (a, b) => b.sortKey - a.sortKey || b.read.conviction - a.read.conviction,
  );
  return sorted.map((r, i) => ({ rank: i + 1, read: r.read, sortKey: r.sortKey }));
}
