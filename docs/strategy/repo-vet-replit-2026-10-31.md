# Repo vet 2026-10-31

Pasted 20. Distinct 20. Metadata from `gh api repos/<slug>` on 2026-10-31. None of these repos touch Polymarket, Kalshi, or prediction markets, so the source-router clearance gate does not apply.

The live task is the Galaxy Sports Edge homepage: continuous scroll, a buy in under 90 seconds. Official Replit MCP is already enabled at `https://mcp.replit.com/server/mcp` and `hermes mcp test replit` returned 13 tools in 4627ms. These GitHub repos are not that connection.

| Repo | Stars | License | Pushed | Lang | Archived | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Natfii/ue5-mcp-bridge | 66 | NOASSERTION | 2026-06-26 | JavaScript | no | reference only |
| x1xhlol/system-prompts-and-models-of-ai-tools | 144384 | GPL-3.0 | 2026-10-12 | none | no | skip |
| huangsam/ultimate-python | 5976 | MIT | 2026-10-31 | Python | no | skip |
| replit/ReplitLM | 1100 | Apache-2.0 | 2023-10-09 | Python | yes | skip |
| replit/nixmodules | 47 | MIT | 2026-10-30 | Nix | no | skip |
| replit/cloud-agent-demo | 0 | NONE | 2026-10-26 | CSS | no | reference only |
| replit/river | 102 | MIT | 2026-10-28 | TypeScript | no | skip |
| replit/dev-modules | 2 | MIT | 2026-10-28 | Shell | no | skip |
| replit/databricks-cli | 1 | NOASSERTION | 2026-10-26 | Go | no | reference only |
| replit/nixpkgs-replit | 32 | MIT | 2026-10-26 | Nix | no | skip |
| replit/replit-py | 191 | ISC | 2026-10-25 | Python | no | reference only |
| replit/fake-gcs-server | 3 | BSD-2-Clause | 2026-10-23 | Go | no | skip |
| replit/codemirror-indentation-markers | 93 | MIT | 2026-10-10 | TypeScript | no | skip |
| replit/replit-cursor-plugin | 1 | MIT | 2026-10-05 | none | no | skip |
| replit/replit-gemini-extension | 20 | MIT | 2026-09-29 | none | no | skip |
| replit/rippkgs | 168 | MIT | 2026-09-28 | Rust | no | skip |
| replit/clui | 1235 | NONE | 2024-04-30 | TypeScript | yes | reference only |
| replit/upm | 1172 | NOASSERTION | 2026-06-25 | Go | no | reference only |
| replit/codemirror-vim | 481 | MIT | 2026-07-29 | JavaScript | no | skip |
| replit/polygott | 397 | MIT | 2022-05-03 | Shell | yes | skip |

Counts: adopted 0, concept adopt 0, reference only 6, skip 14, rejected by policy 0.

Why nothing is adopted:

- ue5-mcp-bridge is an Unreal editor bridge. NOASSERTION means no code copy. It does not publish a Next.js page.
- system-prompts is a prompt dump under GPL-3.0. Copying it into the site would license the copy as GPL. It is not a renderer.
- ultimate-python is a study guide. It does not drive the homepage.
- ReplitLM, clui, and polygott are archived.
- nixmodules, nixpkgs-replit, rippkgs, and dev-modules are Nix/Replit environment tooling. They cannot ship into `apps/web`.
- river is a streaming RPC framework. Top-level tree is proto, transport, router. Not a page.
- cloud-agent-demo is a Vite app (`index.html`, `src`, `package.json`) with no license. Prior art only. 0 stars.
- replit-py is an ISC package for code that runs inside a Repl. The production site is not a Repl.
- databricks-cli, fake-gcs-server, upm, and the CodeMirror plugins do not move the camera or the buy button.
- cursor and gemini extensions are editor plugins.

Not proved: recursive file-tree greps for captcha, cloudflare, headless, and stealth. Top-level listings were pulled for cloud-agent-demo, river, and replit-py only. No capability hit that would clear a wall or render the homepage.

Next, if Replit is used at all: call the already-enabled MCP tools (`update_app_using_prompt`, `publish_app`). Do not clone this list.
