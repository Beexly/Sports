# Overnight handoff — 2026-09-14 05:00 UTC

Written by the Opus session that owns PR #819. You are picking up its work.
Read this file end to end before your first tool call. It replaces a long
conversation; everything you need is here or named here.

---

## 0. Rules that bind you

Read `AGENTS.md` and `CLAUDE.md` first — laws 1-9 apply in full. The ones that
will actually come up tonight:

- **Law 2 — never modify:** `packages/db/prisma/schema.prisma`,
  `packages/db/prisma/migrations/**`, `.github/workflows/**`,
  `scripts/guardrails/**`, `.claude/**`, any `.env*`, `package-lock.json`,
  `.gitignore`, `.githooks/**`, `apps/web/lib/ai-control-plane/**`.
- **Law 3 — never flip a gate or env flag**, and never edit code so a gate
  resolves differently. `PRICING_PHASE`, `PERFORMANCE_STATS_ENABLED`,
  `requireEvidence`, any floor, the 52.4% figure: all founder-only.
- **Law 4 — never write a claim you did not observe.** Every line you report
  traces to a command you ran and output you saw. Not run → write `NOT RUN`.
  Failed → paste the error.
- **Law 9 — never weaken a guard** to make a test pass.
- **Database access is READ-ONLY.** SELECT against live customer data only.
  Never INSERT/UPDATE/DELETE, never run a migration, never run a cron with a
  real secret.

**You DO have push permission, for `claude/nfl-kickoff-live-check-0qwxfm` only.**
Never push to `main`. Never `git commit --no-verify`. Stage by name — never
`git add -A`.

Commit trailer, verbatim, on every commit:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Kfn3zR6n2fUjiDaqjYAFks
```

---

## 1. State at handoff (verified 04:50 UTC, not assumed)

- Branch `claude/nfl-kickoff-live-check-0qwxfm`, head **`01f20cb28`**, 36 commits,
  0 behind `main`, merges clean.
- PR **#819**, open. Commit statuses all `success` (CodeRabbit, Vercel, Devin Review).
- `ci.yml` run **5729** (`pull_request` event) was **in_progress** on this head.
  The prior `pull_request` run 5727 on `7a00d1ed1` was **success**.
- **Normal and not a failure:** each push spawns two CI runs, a `push` one and a
  `pull_request` one, and the `push` one is cancelled seconds in by the
  concurrency group. The `pull_request` run is the authoritative one. Do not
  report "CI cancelled" as red.
- Local: working tree clean, `npm run guardrails` 26/26 green.

**First thing you do:** re-check run 5729's conclusion. If red, read the failing
step's log before concluding anything — do not assume flake. If green, proceed
to §2.

---

## 2. TASK 1 — close the open Devin finding (do this first)

**Thread:** `BUG_pr-review-job-97ff6d5ac8aa4e2995aadc2c7c44b987_0002`, 🟡,
anchored at `packages/prediction-engine/src/scoring.ts:783-788`.

**Devin's claim:** the T-1 consensus evidence contract is bypassed on `/picks`.
`bindPublicConsensusClaim` rejects a consensus claim that lacks a book count or
freshness stamp, but `PickCard` renders `reasoningShort` unconditionally, so the
primary public surface shows the claim without its evidence.

**Verified by the Opus session — do not re-derive these:**

1. `apps/web/components/picks/pick-card.tsx:213` renders
   `{canSeeFactorBreakdown ? pick.reasoning : pick.reasoningShort}` with **no
   binder call and no guard**. `dataFreshnessAt` is used only at :69-70 for a
   separate age footer that silently disappears when null.
2. `bindPublicConsensusClaim` (`apps/web/lib/claims/public-consensus-claim.ts:77`)
   requires: regex match, `bookmakerCount >= 2`, `dataFreshnessAt` present and
   parseable, `consensusPct` in `(0, 1]`.
3. `grep -rn "bindPublicConsensusClaim"` over `apps` + `packages`, tests excluded,
   returns **exactly one production call site**:
   `apps/web/app/preview/[sport]/[slug]/page.tsx:342`. So the tripwire guards
   `/preview` and nothing else.
4. **Production impact today is ZERO.** Read-only SQL over every pick whose
   `reasoningShort` matches any arm of `CONSENSUS_CLAIM_RE`:

```
   rows carrying a consensus claim                1,289
   of those, published                            1,074
   published with dataFreshnessAt NULL                0
   published with bookmakerCount < 2                  0
   published with consensusPct outside (0,1]          0
   published that the binder would suppress           0
