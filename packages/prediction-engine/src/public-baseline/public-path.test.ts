import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
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
    assert.deepEqual(records.map((r) => r.playId), ["1"])
    assert.equal(records[0]?.dest, "brain/feeds/2026-10-22/trainer.jsonl")
    assert.deepEqual(
      dropped.map((d) => d.reason),
      ["kneel-or-spike", "kneel-or-spike", "garbage-wp", "garbage-wp", "epa-absent"],
    )
  })

  it("refuses a second write and refuses mind.jsonl", () => {
    const writer = new FeedWriter()
    const once = settleAndWrite(writer, "2026-10-22", plays, "2026-10-22T02:00:00Z")
    assert.equal(once.records.length, 1)
    assert.throws(() => settleAndWrite(writer, "2026-10-22", plays, "2026-10-22T02:00:00Z"), /single-writer/)
    assert.throws(
      () => writer.write({ ...once.records[0]!, key: "other", dest: "brain/mind.jsonl" }),
      /mind\.jsonl/,
    )
    assert.equal(feedDest("2026-10-22").includes("mind.jsonl"), false)
  })
})

describe("cadence locks", () => {
  it("hits Tue 04:00, Wed 17:00, and Fri 16:30 Chicago", () => {
    const tue = chicagoParts(new Date("2026-10-27T09:00:00Z"))
    const wed = chicagoParts(new Date("2026-10-28T22:00:00Z"))
    const fri = chicagoParts(new Date("2026-10-30T21:30:00Z"))
    assert.equal(dueVersion(tue), "v1.0")
    assert.equal(dueVersion(wed), "v2.0")
    assert.equal(dueVersion(fri), "v3.0")
    assert.equal(dueVersion(chicagoParts(new Date("2026-10-27T09:01:00Z"))), null)
  })

  it("v4.0 is kickoff minus 90 minutes", () => {
    const kick = new Date("2026-10-25T17:25:00Z")
    assert.equal(tMinus90(kick).toISOString(), "2026-10-25T15:55:00.000Z")
  })

  it("merkle changes when the payload changes and ignores key order", () => {
    const a = sealLock("v1.0", { b: 1, a: 2 }, "2026-10-27T09:00:00Z", "2026-10-27T09:00:01Z")
    const b = sealLock("v1.0", { a: 2, b: 1 }, "2026-10-27T09:00:00Z", "2026-10-27T09:00:01Z")
    const c = sealLock("v1.0", { a: 2, b: 3 }, "2026-10-27T09:00:00Z", "2026-10-27T09:00:01Z")
    assert.equal(a.merkle, b.merkle)
    assert.notEqual(a.merkle, c.merkle)
    assert.equal(a.merkle.length, 64)
  })

  it("xor of two 288-bit masks is the changed slots", () => {
    const left = emptyMask()
    const right = emptyMask()
    setBit(left, slotIndex(0, 0))
    setBit(left, slotIndex(3, 20))
    setBit(right, slotIndex(3, 20))
    const changed = xorMasks(left, right)
    assert.equal(changed[0]! & 1, 1)
    assert.equal(changed.length, 9)
    const bit = slotIndex(3, 20)
    const word = Math.floor(bit / 32)
    const mask = 1 << (bit % 32)
    assert.equal(changed[word]! & mask, 0)
  })
})

describe("narrative rejections on 401873010", () => {
  it("final is CHI 30, NE 24, total 54, and no claim signs a PLAY", () => {
    assert.equal(NE_CHI_FINAL.homeScore, 30)
    assert.equal(NE_CHI_FINAL.awayScore, 24)
    assert.equal(NE_CHI_FINAL.total, 54)
    const claims = [
      rejectNarrative({ id: "ol-4-vs-2", chi: 4, ne: 2 }, {}),
      rejectNarrative({ id: "wind-15", claimedMph: 15 }, { windMph: 5.1 }),
      rejectNarrative({ id: "bears-spread", line: -1.5 }, {}),
      rejectNarrative({ id: "bears-spread", line: -3 }, {}),
      rejectNarrative({ id: "gonzalez-hip" }, { gonzalezStatus: "illness" }),
    ]
    for (const row of claims) {
      assert.equal(row.accepted, false)
      assert.equal(row.playSigned, false)
      assert.equal(row.gameId, "401873010")
    }
    assert.match(claims[0]!.reason, /named-gap/)
    assert.match(claims[1]!.reason, /5\.1/)
    assert.match(claims[2]!.reason, /class-a/)
    assert.match(claims[4]!.reason, /illness/)
  })
})

describe("no-book fence", () => {
  it("rejects a book import and accepts the markov source", () => {
    assert.equal(findBookImports('import { x } from "./odds-api.js"').length, 1)
    const src = readFileSync(join(process.cwd(), "packages/prediction-engine/src/markov-simulator.ts"), "utf-8")
    assertNoBookInCoachSource(src, "markov-simulator.ts")
  })
})

describe("Marchenko-Pastur", () => {
  it("places the bulk at 0 and 4 when sigma2 = 1 and gamma = 1", () => {
    const edges = marchenkoPasturEdges(1, 1)
    assert.ok(edges)
    assert.ok(Math.abs(edges!.lower - 0) < 1e-12)
    assert.ok(Math.abs(edges!.upper - 4) < 1e-12)
  })

  it("flags an unpriced public spike and withholds a priced one", () => {
    const edges = marchenkoPasturEdges(1, 1)!
    assert.equal(flagOutsideBulk(5, edges, { public: true, priced: false }).reason, "outside-bulk")
    assert.equal(flagOutsideBulk(5, edges, { public: true, priced: true }).flag, false)
    assert.equal(flagOutsideBulk(5, edges, { public: false, priced: false }).reason, "not-public")
    assert.equal(flagOutsideBulk(2, edges, { public: true, priced: false }).reason, "inside-bulk")
  })
})
