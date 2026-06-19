/**
 * Team name normalization — canonical mapping from variant names to
 * canonical short/long form for display and matching.
 *
 * Covers NFL, NBA, MLB, NHL teams.
 * Pure function; zero deps.
 */

export interface TeamInfo {
  readonly canonical: string; // "Kansas City Chiefs"
  readonly short: string; // "Chiefs"
  readonly city: string; // "Kansas City"
  readonly abbreviation: string; // "KC"
  readonly sport: "nfl" | "nba" | "mlb" | "nhl";
  readonly conference?: string;
  readonly division?: string;
}

// ---------------------------------------------------------------------------
// Team data
// ---------------------------------------------------------------------------

const NFL_TEAMS: readonly TeamInfo[] = [
  // AFC East
  {
    canonical: "Buffalo Bills",
    short: "Bills",
    city: "Buffalo",
    abbreviation: "BUF",
    sport: "nfl",
    conference: "AFC",
    division: "East",
  },
  {
    canonical: "Miami Dolphins",
    short: "Dolphins",
    city: "Miami",
    abbreviation: "MIA",
    sport: "nfl",
    conference: "AFC",
    division: "East",
  },
  {
    canonical: "New England Patriots",
    short: "Patriots",
    city: "New England",
    abbreviation: "NE",
    sport: "nfl",
    conference: "AFC",
    division: "East",
  },
  {
    canonical: "New York Jets",
    short: "Jets",
    city: "New York",
    abbreviation: "NYJ",
    sport: "nfl",
    conference: "AFC",
    division: "East",
  },
  // AFC North
  {
    canonical: "Baltimore Ravens",
    short: "Ravens",
    city: "Baltimore",
    abbreviation: "BAL",
    sport: "nfl",
    conference: "AFC",
    division: "North",
  },
  {
    canonical: "Cincinnati Bengals",
    short: "Bengals",
    city: "Cincinnati",
    abbreviation: "CIN",
    sport: "nfl",
    conference: "AFC",
    division: "North",
  },
  {
    canonical: "Cleveland Browns",
    short: "Browns",
    city: "Cleveland",
    abbreviation: "CLE",
    sport: "nfl",
    conference: "AFC",
    division: "North",
  },
  {
    canonical: "Pittsburgh Steelers",
    short: "Steelers",
    city: "Pittsburgh",
    abbreviation: "PIT",
    sport: "nfl",
    conference: "AFC",
    division: "North",
  },
  // AFC South
  {
    canonical: "Houston Texans",
    short: "Texans",
    city: "Houston",
    abbreviation: "HOU",
    sport: "nfl",
    conference: "AFC",
    division: "South",
  },
  {
    canonical: "Indianapolis Colts",
    short: "Colts",
    city: "Indianapolis",
    abbreviation: "IND",
    sport: "nfl",
    conference: "AFC",
    division: "South",
  },
  {
    canonical: "Jacksonville Jaguars",
    short: "Jaguars",
    city: "Jacksonville",
    abbreviation: "JAC",
    sport: "nfl",
    conference: "AFC",
    division: "South",
  },
  {
    canonical: "Tennessee Titans",
    short: "Titans",
    city: "Tennessee",
    abbreviation: "TEN",
    sport: "nfl",
    conference: "AFC",
    division: "South",
  },
  // AFC West
  {
    canonical: "Denver Broncos",
    short: "Broncos",
    city: "Denver",
    abbreviation: "DEN",
    sport: "nfl",
    conference: "AFC",
    division: "West",
  },
  {
    canonical: "Kansas City Chiefs",
    short: "Chiefs",
    city: "Kansas City",
    abbreviation: "KC",
    sport: "nfl",
    conference: "AFC",
    division: "West",
  },
  {
    canonical: "Las Vegas Raiders",
    short: "Raiders",
    city: "Las Vegas",
    abbreviation: "LV",
    sport: "nfl",
    conference: "AFC",
    division: "West",
  },
  {
    canonical: "Los Angeles Chargers",
    short: "Chargers",
    city: "Los Angeles",
    abbreviation: "LAC",
    sport: "nfl",
    conference: "AFC",
    division: "West",
  },
  // NFC East
  {
    canonical: "Dallas Cowboys",
    short: "Cowboys",
    city: "Dallas",
    abbreviation: "DAL",
    sport: "nfl",
    conference: "NFC",
    division: "East",
  },
  {
    canonical: "New York Giants",
    short: "Giants",
    city: "New York",
    abbreviation: "NYG",
    sport: "nfl",
    conference: "NFC",
    division: "East",
  },
  {
    canonical: "Philadelphia Eagles",
    short: "Eagles",
    city: "Philadelphia",
    abbreviation: "PHI",
    sport: "nfl",
    conference: "NFC",
    division: "East",
  },
  {
    canonical: "Washington Commanders",
    short: "Commanders",
    city: "Washington",
    abbreviation: "WSH",
    sport: "nfl",
    conference: "NFC",
    division: "East",
  },
  // NFC North
  {
    canonical: "Chicago Bears",
    short: "Bears",
    city: "Chicago",
    abbreviation: "CHI",
    sport: "nfl",
    conference: "NFC",
    division: "North",
  },
  {
    canonical: "Detroit Lions",
    short: "Lions",
    city: "Detroit",
    abbreviation: "DET",
    sport: "nfl",
    conference: "NFC",
    division: "North",
  },
  {
    canonical: "Green Bay Packers",
    short: "Packers",
    city: "Green Bay",
    abbreviation: "GB",
    sport: "nfl",
    conference: "NFC",
    division: "North",
  },
  {
    canonical: "Minnesota Vikings",
    short: "Vikings",
    city: "Minnesota",
    abbreviation: "MIN",
    sport: "nfl",
    conference: "NFC",
    division: "North",
  },
  // NFC South
  {
    canonical: "Atlanta Falcons",
    short: "Falcons",
    city: "Atlanta",
    abbreviation: "ATL",
    sport: "nfl",
    conference: "NFC",
    division: "South",
  },
  {
    canonical: "Carolina Panthers",
    short: "Panthers",
    city: "Carolina",
    abbreviation: "CAR",
    sport: "nfl",
    conference: "NFC",
    division: "South",
  },
  {
    canonical: "New Orleans Saints",
    short: "Saints",
    city: "New Orleans",
    abbreviation: "NO",
    sport: "nfl",
    conference: "NFC",
    division: "South",
  },
  {
    canonical: "Tampa Bay Buccaneers",
    short: "Buccaneers",
    city: "Tampa Bay",
    abbreviation: "TB",
    sport: "nfl",
    conference: "NFC",
    division: "South",
  },
  // NFC West
  {
    canonical: "Arizona Cardinals",
    short: "Cardinals",
    city: "Arizona",
    abbreviation: "ARI",
    sport: "nfl",
    conference: "NFC",
    division: "West",
  },
  {
    canonical: "Los Angeles Rams",
    short: "Rams",
    city: "Los Angeles",
    abbreviation: "LAR",
    sport: "nfl",
    conference: "NFC",
    division: "West",
  },
  {
    canonical: "San Francisco 49ers",
    short: "49ers",
    city: "San Francisco",
    abbreviation: "SF",
    sport: "nfl",
    conference: "NFC",
    division: "West",
  },
  {
    canonical: "Seattle Seahawks",
    short: "Seahawks",
    city: "Seattle",
    abbreviation: "SEA",
    sport: "nfl",
    conference: "NFC",
    division: "West",
  },
];

