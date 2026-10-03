import type { MediaPlatform } from "./platform-strategy";

export type CreatorVoice = "gse_official" | "founder_personal" | "gsn_network";

export interface CreatorIdentityStrategy {
  readonly voice: CreatorVoice;
  readonly purpose: string;
  readonly bestPlatforms: readonly MediaPlatform[];
  readonly contentBoundaries: readonly string[];
  readonly exampleHooks: readonly string[];
  readonly cta: string;
}

export const CREATOR_IDENTITY_STRATEGIES: Readonly<Record<CreatorVoice, CreatorIdentityStrategy>> = {
  founder_personal: {
    bestPlatforms: ["linkedin", "x_thread", "tiktok", "youtube_long"],
    contentBoundaries: ["Pressure is context, not the product.", "No pity framing.", "Show shipped proof or honest blockers.", "Do not disclose secrets or private access."],
    cta: "Follow the build and join the board notes.",
    exampleHooks: [
      "I am building a sports AI that is allowed to say no.",
      "I am unemployed, building GSE, and this is what actually moved today.",
      "The hardest part of a sports prediction company is not the model. It is proof.",
      "Why I refuse to build a fake picks brand.",
    ],
    purpose: "Human build-in-public trust and founder credibility.",
    voice: "founder_personal",
  },
  gse_official: {
    bestPlatforms: ["youtube_long", "newsletter", "instagram_carousel", "linkedin"],
    contentBoundaries: ["Evidence-first brand voice.", "No fake social proof.", "No unsupported performance or calibration claims.", "Sponsor disclosure near every sponsor mention."],
    cta: "Join the GSE newsletter and review the methodology.",
    exampleHooks: ["Confidence is earned, not performed.", "No bet is a decision.", "The box score lies. The evidence does not."],
    purpose: "The official evidence brand for sports intelligence, methodology, and product trust.",
    voice: "gse_official",
  },
  gsn_network: {
    bestPlatforms: ["podcast", "youtube_long", "newsletter", "instagram_reel"],
    contentBoundaries: ["Broader media umbrella only.", "No implication that a network exists beyond current operated channels.", "No partner claims without signed proof."],
    cta: "Pitch a board meeting guest or aligned partner segment.",
    exampleHooks: ["The weekly board is open.", "Sports intelligence should be audited, not shouted.", "What the model passed on this week."],
    purpose: "Future broader media, podcast, and partnership umbrella for GSE-aligned programming.",
    voice: "gsn_network",
  },
} as const;
