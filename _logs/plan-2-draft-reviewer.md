# Plan — Cycle 2 · feat(content): add Claude-powered semantic draft reviewer

## Goal
Catch trust-claim violations that paraphrase around the existing `scanForBannedPhrases` regex scanner. Today a generated draft saying "our system never misses" sneaks past the substring scanner even though it semantically equals the BANNED claim "guaranteed". Claude reads the draft + the banned list and returns structured findings.

## Files to touch
1. `apps/web/lib/content/draft-reviewer.ts` — NEW; reviewer module
2. `apps/web/__tests__/draft-reviewer.test.ts` — NEW; vitest spec
3. `_logs/CHANGELOG.md` — append entry
4. `_logs/DECISIONS.md` — append decision

## Files NOT touched (yet)
- No UI wiring in this cycle. The cockpit `/review` route can adopt this in a follow-up cycle.
- `trust-claims.ts` stays untouched. The Claude reviewer is **additive** to the existing regex scanner, not a replacement.
- `content-generator.ts` stays untouched. Operators can run the reviewer on generated drafts in cockpit; auto-running it in the generator path adds a Claude call per generation and isn't worth it yet.

## Design

### Public surface

```ts
export interface DraftReviewFinding {
  severity: "BLOCK" | "WARN" | "OK";
  quote: string;                 // exact substring from the draft
  bannedPhraseSemantic: string;  // which banned phrase it semantically matches
  explanation: string;           // why this violates the rule
  suggestion: string;            // a compliant rewrite
}

export interface DraftReviewSummary {
  totalFindings: number;
  blockingFindings: number;
  verdict: "READY" | "REVISE" | "REJECT";
}

export interface DraftReviewReport {
  findings: readonly DraftReviewFinding[];
  summary: DraftReviewSummary;
  modelVersion: string;
  reviewedAt: string;            // ISO timestamp
}

export async function reviewDraft(input: {
  content: string;
  banned: readonly string[];     // typically from getBannedPhraseList()
  context?: string;              // optional content-kind hint (e.g. "DAILY_BRIEF_DRAFT")
}): Promise<DraftReviewReport>;
```

### Implementation
- Singleton `Anthropic` client with `maxRetries: 3` (same pattern as `content-generator.ts`)
- Test-only `__setClientForTests`
- Model: `claude-haiku-4-5` (review is short, structured, latency-sensitive — Haiku is the right pick per cost/speed)
- System prompt: explicitly constrains Claude to (a) ONLY flag text present in the draft, (b) NEVER invent quotes, (c) ONLY check against the provided banned list, (d) return at most 20 findings (to bound cost)
- `output_config.format` with `json_schema` matching `DraftReviewReport` (minus `modelVersion` + `reviewedAt`, which are added in code)
- Verdict logic:
  - `READY` if 0 findings
  - `REVISE` if any WARN but no BLOCK
  - `REJECT` if any BLOCK

### Why Haiku
Per `claude-api` skill: "Haiku 4.5 — Fastest and most cost-effective model for simple tasks." Reviewing a 2000-char draft against a list of phrases is a classification/extraction task — well within Haiku's wheelhouse and ~5x cheaper than Sonnet. This is a deliberate exception to the skill's default of `opus-4-7`; the task profile justifies it (low complexity, structured output, latency matters in operator UI). Will be recorded in DECISIONS.md.

## Test plan
- Mock SDK; verify:
  - Happy path: SDK returns no findings → verdict `READY`, summary counts match
  - One WARN finding → verdict `REVISE`
  - One BLOCK finding → verdict `REJECT`
  - Mixed BLOCK + WARN → verdict `REJECT`
  - Missing API key throws
  - No-text response throws
  - SDK error propagates
- Full suite: `npm test` (expect +6 tests)
- `npm run typecheck` green
- `npm run lint` green

## Rollback
Single commit; revert restores prior state. No DB changes, no env changes, no public surface change (UI not wired).

## Commit message
`feat(content): add Claude semantic draft reviewer to catch paraphrased trust-claim violations`
