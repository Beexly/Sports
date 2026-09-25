import { describe, expect, it, vi } from "vitest";
import { loadNgsTeamSignals, resolveNgsTeamKey } from "../ngs-team-signals.js";

const CAPTURED = new Date("2026-09-24T00:00:00.000Z");

function client(rows: readonly unknown[]) {
  const findMany = vi.fn().mockResolvedValue(rows);
  return { signal: { findMany } } as any;
}

describe("NGS team signal reader", () => {
  it("resolves canonical team abbreviations without guessing unknown names", () => {
    expect(resolveNgsTeamKey("Kansas City Chiefs")).toBe("KC");
    expect(resolveNgsTeamKey("New York Giants")).toBe("NYG");
    expect(resolveNgsTeamKey("not-a-team")).toBeNull();
  });

  it("loads the requested season's latest team rows into context signals", async () => {
    const findMany = vi.fn().mockResolvedValue([
      { entityId: "KC", value: 0.6, weight: 2.5, confidence: 0.7, capturedAt: CAPTURED, season: 2026, week: 0 },
      { entityId: "NYG", value: -0.2, weight: 2.5, confidence: 0.7, capturedAt: CAPTURED, season: 2026, week: 0 },
    ]);
    const result = await loadNgsTeamSignals(
      { signal: { findMany } } as any,
      "Kansas City Chiefs",
      "New York Giants",
      2026,
    );
    expect(result.home?.value).toBe(0.6);
    expect(result.away?.value).toBe(-0.2);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ season: 2026, entityId: { in: ["KC", "NYG"] } }),
      select: expect.objectContaining({ week: true }),
    }));
  });

  it("falls back to the latest common week when one side lacks the week-0 aggregate", async () => {
    const findMany = vi.fn().mockResolvedValue([
      { entityId: "KC", value: 0.1, weight: 2.5, confidence: 0.7, capturedAt: CAPTURED, season: 2026, week: 0 },
      { entityId: "KC", value: 0.6, weight: 2.5, confidence: 0.7, capturedAt: CAPTURED, season: 2026, week: 4 },
      { entityId: "NYG", value: -0.2, weight: 2.5, confidence: 0.7, capturedAt: CAPTURED, season: 2026, week: 4 },
    ]);
    const result = await loadNgsTeamSignals(
      { signal: { findMany } } as any,
      "Kansas City Chiefs",
      "New York Giants",
      2026,
    );
    expect(result.home?.value).toBe(0.6);
    expect(result.away?.value).toBe(-0.2);
  });

  it("uses the latest common season when no season is requested", async () => {
    const findMany = vi.fn().mockResolvedValue([
      { entityId: "KC", value: 0.2, weight: 2.5, confidence: 0.7, capturedAt: CAPTURED, season: 2025, week: 0 },
      { entityId: "NYG", value: -0.1, weight: 2.5, confidence: 0.7, capturedAt: CAPTURED, season: 2025, week: 0 },
      { entityId: "KC", value: 0.7, weight: 2.5, confidence: 0.7, capturedAt: CAPTURED, season: 2026, week: 0 },
      { entityId: "NYG", value: -0.3, weight: 2.5, confidence: 0.7, capturedAt: CAPTURED, season: 2026, week: 0 },
    ]);
    const result = await loadNgsTeamSignals(
      { signal: { findMany } } as any,
      "Kansas City Chiefs",
      "New York Giants",
    );
    expect(result.home).toMatchObject({ value: 0.7, season: 2026 });
    expect(result.away).toMatchObject({ value: -0.3, season: 2026 });
  });
});
