/**
 * Vitest suite for arXiv:2512.11668v1 (Bridging Streaming Continual Learning via In-Context Large Tabular Models).
 * Gate: ADOPT the LTM-context architecture as a challenger if on 2020-2025 walk-forward: TabPFN Brier is within 0.003 of the GBM baseline, ECE <=0.03 after temperature scaling, regime recovery occurs within 3 weeks on >=60% of episodes, and weekly CPU inference <60 sec.
 */
import { describe, it, expect } from "vitest";
import { reservoirAdmit, mmrAdmit, replayBatch, MemorySlot } from "./2512-11668v1-bridging-streaming-continual-learning-via";

describe("2512-11668v1 MemCon reservoir + MMR memory", () => {
  const mk = (id: string, novelty: number) => ({ id, payload: id, novelty });
  it("fills to capacity then samples", () => {
    let mem: MemorySlot<string>[] = [];
    const rng = () => 0; // always admit
    for (let t = 1; t <= 5; t++) mem = reservoirAdmit(mem, mk(`i${t}`, 0.1), 3, t, rng);
    expect(mem).toHaveLength(3);
    expect(() => reservoirAdmit([], mk("x", 0), 0, 1, rng)).toThrow();
  });
  it("MMR replaces only the least novel slot with a more novel item", () => {
    const mem = [mk("a", 0.9), mk("b", 0.8), mk("c", 0.1)];
    const rng = () => 0;
    const out = mmrAdmit(mem, mk("d", 0.5), 3, 10, rng);
    expect(out.map((m) => m.id).sort()).toEqual(["a", "b", "d"]);
    const out2 = mmrAdmit(mem, mk("e", 0.05), 3, 10, rng);
    expect(out2.map((m) => m.id).sort()).toEqual(["a", "b", "c"]);
  });
  it("replay batch is 1:1 memory:incoming", () => {
    const batch = replayBatch([mk("a", 1), mk("b", 1)], ["x", "y", "z"]);
    expect(batch).toEqual(["a", "b", "x", "y"]);
  });
});
