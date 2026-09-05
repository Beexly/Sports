import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { stripProbabilityFromTeaser, teaserForViewer } from "@/lib/picks/teaser-text";

describe("stripProbabilityFromTeaser", () => {
  it("removes the signal-slate percentage that leaked the gated confidence number", () => {
    expect(stripProbabilityFromTeaser("Cincinnati Bearcats model signal @ 68% (espn_powerindex).")).toBe(
      "Cincinnati Bearcats model signal (espn_powerindex).",
    );
    expect(
      stripProbabilityFromTeaser(
        "Model signal (no book line): Ole Miss Rebels priced at 67% by independent sources [espn_powerindex]. Not a sportsbook quote.",
      ),
    ).toBe("Model signal (no book line): Ole Miss Rebels by independent sources [espn_powerindex]. Not a sportsbook quote.");
  });

  it("leaves text without a probability untouched", () => {
    const s = "Chiefs -3.5 backed by 9 of 11 books; line moved 1.0 toward Kansas City.";
    expect(stripProbabilityFromTeaser(s)).toBe(s);
    expect(stripProbabilityFromTeaser("")).toBe("");
  });

  it("is applied only to viewers who cannot see confidence", () => {
    const raw = "Nashville SC model signal @ 71% (clubelo).";
    expect(teaserForViewer(raw, true)).toBe(raw);
    expect(teaserForViewer(raw, false)).not.toMatch(/\d+\s*%/);
  });
});

describe("/api/picks wires the teaser scrub", () => {
  const routeSrc = readFileSync(resolve(__dirname, "..", "app/api/picks/route.ts"), "utf8");
  it("passes both reasoning fields through teaserForViewer keyed on canSeeConfidence", () => {
    expect(routeSrc).toContain('from "@/lib/picks/teaser-text"');
    const calls = routeSrc.match(/teaserForViewer\(/g) ?? [];
    const keyedOnConfidence = routeSrc.match(/entitlements\.canSeeConfidence\)/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(keyedOnConfidence.length).toBeGreaterThanOrEqual(2);
    // Both reasoning fields, not just one, go through the scrub.
    expect(routeSrc).toMatch(/reasoningShort:\s*teaserForViewer\(pick\.reasoningShort,\s*entitlements\.canSeeConfidence\)/);
  });
});
