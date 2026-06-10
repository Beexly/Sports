# 05 — Departments / Department Heads / Process audit

> **Lens:** the "company structure" abstraction — the Department-Heads cockpit, the
> operator/agent program (Jarvis + six agents), the compliance program, and the operational
> PROCESS (ingestion → scoring → publish → gates → board), the runbooks, the guardrail scripts
> (`scripts/guardrails/*`), and the CI gates. Is it real + wired, or illustrative/inert? What is
> automated vs manual? Where are the process gaps / single points of failure?
>
> **Clones:** `DEPLOY` = `C:/Users/Garrett/Sports` (the launch target; narrower picks/board
> product). `CANONICAL` = `C:/Users/Garrett/Sports-canonical-2026-06-03` (the full platform; the
> department-heads / compliance program / agent program is **canonical-heavy**). Every finding is
> labelled with the clone it lives in. Read-only, doc-only output.

---

## Grade: **B**

**Honest verdict.** The "company structure" abstraction is more real than it sounds and much more
honest than it had to be — but it is bifurcated across the two clones in a way that matters. The
operator PROCESS is genuinely wired: a real ingestion → scoring → publish-gate → board pipeline
(`processSport`) driven by an honest cron, with every regulated step (publish gate, deploy,
money, calibration bump) held behind a deliberate human flip, not an agent. Jarvis is a real,
DB-backed, deterministic synthesizer — not a chatbot and not a fake — that classifies launch
readiness from live evidence and refuses to claim `LAUNCH_READY` when performance is unsafe. The
guardrail scripts (`trust-gate`, `model-freeze`, `draft-only`, `claude-api-usage`, plus
DEPLOY-only `brand-lint`) are substantive, non-vacuous CI blockers, and DEPLOY's guardrail
composite is actually a *superset* of canonical's. The grade is held to a B by one structural
fact: the **Department Heads cockpit and the entire Compliance Program model live only in
CANONICAL** — they do not exist in the launch tree at all — and by the recurring two-clones
hazards this audit keeps finding (a CI branch-trigger gap that means pushes to the DEPLOY HEAD
branch may run no CI, and a runbook whose canonical bring-up command is undocumented at the repo
root). The "agents" are correctly framed as *roles, not automations* (every one is
`externalActions: "NONE"`), and the heads honestly report `UNKNOWN`/`FORECAST_ONLY` for
un-instrumented areas rather than inventing a metric. The model is coherent; the problem is that
the richest part of it isn't in the product that ships.

---

## Findings by severity

### P1 — the entire Department-Heads + Compliance-Program layer is CANONICAL-only; the launch tree has no "company structure" surface

