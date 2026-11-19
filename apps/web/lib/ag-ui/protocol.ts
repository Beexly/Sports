/**
 * Typed AG-UI protocol envelopes, SSE framing, and public-surface text
 * sanitization for streaming agent runs (Lineup Doctor and Cockpit telemetry).
 */

export type AgUiEventType =
  | "RUN_STARTED"
  | "TEXT_MESSAGE_START"
  | "TEXT_MESSAGE_CONTENT"
  | "TEXT_MESSAGE_END"
  | "TOOL_CALL_START"
  | "TOOL_CALL_ARGS"
  | "TOOL_CALL_END"
  | "STATE_SNAPSHOT"
  | "STATE_DELTA"
  | "RUN_FINISHED"
  | "RUN_ERROR";

export interface AgUiEventEnvelope<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly type: AgUiEventType;
  readonly threadId: string;
  readonly runId: string;
  readonly timestampIso: string;
  readonly payload: TPayload;
}

const INTERNAL_JARGON_PATTERNS: readonly RegExp[] = [
  /\b(?:Romano\s+CQR|Optimal\s+Transport|Sinkhorn(?:-Knopp)?|Cholesky)\b/gi,
  /\b(?:tau_hat|JEV|10,000\s+worlds|22,750,000\s+snap\s+evaluations)\b/gi,
  /\b10-Layer\s+Autonomous\s+Engine\b/gi,
];

/**
 * Strips internal math/pipeline terminology and normalizes whitespace before any
 * agent stream chunk reaches a customer-facing web or mobile client.
 */
export function scrubPublicAgUiText(text: string): string {
  let cleaned = text;
  for (const pattern of INTERNAL_JARGON_PATTERNS) {
    cleaned = cleaned.replace(pattern, "matchup model");
  }
  return cleaned
    .replace(/\u2014|\u2013/g, "-")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Creates a validated AG-UI event envelope with deterministic UTC timestamping.
 */
export function createAgUiEvent<TPayload extends Record<string, unknown>>(
  type: AgUiEventType,
  threadId: string,
  runId: string,
  payload: TPayload,
  now: Date = new Date(),
): AgUiEventEnvelope<TPayload> {
  if (!threadId.trim() || !runId.trim()) {
    throw new Error("AG-UI events require non-empty threadId and runId.");
  }
  return {
    type,
    threadId: threadId.trim(),
    runId: runId.trim(),
    timestampIso: now.toISOString(),
    payload,
  };
}

/**
 * Serializes an AG-UI event envelope into standard Server-Sent Events framing.
 */
export function formatAgUiSseChunk<TPayload extends Record<string, unknown>>(
  event: AgUiEventEnvelope<TPayload>,
): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export interface LineupDoctorStreamParams {
  readonly threadId: string;
  readonly runId: string;
  readonly messageId?: string;
  readonly summaryText: string;
  readonly healthyCount: number;
  readonly flaggedCount: number;
  readonly now?: Date;
}

/**
 * Builds the canonical AG-UI event sequence for a Lineup Doctor diagnostic run.
 */
export function buildLineupDoctorAgUiEvents(
  params: LineupDoctorStreamParams,
): readonly AgUiEventEnvelope[] {
  const now = params.now ?? new Date();
  const messageId = params.messageId?.trim() || `${params.runId}:msg-1`;
  const scrubbedSummary = scrubPublicAgUiText(params.summaryText);

  return [
    createAgUiEvent(
      "RUN_STARTED",
      params.threadId,
      params.runId,
      { surface: "dfs-lineup-doctor" },
      now,
    ),
    createAgUiEvent(
      "STATE_SNAPSHOT",
      params.threadId,
      params.runId,
      {
        healthyCount: params.healthyCount,
        flaggedCount: params.flaggedCount,
      },
      now,
    ),
    createAgUiEvent(
      "TEXT_MESSAGE_START",
      params.threadId,
      params.runId,
      { messageId, role: "assistant" },
      now,
    ),
    createAgUiEvent(
      "TEXT_MESSAGE_CONTENT",
      params.threadId,
      params.runId,
      { messageId, delta: scrubbedSummary },
      now,
    ),
    createAgUiEvent(
      "TEXT_MESSAGE_END",
      params.threadId,
      params.runId,
      { messageId },
      now,
    ),
    createAgUiEvent(
      "RUN_FINISHED",
      params.threadId,
      params.runId,
      { status: "ok" },
      now,
    ),
  ];
}
