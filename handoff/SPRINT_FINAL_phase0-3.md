# SPRINT FINAL

Written: 2026-08-15T01:21:53Z
Branch: `claude/fable-5-ultracode-plan-ptru4e`
Workdir: `C:/Users/Garrett/Sports`
Source of truth: `handoff/SPRINT_QUEUE.md`, `handoff/SPRINT_JOURNAL.md`, `handoff/AUDIT_FINDINGS.md`, `handoff/PHASE1_SUMMARY.md`, `handoff/REMEDIATION_ROADMAP.md`.
Rule: no push. No audit remediations implemented. No `.env` opened.

---

## 1. Counts

| Bucket | Count |
|---|---|
| Queue tasks | 29 |
| DONE | 28 |
| BLOCKED | 1 (P0-01) |
| TODO remaining | 0 |
| Sports-repo commits made by this sprint | **0** |

Why zero sprint commits: `§COMMIT DISCIPLINE` forbids committing while `npm test` is red. P1-01 recorded 21 pre-existing failures outside the Phase 1 allow-list. P1-03 left four allow-list files uncommitted. Phase 0 edited Hermes config (outside this repo). Phase 2 and Phase 3 were read-only / planning-only. `handoff/` is gitignored.

### Uncommitted working-tree (P1-03, still dirty)

```
 M apps/web/app/cockpit/api-costs/budget-override-control.tsx
 M eval/promptfoo/scorer.test.ts
 M tools/model-advisor/recommend.test.ts
 M tools/model-advisor/recommend.ts
```

Also dirty (Phase 2 artifacts, gitignored or tracked depending on repo ignore): `handoff/AUDIT_COVERAGE.md`, `handoff/AUDIT_FINDINGS.md`, `handoff/npm-audit.json`.

### Pre-existing hashes for graded Phase 1 implementations

These already existed on the branch. They are **not** this sprint's commits. `git show <hash> --stat` must resolve.

| Hash | What |
|---|---|
| `6a8f695f25d2906d7072452e2cba40669d5f4d7e` | T1 model-advisor + next-level plan |
| `472ebe55776d409e81d03ab43f20295e84d11803` | T1 Nemotron local executor tier |
| `41801e6b997d7e9979f2e4c12130710584828624` | T2 cockpit routing-legibility card |
| `7cdc004483b7ddea28d2f1f0bd6c80f00b71257d` | T2 budget override controls |
| `de4288d9b8ebf9ff080d290d18fcdfaa048a4684` | T3 eval:prompts offline report |
| `c5271d8325bc67499a2d2fe14f1e8f0c5ece79d3` | T3 A++ drop non-null assertions |
| `675fcd4ccd2da1d8a183d7d7e4ca3689e9acce8f` | fail-closed ASCII admin gate + eval hygiene |

HEAD at report time: `73def0bf` (merge of origin ADR-009 / CEPT v2.2 into local rate-limit work). Unrelated to this sprint loop.

---

## 2. BLOCKED list

### P0-01 — Test whether `model.aliases` is dead config · STRIKES: 0

- Reason: `/model claude-max` resolves. Alias is live: `claude-max` -> DirectAlias(model='claude-fable-5', provider='anthropic'). `model.aliases` is read by `model_switch.py:416-438`. Two competing alias systems (`model.aliases` + `model_aliases`). Queue instruction: do NOT delete; mark BLOCKED, needs human.
- VERIFY command in the queue (`aliases` in `d['model']` prints False) is the delete-path check. That path was not taken.
- `handoff/SPRINT_BLOCKED.md` was never created. The reason lives in the queue NOTE and the P0-01 journal entry (2026-08-14T22:41:03Z).

No other task is BLOCKED.

---

## 3. Audit findings by severity (Phase 2)

From `handoff/AUDIT_FINDINGS.md` histogram (P2-17). IDs GSE-SEC-001 through GSE-SEC-075.

| Severity | Count |
|---|---|
| Critical | 2 |
| High | 12 |
| Medium | 34 |
| Low | 24 |
| Info | 3 |
| **Total blocks** | **75** |

Live-vs-tag: 001/002/005 are historical as current CVEs (lock patched). 003 stays OPEN (rolled into 059). 004 wording is stale (see 060). 006 count is stale (see 067/068). Tags were not rewritten so IDs stay stable.

Coverage: D1–D15 all marked **inspected** in `handoff/AUDIT_COVERAGE.md`. Zero `not-reached`. Residual gaps are live-e2e / `.env` / platform spoofability, not unread domains.

---

## 4. Top 10 risks

Copied from the register (one line each):

