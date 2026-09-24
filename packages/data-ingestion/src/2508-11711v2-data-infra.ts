/**
 * Enhancing GraphQL Security by Detecting Malicious Queries Using Large Language Models, Sentence Transformers, and Convolutional Neural Networks
 *
 * arXiv:2508.11711v2 · lane:data_infra · verdict:ADAPT · owner:Hermes · doctrine:INFRA
 *
 * Improvement (record): Provide a deterministic static GraphQL gate with payload caps, character allowlists, structural complexity caps, and edge-window rate limiting. Optional telemetry is descriptive only; no LLM or learned detector is on the decision path.
 *
 * ACCEPTANCE GATE:
 * ADAPT the static-gate doctrine iff the 7-day log review shows >=1 credible malicious-shape request blocked per week with zero false positives on legitimate leads; reject any LLM-in-the-security-path component unconditionally.
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Pure module: no network, database, credentials, or live route mutation. All decisions are deterministic static rules.
 */

export const ARXIV_ID = "2508.11711v2" as const;
export const LANE = "data_infra" as const;
export const VERDICT = "ADAPT" as const;
export const ENABLED = false;

export const ACCEPTANCE_GATE = `ADAPT the static-gate doctrine iff the 7-day log review shows >=1 credible malicious-shape request blocked per week with zero false positives on legitimate leads; reject any LLM-in-the-security-path component unconditionally.`;

export interface GraphQlRequest {
  readonly query: string;
  readonly variables?: string;
  readonly operationName?: string;
}

export interface GraphQlRateWindow {
  readonly startMs: number;
  readonly count: number;
}

export interface GraphQlGateDecision {
  readonly allowed: boolean;
  readonly reasons: readonly string[];
  readonly staticOnly: true;
  readonly nextRateWindow: GraphQlRateWindow;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function queryDepth(query: string): number {
  let depth = 0;
  let maximum = 0;
  for (const character of query) {
    if (character === "{") {
      depth += 1;
      maximum = Math.max(maximum, depth);
    } else if (character === "}") depth = Math.max(0, depth - 1);
  }
  return maximum;
}

export function incrementRateWindow(
  window: GraphQlRateWindow,
  nowMs: number,
  limit: number,
  windowMs: number,
): GraphQlRateWindow | null {
  if (!isFiniteNumber(window.startMs) || !isFiniteNumber(window.count) || !isFiniteNumber(nowMs) || !Number.isInteger(limit) || limit <= 0 || !isFiniteNumber(windowMs) || windowMs <= 0 || window.count < 0) return null;
  if (nowMs - window.startMs >= windowMs) return { startMs: nowMs, count: 1 };
  return { startMs: window.startMs, count: window.count + 1 };
}

export function applyGraphQlStaticGate(
  request: GraphQlRequest,
  rateWindow: GraphQlRateWindow,
  nowMs: number,
  limits: { readonly maxBytes: number; readonly maxDepth: number; readonly maxAliases: number; readonly maxFragments: number; readonly rateLimit: number; readonly rateWindowMs: number } = { maxBytes: 65536, maxDepth: 8, maxAliases: 20, maxFragments: 20, rateLimit: 60, rateWindowMs: 60000 },
): GraphQlGateDecision | null {
  if (typeof request.query !== "string") return null;
  if (![limits.maxBytes, limits.maxDepth, limits.maxAliases, limits.maxFragments, limits.rateLimit, limits.rateWindowMs].every(isFiniteNumber)) return null;
  const nextRateWindow = incrementRateWindow(rateWindow, nowMs, limits.rateLimit, limits.rateWindowMs);
  if (nextRateWindow === null) return null;
  const reasons: string[] = [];
  if (Buffer.byteLength(request.query, "utf8") > limits.maxBytes) reasons.push("payload-cap");
  if (!/^[\x20-\x7E\n\r\t]+$/.test(request.query)) reasons.push("character-allowlist");
  if (queryDepth(request.query) > limits.maxDepth) reasons.push("depth-cap");
  if ((request.query.match(/\b[A-Za-z_][A-Za-z0-9_]*\s*:/g) ?? []).length > limits.maxAliases) reasons.push("alias-cap");
  if ((request.query.match(/\.\.\.\s*[A-Za-z_][A-Za-z0-9_]*/g) ?? []).length > limits.maxFragments) reasons.push("fragment-cap");
  if (nextRateWindow.count > limits.rateLimit) reasons.push("edge-rate-limit");
  return { allowed: reasons.length === 0, reasons, staticOnly: true, nextRateWindow };
}

export function evaluateSecurityLogReview(
  daysObserved: number,
  credibleMaliciousBlocked: number,
  legitimateLeadsBlocked: number,
): { readonly passes: boolean; readonly falsePositiveGate: boolean } {
  const valid = Number.isInteger(daysObserved) && daysObserved >= 0
    && Number.isInteger(credibleMaliciousBlocked) && credibleMaliciousBlocked >= 0
    && Number.isInteger(legitimateLeadsBlocked) && legitimateLeadsBlocked >= 0;
  if (!valid) return { passes: false, falsePositiveGate: false };
  const falsePositiveGate = legitimateLeadsBlocked === 0;
  return { passes: daysObserved >= 7 && credibleMaliciousBlocked >= 1 && falsePositiveGate, falsePositiveGate };
}
