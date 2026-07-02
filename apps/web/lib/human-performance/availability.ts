/**
 * Human Availability Modifier — the conservative uncertainty multiplier.
 *
 * This is the ONLY object that touches the confidence band, and it can only
 * ever WIDEN it (or downgrade to watchlist/no-bet). There is no code path that
 * narrows a band from a human-performance signal. Every term is >= 0 and the
 * total is clamped to [0, MAX_BAND_WIDEN]. An official OUT short-circuits to
 * no-bet on player-dependent reads.
 *
 * Inputs are PUBLIC only: official injury designations (nflverse `injuries`),
 * NWS game weather, the venue's documented surface, plus optional public
 * corroboration flags (a line that moved on news; sources disagreeing). We
 * never assert a medical state — we say "availability uncertain per public
 * report" and widen.
 */

import {
  MAX_BAND_WIDEN,
  WATCHLIST_THRESHOLD,
  buildOutputBehavior,
  type AvailabilityDriver,
  type GseOutputBehavior,
  type HumanAvailabilityModifier,
  type ProvenanceTier,
  type Verdict,
} from "./types";
import { NFL_VENUE_ENV, type Surface } from "./environment";
import { loadNflverseInjuryReport, type ReportStatus } from "@/lib/nflverse/injury-report";
import { loadNflGameWeather } from "@/lib/weather/game-weather";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type InjuryDesignation = ReportStatus | "None";

export interface AvailabilityInputs {
  readonly playerId: string;
  readonly gameId?: string | null;
  /** Official designation only. "None" = no public flag. */
  readonly injuryStatus: InjuryDesignation;
  readonly primaryInjury?: string | null;
  readonly practiceStatus?: string | null;
  /** Days since the player's last game (workload/fatigue). null = unknown. */
  readonly daysRest?: number | null;
  readonly windMph?: number | null;
  readonly precipPct?: number | null;
  readonly tempF?: number | null;
  readonly surface?: Surface | null;
  readonly controlledRoof?: boolean | null;
  /** Depth-chart / role-change risk, 0..1. */
  readonly roleVolatility?: number;
  /** A betting line moved on the news — public corroboration the news matters. */
  readonly marketMovedOnNews?: boolean;
  /** Public reports disagree — always widen, never average into false precision. */
  readonly conflictingSources?: boolean;
  readonly asOf?: string;
}

// Coefficients from the design's §7 formula.
const W_INJURY = 0.4;
const W_WORKLOAD = 0.15;
const W_WEATHER = 0.15;
const W_ROLE = 0.1;
const W_MARKET = 0.1;
const W_CONFLICT = 0.1;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function injuryFactor(status: InjuryDesignation): number {
  switch (status) {
    case "Doubtful": return 1; // high
    case "Questionable": return 0.5; // medium
    case "Out": return 1; // handled as no-bet separately
    default: return 0; // None / Other
  }
}

/** Short rest widens; extra rest never narrows (floored at 0). */
function workloadFactor(daysRest: number | null | undefined): number {
  if (daysRest == null || !Number.isFinite(daysRest)) return 0;
  if (daysRest <= 4) return 1; // Thursday turnaround
  if (daysRest <= 6) return 0.5; // short week
  if (daysRest <= 7) return 0.1; // normal
  return 0; // extra rest is not a widening signal
}

/** Weather/surface stress, 0..1, from wind (dominant), precip, temperature extremity. */
function weatherFactor(input: AvailabilityInputs): number {
  if (input.controlledRoof) return 0; // controlled environment — weather doesn't apply
  const wind = input.windMph;
  const precip = input.precipPct;
  const temp = input.tempF;
  if (wind == null && precip == null && temp == null) return 0;
  const windComp = wind == null ? 0 : clamp01((wind - 8) / 22); // 8mph baseline → 30mph max
  const precipComp = precip == null ? 0 : clamp01(precip / 100);
  let tempComp = 0;
  if (temp != null) {
    if (temp <= 20) tempComp = clamp01((20 - temp) / 30); // hard freeze
    else if (temp >= 92) tempComp = clamp01((temp - 92) / 20); // extreme heat
  }
  return clamp01(0.6 * windComp + 0.25 * precipComp + 0.15 * tempComp);
}

