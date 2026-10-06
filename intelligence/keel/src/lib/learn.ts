export type LaneYield = { pulls: number; admits: number; holds: number; rejects: number };

/** Prefer the lane that has been admitting work. Every third shift, explore in order so the watch cannot lock onto one shelf. */
export function nextLane(cursor: number, shiftsRun: number, yields: Record<string, LaneYield>, ids: readonly string[]) {
  const explore = shiftsRun > 0 && shiftsRun % 3 === 0;
  if (!explore) {
    let bestRate = 0;
    let bestIndex = -1;
    ids.forEach((id, index) => {
      const row = yields[id];
      if (!row || row.pulls < 1) return;
      const rate = row.admits / row.pulls;
      if (rate > bestRate) {
        bestRate = rate;
        bestIndex = index;
      }
    });
    if (bestIndex >= 0) return { index: bestIndex, mode: "exploit" as const };
  }
  return { index: cursor % ids.length, mode: "explore" as const };
}
