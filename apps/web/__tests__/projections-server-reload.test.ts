import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * C-229. Two RED findings from review, both direct consequences of earlier
 * changes in this PR.
 *
 * 1. The cached load attempt was cleared only when the promise REJECTED. Once
 *    a refused basis started returning `source-error` as a normal value
 *    instead of throwing, the promise fulfilled with nothing registered — the
 *    cache stuck and the instance never retried, so paid tools ran on the
 *    illustrative pool for the whole life of the process.
 * 2. Registration is a process-wide singleton and the basis decision is
 *    WEEK-DEPENDENT, so a provider registered inside the grace window kept
 *    serving after that basis became inadmissible. "Already registered" says
 *    nothing about "still admissible".
 *
 * The graded-pool module is mocked so these exercise the CACHE POLICY, which
 * is the thing that was wrong, without a multi-MB network load.
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

const ENV = { PROJECTIONS_PROVIDER: "graded" };

const liveResult = { status: "live", players: [{ id: "p1" }], count: 1 };
const refusedResult = { status: "source-error", players: [], count: 0 };

async function loader() {
  return await import("@/lib/integrations/projections-server");
}

beforeEach(async () => {
  registered = false;
  loadAndRegisterGradedProvider.mockReset();
  const m = await loader();
  m.resetLiveProjectionsCacheForTests();
});

afterEach(() => vi.clearAllMocks());

describe("a refused load does not poison the cache forever", () => {
  it("retries after the cooldown instead of caching a fulfilled non-registration", async () => {
    const m = await loader();
    loadAndRegisterGradedProvider.mockResolvedValue(refusedResult);

    await m.ensureLiveProjections(ENV, 0);
    expect(loadAndRegisterGradedProvider).toHaveBeenCalledTimes(1);

    // Immediately after: suppressed by the cooldown, so a refusal cannot
    // re-fetch megabytes on every request.
    await m.ensureLiveProjections(ENV, 1_000);
    expect(loadAndRegisterGradedProvider).toHaveBeenCalledTimes(1);

    // Past the cooldown: it tries again. Under the old code this never
    // happened — the fulfilled promise was cached for the process lifetime.
    loadAndRegisterGradedProvider.mockImplementation(async () => {
      registered = true;
      return liveResult;
    });
    await m.ensureLiveProjections(ENV, m.PROVIDER_RETRY_COOLDOWN_MS + 1);
    expect(loadAndRegisterGradedProvider).toHaveBeenCalledTimes(2);
  });

  it("does not retry a SUCCESSFUL registration on every request", async () => {
    const m = await loader();
    loadAndRegisterGradedProvider.mockImplementation(async () => {
      registered = true;
      return liveResult;
    });
    await m.ensureLiveProjections(ENV, 0);
    await m.ensureLiveProjections(ENV, 5_000);
    await m.ensureLiveProjections(ENV, 60_000);
    expect(loadAndRegisterGradedProvider).toHaveBeenCalledTimes(1);
  });
});

describe("a registered provider does not outlive its basis", () => {
  it("rebuilds once the trust interval passes", async () => {
    const m = await loader();
    loadAndRegisterGradedProvider.mockImplementation(async () => {
      registered = true;
      return liveResult;
    });

    await m.ensureLiveProjections(ENV, 0);
    expect(loadAndRegisterGradedProvider).toHaveBeenCalledTimes(1);

    // Inside the interval: trusted, no reload.
    await m.ensureLiveProjections(ENV, m.PROVIDER_RELOAD_AFTER_MS - 1);
    expect(loadAndRegisterGradedProvider).toHaveBeenCalledTimes(1);

    // Past it: rebuilt against the current target week. Under the old code
    // `isLiveProjections` short-circuited forever, so a provider registered in
    // the grace window kept serving after the window closed.
    await m.ensureLiveProjections(ENV, m.PROVIDER_RELOAD_AFTER_MS + 1);
    expect(loadAndRegisterGradedProvider).toHaveBeenCalledTimes(2);
  });

  it("keeps the interval well inside a week so a rollover cannot be missed", () => {
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    // The property that matters: whatever the interval is, it must be far
    // shorter than the week boundary it exists to catch.
    return import("@/lib/integrations/projections-server").then((m) => {
      expect(m.PROVIDER_RELOAD_AFTER_MS).toBeLessThan(WEEK_MS / 24);
      expect(m.PROVIDER_RETRY_COOLDOWN_MS).toBeLessThan(m.PROVIDER_RELOAD_AFTER_MS);
    });
  });
});

/**
 * C-230, found in review of C-229 above. The stale path cleared the cached
 * promise so the NEXT call would rebuild. Under concurrent traffic every
 * request takes that path at once — the old provider is still registered and
 * `registeredAt` does not move until a load succeeds — so each request cleared
 * the in-flight promise and forked its own multi-MB load. That defeats the
 * de-duplication the module is built around, and it lets a losing reload's
 * `registerProjectionsProvider(null)` land on top of the provider a winning
 * reload just installed.
 */
