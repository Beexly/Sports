# Hermes handoff v6 — 2026-08-18 (rev. 2026-08-19: + Vercel AI Gateway free lane)

Supersedes v1–v5. **v5 double-counted finished work; this corrects it.** Read the
RECONCILIATION table first and cancel anything marked CANCELLED before dispatching agents.

## FOR THE FOUNDER — your complete to-do list (Hermes: skip this block)

Three items. Nothing else in this file is yours.

1. **Paste one line to Hermes:** "v6 updated — re-read it and run the queue."
2. **Vercel dashboard, 2 minutes:** Project Settings → Environment Variables → enable
   "Automatically expose System Environment Variables", then redeploy. This makes
   `deployment.sha` stop reading `null`, so production can finally prove which commit is
   live. It has been unprovable all session.
3. **Later, when Hermes's refund PR (H-K) appears and CodeRabbit has reviewed it:** read it
   and decide the flag. That is the last money-touching decision on the board.

Draft PRs #431 / #432 / #433 await your review whenever — none block anything.

---

Branch `claude/fable-5-ultracode-plan-ptru4e`. `AGENTS.md` LAWS apply unchanged.
**Never push. Never `git add -A`. Never `--no-verify`. Never touch** `.github/**`,
`packages/db/prisma/**`, `scripts/guardrails/**`, `.env*`, `package-lock.json`, `.claude/**`,
`apps/web/lib/ai-control-plane/**`.

---

## RECONCILIATION — do this before dispatching anything

v5 was written before v4's results were known and re-listed tasks that were already DONE.
Free agents are cheap but not free of risk: **a weak model rewriting a passing implementation
can only lose.** Cancel these now.

| Task | v4 result | v6 decision |
|---|---|---|
| H-A isotonic PAV | DONE `62e32730` (already fixed in `ba61b061`; 11 tests locked) | **CANCELLED — do not redo.** |
| H-B cron-matrix generator | DONE `4b961782` (20 crons, 3/3 node:test, `--check` proven to exit 1) | **CANCEL the rewrite.** Replace with the 5-minute verification in H-B′ below. |
| H-C e-process | DONE `f53b229e` (eStep + eProcess; median 752 picks to supM≥100) | **EXTEND, do not rewrite.** See H-C′. |
| H-D markClosingSnapshots | DONE `0a447f98` (no-op unless flag set; 54/54 tests) | **CANCELLED — do not redo.** |
| H-F DOC_DRIFT.md | DONE `e668c4c4` | **CANCELLED as written.** Its findings created H-I below. |
| H-E CLV census | was BLOCKED on role privileges | **UNBLOCKED — run it on a Neon branch. No founder action needed. See H-E.** |
| H-G suppression curve | not started | **The real work. Highest priority of the code tasks.** |

Your check of `neonctl roles list` was correct and better than the preflight v5 specified —
you established the role was absent without connecting at all, and you refused `neondb_owner`.
Keep doing exactly that.

---

## FOUNDER DECISIONS — already made, do not re-open

**1. free-spine-health cadence: KEEP 2 HOURS. Fix the doc, not the config.**

H-F found `docs/ops/CRON_MATRIX.md` claims `10,40 * * * *` (twice hourly) while live
`apps/web/vercel.json` runs `0 */2 * * *`, and `:38` claims a "Vercel 30m + GH 2h" SLA.

The doc is wrong; the config is fine. Reasoning, so nobody relitigates it:

- The GH backstop `5 */2 * * *` already matches `.github/workflows/external-cron.yml:34`, so
  effective coverage is a check roughly every hour once the two are staggered.
- The 2026-08-17 outages ran ~20h and ~3h. A 2-hour check detects either one inside 2 hours.
  Cadence was never the binding constraint.
- **The real failure was that nothing alerted.** `health-alert` runs `*/15` and a 20-hour
  outage still went unnoticed. Quadrupling free-spine frequency would have changed nothing.
  That is what H-H investigates.

Action: update `docs/ops/CRON_MATRIX.md` rows and the `:38` SLA line to match live. Doc-only.

**2. refresh-odds cadence: doc is stale, config is fine.** Doc says `*/30`, live is `*/15`.
Production runs *more* often than documented. Update the doc row. Doc-only.

