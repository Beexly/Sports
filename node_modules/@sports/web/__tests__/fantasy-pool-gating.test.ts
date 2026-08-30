import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Server-side paywall invariant (CLAUDE.md rule 3): every fantasy/optimizer SSR tool
 * page that resolves the LIVE graded pool must gate it through `poolForViewer(...)`
 * before serializing it to a client component, so a FREE/anon visitor never receives
 * the paid rows of the live pool in the page props.
 *
 * Regression: `fantasy/lineup`, `fantasy/waivers`, and `fantasy/trade` previously passed
 * the raw `resolveToolPoolAsync()` result straight to the client — a latent leak that
 * would activate the moment PROJECTIONS_PROVIDER went live.
 */

const WEB = resolve(__dirname, "..");

const TOOL_PAGES = [
  "app/fantasy/lineup/page.tsx",
  "app/fantasy/waivers/page.tsx",
  "app/fantasy/trade/page.tsx",
  "app/fantasy/draft/page.tsx",
  "app/optimizer/page.tsx",
];

describe("fantasy SSR tool pages gate the live pool server-side", () => {
  for (const rel of TOOL_PAGES) {
    const src = readFileSync(resolve(WEB, rel), "utf8");

    it(`${rel} resolves the live pool`, () => {
      // Guards the premise — if a page stops using the live pool, revisit this suite.
      expect(src).toContain("resolveToolPoolAsync");
    });

    it(`${rel} gates the pool via poolForViewer + getViewerEntitlements`, () => {
      expect(src).toContain("getViewerEntitlements");
      expect(src).toContain("poolForViewer");
    });

    it(`${rel} never passes the raw ungated pool to a component`, () => {
      // The gated value must cross to the client, not the raw resolveToolPoolAsync() result.
      expect(src).not.toMatch(/pool=\{pool\}/);
      expect(src).toMatch(/pool=\{gatedPool\}/);
    });
  }
});
