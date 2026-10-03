export type ApiV1DisposableDbRehearsalStatus = "plan_only";

export type ApiV1DisposableDbRehearsalStepId =
  | "owner-approval-record"
  | "disposable-database-only"
  | "future-migration-review"
  | "synthetic-fixture-seed"
  | "durable-adapter-conformance"
  | "fixture-report-comparison"
  | "rollback-rehearsal"
  | "post-rollback-verification";

export type ApiV1DisposableDbRehearsalStep = {
  readonly id: ApiV1DisposableDbRehearsalStepId;
  readonly order: number;
  readonly purpose: string;
  readonly expectedEvidence: readonly string[];
  readonly stopIfMissing: readonly string[];
  readonly boundary: string;
};

export type ApiV1DisposableDbRehearsalPlan = {
  readonly status: ApiV1DisposableDbRehearsalStatus;
  readonly generatedFor: "api_v1_future_disposable_database_rehearsal";
  readonly commandsExecutableNow: false;
  readonly currentSliceRequiresEnvVars: false;
  readonly appliesMigration: false;
  readonly touchesProductionDatabase: false;
  readonly exposesRoute: false;
  readonly createsCredential: false;
  readonly providerCalled: false;
  readonly requiredFutureApproval: "owner_approval_required";
  readonly steps: readonly ApiV1DisposableDbRehearsalStep[];
  readonly forbiddenTargets: readonly string[];
};

export type ApiV1DisposableDbRehearsalInspection = {
  readonly routeTreeExists?: boolean;
  readonly migrationNames?: readonly string[];
  readonly envFilesText?: string;
  readonly sourceText?: string;
};

export type ApiV1DisposableDbRehearsalValidation = {
  readonly ok: boolean;
  readonly blockers: readonly string[];
  readonly warnings: readonly string[];
  readonly checkedSteps: readonly ApiV1DisposableDbRehearsalStepId[];
};

const REQUIRED_STEPS: readonly ApiV1DisposableDbRehearsalStepId[] = [
  "owner-approval-record",
  "disposable-database-only",
  "future-migration-review",
  "synthetic-fixture-seed",
  "durable-adapter-conformance",
  "fixture-report-comparison",
  "rollback-rehearsal",
  "post-rollback-verification",
];

export const API_V1_DISPOSABLE_DB_REHEARSAL_PLAN: ApiV1DisposableDbRehearsalPlan = {
  appliesMigration: false,
  commandsExecutableNow: false,
  createsCredential: false,
  currentSliceRequiresEnvVars: false,
  exposesRoute: false,
  forbiddenTargets: [
    "production database",
    "shared staging database without owner approval",
    "API v1 route tree",
    "raw API key material",
    "partner billing or onboarding path",
    "provider account or AWS account",
  ],
  generatedFor: "api_v1_future_disposable_database_rehearsal",
  providerCalled: false,
  requiredFutureApproval: "owner_approval_required",
  status: "plan_only",
  steps: [
    {
      boundary: "Planning artifact only; no approval is created by this step.",
      expectedEvidence: ["owner decision record", "scope-limited rehearsal ticket"],
      id: "owner-approval-record",
      order: 1,
      purpose: "Record explicit owner approval before any future disposable database rehearsal.",
      stopIfMissing: ["owner approval", "named disposable target"],
    },
    {
      boundary: "The target must be disposable and non-production.",
      expectedEvidence: ["database name", "creation timestamp", "destroy-by timestamp"],
      id: "disposable-database-only",
      order: 2,
      purpose: "Prove the target is disposable and isolated from production or shared staging data.",
      stopIfMissing: ["destroy-by timestamp", "proof target is not production"],
    },
    {
      boundary: "No migration exists in this slice; review applies only to a future owner-approved migration.",
      expectedEvidence: ["schema diff", "rollback SQL review", "table dependency order review"],
      id: "future-migration-review",
      order: 3,
      purpose: "Review the future API v1 migration before applying it to a disposable target.",
      stopIfMissing: ["schema diff", "rollback SQL"],
    },
    {
      boundary: "Seed only local synthetic fixtures; never seed raw keys or partner data.",
      expectedEvidence: ["synthetic consumer count", "synthetic quota count", "synthetic audit count"],
      id: "synthetic-fixture-seed",
      order: 4,
      purpose: "Seed the disposable target with synthetic API v1 consumer, quota, and audit rows.",
      stopIfMissing: ["synthetic-only seed proof", "raw-key absence proof"],
    },
    {
      boundary: "Conformance must run against a disposable adapter only.",
      expectedEvidence: ["durable harness report", "adapter name", "case count"],
      id: "durable-adapter-conformance",
      order: 5,
      purpose: "Run the durable adapter conformance harness against the disposable adapter.",
      stopIfMissing: ["passing conformance report", "adapter target proof"],
    },
    {
      boundary: "Fixture comparison is evidence only; it does not expose a route.",
      expectedEvidence: ["fixture report archive", "operation count comparison", "blocker list"],
      id: "fixture-report-comparison",
      order: 6,
      purpose: "Compare disposable adapter output to the tracked fixture report archive.",
      stopIfMissing: ["tracked fixture report", "comparison result"],
    },
    {
      boundary: "Rollback rehearsal must happen on the disposable target only.",
      expectedEvidence: ["pre-rollback row counts", "pre-rollback audit tip hash", "rollback command transcript"],
      id: "rollback-rehearsal",
      order: 7,
      purpose: "Rehearse rollback and capture row counts plus audit tip hash before destructive teardown.",
      stopIfMissing: ["row counts", "audit tip hash", "rollback transcript"],
    },
    {
      boundary: "Post-rollback proof must not rely on a live route.",
      expectedEvidence: ["post-rollback schema diff", "remaining API v1 table count", "focused API v1 test output"],
      id: "post-rollback-verification",
      order: 8,
      purpose: "Verify rollback removed disposable API v1 tables and rerun local API v1 checks.",
      stopIfMissing: ["post-rollback schema diff", "focused API v1 tests"],
    },
  ],
  touchesProductionDatabase: false,
};

