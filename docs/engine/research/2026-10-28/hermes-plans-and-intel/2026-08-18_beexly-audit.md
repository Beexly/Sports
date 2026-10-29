# BEEXLY audit 2026-08-18 12:28

## Verdict
Previous pass was mostly right on daily/fallback. It was wrong on three things:
1. Claimed CSV at plans/2026-08-18_free-models.csv was NEVER written (Test-Path MISSING). Written now.
2. Five aliases pointed at Nous IDs Nous does not host (nvidia :free slugs). Retargeted to OpenRouter.
3. MoA shipped default was openai-codex gpt-5.5 + DeepSeek Pro + Claude Opus 4.8 via OpenRouter — a spend trap. Overridden. Active preset remains OFF.

## Live spine
- default: nous / poolside/laguna-s-2.1:free
- fallback: Laguna -> hy3 -> step -> OR Ultra
- aux titles: nous / step-3.7-flash:free
- delegation: nous / Laguna
- Claude: official claude CLI only. Unset claude-* and plus aliases. Removed stale Hermes anthropic env cred.
- Grok: /model beexly only. Not on fallback. Not MoA default.

## Catalogs 2026-08-18
OpenRouter live free: 19 (all aliased).
Nous live :free: 6 (Laguna S/XS, hy3, step-3.7-flash, longcat-2.0, solar-pro4). Solar+LongCat aliased, off fallback.

## Catalog-missing extras (aliases kept on purpose)
fish-audio, deepgram flux-tts, nemotron embed/rerank, llama-nemotron vl-embed, liquid lfm-2.5 — gone from OR /models today. Aliases retained so we do not redo this.

## MoA
- active_preset: off (daily stays Laguna)
- default_preset: beexly-free
- beexly-free / default: refs Ultra + Gemma 31B (OR), aggregator Laguna (Nous)
- beexly-quality: refs Ultra + hy3, aggregator Grok 4.6 — invoke only on purpose
- /moa <prompt> uses beexly-free. Does not stay on after the shot.

## Do not
openrouter/auto as default. Grok/Claude/Gemini/DeepSeek on fallback. Uncomment ANTHROPIC_API_KEY. Treat Groq/Cerebras as free. Trust hermes model picker to show aliases.
