import { describe, it, expect, beforeEach } from "vitest";
import {
  classifyLatency,
  resetNeonPoolCountersForTests,
  getNeonPoolCounters,
} from "../neon-pool-monitor";

describe("classifyLatency", () => {
  it("ok under threshold", () => {
    expect(classifyLatency(50, null)).toBe("ok");
  });
  it("degraded above 500ms", () => {
    expect(classifyLatency(600, null)).toBe("degraded");
  });
  it("degraded above critical still degraded not inventing down if no error", () => {
    expect(classifyLatency(3000, null)).toBe("degraded");
  });
  it("down on error", () => {
    expect(classifyLatency(10, "Can't reach database server")).toBe("down");
  });
  it("down on null latency", () => {
    expect(classifyLatency(null, null)).toBe("down");
  });
});

describe("counters", () => {
  beforeEach(() => resetNeonPoolCountersForTests());
  it("starts zero", () => {
    const c = getNeonPoolCounters();
    expect(c.probes).toBe(0);
    expect(c.successes).toBe(0);
  });
});
