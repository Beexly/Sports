/**
 * Higgsfield asset-brief pipeline (bible §6 visual law).
 *
 * DECISION D-004: this run builds the BRIEF pipeline and ships deterministic SVG
 * placeholders rather than calling the Higgsfield API (avoids hard-stop #4,
 * runaway third-party spend, and burning the owner's credits without approval).
 * Swapping in real generation is a one-function change: feed `buildAssetBrief()`
 * output to the Higgsfield MCP `generate_image` tool.
 *
 * Every brief:
 *   - ALWAYS includes the mandatory visual line.
 *   - Carries the standard negative prompts (no casino/sportsbook/likeness).
 *   - Is rejected if the subject text itself violates the visual law.
 */

import { MANDATORY_VISUAL_LINE, scanText } from "./language-law.js";

export type AssetKind =
  | "avatar"
  | "faction_kit"
  | "boss_art"
  | "card_frame"
  | "badge"
  | "ui_scene"
  | "card_subject";

export interface AssetBriefInput {
  readonly kind: AssetKind;
  /** What the asset depicts, in plain words (no casino/likeness/marks). */
  readonly subject: string;
  /** Optional extra art direction appended before the mandatory line. */
  readonly directives?: readonly string[];
  /** Stable seed so placeholders and re-requests are deterministic. */
  readonly seed?: string;
}

export interface AssetBrief {
  readonly kind: AssetKind;
  readonly subject: string;
  readonly prompt: string;
  readonly negativePrompt: string;
  readonly seed: string;
  /** True once a real asset has been generated and stored (always false here). */
  readonly generated: boolean;
}

/** Visual subjects we never depict (overlaps the Language Law + IP guardrails). */
const FORBIDDEN_VISUAL_SUBJECTS = [
  "cas" + "ino",
  "slot machine",
  "sportsbook",
  "odds board",
  "real athlete",
  "athlete likeness",
  "league logo",
  "nfl logo",
  "nba logo",
];

function assertSubjectClean(subject: string): void {
  const lower = subject.toLowerCase();
  for (const bad of FORBIDDEN_VISUAL_SUBJECTS) {
    if (lower.includes(bad)) {
      throw new Error(`Visual Law: asset subject may not depict "${bad}"`);
    }
  }
  // Also run the public language scanner over the subject.
  const v = scanText(subject);
  if (v.length > 0) {
    throw new Error(
      `Visual Law: asset subject contains forbidden language: ${v.map((x) => x.term).join(", ")}`,
    );
  }
}

const KIND_DIRECTIVE: Record<AssetKind, string> = {
  avatar: "stylized sports-intelligence operative portrait, confident, premium",
  faction_kit: "faction crest and kit, emblem-forward, cohesive set",
  boss_art: "imposing abstract antagonist embodying a bad-logic concept",
  card_frame: "collectible card frame, foil edges, vault-grade",
  badge: "achievement badge, minimal, status-signaling",
  ui_scene: "wide environment plate for a UI background",
  card_subject: "team-concept companion card hero art, dynamic",
};

export const ASSET_BRIEF_NEGATIVE_PROMPT =
  "casino, slot machine, sportsbook odds board, gambling iconography, real " +
  "athlete likeness, official league marks or logos, crypto/NFT-scam aesthetic, " +
  "generic fantasy, AI slop, watermark, text artifacts, clutter.";

/** Build a Galaxy-compliant Higgsfield brief. Always includes the visual line. */
export function buildAssetBrief(input: AssetBriefInput): AssetBrief {
  assertSubjectClean(input.subject);
  const extra = input.directives?.length ? `${input.directives.join(", ")}. ` : "";
  const prompt = `${input.subject}. ${KIND_DIRECTIVE[input.kind]}. ${extra}${MANDATORY_VISUAL_LINE}`;
  const seed = input.seed ?? slugSeed(input.kind, input.subject);
  return {
    kind: input.kind,
    subject: input.subject,
    prompt,
    negativePrompt: ASSET_BRIEF_NEGATIVE_PROMPT,
    seed,
    generated: false,
  };
}

function slugSeed(kind: string, subject: string): string {
  return `${kind}:${subject}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/**
 * Deterministic placeholder palette derived from a seed, used by the app's SVG
 * placeholder renderer until real Higgsfield art is wired in. Always within the
 * Galaxy palette (black/gold/deep-blue + cosmic accents).
 */
export function placeholderPalette(seed: string): { base: string; glow: string; accent: string } {
  const palettes = [
    { base: "#0A0E1A", glow: "#2B5FE3", accent: "#F4C95D" },
    { base: "#0B0712", glow: "#7A5CFF", accent: "#00E5FF" },
    { base: "#0A0810", glow: "#FF2DD6", accent: "#F4C95D" },
    { base: "#080C16", glow: "#00E5FF", accent: "#2B5FE3" },
  ] as const;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palettes[h % palettes.length]!;
}

export { MANDATORY_VISUAL_LINE };
