# Avazbek22/DevProjex — 26 stars

## 1. Vision
Turn any folder/codebase into clean, AI-ready context — GUI, TUI, CLI, and a read-only MCP server — with an interactive file tree, live preview, and export as ASCII/Markdown/JSON/XML (or a filtered folder/ZIP copy). Smart Ignore, token counting, telemetry-free and read-only by design. Selected for the Avalonia UI showcase.

## 2. The Ask
Needs a .NET/Avalonia runtime install (Windows/Linux/macOS, Microsoft Store or GitHub release). No API keys, no accounts — everything is local. The MCP server mode is what matters for agents.

## 3. Constraints
- License: Apache-2.0.
- Scale: 26 stars; C# desktop-app heritage means the agent-relevant surface (CLI/MCP) is a sidecar to a GUI product. Smart Ignore and token counts are nice but reimplementable in an afternoon.
- Maintenance: ALIVE — pushed 2026-10-02, showcase-selected, active releases.

## 4. GSE lens
The genuinely good idea here is the *read-only MCP server* for context packaging — a safety property GSE's fleet should want (agents that can read context but not mutate the repo through the tool). But the need is already covered better by gitingest (simpler, Python, bigger community), and the GUI/TUI is irrelevant to headless agents. No new gap revealed.

## 5. Verdict
IGNORE — gitingest covers the context-packaging need; the read-only MCP property is worth copying as a one-line design constraint, not a reason to adopt a C# desktop app.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/Avazbek22/DevProjex
- GitDiagram: https://gitdiagram.com/Avazbek22/DevProjex
- Star history: https://star-history.com/#Avazbek22/DevProjex (26 stars)
- github.dev: https://github.dev/Avazbek22/DevProjex
