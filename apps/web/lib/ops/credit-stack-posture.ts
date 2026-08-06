import { loadJynxPublicSnapshot, type JynxPublicSnapshot } from "@/lib/claude-api/jynx";

/**
 * Public-safe credit / free-capacity posture for ops truth.
 *
 * Never includes secret values — only booleans + selected provider name.
 * Answers: "are we positioned to burn credits instead of cash?"
 */

export type ClaudeProviderSelection =
  | "anthropic"
  | "bedrock"
  | "vertex"
  | "azure"
  | "unknown";

export interface CreditStackPosture {
  readonly freeLaneConfigured: boolean;
  readonly freeLaneSurfaces: readonly string[];
  readonly internalLlmConfigured: boolean;
  readonly claudeProvider: ClaudeProviderSelection;
  readonly bedrockConfigured: boolean;
  readonly vertexConfigured: boolean;
  readonly azureFoundryConfigured: boolean;
  readonly anyCreditLaneReady: boolean;
  readonly operatorHint: string;
  /** Unified Jynx routing snapshot (no secrets). */
  readonly jynx: JynxPublicSnapshot;
}

type Env = Record<string, string | undefined>;

function has(env: Env, key: string): boolean {
  return Boolean(env[key]?.trim());
}

export function resolveClaudeProviderSelection(env: Env = process.env): ClaudeProviderSelection {
  const raw = env["CLAUDE_PROVIDER"]?.trim().toLowerCase() ?? "";
  if (raw === "bedrock") return "bedrock";
  if (raw === "vertex") return "vertex";
  if (raw === "azure" || raw === "azure-foundry") return "azure";
  if (raw === "" || raw === "anthropic") return "anthropic";
  return "unknown";
}

export function loadCreditStackPosture(env: Env = process.env): CreditStackPosture {
  const freeLaneConfigured =
    env["CONTENT_FREE_LANE_ENABLED"] === "true" &&
    (has(env, "CEREBRAS_API_KEY") ||
      (has(env, "FREE_LANE_SECONDARY_BASE_URL") && has(env, "FREE_LANE_SECONDARY_MODEL")));
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

  const azureFoundryConfigured =
    has(env, "AZURE_FOUNDRY_API_KEY") &&
    has(env, "AZURE_FOUNDRY_MODEL_MAP") &&
    (has(env, "AZURE_FOUNDRY_RESOURCE") || has(env, "AZURE_FOUNDRY_BASE_URL"));

  const freeLaneSurfaces = ["brief", "content"] as const;

  const anyCreditLaneReady =
    freeLaneConfigured ||
    (claudeProvider === "bedrock" && bedrockConfigured) ||
    (claudeProvider === "vertex" && vertexConfigured) ||
    (claudeProvider === "azure" && azureFoundryConfigured) ||
    // Config present even if not selected — still "ready to flip"
    bedrockConfigured ||
    vertexConfigured ||
    azureFoundryConfigured ||
    internalLlmConfigured;

  let operatorHint: string;
  if (freeLaneConfigured && claudeProvider === "azure" && azureFoundryConfigured) {
    operatorHint =
      "Free-lane + Azure Foundry selected — content $0 path; Claude via Azure credits (verify SKU).";
  } else if (freeLaneConfigured && claudeProvider === "bedrock" && bedrockConfigured) {
    operatorHint =
      "Free-lane + Bedrock both ready — content $0; other Claude via AWS Activate.";
  } else if (freeLaneConfigured && claudeProvider === "vertex" && vertexConfigured) {
    operatorHint =
      "Free-lane + Vertex both ready — content $0; other Claude via Google partner credits.";
  } else if (claudeProvider === "azure" && azureFoundryConfigured) {
    operatorHint =
      "Azure Foundry selected for Claude. Enable free-lane for content $0. Confirm credit SKU covers Claude.";
  } else if (claudeProvider === "bedrock" && bedrockConfigured) {
    operatorHint =
      "Bedrock selected — Claude spend should hit AWS credits. Enable free-lane for content $0.";
  } else if (claudeProvider === "vertex" && vertexConfigured) {
    operatorHint =
      "Vertex selected — Claude spend should hit Google partner credits. Enable free-lane for content $0.";
  } else if (azureFoundryConfigured || bedrockConfigured || vertexConfigured) {
    operatorHint =
      "Cloud credit providers configured but CLAUDE_PROVIDER not selected — set bedrock|vertex|azure and redeploy.";
  } else if (freeLaneConfigured) {
    operatorHint =
      "Cerebras free-lane ready for content. Wire Bedrock/Vertex/Azure for remaining Claude off cash.";
  } else if (internalLlmConfigured) {
    operatorHint =
      "Internal LLM key present. Free-lane + cloud Claude providers still off — cash Anthropic risk.";
  } else {
    operatorHint =
      "No free/credit lane configured — see docs/ops/CLOUD_CREDIT_LAUNCH_MAP.md";
  }

  const jynx = loadJynxPublicSnapshot(env);

  return {
    freeLaneConfigured,
    freeLaneSurfaces: [...freeLaneSurfaces],
    internalLlmConfigured,
    claudeProvider,
    bedrockConfigured,
    vertexConfigured,
    azureFoundryConfigured,
    anyCreditLaneReady,
    operatorHint,
    jynx,
  };
}
