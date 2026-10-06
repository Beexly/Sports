
export function interferenceScores(
  challengerLoss: readonly number[],
  championLoss: readonly number[],
): number[] {
  if (challengerLoss.length !== championLoss.length) {
    throw new Error("adaer-replay: challenger/champion loss vectors must align");
  }
  return challengerLoss.map((c, i) => c - (championLoss[i] ?? 0));
}

export interface AdaErSelectionOptions {
  readonly challengerLoss: readonly number[];
  readonly championLoss: readonly number[];
  /** Indices of the new week's games (always included, never scored as history). */
  readonly newWeekIndices: readonly number[];
  /** How many of the most-interfered historical games to replay. */
  readonly topP: number;
  /** Reservoir size drawn from the remaining history. */
  readonly reservoirK: number;
  /** Per-game class label used for stratum balancing of the reservoir. */
  readonly labels: readonly number[];
  readonly seed?: number;
}

export interface AdaErSelection {
  readonly trainIndices: number[];
  readonly interferedIndices: number[];
  readonly reservoirIndices: number[];
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function adaErBufferSelect(o: AdaErSelectionOptions): AdaErSelection {
  const scores = interferenceScores(o.challengerLoss, o.championLoss);
  const newSet = new Set(o.newWeekIndices);
  const history = scores
    .map((s, i) => ({ s, i }))
    .filter((e) => !newSet.has(e.i))
    .sort((a, b) => b.s - a.s);
  const topP = Math.max(0, Math.min(o.topP, history.length));
  const interfered = history.slice(0, topP).map((e) => e.i);
  const rest = history.slice(topP).map((e) => e.i);

  // E-BRS style class-balanced reservoir over the non-interfered remainder.
  const byLabel = new Map<number, number[]>();
  for (const i of rest) {
    const label = o.labels[i] ?? 0;
    const bucket = byLabel.get(label);
    if (bucket) bucket.push(i);
    else byLabel.set(label, [i]);
  }
  const rng = mulberry32(o.seed ?? 0xadae09);
  const strata = [...byLabel.values()];
  const perStratum = strata.length === 0 ? 0 : Math.max(1, Math.floor(o.reservoirK / strata.length));
  const reservoir: number[] = [];
  for (const idxs of strata) {
    const shuffled = [...idxs];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = shuffled[i]!;
      shuffled[i] = shuffled[j]!;
      shuffled[j] = tmp;
    }
    reservoir.push(...shuffled.slice(0, perStratum));
  }
  return {
    trainIndices: [...o.newWeekIndices, ...interfered, ...reservoir],
    interferedIndices: interfered,
    reservoirIndices: reservoir,
  };
}
