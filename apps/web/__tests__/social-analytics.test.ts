import { describe, it, expect } from 'vitest'
import {
  type SocialPost,
  engagementRate,
  reachEngagementRate,
  followerEngagementRate,
  clickThroughRate,
  viewThroughRate,
  avgWatchTime,
  platformBenchmarkEngagement,
  engagementVsBenchmark,
  viralityScore,
  classifyVirality,
  amplificationRate,
  conversationRate,
  analyzePost,
  rankPosts,
  topNPosts,
  avgEngagementRate,
  medianEngagementRate,
  postsByHour,
  bestPostingHours,
  engagementByDayOfWeek,
  recentTrend,
  estimatedOrganic,
  audienceGrowthRate,
  projectedFollowers,
  contentTypeBreakdown,
  platformMix,
  relativePerformance,
  pickPostViralityPotential,
  gameDayEngagementBoost,
  contentCalendarScore,
  estimatedSentiment,
  hashtagEfficiency,
  totalImpressions,
  totalReach,
  totalEngagements,
  overallEngagementRate,
} from '../lib/analytics/social-analytics'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let postIdCounter = 0

function makePost(overrides: Partial<SocialPost> & { metrics?: Partial<SocialPost['metrics']> } = {}): SocialPost {
  const { metrics: metricOverrides, ...rest } = overrides
  return {
    id: `post-${++postIdCounter}`,
    platform: 'twitter',
    content: 'Test content',
    publishedAt: Date.UTC(2024, 0, 15, 12, 0, 0), // Mon 2024-01-15 12:00 UTC (Monday)
    metrics: {
      impressions: 1000,
      reach: 800,
      likes: 50,
      comments: 20,
      shares: 10,
      saves: 5,
      ...metricOverrides,
    },
    followerCount: 1000,
    ...rest,
  }
}

// ---------------------------------------------------------------------------
// engagementRate
// ---------------------------------------------------------------------------

