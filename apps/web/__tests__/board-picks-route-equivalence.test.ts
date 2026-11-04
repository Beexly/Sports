import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * L3 - Board vs Picks route equivalence / differentiation contract.
 *
 * /board and /picks are different jobs, not two doors to the same room:
 * Board = the under-construction stub that routes to GALAXY PICKS (PAID)
 * and DFS; Picks = the sealed Week 8 locked board (publish-allowed rows
 * only, seal digest as provenance). The failure this locks out: two
 * surfaces that never acknowledge each other, so a first-time visitor
 * cannot tell them apart or move between them. Each page therefore names
 * its own job and routes onward (both through /packages, the shared
 * funnel), while keeping its own data source, canonical, and tier
 * behavior.
 *
 * REPOINTS (2026-11-04 board-cluster triage): the live-board era asserted
 * loadBoardState/Gated-today on /board and daily-slate on /picks, nav
 * labels for both, and mutual cross-links. /board is now the deliberate
 * under-construction stub and /picks the static sealed card (owner
 * commits), so each assertion below pins the CURRENT job of each page
 * rather than the retired implementation. Prohibitions carried over:
 * distinct canonicals, no redirect between the routes, /picks renders
 * ONLY publishAllowed && PUBLISH rows, /board renders no live rows.
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
    // BOARD (this era): the under-construction stub. Its job is to say the
    // live board is parked and route to the two live surfaces. It must not
    // fetch or render any board rows.
    expect(board).toMatch(/under-construction-notice/);
    expect(board).toContain('href="/packages"');
    expect(board).toContain('href="/fantasy/dfs"');
    expect(board).not.toContain("loadBoardState");
    expect(board).not.toContain("sealed-board.json");

    // PICKS (this era): the sealed Week 8 locked board, read from the
    // static sealed card. Its job is to show ONLY publish-allowed rows and
    // name the seal as provenance.
    expect(picks).toContain("sealed-board.json");
    expect(picks).toMatch(/SealedTable/);
    expect(picks).toContain("publishAllowed && row.decision === \"PUBLISH\"");
    expect(picks).toContain("card.seal_digest");
    expect(picks).toContain('href="/packages"');
    expect(picks).toContain('href="/props"');
  });

  it("the nav names the picks job; the parked board is deliberately not a front door", () => {
    // /picks is one of the four revenue pillars, named with its job.
    expect(nav).toContain('label: "Picks", href: "/picks"');
    expect(nav).toContain("Locked Week 8 board");
    // /board is under construction: it is deliberately ABSENT from the nav
    // so it can never be mistaken for a live front door. The picks pillar
    // must not be the board (distinct jobs, distinct doors).
    expect(nav).not.toContain('href: "/board"');
  });

  it("each page routes onward with its job named; neither links the other", () => {
    // The visitor's route between the two jobs is the shared /packages
    // funnel, not a direct link between two surfaces that do different
    // things. A direct board<->picks link would imply they are the same
    // job; the prohibition is that they never present as interchangeable.
    expect(board).toContain('href="/packages"');
    expect(picks).toContain('href="/packages"');
    expect(board).not.toMatch(/href="\/picks"/);
    expect(picks).not.toMatch(/href="\/board"/);
  });
});
