// playoff-utils.ts — Pure TypeScript playoff/bracket utilities
// No npm dependencies. No `any`. All functions exported individually.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlayoffFormat = 'single-elimination' | 'double-elimination' | 'round-robin'

export interface TeamStanding {
  teamId: string
  name: string
  wins: number
  losses: number
  ties: number
  divisionId?: string
  conferenceId?: string
  pointsFor?: number
  pointsAgainst?: number
  winPct: number
  divisionRank?: number
}

export interface PlayoffSeed {
  seed: number
  teamId: string
  name: string
  record: string
  clinched: boolean
  clinchScenario?: string
}

export interface BracketMatchup {
  matchupId: string
  round: number
  homeTeamId?: string
  awayTeamId?: string
  winnerId?: string
  homeSeed?: number
  awaySeed?: number
}

export interface Bracket {
  format: PlayoffFormat
  rounds: number
  matchups: BracketMatchup[]
  champion?: string
}

export interface EliminationScenario {
  teamId: string
  eliminated: boolean
  clinched: boolean
  maxPossibleWins: number
  gamesRemaining: number
  magicNumber: number | null
  eliminationNumber: number | null
}

export interface RoundRobinResult {
  teamId: string
  wins: number
  losses: number
  ties: number
  pointsFor: number
  pointsAgainst: number
  points: number
  rank: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRecord(wins: number, losses: number, ties: number): string {
  if (ties > 0) return `${wins}-${losses}-${ties}`
  return `${wins}-${losses}`
}

// ---------------------------------------------------------------------------
// sortStandings
// ---------------------------------------------------------------------------

export function sortStandings(
  teams: TeamStanding[],
  tiebreakers?: Array<'winPct' | 'wins' | 'pointsFor' | 'pointDiff' | 'divisionRank'>
): TeamStanding[] {
  const tb = tiebreakers ?? ['winPct', 'wins', 'pointsFor', 'pointDiff']

  return [...teams].sort((a, b) => {
    for (const key of tb) {
      let aVal: number
      let bVal: number
      switch (key) {
        case 'winPct':
          aVal = a.winPct
          bVal = b.winPct
          break
        case 'wins':
          aVal = a.wins
          bVal = b.wins
          break
        case 'pointsFor':
          aVal = a.pointsFor ?? 0
          bVal = b.pointsFor ?? 0
          break
        case 'pointDiff':
          aVal = (a.pointsFor ?? 0) - (a.pointsAgainst ?? 0)
          bVal = (b.pointsFor ?? 0) - (b.pointsAgainst ?? 0)
          break
        case 'divisionRank':
          // Lower rank = better; invert so lower comes first
          aVal = -(a.divisionRank ?? 999)
          bVal = -(b.divisionRank ?? 999)
          break
      }
      if (bVal !== aVal) return bVal - aVal
    }
    return 0
  })
}

// ---------------------------------------------------------------------------
// generateSeeds
// ---------------------------------------------------------------------------

export function generateSeeds(
  teams: TeamStanding[],
  playoffSpots: number,
  format?: {
    divisionWinnersFirst?: boolean
    conferences?: boolean
  }
): PlayoffSeed[] {
  const divisionWinnersFirst = format?.divisionWinnersFirst !== false

  const seeds: PlayoffSeed[] = []
  let usedTeamIds = new Set<string>()

  if (divisionWinnersFirst) {
    // Collect division winners (divisionRank === 1)
    const divWinners = sortStandings(
      teams.filter((t) => t.divisionRank === 1),
      ['winPct', 'wins', 'pointsFor', 'pointDiff']
    )

    for (const team of divWinners) {
      if (seeds.length >= playoffSpots) break
      seeds.push({
        seed: seeds.length + 1,
        teamId: team.teamId,
        name: team.name,
        record: makeRecord(team.wins, team.losses, team.ties),
        clinched: true,
        clinchScenario: 'Clinched Division',
      })
      usedTeamIds.add(team.teamId)
    }
  }

  // Fill remaining spots with non-division-winner teams by winPct
  const remaining = sortStandings(
    teams.filter((t) => !usedTeamIds.has(t.teamId)),
    ['winPct', 'wins', 'pointsFor', 'pointDiff']
  )

  for (const team of remaining) {
    if (seeds.length >= playoffSpots) break
    seeds.push({
      seed: seeds.length + 1,
      teamId: team.teamId,
      name: team.name,
      record: makeRecord(team.wins, team.losses, team.ties),
      clinched: seeds.length < playoffSpots,
      clinchScenario: 'Clinched Playoff Spot',
    })
    usedTeamIds.add(team.teamId)
  }

  return seeds
}

// ---------------------------------------------------------------------------
// singleEliminationBracket
// ---------------------------------------------------------------------------

export function singleEliminationBracket(seeds: PlayoffSeed[]): Bracket {
  const n = seeds.length
  if (n < 2) throw new Error('Need at least 2 seeds')

  const rounds = Math.ceil(Math.log2(n))
  const matchups: BracketMatchup[] = []

  // Round 1: standard seeding 1 vs N, 2 vs N-1, etc.
  const firstRoundMatchups = Math.floor(n / 2)
  for (let i = 0; i < firstRoundMatchups; i++) {
    const highSeed = seeds[i]
    const lowSeed = seeds[n - 1 - i]
    matchups.push({
      matchupId: `r1-m${i + 1}`,
      round: 1,
      homeTeamId: highSeed.teamId,
      awayTeamId: lowSeed.teamId,
      homeSeed: highSeed.seed,
      awaySeed: lowSeed.seed,
    })
  }

  // Subsequent rounds: TBD matchups
  const r1Count = firstRoundMatchups
  let prevRoundCount = r1Count
  for (let round = 2; round <= rounds; round++) {
    const matchupsInRound = Math.ceil(prevRoundCount / 2)
    for (let m = 0; m < matchupsInRound; m++) {
      matchups.push({
        matchupId: `r${round}-m${m + 1}`,
        round,
      })
    }
    prevRoundCount = matchupsInRound
  }

  return {
    format: 'single-elimination',
    rounds,
    matchups,
  }
}

// ---------------------------------------------------------------------------
// simulateBracket
// ---------------------------------------------------------------------------

export function simulateBracket(
  bracket: Bracket,
  winProbabilities: Map<string, number>
): Bracket {
  const matchups = bracket.matchups.map((m) => ({ ...m }))

  // Build a map from matchupId → index for quick lookup
  const matchupIndex = new Map<string, number>()
  matchups.forEach((m, i) => matchupIndex.set(m.matchupId, i))

  // Process each round in order
  const maxRound = bracket.rounds

  // Collect round-1 matchups that are already populated
  for (let round = 1; round <= maxRound; round++) {
    const roundMatchups = matchups.filter((m) => m.round === round)

    for (const matchup of roundMatchups) {
      if (!matchup.homeTeamId || !matchup.awayTeamId) continue
      if (matchup.winnerId) continue

      const probA = winProbabilities.get(matchup.homeTeamId) ?? 0.5
      const probB = winProbabilities.get(matchup.awayTeamId) ?? 0.5
      const total = probA + probB
      const p = total === 0 ? 0.5 : probA / total
      const winner = Math.random() < p ? matchup.homeTeamId : matchup.awayTeamId
      matchup.winnerId = winner

      // Advance winner to next round
      if (round < maxRound) {
        const nextRoundMatchups = matchups.filter((m) => m.round === round + 1)
        // Find the corresponding next-round matchup by position
        const currentRoundMatchups = matchups.filter((m) => m.round === round)
        const posInRound = currentRoundMatchups.findIndex((m) => m.matchupId === matchup.matchupId)
        const nextMatchupPos = Math.floor(posInRound / 2)
        if (nextMatchupPos < nextRoundMatchups.length) {
          const nextMatchup = nextRoundMatchups[nextMatchupPos]
          if (posInRound % 2 === 0) {
            nextMatchup.homeTeamId = winner
          } else {
            nextMatchup.awayTeamId = winner
          }
        }
      }
    }
  }

  // Champion is winner of final round matchup
  const finalMatchup = matchups.filter((m) => m.round === maxRound)[0]
  const champion = finalMatchup?.winnerId

  return {
    ...bracket,
    matchups,
    champion,
  }
}

// ---------------------------------------------------------------------------
// resolveBracketDeterministic
// ---------------------------------------------------------------------------

export function resolveBracketDeterministic(
  bracket: Bracket,
  strengths: Map<string, number>
): Bracket {
  const matchups = bracket.matchups.map((m) => ({ ...m }))
  const maxRound = bracket.rounds

  for (let round = 1; round <= maxRound; round++) {
    const roundMatchups = matchups.filter((m) => m.round === round)

    for (const matchup of roundMatchups) {
      if (!matchup.homeTeamId || !matchup.awayTeamId) continue

      const homeStrength = strengths.get(matchup.homeTeamId) ?? 0
      const awayStrength = strengths.get(matchup.awayTeamId) ?? 0

      // Higher strength wins; ties go to home team
      const winner =
        awayStrength > homeStrength ? matchup.awayTeamId : matchup.homeTeamId
      matchup.winnerId = winner

      // Advance winner to next round
      if (round < maxRound) {
        const nextRoundMatchups = matchups.filter((m) => m.round === round + 1)
        const currentRoundMatchups = matchups.filter((m) => m.round === round)
        const posInRound = currentRoundMatchups.findIndex((m) => m.matchupId === matchup.matchupId)
        const nextMatchupPos = Math.floor(posInRound / 2)
        if (nextMatchupPos < nextRoundMatchups.length) {
          const nextMatchup = nextRoundMatchups[nextMatchupPos]
          if (posInRound % 2 === 0) {
            nextMatchup.homeTeamId = winner
          } else {
            nextMatchup.awayTeamId = winner
          }
        }
      }
    }
  }

  const finalMatchup = matchups.filter((m) => m.round === maxRound)[0]
  const champion = finalMatchup?.winnerId

  return {
    ...bracket,
    matchups,
    champion,
  }
}

// ---------------------------------------------------------------------------
// roundRobinSchedule
// ---------------------------------------------------------------------------

export function roundRobinSchedule(
  teamIds: string[]
): Array<{ homeTeamId: string; awayTeamId: string; round: number }> {
  const n = teamIds.length
  if (n < 2) return []

  const schedule: Array<{ homeTeamId: string; awayTeamId: string; round: number }> = []

  // If odd, add a bye team placeholder
  const teams = n % 2 === 1 ? [...teamIds, '__BYE__'] : [...teamIds]
  const m = teams.length // m is always even
  const numRounds = m - 1

  // Standard round-robin: fix first team, rotate rest
  const rotation = teams.slice(1)

  for (let round = 0; round < numRounds; round++) {
    const roundTeams = [teams[0], ...rotation]
    for (let i = 0; i < m / 2; i++) {
      const home = roundTeams[i]
      const away = roundTeams[m - 1 - i]
      // Skip bye matchups
      if (home !== '__BYE__' && away !== '__BYE__') {
        schedule.push({ homeTeamId: home, awayTeamId: away, round: round + 1 })
      }
    }
    // Rotate: move last element to front of rotation
    rotation.unshift(rotation.pop()!)
  }

  return schedule
}

// ---------------------------------------------------------------------------
// accumulateRoundRobin
// ---------------------------------------------------------------------------

export function accumulateRoundRobin(
  results: Array<{ homeTeamId: string; awayTeamId: string; homeScore: number; awayScore: number }>,
  pointSystem?: 'soccer' | 'hockey'
): RoundRobinResult[] {
  const system = pointSystem ?? 'soccer'
  const winPoints = system === 'soccer' ? 3 : 2
  const tiePoints = 1
  const lossPoints = 0

  const map = new Map<string, RoundRobinResult>()

  const getOrCreate = (teamId: string): RoundRobinResult => {
    if (!map.has(teamId)) {
      map.set(teamId, {
        teamId,
        wins: 0,
        losses: 0,
        ties: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        points: 0,
        rank: 0,
      })
    }
    return map.get(teamId)!
  }

  for (const result of results) {
    const home = getOrCreate(result.homeTeamId)
    const away = getOrCreate(result.awayTeamId)

    home.pointsFor += result.homeScore
    home.pointsAgainst += result.awayScore
    away.pointsFor += result.awayScore
    away.pointsAgainst += result.homeScore

    if (result.homeScore > result.awayScore) {
      home.wins++
      home.points += winPoints
      away.losses++
      away.points += lossPoints
    } else if (result.awayScore > result.homeScore) {
      away.wins++
      away.points += winPoints
      home.losses++
      home.points += lossPoints
    } else {
      home.ties++
      home.points += tiePoints
      away.ties++
      away.points += tiePoints
    }
  }

  const standing = Array.from(map.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    return b.pointsFor - a.pointsFor
  })

