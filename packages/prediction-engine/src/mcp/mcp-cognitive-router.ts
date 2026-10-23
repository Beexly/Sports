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

const KILLED_PREMISES: Readonly<Record<string, string>> = {
  STEAM_EXHAUSTION_FADE: "movement does not anticipate the result (r 0.005)",
  MUTUAL_SPINE_YAC: "the spine and YAC channel has no measured effect",
};

/**
 * Stage A: bitwise sample-floor prune. Killed premises are dropped by id.
 * Bit 224/228 in a premise's forbidden mask still kills anything else that
 * names them.
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
    const killed = KILLED_PREMISES[p.id];
    if (killed) {
      pruned.push({ id: p.id, reason: killed });
      continue;
    }
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

/** Stage D: killed interaction bits do not raise the Jacobian. */
export function stageDJacobianWeight(_bitmask: ContextualBitmaskReceipt): number {
  return 1;
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