**3. Do not touch `orbit-unlock-smoke.mjs` expectations.** Still a founder call. Report only.

**4. `ai-transport-import-boundary` remaining 4 violations: leave red.** Owner decision
pending. Do not add to any allowlist. Do not edit `scripts/guardrails/**`.

---

## MODEL ROUTING — the Vercel AI Gateway free lane (READ BEFORE DISPATCHING)

The founder added Vercel credentials to `hermes.env`. **Laguna is already your default
model** — the gateway is a *second free source of the same model*, not a new model choice.

That matters for one reason: free lanes rate-limit. When OpenRouter throttles Laguna
mid-queue you currently stall. With the gateway configured you fail over to the identical
model on a different transport and keep working. This is a redundancy win, not a
capability change — and it does **not** relax the routing stop at the end of this file.

### Verified, not assumed

Pulled live from `https://ai-gateway.vercel.sh/v1/models` (public, no auth needed —
`curl` it yourself and re-check before trusting this table). **348 models. Exactly two
price at `input: "0"` and `output: "0"`.**

| Model id (exact string) | ctx | max out | tags | price in/out |
|---|---|---|---|---|
| `poolside/laguna-s-2.1-free` | 256,000 | 32,768 | reasoning, tool-use, **free** | `0` / `0` |
| `zai/glm-4.6v-flash` | 128,000 | 24,000 | vision, reasoning, file-input, tool-use, **free** | `0` / `0` |

`laguna-s-2.1-free` is an open-weight model built for **agentic coding and long-horizon
work**, with native `tools` / `tool_choice` / `reasoning` support. For this queue it is a
better primary than most OpenRouter free models. Use it first; keep OpenRouter free
models as the fallback lane.

### The one-character way to start paying

`poolside/laguna-s-2.1` — the **same string minus `-free`** — is a *different* model at
`$0.10 / $1M` in, `$0.20 / $1M` out. It is not rate-limited, it will not refuse, and
nothing warns you. Drop the suffix and the founder starts getting billed silently on a
pay-as-you-go account. He is unemployed. Do not let this happen.

**HARD RULE — model allowlist of exactly two strings:**

```
poolside/laguna-s-2.1-free
zai/glm-4.6v-flash
```

Any other model id on the Vercel gateway is **forbidden**, including `xai/grok-*`,
`anthropic/*`, and `poolside/laguna-s-2.1`. Enforce it in your own runner config, not by
intention — a literal `Set` membership check that throws before the request is built:

```ts
const GATEWAY_FREE_ONLY = new Set([
  'poolside/laguna-s-2.1-free',
  'zai/glm-4.6v-flash',
]);
function assertFree(id: string): string {
  if (!GATEWAY_FREE_ONLY.has(id)) {
    throw new Error(`Refusing paid Vercel gateway model: ${id}`);
  }
  return id;
}
```

Put that guard in **your** harness. Do **not** add it to this repo — nothing in
`beexly/sports` calls the Vercel gateway, and adding a model router to the app is scope
you were not given.

### `ANTHROPIC_API_KEY` stays out of this

The gateway exposes `anthropic/claude-*` and an Anthropic-compatible endpoint at
`https://ai-gateway.vercel.sh`. **Do not use either.** The founder pays for Claude Max as
a *subscription*; routing Claude through any metered gateway bills him a second time for
the thing he already owns. The standing law — never wire Anthropic into Hermes — covers
the Vercel path exactly as it covers the direct one.

### Retention: know what you are trading

Both free models report `"zdr": "none"` and `"no_training": "none"` in the gateway
metadata. Across all 348 models, `no_training` is `all` for 266 and `none` for 53 — so
`none` is not "unknown", it means **no provider serving this model is under a
no-training agreement**. Setting `providerOptions.gateway.disallowPromptTraining = true`
does not soften that; per Vercel's docs the request fails outright with
`no_providers_available`. Free and no-training are mutually exclusive here.

That is acceptable for this queue, because `beexly/sports` is a public repo — its source
is already public. It is **not** acceptable for anything else. Through the gateway send
only: repo source, test output, diffs, and your own reasoning.

**Never send through the gateway:** `.env` / `hermes.env` contents or any value from
them, `DATABASE_URL` or any connection string, Stripe keys or webhook secrets, DB query
*results* (pick rows, user rows, subscriber emails), or anything from the Neon branch in
H-E. H-E's census output is aggregate counts — those are fine; raw rows are not.

