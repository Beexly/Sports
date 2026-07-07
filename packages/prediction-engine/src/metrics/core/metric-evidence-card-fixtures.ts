import {
  generateMetricDriftCard,
  generateMetricModelCard,
  type MetricDriftCheck,
} from "./metric-evidence-cards.js";
import {
  requireMetricAsset,
  type GseModelCard,
  type MetricApiExposure,
  type MetricDriftCard,
  type MetricLicensingStatus,
  type MetricValidationReport,
} from "./metric-asset.js";
import type { MetricLifecycleStatus } from "./validation.js";

export type ShadowEvidenceMetricId =
  | "stale-line-risk-score"
  | "qb-burden-index"
  | "role-volatility-index"
  | "calibration-integrity-grade"
  | "no-bet-pressure"
  | "playable-window-score"
  | "portfolio-fit-score"
  | "market-mirage-score";

export interface ShadowMetricEvidenceFixture {
  readonly metricId: ShadowEvidenceMetricId;
  readonly validationReport: MetricValidationReport;
  readonly driftChecks: readonly MetricDriftCheck[];
  readonly evidenceRefs: readonly string[];
  readonly caveat: string;
}

export interface ShadowMetricEvidenceFixtureCards {
  readonly metricId: ShadowEvidenceMetricId;
  readonly lifecycleStatus: MetricLifecycleStatus;
  readonly apiExposure: MetricApiExposure;
  readonly licensingStatus: MetricLicensingStatus;
  readonly publicApiAllowed: boolean;
  readonly modelCard: GseModelCard;
  readonly driftCard: MetricDriftCard;
}

