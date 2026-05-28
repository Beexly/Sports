# Sports OS — Stitch Agent Workflow

**Status**: Doctrine only. No implementation. Agent workflows require owner approval before execution.
**Source**: Prompt 4 — Final Wave
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `DESIGN.md` — design tokens consumed by stitch operations
- `docs/design/media-studio-doctrine.md` — media output rules
- `docs/brain/claim-governance.md` — content claim rules for generated assets

---

## Purpose

The Stitch Agent Workflow documents how automated or semi-automated agents
assemble design assets, documentation, and content for Sports OS — stitching
together templates, tokens, and evidence into output artifacts.

"Stitch" refers to the pattern of composing multiple source inputs
(design tokens + content templates + evidence data + brand config) into
a coherent output, with the Sports OS brand and doctrine constraints enforced
at each composition step.

This is NOT a web scraping or crawling workflow. It is a documentation and
asset composition workflow for internal use.

---

## Sports OS Fit

The platform generates several types of recurring artifacts:

1. **Pick cards** — evidence-backed intelligence outputs
2. **Model Journal entries** — weekly model reasoning records
3. **Loss Room autopsies** — post-settlement narrative analyses
4. **Galaxy Studio content** — blog, social, newsletter, video titles
5. **Research briefs** — operator-authored intelligence documents
6. **Public methodology pages** — trust layer disclosures

Each of these has a defined template. The Stitch Agent reads the template,
injects current data and design tokens, applies claim governance rules, and
produces a draft output for operator review. It does NOT publish autonomously.

---

## Public / Private Boundary

The Stitch Agent workflow is:
- **Internal only** — agents run in the operator cockpit context, never publicly
- **Draft-only output** — all outputs require operator review before publication
- **Brand-safety checked** — claim governance scanner runs on every draft
- **Never auto-published** — no workflow may publish to public routes without
  explicit operator approval action

Stitch outputs that pass claim governance may be queued in the cockpit
for operator review. They may not be auto-published to the blog, social
accounts, or any public route.

---

## Workflow Components

### Input Sources

| Source type | What it provides | Tier |
|---|---|---|
| Design tokens (`DESIGN.md` YAML) | Colors, type, spacing for visual assets | Internal |
| Brand config (`lib/brand.ts`) | Name, tagline, voice constants | Internal |
| Evidence Vault | Data backing for content claims | T1–T4 |
| Signal Ledger | Pick and settlement history | Internal |
| Content templates | Prose structure and voice patterns | Internal |
| Claim governance rules | What can and cannot be claimed | Internal |

### Processing Steps

```
1. SELECT template type
   ↓
2. FETCH required evidence from vault / ledger
   (if evidence insufficient → ABORT, do not generate thin content)
   ↓
3. INJECT brand tokens and voice constants
   ↓
4. COMPOSE draft using template structure
   ↓
5. RUN claim governance scanner
   (if forbidden language found → FLAG, do not proceed)
   ↓
6. RUN brand-safety linter
   (if violations found → FLAG)
   ↓
7. QUEUE for operator review in cockpit
   ↓
8. OPERATOR APPROVES / REJECTS / EDITS
   ↓
9. If approved → PUBLISH to target surface
```

### Step 2 — Evidence Sufficiency Rules

A Stitch Agent must NOT generate content when:
- Evidence vault has no Tier 1 or Tier 2 items for the claim
- All evidence for the claim has exceeded its TTL
- The claim type requires Tier 1 confirmation and only Tier 5 is available
- The pick has status WITHHELD

**Rule**: Thin-evidence drafts are forbidden. A draft that cannot cite
at least one Tier 1 or Tier 2 source for its core claims is not output.
A draft with only community sources is not output.

### Step 5 — Claim Governance Scanner

The scanner checks every generated sentence for:
- Forbidden certainty language (see `docs/brain/claim-governance.md`)
- Sharp money claims without Tier 1/2 backing
- Win rate claims without a defined model version and window
- Fabricated specificity (exact statistics not in the evidence chain)
- Sportsbook/tout vocabulary (locks, guaranteed, sure thing, etc.)

**If any check fails**: The draft is FLAGGED, not blocked. The operator
sees the flag with the specific violation and the draft segment that triggered
it. The operator may reject the draft entirely or edit and re-check.

### Step 6 — Brand Safety Linter

The linter checks against the compliance scanner rules
(`apps/web/lib/compliance-scanner/rules.ts`) and the brand voice canon
(`docs/vault-content-system/galaxy-voice-brand-canon.md` if present).

