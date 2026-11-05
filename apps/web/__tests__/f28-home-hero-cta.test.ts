import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * F-28 (founder-delegated 2026-09-08, via orchestrator): the front door's
 * primary CTA goes to the packs surface; DFS and pricing stay one action away;
 * no free-tool or methodology CTA competes with the packs.
 *
 * REPOINTED, NOT SOFTENED (2026-11-03). The RedlineWorld rebuild moved the CTAs
 * out of the four-door hero and into the field header plus the plate actions.
 * The assertions now read the component that owns them. The decision is the
 * same; only the file carrying it changed.
 */
describe("F-28: front door CTAs and board door copy", () => {
  const page = readFileSync(join(process.cwd(), "app/page.tsx"), "utf8");
  const world = readFileSync(
    join(process.cwd(), "components/redline/redline-world.tsx"),
    "utf8"
  );

  it("primary CTA links to /packages", () => {
    // The header's "ALL PACKS" control is the persistent primary CTA across
    // every stage of the field walk.
    expect(world).toMatch(/className="header-menu" href="\/packages"/);
    // The first plate's "View packs" action walks the camera to the storefront
    // stage instead of navigating away.
    expect(world).toContain("View packs");
  });

  it("DFS and pricing remain reachable from the front door", () => {
    expect(world).toContain('setPanel("dfs")');
    expect(world).toContain("Preview DFS Lineups");
    expect(page).toContain('"/pricing"');
    expect(page).toContain("Plans and pricing");
  });

  it("no free-tool or methodology CTA competes with the packs", () => {
    expect(world).not.toContain("Free calculators");
    expect(world).not.toContain("How the engine works");
    expect(world).not.toMatch(/href="\/tools"/);
    expect(world).not.toMatch(/href="\/methodology"/);
  });

  it("the board surface no longer claims 'today' as a competing surface", () => {
    expect(world).not.toContain("What's worth a play today, and what to pass.");
  });
});
