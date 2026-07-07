import { describe, expect, it } from "vitest";
import { newsletterBlockTemplate } from "./newsletter-block";
import type { GenerationContext } from "./types";

const context: GenerationContext = {
  gameId: "game-bos-mil",
  modelVersion: "v6.0.4",
  brandConfig: {
    publicUrl: "https://galaxysportsedge.com",
    voiceReferences: ["docs/positioning.md"],
  },
};

describe("newsletterBlockTemplate", () => {
  it("interpolates the real gameId into the in-body Game Room link", () => {
    const prompt = newsletterBlockTemplate.promptBuilder(null, context);
    // The one inline link points at the real room URL, not a broken placeholder.
    expect(prompt.user).toContain(
      "https://galaxysportsedge.com/room/game-bos-mil",
    );
  });

  it("never emits the literal [gameId] placeholder in the link", () => {
    const prompt = newsletterBlockTemplate.promptBuilder(null, context);
    expect(prompt.user).not.toContain("[gameId]");
    expect(prompt.user).not.toContain("/room/[");
  });

  it("uses whatever gameId the context supplies", () => {
    const prompt = newsletterBlockTemplate.promptBuilder(null, {
      ...context,
      gameId: "game-lal-den",
    });
    expect(prompt.user).toContain(
      "https://galaxysportsedge.com/room/game-lal-den",
    );
    expect(prompt.user).not.toContain("game-bos-mil");
  });
});
