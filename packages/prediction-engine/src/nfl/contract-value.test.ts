import { describe, expect, it } from "vitest";
import { analyzeContractValue } from "./contract-value.js";

describe("contract value analyzer", () => {
  it("ranks same-position value per cap dollar first", () => {
    const rows = analyzeContractValue([
      { player: "Low", position: "WR", totalEPA: 4, capHitM: 10 },
      { player: "High", position: "WR", totalEPA: 12, capHitM: 10 },
    ]);
    expect(rows.map((row) => row.player)).toEqual(["High", "Low"]);
    expect(rows[0]?.valuePerDollar).toBe(1.2);
    expect(rows[0]?.percentileVsPosition).toBe(1);
    expect(rows[1]?.percentileVsPosition).toBe(0);
  });

  it("excludes zero and negative cap hits", () => {
    const rows = analyzeContractValue([
      { player: "Good", position: "QB", totalEPA: 10, capHitM: 1 },
      { player: "Zero", position: "QB", totalEPA: 100, capHitM: 0 },
      { player: "Negative", position: "QB", totalEPA: 100, capHitM: -1 },
    ]);
    expect(rows.map((row) => row.player)).toEqual(["Good"]);
  });

  it("marks top and bottom position deciles", () => {
    const rows = analyzeContractValue([
      { player: "A", position: "RB", totalEPA: 10, capHitM: 1 },
      { player: "B", position: "RB", totalEPA: 9, capHitM: 1 },
      { player: "C", position: "RB", totalEPA: 1, capHitM: 1 },
    ]);
    expect(rows.find((row) => row.player === "A")?.flag).toBe("surplus");
    expect(rows.find((row) => row.player === "C")?.flag).toBe("overpaid");
    expect(rows.find((row) => row.player === "B")?.flag).toBe("neutral");
  });
});
