/**
 * Public ESPN NFL scoreboard. No key.
 * A scheduled game reports score "0". That zero is not a result.
 * Home and away come from `homeAway`, never from array order.
 */

import type { LiveGame, ScoresBoard } from "./scores365.js"

export const ESPN_NFL_SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"

export type EspnBoard = ScoresBoard & { season: number | null; week: number | null }

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value)
  return null
}

export function parseEspnScoreboard(payload: unknown): EspnBoard {
  const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {}
  const season = num((body.season as { year?: unknown } | undefined)?.year)
  const week = num((body.week as { number?: unknown } | undefined)?.number)
  const events = Array.isArray(body.events) ? body.events : []
  const games: LiveGame[] = []
  for (const event of events) {
    if (!event || typeof event !== "object") continue
    const row = event as Record<string, unknown>
    const id = num(row.id)
    if (id == null) continue
    const competitions = Array.isArray(row.competitions) ? row.competitions : []
    const competition = competitions[0]
    if (!competition || typeof competition !== "object") continue
    const comp = competition as Record<string, unknown>
    const statusNode = comp.status && typeof comp.status === "object" ? (comp.status as Record<string, unknown>) : {}
    const statusType = statusNode.type && typeof statusNode.type === "object" ? (statusNode.type as Record<string, unknown>) : {}
    const state = typeof statusType.state === "string" ? statusType.state : ""
    const status = typeof statusType.shortDetail === "string" ? statusType.shortDetail : typeof statusType.description === "string" ? statusType.description : state
    const competitors = Array.isArray(comp.competitors) ? comp.competitors : []
    let home: LiveGame["home"] | null = null
    let away: LiveGame["away"] | null = null
    for (const competitor of competitors) {
      if (!competitor || typeof competitor !== "object") continue
      const side = competitor as Record<string, unknown>
      const team = side.team && typeof side.team === "object" ? (side.team as Record<string, unknown>) : {}
      const name = typeof team.displayName === "string" ? team.displayName : typeof team.name === "string" ? team.name : "Unknown"
      const abbr = typeof team.abbreviation === "string" ? team.abbreviation : name.slice(0, 3).toUpperCase()
      const raw = num(side.score)
      const score = state === "pre" ? null : raw
      const parsed = { name, abbr, score }
      if (side.homeAway === "home") home = parsed
      if (side.homeAway === "away") away = parsed
    }
    if (!home || !away) continue
    games.push({
      id,
      competitionId: null,
      competition: "NFL",
      startTime: typeof row.date === "string" ? row.date : "",
      status,
      home,
      away,
    })
  }
  return {
    ttl: 0,
    lastUpdateId: null,
    paging: { previousPage: null, nextPage: null },
    season,
    week,
    games,
  }
}
