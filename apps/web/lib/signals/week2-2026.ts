/**
 * Week 2, 2026 — the slate that produced the signal spine.
 *
 * A FIXTURE OF MEASURED FACTS, not projections. Every number was read from a
 * source before the 12:00 PM CDT lock on 2026-09-20 and is kept verbatim so the
 * failures of that afternoon stay reproducible forever.
 *
 * WHAT HAPPENED (finals):
 *   MIN 9 @ CHI 3   — total 47.5, actual 12. The wind game.
 *   PIT 3 @ NE 20   — total 41.5, actual 23. PIT implied 18.0, scored 3.
 *   Justin Jefferson  8.50 DK at 1.8% owned.
 *   DK Metcalf        6.70 DK at 1.3% owned.
 *
 * Both were rostered BECAUSE ownership was low. Both times the low ownership was
 * the field correctly pricing a visible public fact. Metcalf is the harder and
 * more instructive case: Michael Pittman being out genuinely DID make him the
 * alpha, so a naive layer that simply added a usage bonus would have rostered him
 * anyway. The spine scales usage by the scoring environment, which is why an
 * 18.0 implied total governs a role upgrade rather than being cancelled by it.
 */

import type { AirwaveNote, CoverageDowngrade, GameEnvironment, SignalContext, VacatedUsage } from "./spine";
import { gameKeyOf } from "./spine";

const VEGAS = "consensus Vegas lines, five books fetched 2026-09-20";

export const WEEK2_2026_ENVIRONMENTS: readonly GameEnvironment[] = [
  {
    gameKey: gameKeyOf("MIN", "CHI"),
    roof: "open",
    windMph: 20, // "northeast wind 15 to 25 mph"
    gustMph: 30, // "gusts as high as 30 mph"
    precipChance: 0.9,
    total: 47.5,
    impliedTotals: { MIN: 21.5, CHI: 26.0 },
    spread: 4.5,
    favourite: "CHI",
    backupQbTeams: ["MIN"],
    source: "NWS Chicago point forecast, issued 2026-09-20 10:21 CDT",
    marketSource: VEGAS,
    rosterSource: "official Week 2 inactives, Vikings.com, 2026-09-20",
  },
  {
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
    source: VEGAS,
    marketSource: VEGAS,
  },
  {
    gameKey: gameKeyOf("WAS", "DAL"),
    roof: "unknown", // the AT&T roof call was NOT confirmed before lock
    windMph: 5,
    gustMph: null,
    precipChance: 0.19,
    total: 50.5, // slate high
    impliedTotals: { WAS: 23.0, DAL: 27.5 },
    spread: 4.5,
    favourite: "DAL",
    backupQbTeams: [],
    source: VEGAS,
    marketSource: VEGAS,
  },
  {
    gameKey: gameKeyOf("MIA", "SF"),
    roof: "open",
    windMph: 5,
    gustMph: null,
    precipChance: 0,
    total: 44.5,
    impliedTotals: { MIA: 15.5, SF: 29.0 }, // slate low and slate high
    spread: 13.5,
    favourite: "SF",
    backupQbTeams: ["SF"],
    source: VEGAS,
    marketSource: VEGAS,
    rosterSource: "49ers beat reporting, 2026-09-20 (Purdy out)",
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
    source: "NWS Arrowhead point forecast, 2026-09-20",
    marketSource: VEGAS,
  },
  {
    gameKey: gameKeyOf("CIN", "HOU"),
    roof: "closed", // NRG retractable, closed at 91F
    windMph: 4,
    gustMph: null,
    precipChance: 0.1,
    total: 45.5,
    impliedTotals: { CIN: 21.5, HOU: 24.0 },
    spread: 2.5,
    favourite: "HOU",
    backupQbTeams: [],
    source: "NWS Houston, 2026-09-20",
    marketSource: VEGAS,
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
    source: VEGAS,
    marketSource: VEGAS,
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
    source: VEGAS,
    marketSource: VEGAS,
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
    source: VEGAS,
    marketSource: VEGAS,
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
    source: "MetLife forecast, 2026-09-20",
    marketSource: VEGAS,
  },
  {
    gameKey: gameKeyOf("CAR", "ATL"),
    roof: "closed",
    windMph: 3,
    gustMph: null,
    precipChance: 0.39,
    total: 43.5,
    impliedTotals: { CAR: 23.0, ATL: 20.5 },
    spread: 2.5,
    favourite: "CAR",
    backupQbTeams: ["ATL"],
    source: VEGAS,
    marketSource: VEGAS,
    rosterSource: "AJC + official inactives, 2026-09-20 (Penix and Tua inactive)",
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
    source: VEGAS,
    marketSource: VEGAS,
  },
  {
    gameKey: gameKeyOf("LV", "LAC"),
    roof: "dome", // SoFi fixed canopy
    windMph: 6,
    gustMph: null,
    precipChance: 0,
    total: 43.5,
    impliedTotals: { LV: 18.5, LAC: 25.0 },
    spread: 6.5,
    favourite: "LAC",
    backupQbTeams: [],
    source: "SoFi canopy, 2026-09-20",
    marketSource: VEGAS,
  },
  {
    gameKey: gameKeyOf("SEA", "ARI"),
    roof: "closed", // State Farm retractable, closed at 97F
    windMph: 4,
    gustMph: null,
    precipChance: 0,
    total: 40.5,
    impliedTotals: { SEA: 22.0, ARI: 18.5 },
    spread: 3.5,
    favourite: "SEA",
    backupQbTeams: ["SEA"],
    source: VEGAS,
    marketSource: VEGAS,
    rosterSource: "official injury report, 2026-09-20 (Darnold out)",
  },
  {
    gameKey: gameKeyOf("NYG", "LAR"),
    roof: "dome",
    windMph: 9,
    gustMph: null,
    precipChance: 0,
    total: 47.5,
    impliedTotals: { NYG: 20.0, LAR: 27.5 },
    spread: 7.5,
    favourite: "LAR",
    backupQbTeams: [],
    source: "SoFi canopy, 2026-09-20",
    marketSource: VEGAS,
  },
];

