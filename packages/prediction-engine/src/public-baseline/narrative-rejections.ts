/**
 * NE @ CHI narrative rejections. Game 401873010 is final, CHI 30 NE 24.
 * A missing fact is a named gap. A contradicting fact is a rejection.
 * Neither path signs a PLAY. Class A does not import a spread.
 */

export const NE_CHI_GAME_ID = "401873010"

export const NE_CHI_FINAL = {
  gameId: NE_CHI_GAME_ID,
  away: "NE",
  home: "CHI",
  awayScore: 24,
  homeScore: 30,
  total: 54,
  status: "final",
} as const

export type PublicFacts = {
  olCounts?: { CHI?: number; NE?: number } | null
  windMph?: number | null
  gonzalezStatus?: string | null
}

export type NarrativeClaim =
  | { id: "ol-4-vs-2"; chi: 4; ne: 2 }
  | { id: "wind-15"; claimedMph: 15 }
  | { id: "bears-spread"; line: -1.5 | -3 }
  | { id: "gonzalez-hip" }

export type NarrativeRejection = {
  gameId: typeof NE_CHI_GAME_ID
  claim: NarrativeClaim["id"]
  accepted: false
  playSigned: false
  reason: string
}

export function rejectNarrative(claim: NarrativeClaim, facts: PublicFacts): NarrativeRejection {
  // Annotated rather than inferred: an inferred object literal widens gameId to
  // `string`, which fails NarrativeRejection's literal type `typeof NE_CHI_GAME_ID`.
  const base: Omit<NarrativeRejection, "reason"> = {
    gameId: NE_CHI_GAME_ID,
    claim: claim.id,
    accepted: false,
    playSigned: false,
  }
  if (claim.id === "bears-spread") {
    return {
      ...base,
      reason: `class-a refuses a spread (claimed CHI ${claim.line}); final is not a ticket`,
    }
  }
  if (claim.id === "ol-4-vs-2") {
    const chi = facts.olCounts?.CHI
    const ne = facts.olCounts?.NE
    if (chi == null || ne == null) {
      return { ...base, reason: "named-gap: public OL personnel absent" }
    }
    if (chi !== claim.chi || ne !== claim.ne) {
      return { ...base, reason: `contradicted: public OL is CHI ${chi} NE ${ne}` }
    }
    return { ...base, reason: "fact present; still not a signed PLAY on a final" }
  }
  if (claim.id === "wind-15") {
    if (facts.windMph == null || !Number.isFinite(facts.windMph)) {
      return { ...base, reason: "named-gap: public wind absent" }
    }
    if (facts.windMph !== claim.claimedMph) {
      return { ...base, reason: `contradicted: public wind ${facts.windMph} mph, claim ${claim.claimedMph}` }
    }
    return { ...base, reason: "fact present; still not a signed PLAY on a final" }
  }
  if (facts.gonzalezStatus == null || facts.gonzalezStatus.trim() === "") {
    return { ...base, reason: "named-gap: Gonzalez injury detail absent" }
  }
  if (facts.gonzalezStatus.toLowerCase() !== "hip") {
    return { ...base, reason: `contradicted: public status is ${facts.gonzalezStatus}, not hip` }
  }
  return { ...base, reason: "fact present; still not a signed PLAY on a final" }
}
