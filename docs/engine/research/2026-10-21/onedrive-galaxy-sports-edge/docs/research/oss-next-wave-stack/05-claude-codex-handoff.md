# Claude / Codex Handoff

As of: 2026-06-09

## Current Workspace Reality

This folder behaves as a Galaxy control/docs lane, not a clean app source checkout. Git resolves upward to the user profile. The apps folder in this workspace did not expose normal app files during this run. Therefore, this mission produced research, architecture, and Claude-ready build packets instead of production code edits.

## How Claude Should Use This

1. Work in the real Galaxy/GSE shipping clone, not this control folder unless the task is docs-only.
2. Open the relevant packet under claude-build-packets/packets.
3. Execute exactly one packet at a time.
4. Before installing any dependency, verify the app framework, package manager, branch, dirty state, and existing patterns.
5. Use fake data first.
6. Stop before production env writes, customer data imports, live notifications, billing flows, or public AI surfaces.

## Recommended First Five Claude Tasks

- NEXT-001: PostHog privacy-first web analytics baseline
- NEXT-002: GSE event taxonomy for FREE/PRO/ELITE
- NEXT-005: Session replay redaction policy and kill switch
- NEXT-025: Payload marketing CMS schema
- NEXT-043: Trigger.dev sports data ingestion jobs

## Prompt Template

Use the packet's Claude Code Prompt section. Do not merge multiple packets into one task unless the packet says it is a dependency.
