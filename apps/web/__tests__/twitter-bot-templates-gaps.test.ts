/**
 * Targeted coverage for Twitter bot template branches not reached by
 * bot-templates.test.ts.
 *
 * The primary test covers: buildSlateStateGatedTweet (MLB, with edgeIndex),
 * buildSettlementTweet (W/L), buildPostMortemThread (losses, clean thread),
 * buildPickPublicationEmbed and buildSettlementEmbed (Discord).
 *
 * This file covers: buildPickPublicationTweet (unknown sport/no hashtag,
 * LEAN/NOTE grade fallback), buildSlateStateGatedTweet (null edgeIndex),
 * buildSettlementTweet (PUSH, null factors), buildPostMortemThread (null
 * biggestMissFactor, null oneLineCause, >3 topFactors capped at 3).
 */

import { describe, it, expect } from "vitest";
import { buildPickPublicationTweet } from "@/lib/twitter-bot/templates/pick-publication";
import { buildSlateStateGatedTweet } from "@/lib/twitter-bot/templates/slate-state-gated";
import { buildSettlementTweet } from "@/lib/twitter-bot/templates/settlement";
import { buildPostMortemThread } from "@/lib/twitter-bot/templates/post-mortem-thread";
import type {
  PickPublicationInput,
  SlateStateGatedInput,
  SettlementInput,
  PostMortemThreadInput,
} from "@/lib/twitter-bot/templates/types";

const PUBLIC_URL = "https://galaxy.test";

// ============================================================
// buildPickPublicationTweet
// ============================================================

const pickBase: PickPublicationInput = {
  matchup: "BOS @ MIL",
  pickKind: "SPREAD",
  line: "BOS -3.5",
  side: "HOME",
  pickGrade: "SOLID_PLAY",
  confidence: 72.9,
  sport: "NBA",
  gameId: "game-1",
  modelVersion: "v5.1.0",
};

describe("buildPickPublicationTweet — known sport hashtag", () => {
  it("includes NBA hashtag for NBA sport", () => {
    const out = buildPickPublicationTweet(pickBase, PUBLIC_URL);
    expect(out.text).toContain("#NBA");
    expect(out.hashtags).toEqual(["NBA"]);
  });

  it("maps NCAAF to #CFB hashtag", () => {
    const out = buildPickPublicationTweet({ ...pickBase, sport: "NCAAF" }, PUBLIC_URL);
    expect(out.text).toContain("#CFB");
    expect(out.hashtags).toEqual(["CFB"]);
  });

  it("maps NCAAB to #CBB hashtag", () => {
    const out = buildPickPublicationTweet({ ...pickBase, sport: "NCAAB" }, PUBLIC_URL);
    expect(out.text).toContain("#CBB");
    expect(out.hashtags).toEqual(["CBB"]);
  });
});

