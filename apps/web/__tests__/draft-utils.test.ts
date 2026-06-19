import { describe, it, expect } from 'vitest'
import {
  overallToPick,
  pickToOverall,
  pickPosition,
  pickTradeValue,
  pickTradeValueByRound,
  buildDraftBoard,
  recommendPickAtSlot,
  evaluateTrade,
  dynastyPickValue,
  positionalScarcity,
  gradeRosterConstruction,
  pickEquivalence,
  bestAvailableByRound,
  auctionValue,
  byeWeekConflicts,
  snakeDraftPicks,
  type DraftPick,
  type TradeAsset,
} from '@/lib/sports/draft-utils'

// ─── overallToPick ────────────────────────────────────────────────────────────

describe('overallToPick', () => {
  it('1st overall in a 12-team draft is round 1, pick 1', () => {
    const pick = overallToPick(1, 12)
    expect(pick.round).toBe(1)
    expect(pick.pickInRound).toBe(1)
    expect(pick.teamSize).toBe(12)
  })

  it('12th overall in a 12-team draft is round 1, pick 12', () => {
    const pick = overallToPick(12, 12)
    expect(pick.round).toBe(1)
    expect(pick.pickInRound).toBe(12)
  })

  it('13th overall in 12-team snake draft is round 2, pick 12 (reversed)', () => {
    const pick = overallToPick(13, 12)
    expect(pick.round).toBe(2)
    expect(pick.pickInRound).toBe(12)
  })

  it('14th overall in 12-team snake draft is round 2, pick 11', () => {
    const pick = overallToPick(14, 12)
    expect(pick.round).toBe(2)
    expect(pick.pickInRound).toBe(11)
  })

  it('24th overall in 12-team snake draft is round 2, pick 1', () => {
    const pick = overallToPick(24, 12)
    expect(pick.round).toBe(2)
    expect(pick.pickInRound).toBe(1)
  })

  it('25th overall in 12-team is round 3, pick 1 (odd round, forward)', () => {
    const pick = overallToPick(25, 12)
    expect(pick.round).toBe(3)
    expect(pick.pickInRound).toBe(1)
  })

  it('round boundary: 10-team league, 10th overall = round 1 pick 10', () => {
    const pick = overallToPick(10, 10)
    expect(pick.round).toBe(1)
    expect(pick.pickInRound).toBe(10)
  })

  it('round boundary: 10-team league, 11th overall = round 2 pick 10 (snake)', () => {
    const pick = overallToPick(11, 10)
    expect(pick.round).toBe(2)
    expect(pick.pickInRound).toBe(10)
  })

  it('overall field matches input', () => {
    expect(overallToPick(37, 12).overall).toBe(37)
  })

  it('8-team league: 9th overall = round 2 pick 8', () => {
    const pick = overallToPick(9, 8)
    expect(pick.round).toBe(2)
    expect(pick.pickInRound).toBe(8)
  })
})

// ─── pickToOverall ────────────────────────────────────────────────────────────

describe('pickToOverall', () => {
  it('round 1 pick 1 in 12-team = 1st overall', () => {
    expect(pickToOverall(1, 1, 12)).toBe(1)
  })

  it('round 1 pick 12 in 12-team = 12th overall', () => {
    expect(pickToOverall(1, 12, 12)).toBe(12)
  })

  it('round 2 pick 12 in 12-team snake = 13th overall (reversed)', () => {
    // In even rounds, pick 12 is the first pick of that round in snake terms
    // overall = (2-1)*12 + (12-12+1) = 12 + 1 = 13
    expect(pickToOverall(2, 12, 12)).toBe(13)
  })

  it('round 2 pick 1 in 12-team snake = 24th overall', () => {
    // overall = (2-1)*12 + (12-1+1) = 12 + 12 = 24
    expect(pickToOverall(2, 1, 12)).toBe(24)
  })

  it('round 3 pick 1 in 12-team = 25th overall', () => {
    expect(pickToOverall(3, 1, 12)).toBe(25)
  })

  it('10-team league round 1 pick 5 = 5th overall', () => {
    expect(pickToOverall(1, 5, 10)).toBe(5)
  })
})

