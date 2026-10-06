/**
 * Declaration shape for a signal the reasoning layer can name.
 *
 * The live list is `SIGNAL_REGISTRY` in ingestion-pipeline. This file does
 * not copy it and does not register arXiv kernel files. A kernel is not a
 * signal until a SignalDefinition exists.
 */
import type { SignalFamily } from "@sports/types";

export const SIGNAL_FAMILIES = [
  "MARKET",
  "EFFICIENCY",
  "TRENCHES",
  "SITUATIONAL",
  "MICROCLIMATE",
  "MARKET_MICROSTRUCTURE",
  "LUCK",
  "NARRATIVE",
] as const satisfies readonly SignalFamily[];

export interface SignalDeclaration {
  readonly signalId: string;
  readonly family: SignalFamily;
  /** Every registered signal timestamps evidence as ISO-8601. There is no other format. */
  readonly evidenceTimestamp: "ISO-8601";
  /** trustWeight is a prior in [0, 1]. It is not a sample size. */
  readonly weightSemantics: "trustWeight";
  readonly deprecated: boolean;
}

export function registerDeclarations(declarations: readonly SignalDeclaration[]): readonly SignalDeclaration[] {
  const seen = new Set<string>();
  const families = new Set<string>(SIGNAL_FAMILIES);
  for (const declaration of declarations) {
    if (declaration.signalId.trim().length === 0) throw new Error("registry: empty signalId");
    if (seen.has(declaration.signalId)) throw new Error(`registry: duplicate signalId ${declaration.signalId}`);
    seen.add(declaration.signalId);
    if (!families.has(declaration.family)) throw new Error(`registry: unknown family ${declaration.family}`);
    if (declaration.evidenceTimestamp !== "ISO-8601") throw new Error(`registry: ${declaration.signalId} has no timestamp format`);
    if (declaration.weightSemantics !== "trustWeight") throw new Error(`registry: ${declaration.signalId} has no weight semantics`);
  }
  return declarations;
}
