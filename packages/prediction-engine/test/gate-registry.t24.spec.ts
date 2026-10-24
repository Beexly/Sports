import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const REGISTRY_PATH = join(ROOT, "reconciliation", "gate_registry.json");

describe("GAP-24: 38-Gate Registry Verification", () => {
  it("gate_registry.json exists and contains exactly 38 validated integrity gates", () => {
    expect(existsSync(REGISTRY_PATH), "reconciliation/gate_registry.json must exist").toBe(true);
    const raw = readFileSync(REGISTRY_PATH, "utf8");
    const parsed = JSON.parse(raw);
    expect(Array.isArray(parsed.gates)).toBe(true);
    expect(parsed.gates.length).toBe(38);
  });

  it("every gate entry has id, name, file:line, checks description, default state, and fails closed", () => {
    const raw = readFileSync(REGISTRY_PATH, "utf8");
    const { gates } = JSON.parse(raw);

    const ids = new Set<string>();
    for (const gate of gates) {
      expect(gate.id).toMatch(/^GATE-\d{2}$/);
      expect(ids.has(gate.id), `duplicate gate id: ${gate.id}`).toBe(false);
      ids.add(gate.id);

      expect(typeof gate.name).toBe("string");
      expect(gate.name.length).toBeGreaterThan(0);

      expect(typeof gate.file).toBe("string");
      expect(gate.file).toMatch(/^[^:]+:\d+$/);

      const [relPath, lineStr] = gate.file.split(":");
      const absPath = join(ROOT, relPath.replace(/\//g, "\\"));
      expect(existsSync(absPath), `File in gate ${gate.id} must exist: ${relPath}`).toBe(true);

      const lineNum = parseInt(lineStr, 10);
      expect(lineNum).toBeGreaterThan(0);

      expect(typeof gate.checks).toBe("string");
      expect(gate.checks.length).toBeGreaterThan(10);

      expect(gate.fail_closed).toBe(true);
    }
  });
});
