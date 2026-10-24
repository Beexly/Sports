/**
 * T+2h realized-play grader.
 *
 * Writes one trainer record per kept play under brain/feeds/<date>/.
 * A second write of the same key throws. brain/mind.jsonl is not a dest.
 * Kneels, spikes, and plays with win probability above 0.95 or below 0.05
 * are dropped. A missing EPA is dropped. Nothing here is a signed PLAY.
 */

export const WP_GARBAGE_HI = 0.95
export const WP_GARBAGE_LO = 0.05

export type RealizedPlay = {
  gameId: string
  playId: string
  playType?: string
  desc?: string
  epa: number | null
  wp: number | null
}

export type TrainerRecord = {
  key: string
  dest: string
  gameId: string
  playId: string
  epa: number
  validTime: string
}

export function feedDest(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("feed date must be YYYY-MM-DD")
  return `brain/feeds/${date}/trainer.jsonl`
}

export function isKneelOrSpike(play: RealizedPlay): boolean {
  const kind = (play.playType ?? "").toLowerCase()
  const desc = (play.desc ?? "").toLowerCase()
  if (kind === "qb_kneel" || kind === "qb_spike" || kind === "kneel" || kind === "spike") return true
  return desc.includes("kneel") || desc.includes("spiked the ball") || desc.includes("spike")
}

/** Strict. A missing win probability is not treated as garbage. */
export function isGarbageWp(wp: number | null): boolean {
  if (wp == null || !Number.isFinite(wp)) return false
  return wp > WP_GARBAGE_HI || wp < WP_GARBAGE_LO
}

export function gradeRealizedPlays(plays: readonly RealizedPlay[]): {
  kept: RealizedPlay[]
  dropped: { playId: string; reason: "kneel-or-spike" | "garbage-wp" | "epa-absent" }[]
} {
  const kept: RealizedPlay[] = []
  const dropped: { playId: string; reason: "kneel-or-spike" | "garbage-wp" | "epa-absent" }[] = []
  for (const play of plays) {
    if (isKneelOrSpike(play)) {
      dropped.push({ playId: play.playId, reason: "kneel-or-spike" })
      continue
    }
    if (isGarbageWp(play.wp)) {
      dropped.push({ playId: play.playId, reason: "garbage-wp" })
      continue
    }
    if (play.epa == null || !Number.isFinite(play.epa)) {
      dropped.push({ playId: play.playId, reason: "epa-absent" })
      continue
    }
    kept.push(play)
  }
  return { kept, dropped }
}

export class FeedWriter {
  private readonly keys = new Set<string>()

  write(record: TrainerRecord): TrainerRecord {
    if (record.dest.includes("mind.jsonl")) {
      throw new Error("settlement must not write brain/mind.jsonl")
    }
    if (!record.dest.startsWith("brain/feeds/")) {
      throw new Error("settlement writes only brain/feeds/<date>/")
    }
    if (this.keys.has(record.key)) {
      throw new Error(`single-writer refused second write: ${record.key}`)
    }
    this.keys.add(record.key)
    return record
  }
}

export function settleAndWrite(
  writer: FeedWriter,
  date: string,
  plays: readonly RealizedPlay[],
  validTime: string,
): { records: TrainerRecord[]; dropped: ReturnType<typeof gradeRealizedPlays>["dropped"] } {
  const { kept, dropped } = gradeRealizedPlays(plays)
  const dest = feedDest(date)
  const records = kept.map((play) =>
    writer.write({
      key: `${play.gameId}:${play.playId}`,
      dest,
      gameId: play.gameId,
      playId: play.playId,
      epa: play.epa as number,
      validTime,
    }),
  )
  return { records, dropped }
}
