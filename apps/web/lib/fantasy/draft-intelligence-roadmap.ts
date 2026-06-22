/**
 * Draft intelligence roadmap data contract for Galaxy Sports Edge.
 * Defines the build phases, interfaces, and feature catalog for the
 * draft assistant system (War Room + Genome + Futures + Thesis).
 */

import type { BuildPhase, GseReadiness } from "@/lib/research/first-of-kind-systems";

// ── Draft system types ───────────────────────────────────────────────────────

export type DraftFormat = "snake" | "auction" | "best_ball" | "salary_cap";
export type LeagueSize = 8 | 10 | 12 | 14 | 16;
export type ScoringFormat = "standard" | "half_ppr" | "ppr" | "6pt_td" | "custom";
export type DraftPosition = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface DraftContext {
  format: DraftFormat;
  leagueSize: LeagueSize;
  scoring: ScoringFormat;
  rosterSlots: RosterSlotConfig;
  pickPosition: DraftPosition;
  totalRounds: number;
  auctionBudget: number | null;
}

export interface RosterSlotConfig {
  qb: number;
  rb: number;
  wr: number;
  te: number;
  flex: number;
  dst: number;
  k: number;
  bench: number;
  ir: number;
}

export type RecommendationCategory =
  | "BEST_AVAILABLE"
  | "POSITIONAL_NEED"
  | "VALUE_OVER_ADP"
  | "STACK_BUILDER"
  | "HANDCUFF_PRIORITY"
  | "BOOM_OR_BUST_LOTTERY"
  | "NO_RECOMMENDATION";

export interface DraftPickRecommendation {
  playerId: string;
  playerName: string;
  position: string;
  team: string;
  adp: number;
  pickSlot: number;
  valueOverAdp: number;
  category: RecommendationCategory;
  urgencyRoundsRemaining: number;
  bullThesis: string;
  bearThesis: string;
  riskFlags: string[];
  confidenceScore: number;
  stackContext: string | null;
}

export interface ManagerGenomeProfile {
  managerId: string;
  managerName: string;
  draftsAnalyzed: number;
  style: ManagerDraftStyle;
  tendencies: ManagerTendency[];
  predictedNextPickPosition: string | null;
  avoidancePatterns: string[];
}

export type ManagerDraftStyle =
  | "zero_rb"
  | "hero_rb"
  | "robust_rb"
  | "zero_wr"
  | "balanced"
  | "unknown";

export interface ManagerTendency {
  description: string;
  confidence: number;
  roundsAffected: number[];
  example: string;
}

export interface DraftFutureProjection {
  afterPick: number;
  rosterStrength: number;
  playoffProbability: number;
  championshipProbability: number;
  fragilePosition: string | null;
  nextPickRecommendations: DraftPickRecommendation[];
  warning: string | null;
}

// ── Build phases for draft intelligence ──────────────────────────────────────

export interface DraftIntelligencePhase {
  phase: BuildPhase;
  name: string;
  description: string;
  deliverables: string[];
  dependencies: BuildPhase[];
  acceptanceCriteria: string[];
  gseReadiness: GseReadiness;
  estimatedDays: number;
}

