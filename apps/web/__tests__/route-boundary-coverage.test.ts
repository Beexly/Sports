import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

/**
 * Every route segment must resolve to BOTH a loading boundary and an error
 * boundary.
 *
 * Why: `app/page.tsx` is force-dynamic and awaits its loaders at the top level.
 * With no `loading.tsx` anywhere above it, Next has no Suspense fallback to
 * flush, so a slow or hung upstream means ZERO bytes of HTML reach the visitor
 * until the platform request timeout fires — a blank white page as the first
 * impression. A loading boundary turns that into an immediate on-brand shell.
 *
 * App Router resolves both boundaries by inheritance: a `loading.tsx` /
 * `error.tsx` at any ancestor segment covers every descendant page that does
 * not define its own. This test walks the real segment tree and applies that
 * rule, so a root-level file legitimately satisfies every segment — and adding
 * a new uncovered top-level segment cannot regress it.
 */

const webRoot = resolve(__dirname, "..");
const appDir = join(webRoot, "app");

function collectPageDirs(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    collectPageDirs(full, acc);
  }
  if (existsSync(join(dir, "page.tsx")) || existsSync(join(dir, "page.ts"))) {
    acc.push(dir);
  }
  return acc;
}

/** The segment dir plus every ancestor up to and including `app/`. */
function selfAndAncestors(dir: string): string[] {
  const out: string[] = [];
  let cur = dir;
  for (;;) {
    out.push(cur);
    if (cur === appDir) break;
    const parent = resolve(cur, "..");
    if (parent === cur) break;
    cur = parent;
  }
  return out;
}

function resolvesBoundary(dir: string, file: string): boolean {
  return selfAndAncestors(dir).some((d) => existsSync(join(d, file)));
}

const pageDirs = collectPageDirs(appDir).sort();
const routeOf = (dir: string) => "/" + relative(appDir, dir).split(sep).join("/");

/** Pages that await data at the top level are the ones that can hang. */
function isAsyncPage(dir: string): boolean {
  const file = existsSync(join(dir, "page.tsx"))
    ? join(dir, "page.tsx")
    : join(dir, "page.ts");
  const src = readFileSync(file, "utf8");
  return /export\s+default\s+async\s+(?:function|\()/.test(src);
}

describe("route boundary coverage", () => {
  it("finds the app router segment tree", () => {
    expect(pageDirs.length).toBeGreaterThan(100);
  });

  it("every route segment resolves to an error boundary", () => {
    const uncovered = pageDirs
      .filter((d) => !resolvesBoundary(d, "error.tsx"))
      .map(routeOf);
    expect(
      uncovered,
      `${uncovered.length} segment(s) with no error.tsx above them:\n${uncovered.join("\n")}`,
    ).toEqual([]);
  });

  it("every route segment resolves to a loading boundary", () => {
    const uncovered = pageDirs
      .filter((d) => !resolvesBoundary(d, "loading.tsx"))
      .map(routeOf);
    expect(
      uncovered,
      `${uncovered.length} segment(s) with no loading.tsx above them:\n${uncovered.join("\n")}`,
    ).toEqual([]);
  });

  it("every async page — the ones that can hang — resolves to a loading boundary", () => {
    const uncovered = pageDirs
      .filter(isAsyncPage)
      .filter((d) => !resolvesBoundary(d, "loading.tsx"))
      .map(routeOf);
    expect(
      uncovered,
      `${uncovered.length} async segment(s) that can flush nothing while they await:\n${uncovered.join("\n")}`,
    ).toEqual([]);
  });

  it("the root segment itself carries both boundaries, so inheritance can never leave a hole", () => {
    expect(existsSync(join(appDir, "loading.tsx"))).toBe(true);
    expect(existsSync(join(appDir, "error.tsx"))).toBe(true);
  });

  it("a throw inside the root layout still lands on a styled page", () => {
    // error.tsx renders INSIDE the root layout, so it cannot catch a root
    // layout throw. Only global-error.tsx can — without it, Next falls through
    // to its own unstyled default error page.
    const globalError = join(appDir, "global-error.tsx");
    expect(existsSync(globalError)).toBe(true);
    const src = readFileSync(globalError, "utf8");
    expect(src).toContain('"use client"');
    // global-error replaces the root layout, so it must ship its own document.
    expect(src).toMatch(/<html\b/);
    expect(src).toMatch(/<body\b/);
  });
});
