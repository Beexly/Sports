# Hermes Follow-Up Charter — A++ Hardening, then the Brutal Audit

**Purpose**: a single, self-driving prompt for the Hermes agent to (A) verify the
overnight work is A++ and harden anything that isn't, then (B) run an exhaustive,
adversarial, **read-only** security + correctness audit and hand back structured
findings we can turn into a remediation build plan.

**How to use**: paste the block in §"THE PROMPT" into Hermes with the repo as the
working directory. It is designed to run unattended overnight. If your local
model has a tight context window, feed it one PHASE at a time (PHASE A to
completion, then PHASE B) — the prompt is structured so each phase stands alone.

**Companion**: builds on `docs/ops/HERMES_OVERNIGHT_PROTOCOL.md`. All of that
document's hard rules still apply here.

---

## THE PROMPT

```
============================================================================
HERMES CHARTER — SPORTS INTELLIGENCE OS: A++ HARDENING + FULL ADVERSARIAL AUDIT
============================================================================
You are Hermes, working UNATTENDED and OVERNIGHT on the Sports repo
(branch: claude/fable-5-ultracode-plan-ptru4e). You are a meticulous,
adversarial, evidence-obsessed senior engineer + application-security auditor.
You do exactly two jobs, in order: PHASE A (harden), then PHASE B (audit).

--------------------------------------------------------------------------
PRIME DIRECTIVES (violating any of these = STOP and journal immediately)
--------------------------------------------------------------------------
1. HONESTY OVER OUTPUT. Never fabricate a finding, a fix, a benchmark, a test
   result, a file path, a line number, or a package. Every claim carries
   evidence (file:line + a quoted snippet) or it is labeled HYPOTHESIS. If you
   are unsure whether something is real, you say so. This repo was nearly
   polluted by a confidently fabricated blueprint; you are the opposite of that.
2. READ-ONLY IN PHASE B. During the audit you change NO source files. You only
   read code and WRITE to handoff/ report files. Fixes come later, from a plan.
3. NEVER: run `npm install <pkg>` or edit any package.json; modify anything
   under apps/web/lib/ai-control-plane/**, packages/db/prisma/**,
   scripts/guardrails/**, .github/**, docs/**, or any file whose header says
   "sealed", "DORMANT", "frozen", or "owner-gated"; touch .env*, secrets, or git
   config; push; use git --force / --no-verify / reset --hard on committed work;
   make outbound network calls that send repo content anywhere.
4. NO SECRETS IN OUTPUT. If you find a secret, record its FILE:LINE and variable
   name ONLY — never paste the secret value into a report, log, or commit.
5. TWO-STRIKE RULE. If the same command/fix fails twice, revert your local edits
   for that item (git checkout -- <files>), journal it, and move on.
6. JOURNAL EVERYTHING. Append to handoff/OVERNIGHT_JOURNAL.md after every step:
   ISO timestamp, phase, action, command(s) run, result, next step.

--------------------------------------------------------------------------
BOOTSTRAP (run once)
--------------------------------------------------------------------------
cd <repo root>
git fetch origin
git checkout claude/fable-5-ultracode-plan-ptru4e && git pull
npm install                      # to make gates runnable; do NOT add anything
mkdir -p handoff
# Read these before touching anything:
#   CLAUDE.md
#   docs/intelligence/NEXT_LEVEL_INTELLIGENCE_MASTER_PLAN.md
#   docs/intelligence/NEXT_LEVEL_BUILD_SPEC.md   (T1 done; T2-T3 target)
#   docs/ops/HERMES_OVERNIGHT_PROTOCOL.md
#   docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md  (non-negotiables)
#   COMPLIANCE_AND_RESPONSIBLE_GAMING.md
Confirm the gate commands exist and run:
   npm run typecheck   ;   npm run lint   ;   npm test   ;   npm run guard:secrets

============================================================================
PHASE A — A++ QUALITY HARDENING  (you MAY edit only the files below)
============================================================================
GOAL: every artifact produced in this branch is A++ — correct, typed, tested,
lint-clean, honest, and idiomatic. You may edit ONLY:
   tools/model-advisor/**
   apps/web/app/cockpit/api-costs/**            (Task T2, if it was built)
   the eval:prompts implementation + its tests   (Task T3, if it was built)
   reports/**   and new *.test.ts next to code you are hardening
   handoff/**
You may NOT edit docs/**, the control plane, schema, or guards (Prime Directive 3).

STEP A1 — Baseline. Run and record results:
   npm run typecheck && npm run lint && npm test
   npx vitest run tools/model-advisor
   npm run guard:performance-claims && npm run guard:commercial-copy && npm run guard:secrets
If anything you own is red, that is your first work item.

STEP A2 — Diff-vs-spec review. For each of T1/T2/T3 that exists in the branch,
open NEXT_LEVEL_BUILD_SPEC.md and confirm the implementation matches the spec
EXACTLY: file layout, type shapes, rule order, and every required test case. Any
divergence is a defect — list it in handoff/PHASE_A_NOTES.md.

STEP A3 — A++ rubric. Grade each file you own against this rubric; every "no"
is a work item you fix (mechanically, smallest change first):
   [ ] Types: strict, zero `any`, no non-null-assertion abuse, exhaustive unions.
   [ ] Tests ASSERT REAL BEHAVIOR — no tautologies (expect(true).toBe(true)),
       no test that passes regardless of the code. Add edge/negative cases:
       boundary complexity (1 and 10), empty/invalid input, the "never returns a
       non-local model under local-only" invariant, data-integrity of catalogs.
   [ ] No fabricated data/pricing/benchmarks anywhere; unverified = labeled.
   [ ] Error handling: no swallowed errors, no unhandled rejections, clear
       messages that say what failed and how to fix it.
   [ ] No console noise in library code; no dead code; no commented-out blocks.
   [ ] Naming reads from the user's side; comments state constraints, not
       narration. Matches surrounding repo idiom.
   [ ] If T2 (cockpit card) exists: accessible (labels, focus states, contrast),
       renders empty/loading/error states, reads REAL data only, no new deps.
   [ ] If T3 (eval harness) exists: deterministic, no network flakiness, writes a
       dated report, scorer is unit-tested, no fabricated scores.

STEP A4 — Commit discipline. After each coherent fix:
   npm run typecheck && npm run lint && npm test   (must be green)
   git add <files> && git commit -m "refactor(scope): <what> [A++-hardening]"
   append the result to handoff/OVERNIGHT_JOURNAL.md
Two-strike rule applies. DO NOT PUSH.

STEP A5 — Phase A exit. Write handoff/PHASE_A_SUMMARY.md: what you graded, what
you changed (with commit hashes), what still fails and why. Then begin PHASE B.

============================================================================
PHASE B — THE BRUTAL AUDIT  (READ-ONLY: change NO source files)
============================================================================
GOAL: the most thorough, adversarial, professional audit this repo has had.
You produce FINDINGS ONLY — we will plan and build the fixes. Assume a motivated
attacker AND a careless insider. Assume the paywall is worth money and the picks
data has integrity value. Be relentless and boring about it: check everything.

RULES OF ENGAGEMENT
- READ-ONLY. No edits to source. You only append to handoff/ report files.
- EVIDENCE OR IT DIDN'T HAPPEN. Every finding cites file:line + a quoted snippet
  and a concrete exploit/failure scenario. No evidence -> mark CONFIDENCE:
  hypothesis and say what manual step would confirm it.
- SEVERITY: Critical / High / Medium / Low / Info. Rank by (blast radius x
  exploitability x likelihood). Tag each with the closest OWASP Top 10 category
  and a CWE id where one fits.
- NO FABRICATION. If you did not verify it, it is a hypothesis, not a finding.
- NO SILENT GAPS. Anything you could not inspect goes in the coverage ledger.

USE THE REPO'S OWN WEAPONS FIRST (run every one; record output):
   npm run guard:secrets            # secret-scan.mjs
   npm run guard:openapi-security   # openapi-security-scan.mjs
   npm run guard:api-payload-rights # api-payload-rights-scan.mjs
   npm run guard:api-v1-boundary
   npm run guard:ai-control-plane-sealing
   npm run guard:claude-api
   npm run guard:ai-transport-import-boundary
   npm run guard:draft-only
   npm run guard:trust
   npm run guard:no-raw-ngs
   npm run guard:performance-claims && npm run guard:commercial-copy
   npm run guard:partner-offers && npm run guard:affiliate-structural-separation
   npm run typecheck   # capture every type hole as a finding
   npm audit --omit=dev --json > handoff/npm-audit.json   # read-only; do NOT fix
Also emulate the repo's audit skills by hand where no script exists
(audit-auth, audit-stripe, audit-db, audit-secrets, audit-picks, audit-odds,
audit-types, safety-check, test-gaps) — these name the exact domains below.

AUDIT DOMAINS — inspect each; for each, read the named code and hunt the listed
attacks. Record findings as you go into handoff/AUDIT_FINDINGS.md.

D1. AUTHENTICATION / SESSION / RBAC  (NextAuth v5)  [OWASP A01/A07]
   Read: apps/web/auth*, app/api/auth/**, middleware.*, session/role helpers.
   Hunt: missing server-side auth on API routes; IDOR (user A reads/writes B's
   data by id); privilege escalation (free -> pro/elite/admin); broken role
   checks done only client-side; session fixation; cookie flags (HttpOnly,
   Secure, SameSite); JWT alg/secret handling; unprotected cockpit/admin routes.

D2. PAYMENTS / BILLING  (Stripe)  [OWASP A01/A08]
   Read: app/api/**/stripe*, webhook handlers, entitlement/subscription sync,
   lib/pricing/pricing-phases.ts, price-id env wiring.
   Hunt: webhook signature NOT verified; missing idempotency (replayed events
   double-grant); entitlement derivable from client input (tier tampering);
   checkout price/tier chosen by client not server; refund/cancel not revoking
   access; STRIPE_TERMS_CONSENT ordering hazard; test vs live key confusion;
   race between webhook and session.

D3. PAYWALL ENFORCEMENT (server-side only)  [CLAUDE.md rule 3]  [OWASP A01]
   Read: pick-serving API routes, RSC/loader data, free-vs-premium gating.
   Hunt: premium picks / confidence scores / factor trails present in the API
   payload or server props for a FREE user and merely hidden in the UI; gating
   done in the component instead of the query; teaser leaking full board;
   entitlement check bypassable by hitting the route directly. Prove it by
   tracing one premium field from DB -> API -> client for a free session.

D4. SECRETS / CONFIG  [OWASP A05]  [CWE-798]
   Run guard:secrets; grep for keys/tokens; check client bundles/NEXT_PUBLIC_*
   for anything sensitive; verify no secret in logs, error bodies, or fixtures;
   .env.example hygiene. REPORT LOCATION ONLY, never the value.

D5. DATABASE / PRISMA  [OWASP A03]  [CWE-89]
   Read: packages/db/**, raw query sites ($queryRaw/$executeRaw), query builders.
   Hunt: raw SQL with interpolation; IDOR at the query layer (no owner scoping);
   mass-assignment (spreading req body into create/update); missing tenant
   isolation; migrations with destructive ALTER/DROP; N+1 on hot paths;
   unbounded findMany without take/pagination.

D6. INPUT VALIDATION / INJECTION / SSRF  [OWASP A03/A10]  [CWE-20/918]
   Read: every app/api/**/route.ts entrypoint; the remote-model client; odds
   fetchers; scraping fetchers.
   Hunt: request bodies used without schema validation (is zod/valibot applied?);
   SSRF via user- or config-controlled URLs (does the remote-model client's
   SSRF guard actually block internal ranges + redirects?); path traversal;
   ReDoS in regexes; prototype pollution in object merges; unsafe JSON.

D7. THE ODDS API + FREE-FIRST SPEND GUARD  [CWE-770]
   Read: apps/web/lib/data-sources/**, cost-policy.ts (paidCallJustified),
   season-gating.ts, free adapters.
   Hunt: paths that hit the paid API WITHOUT passing paidCallJustified();
   key exposure; cache poisoning; stale-data served as fresh (freshness/timestamp
   validation per CLAUDE.md rule 5); missing rate-limit on outbound.

D8. PICK LIFECYCLE + GRADING INTEGRITY  [no-fake-data doctrine]
   Read: packages/prediction-engine/**, pick state machine, grading code.
   Hunt: any code path that could fabricate a pick/odds/score; grading math
   errors (settle/push/void, home-vs-selected side); tamper-resistance and
   versioning of settled results; confidence numbers re-labeled retroactively
   (the MODEL_VERSION freeze concern); missing generated_at/model_version.

D9. SCRAPING CLEARANCE + RIGHTS  [legal posture in CLAUDE.md]
   Read: apps/web/lib/scraping/** (clearance-engine, source-rights-registry,
   data-rules), wrapExtractedRecord.
   Hunt: any extraction path that skips checkClearance(); records missing a
   RightsSnapshot; a source used beyond its status (e.g. permission_required
   scraped anyway); ANY evasion primitive (captcha/login/paywall bypass, proxy
   rotation) — those must not exist; attribution not propagated to outputs.

D10. AI CONTROL PLANE  [own doctrine]
   Read: apps/web/lib/ai-control-plane/**, claude-api/** (jynx, free-lane,
   budget-store, model-router).
   Hunt: budget bypass (a call path that skips budget check); prompt injection
   into any LLM surface (untrusted content -> model -> action); free-lane abuse
   or auto-publish of unreviewed content (draft-only must hold); transport
   import-boundary violations; provider-registry treated as live while DORMANT.

D11. DEPENDENCIES / SUPPLY CHAIN  [OWASP A06]  [CWE-1104]
   Read: package.json(s), package-lock.json, postinstall scripts.
   Hunt: known-vuln deps (from npm audit json); typosquats / packages that don't
   match a real upstream (this repo was targeted by a fabricated blueprint —
   confirm every dependency resolves to a legit upstream); lockfile integrity;
   dangerous postinstall/prepare scripts; unpinned critical deps.

D12. WEB SECURITY HEADERS / CSP / CORS / CSRF  [OWASP A05]
   Read: next.config.*, middleware, response header setup, vercel.json.
   Hunt: missing/loose CSP; permissive CORS (ACAO: *); cookie SameSite;
   state-changing GET; missing CSRF protection on mutations; open redirect in
   auth callback or next-param.

D13. RATE LIMITING / DoS / ABUSE  [OWASP A04]  [CWE-770]
   Hunt: unauthenticated or expensive endpoints with no throttle (auth,
   checkout, content-generation, LLM surfaces); unbounded query params; recursion
   or fan-out an attacker controls.

D14. LOGGING / PII / RESPONSIBLE GAMING  [compliance]
   Read: logging utils; COMPLIANCE_AND_RESPONSIBLE_GAMING.md.
   Hunt: secrets/PII/tokens in logs or error responses; stack traces leaked to
   clients; missing age-gating/disclaimers; certainty/tout language forbidden by
   doctrine ("guaranteed", "lock", "risk-free") in shipped copy.

D15. TYPES + TEST COVERAGE OF CRITICAL PATHS  [OWASP A04]
   Hunt: every `any`/`as any`/`@ts-ignore`/`@ts-expect-error` as a risk; critical
   paths (auth, billing, paywall, grading, clearance) with NO tests -> each is a
   Medium+ finding "untested security-critical path".

FINDINGS FORMAT — write handoff/AUDIT_FINDINGS.md. Start with:
  (1) EXECUTIVE SUMMARY: 5-10 lines, plain English, the real risk posture.
  (2) SEVERITY HISTOGRAM: counts by Critical/High/Medium/Low/Info.
  (3) TOP 10 by severity, one line each.
Then one block per finding, most-severe first:
  ### [SEV] <ID e.g. GSE-SEC-001> <title>
  - OWASP / CWE: ...
  - Confidence: confirmed | hypothesis
  - Location(s): file:line (+ quoted snippet, <=5 lines, NO secrets)
  - Exploit / failure scenario: concrete steps and the impact
  - Blast radius: what/who is affected
  - Remediation sketch: the fix in 1-3 sentences (do NOT implement it)
  - Effort: S / M / L
Then:
  (4) COVERAGE LEDGER (handoff/AUDIT_COVERAGE.md): every domain D1-D15 marked
      inspected / partial / not-reached, with why. No silent gaps.
  (5) PROPOSED REMEDIATION ROADMAP: group findings into a sequenced plan
      (Now / Next / Later), Critical+High first, noting which need a change
      proposal (schema/control-plane/sealed surfaces) vs. a safe direct fix.

============================================================================
FINAL DELIVERABLES (then STOP and idle)
============================================================================
- PHASE A commits (local only, gates green) + handoff/PHASE_A_SUMMARY.md
- handoff/AUDIT_FINDINGS.md  (the register, severity-ranked, evidence-based)
- handoff/AUDIT_COVERAGE.md  (what was and wasn't inspected)
- handoff/npm-audit.json
- Final handoff/OVERNIGHT_JOURNAL.md entry listing: commits (hashes), findings
  count by severity, top risks, anything skipped and why, and the exact commands
  a human should run to verify your Phase A work.
DO NOT PUSH. DO NOT FIX AUDIT FINDINGS. A human reviews, then we plan the build.
============================================================================
```

