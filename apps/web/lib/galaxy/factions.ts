/**
 * Galaxy Dynasty — Faction War standings (Stage 4 social identity, buildable now).
 *
 * Aggregates every player's contribution into faction standings: members, average
 * ladder rating, and a derived "faction power". Seeded with Ghost contributions so
 * the board is never empty (anti-ghost-town §4.3). Read-only; no new model.
 */

import { db } from "@sports/db";
import { FACTIONS, getFaction, ratingTier, type GalaxyFactionId } from "@sports/galaxy-engine";
import { GHOST_PROFILES } from "./content.js";

export interface FactionStanding {
  readonly id: GalaxyFactionId;
  readonly name: string;
  readonly creed: string;
  readonly members: number;
  readonly avgRating: number;
  readonly power: number;
  readonly tier: string;
  readonly rank: number;
  readonly accent: string;
}

function ghostRating(calibration: number): number {
  return Math.round(900 + calibration * 8);
}

export async function getFactionStandings(): Promise<FactionStanding[]> {
  // Seed each faction with its Ghost members (always present).
  const seed = new Map<string, { sum: number; count: number }>();
  for (const f of FACTIONS) seed.set(f.id, { sum: 0, count: 0 });
  for (const g of GHOST_PROFILES) {
    const s = seed.get(g.faction);
    if (s) {
      s.sum += ghostRating(g.calibration);
      s.count += 1;
    }
  }

  // Fold in real profiles per faction (best-effort; 8 small aggregates).
  for (const f of FACTIONS) {
    try {
      const agg = await db.galaxyProfile.aggregate({
        where: { faction: f.id, isGhost: false },
        _avg: { rating: true },
        _count: true,
      });
      const count = agg._count ?? 0;
      if (count > 0 && agg._avg.rating != null) {
        const s = seed.get(f.id)!;
        s.sum += agg._avg.rating * count;
        s.count += count;
      }
    } catch {
      /* no DB — ghost seed only */
    }
  }

  const standings = FACTIONS.map((f) => {
    const s = seed.get(f.id)!;
    const avg = s.count > 0 ? Math.round(s.sum / s.count) : 1200;
    const def = getFaction(f.id);
    // Power rewards both strength (avg rating) and size (sqrt of members).
    const power = Math.round(avg * (1 + Math.sqrt(s.count) / 12));
    return {
      id: f.id,
      name: def.name,
      creed: def.creed,
      members: s.count,
      avgRating: avg,
      power,
      tier: ratingTier(avg).name,
      accent: def.accent,
      rank: 0,
    };
  });

  standings.sort((a, b) => b.power - a.power);
  return standings.map((s, i) => ({ ...s, rank: i + 1 }));
}
