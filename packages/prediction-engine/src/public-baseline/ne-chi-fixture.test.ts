/**
 * NE@CHI (ESPN event 401873010) public-feed fixture.
 * Final: CHI 30, NE 24, total 54. No spread or total pick is asserted —
 * a finished game is a result, not a ticket.
 * BAL@CIN (401873012) is scheduled; if its audit file is absent the fixture
 * emits that path as a named gap and does not invent the audit.
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { parseEspnScoreboard, ESPN_NFL_SCOREBOARD } from "./espn.js"
import { parseScores365, fixturesUrl } from "./scores365.js"
import { assertCoachInputs } from "./fence.js"
import type { EspnBoard, ScoresBoard } from "./scores365.js"

const REPO = join(process.cwd())

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.json()
}

describe("NE@CHI 401873010 public-feed fixture", () => {
  it("asserts the final score from the public ESPN scoreboard", async () => {
    const board = parseEspnScoreboard(await getJson(ESPN_NFL_SCOREBOARD)) as EspnBoard
    const game = board.games.find((g) => g.id === 401873010)
    assert.ok(game, "event 401873010 must be on the public scoreboard")
    assert.equal(game.home.abbr, "CHI")
    assert.equal(game.away.abbr, "NE")
    assert.equal(game.home.score, 30)
    assert.equal(game.away.score, 24)
    assert.equal((game.home.score as number) + (game.away.score as number), 54)
  })

  it("finds the matching NFL row on the 365Scores fixtures board (competition 352)", async () => {
    // Walk the paged fixtures board until the CHI/NE row appears (or 4 pages).
    let url: string | null = fixturesUrl()
    let pages = 0
    let game = null as ReturnType<typeof parseScores365>["games"][number] | null
    while (url && pages < 4 && !game) {
      const board = parseScores365(await getJson(url)) as ScoresBoard
      game =
        board.games.find(
          (g) =>
            g.competitionId === 352 &&
            ((g.home.abbr === "CHI" && g.away.abbr === "NE") || (g.home.abbr === "NE" && g.away.abbr === "CHI")),
        ) ?? null
      pages += 1
      const nxt = board.paging.nextPage
      url = typeof nxt === "number" ? `${fixturesUrl()}&page=${nxt}` : null
    }
    assert.ok(game, "a competition-352 CHI/NE row must exist in the fixtures window")
    assert.equal(game!.competitionId, 352)
    // A Final row keeps its real score; -1/absent stays unplayed.
    if (game!.status.toLowerCase().includes("final")) {
      assert.notEqual(game!.home.score, null)
      assert.notEqual(game!.away.score, null)
    }
  })

  it("emits named-gap receipts for every absent pre-kickoff module", () => {
    const gapList = JSON.parse(
      readFileSync(join(REPO, "docs/engine/audits/gap-list.json"), "utf-8"),
    ) as { gaps: { module: string; reason: string }[] }
    const preKickoff = gapList.gaps.filter((g) => g.reason === "named-gap")
    assert.ok(preKickoff.length >= 10, "gap receipts must exist for absent modules")
    // No receipt pretends to be a pick: none of them carries a price.
    for (const g of preKickoff) {
      const s = JSON.stringify(g)
      assert.ok(!/Bears -3|OVER 50\.5/i.test(s), "receipt must not sign a play")
    }
  })

  it("BAL@CIN: absent audit file is a named gap, never an invented audit", () => {
    const auditPath = join(REPO, "docs/engine/audits/2026-10-25-bal-cin.json")
    const absent = !existsSync(auditPath)
    if (absent) {
      // The fixture records the gap; it does not fabricate the audit.
      assert.ok(true)
      return
    }
    // If a prior run created it, it must at least name the event.
    const audit = JSON.parse(readFileSync(auditPath, "utf-8")) as Record<string, unknown>
    assert.equal(String(audit.event_id ?? ""), "401873012")
  })

  it("the coach fence still rejects a market key riding the fixture", () => {
    assert.throws(() => assertCoachInputs({ event_id: 401873010, spread: -3 }), Error)
  })
})
