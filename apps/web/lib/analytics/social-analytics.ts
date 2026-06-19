/**
 * Pure TypeScript social media analytics utilities.
 * No npm dependencies. No `any`.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SocialPost {
  id: string
  platform: 'twitter' | 'instagram' | 'tiktok' | 'youtube' | 'facebook' | 'linkedin'
  content: string
  publishedAt: number // ms epoch
  metrics: {
    impressions: number
    reach: number
    likes: number
    comments: number
    shares: number
    saves?: number
    clicks?: number
    videoViews?: number
    watchTimeSeconds?: number
  }
  followerCount: number
}

export interface ContentPerformance {
  post: SocialPost
  engagementRate: number
  viralityScore: number
  reachRate: number // reach / followers
  performanceTier: 'viral' | 'high' | 'average' | 'low' | 'poor'
}

// ---------------------------------------------------------------------------
// Engagement metrics
// ---------------------------------------------------------------------------

/**
 * (likes + comments + shares + saves) / impressions; saves=0 if missing
 */
export function engagementRate(post: SocialPost): number {
  const { impressions, likes, comments, shares, saves } = post.metrics
  if (impressions === 0) return 0
  return (likes + comments + shares + (saves ?? 0)) / impressions
}

/**
 * (likes + comments + shares) / reach
 */
export function reachEngagementRate(post: SocialPost): number {
  const { reach, likes, comments, shares } = post.metrics
  if (reach === 0) return 0
  return (likes + comments + shares) / reach
}

/**
 * (likes + comments + shares) / followerCount
 */
export function followerEngagementRate(post: SocialPost): number {
  if (post.followerCount === 0) return 0
  const { likes, comments, shares } = post.metrics
  return (likes + comments + shares) / post.followerCount
}

export function clickThroughRate(clicks: number, impressions: number): number {
  if (impressions === 0) return 0
  return clicks / impressions
}

export function viewThroughRate(videoViews: number, impressions: number): number {
  if (impressions === 0) return 0
  return videoViews / impressions
}

/** seconds per view */
export function avgWatchTime(totalWatchTime: number, videoViews: number): number {
  if (videoViews === 0) return 0
  return totalWatchTime / videoViews
}

// ---------------------------------------------------------------------------
// Platform-specific benchmarks
// ---------------------------------------------------------------------------

const PLATFORM_BENCHMARKS: Record<SocialPost['platform'], number> = {
  twitter: 0.005,
  instagram: 0.03,
  tiktok: 0.05,
  youtube: 0.04,
  facebook: 0.02,
  linkedin: 0.02,
}

/**
 * Industry average engagement rates per platform.
 */
export function platformBenchmarkEngagement(platform: SocialPost['platform']): number {
  return PLATFORM_BENCHMARKS[platform]
}

/**
 * (post engagement rate - benchmark) / benchmark
 * Positive = above average
 */
export function engagementVsBenchmark(post: SocialPost): number {
  const benchmark = platformBenchmarkEngagement(post.platform)
  if (benchmark === 0) return 0
  const rate = engagementRate(post)
  return (rate - benchmark) / benchmark
}

// ---------------------------------------------------------------------------
// Virality model
// ---------------------------------------------------------------------------

/**
 * (shares * 3 + comments * 2 + likes) / impressions * 1000
 */
export function viralityScore(post: SocialPost): number {
  const { impressions, likes, comments, shares } = post.metrics
  if (impressions === 0) return 0
  return ((shares * 3 + comments * 2 + likes) / impressions) * 1000
}

/**
 * >10=viral, 3-10=high, 1-3=average, 0.3-1=low, <0.3=poor
 */
export function classifyVirality(score: number): 'viral' | 'high' | 'average' | 'low' | 'poor' {
  if (score > 10) return 'viral'
  if (score >= 3) return 'high'
  if (score >= 1) return 'average'
  if (score >= 0.3) return 'low'
  return 'poor'
}

export function amplificationRate(shares: number, reach: number): number {
  if (reach === 0) return 0
  return shares / reach
}

export function conversationRate(comments: number, reach: number): number {
  if (reach === 0) return 0
  return comments / reach
}

// ---------------------------------------------------------------------------
// Content performance analysis
// ---------------------------------------------------------------------------

export function analyzePost(post: SocialPost): ContentPerformance {
  const er = engagementRate(post)
  const vs = viralityScore(post)
  const rr = post.followerCount === 0 ? 0 : post.metrics.reach / post.followerCount
  const tier = classifyVirality(vs)
  return {
    post,
    engagementRate: er,
    viralityScore: vs,
    reachRate: rr,
    performanceTier: tier,
  }
}

/**
 * Sorted by viralityScore descending.
 */
export function rankPosts(posts: SocialPost[]): ContentPerformance[] {
  return posts
    .map(analyzePost)
    .sort((a, b) => b.viralityScore - a.viralityScore)
}

export function topNPosts(posts: SocialPost[], n: number): ContentPerformance[] {
  return rankPosts(posts).slice(0, n)
}

export function avgEngagementRate(posts: SocialPost[]): number {
  if (posts.length === 0) return 0
  const total = posts.reduce((sum, p) => sum + engagementRate(p), 0)
  return total / posts.length
}