// ─── pickPosition ─────────────────────────────────────────────────────────────

describe('pickPosition', () => {
  const makePick = (pickInRound: number, teamSize = 12): DraftPick => ({
    overall: pickInRound,
    round: 1,
    pickInRound,
    teamSize,
  })

  it('pick 1 of 12 is early', () => {
    expect(pickPosition(makePick(1))).toBe('early')
  })

  it('pick 4 of 12 is early (<=12/3=4)', () => {
    expect(pickPosition(makePick(4))).toBe('early')
  })

  it('pick 5 of 12 is mid', () => {
    expect(pickPosition(makePick(5))).toBe('mid')
  })

  it('pick 8 of 12 is mid', () => {
    expect(pickPosition(makePick(8))).toBe('mid')
  })

  it('pick 9 of 12 is late (>8)', () => {
    expect(pickPosition(makePick(9))).toBe('late')
  })

  it('pick 12 of 12 is late', () => {
    expect(pickPosition(makePick(12))).toBe('late')
  })

  it('pick 1 of 10 is early', () => {
    expect(pickPosition(makePick(1, 10))).toBe('early')
  })

  it('pick 10 of 10 is late', () => {
    expect(pickPosition(makePick(10, 10))).toBe('late')
  })
})

// ─── pickTradeValue ───────────────────────────────────────────────────────────

describe('pickTradeValue', () => {
  const pick = (overall: number, teamSize = 12): DraftPick => ({
    overall,
    round: 1,
    pickInRound: overall,
    teamSize,
  })

  it('1st overall ≈ 1000', () => {
    expect(pickTradeValue(pick(1))).toBe(1000)
  })

  it('5th overall ≈ 819 (formula: 1000 * exp(-0.05 * 4))', () => {
    const val = pickTradeValue(pick(5))
    expect(val).toBe(819)
  })

  it('12th overall ≈ 577 (formula: 1000 * exp(-0.05 * 11))', () => {
    const val = pickTradeValue(pick(12))
    expect(val).toBe(577)
  })

  it('24th overall ≈ 317 (formula: 1000 * exp(-0.05 * 23))', () => {
    const val = pickTradeValue(pick(24))
    expect(val).toBe(317)
  })

  it('value decreases with pick number', () => {
    const v1 = pickTradeValue(pick(1))
    const v10 = pickTradeValue(pick(10))
    const v20 = pickTradeValue(pick(20))
    expect(v1).toBeGreaterThan(v10)
    expect(v10).toBeGreaterThan(v20)
  })

  it('returns integer', () => {
    expect(pickTradeValue(pick(7))).toBe(Math.round(pickTradeValue(pick(7))))
  })

  it('very late pick has value >= 0', () => {
    expect(pickTradeValue(pick(200))).toBeGreaterThanOrEqual(0)
  })
})

// ─── pickTradeValueByRound ────────────────────────────────────────────────────

describe('pickTradeValueByRound', () => {
  it('round 1 early in 12-team > round 1 late', () => {
    const early = pickTradeValueByRound(1, 'early', 12)
    const late = pickTradeValueByRound(1, 'late', 12)
    expect(early).toBeGreaterThan(late)
  })

  it('round 2 early > round 2 mid', () => {
    expect(pickTradeValueByRound(2, 'early', 12)).toBeGreaterThan(
      pickTradeValueByRound(2, 'mid', 12),
    )
  })

  it('round 1 early in 12-team = 1000 (1st overall)', () => {
    expect(pickTradeValueByRound(1, 'early', 12)).toBe(1000)
  })

  it('round 1 late in 12-team = pickTradeValue of 12th overall', () => {
    const expected = Math.round(1000 * Math.exp(-0.05 * 11))
    expect(pickTradeValueByRound(1, 'late', 12)).toBe(expected)
  })
})

// ─── buildDraftBoard ──────────────────────────────────────────────────────────

