/**
 * User Modes — the small set of modes the Experience Orchestrator
 * recognizes. A mode is a short-lived behavioral context the product
 * uses to choose defaults, never to gate content.
 */

export const USER_MODES = [
  "first-visit",
  "returning-scan",
  "researching-game",
  "studying-methodology",
  "auditing-history",
  "calibrating-account",
  "in-restraint",
  "post-loss-cooldown",
] as const;

export type UserMode = (typeof USER_MODES)[number];

export interface ModeContext {
  readonly mode: UserMode;
  readonly confidence: number; // 0..1
  readonly observedAt: string; // ISO8601
}

/**
 * Mode → reasonable defaults. The Experience Orchestrator may override
 * based on the User Understanding Snapshot and Maturity stage.
 */
export const MODE_DEFAULTS: Record<UserMode, {
  readonly primarySurface: string;
  readonly secondarySurface: string;
  readonly suppressUpsell: boolean;
  readonly suppressBetCTA: boolean;
}> = {
  "first-visit": {
    primarySurface: "/intelligence",
    secondarySurface: "/methodology",
    suppressUpsell: true,
    suppressBetCTA: true,
  },
  "returning-scan": {
    primarySurface: "/today",
    secondarySurface: "/no-bet",
    suppressUpsell: false,
    suppressBetCTA: false,
  },
  "researching-game": {
    primarySurface: "/picks",
    secondarySurface: "/parlay-mri",
    suppressUpsell: false,
    suppressBetCTA: false,
  },
  "studying-methodology": {
    primarySurface: "/methodology",
    secondarySurface: "/academy",
    suppressUpsell: true,
    suppressBetCTA: true,
  },
  "auditing-history": {
    primarySurface: "/autopsy",
    secondarySurface: "/tracker",
    suppressUpsell: true,
    suppressBetCTA: true,
  },
  "calibrating-account": {
    primarySurface: "/profile",
    secondarySurface: "/alerts",
    suppressUpsell: false,
    suppressBetCTA: true,
  },
  "in-restraint": {
    // The user told us they want restraint emphasized.
    primarySurface: "/no-bet",
    secondarySurface: "/responsible-play",
    suppressUpsell: true,
    suppressBetCTA: true,
  },
  "post-loss-cooldown": {
    // Recently observed a tilt pattern or a loss; cool the surfaces.
    primarySurface: "/responsible-play",
    secondarySurface: "/academy",
    suppressUpsell: true,
    suppressBetCTA: true,
  },
};
