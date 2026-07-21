import { describe, expect, it, vi } from "vitest";
import { fetchOpportunitySourceSnapshot, getOpportunitySource } from "@/lib/opportunity-engine";

const NOW = new Date("2026-07-21T12:00:00.000Z");

describe("NOVA allowlisted source fetcher", () => {
  it("does not fetch manual terms and credit pages", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const result = await fetchOpportunitySourceSnapshot(getOpportunitySource("aws-activate")!, undefined, { fetchImpl, now: NOW });
    expect(result.status).toBe("HELD");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fetches only metadata without credentials and discards the raw body", async () => {
    let initSeen: RequestInit | undefined;
    const fetchImpl: typeof fetch = async (_input, init) => {
      initSeen = init;
      return new Response(JSON.stringify([{ id: 1, tag_name: "v1", name: "Release v1", html_url: "https://github.com/openai/codex/releases/tag/v1", published_at: "2026-07-20T00:00:00Z", draft: false }]), {
        status: 200,
        headers: { "content-type": "application/json", etag: "abc" },
      });
    };
    const result = await fetchOpportunitySourceSnapshot(getOpportunitySource("openai-codex-releases")!, undefined, { fetchImpl, now: NOW });
    expect(result.status).toBe("FETCHED");
    expect(result.observations).toHaveLength(1);
    expect(result.rawBodyRetained).toBe(false);
    expect(result.credentialsSent).toBe(false);
    expect(initSeen?.credentials).toBe("omit");
    expect(initSeen?.redirect).toBe("error");
  });

  it("reuses prior observations after a 304 response", async () => {
    const source = getOpportunitySource("openai-codex-releases")!;
    const prior = {
      sourceId: source.id,
      checkedAt: "2026-07-20T00:00:00Z",
      succeededAt: "2026-07-20T00:00:00Z",
      etag: "abc",
      consecutiveFailures: 0,
      observations: [{ sourceId: source.id, externalId: "1", title: "Prior", url: "https://example.com", publishedAt: "2026-07-20T00:00:00Z", observedAt: "2026-07-20T00:00:00Z", contentFingerprint: "old", labels: [] }],
    };
    const fetchImpl: typeof fetch = async () => new Response(null, { status: 304 });
    const result = await fetchOpportunitySourceSnapshot(source, prior, { fetchImpl, now: NOW });
    expect(result.status).toBe("NOT_MODIFIED");
    expect(result.observations).toEqual(prior.observations);
    expect(result.nextCheckpoint.consecutiveFailures).toBe(0);
  });

  it("blocks oversized responses before parsing", async () => {
    const fetchImpl: typeof fetch = async () => new Response("1234567890", { status: 200, headers: { "content-length": "10" } });
    const result = await fetchOpportunitySourceSnapshot(getOpportunitySource("openai-codex-releases")!, undefined, { fetchImpl, now: NOW, maxBytes: 5 });
    expect(result.status).toBe("FAILED");
    expect(result.reason).toMatch(/byte limit/i);
  });

  it("increments failure state without deleting prior observations", async () => {
    const source = getOpportunitySource("openai-codex-releases")!;
    const prior = { sourceId: source.id, consecutiveFailures: 2, observations: [] };
    const fetchImpl: typeof fetch = async () => new Response("down", { status: 503 });
    const result = await fetchOpportunitySourceSnapshot(source, prior, { fetchImpl, now: NOW });
    expect(result.status).toBe("FAILED");
    expect(result.nextCheckpoint.consecutiveFailures).toBe(3);
    expect(result.observations).toEqual([]);
  });
});
