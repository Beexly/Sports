# Product Development Strategy

As of: 2026-06-09

## Product Development Workflow

1. Research problem using AnythingLLM/Open WebUI on approved docs.
2. Prototype UX in Penpot or produce design notes if Penpot is not adopted.
3. Record intent, walkthrough, or repro in Cap.
4. Define API/source contract in Hoppscotch collections.
5. Generate Claude Code build card.
6. Implement only after branch/repo verification and owner approval for risky surfaces.
7. Validate with local tests, API collections, screenshots, and rollback notes.

## Penpot

Use Penpot as an internal design-system candidate, not an immediate Figma replacement. First build a GSE design token map and handoff checklist before any service deployment.

## Hoppscotch

Use Hoppscotch immediately as a docs-first API testing plan. Build collections for odds, weather, news/RSS, internal APIs, auth flows, webhook handlers, stale source checks, and source ingestion validation.

## Cap

Use Cap for QA videos, bug repros, onboarding clips, support replies, release notes, customer trust explainers, enterprise demos, and visual evidence packets. Do not record secrets, admin dashboards, private customer data, or founder-only method screens.

## AI Product Research

Use AnythingLLM for source synthesis and build-card generation. Use Open WebUI as an internal model workbench only if branding/license terms are acceptable.

## QA Workflow

Hoppscotch collection for API/data behavior; Cap clip for visual proof; Claude build card for fix scope; Chatwoot tag if customer-facing; listmonk update if many users need education.

## Release Workflow

Every release packet should include API contract status, screenshot/video proof if visual, support KB update, newsletter/change note if customer-visible, rollback path, and owner approval notes for paid/launch surfaces.

## Build Cards

Primary: BUILD-061 through BUILD-096 and BUILD-109 through BUILD-120.
