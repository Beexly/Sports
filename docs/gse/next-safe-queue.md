# GSE — Next Safe Queue (30 tasks)

Each task lists: **[scope]** what · **gate** (LOCAL = no approval needed within the
lane; GATED = owner approval required) · done-condition. No task here crosses a
global gate without an explicit GATED flag.

## A. Local hardening (LOCAL — safe to do now)
1. Refactor `waitlist-store.ts` to a `WaitlistStore` interface + factory. **LOCAL.** Done: file store implements it; route unchanged; tests green.
2. Add a `waitlist_viewed` fire on `/waitlist` (tiny client effect). **LOCAL.** Done: event fires once on mount; no-op `track()`; test asserts.
3. Add server-side rate-limit/dedupe-window note + simple in-memory guard for the local route. **LOCAL.** Done: rapid double-submit handled; test added.
4. Add a `list`/review CLI helper (read `.gse-local/`) for the owner. **LOCAL.** Done: `node` script prints queued leads; gitignored output only.
5. Add zod max-length + trim hardening edge tests (oversized inputs). **LOCAL.** Done: oversized fields rejected; tests green.
6. Add an a11y pass on the form (labels/aria/error association). **LOCAL.** Done: axe-style checks pass in the render test.
7. Add a "honeypot"/basic spam field to the form (local only). **LOCAL.** Done: bot field rejects; test added.
8. Document the local store file schema in `pr3-durable-storage-plan.md` appendix. **LOCAL.** Done: JSON shape documented.

## B. DB migration planning (mostly GATED to run)
9. Finalize the `WaitlistLead` Prisma model in the plan doc. **LOCAL (doc).** Done: model reviewed for field parity.
10. Write the migration SQL preview (hand-authored) for owner review. **LOCAL (doc).** Done: SQL in the plan.
11. Add DB-store contract tests (run against both stores). **LOCAL (code, store still file).** Done: parity tests written, skipped until DB.
12. Generate the Prisma migration. **GATED** (schema). Done: only after owner approval, local DB.
13. Run the migration on local Postgres + verify `migrate diff` empty. **GATED.** Done: post-approval.
14. Flip `WAITLIST_STORAGE=db` locally and re-run parity tests. **GATED.** Done: post-approval.

## C. No-claim release gate (LOCAL planning; GATED to deploy)
15. Keep the automated gate (`release-gate-plan.md` §1) runnable on demand. **LOCAL.** Done: one command runs all checks.
16. Add a CI-style script that runs no-claim scan over waitlist copy. **LOCAL.** Done: script exits non-zero on any block flag.
17. Add waitlist smoke-test checklist as an executable script (local). **LOCAL.** Done: script hits local route, asserts behaviors.
18. Backtest-truth assertion lives in tests (already) — extend to scan the page HTML string. **LOCAL.** Done: test asserts "does not beat naive" in rendered output.

## D. Content (LOCAL drafts; GATED to publish)
19. Compliance-scan the 15 post drafts in code (run `runNoClaimGuard`). **LOCAL.** Done: all 15 pass with 0 block flags.
20. Compliance-scan the 10 brief topics. **LOCAL.** Done: all pass.
21. Draft 10 more no-claim posts (to 25 total). **LOCAL.** Done: drafts added + scanned.
22. Write one full research brief from a topic, using `research-brief-template.md`. **LOCAL.** Done: brief drafted, no-claim, owner-review queued.
23. Publish any content. **GATED** (publish/post). Done: only owner posts.

## E. Public readiness (GATED)
24. Decide nav linkage for `/waitlist`. **GATED.** Done: owner decision recorded.
25. Remove `noindex` at go-live only. **GATED.** Done: post-approval.
26. Deploy `/waitlist`. **GATED** (deploy/push). Done: post-approval + release gate green.
27. Wire confirmation email send. **GATED** (external messaging). Done: post-approval.
28. Enable an analytics provider. **GATED** (privacy/vendor). Done: post-approval, no-PII.

## F. Owner approvals (decisions, not code)
29. Approve/deny `WaitlistLead` migration (unblocks 12-14, 24-26). **GATED — owner.**
30. Approve/deny a manual content push from §D drafts. **GATED — owner.**

---
Ordering guidance: do A1-A8 first (all LOCAL, immediately safe), then C15-C18 and
D19-D22 (LOCAL), which keep the lane productive while every GATED item waits on the
owner. Nothing in B12-B14, D23, E24-E28, F29-F30 runs without explicit approval.
