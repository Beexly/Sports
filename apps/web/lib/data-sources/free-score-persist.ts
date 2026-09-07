/**
 * Persist free scores into Game rows (team+date match).
 *
 * Does not invent games — only updates existing rows when a free final matches.
 * Used so free path can move resultFetched without THE_ODDS_API_KEY.
 *
 * Law: oddsApiRequired=false · refuse-default · no score overwrite with null.
 *
 * Date-targets ESPN/secondary boards from pending game commence days (undated
 * boards are "now" only and starve historical rows). Matching uses the same
 * nickname/alias expansion as free settlement.
 *
 * Also records an honest IngestionRun SUCCESS when the persist cycle completes
 * so /api/health recovers under free mode.
 */

import { db } from "@sports/db";
import { SUPPORTED_SPORTS } from "@sports/data-ingestion";
import { fetchScoresMultiSource } from "./multi-source-scores";
import {
  fetchHenrygdScoreboard,
  HENRYGD_PATHS,
  type NcaaGame,
} from "./free-adapters/henrygd-ncaa";
import type { NormalizedGame } from "./free-adapters/espn-scores";
import type { Sport } from "./source-router";
import {
  buildTrustedFinals,
  expandTeamMatchTokens,
  finalMatchesNearestFixture,
  MAX_KICKOFF_DRIFT_MS,
  nearestByKickoff,
  teamTokensMatch,
  type TrustedFinal,
} from "./free-settlement";
import { uniqueScoreboardDates } from "./settlement-score-dates";
import { recordFreeIngestionRun } from "./free-ingestion-run";
import { checkClearance } from "@/lib/scraping/clearance-engine";

const ODDS_KEY_TO_FREE: Record<string, Sport> = {
  americanfootball_nfl: "nfl",
  americanfootball_ncaaf: "ncaaf",
  basketball_nba: "nba",
  basketball_ncaab: "ncaab",
  baseball_mlb: "mlb",
  icehockey_nhl: "nhl",
  soccer_usa_mls: "mls",
};

export type FreeScorePersistSportResult = {
  sport: string;
  freeSport: Sport | null;
  ok: boolean;
  finals: number;
  gamesMatched: number;
  gamesUpdated: number;
  error?: string;
};

export type FreeScorePersistResult = {
  path: "free-score-persist";
  oddsApiRequired: false;
  elapsedMs: number;
  sports: FreeScorePersistSportResult[];
  gamesUpdated: number;
  ingestionRunId?: string | null;
};

function sideTokens(side: { name: string; abbr: string }): string[] {
  return [
    ...expandTeamMatchTokens(side.name),
    ...expandTeamMatchTokens(side.abbr),
  ].filter(Boolean);
}

function finalMatchesGame(
  f: TrustedFinal,
  home: string,
  away: string,
): { homeScore: number; awayScore: number } | null {
  const homeTok = expandTeamMatchTokens(home);
  const awayTok = expandTeamMatchTokens(away);
  const fHome = sideTokens(f.home);
  const fAway = sideTokens(f.away);
  const homeOnHome = homeTok.some((t) => fHome.some((ft) => teamTokensMatch(t, ft)));
  const awayOnAway = awayTok.some((t) => fAway.some((ft) => teamTokensMatch(t, ft)));
  if (homeOnHome && awayOnAway) {
    return { homeScore: f.home.score, awayScore: f.away.score };
  }
  const homeOnAway = homeTok.some((t) => fAway.some((ft) => teamTokensMatch(t, ft)));
  const awayOnHome = awayTok.some((t) => fHome.some((ft) => teamTokensMatch(t, ft)));
  if (homeOnAway && awayOnHome) {
    return { homeScore: f.away.score, awayScore: f.home.score };
  }
  return null;
}

/**
 * GSE-SEC-050: loadHenry fetches henrygd-ncaa which is NOT registered in
 * source-rights-registry.ts (candidates list, inMainRegistry=false).
 * A runtime checkClearance must gate the fetch — deny blocks before any
 * network call.
 */
async function loadHenry(free: Sport): Promise<readonly NcaaGame[]> {
  // GSE-SEC-050: gate before fetch — henrygd-ncaa has no rights-registry row.
  const clearance = checkClearance({
    source_id: "henrygd-ncaa",
    mode: "public_logged_off_fact_extract",
    tool_id: "fetch-native",
    intents: ["storage", "derived_analytics"],
  });
  if (!clearance.allowed) {
    return [];
  }
  try {
    if (free === "ncaaf") return await fetchHenrygdScoreboard(HENRYGD_PATHS.cfb);
    if (free === "ncaab") return await fetchHenrygdScoreboard(HENRYGD_PATHS.mbb);
  } catch {
    return [];
  }
  return [];
}

