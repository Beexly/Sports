/**
 * Targeted coverage for Discord bot embed builder functions.
 *
 * Covers: buildPickPublicationEmbed (unknown grade label, null edgeIndex, URL),
 * buildSettlementEmbed (WIN/LOSS/PUSH outcomes, null factors, null oneLineCause,
 * finalScore override), and buildSlateStateGatedEmbed (null edgeIndex, fields).
 */

import { describe, it, expect } from "vitest";
import { buildPickPublicationEmbed } from "@/lib/discord-bot/templates/pick-publication-embed";
import { buildSettlementEmbed } from "@/lib/discord-bot/templates/settlement-embed";
import { buildSlateStateGatedEmbed } from "@/lib/discord-bot/templates/slate-state-gated-embed";
import { BRAND_COLORS } from "@/lib/discord-bot/templates/types";
import type {
  PickPublicationInput,
  SettlementInput,
  SlateStateGatedInput,
} from "@/lib/discord-bot/templates/types";

const PUBLIC_URL = "https://galaxy.test";

// ============================================================
// buildPickPublicationEmbed
// ============================================================

const pickInput: PickPublicationInput = {
  matchup: "GSW @ LAL",
  pickKind: "SPREAD",
  line: "GSW -3.5",
  side: "HOME",
  pickGrade: "SOLID_PLAY",
  confidence: 71.4,
  edgeIndex: 5.2,
  sport: "NBA",
  gameId: "game-123",
  modelVersion: "v5.1.0",
  gameStartsAt: new Date("2026-05-22T23:30:00.000Z"),
};

describe("buildPickPublicationEmbed — title and description", () => {
  it("includes line and grade label in title", () => {
    const embed = buildPickPublicationEmbed(pickInput, PUBLIC_URL);
    expect(embed.title).toContain("GSW -3.5");
    expect(embed.title).toContain("SOLID_PLAY");
  });

  it("rounds confidence in description", () => {
    const embed = buildPickPublicationEmbed(pickInput, PUBLIC_URL);
    expect(embed.description).toContain("71%");
  });

  it("falls back to raw pickGrade when grade is not in label map", () => {
    const embed = buildPickPublicationEmbed(
      { ...pickInput, pickGrade: "CUSTOM_GRADE" },
      PUBLIC_URL,
    );
    expect(embed.title).toContain("CUSTOM_GRADE");
  });
});

describe("buildPickPublicationEmbed — edgeIndex field", () => {
  it("formats edgeIndex to 1 decimal when present", () => {
    const embed = buildPickPublicationEmbed(pickInput, PUBLIC_URL);
    const edgeField = embed.fields.find((f) => f.name === "Edge Index");
    expect(edgeField?.value).toBe("5.2");
  });

  it("shows 'n/a' when edgeIndex is null", () => {
    const embed = buildPickPublicationEmbed({ ...pickInput, edgeIndex: null }, PUBLIC_URL);
    const edgeField = embed.fields.find((f) => f.name === "Edge Index");
    expect(edgeField?.value).toBe("n/a");
  });
});

describe("buildPickPublicationEmbed — URL and color", () => {
  it("constructs roomUrl from publicUrl + gameId", () => {
    const embed = buildPickPublicationEmbed(pickInput, PUBLIC_URL);
    expect(embed.url).toBe(`${PUBLIC_URL}/room/game-123`);
  });

  it("uses ULTRAVIOLET brand color", () => {
    const embed = buildPickPublicationEmbed(pickInput, PUBLIC_URL);
    expect(embed.color).toBe(BRAND_COLORS.ULTRAVIOLET);
  });

  it("strips protocol from footer text", () => {
    const embed = buildPickPublicationEmbed(pickInput, PUBLIC_URL);
    expect(embed.footer.text).not.toContain("https://");
    expect(embed.footer.text).toContain("galaxy.test");
  });
});

// ============================================================
// buildSettlementEmbed — WIN outcome
// ============================================================

