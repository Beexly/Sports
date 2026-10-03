# LAUNCH CRITICAL PATH — the only list that matters (2026-08-16, Fable)

Written at the owner's request: "I have no idea what to do at this point... take the reins."
This is the first-principles cut. Read it before adding ANY new work to the queue.

---

## The one sentence

**The product is OFF, and everything built in 290 commits reaches zero customers until it is ON
and merged — so the critical path is five items, and none of them are "more tasks."**

Activity is not progress. The sprint has produced real, verified work — but a launch prep for a
product that is currently dead is theater. First principles: turn it on, ship what's built, close
the legal holes, prove money flows, run one real user journey end to end. Everything else is
quality escalation that can continue in parallel forever.

---

## The critical path (in order; each unblocks the next)

**1. TURN THE PRODUCT ON — owner, ~1 minute, do this first.**
All 20 Vercel crons show "not deployed" (verified via `vercel crons ls`). The live code is correct;
Vercel's scheduler simply has nothing registered. Dead 30+ hours and climbing. One command:
`vercel redeploy https://sports-docfcwwp5-pick-pilot-s-projects.vercel.app --yes`
(redeploys the EXACT commit already serving traffic — zero new code). Then wait 20 minutes and
confirm `/api/ops/public-surface-truth` shows `schedulerLiveness: ok`.

**2. MERGE THE HARDENED BRANCH — owner decision, the sprint's entire value is trapped behind it.**
~290 commits: Safari checkout fix, cancel-subscription fix, 7 security closures, honest-copy
fixes. All invisible to customers. Before merging: (a) unset `DEV_FAKE_ADMIN` in
`apps/web/.env.local:122` (already fails the build closed — see `handoff/BUILD_FAILURE.md`),
(b) confirm the `add_entity_graph` migration applies against prod (migrations-lead-code doctrine),
(c) run the merge-readiness gate below. Review the SHAPE (phase summaries, LAUNCH_BLOCKERS.md),
not 290 diffs — line-by-line review of this volume is not real review, it's ritual.

**3. AGE-GATE + REFUND-REVOKES — the two confirmed legal gaps, small code, owner-approved scope.**
Both verified live on deployed main: Terms claims an age gate that does not exist anywhere in
signup/checkout; a Stripe refund does not revoke access. These are the only two KNOWN gaps that
could hurt after launch day. They are hours of work, not weeks.

**4. PROVE MONEY FLOWS IN PROD — one checkout, one cancel, real card, test then live.**
The June verification found monthly/annual price-ID wiring FAILING. Sprint commits since
(`lookup_key` entitlements, price-amount verification GSE-SEC-024) suggest it is fixed — but
"suggest" is not "verified in prod." After merge: one end-to-end purchase on the live site, then
one cancel from the dashboard. Until this is done once, revenue is theoretical.

**5. ONE FULL USER JOURNEY, DAILY — the continuous check that replaces hunting.**
Anonymous visitor → sees today's picks (requires #1) → hits paywall → subscribes (#4) → sees
premium → cancels → loses access. When this passes daily, the product is launchable and STAYS
launchable. The coverage program (in design now) builds toward exactly this.

---

## What is explicitly NOT on the critical path

Phase 14 proof pages, Phase 15 sweeps, the coverage program, Phase 10's infinite loop, GitHub app
cleanup, Dependabot, branch protection, Actions billing — all real, all queued, all fine to
continue **in parallel**. None of them block launch. Do not let the size of the queue obscure the
shortness of the actual path. The owner's 10-minute GitHub list (protect main, uninstall apps,
fix Actions billing, enable Dependabot) is security posture, not launch sequence — do it this
week, not necessarily today.

---

## Standing guidance — Sonnet (supervisor)

- Verify every substantive Laguna commit with real test runs, as established. Keep the artifact
  honest: the score tracks queue completion, never readiness. Prod status stays on it until #1 is
  confirmed fixed.
- **RAISED BAR (2026-08-16, owner-mandated):** per-fix test runs prove the new tests pass — they do
  NOT prove nothing else broke. Every ~5 verified commits, run the FULL apps/web vitest suite (not
  just the new files) and journal the total. A cross-cutting regression that individual test files
  can't see is exactly what this catches. Also enforce Laguna's new red-before-green rule: a bugfix
  journal entry with no recorded failing-test output is unverified — treat it as such in the artifact.
- Do NOT add new phases until Phase 14 and 15 are drained and the coverage-program tasks are
  queued. Breadth is now covered (P15 + coverage program). The failure mode to guard against has
  flipped: it is no longer "not enough queued" — it is queue sprawl diluting Laguna into
  medium-value sweeps while the five items above sit idle.
- When the coverage workflow lands, cap what gets queued to the ranked top gaps (money/auth/
  settlement first). Park the rest in the design doc, not the queue.
- The moment the owner runs #1, verify scheduler recovery yourself and update the artifact.

## Standing guidance — Laguna (executor)

Nothing changes. Same loop, same queue order (P14 → P15 → P10), same self-verification protocol,
same NEVERs. The critical path above is owner/supervisor work — none of it is yours. Your job is
the quality escalation that runs in parallel: keep draining the queue, one task per session,
BLOCKED over forced, evidence over confidence.

---

## The Musk test, applied honestly

*Make the requirements less dumb:* the requirement was never "300 polished tasks" — it is "a
stranger can pay for picks that exist, legally." Five items deliver that.
*Delete the part:* nothing new added today except this document. The queue was already big enough.
*Simplify:* the prod fix is one command, not an investigation. The merge review is shape, not
diffs.
*Accelerate:* everything on the path is hours, not weeks. The only multi-day item is confidence —
which the daily journey check (#5) manufactures automatically.
*Automate:* last, not first — which is why the coverage program queues AFTER the product is on
and merged, not instead of it.
