/**
 * Community Safety Engine — the moderation policy enforced as code, before any room
 * is allowed to go live (pilot-gated).
 *
 * The non-negotiables: a distress signal is met with SUPPORT resources and NEVER an
 * upsell (and never a ban); minors and self-excluded users are barred from rooms;
 * gambling-harm promotion, scams, and harassment escalate along a ladder
 * (WARN → MUTE → BAN) by prior violations, with straight-to-BAN for the most harmful.
 * Pure decision function, no I/O — community rooms stay staged until privacy +
 * moderation coverage are proven.
 */

export type ModerationAction = "ALLOW" | "NUDGE" | "WARN" | "MUTE" | "BAN" | "SUPPORT_RESOURCES";

export interface CommunityContext {
  /** Self-harm / acute-distress language. */
  readonly distressSignal: boolean;
  readonly chasingLossesEncouragement: boolean;
  readonly harassment: boolean;
  readonly isMinor: boolean;
  readonly isSelfExcluded: boolean;
  /** Promotes gambling harm (e.g. "bet your rent", "go all in"). */
  readonly gamblingHarmPromotion: boolean;
  readonly scamOrBadAdvice: boolean;
  readonly priorViolations: number;
}

export interface ModerationDecision {
  readonly action: ModerationAction;
  readonly reasons: readonly string[];
  /** True when distress was detected — respond with support, never sales. */
  readonly neverUpsell: boolean;
  /** True for minors / self-excluded users — barred from the room entirely. */
  readonly barFromRoom: boolean;
}

const LADDER: ModerationAction[] = ["WARN", "MUTE", "BAN"];

/**
 * Decide the moderation action. Priority: distress (support) → minor/self-excluded
 * (bar) → harm/scam/harassment (escalating ladder) → allow. Distress overrides
 * everything: a distressed user is never banned and never upsold.
 */
export function moderate(ctx: CommunityContext): ModerationDecision {
  // 1. Distress wins over everything — support, never sales, never punishment.
  if (ctx.distressSignal) {
    return {
      action: "SUPPORT_RESOURCES",
      reasons: ["distress signal detected — surface support resources, suppress all offers"],
      neverUpsell: true,
      barFromRoom: false,
    };
  }

  // 2. Minors and self-excluded users are barred from the room.
  if (ctx.isMinor || ctx.isSelfExcluded) {
    return {
      action: "BAN",
      reasons: [ctx.isMinor ? "minor — barred from gambling-adjacent rooms" : "self-excluded user — barred"],
      neverUpsell: true,
      barFromRoom: true,
    };
  }

  const reasons: string[] = [];
  // 3. The most harmful content is straight-to-BAN regardless of history.
  if (ctx.gamblingHarmPromotion) reasons.push("promotes gambling harm");
  if (ctx.scamOrBadAdvice) reasons.push("scam or harmful advice");
  if (ctx.gamblingHarmPromotion || ctx.scamOrBadAdvice) {
    return { action: "BAN", reasons, neverUpsell: false, barFromRoom: false };
  }

  // 4. Harassment / chasing-losses encouragement escalate along the ladder.
  if (ctx.harassment) reasons.push("harassment");
  if (ctx.chasingLossesEncouragement) reasons.push("encourages chasing losses");
  if (reasons.length > 0) {
    const rung = Math.min(LADDER.length - 1, Math.max(0, Math.floor(ctx.priorViolations)));
    return { action: LADDER[rung]!, reasons, neverUpsell: false, barFromRoom: false };
  }

  return { action: "ALLOW", reasons: [], neverUpsell: false, barFromRoom: false };
}