/**
 * Compute the modifier. Pure, conservative, capped, only-widens. An official
 * OUT short-circuits to no-bet with the band at its cap.
 */
export function computeAvailabilityModifier(input: AvailabilityInputs): HumanAvailabilityModifier {
  const asOf = input.asOf ?? new Date().toISOString();
  const drivers: AvailabilityDriver[] = [];

  const isOut = input.injuryStatus === "Out";

  // injury term
  const injF = injuryFactor(input.injuryStatus);
  if (injF > 0) {
    drivers.push({
      key: "injuryStatus",
      weight: W_INJURY * injF,
      tier: "official",
      note: isOut
        ? `Official OUT designation${input.primaryInjury ? ` (${input.primaryInjury})` : ""}. Player-dependent reads go to no-bet.`
        : `Official ${input.injuryStatus} designation${input.primaryInjury ? ` (${input.primaryInjury})` : ""} per public report: availability uncertain, band widened.`,
    });
  }

  const workF = workloadFactor(input.daysRest);
  if (workF > 0) drivers.push({ key: "workloadFatigue", weight: W_WORKLOAD * workF, tier: "official", note: `${input.daysRest} days since last game: short-rest workload.` });

  const weatherF = weatherFactor(input);
  if (weatherF > 0) drivers.push({ key: "surfaceWeatherStress", weight: W_WEATHER * weatherF, tier: "official", note: `Open-air conditions (wind/precip/temp) raise variance${input.surface ? ` on ${input.surface}` : ""}.` });

  const roleF = clamp01(input.roleVolatility ?? 0);
  if (roleF > 0) drivers.push({ key: "roleVolatility", weight: W_ROLE * roleF, tier: "inferred", note: "Depth-chart / role-change risk." });

  if (input.marketMovedOnNews) drivers.push({ key: "marketMoveAfterNews", weight: W_MARKET, tier: "modeled", note: "A betting line moved on the news: public corroboration the change matters." });

  const conflict = Boolean(input.conflictingSources);
  if (conflict) drivers.push({ key: "conflictingSourcePenalty", weight: W_CONFLICT, tier: "inferred", note: "Public reports disagree. We widen and surface the conflict rather than average it." });

  const raw = drivers.reduce((sum, d) => sum + d.weight, 0);
  const bandWidenPct = Math.max(0, Math.min(MAX_BAND_WIDEN, raw));

  let recommendation: Verdict;
  if (isOut) recommendation = "no-bet";
  else if (bandWidenPct >= WATCHLIST_THRESHOLD || conflict) recommendation = "watchlist";
  else recommendation = "play";

  // Confidence in the modifier itself = how much real public signal we have.
  let confidence = 0.4;
  if (input.injuryStatus !== "None") confidence += 0.2;
  if (input.windMph != null || input.precipPct != null || input.tempF != null || input.controlledRoof) confidence += 0.15;
  if (input.daysRest != null) confidence += 0.15;
  if (input.marketMovedOnNews) confidence += 0.1;
  confidence = clamp01(confidence);

  const tier: ProvenanceTier = isOut ? "official" : drivers.length === 0 ? "official" : "modeled";

  return {
    playerId: input.playerId,
    gameId: input.gameId ?? null,
    asOf,
    bandWidenPct: Math.round(bandWidenPct * 1000) / 1000,
    recommendation,
    drivers,
    confidence,
    tier,
  };
}

