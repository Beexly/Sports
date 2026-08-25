import { describe, expect, it } from "vitest";
import { PLAYER_VIEWS, resolvePlayerView } from "@/lib/players/views";

/**
 * Player Lab renders server-side, so every view is a SECOND DOOR onto the same
 * loader its `jsonHref` route serves. Only `dfs` used to resolve entitlements,
 * which left ten doors open: an anonymous `/players?view=opportunity` returned
 * the PRO-gated receiving-opportunity table as HTML while
 * `/api/intelligence/receiving-opportunity` refused the identical request.
 *
 * These pin the invariant that keeps the two doors in step.
 */
describe("Player Lab — every view declares an entitlement floor", () => {
  it("has no view missing `requires`", () => {
    const missing = PLAYER_VIEWS.filter((v) => v.requires === undefined).map((v) => v.slug);
    expect(missing).toEqual([]);
  });

  it("declares a floor matching the gate on its own jsonHref route", () => {
    // The mapping is asserted literally rather than derived, so adding a view
    // without deciding its tier fails here instead of defaulting to open.
    const EXPECTED: Record<string, "public" | "premium" | "fantasy"> = {
      production: "premium",
      snaps: "premium",
      opportunity: "premium",
      nextgen: "premium",
      trenches: "premium",
      combine: "premium",
      qbr: "premium",
      edge: "premium",
      injuries: "premium",
      market: "public",
      dfs: "fantasy",
    };
    const actual = Object.fromEntries(PLAYER_VIEWS.map((v) => [v.slug, v.requires]));
    expect(actual).toEqual(EXPECTED);
  });

  it("gates every view whose JSON twin requires premium", () => {
    // Any view pointing at an /api/nflverse or /api/intelligence route inherits
    // that route's premium floor — those routes all use requirePremiumApiRateLimited.
    const premiumRoutes = PLAYER_VIEWS.filter(
      (v) => v.jsonHref.startsWith("/api/nflverse/") || v.jsonHref.startsWith("/api/intelligence/"),
    );
    expect(premiumRoutes.length).toBeGreaterThan(0);
    for (const v of premiumRoutes) {
      expect(v.requires, `${v.slug} (${v.jsonHref}) must be premium`).toBe("premium");
    }
  });

  it("an unknown ?view= slug resolves to a view that still declares a floor", () => {
    // resolvePlayerView falls back rather than throwing; the fallback must not
    // be an ungated hole.
    const fallback = resolvePlayerView("does-not-exist");
    expect(fallback.requires).toBeDefined();
  });

  it("no view is silently public except the one whose route is also ungated", () => {
    const publicViews = PLAYER_VIEWS.filter((v) => v.requires === "public").map((v) => v.slug);
    // `market` only — /api/sleeper/market-signal has no gate today. If another
    // slug appears here, either its route grew a gate or this one lost it.
    expect(publicViews).toEqual(["market"]);
  });
});
