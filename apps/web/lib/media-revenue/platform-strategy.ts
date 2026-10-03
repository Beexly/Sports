import type { GseContentPillar } from "./content-pillars";

export type MediaPlatform =
  | "youtube_long"
  | "youtube_short"
  | "tiktok"
  | "instagram_reel"
  | "instagram_carousel"
  | "x_thread"
  | "linkedin"
  | "newsletter"
  | "podcast";

export interface PlatformStrategy {
  readonly platform: MediaPlatform;
  readonly primaryGoal: "reach" | "authority" | "conversion" | "partnership" | "retention";
  readonly secondaryGoals: readonly string[];
  readonly idealLength: string;
  readonly bestPillars: readonly GseContentPillar[];
  readonly hookRequirement: string;
  readonly ctaType: "newsletter" | "site" | "watch_long" | "comment_keyword" | "partner" | "founder_member" | "api_waitlist";
  readonly complianceNotes: readonly string[];
  readonly productionNotes: readonly string[];
}

export const PLATFORM_STRATEGIES: Readonly<Record<MediaPlatform, PlatformStrategy>> = {
  instagram_carousel: {
    bestPillars: ["player_signal_lab", "decision_psychology", "market_mirage"],
    complianceNotes: ["Keep slides educational.", "Add disclosure slide when sponsored.", "No unverified performance claims."],
    ctaType: "newsletter",
    hookRequirement: "First slide must state the counterintuitive lesson.",
    idealLength: "5 to 8 slides",
    platform: "instagram_carousel",
    primaryGoal: "authority",
    productionNotes: ["Use original diagrams and app screenshots only.", "Make save/share value obvious."],
    secondaryGoals: ["relationship", "framework reuse", "partner credibility"],
  },
  instagram_reel: {
    bestPillars: ["no_bet_clinic", "player_signal_lab", "partner_tool_review"],
    complianceNotes: ["Caption any sponsor relationship.", "Avoid casino-style visuals.", "No external auto-upload."],
    ctaType: "newsletter",
    hookRequirement: "First frame must carry the lesson in plain text.",
    idealLength: "20 to 45 seconds",
    platform: "instagram_reel",
    primaryGoal: "reach",
    productionNotes: ["Captions always.", "Cut one idea from a longer board or lab segment."],
    secondaryGoals: ["trust", "shareable proof", "partner credibility"],
  },
  linkedin: {
    bestPillars: ["sports_data_business", "gse_lab", "founder_build_log", "partner_tool_review"],
    complianceNotes: ["Make B2B claims evidence-specific.", "No fake traction numbers.", "Disclose partnerships."],
    ctaType: "partner",
    hookRequirement: "Lead with a business or proof problem, not a pick.",
    idealLength: "150 to 600 words",
    platform: "linkedin",
    primaryGoal: "partnership",
    productionNotes: ["Use founder voice and concrete shipped artifacts.", "Link to docs or static public pages when useful."],
    secondaryGoals: ["B2B credibility", "API demand", "founder trust"],
  },
  newsletter: {
    bestPillars: ["board_meeting", "market_mirage", "loss_autopsy", "player_signal_lab"],
    complianceNotes: ["Owned audience does not lower claim standards.", "Keep sponsor disclosure near the sponsor mention.", "No unsupported calibration claims."],
    ctaType: "site",
    hookRequirement: "Subject line should promise a specific evidence lesson.",
    idealLength: "700 to 1,200 words",
    platform: "newsletter",
    primaryGoal: "conversion",
    productionNotes: ["One flagship idea, one board note, one CTA.", "Start with a coming-soon or waitlist state until provider integration exists."],
    secondaryGoals: ["retention", "trust", "subscription conversion"],
  },
  podcast: {
    bestPillars: ["board_meeting", "loss_autopsy", "sports_data_business", "gse_lab"],
    complianceNotes: ["Keep sponsor copy separated.", "No live betting prompts.", "Do not use copyrighted broadcast audio."],
    ctaType: "partner",
    hookRequirement: "Open with what shipped, broke, or changed.",
    idealLength: "20 to 45 minutes when ready",
    platform: "podcast",
    primaryGoal: "authority",
    productionNotes: ["Begin as a board meeting video/audio archive.", "Use manual upload only."],
    secondaryGoals: ["sponsorship", "founder credibility", "partner pipeline"],
  },
  tiktok: {
    bestPillars: ["founder_build_log", "no_bet_clinic", "decision_psychology", "market_mirage"],
    complianceNotes: ["Discovery platform, not betting advice.", "Disclose sponsorships.", "No spammy AI automation."],
    ctaType: "watch_long",
    hookRequirement: "No intro; start with the tension or lesson.",
    idealLength: "15 to 60 seconds",
    platform: "tiktok",
    primaryGoal: "reach",
    productionNotes: ["Raw but disciplined founder voice works.", "Test hooks before making long-form."],
    secondaryGoals: ["viral testing", "founder personality", "audience discovery"],
  },
  x_thread: {
    bestPillars: ["market_mirage", "sports_data_business", "founder_build_log", "loss_autopsy"],
    complianceNotes: ["Avoid real-time unsupported injury or market claims.", "State evidence level clearly.", "No auto-posting."],
    ctaType: "site",
    hookRequirement: "First post must make the thesis clear without hype.",
    idealLength: "5 to 9 posts",
    platform: "x_thread",
    primaryGoal: "reach",
    productionNotes: ["Use charts only when sourced and cleared.", "Repurpose newsletter sections into threads."],
    secondaryGoals: ["real-time commentary", "founder voice", "sports data thoughts"],
  },
  youtube_long: {
    bestPillars: ["market_mirage", "loss_autopsy", "gse_lab", "sports_data_business", "board_meeting"],
    complianceNotes: ["Check paid-promotion box when sponsored.", "No copyrighted game footage without rights.", "Descriptions need disclosure and source notes."],
    ctaType: "newsletter",
    hookRequirement: "First 20 seconds must state the misconception and the evidence question.",
    idealLength: "8 to 14 minute explainers; 20 to 45 minute board meeting later",
    platform: "youtube_long",
    primaryGoal: "authority",
    productionNotes: ["Target two videos per week when capacity allows.", "Use original graphics, app screenshots, and commentary-first structure."],
    secondaryGoals: ["search", "watch time", "sponsorship", "embedded website content", "podcast archive"],
  },
  youtube_short: {
    bestPillars: ["no_bet_clinic", "market_mirage", "player_signal_lab", "decision_psychology"],
    complianceNotes: ["No outcome certainty.", "No affiliate mention without disclosure.", "No copyrighted footage assumption."],
    ctaType: "watch_long",
    hookRequirement: "One idea only, strong first frame, no intro.",
    idealLength: "20 to 60 seconds",
    platform: "youtube_short",
    primaryGoal: "reach",
    productionNotes: ["Target 1 to 2 per day when capacity allows.", "Captions always.", "Clip from long-form winners."],
    secondaryGoals: ["discovery", "funnel", "topic testing"],
  },
} as const;

export const REQUIRED_MEDIA_PLATFORMS = Object.keys(PLATFORM_STRATEGIES) as readonly MediaPlatform[];
