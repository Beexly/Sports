/**
 * Galaxy Dynasty — proof → progression.
 *
 * The spine of the game's tie-in to Galaxy Sports Network. A player's standing
 * in Galaxy Dynasty is NOT invented XP — it is derived from the SAME real proof
 * gates that already govern GSN's pricing ladder and public performance claims:
 * canonical settled picks, published calibration, and closing-line-value beat
 * rate (the vig break-even line, 52.4%). See:
 *   - COMPETITIVE_PRICING_AND_PACKAGING.md  (FOUNDING→PROVEN→ESTABLISHED→AUTHORITY)
 *   - apps/web/lib/pricing/pricing-phases.ts (the same rung thresholds)
 *   - apps/web/lib/performance/public-performance-policy.ts (canonical settled sample)
 *   - apps/web/lib/performance/public-clv-policy.ts          (beat-close rate)
 *
 * This module is PURE — no DB, no env, no I/O. It is the counterpart to the
 * pricing-phases module: fully unit-testable, deterministic, and the single
 * source of truth for "what does the player's real record unlock in the world?".
 * The read-only `/api/dynasty/me` BFF feeds it real facts; the game client only
 * ever renders its output. One direction, GSN → game.
 */

import type { SubscriptionTier } from "@sports/types";

/** The vig break-even close rate — the same 52.4% used across GSN's CLV surfaces. */
export const VIG_BREAK_EVEN_CLV = 0.524;

/** Rung thresholds, mirrored from the pricing ladder so the game and the price move on the same proof. */
export const DYNASTY_RANK_THRESHOLDS = {
  /** PROVEN: ≥100 canonical settled picks AND published calibration. */
  provenSettled: 100,
  /** ESTABLISHED: ≥500 canonical settled AND a beat-close rate at/above break-even. */
  establishedSettled: 500,
  /**
   * AUTHORITY: the ladder names this "multi-season ROI". The game approximates
   * multi-season durability with a high settled floor plus a sustained beat-close
   * rate. This is the game's readable stand-in, not a claim of audited ROI.
   */
  authoritySettled: 1500,
} as const;

export type DynastyRankId = "ROOKIE" | "PROVEN" | "ESTABLISHED" | "AUTHORITY";

export interface DynastyRankDef {
  readonly id: DynastyRankId;
  readonly name: string;
  /** Ladder position, 0 = entry. Matches the pricing ladder's ordering intent. */
  readonly order: number;
  /** Plain-English rung, for HUD copy. */
  readonly trigger: string;
}

/** The named ladder — ascending, each rung gated by the one below (you can't be Established without being Proven). */
export const DYNASTY_RANKS: readonly DynastyRankDef[] = [
  { id: "ROOKIE",      name: "Rookie",      order: 0, trigger: "Spawn — you've entered the city." },
  { id: "PROVEN",      name: "Proven",      order: 1, trigger: "≥100 settled picks and a published calibration." },
  { id: "ESTABLISHED", name: "Established", order: 2, trigger: "≥500 settled and beating the close (≥52.4%)." },
  { id: "AUTHORITY",   name: "Authority",   order: 3, trigger: "Multi-season durability: deep sample, sustained close-beating." },
];

export type DynastyDistrictId =
  | "rookie-plaza"
  | "the-beat"
  | "blacktop"
  | "the-vault"
  | "gm-tower"
  | "the-depths";

export interface DynastyDistrictMeta {
  readonly id: DynastyDistrictId;
  readonly name: string;
  /** The real GSN surface this district embodies. */
  readonly gsnRoute: string;
  /** Neon accent, drawn from the game's own kit palette (generate-city-kit.mjs). */
  readonly accent: string;
  readonly blurb: string;
}

