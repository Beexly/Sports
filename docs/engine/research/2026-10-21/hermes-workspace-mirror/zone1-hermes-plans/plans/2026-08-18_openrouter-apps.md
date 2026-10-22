# OpenRouter apps page (2026-08-18)

https://openrouter.ai/apps is public rankings, not a dashboard.
Do not install Cline / Kilo / OpenClaw / Codex. You already run Hermes Agent (#1, 37.6T).

Hermes already sends HTTP-Referer + X-Title. No extra attribution config.

## What Hermes-at-scale actually burns (last 30d)

| Rank | Model | Free on this box? |
|---|---|---|
| 1 | DeepSeek V4 Flash 0731 | no — `/model beexly-flash-0731` (Nous Plus, cents) |
| 2 | Hy3 | yes — fallback 2 / `beexly-smart` |
| 3 | DeepSeek V4 Flash 0423 | no — `/model beexly-cheap` (DEEPSEEK_API_KEY) |
| 4 | Step 3.7 Flash | yes — fallback 3 / aux |
| 5 | DeepSeek V4 Pro | no — skip |
| 6 | Nemotron 3 Ultra | :free button — `beexly-free` |
| 7 | GLM 5.2 | :free flaky — `beexly-glm` |
| 8 | Laguna S 2.1 | yes — daily default |
| 9 | MiniMax M3 | no — already 429 |
| 10 | GPT-5.6 Luna | no — Nous paid, skip |

Daily/fallback unchanged. 0731 is alias-only, never auto.
