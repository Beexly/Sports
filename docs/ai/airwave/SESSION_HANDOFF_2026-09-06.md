# Session Handoff — 2026-09-06 Repo-Leverage Audit & Implementation

> **Read this first if you're picking up this branch cold.** It tells you what
> happened, what's done, what's still open, and exactly what to do next —
> without needing the original conversation.

**Branch**: `claude/gse-gsn-architecture-research-3iidd4`
**PR**: [Beexly/Sports#712](https://github.com/Beexly/Sports/pull/712) (draft, subscribed for CI/review events)
**Companion doc**: `docs/ai/airwave/GSE_GSN_REPO_LEVERAGE_AUDIT_2026-09.md` (7 rounds of
external-repo research — this handoff summarizes it, but that doc has the full citations)

---

## 1. What this session actually was

The founder shared ~30 external GitHub repos across several rounds and asked for
increasingly deep leverage audits (README-level → source-code-level → live-tested →
three-lens "meticulous + normal + creative" dives), plus explicit instruction to
**implement whatever was concretely buildable**, not just document it. This produced:

- 7 rounds of external-repo research (`GSE_GSN_REPO_LEVERAGE_AUDIT_2026-09.md`)
- 5 real, shipped code features (list below)
- 1 pure function built from a research finding, deliberately left unwired
- Several founder-only action items, now precisely scoped (exact registry entries,
  exact env vars, exact commands)

**Everything below is already committed and pushed to the branch above.** Nothing in
this session is uncommitted or lost.

---

## 2. What's actually shipped (code, tested, in the PR)

| Feature | Files | What it does |
|---|---|---|
| TheRundown day-quota gate | `packages/ingestion-pipeline/src/rundown-quota-gate.ts`, wired into `process-sport.ts` | Fixes a real production incident: TheRundown 429s were re-attempted every cron tick because the old breaker was process-local. Now durable via the existing `rate_limit_counters` table — one real 429 blocks further calls for the rest of the UTC day, fails open on store errors. |
| Airwave claim-consistency-check | `apps/web/lib/airwave/claim-consistency-check.ts`, wired into `claim-batch-validator.ts` and `GET /api/airwave/review-queue` | Flags supersession candidates, competing unresolved claims, and stale claims across Airwave's extracted claims. Pure, read-only, never mutates `operator_status`. |
| Playwright visual regression | `apps/web/e2e/visual-regression.spec.ts` + baseline PNGs | Guards homepage/board/picks against unintended UI drift. Zero new dependency. Cockpit routes intentionally out of scope (no safe way to mint a test admin session without weakening the paywall test posture). |
| Helicone Async logging | `apps/web/lib/claude-api/helicone-logger.ts`, wired into `provider-dispatch.ts` | Logs completed Claude calls to Helicone's Custom Logger endpoint (verified directly against Helicone's own docs, not guessed) — **never** routes the live call through Helicone's proxy, since that's a real critical-path SPOF per Helicone's own docs. Zero new dependency (raw `fetch`). No-op until `HELICONE_API_KEY` is set. |
| Langfuse tracing | `apps/web/lib/claude-api/langfuse-tracing.ts`, wired into `provider-dispatch.ts` | Traces completed Claude calls via `@langfuse/otel`/`@langfuse/tracing` (verified against the installed package's real `.d.ts` files, not assumed). Isolated OTel provider, serverless-safe (`exportMode: "immediate"` + awaited flush). Never attaches prompt/response text — only model/tokens/cost/duration. No-op until `LANGFUSE_PUBLIC_KEY`/`LANGFUSE_SECRET_KEY` are set. |
| Shop-vs-edge pure function | `apps/web/lib/market/shop-advantage.ts` | Computes the probability-point advantage available from shopping the best price vs. the average price the Edge Score already uses. **Deliberately unwired** — see §5. |

All of the above: `tsc --noEmit` clean, `eslint --max-warnings=0` clean, real Vitest
coverage (not just happy-path), and the full 26-guardrail suite (`npm run guardrails`)
green as of the last push.

### npm packages now in the lockfile (installed by the founder, not by an agent — see §6)
- `@langfuse/otel`, `@langfuse/tracing` (and their `@langfuse/core` peer) — real, in use,
  wired above.

---

## 3. The two findings that need the founder's attention most

These aren't code — they're compliance/architecture facts an agent shouldn't
self-resolve. Both are in Round 7 of the audit doc with full citations.

### 3a. GSE already built NCAA integration — it's one registry entry from being live

`apps/web/lib/data-sources/free-adapters/henrygd-ncaa.ts` is complete and tested,
wired into CFB/NCAAB score failover and cross-source consensus checking
(`multi-source-scores.ts`, `ncaa-consensus.ts`). It's fail-closed today
(`source-router.ts` marks it `cleared: false`, ticket `GSE-SEC-050`) because no
`apps/web/lib/scraping/source-rights-registry.ts` entry exists for it.

A deep-dive agent fetched NCAA.com's **live** ToS directly (`https://www.ncaa.com/tos`)
and found explicit commercial-use restriction language naming "statistics, updated
scores." The drafted entry (ready to paste into `source-rights-registry.ts`):

```
source_id: "henrygd-ncaa" (or "ncaa-com")
status: "permission_required"   // NOT approved_public_logged_off
automation_allowed: false        // until written permission
public_logged_off_allowed: true  // robots.txt doesn't block the scraped paths
commercial_display_allowed: false
attribution_required: true       // HENRYGD_ATTRIBUTION already drafted in the adapter
evidence_urls: ["https://www.ncaa.com/tos", "https://www.ncaa.com/robots.txt"]
unlock_condition: "Written permission from Turner Sports Interactive
  (NCAA.com operator) — contact via TSIcopyrightagent@turner.com or NCAA.com's
  partnership/licensing channel."
```

**This was not added to the registry in this session** — that's a founder/legal call,
same posture as every other rights determination in this audit. Once it lands (even as
`permission_required`, i.e. still blocked), the file is at least honest about *why* it's
blocked and *what* would unblock it.

### 3b. GSE's own ESPN "forbidden" verdict doesn't match the code that runs

Two different registries classify ESPN differently:
- `packages/data-ingestion/src/source-registry.ts` → `"espn-hidden-api"` → `verdict: "forbidden"`
- `apps/web/lib/scraping/source-rights-registry.ts` → `"espn-public-api"` → `approved_public_logged_off`, `commercial_display_allowed: false`

A deep-dive agent confirmed **by grep** that GSE's three real ESPN clients
(`espn-schedule-seed.ts`, `espn-results-client.ts`, `espn-odds-client.ts`) never call
`assertIngestible()` from either registry at all — so the "forbidden" verdict has zero
effect on the ESPN traffic GSE actually generates. **This is a document disagreeing with
running code, not just with another document.** Needs a founder/legal look independent
of anything else in this handoff. No fix was attempted — resolving this means deciding
which registry is authoritative and possibly wiring `assertIngestible()` into the actual
client files, which is a real architectural change, not a one-line fix.

---

## 4. Founder-only action items (ranked, fastest-value first)

Every item below is blocked on the founder specifically because it needs an npm install
(Law 2 — agents never touch `package-lock.json`, no exceptions), an external account, or
a `.mcp.json` edit (hard-denied by this session's own tool permissions). Full detail and
citations for each are in the audit doc.

1. **Set `HELICONE_API_KEY` and/or `LANGFUSE_PUBLIC_KEY`/`LANGFUSE_SECRET_KEY` in Vercel
   Production.** Both integrations are already fully wired and shipped — this is
   the only remaining step to turn them on. Zero code change needed.
2. **Add `@playwright/mcp` to `.mcp.json`** for supervised console 2FA/SSO work
   (Vercel/Neon/Stripe). Exact line is in the audit doc's Round 1 section. Use
   `--secrets` for credential masking; watch out for `browser_run_code_unsafe`
   (ships on by default, arbitrary-JS-equivalent).
3. **`npm install @orama/orama`** for local search (docs/revenue/partner-terms — small,
   static corpora only; GSN editorial precedent and future Airwave claims search need
   Neon pgvector instead, not Orama, once those corpora exist for real).
4. **A rights-registry decision on NCAA and ESPN** (§3 above) — legal/compliance calls,
   not npm installs, but still founder-only.
5. Everything else in the audit doc (mem0/mcp-memory-service, `@ast-grep/cli`,
   typescript-language-server MCP bridge) is lower-priority and fully documented with
   exact commands.

**Explicitly do NOT pursue** (compliance/architecture holds, not oversights):
- Polymarket integration of any kind — counsel compliance hold
  (`.claude/skills/polymarket-hold/SKILL.md` — agents must refuse).
- SofaScore as a data source — confirmed via two independent findings (a verified
  robots.txt 403, and another team's own documentation of defeating SofaScore's
  Cloudflare bot protection) that any integration requires active evasion GSE's own
  scraping rules forbid.
- A new third-party paid odds vendor (ParlayAPI or similar) as a production book
  source — contradicts the founder's own recorded position ("we are the provider...
  not Rundown, not The Odds API"), and ParlayAPI's free tier is measured, not assumed,
  too thin for GSE's cadence (h2h-only, 60 req/hour).

---

## 5. Loose ends a future session should pick up

- **`shop-advantage.ts` needs a UI decision, not more backend work.** The pure function
  is done and tested. Wiring it into the pick card (or a dedicated widget) needs a
  product call on tier-gating and copy — hand this to `frontend-app-agent` with an
  explicit design, don't just wire it in blind.
- **The Yahoo Fantasy `league-twin.ts` seam is real but needs real users.**
  `apps/web/lib/fantasy/league-twin.ts` already renders a full roster visualization on
  sample data. A real Yahoo OAuth connection (founder registers a Yahoo dev app first)
  exists as a properly-scoped, multi-day feature — see the audit doc's Round 7 Yahoo
  section for the exact integration shape (NextAuth Yahoo provider, a new
  `FantasyLeagueLink` Prisma table — **a real migration, founder/DB-migration-only**).
- **`@ast-grep/cli`'s deep dive stalled** (~2h50m hung on an `npx` registry install in
  this sandbox) and was never completed. Round 2's original finding (BLOCKED, new
  dependency) stands, unverified at the source level. Retry in an environment with
  reliable npm registry access, or read the source directly instead of installing.
