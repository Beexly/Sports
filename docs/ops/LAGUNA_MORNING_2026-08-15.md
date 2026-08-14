# Hermes Operating Manual (2026-08-15)

Live home: %LOCALAPPDATA%\hermes\   Never write ~/.hermes/config.yml
Default: nous / poolside/laguna-s-2.1:free   (Laguna pong WORKS)
Compression: enabled, threshold 0.60
Fallback (5, one block only): Laguna, hy3:free, step-3.7-flash:free, deepseek-chat, grok-4.6
Do not run hermes fallback add with args (picker only). Do not YAML-append fallback again.

## What ponged vs fallbacked (overnight, one probe each)
- DEFAULT Laguna (nous / poolside/laguna-s-2.1:free): PONG. Session 20260814_050736_664433.
- GROQ llama-3.3-70b-versatile via `hermes chat -q` --provider groq -m llama-3.3-70b-versatile: printed pong (session 20260814_080329_68d613). Logs also show Groq HTTP 400 when reasoning_effort is sent, and HTTP 404 for alias name groqfast. Treat Groq as usable only with -q + explicit --provider groq -m llama-3.3-70b-versatile.
- DEEPSEEK: UNPROVEN. Key is SET in .env but Hermes rewrites deepseek-chat -> deepseek-v4-flash. Logs: HTTP 402 exhausted and fallback to Laguna. Keep aliases; do not trust as proven.
- CEREBRAS: not probed this pass (one-probe budget used on Groq+DeepSeek).
- GEMINI: never default, never fallback. Do not use gemini-3.6-flash.
- Photon SMS outbound: blocked. Cron deliver=local only.

## Commands for tomorrow (second PowerShell tab, never the live Hermes chat tab)
hermes fallback list
hermes config get model
hermes chat -q "reply with pong only" --provider nous -m poolside/laguna-s-2.1:free --max-turns 1 -Q
hermes chat -q "reply with pong only" --provider groq -m llama-3.3-70b-versatile --max-turns 1 -Q
hermes logs errors -n 40
# If Laguna default dies: restore plans\config.yaml.bak-2026-08-14 then STOP writes.

## Aliases (intent)
free/primary = Laguna. fast/groqfast = groq/llama-3.3-70b-versatile. code = cerebras. reason = deepseek-reasoner. long/deepseek = deepseek-chat. grok = xai-oauth/grok-4.6. local = ollama/qwen3-coder:30b. Nuclear = official claude CLI only.

WT type/key needs delivery_mode=foreground (CASCADIA_HOSTING_WINDOW_CLASS).
