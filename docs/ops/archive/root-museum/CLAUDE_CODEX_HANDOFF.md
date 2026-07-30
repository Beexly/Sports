# CLAUDE + CODEX — Consolidated State-of-Intent & Open Items

**Purpose:** one place to look instead of ~15 overlapping handoff/pickup/phase docs left by
prior Claude Code + Codex sessions. Synthesizes prior intent, dedupes open items, and
reconciles old claims against this session's *verified* state.

**Author:** alignment pass, 2026-06-01. **Read-only synthesis** — no code/docs were modified.
**Evidence labels:** `verified` (reproduced or read directly from code/git this session) ·
`inferred` (read from a doc, not independently re-run) · `unverified` (claimed by a doc, could
not confirm, or contradicted) · `conflict` (docs disagree with each other or with current state).

**Brand-name caution up front (`conflict`):** the live code, domain, and every Codex doc say
**Galaxy Sports Edge / "GSE"** (`apps/web/lib/brand.ts`: `BRAND_NAME="Galaxy Sports Edge"`,
`BRAND_MONOGRAM="GSE"`, `galaxysportsedge.com`). The current `CLAUDE.md` and this session's
`_logs/DECISIONS.md` call it **"GSN / Galaxy Sports Network."** These are the same product under
two names. **GSE is what ships in code today.** Resolve before any public/brand work.

---

## Prior intent — what previous sessions were building, by phase

The product is a **calibrated, trust-first sports prediction platform** (Next.js 14 · Prisma ·
Postgres · Claude API for content only · The Odds API as source of truth). The throughline
across every doc: *win on provable honesty* — server-side paywall, bootstrap gates that hide
stats until a real track record exists, immutable signal snapshots, published losses, and a
hard "no fabricated stats / no auto-publish / no automated betting" doctrine.

- **handoff.md (Phases 1–9, `inferred`):** the chronological build log. Phase 1 audit/baseline →
  Phase 2 trust-claim integrity + operator cockpit (draft-only) → Phase 4 promotions, daily
  brief, calibration, source-intelligence → Phase 5 brief persistence + API → Phase 8 draft-only
  content engine → Phase 9 CI hardening. (Numbering is non-contiguous; "Phase 4/5" here predate
  the later Codex "Phase 3/4/5" product briefs and are a *different* track.)
- **Phase 9 (`PHASE_9_REPORT.md`, `inferred`):** CI/deploy hardening + an INTERNAL-ONLY
  calibration cockpit. Added three zero-dependency guardrail scripts (`trust-gate`,
  `model-freeze`, `draft-only`) and a 6-job CI workflow. Verdict: "GO for internal calibration
  only," with local install/build *unverified* (blocked by a sandbox FUSE/`npm install` bug).
- **V6 (`V6_HANDOFF.md`, `inferred`):** audited 13 uploaded zips, **rejected 9** (pirated IPTV
  keys, an unsigned-exe scraper, suspected web-shell PHP). Shipped pure-math engine helpers
  `kelly.ts` + `poisson.ts` (tested, *not* wired into scoring) and three launch docs. Tried to
  surface a Kelly "suggested stake" UI; the brand-safety linter reverted it (gambling-vs-
  intelligence brand line) — respected and rolled back.
- **Codex "Phase 3/4/5" briefs (`inferred`, forward-looking):** a far more ambitious roadmap
  citing a master plan + `docs/product/*-spec.md`. P3 = creator layer (Galaxy Studio, Game
  Intelligence Rooms, Twitter+Discord bots, Model Journal, Loss Autopsy, pre-mortem pipeline);
  P4 = engagement/tools (calibration training, 9-tool Edge Lab, Model Court Q&A, Chrome
  extension, public CSV/receipts, affiliate deeplinks); P5 = platform (programmable DSL,
  Anti-Galaxy adversary model, cross-sport correlation, live war room, B2B widgets/API,
  compliance toolkit). These are **specs/intent**, not confirmed-shipped here.

---

## Completed (per the docs — labels reflect what this session could confirm)

