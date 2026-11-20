/**
 * gcp-ml-clients.ts — Pre-Built Google Cloud ML REST Clients (Path 36 Course 3).
 *
 * Covers:
 * - Cloud Natural Language API (`language.googleapis.com`): injury/beat sentiment + entities
 * - Cloud Video Intelligence API (`videointelligence.googleapis.com`): film clip annotation
 * - Cloud Speech-to-Text API (`speech.googleapis.com`): airwave transcription fallback
 *
 * Notice: NEVER accesses LLM chat vendor URLs directly from data-ingestion packages.
 */

export interface GcpNlAnalysisResult {
  readonly sentimentScore: number;
  readonly sentimentMagnitude: number;
  readonly entities: ReadonlyArray<{ readonly name: string; readonly type: string; readonly salience: number }>;
}

export async function analyzeBeatTextWithCloudNl(
  text: string,
  options: { readonly accessToken?: string; readonly env?: Record<string, string | undefined>; readonly fetchImpl?: typeof fetch } = {},
): Promise<GcpNlAnalysisResult> {
  const env = options.env ?? process.env;
  const token = (options.accessToken ?? env["GCP_ML_ACCESS_TOKEN"] ?? "").trim();
  if (!token) {
    throw new Error("GCP_ML_ACCESS_TOKEN is required for Cloud Natural Language API.");
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  const res = await fetchImpl("https://language.googleapis.com/v2/documents:annotateText", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      document: { type: "PLAIN_TEXT", content: text },
      features: { extractEntities: true, extractDocumentSentiment: true },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`Cloud Natural Language HTTP ${res.status}: ${(await res.text().catch(() => "")).slice(0, 180)}`);
  }
  const body = (await res.json()) as {
    documentSentiment?: { score?: number; magnitude?: number };
    entities?: Array<{ name?: string; type?: string; salience?: number }>;
  };
  return {
    sentimentScore: Number(body.documentSentiment?.score ?? 0),
    sentimentMagnitude: Number(body.documentSentiment?.magnitude ?? 0),
    entities: (body.entities ?? []).map((e) => ({
      name: String(e.name ?? ""),
      type: String(e.type ?? "OTHER"),
      salience: Number(e.salience ?? 0),
    })),
  };
}

export async function startVideoIntelligenceAnnotation(
  gcsInputUri: string,
  options: { readonly accessToken?: string; readonly env?: Record<string, string | undefined>; readonly fetchImpl?: typeof fetch } = {},
): Promise<{ readonly operationName: string }> {
  const env = options.env ?? process.env;
  const token = (options.accessToken ?? env["GCP_ML_ACCESS_TOKEN"] ?? "").trim();
  if (!token) {
    throw new Error("GCP_ML_ACCESS_TOKEN is required for Cloud Video Intelligence API.");
  }
  if (!gcsInputUri.startsWith("gs://")) {
    throw new Error("Cloud Video Intelligence requires a gs:// URI.");
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  const res = await fetchImpl("https://videointelligence.googleapis.com/v1/videos:annotate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputUri: gcsInputUri,
      features: ["LABEL_DETECTION", "SHOT_CHANGE_DETECTION"],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`Video Intelligence HTTP ${res.status}: ${(await res.text().catch(() => "")).slice(0, 180)}`);
  }
  const data = (await res.json()) as { name?: string };
  if (!data.name) throw new Error("Video Intelligence response missing operation name.");
  return { operationName: data.name };
}

export async function recognizeAudioWithCloudSpeech(
  base64Audio: string,
  options: { readonly accessToken?: string; readonly env?: Record<string, string | undefined>; readonly fetchImpl?: typeof fetch } = {},
): Promise<{ readonly transcript: string }> {
  const env = options.env ?? process.env;
  const token = (options.accessToken ?? env["GCP_ML_ACCESS_TOKEN"] ?? "").trim();
  if (!token) {
    throw new Error("GCP_ML_ACCESS_TOKEN is required for Cloud Speech-to-Text API.");
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  const res = await fetchImpl("https://speech.googleapis.com/v1/speech:recognize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      config: { languageCode: "en-US", enableAutomaticPunctuation: true },
      audio: { content: base64Audio },
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`Cloud Speech HTTP ${res.status}: ${(await res.text().catch(() => "")).slice(0, 180)}`);
  }
  const data = (await res.json()) as {
    results?: Array<{ alternatives?: Array<{ transcript?: string }> }>;
  };
  return {
    transcript: (data.results ?? []).map((r) => r.alternatives?.[0]?.transcript ?? "").join(" ").trim(),
  };
}
