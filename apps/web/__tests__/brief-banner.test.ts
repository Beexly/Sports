import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..");
const briefSrc = readFileSync(resolve(repoRoot, "app/brief/page.tsx"), "utf8");
const perfSrc = readFileSync(resolve(repoRoot, "app/performance/page.tsx"), "utf8");

/**
 * Source-level invariants for the brief and performance pick-count
 * banners — small live indicators that show picks are publishing even
 * when the page itself is gated.
 */

describe("/brief — today's slate panel", () => {
  it("imports the demo-mode flags", () => {
    expect(briefSrc).toMatch(/isStubMode\b/);
    expect(briefSrc).toMatch(/isDemoPicksEnabled\b/);
  });

  it("renders a data-testid=\"brief-pick-count\" panel when count > 0", () => {
    expect(briefSrc).toMatch(/data-testid="brief-pick-count"/);
    expect(briefSrc).toMatch(/todayPickCount > 0/);
  });

  it("links the brief panel to /picks", () => {
    expect(briefSrc).toMatch(/href="\/picks"/);
  });

  it("still renders the 1-800-GAMBLER line", () => {
    expect(briefSrc).toMatch(/1-800-GAMBLER/);
  });
});

describe("/performance — pick-count banner above the bootstrap state", () => {
  it("renders the banner above PerformanceBootstrapState when count > 0", () => {
    expect(perfSrc).toMatch(/data-testid="performance-pick-count-banner"/);
    expect(perfSrc).toMatch(/todayPickCount > 0/);
    expect(perfSrc).toMatch(/<PerformanceBootstrapState/);
  });

  it("never claims a verified record on the gate-closed branch", () => {
    expect(perfSrc).toMatch(/!gates\.canExposePerformanceStats/);
    // The banner explicitly says win-rate aggregation is gated.
    expect(perfSrc).toMatch(/aggregation is gated/);
  });
});
