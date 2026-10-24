# BEEXLY cloud routing (2026-08-18)

## Verdict

- Local inference: no. Slow PC, no GPU.
- Persist Grok as Hermes default: no. Burns SuperGrok on aux/cron/casual.
- Smart split: default Nous Laguna :free. `/model beexly` = Grok 4.6. Claude Max = official `claude` CLI.

## Live

- default + provider: `poolside/laguna-s-2.1:free` via nous
- `beexly` / `beexly-quality` / `beexly-grok`: xai-oauth/grok-4.6
- `beexly-free`: Nous Laguna
- fallback: Laguna → hy3 → step-3.7-flash
- local-models + llama.cpp/LlamaFactory/DeepSeek-V3/transformers/deepseek-harness: deleted
