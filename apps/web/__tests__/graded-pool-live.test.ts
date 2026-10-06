/**
 * LIVE smoke for the graded projections pool, under the nodejs environment.
 *
 * WHY A SEPARATE FILE AND ENVIRONMENT. `nflverse-readiness.ts:109` passes
 * `new AbortController().signal` into the injected fetcher. Under the default
 * jsdom environment, `new AbortController()` constructs a jsdom AbortSignal,
 * which undici REJECTS before a request is made:
 *
 *   Expected signal ("AbortSignal {}") to be an instance of AbortSignal
 *
 * So `loadGradedPool()` returned status "source-error" under jsdom no matter
 * what the network did, and a green test proved nothing about the projections
 * chain. Patching the global AbortController in vitest.setup.ts would have
 * touched the environment of every test in the workspace to fix one, so this
 * file opts into the nodejs environment instead — which is the runtime
 * instrumentation.ts actually registers the pool under in production.
 *
 * This is a NETWORK test. It is the only honest way to answer "does the
 * projections chain fetch, and how many real players come back", and it is
 * deliberately NOT a unit test: it must fail loudly if the source breaks.
 *
 * Run: npx vitest run --environment node __tests__/graded-pool-live.test.ts
 */
import { describe, expect, it } from "vitest";

import { loadGradedPool } from "@/lib/integrations/graded-pool";

describe("graded pool LIVE (node runtime)", () => {
  it(
    "fetches nflverse and produces a real, band-ordered pool",
    async () => {
      // Guard the premise: if jsdom's AbortController leaked in, this test is
      // measuring the environment rather than the product.
      expect(
        new AbortController().signal instanceof AbortSignal,
        "AbortController must be the native one for this test to mean anything",
      ).toBe(true);

      const res = await loadGradedPool();

      // eslint-disable-next-line no-console
      console.log(
        "\n[live] status=%s season=%s count=%s\n[live] attribution=%s\n[live] error=%s",
        res.status, res.season, res.count, res.attribution, res.error,
      );
      for (const p of res.players.slice(0, 6)) {
        // eslint-disable-next-line no-console
        console.log(
          "[live] %s %s %s proj=%s floor=%s ceiling=%s usage=%s trend=%s",
          p.name, p.pos, p.team, p.proj, p.floor, p.ceiling, p.usage, p.trend,
        );
      }

      expect(res.count).toBe(res.players.length);

      if (res.status === "source-error") {
        // A source error is a real, reportable outcome, not a silent pass. It
        // fails here on purpose: a projections chain that cannot fetch is the
        // thing this file exists to catch, and the error text is printed above
        // so the cause is in the failure output rather than hidden.
        throw new Error(`graded pool source-error: ${res.error}`);
      }

      // A LIVE pool with zero players is the failure that would silently leave
      // every fantasy tool on the illustrative pool in production.
      expect(res.players.length, "live pool must be non-empty").toBeGreaterThan(0);

      for (const p of res.players) {
        expect(p.floor, `${p.name}: floor <= proj`).toBeLessThanOrEqual(p.proj);
        expect(p.proj, `${p.name}: proj <= ceiling`).toBeLessThanOrEqual(p.ceiling);
        expect(p.proj, `${p.name}: proj must be a finite number`).toBeTypeOf("number");
        expect(Number.isFinite(p.proj)).toBe(true);
      }
    },
    300_000,
  );
});
