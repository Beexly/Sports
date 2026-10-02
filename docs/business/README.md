# docs/business

The commercial side of GSE. Three files, distinct jobs.

| File | What it is | When you touch it |
|---|---|---|
| [GSE-BUSINESS-PLAN-2026.md](./GSE-BUSINESS-PLAN-2026.md) | The plan. What GSE is, who it is against, why the proof layer is the moat. | Rarely — when the strategy changes, not when a week goes badly. |
| [BUSINESS-PROMPTS.md](./BUSINESS-PROMPTS.md) | Ten prompts for the questions the engineering fleet does not answer: funnel, pricing, churn, launch narrative, delegation, pre-mortem. Includes a path index resolving every artifact they ask you to paste. | Whenever you run one. Start with #1. |
| [FUNNEL-ANSWERS.md](./FUNNEL-ANSWERS.md) | The weekly record produced by prompt #1, plus the pre-committed eight-week stop-loss and its counter. | Every Monday. Append-only. |

## The one rule these share

Every prompt in the library ends by forcing the model to surface what it does not
know — `MISSING:`, "what I'd need", "what this cannot tell us", "what I am not
telling you". Do not strip those sections when transcribing an answer into
`FUNNEL-ANSWERS.md`. They are the business-side equivalent of the honesty laws in
`CLAUDE.md`, and an answer without them is not safe to act on quickly.

The failure mode all of this guards against is narrow and specific: a fluent,
well-formatted, confident answer built partly on numbers that were never in the data.
