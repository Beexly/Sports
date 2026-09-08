import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * C-243. There were TWO registration entry points for the graded projections
 * provider and only one of them was coordinated.
 *
 * `instrumentation.ts` called `loadAndRegisterGradedProvider` directly, so the
 * startup load was recorded nowhere in `projections-server`: `gradedLoad`
 * stayed null, `loadInFlight` stayed false, `lastAttemptAt` stayed
 * NEGATIVE_INFINITY and `registeredAt` stayed 0. The first fantasy request
 * therefore treated the provider startup had just installed as stale and began
 * its own multi-MB load. Two loads then raced one process-wide registry, and
 * `loadAndRegisterGradedProvider` calls `registerProjectionsProvider(null)` on
 * a refusal - so the loser could unregister the winner's provider.
 *
 * The fix routes startup through `adoptGradedLoad`, which shares the
 * coordinator's single-flight state instead of running beside it. Startup keeps
 * its own founder gate and its own outcome logging; only the PLACE the load
 * runs changed.
 *
 * The first test below deliberately exercises the OLD arrangement alongside the
 * new one. It is a contrast case, not a spec: without it these assertions could
 * pass for a reason unrelated to the fix, and there would be nothing showing
 * the fork was ever real.
 */

const loadAndRegisterGradedProvider = vi.fn();
let registered = false;

vi.mock("@/lib/integrations/graded-pool", () => ({
  loadAndRegisterGradedProvider: (...args: unknown[]) => loadAndRegisterGradedProvider(...args),
}));
vi.mock("@/lib/integrations/providers", () => ({ isConfigured: () => true }));
vi.mock("@/lib/integrations/projections", () => ({
  isLiveProjections: () => registered,
  resolveToolPool: () => undefined,
}));
vi.mock("@/lib/observability/sentry", () => ({ initObservability: () => undefined }));

const ENV = { PROJECTIONS_PROVIDER: "graded" };
const STARTUP_ENV = { NEXT_RUNTIME: "nodejs", PROJECTIONS_PROVIDER: "graded" };

const liveResult = { status: "live", players: [{ id: "p1" }], count: 1 };
const refusedResult = { status: "source-error", players: [], count: 0 };

async function server() {
  return await import("@/lib/integrations/projections-server");
}
async function startup() {
  return await import("../instrumentation");
}

beforeEach(async () => {
  registered = false;
  loadAndRegisterGradedProvider.mockReset();
  (await server()).resetLiveProjectionsCacheForTests();
});

afterEach(() => vi.clearAllMocks());

/** The loader registers as a side effect; mirror that so isLiveProjections tracks it. */
function liveLoader() {
  return async () => {
    const r = await loadAndRegisterGradedProvider();
    registered = r.status === "live" && r.players.length > 0;
    return r;
  };
}

