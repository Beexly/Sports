import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it } from "node:test"
import { loadCoachCorpus } from "./x-corpus.js"

const brief = loadCoachCorpus(join(process.cwd(), "docs/engine/corpus/x-pull-2026-10-24.md"))

function call(id: string) {
  const found = brief.calls.find((row) => row.id === id)
  if (!found) throw new Error(`missing call ${id}`)
  return found
}

describe("call sheet", () => {
  it("installs the tendency and refuses to hide it inside the blend", () => {
    const row = call("401873012-dropback")
    assert.match(row.install, /Practice the unblitzed dropback, -0.028/)
    assert.match(row.expectation ?? "", /0\.02896/)
    assert.match(row.alert, /0\.292/)
    assert.match(row.willNot, /Will not install the weighted number/)
    assert.equal(row.ticket, null)
  })

  it("puts the ball in the slot and the coverage on Chase", () => {
    const row = call("401873012-where-the-ball-goes")
    assert.match(row.install, /slot to Zay Flowers/)
    assert.match(row.expectation ?? "", /Ja'Marr Chase/)
    assert.match(row.willNot, /will not test them outside/)
  })

  it("keeps two Lamar scripts and docks the rush", () => {
    const row = call("401873012-lamar")
    assert.match(row.install, /questionable/)
    assert.match(row.install, /beats the earlier graphic/)
    assert.match(row.alert, /rush script is docked/)
    assert.match(row.willNot, /Will not mark him in/)
    assert.equal(row.ticket, null)
  })

  it("sits Evans and will not fade a 6-0 team for the body count", () => {
    const row = call("SF-personnel")
    assert.match(row.install, /Sit Evans/)
    assert.match(row.expectation ?? "", /6-0/)
    assert.match(row.willNot, /Will not fade San Francisco/)
    assert.match(row.alert, /does not assign the split/)
  })

  it("tells San Francisco to get out of zone against London", () => {
    const row = call("SF-coverage-vs-london")
    assert.match(row.install, /2\.86 versus 1\.57/)
    assert.match(row.willNot, /Will not trust the zone tendency/)
  })

  it("scratches Charbonnet on the later report and will not run at Kansas City", () => {
    const row = call("SEA-KC")
    assert.match(row.install, /Friday designation beats the earlier graphic/)
    assert.match(row.install, /deleted video does not overrule/)
    assert.match(row.alert, /get out of zone/)
    assert.match(row.willNot, /next week against the Bears/)
  })

  it("gives Allen the zone runs and refuses to average Boston's shells", () => {
    assert.match(call("NYJ-zone-run").install, /Braelon Allen, 4\.77/)
    assert.match(call("TEN-boston").willNot, /not a partition/)
  })

  it("signs nothing", () => {
    assert.equal(brief.calls.length, 8)
    for (const row of brief.calls) assert.equal(row.ticket, null)
  })
})
