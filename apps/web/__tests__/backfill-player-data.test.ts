import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

/**
 * Multi-season backfill orchestrator: loops the range, respects each dataset's
 * earliest season (stats 1999, injuries 2009, snaps 2012), and aggregates allOk.
 * The per-season ingestions are mocked (covered by their own tests).
 */

vi.mock("@/lib/ingestion/player-stats", () => ({ ingestPlayerWeeklyStats: vi.fn() }));
vi.mock("@/lib/ingestion/snap-counts", () => ({ ingestSnapCounts: vi.fn() }));
vi.mock("@/lib/ingestion/injuries", () => ({ ingestInjuries: vi.fn() }));

import { backfillPlayerData } from "@/lib/ingestion/backfill-player-data";
import { ingestPlayerWeeklyStats } from "@/lib/ingestion/player-stats";
import { ingestSnapCounts } from "@/lib/ingestion/snap-counts";
import { ingestInjuries } from "@/lib/ingestion/injuries";

beforeEach(() => {
  (ingestPlayerWeeklyStats as Mock).mockReset().mockResolvedValue({ status: "ok", season: 0, playersUpserted: 1, statsUpserted: 1 });
  (ingestSnapCounts as Mock).mockReset().mockResolvedValue({ status: "ok", season: 0, rowsWritten: 1 });
  (ingestInjuries as Mock).mockReset().mockResolvedValue({ status: "ok", season: 0, rowsWritten: 1 });
});

describe("backfillPlayerData", () => {
  it("loops the range and respects each dataset's earliest season", async () => {
    const r = await backfillPlayerData(2010, 2013);
    expect(r.seasonsProcessed).toBe(4);
    expect(r.allOk).toBe(true);
    expect(ingestPlayerWeeklyStats).toHaveBeenCalledTimes(4); // stats since 1999
    expect(ingestInjuries).toHaveBeenCalledTimes(4); // injuries since 2009
    expect(ingestSnapCounts).toHaveBeenCalledTimes(2); // snaps since 2012 → 2012, 2013
    expect(ingestSnapCounts).toHaveBeenCalledWith(2012);
    expect(ingestSnapCounts).toHaveBeenCalledWith(2013);
    const s2010 = r.results.find((x) => x.season === 2010)!;
    expect(s2010.snaps).toBe("skipped");
    expect(s2010.injuries).not.toBe("skipped");
  });

  it("skips snaps and injuries for very old seasons", async () => {
    const r = await backfillPlayerData(2005, 2005);
    expect(r.results[0]!.snaps).toBe("skipped");
    expect(r.results[0]!.injuries).toBe("skipped");
    expect(r.results[0]!.stats).not.toBe("skipped");
    expect(ingestSnapCounts).not.toHaveBeenCalled();
    expect(ingestInjuries).not.toHaveBeenCalled();
  });

  it("reports allOk=false when a sub-ingestion fails", async () => {
    (ingestInjuries as Mock).mockResolvedValue({ status: "source-error", season: 2009, rowsWritten: 0 });
    const r = await backfillPlayerData(2009, 2009);
    expect(r.allOk).toBe(false);
    expect(r.results[0]!.snaps).toBe("skipped"); // 2009 < 2012
  });
});