/** Static district metadata. Unlock state is computed per-player in `deriveDynastyProfile`. */
export const DYNASTY_DISTRICTS: readonly DynastyDistrictMeta[] = [
  { id: "rookie-plaza", name: "Rookie Plaza", gsnRoute: "/academy",          accent: "#f4c95d", blurb: "Onboarding — learn to read a line before you're trusted with one." },
  { id: "the-beat",     name: "The Beat",     gsnRoute: "/the-beat",         accent: "#00e5ff", blurb: "The Broadcast Wall — your real content and briefs, as they publish." },
  { id: "blacktop",     name: "Blacktop",     gsnRoute: "/picks",            accent: "#f4c95d", blurb: "The live slate — where settled picks are made and graded." },
  { id: "the-vault",    name: "The Vault",    gsnRoute: "/vault",            accent: "#7a5cff", blurb: "Your building. Its floors are your real, settled track record." },
  { id: "gm-tower",     name: "GM Tower",     gsnRoute: "/fantasy",          accent: "#7a5cff", blurb: "The fantasy suite as a walkable GM office — draft, DFS, trade." },
  { id: "the-depths",   name: "The Depths",   gsnRoute: "/responsible-play", accent: "#ff2dd6", blurb: "The cautionary zone — chasing losses has a home, and an exit." },
];

/** Real, per-player facts. Every field is a measured GSN value — never fabricated. */
export interface DynastyProofInput {
  readonly tier: SubscriptionTier;
  readonly authenticated: boolean;
  readonly entitlements: {
    readonly canUseFantasyFull: boolean;
    readonly canUseClvLedger: boolean;
    readonly canGetAlerts: boolean;
  };
  readonly proof: {
    /** Canonical (non-bootstrap) settled picks — the sample GSN counts as real. */
    readonly canonicalSettledCount: number;
    readonly wins: number;
    readonly losses: number;
    readonly pushes: number;
    /** Graded closing-line-value beat rate, 0–1. Null when the graded sample is too thin. */
    readonly clvBeatRate: number | null;
    /** True once GSN has a published calibration report. */
    readonly hasPublishedCalibration: boolean;
    /** True when the public performance policy says the record may be surfaced. */
    readonly performanceStatsPublic: boolean;
  };
}

export interface DynastyDistrictState extends DynastyDistrictMeta {
  readonly unlocked: boolean;
  /** Why it's locked, in the player's language. Null when unlocked. */
  readonly lockReason: string | null;
}

export interface DynastyVaultFloor {
  readonly level: number;
  readonly label: string;
  readonly earned: boolean;
  /** The real metric that earns (or would earn) this floor. */
  readonly metric: string;
}

export interface DynastyRankState {
  readonly id: DynastyRankId;
  readonly name: string;
  readonly order: number;
  readonly next: DynastyRankId | null;
  /** 0–1 composite progress toward the next rung across all its requirements. */
  readonly progressToNext: number;
  /** What's still needed for the next rung, in plain English. Null at the top. */
  readonly requirementForNext: string | null;
}

