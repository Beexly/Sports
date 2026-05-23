# XXX Archive Galaxy Salvage Audit - 2026-05-23

**Source:** `C:\Users\Garrett\Downloads\XXX-main (1).zip`
**Related decision:** DEC-NEXT-048
**Status:** Internal audit. No code imported.

## DEC-NEXT-048 - Extract safe operating patterns from XXX archive

**Decision:** Treat the archive as a reference/audit artifact only. Do not import adult, scraping, generator, or platform-abuse code into Galaxy. Salvage only durable operating-system patterns that strengthen Galaxy's media, proof-surface, and launch infrastructure.

## Line-Level Inspection Record

I extracted the archive to a temporary local folder and inspected all contained files by file count, line count, headings, and structured JSON summaries.

Machine-readable inventory: [xxx-main-archive-inventory-2026-05-23.json](xxx-main-archive-inventory-2026-05-23.json).

| File | Lines | Decision |
|---|---:|---|
| README.md | 2 | Reference only; identifies archive theme. |
| docs/codex_working_program_design_v2.md | 1,465 | Pattern source. Strong operating-system design, compliance gates, approval workflows, repo-audit model, content briefs, experiments, and asset vault concepts. |
| research/input-zips/.gitkeep | 1 | No usable content. |
| research/summaries/.gitkeep | 1 | No usable content. |
| research/summaries/deep_static_repo_audit.json | 7,963 | Pattern source. Contains reuse decisions, risk classifications, and archive-level findings across uploaded reference zips. |
| research/summaries/full_text_scan_counts.json | 538 | Pattern source. Contains scan counts and corpus-level metadata useful for bounded ingestion/audit design. |

Total inspected: **9,970 lines**.

## What Transfers To Galaxy

### 1. Repo-Audit Discipline

Reusable pattern:

- Canonical archive fingerprinting.
- Duplicate archive detection.
- Bounded text scanning for huge corpora.
- Reuse decision classes: extract pattern, reference only, discard code.
- Human approval before adapting any external code.

Galaxy application:

- Keep this as the model for future competitor/research archive intake.
- Add a future `research-intake` utility only after Vault launch stability.
- Never let downloaded zips become silent implementation dependencies.

### 2. Content Operating System

Reusable pattern:

- Brief builder.
- Asset vault.
- Platform strategy.
- Experiments and analytics.
- Approval workflow.
- QA before publishing.

Galaxy application:

- Use these patterns for the Vega/short-form content lab.
- Treat each short-form post as a brief with source proof surface, platform, claim, risk review, and result.
- Keep publishing draft-only until Garrett approves.

### 3. Agent Operating Model

Reusable pattern:

- Named operational roles for support, development, research, editing, performance, and coordination.
- Agent runs that record input, output, approval requirement, and status.

Galaxy application:

- Translate roles into Galaxy-safe internal lanes: research, proof-surface maintenance, support triage, content drafting, validation, and operator review.
- Do not create autonomous posting or DM behavior.

### 4. Compliance And Approval Gates

Reusable pattern:

- Red/yellow/green compliance outcomes.
- Human review for ambiguous or externally visible actions.
- Platform-risk findings before publishing.

Galaxy application:

- Use the same gate shape for synthetic-character content, proof-surface CTAs, and future partnership/content experiments.
- Keep all externally visible actions human-approved.

## What Does Not Transfer

- Adult creator operations.
- Scraping workflows.
- Real-person likeness workflows.
- Hidden synthetic identity workflows.
- Automated DM or account-growth systems.
- Any code that downloads, trains on, or copies real creator content.
- Any generator promise, platform-bypass claim, or unsafe content category.

## High-Value Specific Patterns From The Archive Summary

| Reference | Galaxy-safe salvage |
|---|---|
| `PhoenixAdult.bundle-master.zip` | Metadata architecture: title parsing, source matching, tag cleanup, asset library schema. Useful only as abstract asset metadata inspiration. |
| `nsfwjs-master(1).zip` and `nsfw_model-master(1).zip` | Classifier adapter shape and thresholding pattern. Future use only for brand-safety QA, never as sole compliance decision-maker. |
| `nsfw_data_scraper-main(1).zip` | Queue shape, URL normalization, status tracking, logging, and Docker wrapper pattern. Do not copy downloader behavior. |
| `nsfw_data_source_urls-master*.zip` | Taxonomy/blocklist intelligence only. Do not scrape, train, download, or copy source lists into product. |
| `Sandstorm-Station-13-master.zip` | Governance patterns: permissions, audit logs, roles, events, issue discipline. No direct code import. |
| Marketing-shell generator repos | Competitor promise/risk analysis only. Most appear to be README-heavy or placeholder-like. |

## Monetization R&D Implication

The useful idea is not "more synthetic volume." The useful idea is an operating system for proof-driven media:

1. Pick a proof surface: Loss Room, Pass List, Ledger, or Methodology.
2. Create a short-form brief with one claim and one source link.
3. Run brand/compliance review.
4. Publish manually through the approved platform account.
5. Track views, proof-surface clicks, applications, email captures, and brand-safety flags.
6. Decide kill/continue using the test plan.

This strengthens the existing Vega path and avoids the photoreal/tout-style trap.

## Follow-Up Backlog

- Add a future `research-intake` script that records archive path, hash, line counts, reuse decision, and safety notes.
- Add a `content-brief` data model only after Vault launch stability.
- Add an approval ledger for external posts before any short-form test goes live.
- Add a bounded scanner for large text corpora if research intake becomes recurring.

## Guardrail

No archive code was copied into Galaxy. The archive remains a reference only. Any future reuse requires license review, brand-safety review, and a decision-log entry.
