# OpenRouter workspace (2026-08-18)

Hermes cannot edit https://openrouter.ai/workspaces (login + management key).
Do not paste the management key into Hermes.

## Already done on this box
- Dead pool key `OR` (`v2.…`) removed — it 401'd and sat 429 for ~30m.
- OpenRouter 429 exhaustion reset.
- Live pool: inference key only (manual + same key via .env).
- `provider_routing.require_parameters: true` so Hermes OR calls only hit hosts that support tools.
- No extra workspace created — extra workspaces do **not** raise the free 200/day.

## Inference key (live)
- Type: `sk-or-v1-…` (not management)
- Spend limit: **none** (`limit` null) — a paid model would bill
- Usage today: $0
- `is_free_tier`: false (account can spend)

## Clicks on the page you have open (4 minutes)

Stay on **Default**. Do not Create Workspace.

1. **Keys** → the `sk-or-v1` Hermes key → Credit limit **$0** (hard cap; :free still works).
2. **Routing** → default text model `nvidia/nemotron-3-ultra-550b-a55b:free` (not gpt-4o). Provider sort leave default (price + uptime). Do not pin one host.
3. **Guardrails** → block paid / require $0 if the UI offers it.
4. **Management keys** → keep in the browser only. Never add to Hermes.

Skip: BYOK, extra members, observability I/O logging (costs + stores prompts).
