import { describe, expect, it } from "vitest";
import {
  FtnChartingSpecClient,
  FtnChartingSpecError,
  FTN_CHARTING_SPEC_SOURCE_ID,
  isFtnChartingSpecIngestEnabled,
} from "../ftn-charting-spec-client.js";

/** Real verified shape from /openapi.json (paths trimmed to two). */
const SPEC_FIXTURE = JSON.stringify({
  info: { title: "FTN Charting 1.0.0", version: "1.0.0" },
  paths: {
    "/api/participants/player_profile/bulk": {},
    "/api/participants/schedule/previous": {},
  },
});

function okFetch(body: string) {
  return (async (_url: unknown) => new Response(body, { status: 200 })) as unknown as typeof fetch;
}

function errFetch(status: number) {
  return (async (_url: unknown) => new Response("nope", { status })) as unknown as typeof fetch;
}

describe("FTN charting spec client gate", () => {
  it("is off by default and returns null without fetching", async () => {
    expect(isFtnChartingSpecIngestEnabled({})).toBe(false);
    expect(isFtnChartingSpecIngestEnabled({ FTN_CHARTING_SPEC_INGEST: "1" })).toBe(true);
    let fetched = false;
    const fetchImpl = (async (_url: unknown) => {
      fetched = true;
      return new Response(SPEC_FIXTURE, { status: 200 });
    }) as unknown as typeof fetch;
    const client = new FtnChartingSpecClient({}, fetchImpl);
    expect(await client.getOpenApiSpec()).toBeNull();
    expect(fetched).toBe(false);
  });
});

describe("FTN charting spec map", () => {
  const ENV = { FTN_CHARTING_SPEC_INGEST: "1" };

  it("maps the verified fixture to title + pathCount 2 + listed paths", async () => {
    const client = new FtnChartingSpecClient(ENV, okFetch(SPEC_FIXTURE));
    const summary = await client.getOpenApiSpec();
    expect(summary?.title).toBe("FTN Charting 1.0.0");
    expect(summary?.version).toBe("1.0.0");
    expect(summary?.pathCount).toBe(2);
    expect(summary?.paths).toEqual([
      "/api/participants/player_profile/bulk",
      "/api/participants/schedule/previous",
    ]);
  });

  it("throws FtnChartingSpecError on HTTP error", async () => {
    const client = new FtnChartingSpecClient(ENV, errFetch(500));
    await expect(client.getOpenApiSpec()).rejects.toThrow(FtnChartingSpecError);
  });

  it("carries the registered source id", () => {
    expect(FTN_CHARTING_SPEC_SOURCE_ID).toBe("ftn-charting-openapi");
  });
});
