# Reference Architecture

As of: 2026-06-09

## Architecture A - Fastest Safe Website Upgrade

Services: PostHog, Payload, Dub cloud/API, Formbricks cloud/API.  
Excluded: n8n self-host, SigNoz self-host, Unkey self-host, public AI.  
Goal: make the public website measurable, editable, attributable, and feedback-driven.

First path:

1. Define event taxonomy and privacy policy.
2. Add analytics and campaign attribution only in the real app clone.
3. Add CMS schema/spec before installing Payload.
4. Add feedback widgets only on low-risk pages.

## Architecture B - Autonomous Worker Backbone

Services: Trigger.dev, Langfuse, Novu, PostHog.  
Goal: run ingestion, report, alert, and AI tasks with retries, traceability, and preference-aware delivery.

Boundaries:

- every job must be idempotent
- every AI call must be traceable and redactable
- every outbound notification must respect preferences
- every paid-tier action must be auditable

## Architecture C - Founder-Only Command Plane

Services: n8n isolated, Langfuse, SigNoz, PostHog, existing AnythingLLM/Chatwoot/Twenty/listmonk stack.  
Goal: private operating dashboard that turns support, analytics, research, incidents, and marketing into build cards.

No-go:

- no founder-only methods in customer RAG
- no external client credentials in n8n
- no production customer data until access controls exist

## Architecture D - Productized API And Partner Layer

Services: Unkey, Dub, PostHog, Hoppscotch, Trigger.dev.  
Goal: package GSE intelligence into controlled API keys, partner links, usage dashboards, and API playgrounds.

## Architecture E - Full Self-Hosted Stack

Only after the above prove value. This includes more maintenance: Postgres/MySQL/ClickHouse/Redis/blob storage/SMTP/provider credentials/backup/restore/observability. Do not run full-stack self-hosting from this control workspace.
