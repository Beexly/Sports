/**
 * AUTHORITY FLIGHT RECORD — one honest explanation of "what GSE was allowed to say," for every surface.
 *
 * A thin PRESENTER over `composeAuthority` (the canonical 8-layer meet) — NOT a new authority system.
 * Every public card, prediction, trend, and market state can attach one of these: requested vs permitted
 * expression, the binding layer, the full layer trace, what's missing, and what would upgrade it.
 *
 * Pure + deterministic. Spec: docs/product/AUTHORITY_FLIGHT_RECORD.md.
 */

import { type MaxPermittedStrength, strengthMin } from "./decision-state-stat-contract.js";
import { type AuthorityVectorInput, type AuthorityLayer, composeAuthority, layerCeilings } from "./authority-vector.js";

const LAYER_PUBLIC_LABEL: Readonly<Record<AuthorityLayer, string>> = {
  RIGHTS: "rights to use this data",
  TEMPORAL: "freshness / knowable-in-time",
  SOURCE_REALITY: "live vs fixture/shadow data",
  EVIDENCE: "enough evidence",
  LOCAL_EXPRESSION: "the read's own strength",
  MODEL_MATURITY: "a proven model",
  ENTITLEMENT: "your access tier",
  OWNER_ACTION: "owner sign-off",
};

const UPGRADE_HINT: Readonly<Record<AuthorityLayer, string>> = {
  RIGHTS: "clear the data rights for this audience",
  TEMPORAL: "use fresh, post-cutoff data",
  SOURCE_REALITY: "activate the live data source (currently fixture/shadow)",
  EVIDENCE: "gather the missing required facts",
  LOCAL_EXPRESSION: "a stronger underlying read",
  MODEL_MATURITY: "a model that has beaten its baseline out-of-sample",
  ENTITLEMENT: "a higher access tier",
  OWNER_ACTION: "owner approval",
};

export interface AuthorityFlightRecord {
  readonly subject: string;
  readonly requestedExpression: MaxPermittedStrength;
  readonly permittedExpression: MaxPermittedStrength;
  readonly bindingLayer: AuthorityLayer | null;
  readonly bindingLayerPublic: string;
  readonly layerResults: ReadonlyArray<{ layer: AuthorityLayer; ceiling: MaxPermittedStrength; binding: boolean }>;
  readonly missingEvidence: readonly string[];
  readonly whyNot: string;
  readonly whatWouldUpgrade: string;
  readonly receiptRefs: readonly string[];
  readonly timestampLabel: string;
  readonly fixtureWatermarked: boolean;
  readonly lifecycleStage: "FIXTURE" | "SHADOW" | "PREVIEW" | "LIVE";
}

export function buildFlightRecord(args: {
  readonly subject: string;
  readonly requested: MaxPermittedStrength;
  readonly authority: AuthorityVectorInput;
  readonly missingEvidence?: readonly string[];
  readonly receiptRefs?: readonly string[];
  readonly timestampLabel?: string;
}): AuthorityFlightRecord {
  const comp = composeAuthority(args.authority);
  const ceilings = layerCeilings(args.authority);
  const permitted = strengthMin(args.requested, comp.ceiling);
  const binding = comp.bindingLayers[0] ?? null;
  const lifecycleStage = args.authority.sourceReality === "LIVE_REAL" ? "LIVE" : args.authority.sourceReality === "SHADOW_REAL" ? "SHADOW" : "FIXTURE";

  return {
    subject: args.subject,
    requestedExpression: args.requested,
    permittedExpression: permitted,
    bindingLayer: binding,
    bindingLayerPublic: binding ? LAYER_PUBLIC_LABEL[binding] : "—",
    layerResults: comp.trace.map((t) => ({ layer: t.layer, ceiling: t.ceiling, binding: comp.bindingLayers.includes(t.layer) })),
    missingEvidence: args.missingEvidence ?? [],
    whyNot:
      permitted === args.requested
        ? `Cleared to ${permitted} — every layer permits it.`
        : `Capped at ${permitted} (you asked for ${args.requested}). The limit is ${binding ? LAYER_PUBLIC_LABEL[binding] : "a missing gate"}.`,
    whatWouldUpgrade: binding ? `To say more, ${UPGRADE_HINT[binding]}.` : "Already at the requested strength.",
    receiptRefs: args.receiptRefs ?? [],
    timestampLabel: args.timestampLabel ?? "fixture",
    fixtureWatermarked: lifecycleStage !== "LIVE",
    lifecycleStage,
  };
}
