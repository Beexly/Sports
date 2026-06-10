# 04 — Adversarial Critic: Vision 2026 Program

> **Role.** Red-team the Vision 2026 doc set (`00-vision.md`, `01-gaps-and-adds.md`,
> `02-departments-and-agents.md`, `03-ai-native-intelligent-ux.md`,
> `03-data-and-analytics-stack-2026.md`, `03-program-build-queue.{md,jsonl}`, and the three
> companions they hang off: `visual-motion-2026.md`, `20-growth-…md`, `30-integrations-…md`).
> Break them on six axes: **(1) fabrication**, **(2) overclaim**, **(3) feasibility / mis-tag**,
> **(4) the reins**, **(5) coherence**, **(6) completeness**. Issue **GO / GO-WITH-FIXES / NO-GO**,
> a prioritized fix list, and the honest top-3 highest-leverage moves.
>
> **Author lane:** RESEARCH + DOC only. No source/test/config/schema/env/package file in either
> clone was modified. This critic flips no live switch. Every "current-code" judgment below was
> re-verified by reading the cited file in the actual clone; my independent grounding log is §F.
>
> **Clones:** DEPLOY = `C:/Users/Garrett/Sports` (launch target). CANONICAL =
> `C:/Users/Garrett/Sports-canonical-2026-06-03` (full platform).

---

## Verdict: **GO-WITH-FIXES**

The Vision 2026 set is, to an unusual degree, **honest, grounded, and internally disciplined**. I
independently re-read **11 of the load-bearing code citations** and **9 matched cleanly** (§F). The
tag discipline (`safe-now` / `founder-gated` / `legal-gated` / `aspirational`) is applied
consistently, the reins are not just respected but *encoded as the org doctrine* (doc 02 §6), and the
central structural thesis — *substance-ahead, surface-behind, clone-stranded; the work is convergence
not invention* — is **correct and well-evidenced**. I confirmed the two facts the whole program turns
on: CANONICAL holds the matured layer (cockpit/compliance/CLV/cinematic) and DEPLOY does not, and
DEPLOY holds the better launch-hardening (the job-truth 207/502 contract). This is not a hype document
dressed as a plan.

It is **GO-WITH-FIXES**, not a clean GO, because there are a **small number of real defects** — two of
them load-bearing — that, left unfixed, would let a downstream builder act on a claim that the code
no longer supports, or mis-sequence a founder-gated move as safe-now:

- **One drifted/over-strong technical claim** repeated across three docs (the "edge is circular /
  independent fields hardcoded `null`" framing — the code actually has a *gated shadow estimator*, not
  a hardcoded null), which an internal doc (04-analytics AN) *contradicts in the same folder*.
- **One unverifiable-as-stated regression direction** (`DEV_FAKE_ADMIN` "absent in CANONICAL" — the
  string is present in CANONICAL's `auth.ts`; the *guard strength* differs, but the binary framing is
  wrong), and the masked-success "still live in CANONICAL" needs a precise re-cite.
- **A real-world clone-count blind spot**: the program is architected around exactly **two** clones,
  but there are **≥6** working `apps/web` trees on this machine. The convergence plan does not name a
  clone-quarantine step, which is the single biggest *operational* risk to a "one source of truth" goal.
- **Effort optimism** on three multi-day items tagged "M" that are really "L," and one safe-now item
  whose hard part is gated.

None of these rise to NO-GO. None of them involves a flipped reins. Fix the eight items in §E and the
set is GO.

---

## 1. FABRICATION audit — did anything get invented?

