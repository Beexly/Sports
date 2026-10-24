/**
 * The analyst X pull is the coach corpus. Every post is an input.
 * A step that does not read the corpus does not run.
 * The corpus does not mint a ticket: 401873010 is a final.
 */
import { readFileSync } from "node:fs"
import { advanceOutcome, type MarkovState, type SituationInputs, type StepResult } from "../markov-simulator.js"
import { markApplied, publishFromCorpus, scanNumbers, type CoachPublished, type NumberToken } from "./corpus-ledger.js"
import { callSheet, type Call } from "./call-sheet.js"

export type CoachPost = {
  account: string
  createdAt: string
  postId: string
  url: string
  text: string
  coachInput: true
}

export type AvailabilityStatus = "out" | "questionable" | "playing" | "no-designation"

export type Availability = {
  player: string
  status: AvailabilityStatus
  detail: string
  team: string | null
  postId: string
  coachInput: true
}

export type Measurement = {
  label: string
  value: number
  postId: string
  coachInput: true
}

export type CoachBrief = {
  corpusRead: true
  coachInput: true
  ticket: null
  posts: CoachPost[]
  availability: Availability[]
  measurements: Measurement[]
  personnel: {
    SF: { wrActive: string[]; wrOut: string[] }
  }
  games: {
    "401873010": {
      gameId: "401873010"
      coachInput: true
      ticket: null
      mayeEpaPerDropback: number
      williamsEpaPerDropback: number
      santosFieldGoalYards: 58
      santosPostId: string
    }
    "401873012": {
      gameId: "401873012"
      coachInput: true
      ticket: null
      lamar: Availability
      bengalsBlitzRate: number
      bengalsPressureRate: number
      ravensEpaWhenBlitzed: number
      ravensEpaWithoutBlitz: number
      /** blitzRate * epaBlitzed + (1 - blitzRate) * epaUnblitzed. Weights are the post. */
      ravensExpectedEpaPerDropback: number
      chaseTargets: number
      chaseYards: number
      chaseFpg: number
    }
  }
  published: CoachPublished
  numbers: NumberToken[]
  calls: Call[]
}

