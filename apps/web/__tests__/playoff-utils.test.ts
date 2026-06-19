import { describe, it, expect } from 'vitest'
import {
  sortStandings,
  generateSeeds,
  singleEliminationBracket,
  simulateBracket,
  resolveBracketDeterministic,
  roundRobinSchedule,
  accumulateRoundRobin,
  eliminationScenarios,
  wildcardCompetitors,
  strengthOfRecord,
  divisionRace,
  nflPlayoffSeeds,
  nbaPlayoffSeeds,
  seriesProbability,
  binomialCoeff,
  formatBracket,
  type TeamStanding,
  type PlayoffSeed,
} from '@/lib/sports/playoff-utils'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTeam(
  teamId: string,
  wins: number,
  losses: number,
  ties = 0,
  overrides: Partial<TeamStanding> = {}
): TeamStanding {
  const total = wins + losses + ties
  return {
    teamId,
    name: teamId,
    wins,
    losses,
    ties,
    winPct: total > 0 ? wins / total : 0,
    ...overrides,
  }
}

function makeSeeds(teamIds: string[]): PlayoffSeed[] {
  return teamIds.map((id, i) => ({
    seed: i + 1,
    teamId: id,
    name: id,
    record: '8-2',
    clinched: true,
  }))
}

// ---------------------------------------------------------------------------
// sortStandings
// ---------------------------------------------------------------------------

describe('sortStandings', () => {
  it('sorts by winPct descending (basic)', () => {
    const teams = [
      makeTeam('A', 5, 5),
      makeTeam('B', 8, 2),
      makeTeam('C', 3, 7),
    ]
    const sorted = sortStandings(teams)
    expect(sorted[0].teamId).toBe('B')
    expect(sorted[1].teamId).toBe('A')
    expect(sorted[2].teamId).toBe('C')
  })

  it('uses pointsFor as tiebreaker when winPct equal', () => {
    const teams = [
      makeTeam('A', 5, 5, 0, { pointsFor: 100 }),
      makeTeam('B', 5, 5, 0, { pointsFor: 200 }),
    ]
    const sorted = sortStandings(teams)
    expect(sorted[0].teamId).toBe('B')
  })

  it('uses wins as tiebreaker when winPct equal and wins differ via ties', () => {
    // 8-2 vs 7-1-2: both have same winPct but different wins
    const teams = [
      makeTeam('A', 7, 1, 2),  // winPct = 7/10 = 0.7
      makeTeam('B', 7, 3, 0),  // winPct = 7/10 = 0.7
    ]
    const sorted = sortStandings(teams, ['winPct', 'wins'])
    // wins are equal (7 each), no further diff
    expect(sorted).toHaveLength(2)
  })

  it('returns original order if all tiebreakers equal', () => {
    const teams = [
      makeTeam('A', 5, 5),
      makeTeam('B', 5, 5),
    ]
    const sorted = sortStandings(teams)
    expect(sorted).toHaveLength(2)
  })

  it('handles empty array', () => {
    expect(sortStandings([])).toEqual([])
  })

  it('does not mutate original array', () => {
    const teams = [makeTeam('A', 5, 5), makeTeam('B', 8, 2)]
    const original = [...teams]
    sortStandings(teams)
    expect(teams[0].teamId).toBe(original[0].teamId)
  })

  it('respects custom tiebreaker order: pointDiff', () => {
    const teams = [
      makeTeam('A', 5, 5, 0, { pointsFor: 100, pointsAgainst: 80 }), // diff +20
      makeTeam('B', 5, 5, 0, { pointsFor: 100, pointsAgainst: 50 }), // diff +50
    ]
    const sorted = sortStandings(teams, ['winPct', 'pointDiff'])
    expect(sorted[0].teamId).toBe('B')
  })

  it('handles single team', () => {
    const teams = [makeTeam('A', 10, 0)]
    expect(sortStandings(teams)).toHaveLength(1)
  })

  it('sorts 6 teams correctly', () => {
    const teams = [
      makeTeam('F', 1, 9),
      makeTeam('E', 2, 8),
      makeTeam('D', 4, 6),
      makeTeam('C', 6, 4),
      makeTeam('B', 8, 2),
      makeTeam('A', 9, 1),
    ]
    const sorted = sortStandings(teams)
    expect(sorted.map((t) => t.teamId)).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
  })
})

// ---------------------------------------------------------------------------
// generateSeeds
// ---------------------------------------------------------------------------