**Headline: no invented benchmarks, no invented files.** Every external 2026 benchmark I spot-checked
carries a source line (doc 03-data §6 has eight numbered sources; doc 03-ai-native §8 lists ~12; the
growth numbers — streaks 12%→55%, 3-tier ~1.4×, etc. — are attributed). Every "we have X" I sampled
resolved to a real file. The docs even pre-disclose their own soft spots ("the record is built but
unproven," "the edge is circular until de-circularized"). That is the opposite of fabrication.

**But three citations have *drifted* — the file is real, the line/precision is now wrong:**

| # | Claim (doc) | What the code actually shows | Severity |
|---|---|---|---|
| **F1** | "the two independent-estimate fields are **hardcoded `null`** (circular edge, `scoring.ts:393-395`)" — doc 01 §D, echoed in doc 03-data §1 table | `scoring.ts:391-410` is a **gated shadow estimator**: `const independentEstimate = SHADOW_INDEPENDENT_ESTIMATOR_ENABLED ? estimateIndependentProbability({…}) : …; fairProbability: independentEstimate?.fairProbability ?? null`. The `null` is a **fallback when the shadow flag is off**, not a hardcode. The estimator is real (`independent-estimator.ts`). | **HIGH — drift + internal contradiction.** Doc 04-analytics AN gets it *right* ("a real shadow non-market estimator `independent-estimator.ts`, WIN-03, gated, doesn't feed published confidence"). Two docs in the same folder describe the same code two different ways. |
| **F2** | `cinematic-entrance.tsx:73-78` hardcodes hex off the tokens (doc 01 V5; program V26-206) | **Confirmed true** — `toneColor` map at ~`:73-78` is literal `#22d3ee/#f472b6/#a78bfa/#f0f4ff`. Citation is accurate. | none (verified good) |
| **F3** | `answer.ts:96,226-253` citation enforcement; `:195-224` refusal taxonomy | **Confirmed** — `ANSWER_CITATION_PATTERN` at `:96`, refusal detect at `:102-106`, `(source: … at <ISO>)` emitted at `:343`. Line numbers are right. | none (verified good) |

**The F1 fix is not cosmetic.** The *conclusion* both docs draw ("published edge is still
market-derived, an independent input would de-circularize it") is **correct** — but the *evidence
phrasing* ("hardcoded null") is false and contradicts a sibling doc. A builder reading doc 01 would go
looking to "remove a hardcoded null" and find a working gated estimator instead. **Fix: replace
"hardcoded null" everywhere with "gated shadow-only; `?? null` fallback when
`SHADOW_INDEPENDENT_ESTIMATOR_ENABLED` is off; never feeds published confidence" and reconcile doc 01
§D to match doc 04-analytics AN.**

---

## 2. OVERCLAIM audit — ambition stated as fact?

The doc set is **mostly careful** to frame the destination as a goal. Doc 00 §4 has an explicit
"Honest caveats (so this is ambition, not hype)" block; doc 01 §0 says the program is "~70%
wiring/consolidation/presentation and ~30% net-new." Both are honest framings. The title "The Best
Website of 2026" is correctly positioned as a thesis to *build toward*, not a current state (doc 00
§1 closes "almost all of it is already built … the work of 2026 is convergence, activation, and
proof" — i.e., not-yet-true, by its own words).

**Real overclaims to fix:**

| # | Overclaim | Reality | Fix |
|---|---|---|---|
| **O1** | Program V26-008 / doc 00 §5: `DEV_FAKE_ADMIN` production guard is **"the one regression flowing the other way"**, present in DEPLOY and **absent in CANONICAL**. | `DEV_FAKE_ADMIN` is present in **both** clones' `lib/auth.ts` **and** both `app/api/dev/state/route.ts`. DEPLOY *additionally* references it in `lib/entitlements.ts`; CANONICAL references it in `app/admin/dashboard/dashboard-view.tsx`. The *guard implementation* may be stronger in DEPLOY, but **"absent in CANONICAL" is false as written.** | Re-verify the actual guard (does CANONICAL's `auth.ts` fail-closed in prod?) and restate precisely: "DEPLOY's `DEV_FAKE_ADMIN` is hardened with an additional prod guard at `entitlements.ts`; CANONICAL's path lacks that specific guard" — *if* that's what the code shows. Do not ship "absent." |
| **O2** | Doc 00 §5 / program Wave 0: "the masked-success bug that's fixed in DEPLOY but **still live in CANONICAL**." | DEPLOY's job-truth contract is confirmed fixed (`refresh-odds/route.ts:133-157`, 200/207/502 split). I could **not** confirm the bug is "still live in CANONICAL" from the same line region (CANONICAL's file differs in shape). The *direction* is plausible and consistent with memory, but it is **asserted, not shown**. | Add a CANONICAL `file:line` that demonstrates the masked success, or soften to "DEPLOY hardened this; verify CANONICAL before treating it as the trunk." It's load-bearing for "converge toward DEPLOY," so it deserves a real cite. |
| **O3** | Doc 00 §1: "No competitor is building all three [pillars]." | This is a **competitive-intel assertion** with no per-competitor citation in doc 00 (the table in §4 cites the companion growth doc, but "*nobody* is building all three" is an absence-claim, the hardest kind to prove). | Down-rank from fact to thesis: "we have found no competitor building all three" + point at the growth-doc's competitor scan. Absence claims should be hedged. |
| **O4** | Doc 01 §0 / summary: "**68 total adds**" but the header line says "**61 total**" and the per-dimension table sums to 68. | Internal arithmetic inconsistency (61 vs 68) in the same doc. | Pick one; the table sums to 68. Trivially fixable but it's the kind of thing a skeptic seizes on. |

