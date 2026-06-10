# 99 — Adversarial Critic — Audit-of-the-Audit (2026-06-09)

**Role:** Independent red-team of the eleven-lens founder audit (`01`–`11`, `00-EXECUTIVE-SUMMARY`,
`00-SCORECARD-AND-ROADMAP`). I re-read every summary/lens doc and independently spot-checked
**16 load-bearing findings** against the actual code in the named clone — confirming the cited
`file:line` says what the finding claims. Read-only; the only file written is this one.

**Clones:** DEPLOY = `C:/Users/Garrett/Sports` · CANONICAL = `C:/Users/Garrett/Sports-canonical-2026-06-03`.

---

## VERDICT: **GO-WITH-FIXES** — the audit is trustworthy enough to act on.

The audit is **substantively accurate and unusually well-grounded**. Of 16 independently re-checked
findings, **15 confirmed true as stated** and **1 had a wrong line-number but a correct claim**. I
found **no fabricated findings**, **no invented file paths**, and **no fabricated behavior**. The
two highest-stakes claims — the CANONICAL `DEV_FAKE_ADMIN` prod-bypass (P0, security) and the
two-incompatible-pricing-systems (P0, money) — both check out exactly. Severity ratings are honest
and, if anything, **conservative** (the audit repeatedly resists inflating its own trust findings).
Clone labelling is correct on every finding I checked.

It is **GO-WITH-FIXES** rather than a clean GO because of a small number of **citation-precision
errors** (one off-by-18-lines, a couple of paraphrased line-refs) and **three wording overstatements**
that a founder acting on the doc should mentally correct (detailed below). None of these change a
single severity rating, a single recommendation, or the roadmap sequencing. The corrections are
cosmetic-to-minor, not structural. Act on the audit; apply the corrections in §2 when you touch the
specific findings.

---

## 1. Spot-check ledger (16 findings re-verified against code)