describe('buildDraftBoard', () => {
  it('12-team 15-round board has 180 picks', () => {
    const board = buildDraftBoard(12, 15)
    expect(board.picks.length).toBe(180)
  })

  it('10-team 16-round board has 160 picks', () => {
    const board = buildDraftBoard(10, 16)
    expect(board.picks.length).toBe(160)
  })

  it('first pick has estimatedValue = 1000', () => {
    const board = buildDraftBoard(12, 10)
    expect(board.picks[0].estimatedValue).toBe(1000)
  })

  it('picks in even rounds have reversed pick order', () => {
    const board = buildDraftBoard(12, 2)
    // Round 2 is picks index 12-23 (overall 13-24)
    const round2 = board.picks.filter((p) => p.round === 2)
    expect(round2[0].pickInRound).toBe(12) // First pick of round 2 = teamSize
    expect(round2[round2.length - 1].pickInRound).toBe(1) // Last pick = 1
  })

  it('teamSize and rounds are stored correctly', () => {
    const board = buildDraftBoard(10, 20)
    expect(board.teamSize).toBe(10)
    expect(board.rounds).toBe(20)
  })

  it('each pick overall is unique', () => {
    const board = buildDraftBoard(12, 5)
    const overalls = board.picks.map((p) => p.overall)
    expect(new Set(overalls).size).toBe(overalls.length)
  })
})

// ─── evaluateTrade ────────────────────────────────────────────────────────────

describe('evaluateTrade', () => {
  const playerAsset = (value: number): TradeAsset => ({
    type: 'player',
    playerValue: value,
  })
  const pickAsset = (overall: number, teamSize = 12): TradeAsset => ({
    type: 'pick',
    pick: { overall, round: 1, pickInRound: overall, teamSize },
  })

  it('fair trade (within 5%) returns winner=fair', () => {
    const result = evaluateTrade([playerAsset(500)], [playerAsset(500)])
    expect(result.winner).toBe('fair')
    expect(result.recommendation).toBe('accept')
    expect(result.imbalancePercent).toBe(0)
  })

  it('large imbalance in A favor returns winner=teamA', () => {
    const result = evaluateTrade([playerAsset(900)], [playerAsset(500)])
    expect(result.winner).toBe('teamA')
    expect(result.teamAValue).toBe(900)
    expect(result.teamBValue).toBe(500)
  })

  it('large imbalance in B favor returns winner=teamB', () => {
    const result = evaluateTrade([playerAsset(200)], [playerAsset(800)])
    expect(result.winner).toBe('teamB')
  })

  it('imbalance >15% from A perspective → decline (A gets less)', () => {
    const result = evaluateTrade([playerAsset(200)], [playerAsset(900)])
    expect(result.recommendation).toBe('decline')
  })

  it('imbalance 5-15% → negotiate', () => {
    // 100 vs 90: imbalance = 10/100*100 = 10%
    const result = evaluateTrade([playerAsset(100)], [playerAsset(90)])
    expect(result.imbalancePercent).toBeCloseTo(10, 1)
    expect(result.recommendation).toBe('negotiate')
  })

  it('pick assets use pickTradeValue when no pickValue supplied', () => {
    const result = evaluateTrade([pickAsset(1)], [pickAsset(1)])
    expect(result.teamAValue).toBe(1000)
    expect(result.teamBValue).toBe(1000)
  })

  it('summary includes pts for both teams', () => {
    const result = evaluateTrade([playerAsset(750)], [playerAsset(600)])
    expect(result.summary).toContain('750')
    expect(result.summary).toContain('600')
  })

  it('zero-value trade is fair', () => {
    const result = evaluateTrade([], [])
    expect(result.winner).toBe('fair')
    expect(result.imbalancePercent).toBe(0)
  })
})

// ─── dynastyPickValue ─────────────────────────────────────────────────────────

describe('dynastyPickValue', () => {
  const pick1st: DraftPick = { overall: 1, round: 1, pickInRound: 1, teamSize: 12 }

  it('0 years away = full value', () => {
    expect(dynastyPickValue(pick1st, 0)).toBe(1000)
  })

  it('1 year away = 80% of value', () => {
    expect(dynastyPickValue(pick1st, 1)).toBe(800)
  })

  it('2 years away = 64% of value', () => {
    expect(dynastyPickValue(pick1st, 2)).toBe(640)
  })

  it('3 years away = 51.2% rounded', () => {
    expect(dynastyPickValue(pick1st, 3)).toBe(Math.round(1000 * 0.512))
  })

  it('returns integer', () => {
    const val = dynastyPickValue(pick1st, 2)
    expect(Number.isInteger(val)).toBe(true)
  })

  it('discounts compound correctly over 5 years', () => {
    const expected = Math.round(1000 * Math.pow(0.8, 5))
    expect(dynastyPickValue(pick1st, 5)).toBe(expected)
  })
})

