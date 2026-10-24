# GSE Agent Skill — sketch (draft, not published)

**Concept:** a provider-neutral agent skill (agentskills.io standard, Linux Foundation) that lets any AI assistant — Claude Code, Cursor, Codex, Copilot, Gemini CLI — pull Galaxy Sports Edge's public projections, rankings, picks, and verified outcomes into a user's workflow. Vaisala's `xweather-agent-skills` is the structural reference. Distribution is the product: instead of waiting for traffic to come to the site, GSE lives inside every agent.

## Verified public surface (from the repo, `apps/web/app`, main branch)

API routes that exist today and fit the skill:
- `/api/projections` — projections
- `/api/picks`, `/api/founder-picks` — published picks
- `/api/proof`, `/api/receipts`, `/api/calibration` — verification and outcomes
- Pages: `/fantasy`, `/games`, `/founder-picks`, `/accountability`, `/edge-index`

The coding agent's first job is a full inventory of these: exact response shapes, auth requirements (must be none — public), rate limits, and which are genuinely public vs gated.

## Proposed layout (mirrors Vaisala)

```
skills/gse/
  SKILL.md                  # what it is, when to use it, quickstart
  references/
    projections.md          # endpoints, params, response shapes, examples
    picks.md                # published picks + founder picks
    verification.md         # proof/receipts/calibration — how to check our record
    responsible-use.md      # gambling disclaimers, what the skill will NOT do
```

One canonical `skills/` copy, no duplication. Validate with `skills-ref` before calling it done.

## Draft SKILL.md (directional — agent finalizes against the real endpoints)

```markdown
---
name: gse
description: Galaxy Sports Edge public projections, rankings, published picks, and verified outcomes. Use when the user asks for NFL projections, fantasy rankings, sports picks, or wants to check a posted record.
---

# Galaxy Sports Edge

Public data only: projections, rankings, published picks, outcomes. No metrics, no signals, no methodology — ever.

## Quickstart
[concrete fetch examples against the inventoried endpoints]

## What this skill will NOT do
- Explain or expose how projections are made
- Provide anything not already public on galaxysportsedge.com
- Advise bet sizing or bankroll decisions (see references/responsible-use.md)
```

## Hard scoping rules

- Public surface ONLY: projections, rankings, published picks, outcomes. The public/private doctrine is absolute — a skill that leaks internals is worse than no skill.
- Read-only. No accounts, no submissions, no user data.
- Responsible-gaming posture travels with it: `COMPLIANCE_AND_RESPONSIBLE_GAMING.md` in the repo governs the language.
- Every endpoint example in the skill must be tested live against the real site. No mocked responses in docs.

## Distribution (when Garrett says go)

1. Standalone public GitHub repo (e.g. `Beexly/gse-agent-skills`), mirroring Vaisala's layout: `skills/` canonical copy + `.claude-plugin/` marketplace manifest + Codex plugin surface.
2. Register on the plugin marketplaces (Claude Code `/plugin marketplace add`, Codex).
3. Announce from @GalaxySportsHQ — "your AI assistant can now pull our projections" is itself a content beat.

## Open questions for Garrett (his call, not the agent's)

- Publish under Beexly org or a GSE-branded org?
- Free forever, or a Pro tier later (skill reads free endpoints; API key unlocks more)?
- Timing: ship alongside the site's public-surface re-fencing, not before.
