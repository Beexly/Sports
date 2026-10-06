/**
 * C-415 — the NFL reporter roster, in code, for all 32 teams.
 *
 * Every club official news feed, every ESPN team feed (the historical team-blog
 * RSS pattern; verified dead on 2026-09-15 and therefore excluded from the live
 * CURATED list — see fixtures), and the public Bluesky/Substack feeds of each
 * club's primary beat reporters plus the national league insiders.
 *
 * X/Twitter is excluded (D15: the API costs money and its terms forbid collection).
 * Bluesky per-profile RSS (`https://bsky.app/profile/<handle>/rss`) and Substack
 * `/feed` are published for machine readers — the same posture `rss.ts` already
 * states for RSS itself.
 *
 * GSN's own feed is in the roster as `Verified` with `selfSourced: true` so it
 * can never corroborate itself (C-417).
 *
 * Built from public press lists and the reporters' own bios; every URL was
 * probed 2026-09-15 and the result lives in `reporter-roster-fixtures.ts`.
 */

import type { Tier } from "./impact";
import type { RssFeedConfig } from "./rss";

/** How a roster entry got on the wire. Used to build CURATED and to skip dead kinds. */
export type RosterKind =
  | "club"
  | "espn-team"
  | "beat"
  | "insider"
  | "league"
  | "gsn";

export type RosterEntry = RssFeedConfig & {
  readonly kind: RosterKind;
  /** Bluesky handle (without /rss) or Substack/newsletter host, when applicable. */
  readonly handle?: string;
};

/** Canonical 32-team list — same abbreviations as `lib/nfl/team-resolver` / wire.ts. */
export const NFL_TEAM_ABBREVIATIONS: readonly string[] = [
  "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE", "DAL", "DEN",
  "DET", "GB", "HOU", "IND", "JAX", "KC", "LV", "LAC", "LAR", "MIA",
  "MIN", "NE", "NO", "NYG", "NYJ", "PHI", "PIT", "SEA", "SF", "TB",
  "TEN", "WAS",
] as const;

export function bskyProfileRss(handle: string): string {
  return `https://bsky.app/profile/${handle}/rss`;
}

function club(team: string, domain: string, clubName: string): RosterEntry {
  return {
    url: `https://www.${domain}/rss/news`,
    source: `${clubName} Official`,
    tier: "Verified",
    team,
    kind: "club",
  };
}

/**
 * ESPN's per-team blog RSS. The pattern is the one ESPN published for a decade
 * (`/blog/<slug>/rss`). Probed 2026-09-15: every slug 302s to the blogs index
 * and serves no RSS. Kept in the roster so the ESPN team seat is named and
 * auditable; `toCuratedRssFeeds` drops `espn-team` so the live wire never polls
 * a known-dead URL. ESPN team coverage in 2026 arrives via the NFL Nation beat
 * writers below (kind `beat`) and the working league feed (kind `league`).
 */
function espnTeam(team: string, slug: string, clubName: string): RosterEntry {
  return {
    url: `https://www.espn.com/blog/${slug}/rss`,
    source: `ESPN ${clubName}`,
    tier: "Aggregator",
    team,
    kind: "espn-team",
  };
}

function beat(
  team: string,
  handle: string,
  reporterName: string,
  outlet: string,
): RosterEntry {
  return {
    url: bskyProfileRss(handle),
    source: `${reporterName} (${outlet})`,
    tier: "Beat",
    team,
    kind: "beat",
    handle,
  };
}

function insider(
  handle: string,
  reporterName: string,
  outlet: string,
): RosterEntry {
  return {
    url: bskyProfileRss(handle),
    source: `${reporterName} (${outlet})`,
    tier: "Insider",
    team: "NFL",
    kind: "insider",
    handle,
  };
}

function newsletter(
  url: string,
  source: string,
  tier: Tier,
  team: string,
  kind: RosterKind,
): RosterEntry {
  return { url, source, tier, team, kind };
}

