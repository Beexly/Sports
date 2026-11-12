/**
 * Stage A — assemble the bundle.
 *
 * Every field comes from a loader that either reached its source or said why it
 * could not. Nothing here supplies a default. If a loader returns MISSING, the
 * bundle carries MISSING and Stage B decides whether the run may continue.
 */

import type { SqlClient } from "@sports/prediction-engine/src/literature/literature-retrieval.js";
import type {
  Evidence,
  GameEvidenceBundle,
  InjuryRecord,
} from "@sports/prediction-engine/src/evidence/types.js";
import { isPresent, missing, real } from "@sports/prediction-engine/src/evidence/types.js";
import { canonicalTeamCode } from "@sports/prediction-engine/src/evidence/team-codes.js";

import { loadGameIdentity } from "./schedule.js";
import { loadMarket } from "./market.js";
import { loadRest } from "./rest.js";
import { loadInjuries } from "./injuries.js";
import { loadInjuriesFromDb } from "./injuries-db.js";
import { loadWeather } from "./weather.js";
import { loadTeamForm } from "./team-form.js";
import { loadCharting } from "./charting.js";
import { loadCoaching } from "./coaching.js";
import { createCorpusLoader } from "./corpus.js";
import { homeVenue } from "./venues.js";

export const EVIDENCE_CODE_VERSION = "v5.3.1+evidence-spine.1";

export interface BuildBundleOptions {
  readonly db: SqlClient;
  readonly gameId: string;
  readonly now?: Date;
  readonly trendsPath?: string;
  readonly fetchImpl?: typeof fetch;
  readonly codeVersion?: string;
  /** Reuse one corpus loader across a slate so the facet cache is shared. */
  readonly corpus?: ReturnType<typeof createCorpusLoader>;
}

function mergeInjuries(
  home: Evidence<readonly InjuryRecord[]>,
  away: Evidence<readonly InjuryRecord[]>,
): Evidence<readonly InjuryRecord[]> {
  if (isPresent(home) && isPresent(away)) {
    return real([...home.value, ...away.value], "espn:injuries", home.asOf);
  }
  // One side missing means the injury picture is incomplete. Report it as
  // missing rather than presenting half a roster as the whole picture.
  const reasons: string[] = [];
  if (!isPresent(home)) reasons.push(`home: ${home.reason}`);
  if (!isPresent(away)) reasons.push(`away: ${away.reason}`);
  return missing(`injury picture incomplete — ${reasons.join("; ")}`, "espn:injuries");
}

export async function buildBundle(opts: BuildBundleOptions): Promise<GameEvidenceBundle> {
  const now = opts.now ?? new Date();
  const codeVersion = opts.codeVersion ?? EVIDENCE_CODE_VERSION;

  const identityEvidence = await loadGameIdentity(opts.db, opts.gameId);
  if (!isPresent(identityEvidence)) {
    throw new Error(
      `cannot build a bundle without a game identity: ${identityEvidence.reason}`,
    );
  }
  const identity = identityEvidence.value;

  const home = canonicalTeamCode(identity.homeTeam);
  const away = canonicalTeamCode(identity.awayTeam);

  // The games table has no venue column, so identity.venue is MISSING. The home
  // team's stadium is a static league fact, not a measurement, and it is the
  // only place a venue name may come from. No venue means MISSING weather.
  const venue = homeVenue(home);
  const venueName = isPresent(identity.venue) ? identity.venue.value : venue?.venue ?? null;

  const [market, rest, dbHomeInjuries, dbAwayInjuries, weather, homeForm, awayForm] =
    await Promise.all([
      loadMarket(opts.db, opts.gameId, now),
      loadRest(opts.db, opts.gameId),
      loadInjuriesFromDb(opts.db, home, { season: identity.season, week: identity.week }),
      loadInjuriesFromDb(opts.db, away, { season: identity.season, week: identity.week }),
      loadWeather(venueName, {
        city: venue?.city,
        state: venue?.state,
        fetchImpl: opts.fetchImpl,
        now,
      }),
      Promise.resolve(loadTeamForm(home, { trendsPath: opts.trendsPath })),
      Promise.resolve(loadTeamForm(away, { trendsPath: opts.trendsPath })),
    ]);

  // The database is the primary injury source; ESPN is the fallback. ESPN
  // returns 403 to this client's User-Agent, so it is not the other way round.
  const homeInjuries = isPresent(dbHomeInjuries)
    ? dbHomeInjuries
    : await loadInjuries(home, { fetchImpl: opts.fetchImpl, now });
  const awayInjuries = isPresent(dbAwayInjuries)
    ? dbAwayInjuries
    : await loadInjuries(away, { fetchImpl: opts.fetchImpl, now });

  const homeCharting = loadCharting(home, { trendsPath: opts.trendsPath });
  const awayCharting = loadCharting(away, { trendsPath: opts.trendsPath });
  // The staff table is an undated constant, so the caller supplies the instant
  // the value describes. Without it the loader returns MISSING rather than
  // inventing a timestamp.
  const staffAsOf = now.toISOString();
  const homeCoaching = loadCoaching(home, { asOf: staffAsOf });
  const awayCoaching = loadCoaching(away, { asOf: staffAsOf });

  const corpusLoader = opts.corpus ?? createCorpusLoader({ db: opts.db, now });
  const corpus = await corpusLoader.load(opts.gameId, {
    isIndoor: isPresent(weather) ? weather.value.isDome : false,
    windMph: isPresent(weather) ? weather.value.windMph : null,
    tempF: isPresent(weather) ? weather.value.temperatureF : null,
    isShortWeekRoad: isPresent(rest) ? rest.value.awayRestDays < 6 : false,
    isHighAltitudeDenver: home === "DEN",
    isDivisional: false,
    window: null,
  });

  return {
    identity,
    market,
    injuries: mergeInjuries(homeInjuries, awayInjuries),
    weather,
    rest,
    homeForm,
    awayForm,
    homeCharting,
    awayCharting,
    homeCoaching,
    awayCoaching,
    corpus,
    // JEV carries zero weight until a per-game spine file exists for this game.
    jev: missing("no JEV spine file supplied for this game"),
    builtAt: now.toISOString(),
    codeVersion,
  };
}
