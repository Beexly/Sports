import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { routeGap, routeShell, runBox } from "./route-shell";

describe("route against the shell", () => {
  it("keeps quick outs better against single-high in every season", () => {
    expect(routeShell("QUICK OUT")!.favors).toBe("SINGLE");
    for (const season of [2023, 2024, 2025]) {
      expect(routeGap("QUICK OUT", season)!).toBeGreaterThan(0.03);
    }
  });

  it("keeps hitches and digs better against split safety", () => {
    for (const route of ["HITCH/CURL", "IN/DIG"]) {
      expect(routeShell(route)!.favors).toBe("SPLIT");
      for (const season of [2023, 2024, 2025]) {
        expect(routeGap(route, season)!).toBeLessThan(0);
      }
    }
  });

  it("does not pretend the 2024 shallow cross gap is large", () => {
    expect(routeGap("SHALLOW CROSS/DRAG", 2023)!).toBeGreaterThan(0.1);
    expect(routeGap("SHALLOW CROSS/DRAG", 2024)!).toBeGreaterThan(0);
    expect(routeGap("SHALLOW CROSS/DRAG", 2024)!).toBeLessThan(0.05);
    expect(routeGap("SHALLOW CROSS/DRAG", 2025)!).toBeGreaterThan(0.2);
  });

  it("keeps a light box better than a loaded box on runs", () => {
    for (const season of [2023, 2024, 2025]) {
      expect(runBox(5, season)!.epa).toBeGreaterThan(0.1);
      expect(runBox(7, season)!.epa).toBeLessThan(0);
      expect(runBox(5, season)!.epa).toBeGreaterThan(runBox(7, season)!.epa);
    }
  });

  it("is not imported by scoring", () => {
    const scoring = readFileSync(join(__dirname, "..", "scoring.ts"), "utf8");
    expect(scoring.includes("route-shell")).toBe(false);
  });
});
