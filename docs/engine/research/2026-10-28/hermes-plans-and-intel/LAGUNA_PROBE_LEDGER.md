# Laguna 24h Probe Ledger — 2026-08-14

All probes PROVEN unless noted. No values exposed — key NAMES only.

## Key Inventory (.env)
| Key | Status |
|---|---|
| DEEPSEEK_API_KEY | SET |
| GROQ_API_KEY | SET |
| CEREBRAS_API_KEY | SET |
| GEMINI_API_KEY | SET (should be COMMENTED per memory rules) |
| XAI_API_KEY | MISSING |
| GOOGLE_API_KEY | MISSING |

## Provider config (config.yaml)
| Setting | Value |
|---|---|
| default provider | nous |
| default model | poolside/laguna-s-2.1:free |
| fallback_providers | nous/poolside/laguna-s-2.1:free, nous/tencent/hy3:free, nous/stepfun/step-3.7-flash:free |

## Probe Results
| Probe | Status |
|---|---|
| config.yaml backup | PASS — plans\config.yaml.bak-2026-08-14 |
| Key inventory | PASS — logged above |
| Default model = laguna | PASS |
| Fallback = 3 Nous :free | PASS |
| Sports repo exists | PASS — C:\Users\Garrett\Sports |
| ~/.hermes/config.yml | NOT CREATED — config.yaml is canonical |
| state.db journal_mode | DELETE (intentional, not touched) |

## Notes
- Groq and Cerebras are custom providers (providers.groq / providers.cerebras + env keys). Do not appear in `hermes auth list`. Expected.
- GEMINI_API_KEY is SET in .env but must NOT be used as default. Memory rule: "Never gemini-3.6-flash" and "Leave commented Google keys commented." This needs investigation.
