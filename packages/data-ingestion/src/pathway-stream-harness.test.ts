/**
 * Tests for ./pathway-stream-harness (arXiv:2307.13116v1, lane=data_infra).
 *
 * ACCEPTANCE GATE: For any future real-time GSE path: ADOPT a streaming approach iff a candidate passes the parity
 * test (bit-identical batch prefix + resumed stream vs from-scratch batch) AND its 95th-percentile
 * event-to-feature latency on GSE's tick rate is <= 1 second at sustained throughput; REJECT any
 * design requiring separate batch and streaming logic.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./pathway-stream-harness";

describe("Pathway stream harness (arXiv:2307.13116v1)", () => {
  const t0 = Date.parse("2024-01-01T00:00:00.000Z");
  const events = [
    { key: "a", eventAt: new Date(t0).toISOString(), value: 1 },
    { key: "a", eventAt: new Date(t0 + 1000).toISOString(), value: 3 },
    { key: "b", eventAt: new Date(t0 + 70000).toISOString(), value: 5 },
  ];
  it("watermark", () => {
    expect(mod.watermark(events, 5000)).toBe(t0 + 70000 - 5000);
    expect(mod.watermark([], 100)).toBeNull();
    expect(mod.watermark(events, -1)).toBeNull();
  });
  it("tumbling windows", () => {
    const w = mod.tumblingWindows(events, 60000)!;
    expect(w.size).toBe(2);
    const first = [...w.values()][0]!;
    expect(first.n).toBe(2);
    expect(first.mean).toBeCloseTo(2, 10);
  });
  it("drop late", () => {
    const wm = mod.watermark(events, 60000)!;
    const kept = mod.dropLate(events, wm);
    expect(kept.length).toBe(1);
    expect(kept[0]!.key).toBe("b");
    expect(mod.dropLate(events, NaN)).toEqual([]);
  });
  it("isStreamEvent rejects malformed", () => {
    expect(mod.isStreamEvent({ key: "a" })).toBe(false);
  });
});