- **Two forward-looking design references, not action items**: (a) once GSE builds
  multi-sport player props, `smagara/AgilitySports_api`'s reviewed technical-design doc
  already reasoned through the schema fork (wide/nullable vs. EAV vs.
  core-entity-plus-typed-extension-tables) GSE will face — worth citing then; (b) once
  GSE has both ESPN play-by-play and Kalshi/PredExon tick history for the same game,
  fusing them by timestamp (a pattern from `sports-skills`) would give a more granular
  in-game calibration signal than anything in the current PROVEN-gate math.
- **PR #712 is a draft, fully green, not yet merged.** It's docs-heavy (7 audit rounds)
  plus the 6 code features above. Whoever picks this up should decide whether to split
  it (docs vs. code) before merge, or merge as one — no strong opinion was formed on
  this either way during the session.

---

## 6. A process note worth knowing

Partway through this session, the founder tried to run `npm install` locally to unblock
the Langfuse packages (since agents can never touch `package-lock.json` — Law 2, no
exception clause, unlike the push law). Two real mistakes happened and were corrected
live:
1. The first attempts ran in the wrong local directory entirely (not a clone of this
   repo) — commands failed with "no such workspace"/"no such pathspec" errors.
2. Once corrected (fresh `git clone` of the real repo, correct branch checked out),
   `npm install @langfuse/otel @langfuse/tracing --workspace=apps/web` succeeded and was
   pushed directly to this branch as commit `b50f183`.

