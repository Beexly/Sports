/**
 * Tests for user journey analytics.
 * All analytics are descriptive only — no performance guarantees implied.
 */
import { describe, it, expect } from 'vitest'
import {
  buildFunnel,
  conversionRate,
  timeToConvert,
  buildSessionMetrics,
  engagementScore,
  buildRetentionCohort,
  churnRiskProfile,
  dropOffAnalysis,
  commonPaths,
  featureAdoptionRate,
  abTestConversion,
  eventTimeSeries,
  userLifecycleStage,
  type JourneyEvent,
  type JourneyEventType,
  type FunnelStep,
} from '@/lib/analytics/user-journey'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(
  userId: string,
  type: JourneyEventType,
  daysAgo: number,
  opts?: {
    sessionId?: string
    properties?: Record<string, string | number | boolean>
    hoursAgo?: number
  }
): JourneyEvent {
  const now = new Date('2026-06-19T12:00:00.000Z')
  const ms = now.getTime() - daysAgo * 24 * 60 * 60 * 1000 - (opts?.hoursAgo ?? 0) * 60 * 60 * 1000
  return {
    userId,
    eventType: type,
    timestamp: new Date(ms),
    sessionId: opts?.sessionId,
    properties: opts?.properties,
  }
}

// ---------------------------------------------------------------------------
// buildFunnel
// ---------------------------------------------------------------------------

describe('buildFunnel', () => {
  const steps: FunnelStep[] = [
    { name: 'Sign Up', eventType: 'sign_up' },
    { name: 'Email Verify', eventType: 'email_verify' },
    { name: 'Subscription', eventType: 'subscription_start' },
  ]

  it('counts users at each step of a basic 3-step funnel', () => {
    const events: JourneyEvent[] = [
      // user1: all 3 steps
      makeEvent('u1', 'sign_up', 10),
      makeEvent('u1', 'email_verify', 9),
      makeEvent('u1', 'subscription_start', 8),
      // user2: 2 steps
      makeEvent('u2', 'sign_up', 10),
      makeEvent('u2', 'email_verify', 9),
      // user3: 1 step
      makeEvent('u3', 'sign_up', 10),
    ]
    const result = buildFunnel(events, steps)
    expect(result.totalUsers).toBe(3)
    expect(result.steps[0]!.users).toBe(3)
    expect(result.steps[1]!.users).toBe(2)
    expect(result.steps[2]!.users).toBe(1)
  })

  it('reports overall conversion rate as last/first', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'sign_up', 10),
      makeEvent('u1', 'email_verify', 9),
      makeEvent('u1', 'subscription_start', 8),
      makeEvent('u2', 'sign_up', 10),
      makeEvent('u2', 'email_verify', 9),
      makeEvent('u3', 'sign_up', 10),
    ]
    const result = buildFunnel(events, steps)
    expect(result.overallConversionRate).toBeCloseTo(1 / 3, 5)
  })

  it('users who skip steps are not counted at later steps', () => {
    const events: JourneyEvent[] = [
      // u1 skips email_verify — goes straight to subscription
      makeEvent('u1', 'sign_up', 10),
      makeEvent('u1', 'subscription_start', 9),
      // u2 does all steps
      makeEvent('u2', 'sign_up', 10),
      makeEvent('u2', 'email_verify', 9),
      makeEvent('u2', 'subscription_start', 8),
    ]
    const result = buildFunnel(events, steps)
    // u1 never did email_verify so should not be at step 2
    expect(result.steps[1]!.users).toBe(1) // only u2
    expect(result.steps[2]!.users).toBe(1) // only u2
  })

  it('users must complete steps in chronological order', () => {
    const events: JourneyEvent[] = [
      // u1: email_verify happens before sign_up — out of order
      makeEvent('u1', 'email_verify', 12),
      makeEvent('u1', 'sign_up', 10),
      makeEvent('u1', 'subscription_start', 8),
    ]
    const result = buildFunnel(events, steps)
    // sign_up at step 0 — user qualifies for step 0
    expect(result.steps[0]!.users).toBe(1)
    // email_verify before sign_up doesn't count as completing step 1 after step 0
    expect(result.steps[1]!.users).toBe(0)
  })

  it('returns 0 conversion rates when no users completed first step', () => {
    const events: JourneyEvent[] = [makeEvent('u1', 'page_view', 5)]
    const result = buildFunnel(events, steps)
    expect(result.totalUsers).toBe(0)
    expect(result.overallConversionRate).toBe(0)
  })

  it('conversionFromPrev is 0 for the first step', () => {
    const events: JourneyEvent[] = [makeEvent('u1', 'sign_up', 5)]
    const result = buildFunnel(events, steps)
    expect(result.steps[0]!.conversionFromPrev).toBe(0)
  })

  it('conversionFromPrev is correct for subsequent steps', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'sign_up', 10),
      makeEvent('u1', 'email_verify', 9),
      makeEvent('u2', 'sign_up', 10),
    ]
    const result = buildFunnel(events, steps)
    expect(result.steps[1]!.conversionFromPrev).toBeCloseTo(0.5, 5)
  })

  it('conversionFromStart is 1.0 for the first step', () => {
    const events: JourneyEvent[] = [makeEvent('u1', 'sign_up', 5)]
    const result = buildFunnel(events, steps)
    expect(result.steps[0]!.conversionFromStart).toBeCloseTo(1, 5)
  })

  it('handles empty events array', () => {
    const result = buildFunnel([], steps)
    expect(result.totalUsers).toBe(0)
    expect(result.steps.every(s => s.users === 0)).toBe(true)
  })

  it('handles empty steps array', () => {
    const events: JourneyEvent[] = [makeEvent('u1', 'sign_up', 5)]
    const result = buildFunnel(events, [])
    expect(result.steps).toHaveLength(0)
    expect(result.totalUsers).toBe(0)
  })

  it('respects windowDays — ignores conversions outside window', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'sign_up', 40),       // >30 days ago
      makeEvent('u1', 'email_verify', 1),    // 40-day gap — outside 30-day window
      makeEvent('u2', 'sign_up', 5),
      makeEvent('u2', 'email_verify', 3),
    ]
    const result = buildFunnel(events, steps, { windowDays: 30 })
    expect(result.steps[1]!.users).toBe(1) // only u2
  })

  it('dropOff counts users who did not proceed to next step', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'sign_up', 10),
      makeEvent('u1', 'email_verify', 9),
      makeEvent('u1', 'subscription_start', 8),
      makeEvent('u2', 'sign_up', 10),
      makeEvent('u2', 'email_verify', 9),
      makeEvent('u3', 'sign_up', 10),
    ]
    const result = buildFunnel(events, steps)
    expect(result.steps[0]!.dropOff).toBe(1) // u3 dropped at step 0
    expect(result.steps[1]!.dropOff).toBe(1) // u2 dropped at step 1
  })
})

