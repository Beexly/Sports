/**
 * MILP solver bridge: pydfs-lineup-optimizer (MIT) via the python bridge.
 * Projections come from the GSE simulator only (publicPrior lineage).
 * The 50000 cap / 6 slots / 1.5x captain are enforced twice: by pydfs site
 * settings AND by lineup.ts on the TS side.
 */
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const BRIDGE = join(HERE, "..", "..", "scripts", "pydfs_bridge.py")

export type MilpPlayer = {
  name: string
  position: string
  salary: number
  projected: number
  team?: string
  opponent?: string
  player_id?: string
}

export type MilpRequest = {
  site: "draftkings" | "draftkings_captain" | "fanduel" | "fanduel_single_game"
  n?: number
  players: MilpPlayer[]
}

export type MilpLineup = {
  total_points: number
  total_salary: number
  players: { name: string; positions: string[]; salary: number; projected: number; team: string }[]
}

export type MilpOptions = { python?: string; timeoutMs?: number }

export function pydfsAvailable(python = process.env.GSE_PYTHON ?? "python"): boolean {
  try {
    const r = spawnSync(python, ["-c", "import pydfs_lineup_optimizer"])
    return r.status === 0
  } catch {
    return false
  }
}

function spawnSync(python: string, args: string[]) {
  // lazily imported to keep the module import light
  const { spawnSync } = require("node:child_process") as typeof import("node:child_process")
  return spawnSync(python, args, { encoding: "utf-8" })
}

export async function solveLineupsViaPydfs(
  req: MilpRequest,
  opts: MilpOptions = {},
): Promise<MilpLineup[]> {
  const python = opts.python ?? process.env.GSE_PYTHON ?? "python"
  const child = spawn(python, [BRIDGE], {
    stdio: ["pipe", "pipe", "pipe"],
  })
  const out: string[] = []
  const err: string[] = []
  child.stdout.setEncoding("utf-8")
  child.stderr.setEncoding("utf-8")
  child.stdout.on("data", (d: string) => out.push(d))
  child.stderr.on("data", (d: string) => err.push(d))
  const done = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error(`pydfs bridge timeout after ${opts.timeoutMs ?? 60000}ms`))
    }, opts.timeoutMs ?? 60000)
    child.on("exit", () => {
      clearTimeout(timer)
      resolve()
    })
    child.on("error", (e) => {
      clearTimeout(timer)
      reject(e)
    })
  })
  child.stdin.write(JSON.stringify(req))
  child.stdin.end()
  await done
  if (err.join("").includes("No module named 'pydfs_lineup_optimizer'")) {
    throw new Error("pydfs-lineup-optimizer is not installed for the bridge python")
  }
  const lineups: MilpLineup[] = []
  for (const line of out.join("").split("\n")) {
    const trimmed = line.trim()
    if (trimmed.startsWith("{")) lineups.push(JSON.parse(trimmed) as MilpLineup)
  }
  if (lineups.length === 0 && err.join("").trim() !== "") {
    throw new Error(`pydfs bridge error: ${err.join("").slice(0, 300)}`)
  }
  return lineups
}
