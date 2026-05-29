/**
 * Next Best Surface — given a mode and an understanding snapshot,
 * propose the highest-leverage surface to surface next.
 *
 * Pure function. No I/O. No personalization beyond mode + maturity.
 */

import type { UserMode } from "./user-modes";
import { MODE_DEFAULTS } from "./user-modes";
import type { MaturityStage } from "../decision-quality/maturity";
import type { UserUnderstandingSnapshot } from "../understanding/user-understanding";
import { recommendNextModule } from "../understanding/learning-state";

export interface NextBestSurface {
  readonly primaryHref: string;
  readonly secondaryHref: string;
  readonly rationale: string;
  readonly suppressUpsell: boolean;
  readonly suppressBetCTA: boolean;
}

export function nextBestSurface(args: {
  readonly mode: UserMode;
  readonly maturity: MaturityStage;
  readonly understanding: UserUnderstandingSnapshot;
}): NextBestSurface {
  const base = MODE_DEFAULTS[args.mode];

  // Always honor declared restraint mode.
  if (args.mode === "in-restraint" || args.mode === "post-loss-cooldown") {
    return {
      primaryHref: base.primarySurface,
      secondaryHref: base.secondarySurface,
      rationale: "User in restraint mode; defaults route to discipline and education.",
      suppressUpsell: true,
      suppressBetCTA: true,
    };
  }

  // Promote Academy when a clear next module exists.
  const nextModule = recommendNextModule(args.understanding);
  if (nextModule && (args.maturity === "spectator" || args.maturity === "learner")) {
    return {
      primaryHref: "/academy",
      secondaryHref: base.primarySurface,
      rationale: `Maturity ${args.maturity}; next module: ${nextModule.module}.`,
      suppressUpsell: base.suppressUpsell,
      suppressBetCTA: true,
    };
  }

  return {
    primaryHref: base.primarySurface,
    secondaryHref: base.secondarySurface,
    rationale: `Mode ${args.mode} default; maturity ${args.maturity}.`,
    suppressUpsell: base.suppressUpsell,
    suppressBetCTA: base.suppressBetCTA,
  };
}