### Auth

The AI SDK reads `AI_GATEWAY_API_KEY` automatically when the model is a plain string.
API keys never expire unless revoked. `VERCEL_OIDC_TOKEN` is the deployment-side
alternative and is short-lived — if `hermes.env` got an OIDC token rather than a gateway
API key, it will work briefly and then start 401ing; that is the symptom, not a bug.
Report it rather than working around it. Do not print the key value into any log,
transcript, or commit — name the variable, never the value.

### Preflight — 30 seconds, do this before you rely on the lane

The founder said "I added Vercel to `hermes.env`" without naming the variable. A Vercel
*deploy* token (`VERCEL_TOKEN`) is **not** a gateway key and will 401 here. Check which one
you actually have — names only, never echo a value:

```bash
grep -oE '^[A-Z_]+(?==)' hermes.env | grep -iE 'vercel|gateway|oidc'
```

- `AI_GATEWAY_API_KEY` present → good, lane is live.
- only `VERCEL_TOKEN` / `VERCEL_OIDC_TOKEN` → the lane is **not** configured. Do not try to
  mint a key, do not hit the Vercel API to create one. Write one line in the ledger —
  "gateway lane unavailable: hermes.env has X, needs AI_GATEWAY_API_KEY" — and run the whole
  queue on OpenRouter exactly as before. This lane is an optimisation; nothing in the queue
  depends on it.

Then prove it end-to-end with the cheapest possible call before wiring it into the runner:

```bash
curl -sS https://ai-gateway.vercel.sh/v1/chat/completions \
  -H "Authorization: Bearer $AI_GATEWAY_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"model":"poolside/laguna-s-2.1-free","max_tokens":8,
       "messages":[{"role":"user","content":"reply with OK"}]}' \
  -w '\nHTTP %{http_code}\n'
```

A `200` means the lane works. A `402`/`403` means the account gates gateway access behind
credits even for $0 models — in that case report it and stay on OpenRouter. **Do not add a
payment method to resolve it.** Spending money is owner-gated.

### Correction to earlier guidance

An earlier session note advised *against* the Vercel AI Gateway on the grounds that it
meant metered billing. That was wrong: it assumed the gateway had no $0 models. It has
two. **The gateway is approved as a free lane under the allowlist above.** Do not treat
the older note as still binding.

---

## Ledger rows to append

```
|| H-H | why health-alert did not fire (READ-ONLY forensics) | TODO | — | — |
|| H-G | suppression curve vs random + oracle baseline       | TODO | — | — |
|| H-C′| e-process: add mixture + log-space + alpha=0.01     | TODO | — | — |
|| H-I | CRON_MATRIX cadence corrections (doc-only)          | TODO | — | — |
|| H-B′| verify cron-matrix --check never writes             | TODO | — | — |
|| H-K | charge.refunded → revocation, flag default OFF      | TODO | — | — |
|| H-J | Terms age-claim amendment DRAFT (no public edit)    | TODO | — | — |
|| H-L | health-alert: stateless cooldown + Discord-compatible payload | TODO | — | — |
|| H-E | CLV census on a Neon branch (self-serve, no founder) | TODO | — | — |
```

Order: **H-E first, then H-K — it is the only task that touches revenue — then H-H, H-G, H-C′, H-I, H-B′, H-J.**

---

## H-H — why did `health-alert` not fire? (READ-ONLY forensics) — **START HERE**

This is the highest-value question in the repo. On 2026-08-17 the scheduler was dead for
~20 hours, then ~3 more. `health-alert` was registered at `*/15 * * * *` the entire time.
Roughly 80 executions should have run during the first outage. Nobody was told.

**Either it did not run, or it ran and did not alert.** Find out which. No database needed —
this is code reading plus the GitHub Actions run history.

Answer each with `path:line`:

1. What does `apps/web/app/api/cron/health-alert/route.ts` actually check, and what condition
   makes it decide to alert?
2. Where does the alert GO — email, push, webhook, log line? Name the transport.
3. **Is that transport configured?** If it needs an env var, name the variable. Do not read
   `.env*` (LAW 2) — determine the variable name from code and report it. Whether it is set
   in production is the founder's to check.
