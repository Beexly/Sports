# GBSOSS/ai-drawio — 81 stars

## 1. Vision
A Claude Code plugin/skill that generates draw.io diagrams from natural language — flowcharts, AWS/GCP/Azure architecture diagrams, mind maps, ER diagrams, sequence diagrams — with browser preview, rich styling, and conversational editing.

## 2. The Ask
Needs Claude Code with the plugin installed (symlink or settings.json), plus a local browser for preview rendering. No API keys beyond whatever the agent already uses. Triggered by keywords (draw, diagram, flowchart, architecture…).

## 3. Constraints
- License: none declared in metadata (no license file found) — treat as all-rights-reserved until confirmed.
- Scale: 81 stars; generates diagrams from prose descriptions, so output quality is bounded by prompt quality — it draws what you say, not what the code does.
- Maintenance: QUIET — pushed 2026-01-13. Not dead, but slow.

## 4. GSE lens
No real gap revealed. NL-to-diagram is a documentation convenience, and for *architecture* diagrams grounded in actual code, gitdiagram's approach (diagram from the repo, not from prose) is strictly better for GSE's needs. The one transferable detail is the Claude Code plugin packaging — a skill/trigger pattern GSE could reuse for its own internal tools — but that is a packaging note, not a finding.

## 5. Verdict
IGNORE — no license clarity, and gitdiagram covers the real need (code-grounded diagrams) better.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/GBSOSS/ai-drawio
- GitDiagram: https://gitdiagram.com/GBSOSS/ai-drawio
- Star history: https://star-history.com/#GBSOSS/ai-drawio (81 stars)
- github.dev: https://github.dev/GBSOSS/ai-drawio
