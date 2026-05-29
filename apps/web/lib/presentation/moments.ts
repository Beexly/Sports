/**
 * Presentation Moments — the signature *one* moment per major surface.
 *
 * Galaxy's design posture is "breathtaking at the entrance, calm inside
 * the workflow." This registry names the single presentation moment
 * each major surface is allowed to invest in.
 *
 * Hard rules:
 *  - One moment per surface, maximum.
 *  - Every moment respects `prefers-reduced-motion`.
 *  - No moment may delay LCP beyond 2.5s on the 75th percentile.
 *  - No moment may obscure evidence, restraint, or methodology cues.
 */

import type { TelemetrySurfaceId } from "../telemetry/surfaces";

export type MomentKind =
  | "orbital-rings" // CSS orbital decoration on hero
  | "evidence-card-reveal" // gentle fade-in of the evidence row
  | "calibration-gate-pulse" // single pulse dot on calibration card
  | "section-eyebrow-fade" // fade-in eyebrow on scroll
  | "static" // no motion; presentation through hierarchy alone
  | "marquee-tier-band"; // slow horizontal marquee of source attributions

export interface PresentationMoment {
  readonly surface: TelemetrySurfaceId;
  readonly kind: MomentKind;
  readonly description: string;
  readonly respectsReducedMotion: true;
  readonly hidesEvidence: false;
}

export const PRESENTATION_MOMENTS: ReadonlyArray<PresentationMoment> = [
  {
    surface: "home",
    kind: "orbital-rings",
    description: "Static orbital ring decorations in the hero; no animation. Hierarchy alone carries the breathtaking moment.",
    respectsReducedMotion: true,
    hidesEvidence: false,
  },
  {
    surface: "orbit",
    kind: "orbital-rings",
    description: "Four concentric rings echoing the four signal layers. Pure CSS; no JS animation.",
    respectsReducedMotion: true,
    hidesEvidence: false,
  },
  {
    surface: "today",
    kind: "calibration-gate-pulse",
    description: "Single pulse dot on the calibration banner when history is still building.",
    respectsReducedMotion: true,
    hidesEvidence: false,
  },
  {
    surface: "picks",
    kind: "evidence-card-reveal",
    description: "Evidence row fades in 120ms after the selection settles. No carousel, no spotlight.",
    respectsReducedMotion: true,
    hidesEvidence: false,
  },
  {
    surface: "no-bet",
    kind: "static",
    description: "Restraint is the moment. Layout alone carries the read.",
    respectsReducedMotion: true,
    hidesEvidence: false,
  },
  {
    surface: "autopsy",
    kind: "static",
    description: "Process grade is the moment. No motion accent.",
    respectsReducedMotion: true,
    hidesEvidence: false,
  },
  {
    surface: "methodology",
    kind: "section-eyebrow-fade",
    description: "Eyebrows fade as they enter viewport. Body content is immediately readable.",
    respectsReducedMotion: true,
    hidesEvidence: false,
  },
  {
    surface: "intelligence",
    kind: "section-eyebrow-fade",
    description: "Same pattern as methodology — eyebrow-only fade.",
    respectsReducedMotion: true,
    hidesEvidence: false,
  },
];

const BY_SURFACE: ReadonlyMap<TelemetrySurfaceId, PresentationMoment> = new Map(
  PRESENTATION_MOMENTS.map((m) => [m.surface, m]),
);

export function momentFor(surface: TelemetrySurfaceId): PresentationMoment | undefined {
  return BY_SURFACE.get(surface);
}

export function hasOneMomentMax(): boolean {
  const seen = new Set<TelemetrySurfaceId>();
  for (const m of PRESENTATION_MOMENTS) {
    if (seen.has(m.surface)) return false;
    seen.add(m.surface);
  }
  return true;
}
