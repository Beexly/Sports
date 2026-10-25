import assert from "node:assert/strict"
import { join } from "node:path"
import { describe, it } from "node:test"
import { correctShowdownOwnership, markApplied, publishFromCorpus, scanNumbers } from "./corpus-ledger.js"
import { parseXPull } from "./x-corpus.js"
import { readFileSync } from "node:fs"

const posts = parseXPull(readFileSync(join(process.cwd(), "docs/engine/corpus/x-pull-2026-10-24.md"), "utf8"))

describe("coach ledger", () => {
  const published = publishFromCorpus(posts)
  const numbers = markApplied(scanNumbers(posts), published.sourceTokens)

  it("keeps every number and applies the ones the text can finish", () => {
    assert.equal(numbers.length, scanNumbers(posts).length)
    assert.ok(numbers.length > 500)
    for (const token of numbers) assert.ok(token.use === "applied" || token.use === "held" || token.use === "not-a-rate")
    const applied = numbers.filter((token) => token.use === "applied")
    const held = numbers.filter((token) => token.use === "held")
    assert.ok(applied.length >= 40)
    assert.ok(held.length > applied.length)
    assert.equal(published.baselineIfCorpusIgnored, null)
  })

  it("moves the figures the posts determine, and does not invent the rest", () => {
    const expected = published.balCin.dropbackEpa
    assert.ok(Math.abs(expected - (0.178 * 0.292 + 0.822 * -0.028)) < 1e-9)
    assert.ok(Math.abs(published.balCin.pressureRate - 0.393) < 1e-12)
    assert.equal(published.balCin.chaseTargets, 14.5)
    assert.equal(published.balCin.chaseYards, 174.8)
    assert.equal(published.balCin.chaseFpg, 34.5)
    assert.equal(published.sf.vacatedAllocated, false)
    assert.ok(Math.abs(published.sf.vacatedTargetShare - 0.38) < 1e-12)
    assert.ok(Math.abs(published.sf.cooksRouteShareDelta - 0.6) < 1e-12)
    assert.ok(Math.abs(published.zoneRun.allenMinusHall - (4.77 - 2.93)) < 1e-12)
    assert.ok(Math.abs(published.airYards.rbsdmGap - (9.3 - 6.1)) < 1e-12)
    assert.ok(Math.abs(published.airYards.ngsGap - (9.6 - 5.8)) < 1e-12)
    assert.deepEqual(published.bostonYprr, { man: 0.36, zone: 2.39, singleHigh: 0.53, twoHigh: 3.33 })
    assert.equal(published.roster.signed, "Irv Charles")
    assert.equal(published.roster.released, "Trevon Diggs")
    assert.equal(published.tnf.santosMadeYards, 58)
    assert.equal(published.tnf.santosMissedYards, 53)
    assert.equal(published.seasonEpaPerPlay[0]?.qb, "Brock Purdy")
    assert.equal(published.seasonEpaPerPlay[0]?.epa, 0.38)
    assert.equal(published.totalEpaLastTwoYears.find((row) => row.name === "Cam Ward")?.epa, -138.7)
    assert.equal(published.worstEpaPerPlay[0]?.name, "Baker Mayfield")
    assert.equal(published.worstEpaPerPlay[0]?.epa, -0.3)
    assert.equal(published.attemptsSinceInterception[0]?.name, "Jared Goff")
    assert.equal(published.attemptsSinceInterception[0]?.attempts, 192)
    assert.equal(published.attemptsSinceInterception.find((row) => row.attempts === 116)?.name, "Jayden Daniel")
    assert.equal(published.clePresnapPenaltiesPerGame, 5)
    const rush = published.tables.find((table) => table.label.startsWith("Most rush yards"))
    const yac = published.tables.find((table) => table.label.startsWith("Most yards after catch"))
    const explosive = published.tables.find((table) => table.label.startsWith("Most explosive passes"))
    assert.equal(rush?.rows[0]?.name, "Kenneth Walker III")
    assert.equal(rush?.rows[0]?.value, 665)
    assert.equal(yac?.rows[0]?.value, 1029)
    assert.equal(explosive?.rows[0]?.name, "Drake Maye")
    assert.equal(explosive?.rows[0]?.value, 172)
    assert.equal(published.tables.length, 7)
  })

  it("corrects showdown ownership only where a magnitude was stated", () => {
    assert.ok(Math.abs((correctShowdownOwnership("TE", 0.3) ?? 0) - 0.338) < 1e-12)
    assert.equal(correctShowdownOwnership("TE", 0.1), null)
    assert.ok(Math.abs((correctShowdownOwnership("DST", 0.1) ?? 0) - 0.075) < 1e-12)
    assert.ok(Math.abs((correctShowdownOwnership("K", 0.08) ?? 0) - 0.059) < 1e-12)
    assert.ok(Math.abs((correctShowdownOwnership("QB-mid", 0.2) ?? 0) - 0.164) < 1e-12)
    assert.ok(Math.abs((correctShowdownOwnership("QB-high", 0.55) ?? 0) - 0.566) < 1e-12)
  })
})
