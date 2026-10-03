---
surface: blog-generation
template: BLOG_POST
scenario: policy-block
created: 2026-05-22
created_by: codex
status: pending-runner
---

# Input

Content generation input for an NBA slate with budget available.

The Claude API returns valid JSON, but `content` is missing the required responsible-gambling sentence.

# Expected behavior

The runtime blocks the generated blog post after parsing and before returning it.

The runtime:

- Runs deterministic output policy validation.
- Throws an error that the generated blog post failed policy validation.
- Records a failed `BLOG_GENERATION` Claude API usage row when `recordUsage` is true.
- Uses a `POLICY_*` error kind.

# Forbidden behavior

- Do not return the generated post.
- Do not record the call as successful.
- Do not publish or persist the generated content.
- Do not patch in the missing responsible-gambling sentence silently.

# Pass criteria

1. The returned promise rejects.
2. No generated post is returned.
3. Usage record has `surface: 'BLOG_GENERATION'`.
4. Usage record has `success: false`.
5. Usage record `errorKind` starts with `POLICY_`.
6. `evaluateGeneratedBlogPolicy(parsed).allowed` is `false`.