1. CRITICAL GSE-SEC-001 — next-auth/@auth/core advisories (HISTORICAL in lock; residual float is 061).
2. CRITICAL GSE-SEC-002 — next-auth beta fail-open advisory (HISTORICAL in lock; residual is 061).
3. HIGH GSE-SEC-025 — public preview + board leak PREMIUM selection/line (live product).
4. HIGH GSE-SEC-016 — dual-mode cron treats `x-vercel-cron` as auth.
5. HIGH GSE-SEC-043 — refresh TOCTOU can rewrite a just-settled pick.
6. HIGH GSE-SEC-039 — `paidCallJustified()` never called on live paid Odds paths.
7. HIGH GSE-SEC-049 / 050 / 051 — clearance skipped or nflverse-blanketed (PFR, settlement, ESPN).
8. HIGH GSE-SEC-059 — Next 14.2.35 HIGH advisory cluster; advertised fix is a semver-major.
9. HIGH GSE-SEC-060 — Next-nested postcss 8.4.31 (direct copy already patched).
10. HIGH GSE-SEC-003 — Next deserialize / Image Optimizer DoS (list superseded by 059, still OPEN).

---

## 5. Commands a human should run

```
cd C:/Users/Garrett/Sports
git rev-parse --show-toplevel
git branch --show-current
git status --short
git log --oneline -5

# Final report + blocked leftover
test -f handoff/SPRINT_FINAL.md
test -f handoff/REMEDIATION_ROADMAP.md
test -f handoff/AUDIT_FINDINGS.md
test -f handoff/AUDIT_COVERAGE.md
test -f handoff/npm-audit.json
test -f handoff/PHASE1_SUMMARY.md

# Hashes must resolve
git show 6a8f695f25d2906d7072452e2cba40669d5f4d7e --stat
git show 472ebe55776d409e81d03ab43f20295e84d11803 --stat
git show 41801e6b997d7e9979f2e4c12130710584828624 --stat
git show 7cdc004483b7ddea28d2f1f0bd6c80f00b71257d --stat
git show de4288d9b8ebf9ff080d290d18fcdfaa048a4684 --stat
git show c5271d8325bc67499a2d2fe14f1e8f0c5ece79d3 --stat
git show 675fcd4ccd2da1d8a183d7d7e4ca3689e9acce8f --stat

# Queue terminal state: 28 DONE, 1 BLOCKED, 0 TODO
grep -c "STATUS: DONE" handoff/SPRINT_QUEUE.md
grep "STATUS: BLOCKED" handoff/SPRINT_QUEUE.md
grep "STATUS: TODO" handoff/SPRINT_QUEUE.md || true

# Finding histogram still 75
grep -E "^Critical:|^High:|^Medium:|^Low:|^Info:|^Total" handoff/AUDIT_FINDINGS.md

# P1-03 uncommitted allow-list still present
git diff --stat -- tools/model-advisor eval/promptfoo/scorer.test.ts apps/web/app/cockpit/api-costs/budget-override-control.tsx

# Gates (expect typecheck/lint 0; npm test still red with the pre-existing 21)
npm run typecheck
npm run lint
npx vitest run tools/model-advisor
```

Do **not** push. Do **not** implement audit remediations until a human reviews `handoff/REMEDIATION_ROADMAP.md`.

---

## 6. Next 24 hours (if another loop is authorized)

Do not invent scope. Queue APPENDING WORK already ranked this:

1. Human decision on P0-01: keep both alias systems, or delete one. Do not guess.
2. Human review of `REMEDIATION_ROADMAP.md` Now lane, then implement in this order (SAFE DIRECT first): 025 paywall HTML leak, 016 cron bearer-only, 043 refresh TOCTOU, 039 Odds spend guard, 049–051 clearance. Pin next-auth caret (061) is CHANGE PROPOSAL.
3. Decide whether to commit the four P1-03 allow-list files once `npm test` policy is waived or the 21 outside-allow-list fails are accepted as baseline.
4. Re-run P1-01 baseline and confirm still the same 21 reds (no new ones).
5. Convert `hypothesis` findings to `confirmed` or `refuted` by more code traces. All D1–D15 are already inspected; deepen, do not reopen sealed trees.
6. Next major (059/003/060) stays owner-gated. Do not bump `package.json`.

---

## Sprint shape (for the human)

- Phase 0: Hermes config. 5 DONE, 1 BLOCKED (aliases). Gateway started. Dead model IDs purged. Local eval-rate measured (P0-06).
- Phase 1: A++ on allow-list. Spec notes in `PHASE1_NOTES.md` (16 divergences). Summary in `PHASE1_SUMMARY.md`. No commit.
- Phase 2: 15-domain adversarial audit. 75 findings. Guards + `npm-audit.json` captured.
- Phase 3: Roadmap written. This file is the stop line.

STOP. Do not push. Do not fix audit findings.