export const DRAFT_INTELLIGENCE_PHASES: ReadonlyArray<DraftIntelligencePhase> = [
  {
    phase: 4,
    name: "ADP Engine + Positional Scarcity",
    description:
      "Build the ADP aggregation engine. Ingest multiple ADP sources, compute consensus, and model positional scarcity curves by scoring format and league size.",
    deliverables: [
      "apps/web/lib/fantasy/adp-engine.ts — ADP aggregation + scarcity curves",
      "packages/db/prisma/schema.prisma — FantasyAdpSnapshot model",
      "apps/web/app/api/fantasy/adp/route.ts — GET /api/fantasy/adp",
    ],
    dependencies: [1, 2, 3],
    acceptanceCriteria: [
      "ADP data loads for NFL 2025 season",
      "Scarcity curves generated per position per scoring format",
      "API returns ADP data within 200ms",
      "TypeScript strict mode passes",
    ],
    gseReadiness: "designed_not_built",
    estimatedDays: 3,
  },
  {
    phase: 5,
    name: "Manager Genome Engine",
    description:
      "Build the Manager Genome system that profiles each opponent's draft tendencies from historical data. Feed into pick urgency scoring.",
    deliverables: [
      "apps/web/lib/fantasy/manager-genome.ts — genome profile builder",
      "packages/db/prisma/schema.prisma — ManagerGenome, DraftHistory models",
      "apps/web/app/api/fantasy/genome/route.ts",
    ],
    dependencies: [4],
    acceptanceCriteria: [
      "Genome computed from minimum 1 historical draft",
      "Style classification (zero_rb, hero_rb, etc.) correct on test cases",
      "Pick urgency score incorporates genome tendencies",
      "All types strict; no any",
    ],
    gseReadiness: "designed_not_built",
    estimatedDays: 5,
  },
  {
    phase: 6,
    name: "Pick Thesis Engine + War Room UI",
    description:
      "Build the Pick Thesis Engine generating bull/bear cards per recommendation. Build the War Room UI with live pick queue and genome overlays.",
    deliverables: [
      "apps/web/lib/fantasy/pick-thesis.ts — thesis generation",
      "apps/web/app/cockpit/fantasy-war-room/page.tsx — War Room UI",
      "apps/web/components/fantasy/pick-card.tsx",
      "apps/web/components/fantasy/thesis-card.tsx",
    ],
    dependencies: [4, 5],
    acceptanceCriteria: [
      "Pick cards show bull thesis, bear thesis, and risk flags",
      "War Room UI renders pick queue with current recommendation highlighted",
      "No-recommendation case renders NO_RECOMMENDATION card",
      "Mobile-responsive layout",
    ],
    gseReadiness: "designed_not_built",
    estimatedDays: 5,
  },
  {
    phase: 7,
    name: "Draft Futures Engine",
    description:
      "Real-time roster projection engine that shows your projected Week 1 depth chart, bye conflicts, and ceiling scenarios as each pick is made.",
    deliverables: [
      "apps/web/lib/fantasy/draft-futures.ts — futures engine",
      "apps/web/app/api/fantasy/draft-futures/route.ts",
    ],
    dependencies: [5, 6],
    acceptanceCriteria: [
      "Futures computed after each pick in < 500ms",
      "Fragility score computed correctly",
      "Bye week conflict detection works for all 32 NFL teams",
      "Tests pass with ≥ 90% coverage",
    ],
    gseReadiness: "designed_not_built",
    estimatedDays: 4,
  },
  {
    phase: 8,
    name: "Roster Destiny Simulator (Monte Carlo)",
    description:
      "Post-draft Monte Carlo simulation: 10,000 season simulations per roster producing playoff probability, championship probability, and fragility analysis.",
    deliverables: [
      "apps/web/lib/fantasy/roster-destiny.ts — Monte Carlo engine",
      "apps/web/app/api/fantasy/roster-destiny/route.ts",
      "apps/web/app/cockpit/fantasy-war-room/destiny/page.tsx",
    ],
    dependencies: [7],
    acceptanceCriteria: [
      "10,000 simulations complete in < 5 seconds",
      "Playoff probability calibrated against historical outcomes",
      "Fragility path identified correctly for test cases",
      "No fake injury probabilities — use actuarial tables or flag as illustrative",
    ],
    gseReadiness: "designed_not_built",
    estimatedDays: 6,
  },
] as const;

// ── Standard roster configs ───────────────────────────────────────────────────

export const STANDARD_ROSTER_CONFIGS: Record<string, RosterSlotConfig> = {
  espn_standard: { qb: 1, rb: 2, wr: 2, te: 1, flex: 1, dst: 1, k: 1, bench: 6, ir: 0 },
  yahoo_standard: { qb: 1, rb: 2, wr: 2, te: 1, flex: 1, dst: 1, k: 1, bench: 5, ir: 2 },
  sleeper_standard: { qb: 1, rb: 2, wr: 2, te: 1, flex: 1, dst: 1, k: 0, bench: 6, ir: 1 },
  superflex: { qb: 2, rb: 2, wr: 2, te: 1, flex: 1, dst: 1, k: 1, bench: 5, ir: 1 },
  best_ball_underdog: { qb: 2, rb: 4, wr: 6, te: 2, flex: 0, dst: 0, k: 0, bench: 0, ir: 0 },
} as const;

// ── Helper functions ─────────────────────────────────────────────────────────

export function urgencyLabel(roundsRemaining: number): string {
  if (roundsRemaining <= 1) return "TAKE NOW";
  if (roundsRemaining <= 2) return "HIGH URGENCY";
  if (roundsRemaining <= 4) return "MODERATE";
  return "CAN WAIT";
}

export function valueOverAdpLabel(voa: number): string {
  if (voa >= 10) return "MASSIVE VALUE";
  if (voa >= 4) return "GOOD VALUE";
  if (voa >= -3) return "FAIR PRICE";
  if (voa >= -8) return "SLIGHT REACH";
  return "SIGNIFICANT REACH";
}

export function currentPickRound(pickNumber: number, leagueSize: number): number {
  return Math.ceil(pickNumber / leagueSize);
}
