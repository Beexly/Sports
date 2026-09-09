import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

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

/**
 * C-251, Devin. A second axis the invariant above does not cover.
 *
 * That one asks WHETHER a client component resolves the pool itself. It never
 * asks WHEN the server component runs. /fantasy/studio had no `dynamic` export
 * and a synchronous default export, so Next prerendered it at BUILD time: the
 * brief was generated against the build's pool and the badge was baked from an
 * `isLiveProjections()` evaluated before the runtime registration that
 * instrumentation performs. Activating the provider could never change either,
 * because the page never rendered again.
 *
 * A page that claims "real" only when the pool resolves live is making a
 * REQUEST-TIME claim. Freezing it at build time makes it a statement about the
 * build machine, not about what the reader is being served.
 */
describe("a page whose badge depends on the live pool renders at request time", () => {
  it("declares force-dynamic and resolves asynchronously", () => {
    const offenders: string[] = [];
    for (const file of pageFiles(APP_DIR)) {
      const rel = relative(APP_DIR, file);
      const src = readFileSync(file, "utf8");
      // Only pages whose badge is CONDITIONAL are making a live claim. A page
      // hardcoding "illustrative" or "none" says the same thing whenever it is
      // rendered, so prerendering it is harmless.
      const conditional = /projectionsPool=\{[^}]*\?[^}]*\}/.test(src);
      if (!conditional) continue;
      const dynamic = /export const dynamic\s*=\s*["']force-dynamic["']/.test(src);
      const isAsync = /export default async function/.test(src);
      if (!dynamic || !isAsync) {
        offenders.push(`${rel} (force-dynamic=${dynamic}, async=${isAsync})`);
      }
    }
    expect(
      offenders,
      "these pages claim a live pool but can be prerendered, freezing the claim at build time",
    ).toEqual([]);
  });

  it("derives the badge from a resolved pool, never from a second independent lookup", () => {
    // isLiveProjections() asks the registry again, separately from whatever
    // resolution produced the content. The two can disagree, and on a
    // prerendered page they disagreed permanently. Every conditional page now
    // keys the badge on the pool it actually resolved.
    for (const file of pageFiles(APP_DIR)) {
      const rel = relative(APP_DIR, file);
      const src = readFileSync(file, "utf8");
      if (!/projectionsPool=\{[^}]*\?[^}]*\}/.test(src)) continue;
      const badge = src.match(/projectionsPool=\{([^}]*)\}/)?.[1] ?? "";
      expect(badge, `${rel} derives its badge from a separate registry lookup`).not.toContain(
        "isLiveProjections",
      );
    }
  });

  /**
   * C-255, Devin, twice on the same page. Two more axes the invariants above do
   * not cover, both found on /fantasy/studio after C-251 moved it to request
   * time.
   */
  it("budgets execution time wherever it resolves the pool on the request path", () => {
    // resolveToolPoolAsync performs the multi-megabyte graded-pool load. Five
    // pages already declare maxDuration = 60 because it can exceed the platform
    // default; studio did not, so C-251 fixed the honesty of its claim and gave
    // it a cold-start timeout instead. A page cannot make a request-time claim
    // it may not survive making.
    const offenders: string[] = [];
    for (const file of pageFiles(APP_DIR)) {
      const src = readFileSync(file, "utf8");
      if (!src.includes("resolveToolPoolAsync")) continue;
      if (!/export const maxDuration\s*=\s*\d+/.test(src)) {
        offenders.push(relative(APP_DIR, file));
      }
    }
    expect(
      offenders,
      "these pages load the graded pool on the request path with no execution budget",
    ).toEqual([]);
  });

  it("never pairs a conditional badge with an unconditional illustrative note", () => {
    // The badge said "real" while the note called every player fictional, in the
    // same header. Whatever decides the badge must also decide the note, so the
    // page states ONE provenance. Asserted structurally rather than on wording:
    // a note that mentions ILLUSTRATIVE_NOTE at all must do so behind the same
    // conditional the badge uses.
    const offenders: string[] = [];
    for (const file of pageFiles(APP_DIR)) {
      const src = readFileSync(file, "utf8");
      if (!/projectionsPool=\{[^}]*\?[^}]*\}/.test(src)) continue;
      const note = src.match(/note=\{([\s\S]*?)\}\s*\n/)?.[1] ?? "";
      if (note.includes("ILLUSTRATIVE_NOTE") && !note.includes("?")) {
        offenders.push(relative(APP_DIR, file));
      }
    }
    expect(
      offenders,
      "these pages can claim a live pool in the badge while calling it illustrative in the note",
    ).toEqual([]);
  });
});