/**
 * Club official news feeds — every URL probed 2026-09-15 and returned
 * `application/rss+xml` with `pubDate` items. Carolina is `panthers.com`
 * (the carolinapanthers.com host fails TLS on this path).
 */
const CLUB_FEEDS: readonly RosterEntry[] = [
  club("ARI", "azcardinals.com", "Cardinals"),
  club("ATL", "atlantafalcons.com", "Falcons"),
  club("BAL", "baltimoreravens.com", "Ravens"),
  club("BUF", "buffalobills.com", "Bills"),
  club("CAR", "panthers.com", "Panthers"),
  club("CHI", "chicagobears.com", "Bears"),
  club("CIN", "bengals.com", "Bengals"),
  club("CLE", "clevelandbrowns.com", "Browns"),
  club("DAL", "dallascowboys.com", "Cowboys"),
  club("DEN", "denverbroncos.com", "Broncos"),
  club("DET", "detroitlions.com", "Lions"),
  club("GB", "packers.com", "Packers"),
  club("HOU", "houstontexans.com", "Texans"),
  club("IND", "colts.com", "Colts"),
  club("JAX", "jaguars.com", "Jaguars"),
  club("KC", "chiefs.com", "Chiefs"),
  club("LV", "raiders.com", "Raiders"),
  club("LAC", "chargers.com", "Chargers"),
  club("LAR", "therams.com", "Rams"),
  club("MIA", "miamidolphins.com", "Dolphins"),
  club("MIN", "vikings.com", "Vikings"),
  club("NE", "patriots.com", "Patriots"),
  club("NO", "neworleanssaints.com", "Saints"),
  club("NYG", "giants.com", "Giants"),
  club("NYJ", "newyorkjets.com", "Jets"),
  club("PHI", "philadelphiaeagles.com", "Eagles"),
  club("PIT", "steelers.com", "Steelers"),
  club("SEA", "seahawks.com", "Seahawks"),
  club("SF", "49ers.com", "49ers"),
  club("TB", "buccaneers.com", "Buccaneers"),
  club("TEN", "tennesseetitans.com", "Titans"),
  club("WAS", "commanders.com", "Commanders"),
];

/** ESPN per-team blog RSS — named for audit, excluded from CURATED (dead). */
const ESPN_TEAM_FEEDS: readonly RosterEntry[] = [
  espnTeam("ARI", "arizona-cardinals", "Cardinals"),
  espnTeam("ATL", "atlanta-falcons", "Falcons"),
  espnTeam("BAL", "baltimore-ravens", "Ravens"),
  espnTeam("BUF", "buffalo-bills", "Bills"),
  espnTeam("CAR", "carolina-panthers", "Panthers"),
  espnTeam("CHI", "chicago-bears", "Bears"),
  espnTeam("CIN", "cincinnati-bengals", "Bengals"),
  espnTeam("CLE", "cleveland-browns", "Browns"),
  espnTeam("DAL", "dallas-cowboys", "Cowboys"),
  espnTeam("DEN", "denver-broncos", "Broncos"),
  espnTeam("DET", "detroit-lions", "Lions"),
  espnTeam("GB", "green-bay-packers", "Packers"),
  espnTeam("HOU", "houston-texans", "Texans"),
  espnTeam("IND", "indianapolis-colts", "Colts"),
  espnTeam("JAX", "jacksonville-jaguars", "Jaguars"),
  espnTeam("KC", "kansas-city-chiefs", "Chiefs"),
  espnTeam("LV", "las-vegas-raiders", "Raiders"),
  espnTeam("LAC", "los-angeles-chargers", "Chargers"),
  espnTeam("LAR", "los-angeles-rams", "Rams"),
  espnTeam("MIA", "miami-dolphins", "Dolphins"),
  espnTeam("MIN", "minnesota-vikings", "Vikings"),
  espnTeam("NE", "new-england-patriots", "Patriots"),
  espnTeam("NO", "new-orleans-saints", "Saints"),
  espnTeam("NYG", "new-york-giants", "Giants"),
  espnTeam("NYJ", "new-york-jets", "Jets"),
  espnTeam("PHI", "philadelphia-eagles", "Eagles"),
  espnTeam("PIT", "pittsburgh-steelers", "Steelers"),
  espnTeam("SEA", "seattle-seahawks", "Seahawks"),
  espnTeam("SF", "san-francisco-49ers", "49ers"),
  espnTeam("TB", "tampa-bay-buccaneers", "Buccaneers"),
  espnTeam("TEN", "tennessee-titans", "Titans"),
  espnTeam("WAS", "washington-commanders", "Commanders"),
];

