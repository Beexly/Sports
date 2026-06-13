/**
 * NFL Head Coaches — current season reference data.
 *
 * Source: public NFL.com / Wikipedia factual data (not scraping — entered manually).
 * License: Facts are not copyrightable (Feist v. Rural Telephone).
 * Freshness: Update at the start of each season. The `asOf` field marks the
 * last verified date. A freshness warning surfaces when it is > 180 days old.
 *
 * To update: cross-reference NFL.com/teams and update the `headCoach` field
 * for any team that changed, then bump `asOf` to today's date.
 */

export interface NflCoachEntry {
  readonly team: string;   // nflverse/The Odds API abbreviation
  readonly fullName: string;
  readonly headCoach: string;
  readonly offCoordinator: string | null;
  readonly defCoordinator: string | null;
  /** Year in which the head coach started with this team. */
  readonly hiredYear: number;
}

/** ISO date this data was last verified. */
export const COACHES_AS_OF = "2025-08-01";

/** All 32 NFL franchises with coaching staff as of COACHES_AS_OF. */
export const NFL_COACHES: readonly NflCoachEntry[] = [
  { team: "ARI", fullName: "Arizona Cardinals",      headCoach: "Jonathan Gannon",    offCoordinator: "Drew Petzing",      defCoordinator: "Nick Rallis",       hiredYear: 2023 },
  { team: "ATL", fullName: "Atlanta Falcons",         headCoach: "Raheem Morris",      offCoordinator: "Zac Robinson",      defCoordinator: "Jeff Ulbrich",      hiredYear: 2024 },
  { team: "BAL", fullName: "Baltimore Ravens",        headCoach: "John Harbaugh",      offCoordinator: "Todd Monken",       defCoordinator: "Zach Orr",          hiredYear: 2008 },
  { team: "BUF", fullName: "Buffalo Bills",           headCoach: "Sean McDermott",     offCoordinator: "Joe Brady",         defCoordinator: "Bobby Babich",      hiredYear: 2017 },
  { team: "CAR", fullName: "Carolina Panthers",       headCoach: "Dave Canales",       offCoordinator: "Brad Idzik",        defCoordinator: "Ejiro Evero",       hiredYear: 2024 },
  { team: "CHI", fullName: "Chicago Bears",           headCoach: "Ben Johnson",        offCoordinator: null,                defCoordinator: "Dennis Allen",      hiredYear: 2025 },
  { team: "CIN", fullName: "Cincinnati Bengals",      headCoach: "Zac Taylor",         offCoordinator: "Dan Pitcher",       defCoordinator: "Al Golden",         hiredYear: 2019 },
  { team: "CLE", fullName: "Cleveland Browns",        headCoach: "Kevin Stefanski",    offCoordinator: "Tommy Rees",        defCoordinator: "Jim Schwartz",      hiredYear: 2020 },
  { team: "DAL", fullName: "Dallas Cowboys",          headCoach: "Brian Schottenheimer", offCoordinator: "Brian Schottenheimer", defCoordinator: "Matt Eberflus",  hiredYear: 2025 },
  { team: "DEN", fullName: "Denver Broncos",          headCoach: "Sean Payton",        offCoordinator: "Joe Lombardi",      defCoordinator: "Vance Joseph",      hiredYear: 2023 },
  { team: "DET", fullName: "Detroit Lions",           headCoach: "Dan Campbell",       offCoordinator: "John Morton",       defCoordinator: "Aaron Glenn",       hiredYear: 2021 },
  { team: "GB",  fullName: "Green Bay Packers",       headCoach: "Matt LaFleur",       offCoordinator: "Adam Stenavich",    defCoordinator: "Jeff Hafley",       hiredYear: 2019 },
  { team: "HOU", fullName: "Houston Texans",          headCoach: "DeMeco Ryans",       offCoordinator: "Bobby Slowik",      defCoordinator: "Matt Burke",        hiredYear: 2023 },
  { team: "IND", fullName: "Indianapolis Colts",      headCoach: "Shane Steichen",     offCoordinator: "Scottie Montgomery", defCoordinator: "Gus Bradley",      hiredYear: 2023 },
  { team: "JAX", fullName: "Jacksonville Jaguars",    headCoach: "Liam Coen",          offCoordinator: "Liam Coen",         defCoordinator: "Ryan Nielsen",      hiredYear: 2025 },
  { team: "KC",  fullName: "Kansas City Chiefs",      headCoach: "Andy Reid",          offCoordinator: "Matt Nagy",         defCoordinator: "Steve Spagnuolo",   hiredYear: 2013 },
  { team: "LA",  fullName: "Los Angeles Rams",        headCoach: "Sean McVay",         offCoordinator: "Mike LaFleur",      defCoordinator: "Chris Shula",       hiredYear: 2017 },
  { team: "LAC", fullName: "Los Angeles Chargers",    headCoach: "Jim Harbaugh",       offCoordinator: "Greg Roman",        defCoordinator: "Jesse Minter",      hiredYear: 2024 },
  { team: "LV",  fullName: "Las Vegas Raiders",       headCoach: "Pete Carroll",       offCoordinator: "Scott Turner",      defCoordinator: "Patrick Graham",    hiredYear: 2025 },
  { team: "MIA", fullName: "Miami Dolphins",          headCoach: "Mike McDaniel",      offCoordinator: "Frank Smith",       defCoordinator: "Anthony Weaver",    hiredYear: 2022 },
  { team: "MIN", fullName: "Minnesota Vikings",       headCoach: "Kevin O'Connell",    offCoordinator: "Wes Phillips",      defCoordinator: "Brian Flores",      hiredYear: 2022 },
  { team: "NE",  fullName: "New England Patriots",    headCoach: "Mike Vrabel",        offCoordinator: "Josh McDaniels",    defCoordinator: "DeMarcus Covington", hiredYear: 2025 },
  { team: "NO",  fullName: "New Orleans Saints",      headCoach: "Darren Rizzi",       offCoordinator: "Klint Kubiak",      defCoordinator: "Joe Woods",         hiredYear: 2024 },
  { team: "NYG", fullName: "New York Giants",         headCoach: "Brian Daboll",       offCoordinator: "Mike Kafka",        defCoordinator: "Shane Bowen",       hiredYear: 2022 },
  { team: "NYJ", fullName: "New York Jets",           headCoach: "Aaron Glenn",        offCoordinator: "Tanner Engstrand",  defCoordinator: "Aaron Glenn",       hiredYear: 2025 },
  { team: "PHI", fullName: "Philadelphia Eagles",     headCoach: "Nick Sirianni",      offCoordinator: "Kellen Moore",      defCoordinator: "Vic Fangio",        hiredYear: 2021 },
  { team: "PIT", fullName: "Pittsburgh Steelers",     headCoach: "Mike Tomlin",        offCoordinator: "Arthur Smith",      defCoordinator: "Teryl Austin",      hiredYear: 2007 },
  { team: "SEA", fullName: "Seattle Seahawks",        headCoach: "Mike Macdonald",     offCoordinator: "Ryan Grubb",        defCoordinator: "Mike Macdonald",    hiredYear: 2024 },
  { team: "SF",  fullName: "San Francisco 49ers",     headCoach: "Kyle Shanahan",      offCoordinator: "Kyle Shanahan",     defCoordinator: "Nick Sorensen",     hiredYear: 2017 },
  { team: "TB",  fullName: "Tampa Bay Buccaneers",    headCoach: "Todd Bowles",        offCoordinator: "Liam Coen",         defCoordinator: "Kacy Rodgers",      hiredYear: 2022 },
  { team: "TEN", fullName: "Tennessee Titans",        headCoach: "Brian Callahan",     offCoordinator: "Nick Holz",         defCoordinator: "Dennard Wilson",    hiredYear: 2024 },
  { team: "WSH", fullName: "Washington Commanders",   headCoach: "Dan Quinn",          offCoordinator: "Kliff Kingsbury",   defCoordinator: "Joe Whitt Jr.",     hiredYear: 2024 },
];

const byTeam = new Map(NFL_COACHES.map((c) => [c.team, c]));

export function coachByTeam(team: string): NflCoachEntry | null {
  return byTeam.get(team.toUpperCase()) ?? null;
}

/** Days since COACHES_AS_OF — used for freshness warnings. */
export function coachesDataAgeDays(now = new Date()): number {
  return Math.floor((now.getTime() - new Date(COACHES_AS_OF).getTime()) / 86_400_000);
}
