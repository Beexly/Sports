# CODEX DOCS PARITY SYNC BRIEF — 2026-05-27

**Issued by**: Claude (Cowork mode)
**Target**: Codex on primary clone (`C:\Users\Garrett\Sports`)
**Status of previous sync run**: Partial — 3 files copied, 60 still missing
**Reference**: `docs/ops/PRIMARY_CLONE_SYNC_AUDIT_2026-05-27.md`
**Inventory**: `docs/ops/_pre_sync_inventory_2026-05-27.csv`

---

## Background

The 2026-05-27 sync audit (`PRIMARY_CLONE_SYNC_AUDIT_2026-05-27.md`) confirmed
that 60 documentation files written across CC-2, Prompt 4, and Wave 3 are present
in the AI Sports cowork workspace but absent from the primary clone at
`C:\Users\Garrett\Sports`. The previous sync run was constrained to the
manifest+allowed-zone intersection, which produced only 3 copies.

This brief gives Codex an explicit, expanded docs-only scope to close the gap.

---

## Scope

**Source**: `C:\Users\Garrett\Documents\Claude\Projects\AI Sports\`
**Target**: `C:\Users\Garrett\Sports\`

**Allowed copy zones (docs only)**:
- `DESIGN.md` (root)
- `docs/brain/` (all .md)
- `docs/design/` (all .md)
- `docs/audit/` (all .md)
- `docs/media/` (all .md)
- `docs/source-providers/` (all .md)
- `docs/models/` (all .md)
- `docs/agents/` (all .md)
- `docs/performance/` (all .md)
- `docs/data/` (all .md)
- `docs/ops/` (specific files — see list below)

**Forbidden zones** (must not be touched in this sync):
- `apps/**`
- `packages/**`
- `workers/**`
- `docs/product/**`
- `docs/monetization-v3/**`
- Root briefs: `CODEX_PHASE_*.md`, `CODEX_PICKUP_*.md`, etc.
- Any `.ts`, `.tsx`, `.js`, `.json`, `.lock`, `.prisma` file
- Any test file

---

## Exact Files to Copy (60 missing + 4 updates from inventory)

### Add to primary (missing — 60 files)

**Root**
- `DESIGN.md`

**docs/agents/**
- `agent-action-policy.md`
- `autogpt-style-task-loop-boundaries.md`

**docs/audit/**
- `agentic-owasp-controls.md`
- `codemod-safety-policy.md`
- `final-wave-source-risk-register.md`
- `media-automation-risk-policy.md`
- `piracy-malware-do-not-use-register.md`
- `prompt-leak-and-sensitive-source-policy.md`

**docs/brain/**
- `ask-the-brain.md`
- `calibration-feedback-loop.md`
- `claim-governance.md`
- `entity-graph.md`
- `evidence-vault.md`
- `fantasy-war-room.md`
- `intelligence-routing.md`
- `market-gravity.md`
- `operator-cockpit-governance.md`
- `picks-intelligence.md`
- `public-trust-layer.md`
- `research-lab.md`
- `signal-ledger.md`
- `source-acquisition-mesh.md`
- `source-hierarchy.md`
- `weak-signal-engine.md`

**docs/data/**
- `source-provider-module-taxonomy.md`
- `sports-api-provider-policy.md`

**docs/design/**
- `component-system-maturity.md`
- `design-md-spec.md`
- `design-to-react-review.md`
- `final-wave-design-pattern-register.md`
- `media-studio-doctrine.md`
- `motion-and-transition-doctrine.md`
- `obs-inspired-scene-system.md`
- `stitch-agent-workflow.md`
- `visual-language-palette-lab.md`

**docs/media/**
- `audio-voice-policy.md`
- `content-provenance-and-review.md`
- `media-studio-workflow.md`
- `video-brief-pipeline.md`
- `youtube-automation-boundaries.md`

**docs/models/**
- `answer-eval-benchmark-lab.md`
- `fine-tuning-governance.md`
- `local-model-lane.md`
- `model-benchmark-lab.md`
- `prompt-leak-and-auth-sensitive-policy.md`
- `ragflow-governance.md`

**docs/performance/**
- `biomechanics-modality-taxonomy.md`
- `force-plate-and-high-performance-layer.md`
- `play-classification-layer.md`
- `player-performance-intelligence.md`
- `radar-and-tracking-data-layer.md`
- `sports-science-evidence-vault.md`
- `sports-science-licensing-policy.md`

**docs/source-providers/**
- `commercial-crawling-approval-gate.md`
- `historical-trends-provider-policy.md`
- `scores24-source-review.md`

**docs/ops/** (specific files only)
- `WAVE_COMPLETION_REPORT_2026-05-27.md`
- `PRIMARY_CLONE_SYNC_AUDIT_2026-05-27.md`
- `CODEX_DOCS_PARITY_SYNC_BRIEF.md` (this file)
- `_pre_sync_inventory_2026-05-27.csv`
- `_manifest_allowed_copy_plan_2026-05-27.csv`

### Update in primary (different hash — 4 files from inventory)

- `docs/ops/decision-log.md` (scratch: 20799 bytes, primary: 46062 bytes — primary is newer/larger; **do NOT overwrite**, skip)
- `docs/ops/improvement-backlog.md` (scratch: 2400 bytes, primary: 750 bytes — scratch is newer; copy)
- `docs/ops/issue-queue.md` (scratch: 2515 bytes, primary: 32 bytes — scratch is newer; copy)
- `docs/ops/stuck-queue.md` (scratch: 926 bytes, primary: 32 bytes — scratch is newer; copy)

**Note on `decision-log.md`**: Primary has 46062 bytes vs scratch 20799 bytes.
Primary is materially larger and likely contains Codex-authored entries not in
scratch. Do NOT overwrite. Leave primary version intact.

---

## Execution Steps

```powershell
# Run from C:\Users\Garrett\Sports

$src = "C:\Users\Garrett\Documents\Claude\Projects\AI Sports"
$dst = "C:\Users\Garrett\Sports"

# Create target directories if missing
$dirs = @(
  "docs\agents", "docs\audit", "docs\brain", "docs\data",
  "docs\design", "docs\media", "docs\models", "docs\performance",
  "docs\source-providers", "docs\ops"
)
foreach ($d in $dirs) {
  if (-not (Test-Path "$dst\$d")) { New-Item -ItemType Directory -Path "$dst\$d" -Force | Out-Null }
}

# Copy all files from each allowed zone
$zones = @(
  "docs\agents", "docs\audit", "docs\brain", "docs\data",
  "docs\design", "docs\media", "docs\models", "docs\performance",
  "docs\source-providers"
)
foreach ($z in $zones) {
  Copy-Item "$src\$z\*.md" "$dst\$z\" -Force
  Write-Host "Copied $z"
}

# Root DESIGN.md
Copy-Item "$src\DESIGN.md" "$dst\DESIGN.md" -Force
Write-Host "Copied DESIGN.md"

# docs/ops specific files (do NOT use wildcard — explicit list only)
$opsFiles = @(
  "WAVE_COMPLETION_REPORT_2026-05-27.md",
  "PRIMARY_CLONE_SYNC_AUDIT_2026-05-27.md",
  "CODEX_DOCS_PARITY_SYNC_BRIEF.md",
  "_pre_sync_inventory_2026-05-27.csv",
  "_manifest_allowed_copy_plan_2026-05-27.csv",
  "improvement-backlog.md",
  "issue-queue.md",
  "stuck-queue.md"
)
foreach ($f in $opsFiles) {
  Copy-Item "$src\docs\ops\$f" "$dst\docs\ops\$f" -Force
  Write-Host "Copied docs\ops\$f"
}

Write-Host "Done. Run git status to confirm."
```

---

## Post-Copy Validation

After copying, run:

```bash
# Confirm file count in each zone
foreach zone in agents audit brain data design media models performance source-providers; do
  echo "docs/$zone: $(ls docs/$zone/*.md | wc -l) files"
done

# Confirm no implementation files changed
git diff HEAD -- apps/ packages/ workers/ | head -5
# should be empty or show only pre-existing changes unrelated to this sync

# Confirm docs added
git status --short docs/

# Run validation suite
npm run lint
npm run typecheck
npm run test
npm run build
```

Expected outcome:
- 60+ new files in `git status`
- All in `docs/` paths
- No changes to `apps/`, `packages/`, `workers/`
- lint + typecheck + test + build all pass

---

## Hard Rules for This Task

- Do NOT copy anything outside the allowed zones listed above
- Do NOT overwrite `docs/ops/decision-log.md` (primary is newer/larger)
- Do NOT copy `docs/product/**`, `docs/monetization-v3/**`
- Do NOT touch any `.ts`, `.tsx`, `.js`, `.json`, `.lock`, `.prisma` file
- Do NOT touch any test file
- Do NOT commit until Codex runs the validation suite and confirms all pass
- After validation passes: commit with message `docs: parity sync Wave 1-3 docs from AI Sports workspace`

---

## Completion Criteria

This task is NOT complete until:
- [ ] All 60 missing files are present in primary clone
- [ ] `docs/ops/decision-log.md` is NOT overwritten (primary version preserved)
- [ ] `git diff HEAD -- apps/ packages/ workers/` shows no changes from this task
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run test` passes
- [ ] `npm run build` passes
- [ ] Commit pushed with message `docs: parity sync Wave 1-3 docs from AI Sports workspace`

---

## After Commit — Final State

Once this task completes:
- Primary clone (`C:\Users\Garrett\Sports`) will have full docs-wave parity
- Codex can begin implementation audit against the doctrine docs
- The spec parity gap in `WAVE_COMPLETION_REPORT_2026-05-27.md` can be marked RESOLVED
- Implementation work (Zone 3 items) awaits owner approval decisions documented
  in `docs/ops/WAVE_COMPLETION_REPORT_2026-05-27.md` Section: Open Zone 3 Requests
