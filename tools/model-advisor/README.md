# model-advisor

Dev-facing tool: a **verified** model catalog + a deterministic "which engine
should handle this task" recommender. Built per
`docs/intelligence/NEXT_LEVEL_BUILD_SPEC.md` (Task 1); data mirrors
`docs/reference/MODEL_LANDSCAPE.md`.

- **Zero dependencies** — pure TypeScript, node built-ins only.
- **Not product code** — never import this from `apps/` or `packages/`.
- **No fabricated models** — every entry was verified on Hugging Face this
  session or is an established known-real model. The unverified models named in
  the DeepSeek thread (Ornith, Inkling, Kimi K3, DeepSeek V4 Pro, Qwen3.8-Max…)
  are deliberately excluded; verify their HF repos before ever adding them.
- **Pricing is reported, not confirmed** — hosted rows carry third-party-reported
  $/1M-token figures for reference only; local rows are $0/token by definition.

## Usage

```bash
# The full reference table (models, licenses, local vs hosted, reported pricing):
npx tsx tools/model-advisor/cli.ts list

# "What should run this task?"
npx tsx tools/model-advisor/cli.ts recommend --kind coding --complexity 2 --privacy local-only
# -> tier local, Qwen2.5-Coder-7B (never leaves your machine)

npx tsx tools/model-advisor/cli.ts recommend --kind coding --complexity 10
# -> tier frontier, Claude Opus 5 (reserve the ceiling; cache + /compact)

npx tsx tools/model-advisor/cli.ts recommend --kind bulk --complexity 5
# -> tier batch (Batch API, −50% reported)
```

## Routing rules (deterministic, tested)

1. `--privacy local-only` → local models only, always.
2. `bulk` → Batch tier (cheapest frontier, −50% reported).
3. `multimodal` → Muse Glimmer 30B locally; frontier only at complexity ≥ 9.
4. context > 200k tokens → 1M-context hosted model, cheapest first.
5. complexity ladder: ≤3 local → 4–6 OpenRouter (GLM-5.2/DeepSeek) → 7–8
   OpenRouter or Sonnet-class for tool-use → 9–10 frontier ceiling.
6. `--budget free` downgrades any paid tier to the best local model.

## Tests

```bash
npx vitest run tools/model-advisor
```
