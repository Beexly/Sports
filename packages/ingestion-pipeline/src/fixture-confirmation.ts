/**
 * Fixture confirmation guard at generation time (ledger C-111).
 *
 * On 2026-09-05 generate-signal-slate wrote MONEYLINE picks on three NCAAF game
 * rows created from May listings whose kickoff had moved; ESPN's public
 * scoreboard for that date listed none of them. A game row's own commenceTime
 * is NOT proof that a contest takes place that day. Before any pick is
 * generated or refreshed for a game, the game must be listed on the day's free
 * ESPN public scoreboard for its sport: an event matching both team names whose
 * date falls on the game's UTC day or the adjacent US-Eastern day (ESPN dates
 * are Eastern).
 *
 * Fail-closed: when the scoreboard cannot be fetched, the caller skips pick
 * generation for that sport this cycle (the cadence is 15 minutes, so the cost
 * is one cycle). Pure helpers are exported for unit tests; the class caches one
 * merged board per sport per instance, so a run adds at most one free request
 * per ESPN group per sport (two for college football: FBS and FCS; one for
 * every other sport).
 *
 * Groups: ESPN's default college boards are partial (FBS only for football, a
 * featured page for men's basketball, and a multi-day range without `groups`
 * returns HTTP 404 for basketball). Absence from the board is evidence here, so
 * the guard mirrors the settlement adapter's group table
 * (`apps/web/lib/data-sources/free-adapters/espn-scores.ts`
 * `ESPN_SCOREBOARD_GROUPS`; this package cannot import apps/web) and requires
 * EVERY group request to succeed before a game may read as not listed.
 *
 * Reuses the existing free ESPN scoreboard parser (`parseEspnScoreboardForSeed`)
 * and the package's team-name matcher (`matchTeamSide`, the same normalisation
 * the free settlement path uses). No new matcher, no keys, facts only.
 */

import {
  parseEspnScoreboardForSeed,
  SHORT_TO_ODDS_SPORT,
  ESPN_SCOREBOARD_LIMIT,
  type EspnSeedGame,
  type ShortSportKey,
} from "@sports/data-ingestion";
import { matchTeamSide, PREFIX_MATCH_SPORT_KEYS } from "./game-identity.js";

/** A row older than this must re-confirm date and opponent before any pick. */
export const FIXTURE_RECONFIRM_ROW_AGE_MS = 30 * 24 * 60 * 60 * 1000;
/** ... when its kickoff is within this horizon. */
export const FIXTURE_RECONFIRM_HORIZON_MS = 48 * 60 * 60 * 1000;
/** ESPN clock differing from ours by more than this corrects the row's commenceTime. */
export const FIXTURE_TIME_CORRECTION_MIN_MS = 15 * 60 * 1000;

/**
 * ESPN `groups` (division) selectors that widen a board beyond its default;
 * mirrors `ESPN_SCOREBOARD_GROUPS` in the free settlement adapter (measured
 * live 2026-09-05/06): college football defaults to FBS (`80`), `81` adds FCS;
 * men's college basketball needs `50` for all of Division I. Sports absent here
 * return a complete default board with one request.
 */
export const ESPN_FIXTURE_GROUPS: Partial<Record<ShortSportKey, readonly string[]>> = {
  ncaaf: ["80", "81"],
  ncaab: ["50"],
};

/** The group requests covering a sport's full board (one default request when none). */
export function espnFixtureGroups(short: ShortSportKey): readonly (string | undefined)[] {
  const groups = ESPN_FIXTURE_GROUPS[short];
  return groups && groups.length > 0 ? groups : [undefined];
}

export type FixtureProbe = {
  readonly id: string;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly commenceTime: Date;
  /** Row creation time; absent or null means "unknown", which never triggers a correction. */
  readonly createdAt?: Date | null;
};

export type FixtureConfirmation =
  | {
      readonly status: "confirmed";
      readonly event: EspnSeedGame;
      /**
       * Non-null only for a row that required re-confirmation (older than 30 days,
       * kickoff within 48h) whose ESPN clock differs by more than 15 minutes.
       */
      readonly correctedCommenceTime: Date | null;
    }
  | { readonly status: "not_listed" };

export type FixtureBatchResult =
  | {
      readonly status: "ok";
      readonly byGameId: ReadonlyMap<string, FixtureConfirmation>;
      readonly eventsOnBoard: number;
    }
  | { readonly status: "fetch_failed"; readonly error: string }
  | { readonly status: "unsupported_sport" };

export type FixtureScoreboardFetch =
  | { readonly ok: true; readonly events: readonly EspnSeedGame[] }
  | { readonly ok: false; readonly error: string };

/** Sport.key -> free ESPN spine short key; null when ESPN has no board for it. */
export function espnShortForSportKey(sportKey: string): ShortSportKey | null {
  for (const short of Object.keys(SHORT_TO_ODDS_SPORT) as ShortSportKey[]) {
    if (SHORT_TO_ODDS_SPORT[short].key === sportKey) return short;
  }
  return null;
}

