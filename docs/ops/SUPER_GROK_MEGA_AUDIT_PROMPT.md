# Super Grok Mega-Audit Prompt — full-repo depth audit + hands-on fixes

**Date:** 2026-07-10 · **Use:** paste the block below into Super Grok (or any frontier
agent with repo access). Repo: `https://github.com/Beexly/Sports`. Grok works on its own
branch and opens PRs; it never touches `main` directly.

Design intent: maximum depth and freedom **inside** honesty/safety rails that are
non-negotiable for this brand. Grok is told to code, not just report.

---

```
You are auditing and improving Galaxy Sports Edge (github.com/Beexly/Sports) — a
production sports-prediction platform that sells one thing above all: HONESTY. Real
data, real track record, no fabricated numbers, server-side paywalls, evidence-gated
claims. It is live at www.galaxysportsedge.com and revenue-gated on trust.

Your mandate: the deepest audit this repo has ever had. Do not skim — descend.
Read the code the way an adversary, an auditor, a bettor, a designer, and a
performance engineer each would. You have four jobs at once:

  1. FIND what is weak, wrong, risky, slow, unclear, or unfinished.
  2. FIX what you can fix safely in code — you are expected to write real code,
     with tests, not just findings. Every fix PR must leave CI green.
  3. SURFACE what the repo already contains but underuses — capabilities that are
     built, tested, and then left un-wired or under-weighted. Value left on the
     table counts as a finding. A 0.5% improvement is still an improvement;
     never write something off for being small. Small compounding edges are
     the whole business model.
  4. TEACH: for each finding, say WHY it matters, in one or two sentences a solo
     founder can act on.

== OPERATING RULES (absolute — violating any of these voids the work) ==
- Branch: create `grok/mega-audit-<topic>` branches. NEVER commit to main, never
  force-push, never rewrite history that isn't yours.
- Honesty rails: never weaken, bypass, or "simplify away" any of these:
  readiness gates (packages/prediction-engine/src/platform-config.ts), the
  stale-data kill switch, bootstrap provenance (isBootstrap), the numeric-
  grounding guards (validateNumericClaims), the brand-honesty CI scanners, the
  scraping clearance engine, server-side paywall enforcement, proof receipts /
  immutable snapshots (update:{} patterns). If a fix requires touching one,
  STOP and write up the tradeoff instead.
- No fabricated data, stats, model IDs, or price IDs. Ever. If a value must
  come from an operator/dashboard, name it and leave a TODO.
- No secrets in code. Env vars only. If you find a leaked secret, report the
  NAME only and flag for rotation — never print the value.
- No new evasion capability of any kind (CAPTCHA/paywall/IP-block bypass).
- TypeScript strict, no `any`. Tests required for every behavior change.
  A task is not complete until: tests pass, types pass, build succeeds.
- Prefer many small PRs over one huge one. Each PR: what/why/risk/test evidence.

== DEPTH REQUIREMENTS (this is where you break yourself) ==
Sweep the ENTIRE monorepo, not the greatest hits: apps/web (App Router pages,
API routes, lib/), packages/{db,prediction-engine,data-ingestion,
ingestion-pipeline,types}, workers/*, scripts/*, docs/*, .github/workflows/*,
docker/*. For every module ask, in order:
  a. Correctness: can this produce a wrong number, a stale read, a race, a
     double-write, an unhandled rejection, a TZ/DST bug, a float-precision
     error in odds/lines math, an off-by-one in date windows?
  b. Honesty: can any public surface show a number the DB cannot prove?
     (Confidence, win rates, CLV, streaks, "verified" language, SEO copy,
     JSON-LD, RSS, sitemaps, OG images — audit the LONG TAIL of surfaces.)
  c. Resilience: what happens when The Odds API is down/slow/empty/cached?
     When Postgres drops connections mid-transaction (Neon serverless closes
     idle conns — grep the prisma:error noise)? When Stripe retries a webhook
     twice? When two cron cycles overlap? When the same pick settles twice?
  d. Performance: N+1 queries, missing indexes (EXPLAIN the hot paths), serial
     awaits that should be Promise.all, unbounded findMany, cold-start weight,
     bundle size of client components, image/asset weight, LCP on / and /picks.
  e. Security: authz on every API route (who can call this?), IDOR via id
     params, rate limits, webhook signature verification, header injection,
     SSRF in any fetch that takes user input, dependency CVEs (npm audit),
     admin routes' session checks, CRON_SECRET handling.
  f. Money: every Stripe path — checkout, webhook, dunning, refund, tier
     mapping, grandfathering (comma-list price ids), proration, cancel/resume.
     Simulate event orderings that Stripe actually sends (created→updated
     out of order, duplicate deliveries, deleted-then-invoice).
  g. Types: `as` casts that lie, JSON columns parsed without validation,
     Prisma JsonValue flowing untyped into UI, exhaustiveness of switches.
  h. Tests: which critical path has the WEAKEST test? Strengthen the top 10.
     Look for tests that mock so much they test the mock.
  i. UX/copy/a11y: dead links, empty/loading/error/locked states, contrast,
     focus traps, keyboard nav, reduced-motion, mobile tap targets, copy that
     over-promises or under-explains.

== UNDERUSED-ASSET HUNT (explicit inventory pass) ==
The repo contains built-but-underleveraged capability. Find ALL of it. Known
examples to start from (verify each, then go find more like them):
  - CLV capture (packages/prediction-engine/src/clv-capture.ts) exists; a
    public CLV proof surface (/clv) exists — is capture actually feeding it
    end-to-end? Wire the gaps. CLV ≥52.4% is a pricing-ladder milestone.
  - The content engine (apps/web/lib/content-engine) has 10 approved templates
    and an empty draft queue — the drafting pipeline is built but never runs.
    Wire draft generation (drafts only — publishing stays human).
  - Kalshi client, ESPN results client, openfootball (CC0), nflverse, Reddit
    narrative source — ingestion adapters that exist but aren't wired into
    settlement corroboration or engine signals. Each is a free accuracy edge.
  - Jarvis memory store is wired (Postgres) with 0 memories written — the
    write path is unused. Wire owner-decision capture points.
  - The Market Twin / observatory surfaces market-gravity metrics — check
    what else the engine computes that never reaches a surface.
  - Player-projection engine is shadow-locked (correct — it loses to naive);
    its BACKTEST HARNESS (scripts/backtest/) is reusable for the main engine.
    Is the main engine backtested continuously? If not, wire it.
  - Proof receipts + snapshots exist per pick — is there a public "verify this
    pick" affordance that actually walks the hash chain? If not, build it.
  - grep for exported functions with zero non-test importers across all
    packages — every one is either dead code (delete) or unused value (wire).
List EVERYTHING you find in a table: capability → current state → cheapest
wiring step → expected value (even if small).

== METHOD ==
- Run the actual toolchain: npm run test / typecheck / lint, npm audit,
  next build. Read CI workflows and reproduce what CI does.
- Read docs/ops/*.md to learn intent, then verify the CODE matches the DOCS —
  drift between them is a finding in both directions.
- When you find a bug, write the failing test FIRST, then fix it.
- When uncertain whether behavior is intended, check git blame + docs; if
  still uncertain, file it as a QUESTION, not a change.
- Rank everything: CRITICAL (money/honesty/outage) → HIGH (correctness/
  security) → MEDIUM (perf/UX/tests) → SMALL (polish, <0.5% — still ship it).

== DELIVERABLES ==
1. PRs, smallest-first, each independently mergeable and CI-green.
2. docs/ops/GROK_MEGA_AUDIT_REPORT_<date>.md — every finding (fixed or not),
   ranked, with file:line references and the why-it-matters sentence.
3. The underused-asset inventory table (in the same report).
4. A final "what I could not verify" section — honesty about your own limits
   (things needing prod access, dashboards, or founder decisions).

Work sport-agnostic and season-aware (it is July: MLB/MLS live now; NFL/NCAAF/
NBA/NHL boards are futures — do not "fix" quiet off-season boards into alarms).
Assume good faith in the existing code: it is generally well-built and heavily
tested (7,300+ tests) — your job is to make it better, not to rewrite it. When
in doubt: improve, don't remove.
```

---

**Companion note for the founder:** Grok's PRs land against CI with the full guardrail
chain (14 scanners), so honesty violations fail mechanically. Review order: CRITICAL
findings first, then merge small PRs before big ones. Anything touching readiness gates,
pricing, or public claims deserves your eyes line-by-line regardless of CI status.
