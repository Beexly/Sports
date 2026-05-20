import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * .env.example coverage — source-level invariant.
 *
 * Jarvis warns the operator when key env vars are missing. The list of
 * keys Jarvis checks must agree with the list of keys documented in
 * `.env.example`. Drift between the two is a silent bug: the operator
 * sets a value Jarvis doesn't check, or Jarvis warns about a key the
 * operator can't find in the example file.
 *
 * The test extracts the list Jarvis checks from `jarvis-data.ts` and
 * the keys present in `.env.example`, then asserts the Jarvis list is
 * a subset of the example list.
 */

const repoRoot = resolve(__dirname, "..", "..", "..");

function read(p: string): string {
  return readFileSync(resolve(repoRoot, p), "utf8");
}

function extractJarvisKeys(): string[] {
  const src = read("apps/web/lib/cockpit/jarvis-data.ts");
  // Grab the contents of the `need` array literal. It currently looks like:
  //   const need = [
  //     "DATABASE_URL",
  //     ...
  //   ];
  const m = src.match(/const\s+need\s*=\s*\[([\s\S]+?)\]/);
  if (!m) return [];
  const block = m[1] ?? "";
  return Array.from(block.matchAll(/"([A-Z0-9_]+)"/g)).map((mm) => mm[1] ?? "");
}

function extractEnvExampleKeys(): Set<string> {
  const src = read(".env.example");
  const keys = new Set<string>();
  for (const line of src.split(/\r?\n/)) {
    // Match KEY= or KEY="..." or KEY='...' — not comments
    const m = line.match(/^([A-Z][A-Z0-9_]+)=/);
    if (m && m[1]) keys.add(m[1]);
  }
  return keys;
}

describe(".env.example coverage", () => {
  it("Jarvis's external-config list is a subset of .env.example", () => {
    const jarvisKeys = extractJarvisKeys();
    expect(jarvisKeys.length).toBeGreaterThan(0);
    const exampleKeys = extractEnvExampleKeys();
    const missing = jarvisKeys.filter((k) => !exampleKeys.has(k));
    expect(
      missing,
      `These keys are checked by Jarvis but missing from .env.example:\n  ${missing.join(", ")}`
    ).toEqual([]);
  });

  it(".env.example contains every gate flag the readiness module reads", () => {
    const readiness = read("packages/prediction-engine/src/platform-config.ts");
    // Capture every process.env["..."] key the platform-config touches.
    const refs = Array.from(readiness.matchAll(/process\.env\[\s*["']([A-Z][A-Z0-9_]+)["']/g))
      .map((m) => m[1]!);
    const exampleKeys = extractEnvExampleKeys();
    const missing = Array.from(new Set(refs)).filter((k) => !exampleKeys.has(k));
    expect(
      missing,
      `These platform-config env reads have no .env.example entry:\n  ${missing.join(", ")}`
    ).toEqual([]);
  });

  it(".env.example documents the seed-only dev admin variables", () => {
    const exampleKeys = extractEnvExampleKeys();
    for (const k of ["DEV_ADMIN_EMAIL", "DEV_ADMIN_NAME"]) {
      expect(
        exampleKeys.has(k),
        `.env.example should document ${k} (it's referenced by the seed script).`
      ).toBe(true);
    }
  });

  it(".env.example documents the dev-mode bypass flags", () => {
    const exampleKeys = extractEnvExampleKeys();
    for (const k of ["DEV_FAKE_ADMIN", "DEMO_PICKS_ENABLED"]) {
      expect(
        exampleKeys.has(k),
        `.env.example should document ${k} (it's referenced by middleware/auth/dashboard).`
      ).toBe(true);
    }
  });

  it(".env.example covers every env key the CI workflow sets at the job level", () => {
    const ci = read(".github/workflows/ci.yml");
    // Capture YAML-style `KEY: "value"` env lines under any job's `env:` block.
    const ciEnvKeys = Array.from(ci.matchAll(/^\s+([A-Z][A-Z0-9_]+):\s+["'].*?["']/gm))
      .map((m) => m[1]!)
      .filter((k) => k !== "STRIPE_PUBLISHABLE_KEY" && !/^(NEXT_PUBLIC|SKIP_)/.test(k));
    const exampleKeys = extractEnvExampleKeys();
    // We don't fail on test-only env vars CI sets locally (e.g.
    // NEXTAUTH_URL=http://localhost:3000) — but the real ones must
    // exist in .env.example. Filter to the canonical set.
    const REQUIRED = new Set([
      "DATABASE_URL",
      "DIRECT_URL",
      "NEXTAUTH_SECRET",
      "NEXTAUTH_URL",
    ]);
    const missing = ciEnvKeys.filter((k) => REQUIRED.has(k) && !exampleKeys.has(k));
    expect(
      missing,
      `These CI-set env keys are missing from .env.example: ${missing.join(", ")}`
    ).toEqual([]);
  });

  it("the bootstrap progression flags are documented in .env.example", () => {
    // Even though Jarvis's external-config list only covers the auth +
    // billing + ingestion keys, the progression flags are equally
    // operator-facing — they're what an operator flips to advance the
    // platform out of bootstrap mode. .env.example must enumerate them.
    const exampleKeys = extractEnvExampleKeys();
    const REQUIRED_PROGRESSION_FLAGS = [
      "CANONICAL_HISTORY_ENABLED",
      "DERIVED_MODEL_HISTORY_ENABLED",
      "PUBLIC_PICKS_ENABLED",
      "FEATURED_PICK_PROMOTION_ENABLED",
      "PERFORMANCE_STATS_ENABLED",
      "PUBLIC_BLOG_ENABLED",
    ];
    const missing = REQUIRED_PROGRESSION_FLAGS.filter((k) => !exampleKeys.has(k));
    expect(
      missing,
      `These progression flags are missing from .env.example:\n  ${missing.join(", ")}`
    ).toEqual([]);
  });
});
