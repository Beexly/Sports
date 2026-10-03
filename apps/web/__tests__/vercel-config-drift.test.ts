/**
 * Vercel config placement + drift guard.
 *
 * Background (2026-08-17): Vercel reads `crons` and `headers` ONLY from the
 * vercel.json that sits inside the project's configured Root Directory, which
 * for this repo is `apps/web`. When that file was missing, every deploy from
 * `main` silently deregistered all 20 crons and the scheduler died — twice, for
 * roughly 23 hours combined. Nothing failed loudly; the site stayed up and
 * simply stopped ingesting.
 *
 * Commit 01244552 fixed placement by COPYING the config into apps/web rather
 * than moving it, leaving two byte-identical files. That is the state this
 * guard protects: the repo-root copy is inert as far as Vercel is concerned, so
 * if the two ever diverge, every tool that reads the root copy reports green
 * while production runs something else.
 *
 * Two outcomes are acceptable and this test allows both:
 *   1. Only apps/web/vercel.json exists  — the root copy was cleaned up.
 *   2. Both exist and are byte-identical — the current state.
 * The one thing it refuses is two files that disagree.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");

/** The only vercel.json Vercel actually reads (Root Directory = apps/web). */
const LIVE_CONFIG = resolve(REPO_ROOT, "apps", "web", "vercel.json");
/** Inert duplicate. Permitted to exist, permitted to be deleted — not to drift. */
const INERT_CONFIG = resolve(REPO_ROOT, "vercel.json");

interface VercelConfig {
  readonly crons?: ReadonlyArray<{ readonly path: string; readonly schedule: string }>;
  readonly headers?: ReadonlyArray<unknown>;
}

describe("vercel.json placement", () => {
  it("exists inside the Vercel Root Directory (apps/web)", () => {
    expect(
      existsSync(LIVE_CONFIG),
      "apps/web/vercel.json is missing. Vercel reads cron schedules only from " +
        "the Root Directory (apps/web); without this file every deploy " +
        "deregisters all crons and the scheduler dies silently.",
    ).toBe(true);
  });

  it("declares the cron schedules production depends on", () => {
    const config = JSON.parse(readFileSync(LIVE_CONFIG, "utf8")) as VercelConfig;
    expect(
      config.crons?.length ?? 0,
      "apps/web/vercel.json declares no crons — nothing will run on a schedule.",
    ).toBeGreaterThan(0);
  });
});

describe("vercel.json drift", () => {
  it("keeps the inert repo-root copy byte-identical to the live one", () => {
    if (!existsSync(INERT_CONFIG)) {
      // Root copy was removed. That is a valid end state — apps/web is the only
      // config Vercel consults — so there is nothing left to drift.
      return;
    }

    const live = readFileSync(LIVE_CONFIG, "utf8");
    const inert = readFileSync(INERT_CONFIG, "utf8");

    expect(
      inert,
      "vercel.json and apps/web/vercel.json have diverged. Vercel reads ONLY " +
        "apps/web/vercel.json, so the root copy is now lying to every tool " +
        "that reads it. Either mirror the change into both files, or delete " +
        "the root copy — but do not leave them disagreeing.",
    ).toBe(live);
  });
});
