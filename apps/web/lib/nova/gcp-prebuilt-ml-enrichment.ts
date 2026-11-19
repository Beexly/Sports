/**
 * GCP Path 36 Pre-Built ML APIs for Nova Enrichment (GSP097, GSP119, GSP154).
 *
 * Strictly bounded by monthly Always-Free ceilings:
 *   - Cloud Natural Language (`documents:analyzeEntities`): <= 5,000 units/mo
 *   - Cloud Speech-to-Text (`speech:recognize`): <= 60 min/mo (cleared public pressers only)
 *   - Cloud Video Intelligence (`videos:annotate`): <= 1,000 min/mo (non-broadcast internal tags only)
 */

export const GCP_ML_FREE_TIER_LIMITS = {
  naturalLanguageMonthlyUnits: 5_000,
  speechToTextMonthlyMinutes: 60,
  videoIntelligenceMonthlyMinutes: 1_000,
} as const;

export function sanitizeGcloudApiKeyString(rawKey: string): string {
  const stripped = rawKey.trim().replace(/^keyString:\s*/i, "").trim();
  if (!stripped || /\s/.test(stripped)) {
    throw new Error("Invalid GCP API key string after keyString: normalization");
  }
  return stripped;
}

export interface NovaEntityMention {
  readonly name: string;
  readonly type: string;
  readonly salience: number;
}

export interface AnalyzeNovaEntitiesResult {
  readonly language: string;
  readonly entities: readonly NovaEntityMention[];
}

export async function analyzeNovaArticleEntities(args: {
  readonly content: string;
  readonly accessToken: string;
  readonly monthlyUnitsUsed?: number;
  readonly fetchImpl?: typeof fetch;
}): Promise<AnalyzeNovaEntitiesResult> {
  const content = args.content.trim();
  if (!content) {
    throw new Error("analyzeNovaArticleEntities: content must be non-empty");
  }
  const used = args.monthlyUnitsUsed ?? 0;
  if (used >= GCP_ML_FREE_TIER_LIMITS.naturalLanguageMonthlyUnits) {
    throw new Error("Monthly free-tier Natural Language quota reached (5,000 units/mo ceiling)");
  }
  const fetchFn = args.fetchImpl ?? fetch;
  const res = await fetchFn("https://language.googleapis.com/v1/documents:analyzeEntities", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.accessToken.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      document: { type: "PLAIN_TEXT", content },
      encodingType: "UTF8",
    }),
  });
  if (!res.ok) {
    throw new Error(`Cloud Natural Language analyzeEntities failed: HTTP ${res.status}`);
  }
  const payload = (await res.json()) as {
    readonly language?: string;
    readonly entities?: ReadonlyArray<{
      readonly name?: string;
      readonly type?: string;
      readonly salience?: number;
    }>;
  };
  const entities: NovaEntityMention[] = (payload.entities ?? []).map((e) => ({
    name: String(e.name ?? ""),
    type: String(e.type ?? "OTHER"),
    salience: Number(e.salience ?? 0),
  }));
  return {
    language: String(payload.language ?? "en"),
    entities,
  };
}

export interface TranscribePresserResult {
  readonly transcript: string;
  readonly confidence: number;
  readonly totalBilledTime: string;
}

