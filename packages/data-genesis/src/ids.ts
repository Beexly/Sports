/**
 * Deterministic id builders. Every id is derived from stable, semantic parts (a domain, a name, a
 * hash) so the same logical artifact always yields the same id — no randomness, no clock. Slugs keep
 * ids readable and namespace-safe.
 */

import {
  toSignalId,
  toReceiptId,
  toDoubtId,
  toMetaDoubtId,
  toCurveId,
  toCalibrationTag,
  toPromotionId,
  type SignalId,
  type ReceiptId,
  type DoubtId,
  type MetaDoubtId,
  type CurveId,
  type CalibrationTag,
  type PromotionId,
} from "./brands.js";

/** Lowercase, namespace-safe slug. Collapses runs of non-alphanumerics to a single `-`. */
export function slug(raw: string): string {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return s.length > 0 ? s : "x";
}

function join(parts: readonly string[]): string {
  return parts.map(slug).filter((p) => p.length > 0).join("-") || "x";
}

/** `signal:<domain>-<name>[-<discriminator>]` */
export function signalIdFrom(domain: string, name: string, discriminator?: string): SignalId {
  return toSignalId(join(discriminator ? [domain, name, discriminator] : [domain, name]));
}

/** `receipt:<hash-prefix>` — receipts are content-addressed by their composite hash. */
export function receiptIdFromHash(hash: string, length = 24): ReceiptId {
  const trimmed = hash.trim();
  if (trimmed.length === 0) throw new Error("receiptIdFromHash: empty hash");
  return toReceiptId(trimmed.slice(0, Math.max(1, length)));
}

/** `doubt:<signal-suffix>-<index>` — stable within a signal's doubt set. */
export function doubtIdFrom(signalId: SignalId, index: number): DoubtId {
  const suffix = signalId.slice("signal:".length);
  return toDoubtId(join([suffix, String(Math.max(0, Math.trunc(index)))]));
}

/** `meta:<signal-suffix>` — one meta-doubt report per signal. */
export function metaIdFrom(signalId: SignalId): MetaDoubtId {
  const suffix = signalId.slice("signal:".length);
  return toMetaDoubtId(slug(suffix));
}

/** `curve:<signature>` — a stable signature of the curve's shape (sample count + error). */
export function curveIdFrom(signature: string): CurveId {
  return toCurveId(slug(signature));
}

/** `calibration:<label>` */
export function calibrationTagFrom(label: string): CalibrationTag {
  return toCalibrationTag(slug(label));
}

/** `promotion:<signal-suffix>-<receipt-suffix>` — a promotion is identified by what it promoted. */
export function promotionIdFrom(signalId: SignalId, receiptId: ReceiptId): PromotionId {
  const sig = signalId.slice("signal:".length);
  const rec = receiptId.slice("receipt:".length);
  return toPromotionId(join([sig, rec]));
}
