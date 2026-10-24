# Galaxy Sports Edge — Leverage & Outstanding-Work Scan
**Date:** 2026-07-17 · **Scope:** the git/state metadata of every **connected** folder in this session.

## Headline
The dominant pattern across your folders is **not** unfinished work — it's **finished work sitting on branches that never reached `main`, which is what production deploys.** Multiple repos hold large, recent, unmerged bodies of engine + activation code. Your highest-leverage move right now is a **canonical-branch decision → one clean merge to `main` → deploy**, not more building.

## Connected repos — state

| Folder (path) | Branch | Ahead of `main` | Last commit | Read |
|---|---|---|---|---|
| **C:\Users\Garrett\Sports** | `codex/sunday-frontier-maxforce-2026-07-05` | **171** | **2026-07-07** | 🔴 Biggest, newest unshipped body (latest: conformal-uncertainty historical adapter). Memory marks this the "Codex primary." Also holds many `beexly-*` / `claude/*` branches. |
| **Beexly/Sports @ `claude/glass-ledger-edge-engine`** (the activation branch) | — | not on `main` | 2026-07-17 | 🔴 Holds the **Proof surface** (`/llms.txt`, `/api/proof/*`), **news-sitemap**, and **Bedrock/Vertex credit routing** — all 404/absent in prod today. |
| **C:\dev\galaxy-sports-edge** | `wip/autonomy-command-center-2026-05-30` | **104** | 2026-05-30 | 🟡 Older WIP snapshot; likely superseded by the July frontier line — confirm before relying on it. |
| **C:\dev\sports** | `main` | 0 | 2026-06-22 | 🟢 Clean, in sync — a mirror of the remote. |
| **AI Sports** (Cowork scratch) | `sports-intelligence-os-phase-9-ci` | 1 | 2026-05-23 | 🟢 Stale scratch clone; ignore for shipping. |
| **Sports-canonical-2026-06-03** | `claude/edge-map-rebuild-2026-06-04` | — | 2026-06-09 | 🟡 **1000+ uncommitted** files in the working tree (likely artifacts) — safety-check before reset. |
| **Clouds-bruh** | `claude/affectionate-clarke-KJ8O1` | — | 2026-06-10 | 🟡 **424 uncommitted** files — safety-check before reset. |
| **Sports-deploy-fix**, **Sports-intelligence-core**, **Codex** | — | — | — | 🟢 Doc/log snapshots, not git repos. Archives. |

## The load-bearing recommendation
1. **Pick the canonical branch.** The July frontier line in `C:\Users\Garrett\Sports` (`codex/sunday-frontier-maxforce-2026-07-05`, 171 ahead, newest) is almost certainly the freshest engine truth; the activation branch `claude/glass-ledger-edge-engine` carries the Proof/credit-routing layer. **Confirm whether the activation branch sits on top of the frontier work or diverges from it** — if it diverges, reconcile the two before deploying.
2. **One merge to `main` + one deploy** simultaneously lights up: the Proof API (your activation differentiator), the news-sitemap (Search Console), the Bedrock/Vertex routing (the credit flip), and the newest engine features. This single action unblocks Steps 3 and 11 of the activation and makes the "verifiable record" pitch true.
3. **Then activate** — the cockpit steps become fully effective.

## Safety check before any cleanup
Two repos carry large uncommitted working trees (Sports-canonical: 1000+, Clouds-bruh: 424). Almost certainly `node_modules`/build artifacts, but before deleting or hard-resetting either, run `git status --porcelain | grep -v node_modules` to confirm no hand-authored file is stranded.

## Not scanned (not connected to this session)
Your home directory has several more sibling lines that look like parallel GSE efforts but **aren't connected**, so I couldn't audit them: `Sports-consensus-accuracy-engine`, `Sports-dfs-optimizer-edge`, `Sports-galaxy-dynasty`, `galaxy-dynasty-v2-autonomous`, `GSE-launch`, `gse-b1`, `GSE-competitive-intel(-export)`, `Sports-GSE-PR3-isolated`, `Sports_release_codex`, `FAMILY_RUNWAY_COMMAND_CENTER`, `firecrawl-scores24`. Add any of these as a folder in the desktop app and I'll fold them into this scan. (Left unaddressed, "outstanding work" hiding in these is the main blind spot.)
