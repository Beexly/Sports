import { describe, it, expect } from "vitest"
import { existsSync } from "node:fs"
import {
  calibrateGseProbability,
  signCallSheetTickets,
  assertNoContradictoryTickets,
} from "./calibration-map.js"
import { loadCoachCorpus } from "./x-corpus.js"
import { CORPUS_PATH } from "./corpus-path.js"

function corpusPath(): string {
  if (!existsSync(CORPUS_PATH)) throw new Error(`coach corpus not found at ${CORPUS_PATH}`)
  return CORPUS_PATH
}

describe("calibration-map & signed call sheet tickets", () => {
  it("removes the 5.2pt overconfidence inflation while keeping probabilities strictly monotone", () => {
    const p53 = calibrateGseProbability(0.53)
    const p67 = calibrateGseProbability(0.67)
    expect(p53).toBeLessThan(0.5)
    expect(p67).toBeCloseTo(0.618, 2)
    expect(p67).toBeGreaterThan(p53)
  })

  it("mints signed tickets from the verified Oct 24 coach call sheet (SF-personnel Brandin Cooks 83% route share -> OVER)", () => {
    const brief = loadCoachCorpus(corpusPath())
    const signed = signCallSheetTickets(brief.calls, {
      "SF-personnel": {
        marketLabel:
          "Brandin Cooks OVER 24.5 Receiving Yards & George Kittle OVER 71.5 Receiving Yards",
        rawModelProb: 0.68,
        americanOdds: -115,
        opposingAmericanOdds: -105,
      },
    })

    const row = signed.find((call) => call.id === "SF-personnel")
    expect(row).toBeDefined()
    expect(row!.signedTicket).not.toBeNull()
    expect(row!.signedTicket!.marketLabel).toContain("Brandin Cooks OVER 24.5")
    expect(row!.signedTicket!.edgePct).toBeGreaterThan(8.0)
    expect(row!.signedTicket!.calibratedProb).toBeCloseTo(0.628, 3)
    expect(row!.signedTicket!.kellyQuarterUnits).toBeGreaterThan(0)
    expect(row!.signedTicket!.kellyQuarterUnits).toBeLessThanOrEqual(2.5)
    // The widened Call.ticket is filled with the same frozen ticket.
    expect(row!.ticket).toBe(row!.signedTicket)
  })

  it("blocks a contradictory OVER/UNDER split on the same player+stat", () => {
    const brief = loadCoachCorpus(corpusPath())
    const signed = signCallSheetTickets(brief.calls, {
      "SF-personnel": {
        marketLabel: "Brandin Cooks OVER 24.5 Receiving Yards",
        rawModelProb: 0.68,
        americanOdds: -115,
        opposingAmericanOdds: -105,
      },
      "SEA-KC": {
        marketLabel: "Brandin Cooks UNDER 24.5 Receiving Yards",
        rawModelProb: 0.68,
        americanOdds: -115,
        opposingAmericanOdds: -105,
      },
    })

    expect(signed.find((call) => call.id === "SF-personnel")!.ticket).not.toBeNull()
    expect(signed.find((call) => call.id === "SEA-KC")!.ticket).toBeNull()
  })

  it("refuses a ticket when the calibrated edge is below the threshold", () => {
    const brief = loadCoachCorpus(corpusPath())
    const signed = signCallSheetTickets(brief.calls, {
      "SF-personnel": {
        marketLabel: "Brandin Cooks OVER 24.5 Receiving Yards",
        rawModelProb: 0.52,
        americanOdds: -115,
        opposingAmericanOdds: -105,
      },
    })

    expect(signed.find((call) => call.id === "SF-personnel")!.ticket).toBeNull()
  })

  it("throws when a signed set prices the same player+stat both ways", () => {
    const brief = loadCoachCorpus(corpusPath())
    const signed = signCallSheetTickets(brief.calls, {
      "SF-personnel": {
        marketLabel: "Brandin Cooks OVER 24.5 Receiving Yards",
        rawModelProb: 0.68,
        americanOdds: -115,
        opposingAmericanOdds: -105,
      },
      "SEA-KC": {
        marketLabel: "Brandin Cooks UNDER 24.5 Receiving Yards",
        rawModelProb: 0.68,
        americanOdds: -115,
        opposingAmericanOdds: -105,
      },
    })
    const tickets = signed
      .map((call) => call.signedTicket)
      .filter((ticket): ticket is NonNullable<typeof ticket> => ticket !== null)
    expect(tickets).toHaveLength(1)
    expect(() => assertNoContradictoryTickets(tickets)).not.toThrow()

    const contradictory = [
      ...tickets,
      {
        ...tickets[0]!,
        marketLabel: "Brandin Cooks UNDER 24.5 Receiving Yards",
      },
    ]
    expect(() => assertNoContradictoryTickets(contradictory)).toThrow(/contradictory/i)
  })
})
