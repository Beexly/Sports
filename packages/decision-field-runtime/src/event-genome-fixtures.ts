/**
 * EVENT GENOME FIXTURES — the three proof cases (rights-safe, owner-provided competitive-research data).
 *
 * Ecuador 2–Germany 1 (soccer), Rays 13–Royals 2 (MLB), Roughriders–Argonauts (CFL, upcoming). These are
 * FIXTURES: illustrative, watermarked, never live, never scraped. They exist to make the GSE anatomy
 * legible — not to claim a real result feed. Soccer/Ecuador-Germany order in the stat bag is (home=Ecuador,
 * away=Germany), matching the owner's "x/y" pairs.
 *
 * Pure data. No I/O.
 */

import type { UniversalEventGenome } from "./universal-event-genome.js";

/** Ecuador 2 – Germany 1 · FIFA World Cup · MetLife Stadium · 25.06.26. */
export const ECUADOR_GERMANY: UniversalEventGenome = {
  eventId: "fixture-soccer-ecu-ger-2026",
  sport: "soccer",
  league: "FIFA World Cup",
  tournament: "FIFA World Cup",
  region: "USA",
  season: "2026",
  stage: "Group",
  participants: [
    { id: "ecu", name: "Ecuador", side: "HOME", abbrev: "ECU" },
    { id: "ger", name: "Germany", side: "AWAY", abbrev: "GER" },
  ],
  venue: "MetLife Stadium",
  weather: "27°C · humidity 42% · wind 5.3 m/s",
  officials: "Tori Penso",
  startTimeLabel: "25.06.26",
  status: "ENDED",
  periodSchema: { kind: "CONTINUOUS_HALVES", segments: ["1H", "2H"], clockType: "RUNNING_UP", regulationSegments: 2 },
  scoreState: {
    home: 2,
    away: 1,
    final: true,
    periodScores: [
      { period: "1H", home: 1, away: 1 },
      { period: "2H", home: 1, away: 0 },
    ],
  },
  timeline: [
    { marker: "2'", type: "GOAL", side: "AWAY", subject: "Leroy Sané", detail: "assist Florian Wirtz", knownAtMarker: true },
    { marker: "9'", type: "GOAL", side: "HOME", subject: "Nilson Angulo", detail: "assist Pedro Vite", knownAtMarker: true },
    { marker: "43'", type: "CARD", side: "HOME", subject: "Piero Hincapié", detail: "yellow", knownAtMarker: true },
    { marker: "44'", type: "CARD", side: "AWAY", subject: "Aleksandar Pavlović", detail: "yellow", knownAtMarker: true },
    { marker: "47'", type: "VAR", side: "NEUTRAL", subject: "Penalty cancelled", detail: "VAR review", knownAtMarker: true },
    { marker: "50'", type: "CARD", side: "HOME", subject: "Alan Franco", detail: "yellow", knownAtMarker: true },
    { marker: "77'", type: "GOAL", side: "HOME", subject: "Gonzalo Plata", detail: "assist Kevin Rodríguez", knownAtMarker: true },
    { marker: "89'", type: "CARD", side: "HOME", subject: "Gonzalo Plata", detail: "yellow", knownAtMarker: true },
  ],
  stats: {
    // possession & expected (home=Ecuador / away=Germany)
    possessionHome: 39, possessionAway: 61,
    xgHome: 1.99, xgAway: 0.97,
    openPlayXgHome: 1.15, openPlayXgAway: 0.86,
    expectedGoalsPreventedHome: -0.09, expectedGoalsPreventedAway: -0.51,
    expectedPointsHome: 2.04, expectedPointsAway: 0.74,
    // shooting
    shotsHome: 7, shotsAway: 11,
    shotsOnTargetHome: 3, shotsOnTargetAway: 3,
    shotsBlockedHome: 2, shotsBlockedAway: 5,
    shotsInsideBoxHome: 5, shotsInsideBoxAway: 6,
    shotsOutsideBoxHome: 2, shotsOutsideBoxAway: 5,
    goalAttemptsHome: 5, goalAttemptsAway: 6,
    bigChancesHome: 2, bigChancesAway: 2,
    bigChancesMissedHome: 1, bigChancesMissedAway: 1,
    // set pieces & discipline
    cornersHome: 3, cornersAway: 2,
    foulsHome: 15, foulsAway: 10,
    yellowsHome: 3, yellowsAway: 1,
    redsHome: 0, redsAway: 0,
    offsidesHome: 1, offsidesAway: 0,
    freeKicksHome: 10, freeKicksAway: 15,
    subsHome: 5, subsAway: 5,
    // tempo
    attacksHome: 102, attacksAway: 113,
    dangerousAttacksHome: 40, dangerousAttacksAway: 56,
    // passing
    passesHome: 379, passesAway: 592,
    successfulPassesHome: 313, successfulPassesAway: 517,
    passPctHome: 83, passPctAway: 87,
    longPassesHome: 50, longPassesAway: 37,
    successfulLongPassesHome: 24, successfulLongPassesAway: 17,
    crossesHome: 12, crossesAway: 16,
    accurateCrossesHome: 3, accurateCrossesAway: 5,
    keyPassesHome: 7, keyPassesAway: 9,
    // duels
    dribbleAttemptsHome: 18, dribbleAttemptsAway: 22,
    successfulDribblesHome: 8, successfulDribblesAway: 7,
    duelsWonHome: 53, duelsWonAway: 51,
    tacklesHome: 26, tacklesAway: 20,
    interceptionsHome: 12, interceptionsAway: 4,
    headersWonHome: 9, headersWonAway: 10,
    savesHome: 2, savesAway: 1,
  },
  standingsContext: [
    { team: "Ecuador", rank: 1, record: "fixture group ctx" },
    { team: "Germany", rank: 2, record: "fixture group ctx" },
  ],
  h2hContext: "Fixture H2H context (illustrative) — small-sample, flagged fragile.",
  recentForm: "Fixture recent-form context (illustrative).",
  odds: [
    { market: "Match result", selection: "Germany", price: 1.62, bookCount: 7, observedAtLabel: "pre-match" },
    { market: "Match result", selection: "Draw", price: 4.1, bookCount: 7, observedAtLabel: "pre-match" },
    { market: "Match result", selection: "Ecuador", price: 5.2, bookCount: 7, observedAtLabel: "pre-match" },
    { market: "Total goals", selection: "Under 3", price: 1.72, bookCount: 6, observedAtLabel: "pre-match" },
    { market: "Corners", selection: "Over 9.5", price: 1.95, bookCount: 4, observedAtLabel: "pre-match" },
    { market: "Team total", selection: "Germany Under 2.5", price: 1.66, bookCount: 5, observedAtLabel: "pre-match" },
  ],
  predictions: [
    { market: "Total goals", selection: "Under 3", narrative: "Tight, cagey opener expected; both defenses set." },
    { market: "Corners", selection: "Over 9.5", narrative: "Wide play and crossing volume should generate corners." },
    { market: "Cards", selection: "Under 3.5", narrative: "Experienced referee, low-stakes group game." },
  ],
  fixtureWatermarked: true,
};

