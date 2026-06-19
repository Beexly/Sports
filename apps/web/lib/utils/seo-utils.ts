/**
 * SEO Utilities — pure TypeScript, no DOM, no external dependencies.
 * All functions are data-transformation only.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MetaTags {
  title: string
  description: string
  canonical?: string
  robots?: string
  keywords?: string[]
}

export interface OpenGraphTags {
  type: 'website' | 'article' | 'product' | 'profile'
  title: string
  description: string
  url: string
  image?: string
  imageAlt?: string
  siteName?: string
  locale?: string
  publishedTime?: string // ISO date
  modifiedTime?: string // ISO date
  author?: string
}

export interface TwitterCardTags {
  card: 'summary' | 'summary_large_image' | 'player' | 'app'
  title: string
  description: string
  image?: string
  imageAlt?: string
  site?: string // @handle
  creator?: string // @handle
}

export interface StructuredDataOrg {
  type: 'Organization'
  name: string
  url: string
  logo?: string
  description?: string
  sameAs?: string[]
}

export interface StructuredDataArticle {
  type: 'Article' | 'NewsArticle' | 'BlogPosting'
  headline: string
  description: string
  url: string
  datePublished: string
  dateModified?: string
  author: string
  image?: string
  publisher?: { name: string; logo?: string }
}

export interface StructuredDataBreadcrumb {
  items: Array<{ name: string; url: string }>
}

export interface StructuredDataFAQ {
  items: Array<{ question: string; answer: string }>
}

export interface SitemapEntry {
  loc: string
  lastmod?: string // YYYY-MM-DD
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number // 0.0 - 1.0
}

// ---------------------------------------------------------------------------
// Meta tag generation
// ---------------------------------------------------------------------------

/**
 * Join non-empty parts with separator (default ' | '); trim each part.
 */
export function buildTitle(parts: string[], separator: string = ' | '): string {
  return parts
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .join(separator)
}

/**
 * Truncate description at word boundary; default maxLength 160.
 * Appends '...' if truncated.
 */
export function truncateDescription(desc: string, maxLength: number = 160): string {
  const trimmed = desc.trim()
  if (trimmed.length <= maxLength) return trimmed

  // Find last space before maxLength - 3 (room for '...')
  const cutoff = maxLength - 3
  const lastSpace = trimmed.lastIndexOf(' ', cutoff)
  const end = lastSpace > 0 ? lastSpace : cutoff
  return trimmed.slice(0, end) + '...'
}

/**
 * Build canonical URL: join base + path, add params as sorted query string,
 * normalize double slashes (except after protocol).
 */
export function buildCanonicalUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, string>
): string {
  // Strip trailing slash from base
  const base = baseUrl.replace(/\/+$/, '')
  // Ensure path starts with /
  const normalPath = path.startsWith('/') ? path : '/' + path
  // Combine and normalize double slashes (but preserve protocol://)
  const combined = (base + normalPath).replace(/([^:])\/\/+/g, '$1/')

  if (!params || Object.keys(params).length === 0) return combined

  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&')

  return combined + '?' + sorted
}

/**
 * Validate meta tags.
 * - title: 10-70 chars
 * - description: 50-160 chars
 * - canonical: valid URL format (starts with http/https)
 */
