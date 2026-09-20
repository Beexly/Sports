import { describe, expect, it, vi } from "vitest";
import { checkArchiveStaleness } from "../archive-staleness-monitor.js";

vi.mock("../owner-alert.js", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

describe("Archive Staleness Monitor (GSE-MON-012)", () => {
  const fixedNow = () => new Date("2026-09-18T18:00:00.000Z");

  it("returns isStale: false when LINE_ARCHIVE_ENABLED is false", async () => {
    const mockDb = {
      oddsLineSnapshot: {
        findMany: vi.fn(),
      },
    };

    const report = await checkArchiveStaleness({
      db: mockDb,
      now: fixedNow,
      env: { LINE_ARCHIVE_ENABLED: "false" },
    });

    expect(report.isStale).toBe(false);
    expect(mockDb.oddsLineSnapshot.findMany).not.toHaveBeenCalled();
  });

  it("returns isStale: false when recent writes exist in rolling window", async () => {
    const mockDb = {
      oddsLineSnapshot: {
        findMany: vi.fn().mockResolvedValue([
          { capturedAt: new Date("2026-09-18T17:30:00.000Z") },
          { capturedAt: new Date("2026-09-18T16:00:00.000Z") },
        ]),
      },
    };

    const report = await checkArchiveStaleness({
      db: mockDb,
      now: fixedNow,
      env: { LINE_ARCHIVE_ENABLED: "true" },
    });

    expect(report.isStale).toBe(false);
    expect(report.writesInWindow).toBe(2);
    expect(report.lastWriteAt).toEqual(new Date("2026-09-18T17:30:00.000Z"));
  });

  it("detects outage and alerts owner when 0 writes exist in rolling window during active market", async () => {
    const mockDb = {
      oddsLineSnapshot: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const report = await checkArchiveStaleness({
      db: mockDb,
      now: fixedNow,
      env: { LINE_ARCHIVE_ENABLED: "true" },
      isQuietPeriod: false,
    });

    expect(report.isStale).toBe(true);
    expect(report.writesInWindow).toBe(0);
    expect(report.alerted).toBe(true);
  });

  it("does not alarm during quiet periods even with 0 writes", async () => {
    const mockDb = {
      oddsLineSnapshot: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const report = await checkArchiveStaleness({
      db: mockDb,
      now: fixedNow,
      env: { LINE_ARCHIVE_ENABLED: "true" },
      isQuietPeriod: true,
    });

    expect(report.isStale).toBe(false);
    expect(report.writesInWindow).toBe(0);
    expect(report.alerted).toBe(false);
  });
});