const NBA_TEAMS: readonly TeamInfo[] = [
  // Atlantic
  {
    canonical: "Boston Celtics",
    short: "Celtics",
    city: "Boston",
    abbreviation: "BOS",
    sport: "nba",
    conference: "Eastern",
    division: "Atlantic",
  },
  {
    canonical: "Brooklyn Nets",
    short: "Nets",
    city: "Brooklyn",
    abbreviation: "BKN",
    sport: "nba",
    conference: "Eastern",
    division: "Atlantic",
  },
  {
    canonical: "New York Knicks",
    short: "Knicks",
    city: "New York",
    abbreviation: "NYK",
    sport: "nba",
    conference: "Eastern",
    division: "Atlantic",
  },
  {
    canonical: "Philadelphia 76ers",
    short: "76ers",
    city: "Philadelphia",
    abbreviation: "PHI",
    sport: "nba",
    conference: "Eastern",
    division: "Atlantic",
  },
  {
    canonical: "Toronto Raptors",
    short: "Raptors",
    city: "Toronto",
    abbreviation: "TOR",
    sport: "nba",
    conference: "Eastern",
    division: "Atlantic",
  },
  // Central
  {
    canonical: "Chicago Bulls",
    short: "Bulls",
    city: "Chicago",
    abbreviation: "CHI",
    sport: "nba",
    conference: "Eastern",
    division: "Central",
  },
  {
    canonical: "Cleveland Cavaliers",
    short: "Cavaliers",
    city: "Cleveland",
    abbreviation: "CLE",
    sport: "nba",
    conference: "Eastern",
    division: "Central",
  },
  {
    canonical: "Detroit Pistons",
    short: "Pistons",
    city: "Detroit",
    abbreviation: "DET",
    sport: "nba",
    conference: "Eastern",
    division: "Central",
  },
  {
    canonical: "Indiana Pacers",
    short: "Pacers",
    city: "Indiana",
    abbreviation: "IND",
    sport: "nba",
    conference: "Eastern",
    division: "Central",
  },
  {
    canonical: "Milwaukee Bucks",
    short: "Bucks",
    city: "Milwaukee",
    abbreviation: "MIL",
    sport: "nba",
    conference: "Eastern",
    division: "Central",
  },
  // Southeast
  {
    canonical: "Atlanta Hawks",
    short: "Hawks",
    city: "Atlanta",
    abbreviation: "ATL",
    sport: "nba",
    conference: "Eastern",
    division: "Southeast",
  },
  {
    canonical: "Charlotte Hornets",
    short: "Hornets",
    city: "Charlotte",
    abbreviation: "CHA",
    sport: "nba",
    conference: "Eastern",
    division: "Southeast",
  },
  {
    canonical: "Miami Heat",
    short: "Heat",
    city: "Miami",
    abbreviation: "MIA",
    sport: "nba",
    conference: "Eastern",
    division: "Southeast",
  },
  {
    canonical: "Orlando Magic",
    short: "Magic",
    city: "Orlando",
    abbreviation: "ORL",
    sport: "nba",
    conference: "Eastern",
    division: "Southeast",
  },
  {
    canonical: "Washington Wizards",
    short: "Wizards",
    city: "Washington",
    abbreviation: "WAS",
    sport: "nba",
    conference: "Eastern",
    division: "Southeast",
  },
  // Northwest
  {
    canonical: "Denver Nuggets",
    short: "Nuggets",
    city: "Denver",
    abbreviation: "DEN",
    sport: "nba",
    conference: "Western",
    division: "Northwest",
  },
  {
    canonical: "Minnesota Timberwolves",
    short: "Timberwolves",
    city: "Minnesota",
    abbreviation: "MIN",
    sport: "nba",
    conference: "Western",
    division: "Northwest",
  },
  {
    canonical: "Oklahoma City Thunder",
    short: "Thunder",
    city: "Oklahoma City",
    abbreviation: "OKC",
    sport: "nba",
    conference: "Western",
    division: "Northwest",
  },
  {
    canonical: "Portland Trail Blazers",
    short: "Trail Blazers",
    city: "Portland",
    abbreviation: "POR",
    sport: "nba",
    conference: "Western",
    division: "Northwest",
  },
  {
    canonical: "Utah Jazz",
    short: "Jazz",
    city: "Utah",
    abbreviation: "UTA",
    sport: "nba",
    conference: "Western",
    division: "Northwest",
  },
  // Pacific
  {
    canonical: "Golden State Warriors",
    short: "Warriors",
    city: "Golden State",
    abbreviation: "GSW",
    sport: "nba",
    conference: "Western",
    division: "Pacific",
  },
  {
    canonical: "Los Angeles Clippers",
    short: "Clippers",
    city: "Los Angeles",
    abbreviation: "LAC",
    sport: "nba",
    conference: "Western",
    division: "Pacific",
  },
  {
    canonical: "Los Angeles Lakers",
    short: "Lakers",
    city: "Los Angeles",
    abbreviation: "LAL",
    sport: "nba",
    conference: "Western",
    division: "Pacific",
  },
  {
    canonical: "Phoenix Suns",
    short: "Suns",
    city: "Phoenix",
    abbreviation: "PHX",
    sport: "nba",
    conference: "Western",
    division: "Pacific",
  },
  {
    canonical: "Sacramento Kings",
    short: "Kings",
    city: "Sacramento",
    abbreviation: "SAC",
    sport: "nba",
    conference: "Western",
    division: "Pacific",
  },
  // Southwest
  {
    canonical: "Dallas Mavericks",
    short: "Mavericks",
    city: "Dallas",
    abbreviation: "DAL",
    sport: "nba",
    conference: "Western",
    division: "Southwest",
  },
  {
    canonical: "Houston Rockets",
    short: "Rockets",
    city: "Houston",
    abbreviation: "HOU",
    sport: "nba",
    conference: "Western",
    division: "Southwest",
  },
  {
    canonical: "Memphis Grizzlies",
    short: "Grizzlies",
    city: "Memphis",
    abbreviation: "MEM",
    sport: "nba",
    conference: "Western",
    division: "Southwest",
  },
  {
    canonical: "New Orleans Pelicans",
    short: "Pelicans",
    city: "New Orleans",
    abbreviation: "NOP",
    sport: "nba",
    conference: "Western",
    division: "Southwest",
  },
  {
    canonical: "San Antonio Spurs",
    short: "Spurs",
    city: "San Antonio",
    abbreviation: "SAS",
    sport: "nba",
    conference: "Western",
    division: "Southwest",
  },
];

