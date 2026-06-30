# GSE — Final Owner Decision Packet

**As of:** 2026-06-29 · Branch `claude/gse-no-claim-waitlist` @ `56a069e5` (pushed, in
sync) · 17 ahead of `main` · validation GREEN (typecheck 0, lint 0, 49/49 + 6/6) ·
backtest false · no-claim CI-enforced · production untouched.

Each decision is independent. Default is **NO** until you say yes in writing.

| # | Decision | Allows | Does NOT allow | Validation needed | Rollback | Blast radius |
|---|---|---|---|---|---|---|
| 1 | **Open the waitlist PR (draft), no merge** | open the draft PR from the URL; CI/preview run | merge; production; public share | already GREEN; re-run gate optional | close the PR | none to prod — a draft PR + protected preview only |
| 2 | **Merge to `main`, no production deploy** | PR merges into main | a production *promotion* beyond what main auto-deploys | full `npm run build` + gate green on main | `git revert` the merge | ⚠️ HIGH — on this repo, merging `main` **auto-deploys to production** via the main→alias flow; treat as production. Recommend NO until #4 is intended |
| 3 | **Protected preview smoke test only** | redeploy a preview of the hardened branch; smoke `/waitlist` behind SSO | production; public URL | preview reaches READY; SSO check | delete the preview deployment | none to prod — preview is noindex + SSO-protected |
| 4 | **Production deploy of the no-claim waitlist** | promote the waitlist code to production (still `noindex`/unlinked unless you also unlink) | Stripe/pricing/email/claims | full build green; smoke prod `/waitlist`; confirm noindex | Vercel alias re-point to prior prod (`dpl_DTeU1agC`) | ⚠️ HIGH — code live in prod; mitigated by `noindex`+unlinked |
| 5 | **PR3 schema-migration BUILD only, no deploy** | stage the `WaitlistLead` model + wiring on a local branch (artifacts in `pr3-build-artifacts.md`) | `prisma migrate dev/deploy`; DB write; push; deploy | typecheck/lint/tests green on the build branch; TLAPS/BFS check | drop the local branch; flag stays `file` | ⚠️ MED — schema change on the migrate-in-build repo; safe only while unpushed/unapplied. Phrase: *"approve PR3 schema build — local only, no migrate, no push"* |
| 6 | **Analytics provider research only** | research/plan a privacy-first provider (`pr3-analytics-provider-plan.md`) | wiring a vendor; any PII egress | n/a (research) | n/a | none — `track()` stays no-op |
| 7 | **Email integration research only** | research the confirmation/follow-up send path | any actual send | n/a (research) | n/a | none — emails stay draft-only |

## Recommended sequence
1 (open draft PR) → 3 (preview smoke) → then decide 5 (PR3 build) if you want durable
storage. Hold 2/4/6/7 until explicitly intended. **Never** do 2 or 4 unless a production
release of the waitlist is the goal.

## Hard "do not"
Merge/prod without intent · Stripe/pricing/checkout · sportsbook/affiliate · email send ·
account creation · money movement · `prisma migrate` against any DB · performance claims ·
Lumera/XXX edits.