describe("startup and the first request share one graded-provider load", () => {
  it("loads once across startup and a subsequent request", async () => {
    const m = await server();
    const { registerProjectionsFromEnv } = await startup();
    loadAndRegisterGradedProvider.mockResolvedValue(liveResult);
    const load = liveLoader();

    const outcome = await registerProjectionsFromEnv(STARTUP_ENV, () =>
      m.adoptGradedLoad(load, 0),
    );

    expect(outcome).toBe("registered");
    expect(loadAndRegisterGradedProvider).toHaveBeenCalledTimes(1);

    // The request-time path now sees a provider registered AT A KNOWN TIME and
    // inside the trust interval, so it does nothing.
    await m.ensureLiveProjections(ENV, 1_000);
    expect(loadAndRegisterGradedProvider).toHaveBeenCalledTimes(1);
  });

  it("contrast: the uncoordinated startup call forked a second load", async () => {
    // Exactly what instrumentation.ts used to do - hand the raw loader over
    // without going through the coordinator.
    const m = await server();
    const { registerProjectionsFromEnv } = await startup();
    loadAndRegisterGradedProvider.mockResolvedValue(liveResult);

    await registerProjectionsFromEnv(STARTUP_ENV, liveLoader());
    expect(loadAndRegisterGradedProvider).toHaveBeenCalledTimes(1);

    // registeredAt is still 0, so nowMs - registeredAt is a full second past
    // the reload interval from the coordinator's point of view: it rebuilds a
    // provider that was installed a millisecond ago.
    await m.ensureLiveProjections(ENV, m.PROVIDER_RELOAD_AFTER_MS + 1);
    expect(loadAndRegisterGradedProvider).toHaveBeenCalledTimes(2);
  });

  it("shares a startup load that is still in flight with a concurrent request", async () => {
    const m = await server();
    let release: (v: typeof liveResult) => void = () => {};
    loadAndRegisterGradedProvider.mockReturnValue(
      new Promise<typeof liveResult>((resolve) => {
        release = resolve;
      }),
    );

    const started = m.adoptGradedLoad(liveLoader(), 0);
    // The request arrives mid-load. It must await the running one, never start
    // a second multi-MB fetch against the same registry.
    const requested = m.ensureLiveProjections(ENV, 10);
    release(liveResult);
    await Promise.all([started, requested]);

    expect(loadAndRegisterGradedProvider).toHaveBeenCalledTimes(1);
  });

  it("records a refused startup load so the retry cooldown applies to it", async () => {
    const m = await server();
    loadAndRegisterGradedProvider.mockResolvedValue(refusedResult);

    await m.adoptGradedLoad(liveLoader(), 0);
    expect(loadAndRegisterGradedProvider).toHaveBeenCalledTimes(1);

    // Uncoordinated, lastAttemptAt was untouched by startup and this request
    // re-fetched megabytes immediately. Now the refusal is on the record.
    await m.ensureLiveProjections(ENV, 1_000);
    expect(loadAndRegisterGradedProvider).toHaveBeenCalledTimes(1);

    // Still a retry, not a permanent give-up.
    await m.ensureLiveProjections(ENV, m.PROVIDER_RETRY_COOLDOWN_MS + 1);
    expect(loadAndRegisterGradedProvider).toHaveBeenCalledTimes(2);
  });

  it("still reports the startup outcome through the coordinator", async () => {
    // Adoption must not cost the gate its reporting: a refusal and a throw are
    // distinct outcomes and both are logged rather than silently swallowed.
    const m = await server();
    const { registerProjectionsFromEnv } = await startup();

    loadAndRegisterGradedProvider.mockResolvedValue(refusedResult);
    expect(await registerProjectionsFromEnv(STARTUP_ENV, () => m.adoptGradedLoad(liveLoader(), 0))).toBe(
      "source-error",
    );

    m.resetLiveProjectionsCacheForTests();
    loadAndRegisterGradedProvider.mockRejectedValue(new Error("network down"));
    expect(
      await registerProjectionsFromEnv(STARTUP_ENV, () => m.adoptGradedLoad(liveLoader(), 0)),
    ).toBe("load-failed");
  });

  it("wires the real startup hook through the coordinator", async () => {
    // The tests above prove the coordinator behaves; this one proves
    // instrumentation.ts actually USES it. Without it, reverting register() to
    // pass the raw loader would leave every assertion above passing.
    const m = await server();
    const { register } = await startup();
    loadAndRegisterGradedProvider.mockResolvedValue(liveResult);

    const priorRuntime = process.env.NEXT_RUNTIME;
    const priorProvider = process.env.PROJECTIONS_PROVIDER;
    process.env.NEXT_RUNTIME = "nodejs";
    process.env.PROJECTIONS_PROVIDER = "graded";
    try {
      await register();
      // register() deliberately does not await the load (it must never delay a
      // cold start), so drain the microtask queue before reading the count.
      await new Promise((resolve) => setTimeout(resolve, 0));
      registered = true;

      expect(loadAndRegisterGradedProvider).toHaveBeenCalledTimes(1);
      // The REAL clock, deliberately: register() stamps registeredAt from
      // Date.now(), so a synthetic nowMs here would read as "0 ms since a
      // registration at epoch" and pass whether or not the wiring holds. Only
      // an unwired startup leaves registeredAt at 0, which makes the true
      // current time an eternity past the reload interval.
      await m.ensureLiveProjections(ENV);
      expect(
        loadAndRegisterGradedProvider,
        "startup is not sharing the coordinator's state - the request forked its own load",
      ).toHaveBeenCalledTimes(1);
    } finally {
      if (priorRuntime === undefined) delete process.env.NEXT_RUNTIME;
      else process.env.NEXT_RUNTIME = priorRuntime;
      if (priorProvider === undefined) delete process.env.PROJECTIONS_PROVIDER;
      else process.env.PROJECTIONS_PROVIDER = priorProvider;
    }
  });

  it("keeps the founder gate: an unset provider never starts a load", async () => {
    const m = await server();
    const { registerProjectionsFromEnv } = await startup();

    expect(
      await registerProjectionsFromEnv({ NEXT_RUNTIME: "nodejs" }, () =>
        m.adoptGradedLoad(liveLoader(), 0),
      ),
    ).toBe("skipped-unset");
    expect(loadAndRegisterGradedProvider).not.toHaveBeenCalled();
  });
});
