import { describe, expect, it } from "vitest";
import {
  OFFLINE_LIFECYCLE_FIXTURE,
  enrichLifecycleStamps,
  summarizeLifecycleStamps,
} from "./offline-lock-settle-timestamps";

describe("enrichLifecycleStamps", () => {
  it("flags missing or inverted settle", () => {
    const e = enrichLifecycleStamps(OFFLINE_LIFECYCLE_FIXTURE);
    expect(e[0]!.advisoryInvalidOrder).toBe(false);
    expect(e[1]!.advisoryInvalidOrder).toBe(true);
    expect(e[2]!.advisoryInvalidOrder).toBe(true);
  });
});

describe("summarizeLifecycleStamps", () => {
  it("counts fixture", () => {
    const s = summarizeLifecycleStamps(OFFLINE_LIFECYCLE_FIXTURE);
    expect(s.n).toBe(3);
    expect(s.withSettle).toBe(2);
    expect(s.invalidOrder).toBe(2);
  });
});
