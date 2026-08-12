# Overnight Journal — 2026-08-11/12

**Session**: Hermes overnight run (branch `claude/fable-5-ultracode-plan-ptru4e`)
**Protocol**: `docs/ops/HERMES_OVERNIGHT_PROTOCOL.md` + `docs/ops/HERMES_AUDIT_CHARTER.md`
**Machine**: CPU-only, 32GB RAM, Ollama 0.32.9 (local models only for heavy lifting)

---

## Bootstrap (23:31-23:40 local)

- [x] Read `CLAUDE.md`, `NEXT_LEVEL_INTELLIGENCE_MASTER_PLAN.md`, `NEXT_LEVEL_BUILD_SPEC.md`, `HERMES_OVERNIGHT_PROTOCOL.md`, `SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`, `COMPLIANCE_AND_RESPONSIBLE_GAMING.md`, `HERMES_AUDIT_CHARTER.md`
- [x] `git fetch origin` + checkout `claude/fable-5-ultracode-plan-ptru4e` + pull → now at `34350ace` (charter committed in-repo by prior session)
- [x] `npm install` started (background)
- [x] Ollama running; models present: `qwen-fast:latest` (4.7GB), `qwen-reason:latest` (9.0GB), `personal-hermes:latest` (4.7GB), `muse-glimmer:30b` (18GB)
- [ ] Gate baseline: typecheck / lint / test / guard:secrets (waiting on npm install)

