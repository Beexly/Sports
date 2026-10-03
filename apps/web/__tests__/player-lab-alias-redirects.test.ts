import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import nextConfig from "../next.config.mjs";

/**
 * C-329. The ten legacy player-lab aliases (`/players/snaps`, `/players/qbr`, ...)
 * each have a one-line `redirect()` stub in app/players/<view>/page.tsx. That stub
 * ALONE is not enough: `app/players/loading.tsx` exists (the hub needs a skeleton),
 * and a segment-level loading boundary makes Next STREAM that skeleton instead of
 * returning a status — so a document request answered 200 with 109 characters of
 * "Loading players ..." and no data, and a crawler saw ten empty pages behind a
 * route the nav advertises. The identical stubs under /intelligence and /stats
 * return 307 because those segments have no loading.tsx.
 *
 * The fix is a `redirects()` entry per alias, which is resolved before the
 * filesystem routes and therefore never renders the shell. These tests make that
 * pairing a failing build rather than a comment: adding a new alias stub without a
 * config entry fails here, and so does pointing one at a different destination.
 */

const ROOT = resolve(__dirname, "..");
const PLAYERS = resolve(ROOT, "app/players");

interface RedirectEntry {
  readonly source: string;
  readonly destination: string;
}

async function configRedirects(): Promise<readonly RedirectEntry[]> {
  const config = nextConfig as unknown as { redirects?: () => Promise<readonly RedirectEntry[]> };
  return (await config.redirects?.()) ?? [];
}

function redirectStubs(): Array<{ name: string; file: string; target: string | undefined }> {
  return readdirSync(PLAYERS)
    .filter((name) => {
      try {
        return statSync(resolve(PLAYERS, name)).isDirectory();
      } catch {
        return false;
      }
    })
    .map((name) => ({ name, file: resolve(PLAYERS, name, "page.tsx") }))
    .map(({ name, file }) => {
      let src = "";
      try {
        src = readFileSync(file, "utf8");
      } catch {
        return { name, file, target: undefined, hasRedirect: false };
      }
      return {
        name,
        file,
        target: /redirect\(\s*["']([^"']+)["']\s*\)/.exec(src)?.[1],
        hasRedirect: src.includes("redirect("),
      };
    })
    .filter((s) => (s as { hasRedirect?: boolean }).hasRedirect)
    .map(({ name, file, target }) => ({ name, file, target }));
}

describe("player-lab aliases are answered by next.config, not by a streamed shell (C-329)", () => {
  it("has a config redirect for EVERY redirect stub under app/players/*, pointing at the same target", async () => {
    const bySource = new Map((await configRedirects()).map((r) => [r.source, r.destination]));
    const stubs = redirectStubs();

    // If the stubs are ever removed, this test should be retired rather than left
    // vacuously passing.
    expect(stubs.length).toBeGreaterThan(0);

    const wrong: string[] = [];
    for (const stub of stubs) {
      expect(stub.target, `${stub.name}/page.tsx must redirect to a literal path`).toBeTruthy();
      const source = `/players/${stub.name}`;
      const configured = bySource.get(source);
      if (configured !== stub.target) {
        wrong.push(`${source} -> stub says ${stub.target}, config says ${configured ?? "NOTHING"}`);
      }
    }

    expect(
      wrong,
      "an alias with no config redirect answers 200 with the loading shell, because app/players/loading.tsx streams it",
    ).toEqual([]);
  });

  it("still has app/players/loading.tsx — the reason the config redirects are required at all", () => {
    expect(statSync(resolve(PLAYERS, "loading.tsx")).isFile()).toBe(true);
  });

  it("the same aliasing rule is satisfied for the segments that already answer 307", async () => {
    // /intelligence and /stats have no loading.tsx, so their stubs return 307 on
    // their own. Recorded here so the asymmetry is explicit and a future loading.tsx
    // added to either segment is recognised as the moment they need config entries.
    for (const segment of ["intelligence", "stats"]) {
      let hasLoading = true;
      try {
        hasLoading = statSync(resolve(ROOT, "app", segment, "loading.tsx")).isFile();
      } catch {
        hasLoading = false;
      }
      expect(hasLoading, `${segment} gained a loading.tsx: its redirect stubs now need config entries too`).toBe(false);
    }
  });
});
