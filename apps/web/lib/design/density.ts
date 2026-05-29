/**
 * Density Gradient registry.
 *
 * Documents the chosen visual density per surface. Best-of-2026 sites
 * have a sparse → dense → sparse arc through each page. This registry
 * encodes that intent so future work stays consistent.
 *
 * Read at design-review time. Not consumed at runtime.
 */

export type DensityBand = "sparse" | "balanced" | "dense";

export interface DensityProfile {
  /** Hero / entry density. */
  readonly hero: DensityBand;
  /** Mid-page body density. */
  readonly body: DensityBand;
  /** Closing / CTA density. */
  readonly closing: DensityBand;
  /** One-sentence intent. */
  readonly rationale: string;
}

export const DENSITY_PROFILES: Readonly<Record<string, DensityProfile>> = {
  "/": {
    hero: "sparse",
    body: "dense",
    closing: "sparse",
    rationale:
      "Hero anchors a single thesis. Body packs evidence chain, stats, picks, calibration. Closing reduces to a single CTA + responsible-play band.",
  },
  "/today": {
    hero: "balanced",
    body: "dense",
    closing: "sparse",
    rationale:
      "Today's Board is operational. Density rises with stats strip and signal summary; closes with the CoachPromptHost and NextBestSurface.",
  },
  "/room/[gameId]": {
    hero: "sparse",
    body: "dense",
    closing: "sparse",
    rationale:
      "Decision Room: verdict card is the focal point (sparse). Evidence stack + factor radial + related panel are dense. Closing action grid reduces to three buttons.",
  },
  "/picks": {
    hero: "sparse",
    body: "dense",
    closing: "balanced",
    rationale:
      "Picks page is grid-heavy by nature. Hero is single statement. Closing keeps CTA + filter hint.",
  },
  "/ledger/canonical": {
    hero: "sparse",
    body: "dense",
    closing: "sparse",
    rationale:
      "Public record. Hero is single statement. Body is bucket panel + table. Closing is responsible-play band only.",
  },
  "/methodology": {
    hero: "sparse",
    body: "dense",
    closing: "sparse",
    rationale:
      "Methodology teaches. Hero is the kinetic claim. Body is the factor inventory + accumulation callout + constellation. Closing is a single CTA pair.",
  },
  "/manifesto": {
    hero: "sparse",
    body: "balanced",
    closing: "sparse",
    rationale:
      "Manifesto is read top-to-bottom. Hero is sparse three-line headline. Each of 11 beats is one screen tall (balanced). Closing is single CTA pair.",
  },
  "/we-were-wrong": {
    hero: "sparse",
    body: "balanced",
    closing: "sparse",
    rationale:
      "Retrospective. Hero names the page. Body is per-entry three-column grid. Closing is two-link return.",
  },
  "/we-are-not": {
    hero: "sparse",
    body: "balanced",
    closing: "sparse",
    rationale:
      "Anti-tout statement. Hero is the refusal. Body is per-refusal three-column grid. Closing returns to manifesto.",
  },
  "/galaxy-demo": {
    hero: "sparse",
    body: "balanced",
    closing: "sparse",
    rationale:
      "Demo tour. Each of 7 stops is its own balanced row. Hero and closing stay sparse to keep the tour's pacing.",
  },
  "/command": {
    hero: "sparse",
    body: "dense",
    closing: "balanced",
    rationale:
      "Command Center is dense by design — 12 widgets + Since-Last-Visit panel. Hero stays sparse; closing keeps the CoachPromptHost + access gate.",
  },
  "/pricing": {
    hero: "sparse",
    body: "dense",
    closing: "balanced",
    rationale:
      "Pricing is read in three sweeps: anchor tier (sparse hero), feature matrix (dense body), FAQ + secondary CTAs (balanced closing).",
  },
  "/stream": {
    hero: "sparse",
    body: "dense",
    closing: "sparse",
    rationale:
      "Decision stream. Hero anchors. Body is dense vertical timeline. Closing is two-link return.",
  },
  "/model-pulse": {
    hero: "sparse",
    body: "dense",
    closing: "sparse",
    rationale:
      "Pulse visualization. Hero anchors. Body is counters + averages + distribution. Closing is two-link return.",
  },
  "/decisions": {
    hero: "sparse",
    body: "balanced",
    closing: "sparse",
    rationale:
      "ADR archive. Hero anchors. Body is per-ADR card grid (balanced). Closing is two-link return.",
  },
};

export function getDensityProfile(path: string): DensityProfile | undefined {
  return DENSITY_PROFILES[path];
}
