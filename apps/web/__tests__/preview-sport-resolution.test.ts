import { describe, expect, it } from "vitest";
import {
  matchSportParam,
  type SportParamResolution,
} from "@/lib/preview/sport-resolution";

/**
 * Pure matcher for the /preview/[sport]/[slug] sport segment — no mocks.
 *
 * The [sport] URL param accepts two forms: the canonical human slug
 * (slugify(Sport.name) — "nfl") which renders, and the legacy Sport cuid /
 * non-canonical casing which 308s to the slug form. `matchSportParam` is the
 * single decision point; these tests pin its precedence rules and the
 * determinism of the ambiguity tie-break (lowest Sport.key wins).
 */

const NFL = { id: "cmsportnflzz", key: "americanfootball_nfl", name: "NFL" };
const NBA = { id: "cmsportnbazz", key: "basketball_nba", name: "NBA" };

// Callers pre-sort by key asc (the resolver queries orderBy: { key: "asc" }).
const SPORTS = [NFL, NBA].sort((a, b) => a.key.localeCompare(b.key));

function expectSport(
  res: SportParamResolution,
  kind: "ok" | "redirect",
  sport: { id: string; name: string },
  slug: string,
): void {
  expect(res.kind).toBe(kind);
  if (res.kind === "unknown") throw new Error("expected a resolved sport");
  expect(res.sport.id).toBe(sport.id);
  expect(res.sport.name).toBe(sport.name);
  expect(res.sport.slug).toBe(slug);
}

describe("matchSportParam — canonical slug / legacy cuid / casing / unknown", () => {
  it("exact canonical slug renders (kind: ok)", () => {
    expectSport(matchSportParam("nfl", SPORTS), "ok", NFL, "nfl");
  });

  it("legacy Sport cuid redirects to the slug form (the indexed-cuid case)", () => {
    expectSport(matchSportParam("cmsportnflzz", SPORTS), "redirect", NFL, "nfl");
  });

  it("non-canonical casing ('NFL') redirects to the lowercase slug", () => {
    expectSport(matchSportParam("NFL", SPORTS), "redirect", NFL, "nfl");
  });

  it("unknown sport param resolves to unknown (404)", () => {
    expect(matchSportParam("cricket", SPORTS)).toEqual({ kind: "unknown" });
  });

  it("ambiguous name-slugs resolve deterministically — lowest Sport.key wins", () => {
    // Two active sports whose names both slugify to "nfl". The contract:
    // callers pre-sort by key asc, and first-match makes the lexicographically
    // smallest key the winner — independent of DB return order.
    const a = { id: "cmsportkeyaa", key: "a_nfl", name: "NFL" };
    const b = { id: "cmsportkeybb", key: "b_nfl", name: "nfl" };

    for (const ordering of [
      [a, b],
      [b, a],
    ]) {
      const sorted = [...ordering].sort((x, y) => x.key.localeCompare(y.key));
      expectSport(matchSportParam("nfl", sorted), "ok", a, "nfl");
    }
  });
});
