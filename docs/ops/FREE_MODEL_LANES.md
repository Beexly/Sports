# GSE free-model lanes (Beexly / OpenCode) - 2026-09-23

## Correct routing
- **Bunny / Pickle / MiMo free** = **OpenCode Zen** provider (opencode/...), auth via OPENCODE_API_KEY / oc_sk_...
- **OpenRouter** = other :free / catalog models when a live sk-or-... is present (optional extras)
- **NVIDIA NIM** = nvidia/... fallback via NVIDIA_API_KEY

## OpenCode default (current)
- model: opencode/space-bunny-free
- small_model: opencode/mimo-v2.6-flash-free
- fallbacks: opencode/big-pickle, then NVIDIA gemma if Zen is down

## Wiring prompt
See docs/ops/OPENCODE_CHEAP_WIRING_PROMPT.md
