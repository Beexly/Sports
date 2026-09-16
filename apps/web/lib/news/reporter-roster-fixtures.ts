/**
 * C-415 fixtures — every roster URL's fetch result, recorded 2026-09-15.
 *
 * Probed with GET (redirect: follow) and the same user-agent `rss.ts` uses.
 * `ok` means HTTP 200 AND the body contained RSS/Atom items with a pubDate /
 * updated / published date. Nothing here is invented: a URL that failed is
 * recorded as failed, with the reason, so the wire never claims coverage it
 * does not have.
 */

export type FeedVerification = {
  readonly url: string;
  readonly status: "ok" | "fail";
  readonly httpStatus?: number;
  readonly reason?: string;
  readonly hasPubDate?: boolean;
  readonly checkedAt: string;
};

const AT = "2026-09-15T00:00:00.000Z";

/** Club official `/rss/news` — all 32 returned application/rss+xml with pubDate. */
const CLUB_OK: readonly string[] = [
  "https://www.azcardinals.com/rss/news",
  "https://www.atlantafalcons.com/rss/news",
  "https://www.baltimoreravens.com/rss/news",
  "https://www.buffalobills.com/rss/news",
  "https://www.panthers.com/rss/news",
  "https://www.chicagobears.com/rss/news",
  "https://www.bengals.com/rss/news",
  "https://www.clevelandbrowns.com/rss/news",
  "https://www.dallascowboys.com/rss/news",
  "https://www.denverbroncos.com/rss/news",
  "https://www.detroitlions.com/rss/news",
  "https://www.packers.com/rss/news",
  "https://www.houstontexans.com/rss/news",
  "https://www.colts.com/rss/news",
  "https://www.jaguars.com/rss/news",
  "https://www.chiefs.com/rss/news",
  "https://www.raiders.com/rss/news",
  "https://www.chargers.com/rss/news",
  "https://www.therams.com/rss/news",
  "https://www.miamidolphins.com/rss/news",
  "https://www.vikings.com/rss/news",
  "https://www.patriots.com/rss/news",
  "https://www.neworleanssaints.com/rss/news",
  "https://www.giants.com/rss/news",
  "https://www.newyorkjets.com/rss/news",
  "https://www.philadelphiaeagles.com/rss/news",
  "https://www.steelers.com/rss/news",
  "https://www.seahawks.com/rss/news",
  "https://www.49ers.com/rss/news",
  "https://www.buccaneers.com/rss/news",
  "https://www.tennesseetitans.com/rss/news",
  "https://www.commanders.com/rss/news",
];

/** Bluesky per-profile RSS — all returned 200 XML with pubDate items. */
const BSKY_OK_HANDLES: readonly string[] = [
  "tdrake4sports.bsky.social",
  "marcraimondi.bsky.social",
  "jamisonhensley.bsky.social",
  "joebuscaglia.bsky.social",
  "salsports.bsky.social",
  "mikekayefootball.bsky.social",
  "danwiederer.bsky.social",
  "seanhammond.bsky.social",
  "bbaby41.bsky.social",
  "ceasterlingabj.bsky.social",
  "ashleybastock42.bsky.social",
  "joejhoyt.bsky.social",
  "calvinwatkins.bsky.social",
  "parkerjgabriel.bsky.social",
  "zacstevens.bsky.social",
  "davebirkett.bsky.social",
  "detroitfootball.net",
  "mattschneidman.bsky.social",
  "zachkruse.bsky.social",
  "jonmalexander.bsky.social",
  "stephenholder-nfl.bsky.social",
  "jakearthurnfl.bsky.social",
  "zachgoodall.bsky.social",
  "travisdholmes.bsky.social",
  "jessenewell.bsky.social",
  "levidamien.bsky.social",
  "realframirez.bsky.social",
  "elliottteaford.bsky.social",
  "adamgrosbard.bsky.social",
  "nateatkins.bsky.social",
  "ml-j.bsky.social",
  "aleclewis.bsky.social",
  "bengoessling.bsky.social",
  "mikereiss.bsky.social",
  "nickunderhill.bsky.social",
  "matthewparas.bsky.social",
  "jordanraanan.bsky.social",
  "evanbarnes.bsky.social",
  "charlottecrrll.bsky.social",
  "zackblatt.bsky.social",
  "antwanstaley.bsky.social",
  "timmcmanus42.bsky.social",
  "mikedefabo.bsky.social",
  "nickfarabaugh.bsky.social",
  "asaunderspgh.bsky.social",
  "kolemusgrove.bsky.social",
  "hawkblogger.com",
  "caminman.bsky.social",
  "jennalaine.bsky.social",
  "jwyattsports.bsky.social",
  "tashanreed.bsky.social",
  "benstandig.bsky.social",
  "adamschefter.bsky.social",
  "rapsheet.bsky.social",
  "fieldyates.bsky.social",
  "tompelissero.bsky.social",
  "kat-terrell.bsky.social",
  "jjones9.bsky.social",
  "jourdanrodrigue.bsky.social",
  "mikesilver.bsky.social",
  "benyarthur.bsky.social",
  "gregauman.bsky.social",
  "minakimes.bsky.social",
  "nfldraftscout.bsky.social",
  "aaronschatz.com",
  "sethwalder.bsky.social",
  "mikeclaynfl.bsky.social",
  "stephaniabell.bsky.social",
  "matthewberrytmr.bsky.social",
  "justinboone.bsky.social",
  "establishtherunnfl.bsky.social",
  "overthecap.bsky.social",
];

