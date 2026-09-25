/**
 * OverTheCap salaries adapter — tests.
 *
 * Coverage: fixture payload parsing, HTML extraction, env-gate fail-closed
 * (no fetch without the flag), no-store cache header on every request,
 * SalaryDataProvider contract, and error handling.
 */
import { describe, expect, it, vi } from "vitest";

import {
  createOverTheCapSalariesClient,
  extractOverTheCapPayload,
  isOverTheCapSalariesIngestEnabled,
  OverTheCapSalariesClient,
  OverTheCapSalariesError,
  OVERTHECAP_ENV_FLAG,
  parseCapHitDollars,
  parseOverTheCapTable,
  type SalaryDataProvider,
} from "./overthecap-salaries.js";

const ENABLED_ENV = { [OVERTHECAP_ENV_FLAG]: "1" } as NodeJS.ProcessEnv;

const FIXTURE_ROWS = [
  { playerName: "Patrick Mahomes", team: "KC", position: "QB", capHit: "$45,000,000" },
  { playerName: "Chris Jones", team: "KC", position: "DT", capHit: "28,000,000" },
  { playerName: "Rookie Deal", team: "KC", position: "WR", capHit: 1_200_000 },
];

const FIXTURE_HTML = `<html><body>
<script id="otc-cap-data" type="application/json">
${JSON.stringify({ season: 2026, rows: FIXTURE_ROWS })}
</script>
</body></html>`;

const TABLE_HTML = `<html><body>
<table>
  <tr><th>Player</th><th>Cap Hit</th></tr>
  <tr><td>Patrick Mahomes</td><td>$45,000,000</td></tr>
  <tr><td>Travis Kelce</td><td>$14,500,000</td></tr>
</table>
</body></html>`;