4. Does the route fail silently? Look for a swallowed catch, an early return on a missing
   config value, or a guard that turns the whole route into a no-op when something is unset.
5. Does the alert have a **dedupe or cooldown** that could suppress a sustained outage? A
   "only alert on state change" design alerts once, at hour zero, and stays quiet for the
   remaining 19 hours — which looks identical to never alerting if that one message went
   somewhere nobody reads.
6. Cross-check `free-spine-health` the same way — it is the ingestion heartbeat.

**Deliverable:** `docs/ops/HEALTH_ALERT_FORENSICS.md`. State a single most-likely root cause
in one sentence, with the evidence. If the evidence does not support one, say `UNDETERMINED`
and list what you ruled out. **Do not fix anything** — alerting touches production behavior
and the fix is a founder call once the cause is known.

This matters more than any other open task: it is the difference between finding out about
the next outage in 2 hours versus 20.

---

## H-G — suppression curve vs random and oracle baselines

The synthetic half runs now, with no database. Only the final real-data run waits on H-E.

### Why

GSE pauses ranking groups and runs selective publish, then measures accuracy on what
survives. That has the same unfalsifiability as a router reporting "we cut spend 90%":

> Accuracy measured on surviving picks is a property of the **suppression rate**, not the
> **suppression policy**. Remove picks and the number moves. Judgement and a coin flip both
> move it.

### Get the baseline right — this is the part that matters

You already read `ranking-pause-apply.ts` and `selective-publish-runtime.ts`. **State which
semantics apply, with `path:line`, before writing any code:**

- **DROP** — paused picks are simply not published. Then removing a *random* subset leaves
  expected accuracy **unchanged**, so the random baseline is a **FLAT line** at the unfiltered
  value. The policy must rise above flat.
- **FALLBACK** — paused picks fall back to another signal. Then the random baseline is a
  **straight line** between model-only and fallback-only.

Getting this backwards makes the chart lie in the founder's favour, which is the one direction
this product cannot afford. If both patterns exist in different places, report both and build
for the one that governs what actually gets published.

The **oracle** baseline is the same either way: suppress exactly the picks that lost. It is
the unreachable ceiling and exists to bound the chart.

### Build (pure functions, no DB, no I/O)

- `curveAtRates(scores[], outcomes[], rates[], policy)` → accuracy and Brier on survivors at each rate
- `randomBaseline(outcomes[], rates[], draws)` → mean plus 2.5/97.5 percentile band over 1000 draws
- `oracleBaseline(outcomes[], rates[])` → losers suppressed first
- `curveGap(policy, random)` → area between them; this single number is what the policy bought

**Acceptance criteria — a broken implementation cannot satisfy these:**
```
at f = 0, all three curves === the unfiltered value, exactly
a RANDOM policy passed in as `policy`  → lands inside the random band at every rate
                                          (DROP case: fitted slope CI contains 0)
an ORACLE policy passed in as `policy` → matches oracleBaseline exactly
oracle >= random at every rate
f = 1.0 → explicit defined behavior, never NaN or a crash
the random band contains its own mean at every rate
```

Seed the RNG; state the seed.

**When H-E unblocks**, run it on the real export and write
`docs/ops/calibration/2026-08-18-suppression-curve.md`: the rate table, the gap number, and
one plain sentence saying whether the policy beat random. **If it did not, say so plainly.**
That is the most valuable possible result and must not be softened.

---

## H-C′ — extend the existing e-process (do NOT rewrite `f53b229e`)

Keep `eStep` and `eProcess` exactly as they are. Add only:

- `mixtureEProcess(processes[])` → `M_mix,t = (1/K) Σ_k M_k,t`
- **log-space accumulation** internally, exponentiate at the end. A 1000-pick product of
  ratios underflows float64 silently otherwise. Add a test: n = 1000 with ratios ~1.01
  produces no underflow, no `Infinity`, no `NaN`.
- the null simulation at **α = 0.01** as well as 0.05
- assert `eProcess` returns the **full running series** and `supM = max(M_t)` — Ville's
  inequality is about the supremum over time, not the final value. If the current
  implementation only returns the last value, that is the one real gap to close.

**If the null simulation fails, the implementation is wrong — do NOT adjust the threshold.**
That deletes the guarantee the test exists to provide.

