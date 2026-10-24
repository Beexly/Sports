import {
  parseEspnScoreboard,
  parseScores365,
  fixturesUrl,
  ESPN_NFL_SCOREBOARD,
  type LiveGame,
} from "@sports/prediction-engine"

export const dynamic = "force-dynamic"

type Row = {
  kickoff: string
  espn: { id: number | null; text: string; home: string } | null
  scores365: { id: number | null; text: string; home: string } | null
  homeDisagreement: boolean
}

function display(g: LiveGame): string {
  const s = (n: { score: number | null }) => (n.score == null ? "—" : String(n.score))
  return `${g.home.abbr} vs ${g.away.abbr} — ${s(g.home)}–${s(g.away)} (${g.status})`
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
    <main style={{ fontFamily: "monospace", padding: 24 }}>
      <h1>Public slate — audit desk</h1>
      <p>
        Display order is home vs away, score home–away. Rows show the ESPN feed
        beside the 365Scores feed. When the two feeds disagree about who is
        home, both rows are shown and neither is picked.
      </p>
      <table cellPadding={6} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">kickoff</th>
            <th align="left">ESPN (event id)</th>
            <th align="left">365Scores (game id)</th>
            <th>home disagreement</th>
          </tr>
        </thead>
        <tbody>
          {slate.map((row) => (
            <tr key={row.kickoff + (row.espn?.id ?? row.scores365?.id ?? "")}
                style={row.homeDisagreement ? { background: "#fff3cd" } : undefined}>
              <td>{row.kickoff}</td>
              <td>{row.espn ? `${row.espn.text} [${row.espn.id}]` : "—"}</td>
              <td>{row.scores365 ? `${row.scores365.text} [${row.scores365.id}]` : "—"}</td>
              <td align="center">{row.homeDisagreement ? "BOTH SHOWN" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
