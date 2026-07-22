# GSE / NOVA / CONSTELLATION — Initiative Close-Out & Review Brief

**Date:** 2026-07-22
**Author:** autonomous session (Claude Code)
**Status of everything below:** IMPLEMENTED_ON_DRAFT_BRANCH / CI_GREEN_IN_ISOLATION / **NOT_MERGED** / NOT_CUMULATIVELY_VALIDATED beyond the Wave 5 pre-merge branch. Nothing here has been merged to `main`, deployed, or activated.

This is a single entry point for reviewing the session's output. It does not replace the per-PR descriptions or the Wave 5 owner packet — it indexes them and states, plainly, **what needs your decision and in what order.**

---

## 1. The one thing to read first

**PR #173 — `reports/wave5/OWNER_PACKET_2026-07-22.md`.** It contains 6 decisions (A–F) that are genuinely yours to make and that gate how the hardening stack should be merged. Everything else is either already reviewable-clean or waits on those.

---

## 2. Review-ready draft PRs (act on these)

| PR | Title | State | What it needs from you |
|----|-------|-------|------------------------|
| **#173** | Wave 5 cumulative pre-merge integration + owner packet | draft, `mergeable_state: clean` | **Decisions A–F.** This is the bottleneck. |
| **#172** | NOVA S4 — Founder OS read-only cockpit | draft, clean | Review; it is the last NOVA split unit. |
| **#174** | Wave 3 step 1 — `LiveModelDispatchUnderAmbiguity` formal spec (TLC-verified) | draft | Review, then **send the next Wave 3 batch** — you reserved that gate. |
| **#175** | CONSTELLATION foundation — Proof-Carrying Action, capability lease, autonomy ladder A0–A9 | draft, CI green | Review the foundation *before* anything is stacked on it. |

---

## 3. The hardening units Wave 5 integrates (context for #173)

These are the individual draft PRs the Wave 5 branch merges together. Each was built, adversarially reviewed, hardened, and verified in isolation this session. They are listed in the dependency order Wave 5 used.

- **#152** — Phase-0 truth/convergence docs + PR registry (read-before-merge)
- **#158** — AI transport import-boundary guard (AST-based)
- **#159** — Trusted Actor Model (server-derived identity, actor receipts, durable anonymous-report limits)
- **#160** — Durable CheckoutAttempt (server-authoritative idempotency)
- **#161** — Settlement evidence + transactional outbox (dead-letter receipts, lease fencing)
- **#162 → #163 → #164 → #166** — AI control-plane authority-inversion chain: registry-owned policy → invocation/attempt/attribution ledger → atomic budget reservations → credit-admission layer. **This chain carries the 100-concurrent no-double-spend proofs** (real Postgres).
- **#165** — NOVA S1 domain contracts (canonical `CreditGrantSnapshot`, `CreditGrantState`)
- **#167** — Deterministic convergence-inventory tooling
- **#168 / #169** — NOVA S2 capability governor / S3 source registry+runtime (both fail-closed, inspection-only)
- **#170** — Genesis Kernel recovery (deterministic plan compiler, dormant)
- **#171** — E0/E2 provider registry + call-site inventory (dormant)
- **#172** — NOVA S4 Founder OS cockpit
- **6 CONSTELLATION lab branches** — Prisma migration-safety investigation, seed-corruption fix, formal invariant foundry (TLA+), property/chaos harness, context compiler v0, delta manifest

---

## 4. Verification posture (real, not asserted)

The Wave 5 branch was verified as an integrated whole, not just per-unit:

- `npm run typecheck` clean across 13 workspaces
- `npm run guardrails` — all 19 gates green
- Full `apps/web` vitest: **9304 passed / 42 skipped / 0 failed**
- Real-Postgres, disposable instance: credit-admission 100-concurrent no-double-spend (34/34), budget 100-concurrent cap (12/12), checkout-attempt (5/6+1 skip), durable-write-store (13/13)
- Convergence-inventory re-run post-merge: byte-identical to pre-merge (no new collisions)
- 12 adversarial lenses run against the integrated branch → 14 findings; **6 fixed directly, 6 escalated to you as decisions A–F**

