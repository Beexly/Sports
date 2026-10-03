import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * /clv page — honesty contract (source-level).
 *
 * The public CLV report must obey the same gate-until-defensible discipline as
 * the win rate: it loads the policy, gates on it, and never renders a beat-close
 * number outside the allowed branch.
 */
const repoRoot = resolve(__dirname, "..");
const src = readFileSync(resolve(repoRoot, "app/clv/page.tsx"), "utf8");

describe("/clv page contract", () => {
  it("loads the CLV policy and the readiness gates", () => {
    expect(src).toMatch(/loadPublicClvPolicy/);
    expect(src).toMatch(/getReadinessGates/);
  });

  it("branches on canExposeClv and shows an honest gated state", () => {
    expect(src).toMatch(/policy\??\.?\s*\.?canExposeClv/);
    expect(src).toMatch(/data-testid="clv-gated"/);
  });

  it("only renders the beat-close rate inside the scoreboard (allowed) branch", () => {
    // The percentage must live in ClvScoreboard, which is gated behind
    // canExposeClv — never in the gated-state component.
    const gatedStart = src.indexOf("function ClvGatedState");
    const gatedEnd = src.indexOf("function ClvScoreboard");
    expect(gatedStart).toBeGreaterThan(-1);
    expect(gatedEnd).toBeGreaterThan(gatedStart);
    const gatedBody = src.slice(gatedStart, gatedEnd);
    expect(gatedBody).not.toMatch(/beatCloseRatePct/);
  });

  it("carries a risk disclosure", () => {
    expect(src).toMatch(/RiskDisclosure/);
  });

  it("loads CLV coverage to surface the denominator behind the beat-close rate", () => {
    expect(src).toMatch(/loadClvCoverage/);
  });

  it("renders coverage alongside the beat-close rate (never the reverse)", () => {
    // The coverage display must live inside ClvScoreboard (the allowed branch),
    // not inside ClvGatedState (the gated branch) — coverage only matters once
    // the rate is actually published.
    const gatedStart = src.indexOf("function ClvGatedState");
    const scoreboardStart = src.indexOf("function ClvScoreboard");
    const gated = src.slice(gatedStart, scoreboardStart);
    const scoreboard = src.slice(scoreboardStart);
    expect(scoreboard).toMatch(/data-testid="clv-coverage"/);
    expect(gated).not.toMatch(/data-testid="clv-coverage"/);
  });

  it("passes coverage through to ClvScoreboard", () => {
    // The coverage prop must be wired into the scoreboard so the denominator
    // is visible wherever the rate renders.
    expect(src).toMatch(/<ClvScoreboard policy=\{policy\} coverage=\{coverage\} \/>/);
  });
});
