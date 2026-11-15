import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The pricing page may not sell a surface the app does not serve.
 *
 * History: /pricing shipped "Contest Bay paper skills" as a Free bullet with
 * `included: true` and a checkmark while Contest Bay was opt-in behind
 * CONTESTS_PUBLIC (default OFF) — the page sold a checkmark on a route that
 * 404'd. That surface has since been removed from the site entirely (#958),
 * so the invariant hardened: no viewer-facing copy may name Contest Bay at
 * all, because there is no gate left that could make the claim true.
 *
 * These assertions run at RUNTIME (apps/web/tsconfig.json excludes
 * `__tests__/**` from typecheck, so a type-level assertion here would never
 * execute). They read the shipped page source, so the bullet cannot be
 * re-added past any module boundary.
 */

const PRICING_PAGE = join(__dirname, "..", "app", "pricing", "page.tsx");
const HOME_PAGE = join(__dirname, "..", "app", "page.tsx");
const TOOLS_PAGE = join(__dirname, "..", "app", "tools", "page.tsx");
const FAQ_PAGE = join(__dirname, "..", "app", "faq", "page.tsx");

/** Strip comments: an engineer documenting a removal is not selling the surface. */
function codeOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

function viewerStrings(source: string): string[] {
  const src = codeOnly(source);
  const found: string[] = [];
  let m: RegExpExecArray | null;
  const literals = /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
  while ((m = literals.exec(src)) !== null) found.push(m[1] ?? m[2] ?? m[3] ?? "");
  return found;
}

describe("pricing never advertises a surface the app does not serve", () => {
  it("no Contest Bay bullet, label, or promise anywhere in the pricing page", () => {
    const src = readFileSync(PRICING_PAGE, "utf8");
    const haystack = viewerStrings(src).join("\n").toLowerCase();
    expect(haystack).not.toContain("contest bay");
    expect(haystack).not.toContain("paper contest");
  });

  it("the Product JSON-LD names only live free surfaces", () => {
    const src = readFileSync(PRICING_PAGE, "utf8");
    const haystack = viewerStrings(src).join("\n").toLowerCase();
    expect(haystack).not.toContain("paper contest");
  });

  it("the homepage description names only always-on free surfaces", () => {
    const src = readFileSync(HOME_PAGE, "utf8");
    const haystack = viewerStrings(src).join("\n").toLowerCase();
    expect(haystack).not.toContain("paper contest");
  });

  it("the free tier still describes what a free visitor actually gets", () => {
    // The monthly plan matrix retired with the one-time storefront, so the
    // free-tier description now has to be true on the surfaces a free visitor
    // is actually served: /tools and /faq.
    const tools = viewerStrings(readFileSync(TOOLS_PAGE, "utf8")).join("\n");
    expect(tools).toContain("Free calculators");
    expect(tools).toContain("No account, no paywall");
    expect(tools).toContain("every result shows its formula");

    // And the withheld-number promise survives where it now lives.
    const faq = viewerStrings(readFileSync(FAQ_PAGE, "utf8")).join("\n");
    expect(faq).toContain("holds back a public win-rate until enough canonical settled signals exist");
    expect(faq).toContain("The Calibration Report stays gated");
  });
});
