/**
 * Week 2, 2026 — the slate that produced this module.
 *
 * This is a FIXTURE OF MEASURED FACTS, not a projection set. Every number below
 * was read from a source before the 12:00 PM CDT lock on 2026-09-20 and is kept
 * verbatim so the two failures of that afternoon stay reproducible forever.
 *
 * It exists for one reason: `dfs-signals.test.ts` replays this environment and
 * asserts that Justin Jefferson and DK Metcalf are suppressed. If a future edit
 * to the signal layer lets either of them back into a lineup under these exact
 * conditions, the suite goes red. That is the whole point — a lesson that lives
 * only in a document is a lesson you get to relearn.
 *
 * WHAT HAPPENED (final scores, 2026-09-20):
 *   MIN 9 @ CHI 3   — total 47.5, actual 12. The wind game.
 *   PIT 3 @ NE 20   — total 41.5, actual 23. PIT implied 18.0, scored 3.
 *   Justin Jefferson: 8.50 DK at 1.8% owned.
 *   DK Metcalf:       6.70 DK at 1.3% owned.
 *
 * Both were rostered BECAUSE their ownership was low. In both cases the low
 * ownership was the field correctly pricing a visible public fact.
 */

import type { AirwaveRead, GameEnvironment, SignalContext, ContestShape } from "./dfs-signals";
import { gameKeyOf } from "./dfs-signals";

