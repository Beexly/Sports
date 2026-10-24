/**
 * Every number in the coach corpus is kept.
 * A number moves a published figure only when the posts determine the arithmetic.
 * A vacated share is not handed to whoever is left. A complement that was not
 * stated is not invented.
 */
import type { CoachPost } from "./x-corpus.js"

export type NumberUse = "applied" | "held" | "not-a-rate"

export type NumberToken = {
  postId: string
  raw: string
  value: number
  use: NumberUse
  reason: string
}

export type OwnershipPosition = "TE" | "DST" | "K" | "QB-mid" | "QB-high"

const TOKEN = /(?<![\w])([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?%?)/g

function numeric(raw: string): number {
  const negative = raw.startsWith("-")
  const body = raw.replace(/^[+-]/, "").replace(/,/g, "").replace("%", "")
  const value = Number(body)
  return negative ? -value : value
}

export function scanNumbers(posts: readonly CoachPost[]): NumberToken[] {
  const out: NumberToken[] = []
  for (const post of posts) {
    for (const match of post.text.matchAll(TOKEN)) {
      const raw = match[1] ?? ""
      const index = match.index ?? 0
      const context = post.text.slice(Math.max(0, index - 48), index + raw.length + 48)
      out.push({ postId: post.postId, raw, value: numeric(raw), ...classify(raw, context) })
    }
  }
  return out
}

function classify(raw: string, context: string): { use: NumberUse; reason: string } {
  if (/https?:|t\.co|youtu\.be|dynatyze\.com|pff\.com/i.test(context)) {
    return { use: "not-a-rate", reason: "link residue" }
  }
  if (/^\d{4}$/.test(raw.replace(/^[+-]/, "")) && /20\d\d|19\d\d/.test(raw)) {
    return { use: "not-a-rate", reason: "calendar year" }
  }
  if (/\d\s*(am|pm)\b/i.test(context) || /free trial/i.test(context)) {
    return { use: "not-a-rate", reason: "clock or promo" }
  }
  if (/sorry for the delay|ford ranger|coin flip|age 6/i.test(context)) {
    return { use: "not-a-rate", reason: "not a football rate" }
  }
  return { use: "held", reason: "on the coach ledger; no closed form of its own" }
}

function post(posts: readonly CoachPost[], id: string): string {
  const found = posts.find((row) => row.postId === id)
  if (!found) throw new Error(`coach ledger missing post ${id}`)
  return found.text
}

function take(text: string, pattern: RegExp, label: string, raws: string[]): number {
  const match = pattern.exec(text)
  if (!match?.[1]) throw new Error(`coach ledger could not read ${label}`)
  raws.push(match[1])
  return numeric(match[1])
}

export type CoachPublished = {
  baselineIfCorpusIgnored: null
  balCin: {
    dropbackEpa: number
    formula: string
    pressureRate: number
    chaseTargets: number
    chaseYards: number
    chaseFpg: number
    chaseSince: number
  }
  sf: {
    vacatedTargetShare: number
    vacatedAllocated: false
    cooksRouteShareBefore: number
    cooksRouteShareAfter: number
    cooksRouteShareDelta: number
    kittleTargetShareAfterEvansExit: number
  }
  zoneRun: { allenYpc: number; hallYpc: number; allenMinusHall: number }
  airYards: {
    mayeRbsdm: number
    williamsRbsdm: number
    rbsdmGap: number
    mayeNgs: number
    williamsNgs: number
    ngsGap: number
  }
  bostonYprr: { man: number; zone: number; singleHigh: number; twoHigh: number }
  titansRates: { zone: number; twoHigh: number }
  ownershipPercentagePoints: Record<OwnershipPosition, number>
  tnf: { maye: number; williams: number; floorBothOffenses: number; santosMadeYards: number; santosMissedYards: number }
  seasonEpaPerPlay: { year: number; qb: string; epa: number }[]
  totalEpaLastTwoYears: { rank: number; name: string; epa: number }[]
  worstEpaPerPlay: { name: string; team: string; epa: number }[]
  attemptsSinceInterception: { name: string; attempts: number }[]
  roster: { signed: string; released: string }
  clePresnapPenaltiesPerGame: number
  tables: { postId: string; label: string; rows: { name: string; value: number }[] }[]
  /** Exact tokens consumed by the figures above. */
  sourceTokens: string[]
}

export function correctShowdownOwnership(position: OwnershipPosition, projected: number): number | null {
  if (position === "TE") {
    if (projected < 0.25 || projected >= 0.5) return null
    return projected + 0.038
  }
  if (position === "DST") return projected - 0.025
  if (position === "K") return projected - 0.021
  if (position === "QB-mid") return projected - 0.036
  if (position === "QB-high") return projected + 0.016
  return null
}

export function publishFromCorpus(posts: readonly CoachPost[]): CoachPublished {
  const raws: string[] = []
  const air = post(posts, "2112510211973890157")
  const mayeRbsdm = take(air, /Air Yards \(RBSDM\):\s*Maye:\s*([\d.]+)/, "Maye RBSDM", raws)
  const williamsRbsdm = take(air, /Maye:\s*[\d.]+\s*Williams:\s*([\d.]+)/, "Williams RBSDM", raws)
  const mayeNgs = take(air, /Intended Air Yards \(NGS\):\s*Maye:\s*([\d.]+)/, "Maye NGS", raws)
  const williamsNgs = take(air, /Intended Air Yards \(NGS\):\s*Maye:\s*[\d.]+\s*Williams:\s*([\d.]+)/, "Williams NGS", raws)

  const zone = post(posts, "2112559581662486678")
  const allenYpc = take(zone, /Braelon Allen is averaging ([\d.]+) YPC/, "Allen YPC", raws)
  const hallYpc = take(zone, /Breece Hall is averaging just ([\d.]+) YPC/, "Hall YPC", raws)

  const own = post(posts, "2112566454981693682")
  const teBias = take(own, /come in ([\d.]+)% higher/, "TE ownership", raws) / 100
  const dstBias = take(own, /DST \(\+([\d.]+)%\)/, "DST ownership", raws) / 100
  const kBias = take(own, /Kickers \(\+([\d.]+)%\)/, "K ownership", raws) / 100
  const qbMid = take(own, /Mid-tier QBs \(\+([\d.]+)%\)/, "mid QB ownership", raws) / 100
  const qbHigh = take(own, /high-end QBs \(-([\d.]+)%\)/, "high QB ownership", raws) / 100
  const close = (got: number, want: number) => Math.abs(got - want) < 1e-12
  if (!close(teBias, 0.038) || !close(dstBias, 0.025) || !close(kBias, 0.021) || !close(qbMid, 0.036) || !close(qbHigh, 0.016)) {
    throw new Error("ownership biases moved; the correction function is stale")
  }

  const seasons = post(posts, "2112590883770314806")
  const seasonEpaPerPlay = [...seasons.matchAll(/(\d{4}):\s+([A-Za-z .']+?)\s+\(([-\d.]+)\)/g)].map((m) => {
    raws.push(m[3] ?? "")
    return { year: Number(m[1]), qb: (m[2] ?? "").trim(), epa: numeric(m[3] ?? "") }
  })

  const usage = post(posts, "2112601489114108286")
  const kittle = take(usage, /had a ([\d.]+)% target share/, "Kittle share", raws) / 100
  const cooksBefore = take(usage, /jumped from ([\d.]+)%/, "Cooks before", raws) / 100
  const cooksAfter = take(usage, /to ([\d.]+)%/, "Cooks after", raws) / 100

  const attempts = post(posts, "2112635464746463412")
  const attemptsSinceInterception = [...attempts.matchAll(/\d+\.\s+([A-Za-z .']+?)\s+(\d+)/g)].map((m) => {
    raws.push(m[2] ?? "")
    return { name: (m[1] ?? "").trim(), attempts: Number(m[2]) }
  })

  const cle = post(posts, "2112645279011000635")
  const clePresnapPenaltiesPerGame = take(cle, /CLE averaging ([\d.]+) pre-snap/, "CLE penalties", raws)

  const tnf = post(posts, "2113474817475391765")
  const floorBoth = take(tnf, /at least \+([\d.]+) EPA/, "TNF floor", raws)
  const mayeGame = take(tnf, /Drake Maye: \+([\d.]+)/, "Maye game", raws)
  const williamsGame = take(tnf, /Caleb Williams: \+([\d.]+)/, "Williams game", raws)

  const santos = post(posts, "2113659549790163195")
  const santosMadeYards = take(santos, /try the (\d+)-yard field goal that sealed/, "Santos make", raws)
  const santosMissedYards = take(santos, /missed a (\d+)-yard field goal/, "Santos miss", raws)

  const worst = post(posts, "2113665560600817969")
  const worstEpaPerPlay = [...worst.matchAll(/\d+\.\s+([A-Za-z .']+?)\s+\(([A-Z]+)\)\s+-\s+([-\d.]+)/g)].map((m) => {
    raws.push(m[3] ?? "")
    return { name: (m[1] ?? "").trim(), team: m[2] ?? "", epa: numeric(m[3] ?? "") }
  })

  const chase = post(posts, "2113672517315617153")
  const chaseTargets = take(chase, /averages ([\d.]+) targets/, "Chase targets", raws)
  const chaseYards = take(chase, /([\d.]+) yards/, "Chase yards", raws)
  const chaseFpg = take(chase, /([\d.]+) FPG/, "Chase FPG", raws)
  const chaseSince = take(chase, /since (\d{4})/, "Chase since", raws)

  const blitz = post(posts, "2113699922398646589")
  const blitzRate = take(blitz, /lowest rate \(([\d.]+)%\)/, "blitz rate", raws) / 100
  const pressureRate = take(blitz, /top-5 rate \(([\d.]+)%\)/, "pressure rate", raws) / 100
  const whenBlitzed = take(blitz, /when blitzed \(([-\d.]+)\)/, "EPA blitzed", raws)
  const whenNot = take(blitz, /without a blitz \(([-\d.]+)\)/, "EPA unblitzed", raws)

  const boston = post(posts, "2113701629069349351")
  const titansZone = take(boston, /zone \(([\d.]+)%\)/, "Titans zone", raws) / 100
  const titansTwoHigh = take(boston, /two-high coverage \(([\d.]+)%\)/, "Titans two-high", raws) / 100
  const bostonYprr = {
    man: take(boston, /vs\. man:\s*([\d.]+)/, "Boston man", raws),
    zone: take(boston, /vs\. zone:\s*([\d.]+)/, "Boston zone", raws),
    singleHigh: take(boston, /vs\. single-high:\s*([\d.]+)/, "Boston single-high", raws),
    twoHigh: take(boston, /vs\. two-high:\s*([\d.]+)/, "Boston two-high", raws),
  }

  const injury = post(posts, "2113738867526475833")
  const vacated = take(injury, /That's ([\d.]+)% of the 49ers' targets/, "vacated targets", raws) / 100

  const rosterText = post(posts, "2113750105513923067")
  const rosterMatch = /signed (.+?) to the \d+-man roster and released ([^.]+)/.exec(rosterText)
  if (!rosterMatch?.[1] || !rosterMatch[2]) throw new Error("coach ledger could not read the Seattle roster move")

  const totals = post(posts, "2113750421692973568")
  const totalEpaLastTwoYears = [...totals.matchAll(/(?:^|\n)\s*(?:Last \/ )?(\d+)\.\s+([A-Za-z .'-]+?)\s+\(([-\d.]+)\)/g)].map((m) => {
    raws.push(m[3] ?? "")
    return { rank: Number(m[1]), name: (m[2] ?? "").trim(), epa: numeric(m[3] ?? "") }
  })

  const rowRe = /^([A-Za-z][A-Za-z .'’-]+?)\s{2,}([+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\*?[ \t]*$/gm
  const tables = []
  for (const item of posts) {
    const rows = [...item.text.matchAll(rowRe)]
    if (rows.length < 3) continue
    const label = item.text.split("\n").map((line) => line.trim()).find((line) => line.length > 0) ?? ""
    if (!label || /^\d/.test(label)) continue
    for (const row of rows) raws.push(row[2] ?? "")
    tables.push({
      postId: item.postId,
      label,
      rows: rows.map((row) => ({ name: (row[1] ?? "").trim(), value: numeric(row[2] ?? "") })),
    })
  }

  return {
    baselineIfCorpusIgnored: null,
    balCin: {
      dropbackEpa: blitzRate * whenBlitzed + (1 - blitzRate) * whenNot,
      formula: "blitzRate * epaBlitzed + (1 - blitzRate) * epaUnblitzed",
      pressureRate,
      chaseTargets,
      chaseYards,
      chaseFpg,
      chaseSince,
    },
    sf: {
      vacatedTargetShare: vacated,
      vacatedAllocated: false,
      cooksRouteShareBefore: cooksBefore,
      cooksRouteShareAfter: cooksAfter,
      cooksRouteShareDelta: cooksAfter - cooksBefore,
      kittleTargetShareAfterEvansExit: kittle,
    },
    zoneRun: { allenYpc, hallYpc, allenMinusHall: allenYpc - hallYpc },
    airYards: {
      mayeRbsdm,
      williamsRbsdm,
      rbsdmGap: mayeRbsdm - williamsRbsdm,
      mayeNgs,
      williamsNgs,
      ngsGap: mayeNgs - williamsNgs,
    },
    bostonYprr,
    titansRates: { zone: titansZone, twoHigh: titansTwoHigh },
    ownershipPercentagePoints: { TE: teBias, DST: dstBias, K: kBias, "QB-mid": qbMid, "QB-high": qbHigh },
    tnf: { maye: mayeGame, williams: williamsGame, floorBothOffenses: floorBoth, santosMadeYards, santosMissedYards },
    seasonEpaPerPlay,
    totalEpaLastTwoYears,
    worstEpaPerPlay,
    attemptsSinceInterception,
    roster: { signed: rosterMatch[1].trim(), released: rosterMatch[2].trim() },
    clePresnapPenaltiesPerGame,
    tables,
    sourceTokens: raws,
  }
}

export function markApplied(tokens: readonly NumberToken[], sourceTokens: readonly string[]): NumberToken[] {
  const used = new Set(sourceTokens.map((raw) => raw.replace(/^\+/, "").replace(/,/g, "").replace(/%$/, "")))
  return tokens.map((token) => {
    if (token.use === "not-a-rate") return token
    const key = token.raw.replace(/^\+/, "").replace(/,/g, "").replace(/%$/, "")
    if (used.has(key)) return { ...token, use: "applied" as const, reason: "input to a published coach figure" }
    return { ...token, use: "held" as const, reason: "on the coach ledger; the posts do not determine a further formula" }
  })
}
