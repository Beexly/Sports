import { describe, it, expect } from "vitest";
import { parseProjectionCsv, projectionCsvTemplate } from "../projection-csv";

const VALID_PROJECTION_CSV = `Name,Team,Position,Projection,Floor,Ceiling,Ownership,VolatilityNote,Notes
Patrick Mahomes,KC,QB,28.5,18.0,48.0,0.25,,
Justin Jefferson,MIN,WR,22.0,10.0,42.0,18,,High upside
Saquon Barkley,PHI,RB,18.9,,,,
`;

describe("parseProjectionCsv", () => {
  it("parses a valid projection CSV correctly", () => {
    const rows = parseProjectionCsv(VALID_PROJECTION_CSV);
    expect(rows).toHaveLength(3);

    const mahomes = rows[0]!;
    expect(mahomes.name).toBe("Patrick Mahomes");
    expect(mahomes.team).toBe("KC");
    expect(mahomes.position).toBe("QB");
    expect(mahomes.meanProjection).toBe(28.5);
    expect(mahomes.floorP10).toBe(18.0);
    expect(mahomes.ceilingP90).toBe(48.0);
    expect(mahomes.projectedOwnership).toBe(0.25);
    expect(mahomes.notes).toBeNull();
  });

  it("normalizes ownership > 1 by dividing by 100", () => {
    const rows = parseProjectionCsv(VALID_PROJECTION_CSV);
    // Jefferson has ownership=18 (treated as 18%)
    const jefferson = rows[1]!;
    expect(jefferson.projectedOwnership).toBeCloseTo(0.18);
  });

  it("preserves ownership <= 1 as-is", () => {
    const rows = parseProjectionCsv(VALID_PROJECTION_CSV);
    // Mahomes has ownership=0.25
    const mahomes = rows[0]!;
    expect(mahomes.projectedOwnership).toBe(0.25);
  });

  it("parses notes correctly", () => {
    const rows = parseProjectionCsv(VALID_PROJECTION_CSV);
    const jefferson = rows[1]!;
    expect(jefferson.notes).toBe("High upside");
  });

  it("returns null for optional fields when absent", () => {
    const rows = parseProjectionCsv(VALID_PROJECTION_CSV);
    const barkley = rows[2]!;
    expect(barkley.floorP10).toBeNull();
    expect(barkley.ceilingP90).toBeNull();
    expect(barkley.projectedOwnership).toBeNull();
    expect(barkley.notes).toBeNull();
  });

  it("skips blank rows", () => {
    const csv = `Name,Team,Position,Projection
Patrick Mahomes,KC,QB,28.5

Justin Jefferson,MIN,WR,22.0

`;
    const rows = parseProjectionCsv(csv);
    expect(rows).toHaveLength(2);
  });

  it("throws on missing required column (Team)", () => {
    const csv = `Name,Position,Projection
Patrick Mahomes,QB,28.5
`;
    expect(() => parseProjectionCsv(csv)).toThrow(/missing required column "Team"/);
  });

  it("throws on missing required column (Projection)", () => {
    const csv = `Name,Team,Position
Patrick Mahomes,KC,QB
`;
    expect(() => parseProjectionCsv(csv)).toThrow(/missing required column "Projection"/);
  });

  it("throws when projection is not a positive number", () => {
    const csv = `Name,Team,Position,Projection
Patrick Mahomes,KC,QB,-5.0
`;
    expect(() => parseProjectionCsv(csv)).toThrow(/Projection must be a positive number/);
  });

  it("throws when projection is zero", () => {
    const csv = `Name,Team,Position,Projection
Patrick Mahomes,KC,QB,0
`;
    expect(() => parseProjectionCsv(csv)).toThrow(/Projection must be a positive number/);
  });

  it("throws on empty CSV", () => {
    expect(() => parseProjectionCsv("")).toThrow(/empty/i);
  });

  it("projectionCsvTemplate returns a parseable CSV", () => {
    const template = projectionCsvTemplate();
    expect(typeof template).toBe("string");
    // Should be parseable and produce rows (template includes example rows)
    const rows = parseProjectionCsv(template);
    expect(rows.length).toBeGreaterThan(0);
  });
});
