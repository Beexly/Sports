import { describe, expect, it } from "vitest";
import {
  parseAsOfMs,
  validateValueAsOf,
  validateValueRequest,
  handleGetMetricValue,
  NflverseMemoryStore,
  createNflverseMemoryProvider,
  getMetricById,
} from "../index.js";

const FIXED = Date.parse("2025-11-15T12:00:00.000Z");
const clock = { nowMs: () => FIXED };

describe("stats-api PIT validation", () => {
  it("rejects date-only asOf on values", async () => {
    const r = await handleGetMetricValue(
      {
        metricId: "nfl.box.pass_yds",
        entityId: "p1",
        asOf: "2025-11-01",
        tier: "FREE",
      },
      undefined,
      { clock },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("asof_invalid");
  });

  it("rejects future asOf with 422", async () => {
    const r = await handleGetMetricValue(
      {
        metricId: "nfl.box.pass_yds",
        entityId: "p1",
        asOf: "2026-01-01T00:00:00.000Z",
        tier: "FREE",
      },
      async () => 1,
      { clock },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(422);
      expect(r.code).toBe("asof_future");
    }
  });

  it("nflverse store PIT select", async () => {
    const store = new NflverseMemoryStore();
    store.put({
      metricId: "nfl.box.pass_yds",
      entityId: "p1",
      asOf: "2025-11-01T12:00:00.000Z",
      value: 200,
    });
    store.put({
      metricId: "nfl.box.pass_yds",
      entityId: "p1",
      asOf: "2025-11-10T12:00:00.000Z",
      value: 300,
    });
    const p = createNflverseMemoryProvider(store);
    const m = getMetricById("nfl.box.pass_yds")!;
    expect(await p(m, "p1", "2025-11-05T00:00:00.000Z")).toBe(200);
    expect(await p(m, "p1", "2025-11-11T00:00:00.000Z")).toBe(300);
  });

  it("store put rejects bad asOf", () => {
    const store = new NflverseMemoryStore();
    expect(() =>
      store.put({
        metricId: "nfl.box.pass_yds",
        entityId: "p1",
        asOf: "nope",
        value: 1,
      }),
    ).toThrow(/asof_invalid/);
  });

  it("validateValueRequest", () => {
    expect(validateValueRequest({ metricId: "x", entityId: "y" }).ok).toBe(false);
    expect(
      validateValueRequest(
        {
          metricId: "x",
          entityId: "y",
          asOf: "2025-11-01T00:00:00.000Z",
        },
        { clock },
      ).ok,
    ).toBe(true);
  });
});
