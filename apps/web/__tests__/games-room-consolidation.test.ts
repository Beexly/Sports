import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import nextConfig from "../next.config.mjs";

/**
 * Takeover build. /games/[gameId] was a shallow duplicate of the richer
 * /room/[gameId] (Game Intelligence Room). Two things had to change together:
 *
 *   1. /slate/[sport] was the only live in-app link to the shallow page; it now
 *      points at /room/[gameId].
 *   2. A config redirect keeps old deep links to /games/<id> resolving into the
 *      good surface instead of a second reading page with no in-app links.
 *
 * The page file itself stays in the tree as a working fallback if the redirect
 * list is ever trimmed — same posture as the players-lab aliases (C-329).
 *
 * This test pins all three halves so a future edit cannot quietly split them:
 * unlinking without redirecting leaves dead deep links, and redirecting while
 * still linking /games recreates the duplicate.
 */

const ROOT = resolve(__dirname, "..");

interface RedirectEntry {
  readonly source: string;
  readonly destination: string;
}

async function configRedirects(): Promise<readonly RedirectEntry[]> {
  const config = nextConfig as unknown as { redirects?: () => Promise<readonly RedirectEntry[]> };
  return (await config.redirects?.()) ?? [];
}

/** Every .ts/.tsx file under a directory, recursively. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = resolve(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
    } else if (name.endsWith(".tsx") || name.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

describe("the game reading surface is the room, not a duplicate (takeover-build)", () => {
  it("slate entries link to /room/[gameId], not /games/[gameId]", () => {
    const src = readFileSync(resolve(ROOT, "app/slate/[sport]/page.tsx"), "utf8");
    expect(src).toContain("/room/${game.gameId}");
    expect(src).not.toContain("/games/${game.gameId}");
  });

  it("config carries /games/:gameId -> /room/:gameId", async () => {
    const bySource = new Map((await configRedirects()).map((r) => [r.source, r.destination]));
    expect(bySource.get("/games/:gameId")).toBe("/room/:gameId");
  });

  it("the room page still exists as the redirect destination", () => {
    const src = readFileSync(resolve(ROOT, "app/room/[gameId]/page.tsx"), "utf8");
    expect(src).toContain("loadGameRoom");
  });

  it("no in-app surface links /games/ any more", () => {
    // The games/[gameId] page itself is excluded: it is the retained fallback
    // kept alive by this redirect list, same as the player-lab stubs.
    // Only LINK targets matter here: `@/lib/games/...` imports are the module
    // path, not a route.
    const offenders: string[] = [];
    for (const file of sourceFiles(resolve(ROOT, "app")).concat(sourceFiles(resolve(ROOT, "components")))) {
      if (file.includes(resolve(ROOT, "app", "games"))) continue;
      const src = readFileSync(file, "utf8");
      if (/href[=:]\s*["'`{]?\s*[`"']?\/games\//.test(src) || /router\.push\(\s*[`"']\/games\//.test(src)) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });
});
