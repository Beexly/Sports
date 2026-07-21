import { describe, expect, it } from "vitest";
import { fetchOpportunitySourceSnapshot, getOpportunitySource } from "@/lib/opportunity-engine";

describe("NOVA MCP Registry endpoint", () => {
  it("uses the official unauthenticated read API rather than the catalog root", async () => {
    let requestedUrl = "";
    const fetchImpl: typeof fetch = async (input) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({ servers: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const result = await fetchOpportunitySourceSnapshot(
      getOpportunitySource("mcp-official-registry")!,
      undefined,
      { fetchImpl, now: new Date("2026-07-21T12:00:00.000Z") },
    );

    expect(requestedUrl).toBe("https://registry.modelcontextprotocol.io/v0.1/servers?limit=100");
    expect(result.status).toBe("FETCHED");
    expect(result.credentialsSent).toBe(false);
  });
});
