import { describe, expect, it, vi } from "vitest";
import {
  buildGseMlEndpoints,
  buildTdaFeatureEndpoint,
  fetchEtkfWinProbability,
  fetchGseMlEnsembleOutcomes,
  fetchTdaPersistenceFeatures,
} from "../gse-ml-endpoints";
import { createCircuitBreaker } from "../remote-model-client";

describe("gse-ml-service FastAPI Pydantic contract client", () => {
  it("emits ONLY consensus-eligible /predict/etkf and blocks SSRF/metadata targets", () => {
    const empty = buildGseMlEndpoints({ baseUrl: "" });
    expect(empty).toHaveLength(1);
    expect(empty[0]!.name).toBe("gse-etkf");
    expect(empty[0]!.enabled).toBe(false);

    const ssrf = buildGseMlEndpoints({ baseUrl: "http://169.254.169.254" });
    expect(ssrf[0]!.enabled).toBe(false);

    const loopback = buildGseMlEndpoints({ baseUrl: "http://127.0.0.1:8000" });
    expect(loopback[0]!.enabled).toBe(false);

    const tdaEndpoint = buildTdaFeatureEndpoint({ baseUrl: "https://ml.galaxysportsedge.com" });
    expect(tdaEndpoint).toEqual({
      name: "gse-tda-features",
      url: "https://ml.galaxysportsedge.com/predict/tda",
      enabled: true,
      timeoutMs: 2500,
    });
  });

  it("sends strictly allowed EtkfRequest keys (never forbidden gameId/sport) and opens breaker cleanly", async () => {
    let seenUrl = "";
    let seenBody: Record<string, unknown> = {};

    const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      seenUrl = String(input);
      seenBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      return new Response(
        JSON.stringify({
          model: "etkf",
          available: true,
          probability: 0.614,
          home_team: "CIN",
          away_team: "PIT",
          latent_margin: 0.46,
          margin_spread: 0.38,
          observations_assimilated: 1,
          calibration: "uncalibrated",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    const outcomes = await fetchGseMlEnsembleOutcomes({
      game: { gameId: "2026_10_PIT_CIN", sport: "NFL", homeTeam: "CIN", awayTeam: "PIT" },
      observations: [{ home_team: "CIN", away_team: "BAL", margin: 3.0 }],
      nowMs: 1_760_000_000_000,
      baseUrl: "https://ml.galaxysportsedge.com/",
      fetch: mockFetch as unknown as typeof fetch,
    });

    expect(seenUrl).toBe("https://ml.galaxysportsedge.com/predict/etkf");
    expect(Object.keys(seenBody).sort()).toEqual(["away_team", "home_team", "observations", "teams"]);
    expect(seenBody).not.toHaveProperty("gameId");
    expect(seenBody).not.toHaveProperty("sport");
    expect(seenBody.teams).toEqual(["CIN", "PIT", "BAL"]);
    expect(outcomes).toEqual([{ name: "gse-etkf", probability: 0.614 }]);

    // Verify circuit breaker short-circuits after consecutive failures
    const breaker = createCircuitBreaker({ failureThreshold: 2, resetAfterMs: 30_000 });
    const failingFetch = vi.fn(async () => new Response("server down", { status: 503 }));

    await fetchEtkfWinProbability({
      request: { teams: ["CIN", "PIT"], home_team: "CIN", away_team: "PIT" },
      nowMs: 1000,
      baseUrl: "https://ml.galaxysportsedge.com",
      breaker,
      fetch: failingFetch as unknown as typeof fetch,
    });
    await fetchEtkfWinProbability({
      request: { teams: ["CIN", "PIT"], home_team: "CIN", away_team: "PIT" },
      nowMs: 2000,
      baseUrl: "https://ml.galaxysportsedge.com",
      breaker,
      fetch: failingFetch as unknown as typeof fetch,
    });
    const shortCircuited = await fetchEtkfWinProbability({
      request: { teams: ["CIN", "PIT"], home_team: "CIN", away_team: "PIT" },
      nowMs: 3000,
      baseUrl: "https://ml.galaxysportsedge.com",
      breaker,
      fetch: failingFetch as unknown as typeof fetch,
    });
    expect(shortCircuited).toMatchObject({ ok: false, reason: "circuit_open" });
    expect(failingFetch).toHaveBeenCalledTimes(2);
  });

  it("extracts TDA persistence-image features from /predict/tda and blocks private redirects", async () => {
    const tdaFetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          model: "tda",
          available: true,
          kind: "feature_extractor",
          feature_length: 4,
          frames_submitted: 1,
          frames_used: 1,
          frames_skipped: 0,
          h0_slice: [0, 2],
          h1_slice: [2, 4],
          features: [0.12, 0.34, 0.05, 0.01],
          truncation_warning: null,
          note: "ok",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });

    const tdaRes = await fetchTdaPersistenceFeatures({
      request: {
        frames: [
          [
            [0.0, 0.0],
            [0.4, 0.5],
            [0.9, 0.1],
          ],
        ],
      },
      baseUrl: "https://ml.galaxysportsedge.com",
      fetch: tdaFetch as unknown as typeof fetch,
    });
    expect(tdaRes).toEqual({
      ok: true,
      featureLength: 4,
      framesUsed: 1,
      framesSkipped: 0,
      h0Slice: [0, 2],
      h1Slice: [2, 4],
      features: [0.12, 0.34, 0.05, 0.01],
      truncationWarning: null,
    });

    const ssrfRedirectFetch = vi.fn(
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: "http://169.254.169.254/latest/meta-data" },
        }),
    );
    const blocked = await fetchTdaPersistenceFeatures({
      request: { frames: [[[0.0, 0.0], [1.0, 1.0]]] },
      baseUrl: "https://ml.galaxysportsedge.com",
      fetch: ssrfRedirectFetch as unknown as typeof fetch,
    });
    expect(blocked).toMatchObject({ ok: false, reason: "blocked_redirect" });
  });
});
