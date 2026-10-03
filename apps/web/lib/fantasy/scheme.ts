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
    headline: "New OC installs a wide-zone run scheme",
    summary: "A zone-blocking, run-first identity: clean lanes for the lead back, play-action lift for the inline TE, slightly thinner pass volume.",
    rule: (p) => {
      if (p.pos === "RB" && p.usage >= 0.6) return { deltaPct: 12, why: "Lead back in a wide-zone scheme: more clean carries and goal-line work." };
      if (p.pos === "RB") return { deltaPct: 6, why: "Zone blocking lifts even committee backs." };
      if (p.pos === "TE") return { deltaPct: 5, why: "Play-action off the zone run feeds the inline TE." };
      if (p.pos === "WR") return { deltaPct: -5, why: "Run-leaning script trims overall pass volume." };
      return null;
    },
  },
  {
    id: "air-raid", team: "CIN", tier: "Insider",
    headline: "Air-raid coordinator brings a pass-heavy install",
    summary: "Spread, tempo, and volume: the QB and receivers eat, the slot especially; early-down rushing work shrinks.",
    rule: (p) => {
      if (p.pos === "QB") return { deltaPct: 9, why: "More dropbacks and a higher pass rate lift the QB's floor and ceiling." };
      if (p.pos === "WR" && /slot/i.test(p.role)) return { deltaPct: 14, why: "Slot is the engine of an air-raid: target share spikes." };
      if (p.pos === "WR") return { deltaPct: 8, why: "Pass volume rises across the receiver room." };
      if (isPassCatchingRB(p)) return { deltaPct: 7, why: "Pass-catching back gains check-down and route volume." };
      if (p.pos === "RB") return { deltaPct: -8, why: "Early-down rushing work shrinks in a pass-first plan." };
      if (p.pos === "TE") return { deltaPct: 5, why: "Seam targets tick up with the added volume." };
      return null;
    },
  },
  {
    id: "consolidation", team: "MIA", tier: "Beat",
    headline: "New staff signals a target-consolidation plan around WR1",
    summary: "Funnel the offense through the alpha: the WR1 sees a bigger share at the expense of the secondary pass-catchers.",
    rule: (p, mates) => {
      if (teamWR1(p, mates)) return { deltaPct: 13, why: "Becomes the focal point: target share consolidates here." };
      if (p.pos === "WR") return { deltaPct: -9, why: "Secondary receiver loses share to the alpha." };
      if (p.pos === "TE") return { deltaPct: -3, why: "Slightly fewer looks as targets concentrate." };
      return null;
    },
  },
  {
    id: "tempo", team: "PHI", tier: "Aggregator",
    headline: "Reports of an up-tempo, no-huddle shift (unconfirmed)",
    summary: "More plays per game lifts everyone a little; the QB gains the most from the extra snaps.",
    rule: (p) => {
      if (p.pos === "QB") return { deltaPct: 6, why: "Extra possessions mean extra dropbacks." };
      return { deltaPct: 4, why: "More total plays lift every skill position modestly." };
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
