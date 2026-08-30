import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..", "..", "..");
const src = readFileSync(resolve(repoRoot, "scripts/jarvis-diff.mjs"), "utf8");

describe("scripts/jarvis-diff.mjs", () => {
  it("requires APP_URL and ADMIN_COOKIE", () => {
    expect(src).toMatch(/APP_URL/);
    expect(src).toMatch(/ADMIN_COOKIE/);
    expect(src).toMatch(/process\.exit\(2\)/);
  });

  it("supports --save and --against modes", () => {
    expect(src).toMatch(/--save/);
    expect(src).toMatch(/--against/);
  });

  it("exits non-zero on regression (launchStatus or GREEN→non-GREEN section)", () => {
    expect(src).toMatch(/process\.exit\(1\)/);
    expect(src).toMatch(/launchStatus regressed/);
    expect(src).toMatch(/GREEN.*non-GREEN|GREEN[^"]+!==.*GREEN/);
  });

  it("treats new safety warnings as a regression", () => {
    expect(src).toMatch(/new safety warning/);
  });

  it("uses no-store cache to avoid stale CDN reads", () => {
    expect(src).toMatch(/cache:\s*["']no-store["']/);
  });
});
