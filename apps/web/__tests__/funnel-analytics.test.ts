/**
 * Tests for funnel-analytics.ts — 95+ test cases covering all exported functions.
 */

import { describe, it, expect } from 'vitest'
import {
  buildFunnel,
  microFunnel,
  funnelCompare,
  lastTouchAttribution,
  firstTouchAttribution,
  linearAttribution,
  timeDecayAttribution,
  positionBasedAttribution,
  dataDrivernAttribution,
  sessionDuration,
  avgSessionDuration,
  bounceRate,
  pagesPerSession,
  eventFrequency,
  sessionsBySource,
  buildRetentionCohort,
  retentionAtPeriod,
  avgRetention,
  naturalRetentionCurve,
  ltv,
  cumulativeLtv,
  paybackPeriod,
  ltvToCacRatio,
  engagementScore,
  conversionLikelihoodScore,
  churnRiskScore,
  acquisitionRate,
  activationRate,
  revenuePerUser,
  referralRate,
  retentionRate,
  channelCtr,
  channelConversionRate,
  channelRoas,
  channelCpa,
  channelRankings,
  type FunnelStep,
  type TouchPoint,
  type UserSession,
  type ChannelMetrics,
} from '@/lib/analytics/funnel-analytics'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeStep(name: string, users: number): FunnelStep {
  return { name, users }
}

function makeTouch(source: string, timestamp: number, value?: number): TouchPoint {
  return { source, timestamp, value }
}

function makeSession(
  userId: string,
  sessionStart: number,
  sessionEnd: number,
  pageViews: number,
  events: string[]
): UserSession {
  return { userId, sessionStart, sessionEnd, pageViews, events }
}

function makeChan(
  channel: string,
  impressions: number,
  clicks: number,
  conversions: number,
  spend: number,
  revenue: number
): ChannelMetrics {
  return { channel, impressions, clicks, conversions, spend, revenue }
}

// ---------------------------------------------------------------------------
// buildFunnel
// ---------------------------------------------------------------------------

