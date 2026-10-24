# CC-1 Codex Handoff — docs/intelligence/ Package

**Date**: 2026-05-27  
**From**: Claude Code (Architect / Planner)  
**To**: Codex (Auditor / Committer)  
**Branch**: `sports-intelligence-os-phase-9-ci`  
**Work package**: CC-1 — docs/intelligence/ doctrine package  
**Relay file reference**: `reports/agent-handoffs/ACTIVE_AGENT_RELAY.md` — CC-1  

---

## What Claude Code Did

Created 6 new markdown-only documentation files in `docs/intelligence/` per
the Sports OS Intelligence Network Master Plan (Prompt 1 §7 Phase 1) and the
relay queue item CC-1.

**Zero non-markdown files were touched.** No routes, no schema, no components,
no scripts, no dependencies, no tests, no `.ts`, `.tsx`, `.json`, `.prisma`,
`.yml`, or `.css` files.

---

## Files Written (all new — no pre-existing files modified)

| File | Lines | Purpose |
|---|---|---|
| `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md` | 243 | In-repo canonical copy of Prompt 1 master doctrine |
| `docs/intelligence/product-ecosystem.md` | 396 | 15-component ecosystem with dependency map |
| `docs/intelligence/design-experience-system.md` | 158 | Design standard, forbidden patterns, signature components |
| `docs/intelligence/ai-search-geo-strategy.md` | 188 | GEO strategy, requirements, readiness checklist |
| `docs/intelligence/monetization-lanes.md` | 170 | 6 monetization lanes mapped to ecosystem components |
| `docs/intelligence/developer-innovation-layer.md` | 194 | Operator workbench vision, B2B pathway, responsible intelligence doctrine |

**Total**: 1,349 lines of markdown documentation.

---

## Pre-Commit Verification Claude Code Ran

```
Branch: sports-intelligence-os-phase-9-ci
git ls-files --others --exclude-standard docs/intelligence/:
  docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md
  docs/intelligence/ai-search-geo-strategy.md
  docs/intelligence/design-experience-system.md
  docs/intelligence/developer-innovation-layer.md
  docs/intelligence/monetization-lanes.md
  docs/intelligence/product-ecosystem.md

git status --short | grep -E "\.(ts|tsx|...)" | grep "^.M":
  (pre-existing working-tree modifications from prior passes — none from CC-1)
```

All 6 files show as `??` (untracked new). The pre-existing modified `.ts`/`.tsx`
files in the working tree are not part of CC-1 — they were already modified
before this session.

---

## Codex Action Required

### Step 1 — Content audit (docs-only verification)

```bash
cd /path/to/primary/clone   # C:\Users\Garrett\Sports

# Verify all 6 are untracked new files
git ls-files --others --exclude-standard docs/intelligence/

# Expected output (6 lines, all docs/intelligence/):
# docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md
# docs/intelligence/ai-search-geo-strategy.md
# docs/intelligence/design-experience-system.md
# docs/intelligence/developer-innovation-layer.md
# docs/intelligence/monetization-lanes.md
# docs/intelligence/product-ecosystem.md

# Verify no implementation drift from this package
# (None of these 6 files should appear in git diff of staged/modified files)
git status --short | grep "docs/intelligence"
# All 6 should show ?? only
```

### Step 2 — Run test suite (confirm pre-existing state unchanged)

```bash
npm run test 2>&1 | tail -5
npm run typecheck 2>&1 | tail -5
```

CC-1 is markdown-only and cannot break tests. Run to confirm baseline health
is unchanged from before the session. If tests were already failing before
CC-1 (from prior working-tree state), note that separately — those are
pre-existing failures, not caused by CC-1.

### Step 3 — Isolated commit (explicit git add, never git add .)

```bash
git add \
  docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md \
  docs/intelligence/ai-search-geo-strategy.md \
  docs/intelligence/design-experience-system.md \
  docs/intelligence/developer-innovation-layer.md \
  docs/intelligence/monetization-lanes.md \
  docs/intelligence/product-ecosystem.md

# Verify only these 6 files are staged:
git diff --name-only --cached
# Must show exactly the 6 docs/intelligence/ files and nothing else.
# If any other file appears — abort: git reset HEAD

git commit -m "docs(intelligence): CC-1 product ecosystem and intelligence network doctrine"
git rev-parse HEAD
```