Your v4 result (median 752 picks to `supM ≥ 100` at 55% vs 50%) should be unchanged by this.
If it moves, something regressed — investigate before committing.

---

## H-I — CRON_MATRIX cadence corrections (doc-only)

Per founder decisions 1 and 2 above. In `docs/ops/CRON_MATRIX.md`:

- `refresh-odds` row → `*/15 * * * *`
- `free-spine-health` row → `0 */2 * * *`
- `:38` SLA line → describe live reality: Vercel every 2h plus the GH backstop at `5 */2 * * *`,
  giving roughly hourly effective coverage
- `:7` source-of-truth line → name `apps/web/vercel.json` explicitly, and add one sentence
  saying Vercel reads crons only from the copy inside its Root Directory, so a repo-root copy
  is inert

**Change no schedules. Documentation only.** Verify with `node scripts/ops/cron-matrix-from-vercel.mjs --check`
still exiting 0 afterwards.

---

## H-B′ — verify the generator (5 minutes, not a rewrite)

`4b961782` is done and passing. Confirm one property v5 specified that v4 may not have tested:

```bash
cp docs/ops/CRON_MATRIX.generated.md /tmp/m.bak
node scripts/ops/cron-matrix-from-vercel.mjs --check
cmp docs/ops/CRON_MATRIX.generated.md /tmp/m.bak && echo "PASS: --check did not write"
rm /tmp/m.bak
```

If `--check` writes, fix that one behavior. If it does not, mark H-B′ DONE and move on.

---

## H-E — CLV census: RUN IT ON A NEON BRANCH. No founder steps remain.

**The role-based approach is DEAD. Abandon it entirely.** `hermes_ro` sits in
`neon_superuser`, the revoke cannot be executed through the console, and every attempt to
walk the founder through it has failed. Do not ask the founder to run anything in the Neon
console ever again — that path is closed.

**The replacement is stronger anyway: branch isolation instead of privilege enforcement.**
A Neon branch is a copy-on-write snapshot. On a branch, nothing you do — with any role —
can touch the primary. Production safety stops depending on grants being right.

You already have a working `neonctl` session (you used it for `projects list` and
`roles list`). Do all of this yourself, in your own terminal:

```
# 1. Create the branch (instant, free, snapshot of production at this moment)
npx --yes neonctl branches create --project-id summer-brook-99380762 --name hermes-census-20260818

# 2. Get its connection string. NEVER print it. Capture straight into your session env:
#    PowerShell:  $env:DATABASE_URL = (npx --yes neonctl connection-string hermes-census-20260818 --project-id summer-brook-99380762 --database-name neondb)
#    bash:        export DATABASE_URL="$(npx --yes neonctl connection-string hermes-census-20260818 --project-id summer-brook-99380762 --database-name neondb)"
#    Never write it to any file inside the Sports repo. .env* stays untouched (LAW 2).

# 3. Prove you are on the BRANCH, not the primary:
#    the hostname must contain the NEW branch's endpoint id (compare with
#    `neonctl branches list --project-id summer-brook-99380762` — the primary has a
#    different endpoint id). If the hostnames match the primary, STOP.
```

**Query client:** use `psql` if `command -v psql` finds it. If not, run queries through a
one-off Node script in a scratch directory OUTSIDE the Sports repo (e.g.
`C:/Users/Garrett/tmp-census/`) using the `postgres` npm package installed *there* — the
repo's `package.json` and lockfile stay untouched. Delete the scratch dir when done.

**Then run the census exactly as v5's H-E specified** — sections A (retroactive CLV
feasibility), B (pick universe), C (the 472-vs-1164 filter), D (line archive state),
E (the CSV export H-G needs). Write `docs/ops/calibration/2026-08-18-clv-census.md` with
every query pasted beside its answer.

Rules that survive the switch to a branch:

- **SELECT-only stays the working discipline.** The branch makes writes harmless to
  production, not legitimate. The census needs zero writes; run zero writes.
- **Record the branch name and creation time** in the census doc — the numbers are a
  snapshot as of branch creation, and the doc must say so.
- The old INSERT-must-fail gate is **void** — on a branch it proves nothing. The isolation
  check in step 3 replaces it.

**When the census doc and CSV are committed, delete the branch:**

