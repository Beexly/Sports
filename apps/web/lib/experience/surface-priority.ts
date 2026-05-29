/**
 * Surface Priority — relative weight of each surface inside the orchestrator.
 *
 * Higher weight surfaces are preferred when multiple are eligible.
 * Weights are not user-visible; they bias defaults only.
 */

import type { TelemetrySurfaceId } from "../telemetry/surfaces";

export const SURFACE_WEIGHTS: Readonly<Partial<Record<TelemetrySurfaceId, number>>> = {
  // Decision-quality surfaces — boosted
  "no-bet": 95,
  "autopsy": 90,
  "parlay-mri": 85,
  "methodology": 88,
  "academy": 82,
  // Hub surfaces — strong defaults
  "today": 80,
  "intelligence": 78,
  "picks": 75,
  "profile": 72,
  // Adjacent intelligence
  "market-mirage": 68,
  "market-gravity": 65,
  "roster-shock": 60,
  "coaching-edge": 60,
  "brain": 55,
  "rumor-radar": 50,
  // Account / utility
  "tracker": 70,
  "alerts": 50,
  "command": 55,
  // Compliance / disclosure
  "responsible-play": 100, // ceiling — always eligible
  // Marketing / discovery
  "home": 40,
  "about": 25,
  "press": 20,
  "blog": 30,
  "developer": 20,
  "pricing": 50,
};

export function priorityOf(surface: TelemetrySurfaceId): number {
  return SURFACE_WEIGHTS[surface] ?? 40;
}

/** Surfaces that may never be suppressed by the orchestrator. */
export const NEVER_SUPPRESS: ReadonlySet<TelemetrySurfaceId> = new Set([
  "responsible-play",
  "methodology",
]);
