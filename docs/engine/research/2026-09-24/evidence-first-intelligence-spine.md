# Evidence-First Intelligence Spine

**Doctrine for Galaxy Sports Edge.** Wired 2026-09-25 from the standing operating
brief. This is the product and architecture contract — not a suggestion.

---

## The right objective

> The objective is not "know everything." It is:
>
> **Know more useful, earlier, legally usable, time-correct context than anyone
> else — then let evidence decide which signals deserve to change a probability.**

"All-knowing" is impossible. A wider, faster, more rigorously measured
information advantage is buildable.

---

## What we already have (foundation)

- Source-rights gating and clearance.
- A point-in-time / market-baseline architecture.
- Calibration and settlement machinery.
- Signal, context, fantasy, and market modules.
- Eight documented edge classes.
- A measured reality check: current Brier is **0.2478** and eligibility is **red**.
- A major wiring problem: many research modules exist without production
  callers; `GameSignal` currently has only two schedule-density writers.

---

## The highest-value target: an evidence-first intelligence spine

1. **Capture every legally usable fact as an immutable as-of record.**
2. **Normalize** players, teams, games, markets, injuries, schedules, and
   providers.
3. **Store** provenance, publication/retrieval time, rights, freshness,
   uncertainty, and missingness.
4. **Build point-in-time features without leakage.**
5. **Maintain market-only baselines** and market-blind independent models.
6. **Validate every signal** with walk-forward, fixture-clustered,
   purged/embargoed tests.
7. **Promote signals only after they beat the null** under multiple-testing
   controls.
8. **Use fantasy optimization as portfolio and scenario analysis** — not as a
   substitute for player-level truth.
9. **Keep social, rumor, nutrition, sleep, cognition, and medical data bounded:**
   - *Tier-5 chatter:* cockpit-only, unverified, never a standalone pick.
   - *Health and biometric data:* aggregate, consented, non-identifying,
     privacy-reviewed.
   - *No* "inside information," guaranteed accuracy, or certainty claims.
10. **Keep the publish boundary separate:** broad capture and shadow
    computation can happen immediately; customer-facing probabilities remain
    blocked until calibration and evidence gates pass.

---

## Six questions every decision must answer

| # | Question |
|---|---|
| 1 | What do we know? |
| 2 | When did we know it? |
| 3 | Where did it come from? |
| 4 | How reliable and fresh is it? |
| 5 | What does the market already believe? |
| 6 | Does adding our signal improve out-of-sample, out-of-time decisions? |

If a datapoint cannot answer these, it is a lead — not a signal. Label it, name
the missing data, and go get it rather than assuming.

---

## Operating constraints (non-negotiable)

| Constraint | Rule |
|---|---|
| Rights | Every ingested source is declared in `packages/data-ingestion/src/source-registry.ts` with a legal verdict. `assertIngestible()` throws before fetch. |
| Time | Never train or evaluate on "latest" tables without as-of / created-at filtering. Point-in-time or it does not exist. |
| Provenance | Every displayed datapoint traces to a real source row with `fetched_at`, `source_as_of`, license, parser version, raw hash. |
| Calibration | Brier 0.2478 is RED against a ≤0.22 floor. Do not expand public claims. Auto-publish and calibration adjustments remain **off**. |
| Publish boundary | Capture and shadow computation: yes. Customer-facing probabilities: only after S4 gates pass. |
| Fantasy | Optimization is portfolio/scenario analysis. The model owns the projection — never a heuristic rank, LLM narrative, or optimizer silently becoming "the projection." |
| Sensitive data | Health/wearable/cognitive/biometric only with consent, minimization, access controls, and a separate sensitive-data plane. |
| Tier-5 chatter | Social, rumor, unverified claims: cockpit-only. Never a standalone pick. |

---

## Wiring map (this research pack)

```text
evidence-first intelligence spine (this doc)
        │
        ├── docs/research/2026-09-24/firecrawl-intelligence-wiring.md   ← index
        ├── docs/research/2026-09-24/source-candidates-firecrawl.json   ← 121 sources
        ├── docs/research/2026-09-24/second-pass-findings-register.md   ← 38 findings
        ├── docs/research/2026-09-24/integration-sprint-S0-S7.md        ← build order
        ├── docs/research/2026-09-24/model-owned-projection-pipeline.md ← 10-step schema
        ├── docs/research/2026-09-24/td-props-usage-prompts.md          ← GSE props intel
        └── packages/data-ingestion/src/source-registry.ts              ← rights gate
```

---

## Build order (do not skip)

**Ordering principle:** do not add more signal breadth until identity,
point-in-time availability, durable model artifacts, and evaluation receipts
are real. Otherwise extra feeds increase apparent sophistication without
increasing trustworthy accuracy.

| Sprint | Name | Gate |
|---|---|---|
| S0 | Truth, identity and rights freeze | Must complete before training any production fantasy model |
| S1 | Durable fantasy slate and contest plane | One sport, one contest family first |
| S2 | Point-in-time feature and label store | Build once, reuse across sports |
| S3 | Baseline model-owned projections | One sport/position family before broadening |
| S4 | Calibration, uncertainty, sealed evaluation | **No public superiority claim before this gate** |
| S5 | Ownership, correlation, contest decision engine | Only after S1–S4 produce real distributions |
| S6 | High-value signal activation in shadow mode | One factor at a time |
| S7 | Production reliability, safety, evidence UX | Independently gated capability flags |

Full detail: [`integration-sprint-S0-S7.md`](./integration-sprint-S0-S7.md).

---

## What "done" looks like for a signal

A signal is production-eligible only when **all** of the following hold:

1. Source is rights-cleared in the legal registry.
2. Fact is stored as an immutable as-of record with full provenance.
3. Feature is materialized point-in-time with leakage tests passed.
4. Walk-forward / purged evaluation beats the market-only baseline (and the
   null) under multiple-testing controls.
5. Calibration floors (Brier, ECE, coverage) are green on a sealed holdout.
6. Kill line is pre-registered.
7. Evidence card can answer the six questions above.

Until then: **shadow only, or abstain.**

---

## Citations

- Repository: https://github.com/Beexly/Sports
- Snapshot: `main` @ `7da237b` — https://github.com/Beexly/Sports/commit/7da237bcec21c26f1eeebdd1de6e6e88bd461939
- Firecrawl pass-1 (source map): `01a0d6cf-7229-7649-a9dd-0758e9425524`
- Firecrawl pass-2 (deep audit): `01a0d6d8-8c70-7785-9a0f-24b10ea01f86`
- Standing operating brief (Hermes): evidence-first intelligence spine, 2026-09-25
- Fantasy launch blockers: [`handoff/FANTASY_DATA_LAUNCH_BLOCKERS.md`](../../handoff/FANTASY_DATA_LAUNCH_BLOCKERS.md)
- Current calibration state: [`docs/ops/CURRENT_STATE.md`](../ops/CURRENT_STATE.md)
