# ahmedkhaleel2004/gitdiagram — 17,738 stars

## 1. Vision
Turn any GitHub repository into an interactive AI-generated architecture diagram plus a one-minute narrated explainer video. Replace `hub` with `diagram` in any repo URL. AI agents can consume the same understanding through a remote MCP server (`gitdiagram.com/mcp`, no key) or a plain Markdown rendering of any diagram (`gitdiagram.com/owner/repo.md`). Private repos work with a GitHub token; diagrams export as PNG or Mermaid.

## 2. The Ask
Needs nothing from the user for public repos — paste a URL. Private repos need a GitHub token. The hosted service generates diagrams/videos server-side (their compute, their LLM bill); the MCP endpoint assumes agents can reach the public internet. Self-hosting is possible (TypeScript repo) but the default path is their hosted service.

## 3. Constraints
- License: MIT (repo). The hosted gitdiagram.com service is free to use but is a third-party dependency — no SLA, sponsored placements in the README signal a monetization pivot in progress.
- Scale: diagram quality degrades on very large repos (LLM context limits); videos are "early access."
- Maintenance: ALIVE — pushed 2026-10-02, 17.7k stars, active development (explainer videos are new).

## 4. GSE lens
This is the blunt one: GSE runs a multi-agent fleet (coordinator, coding agents, reasoning layer) over the Sports monorepo, and **no agent can currently see the whole architecture at once**. Every session re-discovers the codebase from scratch. Gitdiagram's core pattern — a repo summarized as a navigable architecture map with a Markdown rendering agents can read — is exactly the onboarding primitive GSE's wiring backlog needs. The MCP endpoint shows the shape of the solution: agents query architecture, get file-linked components. GSE has none of this.

## 5. Verdict
REBUILD — the pattern (repo → architecture markdown served to agents), not the dependency. A GSE-internal "repo map" generator over the Sports checkout (tree-sitter structure + LLM summaries, served as markdown to the fleet) removes the hosted-service risk and fits the re-implementation rule. Do not route production agent traffic through gitdiagram.com.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/ahmedkhaleel2004/gitdiagram
- GitDiagram: https://gitdiagram.com/ahmedkhaleel2004/gitdiagram
- Star history: https://star-history.com/#ahmedkhaleel2004/gitdiagram (17,738 stars)
- github.dev: https://github.dev/ahmedkhaleel2004/gitdiagram