const EASTERN_DATE = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function utcDateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function easternDateKey(d: Date): string {
  let y = "";
  let m = "";
  let day = "";
  for (const part of EASTERN_DATE.formatToParts(d)) {
    if (part.type === "year") y = part.value;
    else if (part.type === "month") m = part.value;
    else if (part.type === "day") day = part.value;
  }
  return `${y}${m}${day}`;
}

/**
 * YYYYMMDD keys a contest at `d` can be listed under: its UTC day and its
 * US-Eastern day (identical for daytime kickoffs, two keys for late games).
 */
export function fixtureDateKeys(d: Date): readonly string[] {
  const utc = utcDateKey(d);
  const eastern = easternDateKey(d);
  return utc === eastern ? [utc] : [utc, eastern];
}

/** ESPN `dates=` value covering every probe: one key, or `min-max` (range). */
export function scoreboardDatesParam(probes: readonly FixtureProbe[]): string | null {
  const keys = new Set<string>();
  for (const p of probes) {
    if (Number.isNaN(p.commenceTime.getTime())) continue;
    for (const k of fixtureDateKeys(p.commenceTime)) keys.add(k);
  }
  if (keys.size === 0) return null;
  const sorted = [...keys].sort();
  const min = sorted[0]!;
  const max = sorted[sorted.length - 1]!;
  return min === max ? min : `${min}-${max}`;
}

function teamsMatch(probe: FixtureProbe, ev: EspnSeedGame, allowPrefix: boolean): boolean {
  const aligned =
    matchTeamSide(probe.homeTeamName, ev.homeTeamName, allowPrefix) !== null &&
    matchTeamSide(probe.awayTeamName, ev.awayTeamName, allowPrefix) !== null;
  if (aligned) return true;
  // A feed may carry the pair the other way round; the contest is the same.
  return (
    matchTeamSide(probe.homeTeamName, ev.awayTeamName, allowPrefix) !== null &&
    matchTeamSide(probe.awayTeamName, ev.homeTeamName, allowPrefix) !== null
  );
}

/**
 * The scoreboard event for this probe: same two teams AND a shared date key.
 * Several candidates (a baseball doubleheader) resolve to the nearest clock.
 * Prefix (city-only) matching follows the identity module's per-sport gate;
 * college keys stay exact-only so "Washington" never confirms "Washington State".
 */
export function findListedFixture(
  probe: FixtureProbe,
  events: readonly EspnSeedGame[],
  sportKey: string,
): EspnSeedGame | null {
  const allowPrefix = PREFIX_MATCH_SPORT_KEYS.has(sportKey);
  const probeKeys = new Set(fixtureDateKeys(probe.commenceTime));
  let best: EspnSeedGame | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const ev of events) {
    if (!fixtureDateKeys(ev.commenceTime).some((k) => probeKeys.has(k))) continue;
    if (!teamsMatch(probe, ev, allowPrefix)) continue;
    const delta = Math.abs(ev.commenceTime.getTime() - probe.commenceTime.getTime());
    if (delta < bestDelta) {
      best = ev;
      bestDelta = delta;
    }
  }
  return best;
}

/** Row created more than 30 days ago whose kickoff is within the next 48 hours. */
export function requiresReconfirmation(probe: FixtureProbe, now: Date): boolean {
  if (!probe.createdAt) return false;
  if (now.getTime() - probe.createdAt.getTime() < FIXTURE_RECONFIRM_ROW_AGE_MS) return false;
  return probe.commenceTime.getTime() - now.getTime() <= FIXTURE_RECONFIRM_HORIZON_MS;
}

/**
 * ESPN's clock for a confirmed, re-confirmed row when it differs from ours by
 * more than 15 minutes; null otherwise. This is a schedule correction taken
 * from a free, cleared public source (facts only: the listed kickoff of a
 * contest we already carry), not a fabricated value: the row keeps its teams
 * and identity, only its stale kickoff moves to what ESPN publishes.
 */
export function commenceTimeCorrection(
  probe: FixtureProbe,
  espnCommenceTime: Date,
  now: Date,
): Date | null {
  if (!requiresReconfirmation(probe, now)) return null;
  const delta = Math.abs(espnCommenceTime.getTime() - probe.commenceTime.getTime());
  return delta > FIXTURE_TIME_CORRECTION_MIN_MS ? espnCommenceTime : null;
}

/** Pure: confirm every probe against an already-fetched board. */
export function confirmFixturesAgainstScoreboard(
  probes: readonly FixtureProbe[],
  events: readonly EspnSeedGame[],
  sportKey: string,
  now: Date,
): ReadonlyMap<string, FixtureConfirmation> {
  const out = new Map<string, FixtureConfirmation>();
  for (const probe of probes) {
    const event = findListedFixture(probe, events, sportKey);
    if (!event) {
      out.set(probe.id, { status: "not_listed" });
      continue;
    }
    out.set(probe.id, {
      status: "confirmed",
      event,
      correctedCommenceTime: commenceTimeCorrection(probe, event.commenceTime, now),
    });
  }
  return out;
}

