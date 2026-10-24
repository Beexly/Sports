/**
 * Replay fivethirtyeight/nfl-elo-game data/nfl_games.csv through replay()
 * and diff our my_prob1 against their published elo_prob1.
 *
 * The FIRST mismatched row is the result. We do not "fix" the winner-signed
 * multiplier to force a match — the multiplier is published verbatim.
 *
 * Usage:
 *   npx tsx scripts/public-baseline/replay-diff.ts [path/to/nfl_games.csv]
 * Without a path it fetches the public CSV from projects.fivethirtyeight.com.
 */
import { replay, type EloGame } from "../../packages/prediction-engine/src/public-baseline/elo538.js"
import { writeFileSync, existsSync, readFileSync } from "node:fs"

const LOCAL = "packages/prediction-engine/src/public-baseline/fixtures/nfl_games.csv"
const URL = "https://projects.fivethirtyeight.com/nfl-api/nfl_games.csv"

function loadCsv(): string {
  const path = process.argv[2] ?? LOCAL
  if (existsSync(path)) return readFileSync(path, "utf-8")
  console.error(`[replay-diff] ${path} not found; fetching ${URL}`)
  // synchronous fetch via curl (node fetch is fine too, but curl honors proxies)
  const { execSync } = require("node:child_process") as typeof import("node:child_process")
  execSync(`curl -sL -m 120 -o "${LOCAL}" "${URL}"`, { stdio: "inherit" })
  return readFileSync(LOCAL, "utf-8")
}

function parse(csv: string): EloGame[] {
  const lines = csv.trim().split("\n")
  const header = lines[0].split(",")
  const col = (name: string) => header.indexOf(name)
  const games: EloGame[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",")
    const date = cells[col("date")]
    const season = cells[col("season")]
    const team1 = cells[col("team1")]
    const team2 = cells[col("team2")]
    const eloProb1 = cells[col("elo_prob1")]
    if (!date || !team1 || !team2) continue
    const score1 = cells[col("score1")] === "" ? null : Number(cells[col("score1")])
    const score2 = cells[col("score2")] === "" ? null : Number(cells[col("score2")])
    const neutralRaw = cells[col("neutral")]
    const playoffRaw = cells[col("playoff")]
    games.push({
      team1,
      team2,
      season,
      neutral: neutralRaw === "1" ? 1 : 0,
      score1,
      score2,
      result1: score1 == null || score2 == null ? null : score1 > score2 ? 1 : score1 < score2 ? 0 : 0.5,
      // carry the published prob for diffing
      ...({ _elo_prob1: eloProb1 === "" ? null : Number(eloProb1) } as object),
    } as EloGame & { _elo_prob1: number | null })
  }
  return games
}

function loadInitial(): Record<string, number> {
  const p = "packages/prediction-engine/src/public-baseline/fixtures/initial_elos.csv"
  if (!existsSync(p)) return {}
  const out: Record<string, number> = {}
  const lines = readFileSync(p, "utf-8").trim().split("\n")
  for (let i = 1; i < lines.length; i++) {
    const [team, elo] = lines[i].split(",")
    if (team && elo) out[team.trim()] = Number(elo)
  }
  return out
}

async function main() {
  const csv = loadCsv()
  const games = parse(csv)
  console.log(`[replay-diff] parsed ${games.length} games`)
  const withProb = games.filter((g) => (g as any)._elo_prob1 != null)
  console.log(`[replay-diff] ${withProb.length} games carry a published elo_prob1`)
  const initial = loadInitial()
  console.log(`[replay-diff] initial elos loaded: ${Object.keys(initial).length} teams`)
  const rows = replay(games, initial)
  let first: { index: number; game: EloGame; ours: number; theirs: number; delta: number } | null = null
  let exact = 0
  let within1e9 = 0
  for (let i = 0; i < games.length; i++) {
    const theirs = (games[i] as any)._elo_prob1 as number | null
    if (theirs == null) continue
    const ours = rows[i]?.prob1
    if (ours == null) continue
    const delta = Math.abs(ours - theirs)
    if (delta < 1e-9) exact += 1
    if (delta < 1e-6) within1e9 += 1
    if (!first && delta >= 1e-6) {
      first = { index: i, game: games[i], ours, theirs, delta }
    }
  }
  const report = {
    games: games.length,
    diffed: withProb.length,
    exactMatches: exact,
    within1e6: within1e9,
    firstMismatch: first
      ? {
          index: first.index,
          date: (first.game as any).date ?? null,
          season: first.game.season,
          matchup: `${first.game.team1} vs ${first.game.team2}`,
          ours: Number(first.ours.toFixed(6)),
          theirs: Number(first.theirs.toFixed(6)),
          delta: Number(first.delta.toFixed(6)),
        }
      : null,
    verdict: first
      ? `first mismatched row at index ${first.index}: ours ${first.ours.toFixed(6)} vs theirs ${first.theirs.toFixed(6)}`
      : "no mismatch found within 1e-6 across the diffed window",
  }
  console.log(JSON.stringify(report, null, 2))
  writeFileSync("packages/prediction-engine/src/public-baseline/fixtures/replay-diff-report.json", JSON.stringify(report, null, 2))
  console.log("[replay-diff] report written to packages/prediction-engine/src/public-baseline/fixtures/replay-diff-report.json")
}

main().catch((e) => {
  console.error("[replay-diff] FAILED:", e)
  process.exit(1)
})