- **Clone:** CANONICAL (the layer); **DEPLOY** is missing it entirely.
- **Evidence:**
  - CANONICAL has the model and both deep-dive pages: `apps/web/lib/cockpit/departments.ts`
    (six typed heads — compliance, data-accuracy, growth-monetization, product-eng,
    content-brand, support — built deterministically from a real-signal snapshot,
    `departments.ts:416-425`), `apps/web/lib/cockpit/compliance-program.ts` (ten grounded
    requirements mapped to FTC / AGA-RG / NCPG / state-geo / age / licensing / data-TOS, plus a
    three-item approval queue that *names* each regulated trigger and never auto-pulls it,
    `compliance-program.ts:92-250`), `app/cockpit/departments/page.tsx`, and
    `app/cockpit/compliance/page.tsx`. The cockpit NAV registers both
    (`Sports-canonical-2026-06-03/apps/web/app/cockpit/layout.tsx:22-23`).
  - **DEPLOY has none of it.** A glob for `apps/web/lib/cockpit/{departments,compliance-program,mission-control,monetization-levers,competitor-watchlist}.ts`
    in `C:/Users/Garrett/Sports` returns **no files**; `app/cockpit/departments/page.tsx` and
    `app/cockpit/compliance/page.tsx` do not exist; and DEPLOY's cockpit NAV
    (`C:/Users/Garrett/Sports/apps/web/app/cockpit/layout.tsx:20-40`) has **no** Department-Heads,
    Compliance, Competitors, or Airwave entries (it stops at 18 surfaces vs canonical's 23).
  - The model is well-tested where it exists: `Sports-canonical-2026-06-03/apps/web/__tests__/departments-cockpit.test.ts:35-162`
    asserts the shape, the founder ADMIN gate, the NAV contract, that the Compliance head is the
    only one with a wired deep-dive, that un-instrumented heads report honestly, and that neither
    page references a forbidden auto-execute publisher/executor.
- **Why it matters:** the "department heads / compliance program" is one of the most
  differentiated, compliance-forward parts of the whole platform — and it is invisible in the tree
  that actually ships. This is the same two-clones drift this audit flags elsewhere (lens 01/04/08),
  applied to the operations/compliance surface: the matured implementation lives in the clone that
  isn't shipping. For a launch where the compliance *posture* is the crown jewel, shipping a cockpit
  with no compliance-program deep-dive understates the real maturity to the one person (the founder)
  who most needs the at-a-glance view.
- **Recommendation (FOUNDER):** decide deliberately. Either (a) port `departments.ts` +
  `compliance-program.ts` + the two pages + the NAV entries into DEPLOY (additive, internal,
  ADMIN-gated — no public/regulated surface, low risk), so the launch operator has the same
  one-glance structure; or (b) explicitly accept that the narrow launch ships without it and
  document that the department-heads layer is a Launch-2 cockpit. Do **not** leave it implicit. If
  porting, carry the test with it so the two clones can't silently diverge again.

### P1 — DEPLOY's HEAD branch matches none of the CI push triggers, so pushes to the launch tree may run no CI gates at all

- **Clone:** DEPLOY (this is the *process* angle on lens 08's P1-6 / lens 10).
- **Evidence:** DEPLOY's current branch is `safety/sports-wip-2026-06-04` (`git branch
  --show-current` in `C:/Users/Garrett/Sports`), but `C:/Users/Garrett/Sports/.github/workflows/ci.yml:4-7`
  triggers only on `push: branches: [main, "claude/*", "sports-intelligence-os-*"]` and
  `pull_request: branches: [main]`. `safety/sports-wip-2026-06-04` matches none of those globs.
  Same gap for `brand-lint.yml` (`:5-7` triggers `main` + all PRs) and `external-cron.yml`. So a
  direct push to the launch HEAD runs **none** of the seven CI jobs — `test`, `build`,
  `trust-gate`, `model-freeze`, `draft-only`, `guardrails`, `brand-safety` — unless it goes through
  a PR into `main`.
- **Why it matters:** the guardrail discipline below is excellent, but a gate only protects what it
  runs on. If the launch operator commits straight to the working branch (which is the literal
  current HEAD), the trust-gate, draft-only, and model-freeze blockers are bypassed silently. This
  is a *process* single-point-of-failure: the safety net is real but not stretched under the place
  the operator is actually standing.
- **Recommendation:** put the DEPLOY launch branch on a CI-covered name (add `safety/*` to the
  push triggers, or rename the branch), and confirm Vercel's production branch == the CI-covered
  branch. Pairs with lens 08's P0-1 (declare one deploy tree) and P1-6. No code logic change — a
  workflow-trigger and branch-naming fix.

### P2 — no `RUNBOOK*` at the repo root; the one-command bring-up the founder relies on is undocumented where it's expected

- **Clone:** BOTH (DEPLOY has `docs/launch-runbook.md` + `docs/ops-runbook.md`; CANONICAL has no
  runbook found at all).
- **Evidence:** A glob for `RUNBOOK*` at the root of either clone returns **no files**. DEPLOY does
  carry a genuinely strong operator runbook at `C:/Users/Garrett/Sports/docs/launch-runbook.md`
  (pre-flight, seed, local verification, the CI-green checklist `:114-127`, stage validation, the
  performance-gate flip `:182-204`, gate-only rollback `:205-213`, the daily operator checklist
  `:227-240`, and a "known invariants — never break these" list `:310-329`) plus
  `docs/ops-runbook.md` and a `runbook-structure.test.ts` pinning its shape. CANONICAL, the clone
  whose department/compliance program is the richest, has **no** runbook surfaced by the glob.
- **Why it matters:** the founder's own reference map treats a top-level `RUNBOOK.md` with a
  one-command bring-up as the expected entry point. DEPLOY's actual runbook is excellent but lives
  under `docs/` with a different name, and CANONICAL — the more complex tree — has none. A solo
  operator under launch pressure should not have to *find* the runbook.
- **Recommendation:** add a thin top-level `RUNBOOK.md` (or symlink/pointer) in each clone that
  links to `docs/launch-runbook.md` and states the single bring-up command, and give CANONICAL a
  runbook (even a one-screen "this is the non-deploy clone; bring-up differs" stub) so neither tree
  is undocumented. Doc-only; pairs with the promotion-checklist work in lens 08.

### P2 — the Department-Heads model is read-time-only: no persisted approval queue, no audit trail of head decisions

- **Clone:** CANONICAL.
- **Evidence:** `departments.ts:1-18` is explicitly a **pure** module — "no DOM, no React, no DB
  calls … the head can only report what it was handed." The page resolves live signals each request
  (`app/cockpit/departments/page.tsx:33-51`) and the compliance approval queue is rebuilt on every
  render from static definitions (`compliance-program.ts:213-250`). Nothing about a head's status,
  an outstanding item, or an approval-queue decision is persisted — there is no `DepartmentDecision`
  / `ApprovalQueueItem` table read or written. Contrast the cockpit *task* system, which **is**
  persisted (`app/api/cockpit/tasks/route.ts:32-95` reads/writes `db.cockpitTask`, ADMIN-gated).
- **Why it matters:** purity is the right call for fabrication-resistance (a head can't invent a
  number it wasn't handed — a real strength). But it means "the founder reviewed and cleared the
  affiliate approval-queue item" is never an auditable record; the queue is a *render*, not a
  ledger. For a compliance program whose entire pitch is "every regulated trigger is named and
  human-gated," the act of clearing one should itself be queryable — the same gap lens 06 flags for
  `GateDecision`.
- **Recommendation (FOUNDER):** when/if the approval queue is used to actually gate a go-live,
  persist the decision (who/when/which trigger) as an audit row, while keeping the *model* pure
  (hand the persisted decisions in as signals). Safe/additive; turns the honest queue into an
  honest *record*. Not a launch blocker.

### P2 — `mission-control.ts` (the cross-product "what matters now" briefing) is illustrative-only and CANONICAL-only

- **Clone:** CANONICAL.
- **Evidence:** `apps/web/lib/cockpit/mission-control.ts:1-9` — "Pure, deterministic,
  illustrative." It composes a prioritized briefing from `DEMO_WIRE`, `SCHEME_SCENARIOS`,
  `DFS_SLATE`, `PROPS`, and `buildLeagueTwin()` (`:11-17`) — i.e. demo/fantasy fixtures, not the
  live board — and hardcodes accent hex (`:33`). DEPLOY has no `mission-control.ts`.
- **Why it matters:** this is a correct "built well, inert" pattern (it's labelled illustrative and
  feeds off demo data), but it's worth being explicit that the platform's headline cross-product
  briefing is a fixture-driven demo, not a live operations feed — and that it, too, is canonical-only.
- **Recommendation:** keep it labelled illustrative; if it's ever promoted to a live operator
  surface, wire it to the real board/news instead of `DEMO_WIRE`. No action needed for launch.

### P3 — minor / polish

- **P3-1 — `mission-control.ts` hardcodes accent hex (`#00E5FF`, `#FF2DD6`, …) at
  `mission-control.ts:33`,** outside the design-token system the rest of the cockpit uses
  (the departments/compliance pages correctly use `text-ion-*` / `border-surface-line`, enforced by
  `departments-cockpit.test.ts:147-155`). Map to `--data-*` tokens if promoted. (CANONICAL.)
- **P3-2 — the Jarvis cockpit page injects a 60s auto-refresh via
  `dangerouslySetInnerHTML`** (`Sports-canonical-2026-06-03/apps/web/app/cockpit/page.tsx:464-481`).
  It's a static constant string (no injection vector) and the surface is ADMIN-only/noindex, so the
  risk is nil — noted only because lens 09 tracks every `dangerouslySetInnerHTML` and this is one of
  them. (CANONICAL; DEPLOY mirrors the cockpit overview pattern.)
- **P3-3 — `agents.ts` is byte-identical across both clones** (verified read) but the six agents
  reference fantasy/funnel responsibilities (BOBBY: "subscription … analytics," AVA: "blog posts")
  that map to surfaces which are richer in CANONICAL — the agent *registry* is shared while the work
  it routes is not. Cosmetic; the `OperatorAgent` enum keeps them type-locked to the schema
  (`agents.ts:14-17`). (BOTH.)

---

## Strengths (real, grounded)

1. **The operator PROCESS is genuinely wired, and every regulated step is human-gated.** The
   pipeline is one real function — `packages/ingestion-pipeline/src/process-sport.ts:106-160` —
   shared by the scheduled worker and the admin trigger (`:1-23`): fetch odds → snapshot →
   freshness-validate → normalize → score → upsert picks → capture immutable signal snapshots. It
   is driven by an honest cron: a GitHub Actions `external-cron.yml` runs refresh every 30 min and
   settle hourly (`external-cron.yml:18-23`), hitting `CRON_SECRET`-bearer-gated routes that "gate
   writes via `getReadinessGates()`" — "no business logic lives here" (`external-cron.yml:5-13`).
   The one customer-visible flip — opening the performance gate — is explicitly "the only operator
   action that changes customer-visible behavior" and is a manual `PERFORMANCE_STATS_ENABLED=true`
   redeploy with a documented precondition checklist (`docs/launch-runbook.md:182-204`). **Automated:
   ingestion, scoring, settlement, snapshotting. Manual/founder: publish-gate flip, deploy,
   migrations, money, calibration bumps.** That split is the right one. (DEPLOY.)

2. **Jarvis is a real deterministic synthesizer, not a chatbot or a fake.** `lib/cockpit/jarvis.ts`
   is a pure, I/O-free classifier (`jarvis.ts:1-19`) that takes live evidence and produces a typed
   launch assessment, with hard rules: "Never fabricate. If an input is missing, the output says
   unknown … Never recommend auto-betting. Never recommend auto-publishing. Do not claim
   LAUNCH_READY if public performance is unsafe" (`jarvis.ts:10-16`). The loader
   (`lib/cockpit/jarvis-data.ts:67-204`) pulls ~19 live DB aggregates (each wrapped in `.catch()`
   so the cockpit always renders), and the synthesizer demotes to `NOT_READY_SAFETY` when public
   picks are live but performance is gated (`jarvis.ts:357-366,455-457`). It is version-stamped
   (`JARVIS_VERSION = "v1.1"`, `:128`) for auditability. (BOTH — DEPLOY ships the Jarvis overview;
   the deeper department layer is canonical.)

3. **The "agents" are roles, not automations — externalActions: "NONE" everywhere.**
   `lib/cockpit/agents.ts:1-13` is explicit: "these are *roles* inside the operations team, not
   external automations … every output is a draft that must be approved by a human reviewer." All
   six agents (Jarvis/Sarah/Tal/Scout/Ava/Bobby) carry `externalActions: "NONE"`
   (`agents.ts:27-101`), and the registry is type-locked to the Prisma `OperatorAgent` enum so it
   can't drift from the schema (`agents.ts:14-17`). The agents page reads live task counts but
   exposes only "Open queue" — no send/publish button (`app/cockpit/agents/page.tsx:8-87`). This is
   the correct posture for an AI-operated company: agents draft and route; humans execute. (BOTH.)

4. **The Department-Heads model is grounded and fabrication-resistant by construction.**
   `departments.ts` derives every head's status from a real-signal snapshot and reports
   `UNKNOWN`/`FORECAST_ONLY` when an input is missing rather than guessing (`departments.ts:34-43,
   118-124` — compliance is `UNKNOWN` until counts are supplied; support is `FORECAST_ONLY` with
   `UNINSTRUMENTED` confidence, `:384-408`). The test proves the non-fabrication invariant: a
   closed-input snapshot yields `UNKNOWN`, "never a guessed status"
   (`departments-cockpit.test.ts:88-95`). The heads' mandate is encoded as advise/forecast/gate/
   queue and **explicitly never auto-execute a regulated trigger** (`departments.ts:6-12`,
   page banner `app/cockpit/departments/page.tsx:76-80`). (CANONICAL.)

5. **The Compliance Program is compliance-as-code, honestly scoped.** `compliance-program.ts:8-17`
   states the two hard rules — "Never fabricate a legal claim … Never auto-execute a regulated
   trigger" — and delivers: ten requirements each mapped to a framework and grounded in real code
   (helpline, no-guarantee disclosure, banned-language scanner, performance gating, operator
   whitelist), with unbuilt controls (`state.geo-gating`, `age.21-plus`) honestly marked
   `forecast` (`:153-173`), and a three-item approval queue that *names* each regulated trigger and
   sets it `eligible-when-green` until its dependencies are `met` (`:213-250`). This is the model
   behind lens 09's strengths, read from the same source. (CANONICAL.)

6. **The guardrail scripts are substantive, non-vacuous CI blockers — and DEPLOY's set is a
   superset of canonical's.** `scripts/guardrails/trust-gate.mjs` scans all source for 23 banned
   phrases with a whitelist and comment-stripping (`trust-gate.mjs:19-43,132-149`); `model-freeze.mjs`
   blocks a `MODEL_VERSION` bump unless a matching IMPLEMENTED CalibrationProposal (or FROZEN
   marker) lands in the same change (`model-freeze.mjs:39-151`); `draft-only.mjs` is a real
   brace-depth-tracking parser that flags any `publishedAt`/`status:"PUBLISHED"` write or any
   email/SMS/webhook send path while exempting read-side `where` filters (`draft-only.mjs:109-228`);
   `claude-api-usage.mjs` blocks direct Anthropic calls outside the budget-aware path
   (`claude-api-usage.mjs:17-47`). DEPLOY's `npm run guardrails` runs **five** scripts +
   eval-contracts (adds `brand-lint`); CANONICAL runs four (`package.json` deploy `:31` vs canonical
   `:32`). All seven are wired as CI jobs (`ci.yml:103-233`). The launch runbook lists them as
   merge-gates (`docs/launch-runbook.md:114-127,304`). (BOTH; DEPLOY stronger.)

7. **The cockpit/operator surface is uniformly founder-gated server-side.** Every cockpit route
   inherits `session.user.role !== "ADMIN" → redirect` from the layout
   (`app/cockpit/layout.tsx:51-54`, both clones), the cockpit is `robots: noindex`
   (`layout.tsx:16-18`), and the cockpit API routes enforce a `requireAdmin()` 403 independently
   (`app/api/cockpit/tasks/route.ts:13-22`). The departments/compliance pages additionally carry a
   test asserting they reference no auto-execute publisher/executor
   (`departments-cockpit.test.ts:139-145`). (BOTH for the gate; departments/compliance CANONICAL.)

---

## What would move this from B to A

The B is "a real, honest operations + compliance model whose richest half lives in the wrong
clone, with two process safety-net gaps." To earn an A:

1. **Resolve the department-heads / compliance-program split (P1-A).** Either port
   `departments.ts` + `compliance-program.ts` + the two cockpit pages + the NAV entries (and the
   test) into the launch tree, or make an explicit, documented founder decision that the
   department-heads layer is a Launch-2 cockpit. The single highest-leverage move — the launch
   operator should either have the one-glance structure or know on purpose that they don't.

2. **Close the CI-trigger / branch gap (P1-B).** Put the DEPLOY launch branch on a CI-covered name
   (or add `safety/*` to the push triggers) and confirm Vercel's prod branch == the CI-covered
   branch, so the trust-gate / draft-only / model-freeze blockers actually run on the tree the
   operator commits to. A gate that doesn't run is not a gate. (Pairs with lens 08 P0-1/P1-6.)

3. **Give each clone a discoverable runbook (P2).** A thin top-level `RUNBOOK.md` pointing at
   `docs/launch-runbook.md` in DEPLOY, and any runbook at all in CANONICAL, so the solo operator
   never has to hunt for the bring-up under launch pressure.

4. **Persist the approval-queue / head decisions as an audit ledger (P2)** when the queue is first
   used to gate a real go-live — keep the model pure, but record who cleared which named regulated
   trigger and when, so "human-gated" is also "auditable." (Mirrors lens 06's `GateDecision` fix.)

5. **Promote `mission-control` off demo fixtures (P2/P3)** if it ever becomes a live operator
   surface, and move its accent hex to design tokens.

> **Compliance / posture note.** Nothing in this lens recommends flipping a regulated switch. The
> department heads, agents, and compliance program are correctly **advise / forecast / gate / queue**
> only — they never auto-execute a deploy, a payment, an affiliate go-live, or a publish, and the
> approval queue names every regulated trigger and waits for a founder. Every item touching money,
> licensing, age/geo gating, or live publishing stays founder/legal-gated. The right default posture
> is already in place; the work is consolidation (get the model into the shipping clone) and
> process hardening (make the CI net cover the branch the operator stands on), not loosening a gate.

---

*Read-only audit. No source, test, config, schema, env, or package file in either clone was
modified. Every claim above is anchored to a file:line a reading actually opened. The
department-heads / compliance-program layer is CANONICAL-only and was confirmed absent from the
DEPLOY tree by direct glob; the CI-branch gap was confirmed against the live `git branch
--show-current` of `C:/Users/Garrett/Sports`.*
