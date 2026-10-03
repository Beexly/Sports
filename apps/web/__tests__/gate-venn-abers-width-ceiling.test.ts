import { describe, expect, it } from "vitest";
import { evaluateBoardGate } from "@/lib/board/gate-consumer";
// Deep submodule import, matching the precedent gate-consumer.ts documents:
// edge-lab is server-only and must not reach the barrel. gate-consumer imports
// this constant but does not re-export it, so take it from the source.
import { MIN_STRATUM_CALIBRATION } from "@sports/prediction-engine/src/edge-lab/selective-gate.js";
import { illustrativeSource } from "@/lib/board/gate-page-mode";

/**
 * The Venn-Abers width ceiling, turned on 2026-09-18.
 *
 * `maxWidthForFire` is a first-class No-Bet: a row whose calibrated interval is
 * wider than the cap is refused however good its lower bound looks. A cap that
 * can never bite is decoration, and a cap that bites everything is a board
 * wipe, so both ends are pinned here.
 *
 * The thing that decides width is calibration DEPTH, not the pick. Measured on
 * the illustrative slate: a stratum at full depth (278 rows) fires intervals
 * ~0.005 wide, the same stratum thinned to the gate's own n floor fires ~0.091.
 * That 17x is the whole reason the ceiling exists, and it is the regime NFL is
 * actually in (AGENTS.md: ~70 settled picks ever, below the n floor).
 */

/** Keep at most `n` calibration rows per stratum — thins depth, nothing else. */
function thinToDepth(rows: readonly { stratum: string }[], n: number) {
  const seen = new Map<string, number>();
  return rows.filter((r) => {
    const k = (seen.get(r.stratum) ?? 0) + 1;
    seen.set(r.stratum, k);
    return k <= n;
  });
}

const source = illustrativeSource();
const CAP = 0.1; // must stay in step with GATE_OPTIONS in app/board/gate/page.tsx

function widthsAtDepth(depth: number, cap?: number) {
  const ev = evaluateBoardGate(
    thinToDepth(source.calibration.rows, depth) as never,
    source.candidates.rows,
    0,
    cap === undefined ? { source: "ivap" } : { source: "ivap", maxWidthForFire: cap },
    source.candidates.excluded,
  );
  const widths = ev.outcomes
    .map((o) => o.width)
    .filter((w): w is number => typeof w === "number" && Number.isFinite(w));
  return {
    fire: ev.outcomes.filter((o) => o.code === "FIRE").length,
    widthVetoed: ev.outcomes.filter((o) => o.code === "NO_BET_WIDTH").length,
    maxWidth: widths.length ? Math.max(...widths) : 0,
  };
}

describe("Venn-Abers width ceiling", () => {
  it("interval width is driven by calibration depth, not by the pick", () => {
    const deep = widthsAtDepth(source.calibration.rows.length);
    const floor = widthsAtDepth(MIN_STRATUM_CALIBRATION + 10);
    expect(deep.maxWidth).toBeLessThan(0.02);
    expect(floor.maxWidth).toBeGreaterThan(0.05);
    // The gap is the argument for having a ceiling at all.
    expect(floor.maxWidth).toBeGreaterThan(deep.maxWidth * 5);
  });

  it("the shipped cap does NOT refuse anything on today's inputs — say so, do not oversell it", () => {
    // Honest statement of what turning it on changed today: nothing. It is
    // insurance against thinning calibration, and this test is what will
    // notice the day that stops being true.
    expect(widthsAtDepth(source.calibration.rows.length, CAP).widthVetoed).toBe(0);
    expect(widthsAtDepth(MIN_STRATUM_CALIBRATION + 10, CAP).widthVetoed).toBe(0);
  });

  it("the cap is reachable: a tighter ceiling refuses exactly the floor-depth rows", () => {
    // If this fails, the ceiling has become unreachable in every regime and is
    // decoration. Floor-depth widths (~0.091) sit above 0.08 and below 0.10.
    const floorOpen = widthsAtDepth(MIN_STRATUM_CALIBRATION + 10);
    const floorTight = widthsAtDepth(MIN_STRATUM_CALIBRATION + 10, 0.08);
    expect(floorTight.widthVetoed).toBeGreaterThan(0);
    // SELECTIVE, not all-or-nothing: it refuses the rows that are too wide and
    // leaves the rest firing. Measured at floor depth: 3 fire with no cap, 2
    // fire under 0.08, and the difference is exactly the width vetoes. A cap
    // that emptied the board would be as wrong as one that never bit.
    expect(floorTight.fire).toBeLessThan(floorOpen.fire);
    expect(floorTight.fire).toBeGreaterThan(0);
    expect(floorTight.fire + floorTight.widthVetoed).toBe(floorOpen.fire);
    // ...and the same tighter cap leaves a well-calibrated stratum alone.
    expect(widthsAtDepth(source.calibration.rows.length, 0.08).widthVetoed).toBe(0);
  });

  it("a cap of zero refuses everything — the board-wipe end is real and bounded", () => {
    const all = widthsAtDepth(source.calibration.rows.length, 0);
    expect(all.fire).toBe(0);
    expect(all.widthVetoed).toBeGreaterThan(0);
  });
});
