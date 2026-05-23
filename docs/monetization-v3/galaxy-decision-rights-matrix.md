# Galaxy Decision Rights Matrix

**Audience:** Garrett. Internal.
**Purpose:** Galaxy is single-operator but multi-party. Engineering goes through Codex; legal goes through lawyer; finance goes through accountant; partner-facing communication goes through Garrett. This matrix codifies who decides what, so Garrett doesn't accidentally cede authority or fail to delegate effectively.

**Read time:** 5 minutes.

---

## The principle

Galaxy operates with a small number of stakeholders:

- **Garrett** — sole founder, primary decision-maker on brand position, product direction, member relationships.
- **Codex** — engineering, infrastructure, validation tooling.
- **Lawyer** — legal contracts, regulatory questions, brand-safety legal review.
- **Accountant** — bookkeeping, tax compliance, financial reporting.
- **Contractors** — copyeditor, cover designer, BD consultant, PR consultant (as engaged per `galaxy-contractor-playbook.md`).
- **Members** — Vault subscribers; have advisory input but not decision-rights.
- **Designated emergency contact** — per `galaxy-business-continuity-plan.md`; emergency-only authority.

Each decision in Galaxy has a primary decision-maker. The matrix below assigns primary authority + consultation requirements for the categories of decisions Galaxy faces.

---

## Decision category → decision-maker

### Product / brand position

| Decision | Primary | Consult | Decision-log? |
|---|---|---|---|
| Brand voice or operating values change | Garrett | None required | Yes |
| Methodology page substantive update | Garrett | Vault advisory (informal) | Yes if structural |
| New Galaxy public surface | Garrett | Codex (engineering feasibility) | Yes |
| Sunset a Galaxy product (Vault, Almanac, Live) | Garrett | Lawyer for legal implications | Yes |
| Add a new sport coverage | Garrett | Codex (data feasibility) + Vault advisory | Yes |
| Change publication threshold (60% floor, 65% mid-series) | Garrett | None — quantitative decision | Yes if structural |
| Change Loss Room / Pass List / Methodology framework | Garrett | None | Yes |
| Founder personal-brand visibility (founder photo on site, etc.) | Garrett | None | Yes if structural change |
| Compliance scanner banned-vocabulary list | Garrett | Codex (enforcement) + Lawyer (legal language) | Yes |

### Engineering / infrastructure

| Decision | Primary | Consult | Decision-log? |
|---|---|---|---|
| Engineering deploy timing | Codex | Garrett (approve before production) | Optional |
| Database schema changes | Codex | Garrett (review impact on data model + privacy) | Yes if member-facing |
| Stripe configuration changes | Codex | Garrett (approve all changes affecting member billing) | Yes |
| Discord bot behavior changes | Codex | Garrett (approve member-facing behavior changes) | Yes |
| Choose between two engineering approaches with equal trade-offs | Codex | Garrett if user-visible | Optional |
| Adopt a new third-party service | Codex | Garrett (approve based on privacy + cost) | Yes |
| Engineering issue triage (P0/P1/P2/P3) | Codex | Garrett for P0/P1 incidents | Yes for P1+ |
| Engineering issue patch + deploy | Codex | None | Optional |

### Legal / contracts

| Decision | Primary | Consult | Decision-log? |
|---|---|---|---|
| Sign a partnership contract | Garrett | Lawyer (review before sign) | Yes |
| Respond to regulatory inquiry | Garrett | Lawyer (draft response with) | Yes |
| Update terms of service | Garrett | Lawyer | Yes |
| Update privacy policy | Garrett | Lawyer | Yes |
| Engage in any litigation | Garrett | Lawyer | Yes |
| Lawyer engagement scope | Garrett | None | Yes |

### Finance

| Decision | Primary | Consult | Decision-log? |
|---|---|---|---|
| Owner draw amount + timing | Garrett | Accountant (for tax efficiency) | Yes if structural |
| Quarterly estimated tax payment | Accountant | Garrett (confirm transfer) | No (routine) |
| Annual tax filing | Accountant | Garrett (review + sign) | Yes for changes |
| Entity structure change (LLC → S-Corp, etc.) | Garrett | Lawyer + Accountant | Yes |
| Take outside capital | Garrett | Lawyer (term sheet) + Accountant (tax impact) | Yes |
| Contractor budget approval | Garrett | None | Yes for engagements >$5k |

### Member relationships

| Decision | Primary | Consult | Decision-log? |
|---|---|---|---|
| Member refund (within 30-day window) | Codex (automated) OR Garrett if manual | None | Optional |
| Member refund (outside 30-day window, exception) | Garrett | None | Yes |
| Member removal (Discord role) | Garrett | None | Yes |
| Founding-50 cohort selection | Garrett | None | Yes |
| Vault membership pricing | Garrett | None | Yes if change |
| Vault membership tier change | Garrett | None | Yes if structural |
| Member-data deletion request | Codex (process) + Garrett (approve) | Lawyer for unusual requests | Yes |

