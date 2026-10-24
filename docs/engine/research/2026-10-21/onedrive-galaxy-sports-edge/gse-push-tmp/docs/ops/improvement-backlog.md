# Improvement Backlog

Non-urgent improvements either Claude or Codex has noticed. Codex implements approved items in slack time between phase work.

Format per item:
- **What** — the improvement
- **Why** — observed friction or upside
- **Cost estimate** — rough time/effort
- **Approval status** — proposed / approved / declined / shipped

Items move to "Shipped" when merged.

---

## Open

### IMP-001 — Phase 1 prep: seed `apps/web/components/marketing/` directory
**Filed:** 2026-05-22 · **By:** Claude
**Status:** **Shipped** by Codex during Phase 1. Marketing components are now consolidated under `apps/web/components/marketing/`.

### IMP-002 — Apex Phase-2 browser QA findings F1–F10
**Filed:** 2026-05-22 · **By:** Claude (carried over from `sports-apex-phase2-2026-05-22` memory)
**Why:** 10 friction findings from live-site browser QA on the apex Phase-2 pass.
**Status:** Triage carried into Phase 1+2 work. Most findings were addressed by the Phase 1 reposition (templated chassis removed) and Phase 2 board/ledger surfaces. Remaining items roll forward into Phase 3 polish as discovered.

### IMP-003 — URGENT — Spec + template code parity gap on primary clone (confirmed)
**Filed:** 2026-05-22 PM · **By:** Claude
**Escalated:** 2026-05-22 later PM after Codex confirmed during Phase 3 commit batch: "Claude's referenced docs/product/** files are not present in this checkout."
**Why:** Claude wrote substantial template/prompt code (33 files in `apps/web/lib/*/templates/`) + 22 product specs in `docs/product/` to the scratch clone. These have NOT propagated to the primary clone where Codex commits. Codex's Phase 3 commits to date have not needed these (architectural/data-loader work), but the next Phase 3 commits (Galaxy Studio v0, Twitter bot, Discord bot, Model Journal) MUST wire against these to ship with the locked voice + refusal + compliance contracts.
**Cost:** Owner copies files manually using `SCRATCH_TO_PRIMARY_COPY_MANIFEST.md` (low effort — single PowerShell script provided). OR Codex re-implements from scratch using its own judgment (specs and template code are content-equivalent).
**Status:** **URGENT.** Blocks Phase 3 Studio + bot work from shipping with the locked voice rules. Owner action requested.

---

## Shipped

### IMP-001 (Phase 1 marketing components directory) — shipped 2026-05-22.

---

## Declined

*None yet.*