/** One log line per skipped game: id, names and our date. */
export function formatFixtureLine(probe: FixtureProbe): string {
  return (
    `game ${probe.id} "${probe.awayTeamName}" at "${probe.homeTeamName}" ` +
    `${probe.commenceTime.toISOString()}`
  );
}

async function fetchFixtureScoreboardGroup(
  short: ShortSportKey,
  dates: string,
  group: string | undefined,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<FixtureScoreboardFetch> {
  const meta = SHORT_TO_ODDS_SPORT[short];
  const params = new URLSearchParams();
  params.set("dates", dates);
  params.set("limit", String(ESPN_SCOREBOARD_LIMIT));
  if (group !== undefined) params.set("groups", group);
  const url = `https://site.api.espn.com/apis/site/v2/sports/${meta.espnPath}/scoreboard?${params.toString()}`;
  const label = group === undefined ? `espn ${short} ${dates}` : `espn ${short} ${dates} groups=${group}`;
  try {
    const res = await fetchImpl(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return { ok: false, error: `${label} HTTP ${res.status}` };
    const body = (await res.json()) as Parameters<typeof parseEspnScoreboardForSeed>[1];
    return { ok: true, events: parseEspnScoreboardForSeed(short, body) };
  } catch (err) {
    return {
      ok: false,
      error: `${label}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * The free ESPN scoreboard for a sport over a `dates=` value (single day or
 * `min-max` range, both accepted by the public endpoint): one request per
 * ESPN group the sport needs (`espnFixtureGroups`), events merged and deduped
 * by externalId. Absence from this board is treated as evidence, so a failure
 * of ANY group request fails the whole fetch (a missing division must never
 * read as "fixture not found"). Same host, path table, limit and parser as
 * the schedule seed.
 */
export async function fetchFixtureScoreboard(
  short: ShortSportKey,
  dates: string,
  opts?: { readonly fetchImpl?: typeof fetch; readonly timeoutMs?: number },
): Promise<FixtureScoreboardFetch> {
  const fetchImpl = opts?.fetchImpl ?? fetch;
  const timeoutMs = opts?.timeoutMs ?? 12_000;
  const byId = new Map<string, EspnSeedGame>();
  for (const group of espnFixtureGroups(short)) {
    const part = await fetchFixtureScoreboardGroup(short, dates, group, fetchImpl, timeoutMs);
    if (!part.ok) return part;
    for (const ev of part.events) {
      if (!byId.has(ev.externalId)) byId.set(ev.externalId, ev);
    }
  }
  return { ok: true, events: [...byId.values()] };
}

type CachedBoard = {
  readonly minKey: string;
  readonly maxKey: string;
  readonly result: FixtureScoreboardFetch;
};

function splitDates(dates: string): { minKey: string; maxKey: string } {
  const [a, b] = dates.split("-");
  return { minKey: a!, maxKey: b ?? a! };
}

/**
 * Per-run confirmer. Caches the merged (all groups) board per sport; a later
 * batch whose dates fall inside the cached range reuses it, so a run adds at
 * most one free request per group per sport (a wider later batch widens the
 * range once).
 */
export class FixtureConfirmer {
  private readonly boards = new Map<ShortSportKey, CachedBoard>();
  private readonly fetchImpl: typeof fetch | undefined;
  private readonly timeoutMs: number | undefined;
  private readonly now: Date;

  constructor(opts?: {
    readonly fetchImpl?: typeof fetch;
    readonly timeoutMs?: number;
    readonly now?: Date;
  }) {
    this.fetchImpl = opts?.fetchImpl;
    this.timeoutMs = opts?.timeoutMs;
    this.now = opts?.now ?? new Date();
  }

  private async board(short: ShortSportKey, dates: string): Promise<FixtureScoreboardFetch> {
    const want = splitDates(dates);
    const cached = this.boards.get(short);
    if (cached && cached.minKey <= want.minKey && cached.maxKey >= want.maxKey) {
      return cached.result;
    }
    const minKey = cached && cached.minKey < want.minKey ? cached.minKey : want.minKey;
    const maxKey = cached && cached.maxKey > want.maxKey ? cached.maxKey : want.maxKey;
    const result = await fetchFixtureScoreboard(
      short,
      minKey === maxKey ? minKey : `${minKey}-${maxKey}`,
      { fetchImpl: this.fetchImpl, timeoutMs: this.timeoutMs },
    );
    this.boards.set(short, { minKey, maxKey, result });
    return result;
  }

  /** Confirm every probe of one sport against that sport's board (one fetch). */
  async confirmBatch(
    sportKey: string,
    probes: readonly FixtureProbe[],
  ): Promise<FixtureBatchResult> {
    const short = espnShortForSportKey(sportKey);
    if (!short) return { status: "unsupported_sport" };
    const dates = scoreboardDatesParam(probes);
    if (!dates) return { status: "ok", byGameId: new Map(), eventsOnBoard: 0 };
    const board = await this.board(short, dates);
    if (!board.ok) return { status: "fetch_failed", error: board.error };
    return {
      status: "ok",
      byGameId: confirmFixturesAgainstScoreboard(probes, board.events, sportKey, this.now),
      eventsOnBoard: board.events.length,
    };
  }
}