```

5. **The blocker Devin did not mention, and it changes the fix.** `PublicPick`
   (`packages/types/src/index.ts:634-733`) carries `reasoningShort` and
   `dataFreshnessAt` but **does NOT carry `consensusPct`, and has no top-level
   `bookmakerCount`** — the only `bookmakerCount` is nested inside
   `marketImplied`, which is emitted only for book-priced two-way MONEYLINE
   picks with a receipt. **So `PickCard` cannot bind the claim today even if you
   call the binder there: two of the three evidence fields are not in the DTO.**

**Recommended fix — server side, not in the card:**

Do the binding in the `/api/picks` serializer, where the Prisma row already
carries `consensusPct`, `bookmakerCount` and `dataFreshnessAt`. Reasons:

- Repo rule 3's instinct: enforcement is server-side, never frontend-only.
- It avoids widening the public `PublicPick` DTO with two new fields.
- Every surface consuming `/api/picks` inherits it.
- `lib/board/state.ts` is a second read surface — check whether it renders
  `reasoningShort` too, and if so cover it the same way.

**Four constraints that must survive your edit:**

- `reasoningShort` is **frozen write-once at creation**. Never rewrite the stored
  string, and never regenerate it. Suppress or fall back at read time only.
- The safe direction here is the **opposite** of `adverse-edge-suppression.ts`.
  There, absence is silence and the row is KEPT. Here, a claim that cannot be
  bound must NOT render. Do not copy that module's asymmetry.
- Do not touch `CONSENSUS_CLAIM_RE` to make anything pass. It has two arms, both
  pinned by test, and the reason is written in
  `apps/web/lib/claims/public-consensus-claim.ts`. Widening it to dodge the
  guard is a law-9 violation.
- Add a test that pins the suppression AND a negative-control test pinning that
  an ordinary non-consensus teaser still renders.

**STOP CONDITION on this task.** If your fix requires **new customer-facing
copy** (a replacement sentence when the claim is suppressed), stop. Do not
invent it. Write up the two or three options in the PR thread and leave it for
the founder. Copy on public surfaces is a founder decision in this repo.

**When done:** reply on the Devin thread saying what changed and why, resolve it,
push. If you conclude no code change is warranted, reply saying exactly that with
the measurement above — a reasoned "not fixing, here is why" is an acceptable
outcome on a yellow, a silent skip is not.

---

## 3. TASK QUEUE after that, in order

Take them one at a time. One task = one commit. Push after each.

**2. Sitemap fixture de-duplication.** The sitemap emits 195 entries for 141
unique fixtures — the same game appears up to three times because of the fixture
triplication documented in `AGENTS.md` (every NFL fixture exists as three `games`
rows). Duplicate URLs in a sitemap are a real discoverability cost. Find the
sitemap generator under `apps/web/app`, de-duplicate on fixture identity (there
is an existing helper, `findTwinCandidate`, used by the suppression path — check
whether it fits before writing a new one), add a test. Verify the count before
and after with a real command and report both numbers.

**3. A `/players/[slug]` route.** There are 1,409 player rows behind exactly one
indexable URL (`/players`). A per-player route is the single largest
discoverability gap in the app. Scope it tightly: server component, reads the
existing player store, `generateStaticParams` or on-demand, canonical tag from
`lib/seo/site-url.ts` (never hardcode a host, never the apex — always the `www`
host `SITE_URL` resolves). **Note honestly in your report that `/players` serves
2024-season data**, two seasons stale, so a new route multiplies stale pages —
if that makes you think the route should wait, say so rather than shipping it.

**4. A checkout-readiness probe on the ops surface.** Issue #822: checkout has
returned 503 since 2026-09-09 and **writes nothing** — no `checkout_attempts`
row, no Stripe session, no log anyone reads. The fix is founder-only, but the
*invisibility* is not. Mirror what this PR already did for the line archive
(`apps/web/lib/ops/line-archive-freshness.ts`, surfaced through
`/api/ops/public-surface-truth`): add a probe reporting whether the advertised
phase price matches a resolvable Stripe price. **Report booleans and cent
amounts only — never a key, never a secret, never a full env value.** Do not
call Stripe from the ops route if that adds a paid API call on every request;
reporting the config shape (phase, advertised cents, whether the matching
`STRIPE_*_PRICE_ID` is set) is enough to make the failure visible and costs
nothing.

**5. `docs/ops/OPERATOR.md` §5 — add the `PRICING_PHASE` ordering warning.**
One paragraph: stepping `PRICING_PHASE` changes the advertised amount, and
`lib/stripe.ts:248` fails closed when that amount does not equal the resolved
Stripe Price's `unit_amount`, so the phase flip and the Stripe Price objects must
move together. This is the runbook entry whose absence cost five days of
checkout. Docs-only, low risk, high value.

---

## 4. Explicitly NOT yours

**Handed to Hermes — do not duplicate, you will create merge conflicts:**
the OOM investigation (#821), the SSRF connect-time control (#820), the
`gate_decisions` retirement, the gate-slate bound, the underround odds
quarantine.

**Founder-only — write it up, never do it:**

- **#822** — checkout 503. Either `PRICING_PHASE=FOUNDING` (one env var) or six
  new Stripe Prices with `<new id>,<old id>` fallbacks. **Editing
  `pricing-phases.ts` amounts or loosening `stripe.ts:248` mis-states a price to
  a customer. Do not.**
- **#823** — `/performance` publishes "53.2% — Conclusive" against a 50.0%
  threshold, and the bettable (book-priced) record on that page's own population
  is **48.95%**, with SPREAD 46.78% and TOTAL 45.95%. The measurement is settled
  and written up in `docs/ops/2026-09-14-FUNNEL-AUDIT.md` §1. The hero framing is
  the founder's call. Do not ship a display change to it. In particular: do not
  drop the model-signal rows from the record, do not move 52.4%, do not pass a
  lower threshold to make the verdict survive.
- MODEL_VERSION bumps, the v5.2.8 `IMPLEMENTED` flip, `requireEvidence`, the
  props env flags, any calibration floor.

**Do NOT merge `hermes/v528-market-gate-preserved-2026-09-11`.** It merges clean
and breaks pick minting in production. Reasons are in `AGENTS.md`.

**Do NOT re-survey these ten branches** — all already landed on main by another
route, all carry nothing but stale ledger bookkeeping: `hermes/hero-r3f-stack`,
`hermes/plain-proof-2026-09-10`, `hermes/fe-c93`, `claude/proven-surfaces`,
`claude/proven-live-ledger`, `claude/c299-test-clock`, `claude/launch-proof`,
`claude/c301-ledger-done`, `claude/no-inplay-picks`,
`claude/c301-loader-candidates`.

---

## 5. Verification discipline — these cost the Opus session real time

- **Never pipe a check to `tail` or `head` and read the exit code.** `tail`
  always exits 0. That session reported "exit 0, green" twice on suites that had
  failed. Capture to a file, or read the real exit code.
- **CI runs Node 20**, pinned in three places in `ci.yml`. `fs.globSync` is Node
  22 and turned the suite red while passing locally. Check any Node API you
  reach for.
- **Run the specific test file**, not the full suite. The full `apps/web` run is
  1,027 files / ~13,980 tests and takes many minutes.
- **Do not pass `--root apps/web` to vitest.** It breaks relative path
  resolution in ~25 source-scanning tests and produces ~85 phantom failures. Run
  vitest the way CI runs it.
- **Nineteen web test files replace `@sports/prediction-engine` with a partial
  `vi.mock` factory.** Before adding any cross-package import to
  `lib/board/state.ts` or the picks route, check that mock list — an import that
  resolves to `undefined` under those mocks silently collapsed the board's
  published lane to zero rows once already. `@sports/types` is the boundary both
  sides cross intact.
- **`npm run guardrails` after editing `AGENTS.md`**, not only after editing
  code. The scanners read that file. A note that *quotes* a banned phrase to
  explain a fix trips the same rule — describe the offending string, never
  reproduce it. Guardrails scan `.md` under `apps/web` and `packages`; `docs/`
  is not scanned, so docs there are safe.
- **An assertion written beside the code it shipped with pins whatever that code
  happened to do, defect included.** This repo has done it at least six times,
  including `line-archive.test.ts` certifying a three-week outage. If a test
  fails and the assertion looks like it was written to match the implementation
  rather than the intent, read the test's own comment for the real invariant
  before you touch either side.

---

## 6. Stop conditions — stop and write it up rather than proceeding

- The task turns out to be founder-only (gate, env flag, price, MODEL_VERSION).
- The fix requires **new customer-facing copy**.
- The change would touch **more than 5 files**.
- You need a **schema change** — the schema is frozen.
- Two attempts failed. Then revert, mark `BLOCKED` with the exact error text,
  move on. A BLOCKED task with an honest error is a success; a third attempt is
  not.

---

## 7. What to report per task

Short, and every line traceable to output you saw:

- files changed
- exact behavior changed
- validation command run
- validation result (real exit code)
- remaining risk
- next safest step

Do not narrate. Do not re-explain a root cause already written in this file or
the ledger.

---

## 8. Context you will want and should not re-derive

- `docs/ops/2026-09-14-FUNNEL-AUDIT.md` — the four-dimension funnel audit.
  Claims are tagged `[VERIFIED]` (command run, printed beside it) or
  `[REPORTED]` (survey agent's evidence, not re-run). Trust the tags; a survey
  agent's number was wrong by a full population in exactly the direction that
  flattered its own headline, and the tag is what caught it.
- `docs/ops/2026-09-14-PRODUCTION-MEASUREMENT.md` — the production measurements
  from earlier in the session.
- `docs/ops/AGENT_LEDGER.md` — the live multi-agent ledger. Claim before
  starting, never edit a row you do not own, `DONE` needs a real SHA or `#PR`.
  Validated by `scripts/ops/check-agent-ledger.mjs` (real exit code, never pipe
  it away).
- `AGENTS.md` THE LOOP — read the top three blocks; the rest is history.
