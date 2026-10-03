/**
 * Galaxy Studio template types.
 *
 * Each template produces a creator asset from one GameIntelligenceNode (or
 * SlateWeather). The compliance scanner runs against the output.
 *
 * Spec: docs/product/galaxy-studio-spec.md
 * Owner: Claude (template content + voice rules) + Codex (runtime).
 */

export type CreatorAssetKind =
  | "FAN_EXPLAINER"
  | "FANTASY_ANGLE"
  | "BETTING_EDUCATION"
  | "X_THREAD"
  | "TIKTOK_REELS_SCRIPT"
  | "NEWSLETTER_BLOCK"
  | "SPONSOR_SAFE_BLURB"
  | "YOUTUBE_TITLE_IDEAS";

export type VoiceTone =
  | "INFORMED_SPORTS_COLUMN"
  | "FANTASY_ANALYST"
  | "RESEARCH_EXPLAINER"
  | "TERSE_SOCIAL_THREAD"
  | "SHORT_FORM_VIDEO"
  | "NEWSLETTER_LONG_FORM"
  | "BRAND_COMPLIANT_PROMO"
  | "TITLE_LIST";

export interface ComplianceRule {
  // Regex or substring patterns that fail this template.
  pattern: RegExp;
  severity: "block" | "warn" | "info";
  message: string;
}

export interface GenerationContext {
  // Codex aligns the exact GameIntelligenceNode shape during integration.
  gameId: string;
  modelVersion: string;
  brandConfig: {
    publicUrl: string;
    voiceReferences: string[];
  };
}

export interface ClaudePrompt {
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
}

export interface StudioTemplate {
  kind: CreatorAssetKind;
  displayName: string;
  voiceTone: VoiceTone;
  targetLengthWords: { min: number; max: number };
  complianceRules: ComplianceRule[];

  /**
   * Builds the Claude API prompt given the node + context.
   * Codex aligns node typing during integration.
   */
  promptBuilder: (
    node: unknown,
    context: GenerationContext,
  ) => ClaudePrompt;
}
