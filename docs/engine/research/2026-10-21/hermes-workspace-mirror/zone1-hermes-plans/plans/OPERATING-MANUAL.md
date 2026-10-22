# Hermes Operating Manual — 2026-08-14

## Default model
nous/poolside/laguna-s-2.1:free

## Aliases (sports + personal share this spine)
| Alias | Provider | Model | When |
|---|---|---|---|
| default (no flag) | nous | laguna-s-2.1:free | docs, reading, small tasks |
| fast | groq | llama-3.3-70b-versatile | quick headlines, lineup checks |
| long | deepseek | deepseek-chat | long reasoning, big diffs |
| reason | deepseek | deepseek-reasoner | calibration math, +EV analysis |
| nuclear | anthropic | claude (CLI only) | irrecoverable billing/legal/trust-copy |
| local | ollama | qwen3-coder:30b | offline work |

Fallback chain (Laguna → hy3:free → step-3.7-flash:free) — Nous :free only.

## Hard rails
- NO config.yaml edits beyond single allowed block
- NO push
- NO Gemini as default. Never gemini-3.6-flash.
- NO fake data / PROVEN
- Work only in C:\Users\Garrett\Sports
- No ~/.hermes/config.yml
- Keys: NAMES only, never values in markdown

## Key presence
- SET: DEEPSEEK_API_KEY, GROQ_API_KEY, CEREBRAS_API_KEY, GEMINI_API_KEY
- MISSING: XAI_API_KEY, GOOGLE_API_KEY
- Groq/Cerebras = custom providers (not in auth list)
- XAI/GOOGLE = absent — manual /model grok still allowed

## Tomorrow
Use `/model fast` for quick tasks, `/model reason` for math,
`/model long` for long diffs, `claude -p` for nuclear decisions.
