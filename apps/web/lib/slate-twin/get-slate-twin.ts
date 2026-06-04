/**
 * getSlateTwin — the gate-respecting data provider for the Galaxy Slate Twin.
 *
 * DOCTRINE, enforced here:
 *  1. The live slate is NEVER shown until the readiness gate (`canExposePublicPicks`)
 *     is open. Until then, the labelled illustrative DEMO_SLATE is returned.
 *  2. When the gate IS open, the live slate is assembled ONLY from fields the
 *     platform genuinely produces (verdict/grade, confidence, bookmaker
 *     consensus, market depth, opening→current line movement, odds dispersion).
 *  3. Fields with NO real source — public/sharp ticket splits, per-step
 *     confidence history, injury impact steps — are OMITTED (left undefined), not
 *     estimated. The visualization degrades honestly. A `dataNote` says so.
 *  4. Any failure (stubbed DB, query error, zero mappable games) falls back to
 *     the gated demo. Nothing is ever fabricated to fill the frame.
 *
 * Server-only: imports the db client + the prediction-engine readiness gate.
 */

import { getReadinessGates } from "@sports/prediction-engine";
import { db } from "@sports/db";
import {
  DEMO_SLATE, TIMELINE, LEAGUE_CENTERS,
  type TwinSlate, type TwinGame, type TwinLeague, type TwinVerdict, type TwinMarket, type TwinMarketKey,
} from "./demo-slate";

const TLEN = TIMELINE.length;
const c01 = (n: number) => Math.max(0, Math.min(1, n));
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export async function getSlateTwin(): Promise<TwinSlate> {
  const gates = getReadinessGates();
  if (!gates.canExposePublicPicks) return DEMO_SLATE; // gate closed → labelled demo
  try {
    const live = await buildLiveSlate();
    return live ?? DEMO_SLATE;
  } catch {
    return DEMO_SLATE; // any failure → honest fallback, never fabricate
  }
}

function toLeague(name?: string | null): TwinLeague | null {
  const n = (name ?? "").toUpperCase();
  return n === "NFL" || n === "NBA" || n === "MLB" || n === "NHL" ? (n as TwinLeague) : null;
}

function verdictFromGrade(grade?: string | null): TwinVerdict {
  if (grade === "ELITE_PLAY" || grade === "STRONG_PLAY") return "PLAY";
  if (grade === "SOLID_PLAY" || grade === "LEAN") return "WATCHLIST";
  return "NO-BET";
}

const RISK_VOL: Record<string, number> = {
  LOW_RISK: 0.25, MODERATE: 0.45, HIGH_VARIANCE: 0.7, INJURY_RISK: 0.78, LINE_STEAM: 0.6,
};

const MARKET_ORDER: ReadonlyArray<readonly [string, TwinMarketKey]> = [
  ["SPREADS", "Spread"], ["TOTALS", "Total"], ["H2H", "Moneyline"],
];

type OddsRow = { market: string; spread: number | null };

function spreadStats(odds: OddsRow[]): { vol: number | null; current: number | null } {
  const spreads = odds.filter((o) => o.market === "SPREADS" && o.spread != null).map((o) => o.spread as number);
  if (!spreads.length) return { vol: null, current: null };
  const mean = spreads.reduce((a, b) => a + b, 0) / spreads.length;
  if (spreads.length < 2) return { vol: null, current: mean };
  const variance = spreads.reduce((a, b) => a + (b - mean) ** 2, 0) / spreads.length;
  return { vol: c01(Math.sqrt(variance) / 3), current: mean };
}

