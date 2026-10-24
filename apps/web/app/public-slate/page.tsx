import { HELPLINE } from "@/lib/brand"
import {
  parseEspnScoreboard,
  parseScores365,
  fixturesUrl,
  ESPN_NFL_SCOREBOARD,
  type LiveGame,
} from "@sports/prediction-engine"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Public slate | audit desk",
  description:
    "Sunday slate rendered home vs away from two public feeds, ESPN beside 365Scores, with both homes shown when they disagree.",
}

type Row = {
  kickoff: string
  espn: { id: number | null; text: string; home: string } | null
  scores365: { id: number | null; text: string; home: string } | null
  homeDisagreement: boolean
}

function display(g: LiveGame): string {
  const s = (n: { score: number | null }) => (n.score == null ? "not played" : String(n.score))
  // ASCII only: this route is public copy and the brand gate bans em dashes.
  return `${g.home.abbr} vs ${g.away.abbr}, score ${s(g.home)} to ${s(g.away)} (${g.status})`
}

export default async function PublicSlateDesk() {
  const [espnRes, s365Res] = await Promise.all([
    fetch(ESPN_NFL_SCOREBOARD, { cache: "no-store" }),
    fetch(fixturesUrl(), { cache: "no-store" }),
  ])
  const espn = parseEspnScoreboard(await espnRes.json())
  const board = parseScores365(await s365Res.json())

  const byKey = new Map<string, Row>()
  const keyOf = (home: string, away: string, day: string) => `${home}|${away}|${day}`
  const dayOf = (iso: string) => iso.slice(0, 10)

  for (const g of espn.games) {
    const k = keyOf(g.home.abbr, g.away.abbr, dayOf(g.startTime))
    const row = byKey.get(k) ?? { kickoff: g.startTime, espn: null, scores365: null, homeDisagreement: false }
    row.espn = { id: g.id, text: display(g), home: g.home.abbr }
    byKey.set(k, row)
  }
  for (const g of board.games) {
    const k = keyOf(g.home.abbr, g.away.abbr, dayOf(g.startTime))
    const row = byKey.get(k) ?? { kickoff: g.startTime, espn: null, scores365: null, homeDisagreement: false }
    row.scores365 = { id: g.id, text: display(g), home: g.home.abbr }
    byKey.set(k, row)
  }
  for (const row of byKey.values()) {
    row.homeDisagreement =
      row.espn != null && row.scores365 != null && row.espn.home !== row.scores365.home
  }
  const slate = [...byKey.values()].sort((a, b) => a.kickoff.localeCompare(b.kickoff))

  return (
    <main id="main-content" style={{ fontFamily: "monospace", padding: 24 }}>
      <h1>Public slate: audit desk</h1>
      <p>
        Display order is home vs away, score home to away. Each game shows the
        ESPN feed beside the 365Scores feed. When the two feeds disagree about
        who is home, both rows are shown and neither is picked.
      </p>
      {slate.length === 0 ? (
        <p>No games in the current window yet. The slate fills as the feeds publish.</p>
      ) : (
        <table cellPadding={6} style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">kickoff</th>
              <th align="left">ESPN (event id)</th>
              <th align="left">365Scores (game id)</th>
              <th align="center">home disagreement</th>
            </tr>
          </thead>
          <tbody>
            {slate.map((row) => (
              <tr
                key={row.kickoff + (row.espn?.id ?? row.scores365?.id ?? "")}
                style={row.homeDisagreement ? { background: "#fff3cd" } : undefined}
              >
                <td>{row.kickoff}</td>
                <td>{row.espn ? `${row.espn.text} [${row.espn.id}]` : "not in this feed"}</td>
                <td>{row.scores365 ? `${row.scores365.text} [${row.scores365.id}]` : "not in this feed"}</td>
                <td align="center">{row.homeDisagreement ? "both shown" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p style={{ marginTop: 24 }}>
        Gambling problem? Call {HELPLINE.number}. See the responsible play page
        for resources and self-exclusion options.
      </p>
    </main>
  )
}
