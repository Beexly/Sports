# Owner Input Register

Date: 2026-05-23
Status: open inputs only; do not treat placeholders as launch-ready

This register centralizes the facts Garrett must provide before public launch, press, checkout, or engineering work. Templates can keep placeholders; shipped surfaces cannot.

## P0 Inputs Before Any Engineering

| Input | Used by | Why it matters |
|---|---|---|
| Runway scenario: 6 / 12 / 24+ months | `01-runway-scenarios.md`, `13-execution-gates.md`, `templates/decision-log.md` | Determines whether Vault, Almanac, and Live are active or frozen |
| App repo location | `app-repo-locator-checklist.md`, `product/pre-engineering-handoff.md` | Required before implementation |
| Stripe product/price authority | `product/webhook-and-integrations-spec.md`, `copy/vault-checkout-copy.md` | Required before checkout work |
| Email provider | `product/webhook-and-integrations-spec.md`, welcome/retention emails | Required before lifecycle automation |
| Discord server, role, and bot details | `copy/vault-discord-launch-pack.md`, `product/webhook-and-integrations-spec.md` | Required before role automation |
| Office-hours recording/transcription provider | `copy/vault-office-hours-playbook.md`, `product/admin-operations-spec.md` | Required before office-hours archive |

## P0 Inputs Before Vault Launch

| Input | Used by | Why it matters |
|---|---|---|
| Day-7 Vault decision memo | `week-minus-1/04-day-7-decision-memo-template.md` | Required before GO / retest / pivot / no-go |
| Voice deck from interviews | `week-minus-1/08-voice-deck-template.md` | Required before final landing/welcome/checkout copy audit |
| Founding-50 roster | `week-minus-1/07-founding-50-selection-framework.md` | Required before private launch |
| Founding-50 signup URLs | `launch/vault-pre-launch-checklist.md` | Required before invitations send |
| First office-hours date | `copy/vault-welcome-emails.md`, `copy/vault-discord-launch-pack.md` | Required before email sequence loads |
| First 4 digest topics | `launch/vault-pre-launch-checklist.md`, `copy/vault-digest-template.md` | Required before launch week |
| Calendly/research-call URL | `copy/vault-outreach-batch-1.md`, `copy/vault-outreach-templates-extended.md` | Required for customer-dev outreach |

## Public Fact Inputs

| Input | Used by | Why it matters |
|---|---|---|
| Galaxy operating city/state | `copy/about-page-copy.md`, `galaxy-press-kit.md`, `copy/vault-launch-press-pack.md` | Public boilerplate cannot ship with placeholders |
| Confirmed sport coverage list | `galaxy-press-kit.md`, methodology/public pages | Press facts must match the live product |
| Garrett previous experience bio line | `galaxy-press-kit.md`, about page if used | Prevents generic founder bio |
| Vault public launch month/year | `galaxy-press-kit.md`, press release copy | Press boilerplate must be dated accurately |
| Press asset URLs | future `/press` implementation | Required before press kit publication |

## Almanac Inputs

| Input | Used by | Why it matters |
|---|---|---|
| Almanac customer-dev decision | `launch/almanac-preorder-runbook.md`, `copy/almanac-production-pack.md` | Required before production spend |
| Hardcover/digital format decision | `product/almanac-export-prd.md`, production pack | Determines export and printing scope |
| Cover design budget approval | `copy/almanac-production-pack.md`, contractor playbook | Required before $99 hardcover positioning |
| Refund/delay policy approval | `launch/almanac-preorder-runbook.md` | Must not publish until Garrett agrees to honor it |
| Dedication page decision | `copy/almanac-production-pack.md` | Optional, but unresolved in book map |

## Live Inputs

| Input | Used by | Why it matters |
|---|---|---|
| Live activation decision | `13-execution-gates.md`, `product/live-obs-prd.md` | Live remains frozen unless Scenario C and gates clear |
| Sketch outreach path | `audit/04-live-pitch-variants.md`, `launch/live-founder-partner-runbook.md` | Determines warm intro / BD consultant / cold fallback |
| Lawyer-approved partner agreement | `copy/live-founding-partner-agreement-template.md` | Required before partner- or manager-facing use |
| Founding partner commitments | `product/live-obs-prd.md` | Required before OBS engineering |

## Operating Rule

When a placeholder appears in a template, that is fine. When a placeholder appears in a page, checkout flow, email, press kit, agreement, or public artifact, the surface is not launch-ready.
