# CRC wedge — decisions made (not deferred)

Critical reasoning under constraints:
- Solo founder, time-poor, wants AI-run operations
- No paying customer yet
- Synthetic + schema-real evidence only
- Brand law: refuse-default, no false ROI / "best" claims
- Must not merge into sports product theater

---

## 1. Real multi-source extract

**Decision: schema-real public extract now · real PII extract only if a buyer demands it under NDA.**

Reasoning:
- We cannot invent or scrape real KYC/CRM PII. Doing so is illegal and brand-toxic.
- Waiting for the founder to "provide an extract" is a dead stop — the wedge never ships.
- A **public-schema extract** (entity_id joins across CRM / payments / risk_sot) is enough to:
  - prove relative CRC on something that looks like recon tables
  - drive a curl-able demo
  - define the exact CSV drop format for a future NDA extract

Shipped:
- `benchmarks/public_schema_extract/{crm,payments,risk_sot}.csv`
- `core/ingest_multisource.py` — founder (or agent) drops CSVs → CRC report
- Format: `entity_id, system, risk_tier, kyc_status`

If a real buyer appears: same ingest, NDA files, no code change.

**Not decided as blocker:** "get real bank data first." That is a sales problem, not a product one.

---

## 2. Pilot vs API

**Decision: API-first demo, not custom pilot consulting.**

Reasoning:
- Custom pilots consume founder calendar (exactly what we refuse).
- An OpenAPI + fixture that a technical buyer can `curl` sells itself or dies fast — correct filter.
- Pilot reports are a *delivery mode after* someone hits the API and asks for a scoped run on their CSVs.
- Bootstrapped path: no sales team → product must be self-serve evidence.

Shape:
1. `/v1/consistency` + `/v1/propose` (already designed)
2. Fixture + public-schema extract as default demo payload
3. Optional: `ingest_multisource.py` for CSV → report (pilot *mode*, not pilot *business*)

**Reject:** "Do a 2-week pilot for free to learn." That is unpaid consulting.

---

## 3. External claims

**Decision: claim mechanism + synthetic methodology only. Never claim production fraud reduction.**

Allowed (true today):
- "Labels multi-source graphs with a repair class: consistent / statistical / structural."
- "Detects the case where systems agree with each other and disagree with a designated source of truth (relative CRC)."
- "On synthetic and schema-real fixtures, separates coordinated false agreement from ordinary noise (see bench)."
- Publish FPR/detection on **named fixtures** with methodology.

Forbidden (brand law + truth):
- "Reduces fraud by X%"
- "Production-proven on customer data"
- "Best-in-class / state-of-the-art" without a defined benchmark
- Any LIVE sports / ROI crossover claim

One-pager (`docs/CRC_ONE_PAGER.md`) already matches this. Do not soften.

---

## Operating rule going forward

| Question | Default |
|----------|--------|
| Need real PII to continue R&D? | **No** — schema-real is enough |
| Need founder to choose pilot vs API? | **No** — API-first decided |
| Need founder to approve external claim text? | **Only if going public / customer-facing**; internal docs use allowed list above |
| Merge into Beexly/Sports? | **No** until explicit YES |

Un-park for *revenue* still needs a buyer conversation. Un-park for *technical completion* of the wedge does not.

---

## 4. Apply-repair + re-measure loop

**Decision: ship gated close-loop for safe ops; never auto-close relative fraud.**

Implemented: `core/repair_loop.py`
- `realign`, `drop_edge`, `relax_restriction` may auto-apply
- `grow_structure` = propose-only (needs node naming policy)
- `self_consistent_wrong_vs_ledger` → status `blocked_relative_fraud` (no silent fix)
- Returns full before/after history

Verified:
- Statistical triangle → consistent
- Relative fraud → blocked
- Structural Penrose → one relax still structural (needs k=3, as theory says)

## 5. Ledger write-back policy engine

**Decision: interface exists; default refuse. Correct product boundary.**

Implemented: `core/ledger_policy.py`
- `evaluate_writeback` requires relative status + `FOUNDER_POLICY_ALLOW_WRITEBACK`
- Without key → refused
- With key → authorized only; caller still executes

No agent can "helpfully" overwrite SoT. This is intentional, not incomplete.

## 6. Learned restriction maps

**Decision: park Phase 2. Do not build.**

Reasons: no paying training distribution; risk of absorbing fraud into geometry; CRC value is the decision layer first.
Doc: `research/LEARNED_MAPS_DECISION.md`
Revisit only after API used by a buyer + explicit YES.

---

## 7. Product scope expansion (authorized)

User unlocked expansion *if it makes sense*. Ranking by value×safety/cost:

| Mode | Decision | Why |
|------|----------|-----|
| **entity_integrity** (batch per-entity report) | **SHIP** | Highest score; Path A primary surface |
| **temporal_relative** | **SHIP** | Uses existing bench; answers "when did fraud appear" |
| **typed_relations** | **SHIP** (policy table) | Cheap; changes drop vs realign priority |
| **model_agreement** | **SHIP** (preset) | Path C; same CRC engine |
| **ontology_hygiene** | **SHIP** (preset) | Path B; same engine, no SoT |
| Spectral clustering product | **REJECT** | Low buyer value for integrity wedge |
| PH barcode API | **REJECT** | Wrong question |
| Learned maps | **STILL PARKED** | Risk + no training distribution |

Implemented: `core/product_modes.py`
Verified: entity report flags E001; temporal first_fraud=2; model agreement statistical; ontology hygiene statistical.
