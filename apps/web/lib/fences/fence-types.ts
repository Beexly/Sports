export type FenceSurface = "content" | "api" | "model" | "agent" | "partner" | "source" | "infrastructure";
export type FenceSeverity = "PASS" | "WARN" | "BLOCK";

export interface FenceInput {
  readonly surface: FenceSurface;
  readonly text?: string;
  readonly payload?: unknown;
  readonly metadata: Record<string, unknown>;
}

export interface FenceResult {
  readonly ok: boolean;
  readonly severity: FenceSeverity;
  readonly fenceId: string;
  readonly reasons: readonly string[];
  readonly fixHints: readonly string[];
}

export interface FencePlugin {
  readonly id: string;
  readonly description: string;
  evaluate(input: FenceInput): Promise<FenceResult> | FenceResult;
}

/**
 * Tri-state result of reading a typed domain object out of `FenceInput.metadata`.
 *
 * The distinction between "absent" and "invalid" is load-bearing: a fence may
 * legitimately have nothing to review when the key is absent, but a key that IS
 * present and malformed must fail closed rather than be silently treated as
 * absent (which would fall through to weaker text-based heuristics).
 */
export type MetadataRead<T> =
  | { readonly kind: "absent" }
  | { readonly kind: "invalid" }
  | { readonly kind: "ok"; readonly value: T };

const ABSENT = { kind: "absent" } as const;
const INVALID = { kind: "invalid" } as const;

/**
 * Read `input.metadata[key]` through a total parser. Absent/null keys read as
 * "absent"; a present value the parser rejects reads as "invalid" so callers
 * can fail closed on it.
 */
export function readMetadata<T>(
  input: FenceInput,
  key: string,
  parse: (value: unknown) => T | null,
): MetadataRead<T> {
  const raw = input.metadata[key];
  if (raw === undefined || raw === null) return ABSENT;
  const parsed = parse(raw);
  return parsed === null ? INVALID : { kind: "ok", value: parsed };
}

export function pass(fenceId: string): FenceResult {
  return { fenceId, fixHints: [], ok: true, reasons: [], severity: "PASS" };
}

export function warn(fenceId: string, reasons: readonly string[], fixHints: readonly string[]): FenceResult {
  return { fenceId, fixHints, ok: true, reasons, severity: "WARN" };
}

export function block(fenceId: string, reasons: readonly string[], fixHints: readonly string[]): FenceResult {
  return { fenceId, fixHints, ok: false, reasons, severity: "BLOCK" };
}

export async function evaluateFences(
  plugins: readonly FencePlugin[],
  input: FenceInput,
): Promise<readonly FenceResult[]> {
  const results: FenceResult[] = [];
  for (const plugin of plugins) {
    results.push(await plugin.evaluate(input));
  }
  return results;
}

export function summarizeFenceResults(results: readonly FenceResult[]): FenceResult {
  const blocked = results.filter((result) => result.severity === "BLOCK");
  const warned = results.filter((result) => result.severity === "WARN");
  const reasons = results.flatMap((result) => result.reasons.map((reason) => `${result.fenceId}: ${reason}`));
  const fixHints = results.flatMap((result) => result.fixHints.map((hint) => `${result.fenceId}: ${hint}`));

  if (blocked.length > 0) return block("fence-summary", reasons, fixHints);
  if (warned.length > 0) return warn("fence-summary", reasons, fixHints);
  return pass("fence-summary");
}