const settlementBase: SettlementInput = {
  matchup: "GSW @ LAL",
  pickLine: "GSW -3.5",
  outcome: "W",
  finalScore: "GSW 112 LAL 105",
  confidenceAtPublish: 71.6,
  heaviestContributorFactor: "lineMovement",
  biggestMissFactor: null,
  oneLineCause: null,
  sport: "NBA",
  gameId: "game-456",
  modelVersion: "v5.1.0",
  settledAt: new Date("2026-05-22T04:00:00.000Z"),
};

describe("buildSettlementEmbed — WIN", () => {
  it("title contains WIN text", () => {
    const embed = buildSettlementEmbed(settlementBase, PUBLIC_URL);
    expect(embed.title).toContain("WIN");
    expect(embed.title).toContain("GSW -3.5");
  });

  it("uses WIN_GREEN color", () => {
    const embed = buildSettlementEmbed(settlementBase, PUBLIC_URL);
    expect(embed.color).toBe(BRAND_COLORS.WIN_GREEN);
  });

  it("description references heaviestContributorFactor in friendly form", () => {
    const embed = buildSettlementEmbed(settlementBase, PUBLIC_URL);
    expect(embed.description).toContain("line movement");
  });

  it("shows 'Full snapshot' in footer for WIN", () => {
    const embed = buildSettlementEmbed(settlementBase, PUBLIC_URL);
    expect(embed.footer.text).toContain("Full snapshot");
  });

  it("uses null heaviestContributorFactor gracefully (shows 'data')", () => {
    const embed = buildSettlementEmbed(
      { ...settlementBase, heaviestContributorFactor: null },
      PUBLIC_URL,
    );
    expect(embed.description).toContain("data");
  });
});

// ============================================================
// buildSettlementEmbed — LOSS outcome
// ============================================================

describe("buildSettlementEmbed — LOSS", () => {
  it("title contains LOSS text", () => {
    const embed = buildSettlementEmbed(
      { ...settlementBase, outcome: "L", biggestMissFactor: "restAdvantage", oneLineCause: "rest edge evaporated" },
      PUBLIC_URL,
    );
    expect(embed.title).toContain("LOSS");
  });

  it("uses LOSS_RED color", () => {
    const embed = buildSettlementEmbed(
      { ...settlementBase, outcome: "L", biggestMissFactor: "consensus", oneLineCause: "consensus collapsed" },
      PUBLIC_URL,
    );
    expect(embed.color).toBe(BRAND_COLORS.LOSS_RED);
  });

  it("shows 'Post-mortem' in footer for LOSS", () => {
    const embed = buildSettlementEmbed(
      { ...settlementBase, outcome: "L", biggestMissFactor: null, oneLineCause: null },
      PUBLIC_URL,
    );
    expect(embed.footer.text).toContain("Post-mortem");
  });

  it("uses oneLineCause when provided", () => {
    const embed = buildSettlementEmbed(
      { ...settlementBase, outcome: "L", biggestMissFactor: "depth", oneLineCause: "depth signal flipped late" },
      PUBLIC_URL,
    );
    expect(embed.description).toContain("depth signal flipped late");
  });

  it("falls back to default cause when oneLineCause is null", () => {
    const embed = buildSettlementEmbed(
      { ...settlementBase, outcome: "L", biggestMissFactor: "depth", oneLineCause: null },
      PUBLIC_URL,
    );
    expect(embed.description).toContain("factor read did not hold");
  });

  it("handles null biggestMissFactor gracefully", () => {
    const embed = buildSettlementEmbed(
      { ...settlementBase, outcome: "L", biggestMissFactor: null, oneLineCause: null },
      PUBLIC_URL,
    );
    expect(embed.description).toContain("data");
  });
});

// ============================================================
// buildSettlementEmbed — PUSH outcome
// ============================================================

describe("buildSettlementEmbed — PUSH", () => {
  it("title contains PUSH text", () => {
    const embed = buildSettlementEmbed({ ...settlementBase, outcome: "PUSH" }, PUBLIC_URL);
    expect(embed.title).toContain("PUSH");
  });

  it("uses PUSH_AMBER color", () => {
    const embed = buildSettlementEmbed({ ...settlementBase, outcome: "PUSH" }, PUBLIC_URL);
    expect(embed.color).toBe(BRAND_COLORS.PUSH_AMBER);
  });

  it("description mentions 'Line landed on the number'", () => {
    const embed = buildSettlementEmbed({ ...settlementBase, outcome: "PUSH" }, PUBLIC_URL);
    expect(embed.description).toContain("Line landed on the number");
  });

  it("shows 'Full snapshot' in footer for PUSH", () => {
    const embed = buildSettlementEmbed({ ...settlementBase, outcome: "PUSH" }, PUBLIC_URL);
    expect(embed.footer.text).toContain("Full snapshot");
  });
});