/** Measured conditions, all 15 games. Sources are the pages actually fetched. */
export const WEEK2_2026_ENVIRONMENTS: readonly GameEnvironment[] = [
  {
    // THE wind game. NWS Chicago point forecast, issued 10:21 AM CDT 2026-09-20.
    gameKey: gameKeyOf("MIN", "CHI"),
    roof: "open",
    windMph: 20, // "northeast wind 15 to 25 mph" — midpoint
    gustMph: 30, // "gusts as high as 30 mph"
    precipChance: 0.9,
    total: 47.5,
    impliedTotals: { MIN: 21.5, CHI: 26.0 },
    spread: 4.5,
    favourite: "CHI",
    backupQbTeams: ["MIN"], // Kyler Murray inactive (concussion); Carson Wentz starting
    source: "NWS Chicago point forecast, issued 2026-09-20 10:21 CDT",
    marketSource: "consensus Vegas lines, five books fetched 2026-09-20",
    rosterSource: "official Week 2 inactives, Vikings.com, posted 2026-09-20",
  },
  {
    // PIT implied 18.0 — third-lowest on the slate. Metcalf's actual environment.
    gameKey: gameKeyOf("PIT", "NE"),
    roof: "open",
    windMph: null,
    gustMph: null,
    precipChance: 0.4,
    total: 41.5,
    impliedTotals: { PIT: 18.0, NE: 23.5 },
    spread: 5.5,
    favourite: "NE",
    backupQbTeams: [],
    source: "consensus Vegas lines, five books fetched 2026-09-20",
  },
  {
    gameKey: gameKeyOf("WAS", "DAL"),
    roof: "unknown", // AT&T retractable; the roof call was NOT confirmed before lock
    windMph: 5,
    gustMph: null,
    precipChance: 0.19,
    total: 50.5, // slate high
    impliedTotals: { WAS: 23.0, DAL: 27.5 },
    spread: 4.5,
    favourite: "DAL",
    backupQbTeams: [],
    source: "consensus Vegas lines, five books fetched 2026-09-20",
  },
  {
    gameKey: gameKeyOf("MIA", "SF"),
    roof: "open",
    windMph: 5,
    gustMph: null,
    precipChance: 0.0,
    total: 44.5,
    impliedTotals: { MIA: 15.5, SF: 29.0 }, // MIA lowest on slate, SF highest
    spread: 13.5,
    favourite: "SF",
    backupQbTeams: ["SF"], // Purdy inactive (toe); Mac Jones starting
    source: "consensus Vegas lines, five books fetched 2026-09-20",
    rosterSource: "49ers beat reporting, 2026-09-20 (Purdy out, Mac Jones starting)",
  },
  {
    gameKey: gameKeyOf("IND", "KC"),
    roof: "open",
    windMph: 6,
    gustMph: null,
    precipChance: 0.1,
    total: 46.5,
    impliedTotals: { IND: 20.25, KC: 26.25 },
    spread: 6,
    favourite: "KC",
    backupQbTeams: [],
    source: "NWS Arrowhead point forecast + consensus lines, 2026-09-20",
  },
  {
    gameKey: gameKeyOf("CIN", "HOU"),
    roof: "closed", // NRG retractable, closed at 91F outside
    windMph: 4,
    gustMph: null,
    precipChance: 0.1,
    total: 45.5,
    impliedTotals: { CIN: 21.5, HOU: 24.0 },
    spread: 2.5,
    favourite: "HOU",
    backupQbTeams: [],
    source: "NWS Houston + consensus lines, 2026-09-20",
  },
  {
    gameKey: gameKeyOf("CLE", "TB"),
    roof: "open",
    windMph: 8,
    gustMph: null,
    precipChance: 0.45,
    total: 41.5,
    impliedTotals: { CLE: 16.5, TB: 25.0 },
    spread: 8.5,
    favourite: "TB",
    backupQbTeams: [],
    source: "consensus Vegas lines, 2026-09-20",
  },
  {
    gameKey: gameKeyOf("PHI", "TEN"),
    roof: "open",
    windMph: 7,
    gustMph: null,
    precipChance: 0.05,
    total: 39.5, // slate low
    impliedTotals: { PHI: 23.25, TEN: 16.25 },
    spread: 7,
    favourite: "PHI",
    backupQbTeams: [],
    source: "consensus Vegas lines, 2026-09-20",
  },
  {
    gameKey: gameKeyOf("NO", "BAL"),
    roof: "open",
    windMph: 6,
    gustMph: null,
    precipChance: 0.1,
    total: 45.5,
    impliedTotals: { NO: 19.0, BAL: 26.5 },
    spread: 7.5,
    favourite: "BAL",
    backupQbTeams: [],
    source: "consensus Vegas lines, 2026-09-20",
  },
  {
    gameKey: gameKeyOf("GB", "NYJ"),
    roof: "open",
    windMph: 10,
    gustMph: 18,
    precipChance: 0.5,
    total: 44.5,
    impliedTotals: { GB: 24.0, NYJ: 20.5 },
    spread: 3.5,
    favourite: "GB",
    backupQbTeams: [],
    source: "consensus Vegas lines + MetLife forecast, 2026-09-20",
  },
  {
    gameKey: gameKeyOf("CAR", "ATL"),
    roof: "closed", // Mercedes-Benz retractable
    windMph: 3,
    gustMph: null,
    precipChance: 0.39,
    total: 43.5,
    impliedTotals: { CAR: 23.0, ATL: 20.5 },
    spread: 2.5,
    favourite: "CAR",
    backupQbTeams: ["ATL"], // Penix inactive, Tua inactive; Cooper Rush starting
    source: "consensus Vegas lines, 2026-09-20",
    rosterSource: "AJC + official inactives, 2026-09-20 (Penix and Tua inactive, Cooper Rush starting)",
  },
  {
    gameKey: gameKeyOf("JAX", "DEN"),
    roof: "open",
    windMph: 8,
    gustMph: null,
    precipChance: 0.1,
    total: 45.5,
    impliedTotals: { JAX: 21.5, DEN: 24.0 },
    spread: 2.5,
    favourite: "DEN",
    backupQbTeams: [],
    source: "consensus Vegas lines, 2026-09-20",
  },
  {
    gameKey: gameKeyOf("LV", "LAC"),
    roof: "dome", // SoFi fixed canopy
    windMph: 6,
    gustMph: null,
    precipChance: 0.0,
    total: 43.5,
    impliedTotals: { LV: 18.5, LAC: 25.0 },
    spread: 6.5,
    favourite: "LAC",
    backupQbTeams: [],
    source: "SoFi canopy + consensus lines, 2026-09-20",
  },
  {
    gameKey: gameKeyOf("SEA", "ARI"),
    roof: "closed", // State Farm retractable, closed at 97F
    windMph: 4,
    gustMph: null,
    precipChance: 0.0,
    total: 40.5,
    impliedTotals: { SEA: 22.0, ARI: 18.5 },
    spread: 3.5,
    favourite: "SEA",
    backupQbTeams: ["SEA"], // Darnold inactive (glute); backup QB starting
    source: "consensus Vegas lines, 2026-09-20",
    rosterSource: "official injury report, 2026-09-20 (Darnold out, backup QB starting)",
  },
  {
    gameKey: gameKeyOf("NYG", "LAR"),
    roof: "dome",
    windMph: 9,
    gustMph: null,
    precipChance: 0.0,
    total: 47.5,
    impliedTotals: { NYG: 20.0, LAR: 27.5 },
    spread: 7.5,
    favourite: "LAR",
    backupQbTeams: [],
    source: "SoFi canopy + consensus lines, 2026-09-20",
  },
];