```
npx --yes neonctl branches delete hermes-census-20260818 --project-id summer-brook-99380762
```

**Credential hygiene, still owed:** two passwords appeared in an earlier session tool log.
The founder should eventually delete `hermes_ro` in Neon and remove
`Downloads/hermes_ro_fixed.sql` — but that is cleanup, not a blocker. Nothing waits on it.

## H-K — `charge.refunded` → entitlement revocation, behind a flag, default OFF

**Why this jumped the queue:** it is the only open item that touches money. Today a Stripe
refund does NOT revoke access — a refunded customer keeps the product. Whether that is
acceptable is the founder's liability call, but the founder should be deciding a **flag
flip**, not commissioning a build. Your job is to make the decision that small.

Build, additively, in the existing Stripe webhook route:

- A handler for `charge.refunded`, gated by `REFUND_REVOKES_ACCESS` (unset/false = today's
  behavior, **byte for byte** — prove it with a test).
- Flag on + **full** refund of a subscription charge → revoke the entitlement (downgrade to
  FREE) using the existing entitlement-update path — do not invent a new one.
- **Partial** refund → log, never revoke. Conservative by design.
- Idempotent: reuse the existing `WebhookEvent` dedupe pattern so a replayed event cannot
  double-fire.
- Touch nothing about existing webhook event handling. Additive only.

**DoD:** tests for flag-off no-op, full-refund revocation, partial-refund no-revoke, and
replay safety; typecheck 0; lint 0; existing webhook suite green. **Never flip the flag —
that is the founder's decision, and the entire point.** If an additive handler is impossible
without restructuring the webhook route, mark BLOCKED — founder call.

---

## H-J — Terms age-claim amendment, DRAFT ONLY

The Terms claim an age gate exists; the product has none. The founder has decided no gate is
needed (no bets are taken) — so the fix is making the Terms stop claiming a control that
does not exist. Public copy is founder-gated, so you draft, you do not publish.

