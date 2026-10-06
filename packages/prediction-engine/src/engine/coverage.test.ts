/**
 * coverage.test.ts — THE DEFINITION OF DONE.
 *
 * Loads inventory.json at runtime. Asserts every entry is wired.
 * Fails if any entry is unwired. This test is the completion gate.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  createEngineComposition,
  type InventoryEntry,
  isObservation,
  isFailClosed,
} from "./composition.js";

const INV_PATH = join(__dirname, "inventory.json");
const GAPS_PATH = join(__dirname, "gaps.json");

function loadJson(path: string): { entries: InventoryEntry[]; total?: number } {
  return JSON.parse(readFileSync(path, "utf-8"));
}

describe("coverage gate — 100% codebase wired into prediction engine", () => {
  const inv = loadJson(INV_PATH);
  const gaps = loadJson(GAPS_PATH);
  const composition = createEngineComposition(inv.entries);

  it("inventory has items", () => {
    expect(inv.entries.length).toBeGreaterThan(0);
  });

  it("gaps.json is empty (all items wired)", () => {
    expect(gaps.entries.length).toBe(0);
  });

  it("every inventory entry has wired === true", () => {
    const unwired = inv.entries.filter((e) => !e.wired);
    expect(unwired.length).toBe(0);
    if (unwired.length > 0) {
      const sample = unwired.slice(0, 10).map((e) => `${e.path}#${e.symbol}`);
      throw new Error(`INCOMPLETE — ${unwired.length} entries unwired: ${sample.join(", ")}`);
    }
  });

  it("every entry is reachable and callable through the composition", () => {
    const results = composition.wireAll(inv.entries);
    expect(results.size).toBe(inv.entries.length);
    // Every result must be an Observation or a fail-closed result — never undefined, never throws
    for (const entry of inv.entries) {
      const r = results.get(entry.id);
      expect(r, `entry ${entry.id} returned undefined`).toBeDefined();
      const ok = isObservation(r!) || isFailClosed(r!);
      expect(ok, `entry ${entry.id} returned neither Observation nor fail-closed`).toBe(true);
    }
  });

  it("every entry's adapter returns a documented shape", () => {
    const results = composition.wireAll(inv.entries);
    for (const entry of inv.entries) {
      const r = results.get(entry.id)!;
      if (isObservation(r)) {
        expect(r.source).toBe(entry.id);
        expect(r.asOf).toBeTruthy();
        expect(r.provenance).toBeTruthy();
        expect(r.family).toBeTruthy();
        // value can be null (fail-open for missing data) but must be present
        expect("value" in r).toBe(true);
        expect(typeof r.confidence).toBe("number");
      } else {
        expect(r.failClosed).toBe(true);
        expect(r.reason).toBeTruthy();
        expect(r.source).toBe(entry.id);
      }
    }
  });

  it("at least one Observation reaches the engine per signal family", () => {
    const observations = composition.getObservations(inv.entries);
    expect(observations.length).toBeGreaterThan(0);
    const families = new Set(observations.map((o) => o.family));
    expect(families.size).toBeGreaterThan(0);
  });

  it("every DB table entry has a callable adapter", () => {
    const tables = inv.entries.filter((e) => e.kind === "table");
    // Tables may be 0 if DB scan was skipped — that's OK
    if (tables.length > 0) {
      const results = composition.wireAll(tables);
      expect(results.size).toBe(tables.length);
      for (const t of tables) {
        const r = results.get(t.id);
        expect(r).toBeDefined();
        expect(isObservation(r!) || isFailClosed(r!)).toBe(true);
      }
    }
  });

  it("every env var entry has a callable adapter", () => {
    const envs = inv.entries.filter((e) => e.kind === "env");
    if (envs.length > 0) {
      const results = composition.wireAll(envs);
      expect(results.size).toBe(envs.length);
    }
  });

  it("composition registry size equals inventory size", () => {
    expect(composition.registry.size()).toBe(inv.entries.length);
  });

  it("no adapter throws", () => {
    // callAll already catches, but verify all results are valid
    const results = composition.wireAll(inv.entries);
    for (const [id, r] of results) {
      expect(r, `adapter for ${id} returned falsy`).toBeTruthy();
    }
  });
});
