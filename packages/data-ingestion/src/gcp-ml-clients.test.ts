import { describe, expect, it, vi } from "vitest";
import {
  analyzeBeatTextWithCloudNl,
  recognizeAudioWithCloudSpeech,
  startVideoIntelligenceAnnotation,
} from "./gcp-ml-clients";

describe("gcp-ml-clients", () => {
  it("parses Cloud Natural Language sentiment and entity annotations", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        documentSentiment: { score: -0.4, magnitude: 0.9 },
        entities: [{ name: "Indianapolis Colts", type: "ORGANIZATION", salience: 0.72 }],
      }),
    }));
    const out = await analyzeBeatTextWithCloudNl("Colts offensive line injury update", {
      accessToken: "gcp-tok",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(out.sentimentScore).toBe(-0.4);
    expect(out.entities[0]?.name).toBe("Indianapolis Colts");
  });

  it("requires gs:// URI for Video Intelligence and parses Speech response", async () => {
    await expect(
      startVideoIntelligenceAnnotation("https://not-gcs", { accessToken: "gcp-tok" }),
    ).rejects.toThrow(/gs:\/\//);

    const speechFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ results: [{ alternatives: [{ transcript: "Injury report verified." }] }] }),
    }));
    const speech = await recognizeAudioWithCloudSpeech("AQID", {
      accessToken: "gcp-tok",
      fetchImpl: speechFetch as unknown as typeof fetch,
    });
    expect(speech.transcript).toBe("Injury report verified.");
  });
});
