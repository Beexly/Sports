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
