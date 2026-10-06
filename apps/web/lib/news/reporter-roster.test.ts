import { describe, expect, it } from "vitest";
import {
  CURATED_SPORTS_NEWS_RSS,
  parseFeedConfig,
  type RssFeedConfig,
} from "./rss";
import {
  GSN_OWN_FEED,
  NFL_TEAM_ABBREVIATIONS,
  REPORTER_ROSTER,
  beatFeedsFor,
  bskyProfileRss,
  clubFeedFor,
  espnTeamFeedFor,
  selfSourcedRosterEntries,
  toCuratedRssFeeds,
  type RosterEntry,
} from "./reporter-roster";
import {
  REPORTER_ROSTER_VERIFICATION,
  verificationFor,
} from "./reporter-roster-fixtures";

/**
 * C-415 acceptance: the roster is in code for all 32 teams, every URL has a
 * recorded fetch result, GSN can never corroborate itself, X is excluded, and
 * NEWS_RSS_FEEDS remains an override.
 */

const VALID_TIERS = new Set(["Insider", "Beat", "Verified", "Aggregator", "Unconfirmed"]);

describe("reporter-roster — 32-team coverage", () => {
  it("lists every NFL team exactly once in the canonical abbreviation list", () => {
    expect(NFL_TEAM_ABBREVIATIONS).toHaveLength(32);
    expect(new Set(NFL_TEAM_ABBREVIATIONS).size).toBe(32);
  });

  it("gives every team a club official feed, an ESPN team seat, and at least one beat reporter", () => {
    for (const team of NFL_TEAM_ABBREVIATIONS) {
      const clubFeed = clubFeedFor(team);
      expect(clubFeed, `${team} club feed`).toBeDefined();
      expect(clubFeed!.kind).toBe("club");
      expect(clubFeed!.tier).toBe("Verified");
      expect(clubFeed!.url).toMatch(/^https:\/\//);

      const espnSeat = espnTeamFeedFor(team);
      expect(espnSeat, `${team} ESPN team feed`).toBeDefined();
      expect(espnSeat!.kind).toBe("espn-team");
      expect(espnSeat!.url).toMatch(/^https:\/\/www\.espn\.com\/blog\//);

      const beats = beatFeedsFor(team);
      expect(beats.length, `${team} beat reporters`).toBeGreaterThanOrEqual(1);
      for (const b of beats) {
        expect(b.tier).toBe("Beat");
        expect(b.url).toMatch(/^https:\/\//);
      }
    }
  });

  it("covers every roster entry with a tier, a team, and https", () => {
    for (const entry of REPORTER_ROSTER) {
      expect(entry.url, entry.source).toMatch(/^https:\/\//);
      expect(VALID_TIERS.has(entry.tier), `${entry.source} tier=${entry.tier}`).toBe(true);
      expect(entry.team.length).toBeGreaterThan(0);
    }
  });

  it("excludes X/Twitter entirely (D15)", () => {
    for (const entry of REPORTER_ROSTER) {
      expect(entry.url).not.toMatch(/(?:^|\/\/)(?:www\.)?(?:twitter\.com|x\.com)\//i);
    }
  });

  it("has league insiders on team=NFL and never as a club seat", () => {
    const insiders = REPORTER_ROSTER.filter((e) => e.kind === "insider");
    expect(insiders.length).toBeGreaterThanOrEqual(10);
    for (const i of insiders) {
      expect(i.tier).toBe("Insider");
      expect(i.team).toBe("NFL");
    }
  });
});

describe("GSN self-source", () => {
  it("is on the roster as Verified with selfSourced:true so it can never corroborate itself", () => {
    expect(GSN_OWN_FEED.tier).toBe("Verified");
    expect(GSN_OWN_FEED.selfSourced).toBe(true);
    expect(GSN_OWN_FEED.kind).toBe("gsn");
    expect(GSN_OWN_FEED.url).toBe("https://www.galaxysportsedge.com/journal/rss.xml");
    expect(REPORTER_ROSTER).toContain(GSN_OWN_FEED);
  });

  it("is the only selfSourced entry", () => {
    const flagged = selfSourcedRosterEntries();
    expect(flagged).toHaveLength(1);
    expect(flagged[0]!.url).toBe(GSN_OWN_FEED.url);
  });

  it("rides into CURATED still flagged selfSourced", () => {
    const gsn = CURATED_SPORTS_NEWS_RSS.find((f) => f.source === "Galaxy Sports Network");
    expect(gsn).toBeDefined();
    expect(gsn!.selfSourced).toBe(true);
    expect(gsn!.tier).toBe("Verified");
  });
});

describe("CURATED_SPORTS_NEWS_RSS", () => {
  it("is fed by the roster and keeps non-NFL league coverage", () => {
    const urls = new Set(CURATED_SPORTS_NEWS_RSS.map((f) => f.url));
    // Every club official feed rides.
    for (const team of NFL_TEAM_ABBREVIATIONS) {
      expect(urls.has(clubFeedFor(team)!.url), team).toBe(true);
    }
    // GSN rides.
    expect(urls.has(GSN_OWN_FEED.url)).toBe(true);
    // Pre-existing non-NFL feeds are not regressed.
    expect(urls.has("https://www.espn.com/espn/rss/nba/news")).toBe(true);
    expect(urls.has("https://www.espn.com/espn/rss/mlb/news")).toBe(true);
  });

  it("drops known-dead ESPN team-blog RSS from the live curated list (fixtures say so)", () => {
    const urls = new Set(CURATED_SPORTS_NEWS_RSS.map((f) => f.url));
    for (const team of NFL_TEAM_ABBREVIATIONS) {
      const seat = espnTeamFeedFor(team)!;
      expect(urls.has(seat.url), seat.url).toBe(false);
      expect(verificationFor(seat.url)?.status).toBe("fail");
    }
    // But the working ESPN league feed still rides.
    expect(urls.has("https://www.espn.com/espn/rss/nfl/news")).toBe(true);
  });

  it("toCuratedRssFeeds strips only espn-team and preserves selfSourced", () => {
    const curated = toCuratedRssFeeds();
    expect(curated.some((f) => f.selfSourced === true)).toBe(true);
    expect(curated.every((f: RssFeedConfig) => !f.url.includes("/blog/"))).toBe(true);
  });
});

describe("NEWS_RSS_FEEDS override (D19)", () => {
  it("parseFeedConfig still reads operator overrides and does not consult the roster", () => {
    const override = parseFeedConfig(
      "https://override.example/rss|Operator Feed|Insider|KC",
    );
    expect(override).toHaveLength(1);
    expect(override[0]!.source).toBe("Operator Feed");
    expect(override[0]!.team).toBe("KC");
    // The curated list is independent of the override string.
    expect(CURATED_SPORTS_NEWS_RSS.some((f) => f.url.includes("override.example"))).toBe(false);
  });
});

describe("verification fixtures (C-415 acceptance)", () => {
  it("records a fetch result for every roster URL, exactly once", () => {
    const urls = REPORTER_ROSTER.map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length); // no duplicate URLs in roster
    for (const url of urls) {
      const v = verificationFor(url);
      expect(v, url).toBeDefined();
      expect(v!.url).toBe(url);
    }
    expect(REPORTER_ROSTER_VERIFICATION.length).toBe(urls.length);
  });

  it("every club + beat + insider + league + GSN URL is ok with pubDate", () => {
    for (const entry of REPORTER_ROSTER) {
      if (entry.kind === "espn-team") continue;
      const v = verificationFor(entry.url)!;
      expect(v.status, `${entry.source} ${entry.url}`).toBe("ok");
      expect(v.hasPubDate).toBe(true);
      expect(v.httpStatus).toBe(200);
    }
  });

  it("every ESPN team-blog URL is recorded fail with a reason", () => {
    const failures = REPORTER_ROSTER_VERIFICATION.filter((v) => v.status === "fail");
    expect(failures.length).toBe(32);
    for (const f of failures) {
      expect(f.url).toMatch(/^https:\/\/www\.espn\.com\/blog\//);
      expect(f.reason).toBeTruthy();
      expect(f.hasPubDate).toBe(false);
    }
  });

  it("bluesky URLs use the published per-profile RSS pattern", () => {
    const bsky = REPORTER_ROSTER.filter(
      (e: RosterEntry) => e.handle && e.url.startsWith("https://bsky.app/profile/"),
    );
    expect(bsky.length).toBeGreaterThanOrEqual(40);
    for (const e of bsky) {
      expect(e.url).toBe(bskyProfileRss(e.handle!));
    }
  });
});
