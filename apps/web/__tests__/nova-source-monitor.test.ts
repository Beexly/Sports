import { describe, expect, it } from "vitest";
import { getOpportunitySource, runNovaSourceMonitor } from "@/lib/opportunity-engine";

const NOW = new Date("2026-07-21T12:00:00.000Z");

describe("NOVA source monitor cycle", () => {
  it("schedules, fetches, fingerprints, and detects changes without credentials or raw retention", async () => {
    const source = getOpportunitySource("openai-codex-releases")!;
    const fetchImpl: typeof fetch = async () => new Response(JSON.stringify([
      { id: 42, tag_name: "v42", name: "Codex v42", html_url: "https://github.com/openai/codex/releases/tag/v42", published_at: "2026-07-21T10:00:00Z", draft: false },
    ]), { status: 200, headers: { "content-type": "application/json" } });
    const result = await runNovaSourceMonitor({
      sources: [source],
      checkpoints: [],
      now: NOW,
      schedulePolicy: { maxSourcesPerCycle: 1, includeDisabled: false },
      fetchOptions: { fetchImpl },
    });
    expect(result.summary.sourcesDue).toBe(1);
    expect(result.summary.fetched).toBe(1);
    expect(result.summary.observations).toBe(1);
    expect(result.summary.materialChanges).toBe(1);
    expect(result.summary.credentialsSent).toBe(0);
    expect(result.summary.rawBodiesRetained).toBe(0);
  });

  it("preserves prior evidence when a due source fails", async () => {
    const source = getOpportunitySource("openai-codex-releases")!;
    const priorObservation = { sourceId: source.id, externalId: "1", title: "Prior", url: "https://example.com/prior", publishedAt: "2026-07-19T00:00:00Z", observedAt: "2026-07-19T00:00:00Z", contentFingerprint: "prior", labels: [] };
    const fetchImpl: typeof fetch = async () => new Response("down", { status: 503 });
    const result = await runNovaSourceMonitor({
      sources: [source],
      checkpoints: [{ sourceId: source.id, checkedAt: "2026-07-20T00:00:00Z", succeededAt: "2026-07-20T00:00:00Z", consecutiveFailures: 0, observations: [priorObservation] }],
      now: NOW,
      schedulePolicy: { maxSourcesPerCycle: 1, includeDisabled: false },
      fetchOptions: { fetchImpl },
    });
    expect(result.summary.failed).toBe(1);
    expect(result.currentObservations).toEqual([priorObservation]);
    expect(result.checkpoints[0]?.consecutiveFailures).toBe(1);
  });

  it("never schedules manual program pages into the autonomous fetch cycle", async () => {
    const source = getOpportunitySource("aws-activate")!;
    const result = await runNovaSourceMonitor({
      sources: [source],
      checkpoints: [],
      now: NOW,
      schedulePolicy: { maxSourcesPerCycle: 1, includeDisabled: false },
    });
    expect(result.summary.sourcesDue).toBe(0);
    expect(result.fetchResults).toEqual([]);
  });
});
