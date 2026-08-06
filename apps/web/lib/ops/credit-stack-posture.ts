/**
 * Public-safe credit / free-capacity posture for ops truth.
 *
 * Never includes secret values — only booleans + selected provider name.
 * Answers: "are we positioned to burn credits instead of cash?"
 */

export type ClaudeProviderSelection = "anthropic" | "bedrock" | "vertex" | "unknown";

export interface CreditStackPosture {
  /** CONTENT_FREE_LANE_ENABLED + CEREBRAS_API_KEY both set. */
  readonly freeLaneConfigured: boolean;
  /** Free-lane allow-list includes content (blog) after wire PR. */
  readonly freeLaneSurfaces: readonly string[];
  /** INTERNAL_LLM_API_KEY present. */
  readonly internalLlmConfigured: boolean;
  /** CLAUDE_PROVIDER selection (no secrets). */
  readonly claudeProvider: ClaudeProviderSelection;
  /** Bedrock env complete enough for isBedrockProviderSelected-class check. */
  readonly bedrockConfigured: boolean;
  /** Vertex env complete enough for selection (project + region + creds). */
  readonly vertexConfigured: boolean;
  /** True when at least one non-cash lane is configured. */
  readonly anyCreditLaneReady: boolean;
  /** Operator-facing one-liner — no secrets. */
  readonly operatorHint: string;
}

type Env = Record<string, string | undefined>;

function has(env: Env, key: string): boolean {
  return Boolean(env[key]?.trim());
}

export function resolveClaudeProviderSelection(env: Env = process.env): ClaudeProviderSelection {
  const raw = env["CLAUDE_PROVIDER"]?.trim().toLowerCase() ?? "";
  if (raw === "bedrock") return "bedrock";
  if (raw === "vertex") return "vertex";
  if (raw === "" || raw === "anthropic") return "anthropic";
  return "unknown";
}

/**
 * Pure posture from env. Safe to embed on public ops JSON.
 */
export function loadCreditStackPosture(env: Env = process.env): CreditStackPosture {
  const freeLaneConfigured =
    env["CONTENT_FREE_LANE_ENABLED"] === "true" && has(env, "CEREBRAS_API_KEY");
  const internalLlmConfigured = has(env, "INTERNAL_LLM_API_KEY");
  const claudeProvider = resolveClaudeProviderSelection(env);

  const bedrockConfigured =
    has(env, "AWS_ACCESS_KEY_ID") &&
    has(env, "AWS_SECRET_ACCESS_KEY") &&
    Boolean((env["AWS_BEDROCK_REGION"] ?? env["AWS_REGION"])?.trim()) &&
    has(env, "BEDROCK_MODEL_MAP");

  const vertexConfigured =
    has(env, "GOOGLE_VERTEX_PROJECT") &&
    has(env, "GOOGLE_VERTEX_REGION") &&
    (has(env, "GOOGLE_APPLICATION_CREDENTIALS_JSON") ||
      has(env, "GOOGLE_APPLICATION_CREDENTIALS")) &&
    has(env, "VERTEX_MODEL_MAP");

  const freeLaneSurfaces = ["brief", "content"] as const;

  const anyCreditLaneReady =
    freeLaneConfigured ||
    (claudeProvider === "bedrock" && bedrockConfigured) ||
    (claudeProvider === "vertex" && vertexConfigured) ||
    internalLlmConfigured;

  let operatorHint: string;
  if (freeLaneConfigured && claudeProvider === "bedrock" && bedrockConfigured) {
    operatorHint =
      "Free-lane + Bedrock both ready — content can be $0; other Claude via Activate credits.";
  } else if (freeLaneConfigured) {
    operatorHint =
      "Cerebras free-lane ready for content/brief. Set Bedrock/Vertex to move remaining Claude off cash.";
  } else if (claudeProvider === "bedrock" && bedrockConfigured) {
    operatorHint =
      "Bedrock selected — Claude spend should hit AWS credits. Enable free-lane for content $0.";
  } else if (claudeProvider === "vertex" && vertexConfigured) {
    operatorHint =
      "Vertex selected — Claude spend should hit Google partner credits. Enable free-lane for content $0.";
  } else if (internalLlmConfigured) {
    operatorHint =
      "Internal LLM key present. Free-lane + Bedrock/Vertex still off — cash Anthropic risk on content.";
  } else {
    operatorHint =
      "No free/credit lane configured — content and Claude paths may bill Anthropic cash. See docs/ops/FUNDING_PARTNERSHIP_ALIGNMENT_MASTER.md";
  }

  return {
    freeLaneConfigured,
    freeLaneSurfaces: [...freeLaneSurfaces],
    internalLlmConfigured,
    claudeProvider,
    bedrockConfigured,
    vertexConfigured,
    anyCreditLaneReady,
    operatorHint,
  };
}