function containsApiV1Env(text: string): boolean {
  return /^(GSE_API_KEY|GSE_API_V1_|API_V1_)/im.test(text);
}

function validateSourceBoundary(sourceText: string, blockers: string[]): void {
  const forbiddenFragments = [
    { fragment: ["@prisma", "client"].join("/"), message: "Rehearsal plan must not import Prisma client." },
    { fragment: ["packages", "db"].join("/"), message: "Rehearsal plan must not import the database package." },
    { fragment: ["process", "env"].join("."), message: "Rehearsal plan must not read environment variables." },
    { fragment: ["fetch", "("].join(""), message: "Rehearsal plan must not make network calls." },
  ] as const;

  for (const entry of forbiddenFragments) {
    if (sourceText.includes(entry.fragment)) blockers.push(entry.message);
  }
}

export function validateApiV1DisposableDbRehearsalPlan(
  plan: ApiV1DisposableDbRehearsalPlan = API_V1_DISPOSABLE_DB_REHEARSAL_PLAN,
  inspection: ApiV1DisposableDbRehearsalInspection = {}
): ApiV1DisposableDbRehearsalValidation {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (plan.status !== "plan_only") blockers.push("Disposable DB rehearsal must remain plan_only.");
  if (plan.commandsExecutableNow) blockers.push("Disposable DB rehearsal commands must not be executable in this slice.");
  if (plan.currentSliceRequiresEnvVars) blockers.push("This slice must not require API v1 environment variables.");
  if (plan.appliesMigration) blockers.push("This slice must not apply a migration.");
  if (plan.touchesProductionDatabase) blockers.push("This slice must never touch a production database.");
  if (plan.exposesRoute) blockers.push("This slice must not expose an API v1 route.");
  if (plan.createsCredential) blockers.push("This slice must not create credentials.");
  if (plan.providerCalled) blockers.push("This slice must not call providers.");
  if (plan.requiredFutureApproval !== "owner_approval_required") {
    blockers.push("Future owner approval must remain required before disposable database rehearsal.");
  }

  const stepIds = plan.steps.map((step) => step.id);
  for (const required of REQUIRED_STEPS) {
    if (!stepIds.includes(required)) blockers.push(`${required} rehearsal step is required.`);
  }
  const sortedOrders = [...plan.steps].map((step) => step.order).sort((left, right) => left - right);
  if (!sortedOrders.every((order, index) => order === index + 1)) {
    blockers.push("Rehearsal steps must be ordered contiguously starting at 1.");
  }
  if (!plan.steps.some((step) => step.id === "rollback-rehearsal" && step.expectedEvidence.includes("pre-rollback audit tip hash"))) {
    blockers.push("Rollback rehearsal must require the pre-rollback audit tip hash.");
  }

  if (inspection.routeTreeExists) blockers.push("API v1 route tree exists; rehearsal plan must stay route-free.");
  if (inspection.migrationNames?.some((name) => /api[_-]?v1/i.test(name))) {
    blockers.push("API v1 migration exists; rehearsal plan slice must remain migration-free.");
  }
  if (inspection.envFilesText !== undefined && containsApiV1Env(inspection.envFilesText)) {
    blockers.push("API v1 environment variables are present; rehearsal plan must not add env configuration.");
  }
  if (inspection.sourceText !== undefined) validateSourceBoundary(inspection.sourceText, blockers);

  warnings.push("A future disposable database rehearsal still requires owner approval and a disposable target.");

  return {
    blockers,
    checkedSteps: stepIds,
    ok: blockers.length === 0,
    warnings,
  };
}
