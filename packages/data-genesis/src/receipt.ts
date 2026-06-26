/**
 * GenesisReceipt — the proof-of-origin a synthetic signal carries for its whole life.
 *
 * A receipt is a tamper-evident record of HOW a signal was produced: a content hash of its inputs, of
 * the transformation metadata (engine/model version + sources), and of its output, plus the canonical
 * payload itself. The hash function is INJECTED (same discipline as `proof-of-record.ts`): this module
 * never hard-wires `node:crypto`, so a caller chooses the strength of the guarantee. Pure and
 * deterministic — identical inputs always produce identical hashes.
 */

import { canonicalize } from "./canonical.js";
import { receiptIdFromHash } from "./ids.js";
import type { ReceiptId, SignalId } from "./brands.js";

/** A pure string→string hash. PRODUCTION must inject a real cryptographic hash (e.g. sha256 hex). */
export type HashFn = (input: string) => string;

export type LicenseScope =
  | "internal_only"
  | "public_metadata_only"
  | "public_claim_allowed"
  | "unknown";

export interface GenesisReceipt {
  receiptId: ReceiptId;
  /** Injected ISO timestamp — the engine is pure and never reads the wall clock. */
  createdAt: string;
  engineVersion: string;
  modelVersion?: string;
  signalId?: SignalId;
  parentReceiptIds: ReceiptId[];
  inputHash: string;
  transformationHash: string;
  outputHash: string;
  /** The canonical serialization of the output the receipt commits to. */
  canonicalPayload: string;
  sourceKinds: readonly string[];
  sourceRefs: readonly string[];
  licenseScope: LicenseScope;
  synthetic: true;
  receiptIntegrity: "valid" | "invalid";
}

export interface CreateGenesisReceiptArgs {
  /** Injected ISO timestamp. Required for a valid receipt. */
  createdAt: string;
  engineVersion: string;
  modelVersion?: string;
  signalId?: SignalId;
  parentReceiptIds?: readonly ReceiptId[];
  /** The inputs the transformation consumed → inputHash. */
  inputs: unknown;
  /** Transformation metadata (method, params) → folded into transformationHash. */
  transformation: unknown;
  /** The produced output → outputHash + canonicalPayload. */
  output: unknown;
  sourceKinds?: readonly string[];
  sourceRefs?: readonly string[];
  licenseScope?: LicenseScope;
}

function nonEmpty(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Create a GenesisReceipt. The transformation hash binds the engine/model version and the (sorted)
 * source refs alongside the transformation metadata, so a change to provenance changes the receipt.
 * `receiptIntegrity` is `valid` only when every required field is present and every hash was produced.
 */
export function createGenesisReceipt(args: CreateGenesisReceiptArgs, hash: HashFn): GenesisReceipt {
  const engineVersion = nonEmpty(args.engineVersion) ? args.engineVersion : "";
  const sourceKinds = [...(args.sourceKinds ?? [])];
  const sourceRefs = [...(args.sourceRefs ?? [])];
  const licenseScope: LicenseScope = args.licenseScope ?? "unknown";
  const createdAt = nonEmpty(args.createdAt) ? args.createdAt : "";

  const inputCanon = canonicalize(args.inputs ?? null);
  const transformationCanon = canonicalize({
    transformation: args.transformation ?? null,
    engineVersion,
    modelVersion: args.modelVersion ?? null,
    sourceKinds: [...sourceKinds].sort(),
    sourceRefs: [...sourceRefs].sort(),
  });
  const outputCanon = canonicalize(args.output ?? null);

  const inputHash = hash(inputCanon);
  const transformationHash = hash(transformationCanon);
  const outputHash = hash(outputCanon);
  const receiptId = receiptIdFromHash(hash(`${inputHash}:${transformationHash}:${outputHash}`));

  const requiredOk =
    engineVersion.length > 0 &&
    createdAt.length > 0 &&
    inputHash.length > 0 &&
    transformationHash.length > 0 &&
    outputHash.length > 0;

  const receipt: GenesisReceipt = {
    receiptId,
    createdAt,
    engineVersion,
    parentReceiptIds: [...(args.parentReceiptIds ?? [])],
    inputHash,
    transformationHash,
    outputHash,
    canonicalPayload: outputCanon,
    sourceKinds,
    sourceRefs,
    licenseScope,
    synthetic: true,
    receiptIntegrity: requiredOk ? "valid" : "invalid",
  };
  if (args.modelVersion !== undefined) receipt.modelVersion = args.modelVersion;
  if (args.signalId !== undefined) receipt.signalId = args.signalId;
  return receipt;
}

/** A receipt is usable as proof of origin only when its integrity is `valid`. */
export function isReceiptValid(receipt: GenesisReceipt): boolean {
  return receipt.receiptIntegrity === "valid" && receipt.synthetic === true;
}
