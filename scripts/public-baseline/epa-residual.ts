/**
 * nflfastR EPA/WP residual against the cube.
 *
 * Reads a flat play-by-play CSV with columns
 *   epa, wp, down, ydstogo, yardline_100 (nflfastR names), builds the cube's
 * situation cells (metrics.ts Cell), computes cellEpa, and reports the
 * residual against the reference means embedded in the fixture.
 *
 * DATA SOURCE STATUS (2026-10-24): nflverse-pbp moved weekly releases to
 * list-structured RDS (pyreadr/rdata cannot flatten them) and the season
 * CSV endpoints (nflfastR-data S3 + releases) now return HTML shells.
 * A flat feed is required to fill fixtures/nflfastr-pbp-sample.csv. Until
 * then this harness runs, but the residual report is status "blocked".
 * Do NOT reimplement EPA to paper over a missing feed.
 */
import { cellEpa, type Cell } from "../../packages/prediction-engine/src/public-baseline/metrics.js"
import { existsSync, readFileSync, writeFileSync } from "node:fs"

const FIXTURE = "packages/prediction-engine/src/public-baseline/fixtures/nflfastr-pbp-sample.csv"
const OUT = "packages/prediction-engine/src/public-baseline/fixtures/epa-residual-report.json"

function band(v: number, size: number): number {
  return Math.floor(v / size)
}

function main() {
  if (!existsSync(FIXTURE)) {
    const report = {
      status: "blocked",
      reason: "flat nflfastR pbp CSV unavailable: nflverse-pbp raw releases are list-RDS; season CSV endpoints serve HTML shells",
      harness: "ready",
      cellsTested: 0,
      residual: null,
    }
    writeFileSync(OUT, JSON.stringify(report, null, 2))
    console.log(JSON.stringify(report, null, 2))
    return
  }
  const lines = readFileSync(FIXTURE, "utf-8").trim().split("\n")
  const header = lines[0].split(",")
  const col = (n: string) => header.indexOf(n)
  const cells = new Map<string, Cell & { refSum: number; refN: number }>()
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(",")
    const down = Number(c[col("down")])
    const ytg = Number(c[col("ydstogo")])
    const yl = Number(c[col("yardline_100")])
    const epa = Number(c[col("epa")])
    const wp = Number(c[col("wp")])
    if (![down, ytg, yl, epa, wp].every(Number.isFinite)) continue
    const key = `d${down}|b${band(ytg, 3)}|y${band(yl, 5)}`
    const cell = cells.get(key) ?? { n: 0, epaSum: 0, signStable: true, refSum: 0, refN: 0 }
    cell.n += 1
    cell.epaSum += epa
    // sign stability proxy: EPA sign flips inside the cell
    if (cell.n > 1 && Math.sign(epa) !== Math.sign(cell.epaSum / cell.n)) cell.signStable = cell.n < 8
    cell.refSum += epa
    cell.refN += 1
    void wp
    cells.set(key, cell)
  }
  let maxRes = 0
  let sumRes = 0
  let tested = 0
  let dropped = 0
  for (const cell of cells.values()) {
    const ours = cellEpa(cell)
    if (ours == null) {
      dropped += 1
      continue
    }
    const ref = cell.refSum / cell.refN
    const res = Math.abs(ours - ref)
    maxRes = Math.max(maxRes, res)
    sumRes += res
    tested += 1
  }
  const report = {
    status: "ok",
    rows: lines.length - 1,
    cells: cells.size,
    cellsTested: tested,
    cellsDroppedByStabilityGate: dropped,
    residual: { mean: Number((sumRes / Math.max(tested, 1)).toFixed(9)), max: Number(maxRes.toFixed(9)) },
    note: "cube cellEpa is a round-trip of the fixture EPA sums; the residual certifies the cube plumbing, not a new EPA model",
  }
  writeFileSync(OUT, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
}

main()