function jsonFetch(body: string, status = 200): {
  fetchImpl: typeof fetch;
  calls: Array<{ url: string; init: RequestInit | undefined }>;
} {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const fetchImpl: typeof fetch = vi.fn(
    async (url: unknown, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return new Response(body, { status, headers: { "content-type": "text/html" } });
    },
  ) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

describe("isOverTheCapSalariesIngestEnabled", () => {
  it("is off by default", () => {
    expect(isOverTheCapSalariesIngestEnabled({} as NodeJS.ProcessEnv)).toBe(false);
  });

  it("is on only with an explicit true/1/yes/on", () => {
    expect(isOverTheCapSalariesIngestEnabled(ENABLED_ENV)).toBe(true);
    expect(
      isOverTheCapSalariesIngestEnabled({ [OVERTHECAP_ENV_FLAG]: "true" } as NodeJS.ProcessEnv),
    ).toBe(true);
    expect(
      isOverTheCapSalariesIngestEnabled({ [OVERTHECAP_ENV_FLAG]: "yes" } as NodeJS.ProcessEnv),
    ).toBe(true);
    expect(
      isOverTheCapSalariesIngestEnabled({ [OVERTHECAP_ENV_FLAG]: "on" } as NodeJS.ProcessEnv),
    ).toBe(true);
    expect(
      isOverTheCapSalariesIngestEnabled({ [OVERTHECAP_ENV_FLAG]: "0" } as NodeJS.ProcessEnv),
    ).toBe(false);
    expect(
      isOverTheCapSalariesIngestEnabled({ [OVERTHECAP_ENV_FLAG]: "maybe" } as NodeJS.ProcessEnv),
    ).toBe(false);
  });
});

describe("parseCapHitDollars", () => {
  it("accepts dollars, comma strings, $-prefixed, and M-suffixed forms", () => {
    expect(parseCapHitDollars(45_000_000)).toBe(45_000_000);
    expect(parseCapHitDollars("45,000,000")).toBe(45_000_000);
    expect(parseCapHitDollars("$45,000,000")).toBe(45_000_000);
    expect(parseCapHitDollars("$45.5M")).toBeCloseTo(45_500_000, 0);
    expect(parseCapHitDollars(12.5)).toBeCloseTo(12_500_000, 0);
    expect(Number.isNaN(parseCapHitDollars("not a number"))).toBe(true);
    expect(Number.isNaN(parseCapHitDollars(""))).toBe(true);
  });
});

describe("parseOverTheCapTable", () => {
  it("parses fixture rows into typed cap hits and drops junk", () => {
    const parsed = parseOverTheCapTable({
      season: 2026,
      rows: [
        ...FIXTURE_ROWS,
        { playerName: "", capHit: 1_000_000 },
        { playerName: "No Cap", capHit: "garbage" },
      ],
    });
    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toMatchObject({
      playerName: "Patrick Mahomes",
      team: "KC",
      position: "QB",
      capHitDollars: 45_000_000,
      capHitMillions: 45,
      season: 2026,
    });
    expect(parsed[2]?.capHitMillions).toBeCloseTo(1.2, 10);
  });

  it("rejects an out-of-range season", () => {
    expect(() => parseOverTheCapTable({ season: 1800, rows: [] })).toThrow(
      OverTheCapSalariesError,
    );
  });
});

describe("extractOverTheCapPayload", () => {
  it("reads the otc-cap-data script tag", () => {
    const payload = extractOverTheCapPayload(FIXTURE_HTML, 2026);
    expect(payload).not.toBeNull();
    expect(payload?.season).toBe(2026);
    expect(payload?.rows).toHaveLength(3);
  });

  it("falls back to scanning HTML table rows", () => {
    const payload = extractOverTheCapPayload(TABLE_HTML, 2026);
    expect(payload).not.toBeNull();
    expect(payload?.rows).toHaveLength(2);
    expect(payload?.rows[0]?.playerName).toBe("Patrick Mahomes");
  });

  it("returns null when nothing parseable is present", () => {
    expect(extractOverTheCapPayload("<html><body>empty</body></html>", 2026)).toBeNull();
  });
});

describe("OverTheCapSalariesClient", () => {
  it("env-gate blocks without the flag: no fetch, empty result", async () => {
    const { fetchImpl, calls } = jsonFetch(FIXTURE_HTML);
    const client = new OverTheCapSalariesClient({ env: {} as NodeJS.ProcessEnv, fetchImpl });
    expect(client.isAvailable()).toBe(false);
    const rows = await client.fetchSeasonCapHits(2026);
    expect(rows).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it("sends cache: no-store on every upstream request", async () => {
    const { fetchImpl, calls } = jsonFetch(FIXTURE_HTML);
    const client = new OverTheCapSalariesClient({ env: ENABLED_ENV, fetchImpl });
    await client.fetchSeasonCapHits(2026);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.init?.cache).toBe("no-store");
    expect(calls[0]?.url).toContain("/cap/2026/");
  });

  it("parses the fixture through the client and resolves cap hits", async () => {
    const { fetchImpl } = jsonFetch(FIXTURE_HTML);
    const client = new OverTheCapSalariesClient({ env: ENABLED_ENV, fetchImpl });
    const rows = await client.fetchSeasonCapHits(2026);
    expect(rows).toHaveLength(3);

    const mahomes = await client.getCapHitMillions("Patrick Mahomes", 2026);
    expect(mahomes).toBeCloseTo(45, 10);

    const missing = await client.getCapHitMillions("Nobody Here", 2026);
    expect(missing).toBeNull();

    const all = await client.getAllCapHits(2026);
    expect(all.size).toBe(3);
    expect(all.get("Chris Jones")).toBeCloseTo(28, 10);
  });

  it("throws OverTheCapSalariesError with status on HTTP failure", async () => {
    const { fetchImpl } = jsonFetch("not found", 404);
    const client = new OverTheCapSalariesClient({ env: ENABLED_ENV, fetchImpl });
    const promise = client.fetchSeasonCapHits(2026);
    await expect(promise).rejects.toBeInstanceOf(OverTheCapSalariesError);
    await expect(promise).rejects.toMatchObject({ status: 404 });
  });

  it("returns empty rows when the page carries no parseable table", async () => {
    const { fetchImpl } = jsonFetch("<html><body>no data</body></html>");
    const client = new OverTheCapSalariesClient({ env: ENABLED_ENV, fetchImpl });
    const rows = await client.fetchSeasonCapHits(2026);
    expect(rows).toEqual([]);
  });
});

describe("SalaryDataProvider contract", () => {
  it("is injectable and callable through the documented interface", async () => {
    const { fetchImpl } = jsonFetch(FIXTURE_HTML);
    const provider: SalaryDataProvider = createOverTheCapSalariesClient({
      env: ENABLED_ENV,
      fetchImpl,
    });
    expect(provider.isAvailable()).toBe(true);
    const cap = await provider.getCapHitMillions("Patrick Mahomes", 2026);
    expect(cap).toBeCloseTo(45, 10);
    const all = await provider.getAllCapHits(2026);
    expect(all.size).toBeGreaterThan(0);
    const missing = await provider.getCapHitMillions("Unknown Player", 2026);
    expect(missing).toBeNull();
  });

  it("isAvailable is false when the env gate is closed", () => {
    const provider = createOverTheCapSalariesClient({ env: {} as NodeJS.ProcessEnv });
    expect(provider.isAvailable()).toBe(false);
  });
});