Checks:
- No first-person author voice ("I believe", "I think")
- No Garrett Baxley name surface
- No version strings in public output ("v5.0.0-seed")
- No placeholder copy ("[INSERT NAME]", "Lorem ipsum")
- No semantic warning colors used as decorative elements

---

## Template Types

### Pick Card Draft

**Template**: `apps/web/lib/studio/templates/pick-card-template.ts`  
**Required inputs**: pick object from Signal Ledger, evidence chain summary,
market gravity signal  
**Output**: Pick card component draft for cockpit review  
**Claim governance**: Full scan — confidence language, evidence citations, weakness disclosure  
**Auto-publish**: Never — pick cards require operator approval

### Model Journal Entry

**Template**: `apps/web/lib/journal/prompts.ts`  
**Required inputs**: Weekly settled picks (min 5), calibration delta, model version  
**Output**: Model Journal markdown draft for cockpit review  
**Claim governance**: Win rate language scan, editorial voice check  
**Auto-publish**: Never

### Loss Room Autopsy

**Template**: `apps/web/lib/pre-mortem/templates/`  
**Required inputs**: Settled LOSS pick, evidence chain at publication, actual outcome  
**Output**: Autopsy markdown draft with CALLED/DID_NOT_HAPPEN tagging  
**Claim governance**: No forward-looking certainty claims, no blame language  
**Auto-publish**: Never

### Social Content (Galaxy Studio)

**Template**: `apps/web/lib/studio/templates/`  
**Required inputs**: Content brief, evidence backing (optional for editorial)  
**Output**: Social draft (Twitter/X, newsletter, TikTok script)  
**Claim governance**: Full scan — highest urgency for public social  
**Auto-publish**: Never — requires operator to post manually or via approved scheduler

---

## Source Evidence and R&D Rationale

The Stitch pattern emerged from the observation that manual content creation
is the bottleneck for:
- Consistent evidence citation (operators forget to attach evidence)
- Brand voice consistency (tone drifts without the constraint layer)
- Claim governance compliance (forbidden language enters without a scanner)

The workflow codifies what a disciplined operator already does, making it
repeatable and auditable. The R&D batch reviews confirmed that content
automation systems that skip the governance check become liability surfaces.

---

## Forbidden Actions

- Do NOT implement any step that auto-publishes without operator action
- Do NOT allow thin-evidence drafts to proceed past Step 2
- Do NOT generate content for WITHHELD picks
- Do NOT output content that uses Tier 5 signals as evidence in public drafts
- Do NOT allow the scanner to be disabled or bypassed
- Do NOT generate performance stats from fewer than 30 settled picks
- Do NOT generate social content claiming picks are "proven" or "guaranteed"
- Do NOT scrape external sites to fulfill evidence requirements — all evidence
  must come from the registered Source Acquisition Mesh

---

## Approval Gates

| Gate | Who approves | What unlocks |
|---|---|---|
| Template addition | Operator | New template type enters workflow |
| Scanner rule modification | Operator | Scanner rule set changes |
| Auto-publish capability | Owner | Any change that reduces operator review |
| New output surface | Owner | New destination (e.g., new social platform) |

---

## MVP Path

- Phase 1: Operator manually triggers Stitch for Model Journal (cockpit tool)
- Phase 2: Stitch for Loss Room autopsy (cockpit, pick settlement trigger)
- Phase 3: Stitch for social content drafts (Galaxy Studio cockpit panel)
- Phase 4: Stitch for pick card evidence summaries (PRO+ pick card enrichment)

All phases require operator review before any output appears on a public surface.

---

## Validation Expectations

- Brand-safety linter runs and produces no violations on all draft types
- Claim governance scanner produces no unreviewed violations on published content
- Signal Ledger shows DRAFT_QUEUED events for all stitch outputs
- Thin-evidence abort is triggered and logged when evidence is insufficient
- Auto-publish is never triggered — all published items have OPERATOR_APPROVED event

---

## Codex Audit Requirements

1. Confirm no Stitch workflow step triggers a publish action without an
   explicit operator approval gate
2. Confirm claim governance scanner is present and active for all template types
3. Confirm no template produces content citing Tier 5 as evidence for public drafts
4. Confirm all thin-evidence cases produce a logged ABORT event, not a draft
5. Confirm brand-safety linter is integrated (not bypassed) in all flows
6. Report any template that lacks a claim governance integration as P1
