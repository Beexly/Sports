/**
 * Trust signals — the seven labels every betting-adjacent surface
 * should carry. Backed by the Evidence Chain Standard.
 */

export const TRUST_SIGNAL_DIMENSIONS = [
  "data-freshness",
  "source-confidence",
  "demo-or-live-status",
  "methodology-access",
  "responsible-gaming-access",
  "uncertainty-state",
  "actionability-label",
] as const;

export type TrustSignalDimension = (typeof TRUST_SIGNAL_DIMENSIONS)[number];

export type TrustSignalRequirement = "required" | "recommended" | "optional";

export interface TrustSignalSpec {
  readonly dimension: TrustSignalDimension;
  readonly requirement: TrustSignalRequirement;
  readonly visibleAtFold: boolean;
  readonly howToRender: string;
}

export const TRUST_SIGNAL_SPECS: ReadonlyArray<TrustSignalSpec> = [
  {
    dimension: "data-freshness",
    requirement: "required",
    visibleAtFold: true,
    howToRender: "EvidenceRow freshness pill (live/fresh/today/stale/sample/unknown).",
  },
  {
    dimension: "source-confidence",
    requirement: "required",
    visibleAtFold: true,
    howToRender: "EvidenceRow source label (provider / galaxy-model / aggregate / public-record / editorial / illustrative).",
  },
  {
    dimension: "demo-or-live-status",
    requirement: "required",
    visibleAtFold: true,
    howToRender: "SampleDataBanner or StateBadge preview/beta/waitlist; never silent.",
  },
  {
    dimension: "methodology-access",
    requirement: "required",
    visibleAtFold: false,
    howToRender: "Cross-link or inline 'Methodology →' on every analytical surface.",
  },
  {
    dimension: "responsible-gaming-access",
    requirement: "required",
    visibleAtFold: false,
    howToRender: "RiskDisclosure component + Footer responsible-play link.",
  },
  {
    dimension: "uncertainty-state",
    requirement: "required",
    visibleAtFold: false,
    howToRender: "Failure case on picks; confidence band; calibration gate disclosure.",
  },
  {
    dimension: "actionability-label",
    requirement: "recommended",
    visibleAtFold: true,
    howToRender: "Tier badge + next-action label ('Open trail', 'Read pass list', 'Continue to Today').",
  },
];

const BY_DIMENSION: ReadonlyMap<TrustSignalDimension, TrustSignalSpec> = new Map(
  TRUST_SIGNAL_SPECS.map((s) => [s.dimension, s]),
);

export function specFor(d: TrustSignalDimension): TrustSignalSpec {
  return BY_DIMENSION.get(d)!;
}

export function isRequired(d: TrustSignalDimension): boolean {
  return BY_DIMENSION.get(d)!.requirement === "required";
}
