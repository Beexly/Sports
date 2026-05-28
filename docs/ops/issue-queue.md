# Issue Queue

Bugs, voice/vocabulary violations spotted in production, test gaps, performance issues. Open items at top; resolved items move to the bottom under "Resolved" with date.

Severity scale:
- **P1** — production-breaking. Drop everything.
- **P2** — visible regression or guardrail breach.
- **P3** — non-urgent bug.
- **P4** — nit / polish.

Synthetic monitoring (master plan Part 1.5) auto-files items here with severity pre-tagged.

---

## Open

*None as of 2026-05-22 PM. Phase 1 + most of Phase 2 shipped clean. Phase 2 final piece (homepage preview wiring) is in-flight, not blocked.*

---

## Resolved

### IQ-001 — `apps/web/app/api/cockpit/agent-runs/route.ts` truncated at EOF · P2
**Filed:** 2026-05-22 · **By:** Claude (during Phase 0 inventory)
**Resolved:** 2026-05-22 · **By:** Codex during Phase 0 housekeeping.
**Resolution:** Codex restored canonical content on the primary clone from the last green pass and committed.

### IQ-002 — Nested `Sports/` clone in working tree · P3
**Filed:** 2026-05-22 · **By:** Claude (during Phase 0 inventory)
**Resolved:** 2026-05-22 · **By:** Codex during Phase 0 housekeeping.
**Resolution:** Codex removed the nested clone.

### IQ-003 — Promotions prod-seed guard reverted · P2
**Filed:** 2026-05-22 · **By:** Claude
**Resolved:** 2026-05-22 · **By:** Codex on primary clone via shell-write (bypassing Edit-tool truncation that affected the scratch clone).
**Resolution:** `seedPromotions` / `seedDailyBrief` / `seedContentDrafts` are now wrapped in `NODE_ENV !== 'production'` guards in `packages/db/prisma/seed.ts`. Fake DK example.com row can no longer leak to prod via `db:seed` misrun.

### IQ-004 — Stub Prisma `in` filter silently ignored on settled-result queries · P2
**Filed:** 2026-05-22 (Phase 2 ledger work) · **By:** Codex (discovered during browser verification of `/ledger`)
**Resolved:** 2026-05-22 · **By:** Codex.
**Symptom:** The stub Prisma client silently dropped `where: { result: { in: [...] } }` filters, returning all rows (including pending sample picks) when surfaces wanted settled-only data. Manifested as `/ledger` showing rows labeled "settled" with result badges falling back to "pending."
**Resolution:** Stub filter logic in `packages/db/src/index.ts` updated to honor `in` on optional/nullable fields. Regression test at `apps/web/__tests__/stub-prisma-edge-cases.test.ts`. See DEC-027 in the decision log.

---

*Add new items at the top of "Open" with severity tag in the title.*