/** Tampa Bay Rays 13 – Kansas City Royals 2 · MLB · 25.06.26. */
export const RAYS_ROYALS: UniversalEventGenome = {
  eventId: "fixture-mlb-tb-kc-2026",
  sport: "baseball",
  league: "MLB",
  region: "USA",
  season: "2026",
  participants: [
    { id: "tb", name: "Tampa Bay Rays", side: "HOME", abbrev: "TB" },
    { id: "kc", name: "Kansas City Royals", side: "AWAY", abbrev: "KC" },
  ],
  venue: "Fixture venue",
  startTimeLabel: "25.06.26",
  status: "ENDED",
  periodSchema: { kind: "INNINGS", segments: ["1", "2", "3", "4", "5", "6", "7", "8", "9"], clockType: "DISCRETE", regulationSegments: 9 },
  scoreState: {
    home: 13,
    away: 2,
    final: true,
    // illustrative inning line (sums to 13–2)
    periodScores: [
      { period: "1", home: 0, away: 0 },
      { period: "2", home: 2, away: 0 },
      { period: "3", home: 1, away: 1 },
      { period: "4", home: 0, away: 0 },
      { period: "5", home: 3, away: 0 },
      { period: "6", home: 0, away: 1 },
      { period: "7", home: 4, away: 0 },
      { period: "8", home: 3, away: 0 },
      { period: "9", home: 0, away: 0 },
    ],
  },
  timeline: [
    { marker: "5th", type: "RUN", side: "HOME", subject: "Rays 3-run inning", detail: "fixture", knownAtMarker: true },
    { marker: "7th", type: "RUN", side: "HOME", subject: "Rays 4-run inning", detail: "fixture", knownAtMarker: true },
  ],
  stats: {
    starterHome: "Ian Seymour", starterAway: "Seth Lugo",
    hitsHome: 16, hitsAway: 5,
    errorsHome: 0, errorsAway: 2,
  },
  h2hContext: "Fixture series context (illustrative).",
  recentForm: "Rays recent home scoring trend (illustrative).",
  odds: [
    { market: "Moneyline", selection: "Tampa Bay Rays", price: 1.56, bookCount: 6, observedAtLabel: "pre-match" },
    { market: "Moneyline", selection: "Kansas City Royals", price: 2.5, bookCount: 6, observedAtLabel: "pre-match" },
    { market: "Run total", selection: "Over 9.5", price: 1.9, bookCount: 5, observedAtLabel: "pre-match" },
  ],
  predictions: [{ market: "Moneyline", selection: "Tampa Bay Rays", narrative: "Home run environment and starter edge." }],
  fixtureWatermarked: true,
};