  standing.forEach((s, i) => {
    s.rank = i + 1
  })

  return standing
}

// ---------------------------------------------------------------------------
// eliminationScenarios
// ---------------------------------------------------------------------------

export function eliminationScenarios(
  teams: TeamStanding[],
  totalGames: number,
  playoffSpots: number
): EliminationScenario[] {
  const sorted = sortStandings(teams, ['winPct', 'wins', 'pointsFor', 'pointDiff'])

  const scenarios: EliminationScenario[] = []

  for (const team of teams) {
    const gamesRemaining = totalGames - (team.wins + team.losses + team.ties)
    const maxPossibleWins = team.wins + gamesRemaining

    // The bubble team: the team in the last playoff spot
    const bubbleTeam = sorted[playoffSpots - 1]
    // First team outside playoff
    const firstOut = sorted[playoffSpots]

    // Clinched: team is in playoff spot AND its maxPossibleWins > firstOut's maxPossibleWins
    // (i.e., even if they lose out, they stay ahead of first-out's best case)
    let clinched = false
    if (firstOut) {
      const firstOutGamesRemaining = totalGames - (firstOut.wins + firstOut.losses + firstOut.ties)
      const firstOutMaxWins = firstOut.wins + firstOutGamesRemaining
      const rankOfTeam = sorted.findIndex((t) => t.teamId === team.teamId)
      clinched = rankOfTeam < playoffSpots && team.wins > firstOutMaxWins
    } else {
      // All teams are in playoffs
      const rankOfTeam = sorted.findIndex((t) => t.teamId === team.teamId)
      clinched = rankOfTeam < playoffSpots
    }

    // Eliminated: even winning out, can't reach playoff spot
    const bubbleMaxWins = bubbleTeam
      ? bubbleTeam.wins + (totalGames - (bubbleTeam.wins + bubbleTeam.losses + bubbleTeam.ties))
      : 0
    const rankOfTeam = sorted.findIndex((t) => t.teamId === team.teamId)
    const eliminated = rankOfTeam >= playoffSpots && maxPossibleWins < (sorted[playoffSpots - 1]?.wins ?? 0)

    // Magic number: wins needed to clinch
    let magicNumber: number | null = null
    if (!clinched && !eliminated) {
      if (firstOut) {
        const firstOutMaxWins = firstOut.wins + (totalGames - (firstOut.wins + firstOut.losses + firstOut.ties))
        magicNumber = Math.max(0, firstOutMaxWins + 1 - team.wins)
      }
    }

    // Elimination number: losses before eliminated
    let eliminationNumber: number | null = null
    if (!eliminated) {
      const playoffThreshold = sorted[playoffSpots - 1]?.wins ?? 0
      const needed = playoffThreshold - maxPossibleWins
      eliminationNumber = needed > 0 ? null : gamesRemaining - Math.max(0, playoffThreshold - team.wins)
      if (eliminationNumber !== null && eliminationNumber < 0) eliminationNumber = 0
    }

    scenarios.push({
      teamId: team.teamId,
      eliminated,
      clinched,
      maxPossibleWins,
      gamesRemaining,
      magicNumber,
      eliminationNumber,
    })
  }

  return scenarios
}

