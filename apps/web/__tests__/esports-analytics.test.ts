import { describe, it, expect } from 'vitest'
import {
  // General combat stats
  kdaRatio,
  killDeathRatio,
  headshotRate,
  assistRate,
  clutchWinRate,
  multiKillRate,
  // LoL
  csPerMinute,
  visionScore,
  damageSharePct,
  goldDiffAt,
  lanePhaseScore,
  jungleProximity,
  teamfightParticipation,
  lolPlayerRating,
  lolFantasyScore,
  // CS:GO/CS2
  adr,
  ratingTwoPoint,
  kastPct,
  utilityDamage,
  openingDuelWinRate,
  csgoFantasyScore,
  // VALORANT
  firstBloodRate,
  spikePlantRate,
  spikeDefuseRate,
  abilityUsageScore,
  valFantasyScore,
  // Dota 2
  lastHitsPerMinute,
  heroDamageShare,
  towerDamageContribution,
  wardEfficiency,
  dotaFantasyScore,
  // Team analytics
  teamKDAAggregate,
  economyEfficiency,
  roundWinRate,
  mapWinRate,
  objectiveControlRate,
  teamSynergyScore,
  // Betting / prediction helpers
  eloExpectedScore,
  eloUpdate,
  mapAdvantage,
  formRating,
  type LolFantasyStats,
  type CsgoFantasyStats,
  type ValFantasyStats,
  type DotaFantasyStats,
  type PlayerKDA,
} from '@/lib/sports/esports-analytics'

// ---------------------------------------------------------------------------
// 1. General combat stats
// ---------------------------------------------------------------------------

describe('kdaRatio', () => {
  it('calculates (kills + assists) / deaths', () => {
    expect(kdaRatio(10, 5, 5)).toBeCloseTo(3)
  })

  it('uses max(deaths, 1) when deaths is 0', () => {
    expect(kdaRatio(5, 0, 5)).toBeCloseTo(10)
  })

  it('handles zero kills and assists', () => {
    expect(kdaRatio(0, 5, 0)).toBeCloseTo(0)
  })

  it('handles all zeros', () => {
    expect(kdaRatio(0, 0, 0)).toBeCloseTo(0)
  })

  it('decimal kills and assists', () => {
    expect(kdaRatio(3, 2, 7)).toBeCloseTo(5)
  })
})

describe('killDeathRatio', () => {
  it('calculates kills / deaths', () => {
    expect(killDeathRatio(10, 5)).toBeCloseTo(2)
  })

  it('uses max(deaths, 1) when deaths is 0', () => {
    expect(killDeathRatio(7, 0)).toBeCloseTo(7)
  })

  it('handles 0 kills', () => {
    expect(killDeathRatio(0, 5)).toBeCloseTo(0)
  })

  it('handles both zero', () => {
    expect(killDeathRatio(0, 0)).toBeCloseTo(0)
  })
})

describe('headshotRate', () => {
  it('returns percentage', () => {
    expect(headshotRate(5, 10)).toBeCloseTo(50)
  })

  it('returns 0 when totalKills is 0', () => {
    expect(headshotRate(0, 0)).toBe(0)
  })

  it('returns 100 for all headshots', () => {
    expect(headshotRate(10, 10)).toBeCloseTo(100)
  })

  it('handles non-integer values', () => {
    expect(headshotRate(1, 3)).toBeCloseTo(33.333)
  })
})

describe('assistRate', () => {
  it('returns assists as percentage of team kills', () => {
    expect(assistRate(5, 10)).toBeCloseTo(50)
  })

  it('returns 0 when teamKills is 0', () => {
    expect(assistRate(5, 0)).toBe(0)
  })

  it('returns 0 when assists is 0', () => {
    expect(assistRate(0, 10)).toBeCloseTo(0)
  })

  it('handles 100% assist rate', () => {
    expect(assistRate(10, 10)).toBeCloseTo(100)
  })
})

