import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Affiliate structural-separation guard.
 *
 * The founder ruling that turned affiliate revenue on (2026-07-16,
 * reports/agent-handoffs/ACTIVE_AGENT_RELAY.md "FOUNDER RULINGS") is
 * conditioned on pick generation and partner economics staying
 * structurally separate, machine-checked. This test exercises the
 * guardrail (scripts/guardrails/affiliate-structural-separation.mjs)
 * both against the real repo (must pass today, with zero
 * APPROVED_PARTNER rows and no coupling) and against synthetic
 * violations in both directions (must fail).
 */

type StructuralSeparationViolation = {
  readonly id: string;
  readonly file: string;
  readonly line: number;
  readonly message: string;
};

type GuardModule = {
  readonly collectAffiliateStructuralSeparationViolations: (
    root?: string
  ) => Promise<readonly StructuralSeparationViolation[]>;
};

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const guardPath = path.join(repoRoot, "scripts/guardrails/affiliate-structural-separation.mjs");

async function loadGuard(): Promise<GuardModule> {
  return (await import(pathToFileURL(guardPath).href)) as GuardModule;
}

async function tempRepo(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "affiliate-structural-separation-"));
  mkdirSync(path.join(root, "packages/prediction-engine/src"), { recursive: true });
  mkdirSync(path.join(root, "packages/data-ingestion/src"), { recursive: true });
  mkdirSync(path.join(root, "packages/ingestion-pipeline/src"), { recursive: true });
  mkdirSync(path.join(root, "workers/pick-generation/src"), { recursive: true });
  mkdirSync(path.join(root, "apps/web/lib/affiliate"), { recursive: true });
  mkdirSync(path.join(root, "apps/web/lib/revenue"), { recursive: true });
  mkdirSync(path.join(root, "apps/web/lib/cockpit"), { recursive: true });
  writeFileSync(path.join(root, "apps/web/lib/affiliate/ledger.ts"), "export const ledger = {};\n");
  writeFileSync(path.join(root, "apps/web/lib/revenue/index.ts"), "export const revenue = {};\n");
  writeFileSync(path.join(root, "apps/web/lib/cockpit/operator-registry.ts"), "export const OPERATOR_REGISTRY = [];\n");
  writeFileSync(
    path.join(root, "packages/prediction-engine/src/scoring.ts"),
    "export function score() { return 0; }\n"
  );
  return root;
}

describe("Affiliate structural-separation guard", () => {
  it("passes the current repository state", async () => {
    const guard = await loadGuard();
    const hits = await guard.collectAffiliateStructuralSeparationViolations(repoRoot);

    expect(hits).toEqual([]);
  });

  it("passes a minimal, uncoupled temp repo", async () => {
    const guard = await loadGuard();
    const root = await tempRepo();
    const hits = await guard.collectAffiliateStructuralSeparationViolations(root);

    expect(hits).toEqual([]);
  });

  it("blocks the engine importing the affiliate ledger (forward direction)", async () => {
    const guard = await loadGuard();
    const root = await tempRepo();
    writeFileSync(
      path.join(root, "packages/prediction-engine/src/tainted.ts"),
      'import { accrueCommission } from "../../../apps/web/lib/affiliate/ledger";\nexport const x = accrueCommission;\n'
    );

    const hits = await guard.collectAffiliateStructuralSeparationViolations(root);
    expect(hits.map((h) => h.id)).toContain("engine-imports-affiliate-ledger");
  });

  it("blocks data-ingestion importing the revenue pipeline (forward direction)", async () => {
    const guard = await loadGuard();
    const root = await tempRepo();
    writeFileSync(
      path.join(root, "packages/data-ingestion/src/tainted.ts"),
      'import { reviewDisclosure } from "../../../apps/web/lib/revenue/disclosure-policy";\nexport const x = reviewDisclosure;\n'
    );

    const hits = await guard.collectAffiliateStructuralSeparationViolations(root);
    expect(hits.map((h) => h.id)).toContain("engine-imports-revenue-pipeline");
  });

  it("blocks ingestion-pipeline importing the operator registry (forward direction)", async () => {
    const guard = await loadGuard();
    const root = await tempRepo();
    writeFileSync(
      path.join(root, "packages/ingestion-pipeline/src/tainted.ts"),
      'import { OPERATOR_REGISTRY } from "../../../apps/web/lib/cockpit/operator-registry";\nexport const x = OPERATOR_REGISTRY;\n'
    );

    const hits = await guard.collectAffiliateStructuralSeparationViolations(root);
    expect(hits.map((h) => h.id)).toContain("engine-imports-operator-registry");
  });

  it("blocks a worker importing the affiliate ledger (forward direction)", async () => {
    const guard = await loadGuard();
    const root = await tempRepo();
    writeFileSync(
      path.join(root, "workers/pick-generation/src/tainted.ts"),
      'const ledger = require("../../../apps/web/lib/affiliate/ledger");\nmodule.exports = ledger;\n'
    );

    const hits = await guard.collectAffiliateStructuralSeparationViolations(root);
    expect(hits.map((h) => h.id)).toContain("engine-imports-affiliate-ledger");
  });

  it("blocks the affiliate ledger importing prediction-engine internals (reverse direction)", async () => {
    const guard = await loadGuard();
    const root = await tempRepo();
    writeFileSync(
      path.join(root, "apps/web/lib/affiliate/tainted.ts"),
      'import { getReadinessGates } from "@sports/prediction-engine";\nexport const x = getReadinessGates;\n'
    );

    const hits = await guard.collectAffiliateStructuralSeparationViolations(root);
    expect(hits.map((h) => h.id)).toContain("revenue-imports-prediction-engine");
  });

  it("blocks the operator registry importing prediction-engine internals (reverse direction)", async () => {
    const guard = await loadGuard();
    const root = await tempRepo();
    writeFileSync(
      path.join(root, "apps/web/lib/cockpit/operator-registry.ts"),
      'import { getReadinessGates } from "@sports/prediction-engine";\nexport const OPERATOR_REGISTRY = [getReadinessGates];\n'
    );

    const hits = await guard.collectAffiliateStructuralSeparationViolations(root);
    expect(hits.map((h) => h.id)).toContain("revenue-imports-prediction-engine");
  });

  it("does not flag unrelated cross-package imports (e.g. apps/web/lib/scraping) as violations", async () => {
    const guard = await loadGuard();
    const root = await tempRepo();
    writeFileSync(
      path.join(root, "packages/prediction-engine/src/scraping-adapter.ts"),
      'export const ref = "apps/web/lib/scraping/source-rights-registry.ts#nflverse";\n'
    );

    const hits = await guard.collectAffiliateStructuralSeparationViolations(root);
    expect(hits).toEqual([]);
  });
});
