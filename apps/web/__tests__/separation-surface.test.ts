import { describe, it, expect } from "vitest";
import {
  buildReconstructedSeparation,
  type SeparationRow,
} from "@/lib/reconstruction/separation-surface";

/**
 * The reconstructed-separation surface: honest empty state when data is thin,
 * de-noised tendencies with intervals + provenance when it accrues.
 */

function weeks(gsisId: string, name: string, vals: number[]): SeparationRow[] {
  return vals.map((v) => ({ gsisId, playerName: name, position: "WR", avgSeparation: v }));
}

describe("buildReconstructedSeparation", () => {
  it("is not available until enough receivers with enough weeks exist", () => {
    const thin = buildReconstructedSeparation([
      ...weeks("a", "A", [3.0, 3.2]),
      ...weeks("b", "B", [2.8]), // only 1 week -> ineligible
    ]);
    expect(thin.available).toBe(false);
    expect(thin.players).toHaveLength(0);
    expect(thin.note).toMatch(/reconstructed, not measured/i);
  });

  it("produces shrunk tendencies with intervals + RECONSTRUCTED provenance", () => {
    const rows: SeparationRow[] = [];
    for (let i = 0; i < 12; i++) {
      // 12 receivers, each 6 weeks, tendencies spread ~2.5-3.5.
      const base = 2.5 + (i % 6) * 0.2;
      rows.push(...weeks(`p${i}`, `Player ${i}`, [base, base + 0.1, base - 0.1, base, base + 0.2, base - 0.2]));
    }
    const s = buildReconstructedSeparation(rows);
    expect(s.available).toBe(true);
    expect(s.players.length).toBe(12);
    for (const p of s.players) {
      expect(p.low).toBeLessThanOrEqual(p.tendency);
      expect(p.high).toBeGreaterThanOrEqual(p.tendency);
      expect(p.weeks).toBe(6);
      expect(p.disclosure).toMatch(/reconstructed, not measured/i);
    }
    // Sorted by tendency descending.
    for (let i = 1; i < s.players.length; i++) {
      expect(s.players[i - 1]!.tendency).toBeGreaterThanOrEqual(s.players[i]!.tendency);
    }
  });

  it("shrinks a thin-sample outlier toward the field (de-noising)", () => {
    const rows: SeparationRow[] = [];
    for (let i = 0; i < 10; i++) rows.push(...weeks(`solid${i}`, `Solid ${i}`, [3.0, 3.1, 2.9, 3.0, 3.05, 2.95]));
    rows.push(...weeks("hot", "Hot Rookie", [6.0, 5.5])); // 2-week extreme
    const s = buildReconstructedSeparation(rows);
    const hot = s.players.find((p) => p.gsisId === "hot")!;
    // The 2-week 5.75 average is pulled DOWN toward the ~3.0 field.
    expect(hot.tendency).toBeLessThan(5.75);
    expect(hot.tendency).toBeGreaterThan(3.0);
  });
});
