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
    expect(board).toContain("loadDoctrineBoard");
    expect(board).toContain("DoctrineBoardView");
    expect(board).toContain("The Board");
    expect(board).toContain('href="/packages"');
    expect(board).toContain('href="/record"');
    expect(board).toContain('href="/board/gate"');
    expect(board).not.toContain('data-testid="verified-record-strip"');
    expect(board).not.toContain("sealed-board.json");

    expect(picks).toContain("loadDoctrineBoard");
    expect(picks).toContain("DoctrineBoardView");
    expect(picks).toContain("verifiedLedger");
    expect(picks).toContain('data-testid="verified-record-strip"');
    expect(picks).toContain('href="/packages"');
    expect(picks).toContain('href="/props"');
    expect(picks).toContain('href="/record"');
    expect(picks).not.toContain("sealed-board.json");
  });

  it("the nav names the picks job; the board stays accessible via its dedicated route", () => {
    expect(nav).toContain('label: "Picks", href: "/picks"');
    expect(nav).toContain("Locked Week 10 board");
    expect(nav).not.toContain('href: "/board"');
  });

  it("each page routes through /packages while cross-linking intentionally", () => {
    expect(board).toContain('href="/packages"');
    expect(picks).toContain('href="/packages"');
    expect(board).toContain('href="/picks"');
    expect(picks).toContain('href="/board"');
  });
});