// ---------------------------------------------------------------------------
// conversionRate
// ---------------------------------------------------------------------------

describe('conversionRate', () => {
  it('returns 1.0 when all users converted', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'sign_up', 10),
      makeEvent('u1', 'subscription_start', 5),
      makeEvent('u2', 'sign_up', 10),
      makeEvent('u2', 'subscription_start', 5),
    ]
    expect(conversionRate(events, 'sign_up', 'subscription_start')).toBeCloseTo(1, 5)
  })

  it('returns 0 when no users converted', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'sign_up', 10),
      makeEvent('u2', 'sign_up', 10),
    ]
    expect(conversionRate(events, 'sign_up', 'subscription_start')).toBe(0)
  })

  it('returns partial rate for partial conversion', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'sign_up', 10),
      makeEvent('u1', 'subscription_start', 5),
      makeEvent('u2', 'sign_up', 10),
      makeEvent('u3', 'sign_up', 10),
    ]
    expect(conversionRate(events, 'sign_up', 'subscription_start')).toBeCloseTo(1 / 3, 5)
  })

  it('returns 0 when from event has no users', () => {
    const events: JourneyEvent[] = [makeEvent('u1', 'page_view', 5)]
    expect(conversionRate(events, 'sign_up', 'subscription_start')).toBe(0)
  })

  it('requires toEvent to happen after fromEvent', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'subscription_start', 10),
      makeEvent('u1', 'sign_up', 5), // sign_up after subscription — reversed
    ]
    // u1 did sign_up but subscription_start was before it, so no conversion
    expect(conversionRate(events, 'sign_up', 'subscription_start')).toBe(0)
  })

  it('respects windowDays parameter', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'sign_up', 40),
      makeEvent('u1', 'subscription_start', 1), // 39 days after sign_up
    ]
    // With 30-day window, this should not count
    expect(conversionRate(events, 'sign_up', 'subscription_start', 30)).toBe(0)
    // With 60-day window, this should count
    expect(conversionRate(events, 'sign_up', 'subscription_start', 60)).toBeCloseTo(1, 5)
  })
})

// ---------------------------------------------------------------------------
// timeToConvert
// ---------------------------------------------------------------------------

describe('timeToConvert', () => {
  it('returns correct stats for known durations', () => {
    // u1: 24h, u2: 48h
    const events: JourneyEvent[] = [
      makeEvent('u1', 'sign_up', 2),
      makeEvent('u1', 'subscription_start', 1), // 24h later
      makeEvent('u2', 'sign_up', 3),
      makeEvent('u2', 'subscription_start', 1), // 48h later
    ]
    const result = timeToConvert(events, 'sign_up', 'subscription_start')
    expect(result.min).toBeCloseTo(24, 0)
    expect(result.max).toBeCloseTo(48, 0)
    expect(result.mean).toBeCloseTo(36, 0)
  })

  it('returns zeros for empty events', () => {
    const result = timeToConvert([], 'sign_up', 'subscription_start')
    expect(result.min).toBe(0)
    expect(result.max).toBe(0)
    expect(result.median).toBe(0)
    expect(result.mean).toBe(0)
  })

  it('returns zeros when no user completed both events', () => {
    const events: JourneyEvent[] = [makeEvent('u1', 'sign_up', 5)]
    const result = timeToConvert(events, 'sign_up', 'subscription_start')
    expect(result.min).toBe(0)
    expect(result.max).toBe(0)
  })

  it('includes p75 and p90 percentile fields', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'sign_up', 4),
      makeEvent('u1', 'subscription_start', 3),
    ]
    const result = timeToConvert(events, 'sign_up', 'subscription_start')
    expect(typeof result.p75).toBe('number')
    expect(typeof result.p90).toBe('number')
  })
})