// ---------------------------------------------------------------------------
// wildcardCompetitors
// ---------------------------------------------------------------------------

export function wildcardCompetitors(
  team: TeamStanding,
  allTeams: TeamStanding[],
  playoffSpots: number
): TeamStanding[] {
  // Teams within 2 wins of the target that are competing for wildcard spots
  return allTeams.filter((t) => {
    if (t.teamId === team.teamId) return false
    return Math.abs(t.wins - team.wins) <= 2
  })
}

// ---------------------------------------------------------------------------
// strengthOfRecord
// ---------------------------------------------------------------------------

export function strengthOfRecord(
  teamId: string,
  results: Array<{ winnerId: string; loserId: string }>,
  allTeams: TeamStanding[]
): { score: number; winsVsTop25Pct: number; winsVsTop50Pct: number; lossesVsBottom50Pct: number } {
  const sorted = sortStandings(allTeams, ['winPct', 'wins', 'pointsFor', 'pointDiff'])
  const n = sorted.length
  const top25Cutoff = Math.ceil(n * 0.25)
  const top50Cutoff = Math.ceil(n * 0.5)

  const top25Ids = new Set(sorted.slice(0, top25Cutoff).map((t) => t.teamId))
  const top50Ids = new Set(sorted.slice(0, top50Cutoff).map((t) => t.teamId))
  const bottom50Ids = new Set(sorted.slice(top50Cutoff).map((t) => t.teamId))

  let winsVsTop25Pct = 0
  let winsVsTop50Pct = 0
  let lossesVsBottom50Pct = 0

  for (const result of results) {
    if (result.winnerId === teamId) {
      const opp = result.loserId
      if (top25Ids.has(opp)) winsVsTop25Pct++
      if (top50Ids.has(opp)) winsVsTop50Pct++
    } else if (result.loserId === teamId) {
      const opp = result.winnerId
      if (bottom50Ids.has(opp)) lossesVsBottom50Pct++
    }
  }

  const rawScore = winsVsTop25Pct * 3 + winsVsTop50Pct - lossesVsBottom50Pct * 2
  // Normalize to 0-100: max theoretical is all wins vs top25 * 3 + top50 * 1
  // Use a simple clamp
  const score = Math.min(100, Math.max(0, rawScore * 5))

  return { score, winsVsTop25Pct, winsVsTop50Pct, lossesVsBottom50Pct }
}

