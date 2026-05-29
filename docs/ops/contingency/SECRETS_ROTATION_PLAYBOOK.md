# Secrets Rotation Playbook

How Galaxy rotates secrets — planned (every 6 months) and emergency
(within 1 hour of exposure).

## Secret inventory

| Secret | Where it lives | Used by | Rotation cadence |
|---|---|---|---|
| `DATABASE_URL` | env | App, workers, migrations | 6 months |
| `DIRECT_URL` | env | Prisma migrations | 6 months |
| `NEXTAUTH_SECRET` | env | App auth | 6 months |
| `GOOGLE_CLIENT_SECRET` | env | OAuth provider | 12 months |
| `STRIPE_SECRET_KEY` | env | Payments + webhook | 6 months |
| `STRIPE_WEBHOOK_SECRET` | env | Webhook signature verify | 6 months |
| `THE_ODDS_API_KEY` | env | Data ingestion worker | 12 months |
| `ANTHROPIC_API_KEY` | env | Content + coach AI | 6 months |
| `REDIS_URL` | env (may include password) | BullMQ + cache | 6 months |
| GitHub deploy keys | platform settings | CI | 12 months |
| Image registry credentials | platform settings | Deploy | 12 months |

## Planned rotation procedure

For each secret:

1. **Generate new value** from the issuing provider (Stripe dashboard, Anthropic console, etc).
2. **Deploy with both** old and new keyed in (where the SDK supports dual keys, e.g. Stripe).
3. **Verify** new value works in staging.
4. **Cut over** production env to new value.
5. **Revoke** old value at the provider.
6. **Log rotation** in this file's rotation log (append below).

If the SDK does not support dual keys, schedule a short maintenance window (T7 template in `STATUS_PAGE_TEMPLATES.md`).

## Emergency rotation (secret exposed)

> **Define "exposed":** committed to git history, pasted in a public chat, observed in a log dump, sent to a third-party tool, included in a leaked screenshot.

Within 1 hour of detection:

1. **Revoke at the issuer first.** This is the only step that immediately stops the leak.
2. **Rotate in production.** Use the planned procedure above, but compressed.
3. **Audit usage during the exposure window.** Pull provider logs for any anomalous activity.
4. **Declare SEV-1** per `INCIDENT_RESPONSE_MATRIX.md`. PII or trust impact triggers user notification.
5. **Scrub the exposure path.** If git history: rewrite with care + force-push (only in this case, with leadership approval).
6. **Post-mortem within 7 days.** Cover how the secret reached the exposure point and how the path will be blocked.

## CI / automation

- `gitleaks` runs in pre-commit and CI on every PR.
- Pattern set covers: AWS, Stripe, Anthropic, Google, generic high-entropy tokens.
- Failures block merge.

## Forbidden practices

- Reusing secret values across environments (dev / staging / prod all distinct).
- Sharing secrets in chat — use a secret manager link instead.
- Putting secrets in `.env.example` files (use placeholders only).
- Logging secrets — telemetry registry's `FORBIDDEN_FIELD_KEYS` already excludes payment IDs but not generic API keys; treat all keys as PII.
- "Just this once" sharing a secret over Slack DM.

## Rotation log

| Date | Secret | Reason | Operator |
|---|---|---|---|
| _Empty at RC_ | — | Initial RC posture; secrets owner-managed | — |
