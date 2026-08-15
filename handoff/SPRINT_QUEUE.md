# SPRINT QUEUE
Read `handoff/SPRINT_BOOT.md` first. Work top to bottom. Never skip ahead.
Update STATUS in this file as you go: `TODO` -> `DOING` -> `DONE` | `BLOCKED`.

**Legend:** `STATUS` · `STRIKES` (0/1/2 — at 2 the task is BLOCKED, move on)

**PRIORITY OVERRIDE (2026-08-15, Opus review) — read this before picking the next TODO.**
1. **CORRECTED 2026-08-15 — there is NOT a second competing agent.** An earlier note here claimed
   two uncoordinated agents were committing, inferred from the git author split ("Codex" vs
   "Claude"). That was WRONG and is retracted. `git config user.name` in this repo is literally
   `Codex <codex@openai.local>`, so EVERY commit made from this machine is stamped "Codex"
   regardless of which model or human authored it. The "Claude"-authored commits are from a
   different session on 2026-08-14. The duplicated P5-01 had a mundane cause: the watchdog was
   accidentally killed mid-task and relaunched, so the task was redone.
   **Keep the underlying habit anyway** — before starting a task, re-read its STATUS from the file
   rather than trusting memory, since the watchdog can restart between sessions. But do not go
   hunting for a phantom rival agent.
   *This retraction is itself the lesson: an inferred-but-unverified claim, stated confidently,
   propagated into the rulebook. Verify before you write something down as fact.*
2. **Fixed by Opus review, already committed — do NOT redo:** commit `11151694` (an unattended
   agent's own work) broke live odds/scores ingestion (moved API-key auth from a required query
   param to a header the vendor ignores — confirmed via a live probe, `401 MISSING_KEY`) and broke
   pick settlement (wrongly season-gated a backward-looking, free, must-never-drift path). Both
   reverted and committed (`ffe976b1`, `0044c0f4`). Never pushed, so production was never at risk.
   **Lesson for every future task: verify a vendor's actual auth mechanism before changing it, and
   never assume a code comment citing a GitHub repo is the right vendor without checking.**
3. **Skip to `P7-01` next if you are choosing what to work on** — it rescues P4-05's genuinely
   stranded security fix, and the linear top-to-bottom rule has kept it buried behind unrelated
   TODOs for a full day. Everything between here and P7-01 remains valid; this is a priority
   nudge, not a scope change.

---

# PHASE 0 — FINISH THE HERMES CONFIG
*Small, mechanical, high-confidence. Do these first to build momentum and prove the loop works.*
*Full detail lives in `C:\Users\Garrett\AppData\Local\hermes\HANDOFF_LAGUNA.md` — read it once now.*

### P0-01 — Test whether `model.aliases` is dead config · STATUS: BLOCKED · STRIKES: 0
NOTE: alias resolves — `claude-max` -> DirectAlias(model='claude-fable-5', provider='anthropic').
`model.aliases` IS live (read by model_switch.py:416-438). Two competing alias systems; needs human.
Run `/model claude-max`.
- Errors / unknown alias -> the nested `model.aliases:` block is DEAD. Delete the entire `aliases:`
  sub-block under `model:` in `C:\Users\Garrett\AppData\Local\hermes\config.yaml`.
  Keep `default`, `provider`, `base_url`.
- Works -> block is LIVE. Do NOT delete. Mark BLOCKED with note "two live alias systems, needs human".
**VERIFY:** `python -c "import yaml;d=yaml.safe_load(open(r'C:\Users\Garrett\AppData\Local\hermes\config.yaml',encoding='utf-8'));print('aliases' in d['model'])"` prints `False`.

### P0-02 — Repoint unusable local aliases · STATUS: DONE · STRIKES: 0
In `model_aliases:` — these point at models this hardware cannot run (CPU-only Iris Xe, ~2 tok/s):
| Alias | Action |
|---|---|
| `agent` | repoint to nous / `poolside/laguna-s-2.1:free` (hermes3:8b CANNOT LOAD) |
| `coder` | repoint to nous / `poolside/laguna-s-2.1:free` (30b unusable) |
| `smart` | repoint to nous / `tencent/hy3:free` |
| `muse`, `eyes` | DELETE these aliases |
| `fast`, `local`, `grok`, `think`, `solar` | KEEP unchanged |

Shape to copy exactly:
```yaml
  agent:
    base_url: https://inference-api.nousresearch.com/v1
    model: poolside/laguna-s-2.1:free
    provider: nous
```
**VERIFY:** YAML parses; `/model agent` then `hi` replies in under ~10s.

### P0-03 — Re-pin the two cron jobs · STATUS: DONE · STRIKES: 0
Inside a Hermes session (this is the cronjob TOOL, not a shell command):
```
cronjob action=update job_id=2df32f4c60b0 provider=nous model=poolside/laguna-s-2.1:free
cronjob action=update job_id=783da73d7b5b provider=nous model=poolside/laguna-s-2.1:free
```
**VERIFY:** `hermes cron list` shows no snapshot-mismatch warning.
**NOTE:** `daily-sms-status` also has a Photon sidecar 500 delivery error. Do NOT fix it. Record it.

### P0-04 — Purge dead / dying model IDs · STATUS: DONE · STRIKES: 0

Search `config.yaml` for: `deepseek-chat`, `deepseek-reasoner` (retired 2026-07-24),
`llama-3.3-70b-versatile`, `llama-3.1-8b-instant` (Groq retires 2026-08-16),
`zai-glm-4.7` (Cerebras deprecates 2026-08-17).
**VERIFY:** `Select-String -Path "C:\Users\Garrett\AppData\Local\hermes\config.yaml" -Pattern "deepseek-chat|deepseek-reasoner|llama-3.3-70b-versatile|llama-3.1-8b-instant|zai-glm-4.7"` returns nothing.

### P0-05 — Start the gateway · STATUS: DONE · STRIKES: 0
`hermes gateway install`
**VERIFY:** `hermes cron status` shows the gateway running.

### P0-06 — OPTIONAL: measure the REAL local token rate · STATUS: DONE · STRIKES: 0
Only attempt if P0-01..05 are all DONE. **20-minute timebox. This is a MEASUREMENT, not a migration.**

**DO NOT INSTALL IPEX-LLM OR ollama-for-intel-gpu.** Both were evaluated and rejected 2026-08-14:
- `intel/ipex-llm` is ARCHIVED (Intel: "will not provide or guarantee development of or support",
  "known security issues"), and its portable zip runs **Ollama v0.6.2** — which predates Qwen3
  support (v0.6.7). `qwen3.5:4b`, `qwen3-coder:30b`, `qwen3-vl:4b`, `muse-glimmer:30b` WOULD NOT LOAD.
- `0deep/ollama-for-intel-gpu` is ARCHIVED, has **zero Windows binaries** in all 9 releases, needs a
  system-wide oneAPI toolkit to build, and REMOVES the Vulkan backend that currently works.

**Step 1 — get an honest baseline.** The earlier "2.3 tok/s" figure was derived from wall-clock on a
2-token reply, which is dominated by model load and prompt eval, not generation. It is unsound.
```
ollama run qwen3.5:4b --verbose "Write one paragraph about the weather."
```
Read the **`eval rate`** line. THAT is the real generation speed. Record it in the journal.

**Step 2 — only if step 1 looks genuinely slow (<5 tok/s eval rate):** llama.cpp publishes an
official, actively-maintained Windows SYCL build (unlike both archived projects above). Download the
current `llama-*-bin-win-sycl-x64.zip` from https://github.com/ggml-org/llama.cpp/releases, extract
to a SCRATCH folder, and run `llama-bench.exe` against a GGUF already in
`C:\Users\Garrett\.ollama\models\blobs`. Compare against step 1.
**Then DELETE the folder either way.** Do not migrate. Do not touch the working Ollama install.

**REALITY CHECK — do not chase a gap that may not exist.** A 4B Q4_K_M model reads ~2.5 GB of weights
per token. The i7-1255U achieves roughly 35-50 GB/s memory bandwidth, shared with the iGPU and OS.
That puts the arithmetic ceiling near 14-20 tok/s, so the "12-18 tok/s" figure circulating online
(sourced from an SEO content site, not an Intel benchmark) is not credible for sustained work on a
15W part. llama.cpp also ships a `win-vulkan` build — roughly what Ollama already uses. **If SYCL
does not beat Vulkan on the bench, the gap was never real.**

**VERIFY:** journal contains a real `eval rate` number from step 1.
**ABORT IF:** anything requires a system-wide install, driver change, or bootloader edit. Mark
BLOCKED and move on. Local inference is a nice-to-have; Nous and Grok carry the real work.

---

# PHASE 1 — GSE A++ HARDENING
*You MAY edit code here, but ONLY inside the allow-list below.*
*Read `docs/ops/HERMES_OVERNIGHT_PROTOCOL.md` and `docs/intelligence/NEXT_LEVEL_BUILD_SPEC.md` first.*

**ALLOW-LIST — the only files you may edit in Phase 1:**
```
tools/model-advisor/**
apps/web/app/cockpit/api-costs/**          (only if it exists)
the eval:prompts implementation + its tests (only if it exists)
reports/**
new *.test.ts files next to code you are hardening
handoff/**
```
Everything else is read-only. See §NEVER in SPRINT_BOOT.md.

### P1-01 — Baseline · STATUS: DONE · STRIKES: 0
```
npm install
npm run typecheck && npm run lint && npm test
npx vitest run tools/model-advisor
npm run guard:secrets && npm run guard:performance-claims && npm run guard:commercial-copy
```
Record every result verbatim in the journal. Anything red that is inside the allow-list becomes a
task you append to this queue as `P1-EXTRA-nn`.
**VERIFY:** all command outputs captured in `SPRINT_JOURNAL.md`.

### P1-02 — Diff vs spec · STATUS: DONE · STRIKES: 0
Open `docs/intelligence/NEXT_LEVEL_BUILD_SPEC.md`. For each of T1/T2/T3 present in the branch,
confirm the implementation matches the spec EXACTLY: file layout, type shapes, rule order, required
test cases. Every divergence is a defect -> list in `handoff/PHASE1_NOTES.md`.
**VERIFY:** `handoff/PHASE1_NOTES.md` exists with one entry per divergence, or states "no divergences".

### P1-03 — A++ rubric pass · STATUS: DONE · STRIKES: 1
Grade every file you own against this. Each "no" becomes a fix (smallest change first):
- [ ] Types strict: zero `any`, no non-null-assertion abuse, exhaustive unions
- [ ] Tests assert REAL behavior — no `expect(true).toBe(true)`, no test that passes regardless of
      the code. Add boundary cases (complexity 1 and 10), empty/invalid input, and the
      "never returns a non-local model under local-only" invariant
- [ ] No fabricated data, pricing, or benchmarks anywhere; unverified values labeled as such
- [ ] No swallowed errors, no unhandled rejections; messages say what failed and how to fix it
- [ ] No console noise in library code, no dead code, no commented-out blocks
- [ ] Naming reads from the user's side; comments state constraints, not narration
**VERIFY:** `npm run typecheck && npm run lint && npm test` green; commit per §COMMIT DISCIPLINE.

### P1-04 — Phase 1 exit · STATUS: DONE · STRIKES: 0
Write `handoff/PHASE1_SUMMARY.md`: what you graded, what you changed (with commit hashes), what
still fails and why.
**VERIFY:** file exists; every commit hash in it resolves via `git show <hash> --stat`.

---

# PHASE 2 — THE ADVERSARIAL AUDIT (READ-ONLY)
*Change NO source files. You may only append to `handoff/`.*
*Assume a motivated attacker AND a careless insider. The paywall is worth money; the picks data has
integrity value. Be relentless and boring: check everything.*

**Evidence or it did not happen.** Every finding cites `file:line` + a quoted snippet (max 5 lines,
never a secret) and a concrete exploit/failure scenario. No evidence -> `CONFIDENCE: hypothesis`
plus the manual step that would confirm it.
**Severity:** Critical / High / Medium / Low / Info, ranked by blast radius x exploitability x
likelihood. Tag with the nearest OWASP Top 10 category and a CWE id where one fits.

### P2-01 — Run the repo's own guards · STATUS: DONE · STRIKES: 0
Run every one, record output verbatim:
```
npm run guard:secrets
npm run guard:openapi-security
npm run guard:api-payload-rights
npm run guard:api-v1-boundary
npm run guard:ai-control-plane-sealing
npm run guard:claude-api
npm run guard:ai-transport-import-boundary
npm run guard:draft-only
npm run guard:trust
npm run guard:no-raw-ngs
npm run guard:performance-claims
npm run guard:commercial-copy
npm run guard:partner-offers
npm run guard:affiliate-structural-separation
npm run typecheck
npm audit --omit=dev --json > handoff/npm-audit.json
```
If a guard script does not exist, note it and continue — do not create it.
**VERIFY:** `handoff/npm-audit.json` exists; all guard outputs in the journal.

