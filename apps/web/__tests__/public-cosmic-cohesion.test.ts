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
 * Scope: every public `page.tsx` (operator/admin/cockpit/api routes are
 * exempt — they are internal tools, not brand surfaces). Source-level only.
 *
 * Note: `cyan-300` is deliberately NOT forbidden — it is used as a restrained
 * light accent on the reference-quality /board surface. Only the loud hues are
 * locked out.
 */

const webRoot = resolve(__dirname, "..");
const appDir = resolve(webRoot, "app");

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

describe("public surfaces stay on the cosmic palette", () => {
  const pages = collectPublicPages(appDir);

  it("discovers the full public page set", () => {
    expect(pages.length).toBeGreaterThan(100);
  });

  for (const page of pages) {
    const rel = page.slice(webRoot.length + 1);
    it(`${rel} carries no loud off-brand hue`, () => {
      const src = read(page);
      for (const re of LOUD_OFF_BRAND) {
        expect(src, `${rel} must not use ${re.source}`).not.toMatch(re);
      }
    });
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