const MLB_TEAMS: readonly TeamInfo[] = [
  // AL East
  {
    canonical: "Baltimore Orioles",
    short: "Orioles",
    city: "Baltimore",
    abbreviation: "BAL",
    sport: "mlb",
    conference: "AL",
    division: "East",
  },
  {
    canonical: "Boston Red Sox",
    short: "Red Sox",
    city: "Boston",
    abbreviation: "BOS",
    sport: "mlb",
    conference: "AL",
    division: "East",
  },
  {
    canonical: "New York Yankees",
    short: "Yankees",
    city: "New York",
    abbreviation: "NYY",
    sport: "mlb",
    conference: "AL",
    division: "East",
  },
  {
    canonical: "Tampa Bay Rays",
    short: "Rays",
    city: "Tampa Bay",
    abbreviation: "TB",
    sport: "mlb",
    conference: "AL",
    division: "East",
  },
  {
    canonical: "Toronto Blue Jays",
    short: "Blue Jays",
    city: "Toronto",
    abbreviation: "TOR",
    sport: "mlb",
    conference: "AL",
    division: "East",
  },
  // AL Central
  {
    canonical: "Chicago White Sox",
    short: "White Sox",
    city: "Chicago",
    abbreviation: "CWS",
    sport: "mlb",
    conference: "AL",
    division: "Central",
  },
  {
    canonical: "Cleveland Guardians",
    short: "Guardians",
    city: "Cleveland",
    abbreviation: "CLE",
    sport: "mlb",
    conference: "AL",
    division: "Central",
  },
  {
    canonical: "Detroit Tigers",
    short: "Tigers",
    city: "Detroit",
    abbreviation: "DET",
    sport: "mlb",
    conference: "AL",
    division: "Central",
  },
  {
    canonical: "Kansas City Royals",
    short: "Royals",
    city: "Kansas City",
    abbreviation: "KC",
    sport: "mlb",
    conference: "AL",
    division: "Central",
  },
  {
    canonical: "Minnesota Twins",
    short: "Twins",
    city: "Minnesota",
    abbreviation: "MIN",
    sport: "mlb",
    conference: "AL",
    division: "Central",
  },
  // AL West
  {
    canonical: "Houston Astros",
    short: "Astros",
    city: "Houston",
    abbreviation: "HOU",
    sport: "mlb",
    conference: "AL",
    division: "West",
  },
  {
    canonical: "Los Angeles Angels",
    short: "Angels",
    city: "Los Angeles",
    abbreviation: "LAA",
    sport: "mlb",
    conference: "AL",
    division: "West",
  },
  {
    canonical: "Oakland Athletics",
    short: "Athletics",
    city: "Oakland",
    abbreviation: "OAK",
    sport: "mlb",
    conference: "AL",
    division: "West",
  },
  {
    canonical: "Seattle Mariners",
    short: "Mariners",
    city: "Seattle",
    abbreviation: "SEA",
    sport: "mlb",
    conference: "AL",
    division: "West",
  },
  {
    canonical: "Texas Rangers",
    short: "Rangers",
    city: "Texas",
    abbreviation: "TEX",
    sport: "mlb",
    conference: "AL",
    division: "West",
  },
  // NL East
  {
    canonical: "Atlanta Braves",
    short: "Braves",
    city: "Atlanta",
    abbreviation: "ATL",
    sport: "mlb",
    conference: "NL",
    division: "East",
  },
  {
    canonical: "Miami Marlins",
    short: "Marlins",
    city: "Miami",
    abbreviation: "MIA",
    sport: "mlb",
    conference: "NL",
    division: "East",
  },
  {
    canonical: "New York Mets",
    short: "Mets",
    city: "New York",
    abbreviation: "NYM",
    sport: "mlb",
    conference: "NL",
    division: "East",
  },
  {
    canonical: "Philadelphia Phillies",
    short: "Phillies",
    city: "Philadelphia",
    abbreviation: "PHI",
    sport: "mlb",
    conference: "NL",
    division: "East",
  },
  {
    canonical: "Washington Nationals",
    short: "Nationals",
    city: "Washington",
    abbreviation: "WSH",
    sport: "mlb",
    conference: "NL",
    division: "East",
  },
  // NL Central
  {
    canonical: "Chicago Cubs",
    short: "Cubs",
    city: "Chicago",
    abbreviation: "CHC",
    sport: "mlb",
    conference: "NL",
    division: "Central",
  },
  {
    canonical: "Cincinnati Reds",
    short: "Reds",
    city: "Cincinnati",
    abbreviation: "CIN",
    sport: "mlb",
    conference: "NL",
    division: "Central",
  },
  {
    canonical: "Milwaukee Brewers",
    short: "Brewers",
    city: "Milwaukee",
    abbreviation: "MIL",
    sport: "mlb",
    conference: "NL",
    division: "Central",
  },
  {
    canonical: "Pittsburgh Pirates",
    short: "Pirates",
    city: "Pittsburgh",
    abbreviation: "PIT",
    sport: "mlb",
    conference: "NL",
    division: "Central",
  },
  {
    canonical: "St. Louis Cardinals",
    short: "Cardinals",
    city: "St. Louis",
    abbreviation: "STL",
    sport: "mlb",
    conference: "NL",
    division: "Central",
  },
  // NL West
  {
    canonical: "Arizona Diamondbacks",
    short: "Diamondbacks",
    city: "Arizona",
    abbreviation: "ARI",
    sport: "mlb",
    conference: "NL",
    division: "West",
  },
  {
    canonical: "Colorado Rockies",
    short: "Rockies",
    city: "Colorado",
    abbreviation: "COL",
    sport: "mlb",
    conference: "NL",
    division: "West",
  },
  {
    canonical: "Los Angeles Dodgers",
    short: "Dodgers",
    city: "Los Angeles",
    abbreviation: "LAD",
    sport: "mlb",
    conference: "NL",
    division: "West",
  },
  {
    canonical: "San Diego Padres",
    short: "Padres",
    city: "San Diego",
    abbreviation: "SD",
    sport: "mlb",
    conference: "NL",
    division: "West",
  },
  {
    canonical: "San Francisco Giants",
    short: "Giants",
    city: "San Francisco",
    abbreviation: "SF",
    sport: "mlb",
    conference: "NL",
    division: "West",
  },
];

