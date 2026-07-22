import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// All five tests are CONTENT-BASED scans of the checkout — CI's checkout is
// shallow (fetch-depth 1), so any `git diff origin/main`-style assertion
// would be flaky-by-construction there. See
// docs/frontier/GENESIS_CONVERGENCE_MAP.md and the design-validation notes
// folded into the master plan for why.

const REPO_ROOT = resolve(__dirname, "../../../..");
const PACKAGE_DIR = resolve(__dirname, "..", "..");

function walk(dir: string, predicate: (path: string) => boolean, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === "dist") continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, predicate, out);
    else if (predicate(full)) out.push(full);
  }
  return out;
}

describe("Structural invariants (GX-000/GG-001 shadow-only guarantees)", () => {
  it("16. no production surface imports genesis-kernel", () => {
    const tsFiles = [
      ...walk(join(REPO_ROOT, "apps/web/app"), (p) => /\.tsx?$/.test(p)),
      ...walk(join(REPO_ROOT, "apps/web/lib"), (p) => /\.tsx?$/.test(p)),
      ...walk(join(REPO_ROOT, "apps/web/components"), (p) => /\.tsx?$/.test(p)),
      ...walk(join(REPO_ROOT, "workers"), (p) => /\.tsx?$/.test(p) && p.includes("/src/")),
    ];
    const offenders = tsFiles.filter((f) => /genesis-kernel/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("17. no public route path under apps/web/app contains 'genesis'", () => {
    const appDir = join(REPO_ROOT, "apps/web/app");
    if (!existsSync(appDir)) return; // honest skip if the app tree isn't present in this checkout
    // Compare APP-RELATIVE paths: matching the absolute path would falsely
    // trip whenever the checkout directory itself contains "genesis" (e.g. a
    // worktree at .../wt/genesis) — the invariant is about route paths, and a
    // route segment named genesis still fails exactly as before.
    const offenders = walk(appDir, () => true)
      .map((p) => relative(appDir, p))
      .filter((p) => /genesis/i.test(p));
    expect(offenders).toEqual([]);
  });

  it("18. no Prisma schema/dependency/import touches genesis", () => {
    const schemaPath = join(REPO_ROOT, "packages/db/prisma/schema.prisma");
    if (existsSync(schemaPath)) {
      expect(/genesis/i.test(readFileSync(schemaPath, "utf8"))).toBe(false);
    }
    const pkg = JSON.parse(readFileSync(join(PACKAGE_DIR, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(deps["@sports/db"]).toBeUndefined();
    expect(deps["@prisma/client"]).toBeUndefined();

    // Production kernel modules only — this test file's own source
    // legitimately mentions the forbidden package names as plain strings
    // (this very assertion), so __tests__ is excluded from the scan.
    const srcFiles = walk(join(PACKAGE_DIR, "src"), (p) => p.endsWith(".ts") && !p.includes("__tests__"));
    for (const f of srcFiles) {
      const src = readFileSync(f, "utf8");
      expect(src).not.toMatch(/@sports\/db|@prisma\/client/);
    }
  });

  it("19. the secret scanner passes over the genesis-kernel source, and the guardrail chain still names every guard", () => {
    const targets = walk(join(PACKAGE_DIR, "src"), () => true);
    const scanner = join(REPO_ROOT, "scripts/guardrails/secret-scan.mjs");
    if (existsSync(scanner) && targets.length > 0) {
      expect(() => execFileSync("node", [scanner, ...targets], { stdio: "pipe" })).not.toThrow();
    }

    const rootPkgPath = join(REPO_ROOT, "package.json");
    if (existsSync(rootPkgPath)) {
      const rootPkg = JSON.parse(readFileSync(rootPkgPath, "utf8")) as { scripts?: Record<string, string> };
      const chain = rootPkg.scripts?.["guardrails"] ?? "";
      for (const guard of [
        "trust-gate",
        "model-freeze",
        "draft-only",
        "claude-api-usage",
        "secret-scan",
        "api-v1-boundary",
        "commercial-copy-scan",
        "no-unsupported-performance-claims",
        "no-raw-ngs-export",
        "partner-offer-compliance-scan",
        "api-payload-rights-scan",
        "openapi-security-scan",
        "no-zk-overclaim",
        "affiliate-structural-separation",
        "sealed-holdout-open-scan",
        "aws-compatibility-index-scan",
        "eval-contracts",
      ]) {
        expect(chain, `guardrails chain is missing ${guard}`).toContain(guard);
      }
    }
  });

  it("20. clean-install proxies: scripts present, workspace registered in the lockfile", () => {
    const pkg = JSON.parse(readFileSync(join(PACKAGE_DIR, "package.json"), "utf8")) as { scripts?: Record<string, string>; name: string };
    expect(pkg.scripts?.["test"]).toBeTruthy();
    expect(pkg.scripts?.["typecheck"]).toBeTruthy();

    const rootPkgPath = join(REPO_ROOT, "package.json");
    const rootPkg = JSON.parse(readFileSync(rootPkgPath, "utf8")) as { scripts?: Record<string, string> };
    expect(rootPkg.scripts?.["genesis:scan"]).toBeTruthy();
    expect(rootPkg.scripts?.["genesis:plan"]).toBeTruthy();
    expect(rootPkg.scripts?.["test:genesis"]).toBeTruthy();

    const lockPath = join(REPO_ROOT, "package-lock.json");
    if (existsSync(lockPath)) {
      const lock = readFileSync(lockPath, "utf8");
      expect(lock).toContain('"packages/genesis-kernel"');
      expect(lock).toContain(`"node_modules/${pkg.name}"`);
    }
  });
});
