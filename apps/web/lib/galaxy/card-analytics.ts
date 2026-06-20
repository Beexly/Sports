/**
 * Galaxy Dynasty — card companion analytics (Stage 3 collector depth).
 *
 * Deterministic value-trend history derived from a card's seed + trend direction
 * (no fabricated market data — it's a stable, seeded companion signal, clearly a
 * prototype). Real market pricing arrives with the Stage-3 marketplace.
 */

import { db } from "@sports/db";
import { STARTER_CARDS } from "./content.js";

export interface CardDetail {
  readonly slug: string;
  readonly name: string;
  readonly subjectType: string;
  readonly rarity: string;
  readonly gseRating: number | null;
  readonly formTrend: string | null;
  readonly valueTrend: string | null;
  readonly assetSeed: string;
  readonly statLine: Record<string, string | number>;
  /** 12-point seeded value index history (relative, base 100). */
  readonly history: number[];
}

function seededHistory(seed: string, trend: string | null): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const drift = trend === "UP" ? 1.4 : trend === "DOWN" ? -1.2 : 0.1;
  const out: number[] = [];
  let v = 100;
  for (let i = 0; i < 12; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    const noise = ((h % 1000) / 1000 - 0.5) * 6;
    v = Math.max(60, v + drift + noise);
    out.push(Math.round(v));
  }
  return out;
}

export async function getCardDetail(slug: string): Promise<CardDetail | null> {
  let base:
    | {
        slug: string;
        name: string;
        subjectType: string;
        rarity: string;
        gseRating: number | null;
        formTrend: string | null;
        valueTrend: string | null;
        assetSeed: string | null;
        statLine: unknown;
      }
    | null = null;

  try {
    base = await db.galaxyCard.findUnique({ where: { slug } });
  } catch {
    base = null;
  }

  if (!base) {
    const seed = STARTER_CARDS.find((c) => c.slug === slug);
    if (!seed) return null;
    base = {
      slug: seed.slug,
      name: seed.name,
      subjectType: seed.subjectType,
      rarity: seed.rarity,
      gseRating: seed.gseRating,
      formTrend: seed.formTrend,
      valueTrend: seed.valueTrend,
      assetSeed: seed.slug,
      statLine: seed.statLine,
    };
  }

  const assetSeed = base.assetSeed ?? base.slug;
  return {
    slug: base.slug,
    name: base.name,
    subjectType: base.subjectType,
    rarity: base.rarity,
    gseRating: base.gseRating,
    formTrend: base.formTrend,
    valueTrend: base.valueTrend,
    assetSeed,
    statLine: (base.statLine as Record<string, string | number>) ?? {},
    history: seededHistory(assetSeed, base.valueTrend),
  };
}

/** Inline SVG sparkline data-uri for a value history series. */
export function sparklineSvg(history: number[], color: string): string {
  if (history.length === 0) return "";
  const w = 280;
  const hgt = 70;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const span = max - min || 1;
  const pts = history
    .map((v, i) => {
      const x = (i / (history.length - 1)) * (w - 8) + 4;
      const y = hgt - 6 - ((v - min) / span) * (hgt - 12);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hgt}" viewBox="0 0 ${w} ${hgt}">` +
    `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
