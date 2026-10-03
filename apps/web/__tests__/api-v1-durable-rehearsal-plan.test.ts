import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  API_V1_DISPOSABLE_DB_REHEARSAL_PLAN,
  validateApiV1DisposableDbRehearsalPlan,
  type ApiV1DisposableDbRehearsalPlan,
} from "@/lib/api/v1";
import { unapprovedApiV1RouteTreeExists } from "@/lib/api/v1/promoted-routes";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const sourcePath = path.join(repoRoot, "apps/web/lib/api/v1/durable-rehearsal-plan.ts");
const apiV1RouteTree = path.join(repoRoot, "apps/web/app/api/v1");
const migrationsDir = path.join(repoRoot, "packages/db/prisma/migrations");

function migrationNames(): string[] {
  return fs.readdirSync(migrationsDir).filter((entry) => {
    const migrationPath = path.join(migrationsDir, entry, "migration.sql");
    return fs.existsSync(migrationPath);
  });
}

describe("API v1 disposable database rehearsal plan", () => {
  it("stays plan-only and non-executable in the current slice", () => {
    expect(API_V1_DISPOSABLE_DB_REHEARSAL_PLAN).toMatchObject({
      appliesMigration: false,
      commandsExecutableNow: false,
      createsCredential: false,
      currentSliceRequiresEnvVars: false,
      exposesRoute: false,
      generatedFor: "api_v1_future_disposable_database_rehearsal",
      providerCalled: false,
      requiredFutureApproval: "owner_approval_required",
      status: "plan_only",
      touchesProductionDatabase: false,
    });
  });

  it("defines ordered proof steps from owner approval through rollback verification", () => {
    expect(API_V1_DISPOSABLE_DB_REHEARSAL_PLAN.steps.map((step) => step.id)).toEqual([
      "owner-approval-record",
      "disposable-database-only",
      "future-migration-review",
      "synthetic-fixture-seed",
      "durable-adapter-conformance",
      "fixture-report-comparison",
      "rollback-rehearsal",
      "post-rollback-verification",
    ]);
    expect(API_V1_DISPOSABLE_DB_REHEARSAL_PLAN.steps.map((step) => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(
      API_V1_DISPOSABLE_DB_REHEARSAL_PLAN.steps.find((step) => step.id === "rollback-rehearsal")?.expectedEvidence
    ).toContain("pre-rollback audit tip hash");
  });

  it("validates cleanly against the current route-free and migration-free repo state", () => {
    const report = validateApiV1DisposableDbRehearsalPlan(API_V1_DISPOSABLE_DB_REHEARSAL_PLAN, {
      migrationNames: migrationNames(),
      routeTreeExists: unapprovedApiV1RouteTreeExists(apiV1RouteTree),
      sourceText: fs.readFileSync(sourcePath, "utf8"),
    });

    expect(report.ok).toBe(true);
    expect(report.blockers).toEqual([]);
    expect(report.checkedSteps).toEqual(API_V1_DISPOSABLE_DB_REHEARSAL_PLAN.steps.map((step) => step.id));
    expect(report.warnings.join(" ")).toMatch(/owner approval/);
  });

  it("blocks attempts to turn the rehearsal plan into an executable live slice", () => {
    const badPlan = {
      ...API_V1_DISPOSABLE_DB_REHEARSAL_PLAN,
      appliesMigration: true,
      commandsExecutableNow: true,
      createsCredential: true,
      currentSliceRequiresEnvVars: true,
      exposesRoute: true,
      providerCalled: true,
      requiredFutureApproval: "owner_approval_required",
      touchesProductionDatabase: true,
    } as unknown as ApiV1DisposableDbRehearsalPlan;
    const report = validateApiV1DisposableDbRehearsalPlan(badPlan, {
      envFilesText: "API_V1_DATABASE_URL=postgres://example.invalid\n",
      migrationNames: ["20260704000000_api_v1_rehearsal"],
      routeTreeExists: true,
      sourceText: 'import { PrismaClient } from "@prisma/client"; process.env.API_V1_DATABASE_URL; fetch("/");',
    });

    expect(report.ok).toBe(false);
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "Disposable DB rehearsal commands must not be executable in this slice.",
        "This slice must not require API v1 environment variables.",
        "This slice must not apply a migration.",
        "This slice must never touch a production database.",
        "This slice must not expose an API v1 route.",
        "This slice must not create credentials.",
        "This slice must not call providers.",
        "API v1 route tree exists; rehearsal plan must stay route-free.",
        "API v1 migration exists; rehearsal plan slice must remain migration-free.",
        "API v1 environment variables are present; rehearsal plan must not add env configuration.",
        "Rehearsal plan must not import Prisma client.",
        "Rehearsal plan must not read environment variables.",
        "Rehearsal plan must not make network calls.",
      ])
    );
  });

  it("blocks plans that omit rollback evidence", () => {
    const badPlan: ApiV1DisposableDbRehearsalPlan = {
      ...API_V1_DISPOSABLE_DB_REHEARSAL_PLAN,
      steps: API_V1_DISPOSABLE_DB_REHEARSAL_PLAN.steps.map((step) =>
        step.id === "rollback-rehearsal"
          ? {
              ...step,
              expectedEvidence: step.expectedEvidence.filter((entry) => entry !== "pre-rollback audit tip hash"),
            }
          : step
      ),
    };
    const report = validateApiV1DisposableDbRehearsalPlan(badPlan);

    expect(report.ok).toBe(false);
    expect(report.blockers).toContain("Rollback rehearsal must require the pre-rollback audit tip hash.");
  });

  it("keeps the rehearsal plan source free of live-storage and network hooks", () => {
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).not.toContain("@prisma/client");
    expect(source).not.toContain("packages/db");
    expect(source).not.toContain("process.env");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("app/api/v1");
  });
});
