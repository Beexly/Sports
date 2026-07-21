import { parseOpportunitySourcePayload, type ParsedOpportunitySnapshot } from "./source-adapters";
import type { OpportunityObservation, OpportunitySource } from "./types";

export type OpportunitySourceFetchStatus = "FETCHED" | "NOT_MODIFIED" | "HELD" | "FAILED";

export interface OpportunitySourceCheckpoint {
  readonly sourceId: string;
  readonly checkedAt?: string;
  readonly succeededAt?: string;
  readonly etag?: string;
  readonly lastModified?: string;
  readonly consecutiveFailures: number;
  readonly observations: readonly OpportunityObservation[];
}

export interface OpportunitySourceFetchOptions {
  readonly fetchImpl?: typeof fetch;
  readonly now?: Date;
  readonly timeoutMs?: number;
  readonly maxBytes?: number;
  readonly allowDisabled?: boolean;
}

export interface OpportunitySourceFetchResult {
  readonly sourceId: string;
  readonly status: OpportunitySourceFetchStatus;
  readonly checkedAt: string;
  readonly httpStatus: number | null;
  readonly bytesRead: number;
  readonly snapshot: ParsedOpportunitySnapshot | null;
  readonly observations: readonly OpportunityObservation[];
  readonly reason: string;
  readonly nextCheckpoint: OpportunitySourceCheckpoint;
  readonly credentialsSent: false;
  readonly rawBodyRetained: false;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;

function acceptHeader(source: OpportunitySource): string {
  if (source.transport === "rss" || source.transport === "atom") {
    return "application/atom+xml, application/rss+xml, application/xml, text/xml;q=0.9, text/plain;q=0.5";
  }
  if (source.transport === "json_api" || source.transport === "github_releases") {
    return "application/json, application/vnd.github+json;q=0.9";
  }
  return "text/html, text/plain;q=0.8";
}

function checkpointFor(
  source: OpportunitySource,
  checkedAt: string,
  prior: OpportunitySourceCheckpoint | undefined,
  args: {
    readonly success: boolean;
    readonly etag?: string | null;
    readonly lastModified?: string | null;
    readonly observations: readonly OpportunityObservation[];
  },
): OpportunitySourceCheckpoint {
  return {
    sourceId: source.id,
    checkedAt,
    ...(args.success ? { succeededAt: checkedAt } : prior?.succeededAt ? { succeededAt: prior.succeededAt } : {}),
    ...(args.etag ? { etag: args.etag } : prior?.etag ? { etag: prior.etag } : {}),
    ...(args.lastModified ? { lastModified: args.lastModified } : prior?.lastModified ? { lastModified: prior.lastModified } : {}),
    consecutiveFailures: args.success ? 0 : (prior?.consecutiveFailures ?? 0) + 1,
    observations: args.observations,
  };
}

function heldResult(
  source: OpportunitySource,
  prior: OpportunitySourceCheckpoint | undefined,
  checkedAt: string,
  reason: string,
): OpportunitySourceFetchResult {
  return {
    sourceId: source.id,
    status: "HELD",
    checkedAt,
    httpStatus: null,
    bytesRead: 0,
    snapshot: null,
    observations: prior?.observations ?? [],
    reason,
    nextCheckpoint: checkpointFor(source, checkedAt, prior, { success: true, observations: prior?.observations ?? [] }),
    credentialsSent: false,
    rawBodyRetained: false,
  };
}

function failedResult(
  source: OpportunitySource,
  prior: OpportunitySourceCheckpoint | undefined,
  checkedAt: string,
  reason: string,
  httpStatus: number | null,
  bytesRead = 0,
): OpportunitySourceFetchResult {
  return {
    sourceId: source.id,
    status: "FAILED",
    checkedAt,
    httpStatus,
    bytesRead,
    snapshot: null,
    observations: prior?.observations ?? [],
    reason,
    nextCheckpoint: checkpointFor(source, checkedAt, prior, { success: false, observations: prior?.observations ?? [] }),
    credentialsSent: false,
    rawBodyRetained: false,
  };
}

export async function fetchOpportunitySourceSnapshot(
  source: OpportunitySource,
  prior?: OpportunitySourceCheckpoint,
  options: OpportunitySourceFetchOptions = {},
): Promise<OpportunitySourceFetchResult> {
  if (prior && prior.sourceId !== source.id) {
    throw new Error(`Checkpoint source ${prior.sourceId} does not match ${source.id}.`);
  }
  const now = options.now ?? new Date();
  const checkedAt = now.toISOString();
  if (source.transport === "manual_snapshot") {
    return heldResult(source, prior, checkedAt, "Manual evidence or terms snapshot required; autonomous fetch is not authorized.");
  }
  if (!source.enabledByDefault && options.allowDisabled !== true) {
    return heldResult(source, prior, checkedAt, "Source is disabled by default and requires explicit enablement.");
  }

  let url: URL;
  try {
    url = new URL(source.url);
  } catch {
    return failedResult(source, prior, checkedAt, "Source URL is invalid.", null);
  }
  if (url.protocol !== "https:") {
    return failedResult(source, prior, checkedAt, "Only HTTPS sources are allowed.", null);
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new RangeError("timeoutMs must be positive.");
  if (!Number.isInteger(maxBytes) || maxBytes <= 0) throw new RangeError("maxBytes must be a positive integer.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers: Record<string, string> = {
    accept: acceptHeader(source),
    "user-agent": "GSE-NOVA/0.1 (allowlisted metadata monitor; no auto-install)",
  };
  if (prior?.etag) headers["if-none-match"] = prior.etag;
  if (prior?.lastModified) headers["if-modified-since"] = prior.lastModified;

  try {
    const response = await (options.fetchImpl ?? fetch)(url, {
      method: "GET",
      headers,
      signal: controller.signal,
      redirect: "error",
      cache: "no-store",
      credentials: "omit",
    });

    if (response.status === 304) {
      return {
        sourceId: source.id,
        status: "NOT_MODIFIED",
        checkedAt,
        httpStatus: 304,
        bytesRead: 0,
        snapshot: null,
        observations: prior?.observations ?? [],
        reason: "Source returned HTTP 304; prior observations remain current.",
        nextCheckpoint: checkpointFor(source, checkedAt, prior, {
          success: true,
          etag: response.headers.get("etag"),
          lastModified: response.headers.get("last-modified"),
          observations: prior?.observations ?? [],
        }),
        credentialsSent: false,
        rawBodyRetained: false,
      };
    }
    if (!response.ok) {
      return failedResult(source, prior, checkedAt, `Source returned HTTP ${response.status}.`, response.status);
    }

    if (response.url) {
      const finalUrl = new URL(response.url);
      if (finalUrl.origin !== url.origin) {
        return failedResult(source, prior, checkedAt, "Cross-origin redirects are blocked.", response.status);
      }
    }

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      return failedResult(source, prior, checkedAt, `Source exceeds ${maxBytes} byte limit.`, response.status);
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > maxBytes) {
      return failedResult(source, prior, checkedAt, `Source exceeded ${maxBytes} byte limit while reading.`, response.status, buffer.byteLength);
    }
    const body = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    let snapshot: ParsedOpportunitySnapshot;
    try {
      snapshot = parseOpportunitySourcePayload(source, body, now);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown parser error.";
      return failedResult(source, prior, checkedAt, `Source metadata could not be parsed: ${detail}`, response.status, buffer.byteLength);
    }

    return {
      sourceId: source.id,
      status: "FETCHED",
      checkedAt,
      httpStatus: response.status,
      bytesRead: buffer.byteLength,
      snapshot,
      observations: snapshot.observations,
      reason: `Captured ${snapshot.observations.length} metadata observation(s); raw body discarded.`,
      nextCheckpoint: checkpointFor(source, checkedAt, prior, {
        success: true,
        etag: response.headers.get("etag"),
        lastModified: response.headers.get("last-modified"),
        observations: snapshot.observations,
      }),
      credentialsSent: false,
      rawBodyRetained: false,
    };
  } catch (error) {
    const reason = error instanceof Error && error.name === "AbortError"
      ? `Source timed out after ${timeoutMs}ms.`
      : `Source fetch failed: ${error instanceof Error ? error.message : String(error)}.`;
    return failedResult(source, prior, checkedAt, reason, null);
  } finally {
    clearTimeout(timer);
  }
}
