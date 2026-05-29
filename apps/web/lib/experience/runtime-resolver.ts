/**
 * Runtime Resolver — pure function converting route + optional context
 * into a NextBestSurface recommendation.
 *
 * No user data is fetched here. Mode and maturity come from cookies
 * (if set by the user's prior session), otherwise defaults apply.
 *
 * Constitutional reminder: no bet nudges, no upsell CTAs when mode
 * is in-restraint or post-loss-cooldown.
 */

import type { UserMode } from "./user-modes";
import { MODE_DEFAULTS } from "./user-modes";
import type { MaturityStage } from "../decision-quality/maturity";
import { nextBestSurface } from "./next-best-surface";
import { emptySnapshot } from "../understanding/user-understanding";
import { getSurfaceByPath } from "../galaxy/kernel/surfaces";

export interface RuntimeResolverInput {
  readonly route: string;
  readonly userMode?: UserMode;
  readonly maturityStage?: MaturityStage;
}

export interface RuntimeResolverOutput {
  readonly primaryHref: string;
  readonly primaryLabel: string;
  readonly secondaryHref: string;
  readonly secondaryLabel: string;
  readonly rationale: string;
  readonly suppressUpsell: boolean;
  readonly suppressBetCTA: boolean;
}

const FALLBACK_ROUTES: Record<string, { href: string; label: string }> = {
  "/": { href: "/today", label: "Today's Board" },
  "/today": { href: "/picks", label: "Published signals" },
  "/picks": { href: "/autopsy", label: "Grade your decisions" },
  "/no-bet": { href: "/academy", label: "Learn the discipline" },
  "/autopsy": { href: "/academy", label: "Process grading module" },
  "/parlay-mri": { href: "/academy", label: "Parlay discipline module" },
  "/market-mirage": { href: "/reports", label: "Market Mirage reports" },
  "/roster-shock": { href: "/today", label: "Today's Board" },
  "/coaching-edge": { href: "/today", label: "Today's Board" },
  "/profile": { href: "/academy", label: "Recommended module" },
  "/academy": { href: "/picks", label: "Apply what you learned" },
  "/reports": { href: "/picks", label: "Published signals" },
  "/command": { href: "/today", label: "Today's Board" },
};

const SECONDARY_ROUTES: Record<string, { href: string; label: string }> = {
  "/": { href: "/no-bet", label: "What we passed" },
  "/today": { href: "/no-bet", label: "What we skipped" },
  "/picks": { href: "/no-bet", label: "What the model passed" },
  "/no-bet": { href: "/responsible-play", label: "Responsible play" },
  "/autopsy": { href: "/picks", label: "Review picks" },
  "/parlay-mri": { href: "/picks", label: "Single-leg picks" },
  "/market-mirage": { href: "/picks", label: "Signals unaffected by narrative" },
  "/roster-shock": { href: "/picks", label: "Open picks" },
  "/coaching-edge": { href: "/picks", label: "Matchup picks" },
  "/profile": { href: "/autopsy", label: "Grade your decisions" },
  "/academy": { href: "/autopsy", label: "Grade a past decision" },
  "/reports": { href: "/methodology", label: "How reports are scored" },
  "/command": { href: "/no-bet", label: "What we passed today" },
};

export function resolveNextBest(input: RuntimeResolverInput): RuntimeResolverOutput {
  const mode: UserMode = input.userMode ?? "returning-scan";
  const maturityStage: MaturityStage = input.maturityStage ?? "learner";

  const modeConfig = MODE_DEFAULTS[mode];
  const suppressUpsell = modeConfig?.suppressUpsell ?? false;
  const suppressBetCTA = modeConfig?.suppressBetCTA ?? false;

  const next = nextBestSurface({
    mode,
    maturity: maturityStage,
    understanding: emptySnapshot(0, new Date().toISOString()),
  });

  const fallback = FALLBACK_ROUTES[input.route] ?? { href: "/today", label: "Today's Board" };
  const secondary = SECONDARY_ROUTES[input.route] ?? { href: "/no-bet", label: "What we passed" };

  const resolvedPrimaryHref = next.primaryHref ?? fallback.href;
  const surfaceEntry = getSurfaceByPath(resolvedPrimaryHref);
  const primaryLabel = surfaceEntry?.label ?? fallback.label;

  return {
    primaryHref: resolvedPrimaryHref,
    primaryLabel,
    secondaryHref: secondary.href,
    secondaryLabel: secondary.label,
    rationale: next.rationale,
    suppressUpsell,
    suppressBetCTA,
  };
}
