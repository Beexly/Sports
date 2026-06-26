/**
 * Branded identity system for the Data Genesis Engine.
 *
 * Every synthetic artifact carries a namespaced, template-literal-typed id (`signal:…`, `receipt:…`,
 * `doubt:…`, `meta:…`, `curve:…`, `calibration:…`, `promotion:…`). The branding is structural: a
 * `SignalId` is a string the compiler knows is namespaced, so a raw string can never be passed where a
 * proof-bearing id is required without going through a constructor. Validators reject empty suffixes;
 * constructors prefix when needed and refuse empty input. Pure, deterministic, dependency-free.
 */

export type SignalId = `signal:${string}`;
export type ReceiptId = `receipt:${string}`;
export type DoubtId = `doubt:${string}`;
export type MetaDoubtId = `meta:${string}`;
export type CurveId = `curve:${string}`;
export type CalibrationTag = `calibration:${string}`;
export type PromotionId = `promotion:${string}`;

/** True when `value` is `${prefix}:<non-empty>` (after trimming the suffix). */
function hasNamespace(value: string, prefix: string): boolean {
  const head = `${prefix}:`;
  if (!value.startsWith(head)) return false;
  return value.slice(head.length).trim().length > 0;
}

/**
 * Build a namespaced id. If `raw` already carries the namespace it is kept (and its suffix validated);
 * otherwise the namespace is prepended. Empty / whitespace-only input — or an empty suffix — throws.
 */
function construct(raw: string, prefix: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new Error(`data-genesis: cannot build a "${prefix}" id from an empty value`);
  }
  const head = `${prefix}:`;
  if (trimmed.startsWith(head)) {
    if (trimmed.slice(head.length).trim().length === 0) {
      throw new Error(`data-genesis: "${prefix}" id has an empty suffix`);
    }
    return trimmed;
  }
  return `${head}${trimmed}`;
}

// ── validators (type guards) ──
export function isSignalId(value: string): value is SignalId {
  return hasNamespace(value, "signal");
}
export function isReceiptId(value: string): value is ReceiptId {
  return hasNamespace(value, "receipt");
}
export function isDoubtId(value: string): value is DoubtId {
  return hasNamespace(value, "doubt");
}
export function isMetaDoubtId(value: string): value is MetaDoubtId {
  return hasNamespace(value, "meta");
}
export function isCurveId(value: string): value is CurveId {
  return hasNamespace(value, "curve");
}
export function isCalibrationTag(value: string): value is CalibrationTag {
  return hasNamespace(value, "calibration");
}
export function isPromotionId(value: string): value is PromotionId {
  return hasNamespace(value, "promotion");
}

// ── constructors ──
export function toSignalId(raw: string): SignalId {
  return construct(raw, "signal") as SignalId;
}
export function toReceiptId(raw: string): ReceiptId {
  return construct(raw, "receipt") as ReceiptId;
}
export function toDoubtId(raw: string): DoubtId {
  return construct(raw, "doubt") as DoubtId;
}
export function toMetaDoubtId(raw: string): MetaDoubtId {
  return construct(raw, "meta") as MetaDoubtId;
}
export function toCurveId(raw: string): CurveId {
  return construct(raw, "curve") as CurveId;
}
export function toCalibrationTag(raw: string): CalibrationTag {
  return construct(raw, "calibration") as CalibrationTag;
}
export function toPromotionId(raw: string): PromotionId {
  return construct(raw, "promotion") as PromotionId;
}