Write `docs/ops/proposals/2026-08-19-terms-age-claim.md`: quote the current Terms text with
`path:line`, propose replacement wording (intended-audience statement, e.g. "intended for
users 18+", with **no claim of verification**), and one paragraph of rationale. **Do not
edit any public page or component.** Founder applies it or not.

---

## H-L — health-alert: make cooldown actually work, and make the payload portable

Two real defects in `apps/web/app/api/cron/health-alert/route.ts`, both found after H-H.
`HEALTH_ALERT_WEBHOOK_URL` is now set in production (ntfy.sh), so alerts fire — these are the
follow-ups that make them trustworthy rather than merely present.

### Defect 1 — the cooldown does not survive between invocations

Line ~36:

```ts
let lastState: HealthAlertState = { lastAlertAt: null, lastUnhealthy: false, lastReason: null };
```

Module-level in-memory state on a **serverless** function. Vercel creates and discards
instances constantly, so `lastState` is `null` on most invocations. The dedupe/cooldown in
`decideHealthAlert` is therefore unreliable: during a sustained outage you get an alert every
15 minutes rather than one, and "recovered" transitions can be missed entirely.

**Do NOT fix this with storage.** Three approaches are ruled out, with reasons:

- **A new Prisma table** — `packages/db/prisma/**` is NEVER-TOUCH (LAW 2).
- **Redis** — `ioredis` is a root dependency but **no code under `apps/web/lib/**` or
  `packages/**` references `REDIS_URL`.** Introducing it means a new env var that is probably
  unset in production, which reproduces the exact silent-no-op bug H-H just diagnosed.
- **Reusing `FilterStateSnapshot` / `SourceSnapshot`** — both exist and both have a `payload
  Json`, but neither is semantically about alerting. Overloading them hides health state
  somewhere nobody would look.

**Do this instead: make the decision stateless via threshold windows.**

The cron runs every 15 minutes, so exactly one invocation lands in any 15-minute window. Alert
when `ingestionAgeMinutes` falls inside a narrow band just past each escalation threshold:

```
[120, 135)    → first alert   (2h stale)
[360, 375)    → escalation    (6h stale)
[1440, 1455)  → daily         (24h stale)
[2880, 2895)  → day 2 …and so on at 24h multiples
```

Each band is one cron period wide, so each threshold fires **exactly once** with no memory of
prior runs. Recovery (`!unhealthy`) may alert unconditionally — a recovery message is cheap
and never floods, because it can only follow an outage.

Implement this in `apps/web/lib/ops/health-alert-decision.ts` — the decision logic is already a
**pure function** (`decideHealthAlert(snap, lastState)`), which is why this is small. Keep the
existing signature and keep honouring `lastState` when it happens to be populated; add the
stateless band test as an additional trigger so behaviour only ever becomes *more* reliable,
never less.

**Tests (pure function, no I/O):** a run at 125 minutes alerts; 140 minutes does not; 365 alerts;
1445 alerts; 130 on a fresh instance with `lastState = null` still alerts (this is the bug —
prove it fixed); recovery alerts; and a simulated 24-hour outage stepped in 15-minute
increments produces **exactly 4 alerts**, not 96. That last one is the real acceptance test.

### Defect 2 — the payload works with almost nothing

The POST body is custom JSON with no `content` and no `text` key:

```json
{ "type": "gse.health_alert", "status": "...", "reason": "...", ... }
```

ntfy.sh accepts it (verified, HTTP 200 — the whole JSON becomes the message body). **Discord
and Slack both reject it with HTTP 400**, because Discord needs `content`/`embeds` and Slack
needs `text`/`blocks`. So the founder is currently locked to one transport.

Add a single `content` string to the payload — a one-line human summary, e.g.
`"GSE health: unhealthy — ingestion stale 1247m (deploy abc123def456)"` — while keeping every
existing structured field exactly as-is. Discord then works, ntfy gets a nicer message, and
nothing that consumes the current shape breaks. Keep it under 2000 characters (Discord's limit).

**DoD:** `npm run typecheck` → 0; `npm run lint` → exit 0; the new decision tests green via the
workspace vitest config; the 24-hour simulation asserts exactly 4 alerts. **Do not change
`HEALTH_ALERT_WEBHOOK_URL` or any env var, and do not send a real webhook from a test.**

---

## ABSOLUTE STOPS

- **Do not touch the calibration gate**, its floors (0.22 / 0.05), or the 3-streak. H-C′ and
  H-G build toolkits; they wire into nothing.
- **Do not flip any env flag or gate** — `LINE_ARCHIVE_ENABLED`, `PUBLIC_PICKS_ENABLED`,
  `PERFORMANCE_STATS_ENABLED`, `SEALED_ENGINE_ENABLED`, `PUBLISH_LEDGER`, `STATS_PUBLIC`,
  `JYNX_CLOUD_ORDER`, `CLAUDE_PROVIDER`, or any other.
- **Do not fix alerting in H-H.** Diagnose only.
- **Do not write to the database.**
- **H-K is the only permitted Stripe surface**, and only as specified: additive, flag-gated,
  default off, never flipped. Nothing else in billing/checkout may be touched.
- **Do not touch `scripts/guardrails/**` or add anything to an allowlist.**
- **Do not create `.github/workflows/quality.yml`.**
- **Do not change model routing.** Laguna stays default; GLM 5.2 is not fallback-eligible;
  Grok/Claude/Gemini/DeepSeek never go on the fallback chain. Do not re-add
  `provider_routing.require_parameters` — forwarding it to Nous returns HTTP 400 and was the
  root cause of the fallback cascade.
  **Scope note:** adding the Vercel gateway as a *transport* for the two allowlisted free
  models (see MODEL ROUTING above) is permitted and does not violate this stop — the model
  set is unchanged. Adding any *different* model, on any transport, does violate it.
- **Never send a paid model id to the Vercel gateway.** Allowlist is exactly
  `poolside/laguna-s-2.1-free` and `zai/glm-4.6v-flash`. `poolside/laguna-s-2.1` — same
  string without `-free` — bills a real card at `$0.10`/`$0.20` per 1M with no warning.
- **Never add an LLM call to a code path, test, or script.** Azure credits are expired and
  Foundry inference is not among the free services, so every call bills a card. Nothing here
  needs one — H-C′ and H-G are arithmetic over boolean vectors and floats.

## When done

Stop. Do not invent follow-on work. Leave the branch unpushed. Put three sentences in the
ledger: the H-H root cause, whether the H-G policy beat random on synthetic data, and whether
`hermes_ro` appeared. Those three set the next session's scope.