describe('clutchWinRate', () => {
  it('returns clutch wins percentage', () => {
    expect(clutchWinRate(3, 5)).toBeCloseTo(60)
  })

  it('returns 0 when clutchAttempts is 0', () => {
    expect(clutchWinRate(0, 0)).toBe(0)
  })

  it('handles perfect clutch rate', () => {
    expect(clutchWinRate(5, 5)).toBeCloseTo(100)
  })

  it('returns 0 for 0 wins', () => {
    expect(clutchWinRate(0, 5)).toBeCloseTo(0)
  })
})

describe('multiKillRate', () => {
  it('calculates multi-kills per round', () => {
    expect(multiKillRate(5, 10)).toBeCloseTo(0.5)
  })

  it('returns 0 when rounds is 0', () => {
    expect(multiKillRate(5, 0)).toBe(0)
  })

  it('handles zero multi kills', () => {
    expect(multiKillRate(0, 20)).toBeCloseTo(0)
  })
})

// ---------------------------------------------------------------------------
// 2. League of Legends specific
// ---------------------------------------------------------------------------

describe('csPerMinute', () => {
  it('returns CS per minute', () => {
    expect(csPerMinute(200, 25)).toBeCloseTo(8)
  })

  it('returns 0 when duration is 0', () => {
    expect(csPerMinute(200, 0)).toBe(0)
  })

  it('handles 0 CS', () => {
    expect(csPerMinute(0, 30)).toBeCloseTo(0)
  })
})

describe('visionScore', () => {
  it('computes weighted vision score', () => {
    // 10*1 + 5*1.5 + 3*2 = 10 + 7.5 + 6 = 23.5
    expect(visionScore(10, 5, 3)).toBeCloseTo(23.5)
  })

  it('handles all zeros', () => {
    expect(visionScore(0, 0, 0)).toBeCloseTo(0)
  })

  it('weights control wards highest', () => {
    expect(visionScore(0, 0, 5)).toBeCloseTo(10)
  })

  it('weights ward kills at 1.5', () => {
    expect(visionScore(0, 4, 0)).toBeCloseTo(6)
  })
})

describe('damageSharePct', () => {
  it('returns percentage of team damage', () => {
    expect(damageSharePct(5000, 20000)).toBeCloseTo(25)
  })

  it('returns 0 when teamTotalDamage is 0', () => {
    expect(damageSharePct(1000, 0)).toBe(0)
  })

  it('returns 100 for all damage', () => {
    expect(damageSharePct(1000, 1000)).toBeCloseTo(100)
  })
})

describe('goldDiffAt', () => {
  it('returns positive diff when ahead', () => {
    expect(goldDiffAt(5000, 3000)).toBe(2000)
  })

  it('returns negative diff when behind', () => {
    expect(goldDiffAt(2000, 4000)).toBe(-2000)
  })

  it('returns 0 when equal', () => {
    expect(goldDiffAt(3000, 3000)).toBe(0)
  })
})

describe('lanePhaseScore', () => {
  it('computes score for average laner', () => {
    // csAt10=80 -> (80/80)*40=40, goldAt10=3500 -> (3500/3500)*40=40, kills=1 deaths=1 -> 0
    expect(lanePhaseScore(80, 3500, 1, 1)).toBeCloseTo(80)
  })

  it('caps at 100', () => {
    expect(lanePhaseScore(160, 7000, 10, 0)).toBe(100)
  })

  it('floors at 0', () => {
    expect(lanePhaseScore(0, 0, 0, 100)).toBe(0)
  })

  it('computes zero kill contribution correctly', () => {
    // (0/80)*40 + (0/3500)*40 + 0 = 0
    expect(lanePhaseScore(0, 0, 0, 0)).toBeCloseTo(0)
  })
})

describe('jungleProximity', () => {
  it('computes ganks*3 + camps*1 + objectives*5', () => {
    // 3*3 + 10*1 + 2*5 = 9+10+10 = 29
    expect(jungleProximity(3, 10, 2)).toBeCloseTo(29)
  })

  it('handles all zeros', () => {
    expect(jungleProximity(0, 0, 0)).toBeCloseTo(0)
  })

  it('objectives weighted highest', () => {
    expect(jungleProximity(0, 0, 1)).toBeCloseTo(5)
  })
})

