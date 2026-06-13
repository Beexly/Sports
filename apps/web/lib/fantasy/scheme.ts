/**
 * Scheme Intelligence — how one coaching change cascades through a roster.
 *
 * A new coordinator or scheme doesn't move one player — it re-prices a whole
 * offense. Each scenario carries a source-reliability tier (the same spine as The
 * Beat) and a rule that maps every teammate's role and usage to a projection
 * delta, so you see the full ripple: who gains, who fades, and why. Pure,
 * illustrative.
 */

import { type Player } from "./players";
import { activePlayerPool } from "@/lib/integrations/projections";
import { TIER_WEIGHT, type Tier } from "../news/impact";

export type SchemeScenario = {
  readonly id: string;
  readonly team: string;
  readonly headline: string;
  readonly summary: string;
  readonly tier: Tier;
  /** delta% + why for a teammate, given the team's roster for context; null = unaffected */
  readonly rule: (p: Player, teammates: readonly Player[]) => { deltaPct: number; why: string } | null;
};

const isPassCatchingRB = (p: Player) => p.pos === "RB" && /pass-?catch|receiv/i.test(p.role);
const teamWR1 = (p: Player, mates: readonly Player[]) =>
  p.pos === "WR" && mates.filter((m) => m.pos === "WR").sort((a, b) => b.usage - a.usage)[0]?.id === p.id;

export const SCHEME_SCENARIOS: readonly SchemeScenario[] = [
  {
    id: "wide-zone", team: "DET", tier: "Insider",
    headline: "Dan Campbell's zone-run identity — OC John Morton install",
    summary: "Detroit's zone-blocking, run-first identity creates clean lanes for the lead back, play-action lift for the inline TE, and slightly thinner pure pass volume.",
    rule: (p) => {
      if (p.pos === "RB" && p.usage >= 0.6) return { deltaPct: 12, why: "Lead back in a zone scheme — more clean carries and goal-line equity." };
      if (p.pos === "RB") return { deltaPct: 6, why: "Zone blocking lifts even committee backs." };
      if (p.pos === "TE") return { deltaPct: 5, why: "Play-action off the zone run feeds the inline TE." };
      if (p.pos === "WR") return { deltaPct: -4, why: "Run-leaning script trims overall pass volume modestly." };
      return null;
    },
  },
  {
    id: "air-raid", team: "NE", tier: "Insider",
    headline: "Mike Vrabel / Josh McDaniels pass-volume reset in New England",
    summary: "McDaniels' return to NE brings his spread-and-tempo philosophy — more dropbacks, higher pass rate, receivers and the QB eat; early-down RB work shrinks.",
    rule: (p) => {
      if (p.pos === "QB") return { deltaPct: 10, why: "More dropbacks and a higher pass rate lift the QB's floor and ceiling." };
      if (p.pos === "WR" && /slot/i.test(p.role)) return { deltaPct: 14, why: "The slot is McDaniels' primary target funnel — share spikes." };
      if (p.pos === "WR") return { deltaPct: 8, why: "Pass volume rises across the receiver room." };
      if (isPassCatchingRB(p)) return { deltaPct: 7, why: "Pass-catching back gains check-down and route volume." };
      if (p.pos === "RB") return { deltaPct: -8, why: "Early-down rushing work shrinks in a pass-first install." };
      if (p.pos === "TE") return { deltaPct: 5, why: "Seam targets tick up with the added volume." };
      return null;
    },
  },
  {
    id: "consolidation", team: "MIA", tier: "Beat",
    headline: "Mike McDaniel's target-share consolidation around WR1",
    summary: "McDaniel's offense funnels through the alpha — the WR1 sees a bigger share at the expense of secondary pass-catchers.",
    rule: (p, mates) => {
      if (teamWR1(p, mates)) return { deltaPct: 13, why: "Becomes the focal point — target share consolidates here." };
      if (p.pos === "WR") return { deltaPct: -9, why: "Secondary receiver loses share to the alpha." };
      if (p.pos === "TE") return { deltaPct: -3, why: "Slightly fewer looks as targets concentrate." };
      return null;
    },
  },
  {
    id: "tempo", team: "CHI", tier: "Aggregator",
    headline: "Ben Johnson's up-tempo, pass-first scheme hits Chicago",
    summary: "Johnson's offense from Detroit runs fast and throws often — more plays per game lifts everyone; the QB and receivers gain the most from the extra volume.",
    rule: (p) => {
      if (p.pos === "QB") return { deltaPct: 8, why: "Extra possessions and a pass-first install maximize dropbacks." };
      if (p.pos === "WR") return { deltaPct: 6, why: "More total plays and a higher pass rate lift every receiver." };
      if (p.pos === "TE") return { deltaPct: 5, why: "Seam and crossing routes gain volume in Johnson's scheme." };
      if (isPassCatchingRB(p)) return { deltaPct: 5, why: "Check-down and screen work rises in a fast-paced offense." };
      return { deltaPct: 3, why: "More total plays lift every skill position modestly." };
    },
  },
  {
    id: "run-heavy", team: "SF", tier: "Insider",
    headline: "Kyle Shanahan's run-game foundation — the 49ers identity",
    summary: "San Francisco's RPO-heavy, motion-before-snap scheme is the most run-friendly in the league — it raises every ball-carrier's ceiling and creates the best play-action for the TE.",
    rule: (p) => {
      if (p.pos === "RB" && p.usage >= 0.55) return { deltaPct: 11, why: "Shanahan's system is the gold standard for RB value." };
      if (p.pos === "RB") return { deltaPct: 6, why: "Even a committee back gains in SF's scheme." };
      if (p.pos === "TE") return { deltaPct: 9, why: "Play-action is core to the system — TE is the primary beneficiary." };
      if (p.pos === "WR" && /slot/i.test(p.role)) return { deltaPct: 7, why: "Slot motion and RPOs create easy catches." };
      if (p.pos === "WR") return { deltaPct: 3, why: "Moderate pass volume, but quality looks." };
      return null;
    },
  },
];

export type SchemeImpact = {
  readonly player: Player;
  readonly deltaPct: number;
  readonly why: string;
  readonly direction: "up" | "down";
};

export type SchemeCascade = {
  readonly scenario: SchemeScenario;
  readonly confidence: number; // 0..1 from the source tier
  readonly impacts: readonly SchemeImpact[];
  readonly gainers: number;
  readonly faders: number;
};

export function applyScheme(scenario: SchemeScenario, pool: readonly Player[] = activePlayerPool()): SchemeCascade {
  const teammates = pool.filter((p) => p.team === scenario.team);
  const impacts: SchemeImpact[] = [];
  for (const p of teammates) {
    const r = scenario.rule(p, teammates);
    if (!r || r.deltaPct === 0) continue;
    impacts.push({ player: p, deltaPct: r.deltaPct, why: r.why, direction: r.deltaPct >= 0 ? "up" : "down" });
  }
  impacts.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
  return {
    scenario,
    confidence: TIER_WEIGHT[scenario.tier],
    impacts,
    gainers: impacts.filter((i) => i.direction === "up").length,
    faders: impacts.filter((i) => i.direction === "down").length,
  };
}
