import { describe, it, expect } from 'vitest'
import {
  buildTitle,
  truncateDescription,
  buildCanonicalUrl,
  validateMetaTags,
  scoreMetaTags,
  buildOpenGraphTags,
  buildTwitterCardTags,
  buildOrganizationSchema,
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildWebSiteSchema,
  serializeJsonLd,
  buildSitemapXml,
  buildSitemapIndex,
  parseSitemapEntry,
  prioritizeSitemapEntries,
  readabilityScore,
  keywordDensity,
  extractHeadings,
  countInternalLinks,
  countExternalLinks,
  seoPageScore,
  slugify,
  canonicalize,
  extractDomain,
  isAbsoluteUrl,
  joinUrlPaths,
  addUtmParams,
  buildPickPageMeta,
  buildSportsMeta,
  buildAnalysisPageMeta,
} from '../lib/utils/seo-utils'

// ---------------------------------------------------------------------------
// buildTitle
// ---------------------------------------------------------------------------
describe('buildTitle', () => {
  it('joins two parts with default separator', () => {
    expect(buildTitle(['Galaxy Sports', 'NFL Picks'])).toBe('Galaxy Sports | NFL Picks')
  })

  it('joins three parts', () => {
    expect(buildTitle(['A', 'B', 'C'])).toBe('A | B | C')
  })

  it('filters out empty parts', () => {
    expect(buildTitle(['A', '', 'C'])).toBe('A | C')
  })

  it('trims whitespace from each part', () => {
    expect(buildTitle(['  Hello  ', ' World '])).toBe('Hello | World')
  })

  it('uses custom separator', () => {
    expect(buildTitle(['Part1', 'Part2'], ' - ')).toBe('Part1 - Part2')
  })

  it('handles single part', () => {
    expect(buildTitle(['Only'])).toBe('Only')
  })

  it('returns empty string for all-empty parts', () => {
    expect(buildTitle(['', '  ', ''])).toBe('')
  })

  it('handles all-whitespace parts', () => {
    expect(buildTitle(['  ', '\t'])).toBe('')
  })
})

// ---------------------------------------------------------------------------
// truncateDescription
// ---------------------------------------------------------------------------
describe('truncateDescription', () => {
  it('returns unchanged if within limit', () => {
    const short = 'This is a short description.'
    expect(truncateDescription(short)).toBe(short)
  })

  it('truncates at word boundary with ellipsis', () => {
    const long = 'The quick brown fox jumps over the lazy dog and keeps on running across the field without stopping for anyone.'
    const result = truncateDescription(long, 50)
    expect(result.length).toBeLessThanOrEqual(50)
    expect(result.endsWith('...')).toBe(true)
    // should truncate at a space, so the character before '...' is not mid-word
    // i.e. there should be no case where a word is cut in the middle (no hyphenated partial)
    const beforeEllipsis = result.slice(0, result.length - 3)
    expect(beforeEllipsis.endsWith(' ') || /\w$/.test(beforeEllipsis)).toBe(true)
  })

  it('does not truncate exactly at maxLength', () => {
    const text = 'a'.repeat(160)
    expect(truncateDescription(text)).toBe(text)
  })

  it('truncates text longer than 160 chars', () => {
    const long = 'word '.repeat(40) // 200 chars
    const result = truncateDescription(long)
    expect(result.length).toBeLessThanOrEqual(160)
    expect(result.endsWith('...')).toBe(true)
  })

  it('uses custom maxLength', () => {
    const text = 'Hello world this is a test string for truncation'
    const result = truncateDescription(text, 20)
    expect(result.length).toBeLessThanOrEqual(20)
  })

  it('trims leading/trailing whitespace', () => {
    expect(truncateDescription('  hello  ')).toBe('hello')
  })
})

// ---------------------------------------------------------------------------
// buildCanonicalUrl
// ---------------------------------------------------------------------------
describe('buildCanonicalUrl', () => {
  it('joins base and path', () => {
    expect(buildCanonicalUrl('https://example.com', '/about')).toBe('https://example.com/about')
  })

  it('normalizes double slashes', () => {
    expect(buildCanonicalUrl('https://example.com/', '/about')).toBe('https://example.com/about')
  })

  it('adds path slash if missing', () => {
    expect(buildCanonicalUrl('https://example.com', 'about')).toBe('https://example.com/about')
  })

  it('appends sorted query params', () => {
    const url = buildCanonicalUrl('https://example.com', '/search', { z: '1', a: '2', m: '3' })
    expect(url).toBe('https://example.com/search?a=2&m=3&z=1')
  })

  it('encodes query param values', () => {
    const url = buildCanonicalUrl('https://example.com', '/s', { q: 'hello world' })
    expect(url).toContain('q=hello%20world')
  })

  it('returns path with no params when params empty', () => {
    expect(buildCanonicalUrl('https://example.com', '/p', {})).toBe('https://example.com/p')
  })

  it('works without params argument', () => {
    expect(buildCanonicalUrl('https://example.com', '/page')).toBe('https://example.com/page')
  })
})

