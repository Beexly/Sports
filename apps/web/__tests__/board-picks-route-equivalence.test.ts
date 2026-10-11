import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Architectural Consolidation: Board vs Picks Single-Route Architecture.
 *
 * In accordance with ASTRA Milestone 1:
 * /picks is consolidated into the authoritative /board route:
 * 1. next.config.mjs issues a 301 permanent redirect /picks -> /board.
 * 2. /board is the authoritative canonical route for all signals.
 * 3. /board houses two distinct tabs: "Actionable Signals" and "Gated & Held Games".
 * 4. Desktop and mobile navigation menus show only "The Board" for primary signals.
 * 5. app/picks/page.tsx executes a runtime redirect to /board.
 */

const webRoot = resolve(__dirname, "..");
const read = (rel: string) => readFileSync(resolve(webRoot, rel), "utf8");

describe("Board and Picks single-board architectural consolidation", () => {
  it("redirects /picks to /board via permanent 301 redirect in next.config.mjs", async () => {
    const configPath = resolve(webRoot, "next.config.mjs");
    expect(existsSync(configPath)).toBe(true);
    const configModule = await import(configPath);
    const config = configModule.default ?? configModule;
    const redirects = typeof config.redirects === "function" ? await config.redirects() : [];
    const picksRedirect = redirects.find((r: { source: string }) => r.source === "/picks");
    expect(picksRedirect).toBeDefined();
    expect(picksRedirect?.destination).toBe("/board");
    expect(picksRedirect?.permanent).toBe(true);
  });

  it("/board is the single authoritative signals route with canonical /board", () => {
    expect(existsSync(resolve(webRoot, "app/board/page.tsx"))).toBe(true);
    const board = read("app/board/page.tsx");
    expect(board).toContain('canonical: "/board"');
    expect(board).not.toMatch(/href=["']\/picks["']/);
  });

  it("/board provides two distinct tabs: Actionable Signals and Gated & Held Games", () => {
    const board = read("app/board/page.tsx");
    expect(board).toMatch(/Actionable Signals/i);
    expect(board).toMatch(/Gated\s*(&|and)\s*Held\s*Games/i);
    expect(board).toMatch(/tab.*signals/i);
    expect(board).toMatch(/tab.*held/i);
  });

  it("desktop and mobile navigation menus feature 'The Board' and contain no /picks links", () => {
    const nav = read("components/ui/nav.tsx");
    const mobileNav = read("components/ui/mobile-nav.tsx");

    expect(nav).toContain('href: "/board"');
    expect(nav).toMatch(/label:\s*"The [Bb]oard"/);
    expect(nav).not.toMatch(/href:\s*["']\/picks["']/);

    expect(mobileNav).toMatch(/href:\s*["']\/board["']/);
    expect(mobileNav).not.toMatch(/href:\s*["']\/picks["']/);
  });

  it("app/picks/page.tsx executes a runtime redirect to /board", () => {
    expect(existsSync(resolve(webRoot, "app/picks/page.tsx"))).toBe(true);
    const picks = read("app/picks/page.tsx");
    expect(picks).toMatch(/redirect\(\s*.*["']\/board/);
  });
});