describe('engagementRate', () => {
  it('includes likes, comments, shares, saves in numerator over impressions', () => {
    const post = makePost({ metrics: { impressions: 1000, reach: 800, likes: 50, comments: 20, shares: 10, saves: 5 } })
    // (50 + 20 + 10 + 5) / 1000 = 0.085
    expect(engagementRate(post)).toBeCloseTo(0.085)
  })

  it('treats missing saves as 0', () => {
    // Explicitly omit saves from metrics object to test undefined handling
    const post: SocialPost = {
      id: 'test-no-saves',
      platform: 'twitter',
      content: 'Test',
      publishedAt: Date.now(),
      metrics: { impressions: 1000, reach: 800, likes: 50, comments: 20, shares: 10 },
      followerCount: 1000,
    }
    // (50 + 20 + 10 + 0) / 1000 = 0.08
    expect(engagementRate(post)).toBeCloseTo(0.08)
  })

  it('returns 0 when impressions are 0', () => {
    const post = makePost({ metrics: { impressions: 0, reach: 0, likes: 10, comments: 5, shares: 2 } })
    expect(engagementRate(post)).toBe(0)
  })

  it('handles zero likes/comments/shares', () => {
    const post = makePost({ metrics: { impressions: 500, reach: 400, likes: 0, comments: 0, shares: 0, saves: 0 } })
    expect(engagementRate(post)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// reachEngagementRate
// ---------------------------------------------------------------------------

describe('reachEngagementRate', () => {
  it('divides by reach not impressions', () => {
    const post = makePost({ metrics: { impressions: 1000, reach: 500, likes: 50, comments: 10, shares: 5 } })
    // (50 + 10 + 5) / 500 = 0.13
    expect(reachEngagementRate(post)).toBeCloseTo(0.13)
  })

  it('returns 0 when reach is 0', () => {
    const post = makePost({ metrics: { impressions: 1000, reach: 0, likes: 10, comments: 5, shares: 2 } })
    expect(reachEngagementRate(post)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// followerEngagementRate
// ---------------------------------------------------------------------------

describe('followerEngagementRate', () => {
  it('divides by followerCount', () => {
    const post = makePost({
      followerCount: 2000,
      metrics: { impressions: 5000, reach: 3000, likes: 100, comments: 40, shares: 20 },
    })
    // (100 + 40 + 20) / 2000 = 0.08
    expect(followerEngagementRate(post)).toBeCloseTo(0.08)
  })

  it('returns 0 when followerCount is 0', () => {
    const post = makePost({ followerCount: 0 })
    expect(followerEngagementRate(post)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// clickThroughRate & viewThroughRate
// ---------------------------------------------------------------------------

describe('clickThroughRate', () => {
  it('divides clicks by impressions', () => {
    expect(clickThroughRate(50, 1000)).toBeCloseTo(0.05)
  })

  it('returns 0 when impressions are 0', () => {
    expect(clickThroughRate(10, 0)).toBe(0)
  })
})

describe('viewThroughRate', () => {
  it('divides videoViews by impressions', () => {
    expect(viewThroughRate(400, 1000)).toBeCloseTo(0.4)
  })

  it('returns 0 when impressions are 0', () => {
    expect(viewThroughRate(100, 0)).toBe(0)
  })
})

describe('avgWatchTime', () => {
  it('returns totalWatchTime / videoViews', () => {
    expect(avgWatchTime(6000, 200)).toBeCloseTo(30)
  })

  it('returns 0 when videoViews is 0', () => {
    expect(avgWatchTime(0, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// platformBenchmarkEngagement
// ---------------------------------------------------------------------------

describe('platformBenchmarkEngagement', () => {
  it('returns 0.005 for twitter', () => {
    expect(platformBenchmarkEngagement('twitter')).toBe(0.005)
  })

  it('returns 0.03 for instagram', () => {
    expect(platformBenchmarkEngagement('instagram')).toBe(0.03)
  })

  it('returns 0.05 for tiktok', () => {
    expect(platformBenchmarkEngagement('tiktok')).toBe(0.05)
  })

  it('returns 0.04 for youtube', () => {
    expect(platformBenchmarkEngagement('youtube')).toBe(0.04)
  })

  it('returns 0.02 for facebook', () => {
    expect(platformBenchmarkEngagement('facebook')).toBe(0.02)
  })

  it('returns 0.02 for linkedin', () => {
    expect(platformBenchmarkEngagement('linkedin')).toBe(0.02)
  })
})

// ---------------------------------------------------------------------------
// engagementVsBenchmark
// ---------------------------------------------------------------------------

describe('engagementVsBenchmark', () => {
  it('returns positive when above benchmark', () => {
    // Twitter benchmark = 0.005; engineer a 1% ER (no saves)
    const post = makePost({
      platform: 'twitter',
      metrics: { impressions: 1000, reach: 800, likes: 10, comments: 0, shares: 0, saves: 0 },
    })
    // ER = 0.01, benchmark = 0.005, (0.01 - 0.005)/0.005 = 1.0
    expect(engagementVsBenchmark(post)).toBeCloseTo(1.0)
  })

  it('returns negative when below benchmark', () => {
    // Twitter benchmark 0.005; ER = 0.002 (no saves)
    const post = makePost({
      platform: 'twitter',
      metrics: { impressions: 1000, reach: 800, likes: 2, comments: 0, shares: 0, saves: 0 },
    })
    expect(engagementVsBenchmark(post)).toBeLessThan(0)
  })

  it('returns 0 when exactly at benchmark', () => {
    // Twitter benchmark = 0.005; ER must = 0.005 (no saves)
    const post = makePost({
      platform: 'twitter',
      metrics: { impressions: 1000, reach: 800, likes: 5, comments: 0, shares: 0, saves: 0 },
    })
    expect(engagementVsBenchmark(post)).toBeCloseTo(0)
  })
})

// ---------------------------------------------------------------------------
// viralityScore
// ---------------------------------------------------------------------------

describe('viralityScore', () => {
  it('calculates (shares*3 + comments*2 + likes) / impressions * 1000', () => {
    const post = makePost({
      metrics: { impressions: 1000, reach: 800, likes: 100, comments: 50, shares: 30 },
    })
    // (30*3 + 50*2 + 100) / 1000 * 1000 = (90 + 100 + 100) = 290/1000*1000 = 290
    expect(viralityScore(post)).toBeCloseTo(290)
  })

  it('high shares/impressions = high score', () => {
    const post = makePost({
      metrics: { impressions: 100, reach: 80, likes: 5, comments: 2, shares: 50 },
    })
    // (50*3 + 2*2 + 5)/100 * 1000 = (150+4+5)/100 * 1000 = 159/100*1000 = 1590
    expect(viralityScore(post)).toBeGreaterThan(100)
  })

  it('returns 0 when impressions are 0', () => {
    const post = makePost({ metrics: { impressions: 0, reach: 0, likes: 10, comments: 5, shares: 2 } })
    expect(viralityScore(post)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// classifyVirality
// ---------------------------------------------------------------------------

describe('classifyVirality', () => {
  it('returns viral for score > 10', () => {
    expect(classifyVirality(10.01)).toBe('viral')
    expect(classifyVirality(100)).toBe('viral')
  })

  it('returns high for score 3-10 inclusive', () => {
    expect(classifyVirality(3)).toBe('high')
    expect(classifyVirality(10)).toBe('high')
    expect(classifyVirality(5)).toBe('high')
  })

  it('returns average for score 1-3', () => {
    expect(classifyVirality(1)).toBe('average')
    expect(classifyVirality(2.9)).toBe('average')
  })

  it('returns low for score 0.3-1', () => {
    expect(classifyVirality(0.3)).toBe('low')
    expect(classifyVirality(0.99)).toBe('low')
  })

  it('returns poor for score < 0.3', () => {
    expect(classifyVirality(0)).toBe('poor')
    expect(classifyVirality(0.29)).toBe('poor')
  })
})

// ---------------------------------------------------------------------------
// amplificationRate & conversationRate
// ---------------------------------------------------------------------------

describe('amplificationRate', () => {
  it('returns shares / reach', () => {
    expect(amplificationRate(50, 1000)).toBeCloseTo(0.05)
  })

  it('returns 0 when reach is 0', () => {
    expect(amplificationRate(10, 0)).toBe(0)
  })
})

describe('conversationRate', () => {
  it('returns comments / reach', () => {
    expect(conversationRate(30, 600)).toBeCloseTo(0.05)
  })

  it('returns 0 when reach is 0', () => {
    expect(conversationRate(5, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// analyzePost
// ---------------------------------------------------------------------------

describe('analyzePost', () => {
  it('returns ContentPerformance with all fields', () => {
    const post = makePost({
      followerCount: 1000,
      metrics: { impressions: 1000, reach: 800, likes: 50, comments: 20, shares: 10, saves: 5 },
    })
    const result = analyzePost(post)
    expect(result.post).toBe(post)
    expect(typeof result.engagementRate).toBe('number')
    expect(typeof result.viralityScore).toBe('number')
    expect(typeof result.reachRate).toBe('number')
    expect(['viral', 'high', 'average', 'low', 'poor']).toContain(result.performanceTier)
  })

  it('reachRate = reach / followerCount', () => {
    const post = makePost({ followerCount: 1000, metrics: { impressions: 1000, reach: 500, likes: 10, comments: 5, shares: 2 } })
    const result = analyzePost(post)
    expect(result.reachRate).toBeCloseTo(0.5)
  })

  it('performanceTier matches classifyVirality', () => {
    const post = makePost({ metrics: { impressions: 100, reach: 80, likes: 500, comments: 200, shares: 300 } })
    const result = analyzePost(post)
    expect(result.performanceTier).toBe(classifyVirality(result.viralityScore))
  })
})

// ---------------------------------------------------------------------------
// rankPosts
// ---------------------------------------------------------------------------

describe('rankPosts', () => {
  it('sorts by virality score descending', () => {
    const low = makePost({ metrics: { impressions: 1000, reach: 800, likes: 1, comments: 1, shares: 0 } })
    const high = makePost({ metrics: { impressions: 100, reach: 80, likes: 50, comments: 20, shares: 80 } })
    const mid = makePost({ metrics: { impressions: 500, reach: 400, likes: 20, comments: 10, shares: 5 } })
    const ranked = rankPosts([low, high, mid])
    expect(ranked[0].post).toBe(high)
    expect(ranked[ranked.length - 1].post).toBe(low)
  })

  it('returns empty array for empty input', () => {
    expect(rankPosts([])).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// topNPosts
// ---------------------------------------------------------------------------

describe('topNPosts', () => {
  it('returns first N of ranked posts', () => {
    const posts = [
      makePost({ metrics: { impressions: 1000, reach: 800, likes: 1, comments: 0, shares: 0 } }),
      makePost({ metrics: { impressions: 100, reach: 80, likes: 50, comments: 30, shares: 80 } }),
      makePost({ metrics: { impressions: 500, reach: 400, likes: 20, comments: 10, shares: 5 } }),
    ]
    const top2 = topNPosts(posts, 2)
    expect(top2).toHaveLength(2)
    expect(top2[0].viralityScore).toBeGreaterThanOrEqual(top2[1].viralityScore)
  })

  it('returns all posts when N > posts.length', () => {
    const posts = [makePost(), makePost()]
    expect(topNPosts(posts, 10)).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// avgEngagementRate
// ---------------------------------------------------------------------------

describe('avgEngagementRate', () => {
  it('returns average across posts', () => {
    const p1 = makePost({ metrics: { impressions: 1000, reach: 800, likes: 100, comments: 0, shares: 0, saves: 0 } })
    const p2 = makePost({ metrics: { impressions: 1000, reach: 800, likes: 200, comments: 0, shares: 0, saves: 0 } })
    // avg ER = (0.1 + 0.2) / 2 = 0.15
    expect(avgEngagementRate([p1, p2])).toBeCloseTo(0.15)
  })

  it('returns 0 for empty array', () => {
    expect(avgEngagementRate([])).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// medianEngagementRate
// ---------------------------------------------------------------------------

describe('medianEngagementRate', () => {
  it('returns middle value for odd count', () => {
    const p1 = makePost({ metrics: { impressions: 1000, reach: 800, likes: 10, comments: 0, shares: 0 } }) // 0.01
    const p2 = makePost({ metrics: { impressions: 1000, reach: 800, likes: 50, comments: 0, shares: 0 } }) // 0.05
    const p3 = makePost({ metrics: { impressions: 1000, reach: 800, likes: 100, comments: 0, shares: 0 } }) // 0.1
    expect(medianEngagementRate([p1, p2, p3])).toBeCloseTo(0.05)
  })

  it('averages two middle values for even count', () => {
    const p1 = makePost({ metrics: { impressions: 1000, reach: 800, likes: 10, comments: 0, shares: 0 } }) // 0.01
    const p2 = makePost({ metrics: { impressions: 1000, reach: 800, likes: 30, comments: 0, shares: 0 } }) // 0.03
    const p3 = makePost({ metrics: { impressions: 1000, reach: 800, likes: 70, comments: 0, shares: 0 } }) // 0.07
    const p4 = makePost({ metrics: { impressions: 1000, reach: 800, likes: 90, comments: 0, shares: 0 } }) // 0.09
    expect(medianEngagementRate([p1, p2, p3, p4])).toBeCloseTo(0.05)
  })

  it('returns 0 for empty array', () => {
    expect(medianEngagementRate([])).toBe(0)
  })

  it('returns single value for one post', () => {
    const p = makePost({ metrics: { impressions: 1000, reach: 800, likes: 50, comments: 0, shares: 0 } })
    expect(medianEngagementRate([p])).toBeCloseTo(0.05)
  })
})

// ---------------------------------------------------------------------------
// postsByHour
// ---------------------------------------------------------------------------

describe('postsByHour', () => {
  it('buckets posts by UTC hour correctly', () => {
    const p1 = makePost({ publishedAt: Date.UTC(2024, 0, 15, 9, 30, 0) })  // hour 9
    const p2 = makePost({ publishedAt: Date.UTC(2024, 0, 15, 9, 45, 0) })  // hour 9
    const p3 = makePost({ publishedAt: Date.UTC(2024, 0, 15, 15, 0, 0) }) // hour 15
    const result = postsByHour([p1, p2, p3])
    expect(result[9]).toBe(2)
    expect(result[15]).toBe(1)
  })

  it('returns empty object for empty input', () => {
    expect(postsByHour([])).toEqual({})
  })
})

// ---------------------------------------------------------------------------
// bestPostingHours
// ---------------------------------------------------------------------------

describe('bestPostingHours', () => {
  it('returns top N hours by avg engagement rate', () => {
    const highEngHour9 = makePost({
      publishedAt: Date.UTC(2024, 0, 15, 9, 0, 0),
      metrics: { impressions: 100, reach: 80, likes: 50, comments: 20, shares: 10 },
    })
    const lowEngHour14 = makePost({
      publishedAt: Date.UTC(2024, 0, 15, 14, 0, 0),
      metrics: { impressions: 1000, reach: 800, likes: 1, comments: 0, shares: 0 },
    })
    const hours = bestPostingHours([highEngHour9, lowEngHour14], 1)
    expect(hours[0]).toBe(9)
  })

  it('defaults to top 3', () => {
    const posts = Array.from({ length: 6 }, (_, i) =>
      makePost({ publishedAt: Date.UTC(2024, 0, 15, i * 2, 0, 0) })
    )
    expect(bestPostingHours(posts)).toHaveLength(3)
  })

  it('returns empty array for empty input', () => {
    expect(bestPostingHours([])).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// engagementByDayOfWeek
// ---------------------------------------------------------------------------

describe('engagementByDayOfWeek', () => {
  it('buckets by UTC day of week (Sunday=0)', () => {
    // 2024-01-14 = Sunday (day 0), 2024-01-15 = Monday (day 1)
    const sun = makePost({
      publishedAt: Date.UTC(2024, 0, 14, 12, 0, 0),
      metrics: { impressions: 100, reach: 80, likes: 20, comments: 5, shares: 2 },
    })
    const mon = makePost({
      publishedAt: Date.UTC(2024, 0, 15, 12, 0, 0),
      metrics: { impressions: 100, reach: 80, likes: 5, comments: 1, shares: 0 },
    })
    const result = engagementByDayOfWeek([sun, mon])
    expect(result[0]).toBeGreaterThan(result[1]) // Sunday had higher engagement
  })
})

// ---------------------------------------------------------------------------
// recentTrend
// ---------------------------------------------------------------------------

describe('recentTrend', () => {
  it('returns growing when second half has higher engagement', () => {
    const now = Date.UTC(2024, 0, 20, 12, 0, 0)
    const older = makePost({
      publishedAt: now - 6 * 24 * 60 * 60 * 1000,
      metrics: { impressions: 1000, reach: 800, likes: 5, comments: 1, shares: 0 },
    })
    const newer = makePost({
      publishedAt: now - 1 * 24 * 60 * 60 * 1000,
      metrics: { impressions: 1000, reach: 800, likes: 200, comments: 50, shares: 30 },
    })
    expect(recentTrend([older, newer], 7)).toBe('growing')
  })

  it('returns declining when second half has lower engagement', () => {
    const now = Date.UTC(2024, 0, 20, 12, 0, 0)
    const older = makePost({
      publishedAt: now - 6 * 24 * 60 * 60 * 1000,
      metrics: { impressions: 1000, reach: 800, likes: 200, comments: 50, shares: 30 },
    })
    const newer = makePost({
      publishedAt: now - 1 * 24 * 60 * 60 * 1000,
      metrics: { impressions: 1000, reach: 800, likes: 5, comments: 1, shares: 0 },
    })
    expect(recentTrend([older, newer], 7)).toBe('declining')
  })

  it('returns stable for empty input', () => {
    expect(recentTrend([], 7)).toBe('stable')
  })

  it('returns stable for single post', () => {
    const post = makePost({ publishedAt: Date.UTC(2024, 0, 15) })
    expect(recentTrend([post], 7)).toBe('stable')
  })
})

// ---------------------------------------------------------------------------
// estimatedOrganic
// ---------------------------------------------------------------------------

describe('estimatedOrganic', () => {
  it('returns fraction <= 1 when reach > followers', () => {
    const result = estimatedOrganic(10000, 1000)
    expect(result).toBe(0.1)
  })

  it('returns 1 when reach <= followerCount (fully organic)', () => {
    expect(estimatedOrganic(500, 1000)).toBe(1)
  })

  it('returns 1 when reach is 0', () => {
    expect(estimatedOrganic(0, 1000)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// audienceGrowthRate
// ---------------------------------------------------------------------------

describe('audienceGrowthRate', () => {
  it('calculates (current - prev) / prev', () => {
    expect(audienceGrowthRate(1100, 1000)).toBeCloseTo(0.1)
  })

  it('returns 0 when previous is 0', () => {
    expect(audienceGrowthRate(500, 0)).toBe(0)
  })

  it('handles negative growth (followers lost)', () => {
    expect(audienceGrowthRate(900, 1000)).toBeCloseTo(-0.1)
  })
})

// ---------------------------------------------------------------------------
// projectedFollowers
// ---------------------------------------------------------------------------

describe('projectedFollowers', () => {
  it('compound growth formula', () => {
    // current=1000, 10% weekly, 2 weeks = 1000 * 1.1^2 = 1210
    expect(projectedFollowers(1000, 0.1, 2)).toBeCloseTo(1210)
  })

  it('returns current for 0 weeks', () => {
    expect(projectedFollowers(5000, 0.05, 0)).toBeCloseTo(5000)
  })
})

// ---------------------------------------------------------------------------
// contentTypeBreakdown
// ---------------------------------------------------------------------------

describe('contentTypeBreakdown', () => {
  it('returns percentage breakdown summing to 1', () => {
    const posts = [
      makePost({ content: 'video post' }),
      makePost({ content: 'image post' }),
      makePost({ content: 'video post 2' }),
    ]
    const result = contentTypeBreakdown(posts, (p) =>
      p.content.includes('video') ? 'video' : 'image'
    )
    expect(result['video']).toBeCloseTo(2 / 3)
    expect(result['image']).toBeCloseTo(1 / 3)
    const total = Object.values(result).reduce((s, v) => s + v, 0)
    expect(total).toBeCloseTo(1)
  })

  it('returns empty for empty input', () => {
    expect(contentTypeBreakdown([], () => 'video')).toEqual({})
  })
})

// ---------------------------------------------------------------------------
// platformMix
// ---------------------------------------------------------------------------

describe('platformMix', () => {
  it('returns percentage breakdown by platform summing to 1', () => {
    const posts = [
      makePost({ platform: 'twitter' }),
      makePost({ platform: 'twitter' }),
      makePost({ platform: 'instagram' }),
    ]
    const result = platformMix(posts)
    expect(result['twitter']).toBeCloseTo(2 / 3)
    expect(result['instagram']).toBeCloseTo(1 / 3)
    const total = Object.values(result).reduce((s, v) => s + v, 0)
    expect(total).toBeCloseTo(1)
  })

  it('returns empty for empty input', () => {
    expect(platformMix([])).toEqual({})
  })
})

// ---------------------------------------------------------------------------
// relativePerformance
// ---------------------------------------------------------------------------

describe('relativePerformance', () => {
  it('identifies my posts as leader when mine have higher engagement', () => {
    const myPosts = [
      makePost({ metrics: { impressions: 100, reach: 80, likes: 50, comments: 20, shares: 10 } }),
    ]
    const compPosts = [
      makePost({ metrics: { impressions: 100, reach: 80, likes: 2, comments: 1, shares: 0 } }),
    ]
    const result = relativePerformance(myPosts, compPosts)
    expect(result.leader).toBe('mine')
    expect(result.gap).toBeGreaterThan(0)
  })

  it('identifies competitor as leader when they have higher engagement', () => {
    const myPosts = [
      makePost({ metrics: { impressions: 100, reach: 80, likes: 2, comments: 1, shares: 0 } }),
    ]
    const compPosts = [
      makePost({ metrics: { impressions: 100, reach: 80, likes: 50, comments: 20, shares: 10 } }),
    ]
    const result = relativePerformance(myPosts, compPosts)
    expect(result.leader).toBe('competitor')
    expect(result.gap).toBeLessThan(0)
  })

  it('returns equal when rates are equal', () => {
    const post = makePost({ metrics: { impressions: 100, reach: 80, likes: 5, comments: 2, shares: 1 } })
    const result = relativePerformance([post], [{ ...post, id: 'other' }])
    expect(result.leader).toBe('equal')
  })

  it('includes myAvgEngagement and competitorAvgEngagement', () => {
    const result = relativePerformance(
      [makePost({ metrics: { impressions: 1000, reach: 800, likes: 100, comments: 0, shares: 0 } })],
      [makePost({ metrics: { impressions: 1000, reach: 800, likes: 50, comments: 0, shares: 0 } })]
    )
    expect(result.myAvgEngagement).toBeCloseTo(0.1)
    expect(result.competitorAvgEngagement).toBeCloseTo(0.05)
  })
})

// ---------------------------------------------------------------------------
// pickPostViralityPotential
// ---------------------------------------------------------------------------

describe('pickPostViralityPotential', () => {
  it('returns higher score for higher confidence', () => {
    const low = pickPostViralityPotential(55, 'nfl', false, false)
    const high = pickPostViralityPotential(90, 'nfl', false, false)
    expect(high).toBeGreaterThan(low)
  })

  it('primetime adds to score', () => {
    const noPrime = pickPostViralityPotential(70, 'nfl', false, false)
    const prime = pickPostViralityPotential(70, 'nfl', true, false)
    expect(prime).toBeGreaterThan(noPrime)
  })

  it('line movement adds to score', () => {
    const noMove = pickPostViralityPotential(70, 'nfl', false, false)
    const move = pickPostViralityPotential(70, 'nfl', false, true)
    expect(move).toBeGreaterThan(noMove)
  })

  it('score is within 0-100 range', () => {
    const max = pickPostViralityPotential(100, 'nfl', true, true)
    const min = pickPostViralityPotential(0, 'other', false, false)
    expect(max).toBeLessThanOrEqual(100)
    expect(min).toBeGreaterThanOrEqual(0)
  })

  it('confidence <= 50 contributes 0 base points', () => {
    const score50 = pickPostViralityPotential(50, 'nfl', false, false)
    const score40 = pickPostViralityPotential(40, 'nfl', false, false)
    expect(score50).toBe(0)
    expect(score40).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// gameDayEngagementBoost
// ---------------------------------------------------------------------------

describe('gameDayEngagementBoost', () => {
  it('multiplies by 1.5 on game day', () => {
    expect(gameDayEngagementBoost(0.1, true, false)).toBeCloseTo(0.15)
  })

  it('multiplies by additional 1.3 in playoffs', () => {
    expect(gameDayEngagementBoost(0.1, true, true)).toBeCloseTo(0.1 * 1.5 * 1.3)
  })

  it('only playoffs multiplier without game day', () => {
    expect(gameDayEngagementBoost(0.1, false, true)).toBeCloseTo(0.1 * 1.3)
  })

  it('returns base when neither game day nor playoffs', () => {
    expect(gameDayEngagementBoost(0.1, false, false)).toBeCloseTo(0.1)
  })
})

// ---------------------------------------------------------------------------
// contentCalendarScore
// ---------------------------------------------------------------------------

describe('contentCalendarScore', () => {
  it('returns 100 for perfect inputs', () => {
    expect(contentCalendarScore(7, 0.05, 5)).toBeCloseTo(100)
  })

  it('returns value in 0-100 range', () => {
    const low = contentCalendarScore(0, 0, 0)
    const mid = contentCalendarScore(3, 0.025, 2)
    const high = contentCalendarScore(10, 0.1, 6)
    expect(low).toBeGreaterThanOrEqual(0)
    expect(mid).toBeGreaterThanOrEqual(0)
    expect(mid).toBeLessThanOrEqual(100)
    expect(high).toBeLessThanOrEqual(100)
  })

  it('higher values yield higher score', () => {
    const lower = contentCalendarScore(1, 0.01, 1)
    const higher = contentCalendarScore(5, 0.04, 4)
    expect(higher).toBeGreaterThan(lower)
  })
})

// ---------------------------------------------------------------------------
// estimatedSentiment
// ---------------------------------------------------------------------------

describe('estimatedSentiment', () => {
  it('returns positive when likes dominate (>70%)', () => {
    expect(estimatedSentiment(800, 100, 100)).toBe('positive')
  })

  it('returns positive when shares dominate (>40%)', () => {
    expect(estimatedSentiment(100, 50, 450)).toBe('positive')
  })

  it('returns negative when comments are high and likes are low', () => {
    // commentRatio > 0.4 and likeRatio < 0.4 = negative (controversy)
    expect(estimatedSentiment(50, 500, 50)).toBe('negative')
  })

  it('returns neutral for balanced distribution', () => {
    expect(estimatedSentiment(33, 33, 34)).toBe('neutral')
  })

  it('returns neutral for all zeros', () => {
    expect(estimatedSentiment(0, 0, 0)).toBe('neutral')
  })
})

// ---------------------------------------------------------------------------
// hashtagEfficiency
// ---------------------------------------------------------------------------

describe('hashtagEfficiency', () => {
  it('returns impressions / hashtagCount for 10 or fewer', () => {
    expect(hashtagEfficiency(1000, 5)).toBe(200)
  })

  it('shows diminishing returns for > 10 hashtags', () => {
    const ten = hashtagEfficiency(1000, 10)
    const twenty = hashtagEfficiency(1000, 20)
    // Per-hashtag return should be lower with 20 hashtags
    expect(twenty).toBeLessThan(ten)
  })

  it('returns 0 when hashtagCount is 0', () => {
    expect(hashtagEfficiency(1000, 0)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Aggregation helpers
// ---------------------------------------------------------------------------

describe('totalImpressions', () => {
  it('sums impressions across posts', () => {
    const posts = [
      makePost({ metrics: { impressions: 500, reach: 400, likes: 10, comments: 5, shares: 2 } }),
      makePost({ metrics: { impressions: 1500, reach: 1200, likes: 30, comments: 15, shares: 5 } }),
    ]
    expect(totalImpressions(posts)).toBe(2000)
  })

  it('returns 0 for empty array', () => {
    expect(totalImpressions([])).toBe(0)
  })
})

describe('totalReach', () => {
  it('sums reach across posts', () => {
    const posts = [
      makePost({ metrics: { impressions: 1000, reach: 400, likes: 10, comments: 5, shares: 2 } }),
      makePost({ metrics: { impressions: 2000, reach: 1200, likes: 30, comments: 15, shares: 5 } }),
    ]
    expect(totalReach(posts)).toBe(1600)
  })

  it('returns 0 for empty array', () => {
    expect(totalReach([])).toBe(0)
  })
})

describe('totalEngagements', () => {
  it('sums likes + comments + shares across posts', () => {
    const posts = [
      makePost({ metrics: { impressions: 1000, reach: 800, likes: 10, comments: 5, shares: 2 } }),
      makePost({ metrics: { impressions: 2000, reach: 1600, likes: 30, comments: 15, shares: 5 } }),
    ]
    // (10+5+2) + (30+15+5) = 17 + 50 = 67
    expect(totalEngagements(posts)).toBe(67)
  })

  it('returns 0 for empty array', () => {
    expect(totalEngagements([])).toBe(0)
  })
})

describe('overallEngagementRate', () => {
  it('total engagements / total impressions', () => {
    const posts = [
      makePost({ metrics: { impressions: 1000, reach: 800, likes: 50, comments: 20, shares: 10 } }),
      makePost({ metrics: { impressions: 1000, reach: 800, likes: 50, comments: 20, shares: 10 } }),
    ]
    // total engagements = 80 + 80 = 160; total impressions = 2000; rate = 0.08
    expect(overallEngagementRate(posts)).toBeCloseTo(0.08)
  })

  it('returns 0 for empty array', () => {
    expect(overallEngagementRate([])).toBe(0)
  })

  it('returns 0 when all impressions are 0', () => {
    const posts = [
      makePost({ metrics: { impressions: 0, reach: 0, likes: 10, comments: 5, shares: 2 } }),
    ]
    expect(overallEngagementRate(posts)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('rankPosts handles single post', () => {
    const post = makePost()
    const ranked = rankPosts([post])
    expect(ranked).toHaveLength(1)
    expect(ranked[0].post).toBe(post)
  })

  it('topNPosts with N=0 returns empty', () => {
    const post = makePost()
    expect(topNPosts([post], 0)).toHaveLength(0)
  })

  it('bestPostingHours returns fewer than N if not enough distinct hours', () => {
    const posts = [makePost({ publishedAt: Date.UTC(2024, 0, 15, 9, 0, 0) })]
    expect(bestPostingHours(posts, 3)).toHaveLength(1)
  })

  it('recentTrend stable when changes are within threshold', () => {
    const now = Date.UTC(2024, 0, 20, 12, 0, 0)
    const p1 = makePost({
      publishedAt: now - 6 * 24 * 60 * 60 * 1000,
      metrics: { impressions: 1000, reach: 800, likes: 50, comments: 20, shares: 10 },
    })
    const p2 = makePost({
      publishedAt: now - 1 * 24 * 60 * 60 * 1000,
      metrics: { impressions: 1000, reach: 800, likes: 51, comments: 20, shares: 10 },
    })
    expect(recentTrend([p1, p2], 7)).toBe('stable')
  })

  it('projectedFollowers with negative growth rate', () => {
    // 1000 followers, -5% weekly, 2 weeks = 1000 * 0.95^2 = 902.5
    expect(projectedFollowers(1000, -0.05, 2)).toBeCloseTo(902.5)
  })

  it('platformMix single platform = 1.0', () => {
    const posts = [makePost({ platform: 'instagram' }), makePost({ platform: 'instagram' })]
    const mix = platformMix(posts)
    expect(mix['instagram']).toBeCloseTo(1.0)
  })
})