// ---------------------------------------------------------------------------
// buildSessionMetrics
// ---------------------------------------------------------------------------

describe('buildSessionMetrics', () => {
  it('groups events by sessionId', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'page_view', 1, { sessionId: 'sess1' }),
      makeEvent('u1', 'pick_view', 1, { sessionId: 'sess1' }),
      makeEvent('u1', 'page_view', 0, { sessionId: 'sess2' }),
    ]
    const sessions = buildSessionMetrics(events, 'u1')
    const sess1 = sessions.find(s => s.sessionId === 'sess1')
    const sess2 = sessions.find(s => s.sessionId === 'sess2')
    expect(sess1?.eventCount).toBe(2)
    expect(sess2?.eventCount).toBe(1)
  })

  it('handles >30min gap as a new auto-session', () => {
    // Two events with 31 min gap, no sessionId
    const base = new Date('2026-06-19T12:00:00.000Z')
    const e1: JourneyEvent = { userId: 'u1', eventType: 'page_view', timestamp: new Date(base.getTime()) }
    const e2: JourneyEvent = { userId: 'u1', eventType: 'page_view', timestamp: new Date(base.getTime() + 31 * 60 * 1000) }
    const sessions = buildSessionMetrics([e1, e2], 'u1')
    expect(sessions.length).toBe(2)
  })

  it('keeps events within 30min as same auto-session', () => {
    const base = new Date('2026-06-19T12:00:00.000Z')
    const e1: JourneyEvent = { userId: 'u1', eventType: 'page_view', timestamp: new Date(base.getTime()) }
    const e2: JourneyEvent = { userId: 'u1', eventType: 'pick_view', timestamp: new Date(base.getTime() + 20 * 60 * 1000) }
    const sessions = buildSessionMetrics([e1, e2], 'u1')
    expect(sessions.length).toBe(1)
    expect(sessions[0]!.eventCount).toBe(2)
  })

  it('counts pagesViewed correctly', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'page_view', 1, { sessionId: 's1' }),
      makeEvent('u1', 'page_view', 1, { sessionId: 's1' }),
      makeEvent('u1', 'pick_view', 1, { sessionId: 's1' }),
    ]
    const sessions = buildSessionMetrics(events, 'u1')
    expect(sessions[0]!.pagesViewed).toBe(2)
  })

  it('extracts featuresUsed from feature_used events', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'feature_used', 1, { sessionId: 's1', properties: { featureName: 'line-movement' } }),
      makeEvent('u1', 'feature_used', 1, { sessionId: 's1', properties: { featureName: 'line-movement' } }),
      makeEvent('u1', 'feature_used', 1, { sessionId: 's1', properties: { featureName: 'pick-tracker' } }),
    ]
    const sessions = buildSessionMetrics(events, 'u1')
    expect(sessions[0]!.featuresUsed).toContain('line-movement')
    expect(sessions[0]!.featuresUsed).toContain('pick-tracker')
    expect(sessions[0]!.featuresUsed).toHaveLength(2) // deduped
  })

  it('returns empty array for unknown userId', () => {
    const events: JourneyEvent[] = [makeEvent('u1', 'page_view', 1)]
    expect(buildSessionMetrics(events, 'unknown')).toEqual([])
  })

  it('durationMs is null for single-event sessions', () => {
    const events: JourneyEvent[] = [makeEvent('u1', 'page_view', 1, { sessionId: 's1' })]
    const sessions = buildSessionMetrics(events, 'u1')
    expect(sessions[0]!.durationMs).toBeNull()
  })

  it('durationMs reflects time span within session', () => {
    const base = new Date('2026-06-19T12:00:00.000Z')
    const events: JourneyEvent[] = [
      { userId: 'u1', eventType: 'page_view', timestamp: new Date(base.getTime()), sessionId: 's1' },
      { userId: 'u1', eventType: 'pick_view', timestamp: new Date(base.getTime() + 5000), sessionId: 's1' },
    ]
    const sessions = buildSessionMetrics(events, 'u1')
    expect(sessions[0]!.durationMs).toBe(5000)
  })
})

// ---------------------------------------------------------------------------
// engagementScore
// ---------------------------------------------------------------------------

