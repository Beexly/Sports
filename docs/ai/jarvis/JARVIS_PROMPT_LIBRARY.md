# Jarvis Prompt Library

Code: `apps/web/lib/jarvis/prompt-library.ts` — the single source of truth.
The vault mirror (`vault/03-prompts/PROMPT_LIBRARY.md`) holds drafts and the
human-readable index.

## How prompts are stored

Each `PromptTemplate` is typed and code-reviewed: id, title, type, purpose,
model recommendation (FABLE_5/OPUS_4/SONNET_4/HAIKU_4/ANY), token budget,
required context, forbidden actions, acceptance criteria, validation commands,
scribe instructions, approval boundary, and a `templateBody` with
`{{placeholders}}`.

## Registered templates (8)

`jarvis-os-build`, `overnight-test-run`, `data-reliability-check`,
`calibration-review`, `gse-feature-build`, `content-generation`,
`design-review-pass`, `security-review`.

## How prompts are used

1. `suggestNextPrompt(currentPhase, blockers)` — deterministic keyword
   heuristic picks the most relevant template (default: `jarvis-os-build`).
2. `buildPromptFromTemplate(template, context)` fills `{{placeholders}}`;
   unknown placeholders are left visible so gaps are obvious.
3. The owner launches the session with the filled prompt; the session ends by
   writing the scribe entry the template's `scribeInstructions` demand.

## Rules

- No template instructs evasion, auto-publishing, or fabricated stats.
- Every template declares validation commands — a task is not complete until
  they pass (CLAUDE.md loop protocol).
- New prompts are drafted in the vault, then promoted into the typed library.
