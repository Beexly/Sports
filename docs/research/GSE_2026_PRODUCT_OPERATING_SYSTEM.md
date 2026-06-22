# GSE 2026 — Product Operating System (Workstream J)

> Companion research doc to `apps/web/lib/gse/product-operating-system.ts`.
> Internal only. The owner is **one person**. This system exists to help that
> person **think, prioritize, and ship** — not to generate busywork.
> Every number in the worked example is **ILLUSTRATIVE / modeled**, never a real
> metric. Pricing is read from `apps/web/lib/pricing/pricing-phases.ts`.

---

## 0. Why this exists

A solo owner can out-think a team, but only if the system removes the cost of
holding the whole product in their head. The Product Operating System (POS) is
that external brain: it connects user problems to shippable, trust-safe,
revenue-relevant work, scores opportunities consistently, sorts them into honest
roadmap buckets, gates every launch on real readiness, and tells the owner each
morning the few things that actually matter.

Four loads it carries so the owner doesn't have to:
1. **Memory** — what we know about users, competitors, gaps, and our own surfaces.
2. **Judgment** — a consistent rubric so the 200th idea is scored like the 1st.
3. **Discipline** — launch gates and trust risk that say No before harm ships.
4. **Focus** — a daily brief that names the highest-leverage move and the traps.

---

## 1. Product Decision Graph

The POS models product work as a directed graph. A node is a **product idea**;
its value is computed by walking its dependencies. Nothing is "just an idea" —
each idea is anchored to a real user problem and a real repo surface or data
source.

```
USER PROBLEM ──► COMPETITOR GAP ──► PRODUCT IDEA
                                       │
        ┌──────────────────────────────┼───────────────────────────────┐
        ▼                ▼              ▼               ▼                ▼
 DATA REQUIREMENT   SOURCE RIGHTS   REVENUE IMPACT   TRUST RISK   IMPLEMENTATION COST
        │                │              │               │                │
        └────────────────┴──────┬───────┴───────────────┴────────────────┘
                                 ▼
                          OWNER PRIORITY ──► BUILD STATUS ──► TESTS ──► LAUNCH READINESS
```

### 1.1 Node shape (mirrors `product-operating-system.ts`)

| Field | Meaning |
|---|---|
| `id`, `title` | Stable identity |
| `userProblem` | The real pain, in user words |
| `competitorGap` | What incumbents do badly / not at all |
| `dataRequirements[]` | What data the feature needs |
| `sourceRights` | Clearance status from the Scraping Clearance Engine / source-rights registry — `approved_*`, `permission_required`, `blocked_*`, `excluded` |
| `revenueImpact` | Free-trust vs paid-unlock effect, tier touched |
| `trustRisk` | Could this mislead, overpromise, or pressure? (0–100, lower better) |
| `implementationCost` | Build effort (T-shirt + modeled days) |
| `maintenanceBurden` | Ongoing cost once shipped |
| `ownerPriority` | now / next / later / research / blocked-* |
| `buildStatus` | not-started / in-progress / built / shipped |
| `tests` | none / partial / passing (no feature complete without passing tests) |
| `launchReadiness` | Aggregate gate score (§4) |
| `repoSurface` | The actual file(s)/component(s) it touches |

### 1.2 Hard edges (constraints, not suggestions)
- **Source-rights edge is fail-closed.** If `sourceRights ∈ {permission_required,
  blocked_technical_controls, excluded}`, the idea routes to a `blocked-by-rights`
  bucket regardless of how attractive it scores. Clearance precedes value.
- **Trust edge is a veto.** A high `trustRisk` caps `launchReadiness` and can move
  an idea to `blocked-by-design` until the risk is engineered out.
- **No-stale-data edge.** Any idea depending on a feed must declare a freshness SLA
  or it cannot leave `research`.

---

## 2. Opportunity Scoring rubric — `scoreProductOpportunity()`

