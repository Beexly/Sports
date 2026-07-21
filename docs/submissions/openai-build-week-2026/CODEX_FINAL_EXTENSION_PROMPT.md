# CODEX MISSION — NOVA Build Week Edition

Paste the directive below into a fresh **Codex session using GPT-5.6** while the Sports repository is open.

Do not reuse a session that cannot produce a valid `/feedback` session ID. Do not represent work outside this session as work performed inside it.

---

## Mission directive

You are implementing the **qualifying OpenAI Build Week 2026 extension** for the NOVA AI Opportunity Intelligence & Venture Engine inside `Beexly/Sports`.

The repository already contains a large pre-existing GSE platform and a pre-existing NOVA foundation on draft PR #146. Your task is not to claim that foundation as new. Your task is to create a distinct, meaningful, working **NOVA Build Week Edition** whose submitted core functionality is built predominantly in this Codex/GPT-5.6 session.

The challenge deadline is July 21, 2026 at 5:00 PM Pacific. Work aggressively, but never trade honesty or repository safety for speed.

### Branch and preservation

1. Inspect repository state before editing.
2. Start from branch `codex/nova-ai-opportunity-engine-2026-07-21` or its current PR #146 head.
3. Create a new branch:

```text
codex/nova-build-week-edition-2026-07-21
```

4. Do not modify, rewrite, reset, force-push, delete, or merge PR #146.
5. Do not touch production secrets, production data, payment activation, outreach, or deployment.
6. Never claim a result without exact command evidence.

### Read first

Read these files in order:

1. `CLAUDE.md`
2. `docs/submissions/openai-build-week-2026/NOVA_SUBMISSION_PACKET.md`
3. `docs/ai/nova/NOVA_AI_OPPORTUNITY_ENGINE_2026-07-21.md`
4. `apps/web/lib/opportunity-engine/index.ts`
5. `apps/web/lib/opportunity-engine/platform-ecosystems.ts`
6. `apps/web/app/cockpit/nova/page.tsx`
7. `apps/web/app/cockpit/layout.tsx`
8. `apps/web/components/cockpit/cockpit-command-palette.tsx`
9. all existing `apps/web/__tests__/nova-*.test.ts`
10. repository scripts, guardrails, CI workflow, and relevant route conventions.

Then produce a concise reality map:

- what existed before this session;
- what is implemented but internal-only;
- what is missing for a working public Build Week demo;
- exact files this session will create or change;
- exact acceptance criteria.

Record this in:

```text
docs/submissions/openai-build-week-2026/CODEX_SESSION_SCOPE.md
```

Do not begin implementation until that scope file clearly separates pre-existing work from the qualifying extension.

---

## Build the qualifying extension

The extension must be a working, no-secret, deterministic public demo and developer work-packet compiler. It must not be a static marketing page.

### A. Public demo route

Create:

```text
apps/web/app/labs/nova/page.tsx
```

Requirements:

- public route, but `robots: noindex, nofollow, nocache`;
- gated by `NOVA_PUBLIC_DEMO_ENABLED=true` in production;
- available automatically in development/test;
- disabled state returns an honest unavailable page or 404 according to repository convention;
- no authentication required when enabled;
- no production database, credentials, private APIs, or user data;
- uses deterministic versioned sample data;
- clearly labels all source events, revenue figures, credits, and outcomes as demo fixtures;
- responsive on mobile and desktop;
- accessible keyboard navigation and semantic headings;
- no banned betting or unsupported AI language.

### B. Versioned deterministic demo dataset

Create a dedicated fixture module, not inline page literals:

```text
apps/web/lib/opportunity-engine/build-week-demo.ts
```

It must contain at least six replayable scenarios:

1. critical API deprecation;
2. new model or coding-agent release;
3. startup-credit announcement with an advertised maximum but no approval;
4. direct-payout creator/bot platform;
5. transactional enterprise marketplace;
6. discovered MCP/plugin resource that remains install-blocked.

Each scenario must demonstrate:

- prior observation;
- current observation;
- material change;
- evidence tier;
- opportunity candidate;
- money state;
- policy disposition;
- coding packet;
- owner-only action;
- blocker;
- expected measured outcome.

The fixtures must contain no claims that depend on live web access during judging.

### C. Work-packet compiler

Create a deterministic compiler that converts one `AiPlatformOpportunity` into a developer-ready work packet.

Suggested file:

```text
apps/web/lib/opportunity-engine/work-packet.ts
```

The output contract must include:

- stable packet ID and source opportunity ID;
- objective;
- why now;
- target project(s);
- product/buyer job;
- value type and monetization lane;
- current truth;
- assumptions;
- prohibited claims;
- exact implementation sequence;
- expected files or components;
- data/API dependencies;
- rights and security gates;
- cash, owner-time, calendar, and premium-model budgets;
- test commands;
- acceptance criteria;
- failure/kill criteria;
- rollback;
- owner-only actions;
- proof artifacts;
- handoff recipients;
- status: draft only.

The compiler must not invent repository file paths. It may use explicit templates by opportunity class and target project, but unknown targets must produce a research task rather than a fabricated path.

### D. Owner decision-packet compiler

Create a second deterministic output for the founder:

```text
apps/web/lib/opportunity-engine/owner-decision-packet.ts
```

It must reduce the decision to:

- decision requested;
- deadline;
- why it matters;
- what is already prepared;
- what only the owner can do;
- maximum time required from owner;
- cash exposure;
- evidence supporting the decision;
- missing evidence;
- consequences of act/defer/reject;
- recommended default;
- no external action taken.

The owner packet must never label hypothetical, discovered, applied, or approved value as paid income.

### E. Interactive demo behavior

Use a client component only where interaction requires it. The page should allow the reviewer to:

