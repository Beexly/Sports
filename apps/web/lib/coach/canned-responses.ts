/**
 * Canned response registry: surface + promptId → static text drawn from
 * methodology, no-bet doctrine, and academy module content.
 *
 * Live AI is env-gated (COACH_LIVE_AI_ENABLED). When disabled (default),
 * CoachPromptHost returns these responses. When enabled, CoachPromptHost
 * passes the question to the AI layer after checkBoundaries().
 */

import type { CoachSurface } from "./prompts";

export interface CannedResponse {
  readonly promptId: string;
  readonly surface: CoachSurface | "all";
  readonly body: string;
}

export const CANNED_RESPONSES: ReadonlyArray<CannedResponse> = [
  {
    promptId: "cp-001-why-this-pick",
    surface: "all",
    body:
      "A signal appears when multiple independent evidence streams — odds movement, " +
      "consensus data, and model scoring — converge above the publication threshold. " +
      "The pick would be invalidated by sharp reverse movement, a key injury, or " +
      "significant weather impact. Check the evidence drawer on the card for sources.",
  },
  {
    promptId: "cp-002-what-makes-this-risky",
    surface: "all",
    body:
      "Key risk factors include: public money bias inflating the line, uncertainty around " +
      "key player availability, correlated weather conditions for outdoor games, and " +
      "short rest for one team. The model's confidence score reflects these factors — " +
      "signals below 60 carry more variance.",
  },
  {
    promptId: "cp-003-should-i-pass",
    surface: "all",
    body:
      "The no-bet doctrine: if you can't articulate the edge independently, you're " +
      "betting on hope, not evidence. Pass when: the line has moved against the signal, " +
      "you can't explain why the public is wrong, or your reasoning is emotional. " +
      "A disciplined pass is a win. Review today's pass list for games the model skipped.",
  },
  {
    promptId: "cp-004-parlay-correlation",
    surface: "parlay-mri",
    body:
      "Correlated legs share an underlying cause — when one hits, the other is more " +
      "likely to hit, but the books already price this in. High-correlation parlays " +
      "appear to have inflated payouts but carry worse expected value than their " +
      "independent probabilities suggest. The MRI score measures this: below 30 is " +
      "low correlation, above 70 is high. Prefer uncorrelated legs or single picks.",
  },
  {
    promptId: "cp-005-grade-my-decision",
    surface: "autopsy",
    body:
      "Sound decision process: did you check the evidence before acting? Did you " +
      "identify what would make you wrong? Did you size appropriately? Did you act " +
      "on the model signal rather than media narrative? Outcome is noise in the short " +
      "term — process is the only thing you can control. Grade the process, not the result.",
  },
  {
    promptId: "cp-006-what-should-i-study",
    surface: "all",
    body:
      "Common gaps for developing bettors: (1) understanding expected value vs. win rate, " +
      "(2) line movement interpretation — sharp vs. public money, (3) the no-bet doctrine " +
      "and discipline tracking, (4) correlated parlay risk. Start with the Expected Value " +
      "module in Academy — it underpins every other concept.",
  },
  {
    promptId: "cp-007-explain-edge",
    surface: "all",
    body:
      "Edge is the gap between your estimated probability and the implied probability " +
      "in the line. If the line implies 52% and the model estimates 58%, the edge is " +
      "+6%. Positive edge over a large sample produces positive expected value. The " +
      "model's edge score is a normalized measure — it doesn't expose the formula or " +
      "thresholds. See /methodology for the summary.",
  },
  {
    promptId: "cp-008-am-i-tilting",
    surface: "all",
    body:
      "Tilt signals: betting more than usual after a loss, acting quickly without " +
      "checking evidence, chasing a game you passed on earlier, rationalizing a bet " +
      "you know is weak. If any of these apply, review the no-bet doctrine and your " +
      "last five decisions on the autopsy surface before acting today.",
  },
  {
    promptId: "cp-009-what-does-evidence-tell-me",
    surface: "decision-room",
    body:
      "The evidence stack in this room shows what sources were available when the model " +
      "evaluated this game: odds data, public consensus, market depth, and context signals. " +
      "The Evidence Timeline shows when each signal arrived and its freshness status. " +
      "The premortem shows what would change the read — that is the honest uncertainty anchor. " +
      "If the evidence health score is below 60, treat the read as lower confidence.",
  },
  {
    promptId: "cp-010-pass-or-pick",
    surface: "decision-room",
    body:
      "The decision framework: (1) Is there a published pick? If yes, the model found positive " +
      "edge. (2) Is the evidence fresh? Stale data weakens any edge claim. (3) Does the " +
      "premortem describe a failure case that currently applies? If yes, pass. (4) Did you " +
      "check the no-bet list? Games the model gated should not be acted on without a clear " +
      "reason the model was wrong. When in doubt, passing is the disciplined choice.",
  },
];

/** Look up the canned response for a given prompt on a given surface. */
export function getCannedResponse(
  surface: CoachSurface,
  promptId: string,
): CannedResponse | undefined {
  return (
    CANNED_RESPONSES.find((r) => r.promptId === promptId && r.surface === surface) ??
    CANNED_RESPONSES.find((r) => r.promptId === promptId && r.surface === "all")
  );
}