Eleven factors, each scored 0–10, combined by weight. Two factors are **gates**
(multipliers ∈ {0,1}) rather than additive weights, because a failure there should
zero the score, not just dock it.

| Factor | Weight | Direction | Notes |
|---|---|---|---|
| User pain | 0.18 | higher = better | How acute and frequent is the problem |
| Trust impact | 0.16 | higher = better | Does it *strengthen* credibility (calibration, transparency)? |
| Revenue impact | 0.14 | higher = better | Free-trust lift or honest paid-unlock |
| Retention impact | 0.12 | higher = better | Habit formation, recurring value |
| Uniqueness | 0.10 | higher = better | Hard for incumbents to copy |
| First-of-kind potential | 0.08 | higher = better | Category-defining upside |
| Data availability | 0.08 | higher = better | Do we already have/own the data? |
| Ecosystem fit | 0.06 | higher = better | Reinforces the "decision OS," not a side quest |
| Build complexity | 0.04 | **inverted** | Lower complexity scores higher |
| Maintenance burden | 0.04 | **inverted** | Lower ongoing cost scores higher |
| **Source-rights safety** | **GATE ×{0,1}** | — | 0 if rights not clear → idea cannot rank |
| **Trust-floor** | **GATE ×{0,1}** | — | 0 if it would require deception / overpromise |

```
raw   = Σ (factorScore_i × weight_i)            # additive factors, 0–10 scale
score = raw × rightsGate × trustGate            # gates zero out unsafe ideas
                                                # → final 0–10, ILLUSTRATIVE
```

**Why gates, not penalties:** the platform's value *is* trust and legal-safety.
An idea that needs an `excluded` source or fake-urgency copy isn't a "lower
priority" — it's not a candidate. Multiplying by zero encodes that honestly.

Weights are tuned so **trust + user pain together outweigh revenue** (0.34 vs
0.14). The POS will never rank a trust-eroding money-maker above a
trust-building one.

---

## 3. Roadmap Brain — buckets

Every idea lands in exactly one bucket. "Blocked" is split by *cause* so the
owner sees what would unblock it.

| Bucket | Meaning | Exit condition |
|---|---|---|
| **now** | Highest-leverage, ready, gates green | Ship it |
| **next** | Strong, sequenced behind a `now` dependency | Predecessor ships |
| **later** | Good but not yet leveraged | Re-score when context changes |
| **research-only** | Promising, unknowns remain | Resolve the unknown |
| **blocked-by-data** | Need data we don't have / can't refresh | Acquire feed + SLA |
| **blocked-by-rights** | Source-rights not clear (permission/blocked/excluded) | Clearance granted |
| **blocked-by-design** | Trust/UX risk unresolved | Risk engineered out |
| **blocked-by-payment** | Needs Stripe/billing/entitlement work | Billing path ready |
| **blocked-by-owner-decision** | Awaiting a call only the owner can make | Owner decides |

Rule: an idea may sit in `blocked-by-*` indefinitely without guilt — the bucket
*names the blocker* so the owner can choose to clear it or consciously park it.

---

## 4. Launch Gate System — `scoreLaunchReadiness()`

Nothing ships until it clears the gates. Per CLAUDE.md, "a task is NOT complete
until tests pass, types pass, build succeeds" — the launch gate operationalizes
that and adds product-quality and integrity gates.

| Gate | Pass criteria |
|---|---|
| **Data** | Source connected, freshness SLA met, no stale/fabricated values |
| **Trust** | No banned phrasing, no overpromise, disclosures present, claim-scanner PASS |
| **UX** | Empty/loading/error/locked states all designed |
| **Mobile** | Works at small breakpoints (cockpit is mobile-reachable) |
| **Performance** | Meets perf budget; no N+1 / blocking calls on the hot path |
| **Accessibility** | WCAG contrast on the dark theme, keyboard/focus order |
| **Legal / source** | Clearance granted, RightsSnapshot captured, attribution propagates |
| **Revenue** | Gate honest, tier correct vs `pricing-phases.ts`, no fake walls |
| **Support readiness** | Docs/FAQ ready, owner can answer top tickets |
| **Rollback plan** | A tested way to disable/revert without data loss |

