/**
 * Ethandojo handoff adapters — tests.
 *
 * Coverage: the OverTheCap adapter is exposed through a typed
 * `HandoffSalaryProvider` / `SalaryDataProvider` contract, is injectable
 * into that contract (fixture swap), is callable end-to-end, and the
 * composition layer leaves the source registry untouched.
 */
import { describe, expect, it, vi } from "vitest";

import {
  assertSalaryProvider,
  createEthandojoHandoffAdapters,
  createHandoffSalaryProvider,
  type HandoffSalaryProvider,
} from "./ethandojo-handoff-adapters.js";
import {
  OVERTHECAP_ENV_FLAG,
  type SalaryDataProvider,
} from "./overthecap-salaries.js";

const ENABLED_ENV = { [OVERTHECAP_ENV_FLAG]: "1" } as NodeJS.ProcessEnv;

const FIXTURE_HTML = `<html><body>
<script id="otc-cap-data" type="application/json">
${JSON.stringify({
  season: 2026,
  rows: [
    { playerName: "Patrick Mahomes", team: "KC", position: "QB", capHit: "$45,000,000" },
    { playerName: "Travis Kelce", team: "KC", position: "TE", capHit: "$14,500,000" },
  ],
})}
</script>
</body></html>`;

function fixtureFetch(): { fetchImpl: typeof fetch; calls: string[] } {
  const calls: string[] = [];
  const fetchImpl: typeof fetch = vi.fn(async (url: unknown) => {
    calls.push(String(url));
    return new Response(FIXTURE_HTML, { status: 200, headers: { "content-type": "text/html" } });
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

/** Minimal injectable provider fixture (engine-suite shape). */
function makeInjectedProvider(): HandoffSalaryProvider {
  const caps = new Map<string, number>([["Patrick Mahomes", 45.0]]);
  return {
    getCapHitMillions(name: string): Promise<number | null> {
      return Promise.resolve(caps.get(name) ?? null);
    },
    getAllCapHits(): Promise<ReadonlyMap<string, number>> {
      return Promise.resolve(caps);
    },
    isAvailable(): boolean {
      return true;
    },
  };
}

describe("assertSalaryProvider", () => {
  it("accepts a well-formed provider and rejects incomplete ones", () => {
    expect(() => assertSalaryProvider(makeInjectedProvider())).not.toThrow();
    expect(() =>
      assertSalaryProvider({ isAvailable: () => true } as unknown as HandoffSalaryProvider),
    ).toThrow(/getCapHitMillions/);
  });
});

describe("createEthandojoHandoffAdapters", () => {
  it("exposes the OverTheCap adapter through the typed salary contract", async () => {
    const { fetchImpl, calls } = fixtureFetch();
    const adapters = createEthandojoHandoffAdapters({
      env: ENABLED_ENV,
      fetchImpl,
    });

    const provider: HandoffSalaryProvider = adapters.salaryProvider;
    expect(typeof provider.getCapHitMillions).toBe("function");
    expect(typeof provider.getAllCapHits).toBe("function");
    expect(typeof provider.isAvailable).toBe("function");
    expect(provider.isAvailable()).toBe(true);
    expect(adapters.overTheCapEnabled).toBe(true);

    const cap = await provider.getCapHitMillions("Patrick Mahomes", 2026);
    expect(cap).toBeCloseTo(45, 10);
    const all = await provider.getAllCapHits(2026);
    expect(all.size).toBe(2);
    expect(calls.length).toBeGreaterThan(0);
  });

  it("adapter contract is injectable: a fixture provider swaps in cleanly", async () => {
    const injected = makeInjectedProvider();
    const adapters = createEthandojoHandoffAdapters({
      env: {} as NodeJS.ProcessEnv,
      salaryProvider: injected,
    });
    expect(adapters.salaryProvider).toBe(injected);

    // Callable through the documented interface.
    const cap = await adapters.salaryProvider.getCapHitMillions("Patrick Mahomes", 2026);
    expect(cap).toBe(45.0);
    const missing = await adapters.salaryProvider.getCapHitMillions("Nobody", 2026);
    expect(missing).toBeNull();
  });

  it("isAssignable to the engine suite's SalaryDataProvider shape", async () => {
    const { fetchImpl } = fixtureFetch();
    const provider: SalaryDataProvider = createHandoffSalaryProvider({
      env: ENABLED_ENV,
      fetchImpl,
    });
    expect(provider.isAvailable()).toBe(true);
    const all = await provider.getAllCapHits(2026);
    expect(all.get("Travis Kelce")).toBeCloseTo(14.5, 10);
  });

  it("reports the env gate without enabling ingest", () => {
    const off = createEthandojoHandoffAdapters({ env: {} as NodeJS.ProcessEnv });
    expect(off.overTheCapEnabled).toBe(false);
    expect(off.salaryProvider.isAvailable()).toBe(false);

    const on = createEthandojoHandoffAdapters({ env: ENABLED_ENV });
    expect(on.overTheCapEnabled).toBe(true);
    expect(on.salaryProvider.isAvailable()).toBe(true);
  });

  it("rejects an injected provider that does not satisfy the contract", () => {
    expect(() =>
      createEthandojoHandoffAdapters({
        salaryProvider: { nope: true } as unknown as HandoffSalaryProvider,
      }),
    ).toThrow(/assertSalaryProvider|missing/);
  });
});
