/**
 * PARALLAX — mirror guard.
 *
 * The interactive instrument `docs/gse-packet/observatory/PARALLAX_REALITY_FORK.html` re-implements the
 * engine's fork math in vanilla JS so it can run offline. This test pins the EXACT headline fixture
 * values the HTML displays, so the engine and the instrument cannot silently drift apart: if a fixture
 * prior changes here, this test fails and the HTML must be updated to match.
 */

import { describe, it, expect } from "vitest";
import { forkWR1Availability, wr2Boundary, wr2Read, lightCone, PARALLAX_FIXTURE } from "../parallax-instrument.js";

const coneAtKickoff = lightCone(PARALLAX_FIXTURE.facts, 3);

describe("Mirror guard — HTML instrument values match the engine", () => {
  it("baseline (WR1 plays, p=1): WR2 projects 49.6 yds and reads PASS vs the 52.5 line", () => {
    const f = forkWR1Availability(1, coneAtKickoff);
    expect(f.ok).toBe(true);
    if (f.ok) {
      expect(f.projection.point).toBe(49.6);
      expect(wr2Read(f.projection.point)).toBe("PASS");
    }
  });

  it("fork WR1 fully out (p=0): WR2 share 29.8%, projects 82.0 yds, reads ROLE_UP", () => {
    const f = forkWR1Availability(0, coneAtKickoff);
    expect(f.ok).toBe(true);
    if (f.ok) {
      expect(Math.round((f.shareAfter.WR2 ?? 0) * 1000) / 10).toBe(29.8); // 0.2976 → 29.8%
      expect(f.projection.point).toBe(82.0);
      expect(wr2Read(f.projection.point)).toBe("ROLE_UP_FANTASY_LATE");
      expect(f.teamPassAttempts.after).toBe(34);
    }
  });

  it("the possibility-surface boundary x* is 0.88 (PASS → WATCHLIST)", () => {
    const b = wr2Boundary(coneAtKickoff);
    expect(b.fromRead).toBe("PASS");
    expect(b.flipsAt).toBe(0.88);
    expect(b.toRead).toBe("WATCHLIST");
  });
});
