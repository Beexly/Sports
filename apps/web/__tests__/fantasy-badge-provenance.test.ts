import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * C-231, found in review. `FantasyShell` defaults `projectionsPool` to
 * "illustrative", and three tool pages — waivers, lineup, trade — never passed
 * it. They DO resolve the live graded pool and render real players from it, and
 * their own `note` says so, so the page shipped a self-contradiction: a note
 * reading "Live graded pool: real players" underneath a badge reading
 * "Projections: illustrative". The badge also suppresses `basisLabel` and the
 * attribution line unless it is live, so the whole point of C-226 — telling a
 * member WHICH SEASON the numbers come from — never reached three of the five
 * surfaces that needed it.
 *
 * The error direction was safe (understating, per the badge's own fail-closed
 * doctrine) but a customer cannot tell which of two contradictory statements on
 * one page to believe, and the basis label is not decoration.
 *
 * C-236 widened this. The original filter only saw pages that mention
 * `resolveToolPoolAsync` by name, and that missed the harder half: /fantasy/scheme
 * and /fantasy/studio reach the live pool TRANSITIVELY, through helpers
 * (applyScheme, waiverTargets, buildLeagueTwin) that default to activePlayerPool(),
 * so they rendered real players under an illustrative badge without ever naming
 * the resolver. A source grep cannot see that. `projectionsPool` is now REQUIRED on
 * FantasyShell, so the compiler forces all 14 shell pages to state what they show,
 * and what remains here is the guard the compiler cannot give: that nobody restores
 * the default.
 */

const APP_DIR = join(__dirname, "..", "app");

function pageFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...pageFiles(full));
    else if (entry === "page.tsx") out.push(full);
  }
  return out;
}

describe("a page that renders the live pool cannot claim an illustrative badge", () => {
  const shellPages = pageFiles(APP_DIR)
    .map((file) => ({ file, src: readFileSync(file, "utf8") }))
    .filter(({ src }) => src.includes("<FantasyShell"));

  it("finds the fantasy shell pages to check", () => {
    // A guard on the guard: if the shell is renamed this test would silently
    // pass over an empty set.
    expect(shellPages.length).toBeGreaterThanOrEqual(14);
  });

  it.each(shellPages.map(({ file, src }) => [file.slice(APP_DIR.length + 1), src]))(
    "%s declares what it renders",
    (_name, src) => {
      expect(src).toMatch(/projectionsPool=(\{|")/);
    },
  );

  it("keeps projectionsPool REQUIRED on the shell, with no default", () => {
    // The compiler is the real guarantee now — every page must pass the prop.
    // This test guards the one thing the compiler cannot: someone restoring the
    // default, which would silently re-arm the original bug on all 14 pages at
    // once and produce no type error anywhere (C-236).
    const shell = readFileSync(
      resolve(APP_DIR, "..", "components", "fantasy", "fantasy-shell.tsx"),
      "utf8",
    );
    expect(shell).toMatch(/projectionsPool:\s*ProjectionsPool;/); // required, not `?:`
    expect(shell).not.toMatch(/projectionsPool\?:/);
    expect(shell).not.toMatch(/projectionsPool\s*=\s*"/); // no default in the signature
  });

  it("never claims \"real\" while a CLIENT component recomputes the pool", () => {
    // C-239. C-236 declared /fantasy/scheme live-dependent because a client
    // component is server-rendered for the first paint, where activePlayerPool()
    // reads the live registry. True, and the wrong thing to key the badge on:
    // SchemeIntel recomputes in the BROWSER, where the registry is empty. The
    // page showed real players for one paint and illustrative players for the
    // entire time a customer was actually using it, under a badge reading live.
    //
    // /fantasy/studio looks similar and is not the same: its page is a server
    // component that calls generateWeeklyBrief() itself and passes the RESULT
    // down as props, so its client children render server-computed rows. The
    // distinction is not "does a client component appear" but "does a client
    // component RESOLVE THE POOL ITSELF".
    //
    // The helper list is derived from the source rather than hardcoded, so a new
    // pool-defaulting helper is covered the day it is written.
    const fantasyLib = join(APP_DIR, "..", "lib", "fantasy");
    const poolDefaulting = new Set<string>();
    for (const entry of readdirSync(fantasyLib)) {
      if (!entry.endsWith(".ts") || entry.includes(".test.")) continue;
      const src = readFileSync(join(fantasyLib, entry), "utf8");
      for (const m of src.matchAll(
        /export function (\w+)\s*\([^)]*=\s*activePlayerPool\(\)/gs,
      )) {
        poolDefaulting.add(m[1] as string);
      }
    }
    expect(poolDefaulting.size, "found no pool-defaulting helpers to check").toBeGreaterThan(0);

    const componentsDir = join(APP_DIR, "..", "components");
    for (const { file, src } of shellPages) {
      if (!/projectionsPool=\{?[^}]*"real"/.test(src)) continue;
      for (const m of src.matchAll(/from "@\/components\/([\w/-]+)"/g)) {
        const componentPath = join(componentsDir, `${m[1] as string}.tsx`);
        let componentSrc: string;
        try {
          componentSrc = readFileSync(componentPath, "utf8");
        } catch {
          continue; // not a single-file component; nothing to assert
        }
        if (!componentSrc.startsWith('"use client"')) continue;
        // A client component that can RECEIVE a server-resolved pool is fine:
        // /fantasy/lineup's optimizer takes `pool` and uses sampleRoster(pool)
        // on the live path, falling back to a pool-defaulting helper only when
        // there is no live pool, which is exactly right. The broken shape is a
        // client component with NO WAY to receive one, so its only option is the
        // browser's empty registry - which is what SchemeIntel did.
        const acceptsPool = /\bpool\b\s*[?:}]/.test(componentSrc.slice(0, 4000));
        if (acceptsPool) continue;
        for (const helper of poolDefaulting) {
          expect(
            componentSrc.includes(`${helper}(`),
            `${file} claims "real" but the CLIENT component ${m[1]} calls ${helper}() ` +
              "and accepts no pool prop, so it can only read the browser's empty registry",
          ).toBe(false);
        }
      }
    }
  });

  it("derives the claim from the resolved pool wherever one is resolved", () => {
    // The five tool pages that resolve a live pool must key the badge off the
    // SAME value their note is derived from, so the two can never disagree.
    const resolvers = shellPages.filter(({ src }) => src.includes("resolveToolPoolAsync"));
    expect(resolvers.length).toBeGreaterThanOrEqual(5);
    for (const { file, src } of resolvers) {
      expect(src, file).toMatch(/projectionsPool=\{pool\b/);
    }
  });
});