describe("buildSettlementEmbed — fields", () => {
  it("shows finalScore in Result field when provided", () => {
    const embed = buildSettlementEmbed(settlementBase, PUBLIC_URL);
    const resultField = embed.fields.find((f) => f.name === "Result");
    expect(resultField?.value).toBe("GSW 112 LAL 105");
  });

  it("rounds confidenceAtPublish in At publish field", () => {
    const embed = buildSettlementEmbed(settlementBase, PUBLIC_URL);
    const pubField = embed.fields.find((f) => f.name === "At publish");
    expect(pubField?.value).toBe("72% confidence");
  });

  it("sets settledAt as embed timestamp", () => {
    const embed = buildSettlementEmbed(settlementBase, PUBLIC_URL);
    expect(embed.timestamp).toBe("2026-05-22T04:00:00.000Z");
  });

  it("constructs roomUrl from publicUrl + gameId", () => {
    const embed = buildSettlementEmbed(settlementBase, PUBLIC_URL);
    expect(embed.url).toBe(`${PUBLIC_URL}/room/game-456`);
  });
});

// ============================================================
// buildSlateStateGatedEmbed
// ============================================================

const gatedInput: SlateStateGatedInput = {
  matchup: "BOS @ NYK",
  edgeIndex: 3.8,
  gateReason: "LOW_DEPTH",
  gateReasonText: "Market depth below publish threshold.",
  sport: "NBA",
  gameId: "game-789",
  modelVersion: "v5.1.0",
  gateDecisionAt: new Date("2026-05-22T14:00:00.000Z"),
};

describe("buildSlateStateGatedEmbed", () => {
  it("includes matchup in title", () => {
    const embed = buildSlateStateGatedEmbed(gatedInput, PUBLIC_URL);
    expect(embed.title).toContain("BOS @ NYK");
  });

  it("sets description to gateReasonText", () => {
    const embed = buildSlateStateGatedEmbed(gatedInput, PUBLIC_URL);
    expect(embed.description).toBe("Market depth below publish threshold.");
  });

  it("formats edgeIndex to 1 decimal in field", () => {
    const embed = buildSlateStateGatedEmbed(gatedInput, PUBLIC_URL);
    const edgeField = embed.fields.find((f) => f.name === "Edge Index");
    expect(edgeField?.value).toBe("3.8");
  });

  it("shows 'n/a' when edgeIndex is null", () => {
    const embed = buildSlateStateGatedEmbed({ ...gatedInput, edgeIndex: null }, PUBLIC_URL);
    const edgeField = embed.fields.find((f) => f.name === "Edge Index");
    expect(edgeField?.value).toBe("n/a");
  });

  it("uses GATED_GREY color", () => {
    const embed = buildSlateStateGatedEmbed(gatedInput, PUBLIC_URL);
    expect(embed.color).toBe(BRAND_COLORS.GATED_GREY);
  });

  it("constructs roomUrl from publicUrl + gameId", () => {
    const embed = buildSlateStateGatedEmbed(gatedInput, PUBLIC_URL);
    expect(embed.url).toBe(`${PUBLIC_URL}/room/game-789`);
  });

  it("sets gateDecisionAt as embed timestamp", () => {
    const embed = buildSlateStateGatedEmbed(gatedInput, PUBLIC_URL);
    expect(embed.timestamp).toBe("2026-05-22T14:00:00.000Z");
  });

  it("strips protocol from footer text", () => {
    const embed = buildSlateStateGatedEmbed(gatedInput, PUBLIC_URL);
    expect(embed.footer.text).not.toContain("https://");
    expect(embed.footer.text).toContain("galaxy.test");
  });
});
