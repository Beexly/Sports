/**
 * Public 365Scores JSON. No key.
 * `current` without `sports` returns an empty shell. American football is sports=6.
 * The NFL competition is 352. A score of -1 means the game has not been played.
 */

export const SCORES365_ORIGIN = "https://webws.365scores.com"
export const SPORT_AMERICAN_FOOTBALL = 6
export const NFL_COMPETITION_ID = 352

export type LiveSide = { name: string; abbr: string; score: number | null }

export type LiveGame = {
  id: number
  competitionId: number | null
  competition: string
  startTime: string
  status: string
  home: LiveSide
  away: LiveSide
}

export type ScoresBoard = {
  ttl: number
  lastUpdateId: number | null
  paging: { previousPage: string | null; nextPage: string | null }
  games: LiveGame[]
}

function qs(params: Record<string, string>): string {
  return new URLSearchParams(params).toString()
}

const common = (timezone: string) => ({
  appTypeId: "5",
  langId: "1",
  timezoneName: timezone,
  userCountryId: "-1",
})

export function currentGamesUrl(sportId = SPORT_AMERICAN_FOOTBALL, timezone = "America/Chicago"): string {
  return `${SCORES365_ORIGIN}/web/games/current/?${qs({ ...common(timezone), sports: String(sportId) })}`
}

export function fixturesUrl(competitionId = NFL_COMPETITION_ID, timezone = "America/Chicago"): string {
  return `${SCORES365_ORIGIN}/web/games/fixtures/?${qs({ ...common(timezone), competitions: String(competitionId) })}`
}

function played(score: unknown): number | null {
  if (typeof score !== "number" || !Number.isFinite(score) || score < 0) return null
  return score
}

function side(raw: unknown): LiveSide {
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  const name = typeof row.name === "string" ? row.name : "Unknown"
  const abbr = typeof row.symbolicName === "string" ? row.symbolicName : name.slice(0, 3).toUpperCase()
  return { name, abbr, score: played(row.score) }
}

export function homeVsAway(game: LiveGame): string {
  return `${game.home.abbr} vs ${game.away.abbr}`
}

export function homeAwayScore(game: LiveGame): string {
  const home = game.home.score == null ? "—" : String(game.home.score)
  const away = game.away.score == null ? "—" : String(game.away.score)
  return `${home}–${away}`
}

export function parseScores365(payload: unknown): ScoresBoard {
  const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {}
  const games = Array.isArray(body.games) ? body.games : []
  const parsed: LiveGame[] = []
  for (const item of games) {
    if (!item || typeof item !== "object") continue
    const row = item as Record<string, unknown>
    if (typeof row.id !== "number") continue
    parsed.push({
      id: row.id,
      competitionId: typeof row.competitionId === "number" ? row.competitionId : null,
      competition: typeof row.competitionDisplayName === "string" ? row.competitionDisplayName : "",
      startTime: typeof row.startTime === "string" ? row.startTime : "",
      status: typeof row.statusText === "string" ? row.statusText : "",
      home: side(row.homeCompetitor),
      away: side(row.awayCompetitor),
    })
  }
  const paging = (body.paging && typeof body.paging === "object" ? body.paging : {}) as Record<string, unknown>
  return {
    ttl: typeof body.ttl === "number" ? body.ttl : 0,
    lastUpdateId: typeof body.lastUpdateId === "number" ? body.lastUpdateId : null,
    paging: {
      previousPage: typeof paging.previousPage === "number" ? paging.previousPage : null,
      nextPage: typeof paging.nextPage === "number" ? paging.nextPage : null,
    },
    games: parsed,
  }
}

/**
 * Follow paging.nextPage from the NFL fixtures board (competition 352) until
 * `wantIds` are all seen or `maxPages` is exhausted. `fetchPage` is injected
 * so tests stay offline. Competition 352 rows are the NFL window; the
 * sports=6 /current/ pull is NCAAF and CFL and must never be tagged NFL.
 */
export async function fixturesWindow(
  fetchPage: (url: string) => Promise<ScoresBoard>,
  wantIds: ReadonlySet<number>,
  maxPages = 6,
): Promise<{ games: LiveGame[]; pages: number; covered: boolean }> {
  const games: LiveGame[] = []
  let url: string | null = fixturesUrl()
  let pages = 0
  let seen = new Set<number>()
  while (url && pages < maxPages) {
    const board = await fetchPage(url)
    for (const g of board.games) {
      if (!seen.has(g.id)) {
        seen.add(g.id)
        games.push(g)
      }
    }
    pages += 1
    const missing = [...wantIds].filter((id) => !seen.has(id))
    if (missing.length === 0) break
    const nxt = board.paging.nextPage
    // numeric paging from the live payload (parallel-session verified)
    url = typeof nxt === "number" ? `${fixturesUrl()}&page=${nxt}` : null
  }
  const covered = [...wantIds].every((id) => seen.has(id))
  return { games, pages, covered }
}
