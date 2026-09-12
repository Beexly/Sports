import { describe, expect, it } from "vitest";
import {
  NBA_LINEUP_SIZE,
  NBA_SALARY_CAP,
  NBA_SLATE,
  NBA_SLOTS,
  validateNbaLineup,
  type NbaPlayer,
} from "./nba-slate";

const byId = (id: string): NbaPlayer => NBA_SLATE.find((p) => p.id === id)!;

/** A known-good 8-man lineup: 9200+5900+5600+5800+6100+5300+5000+4200 = 47100. */
const VALID_IDS = ["nba01", "nba09", "nba13", "nba18", "nba15", "nba24", "nba21", "nba28"];

describe("nba-slate", () => {
  it("exposes an 8-slot DK Classic structure under a 50000 cap", () => {
    expect(NBA_SALARY_CAP).toBe(50000);
    expect(NBA_SLOTS).toHaveLength(8);
    expect(NBA_LINEUP_SIZE).toBe(8);
  });

  it("ships a fictional slate of 25+ players with real team codes", () => {
    expect(NBA_SLATE.length).toBeGreaterThanOrEqual(25);
    for (const p of NBA_SLATE) {
      expect(p.id).toBeTruthy();
      expect(p.salary).toBeGreaterThan(0);
      expect(p.positions.length).toBeGreaterThan(0);
      expect(p.team).toMatch(/^[A-Z]{2,3}$/);
    }
    expect(new Set(NBA_SLATE.map((p) => p.id)).size).toBe(NBA_SLATE.length);
  });

  it("accepts a valid lineup and totals salary/projection", () => {
    const result = validateNbaLineup(VALID_IDS.map(byId));
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.totalSalary).toBeLessThanOrEqual(NBA_SALARY_CAP);
    expect(result.totalSalary).toBe(47100);
  });

  it("rejects a lineup with the wrong size", () => {
    const result = validateNbaLineup(VALID_IDS.slice(0, 7).map(byId));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("7"))).toBe(true);
  });

  it("rejects duplicate players", () => {
    const lineup = VALID_IDS.map(byId);
    lineup[7] = lineup[0];
    const result = validateNbaLineup(lineup);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("duplicate"))).toBe(true);
  });

  it("rejects a lineup over the salary cap", () => {
    const stars = ["nba01", "nba04", "nba10", "nba11", "nba23", "nba03", "nba12", "nba02"].map(byId);
    const total = stars.reduce((s, p) => s + p.salary, 0);
    expect(total).toBeGreaterThan(NBA_SALARY_CAP);
    const result = validateNbaLineup(stars);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("exceeds cap"))).toBe(true);
  });

  it("rejects a lineup that cannot fill all slots (8 centers)", () => {
    const centers: NbaPlayer[] = Array.from({ length: 8 }, (_, i) => ({
      id: `c${i}`,
      name: `Center ${i}`,
      team: "BOS",
      positions: ["C"],
      salary: 4000,
      projection: 10,
    }));
    const result = validateNbaLineup(centers);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("roster slots"))).toBe(true);
  });
});
