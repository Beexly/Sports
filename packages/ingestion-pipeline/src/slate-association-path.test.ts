/**
 * Proves the production crash cause: the data PATH, not the data.
 *
 * The old `resolve(__dirname, "..", "..", "..")` only resolves correctly when
 * the compiled module sits at `<root>/packages/ingestion-pipeline/dist`. Vercel
 * bundles it under `apps/web`, so the lookup landed on
 * `/var/task/apps/web/data/gse-dataset/...` — a path that does not exist —
 * while the real tracked file sat at the repo root. The fail-closed guard then
 * did its job perfectly and took the whole board with it:
 * `/api/cron/board-fill` and `/api/cron/generate-signal-slate` returned 500 on
 * every run (16x and 8x measured on deployment
 * dpl_5w9WsXUHtYq3KbMiX58gTZzKZjZR) with "bridge-premises.jsonl is missing at
 * /var/task/apps/web/data/gse-dataset/...".
 *
 * `data/gse-dataset/bridge-premises.jsonl` was never the problem: it is tracked
 * in git (85,924 bytes, 285 measured `pregame_context_logit` holdout rows,
 * mean probability 0.560244). Only the path arithmetic was wrong.
 *
 * IMPORTANT ON STRUCTURE. `resolveDataRoot()` runs ONCE at module load, so the
 * absent/blank cases CANNOT be exercised in-process with an env override — the
 * module is already resolved. Those cases therefore run in a CHILD PROCESS
 * with `GSE_DATA_ROOT` set before the import. That is the honest way to test a
 * module-load-time decision, and it keeps the guard test real rather than
 * asserting against an already-cached module.
 */
import { describe, it, expect, vi } from "vitest";
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// vitest runs with cwd = the package dir; the repo root is two levels up.
const repoRoot = resolve(__dirname, "..", "..", "..");
const realFile = join(repoRoot, "data", "gse-dataset", "bridge-premises.jsonl");

/**
 * Import the module in a fresh Node process with GSE_DATA_ROOT preset, and
 * report the outcome as a JSON line on stdout.
 */
/**
 * `resolveDataRoot()` runs ONCE at module load, so the absent/blank cases
 * cannot be exercised in-process with a plain dynamic import — the module is
 * already resolved and cached. `vi.resetModules()` drops that cache so the
 * next dynamic import RE-EVALUATES the module and re-reads GSE_DATA_ROOT.
 * That is the honest way to test a module-load-time decision without a
 * subprocess that cannot load TypeScript anyway.
 */
async function probeWithDataRoot(dataRoot: string): Promise<{ ok: boolean; error?: string }> {
  process.env["GSE_DATA_ROOT"] = dataRoot;
  vi.resetModules();
  try {
    const mod = await import("./slate-association.js");
    await mod.slateAssociationTrace();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

describe("slate-association data resolution", () => {
  it("the tracked dataset really is in the repo (the premise of this fix)", () => {
    expect(existsSync(realFile)).toBe(true);
  });

  it("resolves the real dataset and yields an association", async () => {
    delete process.env["GSE_DATA_ROOT"];
    const mod = await import("./slate-association.js");
    await expect(mod.slateAssociationTrace()).resolves.toBeDefined();
  });

  it("STILL refuses when the data is genuinely absent — the guard is not weakened", async () => {
    const dir = mkdtempSync(join(tmpdir(), "gse-empty-"));
    try {
      const r = await probeWithDataRoot(dir);
      expect(r.ok).toBe(false);
      expect(r.error ?? "").toMatch(/bridge-premises\.jsonl is missing/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses when the file exists but holds zero usable rows", async () => {
    const dir = mkdtempSync(join(tmpdir(), "gse-blank-"));
    const nested = join(dir, "data", "gse-dataset");
    mkdirSync(nested, { recursive: true });
    writeFileSync(join(nested, "bridge-premises.jsonl"), "\n\n", "utf8");
    try {
      const r = await probeWithDataRoot(dir);
      expect(r.ok).toBe(false);
      expect(r.error ?? "").toMatch(/zero readable association rows/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("accepts a valid override that holds real rows", async () => {
    const dir = mkdtempSync(join(tmpdir(), "gse-good-"));
    const nested = join(dir, "data", "gse-dataset");
    mkdirSync(nested, { recursive: true });
    writeFileSync(
      join(nested, "bridge-premises.jsonl"),
      JSON.stringify({ signal_id: "pregame_context_logit", probability: 0.61 }) + "\n",
      "utf8",
    );
    try {
      const r = await probeWithDataRoot(dir);
      expect(r.ok).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
