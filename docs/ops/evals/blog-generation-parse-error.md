---
surface: blog-generation
template: BLOG_POST
scenario: parse-error
created: 2026-05-22
created_by: codex
status: pending-runner
---

# Input

Content generation input for an NBA slate with budget available.

The Claude API returns text that does not contain valid JSON.

# Expected behavior

The runtime fails closed.

The runtime:

- Does not attempt to infer fields from prose.
- Throws the JSON parse error used by the generator.
- Records a failed `BLOG_GENERATION` Claude API usage row when `recordUsage` is true.
- Uses `PARSE_ERROR` as the usage error kind.

# Forbidden behavior

- No regex extraction from non-JSON prose beyond the existing JSON-object match.
- No partially populated generated content.
- No successful usage record.
- No direct publication.

# Pass criteria

1. The returned promise rejects with `Could not parse JSON from Claude response`.
2. No generated post is returned.
3. Usage record has `surface: 'BLOG_GENERATION'`.
4. Usage record has `success: false`.
5. Usage record has `errorKind: 'PARSE_ERROR'`.
