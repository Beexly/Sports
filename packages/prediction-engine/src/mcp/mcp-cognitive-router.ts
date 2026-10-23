import { getBit, type ContextualBitmaskReceipt } from "./bitmask-schema.js";

export interface RouterPremise {
  readonly id: string;
  readonly requiredMaskBits: readonly number[];
  readonly forbiddenMaskBits: readonly number[];
  readonly sampleCount: number;
}

export interface StageAResult {
  readonly kept: readonly string[];
  readonly pruned: readonly { id: string; reason: string }[];
}

const SAMPLE_FLOOR = 30;
const SHRUNK_FLOOR = 8;

/**
 * Stage A: bitwise sample-floor prune. Bit 224/228 in a premise's forbidden
 * mask kills the mechanical steam-exhaustion fade (bit 140) on 2026-10-22.
 */
export function stageAPrune(
  bitmask: ContextualBitmaskReceipt,
  premises: readonly RouterPremise[],
): StageAResult {
  const kept: string[] = [];
  const pruned: { id: string; reason: string }[] = [];
  const secondOrder = getBit(bitmask.words, 224) || getBit(bitmask.words, 228);
  const floor = secondOrder ? SHRUNK_FLOOR : SAMPLE_FLOOR;
  for (const p of premises) {
    const missing = p.requiredMaskBits.some((b) => !getBit(bitmask.words, b));
    if (missing) {
      pruned.push({ id: p.id, reason: "required mask miss" });
      continue;
    }
    const forbidden = p.forbiddenMaskBits.some((b) => getBit(bitmask.words, b));
    if (forbidden) {
      pruned.push({ id: p.id, reason: "forbidden second-order mask" });
      continue;
    }
    if (p.sampleCount < floor) {
      pruned.push({ id: p.id, reason: `sample floor ${floor}` });
      continue;
    }
    kept.push(p.id);
  }
  return { kept, pruned };
}

/** Stage D: interaction bits raise the cross-equation Jacobian weight. */
export function stageDJacobianWeight(bitmask: ContextualBitmaskReceipt): number {
  let w = 1;
  if (getBit(bitmask.words, 224)) w += 0.35;
  if (getBit(bitmask.words, 225)) w += 0.2;
  if (getBit(bitmask.words, 226)) w += 0.15;
  if (getBit(bitmask.words, 228)) w += 0.1;
  return Math.round(w * 1000) / 1000;
}

export function xorBitmaskDelta(
  prev: ContextualBitmaskReceipt,
  next: ContextualBitmaskReceipt,
): { readonly words: number[]; readonly structural: boolean; readonly marketOnly: boolean } {
  const words = Array.from(next.words).map((w, i) => (w ^ prev.words[i]!) >>> 0);
  const any = words.some((w) => w !== 0);
  const marketWord = words[4] ?? 0;
  const nonMarket = words.some((w, i) => i !== 4 && w !== 0);
  return {
    words,
    structural: nonMarket,
    marketOnly: any && !nonMarket && marketWord !== 0,
  };
}