/**
 * Usage vacated by confirmed inactives.
 *
 * This is the boost half of the spine, and it is arithmetic rather than opinion:
 * targets that existed last week and belong to nobody this week go somewhere.
 */
export const WEEK2_2026_VACATED: readonly VacatedUsage[] = [
  {
    team: "HOU",
    absent: "Nico Collins",
    share: 0.26,
    beneficiaries: ["Dalton Schultz", "Xavier Hutchinson", "Kayshon Boutte", "Jaylin Noel"],
    source: "ESPN, 2026-09-20: Collins ruled out (hamstring). Tank Dell on IR, Jayden Higgins out for season.",
  },
  {
    team: "PIT",
    absent: "Michael Pittman Jr.",
    share: 0.22,
    beneficiaries: ["DK Metcalf", "Pat Freiermuth", "Roman Wilson"],
    source: "Steelers Depot, 2026-09-20: Pittman ruled out (foot).",
  },
  {
    team: "BAL",
    absent: "Zay Flowers",
    share: 0.27,
    beneficiaries: ["Mark Andrews", "Rashod Bateman"],
    source: "Ravens official inactives, 2026-09-20. Ja'Kobi Lane also on IR.",
  },
  {
    team: "LV",
    absent: "Brock Bowers",
    share: 0.24,
    beneficiaries: ["Michael Mayer"],
    source: "NFL.com pregame, 2026-09-20: Bowers will not play (knee).",
  },
  {
    team: "WAS",
    absent: "Chig Okonkwo",
    share: 0.1,
    beneficiaries: ["John Bates", "Ben Sinnott"],
    source: "Commanders official inactives, 2026-09-20 (hamstring).",
  },
  {
    team: "LAR",
    absent: "Puka Nacua",
    share: 0.28,
    beneficiaries: ["Davante Adams", "Colby Parkinson"],
    source: "NBC, 2026-09-20: Nacua doubtful, DNP Thu/Fri/Sat. Whittington also doubtful.",
  },
];

