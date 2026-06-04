/**
 * Parlay Genome / Portfolio Surgeon — a risk-EDUCATION model.
 *
 * Every leg carries "genes" (the risk it brings); the ticket as a whole has
 * vitals you can read: survivability (chance all legs hit), the headline payout,
 * expected value, the house edge compounding across legs, and hidden
 * correlation. The point is to teach WHY a parlay is fragile — and to let the
 * user perform surgery (drop a leg, see the math move).
 *
 * DOCTRINE: illustrative legs only — no real teams/odds/results. The MATH is
 * real and transparent (you can check every number), computed on illustrative
 * inputs. This is a teaching calculator, not a live recommendation. It aligns
 * with responsible-gaming: it makes parlay fragility legible rather than hyped.
 */

export type ParlayMarket = "Spread" | "Total" | "Moneyline" | "Prop";

export type ParlayLeg = {
  readonly id: string;
  readonly label: string;
  readonly market: ParlayMarket;
  /** Model fair win probability (0..1). */
  readonly winProb: number;
  /** Decimal odds offered by the book. */
  readonly priceDecimal: number;
  // ── risk genes (0..1) ──
  readonly volatility: number;
  readonly publicExposure: number;
  readonly injuryDependency: number;
  readonly lineValue: number; // higher = better value vs fair
  /** Legs sharing a group are correlated (e.g. same game). */
  readonly group?: string;
};

export const GROUP_LABELS: Record<string, string> = {
  g1: "Game 1",
  g2: "Game 2",
};

/** A 5-leg illustrative ticket: two legs share Game 1 (hidden correlation), one longshot. */
export const SAMPLE_LEGS: readonly ParlayLeg[] = [
  // l1 is the lone value leg (win prob beats its price); the rest carry the book's vig.
  { id: "l1", label: "Home −3.5", market: "Spread", winProb: 0.55, priceDecimal: 1.91, volatility: 0.4, publicExposure: 0.62, injuryDependency: 0.3, lineValue: 0.66, group: "g1" },
  { id: "l2", label: "Over 47.5 · same game", market: "Total", winProb: 0.5, priceDecimal: 1.91, volatility: 0.55, publicExposure: 0.5, injuryDependency: 0.25, lineValue: 0.46, group: "g1" },
  { id: "l3", label: "Player points Over 24.5", market: "Prop", winProb: 0.48, priceDecimal: 1.83, volatility: 0.7, publicExposure: 0.45, injuryDependency: 0.6, lineValue: 0.42, group: "g2" },
  { id: "l4", label: "Moneyline favourite", market: "Moneyline", winProb: 0.57, priceDecimal: 1.7, volatility: 0.35, publicExposure: 0.72, injuryDependency: 0.2, lineValue: 0.5 },
  { id: "l5", label: "Longshot prop", market: "Prop", winProb: 0.29, priceDecimal: 3.2, volatility: 0.85, publicExposure: 0.3, injuryDependency: 0.5, lineValue: 0.38 },
];

export type ParlayVerdict = "Empty" | "Balanced" | "Stretched" | "Brittle" | "Mutated";

export type CorrelatedGroup = { readonly group: string; readonly label: string; readonly legs: readonly ParlayLeg[] };

export type ParlayVitals = {
  readonly count: number;
  /** product of win probs — chance ALL legs hit (independent baseline). */
  readonly survivability: number;
  /** product of decimal prices — the headline multiple. */
  readonly payoutDecimal: number;
  /** the zero-vig multiple that would make this break-even. */
  readonly fairPayoutDecimal: number;
  /** expected value per $1 staked (negative is the norm — that's the lesson). */
  readonly ev: number;
  /** house edge compounded across the legs, as a fraction (0.08 = 8%). */
  readonly houseEdge: number;
  readonly correlated: readonly CorrelatedGroup[];
  readonly verdict: ParlayVerdict;
  readonly suggestions: readonly string[];
};

export function decimalToAmerican(d: number): string {
  if (d <= 1) return "—";
  return d >= 2 ? `+${Math.round((d - 1) * 100)}` : `${Math.round(-100 / (d - 1))}`;
}

const product = (xs: readonly number[]) => xs.reduce((a, b) => a * b, 1);

export function computeVitals(legs: readonly ParlayLeg[]): ParlayVitals {
  const count = legs.length;
  if (count === 0) {
    return {
      count: 0, survivability: 0, payoutDecimal: 0, fairPayoutDecimal: 0, ev: 0,
      houseEdge: 0, correlated: [], verdict: "Empty",
      suggestions: ["Add legs to see the ticket's genome and vitals."],
    };
  }

  const survivability = product(legs.map((l) => l.winProb));
  const payoutDecimal = product(legs.map((l) => l.priceDecimal));
  const impliedJoint = product(legs.map((l) => 1 / l.priceDecimal)); // book-implied (with vig)
  const fairPayoutDecimal = 1 / survivability;
  const ev = survivability * payoutDecimal - 1;
  // How much edge the book has compounded across the ticket.
  const houseEdge = Math.max(0, impliedJoint - survivability) / Math.max(impliedJoint, 1e-9);

  // correlation: groups with ≥2 active legs
  const byGroup = new Map<string, ParlayLeg[]>();
  for (const l of legs) {
    if (!l.group) continue;
    const arr = byGroup.get(l.group) ?? [];
    arr.push(l);
    byGroup.set(l.group, arr);
  }
  const correlated: CorrelatedGroup[] = [];
  for (const [group, gl] of byGroup) {
    if (gl.length >= 2) correlated.push({ group, label: GROUP_LABELS[group] ?? group, legs: gl });
  }

  // verdict
  let verdict: ParlayVerdict;
  if (correlated.length > 0 && ev < 0) verdict = "Mutated";
  else if (count >= 4 && survivability < 0.15) verdict = "Brittle";
  else if (ev < 0) verdict = "Stretched";
  else verdict = "Balanced";

  // surgery suggestions
  const suggestions: string[] = [];
  for (const c of correlated) {
    suggestions.push(
      `${c.legs.map((l) => `“${l.label}”`).join(" and ")} share ${c.label}. The book prices that correlation; treating them as independent overstates your odds — consider dropping one.`,
    );
  }
  if (ev < 0) {
    suggestions.push(
      `Expected value is ${(ev * 100).toFixed(1)}% per $1. The headline payout is mostly the vig compounding across ${count} legs — a payout illusion.`,
    );
  }
  const longshot = legs.filter((l) => l.winProb < 0.4).sort((a, b) => a.winProb - b.winProb)[0];
  if (longshot) {
    const without = legs.filter((l) => l.id !== longshot.id);
    const newSurv = without.length ? product(without.map((l) => l.winProb)) : 1;
    suggestions.push(
      `“${longshot.label}” is a longshot (${Math.round(longshot.winProb * 100)}%) dragging survivability. Removing it lifts the chance all legs hit to ${Math.round(newSurv * 100)}%.`,
    );
  }
  if (!suggestions.length) {
    suggestions.push("This ticket is structurally balanced — no hidden correlation, positive expected value, survivable leg count.");
  }

  return { count, survivability, payoutDecimal, fairPayoutDecimal, ev, houseEdge, correlated, verdict, suggestions };
}

export const VERDICT_HEX: Record<ParlayVerdict, string> = {
  Empty: "#5B6675",
  Balanced: "#00E5FF",
  Stretched: "#7A5CFF",
  Brittle: "#7A5CFF",
  Mutated: "#FF2DD6",
};
