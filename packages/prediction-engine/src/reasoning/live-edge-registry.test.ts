import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ENGINE_FAMILIES } from "./engine-weights.js";
import { LAC_BUF_EDGE, LAC_BUF_PARTS, LIVE_EDGE_PARTS } from "./live-edge-registry.js";

interface RegistryRow {
  family: string;
  signed: number;
  weight: number;
  signed_source: string;
  week_locked: string;
  signed_game_id: string;
}

describe("live edge registry", () => {
  it("names the nine parts already in the sum, once, at the engine prior, premise for the nine live rows", () => {
    expect(LIVE_EDGE_PARTS).toHaveLength(9);
    const ids = LIVE_EDGE_PARTS.map((part) => part.family);
    expect(new Set(ids).size).toBe(9);
    for (const part of LIVE_EDGE_PARTS) {
      const family = ENGINE_FAMILIES.find((row) => row.id === part.family);
      expect(family?.prior).toBe(part.prior);
      expect(["premise", "dark"]).toContain(family?.role);
      if (part.sibling) expect(part.siblingCap).toBe(0.15);
    }
    expect(ENGINE_FAMILIES.find((row) => row.id === "narrative_contract")?.role).toBe("dark");
    expect(LIVE_EDGE_PARTS.find((part) => part.family === "narrative_contract")?.prior).toBe(0.03);
    expect(LIVE_EDGE_PARTS.map((part) => part.family)).not.toContain("market_context");
  });

  it("keeps the LAC at BUF parts equal to the edge", () => {
    expect(LAC_BUF_PARTS.map((part) => part.family)).toEqual(LIVE_EDGE_PARTS.map((part) => part.family));
    const sum = LAC_BUF_PARTS.reduce((total, part) => total + part.points, 0);
    expect(sum).toBeCloseTo(LAC_BUF_EDGE, 12);
    for (const part of LAC_BUF_PARTS) {
      const prior = LIVE_EDGE_PARTS.find((row) => row.family === part.family)!.prior;
      expect(part.points).toBeCloseTo(prior * part.signed, 12);
      expect(Math.abs(part.points)).toBeLessThanOrEqual(prior + 1e-12);
    }
    expect(Math.abs(LAC_BUF_EDGE)).toBeLessThanOrEqual(0.68 + 1e-12);
  });

  it("matches the LAC at BUF row on disk", () => {
    const path = resolve(process.cwd(), "../../data/gse-dataset/current/week3-engine-readings.jsonl");
    const row = readFileSync(path, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { game_id: string; engine_edge: number; engine_edge_parts: { id: string; points: number }[]; publishes_pick: boolean })
      .find((item) => item.game_id === "2026_03_LAC_BUF");
    expect(row).toBeTruthy();
    expect(row!.publishes_pick).toBe(false);
    expect(row!.engine_edge).toBeCloseTo(LAC_BUF_EDGE, 12);
    expect(row!.engine_edge_parts.map((part) => part.id)).toEqual(LAC_BUF_PARTS.map((part) => part.family));
    const diskSum = row!.engine_edge_parts.reduce((total, part) => total + part.points, 0);
    expect(diskSum).toBeCloseTo(row!.engine_edge, 12);
  });

  it("matches the parts registry file the selector reads", () => {
    const path = resolve(process.cwd(), "../../data/reasoning/parts-registry.jsonl");
    const rows = readFileSync(path, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as RegistryRow);
    expect(rows.map((row) => row.family)).toEqual(LIVE_EDGE_PARTS.map((part) => part.family));
    for (const row of rows) {
      const frozen = LAC_BUF_PARTS.find((part) => part.family === row.family);
      const declared = LIVE_EDGE_PARTS.find((part) => part.family === row.family);
      expect(row.signed).toBeCloseTo(frozen!.signed, 12);
      expect(row.weight).toBe(declared!.prior);
      expect(row.signed_source.length).toBeGreaterThan(10);
      expect(row.week_locked).toBe("2026-W3");
      expect(row.signed_game_id).toBe("2026_03_LAC_BUF");
    }
  });
});