**If you're continuing this work and need another package installed**: the founder
running `npm install <pkg> --workspace=apps/web` from a **real, correct-branch clone**
of this repo, then `git add package.json package-lock.json apps/web/package.json &&
git commit && git push`, is the only path — no agent shortcut exists for this, by
design (it's a deliberate defense against a compromised or confused session installing
arbitrary packages).

Also worth knowing: **several live API keys/secrets were pasted directly into the chat
during this session** (Langfuse, Helicone, Braintrust, Mintlify, Apify). None were
written to any file or committed — but if you're the founder reading this, treat
anything pasted into a chat transcript as potentially exposed and rotate it as a matter
of course, independent of anything else in this handoff.

---

## 7. Quick orientation for a fresh session

- **Start here**: `docs/ai/airwave/GSE_GSN_REPO_LEVERAGE_AUDIT_2026-09.md` — 7 rounds,
  most recent (Round 7) has the deepest, most-verified findings. Earlier rounds are
  superseded where a later round explicitly says so; otherwise they still hold.
- **AGENTS.md** has a one-paragraph pointer for each round — read those first if you
  don't want to read the whole audit doc.
- **This branch's commit history** (`git log --oneline claude/gse-gsn-architecture-
  research-3iidd4`) is a clean, one-task-per-commit record of everything in §2.
- **Don't re-litigate**: the Polymarket hold, the SofaScore no, the "not another odds
  vendor" position, and the "GSE's engine already beats every betting-math repo
  checked" finding are all settled, cited conclusions from real verification — treat
  re-opening them as a red flag that something was skimmed, not a fresh insight.
