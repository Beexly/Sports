import {
  loadJynxPublicSnapshot,
  parseProviderMode,
  type JynxCloud,
  type JynxProviderMode,
  type JynxPublicSnapshot,
} from "@/lib/claude-api/jynx";

/**
 * Public-safe credit / free-capacity posture for ops truth.
 *
 * Never includes secret values — only booleans + selected provider name.
 * Answers: "are we positioned to burn credits instead of cash?"
 */

/**
 * Provider selection as reported on the public ops surface.
 *
 * Deliberately an alias of Jynx's `JynxProviderMode` rather than a parallel
 * union: this module previously kept its own copy that predated `auto`, so
 * `CLAUDE_PROVIDER=auto` — the value founder-next-steps tells operators to set —
 * surfaced as "unknown" and the hint claimed no provider was selected.
 * One parser, one vocabulary, no drift.
 */
export type ClaudeProviderSelection = JynxProviderMode;

/** Operator-facing provider names (hints read as prose, not env keys). */
const CLOUD_LABEL: Readonly<Record<JynxCloud, string>> = {
  bedrock: "AWS Bedrock",
  azure: "Azure Foundry",
  vertex: "Google Vertex",
};

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

/**
 * Resolve the reported provider selection.
 *
 * Delegates to Jynx so `auto` (and `JYNX_MODE=auto`) resolve identically here
 * and in the router that actually dispatches the request.
 */
export function resolveClaudeProviderSelection(env: Env = process.env): ClaudeProviderSelection {
  return parseProviderMode(env);
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

  const jynx = loadJynxPublicSnapshot(env);

  /**
   * `attemptOrder` is what Jynx will actually try before falling back to cash —
   * it already accounts for mode, failover, and per-cloud completeness. Deriving
   * the hint from it (rather than re-deducing from raw env) is what keeps this
   * surface honest: if it says "credits", the router agrees.
   */
  const creditCloudsReady = jynx.attemptOrder.length > 0;
  const creditPath = jynx.attemptOrder
    .map((cloud) => CLOUD_LABEL[cloud as JynxCloud] ?? cloud)
    .join(" → ");
  const anyCloudConfigured = bedrockConfigured || vertexConfigured || azureFoundryConfigured;

  const anyCreditLaneReady =
    freeLaneConfigured ||
    creditCloudsReady ||
    // Config present even if not selected — still "ready to flip"
    anyCloudConfigured ||
    internalLlmConfigured;

  let operatorHint: string;
  if (freeLaneConfigured && creditCloudsReady) {
    operatorHint = `Free-lane + Claude credits via ${creditPath} — content $0, Claude on credits, cash Anthropic last.`;
  } else if (creditCloudsReady) {
    operatorHint = `Claude credits via ${creditPath} (mode=${claudeProvider}). Enable free-lane for content $0.`;
  } else if (anyCloudConfigured) {
    operatorHint =
      "Cloud credit providers configured but CLAUDE_PROVIDER not selected — set auto|bedrock|vertex|azure and redeploy.";
  } else if (freeLaneConfigured && claudeProvider === "auto") {
    operatorHint =
      "Free-lane ready for content $0, but auto mode has no cloud fully configured — paste Bedrock/Azure/Vertex creds + model maps.";
  } else if (freeLaneConfigured) {
    operatorHint =
      "Free-lane ready for content $0. Wire Bedrock/Vertex/Azure for remaining Claude off cash.";
  } else if (claudeProvider === "auto") {
    operatorHint =
      "Auto mode on but no cloud fully configured — Claude still on Anthropic cash. Paste Bedrock/Azure/Vertex creds + model maps.";
  } else if (internalLlmConfigured) {
    operatorHint =
      "Internal LLM key present. Free-lane + cloud Claude providers still off — cash Anthropic risk.";
  } else {
    operatorHint =
      "No free/credit lane configured — see docs/ops/CLOUD_CREDIT_LAUNCH_MAP.md";
  }

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