/**
 * Airwave reads mined from the Week 2 master guide (10 shows).
 *
 * `sources` is the count of INDEPENDENT shows saying it. Only reads at 2+ carry
 * weight — one analyst is an opinion, not a consensus. These are recorded
 * verbatim from the supplied corpus; nothing here is inferred.
 */
export const WEEK2_2026_AIRWAVE: readonly AirwaveRead[] = [
  { player: "Drake London", verdict: "FADE", sources: 4, note: "Cooper Rush at quarterback caps the whole passing game." },
  { player: "Kyle Pitts Sr.", verdict: "FADE", sources: 3, note: "Cooper Rush at quarterback; sit unless there is no alternative." },
  { player: "Tony Pollard", verdict: "FADE", sources: 3, note: "The entire Titans offense is unstartable." },
  { player: "Cam Ward", verdict: "FADE", sources: 3, note: "34.3 QBR, 48.7% completions in Week 1." },
  { player: "Marvin Harrison Jr.", verdict: "FADE", sources: 3, note: "Target-share problems into a Seattle secondary." },
  { player: "De'Von Achane", verdict: "FADE", sources: 2, note: "Elite usage, but a 13.5-point underdog script." },
  { player: "Quinshon Judkins", verdict: "FADE", sources: 2, note: "Touch-dependent into a Tampa blowout script." },
  { player: "MarShawn Lloyd", verdict: "FADE", sources: 2, note: "Committee back, 2.9 YPC, into an elite Jets run defense." },
  { player: "Jayden Reed", verdict: "FADE", sources: 2, note: "Three-receiver sets only; flex at best." },
  { player: "Jake Ferguson", verdict: "FADE", sources: 2, note: "Poor recent production and weak target quality." },
  { player: "Bo Nix", verdict: "FADE", sources: 2, note: "33.4 PFF grade, four sacks and three fumbles in Week 1." },
  { player: "Jordan Love", verdict: "FADE", sources: 2, note: "54.8 QBR, 45.7% completions, -9.0 CPOE in Week 1." },
  // START reads are recorded for provenance and deliberately carry no weight.
  { player: "Dalton Schultz", verdict: "START", sources: 4, note: "Play of the week: 74% routes, Collins out, worst coverage linebackers on the slate." },
  { player: "Caleb Williams", verdict: "START", sources: 3, note: "Core-four quarterback on three independent shows." },
  { player: "Javonte Williams", verdict: "START", sources: 2, note: "The only back in Dallas." },
  { player: "Aaron Jones Sr.", verdict: "START", sources: 2, note: "Mason to IR; lead back." },
];

/**
 * Players whose bull case rested on a one-game 2026 sample (L-5).
 *
 * Every 2026 defensive split on this slate is n=1. The specific error on
 * 2026-09-20 was leaning on "Dallas pass defense grades 3.2nd percentile" when
 * the same lab's 2025 full-season table had Dallas at -0.179 defensive EPA per
 * play, which is a good defense. One bad week is not a weakness.
 */
export const WEEK2_2026_THIN_SAMPLE: readonly string[] = [];

export const WEEK2_2026_CONTEST: ContestShape = {
  fieldSize: 75,
  placesPaid: 1,
  singleEntry: true,
};

export const WEEK2_2026_CONTEXT: SignalContext = {
  environments: WEEK2_2026_ENVIRONMENTS,
  airwave: WEEK2_2026_AIRWAVE,
  thinSamplePlayers: WEEK2_2026_THIN_SAMPLE,
  contest: WEEK2_2026_CONTEST,
};
