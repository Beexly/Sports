import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ meta: vi.fn() }));

vi.mock("@/lib/integrations/projections", () => ({
  getLiveProjectionsMeta: mocks.meta,
}));

import { ProjectionsBadge } from "@/components/integrations/projections-badge";

/**
 * C-173. "The projections SOURCE is live" and "the players on this page are
 * real" are two different claims, and the badge published the first while five
 * fantasy surfaces rendered the second as false: waivers, league-twin, trade,
 * studio and scheme all draw the fictional pool from lib/fantasy/players.ts,
 * whose own doctrine comment says the names are fictional precisely so no
 * estimate is mistaken for a real one.
 *
 * It is LATENT today - the licensed provider is founder-gated, so `live` is
 * false everywhere - and becomes a live false claim the day the provider is
 * enabled, which is a config change with nothing in the code to catch it. These
 * tests are that catch.
 */

const LIVE = { live: true, fetchedAt: "2026-09-08T00:00:00.000Z", attribution: "Fixture Provider" };

describe("ProjectionsBadge — a live source over a fictional pool is not live data", () => {
  beforeEach(() => {
    mocks.meta.mockReset();
  });

  it("refuses to say live over an illustrative pool even when the source IS live", () => {
    mocks.meta.mockReturnValue(LIVE);
    render(<ProjectionsBadge pool="illustrative" />);
    expect(screen.getByText("Projections: illustrative")).toBeTruthy();
    expect(screen.queryByText("Projections: live")).toBeNull();
    // And it names WHY, rather than implying the provider is missing.
    expect(screen.getByText(/illustrative player pool/)).toBeTruthy();
  });

  it("says live when the source is live and the caller asserts real players", () => {
    mocks.meta.mockReturnValue(LIVE);
    render(<ProjectionsBadge pool="real" />);
    expect(screen.getByText("Projections: live")).toBeTruthy();
  });

  it("reports the SOURCE only on a page that renders no players", () => {
    // Collapsing this into either other state would lie: "illustrative"
    // understates a working provider, "real" asserts players the page lacks.
    mocks.meta.mockReturnValue(LIVE);
    render(<ProjectionsBadge pool="none" />);
    expect(screen.getByText("Projections: live")).toBeTruthy();
  });

  it("still says illustrative when the source itself is not live, for every pool", () => {
    // The control: the pool discriminator must not become a way to claim live
    // data while the provider is off.
    mocks.meta.mockReturnValue({ live: false });
    for (const pool of ["real", "none", "illustrative"] as const) {
      const { unmount } = render(<ProjectionsBadge pool={pool} />);
      expect(screen.getByText("Projections: illustrative")).toBeTruthy();
      unmount();
    }
  });
});
