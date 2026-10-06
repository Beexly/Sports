/**
 * The wiring proof, kept as a test so it cannot rot.
 *
 * A previous lane in this repo built a module whose only importer was its own
 * test file. Every test passed, the module read as complete coverage, and the
 * production system had never called it once. This file is the tripwire for that
 * specific failure: it reads the real cron route off disk and fails when the
 * route stops calling the runner, and it fails when the runner stops reaching
 * the model and the ledger.
 *
 * It is deliberately a SOURCE-level check rather than an import-and-mock check.
 * A behavioural test would pass by importing the runner directly, which is
 * exactly the thing that must not be the only evidence. Reading the route's own
 * source is the only thing that can distinguish "the runner is tested" from "the
 * production path calls the runner".
 *
 * It also pins the schedule in BOTH places the repo keeps it, because
 * `cron-schedule-manifest.test.ts` compares them as whole objects: a cron added
 * to `vercel.json` without the manifest entry fails that guard, and this test
 * names the consequence in the lane that owns the arbiter.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CRON_MANIFEST, findCronEntry } from "@/lib/ops/cron-schedule-manifest";

const repoRoot = resolve(__dirname, "..", "..", "..");
const routePath = resolve(
  repoRoot,
  "apps/web/app/api/cron/arbiter-adjudication/route.ts",
);
const routeSource = readFileSync(routePath, "utf-8");

const ROUTE_PATH = "/api/cron/arbiter-adjudication";

describe("the arbiter is wired, not merely tested", () => {
  it("the cron route file exists", () => {
    expect(() => readFileSync(routePath, "utf-8")).not.toThrow();
  });

  it("the route imports and calls the runner, not just its types", () => {
    // A type-only import would leave the module unreachable at runtime while
    // still satisfying a naive grep. This asserts the call, not the import.
    expect(routeSource).toMatch(/import\s*\{[^}]*\brunArbiterPass\b[^}]*\}\s*from\s*"\@\/lib\/arbiter\/run"/);
    expect(routeSource).toMatch(/await\s+runArbiterPass\(/);
  });

  it("the route reports what the pass measured, not a static shape", () => {
    // The pass result is spread into the response, so the counts are this run's.
    expect(routeSource).toMatch(/\.\.\.pass\b/);
  });

  it("the route does NOT hold the bearer-secret decision open on its own", () => {
    // `cronAuthError` defaults to bearer_only. Passing an explicit dual mode
    // here would let a spoofed x-vercel-cron header trigger paid Opus calls.
    expect(routeSource).toMatch(/cronAuthError\(request\)/);
    expect(routeSource).not.toMatch(/cronAuthError\(request,\s*\{\s*mode:\s*"dual"/);
  });

  it("the route does not return 200 on a thrown pass", () => {
    // A pass that throws recorded nothing. Reporting that as 200 would read as
    // "no disagreements found", which is a different and wrong claim.
    expect(routeSource).toMatch(/status:\s*500/);
  });
});

describe("the runner reaches the model and the ledger", () => {
  const runnerSource = readFileSync(
    resolve(repoRoot, "apps/web/lib/arbiter/run.ts"),
    "utf-8",
  );

  it("calls the provider dispatch surface, not a raw transport import", () => {
    // `ai-transport-import-boundary.mjs` forbids a non-allowlisted file from
    // importing `callClaudeMessages` or the provider clients. Going through
    // `provider-dispatch` is the sanctioned route and is what keeps this file
    // inside the guard.
    expect(runnerSource).toMatch(/from\s*"\@\/lib\/claude-api\/provider-dispatch"/);
    expect(runnerSource).not.toMatch(/from\s*"\@\/lib\/claude-api\/messages"/);
    expect(runnerSource).not.toMatch(/from\s*"\@\/lib\/claude-api\/providers\//);
  });

  it("resolves its model through the router's Opus tier, not a hardcoded id", () => {
    // A hardcoded id would be a model pin that ages badly and would contradict
    // the tier map's law that Opus 5-class ids are promoted by env once mapped.
    expect(runnerSource).toMatch(/resolveModelCatalog/);
    expect(runnerSource).not.toMatch(/claude-opus/);
  });

  it("records every call against the budget, including rejected output", () => {
    expect(runnerSource).toMatch(/recordClaudeApiCall\(/);
    // The success flag is derived from the parse, not hardcoded to true.
    expect(runnerSource).toMatch(/success:\s*ruling\.verdict\s*!==\s*null/);
  });

  it("checks the budget before spending, and cannot route around a refusal", () => {
    expect(runnerSource).toMatch(/evaluateClaudeBudgetUsage/);
    expect(runnerSource).toMatch(/BUDGET_REFUSED/);
    // No silent downgrade: a fallback tier would make the recorded modelName a lie.
    expect(runnerSource).not.toMatch(/pickModelForSurface/);
  });

  it("writes every ruling to the ledger, including rejections", () => {
    expect(runnerSource).toMatch(/recordArbiterDecision\(/);
    // A rejected ruling is still recorded, which is what keeps the ledger free
    // of survivorship bias.
    expect(runnerSource).toMatch(/rejected\s*\+=\s*1/);
  });

  it("never writes a Pick, so arbitration cannot change the board", () => {
    // `isPublished: true` IS present, as a READ filter in the pair scan, and that
    // is correct: the arbiter adjudicates rows the board is already showing.
    // What must not exist is any WRITE. Asserted on the mutating call names only.
    expect(runnerSource).toMatch(/isPublished:\s*true/);
    expect(runnerSource).not.toMatch(
      /db\.pick\.(create|update|upsert|updateMany|createMany|delete|deleteMany)/,
    );
    expect(runnerSource).toMatch(/db\.pick\.findMany\(/);
  });

  it("has no path that invents a ruling when the model is unavailable", () => {
    // Both unconfigured-terminal conditions return a rejection, never a verdict.
    expect(runnerSource).toMatch(/NO_API_KEY/);
    expect(runnerSource).toMatch(/TRANSPORT_/);
  });
});

describe("the schedule is declared in both places", () => {
  it("the manifest carries the arbiter cron with its real gap", () => {
    const entry = findCronEntry(ROUTE_PATH);
    expect(entry).not.toBeNull();
    expect(entry?.expectedMaxGapMinutes).toBe(60);
  });

  it("vercel.json declares the same path and schedule", () => {
    const vercel = JSON.parse(
      readFileSync(resolve(repoRoot, "vercel.json"), "utf-8"),
    ) as { crons: ReadonlyArray<{ path: string; schedule: string }> };
    const declared = vercel.crons.find((c) => c.path === ROUTE_PATH);
    expect(declared).toBeDefined();
    const fromManifest = CRON_MANIFEST.find((c) => c.path === ROUTE_PATH);
    expect(declared?.schedule).toBe(fromManifest?.schedule);
  });

  it("is scheduled off the board and signal-slate ticks", () => {
    // :41 against the board's :02/:17/:32/:47 and the slate's :05/:20/:35/:50.
    // A paid Opus pass competing with the public board for the cron budget is
    // the failure this pin prevents.
    const minute = 41;
    const boardMinutes = [2, 17, 32, 47];
    const slateMinutes = [5, 20, 35, 50];
    expect(boardMinutes).not.toContain(minute);
    expect(slateMinutes).not.toContain(minute);
  });
});
