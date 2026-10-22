# CC-2 Codex Handoff — docs/brain/ Package

**Date**: 2026-05-27
**From**: Claude Code (Architect / Planner)
**To**: Codex (Auditor / Committer)
**Branch**: `sports-intelligence-os-phase-9-ci`
**Work package**: CC-2 — docs/brain/ intelligence core architecture
**Relay file reference**: `reports/agent-handoffs/ACTIVE_AGENT_RELAY.md` — CC-2
**Pre-edit declaration**: `docs/audits/cc2-pre-edit-declaration.md`
**CC-1 SHA (closed)**: `772d3949524c6678630f111a159236628e257b2d`

---

## What Claude Code Did

Created 11 new markdown-only documentation files in `docs/brain/` per
Prompt 1 §4.1–§4.10 and the relay queue item CC-2.

Zero non-markdown files were touched. No routes, schema, components,
scripts, dependencies, tests, or `.ts`/`.tsx`/`.json`/`.prisma` files.

---

## Files Written

| File | Lines | Purpose |
|---|---|---|
| `docs/brain/source-hierarchy.md` | 235 | Six-tier source taxonomy, TTLs, public-safe rules |
| `docs/brain/weak-signal-engine.md` | 181 | Tier-5 intake, permitted/forbidden outputs, required language |
| `docs/brain/entity-graph.md` | 201 | Canonical entity types, relationships, proposal schema |
| `docs/brain/evidence-vault.md` | 169 | EvidenceItem proposal (BLOCK-1), storage rules |
| `docs/brain/signal-ledger.md` | 207 | Pick lifecycle audit events, LedgerEntry proposal (BLOCK-2) |
| `docs/brain/market-gravity.md` | 144 | Market signal inputs/outputs, sharp-money forbidden rule |
| `docs/brain/ask-the-brain.md` | 193 | BrainAnswer schema, cockpit-first launch gate |
| `docs/brain/fantasy-war-room.md` | 212 | Fantasy entity layer proposal (BLOCK-3), evidence separation |
| `docs/brain/research-lab.md` | 210 | 10 research brief types, cockpit-only scope |
| `docs/brain/claim-governance.md` | 196 | Claim approval workflow, 30-pick minimum, prohibited claims |
| `docs/brain/operator-cockpit-governance.md` | 203 | Cockpit panel inventory, gate integrity rules |

**Total**: 2,151 lines of markdown documentation.

---

## Step 1 — Copy Files into Primary Clone (PowerShell)

```powershell
New-Item -ItemType Directory -Force -Path "C:\Users\Garrett\Sports\docs\brain"

Copy-Item "C:\Users\Garrett\Downloads\cc2-for-primary-clone\docs\brain\source-hierarchy.md"            "C:\Users\Garrett\Sports\docs\brain\"
Copy-Item "C:\Users\Garrett\Downloads\cc2-for-primary-clone\docs\brain\weak-signal-engine.md"          "C:\Users\Garrett\Sports\docs\brain\"
Copy-Item "C:\Users\Garrett\Downloads\cc2-for-primary-clone\docs\brain\entity-graph.md"                "C:\Users\Garrett\Sports\docs\brain\"
Copy-Item "C:\Users\Garrett\Downloads\cc2-for-primary-clone\docs\brain\evidence-vault.md"              "C:\Users\Garrett\Sports\docs\brain\"
Copy-Item "C:\Users\Garrett\Downloads\cc2-for-primary-clone\docs\brain\signal-ledger.md"               "C:\Users\Garrett\Sports\docs\brain\"
Copy-Item "C:\Users\Garrett\Downloads\cc2-for-primary-clone\docs\brain\market-gravity.md"              "C:\Users\Garrett\Sports\docs\brain\"
Copy-Item "C:\Users\Garrett\Downloads\cc2-for-primary-clone\docs\brain\ask-the-brain.md"               "C:\Users\Garrett\Sports\docs\brain\"
Copy-Item "C:\Users\Garrett\Downloads\cc2-for-primary-clone\docs\brain\fantasy-war-room.md"            "C:\Users\Garrett\Sports\docs\brain\"
Copy-Item "C:\Users\Garrett\Downloads\cc2-for-primary-clone\docs\brain\research-lab.md"                "C:\Users\Garrett\Sports\docs\brain\"
Copy-Item "C:\Users\Garrett\Downloads\cc2-for-primary-clone\docs\brain\claim-governance.md"            "C:\Users\Garrett\Sports\docs\brain\"
Copy-Item "C:\Users\Garrett\Downloads\cc2-for-primary-clone\docs\brain\operator-cockpit-governance.md" "C:\Users\Garrett\Sports\docs\brain\"

Write-Host "Copy complete"
```

