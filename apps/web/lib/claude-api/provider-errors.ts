/**
 * Provider error taxonomy — transport-free.
 *
 * WHY THIS MODULE EXISTS (structural, not cosmetic):
 *   These classes used to be defined inside `claude-api/providers/*`, alongside
 *   the raw per-provider transport calls. That forced any consumer needing an
 *   `instanceof` check — failover classification, ops logging, tests — to import
 *   from a provider module, which the AI transport import-boundary guardrail
 *   (`scripts/guardrails/ai-transport-import-boundary.mjs`) forbids outside its
 *   adapter allowlist.
 *
 *   The guardrail is right to forbid it: importing from a provider module is
 *   indistinguishable, structurally, from importing the raw caller next to it.
 *   The fix is therefore NOT to widen the allowlist — that would trade a precise
 *   boundary for a blanket exemption. The fix is to stop co-locating inert
 *   surface with dangerous surface, so error classification no longer requires
 *   touching the transport layer at all.
 *
 *   The guardrail already applies exactly this reasoning to the transport module
 *   itself: named imports from `claude-api/messages.ts` are flagged only when
 *   they name `callClaudeMessages`, "so ClaudeMessagesError stays importable".
 *   This module extends the same separation to the provider clients.
 *
 * INVARIANT: nothing here may import from `claude-api/providers/*`, from
 * `claude-api/messages`, or from any vendor SDK. These are plain Error
 * subclasses carrying diagnostic fields — no network, no credentials, no config.
 * Keep it that way; the moment this module imports transport, every consumer of
 * it silently gains transport reach and the split stops meaning anything.
 *
 * Each class keeps its original `name` string so existing log assertions,
 * ops dashboards, and serialized records are unaffected by the move.
 */

/** Diagnostic fields shared by every per-provider "the call failed" error. */
export interface ProviderMessagesErrorArgs {
  readonly status: number;
  readonly durationMs: number;
  readonly modelName: string;
}

/* ── Cerebras (free lane) ─────────────────────────────────────────────── */

export class CerebrasMessagesError extends Error {
  readonly status: number;
  readonly durationMs: number;
  readonly modelName: string;

  constructor(message: string, args: ProviderMessagesErrorArgs) {
    super(message);
    this.name = "CerebrasMessagesError";
    this.status = args.status;
    this.durationMs = args.durationMs;
    this.modelName = args.modelName;
  }
}

/* ── AWS Bedrock ──────────────────────────────────────────────────────── */

export class BedrockConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BedrockConfigError";
  }
}

export class BedrockMessagesError extends Error {
  readonly status: number;
  readonly durationMs: number;
  readonly modelName: string;

  constructor(message: string, args: ProviderMessagesErrorArgs) {
    super(message);
    this.name = "BedrockMessagesError";
    this.status = args.status;
    this.durationMs = args.durationMs;
    this.modelName = args.modelName;
  }
}

/* ── Azure AI Foundry ─────────────────────────────────────────────────── */

export class AzureFoundryConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AzureFoundryConfigError";
  }
}

export class AzureFoundryMessagesError extends Error {
  readonly status: number;
  readonly durationMs: number;
  readonly modelName: string;

  constructor(message: string, args: ProviderMessagesErrorArgs) {
    super(message);
    this.name = "AzureFoundryMessagesError";
    this.status = args.status;
    this.durationMs = args.durationMs;
    this.modelName = args.modelName;
  }
}

/* ── Google Vertex ────────────────────────────────────────────────────── */

export class VertexConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VertexConfigError";
  }
}

export class VertexMessagesError extends Error {
  readonly status: number;
  readonly durationMs: number;
  readonly modelName: string;

  constructor(message: string, args: ProviderMessagesErrorArgs) {
    super(message);
    this.name = "VertexMessagesError";
    this.status = args.status;
    this.durationMs = args.durationMs;
    this.modelName = args.modelName;
  }
}