**Not overclaims (defended as fair):** "crown jewel" trust posture (quotes the audit, not self-graded);
"A-grade design system" (the audit graded it; doc cites `design-tokens.css`); "substance-ahead,
surface-behind" (independently true on every dimension I checked).

---

## 3. FEASIBILITY / MIS-TAG audit — is anything tagged too easy?

The tag distribution is **defensible**. The headline "~38 safe-now" survives scrutiny because the
safe-now items really are *port-inert-machinery / expose-results / instrument* moves, none of which
flips a switch. But four items are **mis-effort'd or mis-gated**:

| # | Item | Tagged | Should be | Why |
|---|---|---|---|---|
| **C1** | V26-003 / V1 "Port the matured design system into DEPLOY" | `safe-now`, **L** | `safe-now`, **L+** (correctly L; flagging the *scope*) | This is the single largest port: surface/paper/data tokens + Tailwind scale + cinematic-entrance + Reveal/Atmosphere + dataviz kit, against a clone with **1696 raw-neutral classes** to reconcile. Tagging is right (L) but the doc undersells that this is the *long pole of Wave 0*, not a peer of the other M ports. Call it out as the critical-path item. |
| **C2** | AI3 / V26-203 "Generative UI inside answers" | `safe-now / founder-gated`, **M** | mostly **founder-gated**, **M→L** | The *curve* is safe-now/public; the *factor bars* are PRO-gated AND require wiring server-side deterministic component rendering into the answer pipeline + extending the method-leakage test to every new surface. The "safe-now" half is the easy half; the valuable half is gated and larger. The doc says this, but the **headline tag reads safe-now-leaning** — invert the emphasis. |
| **C3** | D2 / V26-301 "second odds provider + failover" | `safe-now / founder-gated`, **L** | correct **L**, but the **safe-now plumbing is the small half** | Porting `resolveOddsWithFailover` is days; the value (a *second live paid provider* removing the SPOF) is founder-gated $ AND requires a new key, contract, and ingestion-shape reconciliation. Fine as tagged; just don't let "safe-now plumbing" imply the SPOF is closed safe-now. It isn't — the SPOF closes only when the paid key lands. |
| **C4** | T3 / V26-104 "Land the independent `fairProbability` … de-circularizes the edge" | `founder-gated`, **L** | `founder-gated`, **L** + **aspirational accuracy outcome** | The *wiring* is L and founder-gated (a `MODEL_VERSION` bump). But the **claim that it "de-circularizes the edge"** is an *accuracy outcome that has to be earned out-of-sample*, not a guaranteed result of wiring. The shadow estimator existing (`independent-estimator.ts`) ≠ it beats the close. Tag the *outcome* aspirational-until-proven; the *build* is founder-gated. |