/**
 * For each sport: fetch free finals, match pending/incomplete games in DB, stamp scores.
 * Skips DISPUTED finals. Prefer CONFIRMED then SINGLE_SOURCE.
 */
export async function persistFreeScores(options?: {
  sportKey?: string | null;
}): Promise<FreeScorePersistResult> {
  const started = Date.now();
  const sports = options?.sportKey
    ? SUPPORTED_SPORTS.filter((s) => s.key === options.sportKey)
    : [...SUPPORTED_SPORTS];

  const out: FreeScorePersistSportResult[] = [];
  let gamesUpdated = 0;

  for (const sport of sports) {
    const freeSport = ODDS_KEY_TO_FREE[sport.key] ?? null;
    if (!freeSport) {
      out.push({
        sport: sport.key,
        freeSport: null,
        ok: true,
        finals: 0,
        gamesMatched: 0,
        gamesUpdated: 0,
      });
      continue;
    }

    try {
      // Look at recent games not yet fully result-fetched (load first for date keys)
      const since = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);
      const games = await db.game.findMany({
        where: {
          sport: { key: sport.key },
          commenceTime: { gte: since },
          OR: [
            { resultFetched: false },
            { status: { in: ["SCHEDULED", "LIVE"] } },
            { homeScore: null },
          ],
        },
        select: {
          id: true,
          homeTeamName: true,
          awayTeamName: true,
          commenceTime: true,
          homeScore: true,
          awayScore: true,
          status: true,
        },
        take: 300,
      });

      const { espnKeys, isoKeys } = uniqueScoreboardDates(
        games.map((g) => g.commenceTime),
        { maxDays: 21 },
      );

      const multi = await fetchScoresMultiSource(freeSport, {
        ...(espnKeys.length > 0
          ? { espnDateKeys: espnKeys, isoDateKeys: isoKeys }
          : {}),
      });
      const espn: readonly NormalizedGame[] = multi.games;
      const henry = await loadHenry(freeSport);
      const finals = buildTrustedFinals(espn, henry).filter(
        (f) => f.confirmation !== "DISPUTED",
      );

      let matched = 0;
      let updated = 0;

      const nowMs = Date.now();

      for (const g of games) {
        // A game that has not started cannot have a final score. Without this
        // the ±48h candidate window below, which matches on team names only,
        // maps an earlier meeting's final onto a LATER unplayed game between
        // the same two clubs — an MLB series plays the same matchup on
        // consecutive days, so yesterday's final matched today's and
        // tomorrow's scheduled game and the picks on them were graded WIN/LOSS
        // before first pitch. Measured on production 2026-09-06: 5 games with
        // a future commenceTime carried status FINAL, and 87 published picks
        // had settledAt earlier than their game's commenceTime. Nothing
        // downstream caught it: SCORE_MISMATCH_CROSS_PATH below only refuses
        // to overwrite an EXISTING final with a different one, and a pick
        // graded off a phantom score is not overdue, so the settlement health
        // counters read clean. Publishing a graded result for a game nobody
        // has played is the one thing this product's premise forbids.
        if (g.commenceTime.getTime() > nowMs) {
          continue;
        }

        const day = g.commenceTime.toISOString().slice(0, 10);
        const d0 = Date.parse(day);
        const inWindow = finals.filter((f) => {
          const d1 = Date.parse(f.date.slice(0, 10));
          if (!Number.isFinite(d0) || !Number.isFinite(d1)) return false;
          return Math.abs(d0 - d1) <= 36e5 * 48; // ~2 days (TZ edge)
        });

        // Every final in the window that names these two teams — ALL of them,
        // not the first one the feed happened to yield. In a Fri/Sat/Sun series
        // the ±48h tolerance holds up to three completed finals for the same
        // matchup, and taking the first was how an earlier meeting's score was
        // written onto a later game.
        const matchesByTeam = inWindow
          .map((f) => ({ f, hit: finalMatchesGame(f, g.homeTeamName, g.awayTeamName) }))
          .filter((c): c is { f: TrustedFinal; hit: { homeScore: number; awayScore: number } } =>
            c.hit !== null,
          );
        if (matchesByTeam.length === 0) continue;

        // The board's fixtures for this matchup, near this game's kickoff. Read
        // BEFORE narrowing: with both games of a doubleheader final, both finals
        // survive the 4h tie window for both rows, so narrowing alone reported
        // AMBIGUOUS_MATCH and neither row ever received its own score — the
        // placement check below never ran (CodeRabbit + cubic, #717). The shared
        // grader filters by fixture first and then narrows; these two paths must
        // agree.
        //
        // Bounded by the drift the confusion needs, not by the calendar day: a
        // 17:00 / 20:00 ET doubleheader straddles UTC midnight, so a day-string
        // match saw only one of the two fixtures and this guard quietly stopped
        // guarding for exactly the pairing it exists for (cubic, #717). A row
        // whose start time is date-only carries no clock, so it falls back to
        // the calendar comparison and is KEPT — dropping it would leave one
        // fixture standing and silently switch the doubleheader guard off.
        const fixturesToday = espn.filter((ev) => {
          if (!ev.startTime) return false;
          const evStart = Date.parse(ev.startTime);
          const near =
            ev.startTime.includes("T") && Number.isFinite(evStart)
              ? Math.abs(evStart - g.commenceTime.getTime()) <= MAX_KICKOFF_DRIFT_MS
              : Date.parse(ev.startTime.slice(0, 10)) === d0;
          if (!near) return false;
          const evHome = sideTokens({
            name: ev.home?.team ?? "",
            abbr: ev.home?.abbreviation ?? "",
          });
          const evAway = sideTokens({
            name: ev.away?.team ?? "",
            abbr: ev.away?.abbreviation ?? "",
          });
          const gHome = expandTeamMatchTokens(g.homeTeamName);
          const gAway = expandTeamMatchTokens(g.awayTeamName);
          const hit = (a: string[], b: string[]) =>
            a.some((t) => b.some((x) => teamTokensMatch(t, x)));
          return (
            (hit(gHome, evHome) && hit(gAway, evAway)) ||
            (hit(gHome, evAway) && hit(gAway, evHome))
          );
        });
        const fixtureStarts = fixturesToday
          .map((ev) => ev.startTime)
          .filter((t): t is string => Boolean(t));

        // Counting fixtures against finals was the first version of this guard
        // and it was wrong twice over: a prior-day final inside the +/-48h
        // window inflated the final count and silently disabled the hold, and
        // when it did fire it skipped game one's perfectly good final along with
        // game two's ambiguous one (cubic, #717). Assign by the clock instead —
        // the same rule the shared grader applies to a pick — so a final only
        // scores the row it actually places on.
        const placeable = matchesByTeam.filter((c) =>
          finalMatchesNearestFixture(g.commenceTime.toISOString(), c.f.startIso, fixtureStarts),
        );
        if (placeable.length === 0) {
          console.warn(
            `[free-score-persist] UNRESOLVED_DOUBLEHEADER game=${g.id} ` +
              `${g.awayTeamName} @ ${g.homeTeamName} day=${day} — the board lists ` +
              `${fixturesToday.length} fixtures for this matchup and none of the ` +
              `${matchesByTeam.length} final(s) place on this one; refusing to guess ` +
              `which one this row is.`,
          );
          continue;
        }

        // Bind the final to this game's kickoff with the SAME rule and the same
        // tie window the pick-settlement path already uses (nearestByKickoff in
        // free-settlement.ts). Calendar dates alone are not enough: a 20:10 ET
        // game is the next UTC day, so "nearest date" picks the wrong game of a
        // series.
        const narrowed = nearestByKickoff(
          g.commenceTime.toISOString(),
          placeable.map((c) => c.f),
        );

        // Fail closed on a tie. Two finals still in contention means a
        // doubleheader, or a series the sources gave no start times for; either
        // way we cannot say which one this game is, and guessing is what wrote
        // a phantom result in the first place. Leaving the row unscored is
        // recoverable — a wrong FINAL that picks are graded against is not.
        if (narrowed.length !== 1) {
          console.warn(
            `[free-score-persist] AMBIGUOUS_MATCH game=${g.id} ` +
              `${g.awayTeamName} @ ${g.homeTeamName} commence=${g.commenceTime.toISOString()} ` +
              `— ${narrowed.length} finals remain after kickoff narrowing; refusing to guess.`,
          );
          continue;
        }

        const chosen = narrowed[0]!;

        // Narrowing cannot reject a LONE stale candidate: nearestByKickoff
        // returns a single-element list unchanged. So bind it explicitly. A
        // game that has started but whose own result is not published yet still
        // sits inside the ±48h window of the PREVIOUS meeting, and taking that
        // one writes an earlier score as this game's final (Devin Review, #717).
        if (chosen.startIso) {
          const drift = Math.abs(Date.parse(chosen.startIso) - g.commenceTime.getTime());
          if (!Number.isFinite(drift) || drift > MAX_KICKOFF_DRIFT_MS) {
            console.warn(
              `[free-score-persist] KICKOFF_DRIFT game=${g.id} ` +
                `${g.awayTeamName} @ ${g.homeTeamName} commence=${g.commenceTime.toISOString()} ` +
                `final start=${chosen.startIso} — ${Math.round(drift / 36e5)}h apart, ` +
                `beyond ${MAX_KICKOFF_DRIFT_MS / 36e5}h; refusing to treat it as this game's result.`,
            );
            continue;
          }
        } else if (Math.abs(Date.parse(chosen.date.slice(0, 10)) - d0) > 36e5 * 24) {
          // No start time to bind against. The ±48h window spans a whole series,
          // so without a clock the only defensible tolerance is the timezone
          // edge the window exists for, and that is ONE day, not two.
          //
          // One day, not zero: henrygd carries the fixture's local calendar date
          // while `day` comes from commenceTime in UTC, so a Saturday evening
          // NCAA kickoff is already Sunday in UTC. Exact equality would reject
          // that final and strand the game and its picks unsettled (Devin
          // Review, #717) — a real regression for the ESPN-unavailable path,
          // where henrygd is the only source and carries no start time.
          console.warn(
            `[free-score-persist] UNBOUND_DATE game=${g.id} ` +
              `${g.awayTeamName} @ ${g.homeTeamName} day=${day} final date=${chosen.date} ` +
              `— no start time on the final and the dates are more than a day apart; refusing to guess.`,
          );
          continue;
        }

        const hit = matchesByTeam.find((c) => c.f === chosen)!.hit;
        matched++;

        // GSE-SEC-051: ESPN (espn-public-api) has storage_allowed=false in the rights
        // registry. The scores above were sourced from ESPN via fetchScoresMultiSource;
        // before writing them into the Game table (a storage intent), confirm clearance.
        // If storage is denied, skip the DB write — facts may still be used transiently
        // but must not be persisted.
        const persistClearance = checkClearance({
          source_id: "espn-public-api",
          mode: "public_logged_off_fact_extract",
          tool_id: "fetch-native",
          intents: ["storage"],
        });
        if (!persistClearance.allowed) {
          continue;
        }

        // Never overwrite a recorded final with a different one. A game the
        // paid path (or an earlier free pass) already settled can still match
        // the query above through `resultFetched: false`; if ESPN now says a
        // different score, that is a cross-path disagreement for a human, not
        // a last-write-wins clobber of a result picks were graded against.
        // Same rule as SCORE_MISMATCH_CROSS_PATH in free-settlement-runner.
        const recordedFinal = g.status === "FINAL" && g.homeScore != null && g.awayScore != null;
        if (recordedFinal && (g.homeScore !== hit.homeScore || g.awayScore !== hit.awayScore)) {
          console.warn(
            `[free-score-persist] SCORE_MISMATCH_CROSS_PATH game=${g.id} ` +
              `existing=${g.homeScore}-${g.awayScore} incoming(free)=${hit.homeScore}-${hit.awayScore} ` +
              `— refusing to overwrite a recorded final; left for human review.`,
          );
          continue;
        }

        // Do not blank existing scores with null; only write concrete scores.
        // The where clause repeats the guard so a concurrent settle that
        // finalised the row between the read and this write cannot be
        // overwritten either: only a non-final row, an unscored row, or a row
        // that already carries this exact score pair is touched.
        const res = await db.game.updateMany({
          where: {
            id: g.id,
            // The has-it-started guard, repeated at write time for the same
            // reason the score guard below is: `g.commenceTime` was read before
            // the network work above, and a concurrent schedule refresh can
            // postpone the game into the future in between. Checking only the
            // in-memory copy would then still stamp a postponed game FINAL
            // (Devin Review, #717). Re-evaluated by the database against the
            // CURRENT row, so a row that moved forward simply matches nothing.
            commenceTime: { lte: new Date() },
            OR: [
              { status: { not: "FINAL" } },
              { homeScore: null },
              { awayScore: null },
              { homeScore: hit.homeScore, awayScore: hit.awayScore },
            ],
          },
          data: {
            homeScore: hit.homeScore,
            awayScore: hit.awayScore,
            status: "FINAL",
            resultFetched: true,
          },
        });
        if (res.count > 0) {
          updated++;
          gamesUpdated++;
        }
      }

      out.push({
        sport: sport.key,
        freeSport,
        ok: true,
        finals: finals.length,
        gamesMatched: matched,
        gamesUpdated: updated,
      });
    } catch (err) {
      out.push({
        sport: sport.key,
        freeSport,
        ok: false,
        finals: 0,
        gamesMatched: 0,
        gamesUpdated: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const anyOk = out.some((s) => s.ok);
  const allFailed = out.length > 0 && out.every((s) => !s.ok);
  const ingestionRun = await recordFreeIngestionRun({
    sport: options?.sportKey ?? "free-scores",
    gamesUpserted: gamesUpdated,
    oddsInserted: 0,
    failed: allFailed,
    errorMessage: allFailed
      ? out
          .map((s) => s.error)
          .filter(Boolean)
          .slice(0, 3)
          .join("; ") || "free-score-persist: all sports failed"
      : null,
  });

  return {
    path: "free-score-persist",
    oddsApiRequired: false,
    elapsedMs: Date.now() - started,
    sports: out,
    gamesUpdated,
    ingestionRunId: anyOk || allFailed ? ingestionRun?.id ?? null : null,
  };
}