---

## Step 2 — Verify Files Are Present and Untracked

```powershell
cd "C:\Users\Garrett\Sports"
git ls-files --others --exclude-standard docs/brain/
# Expected: 11 lines, all docs/brain/*.md
```

---

## Step 3 — Isolated Commit (Explicit Paths — Never git add .)

```powershell
cd "C:\Users\Garrett\Sports"

git add `
  "docs/brain/source-hierarchy.md" `
  "docs/brain/weak-signal-engine.md" `
  "docs/brain/entity-graph.md" `
  "docs/brain/evidence-vault.md" `
  "docs/brain/signal-ledger.md" `
  "docs/brain/market-gravity.md" `
  "docs/brain/ask-the-brain.md" `
  "docs/brain/fantasy-war-room.md" `
  "docs/brain/research-lab.md" `
  "docs/brain/claim-governance.md" `
  "docs/brain/operator-cockpit-governance.md"

# Verify only these 11 files are staged
git diff --name-only --cached
# Must show exactly 11 docs/brain/ lines — nothing else
# If anything else appears: git reset HEAD

git commit -m "docs(brain): CC-2 intelligence core architecture and brain governance"
git rev-parse HEAD
```

---

## Step 4 — Post-Commit Verification

```powershell
git diff --name-only HEAD~1..HEAD
# Expected: exactly 11 lines, all docs/brain/

git diff --name-only HEAD~1..HEAD | Select-String "\.(ts|tsx|json|prisma|yml|css|js)$"
# Expected: no output
```

---

## Proposed Isolated Commit Message

```
docs(brain): CC-2 intelligence core architecture and brain governance
```

---

## Pass/Fail Checklist for Codex

| Check | Expected | Pass/Fail |
|---|---|---|
| `git ls-files --others docs/brain/` shows 11 files | All 11 docs/brain/*.md present | |
| No `.ts`/`.tsx`/`.json`/`.prisma` files in `git diff --cached` | 0 non-markdown files staged | |
| `git diff --name-only HEAD~1..HEAD` after commit | Exactly 11 docs/brain/ lines | |
| No non-markdown files in commit | 0 implementation files | |
| `npm run test` exit code | 0 (markdown cannot break tests) | |
| `npm run typecheck` exit code | 0 (markdown cannot break typecheck) | |
| Commit message format | `docs(brain): CC-2 ...` | |
| All BLOCKED items marked as proposals | BLOCK-1/2/3 clearly labeled | |
| No new routes in any file | 0 route definitions | |
| No schema changes in any file | 0 Prisma or DB changes | |

---

## After This Handoff — CC-3 Preview

Once CC-2 SHA is returned, Claude Code begins **CC-3: `docs/skills/` package**
(9 files, markdown-only, same isolated-commit discipline):

- `docs/skills/source-audit.md`
- `docs/skills/rumor-triage.md`
- `docs/skills/injury-context-research.md`
- `docs/skills/scheme-change-research.md`
- `docs/skills/fantasy-decision-research.md`
- `docs/skills/prop-market-research.md`
- `docs/skills/public-claim-audit.md`
- `docs/skills/market-gravity-review.md`
- `docs/skills/brain-answer-review.md`