export function medianEngagementRate(posts: SocialPost[]): number {
  if (posts.length === 0) return 0
  const rates = posts.map(engagementRate).sort((a, b) => a - b)
  const mid = Math.floor(rates.length / 2)
  if (rates.length % 2 === 1) return rates[mid] ?? 0
  return ((rates[mid - 1] ?? 0) + (rates[mid] ?? 0)) / 2
}

// ---------------------------------------------------------------------------
// Time-based analytics
// ---------------------------------------------------------------------------

/** hour 0-23 → count of posts published in that UTC hour */
export function postsByHour(posts: SocialPost[]): Record<number, number> {
  const counts: Record<number, number> = {}
  for (const post of posts) {
    const hour = new Date(post.publishedAt).getUTCHours()
    counts[hour] = (counts[hour] ?? 0) + 1
  }
  return counts
}

/**
 * Hours sorted by avg engagement rate of posts in that hour; topN default 3.
 */
export function bestPostingHours(posts: SocialPost[], topN = 3): number[] {
  const byHour: Record<number, SocialPost[]> = {}
  for (const post of posts) {
    const hour = new Date(post.publishedAt).getUTCHours()
    if (!byHour[hour]) byHour[hour] = []
    byHour[hour].push(post)
  }
  const hourEntries = Object.entries(byHour).map(([h, ps]) => ({
    hour: Number(h),
    avg: avgEngagementRate(ps),
  }))
  hourEntries.sort((a, b) => b.avg - a.avg)
  return hourEntries.slice(0, topN).map((e) => e.hour)
}

/** 0=Sun ... 6=Sat */
export function engagementByDayOfWeek(posts: SocialPost[]): Record<number, number> {
  const byDay: Record<number, SocialPost[]> = {}
  for (const post of posts) {
    const day = new Date(post.publishedAt).getUTCDay()
    if (!byDay[day]) byDay[day] = []
    byDay[day].push(post)
  }
  const result: Record<number, number> = {}
  for (const [d, ps] of Object.entries(byDay)) {
    result[Number(d)] = avgEngagementRate(ps)
  }
  return result
}

/**
 * Compare avg engagement in first half vs second half of last `days` days of posts.
 * "last `days` days" means posts within the most recent `days`-day window.
 */
export function recentTrend(
  posts: SocialPost[],
  days: number
): 'growing' | 'declining' | 'stable' {
  if (posts.length === 0) return 'stable'

  const nowMs = Math.max(...posts.map((p) => p.publishedAt))
  const windowStart = nowMs - days * 24 * 60 * 60 * 1000
  const recent = posts
    .filter((p) => p.publishedAt >= windowStart)
    .sort((a, b) => a.publishedAt - b.publishedAt)

  if (recent.length < 2) return 'stable'

  const mid = Math.floor(recent.length / 2)
  const firstHalf = recent.slice(0, mid)
  const secondHalf = recent.slice(mid)

  const firstAvg = avgEngagementRate(firstHalf)
  const secondAvg = avgEngagementRate(secondHalf)

  const delta = secondAvg - firstAvg
  const threshold = firstAvg * 0.05 // 5% relative change threshold

  if (delta > threshold) return 'growing'
  if (delta < -threshold) return 'declining'
  return 'stable'
}

// ---------------------------------------------------------------------------
// Reach & audience growth
// ---------------------------------------------------------------------------

/**
 * Organic reach fraction estimate: min(1, followerCount / reach)
 */
export function estimatedOrganic(reach: number, followerCount: number): number {
  if (reach === 0) return 1
  return Math.min(1, followerCount / reach)
}

export function audienceGrowthRate(currentFollowers: number, previousFollowers: number): number {
  if (previousFollowers === 0) return 0
  return (currentFollowers - previousFollowers) / previousFollowers
}

export function projectedFollowers(
  current: number,
  weeklyGrowthRate: number,
  weeks: number
): number {
  return current * Math.pow(1 + weeklyGrowthRate, weeks)
}

// ---------------------------------------------------------------------------
// Content mix analysis
// ---------------------------------------------------------------------------

/**
 * Returns percentage breakdown by type (fractions that sum to ~1).
 */
export function contentTypeBreakdown(
  posts: SocialPost[],
  getType: (post: SocialPost) => string
): Record<string, number> {
  if (posts.length === 0) return {}
  const counts: Record<string, number> = {}
  for (const post of posts) {
    const type = getType(post)
    counts[type] = (counts[type] ?? 0) + 1
  }
  const result: Record<string, number> = {}
  for (const [type, count] of Object.entries(counts)) {
    result[type] = count / posts.length
  }
  return result
}

/**
 * Percentage breakdown by platform (fractions that sum to ~1).
 */
export function platformMix(posts: SocialPost[]): Record<string, number> {
  return contentTypeBreakdown(posts, (p) => p.platform)
}

// ---------------------------------------------------------------------------
// Competitive benchmarking
// ---------------------------------------------------------------------------

