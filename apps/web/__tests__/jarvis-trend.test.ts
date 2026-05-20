import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * JarvisTrend component — source-level invariants.
 *
 * The component is purely visual, but a source-level test pins the
 * contract so a future refactor doesn't strip the accessibility label or
 * the empty-state handler. The full visual rendering is verified by eye
 * in the cockpit; here we just guard the API.
 */

const repoRoot = resolve(__dirname, "..");
const src = readFileSync(
  resolve(repoRoot, "components/cockpit/jarvis-trend.tsx"),
  "utf8"
);

describe("JarvisTrend component contract", () => {
  it("exports a JarvisTrend function and JarvisTrendProps type", () => {
    expect(src).toMatch(/export\s+function\s+JarvisTrend/);
    expect(src).toMatch(/export\s+interface\s+JarvisTrendProps/);
  });

  it("renders an empty state with a data-testid when snapshots is empty", () => {
    expect(src).toMatch(/jarvis-trend-empty/);
    expect(src).toMatch(/No trend data yet/);
  });

  it("includes an aria-label that lists the recent launch statuses", () => {
    expect(src).toMatch(/aria-label=\{`Recent launch status:/);
  });

  it("color-codes every JarvisLaunchStatus value", () => {
    // Must mention each launch status string so the tone map stays in sync.
    for (const status of [
      "LAUNCH_READY",
      "LAUNCH_READY_PENDING_EXTERNAL_CONFIG",
      "NOT_READY_DATA",
      "NOT_READY_VALIDATION",
      "NOT_READY_SAFETY",
      "UNKNOWN",
    ]) {
      expect(src).toContain(status);
    }
  });

  it("does not introduce a side effect (no fetch, no Math.random)", () => {
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/Math\.random/);
  });
});
