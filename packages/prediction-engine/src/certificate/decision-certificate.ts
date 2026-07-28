/**
 * DecisionCertificate — GSE Refusal-Native Forecasting commercial object.
 *
 * Product thesis: sell honesty, not pick volume. FIRE and NO_BET are both
 * first-class certified outcomes. Tipster stacks sell picks; GSE sells
 * recomputable decisions — including why we refused.
 *
 * Does NOT enable LIVE_BOARD. Does NOT invent ROI. Does NOT bypass selective-gate.
 */

export type DecisionKind = "FIRE" | "NO_BET";

export type NoBetReasonCode =
  | "NO_BET_WIDTH"
  | "NO_BET_LCB"
  | "INSUFFICIENT_CALIBRATION"
  | "INSUFFICIENT_SAMPLE"
  | "STALE_ODDS"
  | "PRICE_INTEGRITY_Q"
  | "HANDICAP_MISMATCH"
  | "NOT_PLACEABLE"
  | "PROVENANCE"
  | "UNDESCRIBABLE"
  | "PROVIDER_OFFLINE"
  | "CIRCUIT_OPEN"
  | "GATE_OTHER";

export interface MultiprobInterval {
  lo: number;
  hi: number;
  method: string;
}

export interface DecisionCertificate {
  schemaVersion: "1";
  kind: DecisionKind;
  stratumKey: string;
  modelVersion: string;
  eventId: string;
  market: string;
  certifiedAt: string;
  oddsFetchedAt?: string;
  interval?: MultiprobInterval;
  priceDecimal?: number;
  noBetReasons?: NoBetReasonCode[];
  summary: string;
  stratumN?: number;
  contentHash?: string;
  verifyPath?: string;
}

const REASON_SET = new Set<string>([
  "NO_BET_WIDTH",
  "NO_BET_LCB",
  "INSUFFICIENT_CALIBRATION",
  "INSUFFICIENT_SAMPLE",
  "STALE_ODDS",
  "PRICE_INTEGRITY_Q",
  "HANDICAP_MISMATCH",
  "NOT_PLACEABLE",
  "PROVENANCE",
  "UNDESCRIBABLE",
  "PROVIDER_OFFLINE",
  "CIRCUIT_OPEN",
  "GATE_OTHER",
]);

/**
 * Interval endpoints are valid on the CLOSED unit interval [0, 1].
 *
 * This is the correct domain, not a loosened check. Venn-Abers routinely
 * returns an endpoint of exactly 0 or 1 on ordinary calibration data: where a
 * region of the isotonic fit is unanimously one label, the fitted value IS
 * that label. Verified against the real gate rather than assumed —
 * `vennAbersInterval` over a 120-row calibration set returns
 * `{lower: 0, upper: 0.0182}` at a low score and `{lower: 0.9831, upper: 1}`
 * at a high one.
 *
 * Under the previous strict `(0, 1)` test every such certificate failed its
 * own validator, so a decision the gate genuinely made could not be re-parsed
 * or re-verified — breaking the recompute path that is the entire reason
 * certificates exist. A certificate must be able to express "this outcome was
 * certain on the evidence available."
 */
function isProb(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 1;
}

export function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