describe('teamfightParticipation', () => {
  it('computes (kills+assists)/max(teamKills,1)*100', () => {
    expect(teamfightParticipation(5, 5, 20)).toBeCloseTo(50)
  })

  it('uses max(teamKills, 1) when 0', () => {
    expect(teamfightParticipation(1, 1, 0)).toBeCloseTo(200)
  })

  it('handles 0 participation', () => {
    expect(teamfightParticipation(0, 0, 10)).toBeCloseTo(0)
  })

  it('can exceed 100 with assists', () => {
    expect(teamfightParticipation(5, 10, 10)).toBeCloseTo(150)
  })
})

describe('lolPlayerRating', () => {
  it('computes weighted rating', () => {
    // kda=2 -> 50, cspm=8 -> (1)*25=25, visionScore=50 -> 25, damageShare=1 -> 25 = 125 -> capped 100
    expect(lolPlayerRating(2, 8, 50, 1)).toBe(100)
  })

  it('caps at 100', () => {
    expect(lolPlayerRating(10, 20, 100, 5)).toBe(100)
  })

  it('floors at 0', () => {
    expect(lolPlayerRating(0, 0, 0, 0)).toBe(0)
  })

  it('computes average player rating', () => {
    // kda=1 -> 25, cspm=4 -> (0.5)*25=12.5, vision=25 -> 12.5, dmgShare=0.5 -> 12.5 = 62.5
    expect(lolPlayerRating(1, 4, 25, 0.5)).toBeCloseTo(62.5)
  })
})

describe('lolFantasyScore', () => {
  it('computes full fantasy score', () => {
    const stats: LolFantasyStats = {
      kills: 10,
      deaths: 3,
      assists: 8,
      cs: 200,
      triplePlus: 1,
      quadra: 0,
      penta: 0,
    }
    // 10*3 + 3*-1 + 8*2 + 200*0.02 + 1*2 + 0 + 0 = 30 - 3 + 16 + 4 + 2 = 49
    expect(lolFantasyScore(stats)).toBeCloseTo(49)
  })

  it('handles penta kill bonus', () => {
    const stats: LolFantasyStats = {
      kills: 0,
      deaths: 0,
      assists: 0,
      cs: 0,
      triplePlus: 0,
      quadra: 0,
      penta: 1,
    }
    expect(lolFantasyScore(stats)).toBeCloseTo(10)
  })

  it('penalizes deaths', () => {
    const stats: LolFantasyStats = {
      kills: 0,
      deaths: 10,
      assists: 0,
      cs: 0,
      triplePlus: 0,
      quadra: 0,
      penta: 0,
    }
    expect(lolFantasyScore(stats)).toBeCloseTo(-10)
  })

  it('handles all zeros', () => {
    const stats: LolFantasyStats = {
      kills: 0,
      deaths: 0,
      assists: 0,
      cs: 0,
      triplePlus: 0,
      quadra: 0,
      penta: 0,
    }
    expect(lolFantasyScore(stats)).toBeCloseTo(0)
  })
})

// ---------------------------------------------------------------------------
// 3. CS:GO/CS2 specific
// ---------------------------------------------------------------------------

describe('adr', () => {
  it('returns damage per round', () => {
    expect(adr(3000, 30)).toBeCloseTo(100)
  })

  it('returns 0 when rounds is 0', () => {
    expect(adr(1000, 0)).toBe(0)
  })

  it('handles 0 damage', () => {
    expect(adr(0, 30)).toBeCloseTo(0)
  })
})