export function relativePerformance(
  myPosts: SocialPost[],
  competitorPosts: SocialPost[]
): {
  myAvgEngagement: number
  competitorAvgEngagement: number
  gap: number
  leader: 'mine' | 'competitor' | 'equal'
} {
  const myAvgEngagement = avgEngagementRate(myPosts)
  const competitorAvgEngagement = avgEngagementRate(competitorPosts)
  const gap = myAvgEngagement - competitorAvgEngagement

  let leader: 'mine' | 'competitor' | 'equal'
  if (gap > 0) {
    leader = 'mine'
  } else if (gap < 0) {
    leader = 'competitor'
  } else {
    leader = 'equal'
  }

  return { myAvgEngagement, competitorAvgEngagement, gap, leader }
}

// ---------------------------------------------------------------------------
// Sports-specific
// ---------------------------------------------------------------------------

/**
 * Score 0-100 based on confidence, primetime, line movement, and sport.
 * confidence: maps 50→0pts, 70→20pts, 90→40pts (linear interpolation)
 * primetime: +20; lineMovement: +15
 * sport multipliers (applied to total): nfl/nba 1.0, soccer 0.95, others 0.9
 */
export function pickPostViralityPotential(
  confidence: number,
  sport: string,
  isPrimetime: boolean,
  hasLineMovement: boolean
): number {
  // Confidence contribution: 0 pts at <=50, linear to 40 pts at 90+
  const clampedConf = Math.max(50, Math.min(100, confidence))
  const confPts = clampedConf <= 50 ? 0 : Math.min(40, ((clampedConf - 50) / 40) * 40)

  let score = confPts
  if (isPrimetime) score += 20
  if (hasLineMovement) score += 15

  // Sport multiplier
  const sportLower = sport.toLowerCase()
  let multiplier = 0.9
  if (sportLower === 'nfl' || sportLower === 'nba') {
    multiplier = 1.0
  } else if (sportLower === 'soccer' || sportLower === 'mlb' || sportLower === 'nhl') {
    multiplier = 0.95
  }

  return Math.min(100, Math.max(0, score * multiplier))
}

/**
 * isGameDay: multiply by 1.5; isPlayoffs: additional 1.3x; neither = base
 */
export function gameDayEngagementBoost(
  baseEngagementRate: number,
  isGameDay: boolean,
  isPlayoffs: boolean
): number {
  let result = baseEngagementRate
  if (isGameDay) result *= 1.5
  if (isPlayoffs) result *= 1.3
  return result
}

/**
 * Weighted score 0-100: frequency(40%) + engagement(40%) + diversity(20%)
 * Normalize: postsPerWeek/7, avgEngagement/0.05, platformDiversity/5
 */
export function contentCalendarScore(
  postsPerWeek: number,
  avgEngagementRateValue: number,
  platformDiversity: number
): number {
  const freqNorm = Math.min(1, postsPerWeek / 7)
  const engNorm = Math.min(1, avgEngagementRateValue / 0.05)
  const divNorm = Math.min(1, platformDiversity / 5)

  return Math.min(100, (freqNorm * 0.4 + engNorm * 0.4 + divNorm * 0.2) * 100)
}

// ---------------------------------------------------------------------------
// Sentiment proxy
// ---------------------------------------------------------------------------

/**
 * High likes/low comments = positive; low likes/high comments relative = negative (controversy)
 * likes/total > 0.7 = positive; shares/total > 0.4 = positive; else neutral or check ratio
 */
export function estimatedSentiment(
  likes: number,
  comments: number,
  shares: number
): 'positive' | 'neutral' | 'negative' {
  const total = likes + comments + shares
  if (total === 0) return 'neutral'

  const likeRatio = likes / total
  const shareRatio = shares / total
  const commentRatio = comments / total

  if (likeRatio > 0.7) return 'positive'
  if (shareRatio > 0.4) return 'positive'
  // Controversy: high comments relative to likes = negative signal
  if (commentRatio > 0.4 && likeRatio < 0.4) return 'negative'
  return 'neutral'
}

// ---------------------------------------------------------------------------
// Hashtag efficiency
// ---------------------------------------------------------------------------

export function hashtagEfficiency(impressions: number, hashtagCount: number): number {
  if (hashtagCount === 0) return 0
  // Diminishing returns for > 10 hashtags
  const effectiveCount = hashtagCount <= 10 ? hashtagCount : 10 + Math.sqrt(hashtagCount - 10)
  return impressions / effectiveCount
}

// ---------------------------------------------------------------------------
// Aggregation helpers
// ---------------------------------------------------------------------------

export function totalImpressions(posts: SocialPost[]): number {
  return posts.reduce((sum, p) => sum + p.metrics.impressions, 0)
}

export function totalReach(posts: SocialPost[]): number {
  return posts.reduce((sum, p) => sum + p.metrics.reach, 0)
}

export function totalEngagements(posts: SocialPost[]): number {
  return posts.reduce(
    (sum, p) => sum + p.metrics.likes + p.metrics.comments + p.metrics.shares,
    0
  )
}

export function overallEngagementRate(posts: SocialPost[]): number {
  const impressions = totalImpressions(posts)
  if (impressions === 0) return 0
  return totalEngagements(posts) / impressions
}
