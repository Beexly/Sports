import { describe, expect, it } from "vitest";
import {
  MemoryOnlineStore,
  onlineKey,
  assertNotPublicApiPath,
  ONLINE_PIPELINE_GUIDANCE,
} from "../online/redis-store.js";
import {
  makeMemoryClosingArchive,
  selfClvFromClosingArchive,
} from "../archive/closing-archive.js";

describe("online redis adapter contract", () => {
  it("puts and gets with cluster-safe key", () => {
    const s = new MemoryOnlineStore();
    s.put({ metricId: "nfl.epa", entityId: "p1", asOf: "2025-01-01", value: 0.1 });
    expect(s.get("nfl.epa", "p1", "2025-01-01")?.value).toBe(0.1);
    expect(onlineKey("nfl.epa", "p1", "2025-01-01")).toContain("{gse:p1}");
    expect(ONLINE_PIPELINE_GUIDANCE.publicApiOnThisPath).toBe(false);
  });

  it("refuses non-finite put", () => {
    const s = new MemoryOnlineStore();
    expect(() =>
      s.put({ metricId: "x", entityId: "e", asOf: "t", value: Number.NaN }),
    ).toThrow(/refuse/);
  });

  it("blocks public API path misuse", () => {
    expect(() => assertNotPublicApiPath("apps/web/app/api/gse/v1/values")).toThrow(
      /refuse/,
    );
    expect(() => assertNotPublicApiPath("workers/internal/online")).not.toThrow();
  });
});

describe("closing archive self-CLV", () => {
  it("refuses incomplete archive", () => {
    const a = makeMemoryClosingArchive();
    a.append({
      eventId: "g1",
      market: "ml",
      side: "home",
      decimalOdds: 1.9,
      asOf: "t0",
      source: "gamma",
      role: "open",
      archivedAt: "t0",
    });
    const r = selfClvFromClosingArchive(a, "g1", "ml", "home");
    expect(r.ok).toBe(false);
  });

  it("computes self-CLV open→close", () => {
    const a = makeMemoryClosingArchive();
    a.append({
      eventId: "g1",
      market: "ml",
      side: "home",
      decimalOdds: 1.9,
      asOf: "t0",
      source: "own",
      role: "open",
      archivedAt: "t0",
    });
    a.append({
      eventId: "g1",
      market: "ml",
      side: "home",
      decimalOdds: 2.1,
      asOf: "t1",
      source: "own",
      role: "close",
      archivedAt: "t1",
    });
    const r = selfClvFromClosingArchive(a, "g1", "ml", "home");
    expect(r.ok).toBe(true);
    expect(r.value).toBeGreaterThan(0);
  });
});