**Under-estimated effort, net:** C1 (design port) is the true critical path and should be flagged as
the gate on all of Wave 2's polish; C2/C4's *valuable* halves are bigger and more gated than the
blended tag suggests. None is mis-tagged to the point of danger; all four are "the easy half is
advertised louder than the hard half."

---

## 4. THE REINS audit — does anything cross a line?

**This is the set's strongest axis. Nothing crosses a reins, and the guardrails are encoded, not
promised.** I checked every category:

| Rein | Verdict | Evidence |
|---|---|---|
| **No autonomous money** | **HELD.** Every pricing/Stripe/affiliate item is `founder-gated`; V26-002 explicitly says "do NOT create Stripe price objects until reconciled"; monetization levers are inert with a live-URL test-guard. | doc 02 §3.3; program V26-002/405; `monetization-levers.ts:296-304` |
| **No autonomous publish/deploy** | **HELD.** Deploy/publish/`MODEL_VERSION` pinned to APPROVE tier "by construction" (doc 02 §4); the autonomy ladder *cannot* auto-enable a regulated action (type-locked). | doc 02 §4; `departments.ts:6-12` |
| **Reveal-less recipe** | **HELD — and this is the most careful part.** Every AI-native add (citation chips, generative UI, evidence-walk, Slate Brief) is explicitly scoped to *results + grounding, never weights/aggregation/Signal-existence*, with the method-leakage test named as the enforcement (doc 03-ai-native §6.1). The "interrogate the intelligence, never the recipe" contract (§3) is correct. | doc 03-ai-native §3, §6; `method-leakage-gate.test.ts` |
| **No real-money / chance gambling** | **HELD.** Beat the Model rewards "logged reasoning, never spend"; no chance/casino/sweepstakes anywhere; FAN lens is treated as an RG asset. | doc 00 §2.4; growth-doc §A |
| **No TOS-violating data** | **HELD.** Every data-depth add routes through `source-registry.ts` `assertIngestible`; NGS/scraping is `legal-gated`; "never wire a forbidden/paid source." | doc 03-data §3.3, §5 |

**One reins-adjacent nit (not a violation):**

- **R1 (legal-gated, correctly tagged, but sequencing risk):** the responsible-gaming helpline conflict
  (1-800-GAMBLER vs 1-800-522-4700) is real — **I confirmed both numbers are present in the DEPLOY
  build** — and the docs correctly tag the *number choice* legal-gated and say it "must be fixed before
  any regulated email/push ships" (program guardrails §). Good. The only risk is **ordering**: V26-403
  (Klaviyo lifecycle) and AI5/V26-402 (Novu push) are in later waves but *both ship regulated copy*. The
  program guardrail names this, but the **per-card `dependsOn` does not pin those cards to the helpline
  fix.** Add the explicit dependency so the loop can't be wired before the number is resolved.

**Verdict on the reins: clean.** The single most reassuring thing about this set is that the reins are
not an afterthought paragraph — they are the *spine* of doc 02 and a guardrail block in every other doc.

---

## 5. COHERENCE audit — does the program build to the goal, and is convergence sequenced first?

**Yes, and yes — this is the set's best structural decision.** Every doc independently arrives at the
same keystone (converge the two clones / audit P0-1) and every doc subordinates its own
recommendations to it ("the future is already written, it's just in the wrong clone"). The program
build queue makes it literally Wave 0 / V26-000 and correctly marks it the unlock that turns every
later item into "port-or-activate" instead of "rebuild." The dependency logic is sound: trust-spine
(observability + CLV) → cinematic layer → interrogation surfaces → growth loop → governance. I cannot
fault the sequencing logic.