// ─── positionalScarcity ───────────────────────────────────────────────────────

describe('positionalScarcity', () => {
  const adpData = [
    { position: 'RB', adp: 2 },
    { position: 'RB', adp: 5 },
    { position: 'RB', adp: 8 },
    { position: 'WR', adp: 15 },
    { position: 'WR', adp: 20 },
    { position: 'WR', adp: 30 },
    { position: 'QB', adp: 50 },
    { position: 'QB', adp: 55 },
    { position: 'TE', adp: 40 },
    { position: 'TE', adp: 45 },
  ]

  it('returns one entry per position', () => {
    const result = positionalScarcity(adpData)
    const positions = result.map((r) => r.position)
    expect(new Set(positions).size).toBe(positions.length)
  })

  it('sorted by scarcityScore descending', () => {
    const result = positionalScarcity(adpData)
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].scarcityScore).toBeGreaterThanOrEqual(result[i].scarcityScore)
    }
  })

  it('RB has higher scarcityScore than QB (lower average ADP)', () => {
    const result = positionalScarcity(adpData)
    const rb = result.find((r) => r.position === 'RB')
    const qb = result.find((r) => r.position === 'QB')
    expect(rb!.scarcityScore).toBeGreaterThan(qb!.scarcityScore)
  })

  it('uses topN to limit to top N players per position', () => {
    const result = positionalScarcity(adpData, 2)
    const rb = result.find((r) => r.position === 'RB')
    // averageADP = (2+5)/2 = 3.5
    expect(rb!.averageADP).toBeCloseTo(3.5, 1)
  })

  it('scarcityScore = 100 for position with ADP=1', () => {
    const data = [{ position: 'QB', adp: 1 }]
    const result = positionalScarcity(data, 1)
    expect(result[0].scarcityScore).toBe(100)
  })

  it('scarcityScore is clamped at 0', () => {
    const data = [{ position: 'K', adp: 200 }]
    const result = positionalScarcity(data, 1)
    expect(result[0].scarcityScore).toBeGreaterThanOrEqual(0)
  })
})

// ─── gradeRosterConstruction ──────────────────────────────────────────────────

describe('gradeRosterConstruction', () => {
  const mkPick = (overall: number, round: number): DraftPick => ({
    overall,
    round,
    pickInRound: 1,
    teamSize: 12,
  })

  it('early QB pick penalizes score', () => {
    const picks = [mkPick(1, 1)]
    const { score, notes } = gradeRosterConstruction(picks, ['QB'])
    expect(score).toBe(30) // 50 - 20
    expect(notes.some((n) => n.includes('QB'))).toBe(true)
  })

  it('RB in early round rewards score', () => {
    const picks = [mkPick(1, 1)]
    const { score, notes } = gradeRosterConstruction(picks, ['RB'])
    expect(score).toBe(60) // 50 + 10
    expect(notes.some((n) => n.includes('RB'))).toBe(true)
  })

  it('2 RBs in early rounds give max RB bonus (+20)', () => {
    const picks = [mkPick(1, 1), mkPick(2, 1)]
    const { score } = gradeRosterConstruction(picks, ['RB', 'RB'])
    expect(score).toBe(70) // 50 + 20
  })

  it('3rd RB in early rounds does not increase score beyond +20', () => {
    const picks = [mkPick(1, 1), mkPick(2, 1), mkPick(3, 1)]
    const { score } = gradeRosterConstruction(picks, ['RB', 'RB', 'RB'])
    expect(score).toBe(70)
  })

  it('WR in rounds 1-6 rewards score', () => {
    const picks = [mkPick(10, 1)]
    const { score } = gradeRosterConstruction(picks, ['WR'])
    expect(score).toBe(60)
  })

  it('TE in round 1-5 adds 15 points', () => {
    const picks = [mkPick(5, 1)]
    const { score } = gradeRosterConstruction(picks, ['TE'])
    expect(score).toBe(65)
  })

  it('K in round 5 penalizes by -15', () => {
    const picks = [mkPick(50, 5)]
    const { score } = gradeRosterConstruction(picks, ['K'])
    expect(score).toBe(35)
  })

  it('DST in round 3 penalizes by -15', () => {
    const picks = [mkPick(30, 3)]
    const { score } = gradeRosterConstruction(picks, ['DST'])
    expect(score).toBe(35)
  })

  it('A grade for score >= 80', () => {
    const picks = [mkPick(1, 1), mkPick(13, 2), mkPick(25, 3), mkPick(37, 4)]
    const positions = ['RB', 'RB', 'WR', 'WR']
    const { grade } = gradeRosterConstruction(picks, positions)
    expect(['A', 'B']).toContain(grade)
  })

  it('F grade for very poor draft', () => {
    const picks = [mkPick(1, 1), mkPick(13, 2), mkPick(25, 3)]
    const positions = ['QB', 'K', 'DST']
    const { grade, score } = gradeRosterConstruction(picks, positions)
    expect(score).toBe(0) // 50 - 20 - 15 - 15 = 0
    expect(grade).toBe('F')
  })
})

