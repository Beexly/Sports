/**
 * Generic adapters — wrap an arbitrary produced value into a receipted SyntheticSignal in one call.
 *
 * Domain packages (e.g. prediction-engine) build their own thin, typed adapters on top of this so they
 * never duplicate the receipt/signal plumbing. The hash function is injected end to end.
 */

import { createGenesisReceipt, type HashFn, type LicenseScope } from "./receipt.js";
import { createSyntheticSignal, type SignalDomain, type SyntheticSignal } from "./signal.js";
import { signalIdFrom } from "./ids.js";

export interface WrapAsSyntheticSignalArgs<TValue> {
  domain: SignalDomain;
  name: string;
  value: TValue;
  confidence: number;
  uncertainty: number;
  engineVersion: string;
  modelVersion?: string;
  /** Injected ISO timestamp. */
  generatedAt: string;
  /** The inputs the producing transformation consumed. */
  inputs: unknown;
  /** Transformation metadata (method, params, version). */
  transformation: unknown;
  sourceKinds?: readonly string[];
  sourceRefs?: readonly string[];
  licenseScope?: LicenseScope;
  discriminator?: string;
  tags?: readonly string[];
  notes?: string;
}

/**
 * Build a receipted, draft SyntheticSignal from any value. The receipt hashes the inputs, the
 * transformation metadata (with engine/model version + sources), and the output value.
 */
export function wrapAsSyntheticSignal<TValue>(
  args: WrapAsSyntheticSignalArgs<TValue>,
  hash: HashFn,
): SyntheticSignal<TValue> {
  const signalId = signalIdFrom(args.domain, args.name, args.discriminator);
  const receipt = createGenesisReceipt(
    {
      createdAt: args.generatedAt,
      engineVersion: args.engineVersion,
      modelVersion: args.modelVersion,
      signalId,
      inputs: args.inputs,
      transformation: args.transformation,
      output: args.value,
      sourceKinds: args.sourceKinds,
      sourceRefs: args.sourceRefs,
      licenseScope: args.licenseScope,
    },
    hash,
  );
  return createSyntheticSignal({
    signalId,
    domain: args.domain,
    name: args.name,
    value: args.value,
    confidence: args.confidence,
    uncertainty: args.uncertainty,
    generatedAt: args.generatedAt,
    engineVersion: args.engineVersion,
    modelVersion: args.modelVersion,
    receipt,
    validationStatus: "draft",
    tags: args.tags,
    notes: args.notes,
  });
}
