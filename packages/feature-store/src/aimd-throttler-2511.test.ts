import { describe, expect, it } from "vitest";
import {
  aimdObserve,
  aimdStep,
  aimdWaitMs,
  initAimd,
  simulateAimd,
  DEFAULT_AIMD_CONFIG,
} from "./aimd-throttler-2511.js";

describe("aimd throttler", () => {
  it("backs off multiplicatively under 429 pressure", () => {
    let s = initAimd(DEFAULT_AIMD_CONFIG);
    const before = s.intervalMs;
    for (let i = 0; i < 10; i++) s = aimdObserve(s, i < 2 ? "rate_limited" : "success", 0);
    s = aimdStep(s, DEFAULT_AIMD_CONFIG);
    expect(s.intervalMs).toBeGreaterThan(before);
    expect(s.intervalMs).toBeCloseTo(before / DEFAULT_AIMD_CONFIG.beta, 6);
  });

  it("speeds up additively when clean", () => {
    let s = initAimd(DEFAULT_AIMD_CONFIG);
    const before = s.intervalMs;
    for (let i = 0; i < 10; i++) s = aimdObserve(s, "success", 0);
    s = aimdStep(s, DEFAULT_AIMD_CONFIG);
    expect(s.intervalMs).toBe(before - DEFAULT_AIMD_CONFIG.additiveMs);
  });

  it("treats deep queues as pressure", () => {
    let s = initAimd(DEFAULT_AIMD_CONFIG);
    const before = s.intervalMs;
    for (let i = 0; i < 10; i++) s = aimdObserve(s, "success", DEFAULT_AIMD_CONFIG.queueThreshold + 1);
    s = aimdStep(s, DEFAULT_AIMD_CONFIG);
    expect(s.intervalMs).toBeGreaterThan(before);
  });

  it("clamps to configured bounds", () => {
    let s = initAimd(DEFAULT_AIMD_CONFIG);
    for (let w = 0; w < 50; w++) {
      for (let i = 0; i < 5; i++) s = aimdObserve(s, "rate_limited", 1000);
      s = aimdStep(s, DEFAULT_AIMD_CONFIG);
    }
    expect(s.intervalMs).toBeLessThanOrEqual(DEFAULT_AIMD_CONFIG.maxIntervalMs);
    expect(aimdWaitMs(s)).toBeGreaterThanOrEqual(0);
  });

  it("simulation adapts interval to pressure regimes", () => {
    const calm = simulateAimd(Array.from({ length: 5 }, () => ({ rate429: 0, queue: 0, requests: 10 })));
    const storm = simulateAimd(Array.from({ length: 5 }, () => ({ rate429: 0.5, queue: 0, requests: 10 })));
    expect(storm.finalIntervalMs).toBeGreaterThan(calm.finalIntervalMs);
    expect(simulateAimd([]).windows).toBe(0);
  });
});
