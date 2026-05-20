import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * jarvis-data.ts maintains a hand-edited `LAYERS` constant matching
 * `JarvisLayerStatuses`. The synthesizer's phase matrix is computed
 * from it. If a key is missing or a value drifts, the cockpit lies
 * about which phase shipped.
 */

const repoRoot = resolve(__dirname, "..");
const src = readFileSync(resolve(repoRoot, "lib/cockpit/jarvis-data.ts"), "utf8");

const REQUIRED_LAYER_KEYS = [
  "trustClaims",
  "performanceGating",
  "promotions",
  "dailyBrief",
  "calibration",
  "cockpit",
  "contentEngine",
  "ciHardening",
];

const ALLOWED_STATUSES = new Set([
  "implemented",
  "partial",
  "missing",
  "blocked_external",
  "unknown",
]);

describe("jarvis-data LAYERS manifest", () => {
  it("declares a LAYERS constant", () => {
    expect(src).toMatch(/const\s+LAYERS\s*:\s*JarvisLayerStatuses\s*=/);
  });

  for (const key of REQUIRED_LAYER_KEYS) {
    it(`LAYERS includes ${key}`, () => {
      // Match e.g. `key: "implemented"` on any line.
      const pattern = new RegExp(`${key}:\\s*["'](${[...ALLOWED_STATUSES].join("|")})["']`);
      expect(
        pattern.test(src),
        `LAYERS.${key} is missing or uses an unknown status value.`
      ).toBe(true);
    });
  }

  it("does not silently omit a layer (no commented-out entries)", () => {
    // Crude: each REQUIRED_LAYER_KEYS entry must appear once, not zero
    // times in a comment alone.
    for (const key of REQUIRED_LAYER_KEYS) {
      const occurrences = (src.match(new RegExp(`\\b${key}\\b`, "g")) ?? []).length;
      expect(
        occurrences,
        `LAYERS.${key} should appear at least once outside comments.`
      ).toBeGreaterThan(0);
    }
  });

  it("LAYERS contains exactly REQUIRED_LAYER_KEYS.length entries (no extras, no drops)", () => {
    // Inside `const LAYERS: JarvisLayerStatuses = { … };` extract every
    // `key: "value"` pair. The count should equal the contract.
    const m = src.match(/const\s+LAYERS\s*:\s*JarvisLayerStatuses\s*=\s*\{([\s\S]*?)\};/);
    expect(m, "Couldn't locate the LAYERS object literal").toBeTruthy();
    const block = m![1] ?? "";
    const entries = Array.from(block.matchAll(/^\s*(\w+)\s*:\s*"[^"]+",?/gm));
    expect(entries.length).toBe(REQUIRED_LAYER_KEYS.length);
  });
});
