---
description: Comprehensive code review — local diff or PR — with severity-ranked findings
---

Review uncommitted changes or a GitHub PR against the GSN codebase standards.

## Mode detection

- No argument → review `git diff HEAD` (staged + unstaged)
- Argument is a PR number → run PR review mode
- Argument is a file path → review that file only

---

## Local review (git diff mode)

1. Run `git diff HEAD` to gather modified files
2. For each changed file, check:

**CRITICAL**
- Credentials or secrets in code
- SQL / NoSQL injection vectors
- Auth bypass (server action without `getServerSession`, API route without auth)
- SSRF, XSS, prototype pollution

**HIGH**
- Timing-safe comparison for secrets (use `crypto.timingSafeEqual`, never `===`)
- Stripe idempotency keys missing on payment calls
- Missing `prisma.$transaction` for multi-step writes
- TypeScript `any` / unsafe casts
- Missing `revalidatePath` / `revalidateTag` after mutations

**MEDIUM**
- Function length > 60 lines (split)
- Nesting depth > 3 (extract)
- Stale data: missing freshness timestamp validation
- Missing test for new code path

**LOW**
- Dead code added
- Import order / unused imports
- Console.log left in

3. Output findings table: `SEVERITY | FILE:LINE | FINDING | SUGGESTED FIX`

---

## PR review mode

**Phase 1** — Fetch PR metadata, diff, description  
**Phase 2** — Build context from CLAUDE.md, existing tests, related files  
**Phase 3** — Apply 7-category checklist:
1. Correctness — logic errors, off-by-one, wrong conditions
2. Type safety — strict TS, no `any`, proper generics
3. Pattern compliance — matches GSN conventions from CLAUDE.md
4. Security — OWASP top 10, auth, secrets
5. Performance — N+1 queries, missing indexes, large payloads
6. Completeness — tests present, types exported, docs updated
7. Maintainability — complexity, naming clarity, dead code

**Phase 4** — Run: `npm run typecheck && npm run lint && npm run test`  
**Phase 5** — Form recommendation: APPROVE / APPROVE_WITH_COMMENTS / REQUEST_CHANGES / BLOCK  
**Phase 6** — Post inline comments via `gh pr review`

---

## GSN-specific rules (always check)

- No fake data — picks must trace to real API responses
- No frontend-only paywalls — enforcement server-side only
- No secrets in code — keys via env vars
- Stale data gate: `REFRESH_STALE_AFTER_MINUTES` must match actual cron cadence
- `checkClearance()` called before any scraping job
- `wrapExtractedRecord()` used on all extracted data
