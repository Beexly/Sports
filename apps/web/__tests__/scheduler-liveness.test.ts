/**
 * Scheduler liveness — distinguishes "platform cron stopped firing" from
 * "a job ran and found nothing to do". See lib/ops/scheduler-liveness.ts
 * for the 2026-08-10 incident this exists to diagnose next time.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
const isStubMode = vi.fn(() => false);

vi.mock("@sports/db", () => ({
  db: { ingestionRun: { findFirst: (...a: unknown[]) => findFirst(...a) } },
  isStubMode: () => isStubMode(),
}));

import { assessSchedulerLiveness } from "@/lib/ops/scheduler-liveness";

const NOW = Date.parse("2026-08-10T16:30:00.000Z");

beforeEach(() => {
  findFirst.mockReset();
  isStubMode.mockReset();
  isStubMode.mockReturnValue(false);
});

describe("assessSchedulerLiveness", () => {
  it("healthy: last SUCCESS well within the tightest 15m cadence", async () => {
    findFirst.mockResolvedValue({ completedAt: new Date(NOW - 5 * 60_000) });
    const result = await assessSchedulerLiveness(NOW);
    expect(result.status).toBe("healthy");
    expect(result.ageMinutes).toBe(5);
    expect(result.tightestExpectedGapMinutes).toBe(15);
  });

  it("degraded: past the tightest cadence but not yet conclusive", async () => {
    findFirst.mockResolvedValue({ completedAt: new Date(NOW - 90 * 60_000) });
    const result = await assessSchedulerLiveness(NOW);
    expect(result.status).toBe("degraded");
    expect(result.ageMinutes).toBe(90);
  });

  it("dead: silent well past the loosest observable cadence — the 2026-08-10 case (803m)", async () => {
    findFirst.mockResolvedValue({ completedAt: new Date(NOW - 803 * 60_000) });
    const result = await assessSchedulerLiveness(NOW);
    expect(result.status).toBe("dead");
    expect(result.ageMinutes).toBe(803);
    expect(result.operatorHint).toMatch(/platform scheduler not firing/);
  });

  it("dead: right at the boundary is not yet dead, one minute past is", async () => {
    findFirst.mockResolvedValue({ completedAt: new Date(NOW - 180 * 60_000) });
    expect((await assessSchedulerLiveness(NOW)).status).toBe("degraded");

    findFirst.mockResolvedValue({ completedAt: new Date(NOW - 181 * 60_000) });
    expect((await assessSchedulerLiveness(NOW)).status).toBe("dead");
  });

  it("unknown: no successful IngestionRun ever recorded", async () => {
    findFirst.mockResolvedValue(null);
    const result = await assessSchedulerLiveness(NOW);
    expect(result.status).toBe("unknown");
    expect(result.lastAnyIngestionSuccessAt).toBeNull();
  });

  it("unknown: stub DB mode never queries the database", async () => {
    isStubMode.mockReturnValue(true);
    const result = await assessSchedulerLiveness(NOW);
    expect(result.status).toBe("unknown");
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("unknown: swallows a DB query failure rather than throwing", async () => {
    findFirst.mockRejectedValue(new Error("connection pool timeout"));
    await expect(assessSchedulerLiveness(NOW)).resolves.toMatchObject({ status: "unknown" });
  });

  it("queries only status=SUCCESS ordered by completedAt desc (any sport)", async () => {
    findFirst.mockResolvedValue({ completedAt: new Date(NOW - 5 * 60_000) });
    await assessSchedulerLiveness(NOW);
    expect(findFirst).toHaveBeenCalledWith({
      where: { status: "SUCCESS" },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    });
  });
});