describe("buildPickPublicationTweet — unknown sport (no hashtag)", () => {
  it("omits hashtag for unknown sport", () => {
    const out = buildPickPublicationTweet({ ...pickBase, sport: "TENNIS" }, PUBLIC_URL);
    expect(out.text).not.toMatch(/#\w+/);
    expect(out.hashtags).toEqual([]);
  });
});

describe("buildPickPublicationTweet — grade label fallback", () => {
  it("uses raw pickGrade when grade is not in the label map", () => {
    const out = buildPickPublicationTweet({ ...pickBase, pickGrade: "SPECULATIVE" }, PUBLIC_URL);
    expect(out.text).toContain("SPECULATIVE");
  });
});

describe("buildPickPublicationTweet — confidence rounding", () => {
  it("rounds confidence to nearest integer", () => {
    const out = buildPickPublicationTweet({ ...pickBase, confidence: 72.9 }, PUBLIC_URL);
    expect(out.text).toContain("73%");
  });
});

describe("buildPickPublicationTweet — output shape", () => {
  it("linkUrl points to /room/<gameId>", () => {
    const out = buildPickPublicationTweet(pickBase, PUBLIC_URL);
    expect(out.linkUrl).toBe(`${PUBLIC_URL}/room/game-1`);
  });

  it("charCount matches actual text length", () => {
    const out = buildPickPublicationTweet(pickBase, PUBLIC_URL);
    expect(out.charCount).toBe(out.text.length);
  });
});

// ============================================================
// buildSlateStateGatedTweet — null edgeIndex
// ============================================================

const gatedBase: SlateStateGatedInput = {
  matchup: "GSW @ LAL",
  edgeIndex: 2.1,
  gateReasonText: "spread balanced at 52% consensus.",
  sport: "NBA",
  gameId: "game-2",
  modelVersion: "v5.1.0",
};

describe("buildSlateStateGatedTweet — null edgeIndex", () => {
  it("shows 'n/a (data still settling)' when edgeIndex is null", () => {
    const out = buildSlateStateGatedTweet({ ...gatedBase, edgeIndex: null }, PUBLIC_URL);
    expect(out.text).toContain("n/a (data still settling)");
  });

  it("shows numeric edge index when edgeIndex is present", () => {
    const out = buildSlateStateGatedTweet(gatedBase, PUBLIC_URL);
    expect(out.text).toContain("2.1");
    expect(out.text).toContain("below publish threshold");
  });
});

describe("buildSlateStateGatedTweet — unknown sport", () => {
  it("omits hashtag for unknown sport", () => {
    const out = buildSlateStateGatedTweet({ ...gatedBase, sport: "GOLF" }, PUBLIC_URL);
    expect(out.hashtags).toEqual([]);
  });
});

// ============================================================
// buildSettlementTweet — PUSH outcome
// ============================================================

const settlementBase: SettlementInput = {
  matchup: "GSW @ LAL",
  pickLine: "GSW -3.5",
  outcome: "W",
  heaviestContributorFactor: "lineMovement",
  biggestMissFactor: null,
  oneLineCause: null,
  sport: "NBA",
  gameId: "game-3",
  modelVersion: "v5.1.0",
};

describe("buildSettlementTweet — PUSH outcome", () => {
  it("includes PUSH outcome label", () => {
    const out = buildSettlementTweet({ ...settlementBase, outcome: "PUSH" }, PUBLIC_URL);
    expect(out.text).toContain("PUSH");
    expect(out.text).toContain("Line landed on the number");
  });

  it("uses Full snapshot label for PUSH", () => {
    const out = buildSettlementTweet({ ...settlementBase, outcome: "PUSH" }, PUBLIC_URL);
    expect(out.text).toContain("Full snapshot");
  });
});

describe("buildSettlementTweet — null heaviestContributorFactor (WIN)", () => {
  it("falls back to 'data' for null heaviestContributorFactor", () => {
    const out = buildSettlementTweet(
      { ...settlementBase, heaviestContributorFactor: null },
      PUBLIC_URL,
    );
    expect(out.text).toContain("data signal was the heaviest contributor");
  });
});

describe("buildSettlementTweet — LOSS null factors", () => {
  it("falls back to 'factor read did not hold' when oneLineCause is null", () => {
    const out = buildSettlementTweet(
      { ...settlementBase, outcome: "L", biggestMissFactor: "depth", oneLineCause: null },
      PUBLIC_URL,
    );
    expect(out.text).toContain("factor read did not hold");
  });

  it("falls back to 'data' for null biggestMissFactor in LOSS", () => {
    const out = buildSettlementTweet(
      { ...settlementBase, outcome: "L", biggestMissFactor: null, oneLineCause: null },
      PUBLIC_URL,
    );
    expect(out.text).toContain("data signal misread");
  });

  it("uses Post-mortem link label for LOSS", () => {
    const out = buildSettlementTweet(
      { ...settlementBase, outcome: "L", biggestMissFactor: null, oneLineCause: null },
      PUBLIC_URL,
    );
    expect(out.text).toContain("Post-mortem");
  });
});

// ============================================================
// buildPostMortemThread
// ============================================================

const postMortemBase: PostMortemThreadInput = {
  matchup: "BOS @ MIL",
  pickLine: "BOS -3.5",
  outcome: "L",
  heaviestContributorFactor: "restAdvantage",
  biggestMissFactor: "lineMovement",
  oneLineCause: "sharp reversal hit after our snapshot",
  sport: "NBA",
  gameId: "game-4",
  modelVersion: "v5.1.0",
  topFactorsAtPublish: [
    { factor: "restAdvantage", score: 0.78 },
    { factor: "consensus", score: 0.65 },
    { factor: "depth", score: 0.58 },
  ],
  whatChanged: "Sharp money reversed the line 2+ points against us.",
  whatThisUpdates: "Rest advantage signal weight reviewed for NBA back-to-backs.",
};

describe("buildPostMortemThread — structure", () => {
  it("always returns exactly 6 posts", () => {
    const posts = buildPostMortemThread(postMortemBase, PUBLIC_URL);
    expect(posts).toHaveLength(6);
  });

  it("post 1 includes LOSS and the pick line", () => {
    const posts = buildPostMortemThread(postMortemBase, PUBLIC_URL);
    expect(posts[0]).toContain("LOSS");
    expect(posts[0]).toContain("BOS -3.5");
  });

  it("final post links to the game room", () => {
    const posts = buildPostMortemThread(postMortemBase, PUBLIC_URL);
    expect(posts[5]).toContain(`${PUBLIC_URL}/room/game-4`);
  });
});

describe("buildPostMortemThread — null biggestMissFactor", () => {
  it("falls back to 'the read' when biggestMissFactor is null", () => {
    const posts = buildPostMortemThread(
      { ...postMortemBase, biggestMissFactor: null },
      PUBLIC_URL,
    );
    // post4 contains what we got wrong
    expect(posts[3]).toContain("the read");
  });
});

describe("buildPostMortemThread — null oneLineCause", () => {
  it("falls back to 'misread the picture' when oneLineCause is null", () => {
    const posts = buildPostMortemThread(
      { ...postMortemBase, oneLineCause: null },
      PUBLIC_URL,
    );
    expect(posts[3]).toContain("misread the picture");
  });
});

describe("buildPostMortemThread — topFactors capped at 3", () => {
  it("lists at most 3 factors in post 2 even when more are provided", () => {
    const posts = buildPostMortemThread(
      {
        ...postMortemBase,
        topFactorsAtPublish: [
          { factor: "restAdvantage", score: 0.9 },
          { factor: "consensus", score: 0.8 },
          { factor: "depth", score: 0.7 },
          { factor: "lineMovement", score: 0.6 }, // 4th — should be excluded
        ],
      },
      PUBLIC_URL,
    );
    const factorLines = (posts[1] ?? "").split("\n").filter((l) => l.startsWith("- "));
    expect(factorLines).toHaveLength(3);
    // lineMovement (4th factor) should not appear
    expect(posts[1]).not.toContain("line movement");
  });
});
