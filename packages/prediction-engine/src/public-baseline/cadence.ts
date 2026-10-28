/**
 * Cadence locks. The schedule is the spec. Nothing here registers a cron.
 *
 * v1.0 Tue 04:00 CT, v2.0 Wed 17:00 CT, v2.5 Thu 16:30 CT (TNF prep pass),
 * v3.0 Fri 16:30 CT, v4.0 Sunday kickoff minus 90 minutes.
 *
 * v4.0 has two Sunday slots because the slate does: 10:30 CT is the early-slate
 * T-90m inactives lock, 13:35 CT the afternoon-slate one. They are distinct locks,
 * not a duplicate — the cron registry carries both and both are registered here so
 * no cron is an orphan.
 * Each lock carries valid_time, transaction_time, and a sha256 Merkle of the
 * canonical payload. The 5-minute day is a 288-bit mask, Uint32Array(9).
 */

import { createHash } from "node:crypto"

export const CADENCE = [
  { version: "v1.0", dow: "Tue", hour: 4, minute: 0 },
  { version: "v2.0", dow: "Wed", hour: 17, minute: 0 },
  { version: "v2.5", dow: "Thu", hour: 16, minute: 30 },
  { version: "v3.0", dow: "Fri", hour: 16, minute: 30 },
  { version: "v4.0", dow: "Sun", hour: 10, minute: 30 },
  { version: "v4.0", dow: "Sun", hour: 13, minute: 35 },
] as const

export const T_MINUS_MINUTES = 90
export const FIVE_MIN_SLOTS = 288
export const XOR_WORDS = 9

export type CadenceVersion = "v1.0" | "v2.0" | "v2.5" | "v3.0" | "v4.0"

export type WallClock = { dow: string; hour: number; minute: number }

export function chicagoParts(instant: Date): WallClock {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
  const parts = fmt.formatToParts(instant)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return { dow: get("weekday"), hour: Number(get("hour")), minute: Number(get("minute")) }
}

export function dueVersion(parts: WallClock): "v1.0" | "v2.0" | "v2.5" | "v3.0" | "v4.0" | null {
  for (const row of CADENCE) {
    if (parts.dow === row.dow && parts.hour === row.hour && parts.minute === row.minute) return row.version
  }
  return null
}

export function tMinus90(kickoff: Date): Date {
  return new Date(kickoff.getTime() - T_MINUS_MINUTES * 60 * 1000)
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null"
  if (Array.isArray(value)) return `[${value.map((v) => canonicalize(v)).join(",")}]`
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(",")}}`
}

export type SnapshotLock = {
  version: CadenceVersion
  validTime: string
  transactionTime: string
  merkle: string
}

export function sealLock(
  version: CadenceVersion,
  payload: unknown,
  validTime: string,
  transactionTime: string,
): SnapshotLock {
  const merkle = createHash("sha256")
    .update(canonicalize({ version, validTime, transactionTime, payload }))
    .digest("hex")
  return { version, validTime, transactionTime, merkle }
}

export function emptyMask(): Uint32Array {
  return new Uint32Array(XOR_WORDS)
}

export function slotIndex(hour: number, minute: number): number {
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new Error("slot clock out of range")
  return hour * 12 + Math.floor(minute / 5)
}

export function setBit(mask: Uint32Array, bit: number): void {
  if (bit < 0 || bit >= FIVE_MIN_SLOTS) throw new Error("bit out of the 288-slot day")
  const word = Math.floor(bit / 32)
  const shifted = (1 << (bit % 32)) >>> 0
  mask[word] = (mask[word]! ^ 0) | shifted
}

export function xorMasks(a: Uint32Array, b: Uint32Array): Uint32Array {
  if (a.length !== XOR_WORDS || b.length !== XOR_WORDS) throw new Error("mask must be Uint32Array(9)")
  const out = emptyMask()
  for (let i = 0; i < XOR_WORDS; i++) out[i] = (a[i]! ^ b[i]!) >>> 0
  return out
}