describe('ratingTwoPoint', () => {
  it('computes HLTV 2.0 rating formula', () => {
    // 0.0073*75 + 0.3591*0.75 - 0.5329*0.5 + 0.2372*1.2 + 0.0032*80 + 0.1587
    const result = ratingTwoPoint(0.75, 0.5, 1.2, 80, 75)
    // = 0.5475 + 0.26933 - 0.26645 + 0.28464 + 0.256 + 0.1587
    expect(result).toBeGreaterThan(1)
  })

  it('produces lower rating for poor stats', () => {
    const good = ratingTwoPoint(1.2, 0.3, 1.5, 100, 85)
    const poor = ratingTwoPoint(0.4, 1.0, 0.5, 50, 40)
    expect(good).toBeGreaterThan(poor)
  })

  it('returns a number', () => {
    expect(typeof ratingTwoPoint(0.7, 0.7, 1.0, 75, 70)).toBe('number')
  })
})

describe('kastPct', () => {
  it('returns percentage', () => {
    expect(kastPct(20, 25)).toBeCloseTo(80)
  })

  it('returns 0 when totalRounds is 0', () => {
    expect(kastPct(10, 0)).toBe(0)
  })

  it('returns 100 for all rounds', () => {
    expect(kastPct(30, 30)).toBeCloseTo(100)
  })
})

describe('utilityDamage', () => {
  it('computes nade*1 + molotov*1.5 + flashAssist*0.5', () => {
    // 100*1 + 50*1.5 + 20*0.5 = 100+75+10 = 185
    expect(utilityDamage(100, 50, 20)).toBeCloseTo(185)
  })

  it('handles all zeros', () => {
    expect(utilityDamage(0, 0, 0)).toBeCloseTo(0)
  })

  it('molotov has highest weight', () => {
    expect(utilityDamage(0, 10, 0)).toBeCloseTo(15)
    expect(utilityDamage(10, 0, 0)).toBeCloseTo(10)
    expect(utilityDamage(0, 0, 10)).toBeCloseTo(5)
  })
})

describe('openingDuelWinRate', () => {
  it('calculates win rate from kills and deaths', () => {
    expect(openingDuelWinRate(3, 2)).toBeCloseTo(60)
  })

  it('returns 50 when both are 0', () => {
    expect(openingDuelWinRate(0, 0)).toBe(50)
  })

  it('returns 100 when all kills', () => {
    expect(openingDuelWinRate(5, 0)).toBeCloseTo(100)
  })

  it('returns 0 when all deaths', () => {
    expect(openingDuelWinRate(0, 5)).toBeCloseTo(0)
  })
})

describe('csgoFantasyScore', () => {
  it('computes full CS:GO fantasy score', () => {
    const stats: CsgoFantasyStats = {
      kills: 20,
      deaths: 15,
      assists: 5,
      headshots: 10,
      adr: 80,
      clutches: 2,
    }
    // 20*2 + 15*-0.5 + 5*0.5 + 10*0.5 + 80*0.1 + 2*4
    // = 40 - 7.5 + 2.5 + 5 + 8 + 8 = 56
    expect(csgoFantasyScore(stats)).toBeCloseTo(56)
  })

  it('penalizes deaths', () => {
    const stats: CsgoFantasyStats = {
      kills: 0,
      deaths: 20,
      assists: 0,
      headshots: 0,
      adr: 0,
      clutches: 0,
    }
    expect(csgoFantasyScore(stats)).toBeCloseTo(-10)
  })

  it('rewards clutches highly', () => {
    const stats: CsgoFantasyStats = {
      kills: 0,
      deaths: 0,
      assists: 0,
      headshots: 0,
      adr: 0,
      clutches: 1,
    }
    expect(csgoFantasyScore(stats)).toBeCloseTo(4)
  })

  it('handles all zeros', () => {
    const stats: CsgoFantasyStats = {
      kills: 0,
      deaths: 0,
      assists: 0,
      headshots: 0,
      adr: 0,
      clutches: 0,
    }
    expect(csgoFantasyScore(stats)).toBeCloseTo(0)
  })
})

// ---------------------------------------------------------------------------
// 4. VALORANT specific
// ---------------------------------------------------------------------------