/**
 * Primary beat reporters — one to three per club, from public press lists and
 * the reporters' own bios. Every Bluesky handle below returned RSS/Atom with
 * `pubDate` on 2026-09-15 (see fixtures). Outlet is recorded on the source
 * label so a wire card can attribute honestly.
 */
const BEAT_FEEDS: readonly RosterEntry[] = [
  beat("ARI", "tdrake4sports.bsky.social", "Tyler Drake", "Arizona Sports"),
  beat("ATL", "marcraimondi.bsky.social", "Marc Raimondi", "ESPN"),
  beat("BAL", "jamisonhensley.bsky.social", "Jamison Hensley", "ESPN"),
  beat("BUF", "joebuscaglia.bsky.social", "Joe Buscaglia", "The Athletic"),
  beat("BUF", "salsports.bsky.social", "Sal Capaccio", "WGR550"),
  beat("CAR", "mikekayefootball.bsky.social", "Mike Kaye", "ESPN"),
  beat("CHI", "danwiederer.bsky.social", "Dan Wiederer", "The Athletic"),
  beat("CHI", "seanhammond.bsky.social", "Sean Hammond", "Chicago Tribune"),
  beat("CIN", "bbaby41.bsky.social", "Ben Baby", "ESPN"),
  beat("CLE", "ceasterlingabj.bsky.social", "Chris Easterling", "Akron Beacon Journal"),
  beat("CLE", "ashleybastock42.bsky.social", "Ashley Bastock", "Cleveland.com"),
  beat("DAL", "joejhoyt.bsky.social", "Joseph Hoyt", "Dallas Morning News"),
  beat("DAL", "calvinwatkins.bsky.social", "Calvin Watkins", "Dallas Morning News"),
  beat("DEN", "parkerjgabriel.bsky.social", "Parker Gabriel", "Denver Post"),
  beat("DEN", "zacstevens.bsky.social", "Zac Stevens", "DNVR"),
  beat("DET", "davebirkett.bsky.social", "Dave Birkett", "Detroit Free Press"),
  beat("DET", "detroitfootball.net", "Justin Rogers", "Detroit Football Network"),
  beat("GB", "mattschneidman.bsky.social", "Matt Schneidman", "The Athletic"),
  beat("GB", "zachkruse.bsky.social", "Zach Kruse", "Packers Wire"),
  beat("HOU", "jonmalexander.bsky.social", "Jonathan M. Alexander", "Houston Chronicle"),
  beat("IND", "stephenholder-nfl.bsky.social", "Stephen Holder", "ESPN"),
  beat("IND", "jakearthurnfl.bsky.social", "Jake Arthur", "Locked On Colts"),
  beat("JAX", "zachgoodall.bsky.social", "Zach Goodall", "Jaguars Wire"),
  beat("JAX", "travisdholmes.bsky.social", "Travis D Holmes", "Big Cat Country"),
  beat("KC", "jessenewell.bsky.social", "Jesse Newell", "The Athletic"),
  beat("LV", "levidamien.bsky.social", "Levi Damien", "Raiders Wire"),
  beat("LAC", "realframirez.bsky.social", "Fernando Ramirez", "Sporting Tribune"),
  beat("LAC", "elliottteaford.bsky.social", "Elliott Teaford", "OC Register"),
  beat("LAR", "adamgrosbard.bsky.social", "Adam Grosbard", "LA Daily News"),
  beat("LAR", "nateatkins.bsky.social", "Nate Atkins", "The Athletic"),
  beat("MIA", "ml-j.bsky.social", "Marcel Louis-Jacques", "ESPN"),
  beat("MIN", "aleclewis.bsky.social", "Alec Lewis", "The Athletic"),
  beat("MIN", "bengoessling.bsky.social", "Ben Goessling", "Star Tribune"),
  beat("NE", "mikereiss.bsky.social", "Mike Reiss", "ESPN"),
  beat("NO", "nickunderhill.bsky.social", "Nick Underhill", "NewOrleans.Football"),
  beat("NO", "matthewparas.bsky.social", "Matthew Paras", "Times-Picayune"),
  beat("NYG", "jordanraanan.bsky.social", "Jordan Raanan", "ESPN"),
  beat("NYG", "evanbarnes.bsky.social", "Evan Barnes", "Newsday"),
  beat("NYG", "charlottecrrll.bsky.social", "Charlotte Carroll", "The Athletic"),
  beat("NYJ", "zackblatt.bsky.social", "Zack Rosenblatt", "The Athletic"),
  beat("NYJ", "antwanstaley.bsky.social", "Antwan Staley", "NY Daily News"),
  beat("PHI", "timmcmanus42.bsky.social", "Tim McManus", "ESPN"),
  beat("PIT", "mikedefabo.bsky.social", "Mike DeFabo", "The Athletic"),
  beat("PIT", "nickfarabaugh.bsky.social", "Nick Farabaugh", "PennLive"),
  beat("PIT", "asaunderspgh.bsky.social", "Alan Saunders", "Pittsburgh Sports Now"),
  beat("SEA", "kolemusgrove.bsky.social", "Kole Musgrove", "Seahawks Wire"),
  beat("SEA", "hawkblogger.com", "Brian Nemhauser", "Hawkblogger"),
  beat("SF", "caminman.bsky.social", "Cam Inman", "Bay Area News Group"),
  beat("TB", "jennalaine.bsky.social", "Jenna Laine", "ESPN"),
  beat("TEN", "jwyattsports.bsky.social", "Jim Wyatt", "TennesseeTitans.com"),
  beat("WAS", "tashanreed.bsky.social", "Tashan Reed", "Washington Post"),
  beat("WAS", "benstandig.bsky.social", "Ben Standig", "The Athletic"),
];