// ---------------------------------------------------------------------------
// validateMetaTags
// ---------------------------------------------------------------------------
describe('validateMetaTags', () => {
  const validMeta = {
    title: 'Valid SEO Title For Testing',
    description: 'This is a valid description that is long enough to meet the minimum fifty character requirement.',
    canonical: 'https://example.com/page',
  }

  it('passes for valid meta', () => {
    const result = validateMetaTags(validMeta)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('fails for title too short', () => {
    const result = validateMetaTags({ ...validMeta, title: 'Short' })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Title too short'))).toBe(true)
  })

  it('fails for title too long', () => {
    const result = validateMetaTags({ ...validMeta, title: 'a'.repeat(71) })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Title too long'))).toBe(true)
  })

  it('fails for description too short', () => {
    const result = validateMetaTags({ ...validMeta, description: 'Too short' })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Description too short'))).toBe(true)
  })

  it('fails for description too long', () => {
    const result = validateMetaTags({ ...validMeta, description: 'a'.repeat(161) })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('Description too long'))).toBe(true)
  })

  it('fails for invalid canonical URL', () => {
    const result = validateMetaTags({ ...validMeta, canonical: 'not-a-url' })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('not a valid URL'))).toBe(true)
  })

  it('passes without canonical', () => {
    const { canonical: _canonical, ...meta } = validMeta
    const result = validateMetaTags(meta)
    expect(result.valid).toBe(true)
  })

  it('fails for canonical with non-http protocol', () => {
    const result = validateMetaTags({ ...validMeta, canonical: 'ftp://example.com' })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('http or https'))).toBe(true)
  })

  it('can have multiple errors', () => {
    const result = validateMetaTags({ title: 'Hi', description: 'Too short' })
    expect(result.errors.length).toBeGreaterThanOrEqual(2)
  })
})