describe('buildFunnel', () => {
  it('returns correct number of steps', () => {
    const steps = [makeStep('A', 1000), makeStep('B', 600), makeStep('C', 300)]
    const result = buildFunnel(steps)
    expect(result.steps).toHaveLength(3)
  })

  it('step 1 has conversionFromPrev = 1', () => {
    const steps = [makeStep('A', 1000), makeStep('B', 600)]
    const result = buildFunnel(steps)
    expect(result.steps[0]!.conversionFromPrev).toBe(1)
  })

  it('step 1 has conversionFromTop = 1', () => {
    const steps = [makeStep('A', 1000), makeStep('B', 600)]
    const result = buildFunnel(steps)
    expect(result.steps[0]!.conversionFromTop).toBe(1)
  })

  it('computes conversionFromPrev correctly', () => {
    const steps = [makeStep('A', 1000), makeStep('B', 600), makeStep('C', 300)]
    const result = buildFunnel(steps)
    expect(result.steps[1]!.conversionFromPrev).toBeCloseTo(0.6)
    expect(result.steps[2]!.conversionFromPrev).toBeCloseTo(0.5)
  })

  it('computes conversionFromTop correctly', () => {
    const steps = [makeStep('A', 1000), makeStep('B', 600), makeStep('C', 200)]
    const result = buildFunnel(steps)
    expect(result.steps[1]!.conversionFromTop).toBeCloseTo(0.6)
    expect(result.steps[2]!.conversionFromTop).toBeCloseTo(0.2)
  })

  it('computes dropOff counts', () => {
    const steps = [makeStep('A', 1000), makeStep('B', 600), makeStep('C', 300)]
    const result = buildFunnel(steps)
    // Step 0: no previous, so dropOff = 0 (from itself)
    expect(result.steps[0]!.dropOff).toBe(0)
    expect(result.steps[1]!.dropOff).toBe(400)
    expect(result.steps[2]!.dropOff).toBe(300)
  })

  it('computes dropOffRate correctly', () => {
    const steps = [makeStep('A', 1000), makeStep('B', 600), makeStep('C', 300)]
    const result = buildFunnel(steps)
    expect(result.steps[1]!.dropOffRate).toBeCloseTo(0.4)
    expect(result.steps[2]!.dropOffRate).toBeCloseTo(0.5)
  })

  it('computes overallConversion correctly', () => {
    const steps = [makeStep('A', 1000), makeStep('B', 600), makeStep('C', 200)]
    const result = buildFunnel(steps)
    expect(result.overallConversion).toBeCloseTo(0.2)
  })

  it('identifies biggestDropOffStep', () => {
    const steps = [makeStep('A', 1000), makeStep('B', 900), makeStep('C', 400)]
    const result = buildFunnel(steps)
    // B: dropOffRate = 100/1000 = 0.1; C: 500/900 ≈ 0.555 → C is biggest
    expect(result.biggestDropOffStep).toBe('C')
  })

  it('handles single step', () => {
    const result = buildFunnel([makeStep('Only', 500)])
    expect(result.steps).toHaveLength(1)
    expect(result.overallConversion).toBe(1)
  })

  it('handles empty array', () => {
    const result = buildFunnel([])
    expect(result.steps).toHaveLength(0)
    expect(result.overallConversion).toBe(0)
    expect(result.biggestDropOffStep).toBe('')
  })

  it('handles 0 users at top', () => {
    const steps = [makeStep('A', 0), makeStep('B', 0)]
    const result = buildFunnel(steps)
    expect(result.overallConversion).toBe(0)
    expect(result.steps[0]!.conversionFromTop).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// microFunnel
// ---------------------------------------------------------------------------

describe('microFunnel', () => {
  it('creates step count = 1 + stepRates.length', () => {
    const result = microFunnel(1000, [0.6, 0.5, 0.4])
    expect(result.steps).toHaveLength(4)
  })

  it('step 1 users equals total', () => {
    const result = microFunnel(1000, [0.6, 0.5])
    expect(result.steps[0]!.users).toBe(1000)
  })

  it('computes step users from rates', () => {
    const result = microFunnel(1000, [0.6, 0.5])
    expect(result.steps[1]!.users).toBe(600)
    expect(result.steps[2]!.users).toBe(300)
  })

  it('zero rates produce 0 users downstream', () => {
    const result = microFunnel(1000, [0, 0.5])
    expect(result.steps[1]!.users).toBe(0)
    expect(result.steps[2]!.users).toBe(0)
  })

  it('empty stepRates returns single-step funnel', () => {
    const result = microFunnel(500, [])
    expect(result.steps).toHaveLength(1)
    expect(result.overallConversion).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// funnelCompare
// ---------------------------------------------------------------------------

describe('funnelCompare', () => {
  it('returns one entry per comparable step', () => {
    const a = [makeStep('A', 1000), makeStep('B', 500)]
    const b = [makeStep('A', 1000), makeStep('B', 700)]
    const result = funnelCompare(a, b)
    expect(result).toHaveLength(2)
  })

  it('correctly computes delta', () => {
    const a = [makeStep('A', 1000), makeStep('B', 500)]
    const b = [makeStep('A', 1000), makeStep('B', 700)]
    const result = funnelCompare(a, b)
    // step B: rateA = 0.5, rateB = 0.7, delta = 0.2
    expect(result[1]!.delta).toBeCloseTo(0.2)
  })

  it('sets improved=true when rateB > rateA', () => {
    const a = [makeStep('A', 1000), makeStep('B', 500)]
    const b = [makeStep('A', 1000), makeStep('B', 700)]
    const result = funnelCompare(a, b)
    expect(result[1]!.improved).toBe(true)
  })

  it('sets improved=false when rateB < rateA', () => {
    const a = [makeStep('A', 1000), makeStep('B', 700)]
    const b = [makeStep('A', 1000), makeStep('B', 400)]
    const result = funnelCompare(a, b)
    expect(result[1]!.improved).toBe(false)
  })

  it('limits to shorter funnel length', () => {
    const a = [makeStep('A', 1000), makeStep('B', 600), makeStep('C', 300)]
    const b = [makeStep('A', 1000), makeStep('B', 700)]
    const result = funnelCompare(a, b)
    expect(result).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// lastTouchAttribution
// ---------------------------------------------------------------------------

describe('lastTouchAttribution', () => {
  it('returns empty array for no touch points', () => {
    expect(lastTouchAttribution([])).toEqual([])
  })

  it('only last touch gets full credit of 1', () => {
    const touches = [
      makeTouch('google', 1000),
      makeTouch('facebook', 2000),
      makeTouch('email', 3000),
    ]
    const result = lastTouchAttribution(touches)
    const emailResult = result.find(r => r.source === 'email')
    const googleResult = result.find(r => r.source === 'google')
    expect(emailResult?.credits).toBe(1)
    expect(googleResult?.credits).toBe(0)
  })

  it('single touch point gets full credit', () => {
    const touches = [makeTouch('direct', 1000, 50)]
    const result = lastTouchAttribution(touches)
    expect(result).toHaveLength(1)
    expect(result[0]!.credits).toBe(1)
  })

  it('tracks revenue from all touches per source', () => {
    const touches = [
      makeTouch('google', 1000, 10),
      makeTouch('google', 2000, 20),
      makeTouch('email', 3000, 5),
    ]
    const result = lastTouchAttribution(touches)
    const googleResult = result.find(r => r.source === 'google')
    expect(googleResult?.revenue).toBe(30)
  })

  it('counts touchCount correctly', () => {
    const touches = [
      makeTouch('google', 1000),
      makeTouch('google', 2000),
      makeTouch('email', 3000),
    ]
    const result = lastTouchAttribution(touches)
    const googleResult = result.find(r => r.source === 'google')
    expect(googleResult?.touchCount).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// firstTouchAttribution
// ---------------------------------------------------------------------------

describe('firstTouchAttribution', () => {
  it('returns empty array for no touch points', () => {
    expect(firstTouchAttribution([])).toEqual([])
  })

  it('only first touch gets full credit', () => {
    const touches = [
      makeTouch('google', 1000),
      makeTouch('facebook', 2000),
      makeTouch('email', 3000),
    ]
    const result = firstTouchAttribution(touches)
    const googleResult = result.find(r => r.source === 'google')
    const emailResult = result.find(r => r.source === 'email')
    expect(googleResult?.credits).toBe(1)
    expect(emailResult?.credits).toBe(0)
  })

  it('single touch point gets full credit', () => {
    const touches = [makeTouch('organic', 5000)]
    const result = firstTouchAttribution(touches)
    expect(result[0]!.credits).toBe(1)
  })

  it('uses earliest timestamp as first touch', () => {
    const touches = [
      makeTouch('late', 9000),
      makeTouch('early', 1000),
      makeTouch('mid', 5000),
    ]
    const result = firstTouchAttribution(touches)
    const earlyResult = result.find(r => r.source === 'early')
    expect(earlyResult?.credits).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// linearAttribution
// ---------------------------------------------------------------------------

describe('linearAttribution', () => {
  it('returns empty array for no touch points', () => {
    expect(linearAttribution([])).toEqual([])
  })

  it('equal credit for 3 unique sources', () => {
    const touches = [
      makeTouch('google', 1000),
      makeTouch('facebook', 2000),
      makeTouch('email', 3000),
    ]
    const result = linearAttribution(touches)
    for (const r of result) {
      expect(r.credits).toBeCloseTo(1 / 3)
    }
  })

  it('credits sum to 1', () => {
    const touches = [
      makeTouch('a', 1000),
      makeTouch('b', 2000),
      makeTouch('c', 3000),
      makeTouch('d', 4000),
    ]
    const result = linearAttribution(touches)
    const total = result.reduce((sum, r) => sum + r.credits, 0)
    expect(total).toBeCloseTo(1)
  })

  it('single touch: credit = 1', () => {
    const result = linearAttribution([makeTouch('only', 1000)])
    expect(result[0]!.credits).toBe(1)
  })

  it('same source multiple times counts as one unique source for credit', () => {
    const touches = [
      makeTouch('google', 1000),
      makeTouch('google', 2000),
      makeTouch('email', 3000),
    ]
    const result = linearAttribution(touches)
    // 2 unique sources: google and email each get 0.5
    const googleResult = result.find(r => r.source === 'google')
    const emailResult = result.find(r => r.source === 'email')
    expect(googleResult?.credits).toBeCloseTo(0.5)
    expect(emailResult?.credits).toBeCloseTo(0.5)
  })
})

// ---------------------------------------------------------------------------
// timeDecayAttribution
// ---------------------------------------------------------------------------

describe('timeDecayAttribution', () => {
  it('returns empty array for no touch points', () => {
    expect(timeDecayAttribution([])).toEqual([])
  })

  it('most recent touch gets highest credit', () => {
    const now = Date.now()
    const touches = [
      makeTouch('old', now - 14 * 24 * 60 * 60 * 1000),
      makeTouch('recent', now),
    ]
    const result = timeDecayAttribution(touches)
    const oldResult = result.find(r => r.source === 'old')
    const recentResult = result.find(r => r.source === 'recent')
    expect(recentResult!.credits).toBeGreaterThan(oldResult!.credits)
  })

  it('credits sum to 1', () => {
    const now = Date.now()
    const touches = [
      makeTouch('a', now - 1000),
      makeTouch('b', now - 500),
      makeTouch('c', now),
    ]
    const result = timeDecayAttribution(touches)
    const total = result.reduce((sum, r) => sum + r.credits, 0)
    expect(total).toBeCloseTo(1)
  })

  it('single touch: credit = 1', () => {
    const result = timeDecayAttribution([makeTouch('only', 1000)])
    expect(result[0]!.credits).toBe(1)
  })

  it('respects custom halfLifeMs', () => {
    const touches = [
      makeTouch('older', 0),
      makeTouch('newer', 1000 * 60 * 60), // 1 hour later
    ]
    // With halfLife of 1 hour, the older touch should have 50% weight relative to the newer
    const result = timeDecayAttribution(touches, 1000 * 60 * 60)
    const newerResult = result.find(r => r.source === 'newer')
    const olderResult = result.find(r => r.source === 'older')
    // newer weight = 2^0 = 1, older weight = 2^(-1) = 0.5; total = 1.5
    // newer credit = 1/1.5 ≈ 0.667
    expect(newerResult!.credits).toBeCloseTo(1 / 1.5, 3)
    expect(olderResult!.credits).toBeCloseTo(0.5 / 1.5, 3)
  })
})

// ---------------------------------------------------------------------------
// positionBasedAttribution
// ---------------------------------------------------------------------------

describe('positionBasedAttribution', () => {
  it('returns empty array for no touch points', () => {
    expect(positionBasedAttribution([])).toEqual([])
  })

  it('first and last each get 40% for 3-touch journey with unique sources', () => {
    const touches = [
      makeTouch('first', 1000),
      makeTouch('middle', 2000),
      makeTouch('last', 3000),
    ]
    const result = positionBasedAttribution(touches)
    const firstResult = result.find(r => r.source === 'first')
    const lastResult = result.find(r => r.source === 'last')
    const middleResult = result.find(r => r.source === 'middle')
    expect(firstResult?.credits).toBeCloseTo(0.4)
    expect(lastResult?.credits).toBeCloseTo(0.4)
    expect(middleResult?.credits).toBeCloseTo(0.2)
  })

  it('credits sum to 1', () => {
    const touches = [
      makeTouch('a', 1000),
      makeTouch('b', 2000),
      makeTouch('c', 3000),
      makeTouch('d', 4000),
    ]
    const result = positionBasedAttribution(touches)
    const total = result.reduce((sum, r) => sum + r.credits, 0)
    expect(total).toBeCloseTo(1)
  })

  it('single touch: credit = 1', () => {
    const result = positionBasedAttribution([makeTouch('only', 1000)])
    expect(result[0]!.credits).toBe(1)
  })

  it('two touches: each gets respective weight', () => {
    const touches = [
      makeTouch('first', 1000),
      makeTouch('last', 2000),
    ]
    const result = positionBasedAttribution(touches)
    const total = result.reduce((sum, r) => sum + r.credits, 0)
    expect(total).toBeCloseTo(1)
  })

  it('supports custom weights', () => {
    const touches = [
      makeTouch('first', 1000),
      makeTouch('middle', 2000),
      makeTouch('last', 3000),
    ]
    const result = positionBasedAttribution(touches, 0.5, 0.3)
    const firstResult = result.find(r => r.source === 'first')
    const lastResult = result.find(r => r.source === 'last')
    expect(firstResult?.credits).toBeCloseTo(0.5)
    expect(lastResult?.credits).toBeCloseTo(0.3)
  })
})

// ---------------------------------------------------------------------------
// dataDrivernAttribution
// ---------------------------------------------------------------------------

describe('dataDrivernAttribution', () => {
  it('returns empty array for no touch points', () => {
    expect(dataDrivernAttribution([], 100)).toEqual([])
  })

  it('source with more touches gets more credit', () => {
    const touches = [
      makeTouch('google', 1000),
      makeTouch('google', 2000),
      makeTouch('email', 3000),
    ]
    const result = dataDrivernAttribution(touches, 100)
    const googleResult = result.find(r => r.source === 'google')
    const emailResult = result.find(r => r.source === 'email')
    expect(googleResult!.credits).toBeGreaterThan(emailResult!.credits)
  })

  it('credits sum to 1', () => {
    const touches = [
      makeTouch('a', 1000),
      makeTouch('b', 2000),
      makeTouch('a', 3000),
    ]
    const result = dataDrivernAttribution(touches, 50)
    const total = result.reduce((sum, r) => sum + r.credits, 0)
    expect(total).toBeCloseTo(1)
  })

  it('revenue is derived from conversionValue and credits', () => {
    const touches = [makeTouch('only', 1000)]
    const result = dataDrivernAttribution(touches, 200)
    expect(result[0]!.revenue).toBeCloseTo(200)
  })
})

// ---------------------------------------------------------------------------
// sessionDuration
// ---------------------------------------------------------------------------

describe('sessionDuration', () => {
  it('returns correct duration', () => {
    const session = makeSession('u1', 1000, 5000, 3, [])
    expect(sessionDuration(session)).toBe(4000)
  })

  it('returns 0 for same start and end', () => {
    const session = makeSession('u1', 1000, 1000, 1, [])
    expect(sessionDuration(session)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// avgSessionDuration
// ---------------------------------------------------------------------------

describe('avgSessionDuration', () => {
  it('returns 0 for empty array', () => {
    expect(avgSessionDuration([])).toBe(0)
  })

  it('computes average correctly', () => {
    const sessions = [
      makeSession('u1', 0, 1000, 1, []),
      makeSession('u2', 0, 3000, 2, []),
    ]
    expect(avgSessionDuration(sessions)).toBe(2000)
  })
})

// ---------------------------------------------------------------------------
// bounceRate
// ---------------------------------------------------------------------------

describe('bounceRate', () => {
  it('returns 0 for empty array', () => {
    expect(bounceRate([])).toBe(0)
  })

  it('counts sessions with pageViews <= 1', () => {
    const sessions = [
      makeSession('u1', 0, 1000, 1, []),
      makeSession('u2', 0, 2000, 5, []),
      makeSession('u3', 0, 3000, 0, []),
    ]
    // u1 (pageViews=1) and u3 (pageViews=0) are bounces
    expect(bounceRate(sessions)).toBeCloseTo(2 / 3)
  })

  it('returns 1 when all sessions bounced', () => {
    const sessions = [
      makeSession('u1', 0, 1000, 1, []),
      makeSession('u2', 0, 2000, 1, []),
    ]
    expect(bounceRate(sessions)).toBe(1)
  })

  it('returns 0 when no sessions bounced', () => {
    const sessions = [
      makeSession('u1', 0, 1000, 5, []),
      makeSession('u2', 0, 2000, 3, []),
    ]
    expect(bounceRate(sessions)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// pagesPerSession
// ---------------------------------------------------------------------------

describe('pagesPerSession', () => {
  it('returns 0 for empty array', () => {
    expect(pagesPerSession([])).toBe(0)
  })

  it('computes average correctly', () => {
    const sessions = [
      makeSession('u1', 0, 1000, 4, []),
      makeSession('u2', 0, 2000, 6, []),
    ]
    expect(pagesPerSession(sessions)).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// eventFrequency
// ---------------------------------------------------------------------------

describe('eventFrequency', () => {
  it('returns 0 for empty sessions', () => {
    expect(eventFrequency([], 'click')).toBe(0)
  })

  it('computes average occurrences of named event', () => {
    const sessions = [
      makeSession('u1', 0, 1000, 2, ['click', 'click', 'scroll']),
      makeSession('u2', 0, 2000, 3, ['click', 'scroll']),
    ]
    // u1 has 2 clicks, u2 has 1 click → avg = 1.5
    expect(eventFrequency(sessions, 'click')).toBeCloseTo(1.5)
  })

  it('returns 0 if event never occurs', () => {
    const sessions = [
      makeSession('u1', 0, 1000, 2, ['scroll', 'hover']),
    ]
    expect(eventFrequency(sessions, 'click')).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// sessionsBySource
// ---------------------------------------------------------------------------

describe('sessionsBySource', () => {
  it('groups and counts correctly', () => {
    const sessions = [
      makeSession('u1', 0, 1000, 2, []),
      makeSession('u2', 0, 2000, 3, []),
      makeSession('u3', 0, 3000, 4, []),
    ]
    const result = sessionsBySource(sessions, s => (s.pageViews > 2 ? 'engaged' : 'low'))
    expect(result['engaged']).toBe(2)
    expect(result['low']).toBe(1)
  })

  it('returns empty object for no sessions', () => {
    expect(sessionsBySource([], () => 'x')).toEqual({})
  })

  it('uses userId as key', () => {
    const sessions = [
      makeSession('u1', 0, 1000, 2, []),
      makeSession('u1', 0, 2000, 3, []),
      makeSession('u2', 0, 3000, 4, []),
    ]
    const result = sessionsBySource(sessions, s => s.userId)
    expect(result['u1']).toBe(2)
    expect(result['u2']).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// buildRetentionCohort
// ---------------------------------------------------------------------------

describe('buildRetentionCohort', () => {
  it('period 0 retained equals cohortSize', () => {
    const matrix = buildRetentionCohort(1000, 5, 0.1)
    expect(matrix.retained[0]).toBe(1000)
  })

  it('retained decreases monotonically', () => {
    const matrix = buildRetentionCohort(1000, 6, 0.15)
    for (let i = 1; i < matrix.retained.length; i++) {
      expect(matrix.retained[i]).toBeLessThanOrEqual(matrix.retained[i - 1]!)
    }
  })

  it('produces correct number of periods', () => {
    const matrix = buildRetentionCohort(500, 10, 0.1)
    expect(matrix.retained).toHaveLength(10)
    expect(matrix.rates).toHaveLength(10)
  })

  it('rates at period 0 = 1', () => {
    const matrix = buildRetentionCohort(200, 3, 0.2)
    expect(matrix.rates[0]).toBeCloseTo(1)
  })

  it('rate decreases over time', () => {
    const matrix = buildRetentionCohort(1000, 5, 0.2)
    for (let i = 1; i < matrix.rates.length; i++) {
      expect(matrix.rates[i]).toBeLessThanOrEqual(matrix.rates[i - 1]!)
    }
  })
})

// ---------------------------------------------------------------------------
// retentionAtPeriod
// ---------------------------------------------------------------------------

describe('retentionAtPeriod', () => {
  it('returns rate at valid period', () => {
    const matrix = buildRetentionCohort(1000, 5, 0.1)
    expect(retentionAtPeriod(matrix, 0)).toBeCloseTo(1)
  })

  it('returns 0 for out-of-range period', () => {
    const matrix = buildRetentionCohort(1000, 3, 0.1)
    expect(retentionAtPeriod(matrix, 10)).toBe(0)
  })

  it('returns 0 for negative period', () => {
    const matrix = buildRetentionCohort(1000, 3, 0.1)
    expect(retentionAtPeriod(matrix, -1)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// avgRetention
// ---------------------------------------------------------------------------

describe('avgRetention', () => {
  it('averages all periods when upToPeriod omitted', () => {
    const matrix = buildRetentionCohort(1000, 4, 0)
    // With 0 churn, all rates = 1
    expect(avgRetention(matrix)).toBeCloseTo(1)
  })

  it('respects upToPeriod cap', () => {
    const matrix = buildRetentionCohort(1000, 5, 0.5)
    const fullAvg = avgRetention(matrix)
    const partialAvg = avgRetention(matrix, 1)
    // Average over first 2 periods only
    expect(partialAvg).not.toBe(fullAvg)
  })

  it('returns 0 for empty matrix', () => {
    const matrix = buildRetentionCohort(1000, 0, 0.1)
    expect(avgRetention(matrix)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// naturalRetentionCurve
// ---------------------------------------------------------------------------

describe('naturalRetentionCurve', () => {
  it('extracts l30, l60, l90 from rates array', () => {
    const rates = Array.from({ length: 100 }, (_, i) => Math.pow(0.95, i))
    const { l30, l60, l90 } = naturalRetentionCurve(rates)
    expect(l30).toBeCloseTo(Math.pow(0.95, 30))
    expect(l60).toBeCloseTo(Math.pow(0.95, 60))
    expect(l90).toBeCloseTo(Math.pow(0.95, 90))
  })

  it('returns last known rate when period exceeds array', () => {
    const rates = [1, 0.8, 0.6]
    const { l30, l60, l90 } = naturalRetentionCurve(rates)
    // All periods exceed length 3, so return last known (0.6)
    expect(l30).toBe(0.6)
    expect(l60).toBe(0.6)
    expect(l90).toBe(0.6)
  })

  it('returns 0 for empty array', () => {
    const { l30, l60, l90 } = naturalRetentionCurve([])
    expect(l30).toBe(0)
    expect(l60).toBe(0)
    expect(l90).toBe(0)
  })

  it('returns exact rate at period 30', () => {
    const rates = Array.from({ length: 91 }, (_, i) => 1 - i * 0.01)
    const { l30 } = naturalRetentionCurve(rates)
    expect(l30).toBeCloseTo(0.7)
  })
})

// ---------------------------------------------------------------------------
// ltv
// ---------------------------------------------------------------------------

describe('ltv', () => {
  it('returns arpu / churnRate for infinite periods', () => {
    expect(ltv(10, 0.1)).toBeCloseTo(100)
  })

  it('returns Infinity when churnRate is 0', () => {
    expect(ltv(10, 0)).toBe(Infinity)
  })

  it('computes finite-period LTV correctly', () => {
    const result = ltv(10, 0.1, 1)
    // arpu * (1 - (1 - 0.1)^1) / 0.1 = 10 * 0.1 / 0.1 = 10
    expect(result).toBeCloseTo(10)
  })

  it('finite LTV approaches infinite LTV for large periods', () => {
    const infinite = ltv(10, 0.1)
    const largePeriod = ltv(10, 0.1, 1000)
    expect(largePeriod).toBeCloseTo(infinite, 0)
  })

  it('finite LTV is always <= infinite LTV', () => {
    for (const periods of [1, 5, 10, 50]) {
      expect(ltv(10, 0.2, periods)).toBeLessThanOrEqual(ltv(10, 0.2))
    }
  })
})

// ---------------------------------------------------------------------------
// cumulativeLtv
// ---------------------------------------------------------------------------

describe('cumulativeLtv', () => {
  it('returns array of length periods', () => {
    const result = cumulativeLtv(10, 0.1, 5)
    expect(result).toHaveLength(5)
  })

  it('values are strictly increasing', () => {
    const result = cumulativeLtv(10, 0.1, 10)
    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThan(result[i - 1]!)
    }
  })

  it('first element equals ltv at period 1', () => {
    const result = cumulativeLtv(10, 0.2, 5)
    expect(result[0]).toBeCloseTo(ltv(10, 0.2, 1))
  })
})

// ---------------------------------------------------------------------------
// paybackPeriod
// ---------------------------------------------------------------------------

describe('paybackPeriod', () => {
  it('returns finite period when LTV eventually covers CAC', () => {
    const period = paybackPeriod(50, 10, 0.1)
    // LTV at period N ≈ 10/0.1 = 100, need 50 → should be covered quickly
    expect(period).toBeGreaterThan(0)
    expect(period).toBeLessThan(Infinity)
  })

  it('returns Infinity when arpu = 0', () => {
    expect(paybackPeriod(100, 0, 0.1)).toBe(Infinity)
  })

  it('payback period increases with higher CAC', () => {
    const p1 = paybackPeriod(50, 10, 0.1)
    const p2 = paybackPeriod(100, 10, 0.1)
    expect(p2).toBeGreaterThanOrEqual(p1)
  })

  it('cumulative LTV at payback period >= CAC', () => {
    const cac = 50
    const arpu = 10
    const churn = 0.1
    const period = paybackPeriod(cac, arpu, churn)
    if (isFinite(period)) {
      expect(ltv(arpu, churn, period)).toBeGreaterThanOrEqual(cac)
    }
  })
})

// ---------------------------------------------------------------------------
// ltvToCacRatio
// ---------------------------------------------------------------------------

describe('ltvToCacRatio', () => {
  it('computes ltv / cac', () => {
    expect(ltvToCacRatio(300, 100)).toBe(3)
  })

  it('returns Infinity when cac = 0', () => {
    expect(ltvToCacRatio(300, 0)).toBe(Infinity)
  })

  it('returns 0 when ltv = 0', () => {
    expect(ltvToCacRatio(0, 100)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// engagementScore
// ---------------------------------------------------------------------------

describe('engagementScore', () => {
  it('returns a value between 0 and 100', () => {
    const score = engagementScore(5, 150000, 10, 15)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('returns 100 for max inputs', () => {
    const score = engagementScore(10, 300000, 20, 30)
    expect(score).toBe(100)
  })

  it('higher inputs produce higher score', () => {
    const low = engagementScore(1, 30000, 2, 3)
    const high = engagementScore(8, 240000, 16, 24)
    expect(high).toBeGreaterThan(low)
  })

  it('returns 0 for all zero inputs', () => {
    expect(engagementScore(0, 0, 0, 0)).toBe(0)
  })

  it('custom weights are applied', () => {
    // With all weight on sessions, only sessions matter
    const s1 = engagementScore(10, 0, 0, 0, { sessions: 1, duration: 0, pageViews: 0, events: 0 })
    const s2 = engagementScore(0, 300000, 20, 30, { sessions: 1, duration: 0, pageViews: 0, events: 0 })
    expect(s1).toBe(100)
    expect(s2).toBe(0)
  })

  it('caps at 100 for above-max inputs', () => {
    const score = engagementScore(100, 9999999, 200, 300)
    expect(score).toBe(100)
  })
})

// ---------------------------------------------------------------------------
// conversionLikelihoodScore
// ---------------------------------------------------------------------------

describe('conversionLikelihoodScore', () => {
  it('returns value between 0 and 100', () => {
    const score = conversionLikelihoodScore(15, 3, 60, 2)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('returns 100 for max inputs', () => {
    const score = conversionLikelihoodScore(30, 5, 100, 3)
    expect(score).toBe(100)
  })

  it('returns 0 for all zero inputs', () => {
    expect(conversionLikelihoodScore(0, 0, 0, 0)).toBe(0)
  })

  it('clamps output to 0-100', () => {
    // Extreme inputs should not exceed 100
    const score = conversionLikelihoodScore(999, 999, 999, 999)
    expect(score).toBe(100)
  })

  it('higher inputs lead to higher score', () => {
    const low = conversionLikelihoodScore(1, 1, 10, 0)
    const high = conversionLikelihoodScore(25, 4, 80, 2)
    expect(high).toBeGreaterThan(low)
  })
})

// ---------------------------------------------------------------------------
// churnRiskScore
// ---------------------------------------------------------------------------

describe('churnRiskScore', () => {
  it('high daysSinceLastActive → high score', () => {
    const low = churnRiskScore(1, false, 0, 0)
    const high = churnRiskScore(60, false, 0, 0)
    expect(high).toBeGreaterThan(low)
  })

  it('declining engagement adds to score', () => {
    const without = churnRiskScore(5, false, 0, 0)
    const withDecline = churnRiskScore(5, true, 0, 0)
    expect(withDecline).toBeGreaterThan(without)
  })

  it('support tickets add to score', () => {
    const base = churnRiskScore(5, false, 0, 0)
    const withTickets = churnRiskScore(5, false, 5, 0)
    expect(withTickets).toBeGreaterThan(base)
  })

  it('billing issues add to score', () => {
    const base = churnRiskScore(5, false, 0, 0)
    const withBilling = churnRiskScore(5, false, 0, 3)
    expect(withBilling).toBeGreaterThan(base)
  })

  it('returns value between 0 and 100', () => {
    const score = churnRiskScore(0, false, 0, 0)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('max risk conditions = 100', () => {
    const score = churnRiskScore(60, true, 5, 3)
    expect(score).toBe(100)
  })
})

// ---------------------------------------------------------------------------
// AARRR metrics
// ---------------------------------------------------------------------------

describe('acquisitionRate', () => {
  it('returns newUsers / totalMarketingReach', () => {
    expect(acquisitionRate(100, 1000)).toBeCloseTo(0.1)
  })

  it('returns 0 when reach is 0', () => {
    expect(acquisitionRate(100, 0)).toBe(0)
  })
})

describe('activationRate', () => {
  it('returns activatedUsers / newUsers', () => {
    expect(activationRate(80, 100)).toBeCloseTo(0.8)
  })

  it('returns 0 when newUsers is 0', () => {
    expect(activationRate(50, 0)).toBe(0)
  })
})

describe('revenuePerUser', () => {
  it('returns totalRevenue / payingUsers', () => {
    expect(revenuePerUser(5000, 100)).toBeCloseTo(50)
  })

  it('returns 0 when payingUsers is 0', () => {
    expect(revenuePerUser(5000, 0)).toBe(0)
  })
})

describe('referralRate', () => {
  it('returns referrals / totalUsers', () => {
    expect(referralRate(30, 100)).toBeCloseTo(0.3)
  })

  it('returns 0 when totalUsers is 0', () => {
    expect(referralRate(30, 0)).toBe(0)
  })
})

describe('retentionRate', () => {
  it('returns retained / cohortSize', () => {
    expect(retentionRate(75, 100)).toBeCloseTo(0.75)
  })

  it('returns 0 when cohortSize is 0', () => {
    expect(retentionRate(50, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Channel analytics
// ---------------------------------------------------------------------------

describe('channelCtr', () => {
  it('returns clicks / impressions', () => {
    const chan = makeChan('google', 10000, 500, 50, 1000, 5000)
    expect(channelCtr(chan)).toBeCloseTo(0.05)
  })

  it('returns 0 when impressions = 0', () => {
    const chan = makeChan('google', 0, 0, 0, 0, 0)
    expect(channelCtr(chan)).toBe(0)
  })
})

describe('channelConversionRate', () => {
  it('returns conversions / clicks', () => {
    const chan = makeChan('google', 10000, 500, 50, 1000, 5000)
    expect(channelConversionRate(chan)).toBeCloseTo(0.1)
  })

  it('returns 0 when clicks = 0', () => {
    const chan = makeChan('google', 0, 0, 0, 0, 0)
    expect(channelConversionRate(chan)).toBe(0)
  })
})

describe('channelRoas', () => {
  it('returns revenue / spend', () => {
    const chan = makeChan('google', 10000, 500, 50, 1000, 5000)
    expect(channelRoas(chan)).toBeCloseTo(5)
  })

  it('returns 0 when spend = 0', () => {
    const chan = makeChan('google', 0, 0, 0, 0, 1000)
    expect(channelRoas(chan)).toBe(0)
  })
})

describe('channelCpa', () => {
  it('returns spend / conversions', () => {
    const chan = makeChan('google', 10000, 500, 50, 1000, 5000)
    expect(channelCpa(chan)).toBeCloseTo(20)
  })

  it('returns 0 when conversions = 0', () => {
    const chan = makeChan('google', 1000, 100, 0, 500, 0)
    expect(channelCpa(chan)).toBe(0)
  })
})

describe('channelRankings', () => {
  it('ranks by ROAS descending (rank 1 = best)', () => {
    const channels = [
      makeChan('email', 1000, 200, 20, 100, 1000),   // ROAS = 10
      makeChan('google', 5000, 500, 50, 500, 2500),   // ROAS = 5
      makeChan('social', 2000, 300, 30, 600, 900),    // ROAS = 1.5
    ]
    const result = channelRankings(channels)
    const emailRank = result.find(r => r.channel === 'email')
    const googleRank = result.find(r => r.channel === 'google')
    const socialRank = result.find(r => r.channel === 'social')
    expect(emailRank?.rank).toBe(1)
    expect(googleRank?.rank).toBe(2)
    expect(socialRank?.rank).toBe(3)
  })

  it('returns empty array for no channels', () => {
    expect(channelRankings([])).toEqual([])
  })

  it('preserves all original fields', () => {
    const chan = makeChan('test', 100, 10, 1, 50, 200)
    const result = channelRankings([chan])
    expect(result[0]!.channel).toBe('test')
    expect(result[0]!.impressions).toBe(100)
    expect(result[0]!.rank).toBe(1)
  })

  it('assigns sequential ranks 1..n', () => {
    const channels = [
      makeChan('a', 1000, 100, 10, 50, 500),
      makeChan('b', 1000, 100, 10, 50, 200),
      makeChan('c', 1000, 100, 10, 50, 800),
    ]
    const result = channelRankings(channels)
    const ranks = result.map(r => r.rank).sort((a, b) => a - b)
    expect(ranks).toEqual([1, 2, 3])
  })
})