**Notes**
- Untracked files present in repo root from prior sessions (`dashfiles.json`, `scratch_audit_err.txt`, `scratch_audit_full.json`, `scratch_audit_prod.json`, `docs/ops/FREE_LANE_DEPRECATIONS_2026-07-31.md`) — leave untouched.
- Pre-existing red CI (issues #419/#420/#421) is tracked debt; model-freeze + api-v1-boundary guardrails confirmed red on this branch at bootstrap (reproduce on main).

---

## Plan of record

1. **PHASE A** (charter): harden `tools/model-advisor/**` to A++ against the rubric; T2/T3 do NOT exist yet in the branch, so the charter's A2/A3 items for T2/T3 are N/A this run — but the ORIGINAL overnight protocol (HERMES_OVERNIGHT_PROTOCOL.md) scopes me to execute T2 + T3 from the build spec.
2. **PHASE B** (charter): read-only adversarial audit across D1–D15, anchored to repo guard scripts; findings to `handoff/AUDIT_FINDINGS.md` + `handoff/AUDIT_COVERAGE.md` + `handoff/npm-audit.json`.
3. No pushes. Local commits only. Two-strike rule. Journal everything.

**Decision**: The user asked to "start the overnight run — do as much as you can safely" AND "work through HERMES_AUDIT_CHARTER.md". The charter says Phase A may edit ONLY the allow-list (tools/model-advisor/**, T2/T3 files if built, reports/**, handoff/**). Executing T2+T3 (building them) is explicitly within the overnight protocol's scope and the charter anticipates them ("Task T2, if it was built"). Building T2/T3 then hardening them is the maximal safe overnight output. T2 (cockpit card) touches `apps/web/app/cockpit/api-costs/**` which is in the charter's Phase A allow-list. T3 (eval harness) touches the eval:prompts implementation — also allow-listed. Both are read-only-data UI + eval harness work, no schema/deps/sealed surfaces. Proceed.

---

## T2 — Router legibility card (23:32–23:42 local)

**Commit**: `git log -1 --format=%h` → see `git log --oneline -1`
**Files**:
- `apps/web/app/cockpit/api-costs/routing-legibility.tsx` (new) — read-only card: surface, active lane/tier, active model id, recommended tier + model id, blended $/Mtok (active + rec) from vendored models.dev snapshot, savings %, free-lane badge, honest "cache-hit rate: not recorded" note.
- `apps/web/app/cockpit/api-costs/page.tsx` — imports + `buildRoutingRows()` (real data from model-router / model-economics / free-lane-policy); renders card above Recent Errors.
- `apps/web/__tests__/cockpit-api-costs-routing.test.tsx` (new) — 7 tests.

**Gates**: vitest 7/7 new + 4/4 existing tiles green; eslint clean; `tsc --noEmit` = exactly the 3 pre-existing #421 errors (0 new).
**Decisions**: cache-hit rate has NO data source (cost ledger records no per-call cache usage) → rendered as "not recorded" per no-fabrication doctrine, per charter A3 rubric (honest empty state). Two surface enums (model-router ClaudeSurface vs cost-monitor ClaudeApiSurface) are not bridged in code → no fabricated mapping; routing card shows the model-router view, budget table shows cost-monitor view, note explains the split.

---

## T3 — eval:prompts offline cost/quality report (23:42–23:50 local)

**Commit**: `git log --oneline -2`
**Files**:
- `eval/promptfoo/surface-prompts.ts` (new) — fixed Sports-OS prompt set, one per model-router ClaudeSurface (studio/journal/calibration-insight/model-court/content/brief), grounded in each surface's real job; all pass the repo's own banned-phrase scan (had to reword "no 'lock'..." → "no tout language" — the scanner catches literal banned words even in a prohibition).
- `eval/promptfoo/scorer.ts` (new) — deterministic static quality rubric (user-placeholder, banned phrases via trust-claims getBannedPhraseList, factual-grounding, calm-tone, risk-disclosure on publicFacing surfaces, length sanity) + cost from vendored models.dev snapshot (active vs recommended blended $/Mtok, 75/25 input split).
- `eval/promptfoo/report.ts` (new) — CLI → reports/eval-prompts/eval-prompts-YYYY-MM-DD.md.
- `eval/promptfoo/scorer.test.ts` (new) — 13 tests (incl. negative cases: missing {{input}}, banned phrase, missing risk disclosure; determinism minus clock).
- `eval/promptfoo/README.md` — documented offline command.
- `reports/eval-prompts/eval-prompts-2026-08-12.md` — first real generated report (6/6 quality PASS; honest "STATIC analysis" note).

**Gates**: vitest 13/13; tsc --noEmit strict clean (0 errors); eslint: eval/ has no workspace lint config (consistent with repo layout); guard:performance-claims / commercial-copy / secrets all OK. No package.json changes (hard rule 1) — npm run eval:prompts untouched; offline report is a separate command.
**Decisions**: prompt set uses literal banned words ONLY in tests (negative case); shipped prompts reference the registry instead. Report generatedAt is wall-clock; everything else deterministic (test strips the clock).

---

## PHASE B — Brutal audit (23:50–00:05 local)

**Method**: 14 guardrails run (13 OK; api-v1-boundary RED = pre-existing #420); `npm audit --omit=dev --json` → handoff/npm-audit.json (9 findings: 2 critical, 6 high, 1 low); targeted reads across D1–D15.

**Deliverables**:
- handoff/AUDIT_FINDINGS.md — 14 findings (2 Critical, 5 High, 5 Medium, 2 Low, 3 Info) + exec summary + severity histogram + top 10 + remediation roadmap.
- handoff/AUDIT_COVERAGE.md — D1–D15 ledger (inspected/partial with reasons + deferred list).

**Top risks**:
1. CRITICAL: next-auth/@auth/core unpatched (homoglyph email bypass GHSA-7rqj-j65f-68wh; fail-open auth object GHSA-8fpg-xm3f-6cx3; getToken DoS GHSA-xmf8-cvqr-rfgj).
2. HIGH: next deserialization/Image-Optimizer DoS (GHSA-h25m-26qc-wcjf, GHSA-9g9p-9gw9-jx7f).
3. HIGH: postcss arbitrary-file-read (build chain); fast-uri/brace-expansion/nanoid transitive DoS cluster.
4. MEDIUM: rate limiting on 8/176 API routes; CSP unsafe-inline/unsafe-eval.
5. MEDIUM/LOW: tracked debt #419/#420/#421 (all pre-existing, guard-held, decision-gated).

**Positive findings (verified, no action)**: Stripe webhook hardened (signature, idempotency, out-of-order guards, no-downgrade grandfathering); paywall enforced in SQL; auth re-resolves roles per request; free-first spend guard real; guard:secrets clean on 5,390 files; zero fabricated deps (handbook packages never installed).

**What was NOT done**: no source edits in Phase B (charter), no pushes, no dependency changes (audit-fix deferred to owner), no fixes to audit findings.

## FINAL STATE — overnight run complete

**Commits (local only, 4):**
1. `41801e6b` feat(cockpit): routing legibility card [overnight-T2]
2. `de4288d9` feat(eval): offline per-surface cost/quality report [overnight-T3]
3. `c5271d83` refactor(eval): A++ hardening [A++-hardening]
4. (next) docs(handoff): Phase A notes/summary + audit register/coverage + journal

**Gate summary**: full test suite green (exit 0); workspace lint green; tsc = exactly the 3 pre-existing #421 errors; T1/T2/T3 vitest 10+7+13 green; guards performance-claims/commercial-copy/secrets/trust/draft-only/control-plane all OK.

**For the human (morning checklist)**:
```bash
cd ~/Sports
cat handoff/OVERNIGHT_JOURNAL.md
sed -n '1,40p' handoff/AUDIT_FINDINGS.md
cat handoff/AUDIT_COVERAGE.md
git log --oneline origin/claude/fable-5-ultracode-plan-ptru4e..HEAD
npm run typecheck && npm run lint && npm test
git diff origin/claude/fable-5-ultracode-plan-ptru4e...HEAD | less
```
- Phase A clean + gates green → `git push -u origin claude/fable-5-ultracode-plan-ptru4e`.
- Bring AUDIT_FINDINGS.md to a strong session to triage Critical/High and plan the build (auth upgrade, next upgrade, rate-limit sweep, CSP, #419/#420/#421 decisions).
