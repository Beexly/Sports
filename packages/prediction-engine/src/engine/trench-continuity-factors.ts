/**
 * Home trench continuity → FactorDetail.
 *
 * Reads GameContextInput.olContinuityDelta / dlContinuityDelta / dbContinuityDelta.
 * dynamic-context-builder.ts copies only the HOME continuity onto those fields
 * (away continuity is computed and dropped). A negative delta is a home-line
 * problem: it lowers confidence when the picked side is HOME and raises it
 * when the picked side is AWAY.
 *
 * The weight is the delta divided by 0.15, the per-Out coefficient in
 * computeOlContinuityDelta / computeDlContinuityDelta / computeDbContinuityDelta.
 * No second scale. A missing field is a named gap, not a measured zero.
 */
import type { FactorDetail } from "@sports/types";

/** Per-Out coefficient. signals/trench/*-continuity.ts. */
export const TRENCH_OUT_UNIT = 0.15;

export interface TrenchContinuityInput {
  readonly pickedSide: "HOME" | "AWAY";
  readonly olContinuityDelta?: number | null;
  readonly dlContinuityDelta?: number | null;
  readonly dbContinuityDelta?: number | null;
}

const UNITS: readonly { key: keyof TrenchContinuityInput; label: string }[] = [
  { key: "olContinuityDelta", label: "OL" },
  { key: "dlContinuityDelta", label: "DL" },
  { key: "dbContinuityDelta", label: "DB" },
];

export function trenchContinuityFactors(input: TrenchContinuityInput): FactorDetail[] {
  const out: FactorDetail[] = [];
  for (const unit of UNITS) {
    const raw = input[unit.key];
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      out.push({
        name: `Trench: home ${unit.label}`,
        impact: "neutral",
        weight: 0,
        description:
          `Gap: home ${unit.label} continuity is not on the scoring packet. ` +
          `Away ${unit.label} continuity is computed in dynamic-context-builder.ts and not copied onto GameContextInput. ` +
          `Source: none.`,
      });
      continue;
    }
    const outEquivalents = Math.round(raw / TRENCH_OUT_UNIT);
    const homeWeight = outEquivalents;
    const weight = input.pickedSide === "HOME" ? homeWeight : -homeWeight;
    const measuredZero = raw === 0;
    out.push({
      name: `Trench: home ${unit.label}`,
      impact: weight > 0 ? "positive" : weight < 0 ? "negative" : "neutral",
      weight,
      description: measuredZero
        ? `Home ${unit.label} continuity delta 0 (measured zero, not a gap). Source: GameContextInput.${unit.key}.`
        : `Home ${unit.label} continuity delta ${raw} (${outEquivalents} out-equivalent at the 0.15 per-Out unit). ` +
          `Picked side ${input.pickedSide}. Away ${unit.label} is not on the packet. ` +
          `Source: GameContextInput.${unit.key}.`,
    });
  }
  return out;
}