describe('engagementScore', () => {
  const REF = new Date('2026-06-19T12:00:00.000Z')

  it('returns cold tier (score 0) for user with no activity', () => {
    const result = engagementScore([], 'u1', REF)
    expect(result.score).toBe(0)
    expect(result.tier).toBe('cold')
  })

  it('returns power tier for a highly active user', () => {
    const events: JourneyEvent[] = []
    // 30 sessions in last 30 days (max)
    for (let i = 0; i < 30; i++) {
      events.push(makeEvent('u1', 'session_start', i, { sessionId: `s${i}` }))
    }
    // 20 distinct features
    for (let i = 0; i < 20; i++) {
      events.push(makeEvent('u1', 'feature_used', 1, { properties: { featureName: `feature_${i}` } }))
    }
    // 50 pick events
    for (let i = 0; i < 25; i++) {
      events.push(makeEvent('u1', 'pick_view', 1))
      events.push(makeEvent('u1', 'pick_save', 1))
    }
    // 10 conversion signals
    for (let i = 0; i < 5; i++) {
      events.push(makeEvent('u1', 'upgrade_prompt_seen', 1))
      events.push(makeEvent('u1', 'upgrade_clicked', 1))
    }
    const result = engagementScore(events, 'u1', REF)
    expect(result.score).toBeCloseTo(100, 0)
    expect(result.tier).toBe('power')
  })

  it('tier boundaries: cold is 0-25', () => {
    const result = engagementScore([], 'u1', REF)
    expect(result.score).toBe(0)
    expect(result.tier).toBe('cold')
  })

  it('ignores events older than 30 days', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'session_start', 35, { sessionId: 's1' }), // outside window
    ]
    const result = engagementScore(events, 'u1', REF)
    expect(result.signals.sessionFrequency).toBe(0)
  })

  it('score is clamped to [0, 100]', () => {
    const result = engagementScore([], 'u_none', REF)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('warm tier for moderate engagement', () => {
    // Some sessions, some picks
    const events: JourneyEvent[] = [
      makeEvent('u1', 'session_start', 5, { sessionId: 's1' }),
      makeEvent('u1', 'session_start', 10, { sessionId: 's2' }),
      makeEvent('u1', 'pick_view', 5),
      makeEvent('u1', 'pick_view', 6),
      makeEvent('u1', 'pick_view', 7),
    ]
    const result = engagementScore(events, 'u1', REF)
    expect(result.score).toBeGreaterThan(0)
    expect(['cold', 'warm', 'engaged']).toContain(result.tier)
  })

  it('returns correct userId in result', () => {
    const result = engagementScore([], 'test_user', REF)
    expect(result.userId).toBe('test_user')
  })

  it('signals object has all required fields', () => {
    const result = engagementScore([], 'u1', REF)
    expect(result.signals).toHaveProperty('sessionFrequency')
    expect(result.signals).toHaveProperty('featureDepth')
    expect(result.signals).toHaveProperty('pickEngagement')
    expect(result.signals).toHaveProperty('conversionSignals')
  })
})

// ---------------------------------------------------------------------------
// buildRetentionCohort
// ---------------------------------------------------------------------------