### Step 4 — Post-commit verification

```bash
# Verify only docs/ files appear in the commit
git diff --name-only HEAD~1..HEAD
# Expected: 6 lines, all docs/intelligence/

# Verify no .ts/.tsx/.json/.prisma/.yml files in the commit
git diff --name-only HEAD~1..HEAD | grep -E "\.(ts|tsx|json|prisma|yml|css|js)$"
# Expected: empty output
```

### Step 5 — Return SHA to Claude Code

Post the output of `git rev-parse HEAD` so Claude Code can:
1. Fill in "Certified Commit SHA" in `docs/audits/phase-0-adr-checklist-audit-manifest.md` (for CC-1)
2. Mark relay queue item CC-1 as `DONE`
3. Begin CC-2 (`docs/brain/` — 11 files)

---

## Pass/Fail Criteria

| Check | Expected Result | Pass / Fail |
|---|---|---|
| `git ls-files --others docs/intelligence/` shows 6 files | All 6 docs present | |
| No `.ts`/`.tsx`/`.json`/`.prisma` files in `git diff --cached` | 0 non-markdown files staged | |
| `git diff --name-only HEAD~1..HEAD` after commit | Exactly 6 docs/intelligence/ lines | |
| `npm run test` exit code | 0 (or pre-existing failures, not from CC-1) | |
| `npm run typecheck` exit code | 0 (or pre-existing — docs cannot break typecheck) | |
| Commit message format | `docs(intelligence): CC-1 ...` | |

If any check fails:

- Non-markdown file staged → `git reset HEAD` all, investigate, re-stage explicitly
- Test failure introduced by CC-1 → impossible (markdown only) — flag as pre-existing
- `git ls-files` shows missing files → files may not have been synced to primary clone;
  copy from `C:\Users\Garrett\AppData\Roaming\Claude\local-agent-mode-sessions\...\mnt\AI Sports\docs\intelligence\`

---

## After This Handoff — CC-2 Preview

Once CC-1 SHA is returned, Claude Code begins **CC-2: `docs/brain/` package**
(11 files, markdown-only, same isolated-commit discipline):

- `docs/brain/source-hierarchy.md` — 6-tier taxonomy with TTLs, allowed use, public-safe rules
- `docs/brain/weak-signal-engine.md` — Tier 5 intake rules, watchlist output, forbidden outputs
- `docs/brain/entity-graph.md` — Full entity type list, relationships, dependency status
- `docs/brain/evidence-vault.md` — EvidenceItem proposal (BLOCKED — schema approval required)
- `docs/brain/signal-ledger.md` — Lifecycle audit trail (BLOCKED — schema approval required)
- `docs/brain/market-gravity.md` — Composite market signal spec
- `docs/brain/ask-the-brain.md` — Internal Q&A output schema, launch sequence
- `docs/brain/fantasy-war-room.md` — Fantasy entity layer (BLOCKED — schema approval required)
- `docs/brain/research-lab.md` — Brief types, cockpit-only scope
- `docs/brain/claim-governance.md` — Public claim approval workflow, minimum evidence bar
- `docs/brain/operator-cockpit-governance.md` — Cockpit boundary rules, gate integrity

All BLOCKED items in CC-2 will be documented as proposals with explicit
`STATUS: PROPOSAL — not implemented` markers, same as the EvidenceItem type
in `product-ecosystem.md`.

---

## Notes

- The `.git/index.lock` ACL block prevents `git add`/`git commit` from the
  Claude sandbox on the `AI Sports` cowork clone. This is why Codex must
  perform the commit on the primary clone (`C:\Users\Garrett\Sports`).
- The standing rule from `docs/audits/phase-0-adr-checklist-audit-manifest.md`
  applies: Claude Code cannot mark CC-1 complete and cannot begin CC-2 until
  Codex returns a verified isolated commit SHA.
- The Phase 0 ADR package (5 files in `docs/adr/` + relay file) also needs
  its own isolated commit if not already committed. Codex should check whether
  those files are tracked; if still `??`, commit them first in a separate commit
  and return that SHA too so the audit manifest can be completed.
