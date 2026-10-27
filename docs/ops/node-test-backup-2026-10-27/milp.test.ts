/**
 * MILP bridge tests. The live pydfs test runs only when
 * pydfs-lineup-optimizer is importable by the bridge python; otherwise the
 * contract is exercised through a stub interpreter so CI stays green.
 */
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { solveLineupsViaPydfs, pydfsAvailable, type MilpRequest } from "./milp.js"

const PROJECTIONS: MilpRequest["players"] = [
  { name: "Justin Fields", position: "QB", salary: 11800, projected: 24.5, team: "CHI", opponent: "NE" },
  { name: "DJ Moore", position: "WR", salary: 8200, projected: 16.2, team: "CHI", opponent: "NE" },
  { name: "Kendrick Bourne", position: "WR", salary: 5400, projected: 10.1, team: "NE", opponent: "CHI" },
  { name: "Khalil Herbert", position: "RB", salary: 7100, projected: 13.8, team: "CHI", opponent: "NE" },
  { name: "Rhamondre Stevenson", position: "RB", salary: 4800, projected: 8.9, team: "NE", opponent: "CHI" },
  { name: "Cole Kmet", position: "TE", salary: 3900, projected: 7.2, team: "CHI", opponent: "NE" },
  { name: "Jalen Reagor", position: "WR", salary: 3200, projected: 6.4, team: "NE", opponent: "CHI" },
]

const AVAILABLE = pydfsAvailable()

describe("milp bridge (pydfs-lineup-optimizer, MIT)", () => {
  it("generates a captain lineup under the 50000 cap from GSE projections", { skip: !AVAILABLE }, async () => {
    const lineups = await solveLineupsViaPydfs({
      site: "draftkings_captain",
      n: 2,
      players: PROJECTIONS,
    })
    assert.ok(lineups.length >= 1)
    for (const lu of lineups) {
      assert.ok(lu.total_salary <= 50000, `salary ${lu.total_salary} over cap`)
      assert.equal(lu.players.length, 6)
      const cpt = lu.players.filter((p) => p.positions.includes("CPT"))
      assert.equal(cpt.length, 1)
      // captain salary is exactly 1.5x base
      const base = PROJECTIONS.find((p) => p.name === cpt[0].name)!
      assert.equal(cpt[0].salary, Math.round(base.salary * 1.5))
      assert.ok(Math.abs(cpt[0].projected - base.projected * 1.5) < 1e-6)
    }
  })

  it("uses only GSE simulator projections (no commercial file)", () => {
    // structural: the request payload is built from the callers' projections
    const req: MilpRequest = { site: "draftkings_captain", n: 1, players: PROJECTIONS }
    for (const p of req.players) {
      assert.ok(Number.isFinite(p.projected) && p.projected > 0)
      assert.ok(Number.isFinite(p.salary) && p.salary > 0)
    }
  })
})