/** Saskatchewan Roughriders vs Toronto Argonauts · CFL · upcoming. */
export const ROUGHRIDERS_ARGONAUTS: UniversalEventGenome = {
  eventId: "fixture-cfl-ssk-tor-2026",
  sport: "football",
  league: "CFL",
  region: "Canada",
  season: "2026",
  participants: [
    { id: "ssk", name: "Saskatchewan Roughriders", side: "HOME", abbrev: "SSK" },
    { id: "tor", name: "Toronto Argonauts", side: "AWAY", abbrev: "TOR" },
  ],
  venue: "Fixture stadium",
  startTimeLabel: "upcoming",
  status: "UPCOMING",
  periodSchema: { kind: "QUARTERS", segments: ["Q1", "Q2", "Q3", "Q4"], clockType: "RUNNING_DOWN", regulationSegments: 4 },
  scoreState: { home: 0, away: 0, final: false, periodScores: [] },
  timeline: [],
  stats: {
    spread: "SSK -3.5", total: 58.5,
    ppgHome: 27.4, ppgAway: 24.1,
    paHome: 22.0, paAway: 25.8,
  },
  standingsContext: [
    { team: "Saskatchewan Roughriders", rank: 2, record: "fixture standings" },
    { team: "Toronto Argonauts", rank: 5, record: "fixture standings" },
  ],
  h2hContext: "Fixture H2H (illustrative).",
  recentForm: "Saskatchewan low-scoring trend (illustrative).",
  odds: [
    { market: "Moneyline", selection: "Saskatchewan Roughriders", price: 1.62, bookCount: 5, observedAtLabel: "pre-match" },
    { market: "Moneyline", selection: "Toronto Argonauts", price: 2.35, bookCount: 5, observedAtLabel: "pre-match" },
    { market: "Spread", selection: "SSK -3.5", price: 1.91, bookCount: 5, observedAtLabel: "pre-match" },
    { market: "Total points", selection: "Under 58.5", price: 1.9, bookCount: 5, observedAtLabel: "pre-match" },
  ],
  predictions: [{ market: "Total points", selection: "Under 58.5", narrative: "Both defenses strong; pace trends low." }],
  fixtureWatermarked: true,
};

export const EVENT_GENOME_FIXTURES = {
  soccer: ECUADOR_GERMANY,
  baseball: RAYS_ROYALS,
  football: ROUGHRIDERS_ARGONAUTS,
} as const;