describe('firstBloodRate', () => {
  it('computes first blood rate', () => {
    expect(firstBloodRate(5, 20)).toBeCloseTo(25)
  })

  it('returns 0 when rounds is 0', () => {
    expect(firstBloodRate(3, 0)).toBe(0)
  })

  it('handles 0 first bloods', () => {
    expect(firstBloodRate(0, 25)).toBeCloseTo(0)
  })

  it('returns 100 for every round', () => {
    expect(firstBloodRate(25, 25)).toBeCloseTo(100)
  })
})

describe('spikePlantRate', () => {
  it('computes spike plant rate', () => {
    expect(spikePlantRate(8, 12)).toBeCloseTo(66.667)
  })

  it('returns 0 when roundsAttacking is 0', () => {
    expect(spikePlantRate(5, 0)).toBe(0)
  })

  it('returns 100 for perfect plant rate', () => {
    expect(spikePlantRate(13, 13)).toBeCloseTo(100)
  })
})

describe('spikeDefuseRate', () => {
  it('computes spike defuse rate', () => {
    expect(spikeDefuseRate(5, 10)).toBeCloseTo(50)
  })

  it('returns 0 when plantsAgainst is 0', () => {
    expect(spikeDefuseRate(5, 0)).toBe(0)
  })

  it('returns 100 for perfect defuse rate', () => {
    expect(spikeDefuseRate(8, 8)).toBeCloseTo(100)
  })
})

describe('abilityUsageScore', () => {
  it('computes ability usage score', () => {
    // (20/25)*10 + 3*3 = 8 + 9 = 17
    expect(abilityUsageScore(20, 3, 25)).toBeCloseTo(17)
  })

  it('caps at 100', () => {
    expect(abilityUsageScore(1000, 100, 1)).toBe(100)
  })

  it('floors at 0', () => {
    expect(abilityUsageScore(0, 0, 25)).toBeCloseTo(0)
  })

  it('handles 0 rounds with abilityKills', () => {
    expect(abilityUsageScore(0, 5, 0)).toBeCloseTo(15)
  })

  it('handles zero everything', () => {
    expect(abilityUsageScore(0, 0, 0)).toBeCloseTo(0)
  })
})

describe('valFantasyScore', () => {
  it('computes full VALORANT fantasy score', () => {
    const stats: ValFantasyStats = {
      kills: 20,
      deaths: 10,
      assists: 5,
      firstBloods: 3,
      plants: 4,
      defuses: 2,
      clutches: 1,
    }
    // 20*2 + 10*-0.5 + 5*0.5 + 3*4 + 4*2 + 2*2 + 1*5
    // = 40 - 5 + 2.5 + 12 + 8 + 4 + 5 = 66.5
    expect(valFantasyScore(stats)).toBeCloseTo(66.5)
  })

  it('rewards first bloods at 4x', () => {
    const stats: ValFantasyStats = {
      kills: 0,
      deaths: 0,
      assists: 0,
      firstBloods: 1,
      plants: 0,
      defuses: 0,
      clutches: 0,
    }
    expect(valFantasyScore(stats)).toBeCloseTo(4)
  })

  it('rewards clutches at 5x', () => {
    const stats: ValFantasyStats = {
      kills: 0,
      deaths: 0,
      assists: 0,
      firstBloods: 0,
      plants: 0,
      defuses: 0,
      clutches: 1,
    }
    expect(valFantasyScore(stats)).toBeCloseTo(5)
  })

  it('handles all zeros', () => {
    const stats: ValFantasyStats = {
      kills: 0,
      deaths: 0,
      assists: 0,
      firstBloods: 0,
      plants: 0,
      defuses: 0,
      clutches: 0,
    }
    expect(valFantasyScore(stats)).toBeCloseTo(0)
  })
})

// ---------------------------------------------------------------------------
// 5. Dota 2 specific
// ---------------------------------------------------------------------------

