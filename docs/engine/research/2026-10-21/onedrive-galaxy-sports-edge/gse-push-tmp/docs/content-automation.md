# Content Automation

## Overview

The content system auto-generates data-backed sports analysis blog posts after each pick generation run. Content is SEO-optimized and split into free previews and premium full articles.

## Content Pipeline

```
picks.generated event
  → ContentWorker.onPicksGenerated()
    → group picks by sport/date
    → for each group: generateBlogPost(picks)
      → build structured data prompt (NO hallucination)
      → call Claude API with data context
      → parse and validate response
      → store BlogPost with metadata
      → publish (free preview + premium body)
```

## Content Rules (Non-Negotiable)

1. **No fabricated stats** — Claude receives only real data from the picks object
2. **Data-backed only** — every claim in content must be traceable to ingestion data
3. **No guaranteed outcomes** — language like "will win" is prohibited
4. **Free/Premium split** — first 2 paragraphs are free, full article is premium
5. **Disclaimer** — all posts include standard gambling disclaimer

## Blog Post Schema

```typescript
interface BlogPost {
  id: string
  title: string
  slug: string           // SEO-friendly URL
  excerpt: string        // Free preview (2 paragraphs)
  content: string        // Full content (premium)
  sport: string
  tags: string[]
  seoTitle: string
  seoDescription: string
  publishedAt: Date
  isFeatured: boolean
  relatedPickIds: string[]
  generatedBy: 'system' | 'admin'
  modelVersion: string
}
```

## Claude Prompt Strategy

The prompt always includes:
- Real pick data (teams, lines, confidence scores, pick types)
- Instruction to only reference the provided data
- Prohibition on invented statistics
- Required disclaimer text
- Target length and format

Claude never receives instructions to make pick recommendations — it receives completed picks and is asked to write analysis around them.

## SEO Structure

- Title format: `{Sport} Picks {Date}: {Top Pick} Analysis`
- Slug: `{sport}-picks-{YYYY-MM-DD}`
- Meta description: auto-generated from excerpt
- Open Graph tags included
- JSON-LD structured data (Article schema)

## Publishing Schedule

- Runs automatically after each pick generation cycle
- Manual publish available from admin dashboard
- Scheduled posts supported (publish_at field)
