/**
 * Signal Adapters — turn every DB surface into SignalObservation rows
 * for the all-knowing reasoning spine.
 *
 * Doctrine: injuries, NGS, weather, player stats, ratings, snaps, and pace
 * all EXIST in the database. They were attaching to 0 picks. These adapters
 * are the wiring. Pure functions over row shapes (testable without a DB);
 * thin loaders sit on top for the Prisma client.
 *
 * Every observation carries: what we know, when we knew it, where it came
 * from, trust, freshness, rights, and tier. Tier-5 is cockpit-only.
 */

import type { SignalObservation, SignalFamily } from "./reasoning";

// ---------------------------------------------------------------------------
// Row shapes (mirror the Prisma models; keep them structural so tests can
// construct fixtures without @prisma/client).
// ---------------------------------------------------------------------------

export interface InjuryRow {
  readonly playerName: string;
  readonly team?: string | null;
  readonly position?: string | null;
  readonly reportStatus?: string | null;
  readonly practiceStatus?: string | null;
  readonly primaryInjury?: string | null;
  readonly season: number;
  readonly week: number;
  readonly sourceId?: string | null;
  readonly fetchedAt: Date | string;
}

export interface NgsRow {
  readonly playerName: string;
  readonly team?: string | null;
  readonly position?: string | null;
  readonly statType: string;
  readonly season: number;
  readonly week: number;
  readonly cpoe?: number | null;
  readonly avgSeparation?: number | null;
  readonly avgYacAboveExpectation?: number | null;
  readonly rushYardsOverExpectedPerAtt?: number | null;
  readonly pctShareIntendedAirYards?: number | null;
  readonly completionPct?: number | null;
  readonly expectedCompletionPct?: number | null;
  readonly sourceId?: string | null;
  readonly fetchedAt: Date | string;
}

export interface PlayerGameStatRow {
  readonly team?: string | null;
  readonly opponent?: string | null;
  readonly season: number;
  readonly week: number;
  readonly attempts?: number | null;
  readonly carries?: number | null;
  readonly receptions?: number | null;
  readonly targets?: number | null;
  readonly targetShare?: number | null;
  readonly fantasyPointsPpr?: number | null;
  readonly passingEpa?: number | null;
  readonly rushingEpa?: number | null;
  readonly receivingEpa?: number | null;
  readonly sourceId?: string | null;
  readonly fetchedAt: Date | string;
}

export interface TeamEfficiencyRow {
  readonly team: string;
  readonly opponent: string;
  readonly isHome: boolean;
  readonly plays: number;
  readonly offEpaPerPlay: number;
  readonly offSuccess: number;
  readonly defEpaPerPlay: number;
  readonly defSuccess: number;
  readonly season: number;
  readonly week: number;
  readonly sourceId?: string | null;
  readonly fetchedAt: Date | string;
}

export interface GameSignalRow {
  readonly sourceCategory: string;
  readonly sourceName: string;
  readonly signalKey: string;
  readonly signalValue: unknown;
  readonly trustLevel?: number | null;
  readonly fetchedAt: Date | string;
  readonly expiresAt?: Date | string | null;
}

