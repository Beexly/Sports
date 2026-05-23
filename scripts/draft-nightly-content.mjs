#!/usr/bin/env node
/**
 * Nightly content draft + review runner.
 *
 * Invoked by .github/workflows/nightly-content.yml — generates today's
 * draft blog post and runs the semantic reviewer against it, then
 * writes both to _drafts/ so the workflow's PR step can include them.
 *
 * Hard Rule §6: the PR is DRAFT-only and operator-approved. This script
 * NEVER writes a publishedAt, NEVER auto-merges, NEVER calls an external
 * surface. It only writes files into _drafts/.
 *
 * TODO: replace fixture picks with a DB read when DATABASE_URL is
 * configured in the workflow's secrets. For now the fixture lets us
 * smoke the SDK round-trip nightly without needing CI DB access.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const DRAFTS_DIR = resolve(REPO_ROOT, "_drafts");

const DRAFT_MODEL = "claude-sonnet-4-6";
const REVIEW_MODEL = "claude-haiku-4-5";

const DRY_RUN = process.argv.includes("--dry-run");

const today = new Date().toISOString().slice(0, 10);

// ── Fixture picks (replace with DB read when DATABASE_URL is available) ──
const FIXTURE = {
  date: today,
  sport: "NBA",
  picks: [
    {
      game: "Lakers vs Warriors",
      pickType: "SPREAD",
      selection: "Lakers -3.5",
      line: -3.5,
      confidence: 78,
      reasoning: "82% bookmaker consensus on Lakers; 5 days rest advantage.",
    },
    {
      game: "Celtics vs Heat",
      pickType: "TOTAL",
      selection: "Over 218.5",
      line: 218.5,
      confidence: 71,
      reasoning: "Pace mismatch and recent over rate of 7/10 in matchup.",
    },
  ],
  sources: ["the-odds-api", "schedule-internal"],
};

const BANNED_PHRASES = [
  "lock",
  "guaranteed",
  "sure thing",
  "risk-free",
  "risk free",
  "easy money",
  "free money",
  "can't lose",
  "verified track record",
  "guaranteed profit",
  "no risk",
  "100% chance",
];

const DRAFT_SYSTEM_PROMPT = `You are a sports analyst writing data-backed analysis for a sports picks website.
You must ONLY reference the data provided to you. Do not invent statistics, scores, or records.
Use measured language. Always include the provided disclaimer at the end.`;

const REVIEW_SYSTEM_PROMPT = `You are a compliance reviewer. Read the DRAFT and the BANNED_LIST.
Flag any passage that means the same thing as a banned phrase — including paraphrases, hedged variants, and implications.
Quote EXACT substrings from the DRAFT. Never invent quotes. Severity: BLOCK or WARN only.
Return at most 20 findings. Empty findings is a valid answer.`;

const DRAFT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    excerpt: { type: "string" },
    content: { type: "string" },
    seoTitle: { type: "string" },
    seoDescription: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
  },
  required: ["title", "excerpt", "content", "seoTitle", "seoDescription", "tags"],
  additionalProperties: false,
};

const REVIEW_SCHEMA = {
  type: "object",
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: { type: "string", enum: ["BLOCK", "WARN"] },
          quote: { type: "string" },
          bannedPhraseSemantic: { type: "string" },
          explanation: { type: "string" },
          suggestion: { type: "string" },
        },
        required: ["severity", "quote", "bannedPhraseSemantic", "explanation", "suggestion"],
        additionalProperties: false,
      },
    },
  },
  required: ["findings"],
  additionalProperties: false,
};

function abort(msg, code = 1) {
  console.error(`[nightly-content] ${msg}`);
  process.exit(code);
}

if (!process.env.ANTHROPIC_API_KEY) {
  abort("ANTHROPIC_API_KEY not set", 2);
}

const { default: Anthropic } = await import("@anthropic-ai/sdk");
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 3,
});

// ── 1. Draft the post ─────────────────────────────────────────────────
console.log(`[nightly-content] drafting ${FIXTURE.sport} for ${FIXTURE.date}`);

const picksSummary = FIXTURE.picks
  .map(
    (p, i) =>
      `${i + 1}. ${p.game} — ${p.pickType}: ${p.selection} (Line: ${p.line}, Confidence: ${p.confidence}/100)\n   Reasoning: ${p.reasoning}`
  )
  .join("\n\n");

const sourcesBlock = `\n\nSOURCES BACKING THIS SLATE (echo these verbatim; do not add others):\n${FIXTURE.sources
  .map((s, i) => `${i + 1}. ${s}`)
  .join("\n")}`;

const draftPrompt = `Write a sports analysis blog post for ${FIXTURE.sport} picks on ${FIXTURE.date}.

PICKS DATA (this is your ONLY source of truth — do not invent any other data):
${picksSummary}${sourcesBlock}

Requirements:
- Title: SEO-friendly, include sport and date
- Excerpt: 2 paragraph summary (free preview)
- Content: Full analysis (4-6 paragraphs) referencing only the above data
- Append a single line "Sources: ${FIXTURE.sources.join(", ")}" immediately before the disclaimer
- Include this disclaimer at end: "This article is for informational and entertainment purposes only. Galaxy Sports Edge does not guarantee any outcomes. Sports betting involves risk. Please gamble responsibly and only bet what you can afford to lose."
- SEO title (under 60 chars)
- SEO description (under 155 chars)
- Tags: 3-5 relevant tags`;

const draftResponse = await client.messages.create({
  model: DRAFT_MODEL,
  max_tokens: 4000,
  system: DRAFT_SYSTEM_PROMPT,
  output_config: { format: { type: "json_schema", schema: DRAFT_SCHEMA } },
  messages: [{ role: "user", content: draftPrompt }],
});
const draftBlock = draftResponse.content.find((b) => b.type === "text");
if (!draftBlock) abort("draft response had no text block");
const draft = JSON.parse(draftBlock.text);

// ── 2. Review the draft ───────────────────────────────────────────────
console.log(`[nightly-content] reviewing draft (${draft.title.slice(0, 60)}...)`);

const reviewable = [
  draft.title,
  draft.excerpt,
  draft.content,
  draft.seoTitle,
  draft.seoDescription,
].join("\n\n");

const reviewPrompt = `CONTENT_KIND: BLOG_POST

BANNED_LIST (semantic equivalents are also forbidden):
${BANNED_PHRASES.map((b, i) => `${i + 1}. ${b}`).join("\n")}

DRAFT:
"""
${reviewable.slice(0, 12_000)}
"""

Return JSON matching the schema. At most 20 findings.`;

const reviewResponse = await client.messages.create({
  model: REVIEW_MODEL,
  max_tokens: 4000,
  system: REVIEW_SYSTEM_PROMPT,
  output_config: { format: { type: "json_schema", schema: REVIEW_SCHEMA } },
  messages: [{ role: "user", content: reviewPrompt }],
});
const reviewBlock = reviewResponse.content.find((b) => b.type === "text");
if (!reviewBlock) abort("review response had no text block");
const review = JSON.parse(reviewBlock.text);

const blockingFindings = review.findings.filter((f) => f.severity === "BLOCK").length;
const verdict =
  review.findings.length === 0
    ? "READY"
    : blockingFindings > 0
      ? "REJECT"
      : "REVISE";

const reviewReport = {
  findings: review.findings,
  summary: {
    totalFindings: review.findings.length,
    blockingFindings,
    verdict,
  },
  model: REVIEW_MODEL,
  reviewedAt: new Date().toISOString(),
};

// ── 3. Write outputs ──────────────────────────────────────────────────
if (DRY_RUN) {
  console.log("[nightly-content] --dry-run — skipping write");
  console.log(`title: ${draft.title}`);
  console.log(`verdict: ${verdict} (${review.findings.length} findings)`);
  process.exit(0);
}

await mkdir(DRAFTS_DIR, { recursive: true });

const slug = `${FIXTURE.date}-nightly`;
const mdPath = resolve(DRAFTS_DIR, `${slug}.md`);
const reviewPath = resolve(DRAFTS_DIR, `${slug}.review.json`);

const tagsLine = draft.tags.join(", ");
const md = `---
title: "${draft.title.replace(/"/g, '\\"')}"
date: ${FIXTURE.date}
sport: ${FIXTURE.sport}
tags: [${draft.tags.map((t) => `"${t.replace(/"/g, '\\"')}"`).join(", ")}]
seoTitle: "${draft.seoTitle.replace(/"/g, '\\"')}"
seoDescription: "${draft.seoDescription.replace(/"/g, '\\"')}"
status: DRAFT
generator: scripts/draft-nightly-content.mjs
generatorModel: ${DRAFT_MODEL}
reviewerModel: ${REVIEW_MODEL}
reviewVerdict: ${verdict}
---

> **Auto-generated draft — operator approval required before publish.** This file is committed by the nightly content workflow. The companion \`${slug}.review.json\` contains the semantic-reviewer verdict and findings.

## Excerpt

${draft.excerpt}

## Content

${draft.content}

---

_Tags: ${tagsLine}_
`;

await writeFile(mdPath, md, "utf8");
await writeFile(reviewPath, JSON.stringify(reviewReport, null, 2), "utf8");

console.log(`[nightly-content] wrote ${mdPath}`);
console.log(`[nightly-content] wrote ${reviewPath}`);
console.log(`[nightly-content] verdict=${verdict} findings=${review.findings.length}`);