/** The mandatory disclosure contract for a computed modifier. */
export function availabilityOutputBehavior(
  m: HumanAvailabilityModifier,
  playerLabel: string,
): GseOutputBehavior | null {
  const pct = Math.round(m.bandWidenPct * 100);
  const top = m.drivers.slice().sort((a, b) => b.weight - a.weight)[0];

  const whatChanged =
    m.drivers.length === 0
      ? `No public availability or conditions flags for ${playerLabel}.`
      : `${playerLabel}: ${m.drivers.map((d) => d.note).join(" ")}`;

  const whyItMatters =
    m.recommendation === "no-bet"
      ? "An official OUT removes player-dependent reads from play."
      : pct > 0
        ? `These public signals widen the confidence band by ~${pct}%.`
        : "Conditions are clear: no band widening from this layer.";

  const whatCouldBreak =
    m.recommendation === "no-bet"
      ? "A reversal of the official designation (activated / surprise active) reopens the read."
      : top?.key === "surfaceWeatherStress"
        ? "A calmer forecast removes the weather stress and narrows the read back."
        : top?.key === "injuryStatus"
          ? "A Friday full-practice upgrade reduces the availability uncertainty."
          : top?.key === "conflictingSourcePenalty"
            ? "A single confirmed report resolves the source conflict."
            : "New public information (practice report, depth chart, line move) would update this.";

  return buildOutputBehavior({
    whatChanged,
    whyItMatters,
    confidence: m.confidence,
    whatCouldBreakTheRead: whatCouldBreak,
    provenanceTier: m.tier,
    verdict: m.recommendation,
  });
}

export interface AvailabilityResult {
  readonly generatedAt: string;
  readonly status: "ok" | "source-error";
  readonly playerLabel: string;
  readonly team: string | null;
  readonly modifier: HumanAvailabilityModifier | null;
  readonly behavior: GseOutputBehavior | null;
  readonly error: string | null;
}

function weatherForTeam(venues: readonly { team: string; windMph: number | null; precipPct: number | null; tempF: number | null }[], team: string) {
  return venues.find((v) => v.team === team || v.team.split("/").includes(team)) ?? null;
}

/**
 * Orchestrated load: resolve a player's official designation + their team's
 * public game weather + venue surface, then compute the modifier. Read-only,
 * conservative. Honest source-error / empty states; never a medical claim.
 */
export async function loadAvailabilityModifier({
  player,
  team,
  gameId = null,
  daysRest = null,
  roleVolatility = 0,
  marketMovedOnNews = false,
  conflictingSources = false,
  fetcher = fetch,
}: {
  player: string;
  team?: string | null;
  gameId?: string | null;
  daysRest?: number | null;
  roleVolatility?: number;
  marketMovedOnNews?: boolean;
  conflictingSources?: boolean;
  fetcher?: FetchLike;
}): Promise<AvailabilityResult> {
  const generatedAt = new Date().toISOString();
  const name = player.trim();
  if (!name) {
    return { generatedAt, status: "ok", playerLabel: "", team: team ?? null, modifier: null, behavior: null, error: "Enter a player name." };
  }

  try {
    const [injuries, weather] = await Promise.all([
      loadNflverseInjuryReport({ fetcher }),
      loadNflGameWeather({ fetcher }),
    ]);

    if (injuries.status === "source-error") {
      return { generatedAt, status: "source-error", playerLabel: name, team: team ?? null, modifier: null, behavior: null, error: injuries.error ?? "injury feed unavailable" };
    }

    const lc = name.toLowerCase();
    const matches = injuries.rows.filter((r) => r.playerName.toLowerCase() === lc);
    const row = (team ? matches.find((r) => r.team.toUpperCase() === team.toUpperCase()) : undefined) ?? matches[0] ?? null;
    const resolvedTeam = (row?.team ?? team ?? null)?.toUpperCase() ?? null;

    const venueEnv = resolvedTeam ? NFL_VENUE_ENV[resolvedTeam] : undefined;
    const wx = resolvedTeam && weather.status === "live" ? weatherForTeam(weather.venues, resolvedTeam) : null;

    const modifier = computeAvailabilityModifier({
      playerId: name,
      gameId,
      injuryStatus: row?.reportStatus ?? "None",
      primaryInjury: row?.primaryInjury ?? null,
      practiceStatus: row?.practiceStatus ?? null,
      daysRest,
      windMph: wx?.windMph ?? null,
      precipPct: wx?.precipPct ?? null,
      tempF: wx?.tempF ?? null,
      surface: venueEnv?.surface ?? null,
      controlledRoof: venueEnv ? venueEnv.controlledRoof : null,
      roleVolatility,
      marketMovedOnNews,
      conflictingSources,
      asOf: generatedAt,
    });

    return {
      generatedAt,
      status: "ok",
      playerLabel: name,
      team: resolvedTeam,
      modifier,
      behavior: availabilityOutputBehavior(modifier, name),
      error: null,
    };
  } catch (error) {
    return { generatedAt, status: "source-error", playerLabel: name, team: team ?? null, modifier: null, behavior: null, error: error instanceof Error ? error.message : "UNKNOWN" };
  }
}

