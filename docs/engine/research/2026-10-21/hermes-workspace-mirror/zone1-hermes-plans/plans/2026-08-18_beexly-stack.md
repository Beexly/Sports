# BEEXLY stack (2026-08-18)

## Decisions

- Persist daily default: Nous `poolside/laguna-s-2.1:free` (not grok).
- This session used grok-4.6 for setup intelligence only.
- `hermes model` shows providers + catalogs, not alias nicknames. Use `/model beexly-*`.
- Nested `model_aliases.beexly` was invalid and removed.
- Chat aliases are flat. Embed/TTS/rerank/safety are not chat models.
- Nous `:free` when the Portal actually lists it. Everything else `:free` via OpenRouter.
- Fallback: Laguna → hy3 → step-3.7-flash. Solar removed.
- Config migrated 34 → 37. code_execution enabled. max_turns 90. terminal timeout 180.
- llama.cpp Windows CPU prebuilt extracted. LlamaFactory / DeepSeek-V3 not set up to run.
- Firecrawl already active via Nous Plus. No extra key required.

## Paths

- Config backup: `%LOCALAPPDATA%\hermes\plans\config.yaml.bak-2026-08-18-beexly`
- Skill: `beexly-models`
- Repos: `C:\Users\Garrett\repos\`
- Local bin: `C:\Users\Garrett\local-models\llama.cpp-bin\`
