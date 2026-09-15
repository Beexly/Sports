import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * L3 — Board vs Picks route equivalence / differentiation contract.
 *
 * /board and /picks are different jobs, not two doors to the same room:
 * Board = the full scored pipeline (scoring now, cleared, held with reasons,
 * gated today, calibration); Picks = today's published picks with reasoning
 * under a daily limit. The failure this locks out: two surfaces that never
 * acknowledge each other, so a first-time visitor cannot tell them apart or
 * move between them. Each page therefore cross-links the other with its job
 * named, while keeping its own data source, canonical, and tier behavior.
 */

const webRoot = resolve(__dirname, "..");
const read = (rel: string) => readFileSync(resolve(webRoot, rel), "utf8");

const board = read("app/board/page.tsx");
const picks = read("app/picks/page.tsx");
const nav = read("components/ui/nav.tsx");

describe("Board vs Picks differentiation", () => {
  it("both routes exist as independent pages with distinct canonicals, no redirect", () => {
    expect(existsSync(resolve(webRoot, "app/board/page.tsx"))).toBe(true);
    expect(existsSync(resolve(webRoot, "app/picks/page.tsx"))).toBe(true);
    expect(board).toContain('canonical: "/board"');
    expect(picks).toContain('canonical: "/picks"');
    expect(board).not.toMatch(/redirect\(["']\/picks["']/);
    expect(picks).not.toMatch(/redirect\(["']\/board["']/);
  });

  it("each page keeps its own job and data source", () => {
    expect(board).toContain("loadBoardState");
    expect(board).toMatch(/Gated today|gatedToday/);
    expect(picks).toContain("daily-slate");
    expect(picks).toMatch(/dailyPickLimit|hitDailyLimit/);
  });

  it("the nav names them as different jobs", () => {
    // C-360: Board is a NavMenu (`label="Board" href="/board"`); Picks is a
    // plain Link (`href="/picks"` + child text). Match the route, not one
    // authoring shape.
    expect(nav).toMatch(/href=["']\/board["']/);
    expect(nav).toMatch(/href=["']\/picks["']/);
    expect(nav).toMatch(/label="Board"|>\s*Board\s*</);
    expect(nav).toMatch(/>\s*Picks\s*</);
  });

  it("each page cross-links the other with its job named", () => {
    expect(board).toMatch(/href="\/picks"/);
    expect(picks).toMatch(/href="\/board"/);
  });
});