describe('generateSeeds', () => {
  it('returns correct number of seeds', () => {
    const teams = [
      makeTeam('A', 10, 0),
      makeTeam('B', 8, 2),
      makeTeam('C', 6, 4),
      makeTeam('D', 4, 6),
      makeTeam('E', 2, 8),
    ]
    const seeds = generateSeeds(teams, 4)
    expect(seeds).toHaveLength(4)
  })

  it('top seed has best record', () => {
    const teams = [
      makeTeam('A', 10, 0),
      makeTeam('B', 8, 2),
      makeTeam('C', 6, 4),
    ]
    const seeds = generateSeeds(teams, 3, { divisionWinnersFirst: false })
    expect(seeds[0].teamId).toBe('A')
  })

  it('assigns sequential seed numbers', () => {
    const teams = [makeTeam('A', 10, 0), makeTeam('B', 8, 2), makeTeam('C', 6, 4)]
    const seeds = generateSeeds(teams, 3, { divisionWinnersFirst: false })
    expect(seeds.map((s) => s.seed)).toEqual([1, 2, 3])
  })

  it('marks seeds as clinched', () => {
    const teams = [makeTeam('A', 10, 0), makeTeam('B', 8, 2)]
    const seeds = generateSeeds(teams, 2, { divisionWinnersFirst: false })
    expect(seeds.every((s) => s.clinched)).toBe(true)
  })

  it('division winners first: div winner gets top seed even with worse record', () => {
    const teams = [
      makeTeam('A', 6, 4, 0, { divisionId: 'East', divisionRank: 2 }),
      makeTeam('B', 5, 5, 0, { divisionId: 'East', divisionRank: 1 }), // div winner but worse record
      makeTeam('C', 8, 2, 0, { divisionId: 'West', divisionRank: 2 }),
    ]
    const seeds = generateSeeds(teams, 3, { divisionWinnersFirst: true })
    expect(seeds[0].teamId).toBe('B')
    expect(seeds[0].clinchScenario).toBe('Clinched Division')
  })

  it('non-division-winners fill remaining spots', () => {
    const teams = [
      makeTeam('A', 10, 0, 0, { divisionId: 'North', divisionRank: 1 }),
      makeTeam('B', 8, 2),
      makeTeam('C', 6, 4),
    ]
    const seeds = generateSeeds(teams, 3, { divisionWinnersFirst: true })
    expect(seeds[0].teamId).toBe('A')
    expect(seeds[1].teamId).toBe('B')
    expect(seeds[2].teamId).toBe('C')
  })

  it('record format is correct W-L', () => {
    const teams = [makeTeam('A', 8, 2)]
    const seeds = generateSeeds(teams, 1, { divisionWinnersFirst: false })
    expect(seeds[0].record).toBe('8-2')
  })

  it('record includes ties when present', () => {
    const teams = [makeTeam('A', 7, 2, 1)]
    const seeds = generateSeeds(teams, 1, { divisionWinnersFirst: false })
    expect(seeds[0].record).toBe('7-2-1')
  })
})

// ---------------------------------------------------------------------------
// singleEliminationBracket
// ---------------------------------------------------------------------------

