import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..", "..");
const out = path.join(root, "docs", "research", "help-education-ux");
const cardsDir = path.join(out, "claude-build-queue", "cards");
const asOf = "2026-06-09";

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function write(rel, body) {
  const file = path.join(out, rel);
  mkdirp(path.dirname(file));
  fs.writeFileSync(file, body.trimStart() + "\n", "utf8");
}

function esc(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csv(headers, rows) {
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}

function table(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((r) => `| ${r.map((v) => String(v ?? "").replace(/\n/g, "<br>")).join(" | ")} |`),
  ].join("\n");
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

const existing = [
  ["BUILD-015", "public help brain", "OSS leverage queue", "AI/help", "planned", "Use as help search/answer layer, not as page-level teachability."],
  ["BUILD-087", "customer onboarding clips", "OSS leverage queue", "video/onboarding", "planned", "Extend into Galaxy Studios clip library."],
  ["BUILD-089", "support video replies", "OSS leverage queue", "video/support", "planned", "Extend into contextual help replies."],
  ["BUILD-092", "product education library", "OSS leverage queue", "education", "planned", "Parent for lesson system."],
  ["BUILD-109", "customer-facing AI help center", "OSS leverage queue", "help center", "planned", "Use as searchable support, not primary in-page guidance."],
  ["BUILD-113", "onboarding wizard", "OSS leverage queue", "onboarding", "planned", "Extend with 10-second path and page-level prompts."],
  ["BUILD-115", "paid-tier education sequence", "OSS leverage queue", "conversion education", "planned", "Tie help to FREE/PRO/ELITE without pressure."],
  ["BUILD-GV2-011", "free-to-pro GSE Rating education ladder", "growth OS", "GSE Rating education", "planned", "Use as metric-specific education layer."],
  ["BUILD-GV2-037", "support-to-FAQ source of truth loop", "growth OS", "FAQ loop", "planned", "Feed recurring confusion into help asset backlog."],
  ["BUILD-GV2-041", "GSE human voice rules", "growth OS", "copy", "planned", "Voice rules for all help text."],
  ["BUILD-GV2-042", "banned phrase and fake certainty linter", "growth OS", "copy QA", "planned", "Use to keep help human and trust-safe."],
  ["BUILD-GV2-083", "AI human copy reviewer", "growth OS", "copy QA", "planned", "Use for help summaries and tooltips."],
  ["EDGE-034", "contest copy and claims checklist", "EdgeBall", "copy/compliance", "planned", "Reuse responsible-play and no-overclaiming checks."],
  ["BUILD-112", "source transparency snippets", "OSS leverage queue", "trust/source", "planned", "Use as trust explainer pattern."],
];

const surfaces = [
  ["Home / first screen", "What is this? Where do I start?", "10-second value path, 3 CTA choices, 60-second video", "P0"],
  ["GSE Rating", "What does the score mean? How do I use it?", "metric explainer, confidence band, example card, how-to clip", "P0"],
  ["Player Lab", "How do I find value fast?", "guided exploration panel, what changed, watchlist CTA, short motion", "P0"],
  ["Track Record / receipts", "Can I trust this?", "receipt walkthrough, table explainer, source/freshness note", "P0"],
  ["No-bet / risk", "Why is passing valuable?", "risk ladder explainer, no-pressure copy, examples", "P0"],
  ["Pricing / tiers", "What do FREE/PRO/ELITE unlock?", "plain comparison, scenario cards, upgrade education", "P0"],
  ["Promotions / partners", "Is this an ad? Is it safe?", "disclosure, responsible-play note, trusted offer education", "P1"],
  ["Search/autocomplete", "What should I search?", "placeholder examples, result labels, recent help", "P1"],
  ["Articles / briefs", "How should I read this?", "source legend, key takeaway, glossary chips", "P1"],
  ["Raw JSON/API-like pages", "Why am I seeing raw data?", "human formatter, table view, copy/download, explain schema", "P0"],
  ["Mobile views", "Can I understand in 10 seconds?", "compressed help chips, bottom-sheet how-to, reduced motion", "P0"],
  ["Founder/protected methods", "What can public know?", "reveal-less explanations and safe boundaries", "P0"],
];

const rubric = {
  as_of: asOf,
  item_must_have: [
    "plain_title",
    "one_sentence_value",
    "what_it_means",
    "how_to_use",
    "why_it_matters",
    "trust_or_source_note",
    "best_next_action",
    "media_slot_video_motion_table_or_visual",
    "glossary_links",
    "mobile_safe_summary",
  ],
  ten_second_rule: {
    first_2_seconds: "User sees what the thing is.",
    first_5_seconds: "User understands why it matters.",
    first_10_seconds: "User knows the next action and whether to trust it.",
  },
  media_slots: ["30-60 second Galaxy Studios video", "5-12 second motion explainer", "table view", "before/after example", "tooltip", "drawer", "guided tour step"],
  accessibility: ["captions", "transcript", "reduced motion", "keyboard reachable", "high contrast", "no flashing"],
};

function build(id, title, category, priority, difficulty, matched, surface, notes = "") {
  const bid = `BUILD-HELP-${String(id).padStart(3, "0")}`;
  return {
    id: bid,
    title,
    category,
    priority,
    difficulty,
    duplicate_check_status: matched.length ? "EXTENSION" : "NET_NEW",
    matched_existing_ids: matched,
    relation_to_existing: matched.length ? "Extends existing onboarding/help/video/copy queue item with page-level teachability." : "Distinct help/aesthetic coverage system not present in prior queues.",
    reason_not_duplicate: `${title} focuses on 10-second comprehension and contextual help coverage, not generic help docs.`,
    product_surface: surface,
    internal_surface: ["Galaxy Studios content ops", "support", "product QA"],
    customer_value: 5,
    business_value: 5,
    trust_value: 5,
    speed_value: 5,
    brand_value: 5,
    legal_risk: category.includes("promotions") ? "MEDIUM" : "LOW",
    method_leakage_risk: category.includes("method") ? "HIGH" : "MEDIUM",
    maintenance_risk: difficulty === "L" ? "HIGH" : "MEDIUM",
    dependencies: [],
    claude_prompt_file: `docs/research/help-education-ux/claude-build-queue/cards/${bid}-${slug(title)}.md`,
    notes,
  };
}

const builds = [
  build(1, "Universal help coverage audit", "foundation", "P0", "S", [], ["all pages"]),
  build(2, "Raw JSON page humanizer", "json readability", "P0", "M", [], ["raw JSON/API-like pages"]),
  build(3, "Every item help contract", "foundation", "P0", "M", ["BUILD-092"], ["all product items"]),
  build(4, "10-second value panel", "teachability", "P0", "M", ["BUILD-113"], ["home", "major pages"]),
  build(5, "Galaxy Studios help hub", "video/help", "P0", "M", ["BUILD-087", "BUILD-092"], ["help center"]),
  build(6, "Contextual help drawer", "in-app help", "P0", "M", ["BUILD-015", "BUILD-109"], ["all complex pages"]),
  build(7, "Metric explainer tooltip system", "in-app help", "P0", "M", ["BUILD-GV2-011"], ["GSE Rating", "Player Lab"]),
  build(8, "Motion explainer slot", "motion", "P0", "M", ["BUILD-087"], ["all complex cards"]),
  build(9, "Table-first data formatter", "json readability", "P0", "M", [], ["JSON/API pages", "data tables"]),
  build(10, "What should I do next card", "teachability", "P0", "S", [], ["all pages"]),
  build(11, "Trust note component", "trust", "P0", "S", ["BUILD-112"], ["ratings", "receipts", "sources"]),
  build(12, "No-bet risk education module", "risk education", "P0", "M", ["BUILD-GV2-044"], ["risk/no-bet surfaces"]),
  build(13, "GSE Rating how-to sequence", "education", "P0", "M", ["BUILD-GV2-011"], ["GSE Rating"]),
  build(14, "Player Lab 60-second guided tour", "education", "P0", "M", ["BUILD-GV2-021"], ["Player Lab"]),
  build(15, "Track record receipts walkthrough", "trust education", "P0", "M", ["BUILD-GV2-020"], ["Track Record"]),
  build(16, "Pricing tier education strip", "conversion education", "P0", "S", ["BUILD-115"], ["pricing", "paywalls"]),
  build(17, "Glossary chip system", "in-app help", "P1", "M", [], ["articles", "ratings", "Player Lab"]),
  build(18, "Help search command palette", "in-app help", "P1", "M", ["BUILD-015"], ["global"]),
  build(19, "Customer confused-click detector", "analytics", "P1", "M", ["BUILD-GV2-076"], ["all pages"]),
  build(20, "Help asset registry schema", "content model", "P0", "M", ["NEXT-026"], ["admin/content"]),
  build(21, "Galaxy Studios storyboard template", "video/help", "P0", "S", ["BUILD-087"], ["content ops"]),
  build(22, "Video transcript and caption standard", "accessibility", "P0", "S", ["BUILD-087"], ["videos"]),
  build(23, "Reduced-motion fallback policy", "accessibility", "P0", "S", [], ["motion explainers"]),
  build(24, "Mobile help bottom sheet", "mobile UX", "P0", "M", ["BUILD-113"], ["mobile"]),
  build(25, "Complex card readability pass", "visual polish", "P0", "M", [], ["cards"]),
  build(26, "Subcategory contrast and hierarchy audit", "visual polish", "P0", "S", [], ["navigation", "subcategories"]),
  build(27, "Plain-English rewrite sprint", "copy", "P0", "M", ["BUILD-GV2-041", "BUILD-GV2-083"], ["all pages"]),
  build(28, "Method-safe public explanations", "method boundary", "P0", "M", ["BUILD-GV2-085"], ["ratings", "methodology"]),
  build(29, "Support-to-help asset loop", "support", "P1", "M", ["BUILD-GV2-037"], ["support", "FAQ"]),
  build(30, "Help analytics event taxonomy", "analytics", "P0", "S", ["BUILD-GV2-076"], ["help"]),
  build(31, "First-session guided path", "onboarding", "P0", "M", ["BUILD-113"], ["new users"]),
  build(32, "Return-user what's new coachmark", "retention", "P1", "S", [], ["home", "Player Lab"]),
  build(33, "PRO/ELITE value explanation overlay", "conversion education", "P1", "M", ["BUILD-115"], ["upgrade moments"]),
  build(34, "Source and freshness mini-lesson", "trust education", "P0", "S", ["BUILD-112"], ["source surfaces"]),
  build(35, "Article key-takeaway formatter", "content readability", "P1", "S", ["BUILD-GV2-046"], ["articles"]),
  build(36, "Daily Brief how-to strip", "content readability", "P1", "S", ["BUILD-050"], ["Daily Brief"]),
  build(37, "Promotions disclosure education card", "promotions education", "P1", "S", ["BUILD-GV2-003"], ["promotions"]),
  build(38, "Micro-example library", "education", "P0", "M", [], ["ratings", "risk", "Player Lab"]),
  build(39, "Page empty-state help", "visual polish", "P1", "S", [], ["empty states"]),
  build(40, "Error page recovery help", "visual polish", "P1", "S", [], ["error states"]),
  build(41, "Loading state education snippets", "visual polish", "P2", "S", [], ["loading states"]),
  build(42, "Help QA checklist", "QA", "P0", "S", [], ["release QA"]),
  build(43, "Screenshot QA for readability", "QA", "P0", "M", ["BUILD-079"], ["visual QA"]),
  build(44, "Galaxy Studios release pipeline", "video/help", "P1", "M", ["BUILD-088"], ["content ops"]),
  build(45, "In-app help feedback buttons", "feedback", "P1", "M", ["BUILD-114"], ["help assets"]),
  build(46, "Help coverage CI scanner", "QA", "P0", "M", [], ["CI"], "Implemented as scan-help-coverage.mjs scaffold."),
  build(47, "Design token readability rules", "visual polish", "P0", "M", ["BUILD-074"], ["design system"]),
  build(48, "Subcategory icon and label system", "visual polish", "P0", "M", [], ["navigation"]),
  build(49, "Live tutorial playlist page", "video/help", "P1", "M", ["BUILD-092"], ["help center"]),
  build(50, "One-minute founder intro video packet", "video/help", "P1", "M", ["BUILD-087"], ["home", "help hub"]),
];

function cardMarkdown(b) {
  return `# ${b.id}: ${b.title}

## Duplicate Gate

duplicate_check_status: ${b.duplicate_check_status}
matched_existing_ids: ${b.matched_existing_ids.length ? b.matched_existing_ids.join(", ") : "none"}
relation_to_existing: ${b.relation_to_existing}
reason_not_duplicate: ${b.reason_not_duplicate}

## Goal

${b.title}.

## Why It Matters

Users need to find value in 10 seconds. GSE is proprietary and complex, so every major item needs an immediate explanation, a next action, and a trust-safe media or visual path.

## Product Surface

${b.product_surface.map((s) => `- ${s}`).join("\n")}

## User Value

Users know what they are seeing, why it matters, how to use it, and what to do next without reading a manual.

## Internal Value

Galaxy Studios, support, product, and growth teams get a repeatable help asset pipeline instead of one-off explanations.

## Legal / Method Boundary

No founder-only methodology leakage. No fake certainty. Promotions/risk surfaces need clear disclosures and responsible-play-safe copy.

## Implementation Plan

1. Verify real app source and existing design system.
2. Add or specify the smallest help pattern for the target surface.
3. Include one short summary, one next action, one trust note, and one media/visual slot.
4. Add mobile and reduced-motion behavior.
5. Add analytics and QA checks where applicable.

## Acceptance Criteria

- A new user understands the item in 10 seconds.
- The item has a help affordance.
- The help text sounds human.
- There is a video, motion, table, visual, or example path.
- Method boundaries are protected.

## Test Plan

Run visual screenshot QA, mobile readability checks, copy audit, reduced-motion check, and help coverage scan.

## Rollback Plan

Remove the isolated component/content entry or hide it behind a feature flag. No data or billing changes.

## Priority

${b.priority}

## Difficulty

${b.difficulty}

## Claude Code Prompt

You are Claude Code in the real Galaxy Sports Edge / GSN shipping clone. Execute only ${b.id}: ${b.title}. Verify repo root, branch, dirty state, framework, routes, and design system first. Do not change billing, secrets, launch gates, or proprietary methodology. Add a focused help/education/readability improvement with mobile, accessibility, reduced-motion, human copy, and screenshot QA. Report files changed, checks run, and rollback.
`;
}

mkdirp(out);
mkdirp(cardsDir);
write("existing-help-work-ledger.csv", csv(["existing_id", "title", "source", "category", "status", "recommended_use"], existing.map((r) => Object.fromEntries(["existing_id", "title", "source", "category", "status", "recommended_use"].map((h, i) => [h, r[i]])))));
write("help-surface-inventory.csv", csv(["surface", "user_confusion", "required_help", "priority"], surfaces.map((r) => ({ surface: r[0], user_confusion: r[1], required_help: r[2], priority: r[3] }))));
write("coverage-rubric.json", JSON.stringify(rubric, null, 2));
write("00-operating-plan.md", `# Help Education UX Operating Plan

As of: ${asOf}

## Mission

Turn GSE from powerful-but-hard-to-read into a system users can understand in 10 seconds. Every complex item should have a short human summary, how-to, value statement, trust/source note, next action, and a video/motion/table/visual option.

## Key Shift

Help is not a separate FAQ. Help is a product layer on every page and every complex card.

## No-Duplicate Rule

Extend existing help brain, onboarding clips, product education, support videos, onboarding wizard, paid-tier education, human voice rules, and source transparency work. Do not recreate generic docs.

## Boundaries

No production app edits in this control workspace. No method leakage. No hype. No inaccessible flashing motion. Use reduced-motion fallbacks and captions.
`);
write("01-existing-work-inventory.md", `# Existing Help Work Inventory

As of: ${asOf}

${table(["ID","Title","Source","Category","Status","Recommended Use"], existing)}
`);
write("02-current-aesthetic-friction-map.md", `# Current Aesthetic Friction Map

As of: ${asOf}

${table(["Surface","User Confusion","Required Help","Priority"], surfaces.map((r) => [r[0], r[1], r[2], r[3]]))}

## Major Frictions

- Raw JSON/API-like pages must become human-readable tables and cards.
- Subcategories need stronger visual hierarchy, labels, icons, and explanatory microcopy.
- Complex metrics need examples, not just definitions.
- Every page needs a fast "what am I looking at?" layer.
`);
write("03-10-second-teachability-system.md", `# 10-Second Teachability System

As of: ${asOf}

First 2 seconds: identify the surface.  
First 5 seconds: explain why it matters.  
First 10 seconds: give the next action and trust cue.

Every item gets:

- plain title
- one-sentence value
- what it means
- how to use it
- why it matters
- trust/source note
- best next action
- media slot
- glossary links
- mobile-safe summary
`);
write("04-galaxy-studios-help-layer.md", `# Galaxy Studios Help Layer

As of: ${asOf}

Galaxy Studios should become the product education engine: short videos, motion explainers, guided walkthroughs, release clips, support replies, and trust explainers.

Recommended formats:

- 30-60 second "how to use this page"
- 5-12 second motion highlight
- before/after example
- captioned clip plus transcript
- table walkthrough
- founder-safe method boundary explainer
`);
write("05-page-item-help-coverage-model.md", `# Page Item Help Coverage Model

As of: ${asOf}

Coverage levels:

1. None: unacceptable for complex item.
2. Label only: weak.
3. Tooltip: minimum for simple items.
4. Summary + next action: acceptable.
5. Summary + media + trust note + example: target.
6. Guided workflow + personalization: premium target.
`);
write("06-json-readability-remediation.md", `# JSON Readability Remediation

As of: ${asOf}

Any user-facing raw JSON should be replaced or wrapped with:

- human title
- table view
- key-value cards
- copy/download raw JSON as secondary action
- schema explanation
- "what this data is used for"
- error/recovery copy
`);
write("07-motion-video-table-pattern-library.md", `# Motion Video Table Pattern Library

As of: ${asOf}

Use restrained motion for attention, not decoration. Avoid flashing. Respect prefers-reduced-motion.

Patterns:

- pulse highlight for changed value
- step-by-step reveal
- moving source-to-output path
- risk ladder animation
- table row focus
- short embedded video
- transcript drawer
`);
write("08-implementation-architecture.md", `# Implementation Architecture

As of: ${asOf}

Suggested models:

- HelpAsset
- HelpSurface
- HelpPlacement
- GalaxyStudiosLesson
- MotionExplainer
- GlossaryTerm
- HelpEvent
- HelpFeedback

Suggested components:

- HelpButton
- HelpDrawer
- TenSecondSummary
- MetricExplainer
- VideoLessonCard
- MotionExplainerSlot
- JsonHumanizer
- GlossaryChip
`);
write("09-claude-build-queue-summary.md", `# Claude Build Queue Summary

As of: ${asOf}

${builds.length} build cards created.

${table(["ID","Title","Category","Priority","Difficulty"], builds.map((b) => [b.id, b.title, b.category, b.priority, b.difficulty]))}
`);
write("10-final-report.md", `# Final Report - Help Education UX

As of: ${asOf}

## Executive Summary

GSE needs a persistent teachability layer. Users should not have to understand the proprietary system before getting value. Every complex item should explain itself in 10 seconds and offer a deeper Galaxy Studios video/motion/table path.

## What Else We Need

- raw JSON humanizer
- universal help drawer
- every-item help contract
- Galaxy Studios lesson hub
- metric explainers
- subcategory readability pass
- mobile help bottom sheets
- help coverage CI scanner
- copy audit for human tone
- reduced-motion and accessibility rules

## First 10 Builds

${builds.slice(0, 10).map((b) => `- ${b.id}: ${b.title}`).join("\n")}

## Code Scaffold

Added reports/codex/help-education-ux/scan-help-coverage.mjs for read-only help coverage scanning.
`);
write("claude-build-queue/index.md", `# Help Education UX Build Queue

As of: ${asOf}

${table(["ID","Title","Category","Gate","Priority","Difficulty"], builds.map((b) => [b.id, b.title, b.category, b.duplicate_check_status, b.priority, b.difficulty]))}
`);
write("claude-build-queue/build-queue.jsonl", builds.map((b) => JSON.stringify(b)).join("\n"));
for (const b of builds) {
  fs.writeFileSync(path.join(cardsDir, `${b.id}-${slug(b.title)}.md`), cardMarkdown(b), "utf8");
}

console.log(JSON.stringify({ builds: builds.length, output: path.relative(root, out).replace(/\\/g, "/") }, null, 2));