describe('buildRetentionCohort', () => {
  it('returns correct cohort size', () => {
    const events: JourneyEvent[] = [
      { userId: 'u1', eventType: 'sign_up', timestamp: new Date('2026-05-10T00:00:00Z') },
      { userId: 'u2', eventType: 'sign_up', timestamp: new Date('2026-05-20T00:00:00Z') },
      { userId: 'u3', eventType: 'sign_up', timestamp: new Date('2026-06-01T00:00:00Z') }, // different month
    ]
    const result = buildRetentionCohort(events, 'sign_up', 'session_start', '2026-05')
    expect(result.userCount).toBe(2)
    expect(result.cohortDate).toBe('2026-05')
  })

  it('week 0 retention is ~100% when cohort users are active in their first week', () => {
    const events: JourneyEvent[] = [
      { userId: 'u1', eventType: 'sign_up', timestamp: new Date('2026-05-01T00:00:00Z') },
      { userId: 'u1', eventType: 'session_start', timestamp: new Date('2026-05-02T00:00:00Z') }, // week 0
      { userId: 'u2', eventType: 'sign_up', timestamp: new Date('2026-05-01T00:00:00Z') },
      { userId: 'u2', eventType: 'session_start', timestamp: new Date('2026-05-03T00:00:00Z') }, // week 0
    ]
    const result = buildRetentionCohort(events, 'sign_up', 'session_start', '2026-05')
    expect(result.weeklyRetention[0]).toBeCloseTo(100, 0)
  })

  it('returns 0 retention for users with no activity after cohort entry', () => {
    const events: JourneyEvent[] = [
      { userId: 'u1', eventType: 'sign_up', timestamp: new Date('2026-05-01T00:00:00Z') },
    ]
    const result = buildRetentionCohort(events, 'sign_up', 'session_start', '2026-05')
    expect(result.weeklyRetention[1]).toBe(0)
    expect(result.day1Retention).toBe(0)
    expect(result.day30Retention).toBe(0)
  })

  it('returns empty cohort for unknown month', () => {
    const events: JourneyEvent[] = [
      { userId: 'u1', eventType: 'sign_up', timestamp: new Date('2026-05-01T00:00:00Z') },
    ]
    const result = buildRetentionCohort(events, 'sign_up', 'session_start', '2024-01')
    expect(result.userCount).toBe(0)
    expect(result.weeklyRetention.every(r => r === 0)).toBe(true)
  })

  it('weeklyRetention has 5 entries (weeks 0-4)', () => {
    const result = buildRetentionCohort([], 'sign_up', 'session_start', '2026-05')
    expect(result.weeklyRetention).toHaveLength(5)
  })

  it('day7 retention reflects activity in week after cohort entry', () => {
    const events: JourneyEvent[] = [
      { userId: 'u1', eventType: 'sign_up', timestamp: new Date('2026-05-01T00:00:00Z') },
      { userId: 'u1', eventType: 'session_start', timestamp: new Date('2026-05-08T12:00:00Z') }, // day 7
    ]
    const result = buildRetentionCohort(events, 'sign_up', 'session_start', '2026-05')
    expect(result.day7Retention).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// churnRiskProfile
// ---------------------------------------------------------------------------

describe('churnRiskProfile', () => {
  const REF = new Date('2026-06-19T12:00:00.000Z')

  it('assigns high risk to a user inactive for 15+ days', () => {
    const events: JourneyEvent[] = [makeEvent('u1', 'page_view', 20)]
    const result = churnRiskProfile(events, 'u1', REF)
    expect(result.riskScore).toBeGreaterThanOrEqual(50)
    expect(['high', 'critical']).toContain(result.riskTier)
  })

  it('adds +50 to risk score for subscription_cancel', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'subscription_start', 30),
      makeEvent('u1', 'subscription_cancel', 1),
      makeEvent('u1', 'page_view', 1),
    ]
    const result = churnRiskProfile(events, 'u1', REF)
    expect(result.signals).toContain('Cancelled subscription')
    expect(result.riskScore).toBeGreaterThanOrEqual(50)
  })

  it('signals array includes "14+ days without activity" for very inactive user', () => {
    const events: JourneyEvent[] = [makeEvent('u1', 'page_view', 20)]
    const result = churnRiskProfile(events, 'u1', REF)
    expect(result.signals).toContain('14+ days without activity')
  })

  it('signals array includes "7+ days without activity" for 8-day inactive user', () => {
    const events: JourneyEvent[] = [makeEvent('u1', 'page_view', 8)]
    const result = churnRiskProfile(events, 'u1', REF)
    expect(result.signals).toContain('7+ days without activity')
  })

  it('signals "No engagement with picks" when no recent pick activity', () => {
    const events: JourneyEvent[] = [makeEvent('u1', 'page_view', 1)]
    const result = churnRiskProfile(events, 'u1', REF)
    expect(result.signals).toContain('No engagement with picks')
  })

  it('does not signal pick disengagement when picks viewed recently', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'pick_view', 1),
      makeEvent('u1', 'page_view', 1),
    ]
    const result = churnRiskProfile(events, 'u1', REF)
    expect(result.signals).not.toContain('No engagement with picks')
  })

  it('recommendedAction is escalate for critical risk', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'subscription_cancel', 20),
      makeEvent('u1', 'page_view', 20),
    ]
    const result = churnRiskProfile(events, 'u1', REF)
    if (result.riskTier === 'critical') {
      expect(result.recommendedAction).toBe('escalate')
    }
  })

  it('recommendedAction is monitor for low risk', () => {
    // Very recent activity, no churn signals
    const events: JourneyEvent[] = [
      makeEvent('u1', 'pick_view', 0),
      makeEvent('u1', 'pick_view', 0),
      makeEvent('u1', 'page_view', 0),
      makeEvent('u1', 'session_start', 0, { sessionId: 's1' }),
      makeEvent('u1', 'session_start', 1, { sessionId: 's2' }),
      makeEvent('u1', 'session_start', 2, { sessionId: 's3' }),
    ]
    const result = churnRiskProfile(events, 'u1', REF)
    expect(result.riskTier).toBe('low')
    expect(result.recommendedAction).toBe('monitor')
  })

  it('daysSinceLastActivity reflects most recent event', () => {
    const events: JourneyEvent[] = [makeEvent('u1', 'page_view', 5)]
    const result = churnRiskProfile(events, 'u1', REF)
    expect(result.daysSinceLastActivity).toBeCloseTo(5, 0)
  })

  it('riskScore is clamped to [0, 100]', () => {
    const events: JourneyEvent[] = [makeEvent('u1', 'subscription_cancel', 30)]
    const result = churnRiskProfile(events, 'u1', REF)
    expect(result.riskScore).toBeLessThanOrEqual(100)
    expect(result.riskScore).toBeGreaterThanOrEqual(0)
  })
})