/**
 * National league insiders — Bluesky + published newsletters. `team: "NFL"`
 * so they surface on every club filter without claiming a single club seat.
 */
const INSIDER_FEEDS: readonly RosterEntry[] = [
  insider("adamschefter.bsky.social", "Adam Schefter", "ESPN"),
  insider("rapsheet.bsky.social", "Ian Rapoport", "ESPN / NFL Network"),
  insider("fieldyates.bsky.social", "Field Yates", "ESPN"),
  insider("tompelissero.bsky.social", "Tom Pelissero", "The Ringer"),
  insider("kat-terrell.bsky.social", "Katherine Terrell", "NFL writer"),
  insider("jjones9.bsky.social", "Jonathan Jones", "The Athletic"),
  insider("jourdanrodrigue.bsky.social", "Jourdan Rodrigue", "The Athletic"),
  insider("mikesilver.bsky.social", "Mike Silver", "The Athletic"),
  insider("benyarthur.bsky.social", "Ben Arthur", "FOX Sports"),
  insider("gregauman.bsky.social", "Greg Auman", "FOX Sports"),
  insider("minakimes.bsky.social", "Mina Kimes", "ESPN"),
  insider("nfldraftscout.bsky.social", "Matt Miller", "ESPN"),
  insider("aaronschatz.com", "Aaron Schatz", "FTN / ESPN"),
  insider("sethwalder.bsky.social", "Seth Walder", "ESPN"),
  insider("mikeclaynfl.bsky.social", "Mike Clay", "ESPN"),
  insider("stephaniabell.bsky.social", "Stephania Bell", "ESPN"),
  insider("matthewberrytmr.bsky.social", "Matthew Berry", "NBC Sports"),
  insider("justinboone.bsky.social", "Justin Boone", "Yahoo"),
  insider("establishtherunnfl.bsky.social", "Establish The Run", "ETR"),
  insider("overthecap.bsky.social", "Over The Cap", "OTC"),
];