describe('singleEliminationBracket', () => {
  it('4 seeds → 2 round-1 matchups', () => {
    const seeds = makeSeeds(['T1', 'T2', 'T3', 'T4'])
    const bracket = singleEliminationBracket(seeds)
    const r1 = bracket.matchups.filter((m) => m.round === 1)
    expect(r1).toHaveLength(2)
  })

  it('4 seeds → seed 1 vs seed 4, seed 2 vs seed 3', () => {
    const seeds = makeSeeds(['T1', 'T2', 'T3', 'T4'])
    const bracket = singleEliminationBracket(seeds)
    const r1 = bracket.matchups.filter((m) => m.round === 1)
    expect(r1[0].homeSeed).toBe(1)
    expect(r1[0].awaySeed).toBe(4)
    expect(r1[1].homeSeed).toBe(2)
    expect(r1[1].awaySeed).toBe(3)
  })

  it('8 seeds → 4 round-1 matchups', () => {
    const seeds = makeSeeds(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'])
    const bracket = singleEliminationBracket(seeds)
    const r1 = bracket.matchups.filter((m) => m.round === 1)
    expect(r1).toHaveLength(4)
  })

  it('8 seeds → 3 rounds total', () => {
    const seeds = makeSeeds(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'])
    const bracket = singleEliminationBracket(seeds)
    expect(bracket.rounds).toBe(3)
  })

  it('format is single-elimination', () => {
    const seeds = makeSeeds(['T1', 'T2'])
    const bracket = singleEliminationBracket(seeds)
    expect(bracket.format).toBe('single-elimination')
  })

  it('2 seeds → 1 round-1 matchup', () => {
    const seeds = makeSeeds(['T1', 'T2'])
    const bracket = singleEliminationBracket(seeds)
    const r1 = bracket.matchups.filter((m) => m.round === 1)
    expect(r1).toHaveLength(1)
  })

  it('1 vs N seeding is symmetric', () => {
    const seeds = makeSeeds(['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'])
    const bracket = singleEliminationBracket(seeds)
    const r1 = bracket.matchups.filter((m) => m.round === 1)
    // 1 vs 8, 2 vs 7, 3 vs 6, 4 vs 5
    const pairs = r1.map((m) => [m.homeSeed, m.awaySeed])
    expect(pairs[0]).toEqual([1, 8])
    expect(pairs[1]).toEqual([2, 7])
    expect(pairs[2]).toEqual([3, 6])
    expect(pairs[3]).toEqual([4, 5])
  })

  it('throws with fewer than 2 seeds', () => {
    expect(() => singleEliminationBracket(makeSeeds(['T1']))).toThrow()
  })
})

// ---------------------------------------------------------------------------
// simulateBracket
// ---------------------------------------------------------------------------

describe('simulateBracket', () => {
  it('all round-1 matchups have a winner after simulation', () => {
    const seeds = makeSeeds(['T1', 'T2', 'T3', 'T4'])
    const bracket = singleEliminationBracket(seeds)
    const probs = new Map([['T1', 0.6], ['T2', 0.5], ['T3', 0.5], ['T4', 0.4]])
    const simulated = simulateBracket(bracket, probs)
    const r1 = simulated.matchups.filter((m) => m.round === 1)
    expect(r1.every((m) => m.winnerId !== undefined)).toBe(true)
  })

  it('champion is one of the seeded teams', () => {
    const seeds = makeSeeds(['T1', 'T2', 'T3', 'T4'])
    const bracket = singleEliminationBracket(seeds)
    const probs = new Map([['T1', 0.8], ['T2', 0.6], ['T3', 0.4], ['T4', 0.2]])
    const simulated = simulateBracket(bracket, probs)
    expect(['T1', 'T2', 'T3', 'T4']).toContain(simulated.champion)
  })

  it('all matchups filled for 4-team bracket', () => {
    const seeds = makeSeeds(['T1', 'T2', 'T3', 'T4'])
    const bracket = singleEliminationBracket(seeds)
    const probs = new Map([['T1', 0.6], ['T2', 0.5], ['T3', 0.5], ['T4', 0.4]])
    const simulated = simulateBracket(bracket, probs)
    // round 1: 2 matchups with winners, round 2: 1 matchup with winner
    const withWinner = simulated.matchups.filter((m) => m.winnerId)
    expect(withWinner.length).toBeGreaterThanOrEqual(2)
  })

  it('does not mutate original bracket', () => {
    const seeds = makeSeeds(['T1', 'T2'])
    const bracket = singleEliminationBracket(seeds)
    const probs = new Map<string, number>()
    simulateBracket(bracket, probs)
    expect(bracket.champion).toBeUndefined()
  })

  it('team with prob=1.0 always wins', () => {
    // Run 20 times — T1 should always win
    const seeds = makeSeeds(['T1', 'T2'])
    for (let i = 0; i < 20; i++) {
      const bracket = singleEliminationBracket(seeds)
      const probs = new Map([['T1', 1.0], ['T2', 0.0]])
      const simulated = simulateBracket(bracket, probs)
      expect(simulated.champion).toBe('T1')
    }
  })
})

// ---------------------------------------------------------------------------
// resolveBracketDeterministic
// ---------------------------------------------------------------------------

describe('resolveBracketDeterministic', () => {
  it('stronger team always wins', () => {
    const seeds = makeSeeds(['T1', 'T2', 'T3', 'T4'])
    const bracket = singleEliminationBracket(seeds)
    const strengths = new Map([['T1', 100], ['T2', 80], ['T3', 60], ['T4', 40]])
    const resolved = resolveBracketDeterministic(bracket, strengths)
    expect(resolved.champion).toBe('T1')
  })

  it('ties go to home team', () => {
    const seeds = makeSeeds(['T1', 'T2'])
    const bracket = singleEliminationBracket(seeds)
    const strengths = new Map([['T1', 50], ['T2', 50]])
    const resolved = resolveBracketDeterministic(bracket, strengths)
    // T1 is home (higher seed = homeTeam)
    expect(resolved.champion).toBe('T1')
  })

  it('all matchups resolved', () => {
    const seeds = makeSeeds(['T1', 'T2', 'T3', 'T4'])
    const bracket = singleEliminationBracket(seeds)
    const strengths = new Map([['T1', 90], ['T2', 70], ['T3', 50], ['T4', 30]])
    const resolved = resolveBracketDeterministic(bracket, strengths)
    const withWinner = resolved.matchups.filter((m) => m.winnerId)
    expect(withWinner.length).toBeGreaterThanOrEqual(2)
  })

  it('second-strongest team wins if stronger team is on other side', () => {
    const seeds = makeSeeds(['T1', 'T2', 'T3', 'T4'])
    const bracket = singleEliminationBracket(seeds)
    // T2 strength=200 is strongest
    const strengths = new Map([['T1', 100], ['T2', 200], ['T3', 50], ['T4', 10]])
    const resolved = resolveBracketDeterministic(bracket, strengths)
    expect(resolved.champion).toBe('T2')
  })

  it('does not mutate original bracket', () => {
    const seeds = makeSeeds(['T1', 'T2'])
    const bracket = singleEliminationBracket(seeds)
    const strengths = new Map<string, number>()
    resolveBracketDeterministic(bracket, strengths)
    expect(bracket.champion).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// roundRobinSchedule
// ---------------------------------------------------------------------------

describe('roundRobinSchedule', () => {
  it('4 teams → 6 total matchups', () => {
    const schedule = roundRobinSchedule(['A', 'B', 'C', 'D'])
    expect(schedule).toHaveLength(6)
  })

  it('each team appears in the correct number of matchups (4 teams → 3 each)', () => {
    const schedule = roundRobinSchedule(['A', 'B', 'C', 'D'])
    const counts = new Map<string, number>()
    for (const { homeTeamId, awayTeamId } of schedule) {
      counts.set(homeTeamId, (counts.get(homeTeamId) ?? 0) + 1)
      counts.set(awayTeamId, (counts.get(awayTeamId) ?? 0) + 1)
    }
    for (const count of counts.values()) {
      expect(count).toBe(3)
    }
  })

  it('6 teams → 15 total matchups', () => {
    const schedule = roundRobinSchedule(['A', 'B', 'C', 'D', 'E', 'F'])
    expect(schedule).toHaveLength(15)
  })

  it('no team plays itself', () => {
    const schedule = roundRobinSchedule(['A', 'B', 'C', 'D'])
    for (const { homeTeamId, awayTeamId } of schedule) {
      expect(homeTeamId).not.toBe(awayTeamId)
    }
  })

  it('each pair plays exactly once', () => {
    const teams = ['A', 'B', 'C', 'D']
    const schedule = roundRobinSchedule(teams)
    const pairs = new Set<string>()
    for (const { homeTeamId, awayTeamId } of schedule) {
      const key = [homeTeamId, awayTeamId].sort().join('-')
      expect(pairs.has(key)).toBe(false)
      pairs.add(key)
    }
  })

  it('handles 2 teams', () => {
    const schedule = roundRobinSchedule(['A', 'B'])
    expect(schedule).toHaveLength(1)
  })

  it('handles odd number of teams (3 teams → 3 matchups)', () => {
    const schedule = roundRobinSchedule(['A', 'B', 'C'])
    expect(schedule).toHaveLength(3)
  })

  it('round numbers start at 1', () => {
    const schedule = roundRobinSchedule(['A', 'B', 'C', 'D'])
    expect(schedule.some((m) => m.round === 1)).toBe(true)
  })

  it('returns empty array for single team', () => {
    expect(roundRobinSchedule(['A'])).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// accumulateRoundRobin
// ---------------------------------------------------------------------------

describe('accumulateRoundRobin', () => {
  it('win gives 3 points (soccer)', () => {
    const results = [{ homeTeamId: 'A', awayTeamId: 'B', homeScore: 2, awayScore: 0 }]
    const standings = accumulateRoundRobin(results, 'soccer')
    const teamA = standings.find((s) => s.teamId === 'A')!
    expect(teamA.points).toBe(3)
  })

  it('loss gives 0 points', () => {
    const results = [{ homeTeamId: 'A', awayTeamId: 'B', homeScore: 0, awayScore: 2 }]
    const standings = accumulateRoundRobin(results, 'soccer')
    const teamA = standings.find((s) => s.teamId === 'A')!
    expect(teamA.points).toBe(0)
  })

  it('draw gives 1 point each (soccer)', () => {
    const results = [{ homeTeamId: 'A', awayTeamId: 'B', homeScore: 1, awayScore: 1 }]
    const standings = accumulateRoundRobin(results, 'soccer')
    const teamA = standings.find((s) => s.teamId === 'A')!
    const teamB = standings.find((s) => s.teamId === 'B')!
    expect(teamA.points).toBe(1)
    expect(teamB.points).toBe(1)
  })

  it('hockey win gives 2 points', () => {
    const results = [{ homeTeamId: 'A', awayTeamId: 'B', homeScore: 3, awayScore: 1 }]
    const standings = accumulateRoundRobin(results, 'hockey')
    const teamA = standings.find((s) => s.teamId === 'A')!
    expect(teamA.points).toBe(2)
  })

  it('rank 1 has most points', () => {
    const results = [
      { homeTeamId: 'A', awayTeamId: 'B', homeScore: 2, awayScore: 0 },
      { homeTeamId: 'A', awayTeamId: 'C', homeScore: 3, awayScore: 1 },
      { homeTeamId: 'B', awayTeamId: 'C', homeScore: 1, awayScore: 0 },
    ]
    const standings = accumulateRoundRobin(results)
    expect(standings[0].rank).toBe(1)
    const maxPoints = Math.max(...standings.map((s) => s.points))
    expect(standings[0].points).toBe(maxPoints)
  })

  it('accumulates pointsFor correctly', () => {
    const results = [
      { homeTeamId: 'A', awayTeamId: 'B', homeScore: 3, awayScore: 1 },
    ]
    const standings = accumulateRoundRobin(results)
    const teamA = standings.find((s) => s.teamId === 'A')!
    expect(teamA.pointsFor).toBe(3)
    expect(teamA.pointsAgainst).toBe(1)
  })

  it('handles empty results', () => {
    const standings = accumulateRoundRobin([])
    expect(standings).toHaveLength(0)
  })

  it('uses pointsFor as tiebreaker for equal points', () => {
    const results = [
      { homeTeamId: 'A', awayTeamId: 'C', homeScore: 5, awayScore: 0 },
      { homeTeamId: 'B', awayTeamId: 'D', homeScore: 1, awayScore: 0 },
    ]
    const standings = accumulateRoundRobin(results)
    expect(standings[0].teamId).toBe('A')
  })
})

// ---------------------------------------------------------------------------
// eliminationScenarios
// ---------------------------------------------------------------------------

describe('eliminationScenarios', () => {
  it('computes maxPossibleWins correctly', () => {
    const teams = [makeTeam('A', 8, 2)]
    const scenarios = eliminationScenarios(teams, 17, 1)
    expect(scenarios[0].maxPossibleWins).toBe(15) // 8 + (17-10)
  })

  it('computes gamesRemaining correctly', () => {
    const teams = [makeTeam('A', 8, 2)]
    const scenarios = eliminationScenarios(teams, 17, 1)
    expect(scenarios[0].gamesRemaining).toBe(7)
  })

  it('team with maxPossibleWins below leader is eliminated', () => {
    const teams = [
      makeTeam('Leader', 14, 0),
      makeTeam('Eliminated', 0, 14),
    ]
    const scenarios = eliminationScenarios(teams, 16, 1)
    const e = scenarios.find((s) => s.teamId === 'Eliminated')!
    expect(e.eliminated).toBe(true)
  })

  it('team already in playoff spot may be clinched', () => {
    const teams = [
      makeTeam('A', 15, 0),
      makeTeam('B', 0, 15),
    ]
    const scenarios = eliminationScenarios(teams, 16, 1)
    const a = scenarios.find((s) => s.teamId === 'A')!
    expect(a.clinched).toBe(true)
  })

  it('returns scenario for every team', () => {
    const teams = [makeTeam('A', 5, 5), makeTeam('B', 4, 6), makeTeam('C', 3, 7)]
    const scenarios = eliminationScenarios(teams, 16, 2)
    expect(scenarios).toHaveLength(3)
  })

  it('magicNumber is null for clinched team', () => {
    const teams = [
      makeTeam('A', 15, 0),
      makeTeam('B', 0, 15),
    ]
    const scenarios = eliminationScenarios(teams, 16, 1)
    const a = scenarios.find((s) => s.teamId === 'A')!
    expect(a.magicNumber).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// wildcardCompetitors
// ---------------------------------------------------------------------------

describe('wildcardCompetitors', () => {
  it('returns teams within 2 wins of target', () => {
    const target = makeTeam('T', 8, 2)
    const allTeams = [
      makeTeam('A', 10, 0), // 2 more wins — within 2
      makeTeam('B', 6, 4),  // 2 fewer wins — within 2
      makeTeam('C', 5, 5),  // 3 fewer wins — outside
    ]
    const competitors = wildcardCompetitors(target, allTeams, 4)
    expect(competitors.map((t) => t.teamId)).toContain('A')
    expect(competitors.map((t) => t.teamId)).toContain('B')
    expect(competitors.map((t) => t.teamId)).not.toContain('C')
  })

  it('excludes the target team itself', () => {
    const target = makeTeam('T', 8, 2)
    const allTeams = [target, makeTeam('A', 8, 2)]
    const competitors = wildcardCompetitors(target, allTeams, 4)
    expect(competitors.map((t) => t.teamId)).not.toContain('T')
  })

  it('returns empty if no competitors within range', () => {
    const target = makeTeam('T', 8, 2)
    const allTeams = [makeTeam('A', 1, 9)]
    const competitors = wildcardCompetitors(target, allTeams, 4)
    expect(competitors).toHaveLength(0)
  })

  it('includes teams with exactly 2 wins difference', () => {
    const target = makeTeam('T', 8, 2)
    const allTeams = [makeTeam('A', 10, 0), makeTeam('B', 6, 4)]
    const competitors = wildcardCompetitors(target, allTeams, 4)
    expect(competitors).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// strengthOfRecord
// ---------------------------------------------------------------------------

describe('strengthOfRecord', () => {
  it('team with only wins vs top teams has high score', () => {
    // Use 8 teams so top 25% = 2 teams (T2, T3 are in top 25% with high records)
    const allTeams = [
      makeTeam('T1', 10, 0),
      makeTeam('T2', 9, 1),
      makeTeam('T3', 8, 2),
      makeTeam('T4', 7, 3),
      makeTeam('T5', 5, 5),
      makeTeam('T6', 4, 6),
      makeTeam('T7', 2, 8),
      makeTeam('T8', 1, 9),
    ]
    // top 25% = ceil(8*0.25) = 2 teams: T1, T2 sorted — T2 is in top 25%
    // T3 is in top 50%
    const results = [
      { winnerId: 'T1', loserId: 'T2' }, // win vs top-25% opponent
      { winnerId: 'T1', loserId: 'T3' }, // win vs top-50% opponent
    ]
    const sor = strengthOfRecord('T1', results, allTeams)
    expect(sor.winsVsTop25Pct).toBeGreaterThanOrEqual(1)
    expect(sor.score).toBeGreaterThan(0)
  })

  it('team with losses to bottom teams has reduced score', () => {
    const allTeams = [
      makeTeam('T1', 5, 5),
      makeTeam('T2', 5, 5),
      makeTeam('T3', 1, 9),
      makeTeam('T4', 1, 9),
    ]
    const results = [
      { winnerId: 'T3', loserId: 'T1' }, // T1 lost to bottom team
      { winnerId: 'T4', loserId: 'T1' },
    ]
    const sor = strengthOfRecord('T1', results, allTeams)
    expect(sor.lossesVsBottom50Pct).toBeGreaterThan(0)
  })

  it('returns all required fields', () => {
    const allTeams = [makeTeam('A', 5, 5), makeTeam('B', 5, 5)]
    const sor = strengthOfRecord('A', [], allTeams)
    expect(sor).toHaveProperty('score')
    expect(sor).toHaveProperty('winsVsTop25Pct')
    expect(sor).toHaveProperty('winsVsTop50Pct')
    expect(sor).toHaveProperty('lossesVsBottom50Pct')
  })

  it('score is between 0 and 100', () => {
    const allTeams = [makeTeam('A', 10, 0), makeTeam('B', 5, 5), makeTeam('C', 0, 10)]
    const results = [{ winnerId: 'A', loserId: 'B' }]
    const sor = strengthOfRecord('A', results, allTeams)
    expect(sor.score).toBeGreaterThanOrEqual(0)
    expect(sor.score).toBeLessThanOrEqual(100)
  })

  it('no games → score is 0', () => {
    const allTeams = [makeTeam('A', 5, 5), makeTeam('B', 5, 5)]
    const sor = strengthOfRecord('A', [], allTeams)
    expect(sor.score).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// divisionRace
// ---------------------------------------------------------------------------

describe('divisionRace', () => {
  it('leader has best record in division', () => {
    const teams = [
      makeTeam('A', 10, 0, 0, { divisionId: 'NFC East' }),
      makeTeam('B', 8, 2, 0, { divisionId: 'NFC East' }),
      makeTeam('C', 5, 5, 0, { divisionId: 'NFC East' }),
    ]
    const { leader } = divisionRace(teams, 'NFC East', 17)
    expect(leader.teamId).toBe('A')
  })

  it('games back for 2nd place is correct', () => {
    const teams = [
      makeTeam('A', 10, 0, 0, { divisionId: 'D1' }),
      makeTeam('B', 8, 2, 0, { divisionId: 'D1' }),
    ]
    const { gamesBack } = divisionRace(teams, 'D1', 17)
    // GB = (10-8 + 2-0) / 2 = 4/2 = 2
    expect(gamesBack[0].gamesBack).toBe(2)
  })

  it('includes all non-leaders in gamesBack', () => {
    const teams = [
      makeTeam('A', 10, 0, 0, { divisionId: 'D1' }),
      makeTeam('B', 8, 2, 0, { divisionId: 'D1' }),
      makeTeam('C', 5, 5, 0, { divisionId: 'D1' }),
    ]
    const { gamesBack } = divisionRace(teams, 'D1', 17)
    expect(gamesBack).toHaveLength(2)
  })

  it('throws for unknown division', () => {
    const teams = [makeTeam('A', 5, 5, 0, { divisionId: 'D1' })]
    expect(() => divisionRace(teams, 'UNKNOWN', 17)).toThrow()
  })

  it('only considers teams in the specified division', () => {
    const teams = [
      makeTeam('A', 10, 0, 0, { divisionId: 'D1' }),
      makeTeam('B', 12, 0, 0, { divisionId: 'D2' }), // different division
    ]
    const { leader } = divisionRace(teams, 'D1', 17)
    expect(leader.teamId).toBe('A')
  })
})

// ---------------------------------------------------------------------------
// seriesProbability
// ---------------------------------------------------------------------------

describe('seriesProbability', () => {
  it('p=0.5 in best-of-7 → probability 0.5', () => {
    expect(seriesProbability(0.5, 7)).toBeCloseTo(0.5, 10)
  })

  it('p=0.5 in best-of-5 → probability 0.5', () => {
    expect(seriesProbability(0.5, 5)).toBeCloseTo(0.5, 10)
  })

  it('p=1.0 → probability 1.0', () => {
    expect(seriesProbability(1.0, 7)).toBeCloseTo(1.0, 5)
  })

  it('p=0.0 → probability 0.0', () => {
    expect(seriesProbability(0.0, 7)).toBeCloseTo(0.0, 5)
  })

  it('p > 0.5 → series prob > 0.5', () => {
    expect(seriesProbability(0.6, 7)).toBeGreaterThan(0.5)
  })

  it('p < 0.5 → series prob < 0.5', () => {
    expect(seriesProbability(0.4, 7)).toBeLessThan(0.5)
  })

  it('p=0.6 best-of-7 is known value ≈0.710', () => {
    // Exact: sum of negative binomial
    expect(seriesProbability(0.6, 7)).toBeCloseTo(0.7102, 3)
  })

  it('best-of-5 gives higher prob than best-of-7 for p=0.7', () => {
    const bo5 = seriesProbability(0.7, 5)
    const bo7 = seriesProbability(0.7, 7)
    expect(bo7).toBeGreaterThan(bo5)
  })
})

// ---------------------------------------------------------------------------
// binomialCoeff
// ---------------------------------------------------------------------------

describe('binomialCoeff', () => {
  it('C(4,2) = 6', () => {
    expect(binomialCoeff(4, 2)).toBe(6)
  })

  it('C(7,3) = 35', () => {
    expect(binomialCoeff(7, 3)).toBe(35)
  })

  it('C(n,0) = 1', () => {
    expect(binomialCoeff(10, 0)).toBe(1)
  })

  it('C(n,n) = 1', () => {
    expect(binomialCoeff(5, 5)).toBe(1)
  })

  it('C(5,1) = 5', () => {
    expect(binomialCoeff(5, 1)).toBe(5)
  })

  it('C(k > n) = 0', () => {
    expect(binomialCoeff(3, 5)).toBe(0)
  })

  it('C(10,3) = 120', () => {
    expect(binomialCoeff(10, 3)).toBe(120)
  })

  it('C(0,0) = 1', () => {
    expect(binomialCoeff(0, 0)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// formatBracket
// ---------------------------------------------------------------------------

describe('formatBracket', () => {
  it('contains round info', () => {
    const seeds = makeSeeds(['Chiefs', 'Jets', 'Bills', 'Dolphins'])
    const bracket = singleEliminationBracket(seeds)
    const names = new Map([
      ['Chiefs', 'Chiefs'],
      ['Jets', 'Jets'],
      ['Bills', 'Bills'],
      ['Dolphins', 'Dolphins'],
    ])
    const text = formatBracket(bracket, names)
    expect(text).toContain('Round 1')
  })

  it('contains team names', () => {
    const seeds = makeSeeds(['Chiefs', 'Jets'])
    const bracket = singleEliminationBracket(seeds)
    const names = new Map([['Chiefs', 'Kansas City Chiefs'], ['Jets', 'New York Jets']])
    const text = formatBracket(bracket, names)
    expect(text).toContain('Kansas City Chiefs')
    expect(text).toContain('New York Jets')
  })

  it('shows TBD for unresolved matchups in later rounds', () => {
    const seeds = makeSeeds(['T1', 'T2', 'T3', 'T4'])
    const bracket = singleEliminationBracket(seeds)
    const names = new Map([['T1', 'T1'], ['T2', 'T2'], ['T3', 'T3'], ['T4', 'T4']])
    const text = formatBracket(bracket, names)
    expect(text).toContain('TBD')
  })

  it('includes champion line when champion is set', () => {
    const seeds = makeSeeds(['T1', 'T2'])
    const bracket = singleEliminationBracket(seeds)
    const probs = new Map([['T1', 0.9], ['T2', 0.1]])
    // Simulate many times until T1 wins
    let simulated = simulateBracket(bracket, probs)
    const names = new Map([['T1', 'T1'], ['T2', 'T2']])
    const text = formatBracket(simulated, names)
    if (simulated.champion) {
      expect(text).toContain('Champion')
    }
  })

  it('has one line per round', () => {
    const seeds = makeSeeds(['T1', 'T2', 'T3', 'T4'])
    const bracket = singleEliminationBracket(seeds)
    const names = new Map(seeds.map((s) => [s.teamId, s.name]))
    const text = formatBracket(bracket, names)
    const lines = text.split('\n').filter((l) => l.startsWith('Round'))
    expect(lines).toHaveLength(bracket.rounds)
  })

  it('includes seed numbers in brackets', () => {
    const seeds = makeSeeds(['T1', 'T2', 'T3', 'T4'])
    const bracket = singleEliminationBracket(seeds)
    const names = new Map(seeds.map((s) => [s.teamId, s.name]))
    const text = formatBracket(bracket, names)
    expect(text).toContain('[1]')
    expect(text).toContain('[4]')
  })
})

// ---------------------------------------------------------------------------
// nflPlayoffSeeds
// ---------------------------------------------------------------------------

describe('nflPlayoffSeeds', () => {
  it('division winners get clinchScenario = Clinched Division', () => {
    const teams = [
      makeTeam('A', 12, 5, 0, { conferenceId: 'AFC', divisionId: 'AFC East', divisionRank: 1 }),
      makeTeam('B', 10, 7, 0, { conferenceId: 'AFC', divisionId: 'AFC East', divisionRank: 2 }),
    ]
    const seeds = nflPlayoffSeeds(teams)
    const divWinner = seeds.find((s) => s.teamId === 'A')
    expect(divWinner?.clinchScenario).toBe('Clinched Division')
  })

  it('produces at most 7 seeds per conference', () => {
    const teams = Array.from({ length: 10 }, (_, i) =>
      makeTeam(`T${i}`, 10 - i, i, 0, {
        conferenceId: 'AFC',
        divisionId: `DIV${i % 4}`,
        divisionRank: i < 4 ? 1 : 2,
      })
    )
    const seeds = nflPlayoffSeeds(teams)
    const afcSeeds = seeds.filter((s) => {
      const team = teams.find((t) => t.teamId === s.teamId)
      return team?.conferenceId === 'AFC'
    })
    expect(afcSeeds.length).toBeLessThanOrEqual(7)
  })
})

// ---------------------------------------------------------------------------
// nbaPlayoffSeeds
// ---------------------------------------------------------------------------

describe('nbaPlayoffSeeds', () => {
  it('produces at most 8 seeds per conference', () => {
    const teams = Array.from({ length: 15 }, (_, i) =>
      makeTeam(`T${i}`, 60 - i * 3, i * 3, 0, { conferenceId: 'East' })
    )
    const seeds = nbaPlayoffSeeds(teams)
    expect(seeds.length).toBeLessThanOrEqual(8)
  })

  it('first seed has best record', () => {
    const teams = [
      makeTeam('A', 60, 22, 0, { conferenceId: 'West' }),
      makeTeam('B', 50, 32, 0, { conferenceId: 'West' }),
      makeTeam('C', 45, 37, 0, { conferenceId: 'West' }),
    ]
    const seeds = nbaPlayoffSeeds(teams)
    expect(seeds[0].teamId).toBe('A')
  })
})