```
launchReadiness = mean(passingGates) but ANY of
  {Trust, Legal/source, Data}=fail  ⇒  readiness = BLOCKED (hard floor)
```

The three hard-floor gates (Trust, Legal/source, Data) can't be averaged away —
they are pass/fail. A beautiful feature on stale data, or a clever one on
unclear rights, **does not launch.** Each gate also names a `rollback` so a
post-launch trust defect can be pulled in minutes.

---

## 5. Owner Daily Brief

One screen, generated each morning, answering the questions a solo owner actually
asks. Every claim links to its source signal; nothing is asserted without a trail.

| Question | What the brief shows |
|---|---|
| **What matters today?** | The single highest-`score` ready idea + the top trust/revenue signal |
| **What is broken?** | Failing tests, failing gates, stale feeds, claim-scan fails (P0) |
| **What moved?** | Build-status changes, settled-pick count toward PROVEN, funnel shifts |
| **What is stale?** | Any feed/calibration/disclosure past its freshness SLA |
| **What should I ship?** | Top `now` item with all gates green |
| **What should I NOT ship?** | Top-scoring item still failing a hard-floor gate (and why) |
| **Fastest path to revenue?** | Highest honest revenue-impact move that doesn't touch trust risk |
| **Biggest trust risk?** | Highest `trustRisk` live or near-live surface + the fix |
| **What changed since yesterday?** | Diff of scores, buckets, gate states, and new autopsies |

Design rule: the brief is **decisive, not exhaustive**. It names ≤3 ship-worthy
moves and ≥1 explicit "do not ship," so the owner ends the read knowing what to do
*and* what to resist.

---

## 6. Worked example — scoring 5 GSE feature ideas

All five map to **real repo surfaces** (verified to exist):
`components/fantasy/dfs-optimizer.tsx`, `components/fantasy/draft-assistant.tsx`,
`components/fantasy/trade-analyzer.tsx`, `components/fantasy/waiver-board.tsx`,
`components/bias-mirror/bias-mirror.tsx`, plus Observatory, `lib/gsn/transmission.ts`,
and Academy surfaces.

> **ILLUSTRATIVE / MODELED — not real metrics.** Factor scores (0–10) and the
> resulting `score` are design placeholders to demonstrate the rubric, not
> measured outcomes.

### 6.1 The five ideas

1. **DFS Optimizer v2** — lineup optimization with honest variance/No-Bet framing.
2. **Draft OS** — live draft assistant with reasoning trail.
3. **Trade Calculator** — fairness + factor-backed trade evaluation.
4. **Waiver Pro** — waiver-wire priority with confidence and freshness.
5. **Bias Mirror** — reflects a user's *own* decision biases back to them (trust-first).

### 6.2 Factor scores (ILLUSTRATIVE, 0–10)

| Factor (weight) | DFS Opt v2 | Draft OS | Trade Calc | Waiver Pro | Bias Mirror |
|---|---|---|---|---|---|
| User pain (.18) | 7 | 8 | 6 | 7 | 6 |
| Trust impact (.16) | 6 | 7 | 7 | 6 | 9 |
| Revenue impact (.14) | 8 | 7 | 5 | 6 | 4 |
| Retention impact (.12) | 7 | 6 | 5 | 8 | 7 |
| Uniqueness (.10) | 5 | 6 | 5 | 5 | 9 |
| First-of-kind (.08) | 4 | 5 | 4 | 4 | 9 |
| Data availability (.08) | 7 | 6 | 8 | 7 | 8 |
| Ecosystem fit (.06) | 7 | 7 | 6 | 7 | 8 |
| Build complexity⁻¹ (.04) | 4 | 4 | 7 | 6 | 6 |
| Maintenance⁻¹ (.04) | 5 | 5 | 7 | 6 | 7 |
| **Rights gate ×** | 1 | 1 | 1 | 1 | 1 |
| **Trust gate ×** | 1 | 1 | 1 | 1 | 1 |