Formal (PR #174): real TLC, 1,306,029 states, 0 counterexamples, all 8 composed invariants held. Apalache was **not** available and this was reported honestly rather than faked.

Foundation (PR #175): 267 tests passed; the 7 owner-only action kinds (merge, deploy, billing, payment-account, outreach, prod-migration, prod-secret) are structurally unreachable as auto-approved at **every** autonomy level A0–A9 — enforced at compile time and runtime, proven by an exhaustive 70-case test.

---

## 5. What is explicitly gated on you (not on me)

1. **Merging anything to `main`** — owner-only. None done.
2. **Wave 5 decisions A–F** — architectural/economic judgment calls; I did not decide them autonomously.
3. **Wave 3 continuation (the TypeScript batch)** — you said you would send the next batch after seeing the step-1 PR. Step 1 is #174. Awaiting your batch.
4. Deploy, billing activation, production migration, production secret change, outreach — none done, all owner-only.

---

## 6. Why the session stopped building here (deliberate, not stalled)

The concretely-scoped waves are complete and reviewable. The next natural increments (further CONSTELLATION layers) would stack on the **unreviewed** foundation in #175. Building them now would multiply your review burden and create churn risk if the foundation changes in review — the opposite of the "minimize owner input, don't churn" discipline held all session. The highest-value next action is genuinely yours: review, decide A–F, and open the Wave 3 gate. Monitoring on all four PRs remains active with scheduled check-ins.

---

## 7. Post-merge addendum (owner-authorized, 2026-07-22, later same day)

The owner subsequently authorized merging a specific, bounded set of PRs to `main` in a fixed order, after an independent union-verification workflow confirmed they were compatible together. This section is an honest record of what actually happened, not a restatement of the plan above.

### Merge order and outcome

| Order | PR | Title | Merge commit | Real CI at merge |
|---|----|-------|---------------|-------------------|
| 1 | **#173** | Wave 5 cumulative pre-merge integration + owner packet | `e7418c95` | green |
| 2 | **#174** | `LiveModelDispatchUnderAmbiguity` — composed formal spec (TLC-verified) | `ea8f1a4c` | green |
| 3 | **#179** | Inductive-invariant strengthening — CreditReservation + InvocationClaim (TLC-only) | `b7e1b89a` | green |
| 4 | **#178** | Formal Heartbeat — e-process kernel, event projection, invariant monitoring | `6529fdba` | green, 14/14 checks |
| 5 | **#175** | CONSTELLATION foundation — Proof-Carrying Action, capability lease, autonomy ladder A0–A9 | `780569bf` | green, 15/15 checks |
| 6 | **#177** | Decision A — scaled permanent-consume proof for the canonical credit port | `78ddc9c4` | green, 14/14 checks (after one legitimate CI retry, see below) |
| 7 | **#176** | This close-out report (addendum) | *(this commit)* | pending |

Every merge went through the GitHub PR-merge API against a PR whose real GitHub Actions check-runs were confirmed `success` and whose `mergeable_state` was confirmed `clean` immediately before merging — never on Vercel preview-deploy status, which is not a CI signal and which failed transiently on #175 for reasons unrelated to content (see below).

### Sync fixes required before merge (all disclosed, all evidence-based)

Several of these branches were created before #173/#178 landed on `main` and needed reconciliation. Each fix was derived by direct comparison against the real, current `origin/main` content — not improvised — and in two cases cross-checked against an earlier union-verification worktree's already-proven resolutions.

- **#174, #178, #179** (`formal-regression/` test/adapter files): stale worktree-relative import paths (e.g. `../../../../../wt/pr163/apps/web/lib/...`) left over from independent branch creation, corrected to the repo-relative paths already fixed on `main`. #174 additionally needed a provenance clarification in `reports/constellation-wave3/DELTA_MANIFEST.json` (two entries appeared "added" only due to merge order, not authorship — noted explicitly rather than left ambiguous).
- **#175**: three files (`invocation-pipeline.ts`, `package.json`, `vercel.json`) adopted verbatim from `main`, which was confirmed to be a strict superset of the branch's stale versions. A later, second conflict (a 4-line cosmetic comment-divider-length diff) was resolved the same way. The branch's real `constellation/` and induction-layer content was preserved throughout.
- **#177**: the one case where the labs branch, not `main`, held the real new content — Decision A's second-wave permanent-consume proof, which `main` entirely lacked. Two sync passes were needed:
  1. A Prisma migration directory rename collision: `main` had renamed `20260722150000_add_ai_budget_reservations` → `20260722150001_...` to avoid colliding with #159's identically-timestamped migration; the branch's real-Postgres test still referenced the old name, fixed to the new one.
  2. **A genuine gap, caught by an automated Codex review and corrected the same session, disclosed here without euphemism:** an earlier sync commit on this branch resolved a conflict in `ai-control-plane-credit-admission.test.ts` by adopting `main`'s version wholesale, which silently dropped this PR's *only* credit-port-side proof (its target API, `createInMemoryCreditAuthorizationPort`, no longer exists on `main`). That sync commit's message incorrectly asserted the property was "covered" by the PR's real-Postgres cash-path test — it is not; that test exercises an unrelated code path (`BUDGETED_CASH`) and never touches the credit port. Codex's review comment identified this correctly. It was fixed properly, not just acknowledged: two new tests were added against the *current* `createPgCreditAuthorizationPort` API, proving the same permanent-consume property (a full-settle wave and a partial-settle wave each permanently reduce a second wave's admission, never re-admitting consumed spend), run locally to confirm they pass (34/34 in the file) before pushing.

### Automated review findings triaged (11 total, all resolved with evidence before merge)

An adversarial verification pass (independent read-only agents, each required to gather direct evidence from the real git trees rather than trust the finding) was run against every Codex review comment before merging the PR it applied to:

- **7 false positives**, each dismissed with cited evidence (e.g., a P1 on #178 was reviewed against a commit SHA that does not exist in this repository; several P2s on #175 evaluated the stale branch tree in isolation and missed that the flagged files/routes exist unchanged on `main` and survive the merge; a P1 on #175's `recovery-drainer.ts` was refuted by showing the file is byte-identical to `main` and the flagged code path is provably safe — an atomic conditional UPDATE that can only return false when its precondition no longer holds).
- **3 real, non-blocking follow-ups**, all in `formal-heartbeat/` (dormant, lab-only, zero production importers), recorded on #178 before merge rather than silently fixed or silently ignored: a cross-window terminal-failure detection gap, a ConstInit emitter that mixes `.cfg` and TLA+-module grammar in one string, and a `heldMinorUnits` default that diverges from its documented contract (consequence bounded to false-positive RED alarms, never a missed violation).
- **1 real gap, fixed** — the #177 credit-port proof described above.

### A CI infrastructure flake, correctly diagnosed

#177's "Trust gate (banned phrases on public copy)" job failed on its first run. Before treating this as a real content violation, the job's actual log was read (not assumed): it died with `npm error code ECONNRESET` / "network aborted" during `npm ci`, before the trust-gate script itself ever ran. This was a transient network failure, not a policy failure. The job was rerun (`rerun_failed_jobs`) once the full workflow run had completed, and it passed cleanly the second time with no code changes.

### PR #180 — explicitly not part of this merge

**PR #180** (`feat(formal-foundry): harden IC3/Apalache package`, `labs/formal-foundry-ic3` → `main`) was opened separately during this session as independent Formal Foundry hardening work (real ITF round-trip fixes, typed RPC errors, real vitest replacing a placeholder script, a wired init-snapshot flow). It is explicitly **not** part of this merge sequence and was **not merged** — the owner reviews it separately. Its state remains DORMANT_LAB_ONLY / TESTED_AGAINST_MOCK_ONLY; it makes no live-Apalache or production-wiring claims.

### What this section does not claim

This addendum does not assert that Wave 5's owner decisions A–F (§1 above) were made, or that the Wave 3 TypeScript-batch gate (§5.3 above) was opened — those remain exactly as originally reported, gated on the owner, and this merge sequence did not change that. It reports only what the owner explicitly authorized: merging this specific, already-union-verified set of PRs to `main` in the stated order.