describe('lastHitsPerMinute', () => {
  it('returns last hits per minute', () => {
    expect(lastHitsPerMinute(300, 30)).toBeCloseTo(10)
  })

  it('returns 0 when duration is 0', () => {
    expect(lastHitsPerMinute(300, 0)).toBe(0)
  })

  it('handles 0 last hits', () => {
    expect(lastHitsPerMinute(0, 30)).toBeCloseTo(0)
  })
})

describe('heroDamageShare', () => {
  it('returns percentage of team hero damage', () => {
    expect(heroDamageShare(30000, 100000)).toBeCloseTo(30)
  })

  it('returns 0 when teamHeroDamage is 0', () => {
    expect(heroDamageShare(5000, 0)).toBe(0)
  })

  it('returns 100 for sole damage dealer', () => {
    expect(heroDamageShare(50000, 50000)).toBeCloseTo(100)
  })
})

describe('towerDamageContribution', () => {
  it('returns percentage of team tower damage', () => {
    expect(towerDamageContribution(2000, 5000)).toBeCloseTo(40)
  })

  it('returns 0 when teamTowerDamage is 0', () => {
    expect(towerDamageContribution(1000, 0)).toBe(0)
  })

  it('returns 100 for sole contributor', () => {
    expect(towerDamageContribution(3000, 3000)).toBeCloseTo(100)
  })
})

describe('wardEfficiency', () => {
  it('computes ward kill percentage', () => {
    // 5/10 * 100 = 50
    expect(wardEfficiency(10, 5)).toBeCloseTo(50)
  })

  it('uses max(placed, 1) when placed is 0', () => {
    expect(wardEfficiency(0, 3)).toBeCloseTo(300)
  })

  it('handles 0 kills', () => {
    expect(wardEfficiency(5, 0)).toBeCloseTo(0)
  })

  it('handles both zeros', () => {
    expect(wardEfficiency(0, 0)).toBeCloseTo(0)
  })
})

describe('dotaFantasyScore', () => {
  it('computes full Dota 2 fantasy score', () => {
    const stats: DotaFantasyStats = {
      kills: 10,
      deaths: 5,
      assists: 20,
      lastHits: 300,
      towerKills: 3,
      roshanKills: 1,
      stuns: 200,
    }
    // 10*0.3 + 5*-0.3 + 20*0.15 + 300*0.003 + 3*1 + 1*1 + 200*(0.1/100)
    // = 3 - 1.5 + 3 + 0.9 + 3 + 1 + 0.2 = 9.6
    expect(dotaFantasyScore(stats)).toBeCloseTo(9.6)
  })

  it('penalizes deaths', () => {
    const stats: DotaFantasyStats = {
      kills: 0,
      deaths: 10,
      assists: 0,
      lastHits: 0,
      towerKills: 0,
      roshanKills: 0,
      stuns: 0,
    }
    expect(dotaFantasyScore(stats)).toBeCloseTo(-3)
  })

  it('rewards roshan kills', () => {
    const stats: DotaFantasyStats = {
      kills: 0,
      deaths: 0,
      assists: 0,
      lastHits: 0,
      towerKills: 0,
      roshanKills: 1,
      stuns: 0,
    }
    expect(dotaFantasyScore(stats)).toBeCloseTo(1)
  })

  it('handles all zeros', () => {
    const stats: DotaFantasyStats = {
      kills: 0,
      deaths: 0,
      assists: 0,
      lastHits: 0,
      towerKills: 0,
      roshanKills: 0,
      stuns: 0,
    }
    expect(dotaFantasyScore(stats)).toBeCloseTo(0)
  })
})

// ---------------------------------------------------------------------------
// 6. Team analytics
// ---------------------------------------------------------------------------

