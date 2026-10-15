/**
 * Registry integrity test — gate-wiring shadow registry (batch 1).
 * Asserts the registry's doctrine invariants mechanically: every entry
 * is weight 0, shadow-registered, sign-audited, and points at a file
 * that exists in the repo tree.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../..");
const registry = JSON.parse(
  readFileSync(resolve(here, "shadow-registry.json"), "utf8"),
) as {
  doctrine: { weight: number; emission: string };
  entries: Array<{
    sweep_id: string;
    file: string;
    weight: number;
    status: string;
    mu_contact: string;
    sign_audit: string;
    characterization: string[];
  }>;
};

describe("shadow registry — batch 1 invariants", () => {
  it("declares weight 0 and ZERO_OBJECT emission doctrine", () => {
    expect(registry.doctrine.weight).toBe(0);
    expect(registry.doctrine.emission).toBe("ZERO_OBJECT");
  });

  it("registers exactly the five batch-1 sweep ids", () => {
    expect(registry.entries.map((e) => e.sweep_id).sort()).toEqual(
      ["G-21", "G-22", "G-25", "PE-048", "PE-125"].sort(),
    );
  });

  it("every entry is weight 0, shadow-registered, μ-free, and audited", () => {
    for (const e of registry.entries) {
      expect(e.weight, e.sweep_id).toBe(0);
      expect(e.status, e.sweep_id).toBe("shadow-registered");
      expect(e.mu_contact, e.sweep_id).toBe("none");
      expect(e.sign_audit.startsWith("pass"), e.sweep_id).toBe(true);
      expect(e.characterization.length, e.sweep_id).toBeGreaterThan(0);
    }
  });

  it("every registered module file and characterization file exists", () => {
    for (const e of registry.entries) {
      expect(existsSync(resolve(repoRoot, e.file)), e.file).toBe(true);
      for (const t of e.characterization) {
        const path = t.split(" ")[0]!;
        if (!path.endsWith(".ts")) continue; // prose pin summaries, not paths
        expect(existsSync(resolve(repoRoot, path)), path).toBe(true);
      }
    }
  });
});