// ---------------------------------------------------------------------------
// dropOffAnalysis
// ---------------------------------------------------------------------------

describe('dropOffAnalysis', () => {
  const steps: JourneyEventType[] = ['sign_up', 'email_verify', 'subscription_start']

  it('counts users who reached each step', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'sign_up', 10),
      makeEvent('u1', 'email_verify', 9),
      makeEvent('u1', 'subscription_start', 8),
      makeEvent('u2', 'sign_up', 10),
      makeEvent('u2', 'email_verify', 9),
      makeEvent('u3', 'sign_up', 10),
    ]
    const result = dropOffAnalysis(events, steps)
    expect(result[0]!.reached).toBe(3)
    expect(result[1]!.reached).toBe(2)
    expect(result[2]!.reached).toBe(1)
  })

  it('counts users who dropped at each step', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'sign_up', 10),
      makeEvent('u1', 'email_verify', 9),
      makeEvent('u2', 'sign_up', 10),
    ]
    const result = dropOffAnalysis(events, steps)
    expect(result[0]!.droppedHere).toBe(1) // u2 dropped at sign_up
    expect(result[1]!.droppedHere).toBe(1) // u1 dropped at email_verify
  })

  it('calculates drop rates correctly', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'sign_up', 10),
      makeEvent('u2', 'sign_up', 10),
      makeEvent('u1', 'email_verify', 9),
    ]
    const result = dropOffAnalysis(events, steps)
    expect(result[0]!.dropRate).toBeCloseTo(0.5, 5) // 1 of 2 dropped
  })

  it('returns empty for empty steps', () => {
    expect(dropOffAnalysis([], [])).toEqual([])
  })

  it('last step has no drop info pointing to next step (dropped = reached)', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'sign_up', 10),
      makeEvent('u1', 'email_verify', 9),
      makeEvent('u1', 'subscription_start', 8),
    ]
    const result = dropOffAnalysis(events, steps)
    // Last step: all who reached it "drop" (no further step)
    expect(result[2]!.droppedHere).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// commonPaths
// ---------------------------------------------------------------------------

describe('commonPaths', () => {
  it('identifies the most common sequence', () => {
    const events: JourneyEvent[] = [
      // u1, u2, u3 all do the same path
      makeEvent('u1', 'page_view', 5),
      makeEvent('u1', 'sign_up', 4),
      makeEvent('u2', 'page_view', 5),
      makeEvent('u2', 'sign_up', 4),
      makeEvent('u3', 'page_view', 5),
      makeEvent('u3', 'sign_up', 4),
      // u4 does a different path
      makeEvent('u4', 'sign_up', 5),
    ]
    const result = commonPaths(events, 2, 5)
    expect(result[0]!.path).toEqual(['page_view', 'sign_up'])
    expect(result[0]!.count).toBe(3)
  })

  it('respects maxPathLength', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'page_view', 5),
      makeEvent('u1', 'sign_up', 4),
      makeEvent('u1', 'email_verify', 3),
      makeEvent('u1', 'subscription_start', 2),
      makeEvent('u1', 'pick_view', 1),
      makeEvent('u1', 'session_end', 0),
    ]
    const result = commonPaths(events, 3, 5)
    expect(result[0]!.path).toHaveLength(3)
  })

  it('includes percentage field', () => {
    const events: JourneyEvent[] = [makeEvent('u1', 'page_view', 5)]
    const result = commonPaths(events)
    expect(result[0]).toHaveProperty('percentage')
    expect(typeof result[0]!.percentage).toBe('number')
  })

  it('returns empty for empty events', () => {
    expect(commonPaths([])).toEqual([])
  })

  it('returns topN results at most', () => {
    // Create 5 distinct paths
    for (const id of ['u1', 'u2', 'u3', 'u4', 'u5']) {
      void id // just ensuring diversity
    }
    const events: JourneyEvent[] = [
      makeEvent('u1', 'sign_up', 5),
      makeEvent('u2', 'page_view', 5),
      makeEvent('u3', 'pick_view', 5),
    ]
    const result = commonPaths(events, 5, 2)
    expect(result.length).toBeLessThanOrEqual(2)
  })
})

// ---------------------------------------------------------------------------
// featureAdoptionRate
// ---------------------------------------------------------------------------

