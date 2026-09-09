import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * C-236. The robots/sitemap parity test asserted only that robots.ts CONTAINS
 * the string "isStatsPublic()" and no longer carries a bare `"/stats",` line.
 * Both hold for the INVERTED gate:
 *
 *   ...(isStatsPublic() ? ["/stats", "/stats/"] : [])
 *
 * which disallows /stats exactly when the sitemap submits it — the mirror image
 * of the C-185 bug the test was written to prevent, and the same "Indexed,
 * though blocked by robots.txt" failure it names. A source grep cannot see
 * polarity.
 *
 * So execute it instead: drive the gate both ways and assert what robots.txt
 * actually says. This is latent while the gate is off, which is precisely why
 * it needs a test that would catch the flip.
 */

const mocks = vi.hoisted(() => ({ isStatsPublic: vi.fn<() => boolean>() }));

vi.mock("@/lib/launch/public-surface-gate", () => ({
  isStatsPublic: mocks.isStatsPublic,
}));
vi.mock("@/lib/seo/site-url", () => ({ SITE_URL: "https://www.example.test" }));

import robots from "@/app/robots";

/** The disallow list from the single wildcard rule. */
function disallowList(): string[] {
  const rules = robots().rules;
  const all = Array.isArray(rules) ? rules : [rules];
  const wildcard = all.find((r) => r.userAgent === "*");
  const d = wildcard?.disallow ?? [];
  return Array.isArray(d) ? d : [d];
}

beforeEach(() => mocks.isStatsPublic.mockReset());

describe("robots.txt follows the stats gate in the right direction", () => {
  it("does NOT disallow /stats once the gate is open", () => {
    mocks.isStatsPublic.mockReturnValue(true);
    const disallow = disallowList();
    expect(disallow).not.toContain("/stats");
    expect(disallow).not.toContain("/stats/");
  });

  it("DOES disallow /stats while the gate is closed", () => {
    mocks.isStatsPublic.mockReturnValue(false);
    const disallow = disallowList();
    expect(disallow).toContain("/stats");
    expect(disallow).toContain("/stats/");
  });

  it("reads the gate rather than a constant", () => {
    // If robots.ts stopped consulting the gate entirely, both cases above could
    // still pass by coincidence for one of them; this pins that the decision is
    // actually taken at call time.
    mocks.isStatsPublic.mockReturnValue(true);
    robots();
    expect(mocks.isStatsPublic).toHaveBeenCalled();
  });

  it("keeps the operator surfaces disallowed either way", () => {
    // The gate must move /stats and nothing else — a refactor that widened or
    // narrowed the rest of the list would be a separate, silent regression.
    for (const open of [true, false]) {
      mocks.isStatsPublic.mockReturnValue(open);
      const disallow = disallowList();
      expect(disallow.length, `gate open=${open}`).toBeGreaterThan(1);
      expect(disallow.some((p) => p.startsWith("/api/")), `gate open=${open}`).toBe(true);
    }
  });
});
