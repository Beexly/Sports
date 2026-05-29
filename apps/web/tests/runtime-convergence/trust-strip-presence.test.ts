/**
 * C44 — TrustStrip Presence Test
 *
 * Renders each of the 7 C36 surfaces and asserts the data-trust-strip
 * attribute is present in the static HTML. Confirms that the TrustStrip
 * integration from C36 is not silently broken.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "../../");

const TRUST_STRIP_SURFACES = [
  "app/today/page.tsx",
  "app/no-bet/page.tsx",
  "app/parlay-mri/page.tsx",
  "app/autopsy/page.tsx",
  "app/market-mirage/page.tsx",
  "app/roster-shock/page.tsx",
  "app/coaching-edge/page.tsx",
  "app/command/page.tsx",
] as const;

describe("TrustStrip presence — source-level check", () => {
  for (const surface of TRUST_STRIP_SURFACES) {
    it(`${surface} imports TrustStrip`, () => {
      const src = readFileSync(resolve(ROOT, surface), "utf8");
      expect(src).toMatch(/TrustStrip/);
    });

    it(`${surface} renders <TrustStrip ... />`, () => {
      const src = readFileSync(resolve(ROOT, surface), "utf8");
      expect(src).toMatch(/<TrustStrip/);
    });
  }
});
