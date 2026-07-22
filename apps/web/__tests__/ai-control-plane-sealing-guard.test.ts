import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * AI control-plane sealing guard (directive §8.2).
 *
 * §8.2 requires the DI factory (`createAiExecutor`) and the env-taking
 * resolvers to live behind a test/internal-only boundary, and requires that
 * boundary to be GUARDED — not merely documented. This test exercises the
 * guardrail (scripts/guardrails/ai-control-plane-sealing.mjs) against the
 * real repo (must pass: no production module deep-imports the sealed
 * modules today) and against synthetic violations (each must fail): alias
 * imports, relative imports, dynamic import, require, and a public index
 * that re-exports a DI value.
 */

type SealingViolation = {
  readonly id: string;
  readonly file: string;
  readonly line: number | null;
  readonly message: string;
};

type GuardModule = {
  readonly collectAiControlPlaneSealingViolations: (
    root?: string,
  ) => Promise<readonly SealingViolation[]>;
};

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const guardPath = path.join(
  repoRoot,
  "scripts/guardrails/ai-control-plane-sealing.mjs",
);

async function loadGuard(): Promise<GuardModule> {
  return (await import(pathToFileURL(guardPath).href)) as GuardModule;
}

async function tempRepo(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "ai-cp-sealing-"));
  mkdirSync(path.join(root, "apps/web/lib/ai-control-plane"), { recursive: true });
  mkdirSync(path.join(root, "apps/web/lib/brief"), { recursive: true });
  mkdirSync(path.join(root, "apps/web/app/api/brief"), { recursive: true });
  mkdirSync(path.join(root, "apps/web/__tests__"), { recursive: true });
  writeFileSync(
    path.join(root, "apps/web/lib/ai-control-plane/index.ts"),
    'export { executeAiTask } from "./executor";\n',
  );
  writeFileSync(
    path.join(root, "apps/web/lib/ai-control-plane/internal.ts"),
    'export { createAiExecutor } from "./executor";\n',
  );
  writeFileSync(
    path.join(root, "apps/web/lib/ai-control-plane/executor.ts"),
    "export function createAiExecutor(): void {}\nexport function executeAiTask(): void {}\n",
  );
  writeFileSync(
    path.join(root, "apps/web/lib/ai-control-plane/cost-mode.ts"),
    "export function resolveCostMode(): void {}\n",
  );
  writeFileSync(
    path.join(root, "apps/web/lib/ai-control-plane/emergency.ts"),
    "export function verifyEmergencyOverride(): void {}\n",
  );
  return root;
}

describe("AI control-plane sealing guard", () => {
  it("passes against the real repo (no production imports of sealed modules)", async () => {
    const guard = await loadGuard();
    const violations = await guard.collectAiControlPlaneSealingViolations(repoRoot);
    expect(violations).toEqual([]);
  });

  it("clean synthetic repo passes (public-index import is allowed)", async () => {
    const root = await tempRepo();
    writeFileSync(
      path.join(root, "apps/web/lib/brief/runner.ts"),
      'import { executeAiTask } from "@/lib/ai-control-plane";\nexecuteAiTask();\n',
    );
    const guard = await loadGuard();
    expect(await guard.collectAiControlPlaneSealingViolations(root)).toEqual([]);
  });

  it("flags a production alias import of internal.ts", async () => {
    const root = await tempRepo();
    writeFileSync(
      path.join(root, "apps/web/lib/brief/runner.ts"),
      'import { createAiExecutor } from "@/lib/ai-control-plane/internal";\n',
    );
    const guard = await loadGuard();
    const violations = await guard.collectAiControlPlaneSealingViolations(root);
    expect(violations.map((v) => v.id)).toContain("ai-control-plane-sealed-import");
    expect(violations[0]!.file).toBe("apps/web/lib/brief/runner.ts");
  });

  it("flags production deep imports of executor, cost-mode, and emergency", async () => {
    const root = await tempRepo();
    writeFileSync(
      path.join(root, "apps/web/lib/brief/a.ts"),
      'import { createAiExecutor } from "@/lib/ai-control-plane/executor";\n',
    );
    writeFileSync(
      path.join(root, "apps/web/lib/brief/b.ts"),
      'import { resolveCostMode } from "@/lib/ai-control-plane/cost-mode";\n',
    );
    writeFileSync(
      path.join(root, "apps/web/lib/brief/c.ts"),
      'import { verifyEmergencyOverride } from "@/lib/ai-control-plane/emergency";\n',
    );
    const guard = await loadGuard();
    const violations = await guard.collectAiControlPlaneSealingViolations(root);
    expect(violations).toHaveLength(3);
    expect(new Set(violations.map((v) => v.file))).toEqual(
      new Set([
        "apps/web/lib/brief/a.ts",
        "apps/web/lib/brief/b.ts",
        "apps/web/lib/brief/c.ts",
      ]),
    );
  });

  it("flags RELATIVE-path imports that resolve into the sealed modules", async () => {
    const root = await tempRepo();
    writeFileSync(
      path.join(root, "apps/web/lib/brief/runner.ts"),
      'import { createAiExecutor } from "../ai-control-plane/internal";\n',
    );
    const guard = await loadGuard();
    const violations = await guard.collectAiControlPlaneSealingViolations(root);
    expect(violations.map((v) => v.id)).toContain("ai-control-plane-sealed-import");
  });

  it("flags dynamic import() and require() of sealed modules", async () => {
    const root = await tempRepo();
    writeFileSync(
      path.join(root, "apps/web/app/api/brief/route.ts"),
      'const mod = await import("@/lib/ai-control-plane/internal");\nexport { mod };\n',
    );
    writeFileSync(
      path.join(root, "apps/web/lib/brief/legacy.cjs"),
      'const cp = require("../ai-control-plane/executor");\nmodule.exports = cp;\n',
    );
    const guard = await loadGuard();
    const violations = await guard.collectAiControlPlaneSealingViolations(root);
    expect(violations).toHaveLength(2);
  });

  it("allows tests and control-plane-internal modules to import sealed modules", async () => {
    const root = await tempRepo();
    writeFileSync(
      path.join(root, "apps/web/__tests__/executor.test.ts"),
      'import { createAiExecutor } from "@/lib/ai-control-plane/internal";\n',
    );
    writeFileSync(
      path.join(root, "apps/web/lib/ai-control-plane/future-module.ts"),
      'import { createAiExecutor } from "./executor";\nexport { createAiExecutor };\n',
    );
    const guard = await loadGuard();
    expect(await guard.collectAiControlPlaneSealingViolations(root)).toEqual([]);
  });

  it("flags a public index that re-exports a DI value (but permits type-only exports)", async () => {
    const root = await tempRepo();
    writeFileSync(
      path.join(root, "apps/web/lib/ai-control-plane/index.ts"),
      'export { executeAiTask, createAiExecutor } from "./executor";\n' +
        'export type { EmergencyOverrideReceipt } from "./emergency";\n',
    );
    const guard = await loadGuard();
    const violations = await guard.collectAiControlPlaneSealingViolations(root);
    expect(violations.map((v) => v.id)).toContain(
      "ai-control-plane-public-di-export",
    );

    // Type-only export of the same names is NOT a violation.
    writeFileSync(
      path.join(root, "apps/web/lib/ai-control-plane/index.ts"),
      'export { executeAiTask } from "./executor";\n' +
        'export { type SealedAiExecutorDependencies } from "./internal";\n',
    );
    expect(await guard.collectAiControlPlaneSealingViolations(root)).toEqual([]);
  });
});
