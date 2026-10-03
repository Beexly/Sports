import type { MediaPlatform } from "./platform-strategy";

export interface RepurposingOutput {
  readonly platform: MediaPlatform;
  readonly format: string;
  readonly title: string;
  readonly hook: string;
  readonly cta: string;
}

export interface RepurposingPlan {
  readonly sourceAsset: "youtube_long" | "podcast" | "article" | "newsletter";
  readonly outputs: readonly RepurposingOutput[];
}

export function buildDefaultRepurposingPlan(sourceAsset: RepurposingPlan["sourceAsset"], baseTitle: string): RepurposingPlan {
  const cleanTitle = baseTitle.trim() || "GSE Board Meeting";
  const shortHook = sourceAsset === "newsletter" ? "The board note in one lesson." : "The strongest evidence lesson from the full piece.";
  return {
    outputs: [
      ...Array.from({ length: 6 }, (_, index) => ({
        cta: "Watch or read the full GSE board note.",
        format: "short-form clip",
        hook: `${shortHook} Clip ${index + 1}.`,
        platform: index % 3 === 0 ? "youtube_short" : index % 3 === 1 ? "tiktok" : "instagram_reel",
        title: `${cleanTitle}: evidence cut ${index + 1}`,
      }) satisfies RepurposingOutput),
      {
        cta: "Join the newsletter for the full board.",
        format: "newsletter section",
        hook: "Turn the asset into a single evidence lesson with source and review notes.",
        platform: "newsletter",
        title: `${cleanTitle}: board note`,
      },
      {
        cta: "Read the full context on the site.",
        format: "thread",
        hook: "Break the core argument into evidence, caveat, and decision takeaway.",
        platform: "x_thread",
        title: `${cleanTitle}: thread`,
      },
      {
        cta: "Partner inquiries are open for evidence-first sports intelligence.",
        format: "founder post",
        hook: "Translate the asset into a business or build-in-public lesson.",
        platform: "linkedin",
        title: `${cleanTitle}: builder note`,
      },
      {
        cta: "Save the checklist before the next slate.",
        format: "carousel",
        hook: "Convert the lesson into a five-slide framework.",
        platform: "instagram_carousel",
        title: `${cleanTitle}: checklist`,
      },
    ],
    sourceAsset,
  };
}