describe("a stale refresh is single-flight", () => {
  /** A load the test controls, so several callers are genuinely in flight at once. */
  function deferred() {
    let settle: (v: unknown) => void = () => {};
    const promise = new Promise((res) => {
      settle = res;
    });
    return { promise, settle };
  }

  it("shares ONE reload across concurrent requests on a stale provider", async () => {
    const m = await loader();
    loadAndRegisterGradedProvider.mockImplementation(async () => {
      registered = true;
      return liveResult;
    });
    await m.ensureLiveProjections(ENV, 0);
    expect(loadAndRegisterGradedProvider).toHaveBeenCalledTimes(1);

    // The provider is registered but past its trust interval. Hold the reload
    // open so all five callers overlap.
    const gate = deferred();
    loadAndRegisterGradedProvider.mockImplementation(async () => {
      await gate.promise;
      registered = true;
      return liveResult;
    });
    const stale = m.PROVIDER_RELOAD_AFTER_MS + 1;
    const inFlight = [
      m.ensureLiveProjections(ENV, stale),
      m.ensureLiveProjections(ENV, stale),
      m.ensureLiveProjections(ENV, stale),
      m.ensureLiveProjections(ENV, stale),
      m.ensureLiveProjections(ENV, stale),
    ];
    gate.settle(undefined);
    await Promise.all(inFlight);
    // 2 = the initial registration plus ONE shared reload. Before the fix this
    // read 6 — a reload per concurrent request, each pulling the same several
    // megabytes, because every one of them cleared the in-flight promise.
    expect(loadAndRegisterGradedProvider).toHaveBeenCalledTimes(2);
  });

  it("leaves the provider registered when a refusal races a successful reload", async () => {
    const m = await loader();
    loadAndRegisterGradedProvider.mockImplementation(async () => {
      registered = true;
      return liveResult;
    });
    await m.ensureLiveProjections(ENV, 0);

    // One reload succeeds; a second concurrent caller must NOT start its own
    // load that could refuse and unregister what the first just installed.
    const gate = deferred();
    let call = 0;
    loadAndRegisterGradedProvider.mockImplementation(async () => {
      call += 1;
      await gate.promise;
      if (call === 1) {
        registered = true;
        return liveResult;
      }
      registered = false; // a refusal unregisters, by design (C-229 reason 2)
      return refusedResult;
    });
    const stale = m.PROVIDER_RELOAD_AFTER_MS + 1;
    const both = [m.ensureLiveProjections(ENV, stale), m.ensureLiveProjections(ENV, stale)];
    gate.settle(undefined);
    await Promise.all(both);

    expect(call).toBe(1);
    expect(registered).toBe(true);
  });
});

/**
 * C-232, raised by Devin as RED and found independently while chasing its
 * resolution note on C-230. instrumentation.ts is a SECOND registration entry
 * point: it fires an unawaited loadAndRegisterGradedProvider at startup that
 * goes straight to graded-pool, so it sets none of loadInFlight, registeredAt
 * or lastAttemptAt. The provider can therefore be unregistered behind this
 * module's back — that startup load calls registerProjectionsProvider(null) on
 * a refusal — while registeredAt stays set from a lazy load that succeeded.
 *
 * Only the PERMANENT consequence is fixed here. The remaining two (a forked
 * load on every cold start, and a startup-registered provider treated as stale
 * on arrival) are wasteful rather than wrong, and retiring them means making
 * one coordinator own registration, which changes app-wide startup behaviour —
 * founder-scoped, ledger C-232.
 */
describe("an unregistration behind our back does not become permanent", () => {
  it("reloads when the provider is gone but a settled promise is still cached", async () => {
    const m = await loader();
    loadAndRegisterGradedProvider.mockImplementation(async () => {
      registered = true;
      return liveResult;
    });
    await m.ensureLiveProjections(ENV, 1_000);
    expect(loadAndRegisterGradedProvider).toHaveBeenCalledTimes(1);

    // The startup entry point unregisters, without touching anything in this
    // module: registeredAt stays 1_000 and the fulfilled promise stays cached.
    registered = false;

    // Past the cooldown, this must try again. Before the fix it returned the
    // settled promise forever — live false, nothing in flight, and a non-null
    // promise fell through every branch — so paid tools stayed on the
    // illustrative pool for the life of the instance.
    await m.ensureLiveProjections(ENV, 1_000 + m.PROVIDER_RETRY_COOLDOWN_MS + 1);
    expect(loadAndRegisterGradedProvider).toHaveBeenCalledTimes(2);
  });

  it("still respects the cooldown after an unregistration", async () => {
    // The control: closing the stuck state must not turn every request on an
    // unregistered provider into a fresh multi-MB load.
    const m = await loader();
    loadAndRegisterGradedProvider.mockImplementation(async () => {
      registered = true;
      return liveResult;
    });
    await m.ensureLiveProjections(ENV, 1_000);
    registered = false;
    await m.ensureLiveProjections(ENV, 1_500);
    expect(loadAndRegisterGradedProvider).toHaveBeenCalledTimes(1);
  });
});
