# AUDIT FINDINGS — Sports Intelligence OS (read-only adversarial audit)

Auditor: Hermes (overnight run, branch `claude/fable-5-ultracode-plan-ptru4e`)
Date: 2026-08-12 (UTC 04:5x)
Method: repo guardrails first (14 run, 13 pass), `npm audit --omit=dev` (9
findings), then targeted code reads across D1–D15. Read-only: no source changed.

---

## (1) EXECUTIVE SUMMARY

The repo's own posture is unusually strong: 13/14 guardrails pass, the auth
stack re-resolves roles from the DB every request and never fail-opens to
ADMIN, the Stripe webhook verifies signatures and defends against out-of-order
and replayed events, the paywall is enforced in the SQL query (premium rows are
never returned to FREE sessions), and the free-first data layer orders sources
by marginal cost with a spend guard. The dominant risk is NOT app logic — it is
the dependency tree: next-auth/@auth/core carry 2 CRITICAL advisories
(homoglyph email bypass; fail-open auth object), next has a deserialization DoS,
and the build chain (postcss) has an arbitrary-file-read advisory. Secondary
risks: rate limiting covers a small fraction of API routes, CSP allows
unsafe-inline/unsafe-eval, and three pre-existing tracked-debt failures keep CI
red (model-freeze #419, api-v1-boundary #420, typecheck #421) — all documented,
none caused by this branch.

## (2) SEVERITY HISTOGRAM

Critical: 2 · High: 5 · Medium: 5 · Low: 3 · Info: 3

## (3) TOP 10

1. CRITICAL — next-auth/@auth/core advisories (homoglyph email bypass, fail-open auth object) — auth stack, unpatched.
2. CRITICAL — next-auth beta-range config-error fail-open (GHSA-8fpg-xm3f-6cx3).
3. HIGH — next deserialization DoS (GHSA-h25m-26qc-wcjf) + Image Optimizer DoS.
4. HIGH — postcss arbitrary file read via sourceMappingURL (build chain).
5. HIGH — fast-uri host-confusion + brace-expansion/nanoid DoS (transitive).
6. MEDIUM — rate limiting on 8/176 API routes.
7. MEDIUM — CSP script-src allows 'unsafe-inline' 'unsafe-eval'.
8. MEDIUM — typecheck debt #421 touches autonomy executor allow-list (governance).
9. MEDIUM — api-v1 route tree pre-promotion (#420, tracked debt, guard holds).
10. LOW — model-freeze debt #419 (process/evidence debt; guard honestly red).

---

## Findings register

### [CRITICAL] GSE-SEC-001 — next-auth/@auth/core vulnerable; auth stack unpatched
- OWASP / CWE: A06 / CWE-1104 (supply chain); CWE-180 (homoglyph), CWE-285/636 (fail-open)
- Confidence: confirmed (npm audit metadata)
- Location(s): `handoff/npm-audit.json`; `apps/web/lib/auth.ts:23-74` (NextAuth config)
  - GHSA-7rqj-j65f-68wh: @auth/core <0.41.3 — Email normalizer validates the address BEFORE Unicode normalization, allowing a homoglyph `@` bypass (critical, CWE-180).
  - GHSA-8fpg-xm3f-6cx3: next-auth 5.0.0-beta.* — configuration errors can populate the auth object with an error, making existence-based auth checks fail open.
  - GHSA-xmf8-cvqr-rfgj: @auth/core <0.41.3 — getToken() throws uncaught on malformed Bearer headers (7.5 DoS).
- Exploit / failure scenario: a crafted Google-adjacent email or a config error could bypass the email allow-list / role resolution; malformed Bearer headers 500 the session path.
- Blast radius: all sign-in / session endpoints; account-takeover-adjacent.
- Remediation sketch: upgrade next-auth + @auth/prisma-adapter + @auth/core to the patched line (≥0.41.3 / GA), re-run the full suite + agent:eval. Requires a change proposal (package.json touch).
- Effort: M

### [CRITICAL] GSE-SEC-002 — next-auth beta-range config-error fail-open (part of GSE-SEC-001 cluster, listed separately for severity)
- Confidence: confirmed via npm audit (advisory directly names the range in use)
- Location: `apps/web/package.json` (next-auth ^5.0.0-beta.*)
- Same remediation as GSE-SEC-001. Effort: M

### [HIGH] GSE-SEC-003 — next deserialization + Image Optimizer DoS
- OWASP / CWE: A06 / CWE-502 (deserialization), CWE-400/770 (DoS)
- Confidence: confirmed (npm audit)
- Location: `apps/web/package.json` (next 14.x); advisories GHSA-h25m-26qc-wcjf (>=13.0.0 <15.0.8), GHSA-9g9p-9gw9-jx7f (<15.5.10)
- Exploit: HTTP request deserialization can DoS self-hosted apps using insecure RSC; remotePatterns Image Optimizer config can be driven to DoS.
- Blast radius: availability of the public site.
- Remediation sketch: major Next upgrade (15.x+ patched) with a full regression run — change-proposal-gated.
- Effort: L

### [HIGH] GSE-SEC-004 — postcss arbitrary file read (build chain)
- OWASP / CWE: A06 / CWE-22, CWE-200
- Confidence: confirmed (npm audit), real-world exploitability low (requires attacker-controlled CSS comments in the build input)
- Location: postcss <=8.5.11 via build tooling (dev tree)
- Remediation: bump postcss ≥8.5.12 in devDeps; no runtime impact.
- Effort: S

### [HIGH] GSE-SEC-005 — transitive DoS cluster: fast-uri, brace-expansion, nanoid
- OWASP / CWE: A06 / CWE-400/770 (CWE-436 for fast-uri host confusion)
- Confidence: confirmed (npm audit; all via transitive deps)
- Location: fast-uri (<=3.1.4, host confusion via backslash authority — SSRF-adjacent if a URL parser consumes attacker input), brace-expansion (<5.0.8), nanoid (<3.3.17)
- Exploit: host-confusion can misroute URLs; brace-expansion/nanoid are algorithmic DoS.
- Remediation: `npm audit fix` for the non-breaking subset + change proposal for majors; re-run guards.
- Effort: S–M

### [MEDIUM] GSE-SEC-006 — rate limiting covers 8 of 176 API routes
- OWASP / CWE: A04 / CWE-770
- Confidence: confirmed (grep: 8 route files import `@/lib/api/rate-limit`; 176 route.ts files exist)
- Location: `apps/web/app/api/**` (only admin/losses draft, cockpit studio generate, human/roster-availability, intelligence/roster-advice, picks/[id]/explain, room/[gameId]/model-court, subscriptions/checkout, subscriptions/portal)
- Exploit: unauthenticated or cheap endpoints without throttle (e.g., public GET boards, forms, any LLM surface added later) can be looped for DoS or denial-of-wallet once an LLM surface is behind them.
- Blast radius: availability + spend.
- Remediation sketch: apply `consumeRateLimit` to every public/unauthenticated POST and any LLM-backed route; add an explicit audit step in the route checklist.
- Effort: M

### [MEDIUM] GSE-SEC-007 — CSP allows 'unsafe-inline' 'unsafe-eval' in script-src
- OWASP / CWE: A05 / CWE-79 (weakened XSS defense)
- Confidence: confirmed (next.config, line 103)
- Location: `apps/web/next.config.*` — `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.clarity.ms …`
- Exploit: any injected inline script executes; eval-based payloads allowed. (XSS still needs a sink; CSP is defense-in-depth.)
- Remediation sketch: tighten after removing inline scripts (nonce/hash-based) — Next App Router can emit nonces; change-proposal-gated.
- Effort: M

### [MEDIUM] GSE-SEC-008 — autonomy executor allow-list type debt (#421, tracked)
- OWASP / CWE: governance — A04; CWE-285
- Confidence: confirmed (tsc output; issue #421)
- Location: `apps/web/lib/autonomy/execute-autonomy-cycle.ts:33` (`RUN_GENERATE_SIGNAL_SLATE` not in `AutonomyActionKind`), `lib/calibration/ranking-power-control.ts:227`, `lib/ops/proven-path-seed.ts:86` (`appliedPauseGroups` absent from options type)
- Exploit / failure scenario: the "obvious" fixes widen the autonomous-actions allow-list (authorization change) or guess whether ranking pause groups should flow through this path — either could silently change what runs unattended.
- Blast radius: autonomous execution authority.
- Remediation sketch: owner design decision per issue #421, then a deliberate, reviewed change; do NOT mechanically add the key.
- Effort: S (decision-gated)

### [MEDIUM] GSE-SEC-009 — API v1 route tree exists pre-promotion (#420, tracked)
- OWASP / CWE: governance — public-contract exposure
- Confidence: confirmed (guard output; issue #420)
- Location: `apps/web/app/api/v1/**` (openapi/, probabilities/, signals/) — the api-v1-boundary guard blocks accidental live routes until an owner-approved promotion exists.
- Exploit: if a route were live, external consumers could depend on an unversioned contract. Guard currently holds (CI red = intentional).
- Remediation sketch: decide remove-vs-promote per issue #420.
- Effort: S (decision-gated)

### [LOW] GSE-SEC-010 — model-freeze debt (#419, tracked)
- OWASP / CWE: governance — data-integrity (retroactive re-labeling)
- Confidence: confirmed (guard output; issue #419)
- Location: `scripts/guardrails/model-freeze.mjs` — MODEL_VERSION v5.2.6 has no IMPLEMENTED CalibrationProposal.
- Remediation: add the calibration artifact (option 1/2) or FROZEN marker (option 3, only if no scoring weights changed).
- Effort: S

### [LOW] GSE-SEC-011 — DEV_FAKE_ADMIN escape hatch exists (well-guarded)
- OWASP / CWE: A01 (defense-in-depth concern)
- Confidence: confirmed — but hard-gated in BOTH `middleware.ts:82` and `auth.ts:104` to `NODE_ENV !== "production"`.
- Exploit: only if NODE_ENV is mis-set in prod AND DEV_FAKE_ADMIN=true; double gate makes this unlikely.
- Remediation: none required; consider removing after launch.
- Effort: S

### [INFO] GSE-SEC-012 — /embed frames allowed from any origin (intentional)
- `next.config.*:80` `frame-ancestors *` for /embed — DEC-017 free embed widgets. Content is non-auth public data; clickjacking surface is minimal. Documented intent; no action.

### [INFO] GSE-SEC-013 — middleware does not cover /api/** (by design)
- `middleware.ts:101-106` matcher excludes api/; every API route must self-auth. Sampled routes (picks, checkout, model-court) all call `auth()` server-side. Recommend the route-checklist audit step (see GSE-SEC-006).

### [INFO] GSE-SEC-014 — auth cookie flags not re-asserted in middleware
- NextAuth v5 manages cookie flags (HttpOnly, Secure, SameSite=Lax) at the provider level; middleware never sets them. Hypothesis: flags are correct by default; manual step to confirm: inspect Set-Cookie on a sign-in in a prod-like env.

### [LOW] GSE-SEC-015 — B2B API rate limit is process-local (serverless caveat)
- OWASP / CWE: A04 / CWE-770
- Confidence: confirmed (code read)
- Location: `apps/web/lib/b2b/api-key-auth.ts` — `rateLimitB2b` uses a module-level `Map`; on serverless (Vercel) each instance has its own counter, so the effective limit scales with instance count.
- Exploit / failure scenario: not an exposure today (keys are the trust boundary and env-issued), but if self-serve key issuance is ever added, a key holder could exceed the intended throttle across instances.
- Blast radius: B2B spend/availability.
- Remediation sketch: move the counter to a durable store (Redis/DB) before any public key issuance; document the caveat in B2B_API.md.
- Effort: S–M

---

## (4) COVERAGE LEDGER → handoff/AUDIT_COVERAGE.md

## (5) PROPOSED REMEDIATION ROADMAP

**Now (safe, no change proposal):**
1. GSE-SEC-004 postcss bump (devDep, non-breaking).
2. GSE-SEC-005 `npm audit fix` non-breaking subset; re-run guards + full suite.
3. GSE-SEC-010 add the calibration artifact or FROZEN marker (#419) — decision needed first.
4. GSE-SEC-006 add rate limiting to remaining public endpoints (code change, no schema).

**Next (change proposal required):**
5. GSE-SEC-001/002 next-auth + @auth/core upgrade (package.json + full regression).
6. GSE-SEC-003 Next.js major upgrade (15.x patched) with full regression + preview deploy.
7. GSE-SEC-007 CSP tightening (nonce-based script-src).
8. GSE-SEC-008 autonomy allow-list design decision (#421).
9. GSE-SEC-009 api-v1 remove-vs-promote decision (#420).

**Later:**
10. GSE-SEC-011 remove DEV_FAKE_ADMIN after launch.
11. GSE-SEC-014 verify cookie flags in prod-like env; add explicit header test.
