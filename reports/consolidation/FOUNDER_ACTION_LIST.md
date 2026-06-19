# Founder Action List — "best website of 2026" push

These are the only levers that wait for a human. Everything else in this push was
built, verified, and committed autonomously. Each item has a one-line undo so nothing
here is a trap. Status of the autonomous work is in
`reports/consolidation/APLUSPLUS_GRADE_REPORT.md`.

> Guardrail honored throughout: no autonomous money-out, no publish of live customer
> content, no model/MODEL_VERSION activation, no destructive prod ops. DB migrations lead
> code. Whole-monorepo green gate before every commit.

---

## A. From this push (new)

| # | Lever | Why it's gated | Do this | One-line undo |
|---|---|---|---|---|
| A1 | **Promote consolidation redirects 307 → 308** | The merges (`/picks→/board`, `/stats/players→/players`, `/gsn→/the-beat`, `/brief→/founding-desk`) ship as **temporary (307)** so they stay trivially reversible during the hardening loop. At launch they should be **permanent (308)** for SEO link-equity transfer. | In `apps/web/next.config.mjs` `redirects()`, set `permanent: true` on the four entries. | Set `permanent: false` again. |
| A2 | **Publish the welcome video** | Generating the branded welcome clip is sanctioned; **publishing the final cut is a Founder Action** (live customer-facing content). | Review the generated cut (see grade report for the Higgsfield job/asset), then place it on `/` / onboarding and commit. | Remove the embed; the file stays unreferenced. |
| A3 | **Decide the parked WIP** | A prior session's `/cockpit/command-center` + `/resource-intelligence` WIP was parked before this push (Phase-4 bans new cockpit dashboards as a product substitute). | It is safe in `git stash@{0}` on branch `claude/review-pending-requests-k46ywu` ("PARK 2026-06-18 pre-compassionate-ramanujan…"). Resume or drop at your discretion. | `git stash drop` to discard, or `git stash apply` on that branch to resume. |

## A′. Phase 3 — accuracy-proof centerpiece (no new lever)

Phase 3 wired the honest reliability-diagram engine (`buildReliabilityPresentation`)
into the **existing** `/performance` and `/reliability` surfaces via `CalibrationPanel`
— **no new pages, no new gated lever**. The diagram renders only above 100 settled
picks (`displayReady:true`); below the floor it shows the honest "building the record"
gated state and **never a fabricated curve**. The existing gate (item B6 "calibrated
conviction tier after ≥100 settled") already governs when the full curve appears — Phase 3
adds nothing a founder must approve. It self-activates from real settled data once the
record clears the floor.

## B. From the launch-lock report (still open — unchanged)

These predate this push; see `reports/master-system/LAUNCH_LOCK_FINAL_REPORT.md` §7.

1. **Database** — set `DATABASE_URL` + `DIRECT_URL`, run `prisma migrate deploy`.
2. **Auth** — set `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ADMIN_EMAILS` (+ Google OAuth optional).
3. **Stripe** — set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, the three price IDs.
4. **Deploy** — push env + deploy; `vercel.json` crons start the loops.
5. **`OUTCOME_LEARNING_ENABLED=true`** once the DB is live and ≥1 ingestion has run.
6. **Parked for judgment:** calibrated conviction tier (after ≥100 settled), approve drafted
   content to publish, authorize any paid spend when a proof signal clears.

---

## Local-session note (not a Founder Action — just FYI)

The local checkout has a running Postgres on `:5432` whose credentials do **not** match
`apps/web/.env.local` (`role "sports"` auth fails). This is why the local full test suite
and the local production build emit `prisma:error` lines for DB-backed surfaces. It does
**not** affect the shipped code: the production build is **green (217 routes)** because the
DB-backed pages render honest empty states and the admin pages are now `force-dynamic`.
The CI/prod pipeline (with a real DB) is unaffected.
