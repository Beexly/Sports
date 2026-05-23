# App Repo Locator Checklist

Status: required before product engineering

The current workspace is a documentation/strategy repo unless the application code is added later. Before Codex starts implementation, locate the real Galaxy Sports Edge app repo and confirm these files or equivalents exist.

## Required App Surfaces to Locate

| Surface | What to find | Why |
|---|---|---|
| App framework | Next.js, Remix, Express, etc. | Determines routing/API implementation |
| User model | User table/schema | VaultMember links to user |
| Auth provider | NextAuth, Clerk, custom, etc. | Entitlement checks |
| Subscription model | Existing Pro/Elite subscriptions | Vault extends existing tiering |
| Stripe checkout | Checkout/session creation | Vault annual price |
| Stripe webhook | Subscription lifecycle handler | Access and cancellation policy |
| Gated pages | Existing member-only pages | Reuse patterns |
| Email provider | Postmark/SendGrid/etc. | Welcome sequence |
| Discord integration | Bot or role assignment code | Vault role automation |
| Compliance scanner | `apps/web/lib/compliance-scanner/rules.ts` or equivalent | Public copy safety |
| Test harness | Playwright/Vitest/Jest/etc. | Launch test plan |

## Commands to Run in the App Repo

```powershell
rg --files
rg -n "stripe|checkout|subscription|priceId|webhook|NextAuth|auth|role|entitlement"
rg -n "discord|guild|role|bot"
rg -n "Postmark|SendGrid|mail|email"
rg -n "compliance|guaranteed|lock|sure thing"
```

## Stop Conditions

Do not start implementation if:

- No Stripe webhook exists.
- Auth/session behavior is unclear.
- Existing subscription states are inconsistent.
- Compliance scanner cannot be found and public copy would ship.
- No test harness exists and there is no time to add smoke tests.

## First App-Repo Output

Create a short implementation orientation note in the app repo:

```markdown
# Vault Implementation Orientation

App framework:
Auth:
User model:
Subscription model:
Stripe webhook:
Email provider:
Discord integration:
Compliance scanner:
Test harness:
Notes:
```

Then begin with `product/pre-engineering-handoff.md`.
