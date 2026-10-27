import { describe, it, expect } from "vitest"
import { correctShowdownOwnership, markApplied, publishFromCorpus, scanNumbers } from "./corpus-ledger.js"
import { parseXPull } from "./x-corpus.js"
import { readFileSync } from "node:fs"
import { CORPUS_PATH } from "./corpus-path.js"

const posts = parseXPull(readFileSync(CORPUS_PATH, "utf8"))

describe("coach ledger", () => {
  const published = publishFromCorpus(posts)
  const numbers = markApplied(scanNumbers(posts), published.sourceTokens)

  it("keeps every number and applies the ones the text can finish", () => {
    expect(numbers.length).toBe(scanNumbers(posts).length)
    expect(numbers.length > 500).toBeTruthy()
    for (const token of numbers) expect(token.use === "applied" || token.use === "held" || token.use === "not-a-rate").toBeTruthy()
    const applied = numbers.filter((token) => token.use === "applied")
    const held = numbers.filter((token) => token.use === "held")
    expect(applied.length >= 40).toBeTruthy()
    expect(held.length > applied.length).toBeTruthy()
    expect(published.baselineIfCorpusIgnored).toBe(null)
  })

  it("moves the figures the posts determine, and does not invent the rest", () => {
    const expected = published.balCin.dropbackEpa
    expect(Math.abs(expected - (0.178 * 0.292 + 0.822 * -0.028)) < 1e-9).toBeTruthy()
    expect(Math.abs(published.balCin.pressureRate - 0.393) < 1e-12).toBeTruthy()
    expect(published.balCin.chaseTargets).toBe(14.5)
    expect(published.balCin.chaseYards).toBe(174.8)
    expect(published.balCin.chaseFpg).toBe(34.5)
    expect(published.sf.vacatedAllocated).toBe(false)
    expect(Math.abs(published.sf.vacatedTargetShare - 0.38) < 1e-12).toBeTruthy()
    expect(Math.abs(published.sf.cooksRouteShareDelta - 0.6) < 1e-12).toBeTruthy()
    expect(Math.abs(published.zoneRun.allenMinusHall - (4.77 - 2.93)) < 1e-12).toBeTruthy()
    expect(Math.abs(published.airYards.rbsdmGap - (9.3 - 6.1)) < 1e-12).toBeTruthy()
    expect(Math.abs(published.airYards.ngsGap - (9.6 - 5.8)) < 1e-12).toBeTruthy()
    expect(published.bostonYprr).toEqual({ man: 0.36, zone: 2.39, singleHigh: 0.53, twoHigh: 3.33 })
    expect(published.roster.signed).toBe("Irv Charles")
    expect(published.roster.released).toBe("Trevon Diggs")
    expect(published.tnf.santosMadeYards).toBe(58)
    expect(published.tnf.santosMissedYards).toBe(53)
    expect(published.seasonEpaPerPlay[0]?.qb).toBe("Brock Purdy")
    expect(published.seasonEpaPerPlay[0]?.epa).toBe(0.38)
    expect(published.totalEpaLastTwoYears.find((row) => row.name === "Cam Ward")?.epa).toBe(-138.7)
    expect(published.worstEpaPerPlay[0]?.name).toBe("Baker Mayfield")
    expect(published.worstEpaPerPlay[0]?.epa).toBe(-0.3)
    expect(published.attemptsSinceInterception[0]?.name).toBe("Jared Goff")
    expect(published.attemptsSinceInterception[0]?.attempts).toBe(192)
    expect(published.attemptsSinceInterception.find((row) => row.attempts === 116)?.name).toBe("Jayden Daniel")
    expect(published.clePresnapPenaltiesPerGame).toBe(5)
    const rush = published.tables.find((table) => table.label.startsWith("Most rush yards"))
    const yac = published.tables.find((table) => table.label.startsWith("Most yards after catch"))
    const explosive = published.tables.find((table) => table.label.startsWith("Most explosive passes"))
    expect(rush?.rows[0]?.name).toBe("Kenneth Walker III")
    expect(rush?.rows[0]?.value).toBe(665)
    expect(yac?.rows[0]?.value).toBe(1029)
    expect(explosive?.rows[0]?.name).toBe("Drake Maye")
    expect(explosive?.rows[0]?.value).toBe(172)
    expect(published.tables.length).toBe(7)
  })

  it("corrects showdown ownership only where a magnitude was stated", () => {
    expect(Math.abs((correctShowdownOwnership("TE", 0.3) ?? 0) - 0.338) < 1e-12).toBeTruthy()
    expect(correctShowdownOwnership("TE", 0.1)).toBe(null)
    expect(Math.abs((correctShowdownOwnership("DST", 0.1) ?? 0) - 0.075) < 1e-12).toBeTruthy()
    expect(Math.abs((correctShowdownOwnership("K", 0.08) ?? 0) - 0.059) < 1e-12).toBeTruthy()
    expect(Math.abs((correctShowdownOwnership("QB-mid", 0.2) ?? 0) - 0.164) < 1e-12).toBeTruthy()
    expect(Math.abs((correctShowdownOwnership("QB-high", 0.55) ?? 0) - 0.566) < 1e-12).toBeTruthy()
  })
})