const NEWSLETTER_AND_LEAGUE_FEEDS: readonly RosterEntry[] = [
  newsletter(
    "https://tompelissero.substack.com/feed",
    "Tom Pelissero Substack",
    "Insider",
    "NFL",
    "insider",
  ),
  newsletter(
    "https://tashanreed.substack.com/feed",
    "Tashan Reed Substack",
    "Beat",
    "WAS",
    "beat",
  ),
  newsletter(
    "https://profootballtalk.nbcsports.com/feed/",
    "ProFootballTalk",
    "Aggregator",
    "NFL",
    "league",
  ),
  newsletter(
    "https://www.sharpfootballanalysis.com/feed",
    "Sharp Football Analysis",
    "Aggregator",
    "NFL",
    "league",
  ),
  newsletter(
    "https://www.pff.com/feed",
    "PFF",
    "Aggregator",
    "NFL",
    "league",
  ),
  newsletter(
    "https://www.espn.com/espn/rss/nfl/news",
    "ESPN NFL",
    "Aggregator",
    "NFL",
    "league",
  ),
];

/**
 * GSN's own published feed. `selfSourced: true` — this entry can never
 * corroborate itself (C-417). Team is "GSN" so it is never filtered as club news.
 */
export const GSN_OWN_FEED: RosterEntry = {
  url: "https://www.galaxysportsedge.com/journal/rss.xml",
  source: "Galaxy Sports Network",
  tier: "Verified",
  team: "GSN",
  kind: "gsn",
  selfSourced: true,
};

/**
 * The full roster. Every NFL club official feed, every ESPN team-blog seat
 * (documented dead), every primary beat Bluesky/Substack feed, the league
 * insiders, the working league aggregators, and GSN's own feed.
 */
export const REPORTER_ROSTER: readonly RosterEntry[] = [
  GSN_OWN_FEED,
  ...CLUB_FEEDS,
  ...ESPN_TEAM_FEEDS,
  ...BEAT_FEEDS,
  ...INSIDER_FEEDS,
  ...NEWSLETTER_AND_LEAGUE_FEEDS,
];

/** Roster entries flagged so they can never corroborate themselves. */
export function selfSourcedRosterEntries(
  roster: readonly RosterEntry[] = REPORTER_ROSTER,
): RosterEntry[] {
  return roster.filter((e) => e.selfSourced === true);
}

/**
 * Map the roster into the `RssFeedConfig` shape `rss.ts` already fetches.
 * Drops `espn-team` (known-dead blog RSS, fixtures 2026-09-15) so the live
 * wire never polls a URL that cannot return RSS. Everything else rides.
 */
export function toCuratedRssFeeds(
  roster: readonly RosterEntry[] = REPORTER_ROSTER,
): RssFeedConfig[] {
  return roster
    .filter((e) => e.kind !== "espn-team")
    .map(({ url, source, tier, team, selfSourced }) => ({
      url,
      source,
      tier,
      team,
      ...(selfSourced ? { selfSourced: true as const } : {}),
    }));
}

/** Club feed for a team, if present. */
export function clubFeedFor(team: string): RosterEntry | undefined {
  return CLUB_FEEDS.find((e) => e.team === team);
}

/** ESPN team-blog seat for a team (documented dead; not in CURATED). */
export function espnTeamFeedFor(team: string): RosterEntry | undefined {
  return ESPN_TEAM_FEEDS.find((e) => e.team === team);
}

/** Beat reporters covering a team. */
export function beatFeedsFor(team: string): RosterEntry[] {
  return BEAT_FEEDS.filter((e) => e.team === team);
}
