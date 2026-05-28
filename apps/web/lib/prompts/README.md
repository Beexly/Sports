# `apps/web/lib/prompts/` — Server-only prompt registry

This directory is the canonical home for every AI system prompt, prompt
chain, evaluation rubric, and model instruction Galaxy uses to drive
Claude or any other LLM.

## Why this exists

- **Trade-secret protection** — prompts are listed in
  `docs/legal-ip/TRADE_SECRET_INVENTORY.md` as TS-014. They must remain
  server-only.
- **Auditability** — every production prompt lives in one place,
  versioned in git, with a clear authorship trail.
- **Replaceability** — model upgrades (Sonnet → Opus, version bumps)
  should require touching this folder and nowhere else.
- **Compliance** — every prompt that influences user-facing output goes
  through the trust-gate and the compliance scanner. Central location
  makes that enforcement uniform.

## Rules

1. **Server-only.** Never import from this folder in a client component
   (`"use client"` files). The trust-gate and code review enforce.
2. **No env values inlined.** API keys come from `process.env`, not
   from prompt files.
3. **Per-prompt module** named for its use case, exporting at least:
   - `systemPrompt: string`
   - `version: string` (semver)
   - `lastReviewed: string` (ISO date)
   - `model: string` (recommended model ID)
4. **Test coverage** — every prompt module should have at least one
   unit test that asserts the prompt loads and contains required
   compliance lines (e.g., "do not invent statistics").
5. **No prompt leakage via API.** Never return raw prompt text in an
   API response or error message.

## Migration backlog

The following inline prompts exist elsewhere in the repo and should be
moved here in a future cycle (tracked in `docs/ops/AUTONOMOUS_WORK_QUEUES.md`
Queue B):

- `apps/web/lib/content-generator.ts` — `systemPrompt` for sports
  analysis blog post (line ~76)
- `apps/web/lib/claude-api/messages.ts` — any inline system messages

Migration should preserve exact prompt text (version 1.0.0), add the
metadata header, and import from the new module.

## Folder layout (target)

```
apps/web/lib/prompts/
├── README.md                       (this file)
├── content/
│   ├── analysis-post.ts            (sport pick analysis)
│   ├── recap.ts                    (post-game recap)
│   └── briefing.ts                 (personal briefing composition)
├── brain/
│   ├── ask-galaxy.ts               (Q&A surface)
│   ├── explain-game.ts             (game explainer)
│   ├── explain-line-move.ts        (line move explainer)
│   └── explain-prop.ts             (prop explainer)
├── autopsy/
│   └── grade-process.ts            (post-bet process grading)
├── parlay-mri/
│   └── diagnose.ts                 (parlay structural diagnosis)
├── studio/
│   ├── x-thread.ts                 (X / Twitter thread)
│   ├── tiktok-script.ts            (TikTok / Reels script)
│   └── newsletter-block.ts         (newsletter section)
└── evaluation/
    ├── compliance-rubric.ts        (output compliance check)
    └── quality-rubric.ts           (output quality check)
```

The folder is empty today. The migration is queued. This README is the
contract for what goes here when it is.