export interface SnapCountRow {
  readonly playerName: string;
  readonly team?: string | null;
  readonly position?: string | null;
  readonly offensePct?: number | null;
  readonly defensePct?: number | null;
  readonly season: number;
  readonly week: number;
  readonly sourceId?: string | null;
  readonly fetchedAt: Date | string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function iso(d: Date | string): string {
  return typeof d === "string" ? d : d.toISOString();
}

function freshness(fetchedAt: Date | string, now: Date = new Date()): number {
  const t = typeof fetchedAt === "string" ? new Date(fetchedAt) : fetchedAt;
  const ageH = (now.getTime() - t.getTime()) / 3_600_000;
  if (!Number.isFinite(ageH) || ageH < 0) return 1;
  if (ageH <= 24) return 1;
  if (ageH <= 72) return 0.85;
  if (ageH <= 168) return 0.65;
  return 0.4;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/** Map a status string to an availability lean (negative = hurts the team). */
export function injuryLean(reportStatus: string | null | undefined, position?: string | null): number {
  const s = (reportStatus ?? "").toLowerCase();
  const pos = (position ?? "").toUpperCase();
  // Base severity by status
  let base = 0;
  if (s.includes("out") || s.includes("ir") || s.includes("doubtful")) base = -0.7;
  else if (s.includes("questionable")) base = -0.35;
  else if (s.includes("limited") || s.includes("questionable")) base = -0.25;
  else if (s.includes("full") || s.includes("probable")) base = 0.05;
  else if (s.includes("day-to-day")) base = -0.15;
  // Premium positions weigh more
  let posW = 1;
  if (pos === "QB") posW = 1.6;
  else if (pos === "WR" || pos === "RB" || pos === "TE") posW = 1.15;
  else if (pos === "OL" || pos === "CB" || pos === "EDGE" || pos === "S") posW = 1.05;
  return clamp01(Math.abs(base * posW)) * Math.sign(base || 1);
}

// ---------------------------------------------------------------------------
// Adapters (pure)
// ---------------------------------------------------------------------------

export function injuryObservations(
  rows: readonly InjuryRow[],
  side: "home" | "away",
  now: Date = new Date(),
): SignalObservation[] {
  return rows.map((r) => {
    const lean = injuryLean(r.reportStatus, r.position);
    const status = r.reportStatus ?? "unknown";
    return {
      family: "INJURY_AVAILABILITY" as SignalFamily,
      key: `injury:${r.playerName}:${r.week}`,
      fact: `${r.playerName} (${r.position ?? "?"}, ${r.team ?? side}) — ${status}${r.primaryInjury ? ` (${r.primaryInjury})` : ""}`,
      knownAt: iso(r.fetchedAt),
      origin: r.sourceId ?? "injuries",
      trust: 0.9,
      freshness: freshness(r.fetchedAt, now),
      lean: lean * (side === "home" ? 1 : -1),
      rights: "use-with-caution",
      tier: 1,
    };
  });
}

export function ngsObservations(
  rows: readonly NgsRow[],
  side: "home" | "away",
  now: Date = new Date(),
): SignalObservation[] {
  return rows.map((r) => {
    // Positive lean when the player is performing above expectation
    let lean = 0;
    const notes: string[] = [];
    if (r.cpoe != null) {
      lean += clamp01(r.cpoe / 10) * 0.4;
      notes.push(`CPOE ${r.cpoe > 0 ? "+" : ""}${r.cpoe.toFixed(1)}`);
    }
    if (r.avgSeparation != null) {
      lean += clamp01((r.avgSeparation - 2.5) / 2) * 0.25;
      notes.push(`sep ${r.avgSeparation.toFixed(2)}y`);
    }
    if (r.avgYacAboveExpectation != null) {
      lean += clamp01(r.avgYacAboveExpectation / 2) * 0.2;
      notes.push(`YAC+ ${r.avgYacAboveExpectation > 0 ? "+" : ""}${r.avgYacAboveExpectation.toFixed(2)}`);
    }
    if (r.rushYardsOverExpectedPerAtt != null) {
      lean += clamp01(r.rushYardsOverExpectedPerAtt / 1.5) * 0.25;
      notes.push(`RYOE/att ${r.rushYardsOverExpectedPerAtt > 0 ? "+" : ""}${r.rushYardsOverExpectedPerAtt.toFixed(2)}`);
    }
    if (r.pctShareIntendedAirYards != null) {
      lean += clamp01(r.pctShareIntendedAirYards) * 0.3;
      notes.push(`aDOT share ${(r.pctShareIntendedAirYards * 100).toFixed(0)}%`);
    }
    return {
      family: "PLAY_CHARTING" as SignalFamily,
      key: `ngs:${r.statType}:${r.playerName}:${r.week}`,
      fact: `NGS ${r.statType}: ${r.playerName} (${r.position ?? "?"}, ${r.team ?? side}) — ${notes.join(", ") || "tracking present"}`,
      knownAt: iso(r.fetchedAt),
      origin: r.sourceId ?? "next_gen_stats",
      trust: 0.88,
      freshness: freshness(r.fetchedAt, now),
      lean: (lean > 1 ? 1 : lean) * (side === "home" ? 1 : -1),
      rights: "use-with-caution",
      tier: 2,
    };
  });
}

export function playerStatObservations(
  rows: readonly PlayerGameStatRow[],
  side: "home" | "away",
  now: Date = new Date(),
): SignalObservation[] {
  return rows.map((r) => {
    const epa =
      (r.passingEpa ?? 0) + (r.rushingEpa ?? 0) + (r.receivingEpa ?? 0);
    const lean = clamp01(epa / 8) * (epa >= 0 ? 1 : -1);
    const usage: string[] = [];
    if (r.targetShare != null) usage.push(`tgt share ${(r.targetShare * 100).toFixed(0)}%`);
    if (r.fantasyPointsPpr != null) usage.push(`${r.fantasyPointsPpr.toFixed(1)} PPR`);
    if (r.attempts != null) usage.push(`${r.attempts} att`);
    if (r.carries != null) usage.push(`${r.carries} carries`);
    return {
      family: "SCHEME_TENDENCY" as SignalFamily,
      key: `player:${r.team ?? side}:${r.week}:${r.season}`,
      fact: `${r.team ?? side} vs ${r.opponent ?? "?"}: ${usage.join(", ") || "usage present"}${epa !== 0 ? `; EPA ${epa > 0 ? "+" : ""}${epa.toFixed(2)}` : ""}`,
      knownAt: iso(r.fetchedAt),
      origin: r.sourceId ?? "player_game_stats",
      trust: 0.8,
      freshness: freshness(r.fetchedAt, now),
      lean: lean * (side === "home" ? 1 : -1),
      rights: "cleared",
      tier: 2,
    };
  });
}

export function ratingsObservations(
  rows: readonly TeamEfficiencyRow[],
  side: "home" | "away",
  now: Date = new Date(),
): SignalObservation[] {
  return rows.map((r) => {
    const net = r.offEpaPerPlay - r.defEpaPerPlay;
    const lean = clamp01(net / 0.35) * (net >= 0 ? 1 : -1);
    return {
      family: "MARKET" as SignalFamily,
      key: `ratings:${r.team}:${r.season}:${r.week}`,
      fact: `${r.team} efficiency: off EPA/play ${r.offEpaPerPlay.toFixed(3)}, def allowed ${r.defEpaPerPlay.toFixed(3)} (net ${net > 0 ? "+" : ""}${net.toFixed(3)})`,
      knownAt: iso(r.fetchedAt),
      origin: r.sourceId ?? "team_game_efficiency",
      trust: 0.82,
      freshness: freshness(r.fetchedAt, now),
      lean: lean * (side === "home" ? 1 : -1),
      rights: "cleared",
      tier: 2,
    };
  });
}

export function weatherObservations(
  rows: readonly GameSignalRow[],
  now: Date = new Date(),
): SignalObservation[] {
  return rows
    .filter((r) => /weather|wind|temp|precip|rain|snow/i.test(`${r.sourceCategory} ${r.sourceName} ${r.signalKey}`))
    .map((r) => {
      const v = r.signalValue;
      const num = typeof v === "number" ? v : typeof v === "object" && v !== null ? Number((v as Record<string, unknown>).value ?? 0) : Number(v ?? 0);
      // Wind/temp extremes lean toward unders / lower scoring
      let lean = 0;
      if (/wind/i.test(r.signalKey)) lean = -clamp01((num - 10) / 20) * 0.5;
      else if (/temp/i.test(r.signalKey)) lean = num < 32 ? -0.25 : num > 90 ? -0.15 : 0;
      return {
        family: "WEATHER_TRAVEL" as SignalFamily,
        key: `weather:${r.signalKey}`,
        fact: `${r.sourceName}: ${r.signalKey} = ${String(v)}`,
        knownAt: iso(r.fetchedAt),
        origin: r.sourceName,
        trust: r.trustLevel ?? 0.75,
        freshness: freshness(r.fetchedAt, now),
        lean,
        rights: "cleared" as const,
        tier: 2,
      };
    });
}

export function gameSignalObservations(
  rows: readonly GameSignalRow[],
  now: Date = new Date(),
): SignalObservation[] {
  return rows
    .filter((r) => !/weather|wind|temp|precip|rain|snow/i.test(`${r.sourceCategory} ${r.sourceName} ${r.signalKey}`))
    .map((r) => {
      const fam: SignalFamily = /schedule/i.test(r.sourceCategory)
        ? "SCHEDULE_DENSITY"
        : /injury|avail/i.test(r.sourceCategory)
          ? "INJURY_AVAILABILITY"
          : /pace/i.test(r.sourceCategory)
            ? "SCHEME_TENDENCY"
            : "SOURCE_TRUST";
      return {
        family: fam,
        key: `signal:${r.signalKey}`,
        fact: `${r.sourceName}: ${r.signalKey} = ${JSON.stringify(r.signalValue)}`,
        knownAt: iso(r.fetchedAt),
        origin: r.sourceName,
        trust: r.trustLevel ?? 0.8,
        freshness: freshness(r.fetchedAt, now),
        rights: "cleared" as const,
        tier: 2,
      };
    });
}

export function snapCountObservations(
  rows: readonly SnapCountRow[],
  side: "home" | "away",
  now: Date = new Date(),
): SignalObservation[] {
  return rows.map((r) => {
    const pct = r.offensePct ?? r.defensePct ?? 0;
    const lean = clamp01(pct / 100) * 0.2; // high usage = mild positive context
    return {
      family: "SCHEME_TENDENCY" as SignalFamily,
      key: `snap:${r.playerName}:${r.week}`,
      fact: `${r.playerName} (${r.position ?? "?"}, ${r.team ?? side}) snap share ${pct.toFixed(0)}%`,
      knownAt: iso(r.fetchedAt),
      origin: r.sourceId ?? "snap_counts",
      trust: 0.85,
      freshness: freshness(r.fetchedAt, now),
      lean: lean * (side === "home" ? 1 : -1),
      rights: "cleared",
      tier: 2,
    };
  });
}

// ---------------------------------------------------------------------------
// Aggregate: every surface → one observation list
// ---------------------------------------------------------------------------

export interface AllSignalInputs {
  readonly homeInjuries?: readonly InjuryRow[];
  readonly awayInjuries?: readonly InjuryRow[];
  readonly homeNgs?: readonly NgsRow[];
  readonly awayNgs?: readonly NgsRow[];
  readonly homePlayerStats?: readonly PlayerGameStatRow[];
  readonly awayPlayerStats?: readonly PlayerGameStatRow[];
  readonly homeRatings?: readonly TeamEfficiencyRow[];
  readonly awayRatings?: readonly TeamEfficiencyRow[];
  readonly weather?: readonly GameSignalRow[];
  readonly gameSignals?: readonly GameSignalRow[];
  readonly homeSnaps?: readonly SnapCountRow[];
  readonly awaySnaps?: readonly SnapCountRow[];
  /** Market/line observations can be injected by the caller. */
  readonly extra?: readonly SignalObservation[];
  readonly now?: Date;
}

/**
 * Build the complete observation list from every available surface.
 * This is the "wire it all" step: nothing is deferred, nothing is optional
 * except that a missing surface simply contributes zero observations.
 */
export function allObservations(input: AllSignalInputs): SignalObservation[] {
  const now = input.now ?? new Date();
  const out: SignalObservation[] = [];
  out.push(...injuryObservations(input.homeInjuries ?? [], "home", now));
  out.push(...injuryObservations(input.awayInjuries ?? [], "away", now));
  out.push(...ngsObservations(input.homeNgs ?? [], "home", now));
  out.push(...ngsObservations(input.awayNgs ?? [], "away", now));
  out.push(...playerStatObservations(input.homePlayerStats ?? [], "home", now));
  out.push(...playerStatObservations(input.awayPlayerStats ?? [], "away", now));
  out.push(...ratingsObservations(input.homeRatings ?? [], "home", now));
  out.push(...ratingsObservations(input.awayRatings ?? [], "away", now));
  out.push(...weatherObservations(input.weather ?? [], now));
  out.push(...gameSignalObservations(input.gameSignals ?? [], now));
  out.push(...snapCountObservations(input.homeSnaps ?? [], "home", now));
  out.push(...snapCountObservations(input.awaySnaps ?? [], "away", now));
  out.push(...(input.extra ?? []));
  return out;
}

// ---------------------------------------------------------------------------
// modelProb — the missing piece for true Brier
// ---------------------------------------------------------------------------

/**
 * Compute a model probability for proof receipts.
 *
 * Combines the calibrated base (from stated confidence) with the situational
 * shift the reasoning spine produced. Never returns a bare stated confidence.
 * This is what should populate `pick_proof_receipts.modelProb` so Brier can
 * be computed against `marketFairProb`.
 */
export function computeModelProb(
  calibratedProb: number,
  situationalShift: number,
): number {
  // Guard against NaN / non-finite inputs — never invent certainty.
  const base = Number.isFinite(calibratedProb) ? calibratedProb : 0.5;
  const shift = Number.isFinite(situationalShift) ? situationalShift : 0;
  const p = base + shift * 0.25; // shift is already inside calibratedProb in reason()
  return clamp01(Math.min(0.95, Math.max(0.05, p)));
}

/**
 * Signal-presence flags for `pick_signal_snapshots` — wire these so the
 * coverage matrix stops showing zeros.
 */
export interface SignalPresence {
  readonly hadInjurySignal: boolean;
  readonly hadWeatherSignal: boolean;
  readonly hadNgsSignal: boolean;
  readonly hadRatingsSignal: boolean;
  readonly hadPlayerSignal: boolean;
  readonly hadPaceSignal: boolean;
  readonly hadOfficialsSignal: boolean;
  readonly hadOddsSignal: boolean;
  readonly hadLineMovementSignal: boolean;
  readonly hadRestSignal: boolean;
  readonly hadScheduleSignal: boolean;
  readonly hadAtsFormSignal: boolean;
  readonly hadH2HSignal: boolean;
}

export function signalPresence(observations: readonly SignalObservation[]): SignalPresence {
  const has = (fam: SignalFamily) => observations.some((o) => o.family === fam);
  const hasKey = (re: RegExp) => observations.some((o) => re.test(o.key) || re.test(o.fact));
  return {
    hadInjurySignal: has("INJURY_AVAILABILITY"),
    hadWeatherSignal: has("WEATHER_TRAVEL"),
    hadNgsSignal: hasKey(/^ngs:/),
    hadRatingsSignal: hasKey(/^ratings:/),
    hadPlayerSignal: hasKey(/^player:/),
    hadPaceSignal: hasKey(/pace/i),
    hadOfficialsSignal: hasKey(/official/i),
    hadOddsSignal: has("MARKET"),
    hadLineMovementSignal: hasKey(/line|movement/i),
    hadRestSignal: hasKey(/rest/i),
    hadScheduleSignal: has("SCHEDULE_DENSITY"),
    hadAtsFormSignal: hasKey(/ats|form/i),
    hadH2HSignal: hasKey(/h2h|head.to.head/i),
  };
}
