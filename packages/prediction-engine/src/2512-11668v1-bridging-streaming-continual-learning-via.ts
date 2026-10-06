/**
 * arXiv:2512.11668v1 — Bridging Streaming Continual Learning via In-Context Large Tabular Models
 *
 * MemCon continual pre-training: fixed-size memory with reservoir sampling plus maximal marginal relevance
 * (novelty) filtering, replayed with the incoming season batch at a 1:1 ratio — cheap anti-forgetting for
 * the seasonal model.
 *
 * Improvement: GSE runs TabPFN as a weekly no-retraining challenger model with context slices: trailing-8-week plasticity games plus a diversified historical stability coreset (~500 games) rebuilt each week instead of retraining.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT the LTM-context architecture as a challenger if on 2020-2025 walk-forward: TabPFN Brier is within 0.003 of the GBM baseline, ECE <=0.03 after temperature scaling, regime recovery occurs within 3 weeks on >=60% of episodes, and weekly CPU inference <60 sec.
 */

/** One memory slot: a serialized training example (opaque payload). */
export interface MemorySlot<T> {
  id: string;
  payload: T;
  /** Novelty score at admission time (MMR). */
  novelty: number;
}

/**
 * Reservoir sampling admission: keep with prob k/t, replacing a random slot.
 * Deterministic via the provided rng.
 */
export function reservoirAdmit<T>(
  memory: MemorySlot<T>[],
  item: MemorySlot<T>,
  k: number,
  t: number,
  rng: () => number,
): MemorySlot<T>[] {
  if (k <= 0) throw new Error("reservoirAdmit: k > 0");
  const mem = [...memory];
  if (mem.length < k) {
    mem.push(item);
    return mem;
  }
  const j = Math.floor(rng() * t);
  if (j < k) mem[j] = item;
  return mem;
}

/**
 * Maximal marginal relevance filter: admit only if the item's novelty beats
 * the least-novel slot's novelty (diversity-preserving replacement).
 */
export function mmrAdmit<T>(
  memory: MemorySlot<T>[],
  item: MemorySlot<T>,
  k: number,
  t: number,
  rng: () => number,
): MemorySlot<T>[] {
  const mem = [...memory];
  if (mem.length < k) {
    mem.push(item);
    return mem;
  }
  let minIdx = 0;
  for (let i = 1; i < mem.length; i++) {
    if ((mem[i]?.novelty ?? 0) < (mem[minIdx]?.novelty ?? 0)) minIdx = i;
  }
  if (item.novelty > (mem[minIdx]?.novelty ?? 0)) {
    // Reservoir coin flip decides whether the novelty winner is admitted.
    const j = Math.floor(rng() * t);
    if (j < k) mem[minIdx] = item;
  }
  return mem;
}

/** Build the 1:1 replay batch: memory sample + incoming batch. */
export function replayBatch<T>(memory: readonly MemorySlot<T>[], incoming: readonly T[]): T[] {
  const replay = memory.map((m) => m.payload);
  const n = Math.min(replay.length, incoming.length);
  return [...replay.slice(0, n), ...incoming.slice(0, n)];
}