// ─── pickEquivalence ──────────────────────────────────────────────────────────

describe('pickEquivalence', () => {
  it('1st overall in 12-team maps to 1st overall in 10-team (same top value)', () => {
    const pick12: DraftPick = { overall: 1, round: 1, pickInRound: 1, teamSize: 12 }
    const equiv = pickEquivalence(pick12, 10)
    expect(equiv.overall).toBe(1)
    expect(equiv.teamSize).toBe(10)
  })

  it('returns a DraftPick with targetTeamSize', () => {
    const pick: DraftPick = { overall: 24, round: 2, pickInRound: 1, teamSize: 12 }
    const equiv = pickEquivalence(pick, 8)
    expect(equiv.teamSize).toBe(8)
  })

  it('equivalent pick has close trade value', () => {
    const pick: DraftPick = { overall: 12, round: 1, pickInRound: 12, teamSize: 12 }
    const targetValue = pickTradeValue(pick)
    const equiv = pickEquivalence(pick, 10)
    const equivValue = pickTradeValue(equiv)
    expect(Math.abs(equivValue - targetValue)).toBeLessThan(50)
  })

  it('same team size returns same overall', () => {
    const pick: DraftPick = { overall: 5, round: 1, pickInRound: 5, teamSize: 12 }
    const equiv = pickEquivalence(pick, 12)
    expect(equiv.overall).toBe(5)
  })
})

// ─── bestAvailableByRound ─────────────────────────────────────────────────────

describe('bestAvailableByRound', () => {
  const players = [
    { id: 'p1', adp: 1, value: 100, position: 'RB' },
    { id: 'p2', adp: 5, value: 80, position: 'WR' },
    { id: 'p3', adp: 13, value: 90, position: 'RB' },
    { id: 'p4', adp: 15, value: 70, position: 'WR' },
    { id: 'p5', adp: 24, value: 60, position: 'QB' },
  ]

  it('round 1 in 12-team returns players with ADP 1-12', () => {
    const result = bestAvailableByRound(players, 1, 12, [])
    expect(result.map((p) => p.id)).toContain('p1')
    expect(result.map((p) => p.id)).toContain('p2')
    expect(result.map((p) => p.id)).not.toContain('p3')
  })

  it('result sorted by value descending', () => {
    const result = bestAvailableByRound(players, 1, 12, [])
    expect(result[0].value).toBeGreaterThanOrEqual(result[result.length - 1].value)
  })

  it('excludes already drafted players', () => {
    const result = bestAvailableByRound(players, 1, 12, ['p1'])
    expect(result.map((p) => p.id)).not.toContain('p1')
  })

  it('round 2 returns players with ADP 13-24', () => {
    const result = bestAvailableByRound(players, 2, 12, [])
    expect(result.map((p) => p.id)).toContain('p3')
    expect(result.map((p) => p.id)).not.toContain('p1')
  })

  it('empty array if no players in round range', () => {
    const result = bestAvailableByRound(players, 5, 12, [])
    expect(result).toHaveLength(0)
  })
})

