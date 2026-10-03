import { afterEach, describe, expect, it, vi } from "vitest";
import { SharpApiClient, isSharpApiIngestEnabled } from "../sharp-api-client.js";
import { ProphetXMarketDataClient, isProphetXMarketDataEnabled } from "../prophetx-client.js";
import {
  NovigRestClient,
  NovigPublicCsvClient,
  isNovigRestEnabled,
  isNovigPublicCsvEnabled,
} from "../novig-client.js";
import { assertIngestible, getSource, isIngestible } from "../source-registry.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("C7 registry rows", () => {
  it("gates SharpAPI / ProphetX / Novig REST as paid-required (not ingestible)", () => {
    for (const id of ["sharp-api", "prophetx", "novig"] as const) {
      expect(getSource(id)?.verdict).toBe("paid-required");
      expect(isIngestible(id)).toBe(false);
      expect(() => assertIngestible(id)).toThrow(/paid-required/);
    }
  });

  it("allows Novig public CSVs with caution and forbids unofficial Pinnacle wrappers", () => {
    expect(getSource("novig-public-csv")?.verdict).toBe("use-with-caution");
    expect(isIngestible("novig-public-csv")).toBe(true);
    expect(assertIngestible("novig-public-csv").baseUrl).toBe("https://data.novig.com");
    expect(getSource("pinnacle-unofficial")?.verdict).toBe("forbidden");
    expect(isIngestible("pinnacle-unofficial")).toBe(false);
    expect(() => assertIngestible("pinnacle-unofficial")).toThrow(/Refusing to ingest/);
  });
});

describe("default-OFF env gates", () => {
  it("SharpAPI / ProphetX / Novig REST / Novig CSV are off unless explicitly enabled", () => {
    const empty: NodeJS.ProcessEnv = {};
    expect(isSharpApiIngestEnabled(empty)).toBe(false);
    expect(isProphetXMarketDataEnabled(empty)).toBe(false);
    expect(isNovigRestEnabled(empty)).toBe(false);
    expect(isNovigPublicCsvEnabled(empty)).toBe(false);
    expect(isSharpApiIngestEnabled({ SHARP_API_INGEST: "true" })).toBe(true);
    expect(isNovigPublicCsvEnabled({ NOVIG_PUBLIC_CSV: "1" })).toBe(true);
  });
});

describe("fail-closed clients never fetch while unpaid", () => {
  it("SharpAPI returns null when off and throws paid-required when on — fetch unused", async () => {
    const fetchImpl = vi.fn();
    const off = new SharpApiClient({}, fetchImpl as unknown as typeof fetch);
    expect(await off.getOdds()).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();

    const on = new SharpApiClient(
      { SHARP_API_INGEST: "1", SHARP_API_KEY: "sk_live_test" },
      fetchImpl as unknown as typeof fetch,
    );
    await expect(on.getOdds()).rejects.toThrow(/paid-required/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("ProphetX Market Data does not fetch without a licensed verdict", async () => {
    const fetchImpl = vi.fn();
    const on = new ProphetXMarketDataClient(
      { PROPHETX_MARKET_DATA: "1", PROPHETX_API_KEY: "px_test" },
      fetchImpl as unknown as typeof fetch,
    );
    await expect(on.getMarkets()).rejects.toThrow(/paid-required/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("Novig REST does not fetch without a licensed verdict", async () => {
    const fetchImpl = vi.fn();
    const on = new NovigRestClient(
      { NOVIG_REST: "1", NOVIG_ACCESS_TOKEN: "nv_test" },
      fetchImpl as unknown as typeof fetch,
    );
    await expect(on.getMarkets()).rejects.toThrow(/paid-required/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("Novig public CSV (the legal no-key HOW)", () => {
  it("stays off by default", async () => {
    const fetchImpl = vi.fn();
    const client = new NovigPublicCsvClient({}, fetchImpl as unknown as typeof fetch);
    expect(await client.listIndex()).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("lists tape dates from index.json when the env gate is on", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ dates: ["2026-08-20"], marketDates: ["2026-08-20"] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = new NovigPublicCsvClient(
      { NOVIG_PUBLIC_CSV: "1" },
      fetchImpl as unknown as typeof fetch,
    );
    const index = await client.listIndex();
    expect(index).toEqual({ dates: ["2026-08-20"], marketDates: ["2026-08-20"] });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const url = String(fetchImpl.mock.calls[0]?.[0]);
    expect(url).toContain("data.novig.com/reporting/trade-data/index.json");
  });
});
