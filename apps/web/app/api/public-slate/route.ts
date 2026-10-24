import { NextResponse } from "next/server"
import {
  parseEspnScoreboard,
  parseScores365,
  fixturesUrl,
  SCORES365_ORIGIN,
  ESPN_NFL_SCOREBOARD,
  homeVsAway,
  homeAwayScore,
  type LiveGame,
} from "@sports/prediction-engine"

export const dynamic = "force-dynamic"

type SlateRow = {
  kickoff: string
  espn: { event_id: number | null; display: string; home: string; away: string } | null
  scores365: { game_id: number; display: string; home: string; away: string } | null
  homeDisagreement: boolean
}

function display(g: LiveGame): string {
  return `${homeVsAway(g)} — ${homeAwayScore(g)} (${g.status})`
}

/**
 * Public slate. The coach simulator does not import this route.
 * Audit orientation is home vs away from each feed as parsed — if the two
 * feeds disagree about who is home, BOTH rows are shown and neither wins.
 */
export async function GET() {
  const [espnRes, s365Res] = await Promise.all([
    fetch(ESPN_NFL_SCOREBOARD, { cache: "no-store" }),
    fetch(fixturesUrl(), { cache: "no-store" }),
  ])
  const espn = parseEspnScoreboard(await espnRes.json())
  const board = parseScores365(await s365Res.json())

  const byKey = new Map<string, { espn?: LiveGame; s365?: LiveGame }>()
  const keyOf = (homeAbbr: string, awayAbbr: string, day: string) =>
    `${homeAbbr}|${awayAbbr}|${day}`
  const dayOf = (iso: string) => iso.slice(0, 10)

  for (const g of espn.games) {
    const k = keyOf(g.home.abbr, g.away.abbr, dayOf(g.startTime))
    const slot = byKey.get(k) ?? {}
    slot.espn = g
    byKey.set(k, slot)
  }
  for (const g of board.games) {
    const k = keyOf(g.home.abbr, g.away.abbr, dayOf(g.startTime))
    const slot = byKey.get(k) ?? {}
    slot.s365 = g
    byKey.set(k, slot)
  }

  const slate: SlateRow[] = [...byKey.entries()].map(([key, slot]) => {
    const espnHome = slot.espn?.home.abbr ?? null
    const s365Home = slot.s365?.home.abbr ?? null
    return {
      kickoff: slot.espn?.startTime ?? slot.s365?.startTime ?? "",
      espn: slot.espn
        ? { event_id: slot.espn.id, display: display(slot.espn), home: espnHome!, away: slot.espn.away.abbr }
        : null,
      scores365: slot.s365
        ? { game_id: slot.s365.id, display: display(slot.s365), home: s365Home!, away: slot.s365.away.abbr }
        : null,
      homeDisagreement:
        espnHome != null && s365Home != null && espnHome !== s365Home,
    }
  })

  slate.sort((a, b) => a.kickoff.localeCompare(b.kickoff))

  return NextResponse.json({
    season: espn.season,
    week: espn.week,
    count: slate.length,
    disagreements: slate.filter((r) => r.homeDisagreement).length,
    // display order is home vs away, score home–away, per feed row
    slate,
  })
}