// ---------------------------------------------------------------------------
// divisionRace
// ---------------------------------------------------------------------------

export function divisionRace(
  teams: TeamStanding[],
  divisionId: string,
  totalGames: number
): { leader: TeamStanding; gamesBack: Array<TeamStanding & { gamesBack: number }> } {
  const divTeams = sortStandings(
    teams.filter((t) => t.divisionId === divisionId),
    ['winPct', 'wins', 'pointsFor', 'pointDiff']
  )

  if (divTeams.length === 0) throw new Error(`No teams found in division ${divisionId}`)

  const leader = divTeams[0]
  const gamesBack = divTeams.slice(1).map((team) => {
    const gb = (leader.wins - team.wins + team.losses - leader.losses) / 2
    return { ...team, gamesBack: gb }
  })

  return { leader, gamesBack }
}

// ---------------------------------------------------------------------------
// nflPlayoffSeeds
// ---------------------------------------------------------------------------

export function nflPlayoffSeeds(teams: TeamStanding[]): PlayoffSeed[] {
  // 7 seeds per conference: 4 division winners, 3 wildcards
  // Simplified: group by conferenceId, then by divisionId

  const conferences = new Map<string, TeamStanding[]>()
  for (const team of teams) {
    const conf = team.conferenceId ?? 'default'
    if (!conferences.has(conf)) conferences.set(conf, [])
    conferences.get(conf)!.push(team)
  }

  const allSeeds: PlayoffSeed[] = []

  for (const [, confTeams] of conferences) {
    const seeds: PlayoffSeed[] = []

    // Division winners: teams with divisionRank === 1, sorted by record
    const divWinners = sortStandings(
      confTeams.filter((t) => t.divisionRank === 1),
      ['winPct', 'wins', 'pointsFor', 'pointDiff']
    ).slice(0, 4)

    const usedIds = new Set<string>()
    for (const team of divWinners) {
      seeds.push({
        seed: seeds.length + 1,
        teamId: team.teamId,
        name: team.name,
        record: makeRecord(team.wins, team.losses, team.ties),
        clinched: true,
        clinchScenario: 'Clinched Division',
      })
      usedIds.add(team.teamId)
    }

    // Wildcards: remaining teams sorted by record, up to 3
    const wildcards = sortStandings(
      confTeams.filter((t) => !usedIds.has(t.teamId)),
      ['winPct', 'wins', 'pointsFor', 'pointDiff']
    ).slice(0, 3)

    for (const team of wildcards) {
      seeds.push({
        seed: seeds.length + 1,
        teamId: team.teamId,
        name: team.name,
        record: makeRecord(team.wins, team.losses, team.ties),
        clinched: true,
        clinchScenario: 'Clinched Playoff Spot',
      })
    }

    allSeeds.push(...seeds)
  }

  return allSeeds
}

