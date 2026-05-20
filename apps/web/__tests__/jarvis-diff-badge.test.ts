import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(
  resolve(__dirname, "..", "components/cockpit/jarvis-diff-badge.tsx"),
  "utf8"
);

describe("JarvisDiffBadge — source contract", () => {
  it("exports the component + props type", () => {
    expect(src).toMatch(/export\s+function\s+JarvisDiffBadge/);
    expect(src).toMatch(/export\s+interface\s+JarvisDiffBadgeProps/);
  });

  it("returns null when recent.length < 2 (no render before two assessments)", () => {
    expect(src).toMatch(/recent\.length\s*<\s*2[\s\S]*return\s+null/);
  });

  it("emits data-state attribute reflecting 'unchanged' or 'changed'", () => {
    expect(src).toMatch(/data-state="unchanged"/);
    expect(src).toMatch(/data-state="changed"/);
  });

  it("uses snapshots in (newest, previous) order as documented", () => {
    expect(src).toMatch(/const\s+\[current,\s*previous\]\s*=\s*recent/);
  });

  it("includes a title attribute carrying the full change list", () => {
    expect(src).toMatch(/title=\{changes\.join\("\\n"\)\}/);
  });

  it("references the canonical sectional fields it diffs", () => {
    for (const k of [
      "ingestionStatus",
      "settlementStatus",
      "canonicalHistoryStatus",
      "signalCoverageStatus",
      "publicSurfaceStatus",
    ]) {
      expect(src).toContain(`"${k}"`);
    }
  });
});
