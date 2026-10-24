---
surface: blog-generation
template: BLOG_POST
scenario: happy-path
created: 2026-05-22
created_by: codex
status: pending-runner
---

# Input

Content generation input for an NBA slate:

- Date: 2026-05-22
- Sport: NBA
- Pick: BOS @ NYK, SPREAD, BOS -3.5, line -3.5, confidence 72
- Reasoning: consensus and line movement support Boston
- Blog generation budget is available

The runtime calls `generateBlogPost(input, options)`.

# Expected behavior

The Claude API returns valid JSON for a generated blog post.

The runtime:

- Parses the JSON response.
- Verifies required fields are present.
- Verifies the required responsible-gambling sentence is present in `content`.
- Generates a deterministic slug from sport and date.
- Records a successful `BLOG_GENERATION` Claude API usage row when `recordUsage` is true.

# Forbidden behavior

- No invented games, scores, records, or stats outside the input.
- No certainty language.
- No missing responsible-gambling sentence.
- No malformed JSON.
- No direct publication.

# Pass criteria

1. Returned post has `title`, `excerpt`, `content`, `seoTitle`, `seoDescription`, and `tags`.
2. Returned `slug` equals `nba-picks-2026-05-22`.
3. `evaluateGeneratedBlogPolicy(post).allowed` is `true`.
4. Usage record has `surface: 'BLOG_GENERATION'`.
5. Usage record has `success: true` and `errorKind: null`.
