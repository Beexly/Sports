# AI Automation / Agent Workflow System

As of: 2026-06-09

| Workflow | Trigger | Inputs | Output | Approval Point | Boundary |
| --- | --- | --- | --- | --- | --- |
| source research | content request | source URLs, prior docs | source-backed summary | editor approval | no fabricated citations |
| article drafting | approved brief | sources, voice rules | draft article | human edit | no copied copy |
| human-copy auditing | copy changed | copy, rules | flags and rewrite suggestions | editor approval | no auto-publish |
| support copilot | support ticket | ticket, KB | draft response | support approval | no sensitive data overexposure |
| sales copilot | lead stage change | CRM notes | objection answer | sales approval | no fake claims |
| affiliate compliance checker | offer draft | partner terms, copy | risk flags | legal approval | no live links |
| method leakage review | public content draft | copy, method rules | leakage flags | founder approval | private methods protected |
| weekly founder brief | weekly cadence | analytics, support, revenue | brief | founder review | no secrets |

## Build Cards

- BUILD-GV2-082: AI source research workflow
- BUILD-GV2-083: AI human-copy reviewer
- BUILD-GV2-084: Affiliate compliance checker agent
- BUILD-GV2-085: Method leakage reviewer
- BUILD-GV2-086: Weekly founder growth brief agent
- BUILD-GV2-087: Churn risk analysis agent
- BUILD-GV2-088: Competitor monitoring digest
- BUILD-GV2-089: Release notes generator with risk labels
- BUILD-GV2-090: Build queue dedupe assistant