const NHL_TEAMS: readonly TeamInfo[] = [
  // Atlantic
  {
    canonical: "Boston Bruins",
    short: "Bruins",
    city: "Boston",
    abbreviation: "BOS",
    sport: "nhl",
    conference: "Eastern",
    division: "Atlantic",
  },
  {
    canonical: "Buffalo Sabres",
    short: "Sabres",
    city: "Buffalo",
    abbreviation: "BUF",
    sport: "nhl",
    conference: "Eastern",
    division: "Atlantic",
  },
  {
    canonical: "Detroit Red Wings",
    short: "Red Wings",
    city: "Detroit",
    abbreviation: "DET",
    sport: "nhl",
    conference: "Eastern",
    division: "Atlantic",
  },
  {
    canonical: "Florida Panthers",
    short: "Panthers",
    city: "Florida",
    abbreviation: "FLA",
    sport: "nhl",
    conference: "Eastern",
    division: "Atlantic",
  },
  {
    canonical: "Montreal Canadiens",
    short: "Canadiens",
    city: "Montreal",
    abbreviation: "MTL",
    sport: "nhl",
    conference: "Eastern",
    division: "Atlantic",
  },
  {
    canonical: "Ottawa Senators",
    short: "Senators",
    city: "Ottawa",
    abbreviation: "OTT",
    sport: "nhl",
    conference: "Eastern",
    division: "Atlantic",
  },
  {
    canonical: "Tampa Bay Lightning",
    short: "Lightning",
    city: "Tampa Bay",
    abbreviation: "TBL",
    sport: "nhl",
    conference: "Eastern",
    division: "Atlantic",
  },
  {
    canonical: "Toronto Maple Leafs",
    short: "Maple Leafs",
    city: "Toronto",
    abbreviation: "TOR",
    sport: "nhl",
    conference: "Eastern",
    division: "Atlantic",
  },
  // Metropolitan
  {
    canonical: "Carolina Hurricanes",
    short: "Hurricanes",
    city: "Carolina",
    abbreviation: "CAR",
    sport: "nhl",
    conference: "Eastern",
    division: "Metropolitan",
  },
  {
    canonical: "Columbus Blue Jackets",
    short: "Blue Jackets",
    city: "Columbus",
    abbreviation: "CBJ",
    sport: "nhl",
    conference: "Eastern",
    division: "Metropolitan",
  },
  {
    canonical: "New Jersey Devils",
    short: "Devils",
    city: "New Jersey",
    abbreviation: "NJD",
    sport: "nhl",
    conference: "Eastern",
    division: "Metropolitan",
  },
  {
    canonical: "New York Islanders",
    short: "Islanders",
    city: "New York",
    abbreviation: "NYI",
    sport: "nhl",
    conference: "Eastern",
    division: "Metropolitan",
  },
  {
    canonical: "New York Rangers",
    short: "Rangers",
    city: "New York",
    abbreviation: "NYR",
    sport: "nhl",
    conference: "Eastern",
    division: "Metropolitan",
  },
  {
    canonical: "Philadelphia Flyers",
    short: "Flyers",
    city: "Philadelphia",
    abbreviation: "PHI",
    sport: "nhl",
    conference: "Eastern",
    division: "Metropolitan",
  },
  {
    canonical: "Pittsburgh Penguins",
    short: "Penguins",
    city: "Pittsburgh",
    abbreviation: "PIT",
    sport: "nhl",
    conference: "Eastern",
    division: "Metropolitan",
  },
  {
    canonical: "Washington Capitals",
    short: "Capitals",
    city: "Washington",
    abbreviation: "WSH",
    sport: "nhl",
    conference: "Eastern",
    division: "Metropolitan",
  },
  // Central
  {
    canonical: "Arizona Coyotes",
    short: "Coyotes",
    city: "Arizona",
    abbreviation: "ARI",
    sport: "nhl",
    conference: "Western",
    division: "Central",
  },
  {
    canonical: "Chicago Blackhawks",
    short: "Blackhawks",
    city: "Chicago",
    abbreviation: "CHI",
    sport: "nhl",
    conference: "Western",
    division: "Central",
  },
  {
    canonical: "Colorado Avalanche",
    short: "Avalanche",
    city: "Colorado",
    abbreviation: "COL",
    sport: "nhl",
    conference: "Western",
    division: "Central",
  },
  {
    canonical: "Dallas Stars",
    short: "Stars",
    city: "Dallas",
    abbreviation: "DAL",
    sport: "nhl",
    conference: "Western",
    division: "Central",
  },
  {
    canonical: "Minnesota Wild",
    short: "Wild",
    city: "Minnesota",
    abbreviation: "MIN",
    sport: "nhl",
    conference: "Western",
    division: "Central",
  },
  {
    canonical: "Nashville Predators",
    short: "Predators",
    city: "Nashville",
    abbreviation: "NSH",
    sport: "nhl",
    conference: "Western",
    division: "Central",
  },
  {
    canonical: "St. Louis Blues",
    short: "Blues",
    city: "St. Louis",
    abbreviation: "STL",
    sport: "nhl",
    conference: "Western",
    division: "Central",
  },
  {
    canonical: "Winnipeg Jets",
    short: "Jets",
    city: "Winnipeg",
    abbreviation: "WPG",
    sport: "nhl",
    conference: "Western",
    division: "Central",
  },
  // Pacific
  {
    canonical: "Anaheim Ducks",
    short: "Ducks",
    city: "Anaheim",
    abbreviation: "ANA",
    sport: "nhl",
    conference: "Western",
    division: "Pacific",
  },
  {
    canonical: "Calgary Flames",
    short: "Flames",
    city: "Calgary",
    abbreviation: "CGY",
    sport: "nhl",
    conference: "Western",
    division: "Pacific",
  },
  {
    canonical: "Edmonton Oilers",
    short: "Oilers",
    city: "Edmonton",
    abbreviation: "EDM",
    sport: "nhl",
    conference: "Western",
    division: "Pacific",
  },
  {
    canonical: "Los Angeles Kings",
    short: "Kings",
    city: "Los Angeles",
    abbreviation: "LAK",
    sport: "nhl",
    conference: "Western",
    division: "Pacific",
  },
  {
    canonical: "San Jose Sharks",
    short: "Sharks",
    city: "San Jose",
    abbreviation: "SJS",
    sport: "nhl",
    conference: "Western",
    division: "Pacific",
  },
  {
    canonical: "Seattle Kraken",
    short: "Kraken",
    city: "Seattle",
    abbreviation: "SEA",
    sport: "nhl",
    conference: "Western",
    division: "Pacific",
  },
  {
    canonical: "Vancouver Canucks",
    short: "Canucks",
    city: "Vancouver",
    abbreviation: "VAN",
    sport: "nhl",
    conference: "Western",
    division: "Pacific",
  },
  {
    canonical: "Vegas Golden Knights",
    short: "Golden Knights",
    city: "Vegas",
    abbreviation: "VGK",
    sport: "nhl",
    conference: "Western",
    division: "Pacific",
  },
];

