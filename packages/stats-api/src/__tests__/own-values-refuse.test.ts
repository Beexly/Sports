import { describe, expect, it } from "vitest";
import {
  createDemoOwnStore,
  handleOwnValues,
} from "../own/index.js";

describe("own-feed values refuse path", () => {
  const now = new Date("2026-07-29T12:00:00.000Z");
  const store = createDemoOwnStore(now);

  it("returns value with valid past asOf", () => {
    const asOf = "2026-07-29T10:00:00.000Z";
    const ok = handleOwnValues(
      store,
      { metricId: "own.model.p", entityId: "nfl:kc", asOf },
      now,
    );
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.data.value).toBe(0.58);
  });

  it("422 future_leak on future asOf", () => {
    const future = handleOwnValues(
      store,
      {
        metricId: "own.model.p",
        entityId: "nfl:kc",
        asOf: "2099-01-01T00:00:00.000Z",
      },
      now,
    );
    expect(future.ok).toBe(false);
    if (!future.ok) {
      expect(future.code).toBe("future_leak");
      expect(future.status).toBe(422);
    }
  });

  it("422 asof_required when missing", () => {
    const miss = handleOwnValues(
      store,
      { metricId: "own.model.p", entityId: "nfl:kc", asOf: "" },
      now,
    );
    expect(miss.ok).toBe(false);
    if (!miss.ok) {
      expect(miss.code).toBe("asof_required");
      expect(miss.status).toBe(422);
    }
  });

  it("404 not_found for unknown entity/asOf", () => {
    const miss = handleOwnValues(
      store,
      {
        metricId: "own.model.p",
        entityId: "nfl:nobody",
        asOf: "2026-07-29T10:00:00.000Z",
      },
      now,
    );
    expect(miss.ok).toBe(false);
    if (!miss.ok) expect(miss.code).toBe("not_found");
  });
});
