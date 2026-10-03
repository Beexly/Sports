import { describe, expect, it } from "vitest";
import { corroborate, type NewsItem } from "@/lib/news/impact";

/**
 * Corroboration must never be fabricated. Two headlines only "confirm" each
 * other when they name the SAME player. Without a player, "team + signal" is
 * far too coarse — two unrelated Chiefs injury notes are not one confirmed
 * story, and the "Confirmed · 2 sources" badge must not appear.
 */

function item(over: Partial<NewsItem> & Pick<NewsItem, "id">): NewsItem {
  return {
    id: over.id,
    source: over.source ?? "ESPN",
    tier: over.tier ?? "Verified",
    team: over.team ?? "KC",
    player: over.player,
    headline: over.headline ?? "headline",
    signal: over.signal ?? "injury-out",
    minutesAgo: over.minutesAgo ?? 10,
  };
}

describe("corroborate", () => {
  it("does NOT corroborate two player-less stories that merely share team+signal", () => {
    const out = corroborate([
      item({ id: "a", source: "ESPN", team: "KC", signal: "injury-out" }),
      item({ id: "b", source: "NFL", team: "KC", signal: "injury-out" }),
    ]);
    expect(out.get("a")).toEqual({ sources: 1, confirmed: false, sourceNames: ["ESPN"] });
    expect(out.get("b")).toEqual({ sources: 1, confirmed: false, sourceNames: ["NFL"] });
  });

  it("DOES corroborate when a real player matches across two distinct sources", () => {
    const out = corroborate([
      item({ id: "a", source: "ESPN", team: "KC", player: "P. Mahomes", signal: "injury-out" }),
      item({ id: "b", source: "NFL", team: "KC", player: "P. Mahomes", signal: "injury-out" }),
    ]);
    expect(out.get("a")?.confirmed).toBe(true);
    expect(out.get("a")?.sources).toBe(2);
  });

  it("does not double-count the same source reporting a player twice", () => {
    const out = corroborate([
      item({ id: "a", source: "ESPN", player: "T. Kelce", signal: "role-up" }),
      item({ id: "b", source: "ESPN", player: "T. Kelce", signal: "role-up" }),
    ]);
    expect(out.get("a")?.sources).toBe(1);
    expect(out.get("a")?.confirmed).toBe(false);
  });
});
