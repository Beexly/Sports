/**
 * Operator-facing surfaces must not name a package the workspace does not install.
 *
 * Why this exists: the "BullMQ + Redis queue" claim was never true — `bullmq` is
 * a dependency of no package.json and is imported by no source file — yet it
 * propagated out of the docs and into strings the operator reads at runtime:
 *
 *   - CAPABILITY_REGISTRY[].currentTruth  → rendered by
 *     apps/web/components/cockpit/capability-system-map.tsx and returned in
 *     askJarvis("what-is-wired").supportingState
 *   - CAPABILITY_REGISTRY[].nextAction    → rendered by the same component and
 *     returned as askJarvis("what-is-not-wired").nextAction /
 *     askJarvis("what-should-we-build-next").nextAction
 *   - INTEGRITY_LEDGER[].nextAction       → rendered by /cockpit/integrity
 *
 * The guard is DERIVED, not a hardcoded denylist of strings: the installed set
 * is read from every package.json in the workspace. If someone genuinely
 * installs one of these packages, the claim becomes legal automatically and
 * this test stops objecting — it only forbids naming a technology that is not
 * there.
 *
 * Runtime assertions only: apps/web/tsconfig.json excludes __tests__/**, so a
 * type-level assertion in this file would never be typechecked.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { CAPABILITY_REGISTRY } from "@/lib/jarvis/capability-registry";
import { INTEGRITY_LEDGER } from "@/lib/platform/integrity-ledger";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");

const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", "coverage"]);

/** Every package.json in the workspace (workspaces included), excluding node_modules. */
function collectPackageJsons(dir: string, found: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return found;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let isDir = false;
    try {
      isDir = statSync(full).isDirectory();
    } catch {
      continue;
    }
    if (isDir) {
      collectPackageJsons(full, found);
    } else if (entry === "package.json") {
      found.push(full);
    }
  }
  return found;
}

/** Union of every declared dependency name across the workspace. */
function installedPackageNames(): ReadonlySet<string> {
  const names = new Set<string>();
  for (const file of collectPackageJsons(REPO_ROOT)) {
    let pkg: Record<string, unknown>;
    try {
      pkg = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
    } catch {
      continue;
    }
    for (const field of [
      "dependencies",
      "devDependencies",
      "peerDependencies",
      "optionalDependencies",
    ]) {
      const block = pkg[field];
      if (block && typeof block === "object") {
        for (const name of Object.keys(block as Record<string, unknown>)) {
          names.add(name);
        }
      }
    }
  }
  return names;
}

/**
 * Packages that operator-facing copy has historically claimed the platform runs
 * on. Each may be named in an operator surface only while it is genuinely
 * installed somewhere in the workspace.
 */
const CLAIMED_RUNTIME_PACKAGES = ["bullmq", "supertest"] as const;

/** Every registry string an operator can actually read on a cockpit surface. */
function operatorRenderedStrings(): ReadonlyArray<{ where: string; text: string }> {
  return [
    ...CAPABILITY_REGISTRY.flatMap((c) => [
      { where: `CAPABILITY_REGISTRY[${c.id}].currentTruth`, text: c.currentTruth },
      { where: `CAPABILITY_REGISTRY[${c.id}].nextAction`, text: c.nextAction },
    ]),
    ...INTEGRITY_LEDGER.map((e) => ({
      where: `INTEGRITY_LEDGER[${e.id}].nextAction`,
      text: e.nextAction,
    })),
  ];
}

describe("operator-facing registries never name an uninstalled package", () => {
  const installed = installedPackageNames();

  it("reads a non-trivial installed dependency set (guard is not vacuous)", () => {
    expect(installed.size).toBeGreaterThan(20);
    // Sanity: a package we definitely do install.
    expect(installed.has("next")).toBe(true);
  });

  for (const pkg of CLAIMED_RUNTIME_PACKAGES) {
    it(`does not name "${pkg}" in any operator-rendered string while it is not installed`, () => {
      if (installed.has(pkg)) {
        // Genuinely installed — naming it is accurate, nothing to enforce.
        return;
      }
      const offenders = operatorRenderedStrings().filter((s) =>
        s.text.toLowerCase().includes(pkg)
      );
      expect(offenders.map((o) => `${o.where}: ${o.text}`)).toEqual([]);
    });
  }
});