export const SHADOW_METRIC_EVIDENCE_FIXTURES: readonly ShadowMetricEvidenceFixture[] = [
  {
    caveat: "SLRS fixture is synthetic/local and cannot validate real market freshness without cleared historical odds snapshots.",
    driftChecks: [
      {
        evidenceRef: "fixture-slrs-market-freshness-split",
        name: "market_freshness_psi",
        severeThreshold: 0.3,
        value: 0.18,
        watchThreshold: 0.15,
      },
    ],
    evidenceRefs: ["fixture-slrs-model-card", "fixture-slrs-market-freshness-split"],
    metricId: "stale-line-risk-score",
    validationReport: shadowValidationReport("fixture-slrs-validation", 340),
  },
  {
    caveat: "QBI fixture is synthetic/local and cannot be read as quarterback quality, pass-rush charting, or tracking-feed proof.",
    driftChecks: [
      {
        evidenceRef: "fixture-qbi-burden-split",
        name: "burden_distribution_psi",
        severeThreshold: 0.28,
        value: 0.08,
        watchThreshold: 0.14,
      },
    ],
    evidenceRefs: ["fixture-qbi-model-card", "fixture-qbi-burden-split"],
    metricId: "qb-burden-index",
    validationReport: shadowValidationReport("fixture-qbi-validation", 260),
  },
  {
    caveat: "RVI role-stability fixture is synthetic/local and does not certify player role certainty or injury-report truth.",
    driftChecks: [
      {
        evidenceRef: "fixture-rvi-role-stability-split",
        name: "role_stability_psi",
        severeThreshold: 0.32,
        value: 0.21,
        watchThreshold: 0.16,
      },
    ],
    evidenceRefs: ["fixture-rvi-model-card", "fixture-rvi-role-stability-split"],
    metricId: "role-volatility-index",
    validationReport: shadowValidationReport("fixture-rvi-validation", 220),
  },
  {
    caveat:
      "CIG calibration fixture is synthetic/local and cannot be used as a public probability, verified calibration, or win-probability claim.",
    driftChecks: [
      {
        evidenceRef: "fixture-cig-calibration-stability-split",
        name: "calibration_integrity_ece_delta",
        severeThreshold: 0.12,
        value: 0.07,
        watchThreshold: 0.05,
      },
    ],
    evidenceRefs: ["fixture-cig-model-card", "fixture-cig-calibration-stability-split"],
    metricId: "calibration-integrity-grade",
    validationReport: shadowValidationReport("fixture-cig-validation", 360),
  },
  {
    caveat:
      "NBP fixture is synthetic/local and cannot be used as betting advice, expected value, public probability, pick approval, or responsible-gaming clearance.",
    driftChecks: [
      {
        evidenceRef: "fixture-nbp-refusal-pressure-split",
        name: "no_bet_hard_pass_rate_delta",
        severeThreshold: 0.28,
        value: 0.17,
        watchThreshold: 0.12,
      },
    ],
    evidenceRefs: ["fixture-nbp-model-card", "fixture-nbp-refusal-pressure-split"],
    metricId: "no-bet-pressure",
    validationReport: shadowValidationReport("fixture-nbp-validation", 310),
  },
  {
    caveat: "PWS decision-window fixture is synthetic/local and cannot be used as playable edge, expected value, or betting advice.",
    driftChecks: [
      {
        evidenceRef: "fixture-pws-decision-window-split",
        name: "decision_window_block_rate_delta",
        severeThreshold: 0.25,
        value: 0.31,
        watchThreshold: 0.12,
      },
    ],
    evidenceRefs: ["fixture-pws-model-card", "fixture-pws-decision-window-split"],
    metricId: "playable-window-score",
    validationReport: shadowValidationReport("fixture-pws-validation", 300),
  },
  {
    caveat:
      "PFS portfolio fixture is synthetic/local and cannot be used as stake sizing, expected value, betting advice, or board approval.",
    driftChecks: [
      {
        evidenceRef: "fixture-pfs-portfolio-concentration-split",
        name: "portfolio_concentration_risk_delta",
        severeThreshold: 0.3,
        value: 0.11,
        watchThreshold: 0.16,
      },
    ],
    evidenceRefs: ["fixture-pfs-model-card", "fixture-pfs-portfolio-concentration-split"],
    metricId: "portfolio-fit-score",
    validationReport: shadowValidationReport("fixture-pfs-validation", 280),
  },
  {
    caveat:
      "MMS market-integrity fixture is synthetic/local and cannot be used as market edge, expected value, win probability, or betting advice.",
    driftChecks: [
      {
        evidenceRef: "fixture-mms-market-mirage-split",
        name: "market_mirage_watch_rate_delta",
        severeThreshold: 0.28,
        value: 0.19,
        watchThreshold: 0.14,
      },
    ],
    evidenceRefs: ["fixture-mms-model-card", "fixture-mms-market-mirage-split"],
    metricId: "market-mirage-score",
    validationReport: shadowValidationReport("fixture-mms-validation", 300),
  },
];

export function generateShadowMetricEvidenceFixtureCards(
  fixture: ShadowMetricEvidenceFixture,
): ShadowMetricEvidenceFixtureCards {
  const asset = requireMetricAsset(fixture.metricId);
  const modelCard = generateMetricModelCard({
    additionalLimitations: [fixture.caveat],
    asset,
    evidenceRefs: fixture.evidenceRefs,
    validationReport: fixture.validationReport,
  });
  const driftCard = generateMetricDriftCard({
    asset,
    checks: fixture.driftChecks,
    evidenceRefs: fixture.evidenceRefs,
  });

  return {
    apiExposure: asset.apiExposure,
    driftCard,
    lifecycleStatus: asset.birthCertificate.status,
    licensingStatus: asset.licensingStatus,
    metricId: fixture.metricId,
    modelCard,
    publicApiAllowed: asset.apiExposure === "API_LIMITED" || asset.apiExposure === "API_FULL",
  };
}

export function generateAllShadowMetricEvidenceFixtureCards(): readonly ShadowMetricEvidenceFixtureCards[] {
  return SHADOW_METRIC_EVIDENCE_FIXTURES.map(generateShadowMetricEvidenceFixtureCards);
}

function shadowValidationReport(evidenceRef: string, sampleSize: number): MetricValidationReport {
  return {
    evidenceRefs: [evidenceRef],
    measures: [
      {
        name: "fixture_directionality",
        passed: true,
        threshold: 0,
        value: 1,
      },
    ],
    minimumSampleSize: 200,
    sampleSize,
    status: "PASS",
  };
}