/** Newsletter / league RSS — all returned 200 with pubDate items. */
const LEAGUE_OK: readonly string[] = [
  "https://tompelissero.substack.com/feed",
  "https://tashanreed.substack.com/feed",
  "https://profootballtalk.nbcsports.com/feed/",
  "https://www.sharpfootballanalysis.com/feed",
  "https://www.pff.com/feed",
  "https://www.espn.com/espn/rss/nfl/news",
  "https://www.galaxysportsedge.com/journal/rss.xml",
];

/**
 * ESPN per-team blog RSS. Probed every slug: HTTP 302 →
 * `http://espn.go.com/espn/blogs` (no RSS). Recorded FAIL so nobody re-polls
 * them as if they were live. Pattern is the one ESPN published for a decade.
 */
const ESPN_TEAM_SLUGS: readonly string[] = [
  "arizona-cardinals",
  "atlanta-falcons",
  "baltimore-ravens",
  "buffalo-bills",
  "carolina-panthers",
  "chicago-bears",
  "cincinnati-bengals",
  "cleveland-browns",
  "dallas-cowboys",
  "denver-broncos",
  "detroit-lions",
  "green-bay-packers",
  "houston-texans",
  "indianapolis-colts",
  "jacksonville-jaguars",
  "kansas-city-chiefs",
  "las-vegas-raiders",
  "los-angeles-chargers",
  "los-angeles-rams",
  "miami-dolphins",
  "minnesota-vikings",
  "new-england-patriots",
  "new-orleans-saints",
  "new-york-giants",
  "new-york-jets",
  "philadelphia-eagles",
  "pittsburgh-steelers",
  "seattle-seahawks",
  "san-francisco-49ers",
  "tampa-bay-buccaneers",
  "tennessee-titans",
  "washington-commanders",
];

function bskyUrl(handle: string): string {
  return `https://bsky.app/profile/${handle}/rss`;
}

function ok(url: string): FeedVerification {
  return { url, status: "ok", httpStatus: 200, hasPubDate: true, checkedAt: AT };
}

function fail(url: string, reason: string, httpStatus?: number): FeedVerification {
  return { url, status: "fail", httpStatus, reason, hasPubDate: false, checkedAt: AT };
}

/**
 * Full verification log, keyed by URL. The reporter-roster test asserts this
 * covers every REPORTER_ROSTER url exactly once.
 */
export const REPORTER_ROSTER_VERIFICATION: readonly FeedVerification[] = [
  ...CLUB_OK.map(ok),
  ...BSKY_OK_HANDLES.map((h) => ok(bskyUrl(h))),
  ...LEAGUE_OK.map(ok),
  ...ESPN_TEAM_SLUGS.map((slug) =>
    fail(
      `https://www.espn.com/blog/${slug}/rss`,
      "302 → http://espn.go.com/espn/blogs; ESPN team-blog RSS discontinued (no items, no pubDate)",
      302,
    ),
  ),
];

export function verificationFor(url: string): FeedVerification | undefined {
  return REPORTER_ROSTER_VERIFICATION.find((v) => v.url === url);
}