// ─── auctionValue ─────────────────────────────────────────────────────────────

describe('auctionValue', () => {
  it('ADP 1 has higher value than ADP 10', () => {
    expect(auctionValue(1)).toBeGreaterThan(auctionValue(10))
  })

  it('ADP 10 has higher value than ADP 15', () => {
    expect(auctionValue(10)).toBeGreaterThan(auctionValue(15))
  })

  it('value is at least $1', () => {
    expect(auctionValue(200)).toBeGreaterThanOrEqual(1)
  })

  it('value does not exceed 50% of totalBudget (default 200 → max 100)', () => {
    expect(auctionValue(1)).toBeLessThanOrEqual(100)
  })

  it('custom budget of 300 clamps at 150', () => {
    expect(auctionValue(1, 300, 15)).toBeLessThanOrEqual(150)
  })

  it('returns integer (rounded)', () => {
    const val = auctionValue(5)
    expect(Number.isInteger(val)).toBe(true)
  })

  it('ADP exceeding numPlayers clamps to $1', () => {
    expect(auctionValue(100, 200, 15)).toBeGreaterThanOrEqual(1)
  })
})

// ─── byeWeekConflicts ─────────────────────────────────────────────────────────

describe('byeWeekConflicts', () => {
  it('finds weeks with 2+ starter bye conflicts', () => {
    const roster = [
      { playerId: 'qb1', position: 'QB', byeWeek: 9 },
      { playerId: 'rb1', position: 'RB', byeWeek: 9 },
      { playerId: 'rb2', position: 'RB', byeWeek: 11 },
      { playerId: 'wr1', position: 'WR', byeWeek: 7 },
      { playerId: 'wr2', position: 'WR', byeWeek: 11 },
      { playerId: 'te1', position: 'TE', byeWeek: 7 },
    ]
    const conflicts = byeWeekConflicts(roster)
    const week9 = conflicts.find((c) => c.week === 9)
    expect(week9).toBeDefined()
    expect(week9!.conflicts).toBe(2)
  })

  it('returns empty if no week has 2+ conflicts', () => {
    const roster = [
      { playerId: 'qb1', position: 'QB', byeWeek: 9 },
      { playerId: 'rb1', position: 'RB', byeWeek: 10 },
      { playerId: 'rb2', position: 'RB', byeWeek: 11 },
      { playerId: 'wr1', position: 'WR', byeWeek: 12 },
      { playerId: 'wr2', position: 'WR', byeWeek: 6 },
      { playerId: 'te1', position: 'TE', byeWeek: 7 },
    ]
    const conflicts = byeWeekConflicts(roster)
    expect(conflicts).toHaveLength(0)
  })

  it('sorted by conflicts descending', () => {
    const roster = [
      { playerId: 'qb1', position: 'QB', byeWeek: 9 },
      { playerId: 'rb1', position: 'RB', byeWeek: 9 },
      { playerId: 'rb2', position: 'RB', byeWeek: 11 },
      { playerId: 'wr1', position: 'WR', byeWeek: 11 },
      { playerId: 'wr2', position: 'WR', byeWeek: 11 },
      { playerId: 'te1', position: 'TE', byeWeek: 7 },
    ]
    const conflicts = byeWeekConflicts(roster)
    for (let i = 1; i < conflicts.length; i++) {
      expect(conflicts[i - 1].conflicts).toBeGreaterThanOrEqual(conflicts[i].conflicts)
    }
  })

  it('only counts starter positions (not extra RBs beyond 2)', () => {
    const roster = [
      { playerId: 'rb1', position: 'RB', byeWeek: 9 },
      { playerId: 'rb2', position: 'RB', byeWeek: 9 },
      { playerId: 'rb3', position: 'RB', byeWeek: 9 }, // bench RB, not counted
      { playerId: 'qb1', position: 'QB', byeWeek: 11 },
    ]
    const conflicts = byeWeekConflicts(roster)
    const week9 = conflicts.find((c) => c.week === 9)
    expect(week9!.conflicts).toBe(2) // only 2 RBs count as starters
  })

  it('includes positions in conflict entry', () => {
    const roster = [
      { playerId: 'qb1', position: 'QB', byeWeek: 10 },
      { playerId: 'rb1', position: 'RB', byeWeek: 10 },
    ]
    const conflicts = byeWeekConflicts(roster)
    const week10 = conflicts.find((c) => c.week === 10)
    expect(week10!.positions).toContain('QB')
    expect(week10!.positions).toContain('RB')
  })
})