describe('teamKDAAggregate', () => {
  it('computes aggregate KDA', () => {
    const players: PlayerKDA[] = [
      { kills: 5, deaths: 3, assists: 7 },
      { kills: 8, deaths: 4, assists: 5 },
      { kills: 3, deaths: 6, assists: 10 },
    ]
    // total kills=16, deaths=13, assists=22 -> (16+22)/13 = 38/13
    expect(teamKDAAggregate(players)).toBeCloseTo(38 / 13)
  })

  it('handles 0 deaths (uses max 1)', () => {
    const players: PlayerKDA[] = [
      { kills: 5, deaths: 0, assists: 5 },
    ]
    expect(teamKDAAggregate(players)).toBeCloseTo(10)
  })

  it('returns 0 for empty array', () => {
    expect(teamKDAAggregate([])).toBe(0)
  })

  it('handles single player', () => {
    const players: PlayerKDA[] = [{ kills: 10, deaths: 2, assists: 4 }]
    // (10+4)/2 = 7
    expect(teamKDAAggregate(players)).toBeCloseTo(7)
  })
})

describe('economyEfficiency', () => {
  it('computes damage per money unit', () => {
    expect(economyEfficiency(5000, 25000)).toBeCloseTo(5)
  })

  it('returns 0 when moneySpent is 0', () => {
    expect(economyEfficiency(0, 25000)).toBe(0)
  })

  it('handles 0 damage', () => {
    expect(economyEfficiency(5000, 0)).toBeCloseTo(0)
  })
})

describe('roundWinRate', () => {
  it('calculates round win rate', () => {
    expect(roundWinRate(16, 30)).toBeCloseTo(53.333)
  })

  it('returns 0 when roundsPlayed is 0', () => {
    expect(roundWinRate(0, 0)).toBe(0)
  })

  it('returns 100 for all wins', () => {
    expect(roundWinRate(30, 30)).toBeCloseTo(100)
  })
})

describe('mapWinRate', () => {
  it('calculates map win rate', () => {
    expect(mapWinRate(3, 5)).toBeCloseTo(60)
  })

  it('returns 0 when mapsPlayed is 0', () => {
    expect(mapWinRate(0, 0)).toBe(0)
  })

  it('returns 100 for all wins', () => {
    expect(mapWinRate(5, 5)).toBeCloseTo(100)
  })
})

describe('objectiveControlRate', () => {
  it('calculates objective control rate', () => {
    expect(objectiveControlRate(7, 10)).toBeCloseTo(70)
  })

  it('returns 0 when objectivesContested is 0', () => {
    expect(objectiveControlRate(5, 0)).toBe(0)
  })

  it('returns 100 when all objectives secured', () => {
    expect(objectiveControlRate(10, 10)).toBeCloseTo(100)
  })
})

describe('teamSynergyScore', () => {
  it('averages mean and minimum', () => {
    // ratings [80, 70, 60] -> mean=70, min=60 -> (70+60)/2=65
    expect(teamSynergyScore([80, 70, 60])).toBeCloseTo(65)
  })

  it('penalizes weak link', () => {
    const balanced = teamSynergyScore([70, 70, 70])
    const weakLink = teamSynergyScore([100, 100, 10])
    expect(balanced).toBeGreaterThan(weakLink)
  })

  it('returns 0 for empty array', () => {
    expect(teamSynergyScore([])).toBe(0)
  })

  it('returns the value for single element', () => {
    expect(teamSynergyScore([75])).toBeCloseTo(75)
  })

  it('returns same for uniform ratings', () => {
    expect(teamSynergyScore([80, 80, 80, 80, 80])).toBeCloseTo(80)
  })
})

// ---------------------------------------------------------------------------
// 7. Betting / prediction helpers
// ---------------------------------------------------------------------------

describe('eloExpectedScore', () => {
  it('returns 0.5 for equal ratings', () => {
    expect(eloExpectedScore(1500, 1500)).toBeCloseTo(0.5)
  })

  it('returns higher score for higher-rated player', () => {
    const e = eloExpectedScore(1700, 1500)
    expect(e).toBeGreaterThan(0.5)
  })

  it('returns lower score for lower-rated player', () => {
    const e = eloExpectedScore(1300, 1500)
    expect(e).toBeLessThan(0.5)
  })

  it('approaches 1 for massively higher rating', () => {
    const e = eloExpectedScore(3000, 1000)
    expect(e).toBeGreaterThan(0.99)
  })

  it('approaches 0 for massively lower rating', () => {
    const e = eloExpectedScore(1000, 3000)
    expect(e).toBeLessThan(0.01)
  })
})

