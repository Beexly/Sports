import { describe, expect, it } from "vitest";
import { makeMemoryClosingArchive } from "../archive/closing-archive.js";
import {
  reportSelfClvFromArchive,
  buildDemoSelfClvReport,
} from "../archive/self-clv-report.js";
import {
  cpoeRoll,
  rollingSum,
  shareOfTeam,
  yardsPerPlay,
} from "../formulas/derived.js";

describe("self-CLV cohort report", () => {
  it("scores complete pairs and refuses incomplete; mean closed under floor", () => {
    const archive = makeMemoryClosingArchive();
    archive.append({
      eventId: "e1",
      market: "ml",
      side: "yes",
      decimalOdds: 2.0,
      asOf: "2026-01-01T00:00:00.000Z",
      source: "gamma",
      role: "open",
      archivedAt: "2026-01-02T00:00:00.000Z",
    });
    archive.append({
      eventId: "e1",
      market: "ml",
      side: "yes",
      decimalOdds: 2.2,
      asOf: "2026-01-02T00:00:00.000Z",
      source: "gamma",
      role: "close",
      archivedAt: "2026-01-02T00:00:00.000Z",
    });
    archive.append({
      eventId: "e2",
      market: "ml",
      side: "yes",
      decimalOdds: 1.8,
      asOf: "2026-01-01T00:00:00.000Z",
      source: "own",
      role: "open",
      archivedAt: "2026-01-02T00:00:00.000Z",
    });

    const report = reportSelfClvFromArchive(archive, ["e1", "e2"]);
    expect(report.nPairs).toBe(2);
    expect(report.nOk).toBe(1);
    expect(report.nRefused).toBe(1);
    expect(report.meanBpsPublic).toBe(false);
    expect(report.meanBps).toBeNull();
    expect(report.law.some((l) => l.includes("oddsApiRequired=false"))).toBe(true);
  });

  it("demo empty report is honest closed", () => {
    const d = buildDemoSelfClvReport();
    expect(d.meanBpsPublic).toBe(false);
    expect(d.nOk).toBe(0);
  });
});

describe("derived formula density", () => {
  it("rollingSum and cpoe refuse below floor", () => {
    const r = rollingSum([1, 2, 3], 8, { nMin: 8 });
    expect(r.ok).toBe(false);
    expect(r.refuseCode).toBe("n_below_floor");
    const ok = rollingSum(Array.from({ length: 10 }, (_, i) => i + 1), 8);
    expect(ok.ok).toBe(true);
    const c = cpoeRoll([0.01, -0.02, 0.03], 5, { nMin: 20 });
    expect(c.ok).toBe(false);
  });

  it("yardsPerPlay and shareOfTeam refuse-default", () => {
    const y = yardsPerPlay([50, 60], [10, 10], 2);
    expect(y.ok).toBe(false); // pSum=20 < 40
    const y2 = yardsPerPlay(
      Array(5).fill(100),
      Array(5).fill(20),
      5,
    );
    expect(y2.ok).toBe(true);
    expect(y2.value).toBe(5);
    const s = shareOfTeam(10, 0);
    expect(s.ok).toBe(false);
    const s2 = shareOfTeam(10, 40);
    expect(s2.ok).toBe(true);
    expect(s2.value).toBe(0.25);
  });
});
