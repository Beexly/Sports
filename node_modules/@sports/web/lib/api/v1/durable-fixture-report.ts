import type { ApiV1DurableAdapterConformanceReport } from "./durable-adapter-harness";
import type { ApiV1DurableFixtureSimulationReport } from "./durable-fixture-simulator";

export type ApiV1DurableFixtureReportStatus = "shadow_report_ready" | "blocked";

export type ApiV1DurableFixtureChecklistItem = {
  readonly id: string;
  readonly passed: boolean;
  readonly livePromotionBlocker: boolean;
  readonly evidence: string;
};

export type ApiV1DurableFixtureReportArchive = {
  readonly schemaVersion: "api-v1-durable-fixture-report-v1";
  readonly generatedAt: string;
  readonly status: ApiV1DurableFixtureReportStatus;
  readonly livePromotionAllowed: false;
  readonly fixture: {
    readonly fixtureId: string;
    readonly passed: boolean;
    readonly operationCount: number;
    readonly caseIds: readonly string[];
    readonly boundary: ApiV1DurableFixtureSimulationReport["boundary"];
  };
  readonly conformance: {
    readonly adapterName: string;
    readonly passed: boolean;
    readonly caseCount: number;
    readonly requiredBehaviorCount: number;
  };
  readonly checklist: readonly ApiV1DurableFixtureChecklistItem[];
  readonly promotionBlockers: readonly string[];
  readonly nextRequiredProof: readonly string[];
};

export type ApiV1DurableFixtureReportInput = {
  readonly generatedAt: string;
  readonly fixtureReport: ApiV1DurableFixtureSimulationReport;
  readonly conformanceReport: ApiV1DurableAdapterConformanceReport;
};

const LIVE_PROMOTION_BLOCKERS = [
  "Owner approval for live API use is not present in this archive.",
  "No Prisma schema edit or migration exists for API v1 durable tables.",
  "No API v1 route tree exists.",
  "No disposable database rollback rehearsal has been recorded.",
  "No production credential, partner onboarding, billing, or provider path exists.",
] as const;

const NEXT_REQUIRED_PROOF = [
  "Replay fixture reports against any future disposable database adapter before schema mutation.",
  "Run the durable conformance harness against a real adapter in a non-production database.",
  "Record rollback rehearsal output with row counts and audit tip hash before owner promotion review.",
  "Keep OpenAPI generation, guardrails, typecheck, lint, and focused API v1 tests green before route exposure.",
] as const;

function checklistItem(input: {
  readonly id: string;
  readonly passed: boolean;
  readonly livePromotionBlocker?: boolean;
  readonly evidence: string;
}): ApiV1DurableFixtureChecklistItem {
  return {
    evidence: input.evidence,
    id: input.id,
    livePromotionBlocker: input.livePromotionBlocker ?? false,
    passed: input.passed,
  };
}

export function buildApiV1DurableFixtureReportArchive(
  input: ApiV1DurableFixtureReportInput
): ApiV1DurableFixtureReportArchive {
  const { conformanceReport, fixtureReport, generatedAt } = input;
  const checklist = [
    checklistItem({
      evidence: `Fixture ${fixtureReport.fixtureId} passed=${fixtureReport.passed}.`,
      id: "fixture-simulator-passed",
      passed: fixtureReport.passed,
    }),
    checklistItem({
      evidence: `Harness ${conformanceReport.adapterName} passed=${conformanceReport.passed}.`,
      id: "durable-harness-conformance-passed",
      passed: conformanceReport.passed,
    }),
    checklistItem({
      evidence: `operationCount=${fixtureReport.operationCount}; caseIds=${fixtureReport.cases
        .map((entry) => entry.id)
        .join(",")}.`,
      id: "fixture-operation-coverage-present",
      passed: fixtureReport.operationCount >= 4 && fixtureReport.cases.length >= fixtureReport.operationCount,
    }),
    checklistItem({
      evidence: "Fixture boundary says routeExposed=false.",
      id: "route-free",
      passed: fixtureReport.boundary.routeExposed === false,
    }),
    checklistItem({
      evidence: "Fixture boundary says databaseTouched=false.",
      id: "database-free",
      passed: fixtureReport.boundary.databaseTouched === false,
    }),
    checklistItem({
      evidence: "Fixture boundary says providerCalled=false.",
      id: "provider-free",
      passed: fixtureReport.boundary.providerCalled === false,
    }),
    checklistItem({
      evidence: "Fixture boundary says executable=false.",
      id: "non-executable",
      passed: fixtureReport.boundary.executable === false,
    }),
    checklistItem({
      evidence: "Live promotion remains blocked even when shadow evidence passes.",
      id: "live-promotion-blocked",
      livePromotionBlocker: true,
      passed: true,
    }),
  ] as const;

  return {
    checklist,
    conformance: {
      adapterName: conformanceReport.adapterName,
      caseCount: conformanceReport.cases.length,
      passed: conformanceReport.passed,
      requiredBehaviorCount: conformanceReport.requiredBehaviors.length,
    },
    fixture: {
      boundary: fixtureReport.boundary,
      caseIds: fixtureReport.cases.map((entry) => entry.id),
      fixtureId: fixtureReport.fixtureId,
      operationCount: fixtureReport.operationCount,
      passed: fixtureReport.passed,
    },
    generatedAt,
    livePromotionAllowed: false,
    nextRequiredProof: NEXT_REQUIRED_PROOF,
    promotionBlockers: LIVE_PROMOTION_BLOCKERS,
    schemaVersion: "api-v1-durable-fixture-report-v1",
    status: checklist.every((entry) => entry.passed) ? "shadow_report_ready" : "blocked",
  };
}