// ---------------------------------------------------------------------------
// nbaPlayoffSeeds
// ---------------------------------------------------------------------------

export function nbaPlayoffSeeds(teams: TeamStanding[]): PlayoffSeed[] {
  // 8 seeds per conference, ranked by record
  const conferences = new Map<string, TeamStanding[]>()
  for (const team of teams) {
    const conf = team.conferenceId ?? 'default'
    if (!conferences.has(conf)) conferences.set(conf, [])
    conferences.get(conf)!.push(team)
  }

  const allSeeds: PlayoffSeed[] = []

  for (const [, confTeams] of conferences) {
    const sorted = sortStandings(confTeams, ['winPct', 'wins', 'pointsFor', 'pointDiff']).slice(0, 8)

    sorted.forEach((team, i) => {
      allSeeds.push({
        seed: i + 1,
        teamId: team.teamId,
        name: team.name,
        record: makeRecord(team.wins, team.losses, team.ties),
        clinched: true,
        clinchScenario: i < 6 ? 'Clinched Playoff Spot' : 'Play-In Tournament',
      })
    })
  }

  return allSeeds
}

// ---------------------------------------------------------------------------
// binomialCoeff
// ---------------------------------------------------------------------------

export function binomialCoeff(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  if (k === 0 || k === n) return 1

  // Use smaller k for efficiency
  const kk = Math.min(k, n - k)
  let result = 1
  for (let i = 0; i < kk; i++) {
    result = (result * (n - i)) / (i + 1)
  }
  return Math.round(result)
}

