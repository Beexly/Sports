import { describe, expect, it, vi } from "vitest";

/**
 * `resolveGateSlate` — the one place that decides whether /board/gate may call
 * its rows live.
 *
 * These tests exist because the honesty-critical property of the gate page is
 * not "does it render" but "can a live label ever appear over rows that are not
 * live". That is a property of this function alone, and it is tested here
 * directly rather than only through the page, where a render assertion would
 * pass for the wrong reason.
 */

import {
  illustrativePicks,
  illustrativeSource,
  resolveGateSlate,
} from "@/lib/board/gate-page-mode";
import { buildCalibrationRows, buildCandidateRows, type RawPickRow } from "@/lib/board/gate-rows";

function row(id: string, result: RawPickRow["result"]): RawPickRow {
  return {
    id,
    selection: `Home ${id} -2.5`,
    confidence: 60,
    pickType: "SPREAD",
    result,
    sportName: "nfl",
    homeTeamName: `Home ${id}`,
    awayTeamName: `Away ${id}`,
    homePrice: -110,
    awayPrice: -110,
  };
}

function slate(overrides: { pending?: RawPickRow[]; undescribable?: number } = {}): {
  calibration: ReturnType<typeof buildCalibrationRows>;
  candidates: ReturnType<typeof buildCandidateRows>;
  undescribable: number;
} {
  const settled: RawPickRow[] = [];
  for (let i = 0; i < 150; i++) settled.push(row(`s${i}`, i % 2 === 0 ? "WIN" : "LOSS"));
  return {
    calibration: buildCalibrationRows(settled),
    candidates: buildCandidateRows(overrides.pending ?? [row("p1", "PENDING")]),
    undescribable: overrides.undescribable ?? 0,
  };
}

describe("resolveGateSlate — flag off", () => {
  it("returns illustrative and never touches the database", async () => {
    const fetchSlate = vi.fn();
    const source = await resolveGateSlate({
      isLiveEnabled: () => false,
      fetchSlate: fetchSlate as never,
    });

    expect(source.mode).toBe("illustrative");
    expect(fetchSlate).not.toHaveBeenCalled();
  });

  it("gives NO degraded reason when nothing was attempted", async () => {
    const source = await resolveGateSlate({
      isLiveEnabled: () => false,
      fetchSlate: vi.fn() as never,
    });

    // A reason here would be a false explanation: the page is not degraded, it
    // is in its intended default state. Explaining a failure that did not occur
    // trains readers to ignore the notice when it does mean something.
    expect(source.degradedReason).toBeUndefined();
  });
});

describe("resolveGateSlate — flag on", () => {
  it("returns live when a slate with candidates comes back", async () => {
    const source = await resolveGateSlate({
      isLiveEnabled: () => true,
      fetchSlate: vi.fn().mockResolvedValue(slate()) as never,
    });

    expect(source.mode).toBe("live");
    expect(source.degradedReason).toBeUndefined();
    expect(source.candidates.rows.length).toBe(1);
  });

  it("carries the undescribable count through so it stays visible", async () => {
    const source = await resolveGateSlate({
      isLiveEnabled: () => true,
      fetchSlate: vi.fn().mockResolvedValue(slate({ undescribable: 7 })) as never,
    });

    expect(source.mode).toBe("live");
    expect(source.undescribable).toBe(7);
  });

  it("stays live when every candidate is REFUSED — that is a real result", async () => {
    // The distinction that matters: "we judged eight games and declined all
    // eight" is true, publishable, and the product's central claim. Only "there
    // was nothing to judge" falls back. Conflating them would suppress the
    // page's best evidence.
    const pending = [row("p1", "PENDING"), row("p2", "PENDING")];
    const source = await resolveGateSlate({
      isLiveEnabled: () => true,
      fetchSlate: vi.fn().mockResolvedValue(slate({ pending })) as never,
    });

    expect(source.mode).toBe("live");
    expect(source.candidates.rows.length).toBe(2);
  });

  it("stays live when candidates exist only as EXCLUSIONS", async () => {
    // A candidate with no two-sided odds is excluded from the gate rows but is
    // still a real row on today's slate, and the page reports it as "not
    // evaluated". Falling back here would hide the live slate's actual data
    // problems behind a tidy demonstration.
    const noOdds: RawPickRow = { ...row("p9", "PENDING"), homePrice: null, awayPrice: null };
    const built = buildCandidateRows([noOdds]);
    expect(built.rows.length).toBe(0);
    expect(built.excluded.length).toBe(1);

    const source = await resolveGateSlate({
      isLiveEnabled: () => true,
      fetchSlate: vi.fn().mockResolvedValue({ ...slate(), candidates: built }) as never,
    });

    expect(source.mode).toBe("live");
  });
});

describe("resolveGateSlate — fails closed", () => {
  it("falls back to illustrative with a reason when the read throws", async () => {
    const source = await resolveGateSlate({
      isLiveEnabled: () => true,
      fetchSlate: vi.fn().mockRejectedValue(new Error("boom")) as never,
    });

    expect(source.mode).toBe("illustrative");
    expect(source.degradedReason).toContain("could not be read");
    // Rows are still present — fail closed means degrade honestly, not blank.
    expect(source.candidates.rows.length).toBeGreaterThan(0);
  });

  it("does not leak the underlying error text to a public page", async () => {
    const secret = "postgresql://svc:hunter2@db.internal:5432/prod";
    const source = await resolveGateSlate({
      isLiveEnabled: () => true,
      fetchSlate: vi.fn().mockRejectedValue(new Error(secret)) as never,
    });

    expect(source.degradedReason).not.toContain("hunter2");
    expect(source.degradedReason).not.toContain("db.internal");
  });

  it("falls back with a reason when the loader returns null", async () => {
    const source = await resolveGateSlate({
      isLiveEnabled: () => true,
      fetchSlate: vi.fn().mockResolvedValue(null) as never,
    });

    expect(source.mode).toBe("illustrative");
    expect(source.degradedReason).toContain("No live slate is available");
  });

  it("refuses to call an EMPTY live read live", async () => {
    const source = await resolveGateSlate({
      isLiveEnabled: () => true,
      fetchSlate: vi.fn().mockResolvedValue({
        calibration: buildCalibrationRows([]),
        candidates: buildCandidateRows([]),
        undescribable: 0,
      }) as never,
    });

    expect(source.mode).toBe("illustrative");
    expect(source.degradedReason).toContain("no upcoming games to judge");
  });
});

describe("the illustrative set itself", () => {
  it("is deterministic across calls — no hidden RNG", async () => {
    const a = illustrativePicks();
    const b = illustrativePicks();
    expect(a.settled.map((r) => r.confidence)).toEqual(b.settled.map((r) => r.confidence));
    expect(a.pending.map((r) => r.id)).toEqual(b.pending.map((r) => r.id));
  });

  it("contains a stratum over the floor and one deliberately under it", async () => {
    const { settled } = illustrativePicks();
    const nfl = settled.filter((r) => r.sportName === "nfl" && r.result !== "PUSH");
    const nba = settled.filter((r) => r.sportName === "nba");
    // Both states must be demonstrable, or the page can only ever show one kind
    // of answer and the "not judged" outcome becomes unreachable copy.
    expect(nfl.length).toBeGreaterThan(100);
    expect(nba.length).toBeLessThan(100);
  });

  it("reports zero undescribable rows — the fixture is complete by construction", () => {
    expect(illustrativeSource().undescribable).toBe(0);
    expect(illustrativeSource().mode).toBe("illustrative");
  });
});