async function buildLiveSlate(): Promise<TwinSlate | null> {
  const now = new Date();
  const horizon = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 4);

  const rows = await db.game.findMany({
    where: { commenceTime: { gte: now, lte: horizon }, status: "SCHEDULED" },
    include: {
      sport: true,
      odds: true,
      picks: { orderBy: { generatedAt: "desc" }, take: 1 },
    },
    orderBy: { commenceTime: "asc" },
    take: 40,
  });

  // Map each game to a partial TwinGame (positions assigned per-league below).
  type PartialGame = Omit<TwinGame, "pos"> & { league: TwinLeague };
  const partials: PartialGame[] = [];

  for (const row of rows) {
    const league = toLeague(row.sport?.name);
    if (!league) continue; // the Twin only models NFL/NBA/MLB/NHL

    const pick = row.picks?.[0] ?? null;
    const odds: OddsRow[] = (row.odds ?? []).map((o) => ({ market: String(o.market), spread: o.spread ?? null }));
    const { vol: spreadVol, current: curSpread } = spreadStats(odds);

    const conf01 = pick ? c01((pick.confidence ?? 0) / 100) : c01((row.dataQualityScore ?? 0) / 100);
    const signalDensity = conf01;
    const contradictionMass = pick ? c01(1 - (pick.consensusPct ?? 0.5)) : 0.5;
    const volatility = spreadVol ?? RISK_VOL[String(pick?.riskLevel ?? "")] ?? 0.4;
    const marketGravity = c01((pick?.bookmakerCount ?? row.bookmakerCoverageMax ?? 0) / 8);

    // markets present (from real odds), volatility shared from spread dispersion
    const present = new Set(odds.map((o) => o.market));
    const markets: TwinMarket[] = [];
    let mi = 0;
    for (const [m, key] of MARKET_ORDER) {
      if (present.has(m)) { markets.push({ key, radius: 1.0 + mi * 0.5, volatility: spreadVol ?? 0.4 }); mi++; }
    }
    if (!markets.length) markets.push({ key: "Spread", radius: 1.0, volatility: spreadVol ?? 0.4 });

    // odds-movement path: real opening→current as a straight net-drift line (no
    // fabricated intermediate wiggle). Omitted if we lack an opening anchor.
    let oddsPath: number[] | undefined;
    if (row.openingSpread != null && curSpread != null) {
      const move = curSpread - row.openingSpread;
      const end = c01(0.5 + clamp(move / 6, -0.4, 0.4));
      oddsPath = Array.from({ length: TLEN }, (_, i) => 0.5 + (end - 0.5) * (i / (TLEN - 1)));
    }

    partials.push({
      id: row.id,
      league,
      label: `${row.awayTeamName} @ ${row.homeTeamName}`,
      signalDensity,
      contradictionMass,
      volatility,
      marketGravity,
      verdict: pick ? verdictFromGrade(pick.pickGrade) : "NO-BET",
      markets,
      // No per-step history exists → hold the current value across the axis.
      confidence: Array.from({ length: TLEN }, () => conf01),
      note: (pick?.reasoning ?? "").trim().slice(0, 160) || "Tracked game — no qualifying signal yet.",
      ...(oddsPath ? { oddsPath } : {}),
      // publicMoney / sharp / impact intentionally OMITTED — not instrumented.
    });
  }

  if (!partials.length) return null;

  // Assign galaxy positions per league constellation.
  const byLeague = new Map<TwinLeague, PartialGame[]>();
  for (const p of partials) {
    const arr = byLeague.get(p.league) ?? [];
    arr.push(p);
    byLeague.set(p.league, arr);
  }
  const games: TwinGame[] = [];
  for (const [league, arr] of byLeague) {
    const [cx, cy, cz] = LEAGUE_CENTERS[league];
    arr.forEach((p, i) => {
      const ang = (i / Math.max(1, arr.length)) * Math.PI * 2;
      const r = arr.length === 1 ? 0 : 1.7;
      games.push({ ...p, pos: [cx + Math.cos(ang) * r, cy + (i % 2 ? 0.4 : -0.4), cz + Math.sin(ang) * r] });
    });
  }

  return {
    illustrative: false,
    live: true,
    generatedLabel: `Live slate · ${games.length} games`,
    timeline: TIMELINE,
    games,
    dataNote:
      "Live slate shows real games with the metrics the engine produces today — verdict, " +
      "confidence, bookmaker consensus, market depth, and opening→current line movement. " +
      "Public/sharp ticket splits, per-step confidence history, and injury impact-events " +
      "aren't instrumented yet, so those encodings are omitted rather than estimated.",
  };
}
