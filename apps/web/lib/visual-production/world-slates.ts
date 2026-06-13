/**
 * Visual Production — the world slate.
 *
 * The curated set of immersive asset CANDIDATES for Galaxy's surfaces. Every
 * entry is fully specified (prompt, negative prompt, overlay plan, compliance,
 * rights, reduced-motion fallback, mobile crop, reuse plan, provenance) and
 * starts as `planned`/`owner_review` with NO approvals — so the Film Room shows
 * the owner exactly what each credit would buy before any spend.
 *
 * Pure data — no network, no spend.
 */

import { type VisualAsset, NEGATIVE_PROMPT_FLOOR } from "./types";

const noApprovals = {
  productTruthVerified: false,
  complianceReviewed: false,
  rightsReviewed: false,
  overlayPlanned: false,
  reducedMotionPlanned: false,
  ownerSpendApproved: false,
} as const;

export const WORLD_SLATE: readonly VisualAsset[] = [
  {
    id: "home-hero-cosmos",
    surface: "/ (homepage hero background)",
    title: "Galaxy — the intelligence cosmos",
    productTruth: "Galaxy is a sports-intelligence operating system; the home hero sets the cinematic, observatory mood.",
    metaphor: "A slow, deep-space field of drifting light and faint constellation lattices — calm, precise, vast.",
    mediaKind: "motion",
    provider: "higgsfield",
    prompt:
      "Cinematic deep-space observatory atmosphere, slow drifting nebula in obsidian black with orbital-cyan and " +
      "soft-ultraviolet accents, faint geometric constellation lattice, volumetric depth, ultra-clean, premium, " +
      "abstract, no subjects",
    negativePrompt: NEGATIVE_PROMPT_FLOOR,
    overlayPlan: "App renders the headline, value prop, CTAs, and the Daily Intelligence strip on top — all truth is app-rendered.",
    complianceNotes: "Abstract only. No betting/sportsbook imagery, no text, no hype symbols. Responsible-gaming + claims stay app-rendered.",
    rightsNotes: "Fully synthetic abstract atmosphere. No logos, teams, players, or broadcast references.",
    reducedMotionFallback: "Static CSS radial-gradient cosmos (already shipped) with the same color tokens; no motion.",
    mobileCropPlan: "Center-weighted; safe area keeps the lattice out of the headline zone on 9:16.",
    plannedReuseCount: 6,
    reusePlan: "Home hero + loading transitions + OG/social still + cockpit login + brand deck + email header.",
    provenancePlan: "Tagged AI-generated atmosphere in the asset ledger; not presented as data.",
    priorityScore: 92,
    status: "owner_review",
    approvals: noApprovals,
  },
  {
    id: "observatory-market-field",
    surface: "/observatory (Galaxy Twin backdrop)",
    title: "The slate as a living market field",
    productTruth: "Observatory visualizes market state/volatility; the backdrop should feel like a living field, with all data app-rendered.",
    metaphor: "A gravitational field of soft currents — pressure and drift implied by motion, never by numbers.",
    mediaKind: "motion",
    provider: "higgsfield",
    prompt:
      "Abstract gravitational flow field, slow currents of light bending around unseen mass, obsidian background, " +
      "orbital-cyan and ion-magenta filaments, depth and parallax, premium scientific mood, no subjects, no text",
    negativePrompt: NEGATIVE_PROMPT_FLOOR,
    overlayPlan: "App renders the real market read, fair board, no-bet zones, freshness + demo/live labels on top.",
    complianceNotes: "Atmosphere only. Market values, fair-prob, and labels are app-rendered and gated per the audit-drawer contract.",
    rightsNotes: "Synthetic abstract. No real market data, logos, or likenesses baked in.",
    reducedMotionFallback: "Static gradient field + the existing semantic SVG layers; motion disabled.",
    mobileCropPlan: "Vertical current emphasis; nodes remain tappable over a quieter crop.",
    plannedReuseCount: 5,
    reusePlan: "Observatory backdrop + market-mirage + line-movement headers + social stills.",
    provenancePlan: "Ledger-tagged AI atmosphere; demo/live truth always app-rendered.",
    priorityScore: 88,
    status: "owner_review",
    approvals: noApprovals,
  },
  {
    id: "no-bet-stillness",
    surface: "/no-bet (No-Bet hero still)",
    title: "The discipline of the pass",
    productTruth: "No-Bet frames restraint as intelligence; the visual should feel calm and deliberate, not exciting.",
    metaphor: "A single held breath — stillness, a paused current, quiet over noise.",
    mediaKind: "still",
    provider: "higgsfield",
    prompt:
      "Minimal abstract stillness, a single calm horizon of muted light over deep obsidian, faint paused current, " +
      "restraint and quiet, premium editorial, no subjects, no text",
    negativePrompt: NEGATIVE_PROMPT_FLOOR,
    overlayPlan: "App renders the No-Bet reasoning, missing-info, what-would-change, and responsible-gaming note.",
    complianceNotes: "Calm tone by design (anti-hype). No action-urging imagery. Responsible-gaming language app-rendered.",
    rightsNotes: "Synthetic abstract; nothing licensed.",
    reducedMotionFallback: "It's a still — no motion concern; serve a compressed static image with the gradient fallback.",
    mobileCropPlan: "Horizon holds at upper third; copy sits below.",
    plannedReuseCount: 4,
    reusePlan: "No-Bet hero + Market Mirage caution cards + Academy 'why No-Bet' + social.",
    provenancePlan: "Ledger-tagged AI still.",
    priorityScore: 86,
    status: "planned",
    approvals: noApprovals,
  },
  {
    id: "academy-pathlight",
    surface: "/academy (learning-path header)",
    title: "Pathlight — learning as a route",
    productTruth: "Academy teaches decision quality; the header should feel like a guided path, not a casino.",
    metaphor: "A line of light tracing a path through soft dark — progress, guidance, clarity.",
    mediaKind: "still",
    provider: "code-native",
    prompt: "(code-native) animated SVG path of light — no generation needed at this worthiness.",
    negativePrompt: NEGATIVE_PROMPT_FLOOR,
    overlayPlan: "App renders the module list, problems solved, and responsible-gaming notes.",
    complianceNotes: "Education tone. No betting imagery.",
    rightsNotes: "Code-native; nothing generated.",
    reducedMotionFallback: "Static SVG path; motion via prefers-reduced-motion only.",
    mobileCropPlan: "Path runs vertically on mobile.",
    plannedReuseCount: 3,
    reusePlan: "Academy header + module cards.",
    provenancePlan: "No AI generation — code-native.",
    priorityScore: 48,
    status: "planned",
    approvals: noApprovals,
  },
] as const;

export function getSlateAsset(id: string): VisualAsset | undefined {
  return WORLD_SLATE.find((a) => a.id === id);
}
