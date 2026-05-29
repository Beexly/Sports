import { afterEach, describe, expect, it, vi } from "vitest";
import { OddsApiClient, OddsApiError } from "../odds-api-client.js";

const client = new OddsApiClient("test-key");

afterEach(() => {
  vi.restoreAllMocks();
});

describe("OddsApiClient upstream resilience", () => {
  it("passes an abort signal to fetch so a call can never hang forever", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "x-requests-remaining": "100", "x-requests-used": "1" },
      })
    );

    await client.getSports();

    expect(spy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("wraps a request timeout as an OddsApiError(408) instead of leaking a raw AbortError", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      const err = new Error("The operation timed out.");
      err.name = "TimeoutError";
      throw err;
    });

    await expect(client.getSports()).rejects.toBeInstanceOf(OddsApiError);
    await expect(client.getSports()).rejects.toMatchObject({ status: 408 });
    await expect(client.getSports()).rejects.toThrow(/timed out/i);
  });

  it("wraps a network failure as an OddsApiError with a descriptive message", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      throw new Error("ECONNREFUSED");
    });

    await expect(client.getSports()).rejects.toBeInstanceOf(OddsApiError);
    await expect(client.getSports()).rejects.toThrow(/request failed/i);
  });
});
