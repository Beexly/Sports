import type {
  DfsNarrativeSignalType,
  DfsNarrativeImpactType,
} from "@sports/types";

export interface NarrativeSignalInput {
  playerName: string;
  team: string;
  slateId?: string;
  signalType: DfsNarrativeSignalType;
  claim: string;
  evidence: string;
  counterEvidence?: string;
  falsifiers?: string[];
  sourceNames?: string[];
  confidence?: number; // 0-1
}

export interface NarrativeImpactResult {
  impactType: DfsNarrativeImpactType;
  projectionDelta: number;
  ownershipDelta: number;
  volatilityDelta: number;
  hypeInflationDelta: number;
  recommendation: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function classifyNarrativeImpact(
  input: NarrativeSignalInput
): NarrativeImpactResult {
  const conf = input.confidence ?? 0.5;

  let impactType: DfsNarrativeImpactType = "CONTEXT_ONLY";
  let projectionDelta = 0;
  let ownershipDelta = 0;
  let volatilityDelta = 0;
  let hypeInflationDelta = 0;
  let recommendation =
    "Narrative provides context only; no projection adjustment warranted without role data";

  const { signalType } = input;

  switch (signalType) {
    // Pure context — no projection movement
    case "BIRTHDAY_GAME":
    case "REVENGE_GAME":
    case "HOMECOMING":
    case "RIVALRY_CONTEXT":
      impactType = "CONTEXT_ONLY";
      projectionDelta = 0;
      ownershipDelta = 0.005;
      recommendation =
        "Narrative provides context only; no projection adjustment warranted without role data";
      break;

    case "PRIMETIME_CONTEXT":
    case "PLAYOFF_URGENCY":
    case "SEEDING_URGENCY":
      impactType = "CONTEXT_ONLY";
      projectionDelta = 0;
      recommendation =
        "Narrative provides context only; no projection adjustment warranted without role data";
      break;

    case "WEATHER_TOUGHNESS_NARRATIVE":
    case "CONTRACT_YEAR":
      impactType = "CONTEXT_ONLY";
      projectionDelta = 0;
      recommendation =
        "Narrative provides context only; no projection adjustment warranted without role data";
      break;

    // Ownership signals
    case "CONTRACT_INCENTIVE":
      impactType = "OWNERSHIP";
      ownershipDelta = 0.01;
      projectionDelta = conf > 0.7 ? clamp(conf * 0.5, 0, 0.5) : 0;
      recommendation =
        "Ownership signal; monitor but do not adjust projection";
      break;

    case "AWARD_CHASE":
    case "PERSONAL_ACHIEVEMENT":
      impactType = "OWNERSHIP";
      ownershipDelta = 0.01;
      recommendation =
        "Ownership signal; monitor but do not adjust projection";
      break;

    case "MILESTONE_GAME":
      impactType = "OWNERSHIP";
      ownershipDelta = 0.015;
      projectionDelta = 0;
      recommendation =
        "Ownership signal; monitor but do not adjust projection";
      break;

    // Coach/beat/role — confidence gated
    case "COACH_QUOTE":
    case "BEAT_REPORT":
    case "ROLE_PROMISE":
      if (conf >= 0.7) {
        impactType = "VOLUME";
        projectionDelta = clamp(conf * 1.0, 0, 1.0);
        recommendation =
          "Volume signal detected; apply bounded projection adjustment with caution";
      } else {
        impactType = "CONTEXT_ONLY";
        projectionDelta = 0;
        recommendation =
          "Narrative provides context only; no projection adjustment warranted without role data";
      }
      break;

    // Volume signals — role changes
    case "DEPTH_CHART_PROMOTION":
    case "TEAMMATE_INJURY_OPPORTUNITY":
    case "RETURN_FROM_INJURY":
    case "RETURN_FROM_SUSPENSION":
    case "TRADE_DEBUT":
    case "NEW_TEAM_ROLE":
      impactType = "VOLUME";
      projectionDelta = Math.min(2.0, conf * 2.5);
      ownershipDelta = 0.02;
      recommendation =
        "Volume signal detected; apply bounded projection adjustment with caution";
      break;

    // Negative signal
    case "LOCKER_ROOM_FRICTION":
      impactType = "NEGATIVE";
      projectionDelta = Math.max(-1.5, -conf * 2.0);
      ownershipDelta = -0.01;
      recommendation =
        "Negative signal; monitor closely, consider fade";
      break;

    // Hype-only signals
    case "MEDIA_HYPE_SPIKE":
    case "PUBLIC_SENTIMENT_SPIKE":
      impactType = "HYPE_ONLY";
      hypeInflationDelta = conf * 0.5;
      ownershipDelta = 0.02;
      recommendation =
        "Hype inflation risk; consider fading if ownership spikes";
      break;

    default: {
      const _exhaustive: never = signalType;
      void _exhaustive;
      impactType = "CONTEXT_ONLY";
      projectionDelta = 0;
      recommendation =
        "Narrative provides context only; no projection adjustment warranted without role data";
    }
  }

  // Apply caps
  projectionDelta = clamp(projectionDelta, -2.5, 2.5);
  ownershipDelta = clamp(ownershipDelta, -0.05, 0.05);
  hypeInflationDelta = clamp(hypeInflationDelta, 0, 0.5);
  volatilityDelta = clamp(volatilityDelta, 0, 0.5);

  return {
    impactType,
    projectionDelta,
    ownershipDelta,
    volatilityDelta,
    hypeInflationDelta,
    recommendation,
  };
}

export function detectHypeInflation(opts: {
  narrativeIntensity: number; // 0-1 proxy for media/social volume
  projectionSupport: number; // 0-1 how much the numbers back the narrative
  ownershipImpact: number; // 0-1
}): { score: number; warning: string | null } {
  const raw =
    opts.narrativeIntensity *
    (1 - opts.projectionSupport) *
    (opts.ownershipImpact + 0.5);

  const score = Math.min(1, Math.max(0, raw));

  let warning: string | null = null;
  if (score > 0.6) {
    warning =
      "High hype inflation risk: narrative intensity exceeds projection support";
  } else if (score > 0.3) {
    warning =
      "Moderate hype inflation risk: validate with projection data";
  }

  return { score, warning };
}

export function scoreSourceReliability(
  sources: Array<{
    sourceType: string;
    reliabilityScore: number | null;
  }>
): number {
  const valid = sources.filter((s) => s.reliabilityScore !== null);
  if (valid.length === 0) return 0.5;

  const sum = valid.reduce((acc, s) => acc + (s.reliabilityScore as number), 0);
  const avg = sum / valid.length;
  return Math.min(1, Math.max(0, avg));
}

const FOOTBALL_MECHANISM_TYPES: ReadonlySet<DfsNarrativeSignalType> = new Set([
  "DEPTH_CHART_PROMOTION",
  "TEAMMATE_INJURY_OPPORTUNITY",
  "RETURN_FROM_INJURY",
  "RETURN_FROM_SUSPENSION",
  "TRADE_DEBUT",
  "NEW_TEAM_ROLE",
  "COACH_QUOTE",
  "BEAT_REPORT",
  "ROLE_PROMISE",
] as DfsNarrativeSignalType[]);

// Note: three o's in function name per spec
export function hasFoootballMechanism(
  signalType: DfsNarrativeSignalType
): boolean {
  return FOOTBALL_MECHANISM_TYPES.has(signalType);
}
