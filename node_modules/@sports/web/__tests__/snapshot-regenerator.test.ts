import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Source-level invariants for scripts/regenerate-launch-snapshots.mjs.
 *
 * We can't easily *execute* it from a unit test (it needs a running
 * dev server). But we can pin that:
 *
 *   - It defines branches for 200 / 3xx / 503 / other 4xx+ / 0 status
 *   - It uses fetch with redirect: "manual" so we see 3xx explicitly
 *   - It writes a banner comment to every snapshot
 *   - It rewrites index.html each run
 */

const repoRoot = resolve(__dirname, "..", "..", "..");
const src = readFileSync(
  resolve(repoRoot, "scripts/regenerate-launch-snapshots.mjs"),
  "utf8"
);

describe("snapshot regenerator — script invariants", () => {
  it("uses fetch with redirect: 'manual'", () => {
    expect(src).toMatch(/redirect:\s*["']manual["']/);
  });

  it("emits a self-describing placeholder for status 0 (transport failure)", () => {
    expect(src).toMatch(/Snapshot fetch failed/);
  });

  it("emits a redirect placeholder for 3xx responses", () => {
    expect(src).toMatch(/Redirect for/);
  });

  it("emits a 503 placeholder noting the readiness gate", () => {
    expect(src).toMatch(/503 Service Unavailable/);
    expect(src).toMatch(/readiness gate/);
  });

  it("emits a generic 4xx placeholder", () => {
    expect(src).toMatch(/placeholderBody/);
    expect(src).toMatch(/status\s*>=\s*400/);
  });

  it("writes a banner comment with the source URL and generation timestamp", () => {
    expect(src).toMatch(/bannerFor\(/);
    expect(src).toMatch(/Generated:/);
  });

  it("rewrites index.html each run", () => {
    expect(src).toMatch(/index\.html/);
    expect(src).toMatch(/renderIndex\(lines\)/);
  });

  it("classifies 3xx + 503 as 'ok' for the result counter", () => {
    // The regenerator considers a 3xx (admin redirect to /auth/signin)
    // or a 503 (readiness-gated route) as expected behaviour, not a
    // failure. Pin this.
    expect(src).toMatch(/status\s*>=\s*300\s*&&\s*result\.status\s*<\s*400/);
    expect(src).toMatch(/result\.status\s*===\s*503/);
  });

  it("index.html includes status badges with colour per status class", () => {
    expect(src).toMatch(/statusBadgeColor\s*\(/);
    expect(src).toMatch(/statusBadgeLabel\s*\(/);
    // The five labels.
    expect(src).toMatch(/"OK"/);
    expect(src).toMatch(/"REDIR"/);
    expect(src).toMatch(/"GATED"/);
    expect(src).toMatch(/"ERR"/);
    expect(src).toMatch(/"DOWN"/);
  });

  it("index.html includes a legend explaining the badge labels", () => {
    expect(src).toMatch(/Legend:/);
  });
});