export function validateMetaTags(meta: MetaTags): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (meta.title.length < 10) errors.push('Title too short (minimum 10 characters)')
  if (meta.title.length > 70) errors.push('Title too long (maximum 70 characters)')
  if (meta.description.length < 50) errors.push('Description too short (minimum 50 characters)')
  if (meta.description.length > 160) errors.push('Description too long (maximum 160 characters)')
  if (meta.canonical !== undefined) {
    try {
      const u = new URL(meta.canonical)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        errors.push('Canonical URL must use http or https protocol')
      }
    } catch {
      errors.push('Canonical URL is not a valid URL')
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Score meta tags 0-100.
 * Penalizes: title too short/long, description too short/long, missing canonical.
 */
export function scoreMetaTags(meta: MetaTags): number {
  let score = 100

  // Title scoring (ideal 30-60 chars)
  const titleLen = meta.title.length
  if (titleLen < 10) score -= 30
  else if (titleLen < 30) score -= 10
  else if (titleLen > 70) score -= 20
  else if (titleLen > 60) score -= 5

  // Description scoring (ideal 120-155 chars)
  const descLen = meta.description.length
  if (descLen < 50) score -= 30
  else if (descLen < 80) score -= 10
  else if (descLen > 160) score -= 20
  else if (descLen > 155) score -= 5

  // Canonical
  if (!meta.canonical) score -= 10

  // Keywords
  if (!meta.keywords || meta.keywords.length === 0) score -= 5

  return Math.max(0, Math.min(100, score))
}

// ---------------------------------------------------------------------------
// Open Graph
// ---------------------------------------------------------------------------

/**
 * Build og:* meta tags; omit undefined fields.
 */
export function buildOpenGraphTags(og: OpenGraphTags): Record<string, string> {
  const tags: Record<string, string> = {
    'og:type': og.type,
    'og:title': og.title,
    'og:description': og.description,
    'og:url': og.url,
  }

  if (og.image !== undefined) tags['og:image'] = og.image
  if (og.imageAlt !== undefined) tags['og:image:alt'] = og.imageAlt
  if (og.siteName !== undefined) tags['og:site_name'] = og.siteName
  if (og.locale !== undefined) tags['og:locale'] = og.locale
  if (og.publishedTime !== undefined) tags['article:published_time'] = og.publishedTime
  if (og.modifiedTime !== undefined) tags['article:modified_time'] = og.modifiedTime
  if (og.author !== undefined) tags['article:author'] = og.author

  return tags
}

/**
 * Build twitter:* meta tags; omit undefined fields.
 */
export function buildTwitterCardTags(twitter: TwitterCardTags): Record<string, string> {
  const tags: Record<string, string> = {
    'twitter:card': twitter.card,
    'twitter:title': twitter.title,
    'twitter:description': twitter.description,
  }

  if (twitter.image !== undefined) tags['twitter:image'] = twitter.image
  if (twitter.imageAlt !== undefined) tags['twitter:image:alt'] = twitter.imageAlt
  if (twitter.site !== undefined) tags['twitter:site'] = twitter.site
  if (twitter.creator !== undefined) tags['twitter:creator'] = twitter.creator

  return tags
}

// ---------------------------------------------------------------------------
// Structured data (JSON-LD)
// ---------------------------------------------------------------------------

/**
 * Build Organization JSON-LD schema.
 */
export function buildOrganizationSchema(data: StructuredDataOrg): object {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: data.name,
    url: data.url,
  }

  if (data.logo !== undefined) schema['logo'] = data.logo
  if (data.description !== undefined) schema['description'] = data.description
  if (data.sameAs !== undefined && data.sameAs.length > 0) schema['sameAs'] = data.sameAs

  return schema
}

/**
 * Build Article JSON-LD schema.
 */
export function buildArticleSchema(data: StructuredDataArticle): object {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': data.type,
    headline: data.headline,
    description: data.description,
    url: data.url,
    datePublished: data.datePublished,
    author: {
      '@type': 'Person',
      name: data.author,
    },
  }

  if (data.dateModified !== undefined) schema['dateModified'] = data.dateModified
  if (data.image !== undefined) schema['image'] = data.image
  if (data.publisher !== undefined) {
    const pub: Record<string, unknown> = {
      '@type': 'Organization',
      name: data.publisher.name,
    }
    if (data.publisher.logo !== undefined) pub['logo'] = data.publisher.logo
    schema['publisher'] = pub
  }

  return schema
}

/**
 * Build BreadcrumbList JSON-LD with ListItem elements numbered 1..n.
 */
export function buildBreadcrumbSchema(data: StructuredDataBreadcrumb): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: data.items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

/**
 * Build FAQPage JSON-LD with mainEntity array.
 */
export function buildFaqSchema(data: StructuredDataFAQ): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: data.items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

/**
 * Build WebSite JSON-LD with optional SearchAction.
 */
export function buildWebSiteSchema(name: string, url: string, searchUrl?: string): object {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
  }

  if (searchUrl !== undefined) {
    schema['potentialAction'] = {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: searchUrl,
      },
      'query-input': 'required name=search_term_string',
    }
  }

  return schema
}

/**
 * Serialize JSON-LD to string. Never throws.
 */
export function serializeJsonLd(schema: object): string {
  try {
    return JSON.stringify(schema, null, 2)
  } catch {
    return '{}'
  }
}

// ---------------------------------------------------------------------------
// Sitemap
// ---------------------------------------------------------------------------

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Build XML sitemap string.
 */