export function canonicalizeForHash(cert: DecisionCertificate): string {
  const { contentHash: _drop, ...rest } = cert;
  const cleaned = omitUndefined(rest as Record<string, unknown>);
  return stableStringify(cleaned);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

export async function hashCertificate(cert: DecisionCertificate): Promise<string> {
  const payload = canonicalizeForHash(cert);
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const data = new TextEncoder().encode(payload);
    const digest = await subtle.digest("SHA-256", data);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  try {
    const { createHash } = await import("node:crypto");
    return createHash("sha256").update(payload, "utf8").digest("hex");
  } catch {
    let h = 0;
    for (let i = 0; i < payload.length; i++) h = (h * 31 + payload.charCodeAt(i)) | 0;
    return `fnv_${(h >>> 0).toString(16)}`;
  }
}

export async function withContentHash(
  cert: DecisionCertificate,
): Promise<DecisionCertificate> {
  const contentHash = await hashCertificate(cert);
  return { ...cert, contentHash };
}

export function parseDecisionCertificate(input: unknown): {
  ok: boolean;
  value?: DecisionCertificate;
  errors: string[];
} {
  const errors: string[] = [];
  if (!input || typeof input !== "object") {
    return { ok: false, errors: ["not an object"] };
  }
  const c = input as Record<string, unknown>;
  if (c.schemaVersion !== "1") errors.push("schemaVersion must be 1");
  if (c.kind !== "FIRE" && c.kind !== "NO_BET") errors.push("kind must be FIRE|NO_BET");
  for (const k of ["stratumKey", "modelVersion", "eventId", "market", "certifiedAt", "summary"] as const) {
    if (typeof c[k] !== "string" || !(c[k] as string).trim()) errors.push(`${k} required string`);
  }
  if (c.kind === "NO_BET") {
    if (!Array.isArray(c.noBetReasons) || c.noBetReasons.length === 0) {
      errors.push("NO_BET requires noBetReasons");
    } else {
      for (const r of c.noBetReasons) {
        if (!REASON_SET.has(String(r))) errors.push(`unknown reason ${r}`);
      }
    }
  }
  if (c.kind === "FIRE" && Array.isArray(c.noBetReasons) && c.noBetReasons.length > 0) {
    errors.push("FIRE cannot carry noBetReasons");
  }
  if (c.interval !== undefined) {
    const iv = c.interval as Record<string, unknown>;
    if (!isProb(iv.lo) || !isProb(iv.hi) || typeof iv.method !== "string") {
      errors.push("interval must have lo,hi in (0,1) and method string");
    } else if ((iv.lo as number) > (iv.hi as number)) {
      errors.push("interval.lo must be <= interval.hi");
    }
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: omitUndefined(c) as unknown as DecisionCertificate, errors: [] };
}

export function noBetCertificate(args: {
  stratumKey: string;
  modelVersion: string;
  eventId: string;
  market: string;
  reasons: NoBetReasonCode[];
  summary: string;
  interval?: MultiprobInterval;
  oddsFetchedAt?: string;
  stratumN?: number;
  verifyPath?: string;
}): DecisionCertificate {
  return omitUndefined({
    schemaVersion: "1" as const,
    kind: "NO_BET" as const,
    stratumKey: args.stratumKey,
    modelVersion: args.modelVersion,
    eventId: args.eventId,
    market: args.market,
    certifiedAt: new Date().toISOString(),
    oddsFetchedAt: args.oddsFetchedAt,
    interval: args.interval,
    noBetReasons: args.reasons,
    summary: args.summary,
    stratumN: args.stratumN,
    verifyPath: args.verifyPath,
  }) as DecisionCertificate;
}

export function fireCertificate(args: {
  stratumKey: string;
  modelVersion: string;
  eventId: string;
  market: string;
  summary: string;
  interval: MultiprobInterval;
  priceDecimal?: number;
  oddsFetchedAt?: string;
  stratumN?: number;
  verifyPath?: string;
}): DecisionCertificate {
  return omitUndefined({
    schemaVersion: "1" as const,
    kind: "FIRE" as const,
    stratumKey: args.stratumKey,
    modelVersion: args.modelVersion,
    eventId: args.eventId,
    market: args.market,
    certifiedAt: new Date().toISOString(),
    oddsFetchedAt: args.oddsFetchedAt,
    interval: args.interval,
    priceDecimal: args.priceDecimal,
    summary: args.summary,
    stratumN: args.stratumN,
    verifyPath: args.verifyPath,
  }) as DecisionCertificate;
}

export function mapExclusionToReasons(exclusions: readonly string[]): NoBetReasonCode[] {
  const out = new Set<NoBetReasonCode>();
  for (const raw of exclusions) {
    const s = raw.toLowerCase();
    if (s.includes("fresh odds") || s.includes("stale")) out.add("STALE_ODDS");
    else if (s.includes("handicap") || s.includes("line_moved") || s.includes("line moved"))
      out.add("HANDICAP_MISMATCH");
    else if (s.includes("placeable") || s.includes("kickoff") || s.includes("scheduled"))
      out.add("NOT_PLACEABLE");
    else if (s.includes("provenance")) out.add("PROVENANCE");
    else if (s.includes("undescribable")) out.add("UNDESCRIBABLE");
    else if (s.includes("circuit")) out.add("CIRCUIT_OPEN");
    else if (s.includes("offline") || s.includes("provider")) out.add("PROVIDER_OFFLINE");
    else if (
      s === "q" ||
      s.includes("price") ||
      s.includes("de-vig") ||
      s.includes("devig")
    )
      out.add("PRICE_INTEGRITY_Q");
    else if (s.includes("sample") || s.includes("floor") || s.includes("calibration"))
      out.add("INSUFFICIENT_SAMPLE");
    else if (s.includes("width")) out.add("NO_BET_WIDTH");
    else if (s.includes("lcb") || s.includes("lower")) out.add("NO_BET_LCB");
    else out.add("GATE_OTHER");
  }
  return [...out];
}

export function humanSummaryForReasons(reasons: readonly NoBetReasonCode[]): string {
  const labels: Record<NoBetReasonCode, string> = {
    NO_BET_WIDTH: "Probability interval too wide to fire",
    NO_BET_LCB: "Lower confidence bound does not clear the bar",
    INSUFFICIENT_CALIBRATION: "Calibration mass insufficient for this stratum",
    INSUFFICIENT_SAMPLE: "Sample floor not met for this stratum",
    STALE_ODDS: "Market quotes older than the 6-hour freshness budget",
    PRICE_INTEGRITY_Q: "De-vigged price pair missing or unusable",
    // Deliberately avoids the word this repo's trust-gate bans in public copy:
    // it is tipster vocabulary, and these labels are user-facing. The concept
    // is the immutable clvLockLine recorded when the pick was committed.
    HANDICAP_MISMATCH: "Spread handicap no longer matches the line recorded at commitment",
    NOT_PLACEABLE: "Event not in a placeable window",
    PROVENANCE: "Provenance requirements not satisfied",
    UNDESCRIBABLE: "Join/description path could not describe the candidate",
    PROVIDER_OFFLINE: "Quote provider offline or unpaid — refusing to invent prices",
    CIRCUIT_OPEN: "Payment/auth circuit open — upstream calls blocked",
    GATE_OTHER: "Selective gate refused for other integrity reasons",
  };
  if (reasons.length === 0) return "No-bet (unspecified)";
  return reasons.map((r) => labels[r] ?? r).join("; ");
}
