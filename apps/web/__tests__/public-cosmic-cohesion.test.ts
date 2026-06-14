import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

/**
 * Public cosmic-cohesion contract.
 *
 * The public surfaces ride one canonical dark-cosmic palette
 * (orbital-cyan #00E5FF / ion-magenta #FF2DD6 / soft-ultraviolet, on
 * void/carbon/eclipse with mineral borders and ink text). This guard locks in
 * the WAVE-1 rebrand by forbidding the *loud* generic-Tailwind hues that clash
 * with that palette — the ones swept out of /picks, /room, and /auth/signin.
 *
 * Scope: every public `page.tsx` AND every shared component that renders on a
 * public surface (operator/admin/cockpit/api trees are exempt — internal tools,
 * not brand surfaces). Components are in scope because a loud hue in a shared
 * card/slider/terminal reaches every page that mounts it (e.g. the
 * `accent-cyan-400` form-control sliders found on the fantasy/cipher tools).
 * Source-level only.
 *
 * Note: `cyan-300` is deliberately NOT forbidden — it is used as a restrained
 * light accent on the reference-quality /board surface. Only the loud hues are
 * locked out.
 */

const webRoot = resolve(__dirname, "..");
const appDir = resolve(webRoot, "app");
const componentsDir = resolve(webRoot, "components");

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function collectPublicPages(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = full.slice(appDir.length + 1);
    // Exempt internal/operator and route-handler trees.
    if (/(^|\/)(admin|cockpit|api)(\/|$)/.test(rel)) continue;
    const st = statSync(full);
    if (st.isDirectory()) collectPublicPages(full, acc);
    else if (entry === "page.tsx") acc.push(full);
  }
  return acc;
}

function collectPublicComponents(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = full.slice(componentsDir.length + 1);
    // Exempt operator/admin component trees.
    if (/(^|\/)(admin|cockpit)(\/|$)/.test(rel)) continue;
    const st = statSync(full);
    if (st.isDirectory()) collectPublicComponents(full, acc);
    else if (entry.endsWith(".tsx")) acc.push(full);
  }
  return acc;
}

// Loud, never-on-brand Tailwind hues. Generic cyan-400 / fuchsia / raw blue
// CTAs read as "off-brand bootstrap" against the cosmic system.
const LOUD_OFF_BRAND: ReadonlyArray<RegExp> = [
  /\bcyan-400\b/,
  /\bfuchsia-400\b/,
  /\bfuchsia-300\b/,
  /\bbg-blue-600\b/,
  /\bbg-blue-500\b/,
  /\bto-blue-600\b/,
  /\bfrom-brand-700\b/,
];

// Generic Tailwind GRAY chrome. The cosmic system has no place for it on a
// public surface — backgrounds are void/obsidian/carbon/eclipse/titanium,
// borders are mineral, body text is ink/ion. Subtle gray reads as "near-cosmic
// but off" and was the exact drift that left /board, /journal, the pick cards,
// and the error page looking generic. Locked here so it can't come back.
const GRAY_CHROME: ReadonlyArray<RegExp> = [
  /\bbg-gray-\d/,
  /\btext-gray-\d/,
  /\bborder-gray-\d/,
  /\bdivide-gray-\d/,
  /\bring-gray-\d/,
  /\b(?:from|to|via)-gray-\d/,
  /\bbg-slate-\d/,
  /\btext-slate-\d/,
  /\bborder-slate-\d/,
];

// Documented, intentional gray exceptions (by path suffix). Keep this list
// SHORT — every entry is a conscious decision, not a loophole.
//  - auth/signin: the "Continue with Google" button is white (bg-gray-100 /
//    text-gray-900) per Google's brand guidelines for OAuth buttons. This is
//    the ONLY unavoidable exception (a third-party brand requirement).
const GRAY_ALLOWLIST: ReadonlyArray<string> = [
  "app/auth/signin/page.tsx",
];

describe("public surfaces stay on the cosmic palette", () => {
  const pages = collectPublicPages(appDir);
  const components = collectPublicComponents(componentsDir);

  it("discovers the full public page + component set", () => {
    expect(pages.length).toBeGreaterThan(100);
    expect(components.length).toBeGreaterThan(100);
  });

  for (const file of [...pages, ...components]) {
    const rel = file.slice(webRoot.length + 1);
    it(`${rel} carries no loud off-brand hue`, () => {
      const src = read(file);
      for (const re of LOUD_OFF_BRAND) {
        expect(src, `${rel} must not use ${re.source}`).not.toMatch(re);
      }
    });

    if (!GRAY_ALLOWLIST.some((allowed) => rel.endsWith(allowed))) {
      it(`${rel} carries no generic gray chrome`, () => {
        const src = read(file);
        for (const re of GRAY_CHROME) {
          expect(
            src,
            `${rel} must use cosmic tokens (void/eclipse/mineral/ink), not ${re.source}`,
          ).not.toMatch(re);
        }
      });
    }
  }

  it("the WAVE-1 rebranded surfaces ride the cosmic base", () => {
    expect(read(resolve(appDir, "picks/page.tsx"))).toMatch(/bg-void/);
    expect(read(resolve(appDir, "room/[gameId]/page.tsx"))).toMatch(
      /bg-(void|carbon|eclipse)/,
    );
    const signin = read(resolve(appDir, "auth/signin/page.tsx"));
    expect(signin).toMatch(/bg-void/);
    // Honesty: the dead "email coming soon" half-feature stays removed.
    expect(signin).not.toMatch(/Email sign-in coming soon/);
  });
});