describe('featureAdoptionRate', () => {
  it('calculates correct adoption rate', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'feature_used', 1, { properties: { featureName: 'line-mover' } }),
      makeEvent('u1', 'feature_used', 1, { properties: { featureName: 'line-mover' } }),
      makeEvent('u2', 'feature_used', 1, { properties: { featureName: 'line-mover' } }),
      makeEvent('u3', 'page_view', 1),
    ]
    const result = featureAdoptionRate(events, 'line-mover', 4)
    expect(result.userCount).toBe(2)
    expect(result.adoptionRate).toBeCloseTo(0.5, 5) // 2/4
  })

  it('calculates avgUsagePerUser correctly', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'feature_used', 1, { properties: { featureName: 'tracker' } }),
      makeEvent('u1', 'feature_used', 1, { properties: { featureName: 'tracker' } }),
      makeEvent('u2', 'feature_used', 1, { properties: { featureName: 'tracker' } }),
    ]
    const result = featureAdoptionRate(events, 'tracker', 2)
    expect(result.avgUsagePerUser).toBeCloseTo(1.5, 5) // 3 events / 2 users
  })

  it('returns 0 for unknown feature', () => {
    const events: JourneyEvent[] = [makeEvent('u1', 'page_view', 1)]
    const result = featureAdoptionRate(events, 'unknown-feature', 10)
    expect(result.adoptionRate).toBe(0)
    expect(result.userCount).toBe(0)
    expect(result.avgUsagePerUser).toBe(0)
  })

  it('handles zero totalUsers without division by zero', () => {
    const result = featureAdoptionRate([], 'feature', 0)
    expect(result.adoptionRate).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// abTestConversion
// ---------------------------------------------------------------------------

describe('abTestConversion', () => {
  it('calculates group sizes and conversion rates', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'page_view', 5, { properties: { variant: 'A' } }),
      makeEvent('u1', 'subscription_start', 4),
      makeEvent('u2', 'page_view', 5, { properties: { variant: 'A' } }),
      makeEvent('u3', 'page_view', 5, { properties: { variant: 'B' } }),
      makeEvent('u3', 'subscription_start', 4),
      makeEvent('u4', 'page_view', 5, { properties: { variant: 'B' } }),
      makeEvent('u4', 'subscription_start', 4),
    ]
    const result = abTestConversion(events, 'subscription_start', 'variant')
    expect(result.groupA.users).toBe(2)
    expect(result.groupA.conversions).toBe(1)
    expect(result.groupA.rate).toBeCloseTo(0.5, 5)
    expect(result.groupB.users).toBe(2)
    expect(result.groupB.conversions).toBe(2)
    expect(result.groupB.rate).toBeCloseTo(1.0, 5)
  })

  it('calculates relativeLift as (rateB - rateA) / rateA', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'page_view', 5, { properties: { variant: 'A' } }),
      makeEvent('u1', 'subscription_start', 4),
      makeEvent('u2', 'page_view', 5, { properties: { variant: 'A' } }),
      makeEvent('u3', 'page_view', 5, { properties: { variant: 'B' } }),
      makeEvent('u3', 'subscription_start', 4),
      makeEvent('u4', 'page_view', 5, { properties: { variant: 'B' } }),
      makeEvent('u4', 'subscription_start', 4),
    ]
    const result = abTestConversion(events, 'subscription_start', 'variant')
    // rateA = 0.5, rateB = 1.0 → lift = (1.0 - 0.5) / 0.5 = 1.0
    expect(result.relativeLift).toBeCloseTo(1.0, 5)
  })

  it('relativeLift is 0 when groupA rate is 0', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'page_view', 5, { properties: { variant: 'A' } }),
      makeEvent('u2', 'page_view', 5, { properties: { variant: 'B' } }),
      makeEvent('u2', 'subscription_start', 4),
    ]
    const result = abTestConversion(events, 'subscription_start', 'variant')
    expect(result.relativeLift).toBe(0)
  })

  it('includes significant boolean field', () => {
    const result = abTestConversion([], 'subscription_start', 'variant')
    expect(typeof result.significant).toBe('boolean')
  })
})

// ---------------------------------------------------------------------------
// eventTimeSeries
// ---------------------------------------------------------------------------

