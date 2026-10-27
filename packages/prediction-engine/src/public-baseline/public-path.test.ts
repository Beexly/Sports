import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it, expect } from "vitest"
import { chicagoParts, dueVersion, emptyMask, sealLock, setBit, slotIndex, tMinus90, xorMasks } from "./cadence.js"
import { flagOutsideBulk, marchenkoPasturEdges } from "./marchenko.js"
import { NE_CHI_FINAL, rejectNarrative } from "./narrative-rejections.js"
import { assertNoBookInCoachSource, findBookImports } from "./no-book-fence.js"
import { FeedWriter, feedDest, settleAndWrite, type RealizedPlay } from "./realized-settlement.js"

describe("realized settlement", () => {
  const plays: RealizedPlay[] = [
    { gameId: "401873010", playId: "1", playType: "pass", epa: 0.4, wp: 0.5 },
    { gameId: "401873010", playId: "2", playType: "qb_kneel", desc: "kneels", epa: -1.06, wp: 0.99 },
    { gameId: "401873010", playId: "3", playType: "qb_spike", desc: "spiked the ball", epa: 0, wp: 0.4 },
    { gameId: "401873010", playId: "4", playType: "pass", epa: 1.2, wp: 0.97 },
    { gameId: "401873010", playId: "5", playType: "pass", epa: -0.2, wp: 0.04 },
    { gameId: "401873010", playId: "6", playType: "pass", epa: null, wp: 0.5 },
  ]

  it("strips kneels, spikes, garbage win probability, and missing EPA", () => {
    const { records, dropped } = settleAndWrite(new FeedWriter(), "2026-10-22", plays, "2026-10-22T02:00:00Z")
    expect(records.map((r) => r.playId)).toEqual(["1"])
    expect(records[0]?.dest).toBe("brain/feeds/2026-10-22/trainer.jsonl")
    expect(dropped.map((d) => d.reason)).toEqual(["kneel-or-spike", "kneel-or-spike", "garbage-wp", "garbage-wp", "epa-absent"])
  })

  it("refuses a second write and refuses mind.jsonl", () => {
    const writer = new FeedWriter()
    const once = settleAndWrite(writer, "2026-10-22", plays, "2026-10-22T02:00:00Z")
    expect(once.records.length).toBe(1)
    expect(() => settleAndWrite(writer, "2026-10-22", plays, "2026-10-22T02:00:00Z")).toThrow(/single-writer/)
    expect(() => writer.write({ ...once.records[0]!, key: "other", dest: "brain/mind.jsonl" })).toThrow(/mind\.jsonl/)
    expect(feedDest("2026-10-22").includes("mind.jsonl")).toBe(false)
  })
})

describe("cadence locks", () => {
  it("hits Tue 04:00, Wed 17:00, and Fri 16:30 Chicago", () => {
    const tue = chicagoParts(new Date("2026-10-27T09:00:00Z"))
    const wed = chicagoParts(new Date("2026-10-28T22:00:00Z"))
    const fri = chicagoParts(new Date("2026-10-30T21:30:00Z"))
    expect(dueVersion(tue)).toBe("v1.0")
    expect(dueVersion(wed)).toBe("v2.0")
    expect(dueVersion(fri)).toBe("v3.0")
    expect(dueVersion(chicagoParts(new Date("2026-10-27T09:01:00Z")))).toBe(null)
  })

  it("v4.0 is kickoff minus 90 minutes", () => {
    const kick = new Date("2026-10-25T17:25:00Z")
    expect(tMinus90(kick).toISOString()).toBe("2026-10-25T15:55:00.000Z")
  })

  it("merkle changes when the payload changes and ignores key order", () => {
    const a = sealLock("v1.0", { b: 1, a: 2 }, "2026-10-27T09:00:00Z", "2026-10-27T09:00:01Z")
    const b = sealLock("v1.0", { a: 2, b: 1 }, "2026-10-27T09:00:00Z", "2026-10-27T09:00:01Z")
    const c = sealLock("v1.0", { a: 2, b: 3 }, "2026-10-27T09:00:00Z", "2026-10-27T09:00:01Z")
    expect(a.merkle).toBe(b.merkle)
    expect(a.merkle).not.toBe(c.merkle)
    expect(a.merkle.length).toBe(64)
  })

  it("xor of two 288-bit masks is the changed slots", () => {
    const left = emptyMask()
    const right = emptyMask()
    setBit(left, slotIndex(0, 0))
    setBit(left, slotIndex(3, 20))
    setBit(right, slotIndex(3, 20))
    const changed = xorMasks(left, right)
    expect(changed[0]! & 1).toBe(1)
    expect(changed.length).toBe(9)
    const bit = slotIndex(3, 20)
    const word = Math.floor(bit / 32)
    const mask = 1 << (bit % 32)
    expect(changed[word]! & mask).toBe(0)
  })
})

describe("narrative rejections on 401873010", () => {
  it("final is CHI 30, NE 24, total 54, and no claim signs a PLAY", () => {
    expect(NE_CHI_FINAL.homeScore).toBe(30)
    expect(NE_CHI_FINAL.awayScore).toBe(24)
    expect(NE_CHI_FINAL.total).toBe(54)
    const claims = [
      rejectNarrative({ id: "ol-4-vs-2", chi: 4, ne: 2 }, {}),
      rejectNarrative({ id: "wind-15", claimedMph: 15 }, { windMph: 5.1 }),
      rejectNarrative({ id: "bears-spread", line: -1.5 }, {}),
      rejectNarrative({ id: "bears-spread", line: -3 }, {}),
      rejectNarrative({ id: "gonzalez-hip" }, { gonzalezStatus: "illness" }),
    ]
    for (const row of claims) {
      expect(row.accepted).toBe(false)
      expect(row.playSigned).toBe(false)
      expect(row.gameId).toBe("401873010")
    }
    expect(claims[0]!.reason).toMatch(/named-gap/)
    expect(claims[1]!.reason).toMatch(/5\.1/)
    expect(claims[2]!.reason).toMatch(/class-a/)
    expect(claims[4]!.reason).toMatch(/illness/)
  })
})

describe("no-book fence", () => {
  it("rejects a book import and accepts the markov source", () => {
    expect(findBookImports('import { x } from "./odds-api.js"').length).toBe(1)
    // Resolve from THIS file, not process.cwd(): vitest runs with cwd at the
    // package dir, so the repo-relative literal doubled the package segment.
    const src = readFileSync(join(__dirname, "..", "markov-simulator.ts"), "utf-8")
    assertNoBookInCoachSource(src, "markov-simulator.ts")
  })
})

describe("Marchenko-Pastur", () => {
  it("places the bulk at 0 and 4 when sigma2 = 1 and gamma = 1", () => {
    const edges = marchenkoPasturEdges(1, 1)
    expect(edges).toBeTruthy()
    expect(Math.abs(edges!.lower - 0) < 1e-12).toBeTruthy()
    expect(Math.abs(edges!.upper - 4) < 1e-12).toBeTruthy()
  })

  it("flags an unpriced public spike and withholds a priced one", () => {
    const edges = marchenkoPasturEdges(1, 1)!
    expect(flagOutsideBulk(5, edges, { public: true, priced: false }).reason).toBe("outside-bulk")
    expect(flagOutsideBulk(5, edges, { public: true, priced: true }).flag).toBe(false)
    expect(flagOutsideBulk(5, edges, { public: false, priced: false }).reason).toBe("not-public")
    expect(flagOutsideBulk(2, edges, { public: true, priced: false }).reason).toBe("inside-bulk")
  })
})