**Coherence defects to fix:**

| # | Defect | Fix |
|---|---|---|
| **K1** | **The "converge toward DEPLOY as trunk" decision rests on two claims I could only half-verify** (O1 `DEV_FAKE_ADMIN`, O2 masked-success). If either is wrong, the *direction* of convergence (DEPLOY-trunk vs CANONICAL-trunk) could flip — and that is the most expensive decision in the program. | **Before V26-000 is actioned, a human must re-verify the two "DEPLOY is better-hardened" claims at file:line.** The recommendation is probably right, but it is currently resting on one confirmed fact (job-truth contract) and two asserted ones. Make all three load-bearing facts cited. |
| **K2** | **Wave 0 bundles two founder *decisions* (deploy tree, pricing) with ~7 safe-now *ports* in one wave.** A reader could think Wave 0 is "mostly safe-now" and start porting before the trunk decision is made — porting onto a clone that might not be the trunk. | Split Wave 0 into **0a (the two blocking decisions, founder-gated)** and **0b (the ports, safe-now, gated on 0a)**. The docs *say* the decision comes first; the wave table doesn't *enforce* it. |
| **K3** | **Personalization is both "the one foundation GSE genuinely lacks" (doc 00 §2.5, doc 01 §0) and tagged `aspirational` and parked in Wave 2 (V26-207).** If it's the keystone net-new differentiator, parking it as aspirational-Wave-2 undersells it; if it's aspirational, stop calling it the thing that makes GSE 2026. | Resolve the tension: personalization-of-*presentation* (lens memory, AI6/V26-… ) is `safe-now` and should ship early; personalization-of-*layout* (adaptive nav/reorder) is the genuine aspirational build. Separate the two so the cheap half isn't held hostage to the expensive half. |

---

## 6. COMPLETENESS audit — what blind spot is still missing?

The eight dimensions are well-covered. The gaps are **operational and cross-cutting**, the kind a
dimension-by-dimension structure naturally misses:

