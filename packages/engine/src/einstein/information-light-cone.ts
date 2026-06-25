/**
 * EINSTEIN LAYER — Information Light Cone (Invention 13).
 *
 * Truth propagates at finite speed. For every shock there is a timeline: reality changed →
 * a source first reported it → it was confirmed → the first market reacted → a market family
 * absorbed it → full absorption. A candidate decision sits at a point on that timeline, and two
 * questions decide whether it is real:
 *   1. Could the system have KNOWN this at decision time? (Inside the cone — no future leakage.)
 *   2. Was the relevant market family still OUTSIDE the cone (un-absorbed)? (A window exists.)
 *
 * This FAILS CLOSED: a candidate that claims knowledge before the source existed is "outside"
 * and must be rejected; a candidate using any timestamp after the decision time is "contaminated".
 * Pure + deterministic.
 */

export type LightConeStatus = "inside_window" | "inside_absorbed" | "outside" | "contaminated" | "insufficient";

export interface ShockTimeline {
  readonly eventId: string;
  readonly eventType: string;
  /** When reality actually changed. */
  readonly eventTime: string;
  /** When ANY source first surfaced it (rumor-grade). */
  readonly sourceFirstSeenTime: string;
  /** When it was confirmed reliable (actionable). */
  readonly sourceConfirmedTime: string;
  /** When the first market anywhere reacted. */
  readonly firstMarketReactionTime?: string;
  /** Per market-family absorption time (when that family fully priced it). */
  readonly marketFamilyAbsorptionTime?: Readonly<Record<string, string>>;
  readonly fullAbsorptionTime?: string;
}

export interface LightConeQuery {
  readonly decisionTime: string;
  readonly marketFamily: string;
  /** The timestamps of the data the candidate actually used (to detect future leakage). */
  readonly usedDataTimestamps?: readonly string[];
}

export interface LightConeVerdict {
  readonly status: LightConeStatus;
  readonly knowableAtDecision: boolean;
  /** ms from when it became knowable to when the family absorbed it; null if no window/closed. */
  readonly tradableWindowMs: number | null;
  readonly contaminationBoundary: string | null;
  readonly reason: string;
}

const ms = (iso: string): number => Date.parse(iso);

/**
 * Evaluate a candidate against the information light cone for its market family. Fails closed on
 * future leakage (used data after the decision) and on claimed-knowledge-before-source.
 */
export function evaluateLightCone(timeline: ShockTimeline, query: LightConeQuery): LightConeVerdict {
  const decision = ms(query.decisionTime);
  const firstSeen = ms(timeline.sourceFirstSeenTime);
  const confirmed = ms(timeline.sourceConfirmedTime);
  if (![decision, firstSeen, confirmed].every(Number.isFinite)) {
    return { status: "insufficient", knowableAtDecision: false, tradableWindowMs: null, contaminationBoundary: null, reason: "Missing/unparseable timestamps." };
  }

  // Future leakage: any used datum after the decision time contaminates the candidate.
  const contaminating = (query.usedDataTimestamps ?? []).find((t) => Number.isFinite(ms(t)) && ms(t) > decision);
  if (contaminating) {
    return { status: "contaminated", knowableAtDecision: false, tradableWindowMs: null, contaminationBoundary: contaminating, reason: `Used data at ${contaminating} is after the decision time — future leakage.` };
  }

  // Claimed knowledge before the source existed → outside the cone, fail closed.
  if (decision < firstSeen) {
    return { status: "outside", knowableAtDecision: false, tradableWindowMs: null, contaminationBoundary: timeline.sourceFirstSeenTime, reason: `Decision ${query.decisionTime} precedes first-seen ${timeline.sourceFirstSeenTime} — not knowable.` };
  }

  const absorbIso = timeline.marketFamilyAbsorptionTime?.[query.marketFamily] ?? timeline.fullAbsorptionTime;
  const absorb = absorbIso ? ms(absorbIso) : NaN;

  // Knowable (decision ≥ first-seen). Is the family still un-absorbed at decision time?
  const knowableFrom = Math.min(confirmed, Math.max(firstSeen, decision)); // confirmed is the actionable bar
  if (Number.isFinite(absorb) && decision >= absorb) {
    return { status: "inside_absorbed", knowableAtDecision: true, tradableWindowMs: 0, contaminationBoundary: null, reason: `${query.marketFamily} already absorbed by ${absorbIso} — no window left.` };
  }
  const tradableWindowMs = Number.isFinite(absorb) ? Math.max(0, absorb - knowableFrom) : null;
  return {
    status: "inside_window",
    knowableAtDecision: true,
    tradableWindowMs,
    contaminationBoundary: null,
    reason: tradableWindowMs == null
      ? `Knowable and ${query.marketFamily} absorption time unknown — window open-ended (collect absorption data).`
      : `Knowable; ${query.marketFamily} un-absorbed → ~${Math.round(tradableWindowMs / 60_000)} min window.`,
  };
}

/** Classify which market families are inside vs outside the cone at a decision time. */
export function familiesInCone(
  timeline: ShockTimeline,
  decisionTime: string,
  families: readonly string[],
): { inside: string[]; outside: string[] } {
  const inside: string[] = [];
  const outside: string[] = [];
  for (const fam of families) {
    const v = evaluateLightCone(timeline, { decisionTime, marketFamily: fam });
    if (v.status === "inside_window") outside.push(fam); // knowable but family hasn't absorbed → still "outside" the price
    else inside.push(fam);
  }
  return { inside, outside };
}