// ─── snakeDraftPicks ──────────────────────────────────────────────────────────

describe('snakeDraftPicks', () => {
  it('team 1 in 12-team snake: picks 1, 24, 25, 48, ...', () => {
    const picks = snakeDraftPicks(1, 12, 4)
    expect(picks[0]).toBe(1)   // round 1 odd: slot 1
    expect(picks[1]).toBe(24)  // round 2 even: 12 + (12-1+1) = 24
    expect(picks[2]).toBe(25)  // round 3 odd: 24 + 1 = 25
    expect(picks[3]).toBe(48)  // round 4 even: 36 + 12 = 48
  })

  it('team 12 (last) in 12-team snake: picks 12, 13, ...', () => {
    const picks = snakeDraftPicks(12, 12, 2)
    expect(picks[0]).toBe(12)  // round 1 odd: slot 12
    expect(picks[1]).toBe(13)  // round 2 even: 12 + (12-12+1) = 13
  })

  it('returns correct number of picks (one per round)', () => {
    const picks = snakeDraftPicks(3, 10, 15)
    expect(picks).toHaveLength(15)
  })

  it('team 1 round 1 is always pick 1 in odd-first snake', () => {
    expect(snakeDraftPicks(1, 12, 1)[0]).toBe(1)
    expect(snakeDraftPicks(1, 10, 1)[0]).toBe(1)
    expect(snakeDraftPicks(1, 8, 1)[0]).toBe(1)
  })

  it('last team in round 1 = teamSize', () => {
    expect(snakeDraftPicks(12, 12, 1)[0]).toBe(12)
    expect(snakeDraftPicks(10, 10, 1)[0]).toBe(10)
  })

  it('team 6 in 12-team is 6th in round 1, 19th in round 2', () => {
    const picks = snakeDraftPicks(6, 12, 2)
    expect(picks[0]).toBe(6)
    // round 2 even: 12 + (12-6+1) = 12 + 7 = 19
    expect(picks[1]).toBe(19)
  })
})

// ─── recommendPickAtSlot ──────────────────────────────────────────────────────

describe('recommendPickAtSlot', () => {
  const players = [
    { id: 'p1', position: 'RB', adp: 5, value: 100 },
    { id: 'p2', position: 'WR', adp: 6, value: 90 },
    { id: 'p3', position: 'QB', adp: 50, value: 85 },
  ]
  const pick5: DraftPick = { overall: 5, round: 1, pickInRound: 5, teamSize: 12 }

  it('returns highest value player within ADP range', () => {
    const rec = recommendPickAtSlot(players, pick5, [])
    expect(rec?.playerId).toBe('p1')
    expect(rec?.reason).toBe('Best available at ADP')
  })

  it('skips drafted players', () => {
    const rec = recommendPickAtSlot(players, pick5, ['p1'])
    expect(rec?.playerId).toBe('p2')
  })

  it('falls back to best overall if none in ADP range', () => {
    const pick100: DraftPick = { overall: 100, round: 9, pickInRound: 4, teamSize: 12 }
    const rec = recommendPickAtSlot(players, pick100, [])
    expect(rec?.reason).toBe('Best overall available')
    expect(rec?.playerId).toBe('p1') // highest value overall
  })

  it('returns null if all players drafted', () => {
    const rec = recommendPickAtSlot(players, pick5, ['p1', 'p2', 'p3'])
    expect(rec).toBeNull()
  })
})
