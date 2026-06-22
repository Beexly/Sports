# GSE 2026 — Source Rights & Claim Safety

**Status:** Implemented + tested. Source: `apps/web/lib/gse/claim-safety.ts`.
Cockpit browser: `/cockpit/claim-safety`. Tests in `gse-contracts.test.ts`.

This module is the programmatic enforcement of two non-negotiables from CLAUDE.md:
"No public claims without source / no fake certainty" and "Scraping is rights-gated, not banned."
It **reuses** the existing single sources of truth — it does not fork them.

## 1. Public Claim Safety (`scorePublicClaimSafety`)

The last gate before any string reaches a public surface.

- **Banned phrases** come from `apps/web/lib/trust-claims.ts` via `scanForBannedPhrases` — the one
  authoritative list (guaranteed, the tout-noun forms, sure thing, risk-free, easy money, can't lose,
  verified track record, …). A single hit hard-caps the score to ≤8 (very_low) and sets `safe=false`.
  There is no confidence level at which banned language is acceptable.
- **Soft-certainty** patterns (absolute adverbs, "100%", "proven winner") reduce the score and flag
  for review without hard-failing — they are tone problems, not bans.
- **Unsupported causal** language ("because/proves/guarantees") without a cited source is penalised.
- Missing source or ambiguous demo-vs-live state each carve a penalty.

`safe` is true only when there are no banned hits **and** the score ≥ 60. This is a guard, **not** a
substitute for human review — copy can pass the scanner and still imply more certainty by tone.

The cockpit page renders caught phrases inside `<code>` so the rendered HTML never shows the literal
tokens as prose (the launch-night snapshot scanner strips `<code>`), and renders a placeholder label
instead of the banned test input.

## 2. Source-Rights Risk (`scoreSourceRightsRisk`)

Maps the existing scraping registry status (`apps/web/lib/scraping/source-rights-registry.ts`) onto
a 0..100 risk band (higher = riskier), then escalates by intended use:

| Status | Base risk | Notes |
|---|---|---|
| approved_open_license | 5 | CC0/CC-BY/Apache/MIT |
| approved_api | 8 | licensed, explicit commercial terms |
| approved_written_permission | 10 | contract on file |
| approved_public_logged_off | 15 | public, facts only, no login/contract |
| vendor_candidate | 55 | complete the questionnaire first |
| manual_research_only | 60 | human review only — no automation |
| permission_required | 85 | **hard stop** — written consent needed |
| blocked_technical_controls | 95 | **hard stop** — anti-bot/CAPTCHA active |
| excluded | 100 | **hard stop** — no safe path |

Escalation: intending *automated_ingestion* on a source that does not allow automation forces the
score to ≥85; intending *commercial_display* where not permitted forces ≥80. `isRightsHardStop`
returns true at ≥80 — the same boundary the clearance engine should refuse to cross.

This does not replace `checkClearance()` / `wrapExtractedRecord()` — it is the *scoring* lens that
makes the registry status legible in the cockpit and rankable in the Product OS (an idea that needs a
permission-required source scores as not-rights-safe and is capped by the opportunity gate).

## What this does NOT do

- It does not add any evasion capability. There is no CAPTCHA/login/paywall bypass, no proxy
  rotation, no fake accounts. The contracts only ever *down-rank* or *hard-stop*; they never unlock.
- It does not mutate rights snapshots. Snapshots remain point-in-time captures owned by the scraping
  layer.
- It does not promote any `permission_required` / `vendor_candidate` source. Those still require the
  documented human/legal steps (e.g. scores24.live → written consent from Kiito OÜ; score24.com →
  vendor questionnaire).

## Verification

`gse-contracts.test.ts` asserts: banned copy hard-fails; clean + every trust-safe sample passes;
permission_required/excluded land ≥80 and `isRightsHardStop` is true; an approved_api commercial use
lands < 40.