// ---------------------------------------------------------------------------
// scoreMetaTags
// ---------------------------------------------------------------------------
describe('scoreMetaTags', () => {
  it('perfect meta scores high (≥80)', () => {
    const meta = {
      title: 'Perfect SEO Title For Galaxy Sports Edge Platform',
      description: 'This is a perfectly crafted meta description that falls within the ideal character range for search engine optimization and user engagement on our platform.',
      canonical: 'https://example.com/page',
      keywords: ['sports', 'picks', 'nfl'],
    }
    const score = scoreMetaTags(meta)
    expect(score).toBeGreaterThanOrEqual(80)
  })

  it('scores lower for missing canonical', () => {
    const withCanonical = {
      title: 'Perfect SEO Title For Galaxy Sports Edge',
      description: 'This is a perfectly crafted meta description that falls within the ideal character range for search engine optimization.',
      canonical: 'https://example.com/page',
      keywords: ['sports'],
    }
    const without = { ...withCanonical }
    delete (without as Partial<typeof without>).canonical
    expect(scoreMetaTags(withCanonical)).toBeGreaterThan(scoreMetaTags(without))
  })

  it('scores lower for very short title', () => {
    const good = {
      title: 'Good Title For SEO Testing Purposes Here',
      description: 'A description that is long enough to meet the minimum requirements for SEO validation and scoring.',
      canonical: 'https://example.com',
    }
    const bad = { ...good, title: 'Hi' }
    expect(scoreMetaTags(good)).toBeGreaterThan(scoreMetaTags(bad))
  })

  it('scores 0-100 range', () => {
    const score = scoreMetaTags({ title: 'x', description: 'x' })
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('penalizes very long description', () => {
    const good = {
      title: 'Perfect SEO Title For Galaxy Sports Platform',
      description: 'A well-crafted description that is the right length for search engines and meets all the SEO requirements.',
      canonical: 'https://example.com',
    }
    const bad = { ...good, description: 'a '.repeat(90) }
    expect(scoreMetaTags(good)).toBeGreaterThan(scoreMetaTags(bad))
  })
})

// ---------------------------------------------------------------------------
// buildOpenGraphTags
// ---------------------------------------------------------------------------
describe('buildOpenGraphTags', () => {
  const base = {
    type: 'article' as const,
    title: 'Test Article',
    description: 'Test description',
    url: 'https://example.com/article',
  }

  it('includes required og:* keys', () => {
    const tags = buildOpenGraphTags(base)
    expect(tags['og:type']).toBe('article')
    expect(tags['og:title']).toBe('Test Article')
    expect(tags['og:description']).toBe('Test description')
    expect(tags['og:url']).toBe('https://example.com/article')
  })

  it('omits undefined fields', () => {
    const tags = buildOpenGraphTags(base)
    expect('og:image' in tags).toBe(false)
    expect('og:image:alt' in tags).toBe(false)
    expect('og:site_name' in tags).toBe(false)
  })

  it('includes optional fields when provided', () => {
    const tags = buildOpenGraphTags({
      ...base,
      image: 'https://example.com/img.jpg',
      imageAlt: 'An image',
      siteName: 'Galaxy Sports',
      locale: 'en_US',
      publishedTime: '2026-01-01T00:00:00Z',
      modifiedTime: '2026-06-01T00:00:00Z',
      author: 'John Doe',
    })
    expect(tags['og:image']).toBe('https://example.com/img.jpg')
    expect(tags['og:image:alt']).toBe('An image')
    expect(tags['og:site_name']).toBe('Galaxy Sports')
    expect(tags['og:locale']).toBe('en_US')
    expect(tags['article:published_time']).toBe('2026-01-01T00:00:00Z')
    expect(tags['article:modified_time']).toBe('2026-06-01T00:00:00Z')
    expect(tags['article:author']).toBe('John Doe')
  })

  it('handles website type', () => {
    const tags = buildOpenGraphTags({ ...base, type: 'website' })
    expect(tags['og:type']).toBe('website')
  })
})

// ---------------------------------------------------------------------------
// buildTwitterCardTags
// ---------------------------------------------------------------------------
describe('buildTwitterCardTags', () => {
  const base = {
    card: 'summary' as const,
    title: 'Test Tweet',
    description: 'Test description for twitter',
  }

  it('includes required twitter:* keys', () => {
    const tags = buildTwitterCardTags(base)
    expect(tags['twitter:card']).toBe('summary')
    expect(tags['twitter:title']).toBe('Test Tweet')
    expect(tags['twitter:description']).toBe('Test description for twitter')
  })

  it('omits undefined fields', () => {
    const tags = buildTwitterCardTags(base)
    expect('twitter:image' in tags).toBe(false)
    expect('twitter:site' in tags).toBe(false)
    expect('twitter:creator' in tags).toBe(false)
  })

  it('includes optional fields when provided', () => {
    const tags = buildTwitterCardTags({
      ...base,
      card: 'summary_large_image',
      image: 'https://example.com/img.jpg',
      imageAlt: 'Alt text',
      site: '@galaxysports',
      creator: '@john',
    })
    expect(tags['twitter:card']).toBe('summary_large_image')
    expect(tags['twitter:image']).toBe('https://example.com/img.jpg')
    expect(tags['twitter:image:alt']).toBe('Alt text')
    expect(tags['twitter:site']).toBe('@galaxysports')
    expect(tags['twitter:creator']).toBe('@john')
  })
})

// ---------------------------------------------------------------------------
// buildOrganizationSchema
// ---------------------------------------------------------------------------
describe('buildOrganizationSchema', () => {
  const org = {
    type: 'Organization' as const,
    name: 'Galaxy Sports Edge',
    url: 'https://galaxysportsedge.com',
  }

  it('has @context = https://schema.org', () => {
    const schema = buildOrganizationSchema(org) as Record<string, unknown>
    expect(schema['@context']).toBe('https://schema.org')
  })

  it('has @type = Organization', () => {
    const schema = buildOrganizationSchema(org) as Record<string, unknown>
    expect(schema['@type']).toBe('Organization')
  })

  it('includes name and url', () => {
    const schema = buildOrganizationSchema(org) as Record<string, unknown>
    expect(schema['name']).toBe('Galaxy Sports Edge')
    expect(schema['url']).toBe('https://galaxysportsedge.com')
  })

  it('includes optional fields when provided', () => {
    const schema = buildOrganizationSchema({
      ...org,
      logo: 'https://example.com/logo.png',
      description: 'Sports analytics platform',
      sameAs: ['https://twitter.com/galaxy'],
    }) as Record<string, unknown>
    expect(schema['logo']).toBe('https://example.com/logo.png')
    expect(schema['description']).toBe('Sports analytics platform')
    expect(schema['sameAs']).toEqual(['https://twitter.com/galaxy'])
  })

  it('omits undefined optional fields', () => {
    const schema = buildOrganizationSchema(org) as Record<string, unknown>
    expect('logo' in schema).toBe(false)
    expect('description' in schema).toBe(false)
    expect('sameAs' in schema).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// buildArticleSchema
// ---------------------------------------------------------------------------
describe('buildArticleSchema', () => {
  const article = {
    type: 'Article' as const,
    headline: 'NFL Week 1 Analysis',
    description: 'Deep dive into NFL Week 1 picks',
    url: 'https://example.com/nfl-week-1',
    datePublished: '2026-09-07T00:00:00Z',
    author: 'Jane Analyst',
  }

  it('has correct @context and @type', () => {
    const schema = buildArticleSchema(article) as Record<string, unknown>
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('Article')
  })

  it('includes datePublished', () => {
    const schema = buildArticleSchema(article) as Record<string, unknown>
    expect(schema['datePublished']).toBe('2026-09-07T00:00:00Z')
  })

  it('supports BlogPosting type', () => {
    const schema = buildArticleSchema({ ...article, type: 'BlogPosting' }) as Record<string, unknown>
    expect(schema['@type']).toBe('BlogPosting')
  })

  it('supports NewsArticle type', () => {
    const schema = buildArticleSchema({ ...article, type: 'NewsArticle' }) as Record<string, unknown>
    expect(schema['@type']).toBe('NewsArticle')
  })

  it('includes author as Person object', () => {
    const schema = buildArticleSchema(article) as Record<string, unknown>
    const author = schema['author'] as Record<string, unknown>
    expect(author['@type']).toBe('Person')
    expect(author['name']).toBe('Jane Analyst')
  })

  it('includes optional fields', () => {
    const schema = buildArticleSchema({
      ...article,
      dateModified: '2026-09-08T00:00:00Z',
      image: 'https://example.com/img.jpg',
      publisher: { name: 'GSE', logo: 'https://example.com/logo.png' },
    }) as Record<string, unknown>
    expect(schema['dateModified']).toBe('2026-09-08T00:00:00Z')
    expect(schema['image']).toBe('https://example.com/img.jpg')
    const pub = schema['publisher'] as Record<string, unknown>
    expect(pub['name']).toBe('GSE')
    expect(pub['logo']).toBe('https://example.com/logo.png')
  })
})

// ---------------------------------------------------------------------------
// buildBreadcrumbSchema
// ---------------------------------------------------------------------------
describe('buildBreadcrumbSchema', () => {
  const data = {
    items: [
      { name: 'Home', url: 'https://example.com' },
      { name: 'NFL', url: 'https://example.com/nfl' },
      { name: 'Week 1', url: 'https://example.com/nfl/week-1' },
    ],
  }

  it('has @type BreadcrumbList', () => {
    const schema = buildBreadcrumbSchema(data) as Record<string, unknown>
    expect(schema['@type']).toBe('BreadcrumbList')
  })

  it('has @context', () => {
    const schema = buildBreadcrumbSchema(data) as Record<string, unknown>
    expect(schema['@context']).toBe('https://schema.org')
  })

  it('positions start at 1', () => {
    const schema = buildBreadcrumbSchema(data) as Record<string, unknown>
    const items = schema['itemListElement'] as Array<Record<string, unknown>>
    expect(items[0]!['position']).toBe(1)
  })

  it('includes all items with correct positions', () => {
    const schema = buildBreadcrumbSchema(data) as Record<string, unknown>
    const items = schema['itemListElement'] as Array<Record<string, unknown>>
    expect(items).toHaveLength(3)
    expect(items[1]!['position']).toBe(2)
    expect(items[2]!['position']).toBe(3)
  })

  it('includes name and item url', () => {
    const schema = buildBreadcrumbSchema(data) as Record<string, unknown>
    const items = schema['itemListElement'] as Array<Record<string, unknown>>
    expect(items[0]!['name']).toBe('Home')
    expect(items[0]!['item']).toBe('https://example.com')
  })

  it('ListItem @type is set', () => {
    const schema = buildBreadcrumbSchema(data) as Record<string, unknown>
    const items = schema['itemListElement'] as Array<Record<string, unknown>>
    expect(items[0]!['@type']).toBe('ListItem')
  })
})

// ---------------------------------------------------------------------------
// buildFaqSchema
// ---------------------------------------------------------------------------
describe('buildFaqSchema', () => {
  const data = {
    items: [
      { question: 'What is GSE?', answer: 'Galaxy Sports Edge is a sports analytics platform.' },
      { question: 'Is it free?', answer: 'We have a free tier with 2 picks per day.' },
    ],
  }

  it('has @type FAQPage', () => {
    const schema = buildFaqSchema(data) as Record<string, unknown>
    expect(schema['@type']).toBe('FAQPage')
  })

  it('has @context', () => {
    const schema = buildFaqSchema(data) as Record<string, unknown>
    expect(schema['@context']).toBe('https://schema.org')
  })

  it('mainEntity is an array', () => {
    const schema = buildFaqSchema(data) as Record<string, unknown>
    expect(Array.isArray(schema['mainEntity'])).toBe(true)
  })

  it('mainEntity has correct number of items', () => {
    const schema = buildFaqSchema(data) as Record<string, unknown>
    const items = schema['mainEntity'] as Array<Record<string, unknown>>
    expect(items).toHaveLength(2)
  })

  it('each item has Question type and acceptedAnswer', () => {
    const schema = buildFaqSchema(data) as Record<string, unknown>
    const items = schema['mainEntity'] as Array<Record<string, unknown>>
    expect(items[0]!['@type']).toBe('Question')
    expect(items[0]!['name']).toBe('What is GSE?')
    const answer = items[0]!['acceptedAnswer'] as Record<string, unknown>
    expect(answer['@type']).toBe('Answer')
    expect(answer['text']).toBe('Galaxy Sports Edge is a sports analytics platform.')
  })
})

// ---------------------------------------------------------------------------
// buildWebSiteSchema
// ---------------------------------------------------------------------------
describe('buildWebSiteSchema', () => {
  it('has WebSite @type', () => {
    const schema = buildWebSiteSchema('GSE', 'https://example.com') as Record<string, unknown>
    expect(schema['@type']).toBe('WebSite')
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['name']).toBe('GSE')
    expect(schema['url']).toBe('https://example.com')
  })

  it('omits SearchAction when no searchUrl', () => {
    const schema = buildWebSiteSchema('GSE', 'https://example.com') as Record<string, unknown>
    expect('potentialAction' in schema).toBe(false)
  })

  it('includes SearchAction when searchUrl provided', () => {
    const schema = buildWebSiteSchema(
      'GSE',
      'https://example.com',
      'https://example.com/search?q={search_term_string}'
    ) as Record<string, unknown>
    const action = schema['potentialAction'] as Record<string, unknown>
    expect(action['@type']).toBe('SearchAction')
    expect(action['query-input']).toBe('required name=search_term_string')
  })
})

// ---------------------------------------------------------------------------
// serializeJsonLd
// ---------------------------------------------------------------------------
describe('serializeJsonLd', () => {
  it('returns valid JSON string', () => {
    const schema = { '@type': 'WebSite', name: 'Test' }
    const result = serializeJsonLd(schema)
    expect(() => JSON.parse(result)).not.toThrow()
  })

  it('round-trips the object', () => {
    const schema = { a: 1, b: [1, 2, 3], c: { nested: true } }
    const result = serializeJsonLd(schema)
    expect(JSON.parse(result)).toEqual(schema)
  })

  it('does not throw on complex objects', () => {
    const complex = { arr: [1, 2, 3], obj: { a: { b: { c: 'd' } } } }
    expect(() => serializeJsonLd(complex)).not.toThrow()
  })

  it('returns formatted JSON (indented)', () => {
    const schema = { key: 'value' }
    const result = serializeJsonLd(schema)
    expect(result).toContain('\n')
  })
})

// ---------------------------------------------------------------------------
// buildSitemapXml
// ---------------------------------------------------------------------------
describe('buildSitemapXml', () => {
  const entries = [
    { loc: 'https://example.com/', lastmod: '2026-06-01', changefreq: 'daily' as const, priority: 1.0 },
    { loc: 'https://example.com/nfl', lastmod: '2026-06-01', changefreq: 'weekly' as const, priority: 0.8 },
  ]

  it('produces valid XML declaration', () => {
    const xml = buildSitemapXml(entries)
    expect(xml).toMatch(/^<\?xml version="1\.0"/)
  })

  it('contains urlset element', () => {
    const xml = buildSitemapXml(entries)
    expect(xml).toContain('<urlset')
    expect(xml).toContain('</urlset>')
  })

  it('includes loc tags', () => {
    const xml = buildSitemapXml(entries)
    expect(xml).toContain('<loc>https://example.com/</loc>')
    expect(xml).toContain('<loc>https://example.com/nfl</loc>')
  })

  it('includes lastmod', () => {
    const xml = buildSitemapXml(entries)
    expect(xml).toContain('<lastmod>2026-06-01</lastmod>')
  })

  it('includes priority', () => {
    const xml = buildSitemapXml(entries)
    expect(xml).toContain('<priority>1.0</priority>')
    expect(xml).toContain('<priority>0.8</priority>')
  })

  it('includes changefreq', () => {
    const xml = buildSitemapXml(entries)
    expect(xml).toContain('<changefreq>daily</changefreq>')
    expect(xml).toContain('<changefreq>weekly</changefreq>')
  })

  it('omits optional fields when not provided', () => {
    const xml = buildSitemapXml([{ loc: 'https://example.com/' }])
    expect(xml).not.toContain('<lastmod>')
    expect(xml).not.toContain('<priority>')
  })

  it('uses default namespace', () => {
    const xml = buildSitemapXml([])
    expect(xml).toContain('http://www.sitemaps.org/schemas/sitemap/0.9')
  })

  it('allows custom namespace', () => {
    const xml = buildSitemapXml([], { xmlns: 'http://custom.ns.example/' })
    expect(xml).toContain('http://custom.ns.example/')
  })

  it('escapes XML special chars in loc', () => {
    const xml = buildSitemapXml([{ loc: 'https://example.com/search?a=1&b=2' }])
    expect(xml).toContain('&amp;')
  })
})

// ---------------------------------------------------------------------------
// buildSitemapIndex
// ---------------------------------------------------------------------------
describe('buildSitemapIndex', () => {
  const sitemaps = [
    { loc: 'https://example.com/sitemap-nfl.xml', lastmod: '2026-06-01' },
    { loc: 'https://example.com/sitemap-nba.xml' },
  ]

  it('produces valid XML with sitemapindex element', () => {
    const xml = buildSitemapIndex(sitemaps)
    expect(xml).toMatch(/^<\?xml/)
    expect(xml).toContain('<sitemapindex')
    expect(xml).toContain('</sitemapindex>')
  })

  it('includes sitemap loc entries', () => {
    const xml = buildSitemapIndex(sitemaps)
    expect(xml).toContain('<loc>https://example.com/sitemap-nfl.xml</loc>')
    expect(xml).toContain('<loc>https://example.com/sitemap-nba.xml</loc>')
  })

  it('includes lastmod when present', () => {
    const xml = buildSitemapIndex(sitemaps)
    expect(xml).toContain('<lastmod>2026-06-01</lastmod>')
  })

  it('omits lastmod when not present', () => {
    const xml = buildSitemapIndex([{ loc: 'https://example.com/sitemap.xml' }])
    expect(xml).not.toContain('<lastmod>')
  })
})

// ---------------------------------------------------------------------------
// parseSitemapEntry
// ---------------------------------------------------------------------------
describe('parseSitemapEntry', () => {
  it('fills default changefreq = weekly', () => {
    const entry = parseSitemapEntry({ loc: 'https://example.com' })
    expect(entry.changefreq).toBe('weekly')
  })

  it('fills default priority = 0.5', () => {
    const entry = parseSitemapEntry({ loc: 'https://example.com' })
    expect(entry.priority).toBe(0.5)
  })

  it('preserves explicit values', () => {
    const entry = parseSitemapEntry({
      loc: 'https://example.com',
      changefreq: 'daily',
      priority: 0.9,
      lastmod: '2026-01-01',
    })
    expect(entry.changefreq).toBe('daily')
    expect(entry.priority).toBe(0.9)
    expect(entry.lastmod).toBe('2026-01-01')
  })

  it('clamps priority above 1 to 1', () => {
    const entry = parseSitemapEntry({ loc: 'https://example.com', priority: 1.5 })
    expect(entry.priority).toBe(1)
  })

  it('clamps priority below 0 to 0', () => {
    const entry = parseSitemapEntry({ loc: 'https://example.com', priority: -0.5 })
    expect(entry.priority).toBe(0)
  })

  it('handles zero priority', () => {
    const entry = parseSitemapEntry({ loc: 'https://example.com', priority: 0 })
    expect(entry.priority).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// prioritizeSitemapEntries
// ---------------------------------------------------------------------------
describe('prioritizeSitemapEntries', () => {
  const entries = [
    { loc: 'https://example.com/', priority: 0.5, changefreq: 'monthly' as const },
    { loc: 'https://example.com/nfl/week-1', priority: 0.5, changefreq: 'monthly' as const },
    { loc: 'https://example.com/blog/article', priority: 0.5, changefreq: 'monthly' as const },
  ]

  it('applies first matching pattern', () => {
    const result = prioritizeSitemapEntries(entries, [
      { pattern: '^https://example\\.com/$', priority: 1.0, changefreq: 'daily' },
    ])
    expect(result[0]!.priority).toBe(1.0)
    expect(result[0]!.changefreq).toBe('daily')
  })

  it('first matching rule wins', () => {
    const result = prioritizeSitemapEntries(entries, [
      { pattern: '/nfl/', priority: 0.9 },
      { pattern: '/nfl/week', priority: 0.1 },
    ])
    // /nfl/ matches first
    expect(result[1]!.priority).toBe(0.9)
  })

  it('non-matching entries are unchanged', () => {
    const result = prioritizeSitemapEntries(entries, [
      { pattern: '/nfl/', priority: 0.9 },
    ])
    expect(result[0]!.priority).toBe(0.5)
    expect(result[2]!.priority).toBe(0.5)
  })

  it('returns empty array for empty entries', () => {
    expect(prioritizeSitemapEntries([], [])).toEqual([])
  })

  it('handles no rules', () => {
    const result = prioritizeSitemapEntries(entries, [])
    expect(result).toEqual(entries)
  })
})

// ---------------------------------------------------------------------------
// readabilityScore
// ---------------------------------------------------------------------------
describe('readabilityScore', () => {
  it('simple text scores higher than complex text', () => {
    const simple = 'The cat sat on a mat. It was hot. The sun was big.'
    const complex =
      'The intricacies of neurobiological synaptic transmissions necessitate comprehensive examination of extraordinarily complex electrochemical phenomena.'
    const simpleScore = readabilityScore(simple)
    const complexScore = readabilityScore(complex)
    expect(simpleScore).toBeGreaterThan(complexScore)
  })

  it('returns value in 0-100 range', () => {
    const score = readabilityScore('Hello world. This is a test.')
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('returns 0 for empty string', () => {
    expect(readabilityScore('')).toBe(0)
  })

  it('handles single word', () => {
    const score = readabilityScore('Hello.')
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})

// ---------------------------------------------------------------------------
// keywordDensity
// ---------------------------------------------------------------------------
describe('keywordDensity', () => {
  it('computes correct density', () => {
    const text = 'the cat sat on the mat the cat'
    // "the" appears 3 times out of 8 words
    const density = keywordDensity(text, 'the')
    expect(density).toBeCloseTo(3 / 8, 3)
  })

  it('is case-insensitive', () => {
    const text = 'NFL nfl Nfl picks'
    const density = keywordDensity(text, 'nfl')
    expect(density).toBeCloseTo(3 / 4, 3)
  })

  it('returns 0 for keyword not in text', () => {
    expect(keywordDensity('hello world', 'sports')).toBe(0)
  })

  it('returns 0 for empty text', () => {
    expect(keywordDensity('', 'word')).toBe(0)
  })

  it('returns 1.0 when all words match', () => {
    expect(keywordDensity('pick pick pick', 'pick')).toBeCloseTo(1.0, 3)
  })
})

// ---------------------------------------------------------------------------
// extractHeadings
// ---------------------------------------------------------------------------
describe('extractHeadings', () => {
  it('extracts h1 tag', () => {
    const html = '<h1>Main Title</h1>'
    const headings = extractHeadings(html)
    expect(headings).toHaveLength(1)
    expect(headings[0]).toEqual({ level: 1, text: 'Main Title' })
  })

  it('extracts multiple heading levels', () => {
    const html = '<h1>Title</h1><h2>Section</h2><h3>Subsection</h3>'
    const headings = extractHeadings(html)
    expect(headings).toHaveLength(3)
    expect(headings[0]!.level).toBe(1)
    expect(headings[1]!.level).toBe(2)
    expect(headings[2]!.level).toBe(3)
  })

  it('ignores h7 (not valid)', () => {
    const html = '<h7>Not a valid heading</h7>'
    const headings = extractHeadings(html)
    expect(headings).toHaveLength(0)
  })

  it('strips inner HTML tags', () => {
    const html = '<h2><a href="/test">Link Text</a></h2>'
    const headings = extractHeadings(html)
    expect(headings[0]!.text).toBe('Link Text')
  })

  it('handles headings with attributes', () => {
    const html = '<h1 class="main" id="top">Title Here</h1>'
    const headings = extractHeadings(html)
    expect(headings[0]!.text).toBe('Title Here')
  })

  it('returns empty array for no headings', () => {
    expect(extractHeadings('<p>No headings here</p>')).toHaveLength(0)
  })

  it('handles h4, h5, h6', () => {
    const html = '<h4>Four</h4><h5>Five</h5><h6>Six</h6>'
    const headings = extractHeadings(html)
    expect(headings).toHaveLength(3)
    expect(headings[0]!.level).toBe(4)
    expect(headings[1]!.level).toBe(5)
    expect(headings[2]!.level).toBe(6)
  })
})

// ---------------------------------------------------------------------------
// countInternalLinks
// ---------------------------------------------------------------------------
describe('countInternalLinks', () => {
  it('counts href starting with /', () => {
    const html = '<a href="/about">About</a>'
    expect(countInternalLinks(html, 'example.com')).toBe(1)
  })

  it('counts href containing baseDomain', () => {
    const html = '<a href="https://example.com/page">Page</a>'
    expect(countInternalLinks(html, 'example.com')).toBe(1)
  })

  it('does not count external links', () => {
    const html = '<a href="https://other.com/page">External</a>'
    expect(countInternalLinks(html, 'example.com')).toBe(0)
  })

  it('counts multiple internal links', () => {
    const html = '<a href="/a">A</a><a href="/b">B</a><a href="https://example.com/c">C</a>'
    expect(countInternalLinks(html, 'example.com')).toBe(3)
  })

  it('returns 0 for no links', () => {
    expect(countInternalLinks('<p>No links</p>', 'example.com')).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// countExternalLinks
// ---------------------------------------------------------------------------
describe('countExternalLinks', () => {
  it('counts external absolute links', () => {
    const html = '<a href="https://other.com/page">External</a>'
    expect(countExternalLinks(html, 'example.com')).toBe(1)
  })

  it('does not count internal links', () => {
    const html = '<a href="/internal">Internal</a>'
    expect(countExternalLinks(html, 'example.com')).toBe(0)
  })

  it('does not count domain links as external', () => {
    const html = '<a href="https://example.com/page">Same domain</a>'
    expect(countExternalLinks(html, 'example.com')).toBe(0)
  })

  it('counts multiple external links', () => {
    const html = '<a href="https://a.com">A</a><a href="http://b.org">B</a>'
    expect(countExternalLinks(html, 'example.com')).toBe(2)
  })

  it('returns 0 for empty HTML', () => {
    expect(countExternalLinks('', 'example.com')).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// seoPageScore
// ---------------------------------------------------------------------------
describe('seoPageScore', () => {
  const perfect = {
    title: 'Galaxy Sports Edge — NFL Picks & Analysis',
    description: 'Data-driven NFL picks with tracked accuracy, real odds, and calibrated confidence scores. Free picks daily with premium tier available.',
    h1Count: 1,
    wordCount: 500,
    hasCanonical: true,
    hasOgImage: true,
    internalLinks: 5,
    loadTimeMs: 800,
  }

  it('perfect page scores high (≥80)', () => {
    const { score } = seoPageScore(perfect)
    expect(score).toBeGreaterThanOrEqual(80)
  })

  it('score is 0-100', () => {
    const { score } = seoPageScore(perfect)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('returns breakdown record', () => {
    const { breakdown } = seoPageScore(perfect)
    expect(typeof breakdown).toBe('object')
    expect(Object.keys(breakdown).length).toBeGreaterThan(0)
  })

  it('missing H1 adds issue', () => {
    const { issues } = seoPageScore({ ...perfect, h1Count: 0 })
    expect(issues.some((i) => i.includes('H1'))).toBe(true)
  })

  it('missing canonical adds issue', () => {
    const { issues } = seoPageScore({ ...perfect, hasCanonical: false })
    expect(issues.some((i) => i.toLowerCase().includes('canonical'))).toBe(true)
  })

  it('missing OG image adds issue', () => {
    const { issues } = seoPageScore({ ...perfect, hasOgImage: false })
    expect(issues.some((i) => i.toLowerCase().includes('og image') || i.toLowerCase().includes('og'))).toBe(true)
  })

  it('missing H1 reduces score', () => {
    const good = seoPageScore(perfect).score
    const bad = seoPageScore({ ...perfect, h1Count: 0 }).score
    expect(good).toBeGreaterThan(bad)
  })

  it('returns empty issues array for perfect page', () => {
    const { issues } = seoPageScore(perfect)
    expect(issues).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// slugify
// ---------------------------------------------------------------------------
describe('slugify', () => {
  it('lowercases text', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('replaces spaces with hyphens', () => {
    expect(slugify('nfl week one picks')).toBe('nfl-week-one-picks')
  })

  it('removes special characters', () => {
    expect(slugify('Best Picks! (2026)')).toBe('best-picks-2026')
  })

  it('trims leading/trailing hyphens', () => {
    expect(slugify('  hello  ')).toBe('hello')
  })

  it('collapses multiple spaces/hyphens', () => {
    expect(slugify('hello   world')).toBe('hello-world')
  })

  it('handles already-slugged text', () => {
    expect(slugify('already-slugged')).toBe('already-slugged')
  })

  it('handles numbers', () => {
    expect(slugify('Week 1 2026')).toBe('week-1-2026')
  })

  it('handles empty string', () => {
    expect(slugify('')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// canonicalize
// ---------------------------------------------------------------------------
describe('canonicalize', () => {
  it('removes trailing slash on non-root path', () => {
    const result = canonicalize('https://example.com/about/')
    expect(result).not.toMatch(/about\/$/)
  })

  it('preserves root path', () => {
    const result = canonicalize('https://example.com/')
    expect(result).toContain('example.com/')
  })

  it('sorts query params alphabetically', () => {
    const result = canonicalize('https://example.com/search?z=1&a=2&m=3')
    expect(result.indexOf('a=2')).toBeLessThan(result.indexOf('m=3'))
    expect(result.indexOf('m=3')).toBeLessThan(result.indexOf('z=1'))
  })

  it('lowercases hostname', () => {
    const result = canonicalize('https://EXAMPLE.COM/page')
    expect(result).toContain('example.com')
  })

  it('returns original on invalid URL', () => {
    const bad = 'not-a-url'
    expect(canonicalize(bad)).toBe(bad)
  })
})

// ---------------------------------------------------------------------------
// extractDomain
// ---------------------------------------------------------------------------
describe('extractDomain', () => {
  it('extracts domain from https URL', () => {
    expect(extractDomain('https://example.com/path/to/page')).toBe('example.com')
  })

  it('extracts domain from http URL', () => {
    expect(extractDomain('http://www.sports.io/nfl')).toBe('www.sports.io')
  })

  it('extracts domain with port', () => {
    expect(extractDomain('https://example.com:8080/page')).toBe('example.com')
  })

  it('returns empty string for invalid URL', () => {
    expect(extractDomain('not-a-url')).toBe('')
  })

  it('handles subdomain', () => {
    expect(extractDomain('https://api.example.com/data')).toBe('api.example.com')
  })
})

// ---------------------------------------------------------------------------
// isAbsoluteUrl
// ---------------------------------------------------------------------------
describe('isAbsoluteUrl', () => {
  it('returns true for https URL', () => {
    expect(isAbsoluteUrl('https://example.com')).toBe(true)
  })

  it('returns true for http URL', () => {
    expect(isAbsoluteUrl('http://example.com')).toBe(true)
  })

  it('returns false for relative path', () => {
    expect(isAbsoluteUrl('/about')).toBe(false)
  })

  it('returns false for protocol-relative URL', () => {
    expect(isAbsoluteUrl('//example.com')).toBe(false)
  })

  it('returns false for plain text', () => {
    expect(isAbsoluteUrl('example.com')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isAbsoluteUrl('')).toBe(false)
  })

  it('is case-insensitive for protocol', () => {
    expect(isAbsoluteUrl('HTTPS://example.com')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// joinUrlPaths
// ---------------------------------------------------------------------------
describe('joinUrlPaths', () => {
  it('joins two paths', () => {
    expect(joinUrlPaths('https://example.com', 'about')).toBe('https://example.com/about')
  })

  it('avoids double slashes', () => {
    expect(joinUrlPaths('https://example.com/', '/about')).toBe('https://example.com/about')
  })

  it('joins multiple parts', () => {
    expect(joinUrlPaths('/sports', 'nfl', 'picks')).toBe('/sports/nfl/picks')
  })

  it('handles leading slash on first part', () => {
    expect(joinUrlPaths('/api', 'users', 'profile')).toBe('/api/users/profile')
  })

  it('handles single part', () => {
    expect(joinUrlPaths('/about')).toBe('/about')
  })

  it('handles empty parts gracefully', () => {
    const result = joinUrlPaths('https://example.com', 'page')
    // Should not have double-slash in the path part (after protocol)
    const pathPart = result.replace(/^https?:\/\//, '')
    expect(pathPart).not.toContain('//')
  })
})

// ---------------------------------------------------------------------------
// addUtmParams
// ---------------------------------------------------------------------------
describe('addUtmParams', () => {
  it('appends utm params to URL', () => {
    const url = addUtmParams('https://example.com', {
      source: 'email',
      medium: 'newsletter',
      campaign: 'launch',
    })
    expect(url).toContain('utm_source=email')
    expect(url).toContain('utm_medium=newsletter')
    expect(url).toContain('utm_campaign=launch')
  })

  it('preserves existing params', () => {
    const url = addUtmParams('https://example.com?ref=home', {
      source: 'twitter',
      medium: 'social',
      campaign: 'picks',
    })
    expect(url).toContain('ref=home')
    expect(url).toContain('utm_source=twitter')
  })

  it('includes utm_content when provided', () => {
    const url = addUtmParams('https://example.com', {
      source: 'email',
      medium: 'cta',
      campaign: 'launch',
      content: 'hero-button',
    })
    expect(url).toContain('utm_content=hero-button')
  })

  it('omits utm_content when not provided', () => {
    const url = addUtmParams('https://example.com', {
      source: 'email',
      medium: 'cta',
      campaign: 'launch',
    })
    expect(url).not.toContain('utm_content')
  })

  it('encodes special characters', () => {
    const url = addUtmParams('https://example.com', {
      source: 'email list',
      medium: 'cta',
      campaign: 'launch 2026',
    })
    expect(url).toContain('utm_source=email+list')
  })
})

// ---------------------------------------------------------------------------
// buildPickPageMeta
// ---------------------------------------------------------------------------
describe('buildPickPageMeta', () => {
  const pick = {
    sport: 'NFL',
    game: 'Chiefs vs Ravens',
    pickType: 'Spread -3.5',
    confidence: 78,
  }

  it('returns valid MetaTags object', () => {
    const meta = buildPickPageMeta(pick)
    expect(meta.title).toBeTruthy()
    expect(meta.description).toBeTruthy()
  })

  it('does not use tout language', () => {
    const meta = buildPickPageMeta(pick)
    const combined = (meta.title + ' ' + meta.description).toLowerCase()
    // Should not tout picks as "guaranteed", "lock", "sure thing"
    expect(combined).not.toContain('guaranteed')
    expect(combined).not.toContain('lock')
    expect(combined).not.toContain('sure thing')
    expect(combined).not.toContain('can\'t lose')
  })

  it('shows confidence as tier label, not raw number', () => {
    const meta = buildPickPageMeta(pick)
    const combined = meta.title + ' ' + meta.description
    expect(combined).not.toMatch(/\b78\b/)
    // Should contain tier label
    expect(combined).toMatch(/confidence/i)
  })

  it('includes sport and game in title', () => {
    const meta = buildPickPageMeta(pick)
    expect(meta.title).toContain('NFL')
    expect(meta.title).toContain('Chiefs vs Ravens')
  })

  it('description is within valid length', () => {
    const meta = buildPickPageMeta(pick)
    expect(meta.description.length).toBeLessThanOrEqual(160)
  })

  it('high confidence shows High Confidence label', () => {
    const meta = buildPickPageMeta({ ...pick, confidence: 85 })
    expect(meta.title + meta.description).toContain('High Confidence')
  })

  it('low confidence shows appropriate tier', () => {
    const meta = buildPickPageMeta({ ...pick, confidence: 40 })
    const combined = meta.title + meta.description
    expect(combined.toLowerCase()).toMatch(/speculative|confidence/i)
  })
})

// ---------------------------------------------------------------------------
// buildSportsMeta
// ---------------------------------------------------------------------------
describe('buildSportsMeta', () => {
  it('returns valid meta for sport only', () => {
    const meta = buildSportsMeta('nfl')
    expect(meta.title).toBeTruthy()
    expect(meta.description).toBeTruthy()
    expect(meta.description.length).toBeLessThanOrEqual(160)
  })

  it('includes sport name in title', () => {
    const meta = buildSportsMeta('nfl')
    expect(meta.title.toUpperCase()).toContain('NFL')
  })

  it('includes team in title when provided', () => {
    const meta = buildSportsMeta('nfl', 'Chiefs')
    expect(meta.title).toContain('Chiefs')
  })

  it('description mentions sport', () => {
    const meta = buildSportsMeta('nba')
    expect(meta.description.toUpperCase()).toContain('NBA')
  })

  it('includes page when provided', () => {
    const meta = buildSportsMeta('nfl', undefined, 'Schedule')
    expect(meta.title).toContain('Schedule')
  })

  it('has robots field', () => {
    const meta = buildSportsMeta('nfl')
    expect(meta.robots).toBe('index, follow')
  })
})

// ---------------------------------------------------------------------------
// buildAnalysisPageMeta
// ---------------------------------------------------------------------------
describe('buildAnalysisPageMeta', () => {
  it('returns valid meta', () => {
    const meta = buildAnalysisPageMeta('NFL QB Efficiency Trends', '2026-06-19')
    expect(meta.title).toBeTruthy()
    expect(meta.description).toBeTruthy()
  })

  it('includes topic in title', () => {
    const meta = buildAnalysisPageMeta('NFL QB Efficiency Trends', '2026-06-19')
    expect(meta.title).toContain('NFL QB Efficiency Trends')
  })

  it('includes date in title', () => {
    const meta = buildAnalysisPageMeta('NFL Trends', '2026-06-19')
    expect(meta.title).toContain('2026-06-19')
  })

  it('description is within 160 chars', () => {
    const meta = buildAnalysisPageMeta('Very Long Topic Name For This Analysis Page Test', '2026-06-19')
    expect(meta.description.length).toBeLessThanOrEqual(160)
  })

  it('description mentions topic', () => {
    const meta = buildAnalysisPageMeta('Running Back Trends', '2026-06-19')
    expect(meta.description).toContain('Running Back Trends')
  })

  it('has robots field', () => {
    const meta = buildAnalysisPageMeta('Topic', '2026-01-01')
    expect(meta.robots).toBe('index, follow')
  })
})
