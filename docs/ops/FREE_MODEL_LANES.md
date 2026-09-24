# Free model lanes (GSE) — pinned 2026-09-23

Canonical pin (orchestra-approved). No keys in this file.

## Priority order (A → D)
| Rank | Lane | Models |
|------|------|--------|
| **A — default (live)** | OpenCode Zen | `opencode/space-bunny-free` → `opencode/big-pickle` → `opencode/mimo-v2.6-flash-free` |
| **B** | OpenRouter `:free` extras | Only when key is **live**. Catalog extras only — **not** where bunny lives. |
| **C — fallback** | NVIDIA NIM | `nvidia/google/gemma-3-12b-it` (small: `nvidia/google/gemma-3-4b-it`). OK as C, **not** as A. |
| **D — local fast edits** | Ollama on Beexly | `qwen3-coder:30b` when host is up |

Cursor CloudAgent is last resort only (composer-2.5 → flash → …). Never Opus / Muse Spark High / Sol / thinking-high for additive wiring.

## Providers on Beexly (status snapshot)
| Provider | Status | Notes |
|----------|--------|-------|
| OpenCode Zen | installed | **A — live default** `opencode/space-bunny-free` (small: `opencode/mimo-v2.6-flash-free`) |
| NVIDIA NIM | installed | **C only** — gemma-3-12b / 4b fallback; not the OpenCode default |
| OpenRouter | **EXPIRED** (red) | Do not nag Garrett. `:free` extras only after renew. |
| Ollama | Beexly host | Fast local edits when up; not always on PATH |

## OpenCode default (observed vs pin)
- Observed live (2026-09-23 Beexly inventory): `opencode/space-bunny-free` / small `opencode/mimo-v2.6-flash-free` (= A) — GREEN
- Config path: `C:\Users\Garrett\.config\opencode\opencode.jsonc`
- NVIDIA gemma remains C fallback only (not default)

## OpenRouter free (when key live — B only)
qwen/qwen3.8-27b:free, nex-agi/nex-n2.5-mini:free, z-ai/glm-5.2:free, cohere/north-mini-code:free, nvidia/nemotron-3.5-lightning:free, openrouter/free  
(Do **not** treat `stealth/space-bunny-alpha` as the Zen primary; that OpenRouter-bunny path is stale.)

## Red flags (paid / silent switch)
1. OpenCode default not `space-bunny-free` when Beexly/Zen is online
2. OpenRouter still marked EXPIRED while any doc claims it as primary
3. Silent jump to Cursor Cloud / paid OpenRouter / Opus for work Zen can carry
4. Gemini free-tier 429 treated as "need paid" instead of freeze + free fallback
5. Kimi / Moonshot / DeepSeek paid as default engine

## Source of truth
- Repo SoT (once merged): `docs/ops/FREE_MODEL_LANES.md` and `docs/ops/CURSOR_CHEAP_WIRING_PROMPT.md`
- Skill: `gse-cheap-cursor-wiring` (Zen = bunny home)
- Stale: OpenRouter-bunny path in older wiring prompts (marked in `CURSOR_CHEAP_WIRING_PROMPT.md`)
