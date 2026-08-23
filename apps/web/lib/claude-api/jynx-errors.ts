/**
 * Jynx error taxonomy — pure helpers for docs, tests, and operators.
 * Failover hops only on these classes; everything else aborts the chain.
 */
import { CerebrasMessagesError } from "./providers/cerebras";
import { OpenAiCompatError } from "./openai-compat";
import { BedrockConfigError, BedrockMessagesError } from "./providers/bedrock";
import { AzureFoundryConfigError, AzureFoundryMessagesError } from "./providers/azure-foundry";
import { VertexConfigError, VertexMessagesError } from "./providers/vertex";

export type JynxErrorLane =
  | "free_cerebras"
  | "free_secondary"
  | "cloud_bedrock"
  | "cloud_azure"
  | "cloud_vertex"
  | "unknown";

/** Errors free-lane will swallow and hop past. */
export function isFreeLaneHopError(error: unknown): boolean {
  return error instanceof CerebrasMessagesError || error instanceof OpenAiCompatError;
}

/** Errors multi-cloud callClaude will swallow and hop past. */
export function isCloudHopError(error: unknown): boolean {
  return (
    error instanceof BedrockMessagesError ||
    error instanceof BedrockConfigError ||
    error instanceof AzureFoundryMessagesError ||
    error instanceof AzureFoundryConfigError ||
    error instanceof VertexMessagesError ||
    error instanceof VertexConfigError
  );
}

/** Classify for logs / ops (never includes secrets). */
export function classifyJynxError(error: unknown): {
  readonly hop: boolean;
  readonly lane: JynxErrorLane;
  readonly name: string;
  readonly status: number | null;
} {
  if (error instanceof CerebrasMessagesError) {
    return { hop: true, lane: "free_cerebras", name: error.name, status: error.status };
  }
  if (error instanceof OpenAiCompatError) {
    return { hop: true, lane: "free_secondary", name: error.name, status: error.status };
  }
  if (error instanceof BedrockMessagesError || error instanceof BedrockConfigError) {
    return {
      hop: true,
      lane: "cloud_bedrock",
      name: error.name,
      status: error instanceof BedrockMessagesError ? error.status : null,
    };
  }
  if (error instanceof AzureFoundryMessagesError || error instanceof AzureFoundryConfigError) {
    return {
      hop: true,
      lane: "cloud_azure",
      name: error.name,
      status: error instanceof AzureFoundryMessagesError ? error.status : null,
    };
  }
  if (error instanceof VertexMessagesError || error instanceof VertexConfigError) {
    return {
      hop: true,
      lane: "cloud_vertex",
      name: error.name,
      status: error instanceof VertexMessagesError ? error.status : null,
    };
  }
  const name = error instanceof Error ? error.name : "unknown";
  return { hop: false, lane: "unknown", name, status: null };
}
