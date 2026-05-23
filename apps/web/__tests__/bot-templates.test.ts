import { describe, expect, it } from "vitest";
import {
  buildPostMortemThread,
  buildSettlementTweet,
  buildSlateStateGatedTweet,
} from "@/lib/twitter-bot/templates";
import {
  BRAND_COLORS,
  buildPickPublicationEmbed,
  buildSettlementEmbed,
  buildSlateStateGatedEmbed,
} from "@/lib/discord-bot/templates";

const publicUrl = "https://galaxysportsedge.com";

describe("Twitter bot templates", () => {
  it("formats gated slate state without mojibake", () => {
    const output = buildSlateStateGatedTweet(
      {
        matchup: "MIA @ NYY",
        edgeIndex: 0.4,
        gateReasonText: "spread balanced at 51% consensus across 8 books.",
        sport: "MLB",
        gameId: "game-1",
        modelVersion: "v5.0.0",
      },
      publicUrl
    );

    expect(output.text).toContain("Just gated MIA @ NYY - spread balanced");
    expect(output.text).toContain("#MLB");
    expect(output.text).not.toMatch(/â|Â/);
  });

  it("formats settlement outcomes with the approved settlement symbols", () => {
    const win = buildSettlementTweet(
      {
        matchup: "CLE @ BAL",
        pickLine: "CLE -7",
        outcome: "W",
        heaviestContributorFactor: "scheduleStress",
        biggestMissFactor: null,
        oneLineCause: null,
        sport: "NFL",
        gameId: "game-2",
        modelVersion: "v5.0.0",
      },
      publicUrl
    );
    const loss = buildSettlementTweet(
      {
        matchup: "MIN @ DET",
        pickLine: "MIN +6",
        outcome: "L",
        heaviestContributorFactor: null,
        biggestMissFactor: "restAdvantage",
        oneLineCause: "MIN was more fatigued than projected",
        sport: "NFL",
        gameId: "game-3",
        modelVersion: "v5.0.0",
      },
      publicUrl
    );

    expect(win.text).toContain("✅ WIN - schedule stress signal was the heaviest contributor.");
    expect(loss.text).toContain("❌ LOSS - rest advantage signal misread.");
    expect(`${win.text}\n${loss.text}`).not.toMatch(/â|Â/);
  });

  it("builds loss post-mortem threads with a clean opening post", () => {
    const thread = buildPostMortemThread(
      {
        matchup: "MIN @ DET",
        pickLine: "MIN +6",
        outcome: "L",
        heaviestContributorFactor: null,
        biggestMissFactor: "restAdvantage",
        oneLineCause: "did not hold",
        sport: "NFL",
        gameId: "game-3",
        modelVersion: "v5.0.0",
        topFactorsAtPublish: [{ factor: "restAdvantage", score: 0.74 }],
        whatChanged: "Detroit's injury report cleared before kickoff.",
        whatThisUpdates: "The rest factor needs an availability cross-check.",
      },
      publicUrl
    );

    expect(thread[0]).toBe("Settled MIN +6 ❌ LOSS. Here's what the model saw and what it missed.");
    expect(thread.join("\n")).not.toMatch(/â|Â/);
  });
});

describe("Discord bot templates", () => {
  it("formats publication embeds with brand color and three fields", () => {
    const embed = buildPickPublicationEmbed(
      {
        matchup: "BOS @ NYK",
        pickKind: "SPREAD",
        line: "BOS -3.5",
        side: "BOS",
        pickGrade: "SOLID_PLAY",
        confidence: 73,
        edgeIndex: 68.4,
        sport: "NBA",
        gameId: "game-4",
        modelVersion: "v5.0.0",
        gameStartsAt: new Date("2026-05-22T23:00:00.000Z"),
      },
      publicUrl
    );

    expect(embed.color).toBe(BRAND_COLORS.ULTRAVIOLET);
    expect(embed.fields).toHaveLength(3);
    expect(embed.footer.text).toBe("Model v5.0.0 | galaxysportsedge.com");
  });

  it("formats loss settlement embeds with loss color and no mojibake", () => {
    const embed = buildSettlementEmbed(
      {
        matchup: "MIN @ DET",
        pickLine: "MIN +6",
        outcome: "L",
        finalScore: "DET 24, MIN 17",
        confidenceAtPublish: 71,
        heaviestContributorFactor: null,
        biggestMissFactor: "restAdvantage",
        oneLineCause: "MIN was more fatigued than projected",
        sport: "NFL",
        gameId: "game-5",
        modelVersion: "v5.0.0",
        settledAt: new Date("2026-05-23T03:30:00.000Z"),
      },
      publicUrl
    );

    expect(embed.title).toBe("Settled MIN +6 ❌ LOSS");
    expect(embed.color).toBe(BRAND_COLORS.LOSS_RED);
    expect(JSON.stringify(embed)).not.toMatch(/â|Â/);
  });

  it("formats gated slate embeds with a clean footer", () => {
    const embed = buildSlateStateGatedEmbed(
      {
        matchup: "MIA @ NYY",
        edgeIndex: null,
        gateReason: "LOW_EDGE",
        gateReasonText: "Consensus stayed balanced across the books.",
        sport: "MLB",
        gameId: "game-6",
        modelVersion: "v5.0.0",
        gateDecisionAt: new Date("2026-05-22T18:00:00.000Z"),
      },
      publicUrl
    );

    expect(embed.footer.text).toBe("Model v5.0.0 | galaxysportsedge.com");
    expect(JSON.stringify(embed)).not.toMatch(/â|Â/);
  });
});