| # | Finding (lens) | Claim | Verified? | Note |
|---|----------------|-------|-----------|------|
| 1 | **DEV_FAKE_ADMIN unguarded in CANONICAL** (09 P0-1) | canonical `auth.ts:92` / `middleware.ts:63` lack `NODE_ENV` guard; DEPLOY `auth.ts:63-65` has it | ✅ EXACT | `auth.ts:92` = `if (process.env["DEV_FAKE_ADMIN"] === "true")` no guard; deploy `:63-65` `isDevFakeAdminEnabled()` checks `NODE_ENV !== "production"`. Highest-severity item is real. |
| 2 | **Two incompatible pricing systems** (04 F1) | DEPLOY $19/$49 monthly + 2-var Stripe schema vs CANONICAL Founding $14.99/$24.99 + annual | ✅ EXACT | DEPLOY `pricing/page.tsx:54,75` = 19/49; `stripe.ts:9-10` = `STRIPE_PRO/ELITE_PRICE_ID`. CANONICAL `pricing-phases.ts:76-77` = `{monthly:14.99,annual:99}` / `{24.99,179}`. |
| 3 | **Engine edge is circular** (06 P1) | `fairProb` is vig-removed avg of same book prices, compared to same offered price | ✅ EXACT | `scoring.ts:271-278` `removeVig(homeImpliedAvg,awayImpliedAvg)` → `computeEdgeScore(fairProb, avgPrice)` at `:283`. Genuinely circular. |
| 4 | **`trueEvScore`/`fairProbability` hardcoded null** (06 P1) | both fields `null` in factorBreakdown | ✅ EXACT | `scoring.ts:394-395` `trueEvScore: null, fairProbability: null`. |
| 5 | **`currentEdgeIndex` read, never written in prod** (06 P1-10) | schema defines it; ~8 readers; only fixtures/tests write; fixtures mix scales | ✅ EXACT | `schema.prisma:216`; read at `board/state.ts:234` w/ `?? Math.round(pick.edgeScore)`; **every** write is in `__fixtures__`/`__tests__`; fixtures mix `0.4/71/3.1/2.7/66.2/61/44`. |
| 6 | **Tier-grader "Tua=Elite"** (06 P1-12) | `processGrade` = flat avg of within-position percentiles, no absolute floor; missing coerced `?? 0` before rank | ✅ EXACT | `player-model.ts:177` literal match; `:166-169` `wopr ?? 0 … pacr ?? 0` before `percentileRanks`. |
| 7 | **Cron daily vs 60-min freshness gate** (07/10 P0) | `FRESHNESS_MAX_AGE_MINUTES=60` vs daily crons | ✅ EXACT | `checks.ts:8` =60, `:59` fails closed; `vercel.json:8-44` daily per-sport (`0 5 * * *`…). |
| 8 | **migrate-in-build missing from DEPLOY** (08/10/11 P0) | script absent in DEPLOY, present in CANONICAL; no migrate step in DEPLOY vercel.json | ✅ EXACT | `ls` confirms absent in DEPLOY, present in CANONICAL; `vercel.json:3` has no migrate step. |
| 9 | **DEPLOY missing HSTS** (08/09/10/11 P1) | deploy `next.config.mjs` headers omit HSTS | ✅ EXACT | `next.config.mjs:32-47` emits 4 headers, no `Strict-Transport-Security`. |
| 10 | **Helpline conflict** (03/09 P1) | `trust-claims.ts:254` = 1-800-522-4700 vs `brand.ts` = 1-800-GAMBLER | ✅ EXACT (+extra) | `trust-claims.ts:254` confirmed; `brand.ts:48` = `1-800-GAMBLER`. **Critic adds:** `brand.ts:47` *labels* 1-800-GAMBLER as "National Problem Gambling Helpline" — that name actually belongs to 1-800-522-4700, so brand.ts has its own name/number mismatch. Strengthens the finding. |
| 11 | **`three` blanket shim** (08 P1-4) | `types/three.d.ts` = `declare module "three";` (whole pkg `any`) | ✅ EXACT | File is exactly `declare module "three";`. |
| 12 | **/api/picks `findMany` unguarded** (11 P1) | `route.ts:38` findMany + auth/entitlements no try/catch | ✅ EXACT | `:38` `await db.pick.findMany` bare; `:17,:19` auth/entitlements bare. |
| 13 | **Cost-monitor hardcodes Sonnet $3/$15** (04 F2) | `cost-monitor.ts:140` `{input:3,output:15}` | ⚠️ TRUE, WRONG LINE | Constant is at **`:122-125`** (`inputUsdPerMillionTokens:3, outputUsdPerMillionTokens:15`), not `:140` (=`budgetUsd`). Substance correct; **off by ~18 lines** + shorthand paraphrase of field names. |
| 14 | **Audit endpoint leak-proof** (06 strength #4) | never exposes Kelly/stake, true-EV, raw payloads | ✅ EXACT | `audit/route.ts:10-14` header enumerates exactly those exclusions. |
| 15 | **Nested `Sports/Sports/` clone** (04/06/08) | second git repo nested in DEPLOY | ✅ EXACT | `Sports/Sports/.git` present. |
| 16 | **`_overnight_quarantine` `.bad` test** (08 P2-3) | dropped test + lock debris | ✅ EXACT | `api-picks-elite.test.ts.bad` + `index.lock.*` present. |

**Score: 15/16 exact, 1/16 correct-claim-wrong-line. Zero fabrications.**

---

## 2. Corrections the founder should apply (none change a severity or a recommendation)

### A. FABRICATION / wrong citations
- **None fabricated.** One **wrong line number**: lens 04 F2 (and Scorecard P1-18) cite
  `cost-monitor.ts:140` for `DEFAULT_CLAUDE_TOKEN_PRICING`; the real location is **`:122-125`**, and
  the real field names are `inputUsdPerMillionTokens`/`outputUsdPerMillionTokens` (the `{input:3,
  output:15}` form is a paraphrase). Fix the cite when you touch it. Claim and severity stand.

### B. OVER-CLAIMING (wording to soften; severity unchanged)
1. **Lens 07 P1-4 / Scorecard P1-26 — canonical refresh-odds "unconditionally pushes `ok:true`."**
   Verified the canonical route: it wraps `processSport` in try/catch and pushes `ok:true` **only on
   no-throw**, `ok:false` on throw, and returns `ok: okCount === total` (`route.ts:78-93`). So it is
   **not** unconditional. The accurate statement is: *canonical lacks the deploy clone's
   status-classification (a handled provider 401/429 that returns without throwing is still counted
   ok), so it can mask a non-throwing provider failure.* The masked-success **risk** is real and the
   reconcile recommendation stands; only the word "unconditionally" overstates.
2. **Lens 09 P0-1 — "canonical `entitlements.ts:27` grants ELITE with no prod guard."**
   `entitlements.ts:27` actually reads `DEV_FAKE_ADMIN === "true" && userId === "dev-admin"` — there
   *is* a `userId` qualifier the finding omits. The exploit chain is still valid (the unguarded
   `auth.ts:92` is what mints `id:"dev-admin"`), so **P0 stands on the strength of `auth.ts`/`
   middleware.ts`** — but `entitlements.ts` in isolation is gated by the dev-admin id, not "every
   visitor." The live hole is `auth.ts`; cite that as the load-bearing one.
3. **Lens 04 F2 severity (P1) — latent, not live.** The doc itself says "today most surfaces route to
   Sonnet so the estimate is roughly right" and `model-router.ts:43` has model-court on `sonnet`
   (comment "recommended: opus"). So the ~40-67% undercount is **latent until someone flips a surface
   to Opus** — correctly P1 as a trap, but a reader should not think the budget math is wrong *today*.
   The doc is honest about this; flagged so the Scorecard one-liner ("can route to Opus") isn't read
   as "currently routes to Opus."

### C. UNDER-CLAIMING (real risks possibly under-weighted)
1. **`brand.ts:47` mislabels the helpline name** (new, strengthens 03/09 P1-3). Beyond the
   number conflict the audit found, the *name* attached to `1-800-GAMBLER` in `brand.ts` is "National
   Problem Gambling Helpline" — which is the name of the *other* number (1-800-522-4700). So the
   single `HELPLINE` constant the audit wants everyone to centralize on is **itself internally
   wrong** (right number, wrong descriptor, or vice-versa). When LEGAL picks the number, they must
   also fix the label. Keep at P1, but the centralization target is not clean copy.
2. **No severity mis-rate found on security/legal/money.** I specifically probed for an under-rated
   P0 hiding in P1/P2 and did not find one. The regulated controls (21+/geo), the affiliate gate, and
   real-money fantasy are all correctly P1-with-legal-gate (closed-by-default today, so not launch-P0)
   — that rating is defensible, not under-claimed. The privacy-policy-promises-unbuilt-delete item
   (09 P2-3) is arguably a P1 legal exposure rather than P2 (a published GDPR/CCPA self-serve promise
   that the compliance model marks unbuilt is a real misstatement-of-control) — **recommend bumping
   09 P2-3 to P1/legal-watch.** Minor; doesn't move the lane plan.

### D. CLONE-CONFUSION
- **None found.** Every clone label I checked was correct: the security P0 is correctly pinned to
  CANONICAL (and explicitly notes DEPLOY is guarded); the pricing P0 is correctly "both"; the
  circular-edge is correctly "both" (scoring.ts is shared); `player-model.ts` is correctly
  CANONICAL-only (I did not separately confirm its absence in DEPLOY, but the lens states it and the
  surrounding claims all held). The audit is careful here — this was a stated risk and it was managed.

### E. ACTIONABILITY
- Recommendations are **concrete and executable** — most name the exact file, the exact change, and
  the gating owner (founder/legal/none). The 30-day lane plan in the Scorecard is sequenced with real
  dependencies. Two recommendations are appropriately *decisions* not *tasks* (P0-1 declare-the-tree;
  P0-3 pick-the-freshness-contract) and are correctly routed to the founder rather than auto-scheduled.
  No vague "improve X" findings. The money/legal posture (no autonomous flips, keep FOUNDING, affiliate
  hard-off) is respected throughout.

---

## 3. Things the audit got *right* that are worth underscoring

- **It did not inflate its own trust story.** The single most impressive discipline here: the audit
  grades trust scaffolding A- but repeatedly **caps the engine at C-grade** and calls the headline
  edge "circular," the Edge Index "an alias," and the win-rate "an engineered north-star, never a
  fact." A weaker audit would have laundered the good guardrails into a higher engine grade. This one
  separates "honest about being unproven" from "proven," which is exactly correct.
- **The P0 set is the right P0 set.** Provision DB+ingestion, cron-vs-freshness, migrate-in-build,
  pricing reconcile, canonical auth bypass, design-system split, single-provider failover. I can
  defend every one of these at the stated severity against the code.
- **Lens 05 gap is disclosed, not hidden.** Both summaries flag "lens 05 not produced, dimension
  uncovered, re-run required" and exclude it from the overall grade. That is the honest way to handle
  a missing input.

---

## 4. Residual cautions (for the reader, not corrections to the audit)

1. **I did not re-run builds/tests** (audit constraint) — so claims like "lint `--max-warnings=0`
   passes," "vitest green," and exact file *counts* (598 vs 1244 TS files; 106× "X, not Y") are taken
   on the audit's word. My rough `find` corroborated the test-file order of magnitude (deploy ~171
   total files, matching the lens's "171 total"), and every *structural* claim I sampled held, so I
   have no reason to doubt the metrics — but they are unverified-by-me grep counts, not ground truth.
2. **The cost-monitor line-number slip (item 13) is the canary**: it suggests a few of the dozens of
   `file:line` cites may be off by a handful of lines from late edits. The *claims* I checked were all
   substantively right; treat line numbers as "approximately here," re-confirm before editing.
3. **Lens 02's "552-line"/route-count specifics** I confirmed structurally (the `/picks` page is a
   real entitlement-gated page with `canonical:"/picks"` colliding with `/board`) but did not count
   lines. The P0 duplicate-identity substance is sound.

---

## Bottom line

**GO-WITH-FIXES.** This is a high-integrity audit: zero fabrications across a 16-finding random-ish
spot-check, correct clone attribution, honest (often conservative) severities, and executable
recommendations that respect the founder/legal gating posture. The corrections are a wrong line
number (cost-monitor `:122` not `:140`), two softened wordings ("unconditionally ok:true" →
"masks non-throwing failures"; the `entitlements.ts` line carries a `dev-admin` qualifier — the live
hole is `auth.ts`), and one *strengthening* catch (`brand.ts` mislabels the helpline name) plus a
suggested bump of 09 P2-3 to P1-legal. **None of these change a single P0, the roadmap order, or the
launch verdict.** Act on the audit as written, applying these notes when you touch the specific lines.