### 6.3 Computed score (raw Σ × gates), rounded — ILLUSTRATIVE

| Idea | raw score | gates | **final** | Bucket | Why |
|---|---|---|---|---|---|
| **Bias Mirror** | ~7.1 | ×1 ×1 | **7.1** | **now** | Trust-first, unique, first-of-kind; strengthens the moat |
| **DFS Optimizer v2** | ~6.4 | ×1 ×1 | **6.4** | next | Strong revenue + retention; higher build/maintenance cost |
| **Draft OS** | ~6.4 | ×1 ×1 | **6.4** | next | High user pain; seasonal; sequence with Draft window |
| **Waiver Pro** | ~6.3 | ×1 ×1 | **6.3** | later | Best retention; lower uniqueness; re-score in-season |
| **Trade Calculator** | ~5.8 | ×1 ×1 | **5.8** | later | Cheap to build/maintain; modest revenue + pain |

**Reading the result:** revenue-heavier DFS Optimizer v2 does **not** out-rank
Bias Mirror, because the rubric weights trust + uniqueness + first-of-kind enough
that a credibility-compounding feature wins. That is the intended behavior — the
POS protects the moat before chasing the dollar.

### 6.4 Worked launch-readiness check (Bias Mirror)

| Gate | State (ILLUSTRATIVE) | Note |
|---|---|---|
| Data | PASS | Uses the user's own logged decisions — no external feed |
| Trust | PASS | Reflective, never prescriptive; no outcome claims |
| UX | PARTIAL | Empty/first-run state needs design |
| Mobile | PASS | — |
| Performance | PASS | Client-side aggregation |
| Accessibility | PARTIAL | Contrast pass needed on chart colors |
| Legal / source | PASS | First-party data, clearance N/A |
| Revenue | PASS | Free-tier trust-builder; no fake wall |
| Support readiness | PARTIAL | Needs a short explainer |
| Rollback | PASS | Feature-flagged off in one toggle |

```
Hard-floor gates (Trust, Legal/source, Data) = PASS  → not BLOCKED
readiness = mean(passing) with 3 PARTIALs → "ship-after-polish"
```

Brief verdict: **Ship Bias Mirror after closing the three PARTIAL gates**
(first-run UX, chart contrast, explainer). **Do not ship** DFS Optimizer v2 ahead
of it despite higher revenue weight — sequence it `next` once its build cost is
funded and its data freshness SLA is wired.

---

## 7. How the owner actually uses this

1. **Morning:** read the Daily Brief (§5). It names the ≤3 moves and the 1 trap.
2. **Pick one:** the top `now` item with green hard-floor gates.
3. **Build with tests:** nothing is "built" until tests/types/build pass.
4. **Gate it:** run `scoreLaunchReadiness()` — hard floors are non-negotiable.
5. **Ship or park honestly:** if blocked, the bucket names the blocker; park
   without guilt or clear it deliberately.
6. **Autopsy:** feed any miss back into scores and gates so it can't recur.

The POS makes the solo owner's constraint — one brain, one pair of hands — a
feature: fewer, higher-conviction, trust-safe ships, each one auditable.

---

### Appendix A — Numbers disclaimer
All factor scores, computed scores, bucket placements, and gate states in §6 are
**ILLUSTRATIVE / modeled** to demonstrate the rubric. They are not measured
metrics, real usage, or real revenue. The five ideas map to real repo surfaces,
but their scores are hypothetical.

### Appendix B — Integrity guarantees
This document contains no fabricated users, revenue, or testimonials; uses no
fake urgency or fake social proof; and makes no promised-outcome claims. Pricing
references derive solely from `apps/web/lib/pricing/pricing-phases.ts`. Source
rights follow `apps/web/lib/scraping/source-rights-registry.ts` and the Scraping
Clearance Engine; no idea may bypass clearance.
