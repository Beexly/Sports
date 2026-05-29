/**
 * Disclosures — the canonical disclosure strings the product renders.
 * Centralized so legal review can audit a single source.
 */

export const DISCLOSURE_KEYS = [
  "informational-only",
  "not-financial-advice",
  "responsible-play-compact",
  "responsible-play-card",
  "past-performance-no-guarantee",
  "bootstrap-mode",
  "sample-data",
  "calibration-gate",
  "evidence-chain",
] as const;

export type DisclosureKey = (typeof DISCLOSURE_KEYS)[number];

export const DISCLOSURES: Readonly<Record<DisclosureKey, string>> = {
  "informational-only":
    "Informational only. Galaxy publishes analysis, not promises. Outcomes vary; restraint is part of the read.",
  "not-financial-advice":
    "This is not financial advice. Galaxy is a sports intelligence platform and does not place wagers, accept bets, or manage funds.",
  "responsible-play-compact":
    "Bet responsibly. 21+ where legal. If gambling is affecting your life, support is available at the responsible-play page.",
  "responsible-play-card":
    "Bet only what you can afford to lose. Sports betting carries real financial risk. If gambling stops being fun, the support links on the responsible-play page are always available — no judgment, no friction.",
  "past-performance-no-guarantee":
    "Past performance does not guarantee future results. Calibration is the only signal that survives sample noise.",
  "bootstrap-mode":
    "Bootstrap mode: live ingestion is paused. The data below is illustrative and clearly labeled. No published signals exist for this window.",
  "sample-data":
    "Sample data: this surface is rendering illustrative content for layout and methodology review. No live picks are implied.",
  "calibration-gate":
    "The calibration report stays gated until enough canonical settled signals exist to support a published win-rate. Patience over noise.",
  "evidence-chain":
    "Every analytical claim on Galaxy attaches a source, a freshness label, a model version where applicable, and a failure case for picks.",
};

export function disclosure(key: DisclosureKey): string {
  return DISCLOSURES[key];
}
