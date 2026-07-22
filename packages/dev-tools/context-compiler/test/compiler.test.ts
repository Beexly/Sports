import { describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileContextPack } from "../src/compiler.js";
import { canonicalStringify, sha256Hex } from "../src/canonical.js";

// This is an integration test: it runs the compiler against the *real* sports
// monorepo checkout this package lives inside (three levels up), reading real
// git objects. It does not spin up any mock repo — the whole point of this
// tool is to be exercised against real history.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

describe("compileContextPack (integration, real repo)", () => {
  it("compiles a real manifest for the guard-order fix commit and every field is grounded", async () => {
    const manifest = await compileContextPack({
      cwd: REPO_ROOT,
      objective: "test objective: guard-order fix",
      targetFiles: ["apps/web/lib/jarvis/ledgers.ts"],
      headRef: "fcec492c",
      collisionInventoryRef: "origin/nova/convergence-inventory-tooling",
      collisionInventoryPath: "reports/nova/convergence/multi-head/NOVA_MULTIHEAD_INVENTORY.json",
    });

    expect(manifest.repoHead.sha).toMatch(/^fcec492cb8d286be19f1f3f6ea739cdb5076ad10$/);
    expect(manifest.relevantSymbols.length).toBeGreaterThan(0);
    for (const s of manifest.relevantSymbols) {
      expect(s.file).toBe("apps/web/lib/jarvis/ledgers.ts");
      expect(s.startLine).toBeGreaterThan(0);
      expect(s.endLine).toBeGreaterThanOrEqual(s.startLine);
      expect(s.contentSha256).toMatch(/^[0-9a-f]{64}$/);
    }
    // The real known test file for this module must show up.
    expect(manifest.relevantTests.some((t) => t.file === "apps/web/__tests__/council-ledgers.test.ts")).toBe(true);
    // Every prior decision/failure must cite a real commit sha (40 hex chars).
    for (const d of manifest.priorDecisionsAndFailures) {
      expect(d.sha).toMatch(/^[0-9a-f]{40}$/);
    }
  });

  it("is deterministic: compiling the same objective+target+sha twice yields byte-identical JSON and equal contentHash", async () => {
    const opts = {
      cwd: REPO_ROOT,
      objective: "determinism check",
      targetFiles: ["apps/web/lib/opportunity-engine/evidence.ts"],
      headRef: "228f04f6",
      collisionInventoryRef: "origin/nova/convergence-inventory-tooling",
      collisionInventoryPath: "reports/nova/convergence/multi-head/NOVA_MULTIHEAD_INVENTORY.json",
    };
    const first = await compileContextPack(opts);
    const second = await compileContextPack(opts);

    expect(canonicalStringify(first)).toBe(canonicalStringify(second));
    expect(first.contentHash).toBe(second.contentHash);
  });

  it("contentHash actually changes if the objective text changes (hash is not a constant)", async () => {
    const base = {
      cwd: REPO_ROOT,
      targetFiles: ["apps/web/lib/opportunity-engine/evidence.ts"],
      headRef: "228f04f6",
    };
    const a = await compileContextPack({ ...base, objective: "objective A" });
    const b = await compileContextPack({ ...base, objective: "objective B" });
    expect(a.contentHash).not.toBe(b.contentHash);
  });

  it("contentHash equals sha256 of the canonical manifest with contentHash blanked", async () => {
    const manifest = await compileContextPack({
      cwd: REPO_ROOT,
      objective: "hash self-check",
      targetFiles: ["packages/db/prisma/seed.ts"],
      headRef: "c24588f3",
    });
    const recomputed = sha256Hex(canonicalStringify({ ...manifest, contentHash: "" }));
    expect(manifest.contentHash).toBe(recomputed);
  });

  it("never fabricates a known collision: an unresolvable collision ref yields an empty list, not an error", async () => {
    const manifest = await compileContextPack({
      cwd: REPO_ROOT,
      objective: "collision-ref honesty check",
      targetFiles: ["packages/db/prisma/seed.ts"],
      headRef: "c24588f3",
      collisionInventoryRef: "origin/this-ref-does-not-exist",
      collisionInventoryPath: "nowhere.json",
    });
    expect(manifest.knownCollisions).toEqual([]);
  });
});