export function buildSitemapXml(
  entries: SitemapEntry[],
  opts?: { xmlns?: string }
): string {
  const ns = opts?.xmlns ?? 'http://www.sitemaps.org/schemas/sitemap/0.9'
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<urlset xmlns="${ns}">`,
  ]

  for (const entry of entries) {
    lines.push('  <url>')
    lines.push(`    <loc>${escapeXml(entry.loc)}</loc>`)
    if (entry.lastmod !== undefined) lines.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`)
    if (entry.changefreq !== undefined) lines.push(`    <changefreq>${entry.changefreq}</changefreq>`)
    if (entry.priority !== undefined) lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`)
    lines.push('  </url>')
  }

  lines.push('</urlset>')
  return lines.join('\n')
}

/**
 * Build sitemap index XML.
 */
export function buildSitemapIndex(
  sitemaps: Array<{ loc: string; lastmod?: string }>
): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ]

  for (const sm of sitemaps) {
    lines.push('  <sitemap>')
    lines.push(`    <loc>${escapeXml(sm.loc)}</loc>`)
    if (sm.lastmod !== undefined) lines.push(`    <lastmod>${escapeXml(sm.lastmod)}</lastmod>`)
    lines.push('  </sitemap>')
  }

  lines.push('</sitemapindex>')
  return lines.join('\n')
}

/**
 * Parse/fill defaults for a sitemap entry.
 * Defaults: changefreq='weekly', priority=0.5; clamps priority 0-1.
 */
export function parseSitemapEntry(entry: Partial<SitemapEntry>): SitemapEntry {
  const priority = entry.priority !== undefined
    ? Math.max(0, Math.min(1, entry.priority))
    : 0.5

  return {
    loc: entry.loc ?? '',
    changefreq: entry.changefreq ?? 'weekly',
    priority,
    ...(entry.lastmod !== undefined ? { lastmod: entry.lastmod } : {}),
  }
}

/**
 * Apply regex pattern rules to override priority/changefreq.
 * First matching pattern wins; non-matching entries unchanged.
 */
export function prioritizeSitemapEntries(
  entries: SitemapEntry[],
  rules: Array<{ pattern: string; priority: number; changefreq?: SitemapEntry['changefreq'] }>
): SitemapEntry[] {
  return entries.map((entry) => {
    for (const rule of rules) {
      if (new RegExp(rule.pattern).test(entry.loc)) {
        return {
          ...entry,
          priority: rule.priority,
          ...(rule.changefreq !== undefined ? { changefreq: rule.changefreq } : {}),
        }
      }
    }
    return entry
  })
}

// ---------------------------------------------------------------------------
// SEO scoring
// ---------------------------------------------------------------------------

/**
 * Flesch-Kincaid readability approximation; 0-100; higher = easier.
 * Uses: 206.835 - 1.015*(words/sentences) - 84.6*(syllables/words)
 */
export function readabilityScore(text: string): number {
  const cleaned = text.trim()
  if (!cleaned) return 0

  // Count sentences (split on .!?)
  const sentences = cleaned.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  const sentenceCount = Math.max(1, sentences.length)

  // Count words
  const words = cleaned.split(/\s+/).filter((w) => w.length > 0)
  const wordCount = Math.max(1, words.length)

  // Estimate syllables (count vowel groups per word)
  const countSyllables = (word: string): number => {
    const w = word.toLowerCase().replace(/[^a-z]/g, '')
    if (w.length === 0) return 1
    const matches = w.match(/[aeiouy]+/g)
    let count = matches ? matches.length : 1
    // Subtract silent e at end
    if (w.endsWith('e') && w.length > 2) count = Math.max(1, count - 1)
    return Math.max(1, count)
  }

  const syllableCount = words.reduce((sum, w) => sum + countSyllables(w), 0)

  const score = 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllableCount / wordCount)
  return Math.max(0, Math.min(100, score))
}

/**
 * Keyword density: case-insensitive count / word count; returns fraction 0-1.
 */
export function keywordDensity(text: string, keyword: string): number {
  const words = text.toLowerCase().split(/\s+/).filter((w) => w.length > 0)
  if (words.length === 0) return 0
  const kw = keyword.toLowerCase()
  const count = words.filter((w) => w.replace(/[^a-z0-9]/g, '') === kw.replace(/[^a-z0-9]/g, '')).length
  return count / words.length
}

/**
 * Extract h1-h6 headings from an HTML string using regex.
 */
export function extractHeadings(html: string): Array<{ level: number; text: string }> {
  const results: Array<{ level: number; text: string }> = []
  const regex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi
  let match: RegExpExecArray | null
  while ((match = regex.exec(html)) !== null) {
    const level = parseInt(match[1], 10)
    // Strip inner HTML tags
    const text = match[2].replace(/<[^>]+>/g, '').trim()
    results.push({ level, text })
  }
  return results
}

/**
 * Count internal links: href starts with / or contains baseDomain.
 */
export function countInternalLinks(html: string, baseDomain: string): number {
  const regex = /<a\s[^>]*href=["']([^"']+)["'][^>]*>/gi
  let count = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(html)) !== null) {
    const href = match[1]
    if (href.startsWith('/') || href.includes(baseDomain)) {
      count++
    }
  }
  return count
}

/**
 * Count external links: absolute href NOT containing baseDomain.
 */
export function countExternalLinks(html: string, baseDomain: string): number {
  const regex = /<a\s[^>]*href=["']([^"']+)["'][^>]*>/gi
  let count = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(html)) !== null) {
    const href = match[1]
    if ((href.startsWith('http://') || href.startsWith('https://')) && !href.includes(baseDomain)) {
      count++
    }
  }
  return count
}

/**
 * Compute an overall SEO page score 0-100 with breakdown and issues.
 */
export function seoPageScore(opts: {
  title: string
  description: string
  h1Count: number
  wordCount: number
  hasCanonical: boolean
  hasOgImage: boolean
  internalLinks: number
  loadTimeMs?: number
}): {
  score: number
  breakdown: Record<string, number>
  issues: string[]
} {
  const breakdown: Record<string, number> = {}
  const issues: string[] = []

  // Title (20 pts)
  const titleLen = opts.title.length
  if (titleLen >= 10 && titleLen <= 70) {
    breakdown['title'] = 20
  } else {
    breakdown['title'] = titleLen < 10 ? 0 : 10
    issues.push(titleLen < 10 ? 'Title too short' : 'Title too long')
  }

  // Description (20 pts)
  const descLen = opts.description.length
  if (descLen >= 50 && descLen <= 160) {
    breakdown['description'] = 20
  } else {
    breakdown['description'] = descLen < 50 ? 0 : 10
    issues.push(descLen < 50 ? 'Description too short' : 'Description too long')
  }

  // H1 (15 pts)
  if (opts.h1Count === 1) {
    breakdown['h1'] = 15
  } else if (opts.h1Count === 0) {
    breakdown['h1'] = 0
    issues.push('Missing H1 tag')
  } else {
    breakdown['h1'] = 5
    issues.push('Multiple H1 tags')
  }

  // Word count (10 pts)
  if (opts.wordCount >= 300) {
    breakdown['wordCount'] = 10
  } else if (opts.wordCount >= 100) {
    breakdown['wordCount'] = 5
    issues.push('Low word count (under 300)')
  } else {
    breakdown['wordCount'] = 0
    issues.push('Very low word count')
  }

  // Canonical (15 pts)
  if (opts.hasCanonical) {
    breakdown['canonical'] = 15
  } else {
    breakdown['canonical'] = 0
    issues.push('Missing canonical URL')
  }

  // OG image (10 pts)
  if (opts.hasOgImage) {
    breakdown['ogImage'] = 10
  } else {
    breakdown['ogImage'] = 0
    issues.push('Missing OG image')
  }

  // Internal links (5 pts)
  if (opts.internalLinks >= 3) {
    breakdown['internalLinks'] = 5
  } else if (opts.internalLinks >= 1) {
    breakdown['internalLinks'] = 3
  } else {
    breakdown['internalLinks'] = 0
    issues.push('No internal links')
  }

  // Load time (5 pts)
  if (opts.loadTimeMs === undefined || opts.loadTimeMs <= 1000) {
    breakdown['loadTime'] = 5
  } else if (opts.loadTimeMs <= 3000) {
    breakdown['loadTime'] = 3
    issues.push('Slow load time')
  } else {
    breakdown['loadTime'] = 0
    issues.push('Very slow load time')
  }

  const score = Math.min(
    100,
    Object.values(breakdown).reduce((a, b) => a + b, 0)
  )

  return { score, breakdown, issues }
}

// ---------------------------------------------------------------------------
// URL utilities
// ---------------------------------------------------------------------------

/**
 * Slugify: lowercase, spaces/special chars → hyphens, trim hyphens.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Canonicalize URL: remove trailing slash (non-root), sort query params,
 * lowercase hostname.
 */
export function canonicalize(url: string): string {
  try {
    const u = new URL(url)
    u.hostname = u.hostname.toLowerCase()

    // Sort query params
    const params = Array.from(u.searchParams.entries()).sort(([a], [b]) => a.localeCompare(b))
    u.search = ''
    for (const [k, v] of params) {
      u.searchParams.append(k, v)
    }

    let result = u.toString()

    // Remove trailing slash unless root path
    if (u.pathname !== '/' && result.endsWith('/')) {
      result = result.slice(0, -1)
    }
    // Also remove trailing slash from pathname directly
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      result = result.replace(u.pathname, u.pathname.replace(/\/+$/, ''))
    }

    return result
  } catch {
    return url
  }
}

/**
 * Extract domain from URL: "https://example.com/path" → "example.com"
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

/**
 * Return true if url starts with http:// or https://.
 */
export function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

/**
 * Join URL path parts, avoiding double slashes.
 */
export function joinUrlPaths(...parts: string[]): string {
  const joined = parts
    .map((p, i) => {
      if (i === 0) return p.replace(/\/+$/, '')
      return p.replace(/^\/+/, '').replace(/\/+$/, '')
    })
    .filter((p) => p.length > 0)
    .join('/')

  // If first part is empty and original starts with /, preserve it
  if (parts[0]?.startsWith('/') && !joined.startsWith('/')) {
    return '/' + joined
  }

  return joined
}

/**
 * Add UTM params to a URL; existing params preserved.
 */
export function addUtmParams(
  url: string,
  params: { source: string; medium: string; campaign: string; content?: string }
): string {
  try {
    const u = new URL(url)
    u.searchParams.set('utm_source', params.source)
    u.searchParams.set('utm_medium', params.medium)
    u.searchParams.set('utm_campaign', params.campaign)
    if (params.content !== undefined) u.searchParams.set('utm_content', params.content)
    return u.toString()
  } catch {
    // Fallback for relative URLs or malformed
    const sep = url.includes('?') ? '&' : '?'
    let result = `${url}${sep}utm_source=${encodeURIComponent(params.source)}&utm_medium=${encodeURIComponent(params.medium)}&utm_campaign=${encodeURIComponent(params.campaign)}`
    if (params.content !== undefined) result += `&utm_content=${encodeURIComponent(params.content)}`
    return result
  }
}

// ---------------------------------------------------------------------------
// Sports-specific
// ---------------------------------------------------------------------------

const CONFIDENCE_TIER_LABELS: Array<{ min: number; label: string }> = [
  { min: 80, label: 'High Confidence' },
  { min: 65, label: 'Moderate Confidence' },
  { min: 50, label: 'Low Confidence' },
  { min: 0, label: 'Speculative' },
]

function confidenceToLabel(confidence: number): string {
  for (const tier of CONFIDENCE_TIER_LABELS) {
    if (confidence >= tier.min) return tier.label
  }
  return 'Speculative'
}

/**
 * Generate honest, non-tout meta for a pick page.
 * Confidence shown as tier label, not raw number.
 */
export function buildPickPageMeta(pick: {
  sport: string
  game: string
  pickType: string
  confidence: number
}): MetaTags {
  const tierLabel = confidenceToLabel(pick.confidence)
  const title = buildTitle([
    `${pick.sport} Pick: ${pick.game}`,
    pick.pickType,
    tierLabel,
  ])

  const description = truncateDescription(
    `Analysis and prediction for ${pick.game} — ${pick.pickType} rated ${tierLabel}. ` +
      `Data-driven pick based on current odds, line movement, and statistical models. ` +
      `Track record and methodology available.`
  )

  return {
    title,
    description,
    robots: 'index, follow',
  }
}

/**
 * Generic sports meta for /sports/nfl, /sports/nfl/chiefs, etc.
 */
export function buildSportsMeta(sport: string, team?: string, page?: string): MetaTags {
  const sportName = sport.toUpperCase()
  const parts: string[] = team
    ? [`${team} ${sportName} Analysis`, page ?? 'Stats & Picks']
    : [`${sportName} Picks & Analysis`, page ?? 'Stats, Odds & Predictions']

  const title = buildTitle(parts)
  const description = team
    ? truncateDescription(
        `${team} ${sportName} picks, analysis, and stats. ` +
          `Data-backed predictions with tracked accuracy and real odds from licensed sources.`
      )
    : truncateDescription(
        `${sportName} picks, analysis, and statistics. ` +
          `Data-backed predictions with tracked accuracy and calibrated confidence scores. ` +
          `Real odds sourced from licensed providers.`
      )

  return {
    title,
    description,
    robots: 'index, follow',
  }
}

/**
 * Meta for analysis/trend pages.
 */
export function buildAnalysisPageMeta(topic: string, date: string): MetaTags {
  const title = buildTitle([`${topic} Analysis`, date])
  const description = truncateDescription(
    `In-depth analysis of ${topic} as of ${date}. ` +
      `Statistical trends, model output, and data-driven insights. ` +
      `All predictions sourced from real odds and verified historical data.`
  )

  return {
    title,
    description,
    robots: 'index, follow',
  }
}