- **Core platform is real and green (`verified`).** This session's baseline (`_logs/DECISIONS.md`,
  `REPO_INTELLIGENCE_REPORT.md`): `npm install` ok, Prisma v5.22 generates, **typecheck green
  across 9 workspaces**, full test suite green (apps/web ~1,861 · engine 213 · ingestion 17 ·
  types 28). Surface: 48 API routes, 60 pages, 6 packages, 3 workers. **Caveat:** apps/web tests
  run against a **stub Prisma** (no live DB coverage).
- **Phase 9 guardrails + internal calibration cockpit (`inferred`→partly `verified`):** the
  guardrail scripts and `/cockpit/calibration` exist; trust-gate runs clean this session (269–271
  files). Phase 9's lint/typecheck/test/build were *unverified at the time* but are green now.
- **V6 engine math (`verified` exists):** `packages/prediction-engine/src/kelly.ts` + `poisson.ts`
  present and exported; still guarded / not in the scoring path.
- **Brand pivot PickPilot → Galaxy Sports Edge (`verified` in code):** `brand.ts`, OG image,
  taglines, social handles (`@GalaxySportsAI`, `galaxysportsedge` IG/FB/Threads), `hq@` email.
- **Infra provisioning claimed done (`unverified` / `conflict`):** `CODEX_FINAL_INFRA_HANDOFF.md`
  claims Neon + Upstash provisioned via Vercel, `deploy:ready` green except Anthropic 401, and
  production previously "live, 1 warning." **None of this is reproducible in this container** (no
  live `DATABASE_URL`/keys; tests use stub Prisma). Treat "deployed/live" as unconfirmed — see
  Reconciliation.
- **Deeper Codex roadmap partially landed (`inferred`):** the separate `docs/ops/decision-log.md`
  (46 KB, distinct from `_logs/DECISIONS.md`) logs real progress on Model Journal persistence,
  deterministic Journal composer, Model Court prompts, and calibration-insight wrappers — so
  P3/P4 work was at least partially executed on the "primary clone."

---

## Open / unfinished / explicit TODOs (deduplicated, prioritized)

Ordered by leverage. Each item cites the doc(s) it came from. Items already handled in this
session's `_logs/DECISIONS.md` are marked **[DONE this session]** so they aren't re-litigated.

### P0 — ship/trust blockers
1. **Rotate the Anthropic API key** — current key returns HTTP 401. Recurs in `CLAUDE_PICKUP.md`,
   `CODEX_FINAL_INFRA_HANDOFF.md`, `CODEX_FINISH_PROMPT.md`, `CODEX_HANDOFF.md`. Note: a later
   Codex change made the deploy gate content-flag-aware so a 401 only blocks if
   `PUBLIC_BLOG_ENABLED=true` (`CODEX_FINISH_PROMPT.md`). `unverified` here. **(owner/secret action)**
2. **Provision live infra + push env vars** — Neon Postgres (`DATABASE_URL` pooled + `DIRECT_URL`
   direct), Upstash Redis (`REDIS_URL`), into Vercel Production. `CLAUDE_PICKUP.md`,
   `CODEX_PICKUP_V2.md`, `LAUNCH_TONIGHT.md` (steps 8–9 "signup pending"), `CODEX_HANDOFF.md`
   block 4. **Conflicts** with `CODEX_FINAL_INFRA_HANDOFF.md` which says these are *already* done.
   **(owner action; verify which is true before re-provisioning)**
3. **Run `db:push` against the live DB, then one real ingestion cycle** and confirm `IngestionRun`
   + `SourceSnapshot` rows are written before trusting the pipeline. `CLAUDE_PICKUP.md`,
   `CODEX_FINAL_INFRA_HANDOFF.md`, `CODEX_PICKUP_V2.md`.
4. **Re-grade any away-favored SPREAD picks settled under the old buggy logic** — **[DONE this
   session]** the bug is fixed in code (`_logs/DECISIONS.md`, P0 fix), but historical rows in a
   real DB would still be mis-graded. **(operator action, needs live DB)**

### P1 — reliability / correctness (engineering)
5. **Settlement reliability residual** — **[DONE this session]** shared `settleSport()` extracted +
   cron wired (`_logs/DECISIONS.md`). Residual still open: add a **"stale unsettled picks" alert**
   and an **integration test against a disposable Postgres** (R1/R3 in `REPO_INTELLIGENCE_REPORT.md`).