// ---------------------------------------------------------------------------
// Lookup map construction
// ---------------------------------------------------------------------------

/**
 * Normalise a raw string for lookup: lowercase, trim, collapse spaces,
 * strip common punctuation.
 */
function normaliseKey(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[.\-']/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Generate all variant keys for a TeamInfo entry.
 * Covers: canonical, short, city, abbreviation, and common nicknames.
 */
function variantsFor(team: TeamInfo): string[] {
  const variants: string[] = [
    team.canonical,
    team.short,
    team.city,
    team.abbreviation,
    `${team.city} ${team.short}`, // "Kansas City Chiefs"
  ];

  // Sport-specific extras
  if (team.sport === "nfl") {
    // e.g. "KC Chiefs" from abbreviation + short
    variants.push(`${team.abbreviation} ${team.short}`);
    // e.g. "KCC" = abbreviation + first char of short (common data-feed pattern)
    variants.push(`${team.abbreviation}${team.short[0]}`);
  }
  if (team.sport === "nba") {
    // "LA Lakers" etc.
    const cityShort = team.city.replace("Los Angeles", "LA")
                              .replace("Golden State", "GS")
                              .replace("Oklahoma City", "OKC")
                              .replace("San Antonio", "SA")
                              .replace("New Orleans", "NO")
                              .replace("New York", "NY");
    if (cityShort !== team.city) {
      variants.push(`${cityShort} ${team.short}`);
      variants.push(cityShort);
    }
  }
  if (team.sport === "mlb") {
    // Sox, Jays, etc. short forms already in short field; add abbreviation + short
    variants.push(`${team.abbreviation} ${team.short}`);
  }

  return variants.map(normaliseKey);
}

type SportKey = "nfl" | "nba" | "mlb" | "nhl";

/** Global lookup: normalised variant → TeamInfo */
const GLOBAL_LOOKUP = new Map<string, TeamInfo>();
/** Per-sport lookup for disambiguation */
const SPORT_LOOKUP = new Map<SportKey, Map<string, TeamInfo>>();

function buildLookup(teams: readonly TeamInfo[]): void {
  const sport = teams[0]!.sport;
  const sportMap = new Map<string, TeamInfo>();

  for (const team of teams) {
    const keys = variantsFor(team);
    for (const key of keys) {
      // Global: first write wins (avoids overwriting with ambiguous cross-sport keys)
      if (!GLOBAL_LOOKUP.has(key)) {
        GLOBAL_LOOKUP.set(key, team);
      }
      sportMap.set(key, team);
    }
  }
  SPORT_LOOKUP.set(sport, sportMap);
}

buildLookup(NFL_TEAMS);
buildLookup(NBA_TEAMS);
buildLookup(MLB_TEAMS);
buildLookup(NHL_TEAMS);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Normalise a team name to its canonical TeamInfo.
 *
 * @param name  - Any variant name (e.g. "KC Chiefs", "Chiefs", "KCC", "Kansas City").
 * @param sport - Optional sport context for disambiguation.
 * @returns TeamInfo or null if not found.
 */
export function normalizeTeamName(
  name: string,
  sport?: "nfl" | "nba" | "mlb" | "nhl"
): TeamInfo | null {
  const key = normaliseKey(name);

  if (sport !== undefined) {
    const sportMap = SPORT_LOOKUP.get(sport);
    if (sportMap?.has(key)) {
      return sportMap.get(key)!;
    }
  }

  return GLOBAL_LOOKUP.get(key) ?? null;
}

/**
 * Return all teams for a given sport.
 */
export function teamsForSport(
  sport: "nfl" | "nba" | "mlb" | "nhl"
): readonly TeamInfo[] {
  switch (sport) {
    case "nfl":
      return NFL_TEAMS;
    case "nba":
      return NBA_TEAMS;
    case "mlb":
      return MLB_TEAMS;
    case "nhl":
      return NHL_TEAMS;
  }
}

/**
 * Return a map of abbreviation → canonical team name for a sport.
 */
export function teamAbbreviations(
  sport: "nfl" | "nba" | "mlb" | "nhl"
): Record<string, string> {
  const teams = teamsForSport(sport);
  const result: Record<string, string> = {};
  for (const team of teams) {
    result[team.abbreviation] = team.canonical;
  }
  return result;
}
