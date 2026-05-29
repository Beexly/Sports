# Owner Gate Firewall

Status: ACTIVE
Date: 2026-05-28

Only these categories can be owner-gated:

- Legal authority
- Financial authority
- Production authority
- Credential authority
- Data rights authority
- Destructive migration authority
- Public launch authority
- Live AI authority
- Payment authority
- Public picks authority

Everything else should be classified as Codex-safe patch, Claude-build repair, preview-only, deferred nonblocking, or unknown requiring state verification. Agents may not hide ordinary implementation work behind owner gates.

| Gate | Why owner-gated | Risk if skipped | Validator |
|---|---|---|---|
| repo private confirmation | Irreversible authority, credential, legal, financial, or public exposure decision. | Trust, legal, payment, privacy, launch, or operational breach. | Owner plus Codex re-audit |
| environment variables | Irreversible authority, credential, legal, financial, or public exposure decision. | Trust, legal, payment, privacy, launch, or operational breach. | Owner plus Codex re-audit |
| preview URL | Irreversible authority, credential, legal, financial, or public exposure decision. | Trust, legal, payment, privacy, launch, or operational breach. | Owner plus Codex re-audit |
| Prisma ADRs 003-007 | Irreversible authority, credential, legal, financial, or public exposure decision. | Trust, legal, payment, privacy, launch, or operational breach. | Owner plus Codex re-audit |
| launch mode / release state flips | Irreversible authority, credential, legal, financial, or public exposure decision. | Trust, legal, payment, privacy, launch, or operational breach. | Owner plus Codex re-audit |
| COACH_LIVE_AI_ENABLED | Irreversible authority, credential, legal, financial, or public exposure decision. | Trust, legal, payment, privacy, launch, or operational breach. | Owner plus Codex re-audit |
| STRIPE_CHECKOUT_ENABLED | Irreversible authority, credential, legal, financial, or public exposure decision. | Trust, legal, payment, privacy, launch, or operational breach. | Owner plus Codex re-audit |
| PUBLIC_PICKS_ENABLED | Irreversible authority, credential, legal, financial, or public exposure decision. | Trust, legal, payment, privacy, launch, or operational breach. | Owner plus Codex re-audit |
| data rights approvals | Irreversible authority, credential, legal, financial, or public exposure decision. | Trust, legal, payment, privacy, launch, or operational breach. | Owner plus Codex re-audit |
| production launch approval | Irreversible authority, credential, legal, financial, or public exposure decision. | Trust, legal, payment, privacy, launch, or operational breach. | Owner plus Codex re-audit |
