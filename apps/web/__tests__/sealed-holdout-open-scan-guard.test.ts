import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Sealed-holdout open-call guard (FIX 6).
 *
 * walk-forward.ts's sealed forward holdout (handoff §2 P0) now requires
 * BOTH the literal founder token AND process.env.GSE_ALLOW_HOLDOUT_OPEN ===
 * "true" to open — a runtime check. This guardrail
 * (scripts/guardrails/sealed-holdout-open-scan.mjs) is the accompanying
 * static check: `openHoldout(` must never be CALLED from application code
 * outside packages/prediction-engine/src/edge-lab/, so ordinary app/worker
 * code can't even attempt to open the seal, token or no token.
 */

type SealedHoldoutOpenViolation = {
  readonly file: string;
  readonly line: number;
  readonly message: string;
};

type GuardModule = {
  readonly collectSealedHoldoutOpenViolations: (
    root?: string
  ) => Promise<readonly SealedHoldoutOpenViolation[]>;
};

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const guardPath = path.join(repoRoot, "scripts/guardrails/sealed-holdout-open-scan.mjs");

async function loadGuard(): Promise<GuardModule> {
  return (await import(pathToFileURL(guardPath).href)) as GuardModule;
}

async function tempRepo(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "sealed-holdout-open-scan-"));
  mkdirSync(path.join(root, "packages/prediction-engine/src/edge-lab/__tests__"), { recursive: true });
  mkdirSync(path.join(root, "apps/web/lib"), { recursive: true });
  mkdirSync(path.join(root, "workers/pick-generation/src"), { recursive: true });
  writeFileSync(
    path.join(root, "packages/prediction-engine/src/edge-lab/walk-forward.ts"),
    "export const sealHoldout = () => ({ openHoldout: (token: string) => [] });\n"
  );
  writeFileSync(
    path.join(root, "packages/prediction-engine/src/edge-lab/__tests__/walk-forward.test.ts"),
    'import { sealHoldout } from "../walk-forward";\nconst s = sealHoldout();\ns.openHoldout("FOUNDER-SIGNED-OFF-OPEN-THE-HOLDOUT");\n'
  );
  return root;
}

describe("Sealed-holdout open-call guard", () => {
  it("passes the current repository state", async () => {
    const guard = await loadGuard();
    const hits = await guard.collectSealedHoldoutOpenViolations(repoRoot);

    expect(hits).toEqual([]);
  });

  it("passes a minimal repo where openHoldout is only called inside edge-lab", async () => {
    const guard = await loadGuard();
    const root = await tempRepo();
    const hits = await guard.collectSealedHoldoutOpenViolations(root);

    expect(hits).toEqual([]);
  });

  it("blocks an application-code call site (apps/web)", async () => {
    const guard = await loadGuard();
    const root = await tempRepo();
    writeFileSync(
      path.join(root, "apps/web/lib/unsealer.ts"),
      'import { sealHoldout } from "@sports/prediction-engine";\n' +
        "const sealed = sealHoldout();\n" +
        'export const holdout = sealed.openHoldout("FOUNDER-SIGNED-OFF-OPEN-THE-HOLDOUT");\n'
    );

    const hits = await guard.collectSealedHoldoutOpenViolations(root);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.file).toBe("apps/web/lib/unsealer.ts");
  });

  it("blocks a worker call site (workers/)", async () => {
    const guard = await loadGuard();
    const root = await tempRepo();
    writeFileSync(
      path.join(root, "workers/pick-generation/src/unsealer.ts"),
      'const sealed = sealHoldout();\nconst rows = sealed.openHoldout(process.env.TOKEN ?? "");\n'
    );

    const hits = await guard.collectSealedHoldoutOpenViolations(root);
    expect(hits.map((h) => h.file)).toContain("workers/pick-generation/src/unsealer.ts");
  });

  it("does not flag the property DEFINITION (`openHoldout: (token) => ...`) in walk-forward.ts", async () => {
    const guard = await loadGuard();
    const root = await tempRepo();
    // The definition site already exists in tempRepo()'s walk-forward.ts
    // stub (`openHoldout: (token: string) => []`) and must not self-flag.
    const hits = await guard.collectSealedHoldoutOpenViolations(root);
    expect(hits.filter((h) => h.file.endsWith("walk-forward.ts"))).toEqual([]);
  });
});
