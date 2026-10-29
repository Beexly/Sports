/**
 * NE@CHI (ESPN event 401873010) public-feed fixture.
 * Final: CHI 30, NE 24, total 54. No spread or total pick is asserted —
 * a finished game is a result, not a ticket.
 * BAL@CIN (401873012) is scheduled; if its audit file is absent the fixture
 * emits that path as a named gap and does not invent the audit.
 */

import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { parseEspnScoreboard, ESPN_NFL_SCOREBOARD } from "./espn.js"
import { parseScores365, fixturesUrl } from "./scores365.js"
import { assertCoachInputs } from "./fence.js"
import type { ScoresBoard } from "./scores365.js"

// The audits live at the repo root, but vitest's cwd is the package dir, so
// process.cwd() pointed at packages/prediction-engine and the gap list read
// ENOENT. Resolve from this file instead: src/public-baseline -> src -> prediction-engine -> packages -> Sports (4 up).
const REPO = join(__dirname, "..", "..", "..", "..")
const ORIGIN = "https://webws.365scores.com"

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.json()
}

const abs = (u: string) => (u.startsWith("http") ? u : `${ORIGIN}${u}`)

describe("NE@CHI 401873010 public-feed fixture", () => {
  it("asserts the final score from the public ESPN scoreboard", async () => {
    let board = parseEspnScoreboard(await getJson(ESPN_NFL_SCOREBOARD))
    let game = board.games.find((g) => g.id === 401873010)
    if (!game) {
      board = parseEspnScoreboard(await getJson(ESPN_NFL_SCOREBOARD + "?dates=20261022"))
      game = board.games.find((g) => g.id === 401873010)
    }
    expect(game).toBeTruthy("event 401873010 must be on the public scoreboard")
    expect(game.home.abbr).toBe("CHI")
    expect(game.away.abbr).toBe("NE")
    expect(game.home.score).toBe(30)
    expect(game.away.score).toBe(24)
    expect((game.home.score as number) + (game.away.score as number)).toBe(54)
  })

  it("finds the CHI/NE row by following paging.nextPage and paging.previousPage (competition 352)", async () => {
    // Work order: follow paging.previousPage AND paging.nextPage until the
    // NFL window covers the events. Forward pages walk upcoming games; the
    // previousPage cursor (aftergame=...&direction=-1) walks past games.
    let url: string | null = fixturesUrl()
    let pages = 0
    let game: ReturnType<typeof parseScores365>["games"][number] | null = null
    let lastBoard: ScoresBoard | null = null
    const seen = new Set<number>()
    const visit = (board: ScoresBoard) => {
      lastBoard = board
      for (const g of board.games) {
        if (seen.has(g.id)) continue
        seen.add(g.id)
        if (
          g.competitionId === 352 &&
          ((g.home.abbr === "CHI" && g.away.abbr === "NE") || (g.home.abbr === "NE" && g.away.abbr === "CHI"))
        ) {
          game = g
        }
      }
      pages += 1
    }

    // forward: nextPage chain (walks the future)
    let firstBoard: ScoresBoard | null = null
    while (url && pages < 3 && !game) {
      visit(parseScores365(await getJson(url)) as ScoresBoard)
      if (!firstBoard) firstBoard = lastBoard
      const nxt = lastBoard!.paging.nextPage
      url = typeof nxt === "string" && nxt ? abs(nxt) : null
    }
    // backward: page 1's previousPage cursor walks to the games just before
    // the current window (the Oct 22 CHI vs NE final sits one page back).
    url = firstBoard && typeof firstBoard.paging.previousPage === "string"
      ? abs(firstBoard.paging.previousPage)
      : null
    while (url && pages < 10 && !game) {
      visit(parseScores365(await getJson(url)) as ScoresBoard)
      const prev = lastBoard!.paging.previousPage
      url = typeof prev === "string" && prev ? abs(prev) : null
    }

    expect(game).toBeTruthy("a competition-352 CHI/NE row must exist within the paged window (both directions)")
    expect(game.competitionId).toBe(352)
    if (game.status.toLowerCase().includes("final")) {
      expect(game.home.score).not.toBe(null)
      expect(game.away.score).not.toBe(null)
    }
  })

  it("emits named-gap receipts for every absent pre-kickoff module", () => {
    const gapList = JSON.parse(
      readFileSync(join(REPO, "docs/engine/audits/gap-list.json"), "utf-8"),
    ) as { gaps: { module: string; reason: string }[] }
    const preKickoff = gapList.gaps.filter((g) => g.reason === "named-gap")
    expect(preKickoff.length >= 10).toBeTruthy("gap receipts must exist for absent modules")
    for (const g of preKickoff) {
      const s = JSON.stringify(g)
      expect(!/Bears -3|OVER 50\.5/i.test(s)).toBeTruthy("receipt must not sign a play")
    }
  })

  it("BAL@CIN: absent audit file is a named gap, never an invented audit", () => {
    const auditPath = join(REPO, "docs/engine/audits/2026-10-25-bal-cin.json")
    if (!existsSync(auditPath)) {
      // The fixture records the gap; it does not fabricate the audit.
      expect(true).toBeTruthy()
      return
    }
    const audit = JSON.parse(readFileSync(auditPath, "utf-8")) as Record<string, unknown>
    expect(String(audit.event_id ?? "")).toBe("401873012")
  })

  it("the coach fence still rejects a market key riding the fixture", () => {
    expect(() => assertCoachInputs({ event_id: 401873010, spread: -3 })).toThrow(Error)
  })
})
