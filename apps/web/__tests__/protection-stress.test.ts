import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { protectionStress } from "@/lib/nflverse/protection-stress";

/**
 * Protection Stress Index (Galaxy Data Doctrine stat factory) — computable
 * now from live nflverse pressure rows, shipped per the stat commandment
 * (definition, formula, decision use, stated known weakness).
 */

const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("protectionStress", () => {
  it("a clean pocket reads contained; a battered one reads high", () => {
    const clean = protectionStress({ pressurePct: 0.18, sacks: 8, games: 16 });
    const battered = protectionStress({ pressurePct: 0.42, sacks: 40, games: 16 });
    expect(clean.band).toBe("contained");
    expect(battered.band).toBe("high");
    expect(battered.index).toBeGreaterThan(clean.index);
  });

  it("is anchored on pressure share, with sacks adding terminal weight", () => {
    const lowSack = protectionStress({ pressurePct: 0.3, sacks: 0, games: 16 });
    const highSack = protectionStress({ pressurePct: 0.3, sacks: 48, games: 16 });
    // Same pressure, more sacks → higher stress, but pressure still anchors it.
    expect(highSack.index).toBeGreaterThan(lowSack.index);
    expect(lowSack.index).toBeGreaterThan(0);
  });

  it("handles zero games without dividing by zero", () => {
    expect(protectionStress({ pressurePct: 0, sacks: 0, games: 0 }).index).toBe(0);
  });
});

describe("Player Lab wiring", () => {
  it("the trenches QB table renders the Prot stress column with its tooltip", () => {
    const table = read("components/players/player-lab-table.tsx");
    expect(table).toContain("protectionStress");
    expect(table).toContain("PROTECTION_STRESS_TOOLTIP");
    expect(table).toContain('label: "Prot stress"');
  });

  it("states its known weakness in the lib", () => {
    const lib = read("lib/nflverse/protection-stress.ts");
    expect(lib).toContain("Known weakness");
    expect(lib).toMatch(/does NOT measure how the QB PLAYS under pressure/);
  });
});