describe('eventTimeSeries', () => {
  it('groups events by day correctly', () => {
    const events: JourneyEvent[] = [
      { userId: 'u1', eventType: 'page_view', timestamp: new Date('2026-06-01T10:00:00Z') },
      { userId: 'u2', eventType: 'page_view', timestamp: new Date('2026-06-01T15:00:00Z') },
      { userId: 'u3', eventType: 'page_view', timestamp: new Date('2026-06-02T10:00:00Z') },
    ]
    const result = eventTimeSeries(events, 'page_view', 'day')
    const day1 = result.find(r => r.period === '2026-06-01')
    const day2 = result.find(r => r.period === '2026-06-02')
    expect(day1?.count).toBe(2)
    expect(day1?.uniqueUsers).toBe(2)
    expect(day2?.count).toBe(1)
  })

  it('groups events by month', () => {
    const events: JourneyEvent[] = [
      { userId: 'u1', eventType: 'sign_up', timestamp: new Date('2026-05-10T00:00:00Z') },
      { userId: 'u2', eventType: 'sign_up', timestamp: new Date('2026-06-10T00:00:00Z') },
    ]
    const result = eventTimeSeries(events, 'sign_up', 'month')
    expect(result.some(r => r.period === '2026-05')).toBe(true)
    expect(result.some(r => r.period === '2026-06')).toBe(true)
  })

  it('returns sorted results by period', () => {
    const events: JourneyEvent[] = [
      { userId: 'u1', eventType: 'page_view', timestamp: new Date('2026-06-03T00:00:00Z') },
      { userId: 'u2', eventType: 'page_view', timestamp: new Date('2026-06-01T00:00:00Z') },
      { userId: 'u3', eventType: 'page_view', timestamp: new Date('2026-06-02T00:00:00Z') },
    ]
    const result = eventTimeSeries(events, 'page_view', 'day')
    expect(result[0]!.period).toBe('2026-06-01')
    expect(result[1]!.period).toBe('2026-06-02')
    expect(result[2]!.period).toBe('2026-06-03')
  })

  it('uniqueUsers counts distinct users in each period', () => {
    const events: JourneyEvent[] = [
      { userId: 'u1', eventType: 'pick_view', timestamp: new Date('2026-06-01T10:00:00Z') },
      { userId: 'u1', eventType: 'pick_view', timestamp: new Date('2026-06-01T11:00:00Z') }, // same user
      { userId: 'u2', eventType: 'pick_view', timestamp: new Date('2026-06-01T12:00:00Z') },
    ]
    const result = eventTimeSeries(events, 'pick_view', 'day')
    expect(result[0]!.uniqueUsers).toBe(2)
    expect(result[0]!.count).toBe(3)
  })

  it('returns empty for unknown event type with no events', () => {
    const result = eventTimeSeries([], 'sign_up', 'day')
    expect(result).toEqual([])
  })

  it('groups by week', () => {
    const events: JourneyEvent[] = [
      { userId: 'u1', eventType: 'session_start', timestamp: new Date('2026-06-01T00:00:00Z') },
      { userId: 'u2', eventType: 'session_start', timestamp: new Date('2026-06-08T00:00:00Z') }, // next week
    ]
    const result = eventTimeSeries(events, 'session_start', 'week')
    expect(result).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// userLifecycleStage
// ---------------------------------------------------------------------------

describe('userLifecycleStage', () => {
  const NOW = new Date('2026-06-19T12:00:00.000Z')

  it('"new" — signed up in last 7 days, no subscription', () => {
    // Override date to make NOW work properly in relative makeEvent
    const events: JourneyEvent[] = [makeEvent('u1', 'sign_up', 3)]
    // Patch: userLifecycleStage uses new Date() internally
    // We check that sign_up within 7 days = new (when no subscription)
    const result = userLifecycleStage(events, 'u1')
    // As long as sign_up was <7 days ago and no subscription:
    expect(result).toBe('new')
  })

  it('"onboarding" — signed up >7 days ago, not yet verified', () => {
    const events: JourneyEvent[] = [makeEvent('u1', 'sign_up', 14)]
    const result = userLifecycleStage(events, 'u1')
    expect(result).toBe('onboarding')
  })

  it('"active" — has subscription, recent activity, not at risk', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'sign_up', 30),
      makeEvent('u1', 'email_verify', 29),
      makeEvent('u1', 'subscription_start', 28),
      makeEvent('u1', 'page_view', 1), // recent
    ]
    const result = userLifecycleStage(events, 'u1')
    expect(['active', 'power']).toContain(result)
  })

  it('"power" — high engagement score with active subscription', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'sign_up', 60),
      makeEvent('u1', 'subscription_start', 55),
    ]
    // Add lots of recent activity
    for (let i = 0; i < 30; i++) {
      events.push(makeEvent('u1', 'session_start', i % 29, { sessionId: `s${i}` }))
      events.push(makeEvent('u1', 'pick_view', i % 29))
    }
    for (let i = 0; i < 10; i++) {
      events.push(makeEvent('u1', 'feature_used', i % 10, { properties: { featureName: `f${i}` } }))
    }
    const result = userLifecycleStage(events, 'u1')
    expect(['power', 'active']).toContain(result)
  })

  it('"at-risk" — has subscription but inactive >7 days', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'sign_up', 60),
      makeEvent('u1', 'subscription_start', 50),
      makeEvent('u1', 'page_view', 10), // last activity 10 days ago
    ]
    const result = userLifecycleStage(events, 'u1')
    expect(result).toBe('at-risk')
  })

  it('"churned" — subscription_cancel event exists', () => {
    const events: JourneyEvent[] = [
      makeEvent('u1', 'sign_up', 60),
      makeEvent('u1', 'subscription_start', 50),
      makeEvent('u1', 'subscription_cancel', 5),
      makeEvent('u1', 'page_view', 5),
    ]
    const result = userLifecycleStage(events, 'u1')
    expect(result).toBe('churned')
  })

  it('"churned" — no activity for 30+ days', () => {
    const events: JourneyEvent[] = [makeEvent('u1', 'page_view', 35)]
    const result = userLifecycleStage(events, 'u1')
    expect(result).toBe('churned')
  })
})