- filter by platform;
- filter by direct payment, transaction, application, distribution, or negotiated state;
- filter by P0/P1/P2/P3/WATCH;
- select one scenario or platform opportunity;
- inspect evidence and money state;
- compile and view the coding packet;
- compile and view the owner packet;
- view blocked automatic actions;
- replay before/after change detection;
- copy a packet as JSON or Markdown using browser-local behavior only.

Do not add a new state-management framework.

### F. Machine-readable demo API

Create:

```text
apps/web/app/api/labs/nova/route.ts
```

Requirements:

- GET only;
- same demo gate as the page;
- no database or external calls;
- response includes schema version, generated fixture time, scenarios, platform summary, and explicit `demo: true`;
- no internal secrets, full terms copies, or private source content;
- add cache and security headers according to repository convention;
- add a stable JSON contract test.

### G. Build Week evidence surface

Create a visible internal section on `/labs/nova` showing:

- `Built with Codex + GPT-5.6` only after this session actually implements the extension;
- session ID placeholder until `/feedback` is run;
- list of qualifying extension files;
- pre-existing substrate disclosure;
- exact test status;
- no claim that Codex built pre-existing GSE or PR #146.

Create:

```text
docs/submissions/openai-build-week-2026/CODEX_BUILD_EVIDENCE.md
```

Update it after validation with:

- branch;
- start commit;
- final commit;
- files changed;
- commands run;
- outcomes;
- remaining blockers;
- `/feedback` session ID.

Never invent the session ID. Leave `PENDING_OWNER_CAPTURE` until the actual command returns it.

### H. Build Week README

Create:

```text
README_NOVA_BUILD_WEEK.md
```

It must include:

- problem and solution;
- screenshots/demo path placeholder;
- architecture;
- exact setup;
- demo gate;
- sample data disclosure;
- qualifying extension versus pre-existing work;
- Codex/GPT-5.6 usage;
- session ID placeholder;
- validation commands;
- security/rights boundaries;
- license status and any blocker;
- public video placeholder.

Do not overwrite the root README unless needed to add one small link.

---

## Required tests

Add focused tests for all qualifying core behavior. Suggested files:

```text
apps/web/__tests__/nova-build-week-demo.test.ts
apps/web/__tests__/nova-work-packet.test.ts
apps/web/__tests__/nova-owner-decision-packet.test.ts
apps/web/__tests__/nova-demo-api.test.ts
apps/web/__tests__/nova-public-demo-guard.test.ts
```

Pin at least these invariants:

1. Every demo number and outcome is labeled demo/fixture.
2. A maximum credit amount stays `discovered`, not approved/activated/paid.
3. Distribution-only platforms do not claim native payout.
4. A direct-payment platform still carries qualification, demand, cost, and receipt gates.
5. MCP/plugin discovery never grants install authority.
6. Work packets contain why/when/how/files/tests/acceptance/rollback/owner actions.
7. Unknown file paths are never invented.
8. Owner packets require no more than a small, stated owner-time budget.
9. API is GET-only and gated.
10. Public demo uses no database or external fetch.
11. Copy/export contains no secrets.
12. All automatic external action fields remain false.
13. Existing NOVA tests remain green.
14. Cockpit navigation and command palette remain complete.

---

## Validation sequence

Run the narrowest tests first, then full gates. Derive exact commands from repository scripts, but the minimum evidence is:

```bash
npm ci
npm run db:generate
npm run lint --workspace=apps/web
npm run typecheck --workspace=apps/web
npx vitest run apps/web/__tests__/nova-*.test.ts
npm run test --workspaces --if-present
npm run guardrails
npm run build --workspace=apps/web
```

Then perform browser QA on:

```text
/labs/nova
/cockpit/nova
/api/labs/nova
```

Verify:

- desktop and narrow mobile viewport;
- no console errors;
- keyboard navigation;
- filters;
- packet compile/export;
- disabled production gate;
- enabled demo gate;
- no external network request from the demo route;
- no broken links;
- no secret exposure.

If the full repository has a pre-existing failure, prove it against the base commit before attributing it. Do not bypass or disable tests or guardrails.

---

## Diff review

Before committing:

- inspect every changed file;
- remove unrelated formatting;
- remove debug output;
- remove speculative dependencies;
- remove unsupported claims;
- confirm no production route or external action is enabled;
- confirm no data/model rights gate weakened;
- confirm no generated output claims that the session ID exists before capture;
- confirm the extension is meaningful enough to be separately described as the submitted Build Week core.

Commit coherent units. Do not merge.

---

## Final session actions

1. Update `CODEX_BUILD_EVIDENCE.md` with exact results.
2. Update `README_NOVA_BUILD_WEEK.md` with verified commands and branch/commit evidence.
3. Produce a concise completion report containing:
   - qualifying extension scope;
   - files;
   - test/build/guardrail status;
   - demo route;
   - unresolved owner actions;
   - exact disclosure of pre-existing work.
4. Run `/feedback` in this Codex session.
5. Put the returned session ID into:
   - `CODEX_BUILD_EVIDENCE.md`;
   - `README_NOVA_BUILD_WEEK.md`;
   - the completion report.
6. If `/feedback` cannot return a valid session ID, mark the submission `BLOCKED` and say why. Never invent one.
7. Push the branch and open a draft PR against `codex/nova-ai-opportunity-engine-2026-07-21`, not directly against main.

### Definition of complete

The task is complete only when:

- a working public demo extension exists;
- the majority of that extension was built in this Codex/GPT-5.6 thread;
- focused and full validation evidence is recorded;
- pre-existing work is disclosed;
- the owner can complete submission with only video recording/upload, form entry, rule acceptance, and final Submit;
- the valid `/feedback` session ID is captured.
