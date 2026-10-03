import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getEntitlements } from "@sports/types";
import { publicEdgeScore } from "@/lib/picks/public-edge-score";

/**
 * Money-path audit MP-02 (2026-09-05): on every signal-slate pick the public
 * edgeScore equals the hidden confidence minus 50, so a FREE viewer recovered the
 * paid number with one subtraction (live anonymous payload: edgeScore 18, teaser
 * "68%"). Book-priced rows keep the Edge Index for every tier.
 */
const FREE = getEntitlements("FREE");
const PRO = getEntitlements("PRO");
const FANTASY = getEntitlements("FANTASY");

describe("publicEdgeScore", () => {
  it("withholds the edge on a book-less row from viewers who cannot see confidence", () => {
    expect(FREE.canSeeEdgeScore).toBe(true);
    expect(FREE.canSeeConfidence).toBe(false);
    expect(publicEdgeScore({ edgeScore: 18, bookmakerCount: 0 }, FREE)).toBeNull();
    expect(publicEdgeScore({ edgeScore: 18, bookmakerCount: 0 }, FANTASY)).toBeNull();
  });

  it("keeps the Edge Index on book-priced rows for every tier", () => {
    expect(publicEdgeScore({ edgeScore: 62, bookmakerCount: 7 }, FREE)).toBe(62);
    expect(publicEdgeScore({ edgeScore: 62, bookmakerCount: 7 }, PRO)).toBe(62);
  });

  it("shows confidence buyers the signal-row edge (they can see the number anyway)", () => {
    expect(PRO.canSeeConfidence).toBe(true);
    expect(publicEdgeScore({ edgeScore: 18, bookmakerCount: 0 }, PRO)).toBe(18);
  });

  it("respects canSeeEdgeScore=false regardless of market", () => {
    expect(publicEdgeScore({ edgeScore: 62, bookmakerCount: 7 }, { canSeeEdgeScore: false, canSeeConfidence: true })).toBeNull();
  });
});

describe("public surfaces route the edge through publicEdgeScore", () => {
  const root = resolve(__dirname, "..");
  it("/api/picks", () => {
    const src = readFileSync(resolve(root, "app/api/picks/route.ts"), "utf8");
    expect(src).toContain('from "@/lib/picks/public-edge-score"');
    expect(src).toMatch(/edgeScore:\s*publicEdgeScore\(pick,\s*entitlements\)/);
    expect(src).not.toMatch(/edgeScore:\s*entitlements\.canSeeEdgeScore\s*\?\s*pick\.edgeScore/);
  });
  it("board state rows", () => {
    const src = readFileSync(resolve(root, "lib/board/state.ts"), "utf8");
    expect(src).toContain('from "@/lib/picks/public-edge-score"');
    expect(src).toMatch(/publicEdgeScore\(pick,\s*\{\s*canSeeEdgeScore:\s*true,\s*canSeeConfidence:\s*isPremiumViewer\s*\}\)/);
  });
});