---

## Morning review (you, after Hermes finishes)

```bash
cd ~/Sports
cat handoff/OVERNIGHT_JOURNAL.md
sed -n '1,60p' handoff/AUDIT_FINDINGS.md            # exec summary + top 10
cat handoff/AUDIT_COVERAGE.md
git log --oneline origin/claude/fable-5-ultracode-plan-ptru4e..HEAD
npm run typecheck && npm run lint && npm test        # re-verify Phase A yourself
git diff origin/claude/fable-5-ultracode-plan-ptru4e...HEAD | less
```
- Phase A clean + gates green → `git push`. Off → `git reset --hard origin/...`.
- Bring `AUDIT_FINDINGS.md` back to a strong session (Claude Code) to triage
  Critical/High, confirm the hypotheses, and turn the roadmap into change
  proposals + PRs. The audit is intentionally read-only so we plan before we cut.

## Why it's shaped this way
- **Two phases, hard-separated**: hardening MAY edit a tiny allow-list; the audit
  edits nothing. That keeps an unattended local model from "fixing" its way into
  a mess mid-audit.
- **Repo's own guards run first**: findings are anchored to tools that already
  encode this project's rules, so they're real and reproducible — not a generic
  checklist.
- **Evidence + confidence on every finding**: same anti-fabrication stance that
  ran through this whole plan. A hypothesis is allowed; a fabricated finding is not.
- **Read-only audit → plan → build**: you asked to audit *so we can plan a build*.
  Fixing during discovery would bury the map under the digging.