### Partnership / external

| Decision | Primary | Consult | Decision-log? |
|---|---|---|---|
| Engage with partnership inquiry | Garrett | None | Yes if signed |
| Decline partnership inquiry | Garrett | None | Optional |
| Sign founding partner contract (Live) | Garrett | Lawyer (review template + variants) | Yes |
| Engage PR consultant | Garrett | None | Yes |
| Engage BD consultant | Garrett | None | Yes |
| Hire community manager | Garrett | None | Yes |
| Hire any FTE (Year 2+) | Garrett | Lawyer (employment contract) + Accountant (payroll structure) | Yes |

### Content / publication

| Decision | Primary | Consult | Decision-log? |
|---|---|---|---|
| Whether to publish a specific game (pass vs publish) | Garrett (Gate 5 per methodology) | None | No (publishes don't need log entries; passes are logged in Pass List) |
| Autopsy root-cause tag assignment | Garrett | None | No (autopsies themselves are the documentation) |
| Wednesday digest topic | Garrett | None | No |
| Model Journal Saturday topic | Garrett | None | No |
| Office hours format change | Garrett | Vault advisory (informal) | Yes if structural |
| Almanac chapter inclusion decision | Garrett | Copyeditor (editorial assessment) | Yes |

### Crisis / emergency

| Decision | Primary | Consult | Decision-log? |
|---|---|---|---|
| Crisis response (outage, breach, etc.) | Garrett | Lawyer if regulatory implications | Yes |
| Sunset Vault | Garrett | Lawyer | Yes |
| Pause Galaxy operations (founder personal crisis) | Garrett OR designated contact if Garrett incapacitated | Lawyer + Accountant | Yes |
| Emergency contractor engagement | Designated contact (during continuity) OR Garrett | None during normal ops | Yes |

---

## Authority hierarchy when Garrett is unavailable

Per `galaxy-business-continuity-plan.md`:

- **Garrett available:** Garrett decides all primary-authority items.
- **Garrett temporarily unavailable (<8 weeks):** Designated emergency contact handles continuity-mode operations per limited authority. Decisions deferred to Garrett's return.
- **Garrett indefinitely unavailable (>8 weeks):** Per business continuity plan Decision A/B/C protocols.

The lawyer + accountant retain their normal authority regardless of Garrett's availability (they're independent professionals, not delegates).

---

## What this matrix deliberately doesn't do

1. **No "approval chain" beyond Garrett.** Galaxy doesn't have a board, a co-founder, or a CEO/COO split. Decisions go to Garrett or to a contractor with defined scope.

2. **No "consensus" decision-making.** Garrett decides; consultation is for information, not voting.

3. **No "veto power" by contractors or members.** Contractors fulfill scoped work; members have advisory input. Galaxy's brand-position decisions are the operator's.

4. **No "delegated brand decisions."** Brand position is non-delegable.

5. **No member-driven product changes without operator review.** Members suggest; Garrett decides.

---

## How the matrix is used

### Day-to-day

When a decision arises, Garrett asks:
1. What category is this in?
2. Who's primary on this category?
3. Who needs to be consulted before I decide?
4. Does this need a decision-log entry?

90% of decisions are routine (Galaxy publishes, Galaxy doesn't publish, member subscribes, member cancels). Routine decisions don't require matrix lookup.

10% of decisions are non-routine (structural changes, partnership engagements, methodology shifts, hire decisions). For these, the matrix prevents accidentally bypassing the right consultation.

### When ambiguity surfaces

Some decisions are genuinely between categories (a partnership that has legal + brand implications, an engineering decision that affects member privacy). In these cases:

- Consult both the implicated parties.
- Garrett is still primary, but the decision-log entry reflects both consultations.

### When the matrix needs updating

The matrix is updated when:
- Galaxy hires (community manager, editorial assistant): they get added with specific authority scope.
- New Galaxy product (Almanac becomes a separate operation, Live activates): the product's decisions get categorized.
- Galaxy's entity structure changes: the structural decision-rights may shift.

Updates require a decision-log entry per `week-minus-1/06-decision-log-entry-templates.md`.

---

## Cross-references

- Contractor playbook (lawyer, accountant, BD consultant engagement): `galaxy-contractor-playbook.md`
- Business continuity plan (designated emergency contact authority): `galaxy-business-continuity-plan.md`
- KPI rules (decision-log requirement context): `04-kpi-decision-rules.md`
- Decision-log entry templates: `week-minus-1/06-decision-log-entry-templates.md`
- Operating values: `galaxy-operating-values.md`
- Brand voice canonical: `galaxy-brand-voice-canonical.md`
- AI policy (Codex's role boundaries): `galaxy-ai-policy.md`

---

*Galaxy's single-operator structure means most decisions are Garrett's. The matrix exists to make sure the consultations happen when they should, not to dilute Garrett's authority. Read once; reference when something's between categories.*
