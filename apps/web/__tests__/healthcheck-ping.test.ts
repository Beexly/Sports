import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pingHealthcheck } from "@/lib/data-reliability/healthcheck-ping";

/**
 * Tests for the dead-man's-switch ping helper. The two invariants that make
 * it safe to wire into a live job:
 *   - it is a COMPLETE no-op when no URL is provided (never touches fetch)
 *   - it NEVER throws, even when the network call rejects
 * Plus the URL/suffix protocol it speaks.
 */

const PING = "https://hc.example.com/abc-123";

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("pingHealthcheck", () => {
  it("is a no-op when the url is undefined (fetch never called)", async () => {
    await pingHealthcheck(undefined, "success");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is a no-op when the url is an empty string", async () => {
    await pingHealthcheck("", "fail");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("GETs the base url for success (no suffix)", async () => {
    await pingHealthcheck(PING, "success");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(PING, expect.objectContaining({ method: "GET" }));
  });

  it("defaults to success when no signal is given", async () => {
    await pingHealthcheck(PING);
    expect(fetchMock).toHaveBeenCalledWith(PING, expect.objectContaining({ method: "GET" }));
  });

  it("appends /start for the start signal", async () => {
    await pingHealthcheck(PING, "start");
    expect(fetchMock).toHaveBeenCalledWith(`${PING}/start`, expect.objectContaining({ method: "GET" }));
  });

  it("appends /fail for the fail signal", async () => {
    await pingHealthcheck(PING, "fail");
    expect(fetchMock).toHaveBeenCalledWith(`${PING}/fail`, expect.objectContaining({ method: "GET" }));
  });

  it("never throws when fetch rejects (errors are swallowed)", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    await expect(pingHealthcheck(PING, "success")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
