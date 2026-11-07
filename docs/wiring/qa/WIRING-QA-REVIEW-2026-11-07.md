# Jules 8195 WIRING-QA-REPORT — Motif review (2026-11-07 ~03:35 CT)

Session 819564739053967767 COMPLETED 08:43Z with a changeSet (patch), NO PR.
The patch adds exactly one file: docs/wiring/qa/WIRING-QA-REPORT.md (33 lines).
It is NOT on any branch — it exists only inside the session's changeSet.
Motif extracted it verbatim from the session outputs; this review is against
the report as delivered.

## Per-surface verdicts
1. **Corpus ingestion — CORRECT.** Main carries the partial 38-file inbox
   copy; motif/corpus-inbox-2026-11-07 (127 files) is authoritative; the
   corpus is stored, not consumed by any reasoning/research module. Matches
   Motif's verified state exactly.
2. **Warehouse — DIRECTIONALLY RIGHT, DETAIL STALE.** It repeats the
   pre-correction reading (Open-Meteo + NWS "ERROR, 0 records"). Motif's
   re-audit (2026-11-07 ~01:50 CT) is the current record: 21 rows / 10
   datasets / unique total 79,297; Open-Meteo has BOTH a FAIL row (0) and a
   PASS row (1 record); NWS 2 FAIL rows, 0 records; the duplication is a
   double-run append from 2026-10-17, dedupe key canonical_id + sha256.
   The report's structural point stands: registry paths are Windows-host
   paths and no normalized data exists in the repo.
3. **Layer stack — HONEST NON-ANSWER.** "Consumption could not be
   definitively determined" — the weakest section; Copilot's #1257/#1258
   consumption tests own this question and are still unlanded.
4. **Brain — CORRECT + WELL-FOLDED.** Hardcoded values in brain.ts: true.
   62-23-1 absent from brain.ts/ask-jarvis.ts at its base: consistent with
   Motif's cd42605e greps. It folds the DeepSeek QA evidence (composite,
   SLA proxies, Sinkhorn floor, CRPS) accurately and with attribution.
5. **Provider id-set divergence — CORRECT.** The www openrouter routes serve
   a different 7-id set than the worker's 9-id feed. Matches Motif's live
   verification of both feeds on 2026-11-06.
6. **Regression greps — COUNT PLAUSIBLE, NAMED EXAMPLES WRONG.** Its 113-file
   62-23-1 count uses different exclusions than Motif's 73-at-cd42605e; both
   can be true under their stated scopes. But its three named pulled-play
   locations do not survive verification:
   - `apps/web/public/cards/week8-7of7-sweep-receipt.svg` — EXISTS but is a
     1,879-byte file containing NONE of the named strings (0 hits for
     "NYJ ML", "Jets DST", "Godwin", "62-23-1").
   - `apps/web/lib/newsletter/issues.ts` — 0 hits for all four strings.
   - `apps/web/lib/packages/catalog.ts` — contains all three pulled plays,
     but inside `pulledContaminatedItems`, an array explicitly recording
     their Nov 1 PULLED_AND_STRICKEN status (with
     oct30Section23IdentityPassVoided: true). That is the governance record
     doing its job — the same raw-grep false-positive class Motif flagged in
     AGY's Charge-4 count. NOT a live pick.
   Net: no NEW live pulled-play surface was found by this lane. The standing
   exposure list (brain at 7b8784e2c, since removed; display strings) is
   unchanged.
7. **CI — UNVERIFIED CLAIM.** "All TypeScript workspace tests pass after
   Prisma generate" cannot be checked from here (no run IDs, no logs); the
   last Motif-verified CI state at d4c2fa1f had the calibration + GSI gates
   green with main CI still pending. Treat as the session's local result,
   not a repo fact.

## Bottom line
A sound report: 4 of 7 surfaces correct outright, 1 honestly undetermined,
1 stale in detail, 1 with wrong examples under a plausible count, 1
unverifiable claim. Consistent with — and dependent on — the DeepSeek/Motif
QA evidence it cites. The deliverable should be landed (it is the session's
only output and Jules goes read-only Nov 11); landing route is a Motif push
of the extracted file onto the AGY branch beside the other QA docs, since
the session produced no PR.