export async function transcribePublicPresserAudio(args: {
  readonly gcsAudioUri: string;
  readonly apiKey: string;
  readonly sourceKind: "coach_presser_public" | "permitted_audio" | "siriusxm_broadcast";
  readonly sourceClearedForTranscription: boolean;
  readonly encoding?: "FLAC" | "LINEAR16";
  readonly languageCode?: string;
  readonly monthlyMinutesUsed?: number;
  readonly fetchImpl?: typeof fetch;
}): Promise<TranscribePresserResult> {
  if (!args.sourceClearedForTranscription || args.sourceKind === "siriusxm_broadcast") {
    throw new Error(
      "Audio source halted: Speech-to-Text permits cleared public pressers only (never unpermitted broadcasts)"
    );
  }
  if (!args.gcsAudioUri.startsWith("gs://")) {
    throw new Error("gcsAudioUri must be a valid gs:// URI");
  }
  const used = args.monthlyMinutesUsed ?? 0;
  if (used >= GCP_ML_FREE_TIER_LIMITS.speechToTextMonthlyMinutes) {
    throw new Error("Monthly free-tier Speech-to-Text quota reached (60 min/mo ceiling)");
  }
  const cleanKey = sanitizeGcloudApiKeyString(args.apiKey);
  const fetchFn = args.fetchImpl ?? fetch;
  const res = await fetchFn(
    `https://speech.googleapis.com/v1/speech:recognize?key=${encodeURIComponent(cleanKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config: {
          encoding: args.encoding ?? "FLAC",
          languageCode: args.languageCode ?? "en-US",
        },
        audio: { uri: args.gcsAudioUri },
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`Cloud Speech-to-Text recognize failed: HTTP ${res.status}`);
  }
  const payload = (await res.json()) as {
    readonly results?: ReadonlyArray<{
      readonly alternatives?: ReadonlyArray<{
        readonly transcript?: string;
        readonly confidence?: number;
      }>;
    }>;
    readonly totalBilledTime?: string;
  };
  const alt = payload.results?.[0]?.alternatives?.[0];
  return {
    transcript: String(alt?.transcript ?? ""),
    confidence: Number(alt?.confidence ?? 0),
    totalBilledTime: String(payload.totalBilledTime ?? "0s"),
  };
}

export async function annotatePermittedHighlightVideo(args: {
  readonly gcsVideoUri: string;
  readonly accessToken: string;
  readonly features?: readonly ("LABEL_DETECTION" | "SHOT_CHANGE_DETECTION")[];
  readonly broadcastRedistribution: boolean;
  readonly monthlyMinutesUsed?: number;
  readonly fetchImpl?: typeof fetch;
}): Promise<{ readonly operationName: string }> {
  if (args.broadcastRedistribution) {
    throw new Error(
      "Video Intelligence halted: broadcast clip storage or redistribution is forbidden"
    );
  }
  if (!args.gcsVideoUri.startsWith("gs://")) {
    throw new Error("gcsVideoUri must be a valid gs:// URI");
  }
  const used = args.monthlyMinutesUsed ?? 0;
  if (used >= GCP_ML_FREE_TIER_LIMITS.videoIntelligenceMonthlyMinutes) {
    throw new Error("Monthly free-tier Video Intelligence quota reached (1,000 min/mo ceiling)");
  }
  const fetchFn = args.fetchImpl ?? fetch;
  const res = await fetchFn("https://videointelligence.googleapis.com/v1/videos:annotate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.accessToken.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputUri: args.gcsVideoUri,
      features: args.features ?? ["LABEL_DETECTION"],
    }),
  });
  if (!res.ok) {
    throw new Error(`Video Intelligence annotate failed: HTTP ${res.status}`);
  }
  const payload = (await res.json()) as { readonly name?: string };
  if (!payload.name) {
    throw new Error("Video Intelligence response missing LRO operation name");
  }
  return { operationName: payload.name };
}

export async function pollVideoAnnotationOperation(args: {
  readonly operationName: string;
  readonly accessToken: string;
  readonly fetchImpl?: typeof fetch;
}): Promise<{ readonly done: boolean; readonly labels: readonly string[] }> {
  const opName = args.operationName.trim().replace(/^\/+/, "");
  if (!opName) {
    throw new Error("operationName is required");
  }
  const fetchFn = args.fetchImpl ?? fetch;
  const res = await fetchFn(`https://videointelligence.googleapis.com/v1/${opName}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${args.accessToken.trim()}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Video Intelligence operation poll failed: HTTP ${res.status}`);
  }
  const payload = (await res.json()) as {
    readonly done?: boolean;
    readonly response?: {
      readonly annotationResults?: ReadonlyArray<{
        readonly segmentLabelAnnotations?: ReadonlyArray<{
          readonly entity?: { readonly description?: string };
        }>;
      }>;
    };
  };
  const labels = (payload.response?.annotationResults ?? [])
    .flatMap((r) => r.segmentLabelAnnotations ?? [])
    .map((ann) => ann.entity?.description)
    .filter((d): d is string => typeof d === "string" && d.length > 0);
  return {
    done: Boolean(payload.done),
    labels,
  };
}
