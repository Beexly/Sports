# GSE — Final Owner Decision Packet

**As of:** 2026-06-29 · Branch `claude/gse-no-claim-waitlist` @ `9e7aa3f6` (pushed, in
sync) · 18 ahead of `main` · validation GREEN (typecheck 0, lint 0, 49/49 waitlist + 6/6
guardrails) · backtest false · no-claim CI-enforced · production untouched.

Each decision is independent. Default is **NO** until you say yes in writing. The **exact
phrase** to authorize each is in the last column.

| # | Decision | Allows | Does NOT allow | Validation / rollback | Blast radius | Exact phrase |
|---|---|---|---|---|---|---|
| 1 | **Open the waitlist PR (draft), no merge** | open the draft PR from the URL; CI/preview run | merge; production; public share | already GREEN / close the PR | none to prod — draft PR + protected preview only | `approve opening GSE waitlist PR only, no merge` |
| 2 | **Protected preview smoke test only** | redeploy a preview of the hardened branch; smoke `/waitlist` behind SSO | production; public URL | preview READY + SSO check / delete the preview | none to prod — preview noindex + SSO-protected | `approve protected GSE preview smoke test only` |
| 3 | **Merge to `main`, no production deploy** | PR merges into main | a production *promotion* beyond what main auto-deploys | full `npm run build` + gate on main / `git revert` the merge | ⚠️ HIGH — merging `main` **auto-deploys production** here; treat as production. NO until #4 intended | `approve GSE waitlist merge only, no production deploy` |
| 4 | **Production deploy of the no-claim waitlist** | promote waitlist code to prod (still `noindex`/unlinked unless you also unlink) | Stripe/pricing/email/claims | full build green; smoke prod `/waitlist`; confirm noindex / Vercel alias re-point to `dpl_DTeU1agC` | ⚠️ HIGH — code live in prod; mitigated by `noindex`+unlinked | `approve GSE no-claim production deploy only` |
| 5 | **PR3 schema BUILD only — local, no migrate/push** | stage the `WaitlistLead` model + wiring on a local branch (`pr3-build-artifacts.md`) | `prisma migrate dev/deploy`; DB write; push; deploy | typecheck/lint/tests green on the build branch; TLAPS/BFS check / drop the local branch, flag stays `file` | ⚠️ MED — schema change on a migrate-in-build repo; safe only while unpushed/unapplied | `approve GSE PR3 schema build — local only, no migrate, no push` |
| 6 | **PR3 migration BRANCH only, no deploy** | create the migration on an isolated branch (worktree `Sports-GSE-PR3-isolated`) | apply to prod DB; merge; deploy | migration diff reviewed; build green on branch / delete the branch | ⚠️ MED-HIGH — a committed migration on the deploy branch auto-applies on deploy; safe only while unmerged/undeployed | `approve GSE PR3 migration branch only, no deploy` |
| 7 | **Analytics provider research only** | research/plan a privacy-first provider (`pr3-analytics-provider-plan.md`) | wiring a vendor; any PII egress | n/a (research) | none — `track()` stays no-op | `approve analytics provider research only` |
| 8 | **Email integration research only** | research the confirmation/follow-up send path | any actual send | n/a (research) | none — emails stay draft-only | `approve email integration research only` |

## Recommended sequence
1 (open draft PR) → 2 (preview smoke) → then decide 5 (PR3 schema build, local) if you want
durable storage. Hold 3/4/6/7/8 until explicitly intended. **Never** do 3 or 4 unless a
production release of the waitlist is the goal.

## Hard "do not"
Merge/prod without intent · Stripe/pricing/checkout · sportsbook/affiliate · email send ·
account creation · money movement · `prisma migrate` against any DB · performance claims ·
Lumera/XXX edits.