export interface DynastyProfile {
  readonly authenticated: boolean;
  readonly tier: SubscriptionTier;
  readonly rank: DynastyRankState;
  readonly districts: readonly DynastyDistrictState[];
  readonly vault: {
    readonly floors: readonly DynastyVaultFloor[];
    readonly floorsEarned: number;
    readonly settledRecord: string;
    readonly winRate: number | null;
    readonly clvBeatRate: number | null;
    readonly proofPublic: boolean;
  };
  readonly summary: string;
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Total lookup — `resolveRankOrder` only ever yields a valid index, so a miss is a programmer error. */
function rankByOrder(order: number): DynastyRankDef {
  const def = DYNASTY_RANKS[order];
  if (!def) throw new RangeError(`no dynasty rank at order ${order}`);
  return def;
}

/** Highest rung whose gate — and every gate below it — is satisfied. A true ladder. */
function resolveRankOrder(p: DynastyProofInput["proof"]): number {
  const beatsClose = p.clvBeatRate !== null && p.clvBeatRate >= VIG_BREAK_EVEN_CLV;
  const gates: boolean[] = [
    true, // ROOKIE
    p.canonicalSettledCount >= DYNASTY_RANK_THRESHOLDS.provenSettled && p.hasPublishedCalibration,
    p.canonicalSettledCount >= DYNASTY_RANK_THRESHOLDS.establishedSettled && beatsClose,
    p.canonicalSettledCount >= DYNASTY_RANK_THRESHOLDS.authoritySettled && beatsClose,
  ];
  let order = 0;
  for (let i = 1; i < gates.length; i += 1) {
    if (!gates[i]) break; // a ladder: stop at the first unmet rung
    order = i;
  }
  return order;
}

interface NextRungAssessment {
  readonly progress: number;
  readonly requirement: string | null;
}

/** Composite progress + a human requirement string for the rung above `currentOrder`. */
function assessNextRung(currentOrder: number, p: DynastyProofInput["proof"]): NextRungAssessment {
  if (currentOrder >= DYNASTY_RANKS.length - 1) return { progress: 1, requirement: null };

  const beatRate = p.clvBeatRate ?? 0;
  const beatFraction = clamp01(beatRate / VIG_BREAK_EVEN_CLV);
  const missing: string[] = [];
  const parts: number[] = [];

  if (currentOrder === 0) {
    // → PROVEN: 100 settled + published calibration
    parts.push(clamp01(p.canonicalSettledCount / DYNASTY_RANK_THRESHOLDS.provenSettled));
    parts.push(p.hasPublishedCalibration ? 1 : 0);
    if (p.canonicalSettledCount < DYNASTY_RANK_THRESHOLDS.provenSettled) {
      missing.push(`${DYNASTY_RANK_THRESHOLDS.provenSettled - p.canonicalSettledCount} more settled picks`);
    }
    if (!p.hasPublishedCalibration) missing.push("a published calibration report");
  } else if (currentOrder === 1) {
    // → ESTABLISHED: 500 settled + beat-close ≥ 52.4%
    parts.push(clamp01(p.canonicalSettledCount / DYNASTY_RANK_THRESHOLDS.establishedSettled));
    parts.push(beatFraction);
    if (p.canonicalSettledCount < DYNASTY_RANK_THRESHOLDS.establishedSettled) {
      missing.push(`${DYNASTY_RANK_THRESHOLDS.establishedSettled - p.canonicalSettledCount} more settled picks`);
    }
    if (!(p.clvBeatRate !== null && p.clvBeatRate >= VIG_BREAK_EVEN_CLV)) {
      missing.push("a beat-close rate at or above 52.4%");
    }
  } else {
    // → AUTHORITY: deep sample + sustained beat-close
    parts.push(clamp01(p.canonicalSettledCount / DYNASTY_RANK_THRESHOLDS.authoritySettled));
    parts.push(beatFraction);
    if (p.canonicalSettledCount < DYNASTY_RANK_THRESHOLDS.authoritySettled) {
      missing.push(`${DYNASTY_RANK_THRESHOLDS.authoritySettled - p.canonicalSettledCount} more settled picks`);
    }
    if (!(p.clvBeatRate !== null && p.clvBeatRate >= VIG_BREAK_EVEN_CLV)) {
      missing.push("a sustained beat-close rate ≥ 52.4%");
    }
  }

  const progress = parts.length ? clamp01(Math.min(...parts)) : 1;
  const requirement = missing.length ? `Needs ${missing.join(" and ")}.` : null;
  return { progress, requirement };
}

function buildDistricts(input: DynastyProofInput): DynastyDistrictState[] {
  const { proof, entitlements } = input;
  const hasSettled = proof.canonicalSettledCount >= 1;

  return DYNASTY_DISTRICTS.map((d): DynastyDistrictState => {
    switch (d.id) {
      case "rookie-plaza":
      case "the-beat":
      case "the-depths":
        // Public, always walkable — onboarding, the content wall, the cautionary zone.
        return { ...d, unlocked: true, lockReason: null };
      case "blacktop":
        return hasSettled
          ? { ...d, unlocked: true, lockReason: null }
          : { ...d, unlocked: false, lockReason: "Enter the real slate — your first settled pick opens the Blacktop." };
      case "the-vault":
        return hasSettled
          ? { ...d, unlocked: true, lockReason: null }
          : { ...d, unlocked: false, lockReason: "Your Vault rises as your record settles." };
      case "gm-tower":
        return entitlements.canUseFantasyFull
          ? { ...d, unlocked: true, lockReason: null }
          : { ...d, unlocked: false, lockReason: "The GM Tower opens on the Fantasy tier and above." };
      default:
        return { ...d, unlocked: false, lockReason: "Locked." };
    }
  });
}

function buildVaultFloors(input: DynastyProofInput, rankOrder: number): DynastyVaultFloor[] {
  const { proof } = input;
  const beatsClose = proof.clvBeatRate !== null && proof.clvBeatRate >= VIG_BREAK_EVEN_CLV;
  const clvPct = proof.clvBeatRate !== null ? `${(proof.clvBeatRate * 100).toFixed(1)}%` : "ungraded";

  return [
    { level: 1, label: "Foundation",     earned: proof.canonicalSettledCount >= 1,   metric: `${proof.canonicalSettledCount} settled` },
    { level: 2, label: "Century",        earned: proof.canonicalSettledCount >= 100, metric: `${Math.min(proof.canonicalSettledCount, 100)}/100 settled` },
    { level: 3, label: "Calibrated",     earned: proof.hasPublishedCalibration,      metric: proof.hasPublishedCalibration ? "calibration published" : "no published calibration" },
    { level: 4, label: "Beats the Close", earned: beatsClose,                        metric: `CLV ${clvPct}` },
    { level: 5, label: "Established",    earned: proof.canonicalSettledCount >= 500, metric: `${Math.min(proof.canonicalSettledCount, 500)}/500 settled` },
    { level: 6, label: "Authority",      earned: rankOrder >= 3,                     metric: rankOrder >= 3 ? "authority reached" : "multi-season pending" },
  ];
}

/**
 * Derive a player's Galaxy Dynasty profile from their real GSN facts.
 * Deterministic and side-effect-free — the same input always yields the same world.
 */
export function deriveDynastyProfile(input: DynastyProofInput): DynastyProfile {
  const { proof } = input;
  const rankOrder = resolveRankOrder(proof);
  const rankDef = rankByOrder(rankOrder);
  const nextDef = rankOrder < DYNASTY_RANKS.length - 1 ? rankByOrder(rankOrder + 1) : null;
  const { progress, requirement } = assessNextRung(rankOrder, proof);

  const districts = buildDistricts(input);
  const floors = buildVaultFloors(input, rankOrder);
  const floorsEarned = floors.filter((f) => f.earned).length;
  const districtsUnlocked = districts.filter((d) => d.unlocked).length;

  const eligible = proof.wins + proof.losses;
  const winRate = eligible > 0 ? proof.wins / eligible : null;

  const rank: DynastyRankState = {
    id: rankDef.id,
    name: rankDef.name,
    order: rankDef.order,
    next: nextDef ? nextDef.id : null,
    progressToNext: progress,
    requirementForNext: requirement,
  };

  const summary = input.authenticated
    ? `${rankDef.name} · ${proof.wins}-${proof.losses}-${proof.pushes} settled · ${floorsEarned}/${floors.length} Vault floors · ${districtsUnlocked}/${districts.length} districts open`
    : `Sign in to claim your dynasty — your GSN record becomes your rank, your Vault, and your city.`;

  return {
    authenticated: input.authenticated,
    tier: input.tier,
    rank,
    districts,
    vault: {
      floors,
      floorsEarned,
      settledRecord: `${proof.wins}-${proof.losses}-${proof.pushes}`,
      winRate,
      clvBeatRate: proof.clvBeatRate,
      proofPublic: proof.performanceStatsPublic,
    },
    summary,
  };
}

/** The world a signed-out or fail-closed viewer sees: FREE, zero proof, nothing leaked. */
export function anonymousDynastyProfile(): DynastyProfile {
  return deriveDynastyProfile({
    tier: "FREE",
    authenticated: false,
    entitlements: { canUseFantasyFull: false, canUseClvLedger: false, canGetAlerts: false },
    proof: {
      canonicalSettledCount: 0,
      wins: 0,
      losses: 0,
      pushes: 0,
      clvBeatRate: null,
      hasPublishedCalibration: false,
      performanceStatsPublic: false,
    },
  });
}