describe('eloUpdate', () => {
  it('increases rating on win when expected to lose', () => {
    const updated = eloUpdate(1200, 0.3, 1)
    expect(updated).toBeGreaterThan(1200)
  })

  it('decreases rating on loss when expected to win', () => {
    const updated = eloUpdate(1800, 0.75, 0)
    expect(updated).toBeLessThan(1800)
  })

  it('remains same when result equals expected', () => {
    const updated = eloUpdate(1500, 0.5, 0.5)
    expect(updated).toBeCloseTo(1500)
  })

  it('uses custom kFactor', () => {
    const updated = eloUpdate(1500, 0.5, 1, 16)
    // rating + 16 * (1 - 0.5) = 1508
    expect(updated).toBeCloseTo(1508)
  })

  it('uses default k=32', () => {
    const updated = eloUpdate(1500, 0.5, 1)
    // rating + 32 * (1 - 0.5) = 1516
    expect(updated).toBeCloseTo(1516)
  })
})

describe('mapAdvantage', () => {
  it('computes team rate minus opponent rate for each map', () => {
    const teamRates = { dust2: 0.6, mirage: 0.55, inferno: 0.4 }
    const opponentRates = { dust2: 0.45, mirage: 0.7, inferno: 0.5 }
    const result = mapAdvantage(teamRates, opponentRates, ['dust2', 'mirage', 'inferno'])
    expect(result['dust2']).toBeCloseTo(0.15)
    expect(result['mirage']).toBeCloseTo(-0.15)
    expect(result['inferno']).toBeCloseTo(-0.1)
  })

  it('returns 0 for missing maps (defaults to 0)', () => {
    const result = mapAdvantage({}, {}, ['vertigo'])
    expect(result['vertigo']).toBeCloseTo(0)
  })

  it('returns empty object for empty contested maps', () => {
    const result = mapAdvantage({ dust2: 0.6 }, { dust2: 0.5 }, [])
    expect(Object.keys(result)).toHaveLength(0)
  })

  it('handles single map', () => {
    const result = mapAdvantage({ nuke: 0.8 }, { nuke: 0.4 }, ['nuke'])
    expect(result['nuke']).toBeCloseTo(0.4)
  })
})

describe('formRating', () => {
  it('returns 100 for all wins', () => {
    expect(formRating(['win', 'win', 'win'])).toBeCloseTo(100)
  })

  it('returns 0 for all losses', () => {
    expect(formRating(['loss', 'loss', 'loss'])).toBeCloseTo(0)
  })

  it('returns 50 for all draws', () => {
    expect(formRating(['draw', 'draw', 'draw'])).toBeCloseTo(50)
  })

  it('returns 0 for empty results', () => {
    expect(formRating([])).toBe(0)
  })

  it('weights most recent result highest', () => {
    // Single win most recent vs single win least recent (rest losses)
    // ['win', 'loss'] vs ['loss', 'win'] — win at index 0 (most recent) should score higher
    const recentWin = formRating(['win', 'loss'])
    const recentLoss = formRating(['loss', 'win'])
    expect(recentWin).toBeGreaterThan(recentLoss)
  })

  it('uses custom decay factor', () => {
    // decay=0.5: weights [1, 0.5] -> win=1*1=1, loss=0*0.5=0; total weight=1.5 -> 1/1.5*100=66.67
    const result = formRating(['win', 'loss'], 0.5)
    expect(result).toBeCloseTo(66.667)
  })

  it('handles single win', () => {
    expect(formRating(['win'])).toBeCloseTo(100)
  })

  it('handles single loss', () => {
    expect(formRating(['loss'])).toBeCloseTo(0)
  })

  it('handles mixed results with default decay', () => {
    const result = formRating(['win', 'loss', 'win', 'loss'])
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(100)
  })
})
