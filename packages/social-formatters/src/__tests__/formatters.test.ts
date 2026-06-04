import { describe, expect, it } from "vitest";
import {
  formatLossAcknowledgmentForTwitter,
  formatPickForDiscord,
  formatPickForPush,
  formatPickForTwitter,
} from "../index";

const pick = {
  matchup: "BOS at NYK",
  selection: "BOS -2.5",
  grade: "STRONG_PLAY" as const,
  reasoning: "Depth improved and the line moved without calling it a lock.",
};

describe("@sports/social-formatters", () => {
  it("keeps Twitter copy within 280 chars and scrubs hype", () => {
    const text = formatPickForTwitter(pick);
    expect(text.length).toBeLessThanOrEqual(280);
    expect(text).not.toMatch(/lock/i);
  });

  it("formats loss acknowledgments without hiding record", () => {
    const text = formatLossAcknowledgmentForTwitter({
      record: "0-3 last Thursday",
      lesson: "market depth was thinner than it looked",
    });
    expect(text).toMatch(/0-3 last Thursday/);
    expect(text).toMatch(/miss stays on the board/);
  });

  it("uses brand grade color for Discord", () => {
    expect(formatPickForDiscord(pick).color).toBeTypeOf("number");
  });

  it("keeps push payloads compact", () => {
    const push = formatPickForPush(pick);
    expect(push.title.length).toBeLessThanOrEqual(30);
    expect(push.body.length).toBeLessThanOrEqual(90);
  });
});