// ---------------------------------------------------------------------------
// seriesProbability
// ---------------------------------------------------------------------------

export function seriesProbability(
  gameWinProb: number,
  seriesLength: 5 | 7
): number {
  const winsNeeded = Math.ceil(seriesLength / 2)
  const maxLosses = seriesLength - winsNeeded

  let prob = 0
  for (let losses = 0; losses <= maxLosses; losses++) {
    // Team wins `winsNeeded` games, having had `losses` losses
    // Total games = winsNeeded + losses
    // Last game must be a win; so C(winsNeeded + losses - 1, losses) ways
    const ways = binomialCoeff(winsNeeded + losses - 1, losses)
    prob += ways * Math.pow(gameWinProb, winsNeeded) * Math.pow(1 - gameWinProb, losses)
  }

  return prob
}

// ---------------------------------------------------------------------------
// formatBracket
// ---------------------------------------------------------------------------

export function formatBracket(bracket: Bracket, teamNames: Map<string, string>): string {
  const lines: string[] = []

  for (let round = 1; round <= bracket.rounds; round++) {
    const roundMatchups = bracket.matchups.filter((m) => m.round === round)
    const parts = roundMatchups.map((m) => {
      const homeName = m.homeTeamId ? (teamNames.get(m.homeTeamId) ?? m.homeTeamId) : 'TBD'
      const awayName = m.awayTeamId ? (teamNames.get(m.awayTeamId) ?? m.awayTeamId) : 'TBD'
      const homeSeedStr = m.homeSeed != null ? `[${m.homeSeed}] ` : ''
      const awaySeedStr = m.awaySeed != null ? `[${m.awaySeed}] ` : ''
      return `${homeSeedStr}${homeName} vs ${awaySeedStr}${awayName}`
    })
    lines.push(`Round ${round}: ${parts.join(' | ')}`)
  }

  if (bracket.champion) {
    const champName = teamNames.get(bracket.champion) ?? bracket.champion
    lines.push(`Champion: ${champName}`)
  }

  return lines.join('\n')
}