| # | Missing dimension | Why it matters | Tag |
|---|---|---|---|
| **M1 — CLONE PROLIFERATION (the big one)** | The program assumes **two** clones. This machine has **≥6** working `apps/web` trees (`Sports`, `Sports-canonical-2026-06-03`, `Sports-deploy-fix`, `Sports_release_codex`, `Sports-canonical-2026-06-03`-adjacent, plus `OneDrive/…/Galaxy Sports Edge Launch Ready`, `gse_push_tmp`, and `_backup_old_repos/*`). "One source of truth" is **impossible to achieve or maintain** while 4+ stale trees with live `answer.ts`/`auth.ts` sit around — a fix or a leaked key could land in the wrong one. **No doc names a clone-quarantine/archival step.** | **safe-now**, S, and it should arguably be **V26-000-prerequisite**: inventory + archive/delete the non-canonical trees before declaring a trunk. |
| **M2 — Migration/data-state for the ports** | Several Wave-0/1 ports carry **schema migrations** (CLV `Pick.clv*`, the audit-ledger table, persisted `GateDecision`/`currentEdgeIndex` rows). The docs note "migrations must lead code" (memory) but **no doc sequences the migration order across the ports**, and porting CLV + governance + edge-index writers each adds tables. A migration-ordering plan is missing. | **founder-gated**, M. Add a "migration sequence" sub-plan to Wave 0/1. |
| **M3 — Rollback / launch-night runbook for the converged tree** | The program gets DEPLOY to inherit CANONICAL but never states **how you roll back a bad convergence**. Memory notes prod is *alias-based* (`vercel rollback` won't work). A convergence that breaks the launch clone has no documented escape hatch in this set. | **safe-now**, S (doc), references existing `docs/command-center/launch/`. |
| **M4 — Cost of the activation, not just the build** | The docs cost items in effort (S/M/L) but **never in $ run-rate**: a second paid odds provider, Klaviyo, SigNoz/Amplitude keys, a warehouse, Langfuse — each is a recurring bill. Doc 02 even flags the Opus-cost-undercount trap but the program's Finance head is `aspirational`. There is no consolidated "what does turning all this on cost per month" line. | **founder-gated**, S (doc). A one-table monthly-COGS estimate would make the founder-gated flips decidable. |
| **M5 — Accessibility/SEO is in doc 01 but thin in the program** | Doc 01 §7 (Performance/A11y/SEO) has 9 strong adds (AA contrast, HSTS, `llms.txt`, canonical-host), but the **program build queue under-represents them** — only V26-305 (uptime probe) and the design-token sync (folded into V26-003) appear; the live AA contrast regression and the missing security headers are arguably **launch-blocking** and deserve their own Wave-0 cards. | **safe-now**, S/M. Promote P1/P2/P5 (AA contrast, HSTS, canonical host) into explicit Wave-0 cards. |

**Not missing (credit where due):** the trust/differentiation dimension, the reveal-less contract, the
compliance-as-code posture, the org/autonomy model, and the competitive framing are all thoroughly
covered. The blind spots are the *connective tissue* (clones, migrations, rollback, $), not the
product vision.

---

## E. Prioritized fix list (do these, then it's GO)

**Must-fix before any builder acts (load-bearing):**
1. **Fix F1 everywhere** — replace "independent fields hardcoded `null` / circular edge" with the
   accurate "gated shadow estimator (`independent-estimator.ts`), `?? null` fallback when the flag is
   off, never feeds published confidence." Reconcile doc 01 §D ↔ doc 04-analytics AN. *(HIGH)*
2. **Re-verify and restate O1 + O2** — the two "DEPLOY is the better trunk" claims (`DEV_FAKE_ADMIN`
   absence, masked-success direction) with real CANONICAL `file:line`s, because the **direction of
   convergence** (V26-000) depends on them. *(HIGH)*
3. **Add M1 — clone-quarantine card** as a V26-000 prerequisite: inventory and archive the ≥4 stale
   `apps/web` trees before declaring a trunk. *(HIGH — this is the real "one source of truth" risk)*

**Should-fix (correctness + sequencing):**
4. **K2 — split Wave 0** into 0a (two founder decisions) and 0b (safe-now ports, gated on 0a).
5. **R1 — pin the helpline fix** into the `dependsOn` of every regulated-copy card (V26-402/403, AI5).
6. **C1/C2/C4 — re-emphasize the hard halves**: design-port is the Wave-2 critical path; generative-UI
   bars and the de-circularized edge are mostly-gated and the *accuracy outcome* is earned-not-given.
7. **M5 — promote the live AA-contrast + HSTS + canonical-host fixes into explicit Wave-0 cards**
   (they're plausibly launch-blocking, not post-launch polish).
8. **O3/O4 — hedge the absence-claim ("no competitor builds all three" → "we've found none") and fix
   the 61-vs-68 add count.**

**Nice-to-have:** M2 (migration sequence), M3 (rollback runbook), M4 (monthly-COGS table).

---

## Honest top-3 highest-leverage moves

Stripping the program to what actually moves the needle most, in order:

1. **Decide the trunk and quarantine the clones — *then* port (M1 + V26-000 + K2).** Everything else in
   all five docs is a port-or-activate task that lands on the trunk. But "one source of truth" is a lie
   while 6 trees exist. The highest-leverage single action is not a feature — it is *collapsing the
   clone sprawl to one trunk and one archive*, after a human confirms the trunk direction at file:line.
   Until that happens, every fix risks landing in the wrong tree. This is correctly the program's #1; my
   only amendment is **add the quarantine step the program forgot.**

2. **Port the trust spine — observability + CLV — onto the trunk (V26-004 + V26-005).** This is the
   cheapest high-value move (inert without keys = `safe-now`), it makes the launch clone *measurable*
   (today a prod incident is `console.*`-only), and CLV is the variance-free proof the entire "Proven,
   not explained" thesis rests on. The docs rank this right; it survives the critic. Pair it with the
   F1 correction so the "edge" story you instrument is the *accurate* one (gated shadow estimator), not
   the "hardcoded null" story that isn't true.

3. **Convert substance into *visible* trust on the surface users actually walk (V26-201/202/204 +
   M5).** GSE's differentiation is real but buried: the Model Court is in one room, citations render as
   flat text, the honesty (refusal rate, calibration) is computed but never shown, and the launch clone
   still ships AA-contrast failures. The single biggest *perceived*-quality jump is presentation:
   ambient "Ask the Edge," clickable citation chips, a confidence/honesty chip, and fixing the live
   accessibility regressions — all `safe-now`, all exposing results-not-recipe. This is where "best
   website of 2026" stops being a thesis and starts being visible to a first-time visitor.

> The through-line: **the vision is sound and the work is real, but its value is gated behind one
> structural truth the program already names (converge) and one it under-names (quarantine the sprawl).
> Do those, instrument the trust spine accurately, and make the substance visible — and the
> "best website of 2026" claim becomes defensible rather than aspirational.**

---

## F. Independent grounding log (what I re-read to verify)

| Claim checked | File:line read | Result |
|---|---|---|
| Circular edge / "hardcoded null" | `Sports/packages/prediction-engine/src/scoring.ts:388-410, 567-586, 733-752`; `constants.ts:93-94`; `independent-estimator.ts:18` | **MISMATCH (F1)** — gated shadow estimator, not hardcoded null |
| CLV is CANONICAL-only | `find clv-capture.ts` both clones | **MATCH** — only `Sports-canonical-…/packages/prediction-engine/src/clv-capture.ts`; DEPLOY absent |
| `canSeeEdgeScore` always true | `Sports/packages/types/src/index.ts:83,96` | **MATCH** — `canSeeEdgeScore: true` default |
| Model Court citation/refusal enforcement | `Sports-canonical-…/…/model-court/answer.ts:96,102-106,343` | **MATCH** — pattern + refusal + `(source: … at <ISO>)` |
| Cinematic-entrance hardcoded hex | `Sports-canonical-…/components/landing/cinematic-entrance.tsx:73-78` | **MATCH** — literal hex `toneColor` map |
| Pricing split (CANONICAL has phases, DEPLOY doesn't) | `find pricing-phases.ts`; `Sports/apps/web/lib/pricing/` | **MATCH** — CANONICAL has `pricing-phases.ts`; DEPLOY's `lib/pricing` has no phase file |
| Cockpit/compliance CANONICAL-only | `find departments.ts` both clones | **MATCH** — only CANONICAL has `lib/cockpit/departments.ts` |
| DEPLOY job-truth contract fixed | `Sports/…/cron/refresh-odds/route.ts:133-157` | **MATCH** — 200/207/502 split, classified `failureReason` |
| Masked-success "still live in CANONICAL" | `Sports-canonical-…/…/refresh-odds/route.ts` (line region differs) | **UNVERIFIED (O2)** — DEPLOY fix confirmed; CANONICAL regression not shown at the same lines |
| `DEV_FAKE_ADMIN` absent in CANONICAL | `grep DEV_FAKE_ADMIN` both clones | **MISMATCH (O1)** — present in CANONICAL `auth.ts` + `api/dev/state`; DEPLOY adds `entitlements.ts` |
| Helpline conflict (both numbers present) | `grep` DEPLOY build for both numbers | **MATCH** — both `1-800-GAMBLER` and `1-800-522-4700` present |

*Doc-only output. No source, test, config, schema, env, or package file in either clone was modified to
produce this critic. 11 load-bearing citations independently re-read; 9 matched, 2 flagged (F1, O1) plus
1 unverifiable-as-stated (O2). Verdict: **GO-WITH-FIXES**.*
