/**
 * Expert ingestion — ExternalClaim → PunditClaim converter.
 *
 * Staging copy for Beexly/Sports#800. Mirrors the domain types in
 * apps/web/lib/airwave/types.ts without importing the repo, so this
 * staging module stays self-contained.
 *
 * CORE RULE: an unsettled claim NEVER fabricates a HIT/MISS. Anything that is
 * not an explicit settled outcome converts to PENDING (falsifiable) or
 * UNFALSIFIABLE — never a decided verdict.
 */

import type {
  ClaimType,
  ClaimVerdict,
  ConfidenceBand,
  Direction,
  PunditClaim,
} from "./types";
import { MIN_DECIDED_FOR_PUBLISHED_RATE } from "./grade";

export { MIN_DECIDED_FOR_PUBLISHED_RATE };
export type { ClaimVerdict, ConfidenceBand, Direction, PunditClaim };

/** Settlement status carried by an external expert feed. */
export type ExternalSettlement =
  | "settled-hit"
  | "settled-miss"
  | "settled-push"
  | "unfalsifiable"
  | "pending";

/** A raw claim row from an external expert feed (untrusted input). */
export type ExternalClaim = {
  readonly id: string;
  readonly punditId: string;
  readonly airedAt: string;
  readonly sport: string;
  readonly subject: string;
  readonly claimType: ClaimType;
  readonly direction: Direction;
  readonly assertion: string;
  readonly confidence: ConfidenceBand;
  readonly settlement: ExternalSettlement;
  readonly outcomeNote?: string;
  readonly sourceClipRef?: string;
};

/**
 * Gate copy: shown wherever real (non-demo) pundit records would render.
 * Real records stay gated until the founder gate + legal checklist clear;
 * until then only fictional personas render, and rates publish only at
 * or above the decided-call floor.
 */
export const GATE_NOTE =
  "Illustrative ledger · fictional personas. Real pundit records stay gated " +
  "until the founder gate and legal checklist clear. Hit rates publish only " +
  `at ${MIN_DECIDED_FOR_PUBLISHED_RATE}+ decided calls; below that, counts show instead of a percentage.`;

/**
 * Convert one external claim to a PunditClaim.
 * Unsettled / unknown settlement NEVER fabricates HIT or MISS — it yields
 * PENDING (falsifiable) so the claim posts no stake and earns no credit.
 */
export function toPunditClaim(ext: ExternalClaim): PunditClaim {
  const outcomeNote =
    ext.outcomeNote?.trim() ||
    (ext.settlement === "pending" ? "Not yet settled." : "No outcome recorded.");
  const sourceClipRef = ext.sourceClipRef?.trim() ?? "";
  const base = {
    id: ext.id,
    punditId: ext.punditId,
    airedAt: ext.airedAt,
    sport: ext.sport,
    subject: ext.subject,
    claimType: ext.claimType,
    direction: ext.direction,
    assertion: ext.assertion,
    confidence: ext.confidence,
    outcomeNote,
    sourceClipRef,
  } as const;
  switch (ext.settlement) {
    case "settled-hit":
      return { ...base, falsifiable: true, verdict: "HIT" };
    case "settled-miss":
      return { ...base, falsifiable: true, verdict: "MISS" };
    case "settled-push":
      return { ...base, falsifiable: true, verdict: "PUSH" };
    case "unfalsifiable":
      return { ...base, falsifiable: false, verdict: "UNFALSIFIABLE" };
    case "pending":
    default:
      // Default arm covers unknown/undefined settlements: never a HIT/MISS.
      return { ...base, falsifiable: true, verdict: "PENDING" };
  }
}

const CLAIM_TYPES: readonly string[] = [
  "GAME_PICK",
  "START_SIT",
  "RANKING",
  "INJURY_READ",
  "SEASON_TREND",
  "HOT_TAKE",
];
const DIRECTIONS: readonly string[] = ["BACKS", "FADES", "NEUTRAL"];
const CONFIDENCES: readonly string[] = ["EMPHATIC", "LEAN", "HEDGED"];
const SETTLEMENTS: readonly string[] = [
  "settled-hit",
  "settled-miss",
  "settled-push",
  "unfalsifiable",
  "pending",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function validateOne(raw: unknown): { claim: ExternalClaim | null; errors: string[] } {
  const errors: string[] = [];
  if (!isRecord(raw)) return { claim: null, errors: ["row must be an object"] };
  const str = (k: string): string => {
    const v = raw[k];
    if (typeof v !== "string" || v.trim() === "") {
      errors.push(`missing ${k}`);
      return "";
    }
    return v;
  };
  const id = str("id");
  const punditId = str("punditId");
  const airedAt = str("airedAt");
  const sport = str("sport");
  const subject = str("subject");
  const assertion = str("assertion");
  if (typeof raw["airedAt"] === "string" && Number.isNaN(Date.parse(raw["airedAt"] as string))) {
    errors.push("airedAt must be a parseable timestamp");
  }
  for (const [k, allowed] of [
    ["claimType", CLAIM_TYPES],
    ["direction", DIRECTIONS],
    ["confidence", CONFIDENCES],
    ["settlement", SETTLEMENTS],
  ] as const) {
    const v = raw[k];
    if (typeof v !== "string" || !allowed.includes(v)) {
      errors.push(`invalid ${k}: ${String(v)}`);
    }
  }
  if (raw["outcomeNote"] !== undefined && typeof raw["outcomeNote"] !== "string") {
    errors.push("outcomeNote must be a string");
  }
  if (raw["sourceClipRef"] !== undefined && typeof raw["sourceClipRef"] !== "string") {
    errors.push("sourceClipRef must be a string");
  }
  if (errors.length > 0) return { claim: null, errors };
  return {
    claim: {
      id,
      punditId,
      airedAt,
      sport,
      subject,
      claimType: raw["claimType"] as ExternalClaim["claimType"],
      direction: raw["direction"] as ExternalClaim["direction"],
      assertion,
      confidence: raw["confidence"] as ExternalClaim["confidence"],
      settlement: raw["settlement"] as ExternalSettlement,
      ...(typeof raw["outcomeNote"] === "string" ? { outcomeNote: raw["outcomeNote"] } : {}),
      ...(typeof raw["sourceClipRef"] === "string" ? { sourceClipRef: raw["sourceClipRef"] } : {}),
    },
    errors: [],
  };
}

export type ExpertFeedResult = {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly claims: readonly ExternalClaim[];
  readonly converted: readonly PunditClaim[];
};

/** Validate an external expert feed; converts only the valid rows. */
export function validateExpertFeed(input: unknown): ExpertFeedResult {
  if (!Array.isArray(input)) {
    return { valid: false, errors: ["feed must be an array"], claims: [], converted: [] };
  }
  const errors: string[] = [];
  const claims: ExternalClaim[] = [];
  input.forEach((row, i) => {
    const r = validateOne(row);
    if (r.claim) {
      claims.push(r.claim);
    } else {
      for (const e of r.errors) errors.push(`row ${i}: ${e}`);
    }
  });
  return {
    valid: errors.length === 0,
    errors,
    claims,
    converted: claims.map(toPunditClaim),
  };
}
