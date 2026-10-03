# Laguna Morning Addendum — 2026-08-15

## Hermes config
- Default model: nous/poolside/laguna-s-2.1:free (PROVEN)
- Fallback: laguna-s-2.1:free -> hy3:free -> step-3.7-flash:free (PROVEN, single block)
- No anthropic/gemini in fallback (PROVEN)
- Config backup: plans\config.yaml.bak-2026-08-14 (PROVEN)

## Key inventory (NAMES only, no values)
| Key | Status |
|---|---|
| DEEPSEEK_API_KEY | SET (CLAIMED — .env scan confirmed) |
| GROQ_API_KEY | SET (CLAIMED — .env scan confirmed) |
| CEREBRAS_API_KEY | SET (CLAIMED — .env scan confirmed) |
| GEMINI_API_KEY | SET (CLAIMED — .env scan confirmed, should be COMMENTED) |
| XAI_API_KEY | MISSING (PROVEN — not in .env) |
| GOOGLE_API_KEY | MISSING (PROVEN — commented out in .env) |

## Sports repo
- Clone path: C:\Users\Garrett\Sports
- Remote: Beexly/Sports (main @ 9a36e11)
- Status: EXISTS (PROVEN)

## How sports work uses the spine tomorrow
| Sports task | Alias |
|---|---|
| Read docs, small code | default / free |
| Quick headline | fast |
| Prediction-engine TypeScript | code |
| Calibration math, Brier/ECE | reason |
| Long PR diffs | long |
| Live escalation | grok |
| Billing/legal/trust-copy | claude CLI |
| Offline | local |

Personal tasks use the same aliases.