6. **Calibration semantics — confidence treated as P(win)** — **[partially DONE this session]**
   (market-neutral `discrimination` metric added). Deeper fix still open and **human-gated**:
   persist a modeled win-probability distinct from the confidence UX score; make proposals
   market-aware; bump `MODEL_VERSION`. `REPO_INTELLIGENCE_REPORT.md` §5, R2.
7. **Wire CLV into the public calibration panel** — **[DONE this session: CLV primitive +
   panel exist]**; still needs **lock-time closing-line capture** + a route/UI to populate it
   (`_logs/DECISIONS.md`). 
8. **Model routing + prompt caching** — every Claude call hardcodes `claude-sonnet-4-6` (15×);
   no Haiku/Opus tiering, no caching. Add `pickModelForSurface()`. R6,
   `REPO_INTELLIGENCE_REPORT.md` §6. *(NOT in this session's log — see summary.)*
9. **Dependency / vuln triage** — 13 npm vulns (1 critical, 4 high); EOL deps (eslint 8, glob 7,
   rimraf 3). R4. *(NOT in this session's log.)*
10. **Single odds provider + thin `MIN_BOOKMAKERS=2` floor** — add a failover provider and/or
    down-weight <4-book markets. R5, `REPO_INTELLIGENCE_REPORT.md` §4. *(NOT in this session's log.)*
11. **`packages/db/prisma/seed.ts` integrity** — Phase 9 reported it **truncated at line 671** in
    that sandbox; confirm it's whole before relying on `db:seed`. `PHASE_9_REPORT.md` §9.2.
    *(NOT verified this session.)*

### P1 — Codex product roadmap (large, mostly spec-only here)
12. **Phase 3 deliverables** — Galaxy Studio, Game Rooms, Twitter bot, Discord bot, Model Journal,
    Loss Autopsy schema, pre-mortem pipeline. `CODEX_PHASE_3_BRIEF.md`. Specs in `docs/product/*`;
    decision-log shows Journal/pre-mortem partially landed. Completion state here **unverified**.
13. **Phase 4 deliverables** — calibration training, Edge Lab (9 tools), Model Court Q&A, Chrome
    extension, public CSV/receipts, affiliate deeplinks. `CODEX_PHASE_4_BRIEF.md`.
14. **Phase 5 deliverables** — programmable DSL, Anti-Galaxy model, cross-sport correlation, live
    war room, B2B widgets/API, compliance toolkit. `CODEX_PHASE_5_BRIEF.md`.
15. **Scratch→primary clone sync** — `SCRATCH_TO_PRIMARY_COPY_MANIFEST.md` says 33 template files
    + specs needed copying from the scratch clone to the primary clone so bots/Studio could wire
    compliance. The referenced **master plan `docs/galaxy-sports-edge-master-action-plan.md` does
    NOT exist in this container** (`verified` missing) though `docs/product/*` and
    `docs/ops/decision-log.md` do. Sync state here **unverified**.

### P1/P2 — owner decisions blocking phases (`DEC-OPEN-*`, from phase briefs)
16. **Trust-gate flip** (`PERFORMANCE_STATS_ENABLED` false→true) — biggest content-policy call;
    blocks full P4 data surfaces. `CODEX_PHASE_4_BRIEF.md` Step 1.
17. **Affiliate program enrollment** (DK/FD/MGM/Caesars…) — needs licensing review.
    `CODEX_PHASE_4_BRIEF.md` Step 8.
18. **B2B + toolkit pricing tiers**, **Anti-Galaxy public-surface timing**, **WebSocket exception**
    for war room. `CODEX_PHASE_5_BRIEF.md`.

### P2 — launch ops, brand, hygiene (mostly owner / non-code)
19. **Resolve GSE-vs-GSN brand name** — `conflict` between code/Codex docs and `CLAUDE.md`/this
    session's log. **(decision needed)**
20. **Pricing reconciliation** — **[DONE this session]** repriced to monthly Founding ladder; old
    `$19/$49` references in Codex docs + `LAUNCH_TONIGHT.md` are now stale (see Reconciliation).
21. **Create real Stripe products/prices** (test mode) and set the 4 interval price-IDs —
    `_logs/DECISIONS.md` explicitly leaves this as an operator action; `LAUNCH_TONIGHT.md` step 9
    uses `price_placeholder`.
22. **Google Workspace `hq@` mailbox + SPF/DKIM/DMARC**, **delete corporate-voice X post + repost
    founder version**, **Canva launch card for IG/FB**, **grant FB permission to the Chrome
    extension**, **delete the disabled old Anthropic key after 48h**. All in `CODEX_HANDOFF_2.md`
    "What still needs YOU." **(owner actions)**
23. **Rotate the Odds API key** that was pasted into chat. `CLAUDE_PICKUP.md`, `V6_HANDOFF.md`.
24. **Repo hygiene** — prune `_overnight_quarantine/` (stray `index.lock`/`.bad` files) and
    consolidate the ~15 handoff docs (this file is step one). R7, `REPO_INTELLIGENCE_REPORT.md`.
25. **Front-end / brand backlog** (~18 items, none launch-blocking) — "Slate" hero interaction,
    `/vs/tout-services` copy, `next/font` migration, `pickpilot-kit.css`→`gse-kit.css` rename,
    pick-card hover polish, dynamic sitemap lastmod, etc. Full list in `CODEX_HANDOFF_2.md`.
26. **Legal review of The Odds API commercial-redistribution terms** + a per-state operations
    matrix. `REPO_INTELLIGENCE_REPORT.md` §7. **(human/legal task)**

---

## Deploy / infra status — what the handoffs say is needed to ship

The infra handoffs converge on a **"ship dark, open one gate at a time"** model
(`docs/ops/GO_LIVE_RUNBOOK.md`, `LAUNCH_TONIGHT.md`):

1. **15 required env vars** in Vercel Production, validated by `node scripts/check-deploy-readiness.mjs`
   (it fails the deploy if `DEV_FAKE_ADMIN` or `DEMO_PICKS_ENABLED` are true in prod). `verified`
   that the runbook + script exist; live values `unverified`.
2. **Accounts/services:** Vercel (host + cron), Neon/Supabase Postgres, Upstash Redis, The Odds
   API, Stripe (test → live), Google OAuth, Anthropic (stays OFF at launch), domain.
3. **DNS:** `galaxysportsedge.com` apex CNAME → `…vercel-dns-017.com` + TXT verify + `www` CNAME,
   all **"DNS only" (gray cloud)** in Cloudflare (orange-cloud breaks Vercel SSL).
   `CODEX_FINAL.md` blocks 4–5. `unverified` whether DNS is currently wired/valid.
4. **Vercel build override** (if `vercel.json` is ignored): build `cd ../.. && npm run db:generate
   && npm run build --workspace=@sports/web`, install `cd ../.. && npm install`, root `apps/web`.
   `CODEX_FINAL.md`, `CODEX_FINISH_PROMPT.md`.
5. **`vercel.json` crons** (`refresh-odds` 30m, `settle-picks` 15m, `jarvis-snapshot` hourly),
   all `CRON_SECRET`-gated fail-closed. Added in `CLAUDE_PICKUP.md`; `inferred` present.
6. **Sequence to ship:** rotate Anthropic key → `deploy:ready` green → `db:push` → one real
   ingestion (confirm rows) → `vercel --prod` → `smoke:prod` (expect "all green" or "live, N
   warnings"; `/api/health` 503 until DB/Redis live). `CODEX_FINISH_PROMPT.md`,
   `CODEX_FINAL_INFRA_HANDOFF.md`, `CODEX_HANDOFF.md`.
7. **Gate-flip cadence after live (`LAUNCH_TONIGHT.md`):** Day 7 `DERIVED_MODEL_HISTORY_ENABLED`
   (~30 settled) → Day 14 `PUBLIC_PICKS_ENABLED` → Day 21–30 `PERFORMANCE_STATS_ENABLED` (≥100
   canonical) + enable paywall → Day 30 Stripe live mode.

**Bottom line (`conflict`/`unverified`):** docs disagree on whether the site already deployed.
`CODEX_FINAL_INFRA_HANDOFF.md`/`CODEX_HANDOFF_2.md` assert production is live at
galaxysportsedge.com; the `GO_LIVE_RUNBOOK` treats go-live as an unstarted owner action; this
session could not reach any live infra. Assume **NOT confirmed-live** until `smoke:prod` is re-run.

---

## Reconciliation notes (where docs disagree — with each other or with verified state)

- **Brand name (`conflict`):** code + all Codex docs = **Galaxy Sports Edge / GSE /
  galaxysportsedge.com** (`verified` in `apps/web/lib/brand.ts`). `CLAUDE.md` + this session's
  `_logs/DECISIONS.md` = **GSN / Galaxy Sports Network**. Phase briefs call the brand name
  "locked (DEC-011)." **GSE is the shipped reality.**
- **Pricing (`conflict`, resolved this session):** `CODEX_FINAL_INFRA_HANDOFF.md`/`LAUNCH_TONIGHT.md`
  reflect **Pro $19/mo · Elite $49/mo** (and an older `$9.99/wk`); `CLAUDE.md` still lists $19/$49.
  This session **repriced** to a Founding monthly+annual ladder — **Pro $14.99/$99 · Elite
  $24.99/$179** — via `apps/web/lib/pricing/pricing-phases.ts` (`verified` in code + git
  `87f86d2`). All `$19/$49`/weekly references in the older docs are **stale**.
- **Deploy/live status (`conflict`):** see Deploy section bottom line — "live" is claimed by two
  Codex docs, contradicted by the runbook and unconfirmable here.
- **Two parallel decision logs (`verified`):** `_logs/DECISIONS.md` (this session, GSN-labeled,
  created 2026-06-01) vs `docs/ops/decision-log.md` (46 KB, GSE-labeled, the Codex/phase track).
  They do not cross-reference; future agents should treat **`_logs/DECISIONS.md` as the most
  recent verified state** and `docs/ops/decision-log.md` as the older roadmap trail.
- **Two "Phase 4/5" numbering schemes (`conflict`):** `handoff.md` Phases 4–5 (brief/calibration)
  are a *different, earlier* track than the Codex `CODEX_PHASE_4/5_BRIEF.md` (tools/platform).
  Don't conflate them.
- **Master action plan missing (`verified` missing):** phase briefs + the copy manifest repeatedly
  cite `docs/galaxy-sports-edge-master-action-plan.md` as source-of-truth; it is **not in this
  container**. The `docs/product/*-spec.md` files and `docs/ops/decision-log.md` it references *do*
  exist. So briefs are executable from the specs, but the top-level plan they anchor to is absent.
- **"Sandbox blockers" in old docs are obsolete (`verified`):** Phase 9 / V6 / Codex handoffs spend
  pages on a Windows/bindfs `npm install` + `.git/index.lock` failure and "could not run
  tests/build/commit." This session's environment has **none of those problems** — install,
  typecheck, full test suite, and git all work. Ignore the sandbox-recovery instructions.
- **Mode tension (`conflict`):** `README.md` declares "**internal calibration only** — no
  auto-publish/send." `LAUNCH_TONIGHT.md`/Codex docs push toward a live public marketing launch.
  Both are internally consistent with "ship dark"; the public surface is meant to render honest
  bootstrap/empty states with gates OFF, which reconciles them — but the README's headline should
  be updated when the launch posture is finalized.

---

*Synthesis only. Sources: `CLAUDE_PICKUP.md`, `V6_HANDOFF.md`, `PHASE_9_REPORT.md`,
`CODEX_FINAL.md`, `CODEX_FINAL_INFRA_HANDOFF.md`, `CODEX_FINISH_DEPLOY.md`,
`CODEX_FINISH_PROMPT.md`, `CODEX_HANDOFF.md`, `CODEX_HANDOFF_2.md`, `CODEX_PHASE_3/4/5_BRIEF.md`,
`CODEX_PICKUP_V2.md`, `handoff.md`, `LAUNCH_TONIGHT.md`, `QUICKSTART.md`, `README.md`,
`SCRATCH_TO_PRIMARY_COPY_MANIFEST.md`, `_logs/DECISIONS.md`, `REPO_INTELLIGENCE_REPORT.md`,
`docs/ops/decision-log.md`, `docs/ops/GO_LIVE_RUNBOOK.md`, `apps/web/lib/brand.ts`,
`apps/web/lib/pricing/pricing-phases.ts`.*