### P2-02 — D1 Auth / session / RBAC · STATUS: DONE · STRIKES: 0
Read `apps/web/auth*`, `app/api/auth/**`, `middleware.*`, session/role helpers.
Hunt: missing server-side auth on API routes; IDOR (user A reads/writes B's data by id); privilege
escalation free->pro/elite/admin; role checks done only client-side; session fixation; cookie flags
(HttpOnly, Secure, SameSite); JWT alg/secret handling; unprotected cockpit/admin routes.
**VERIFY:** findings appended to `handoff/AUDIT_FINDINGS.md`, or an explicit "no findings" entry.

### P2-03 — D2 Payments / billing (Stripe) · STATUS: DONE · STRIKES: 0
Read `app/api/**/stripe*`, webhook handlers, entitlement/subscription sync,
`lib/pricing/pricing-phases.ts`, price-id env wiring.
Hunt: webhook signature not verified; missing idempotency (replayed events double-grant);
entitlement derivable from client input; checkout price/tier chosen by client not server;
refund/cancel not revoking access; test-vs-live key confusion; webhook/session race.
**VERIFY:** as P2-02.

### P2-04 — D3 Paywall enforcement · STATUS: DONE · STRIKES: 0
Read pick-serving API routes, RSC/loader data, free-vs-premium gating.
Hunt: premium picks / confidence scores / factor trails present in the API payload or server props
for a FREE user and merely hidden in the UI; gating in the component instead of the query; teaser
leaking the full board; entitlement check bypassable by hitting the route directly.
**Prove it** by tracing ONE premium field from DB -> API -> client for a free session.
**VERIFY:** the trace is written out step by step with file:line at each hop.

### P2-05 — D4 Secrets / config · STATUS: DONE · STRIKES: 0
Hunt: keys/tokens in source; anything sensitive in `NEXT_PUBLIC_*` or client bundles; secrets in
logs, error bodies, or fixtures; `.env.example` hygiene.
**REPORT LOCATION ONLY — never the value.**
**VERIFY:** as P2-02.

### P2-06 — D5 Database / Prisma · STATUS: DONE · STRIKES: 0
Read `packages/db/**`, `$queryRaw`/`$executeRaw` sites, query builders.
Hunt: raw SQL with interpolation; IDOR at the query layer (no owner scoping); mass-assignment
(spreading req body into create/update); missing tenant isolation; destructive migrations;
N+1 on hot paths; unbounded `findMany` without take/pagination.
**VERIFY:** as P2-02.

### P2-07 — D6 Input validation / injection / SSRF · STATUS: DONE · STRIKES: 0
Read every `app/api/**/route.ts` entrypoint, the remote-model client, odds fetchers, scrapers.
Hunt: request bodies used without schema validation; SSRF via user- or config-controlled URLs
(does the SSRF guard block internal ranges AND redirects?); path traversal; ReDoS; prototype
pollution in object merges; unsafe JSON.
**VERIFY:** as P2-02.

### P2-08 — D7 Odds API + spend guard · STATUS: DONE · STRIKES: 0
Read `apps/web/lib/data-sources/**`, `cost-policy.ts` (`paidCallJustified`), `season-gating.ts`.
Hunt: paths hitting the paid API WITHOUT `paidCallJustified()`; key exposure; cache poisoning;
stale data served as fresh; missing outbound rate limit.
**VERIFY:** as P2-02.

### P2-09 — D8 Pick lifecycle + grading integrity · STATUS: DONE · STRIKES: 0
Read `packages/prediction-engine/**`, pick state machine, grading code.
Hunt: any path that could fabricate a pick/odds/score; grading math errors (settle/push/void,
home-vs-selected side); tamper-resistance of settled results; confidence numbers relabeled
retroactively; missing `generated_at` / `model_version`.
**VERIFY:** as P2-02.

### P2-10 — D9 Scraping clearance + rights · STATUS: DONE · STRIKES: 0
Read `apps/web/lib/scraping/**` (clearance-engine, source-rights-registry, data-rules),
`wrapExtractedRecord`.
Hunt: extraction paths that skip `checkClearance()`; records missing a RightsSnapshot; a source used
beyond its status; **ANY evasion primitive** (captcha/login/paywall bypass, proxy rotation) — those
must not exist, and finding one is a Critical; attribution not propagated to outputs.
**VERIFY:** as P2-02.

### P2-11 — D10 AI control plane · STATUS: DONE · STRIKES: 0
Read `apps/web/lib/ai-control-plane/**`, `claude-api/**` (jynx, free-lane, budget-store,
model-router). READ ONLY — this is a sealed surface.
Hunt: budget bypass (a call path skipping the budget check); prompt injection into any LLM surface
(untrusted content -> model -> action); free-lane abuse or auto-publish of unreviewed content
(draft-only must hold); transport import-boundary violations; provider-registry treated as live
while DORMANT.
**VERIFY:** as P2-02.

### P2-12 — D11 Dependencies / supply chain · STATUS: DONE · STRIKES: 0
Read `package.json`(s), `package-lock.json`, postinstall scripts, plus `handoff/npm-audit.json`.
Hunt: known-vuln deps; **typosquats or packages that do not resolve to a real upstream** — this repo
was targeted by a fabricated blueprint, so confirm every dependency exists; lockfile integrity;
dangerous postinstall/prepare scripts; unpinned critical deps.
**VERIFY:** as P2-02.

### P2-13 — D12 Headers / CSP / CORS / CSRF · STATUS: DONE · STRIKES: 0
Read `next.config.*`, middleware, response header setup, `vercel.json`.
Hunt: missing or loose CSP; permissive CORS (`ACAO: *`); cookie SameSite; state-changing GET;
missing CSRF protection on mutations; open redirect in auth callback or `next` param.
**VERIFY:** as P2-02.

### P2-14 — D13 Rate limiting / DoS · STATUS: DONE · STRIKES: 0
Hunt: unauthenticated or expensive endpoints with no throttle (auth, checkout, content-generation,
LLM surfaces); unbounded query params; attacker-controlled recursion or fan-out.
NOTE: this branch already added rate limiting to several v1 routes — verify coverage is complete
rather than assuming it is.
**VERIFY:** as P2-02.

### P2-15 — D14 Logging / PII / responsible gaming · STATUS: DONE · STRIKES: 0
Read logging utils and `COMPLIANCE_AND_RESPONSIBLE_GAMING.md`.
Hunt: secrets/PII/tokens in logs or error responses; stack traces leaked to clients; missing
age-gating or disclaimers; certainty/tout language forbidden by doctrine ("guaranteed", "lock",
"risk-free") in shipped copy.
**VERIFY:** as P2-02.

### P2-16 — D15 Types + test coverage of critical paths · STATUS: DONE · STRIKES: 0
Hunt: every `any` / `as any` / `@ts-ignore` / `@ts-expect-error` as a risk. Any critical path
(auth, billing, paywall, grading, clearance) with NO tests is a Medium+ finding:
"untested security-critical path".
**VERIFY:** as P2-02.

### P2-17 — Assemble the audit register · STATUS: DONE · STRIKES: 0
Finalize `handoff/AUDIT_FINDINGS.md` with, in this order:
1. EXECUTIVE SUMMARY (5-10 lines, plain English, the real risk posture)
2. SEVERITY HISTOGRAM (counts by Critical/High/Medium/Low/Info)
3. TOP 10 by severity, one line each
4. One block per finding, most severe first:
```
### [SEV] GSE-SEC-001 <title>
- OWASP / CWE:
- Confidence: confirmed | hypothesis
- Location(s): file:line  (+ quoted snippet, <=5 lines, NO secrets)
- Exploit / failure scenario:
- Blast radius:
- Remediation sketch (1-3 sentences, DO NOT IMPLEMENT):
- Effort: S / M / L
```
Then write `handoff/AUDIT_COVERAGE.md`: every domain D1-D15 marked inspected / partial /
not-reached, with why. **No silent gaps.**
**VERIFY:** both files exist; histogram counts equal the number of finding blocks.

---

# PHASE 3 — REMEDIATION PLAN (PLANNING ONLY — DO NOT FIX)

### P3-01 — Sequenced roadmap · STATUS: DONE · STRIKES: 0
Write `handoff/REMEDIATION_ROADMAP.md`. Group findings into **Now / Next / Later**, Critical+High
first. For each, note whether it needs a change proposal (schema / control-plane / sealed surface)
or is a safe direct fix. Estimate effort S/M/L.
**DO NOT IMPLEMENT ANY FIX.** A human reviews, then plans the build.
**VERIFY:** every Critical and High finding from `AUDIT_FINDINGS.md` appears in the roadmap.

### P3-02 — Final report · STATUS: DONE · STRIKES: 0
Write `handoff/SPRINT_FINAL.md` per §FINISH in `SPRINT_BOOT.md`.
**VERIFY:** file exists and lists commit hashes, blocked tasks, and finding counts.

---

## APPENDING WORK
If you finish everything and time remains, do NOT invent scope. Instead:
1. Re-run P1-01 baseline and confirm still green.
2. Deepen Phase 2 coverage on any domain marked `partial` in `AUDIT_COVERAGE.md`.
3. Convert `hypothesis` findings into `confirmed` or `refuted` by tracing the code.
That is the highest-value remaining work and it cannot break anything.

---

# PHASE 4 — REMEDIATION (SAFE-DIRECT FIXES FROM THE AUDIT)
*You MAY edit code here, but ONLY the exact files each task names. No broader refactor.*
*Source: `handoff/AUDIT_FINDINGS.md` + `handoff/REMEDIATION_ROADMAP.md` Now lane. Every task below*
*is a finding the roadmap itself already classified SAFE DIRECT (not needing a change proposal).*
*Do NOT touch GSE-SEC-059/060/003 (Next.js major bump) or GSE-SEC-061 (next-auth caret) — both are*
*owner-gated / change-proposal per the roadmap. Leave them alone.*

**COMMIT DISCIPLINE still applies:** `npm run typecheck && npm run lint` must be green for any file
you touch before committing that task's fix. If `npm test` overall is still red from pre-existing
failures outside this task's files, that does not block the commit — only regressions YOU caused do.
Never push.

### P4-01 — Fix GSE-SEC-025: paywall leaks PREMIUM selection/line publicly · STATUS: DONE · STRIKES: 0
  (started: 2026-08-15T00:00:00Z)
Files (only these): `apps/web/app/preview/[sport]/[slug]/page.tsx`, `apps/web/lib/board/state.ts`,
`apps/web/app/api/board/state/route.ts`, `apps/web/app/board/page.tsx`.
Evidence: the query/render path for these public surfaces has no tier filter — a FREE or anonymous
user (or a crawler) reading `/board` or a preview URL gets the paid `selection`/`line` fields.
Contrast with the CORRECT pattern already in the codebase: `apps/web/app/api/picks/route.ts:96` and
`app/dashboard/page.tsx:121` both gate on entitlement before returning these fields.
Fix: apply the same tier check (`canSeePremiumPicks` or equivalent) to `loadGameForSlug` /
`bestPublishedPick` and `loadBoardState`'s published-today query. When not entitled, omit
`selection`/`line` entirely rather than sending them and hiding them in the UI.
**VERIFY:** `npm run typecheck && npm run lint` clean for the 4 files. Manually trace: does the
board-state API response for an anonymous request now exclude `selection`/`line` on premium rows?

### P4-02 — Fix GSE-SEC-016: mutating cron accepts spoofable header as auth · STATUS: DONE · STRIKES: 0
Files (only these): `apps/web/lib/cron/authorize.ts`.
Evidence: `authorize.ts:26-32` and `:49-55` treat the `x-vercel-cron` header as sufficient auth when
`VERCEL=1`, with the file's own comment admitting "not a cryptographic proof of Vercel origin."
`CRON_REQUIRE_BEARER=true` exists but is opt-in; mutating routes like `cron/settle-picks/route.ts:42`
and `cron/refresh-odds/route.ts:56` default to dual-mode.
Fix: make bearer-only the default for any cron route that mutates data (do NOT change read-only
health-probe crons). The simplest safe change: flip the default so dual-mode requires an explicit
opt-in per route, rather than requiring every mutating route to opt out.
**VERIFY:** `npm run typecheck && npm run lint` clean. Confirm `cron/settle-picks` and
`cron/refresh-odds` now require a Bearer token even when `VERCEL=1` and `x-vercel-cron` is present.

### P4-03 — Fix GSE-SEC-039: paid-spend guard defined but never called · STATUS: DONE · STRIKES: 0
Files (only these): `packages/ingestion-pipeline/src/process-sport.ts`,
`packages/ingestion-pipeline/src/settle-sport.ts`.
Evidence: `paidCallJustified()` / `requiresPaidEscalation()` exist (`free-first-ingest.ts:138-140`,
`source-router.ts:428-430`) but have zero production callers — only tests call them. Live paid calls
happen unguarded at `process-sport.ts:219-221` (odds) and `settle-sport.ts:137` (scores); if
`THE_ODDS_API_KEY` is set, the free ESPN path is skipped entirely even when the guard would refuse.
Fix: call `paidCallJustified(need, sport)` before the paid fetch in both files; refuse (fall back to
free) when it returns false. Do not change the guard's own logic — only wire it into these two call
sites.
**VERIFY:** `npm run typecheck && npm run lint` clean. Confirm both files now import and call the
guard before `client.getOdds` / `client.getScores`.

### P4-04 — Fix GSE-SEC-043: refresh can overwrite a just-settled pick (race) · STATUS: DONE · STRIKES: 0
Files (only these): `packages/ingestion-pipeline/src/process-sport.ts`,
`packages/ingestion-pipeline/src/generate-signal-slate.ts`.
Evidence: both files do `findUnique` then an unbounded `upsert.update` (`process-sport.ts:658-727`,
`generate-signal-slate.ts:240-287`) — no `result: "PENDING"` scope, so a concurrent settle can commit
`WIN` and then this upsert overwrites `selection`/`line`/`confidence` on the now-settled row.
Contrast with the CORRECT pattern already in the codebase: `settle-sport.ts:375-377` and
`free-settlement-runner.ts:336-338` use `updateMany({ where: { id, result: "PENDING" } })`.
Fix: change both upsert `.update` calls to the same `updateMany` pattern scoped to
`result: "PENDING"`, matching the two files above exactly. Keep the `create` half of upsert as-is.
**VERIFY:** `npm run typecheck && npm run lint` clean. Confirm neither file can write pick-identity
fields onto a row where `result` is no longer `PENDING`.

### P4-05 — Fix GSE-SEC-049: PFR data ingested under the wrong license despite a dedicated block · STATUS: DONE · STRIKES: 0
Files (only these): `apps/web/lib/ingestion/pfr-adv-stats.ts`, `apps/web/lib/nflverse/pressure-coverage.ts`,
`apps/web/lib/intelligence/rushing-contact.ts`.
Evidence: `source-rights-registry.ts:150-163` marks `pfr-advstats-via-nflverse` as
`permission_required`, `automation_allowed: false`, `storage_allowed: false` — but all three files
gate on the generic `nflverseIngestionGate()` / `assertIngestible("nflverse")` instead, which never
checks the PFR-specific registry row.
Fix: in each of the three files, add a `checkClearance({source_id: "pfr-advstats-via-nflverse", ...})`
call before the fetch/persist, and block (do not fetch, do not store, do not render) until it passes.
Do not modify `source-rights-registry.ts` itself.
**VERIFY:** `npm run typecheck && npm run lint` clean. Confirm all three files now call
`checkClearance` with the PFR-specific source id before touching PFR data.

### P4-06 — Fix GSE-SEC-050: unregistered score sources fetched with no clearance check · STATUS: DONE · STRIKES: 0
Files (only these): `apps/web/lib/data-sources/source-router.ts`,
`apps/web/lib/data-sources/multi-source-scores.ts`, `apps/web/lib/data-sources/free-score-persist.ts`.
Evidence: `source-router.ts:238-246` marks `henrygd-ncaa` `cleared: false` in a comment, but
`multi-source-scores.ts:66-76,127-150` and `free-score-persist.ts:94-97,168` fetch it (and
mlb-statsapi/balldontlie/nhl-web-api) live anyway — the gate is on a candidate list at compile time,
never enforced at the actual fetch call.
Fix: in `multi-source-scores.ts` and `free-score-persist.ts`, add a runtime `checkClearance` (or
equivalent registry check) immediately before each of these secondary-source fetches; skip/refuse the
source if not cleared rather than treating the comment as sufficient. Do not remove the sources —
gate them.
**VERIFY:** `npm run typecheck && npm run lint` clean. Confirm each secondary-source fetch site now
has a runtime clearance check, not just a `cleared: false` comment.

### P4-07 — Fix GSE-SEC-051: ESPN scores stored despite storage_allowed=false · STATUS: DONE · STRIKES: 0
Files (only these): `apps/web/lib/data-sources/free-first-ingest.ts`,
`apps/web/lib/data-sources/free-score-persist.ts`.
Evidence: `source-rights-registry.ts:241-244` sets ESPN `storage_allowed: false`,
`commercial_display_allowed: false`. `free-adapters/espn-scores.ts:4-7` documents the constraint,
but `free-first-ingest.ts:75-101` never calls `checkClearance`, and `free-score-persist.ts:195-202`
writes ESPN-derived scores onto `Game` (`homeScore`/`awayScore`/`status`/`resultFetched`) anyway.
The integrity ledger (`platform/integrity-ledger.ts`) already records wiring `checkClearance()` into
every ingestion entrypoint as unfinished, planned work — this task is that work, scoped to these two
files.
Fix: add a `checkClearance` call with `mode: "storage"` (or the real intent being performed) in
`free-first-ingest.ts` before the ESPN fetch, and refuse the persist in `free-score-persist.ts` if
storage is not allowed for that source.
**VERIFY:** `npm run typecheck && npm run lint` clean. Confirm ESPN-sourced scores can no longer be
written to `Game` while `storage_allowed: false` holds for that source.

### P4-08 — Phase 4 exit · STATUS: DONE · STRIKES: 0
Write `handoff/PHASE4_SUMMARY.md`: which of P4-01..07 committed vs. blocked, with commit hashes for
each committed fix, and the exact `npm run typecheck && npm run lint` output for each.
**VERIFY:** file exists; every commit hash resolves via `git show <hash> --stat`.

---

# PHASE 5 — WAVE 2 (from a 12-agent codebase-wide sweep, 2026-08-15)
*You MAY edit code here, ONLY the exact files each task names.*

**CRITICAL PROCESS FIX — READ THIS FIRST.** Phase 4 committed 3 fixes with `typecheck`/`lint`
green that turned out to BREAK real tests (`pressure-coverage.test.ts`, `ingest-pfr-adv-stats.test.ts`,
`free-first-ingest.test.ts`) because the VERIFY steps never ran the test suite for the touched files
— only typecheck and lint. **Every task below requires you to actually RUN the relevant test file(s)
before marking DONE, not just typecheck/lint.** If a file has no existing test file, say so explicitly
in the journal rather than skipping the check silently.

**COMMIT DISCIPLINE (Phase 4's rule, unchanged):** `npm run typecheck && npm run lint` must be green
for any file you touch. Pre-existing `npm test` redness outside your task's files does NOT block a
commit — only a regression you caused does. Run the SPECIFIC test file(s) for what you touched to
check for that regression; you do not need the full suite. Never push.

**SECOND CRITICAL PROCESS FIX — READ THIS TOO (2026-08-15, human review).** Every task from
P5-01 through P5-08 ended its journal entry with "No git commit" as if that were a safety rule —
it is not. `git commit` is LOCAL and fully reversible; it is NOT `git push`. §NEVER forbids
pushing, force, and `--no-verify` — it does NOT forbid committing, and COMMIT DISCIPLINE above
REQUIRES it once VERIFY passes. Real, test-passing work from 3 different phases sat uncommitted
for hours because of this exact misreading, and 4 of those tasks' work was then destroyed by an
unrelated watchdog bug (also fixed now) specifically because it was never committed. **STEP 4 of
your instructions means: run `git add <the exact files this task named>` then
`git commit -m "<description>"` as part of marking a task DONE — DONE and uncommitted are not the
same thing.** If VERIFY passes, commit before you STOP. If you are ever unsure whether committing
is safe, it is — reverting a bad commit is one `git revert`, recovering unstaged work that got
reverted or lost is not.

**OUT OF SCOPE — do not create these as tasks, they are already handled or need the owner:**
- Verifying live Stripe price-IDs or Groq env vars in Vercel production — no repo access can check
  this; already flagged to the owner directly, not your job.
- Cherry-picking commit `538beac9` from branch `phase3-accuracy-proof` into main — a 131-commit
  branch merge decision, security-sensitive, owner review required. Do not touch other branches.
- Applying the Entity Graph Prisma migration (`20260813200000_add_entity_graph`) — additive-only
  and already reviewed, but a DB migration requires explicit owner approval before `db:migrate
  deploy`. Do not run it.
- Writing full narratives for GSE-SEC-016 through 075 into AUDIT_FINDINGS.md — the roadmap table
  (now committed, see P5-09) is the working record; do not attempt to fabricate evidence for
  findings you have not personally traced against source.
- `preserve/release-codex-2026-05` branch in the `Sports_release_codex` worktree — already created.
  Stay inside `C:\Users\Garrett\Sports`, never operate in another worktree.

### P5-01 — Guard STRIPE_SECRET_KEY at runtime · STATUS: DONE · STRIKES: 0
File (only this): `apps/web/lib/stripe.ts`.
Evidence: line 24 constructs `new Stripe(process.env["STRIPE_SECRET_KEY"]!, ...)` at module scope
with only a TypeScript `!` assertion — no runtime guard. A missing/blank key throws at import time
on both `/api/subscriptions/checkout` and the live `/api/webhooks/stripe` route, unlike the price-id
path a few lines below it, which fails closed with a typed 503.
Fix: replace the top-level construction with a guarded lazy singleton/factory that returns a typed
error instead of throwing at import time, matching the fail-closed pattern already used for price-id
resolution in the same file.
**VERIFY:** `npm run typecheck && npm run lint` clean. Temporarily unset `STRIPE_SECRET_KEY` locally
and confirm checkout/webhook routes return a handled error instead of crashing on import, then run
any existing test file covering `stripe.ts` if one exists.

### P5-02 — Wire em-dash-scan.mjs into the guardrails chain · STATUS: DONE · STRIKES: 0
**REOPENED 2026-08-15 (human review):** was marked DONE, but the watchdog's protected-path
tripwire reverted your `scripts/guardrails/run-all.mjs` edit (stale rule, now fixed — that file
is explicitly allowed for this task). Your `package.json` addition of `guard:em-dash` survived
and is still there uncommitted — do not redo that half, just redo the `run-all.mjs` GUARDS-array
wiring, then commit both files together as one task.
Files (only these): `scripts/guardrails/run-all.mjs`, `package.json`.
Evidence: `scripts/guardrails/em-dash-scan.mjs` exists and works standalone but is never invoked by
`run-all.mjs`'s GUARDS array or any `guard:*` package.json script — confirmed by reading both files
in full. This plausibly explains why `brand-safety-v2.test.ts` has been failing.
Fix: add the em-dash-scan invocation to the GUARDS array in `run-all.mjs` near the other brand/copy
guards, and add a matching `guard:em-dash` script to `package.json`.
**VERIFY:** `node scripts/guardrails/run-all.mjs --only=em-dash-scan` runs and reports PASS/FAIL.
Then run `npx vitest run __tests__/brand-safety-v2.test.ts` — if this task's fix makes it pass, say
so in the journal; if it doesn't, say that plainly too, don't claim a fix that didn't land.

### P5-03 — Add test coverage for auth.ts's ADMIN-granting logic · STATUS: DONE · STRIKES: 0
Files (only these): `apps/web/lib/auth.ts`, new file `apps/web/lib/auth.test.ts`.
Evidence: `isAdminEmail` and the ADMIN-granting session/JWT callbacks have zero test coverage
(confirmed via grep across `apps/web/__tests__` returning no matches) despite being the most
security-sensitive logic in the app.
Fix: in `auth.ts`, ONLY add an export for `isAdminEmail` if it is not already exported — do not
change its logic. In the new test file, cover: exact/case-insensitive `ADMIN_EMAILS` matching, the
session-callback DB-role overlay in both directions, and confirm `DEV_FAKE_ADMIN` is inert whenever
`NODE_ENV==='production'` regardless of the env var's value.
**VERIFY:** `npx vitest run apps/web/lib/auth.test.ts` passes. Temporarily comment out the
production hard-gate and confirm the new test catches it (proves the test actually guards something),
then restore the gate and confirm the test passes again.

### P5-04 — Add test coverage for free-score-persist.ts (closes the P4-07 gap) · STATUS: DONE · STRIKES: 0
Files (only these): `apps/web/lib/data-sources/free-score-persist.ts` (already modified, uncommitted
from Phase 4 — do not revert it), new file `apps/web/lib/data-sources/free-score-persist.test.ts`.
Context: this file already has the GSE-SEC-051 clearance-gate fix applied from Phase 4, sitting
uncommitted because it broke `free-first-ingest.test.ts` (a DIFFERENT file). Your job here is
narrower: add direct tests for THIS file's behavior so the existing fix can eventually be trusted.
Fix: add tests asserting the free-score loader returns empty when `checkClearance` denies, that
`persistFreeScores` skips the DB write on denial, and that an existing `homeScore` is never
overwritten with `null`.
**VERIFY:** `npx vitest run apps/web/lib/data-sources/free-score-persist.test.ts` passes. Temporarily
remove the clearance check to confirm the new tests fail, then restore it and confirm they pass.
**NOTE:** this does NOT fix `free-first-ingest.test.ts`'s failure (P4-07's actual blocker) — that is
a separate, harder task (P5-12) requiring you to update that test's mocks, not just add new tests.

### P5-05 — Reconcile HERMES_OVERNIGHT_PROTOCOL.md against what actually happened · STATUS: DONE · STRIKES: 0
**REOPENED 2026-08-15 (human review):** your analysis was correct (found in the journal) but the
watchdog's protected-path tripwire reverted the actual edit before it was committed — stale rule,
now fixed. Redo the edit and this time COMMIT it before stopping.
Files (only these): `docs/ops/HERMES_OVERNIGHT_PROTOCOL.md` (edit), `docs/ops/HERMES_AUDIT_CHARTER.md`
(read only, do not edit).
Fix: read the charter to determine whether it legitimately authorized touching `package.json`/
`auth.ts`/cross-package tests during an overnight run. Then either tighten the protocol's own
described tooling boundaries to match what can actually happen, or add an explicit note disclosing
that the charter can widen the allow-list beyond what the protocol alone implies.
**VERIFY:** doc-only, no test to run. Re-read both files end to end and confirm they no longer
contradict each other on blast radius.

### P5-06 — Update NEXT_LEVEL_BUILD_SPEC.md's stale checklist · STATUS: DONE · STRIKES: 0
**REOPENED 2026-08-15 (human review):** was marked DONE, but the watchdog's protected-path
tripwire reverted this edit before it was committed — stale rule, now fixed. Redo it and COMMIT.
File (only this): `docs/intelligence/NEXT_LEVEL_BUILD_SPEC.md`.
Fix: check off T2 and T3 (both already committed: `41801e6b`, `de4288d9` — verify with
`git show <hash> --stat` before checking anything off), add a pointer to
`handoff/OVERNIGHT_JOURNAL.md`, and correct the model-advisor test count to match the actual number
of tests in `tools/model-advisor/recommend.test.ts` (count them, do not assume the old number).
**VERIFY:** doc-only. Every checked-off item must have a verified commit hash cited next to it.

### P5-07 — Update fantasy-os-vision.md with real BUILT/PARTIAL/NOT-BUILT status · STATUS: DONE · STRIKES: 0 [commit 526bc726]
**REOPENED 2026-08-15 (human review):** was marked DONE (real, careful work — 51/51 file paths
verified), but the watchdog's protected-path tripwire reverted the edit before it was committed —
stale rule, now fixed. Redo it and COMMIT this time.
File (only this): `docs/fantasy-os-vision.md`.
Fix: for each listed component, check whether it actually exists in the codebase and annotate
BUILT/PARTIAL/NOT-BUILT accordingly. Explicitly flag ESPN/Yahoo OAuth sync and squares/survivor
contest formats as NOT-BUILT if they are not found, so the doc stops undermining confidence in
genuinely finished work.
**VERIFY:** doc-only. Every BUILT tag must be backed by a file path you personally confirmed exists.

### P5-08 — Re-measure current rate-limit route coverage · STATUS: DONE · STRIKES: 0
Files: `apps/web/app/api/**/route.ts` (measurement only, do not edit route files in this task).
Fix: count how many `route.ts` files under `apps/web/app/api/` call a rate-limiter versus the total
count, since commits `27e9c912`/`d3e012ac`/`2318d86f` (already in history) may have closed part of a
previously-cited gap. Write the updated ratio and the list of still-unprotected routes into
`handoff/RATE_LIMIT_COVERAGE.md`.
**VERIFY:** the ratio is a real grep-derived count, not copied from any prior document.

### P5-09 — Batch odds spend-guard follow-on (GSE-SEC-040/041/028) · STATUS: DONE · STRIKES: 0
Files: read `handoff/REMEDIATION_ROADMAP.md` for GSE-SEC-040, 041, 028's one-line descriptions, then
locate the real current code yourself — do not assume the file paths without checking, the roadmap
table is unverified for these IDs. Likely near `packages/ingestion-pipeline/src/process-sport.ts`,
`settle-sport.ts`, and wherever `OddsApiClient` is defined.
Fix: season-gate `trigger-refresh` and paid-settle calls consistent with existing season-gating
logic elsewhere in the codebase; add an outbound quota stop so 429 retries can't spend more than
once; move any provider API keys out of GET query strings into headers.
**VERIFY:** run the existing test file(s) for whichever files you touch. Grep the codebase to
confirm no API key appears in any logged request URL after your change.
**TWO-STRIKE:** if you cannot locate real evidence for one of these three IDs within 15 minutes,
mark just that sub-item BLOCKED with the reason, and proceed with whichever ones you did verify.

### P5-10 — Batch CSP/CSRF/cookie hardening · STATUS: DONE · STRIKES: 0 · started: 2026-08-15T00:00:00Z · completed: 2026-08-15T09:18:00Z
Files: locate cookie-mutating routes and the auth config yourself (grep for `Set-Cookie` or
`cookies().set` under `apps/web/app/api/`, and `trustHost` in the NextAuth config) — do not assume
paths from the roadmap without checking.
Fix: add CSRF/Origin checks to cookie-mutating routes; fix any relative-path edge cases
(e.g. `/\`) in callback-URL validation.

**DO NOT TOUCH `trustHost` — OWNER-GATED, REMOVED FROM THIS TASK 2026-08-15.** The original task
said to remove `trustHost: true` if no `AUTH_URL` is set. Do NOT do this. `trustHost: true` is
REQUIRED for NextAuth on Vercel behind a proxy; removing it when production's `AUTH_URL` is unset
locks every user out of the live site, and nothing in this repo can tell you what is set in the
Vercel production environment. Report it in the journal as owner-gated and move on. Changing it is
a decision only the owner can make, with the Vercel dashboard open.

**SCOPE LIMIT:** if adding an Origin/CSRF check to a route would change whether an EXISTING
logged-in session can still authenticate, stop and mark that route BLOCKED rather than changing it.
Hardening a POST route against cross-site abuse is in scope; altering the login/session flow itself
is not.
**VERIFY:** run existing tests for touched files. This is security-positive but touches auth-adjacent
code — if `npm test` shows ANY new failure after your change, treat it as a real regression per the
Phase 4 lesson, not noise to ignore.

### P5-11 — Batch SSRF hardening on outbound fetchers · STATUS: DONE · STRIKES: 0 · started: 2026-08-16T00:00:00Z · completed: 2026-08-16T00:00:00Z (commit 8d0cf610)
Files: locate the remote-model fetcher and other env-controlled fetchers yourself (grep for `fetch(`
combined with a `process.env` URL source under `apps/web/lib/` and `packages/ingestion-pipeline/`).
Fix: add a guard blocking requests to RFC1918 private ranges and blocking redirect-to-internal-IP
on any fetcher whose target URL is env- or config-controlled rather than hardcoded.
**VERIFY:** write a test simulating a redirect to an internal IP (e.g. `127.0.0.1`, `10.0.0.0/8`)
and confirm it is blocked. Run any existing tests for the touched files to confirm no regression.

### P5-12 — Narrow the clearance intent in free-first-ingest.ts (GSE-SEC-051 blocker) · STATUS: DONE · STRIKES: 0
**REWORDED 2026-08-15 (Opus review) — do not mock the clearance check as allowed, that would hide**
**a real design flaw. The intent list itself is wrong, not the test.**
Files (only these): `apps/web/lib/data-sources/free-first-ingest.ts` (already has the GSE-SEC-051
fix, uncommitted — the clearance CALL stays, only its `intents` argument changes),
`apps/web/__tests__/free-first-ingest.test.ts`.
Evidence: `free-first-ingest.ts` (around line 102) requests
`intents: ["storage", "derived_analytics"]` unconditionally, but ESPN carries
`storage_allowed: false` PERMANENTLY in `source-rights-registry.ts` (no unlock path — this is a
legal/rights block, not a bug). The ONLY real (non-test) caller of `fetchScoresFreeFirst` is
`multi-source-scores.ts`'s "live board / health probes" path (its own comment), which returns the
score data and never writes to the DB — confirmed by reading it, no `db.` call in that branch.
`free-score-persist.ts:211-224` already has its own, correct, separate clearance check at the
actual DB write. So this file is requesting a permission it doesn't need for what it actually does,
which permanently blocks a legitimate read-only path since ESPN can never clear "storage".
Fix: narrow the intent list in `fetchScoresFreeFirst()` to `["derived_analytics"]` only. Then, if
the test still fails, fix its mocks to match — but the mocking fix comes second, not instead of
the real fix.
**VERIFY:** `npx vitest run apps/web/__tests__/free-first-ingest.test.ts` passes. Confirm the
narrowed intent list still correctly BLOCKS if you temporarily set `derived_analytics` denied too
(prove the gate isn't vacuous), then restore it.
**IF THIS TASK SUCCEEDS:** append a note to `handoff/PHASE4_SUMMARY.md` that GSE-SEC-051's blocker
is resolved and it is now safe to commit `free-first-ingest.ts` + `free-score-persist.ts` together —
but do NOT commit them yourself in this task; that is a separate decision.

### P5-13 — Systematic data-clearance coverage re-audit (READ-ONLY) · STATUS: DONE · STRIKES: 0
Files: read `apps/web/lib/scraping/source-rights-registry.ts` IN FULL to get every registered
`source_id` and its allowed/denied intents. Then for EACH source_id, grep
`apps/web/lib/data-sources/**` and `apps/web/lib/scraping/**` for where it is actually fetched, and
check whether `checkClearance` is called before that fetch.
Context: a prior discovery pass for this exact question returned only placeholder test content —
it never actually ran. Three real gaps of this exact bug class were already found and fixed this
session (GSE-SEC-049/050/051: PFR, secondary scores, ESPN) by manual spot-check, not a systematic
sweep — there is a real chance more of the same class exist unfound.
Fix: THIS IS READ-ONLY. Do not fix anything you find. Produce a coverage table in
`handoff/CLEARANCE_COVERAGE_AUDIT.md`: source_id -> has runtime checkClearance call (yes/no/partial)
-> file:line. For any "no" or "partial" beyond the 3 already fixed, write it up with the same
evidence/exploit/remediation-sketch format as `handoff/AUDIT_FINDINGS.md` uses, as a new
GSE-SEC-0NN finding (continue numbering from the highest existing ID in that file).
**VERIFY:** `handoff/CLEARANCE_COVERAGE_AUDIT.md` exists and covers every source_id in the registry
— no silent gaps, an explicit row for each one.

### P5-14 — Phase 5 exit · STATUS: DONE · STRIKES: 0 · started: 2026-08-16T10:30:00Z · completed: 2026-08-16T10:43:00Z (commit 846ca467)
Write `handoff/PHASE5_SUMMARY.md`: which of P5-01..13 committed vs. blocked, with commit hashes,
and for EACH task explicitly state which test file was run and what it showed — not just
typecheck/lint. This is the field that was missing from Phase 4's summary and caused the gap.
**VERIFY:** file exists; every commit hash resolves via `git show <hash> --stat`; every task has an
explicit test-run line, not just "typecheck/lint clean."

---

# PHASE 6 — R&D BRANCH MERGEABILITY ASSESSMENT (INVESTIGATION ONLY — NO MERGE)
*The branch `codex/sunday-frontier-maxforce-2026-07-05` (171 commits ahead of origin/main, no*
*worktree) contains real, substantial work: a public /verify proof-of-record + trust layer, a*
*Pedersen-commitment/ZK-research crypto cluster, NGS data integration, and a large API v1 +*
*commercial/media-revenue product built in careful shadow-mode stages. The owner has confirmed this*
*is real and wants it assessed for merge — NOT merged automatically. Your job in this phase is to*
*produce a report a human decides from. You do not merge, cherry-pick, or push anything in Phase 6.*

**ONE-TIME PERMISSION EXPANSION FOR THIS PHASE ONLY:** P6-02 below requires creating ONE new,
temporary, disposable git worktree purely to test-run code — this is explicitly authorized as an
exception to the general "never operate in another worktree" rule. It does NOT authorize touching
`phase3-accuracy-proof`, `Sports_release_codex`, or any other EXISTING named worktree — those remain
off-limits. The temp worktree must be created fresh, used only for the one test in P6-02, and
removed before that task ends. Never push from it. Never merge from it into anything real.

### P6-01 — Map file-level conflicts between the R&D branch and main · STATUS: DONE · STRIKES: 0 · started: 2026-08-16T11:35:00Z · completed: 2026-08-16T11:55:00Z (commit 68f9df68)
Read-only. From `C:\Users\Garrett\Sports`:
```
git fetch origin
git diff origin/main...codex/sunday-frontier-maxforce-2026-07-05 --stat
git diff origin/main...codex/sunday-frontier-maxforce-2026-07-05 --name-only > handoff/RND_BRANCH_TOUCHED_FILES.txt
```
For every file in that list, check with `git log origin/main -1 --oneline -- <file>` whether main
has ALSO modified that file since the branch's merge-base (a real conflict risk) versus the file
being net-new/untouched-on-main-since (clean apply). Write a table to
`handoff/RND_BRANCH_MERGE_MAP.md`: file path -> touched-on-main-since-branch-point (yes/no) ->
your assessment (clean-apply / likely-conflict / needs-manual-review).
**VERIFY:** `handoff/RND_BRANCH_MERGE_MAP.md` exists and accounts for every file in
`RND_BRANCH_TOUCHED_FILES.txt` — no file silently skipped.

### P6-02 — Test the API v1 hypothesis in a disposable worktree · STATUS: DONE · STRIKES: 0
Tests whether the branch's API v1 cluster (commits from `feat(web): add api v1 shadow seam` onward
— see `git log origin/main..codex/sunday-frontier-maxforce-2026-07-05 --oneline` for the exact
range, roughly the last 85 commits) makes the existing `api-v1-*.test.ts` files on main pass.
```
git worktree add C:\Users\Garrett\Sports_rnd_test_TEMP codex/sunday-frontier-maxforce-2026-07-05
cd C:\Users\Garrett\Sports_rnd_test_TEMP
npm install
npx vitest run apps/web/__tests__/api-v1-*.test.ts apps/web/__tests__/actor-minting-boundary.test.ts
```
Record the FULL pass/fail output. Then:
```
cd C:\Users\Garrett\Sports
git worktree remove C:\Users\Garrett\Sports_rnd_test_TEMP --force
```
The `--force` here is required because the temp worktree will have `node_modules` and build
artifacts in it — this is safe ONLY because this is the disposable worktree YOU just created in
this task, never apply `--force` to any other worktree.
**VERIFY:** `handoff/RND_BRANCH_API_V1_TEST_RESULT.md` written with the full vitest output and a
clear yes/no answer: does this branch's code make main's api-v1 tests pass? `git worktree list`
no longer shows `Sports_rnd_test_TEMP` afterward.
**ABORT IF:** `npm install` in the temp worktree fails or takes over 15 minutes — mark BLOCKED,
remove the temp worktree anyway (cleanup is mandatory even on failure), and move on.

### P6-03 — Risk-assess the crypto/ZK cluster (read-only, no integration) · STATUS: DONE · STRIKES: 0 · 2026-08-15T11:18:00Z
Read-only code review. From `C:\Users\Garrett\Sports`:
```
git show codex/sunday-frontier-maxforce-2026-07-05:packages/crypto/package.json
git show codex/sunday-frontier-maxforce-2026-07-05 --stat | grep -i crypto
```
Read the actual source of the `@sports/crypto` package and the Pedersen-commitment/secp256k1 code
at that branch ref (`git show <ref>:<path>` for each relevant file — do not check it out into your
working tree). Look specifically for: hardcoded keys/seeds, use of `Math.random()` or other
non-cryptographic randomness where cryptographic randomness is required, any TODO/FIXME/"do not use
in production" markers the branch's own commits may have left, and whether the branch's own commit
messages (`fe89dd7f fix(crypto): commit(0,0) + sum-to-identity return null instead of throwing`
etc.) indicate unresolved known issues.
**VERIFY:** `handoff/RND_BRANCH_CRYPTO_RISK.md` written with specific file:line citations for
anything concerning, or an explicit "nothing concerning found" if genuinely clean — do not pad
this with vague caution if the code is actually fine.

### P6-04 — Synthesis: mergeability report + recommended order · STATUS: TODO · STRIKES: 0
Read `handoff/RND_BRANCH_MERGE_MAP.md`, `handoff/RND_BRANCH_API_V1_TEST_RESULT.md`, and
`handoff/RND_BRANCH_CRYPTO_RISK.md` (all from P6-01/02/03). Write
`handoff/RND_BRANCH_MERGEABILITY_REPORT.md` with: (1) a plain-English summary of what's in the
branch and its real state, (2) whether the API v1 cluster genuinely resolves today's known test
failures, (3) a recommended integration ORDER if the owner chooses to merge anything (which cluster
first, which needs the most review), (4) explicit red flags from the crypto risk-assessment, and
(5) an honest list of what you could NOT verify and would need a human or a fresh Laguna pass to
check.
**VERIFY:** file exists and directly answers the API v1 hypothesis with a yes/no, not a hedge.

### P6-05 — Phase 6 exit · STATUS: TODO · STRIKES: 0
Confirm `git worktree list` shows no `Sports_rnd_test_TEMP` entry (if P6-02 left one behind, remove
it now). Confirm no commits were made to `main` or `claude/fable-5-ultracode-plan-ptru4e` referencing
the R&D branch's content in this phase — Phase 6 is investigation-only. Write a one-paragraph note
in `handoff/RND_BRANCH_MERGEABILITY_REPORT.md` confirming this and that nothing was pushed.
**VERIFY:** `git worktree list` clean; report's closing note present.

---

# PHASE 7 — MAKE IT ACTUALLY RUN (added 2026-08-15)
*Owner's goal: "GSE up and running fully." Phases 1-6 hardened and audited. This phase makes the*
*tree provably green, buildable, and runnable. Highest business value remaining.*

**ENVIRONMENT NOTE (2026-08-15):** Ollama and all local LLM models were removed from this machine —
local inference measured 2.62-8.26 tok/s and was not viable. Nothing in GSE depended on it
(verified: the only references are a comment, a keyword regex, and an allow-list string). Disk went
from 19 GB to 85+ GB free, so builds and installs are no longer disk-constrained. **Do NOT add any
task that installs a local model runtime.**

**COMMIT DISCIPLINE (unchanged):** typecheck+lint green for files you touch, RUN the specific test
file(s), then `git add` the exact files and `git commit`. Committing is required, not optional.
Never push.

### P7-01 — Rescue the STRANDED P4-05 fix (its tests have no owner) · STATUS: DONE · STRIKES: 0
**Highest-priority task in the queue.** P4-05 applied PFR clearance gating to three files. It broke
two test files, so it was never committed and has sat uncommitted for days. P5-12 fixes P4-07's
analogous breakage, but NOTHING in this queue fixes P4-05's. Without this task that security fix is
stranded permanently.
Files (only these): `apps/web/lib/nflverse/pressure-coverage.ts`,
`apps/web/lib/ingestion/pfr-adv-stats.ts`, `apps/web/lib/intelligence/rushing-contact.ts` — all
three ALREADY have the fix applied and uncommitted; **do NOT change the fix logic** — plus their
test files, which you locate yourself via `git status` and a find for `*pressure-coverage*.test.*`
and `*pfr-adv-stats*.test.*`.
Fix: update the TESTS' mocks so `checkClearance` returns allowed for `pfr-advstats-via-nflverse` in
the happy-path scenarios, exactly as P5-04 did for free-score-persist. **Do NOT weaken the clearance
check in the source to make a test pass.**
**VERIFY:** run each touched test file with `npx vitest run <file>` and show it passing. Then
`git add` the three source files AND the test files together, and commit as one change.
**IF BLOCKED:** if it cannot pass without weakening the source fix, mark BLOCKED and write exactly
which assertion is impossible and why. Do not force it.

### P7-02 — Full test-suite census · STATUS: TODO · STRIKES: 0
```
CI=1 npm test > handoff/test-census-raw.txt 2>&1
```
`CI=1` is REQUIRED — without it the TTY progress bar overwrites lines with \r and you capture only a
fraction of the real failures. This has already burned this sprint once.
Write `handoff/TEST_CENSUS.md`: total files, total tests, pass/fail counts, and a table of EVERY
failing test file with the first error line. Group into: (a) pre-existing — also in the P1-01
baseline in SPRINT_JOURNAL.md, quote that baseline; (b) caused by this sprint's own work;
(c) environmental — needs a live DB, network, or secret.
**VERIFY:** every failing file in the raw output appears in the markdown. Counts must be real greps
of the raw file, not estimates.

### P7-03 — Fix test failures, batch 1 (category b) · STATUS: TODO · STRIKES: 0
Read `handoff/TEST_CENSUS.md`. Take the FIRST THREE category-(b) failures. Fix one at a time,
smallest change first. Prefer fixing the TEST when source behavior is correct and intended; fix the
SOURCE only when the test documents real required behavior the source now violates.
**Never** delete a test, `.skip` it, or loosen an assertion to green it up. If a test is genuinely
obsolete, mark BLOCKED and explain — removing coverage is an owner decision.
**VERIFY:** each fixed file's test run passes; commit each fix separately; strike it through in
`TEST_CENSUS.md`.

### P7-04 — Fix test failures, batch 2 · STATUS: TODO · STRIKES: 0
Same rules as P7-03, next three category-(b). If (b) is exhausted, move to category (a), easiest
first. Same never-delete-a-test rule.

### P7-05 — Fix test failures, batch 3 · STATUS: TODO · STRIKES: 0
Same rules, next three. If NO failures remain in (a) or (b), write "suite green except category (c)
environmental" into `TEST_CENSUS.md` and mark DONE immediately.

### P7-06 — Typecheck + lint across every workspace · STATUS: TODO · STRIKES: 0
```
npm run typecheck > handoff/typecheck-raw.txt 2>&1
npm run lint > handoff/lint-raw.txt 2>&1
```
Record exit codes. Fix ONLY errors in files this sprint already touched (see
`git log --name-only origin/claude/fable-5-ultracode-plan-ptru4e..HEAD`). List everything else in
`handoff/TYPE_LINT_DEBT.md` WITHOUT fixing — a broad lint sweep produces an unreviewable diff.
**VERIFY:** both raw files exist with real output; any fix has a passing re-run.

### P7-07 — Production build verification · STATUS: TODO · STRIKES: 0
```
npm run build > handoff/build-raw.txt 2>&1
```
This is the single best proof the app is deployable. If it fails, write `handoff/BUILD_FAILURE.md`
with the exact error, file, and root-cause diagnosis. Fix ONLY if the cause is a file this sprint
touched; otherwise document and mark BLOCKED.
Afterward `rm -rf apps/web/.next` to reclaim space — that is a regenerable, gitignored build
artifact and is the ONE deletion you are permitted.
**VERIFY:** `handoff/build-raw.txt` exists showing either a successful build or a documented failure
with root cause.

### P7-08 — Local bring-up runbook, verified · STATUS: TODO · STRIKES: 0
The owner needs to actually RUN this app. Determine the minimal bring-up sequence by READING config
and code. **Do NOT start a long-running dev server** — you cannot manage its lifecycle and it will
hang your session.
Produce `handoff/LOCAL_BRINGUP.md`: required env var NAMES (never values), which are hard-required
to boot vs feature-gated, whether a stub/demo mode runs without a live database (search
`isStubMode`, `isDemoPicksEnabled`, sample-data paths) and exactly how to enable it, the DB
migration step if any, and the exact command order.
Cross-check every env var the code reads against `.env.example`; any var required by code but
missing there is a real onboarding defect — list under "UNDOCUMENTED REQUIRED VARS".
**NEVER open, print, or copy `.env` itself. Names only.**
**VERIFY:** every command in the runbook traces to a real script in package.json.

### P7-09 — Dependency + supply-chain health · STATUS: TODO · STRIKES: 0
```
npm audit --omit=dev --json > handoff/npm-audit-current.json 2>&1
```
Summarize into `handoff/DEPENDENCY_HEALTH.md`: counts by severity; for each HIGH/CRITICAL the
package, path, whether a non-breaking fix exists, and direct vs transitive.
**Do NOT run `npm audit fix`** — it silently bumps majors and breaks builds. Recommend only.
Flag any dependency that does not resolve to a real upstream (this repo was targeted by a fabricated
blueprint once).
**VERIFY:** the JSON exists; your counts match a real grep of it.

### P7-10 — Fix `/preview`: paywalled premium picks now falsely claim "not yet available" · STATUS: TODO · STRIKES: 0
Files (only these): `apps/web/app/preview/[sport]/[slug]/page.tsx`,
`apps/web/__tests__/preview-page-paywall.test.tsx`.
Evidence: commit `d4da1265` (this session, GSE-SEC-025) added
`...(canSeePremiumPicks ? {} : { tier: "FREE" as const })` to the pick query at
`loadGameForSlug`. Any pick at confidence >=70 is PREMIUM
(`packages/prediction-engine/src/scoring.ts:501`,
`packages/prediction-engine/src/constants.ts:28`), so for an un-entitled viewer the query returns
zero picks and the page renders "Model pick not yet available for this matchup" — a false
absence claim, not a paywall. The sibling surface `/picks` treats this exact pattern as a defect
(`apps/web/app/picks/page.tsx:445-447`: "instead of falsely claiming nothing was published",
pinned by `apps/web/__tests__/picks-paywall-copy-truth.test.ts:116-118`) and this file's own
header doctrine (lines 32-36) says un-entitled viewers must get "an honest locked hint, never the
numbers" — never a false-absence message. It also affects SEO: `apps/web/app/sitemap.ts:99-117`
emits these URLs with no tier awareness, so indexed model leans are capped below 70 confidence.
Fix: remove the `tier: "FREE"` query filter from `loadGameForSlug`; keep fetching the real pick.
Redact AT RENDER instead — when the best pick is PREMIUM and the viewer lacks
`canSeePremiumPicks`, show a locked-hint message (mirror the existing pattern this file already
uses for confidence/line-movement at lines ~316-326 and ~412-426), not the false-absence branch.
**VERIFY:** `npx vitest run apps/web/__tests__/preview-page-paywall.test.tsx` — the existing test
mocks `db.game.findMany` without inspecting the `where` clause and is currently false-green;
rewrite its anonymous-viewer case to use a PREMIUM-tier fixture and assert the locked hint renders
(not the false-absence text, and not the real selection/line). typecheck+lint clean, then commit.

### P7-11 — Fix `/board` + homepage: public pick counts silently vary by viewer tier · STATUS: TODO · STRIKES: 0
Files (only these): `apps/web/lib/board/state.ts`, `apps/web/__tests__/board-gate-decisions.test.ts`.
Evidence: `state.ts`'s `tierFilter` (added in the same `d4da1265` commit) DROPS premium rows from
the published-pick query entirely for non-premium viewers, instead of only redacting the
`market`/selection field. That makes `openPicks` (and `sportsWatched`) count FREE picks only for
anonymous viewers — surfaced as the "Open picks" tile on `/board` and the homepage "cleared" count
(`apps/web/app/page.tsx` calls `loadBoardState()` with no entitlements for every visitor,
including logged-in Pro subscribers, so paid subscribers see the anonymous-scoped number too).
On a product whose pitch is honest public numbers, a headline count that silently shrinks by
viewer tier — and drops exactly the highest-confidence picks — is a trust regression, not a
security one. Also: `publishedPickRelation` (state.ts, no tierFilter) excludes a premium-picked
game from the `gatedToday` count too, distorting the cleared-vs-gated ratio the homepage uses as
its gate-discipline proof.
Fix: keep every published-and-cleared row in the query regardless of viewer tier; scrub only the
`market`/selection field for non-premium viewers (the redaction that already exists for the
`market` field elsewhere in this same function — reuse that pattern, don't invent a new one).
Counts should be identical for every viewer; only the selection text differs.
**VERIFY:** add an anonymous/FREE case to `board-gate-decisions.test.ts` asserting `openPicks`
(and `gatedToday`) are IDENTICAL between a PRO viewer and an anonymous viewer for the same fixture
data, and that `market` is `"ALL_MARKETS"` specifically for the anonymous case. This is currently
untested — grep confirms `ALL_MARKETS` appears in exactly one test file and only inside a comment.
typecheck+lint clean, then commit.

### P7-12 — Harden `/observatory`: same paywall bug class, currently dormant but unguarded · STATUS: TODO · STRIKES: 0
Files (only these): `apps/web/lib/slate-twin/get-slate-twin.ts`, `apps/web/app/observatory/page.tsx`.
Evidence: `get-slate-twin.ts`'s picks query (`picks: { orderBy: { generatedAt: "desc" }, take: 1 }`)
has NO `isPublished`, NO `isBootstrap`, and NO tier predicate — strictly weaker than the board
query `d4da1265` just hardened. The result (rounded real confidence + up to 160 chars of pick
reasoning) feeds a `"use client"` component with zero entitlement checks anywhere in
`app/observatory/page.tsx`. It is currently DORMANT — `get-slate-twin.ts` short-circuits to
`DEMO_SLATE` while the `PUBLIC_PICKS_ENABLED` launch gate is off — so this is not bleeding today,
but it becomes a live leak the instant that gate flips, with no code change needed to trigger it.
Fix: add `where: { isPublished: true, isBootstrap: false, ...(canSeePremiumPicks ? {} : { tier:
"FREE" }) }` to the picks include in `get-slate-twin.ts`; resolve entitlements via
`getViewerEntitlements()` (the shared helper — see `lib/pricing/tier-access.ts`) in
`app/observatory/page.tsx` and pass them through; null out `confidence`/`reasoning`/`note` for
un-entitled viewers rather than omitting the game entirely (this surface's job is a live signal
map, not a leaderboard — an un-entitled viewer should see the game exists, just not the numbers).
**VERIFY:** add a test asserting an un-entitled viewer's slate never contains real confidence or
reasoning text for a PREMIUM-tier pick. typecheck+lint clean, then commit.

### P7-13 — Hoist the Stripe webhook's client read out of the signature try block · STATUS: TODO · STRIKES: 0
File (only this): `apps/web/app/api/webhooks/stripe/route.ts`.
Evidence: `stripe.webhooks.constructEvent(...)` reads the `stripe` Proxy (from this session's
`b606d4a8` fix) inside the try/catch meant to catch SIGNATURE failures. If `STRIPE_SECRET_KEY` is
missing/blank, the Proxy throws `StripeConfigError` on that property read, landing in the same
catch, which logs "Stripe webhook signature verification failed" and returns 400 "Invalid
signature" — misdirecting an operator at the wrong secret (`STRIPE_WEBHOOK_SECRET`, not
`STRIPE_SECRET_KEY`). `constructEvent` itself never needs the API key (only the webhook secret),
so this is a config-error being misreported as a signature failure.
Fix: read `getStripe().webhooks` (or equivalent) OUTSIDE the signature try/catch, in its own
try/catch that returns 503 with a log line naming `STRIPE_SECRET_KEY` specifically, before
entering the signature-verification block.
**VERIFY:** add a test: unset `STRIPE_SECRET_KEY`, send a well-formed webhook request, assert the
response is 503 (not 400) and the log names the correct env var. typecheck+lint clean, then commit.

### P7-14 — Housekeeping batch (all trivial, no design decisions) · STATUS: TODO · STRIKES: 0
Do these as one small commit each, or grouped if genuinely trivial:
1. `handoff/PHASE1_SUMMARY.md` — scrub the absolute local path `C:/Users/Garrett/Sports` it leaks.
2. `QUICKSTART.md` / `README.md` — both cite Postgres port `:5432`, but
   `docker/docker-compose.yml` maps `:5433`. Fix the docs to match the compose file. Also
   `README.md` says the root `.env.local` when Next actually reads `apps/web/.env.local` — fix.
3. `scripts/guardrails/run-all.mjs --only=<name>` currently exits 0 for an UNKNOWN name (silently
   matches nothing instead of failing) — so "verified via --only" proves nothing if the name is
   typo'd. Make it exit non-zero when `--only` matches no registered guard.
4. `apps/web/__tests__/brand-safety-v2.test.ts` is red and appears to have no path to green via
   the guardrail wiring — read it, determine why, and either fix the wiring gap or mark BLOCKED
   with a specific reason (do not silently leave a permanently-red test unexplained).
5. `scripts/check-deploy-readiness.mjs` still constructs the odds-API URL with `?apiKey=` in a
   DIFFERENT way than the client code now does after `ffe976b1` — verify they agree (both should
   use the query param now) and fix if they've drifted.
**VERIFY:** each item gets its own small commit with typecheck+lint clean for touched files.

---

# PHASE 8 — WORK THE REMAINING AUDIT BACKLOG
*75 findings catalogued, ~12 fixed. `handoff/REMEDIATION_ROADMAP.md` is the record. These tasks are*
*deliberately repeatable: each session takes the next unfixed finding.*

**SCOPE GUARD — skip these every time you meet them, they are OWNER-GATED:**
- GSE-SEC-059/060/003 (Next.js major) and GSE-SEC-061 (next-auth caret) — dependency majors.
- Anything needing a Prisma migration, a change under `apps/web/lib/ai-control-plane/**`, or a
  production environment-config change.
- Anything whose fix alters the login/session flow. **Lesson from P5-10:** a wrong `trustHost`
  change locks every user out of the live site. Auth flow changes are the owner's call.

### P8-01 — Roadmap triage into an execution list · STATUS: TODO · STRIKES: 0
Read `handoff/REMEDIATION_ROADMAP.md` IN FULL. Produce `handoff/REMEDIATION_EXECUTION.md`: a
numbered list of every finding NOT yet fixed and NOT in the scope guard, ordered by
(severity x how small/safe the fix is). For each: id, one-line description, the real file path you
personally verified exists, and SAFE-DIRECT vs NEEDS-OWNER.
The roadmap's paths are UNVERIFIED for many IDs — confirm each with a real grep. If a finding's
described code no longer exists, mark it STALE/ALREADY-FIXED and say so.
**VERIFY:** every entry cites a file path you confirmed with a command.

### P8-02 — Fix the next finding · STATUS: TODO · STRIKES: 0
Take the FIRST unfixed SAFE-DIRECT item in `handoff/REMEDIATION_EXECUTION.md`. Fix exactly that one
finding, nothing else. Run the relevant test file(s). Commit. Mark it done in that file.
**VERIFY:** typecheck+lint green, tests run and shown, commit hash in the journal.

### P8-03 — Fix the next finding · STATUS: TODO · STRIKES: 0
Same as P8-02, next item.

### P8-04 — Fix the next finding · STATUS: TODO · STRIKES: 0
Same as P8-02, next item.

### P8-05 — Fix the next finding · STATUS: TODO · STRIKES: 0
Same as P8-02, next item.

### P8-06 — Fix the next finding · STATUS: TODO · STRIKES: 0
Same as P8-02, next item.

### P8-07 — Fix the next finding · STATUS: TODO · STRIKES: 0
Same as P8-02, next item.

### P8-08 — Fix the next finding · STATUS: TODO · STRIKES: 0
Same as P8-02, next item.

### P8-09 — Mid-backlog regression checkpoint · STATUS: TODO · STRIKES: 0
Re-run `CI=1 npm test > handoff/test-census-p8.txt 2>&1` and compare against `TEST_CENSUS.md`. Any
NEW failure introduced by P8-02..08 is a regression YOU caused — find the commit
(`git log --oneline` + `git show`), fix it, commit the fix.
**VERIFY:** write the comparison explicitly, failure count before vs after.

### P8-10 — Fix the next finding · STATUS: TODO · STRIKES: 0
Same as P8-02, next item.

### P8-11 — Fix the next finding · STATUS: TODO · STRIKES: 0
Same as P8-02, next item.

### P8-12 — Fix the next finding · STATUS: TODO · STRIKES: 0
Same as P8-02, next item.

### P8-13 — Fix the next finding · STATUS: TODO · STRIKES: 0
Same as P8-02, next item.

### P8-14 — Fix the next finding · STATUS: TODO · STRIKES: 0
Same as P8-02, next item.

---

# PHASE 9 — SHIP-READINESS (no deploying, no pushing)
*Everything the owner needs to merge and deploy in one confident sitting.*

### P9-01 — Deploy-readiness assessment · STATUS: TODO · STRIKES: 0
Write `handoff/DEPLOY_READINESS.md`. Determine and record: how a change actually reaches production
(read `vercel.json` and deploy docs — merge to main, or alias promotion?); whether any commit on
this branch requires a DB migration applied FIRST; whether any commit changes an env-var contract
production would need updated before the code lands. This branch is ~108 commits ahead of
origin/main — assess whether a single merge is realistic or it should be split.
**VERIFY:** each claim cites a real file. Explicitly answer: "if the owner merged and deployed this
branch today, what breaks?"

### P9-02 — Secret + PII sweep of everything this branch committed · STATUS: TODO · STRIKES: 0
Several previously-gitignored `handoff/` files were force-added into git this session. Before this
branch is ever pushed, verify nothing sensitive entered history.
Use `git diff --name-only origin/claude/fable-5-ultracode-plan-ptru4e..HEAD` and `git ls-files
handoff/`. For every committed file scan for credentials, tokens, connection strings, real email
addresses, personal data, and absolute local paths.
**Report LOCATION and KIND only — never reproduce a secret value.**
Assess separately: `REMEDIATION_ROADMAP.md` and `AUDIT_FINDINGS.md` contain a register of ~63
UNREMEDIATED vulnerabilities. State plainly whether those belong in a repo that may be pushed to
GitHub, and which findings would be most dangerous to publish while still unfixed.
**VERIFY:** `handoff/SECRET_PII_SWEEP.md` exists covering every committed file, no silent gaps.
**This task's output gates whether the owner pushes. Be thorough and honest.**

### P9-03 — Rate-limit the highest-risk unprotected routes · STATUS: TODO · STRIKES: 0
`handoff/RATE_LIMIT_COVERAGE.md` found 62/176 routes rate-limited, 82+ anonymous GETs unprotected.
Pick the THREE highest-risk unprotected routes — anonymous, expensive (DB-heavy or LLM-backed),
publicly reachable — and add the SAME rate-limit helper comparable routes already use. Do not invent
a new mechanism; copy the established pattern and cite the file you copied from.
**VERIFY:** run tests for each touched route; grep-confirm each now calls a limiter; commit; update
the ratio in `RATE_LIMIT_COVERAGE.md` to the new real number.

### P9-04 — Rate-limit the next three routes · STATUS: TODO · STRIKES: 0
Same as P9-03, next three by risk.

### P9-05 — Rate-limit the next three routes · STATUS: TODO · STRIKES: 0
Same as P9-03, next three by risk.

### P9-06 — Final sprint report · STATUS: TODO · STRIKES: 0
Write `handoff/SPRINT_FINAL.md`: every phase and task with DONE/BLOCKED, every commit hash with its
one-line subject, final test census numbers, and a clearly separated section titled
**"OWNER-GATED — NOTHING ELSE CAN PROCEED WITHOUT YOU"** listing only decisions that genuinely
require the human: pushing the branch, merging to main, deploying, dependency majors, DB migrations,
and anything touching live billing or auth configuration.
Keep that list SHORT and SPECIFIC — the owner has been burned by being handed gated items dressed up
as tasks.
**VERIFY:** every commit hash resolves via `git show <hash> --stat`; the owner-gated section
contains no item an agent could have done itself.

---

# PHASE 9.5 — LAUNCH BLOCKERS: THE THREE UNAUDITED AXES (added 2026-08-15)

**READ THIS BEFORE ANYTHING ELSE IN THIS PHASE.** Phases 1-9 audit CODE CORRECTNESS. That is ONE
axis. A launch also requires the CUSTOMER JOURNEY to work, the LEGAL surface to be adequate, and the
OPERATIONAL surface to be recoverable. **None of those three has ever been audited.** Ten phases of
security work cannot tell you whether money reaches the owner's bank account.

**TIMING IS NOW REAL, NOT THEORETICAL.** NFL preseason games and fantasy drafts are ALREADY
underway. This is the acquisition window for a sports product and it is open right now — every day
unlaunched is lost revenue for a founder who is currently unemployed. Sequence accordingly:
**do the BLOCKING items first and in order.** Do not perfect a non-blocking item while a blocking
one is still open.

**CRITICAL PATH — the minimum set to safely take a customer's money:**
`P9.5-05` (payment actually grants access) -> `P9.5-06` (cancel/refund doesn't strand anyone) ->
`P9.5-07` (legal surface) -> `P9.5-08` (claims are true) -> `P9.5-09` (errors are visible in prod)
-> `P9.5-10` (a bad deploy can be undone). Those six are the launch gate.
The browser-journey tasks (`P9.5-01..04`) are high-value and come first if the harness cooperates,
but **if `P9.5-01` blocks, skip straight to `P9.5-05` — do not let a flaky test harness hold up the
launch-critical audit.**

**LAUNCHING DOES NOT STOP PHASE 10.** The recurring battle-test is not a gate that must complete
before launch — it runs forever, including after launch. Real products keep auditing while live.
Do not treat Phase 10 as a prerequisite.

**THE FINDING THAT CREATED THIS PHASE:** `@playwright/test` is a dependency in `package.json`, but
there is NO `playwright.config.*`, NO `apps/web/e2e/` directory, and NO `test:e2e` script anywhere
in the working tree. A Playwright suite exists ONLY in the abandoned worktree
`.claude/worktrees/phase3/apps/web/e2e/`. **Nothing has ever verified that a real person can sign
up, pay, and receive picks.** Stripe's *code* is well covered by unit tests; the *funnel* has never
been walked end to end.

**HARD CONSTRAINT — NEVER USE REAL MONEY OR REAL CARDS.** Every payment test uses Stripe TEST mode
and Stripe's documented test card numbers only. If a task appears to require a live key, a real
card, or a real charge, mark it BLOCKED and add it to the owner-gated list. Never enter payment
credentials. Never switch a key from test to live.

**RUNNING THE APP:** do NOT hand-start a dev server you cannot terminate. Configure Playwright's
own `webServer` option so Playwright starts and stops the app itself. If a browser download is
needed, `npx playwright install chromium` (chromium only, not all browsers).

### P9.5-01 — Stand up the e2e harness · STATUS: DONE (Claude, 2026-08-15) · STRIKES: 0
Passed: homepage returns 200 (684ms) with a valid title, even with no local DATABASE_URL —
confirms the app fails open gracefully (Prisma auth error logged, 200 still served), not a bug.

### P9.5-00 — Price out The Odds API's paid tiers against real usage (READ-ONLY, no purchase) · STATUS: TODO · STRIKES: 0
**Context, already established — do not re-derive:** the account is on the free tier (500
credits/month). At the live production cadence (`refresh-odds` every 15 min, `vercel.json`) with 3
markets tracked (h2h/spreads/totals = 3 credits/call) and up to 3 sports in season at once, the
free tier's entire monthly budget can be burned in under 14 hours. The owner has decided to KEEP
all 3 markets and is willing to pay for a plan that supports them — do NOT propose cutting markets,
that decision is already made. `cd4e77d6` already added a proactive guard so the app degrades
safely (stops early, doesn't misdiagnose) rather than crashing when a limit is hit; this task is
about the BUSINESS decision, not another safety patch.
Fix: **read-only research, then math, then a recommendation — do not purchase or upgrade anything.**
1. Fetch `https://theoddsapi.com/pricing` (or search for it) and record every real paid tier's
   name, monthly credit allowance, and price, exactly as published today.
2. Compute, for each tier, how many full-sweep cycles/day it actually supports at the CURRENT
   architecture (3 markets, up to 3 sports in season now — but also compute the NFL-season worst
   case once NFL is added to `getInSeasonSports()`, since that's weeks away, not hypothetical).
3. Compute what refresh cadence (e.g., every 15/30/60 min) each tier sustains WITHOUT changing
   markets, so the owner sees the real cadence-vs-price tradeoff instead of a vague "upgrade."
4. Note whether `odds-api.io` (already evaluated as the #5 failover source, referenced in
   `packages/data-ingestion/src/odds-failover.ts` but never actually wired — its HTTP mapping was
   deferred pending confirmed endpoint/rate limits) has its OWN separate free tier that could
   share the load instead of one vendor eating it all, and get ITS real current pricing too if so.
5. Write `handoff/ODDS_API_TIER_DECISION.md`: a short table (tier / price / credits / sustainable
   cadence at 3 markets) plus a single clear recommendation — cheapest tier that sustains the
   current cadence without touching markets, given the owner's decision to keep all three.
**VERIFY:** every number in the file is cited to where it came from (a URL or a real calculation
shown, not asserted). No purchase, no signup, no payment action of any kind — this is pricing
research only, the owner makes the actual purchase decision.
Files: new `playwright.config.ts`, new `apps/web/e2e/smoke.spec.ts`, `package.json` (add a
`test:e2e` script only).
Read `.claude/worktrees/phase3/playwright.config.ts` and `.claude/worktrees/phase3/apps/web/e2e/*`
FIRST as a reference for what previously worked in this repo — you may copy and adapt, but verify
every path and selector still matches the CURRENT tree rather than assuming.
Configure `webServer` so Playwright boots the app itself. Write ONE smoke test: the homepage loads
and returns 200 with the expected `<title>`.
**VERIFY:** `npm run test:e2e` passes with that one test green. Commit.
**ABORT IF:** you cannot get a server booting within two attempts — mark BLOCKED, write
`handoff/E2E_BLOCKED.md` with the exact error output and what you tried, and **move immediately to
P9.5-05**. Do NOT thrash; the launch-critical audit does not depend on this harness.

### P9.5-02 — Anonymous visitor journey · STATUS: TODO · STRIKES: 0
Depends on P9.5-01. If that is BLOCKED, skip to P9.5-05.
File: new `apps/web/e2e/journey-anonymous.spec.ts`.
Walk what a first-time logged-out visitor sees: homepage, `/board`, `/picks`, one `/preview/...`
page. Assert for EACH: returns 200 and renders no Next.js error boundary; NO premium
selection/line/confidence value appears in the served HTML; the paywall/upgrade affordance IS
present — an un-entitled visitor must be told what they'd get, never shown a dead end or a false
"nothing available" (see P7-10, which fixes exactly that bug on `/preview`).
**VERIFY:** test passes; commit. Journal any page that 500s or renders empty.

### P9.5-03 — Signup + auth journey · STATUS: TODO · STRIKES: 0
File: new `apps/web/e2e/journey-auth.spec.ts`.
Cover: the signin page renders with its provider button(s); a protected route (`/dashboard` or
`/cockpit`) redirects a logged-out user to signin rather than 500ing or leaking content; and the
post-auth `callbackUrl` cannot be pointed at an external origin — try `//evil.com`,
`/\evil.com`, and `https://evil.com`, asserting each is rejected or normalized to a same-origin
path. Google OAuth itself cannot be driven in a test: assert the redirect TARGET is correct rather
than completing a real third-party login.
**VERIFY:** test passes; commit. The open-redirect assertions are the security-valuable half — keep
them even if the OAuth half proves untestable.

### P9.5-04 — Checkout journey, Stripe TEST mode only · STATUS: TODO · STRIKES: 0
File: new `apps/web/e2e/journey-checkout.spec.ts`.
Assert the pricing page renders real prices, and that clicking upgrade creates a checkout session
and redirects to a Stripe-hosted URL — assert the redirect target's HOST only. Do NOT complete a
payment on Stripe's domain; that is out of scope and must never involve a real card.
Then, separately and without the browser, assert at the API level that
`/api/subscriptions/checkout` refuses an unauthenticated request and refuses a client-supplied
price or tier (the client must never choose what it pays — the server does).
**VERIFY:** test passes; commit. If `STRIPE_SECRET_KEY` is absent locally, session creation will
fail — that is EXPECTED. Assert the typed 503 fail-closed path instead and note it in the journal.
Do NOT add a key to make it pass.

### P9.5-05 — Entitlement-grant correctness (the money-in / product-out seam) · STATUS: TODO · STRIKES: 0
**LAUNCH-CRITICAL. Start here if the e2e harness blocked.**
Not a browser test — a focused integration test. File: new
`apps/web/__tests__/journey-entitlement-grant.test.ts`.
This is the most financially dangerous seam in the product: a customer pays and does NOT receive
access. With the Stripe SDK mocked, assert: `checkout.session.completed` for a known price id
grants the correct tier; `customer.subscription.deleted` revokes it; the SAME webhook delivered
twice grants exactly once (idempotency); a webhook for an UNKNOWN price id does not silently
downgrade a paying member; and a webhook with a failing signature grants nothing.
Read `apps/web/app/api/webhooks/stripe/route.ts` and the existing
`apps/web/__tests__/stripe-webhook-route.test.ts` FIRST — do not duplicate coverage that already
exists. Add only what is genuinely missing and say in the journal which assertions were already
covered.
**VERIFY:** `npx vitest run apps/web/__tests__/journey-entitlement-grant.test.ts` passes; commit.

### P9.5-06 — Cancellation, downgrade, and refund path · STATUS: TODO · STRIKES: 0
**LAUNCH-CRITICAL.** Extend the P9.5-05 file or add a sibling.
Assert: a cancelled subscription retains access until period end and only then revokes (revoking
early triggers refunds and chargebacks); a failed payment follows the documented dunning/grace
behavior rather than instant lockout; a refunded charge revokes access.
Read the real implementation first and TEST WHAT IT ACTUALLY DOES. If real behavior differs from
what a paying customer would reasonably expect, that mismatch is a finding for
`handoff/LAUNCH_BLOCKERS.md` — do not silently encode it as correct.
**VERIFY:** tests pass; commit; any expectation mismatch written up as a finding.

### P9.5-07 — Legal surface adequacy audit (READ-ONLY) · STATUS: TODO · STRIKES: 0
**LAUNCH-CRITICAL.** Read IN FULL: `apps/web/app/terms/`, `apps/web/app/privacy/`,
`apps/web/app/responsible-play/`, `apps/web/app/about/`, `apps/web/app/contact/`, plus everything
under `docs/compliance/` and `docs/legal/`. Write `handoff/LEGAL_SURFACE_AUDIT.md` assessing
PRESENCE and COVERAGE — not legal validity; you are not a lawyer and the file must say so.
For each, answer with file:line evidence: does Terms state what is sold, the refund policy, and a
limitation of liability? Does Privacy state what is collected, why, retention, and how to request
deletion? Is there an explicit "not gambling advice / no guaranteed outcome" disclaimer? Is
age-gating (18+/21+) present anywhere in signup or checkout — grep for it and report honestly if
it is ABSENT? Is there a visible support route for a paying customer with a billing problem?
Verdict per item: PRESENT / PARTIAL / ABSENT.
**VERIFY:** every item has a verdict backed by a real citation. Header the file:
"Coverage audit by a non-lawyer. Adequacy requires human legal review." Do not write legal text.

### P9.5-08 — Public claims vs. actual behavior (truth audit, READ-ONLY) · STATUS: TODO · STRIKES: 0
**LAUNCH-CRITICAL.** The product's whole pitch is honesty, so a claim the code cannot back is both
a trust failure and a potential deceptive-advertising problem. Grep the public surfaces (homepage,
`/about`, pricing, `/accountability`, landing copy) for every quantitative or capability claim —
win rate, accuracy, "verified", "proven", model counts, "real-time", guarantees.
Trace each to whether the code substantiates it. Record CLAIM -> SUBSTANTIATED (file:line) /
UNSUBSTANTIATED / CONTRADICTED in `handoff/CLAIMS_TRUTH_AUDIT.md`.
Give specific attention to any stated win rate or edge figure: find where it is computed, confirm
it derives from settled real results and not seeded/bootstrap/demo rows, and confirm the public
number matches the computation. A published number that cannot be traced to settled data is a
launch blocker.
**VERIFY:** every claim found has a row; no silent omissions. Report only — do not edit copy here.

### P9.5-09 — Observability readiness: what is actually ON in production · STATUS: TODO · STRIKES: 0
**LAUNCH-CRITICAL.** Read `apps/web/lib/observability/` and every integration point. For EACH tool
(Sentry, PostHog, others) determine whether it is genuinely active or silently no-ops without an
env key — note that `sentry.ts` reads `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` and no-ops when
absent, so shipping without those means **zero error visibility in production**.
Write `handoff/OBSERVABILITY_READINESS.md`: tool -> required env var NAME -> active or no-op ->
what is lost if it stays off. Then answer concretely: if the board silently stopped refreshing at
3am, what would surface that, and to whom? If the answer is "nothing", say so plainly — that is
the finding.
**VERIFY:** every tool accounted for. Env var NAMES only, never values.

### P9.5-10 — Incident response + rollback runbook · STATUS: TODO · STRIKES: 0
**LAUNCH-CRITICAL.** Write `handoff/INCIDENT_RUNBOOK.md` from what the repo actually supports —
read `vercel.json`, the cron routes, `scripts/deploy/`, and existing ops docs. Do not invent
procedures.
Cover: telling degraded from down; forcing a board refresh; disabling a broken feature fast (list
the real kill-switch env vars/flags that exist); rolling back a bad deploy — **the repo's own prior
finding records that this deployment is alias-based and `vercel rollback` does NOT work here, so
establish what the real revert path actually is**; diagnosing the DB as the cause; and what to do
if paid ingestion 401s or the payment circuit opens.
Where the repo supports no answer, write "NO PROCEDURE EXISTS" rather than inventing one.
**VERIFY:** every procedure cites the real file or flag implementing it; gaps named explicitly.

### P9.5-11 — Scale + limits sanity (READ-ONLY, generate no load) · STATUS: TODO · STRIKES: 0
Do NOT run a load test against production or any live service. This is static analysis of ceilings.
Write `handoff/SCALE_LIMITS.md` covering: the DB connection model (pooled/serverless driver, or
would a spike exhaust connections — Neon has hard connection limits and prior notes record "Neon DB
unreachable" as a real past incident); which API routes do unbounded `findMany` with no `take`;
which routes are anonymous, uncached, and DB-heavy (cross-reference
`handoff/RATE_LIMIT_COVERAGE.md`, which already found 114 unprotected routes); and any Vercel
function timeout/memory ceiling a slow query would blow.
**VERIFY:** every claim cites file:line or a config value. Close with an explicit answer to:
"if 10,000 people arrive in one hour, what breaks first?"

### P9.5-12 — Launch-blocker consolidation · STATUS: TODO · STRIKES: 0
Read every artifact this phase produced, plus `handoff/DEPLOY_READINESS.md` if it exists. Write
`handoff/LAUNCH_BLOCKERS.md` — the single document the owner reads before deciding to launch.
Structure: (1) **BLOCKING** — cannot launch, with why and the specific fix; (2) **RISK ACCEPTED** —
can launch, but the owner should knowingly accept it; (3) **POST-LAUNCH** — genuinely can wait.
Then **"ONLY THE OWNER CAN DO THESE"**, kept short and specific: legal review, production env keys,
making a real test purchase, the merge/deploy decision, launch timing.
Sort BLOCKING by how much money or trust is lost if shipped without it — not by technical severity.
Be honest about what is genuinely blocking versus what is perfectionism: the owner is losing
revenue every day the site is unlaunched, so a padded blocking list has a real cost.
**VERIFY:** every BLOCKING item traces to a finding produced by a real task, not an assumption.

---

# PHASE 10 — RECURRING BATTLE-TEST (owner doctrine, 2026-08-15 — does not stop at Phase 9)
*Owner's standing directive: "we can't launch a website off one or two audits ... this has to be*
*battle tested time and time again." One audit pass is proof you looked once, not proof it's clean.*
*This phase is the definitive tail loop — LOOP FOREVER through P10-01..04, incrementing the round*
*counter in `handoff/BATTLE_TEST_LOG.md`, for as long as this sprint runs. Do not stop after one*
*round. Round N+1 must independently re-derive facts — reading round N's conclusions first and*
*copying them forward defeats the entire point.*

**Why this exists, concretely:** this session already found MULTIPLE previously-"DONE",**
**previously-audited tasks that were actually broken or never committed — Phase 4/5's own**
**non-committing bug, a live-breaking vendor-auth regression, a wrongly-gated settlement path,**
**and a stale watchdog rule silently reverting real work.** One pass missed all of these. Assume
the current tree has more of the same, and go find it.

### P10-01 — Audit the audit: re-verify every DONE task against its real commit · STATUS: TODO · STRIKES: 0
For EVERY task in Phases 0-9 marked DONE, do not trust the STATUS field or the journal entry's
prose. Independently confirm: (a) a real git commit exists whose diff matches what the task
claimed to do — `git log --all --oneline --grep` or a manual `git show` search; (b) if the task
had a VERIFY step naming a test file, that test file exists and currently passes when you run it
right now, not just what the journal claims it showed at the time. Write findings to
`handoff/BATTLE_TEST_LOG.md` under a `## Round N — P10-01` heading: a table of task id -> commit
hash found (or NONE) -> test re-run result (pass/fail/no-test). Any task with NONE for commit hash
or a failing re-run is a real regression — reopen it as a new task at the END of this file with
STATUS TODO and a note citing which round found it.
**VERIFY:** every DONE task in Phases 0-9 has a row in the round's table, no silent skips.

### P10-02 — Fresh blind re-audit of the original 15 domains · STATUS: TODO · STRIKES: 0
Re-run Phase 2's structure (D1 Auth through D15 Types/coverage) as if `handoff/AUDIT_FINDINGS.md`
does not exist yet — read the actual current code fresh, form your own findings first, THEN open
`AUDIT_FINDINGS.md` and reconcile: what did the original audit miss, what has changed since
(new files, new commits, new dependencies) that it never saw, what did it get wrong. A domain
where your fresh pass agrees with the original word-for-word is suspicious, not confirmation —
re-read it once more before accepting that. Append new findings to `AUDIT_FINDINGS.md` continuing
the GSE-SEC-0NN numbering (check the highest existing number first), each tagged with which round
found it in `BATTLE_TEST_LOG.md`.
**VERIFY:** `BATTLE_TEST_LOG.md` states explicitly, per domain, "same as before" or "new finding"
or "original finding no longer applies" — no domain left unaddressed.

### P10-03 — Hunt the "confidently wrong claim" bug class specifically · STATUS: TODO · STRIKES: 0
This exact bug class has been found THREE times this session: a code comment or commit message
makes a specific, confident technical claim about how something external behaves (a vendor's auth
mechanism, what another code path does, what a library does on a given input) — and the claim is
simply wrong, never verified against the real thing. Grep the codebase for comments near
`fetch(`, third-party client construction, and any comment citing a specific external repo, API
doc, or "per the X spec" — for each one found, verify the claim against the ACTUAL current
behavior (read the vendor's real code/docs if vendored, or reason carefully from first principles
if you cannot reach the network) rather than trusting the comment. List every claim you could not
independently verify as `CONFIDENCE: unverified` in `BATTLE_TEST_LOG.md`, and every claim you
proved wrong as a new finding.
**VERIFY:** at least every file touched by this sprint (see
`git log --name-only origin/main..HEAD`) is covered, not just a sample.

### P10-04 — Working-tree and history hygiene sweep · STATUS: TODO · STRIKES: 0
Re-run `git status` and look for anything uncommitted, anything that looks like the P4/P5
non-committing bug recurring. Re-check `git status --ignored -- handoff/` for any real deliverable
that's gitignored and silently untracked (the class of bug that ate `REMEDIATION_ROADMAP.md` and
`RATE_LIMIT_COVERAGE.md` earlier). Check `git worktree list` for anything stray. Check whether the
two-agent collision (Codex + Laguna both committing) has caused any NEW duplicate/discarded work
since the last round.
**VERIFY:** a clean report either way, written to `BATTLE_TEST_LOG.md`.

### P10-05 — Close the round, start the next one · STATUS: TODO · STRIKES: 0
Increment the round number. Summarize the round in `BATTLE_TEST_LOG.md`: findings count vs the
previous round (should trend down as the tree gets cleaner, not stay flat — flat or rising across
3+ rounds means something structural is still wrong and deserves a note flagging it for Garrett,
not silent repetition). Then go back to P10-01 and start the next round. **This does not end.**
**VERIFY:** the round counter incremented; P10-01 status reset to TODO for the next pass.

---

## WHEN THE QUEUE IS EXHAUSTED — INFINITE SAFE BACKLOG
Do NOT invent new scope. Do NOT start a refactor. Do NOT touch anything in the SCOPE GUARD above.
Work these in priority order, forever, one item per session:
1. Re-run `CI=1 npm test`. Fix any category-(b) regression you find, commit it.
2. Take the next unfixed SAFE-DIRECT item from `handoff/REMEDIATION_EXECUTION.md` and fix it,
   repeating the P8-02 pattern for as long as items remain.
3. Convert a `hypothesis` finding in `handoff/AUDIT_FINDINGS.md` into `confirmed` or `refuted` by
   tracing the actual code; record the evidence in that file and commit.
4. Deepen any domain marked `partial` in `handoff/AUDIT_COVERAGE.md`, appending evidence.
5. Pick the next unprotected route from `handoff/RATE_LIMIT_COVERAGE.md` and rate-limit it per P9-03.
6. Pick one file with the most `any` / `as any` / `@ts-ignore` in code this sprint already touched
   and tighten its types, with a test proving behavior is unchanged.
Each of these is bounded, reversible, and cannot break the build. Journal every one.

