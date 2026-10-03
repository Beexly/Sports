/**
 * arXiv:2603.11750v2 — Mitigating the Multiplicity Burden: The Role of Calibration in Reducing Predictive Multiplicity of Classifiers
 *
 * Rashomon pick card: publish from K near-optimal model variants rather than the single champion; withhold
 * contested picks where the variants disagree (genuinely negative-EV under disagreement).
 *
 * Improvement: GSE publishes its daily pick card from a Rashomon ensemble of K near-optimal model variants rather than the single champion, withholding contested picks where the variants disagree (genuinely negative-EV under disagreement).
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT the Rashomon/obscurity layer if on 2024 weeks 9-18 the ensemble card beats the champion-only card by >=1.5% ROI (or >=0.005 Brier improvement) AND contested-pick removal does not reduce total profit; otherwise the champion model stands alone.
 */

/** One variant's pick on one game. */
export interface VariantPick {
  variant: string;
  gameId: string;
  pick: "home" | "away";
  edge: number; // variant's estimated edge
}

/** Agreement stats for one game across the Rashomon set. */
export function gameAgreement(picks: readonly VariantPick[]): { agree: number; meanEdge: number } {
  if (picks.length === 0) throw new Error("gameAgreement: no picks");
  const home = picks.filter((p) => p.pick === "home").length;
  const agree = Math.max(home, picks.length - home) / picks.length;
  const meanEdge = picks.reduce((s, p) => s + p.edge, 0) / picks.length;
  return { agree, meanEdge };
}

/**
 * Rashomon card: publish only games where agreement >= threshold AND the
 * mean edge clears the edge floor; contested picks are withheld.
 */
export function rashomonCard(
  games: readonly { gameId: string; picks: VariantPick[] }[],
  agreeThreshold: number,
  edgeFloor: number,
): { gameId: string; pick: "home" | "away"; meanEdge: number }[] {
  const card: { gameId: string; pick: "home" | "away"; meanEdge: number }[] = [];
  for (const g of games) {
    const { agree, meanEdge } = gameAgreement(g.picks);
    if (agree >= agreeThreshold && meanEdge >= edgeFloor) {
      const home = g.picks.filter((p) => p.pick === "home").length;
      card.push({ gameId: g.gameId, pick: home >= g.picks.length / 2 ? "home" : "away", meanEdge });
    }
  }
  return card;
}
