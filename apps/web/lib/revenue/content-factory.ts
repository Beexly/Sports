/**
 * Content factory config — Workstream M3 (/cockpit/content-factory).
 *
 * One Galaxy Desk brief → many derivative surfaces.
 * Source of truth: docs/revenue/revenue-operating-system.md,
 * "The operating flywheel — one brief, many surfaces".
 *
 * This module is STRUCTURAL CONFIG ONLY.
 * - No fabricated content rows, briefs, or metrics.
 * - No AI auto-generation; draft content goes through AVA + owner gate.
 * - 0 briefs processed is an honest zero — not a placeholder count.
 */

// ── Derivative output categories ─────────────────────────────────────────────

export type OutputCategory =
  | "owned_media"
  | "social_short"
  | "social_video"
  | "platform_audio"
  | "conversion_cta"
  | "revenue"
  | "community"
  | "product_insight";

export interface DerivativeOutput {
  /** Short label shown in the UI */
  readonly label: string;
  readonly category: OutputCategory;
  /** One-line description of what this derivative is */
  readonly description: string;
  /**
   * The agent responsible for generating the draft.
   * AVA = draft-only; owner gate required before publish.
   */
  readonly ownerAgent: string;
}

// ── The canonical one-brief-many-surfaces map ─────────────────────────────────
// Source: revenue-operating-system.md

export const DERIVATIVE_OUTPUTS: readonly DerivativeOutput[] = [
  // Owned media
  {
    label: "Member brief",
    category: "owned_media",
    description: "Full Galaxy Desk brief for paying Founding Desk members.",
    ownerAgent: "AVA",
  },
  {
    label: "Free newsletter (Desk Note)",
    category: "owned_media",
    description:
      "Condensed public version of the brief for email list subscribers.",
    ownerAgent: "AVA",
  },
  {
    label: "Article / blog post",
    category: "owned_media",
    description:
      "Long-form SEO article expanding one insight from the brief for /articles.",
    ownerAgent: "AVA",
  },
  {
    label: "YouTube script",
    category: "platform_audio",
    description:
      "Full-length video script (8–15 min) for the YouTube trust engine.",
    ownerAgent: "AVA",
  },
  // Short-form video
  {
    label: "YouTube Short 1",
    category: "social_video",
    description: "60-second hook format — top market mirage from the brief.",
    ownerAgent: "AVA",
  },
  {
    label: "YouTube Short 2",
    category: "social_video",
    description: "60-second hook — no-bet signal with the reason.",
    ownerAgent: "AVA",
  },
  {
    label: "YouTube Short 3",
    category: "social_video",
    description: "60-second hook — public narrative vs market pressure contrast.",
    ownerAgent: "AVA",
  },
  {
    label: "TikTok 1",
    category: "social_short",
    description: "15–60 second hook for TikTok top-of-funnel.",
    ownerAgent: "AVA",
  },
  {
    label: "TikTok 2",
    category: "social_short",
    description: "Signal vs noise format adapted for TikTok.",
    ownerAgent: "AVA",
  },
  {
    label: "TikTok 3",
    category: "social_short",
    description: "Confidence autopsy format — honest outcome review.",
    ownerAgent: "AVA",
  },
  {
    label: "Instagram Reel 1",
    category: "social_short",
    description: "Reel: market mirage visual treatment.",
    ownerAgent: "AVA",
  },
  {
    label: "Instagram Reel 2",
    category: "social_short",
    description: "Reel: no-bet watch announcement.",
    ownerAgent: "AVA",
  },
  {
    label: "Instagram Reel 3",
    category: "social_short",
    description: "Reel: the desk note teaser — drives email signups.",
    ownerAgent: "AVA",
  },
  // Platform audio
  {
    label: "Podcast episode",
    category: "platform_audio",
    description:
      "Audio version of the Galaxy Desk brief — 10–20 min spoken walk-through.",
    ownerAgent: "AVA",
  },
  // IG carousel
  {
    label: "Instagram carousel",
    category: "social_short",
    description:
      "5–8 slide carousel: data breakdown + signal labels from the brief.",
    ownerAgent: "AVA",
  },
  // Sponsor slot
  {
    label: "Sponsor slot",
    category: "revenue",
    description:
      "One safe-category sponsor mention per brief (gated on active sponsor). Owner-reviewed before publish.",
    ownerAgent: "BOBBY",
  },
  // Conversion CTAs
  {
    label: "Ask Galaxy CTA",
    category: "conversion_cta",
    description:
      "Inline prompt inviting readers to submit one game to Ask Galaxy.",
    ownerAgent: "SARAH",
  },
  {
    label: "Founding Desk CTA",
    category: "conversion_cta",
    description:
      "Subscription offer block linking to /founding-desk (inert until price ID is configured).",
    ownerAgent: "SARAH",
  },
  // Merch phrase test
  {
    label: "Merch phrase test",
    category: "revenue",
    description:
      "One candidate phrase from the brief's best line — tested via social poll before print-on-demand.",
    ownerAgent: "QUILL",
  },
  // Community / product
  {
    label: "Objection prompt",
    category: "community",
    description:
      "A challenge question extracted from the brief to post in the community and feed the objection ledger.",
    ownerAgent: "SARAH",
  },
  {
    label: "Product insight",
    category: "product_insight",
    description:
      "What this brief reveals about what the audience needs — feeds the product backlog and the Ask Galaxy classification taxonomy.",
    ownerAgent: "VECTOR",
  },
];

// ── Category metadata ─────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<OutputCategory, string> = {
  owned_media: "Owned media",
  social_short: "Social short-form",
  social_video: "Social video (Shorts)",
  platform_audio: "Platform audio/video",
  conversion_cta: "Conversion CTA",
  revenue: "Revenue",
  community: "Community",
  product_insight: "Product insight",
};

// ── Summary ───────────────────────────────────────────────────────────────────

/**
 * How many derivative outputs a single Desk brief produces.
 * This is a structural count — not a processed-briefs count.
 */
export const OUTPUTS_PER_BRIEF = DERIVATIVE_OUTPUTS.length;

/**
 * Core recurring formats that anchor the content cadence.
 * Source: revenue-operating-system.md.
 */
export const RECURRING_FORMATS = [
  {
    name: "Market Mirage",
    description:
      "Public belief vs market pricing — where the crowd is wrong and why.",
  },
  {
    name: "No-Bet Watch",
    description:
      "The game everyone wants action on, and why we may refuse — No-Bet as a first-class product.",
  },
  {
    name: "Signal vs Noise",
    description:
      "Separating real information from narrative chatter in this week's slate.",
  },
  {
    name: "Public Narrative vs Market Pressure",
    description:
      "How the media story diverges from where sharp money is moving.",
  },
  {
    name: "Confidence Autopsy",
    description:
      "Honest post-mortem: what the model got right, wrong, or refused to claim.",
  },
  {
    name: "The Desk Note",
    description:
      "The weekly member brief — the full-length intelligence ritual for Founding Desk subscribers.",
  },
  {
    name: "Reality Room",
    description:
      "Weekly summary: what was signal, what was noise, what we got wrong, what we refuse to claim yet.",
  },
] as const;