const HEADER = /^([A-Za-z0-9_]+) — (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\s*$/

export function parseXPull(markdown: string): CoachPost[] {
  const posts: CoachPost[] = []
  const chunks = markdown.split(/\n(?=## @)/)
  for (const chunk of chunks) {
    const lines = chunk.split("\n")
    const headerLine = lines.find((line) => line.startsWith("## @"))
    if (!headerLine) continue
    const header = HEADER.exec(headerLine.replace(/^## @/, ""))
    if (!header) continue
    const urlMatch = chunk.match(/https:\/\/x\.com\/[^/\s]+\/status\/(\d+)/)
    if (!urlMatch) continue
    const text = lines
      .filter((line) => line !== headerLine && !line.startsWith("https://x.com/") && !line.startsWith("## "))
      .join("\n")
      .trim()
    posts.push({
      account: header[1] ?? "",
      createdAt: header[2] ?? "",
      postId: urlMatch[1] ?? "",
      url: urlMatch[0],
      text,
      coachInput: true,
    })
  }
  return posts
}

function firstSentence(value: string): string {
  let depth = 0
  for (let i = 0; i < value.length; i++) {
    const ch = value[i]
    if (ch === "(") depth++
    else if (ch === ")") depth--
    else if (ch === "." && depth === 0) {
      const next = value[i + 1]
      if (next && /[A-Za-z]/.test(next)) continue
      const word = value.slice(0, i).match(/[A-Za-z]+$/)?.[0] ?? ""
      if (word.length === 1) continue
      if (/^(Jr|Sr|St|Dr|Mr|Mrs)$/i.test(word)) continue
      return value.slice(0, i)
    }
  }
  return value
}

function splitPlayers(sentence: string): string[] {
  const parts: string[] = []
  let current = ""
  let depth = 0
  const push = () => {
    const trimmed = current.trim()
    if (trimmed) parts.push(trimmed)
    current = ""
  }
  for (let i = 0; i < sentence.length; i++) {
    const ch = sentence[i]
    if (ch === "(") depth++
    else if (ch === ")") depth--
    if (depth === 0 && sentence.slice(i, i + 5).toLowerCase() === " and ") {
      push()
      i += 4
      continue
    }
    if (depth === 0 && ch === ",") {
      push()
      continue
    }
    current += ch
  }
  push()
  return parts
}

function statusFromParen(paren: string, fallback: AvailabilityStatus): { status: AvailabilityStatus; detail: string } {
  const inner = paren.replace(/[()]/g, "").trim()
  const lower = inner.toLowerCase()
  if (lower.startsWith("out")) return { status: "out", detail: inner.replace(/^out,?\s*/i, "") }
  if (lower.startsWith("questionable")) return { status: "questionable", detail: inner.replace(/^questionable,?\s*/i, "") }
  if (lower.includes("no designation")) return { status: "no-designation", detail: "" }
  if (lower.includes("playing")) return { status: "playing", detail: "" }
  return { status: fallback, detail: inner }
}

export function availabilityFromPosts(posts: readonly CoachPost[]): Availability[] {
  const check = posts.find((post) => post.postId === "2113738867526475833")
  if (!check) return []
  const rows: Availability[] = []
  let section: AvailabilityStatus | null = null
  for (const raw of check.text.split("\n")) {
    const line = raw.trim()
    if (line.startsWith("Ruled out")) {
      section = "out"
      continue
    }
    if (line.startsWith("Questionable")) {
      section = "questionable"
      continue
    }
    if (line.startsWith("Good to go")) {
      section = "playing"
      continue
    }
    if (!section || !line.startsWith("•")) continue
    const sentence = firstSentence(line.replace(/^•\s*/, ""))
    const parts = splitPlayers(sentence)
    const shared = parts.find((part) => /\((?:all playing|no designation)\)/i.test(part))
    const sharedStatus = shared ? statusFromParen(shared.match(/\([^)]*\)/)?.[0] ?? "", section) : null
    let team: string | null = null
    if (/49ers/i.test(line)) team = "SF"
    if (/Seattle/i.test(line)) team = "SEA"
    if (/Cincinnati/i.test(line)) team = "BAL"
    for (const part of parts) {
      const paren = part.match(/\([^)]*\)/)?.[0] ?? ""
      const parsed = sharedStatus ?? statusFromParen(paren, section)
      const player = part
        .replace(/\([^)]*\)/g, "")
        .replace(/\s+(vs|for)\b[\s\S]*$/i, "")
        .trim()
      if (!player) continue
      rows.push({
        player,
        status: parsed.status,
        detail: parsed.detail,
        team,
        postId: check.postId,
        coachInput: true,
      })
    }
  }
  return rows
}

function numberBefore(text: string, pattern: RegExp): number | null {
  const match = pattern.exec(text)
  if (!match?.[1]) return null
  return Number(match[1])
}

export function measurementsFromPosts(posts: readonly CoachPost[]): Measurement[] {
  const out: Measurement[] = []
  const kittle = posts.find((post) => post.postId === "2112601489114108286")
  if (kittle) {
    const target = numberBefore(kittle.text, /had a ([\d.]+)% target share/)
    const from = numberBefore(kittle.text, /jumped from ([\d.]+)% to/)
    const to = numberBefore(kittle.text, /jumped from [\d.]+% to ([\d.]+)%/)
    if (target != null) out.push({ label: "SF:Kittle:targetShareAfterEvansExit", value: target / 100, postId: kittle.postId, coachInput: true })
    if (from != null) out.push({ label: "SF:Cooks:routeShareBefore", value: from / 100, postId: kittle.postId, coachInput: true })
    if (to != null) out.push({ label: "SF:Cooks:routeShareAfter", value: to / 100, postId: kittle.postId, coachInput: true })
  }
  const epas = posts.find((post) => post.postId === "2113474817475391765")
  if (epas) {
    const maye = numberBefore(epas.text, /Drake Maye: \+([\d.]+)/)
    const williams = numberBefore(epas.text, /Caleb Williams: \+([\d.]+)/)
    if (maye != null) out.push({ label: "NE:Maye:epaPerDropback:401873010", value: maye, postId: epas.postId, coachInput: true })
    if (williams != null) out.push({ label: "CHI:Williams:epaPerDropback:401873010", value: williams, postId: epas.postId, coachInput: true })
  }
  const blitz = posts.find((post) => post.postId === "2113699922398646589")
  if (blitz) {
    const rate = numberBefore(blitz.text, /blitz at the league's lowest rate \(([\d.]+)%\)/)
    const pressure = numberBefore(blitz.text, /pressure at a top-5 rate \(([\d.]+)%\)/)
    const on = numberBefore(blitz.text, /when blitzed \(([-\d.]+)\)/)
    const off = numberBefore(blitz.text, /without a blitz \(([-\d.]+)\)/)
    if (rate != null) out.push({ label: "CIN:blitzRate", value: rate / 100, postId: blitz.postId, coachInput: true })
    if (pressure != null) out.push({ label: "CIN:pressureRate", value: pressure / 100, postId: blitz.postId, coachInput: true })
    if (on != null) out.push({ label: "BAL:epaPerDropback:blitzed", value: on, postId: blitz.postId, coachInput: true })
    if (off != null) out.push({ label: "BAL:epaPerDropback:unblitzed", value: off, postId: blitz.postId, coachInput: true })
  }
  const vacuum = posts.find((post) => post.postId === "2113738867526475833")
  if (vacuum) {
    const share = numberBefore(vacuum.text, /That's ([\d.]+)% of the 49ers' targets/)
    if (share != null) out.push({ label: "SF:targetsSittingOut", value: share / 100, postId: vacuum.postId, coachInput: true })
  }
  return out
}

function must(measurements: readonly Measurement[], label: string): number {
  const row = measurements.find((item) => item.label === label)
  if (!row) throw new Error(`coach corpus missing measurement ${label}`)
  return row.value
}

export function expectedEpaPerDropback(blitzRate: number, whenBlitzed: number, whenNot: number): number {
  return blitzRate * whenBlitzed + (1 - blitzRate) * whenNot
}

export function readCoachBrief(markdown: string): CoachBrief {
  const posts = parseXPull(markdown)
  if (posts.length === 0) throw new Error("coach step refused: X corpus was not read")
  for (const post of posts) {
    if (post.coachInput !== true) throw new Error(`coach step refused: ${post.postId} was dropped`)
  }
  const availability = availabilityFromPosts(posts)
  const measurements = measurementsFromPosts(posts)
  const lamar = availability.find((row) => row.player === "Lamar Jackson")
  if (!lamar) throw new Error("coach step refused: Lamar Jackson was not in the corpus")
  const wr = posts.find((post) => post.postId === "2113729733460668831")
  if (!wr) throw new Error("coach step refused: 49ers WR room was not in the corpus")
  const wrActive = ["Christian Kirk", "Brandin Cooks", "Jordan Watkins", "Jacob Cowing"].filter((name) => wr.text.includes(name))
  const wrOut = ["Mike Evans", "Deebo Samuel"].filter((name) => availability.some((row) => row.player === name && row.status === "out"))
  const santos = posts.find((post) => post.text.includes("58-yard field goal"))
  if (!santos) throw new Error("coach step refused: Santos kick was not in the corpus")
  const blitzRate = must(measurements, "CIN:blitzRate")
  const whenBlitzed = must(measurements, "BAL:epaPerDropback:blitzed")
  const whenNot = must(measurements, "BAL:epaPerDropback:unblitzed")
  const published = publishFromCorpus(posts)
  const numbers = markApplied(scanNumbers(posts), published.sourceTokens)
  const calls = callSheet(posts, published)
  return {
    corpusRead: true,
    coachInput: true,
    ticket: null,
    posts,
    availability,
    measurements,
    personnel: { SF: { wrActive, wrOut } },
    published,
    numbers,
    calls,
    games: {
      "401873010": {
        gameId: "401873010",
        coachInput: true,
        ticket: null,
        mayeEpaPerDropback: must(measurements, "NE:Maye:epaPerDropback:401873010"),
        williamsEpaPerDropback: must(measurements, "CHI:Williams:epaPerDropback:401873010"),
        santosFieldGoalYards: 58,
        santosPostId: santos.postId,
      },
      "401873012": {
        gameId: "401873012",
        coachInput: true,
        ticket: null,
        lamar,
        bengalsBlitzRate: blitzRate,
        bengalsPressureRate: must(measurements, "CIN:pressureRate"),
        ravensEpaWhenBlitzed: whenBlitzed,
        ravensEpaWithoutBlitz: whenNot,
        ravensExpectedEpaPerDropback: expectedEpaPerDropback(blitzRate, whenBlitzed, whenNot),
        chaseTargets: published.balCin.chaseTargets,
        chaseYards: published.balCin.chaseYards,
        chaseFpg: published.balCin.chaseFpg,
      },
    },
  }
}

export function loadCoachCorpus(path: string): CoachBrief {
  return readCoachBrief(readFileSync(path, "utf8"))
}

export function requireCorpus(brief: CoachBrief | null | undefined): CoachBrief {
  if (!brief?.corpusRead || brief.posts.length === 0) {
    throw new Error("coach step refused: X corpus was not read")
  }
  return brief
}

/** Personnel the coach is allowed to put on the field after reading the corpus. */
export function personnelOnField(brief: CoachBrief, team: "SF", group: "WR"): string[] {
  requireCorpus(brief)
  if (team === "SF" && group === "WR") return brief.personnel.SF.wrActive.slice()
  return []
}

export function advanceWithCorpus(
  state: MarkovState,
  inputs: SituationInputs,
  brief: CoachBrief | null,
): StepResult & { coachInput: true; corpusPosts: number; wrOnField: string[] | null; balCinEpa: number | null } {
  const corpus = requireCorpus(brief)
  const step = advanceOutcome(state, inputs)
  const wrOnField = state.posteam === "SF" ? personnelOnField(corpus, "SF", "WR") : null
  const balCinEpa = state.posteam === "BAL" ? corpus.games["401873012"].ravensExpectedEpaPerDropback : null
  return { ...step, coachInput: true, corpusPosts: corpus.posts.length, wrOnField, balCinEpa }
}