/** Opposing starters missing at the position that would have covered our man. */
export const WEEK2_2026_COVERAGE: readonly CoverageDowngrade[] = [
  {
    team: "PIT",
    absentDefender: "Carlton Davis III (NE CB1)",
    benefits: ["WR"],
    source: "SI, 2026-09-20: Patriots Week 2 inactives, Davis out, no practice all week.",
  },
  {
    team: "NE",
    absentDefender: "Joey Porter Jr. (PIT CB)",
    benefits: ["WR"],
    source: "Steelers Depot, 2026-09-20: Porter out, second straight game.",
  },
];

/**
 * The airwave. Ten shows from the Week 2 master guide, plus the founder's own
 * notes, graded on the same tier scale the news wire already uses.
 *
 * `sources` counts INDEPENDENT voices. Both directions carry weight: a FADE
 * suppresses and a START boosts, scaled by tier and breadth.
 */
export const WEEK2_2026_AIRWAVE: readonly AirwaveNote[] = [
  { player: "Drake London", verdict: "FADE", tier: "Beat", sources: 4, note: "Cooper Rush at quarterback caps the whole passing game." },
  { player: "Kyle Pitts Sr.", verdict: "FADE", tier: "Beat", sources: 3, note: "Cooper Rush at quarterback; sit unless there is no alternative." },
  { player: "Tony Pollard", verdict: "FADE", tier: "Beat", sources: 3, note: "The entire Titans offense is unstartable." },
  { player: "Cam Ward", verdict: "FADE", tier: "Beat", sources: 3, note: "34.3 QBR, 48.7% completions in Week 1." },
  { player: "Marvin Harrison Jr.", verdict: "FADE", tier: "Beat", sources: 3, note: "Target-share problems into a Seattle secondary." },
  { player: "De'Von Achane", verdict: "FADE", tier: "Beat", sources: 2, note: "Elite usage, but a 13.5-point underdog script." },
  { player: "Quinshon Judkins", verdict: "FADE", tier: "Beat", sources: 2, note: "Touch-dependent into a Tampa blowout script." },
  { player: "MarShawn Lloyd", verdict: "FADE", tier: "Beat", sources: 2, note: "Committee back, 2.9 YPC, into an elite Jets run defense." },
  { player: "Jayden Reed", verdict: "FADE", tier: "Aggregator", sources: 2, note: "Three-receiver sets only; flex at best." },
  { player: "Jake Ferguson", verdict: "FADE", tier: "Aggregator", sources: 2, note: "Poor recent production and weak target quality." },
  { player: "Bo Nix", verdict: "FADE", tier: "Beat", sources: 2, note: "33.4 PFF grade, four sacks and three fumbles in Week 1." },
  { player: "Jordan Love", verdict: "FADE", tier: "Beat", sources: 2, note: "54.8 QBR, 45.7% completions, -9.0 CPOE in Week 1." },
  { player: "Dalton Schultz", verdict: "START", tier: "Beat", sources: 4, note: "Play of the week: 74% routes, Collins out, worst coverage linebackers on the slate." },
  { player: "Caleb Williams", verdict: "START", tier: "Beat", sources: 3, note: "Core-four quarterback on three independent shows." },
  { player: "Javonte Williams", verdict: "START", tier: "Beat", sources: 2, note: "The only back in Dallas; 100% of inside-the-10 carries." },
  { player: "Aaron Jones Sr.", verdict: "START", tier: "Beat", sources: 2, note: "Mason to IR; lead back with a soft run-defense matchup." },
  { player: "Kenneth Walker III", verdict: "START", tier: "Beat", sources: 2, note: "Most lopsided trench matchup on the slate." },
];

/**
 * Cases resting on a one-game 2026 sample (L-5).
 *
 * Every 2026 defensive split on this slate is n=1. Empty is correct and inert
 * until a source of per-claim sample sizes exists — per "absent data is not
 * evidence", an empty register is not a silent pass.
 */
export const WEEK2_2026_THIN_SAMPLE: readonly string[] = [];

export const WEEK2_2026_CONTEXT: SignalContext = {
  environments: WEEK2_2026_ENVIRONMENTS,
  airwave: WEEK2_2026_AIRWAVE,
  vacated: WEEK2_2026_VACATED,
  coverage: WEEK2_2026_COVERAGE,
  thinSample: WEEK2_2026_THIN_SAMPLE,
};

export const WEEK2_2026_CONTEST = { fieldSize: 75, placesPaid: 1, singleEntry: true } as const;