export interface RosterAvailabilityRow {
  readonly player: string;
  readonly team: string | null;
  readonly modifier: HumanAvailabilityModifier;
  readonly behavior: GseOutputBehavior | null;
}

export interface RosterAvailabilityResult {
  readonly generatedAt: string;
  readonly status: "ok" | "source-error";
  readonly rows: readonly RosterAvailabilityRow[];
  readonly error: string | null;
}

/**
 * Batch availability for a whole roster — loads the public injury feed + NWS
 * weather ONCE and computes the conservative modifier for each real player.
 * This is what turns a synced Sleeper roster into a real availability read
 * (official designations + game weather), never a medical claim.
 */
export async function loadRosterAvailability({
  players,
  fetcher = fetch,
  timeoutMs = 15000,
}: {
  players: readonly { readonly name: string; readonly team?: string | null }[];
  fetcher?: FetchLike;
  timeoutMs?: number;
}): Promise<RosterAvailabilityResult> {
  const generatedAt = new Date().toISOString();
  const clean = players.filter((p) => p.name && p.name.trim());
  if (clean.length === 0) {
    return { generatedAt, status: "ok", rows: [], error: null };
  }

  try {
    const [injuries, weather] = await Promise.all([
      loadNflverseInjuryReport({ fetcher, timeoutMs }),
      loadNflGameWeather({ fetcher, timeoutMs }),
    ]);
    if (injuries.status === "source-error") {
      return { generatedAt, status: "source-error", rows: [], error: injuries.error ?? "injury feed unavailable" };
    }
    const weatherLive = weather.status === "live";

    const rows = clean.map((p): RosterAvailabilityRow => {
      const name = p.name.trim();
      const lc = name.toLowerCase();
      const matches = injuries.rows.filter((r) => r.playerName.toLowerCase() === lc);
      const row = (p.team ? matches.find((r) => r.team.toUpperCase() === p.team!.toUpperCase()) : undefined) ?? matches[0] ?? null;
      const resolvedTeam = (row?.team ?? p.team ?? null)?.toUpperCase() ?? null;
      const venueEnv = resolvedTeam ? NFL_VENUE_ENV[resolvedTeam] : undefined;
      const wx = resolvedTeam && weatherLive ? weatherForTeam(weather.venues, resolvedTeam) : null;

      const modifier = computeAvailabilityModifier({
        playerId: name,
        injuryStatus: row?.reportStatus ?? "None",
        primaryInjury: row?.primaryInjury ?? null,
        practiceStatus: row?.practiceStatus ?? null,
        windMph: wx?.windMph ?? null,
        precipPct: wx?.precipPct ?? null,
        tempF: wx?.tempF ?? null,
        surface: venueEnv?.surface ?? null,
        controlledRoof: venueEnv ? venueEnv.controlledRoof : null,
        asOf: generatedAt,
      });
      return { player: name, team: resolvedTeam, modifier, behavior: availabilityOutputBehavior(modifier, name) };
    });

    // Most actionable first: no-bet, then watchlist, then by band width.
    const rank: Record<string, number> = { "no-bet": 0, watchlist: 1, play: 2 };
    const sorted = [...rows].sort(
      (a, b) => (rank[a.modifier.recommendation]! - rank[b.modifier.recommendation]!) || (b.modifier.bandWidenPct - a.modifier.bandWidenPct),
    );

    return { generatedAt, status: "ok", rows: sorted, error: null };
  } catch (error) {
    return { generatedAt, status: "source-error", rows: [], error: error instanceof Error ? error.message : "UNKNOWN" };
  }
}
