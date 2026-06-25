/**
 * FANTASY DISCOVERY LAYER — Manager DNA Genome (Invention F5).
 *
 * League-specific edge: managers have stable behavioral tendencies — waiver aggression, FAAB
 * discipline, recency bias, injury panic, name-value bias, roster hoarding, risk tolerance. Knowing
 * the genome turns generic advice ("trade for X") into targeted advice ("offer Manager 4, who
 * overreacts to a two-week box-score dip and needs an RB").
 *
 * PRIVACY: this operates ONLY on ManagerGenome objects the caller explicitly provides from
 * consented league history (`consentedDataProvided` must be true). It never scrapes or infers from
 * private league data on its own. Pure + deterministic.
 */

export interface ManagerGenome {
  readonly managerId: string;
  readonly waiverAggression: number; // 0..1
  readonly faabDiscipline: number;   // 0..1 (1 = disciplined)
  readonly tradeAggression: number;  // 0..1
  readonly recencyBias: number;      // 0..1
  readonly nameValueBias: number;    // 0..1
  readonly injuryPanic: number;      // 0..1
  readonly favoriteTeam?: string;
  readonly rosterHoarding: number;   // 0..1
  readonly riskTolerance: number;    // 0..1
  /** Must be true — derived from explicitly provided, consented league history (not scraped). */
  readonly consentedDataProvided: boolean;
}

export interface BuyLowCounterparty {
  readonly managerId: string;
  readonly sellLowProbability: number; // 0..1
  readonly rationale: string;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/**
 * Rank the managers most likely to SELL LOW on an asset after a recent box-score decline. Skips any
 * manager whose data was not explicitly provided/consented. The output is a negotiation prior, never
 * a guarantee — and it executes no trade.
 */
export function bestBuyLowCounterparties(
  managers: readonly ManagerGenome[],
  opts: { recentBoxScoreDecline: number /* 0..1 */ },
): BuyLowCounterparty[] {
  const decline = clamp01(opts.recentBoxScoreDecline);
  return managers
    .filter((m) => m.consentedDataProvided)
    .map((m) => {
      const base = 0.45 * m.recencyBias + 0.25 * m.injuryPanic + 0.2 * m.tradeAggression + 0.1 * (1 - m.faabDiscipline);
      const sellLowProbability = clamp01(base * (0.5 + 0.5 * decline));
      return {
        managerId: m.managerId,
        sellLowProbability: Number(sellLowProbability.toFixed(3)),
        rationale: `recency ${m.recencyBias.toFixed(2)} + panic ${m.injuryPanic.toFixed(2)} + trade-aggression ${m.tradeAggression.toFixed(2)}, scaled by a ${(decline * 100).toFixed(0)}% recent decline. Negotiation prior only — no trade executed.`,
      };
    })
    .sort((a, b) => b.sellLowProbability - a.sellLowProbability);
}

export type ManagerTendency = "overpays_faab" | "panics_on_injury" | "hoards_position" | "chases_names" | "disciplined";

/** Summarize a manager's single dominant exploitable tendency (consented data only). */
export function dominantManagerTendency(m: ManagerGenome): { tendency: ManagerTendency; note: string } {
  if (!m.consentedDataProvided) return { tendency: "disciplined", note: "No consented data provided — no inference made." };
  const scores: Array<{ tendency: ManagerTendency; score: number }> = [
    { tendency: "overpays_faab", score: m.waiverAggression * (1 - m.faabDiscipline) },
    { tendency: "panics_on_injury", score: m.injuryPanic * m.recencyBias },
    { tendency: "hoards_position", score: m.rosterHoarding },
    { tendency: "chases_names", score: m.nameValueBias },
  ];
  const top = scores.sort((a, b) => b.score - a.score)[0]!;
  if (top.score < 0.3) return { tendency: "disciplined", note: "No strong exploitable tendency above threshold." };
  return { tendency: top.tendency, note: `Dominant tendency: ${top.tendency} (score ${top.score.toFixed(2)}).` };
}
