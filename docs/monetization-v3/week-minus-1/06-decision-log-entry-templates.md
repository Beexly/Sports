# Decision Log Entry Templates

**Format:** Append-only. Each entry has ID + date + decision + rationale + (optional) override notes.

**Where to file:** Append into `docs/monetization-v3/templates/decision-log.md` (Codex's existing decision log).

**Naming convention:** `DEC-NEXT-NNN` (NEXT = "post-master-plan-v3 decisions"). After Year 1, renumber to `DEC-Y2-NNN` etc.

---

## Template: DEC-NEXT-001 — Runway scenario confirmed

```markdown
## DEC-NEXT-001 — Runway scenario confirmed

**Date:** 2026-MM-DD
**Author:** Garrett
**Status:** Locked

**Decision:** Galaxy operates under runway scenario [A / B / C]:
- [ ] A — 6 months cash on hand. Vault track only. Skip Almanac and Live.
- [ ] B — 12 months cash on hand. Vault + Almanac active. Live deferred to Year 2.
- [ ] C — 24+ months cash on hand. Full 3-track plan.

**Rationale:**
- Current cash position: $______
- Expected monthly burn (before revenue): $______
- Months of runway: ____
- Personal capacity assessment: ____ (full-time / part-time / contingent on hire)

**Personal kill criterion attached to this scenario:**
[Copy from `01-runway-scenarios.md` § "Personal Kill Criteria" for the chosen scenario.]

**Reassessment cadence:** Quarterly. Reassess if cash position changes by >20% in any quarter.

**Decision unblocks:**
- Codex engineering activation (waits for Day-7 customer dev outcome).
- Almanac customer dev kickoff (Scenarios B and C only).
- Live track planning (Scenario C only).
```

---

## Template: DEC-NEXT-002 — Vault customer dev decision

```markdown
## DEC-NEXT-002 — Vault customer dev outcome

**Date:** 2026-MM-DD (Day 7 of customer dev sprint)
**Author:** Garrett
**Status:** Locked

**Decision:**
- [ ] GO at $200/year (Plan A)
- [ ] LIKELY GO with retest (Plan B)
- [ ] PIVOT to $150/year retest (Plan C)
- [ ] DEEP PIVOT (Plan D — alternative offerings tested)
- [ ] NO-GO (Plan E — Vault repositioned as Elite-tier perk)

**Headline metric:** ____ / 30 qualified yes.

**Secondary gates:**
- Reason cluster coherence: PASS / FAIL
- Objection addressability: PASS / FAIL
- Vocabulary alignment: PASS / FAIL

**Top three findings:**
1. ____
2. ____
3. ____

**Top three objections to address:**
1. ____
2. ____
3. ____

**Decision memo link:** future dated Vault customer-dev decision file under `reviews/`

**Override invoked?** No / Yes (link to DEC-NEXT-002-OVERRIDE if yes).

**Action plan activated:** [Plan A/B/C/D/E per `CODEX_MONETIZATION_V3_MASTER_BRIEF.md` Part 4.8]
```

---

## Template: DEC-NEXT-003 — Vault landing page canonical version

```markdown
## DEC-NEXT-003 — Vault landing page canonical version

**Date:** 2026-MM-DD
**Author:** Garrett
**Status:** Locked

**Decision:** Canonical Vault landing copy is:
- [ ] Codex draft (`copy/vault-landing-page.md`)
- [ ] Claude variant (`copy/vault-landing-page-claude-variant.md`)
- [ ] Merged Part 5 version from `CODEX_MONETIZATION_V3_MASTER_BRIEF.md` (recommended)
- [ ] Custom — Garrett-authored synthesis

**Rationale:**
- ____
- Vocabulary log alignment: [phrases lifted from customer dev]
- Brand-safety scanner pass: confirmed

**Re-audit trigger:** if NPS post-launch drops below 50, re-test page with 5 founding members.
```

---

## Template: DEC-NEXT-004 — Vault founding-50 cohort selected

```markdown
## DEC-NEXT-004 — Vault founding-50 cohort selected

**Date:** 2026-MM-DD
**Author:** Garrett
**Status:** Locked

**Decision:** Founding-50 invitees:

**Source: customer dev interviewees with `early_commit = yes`** (target: 30)
- R001 — [first name] — strength __ / 10
- R002 — [first name] — strength __ / 10
- ... (full list)

**Source: top Galaxy Elite subscribers** (target: 20, by engagement + retention)
- [Stripe ID] — [first name] — Elite since [date]
- [Stripe ID] — [first name] — Elite since [date]
- ... (full list)

**Founding-50 mechanics:**
- Founding price locked at $200/year for life of subscription.
- Founding badge in Discord (custom role: `vault-founding-member`).
- Founding mention in V2 conference invite (if Vault hits V2 cap-lift).
- Pre-launch private window: 14 days before public Vault opens.

**Selection rationale per cohort:** [see `docs/monetization-v3/week-minus-1/07-founding-50-selection-framework.md`]
```

---

## Template: DEC-NEXT-005 — Almanac customer dev kickoff (Scenarios B and C only)

```markdown
## DEC-NEXT-005 — Almanac customer dev kickoff

**Date:** 2026-MM-DD
**Author:** Garrett
**Status:** Locked

**Decision:** Almanac customer dev sprint begins on [date].

**Scope:** 25 interviews per `03-customer-development.md` § Almanac protocol.

**Target source mix:**
- Galaxy subscribers: 10
- Twitter accounts engaged with sports analytics: 10
- Substack readers of sports research newsletters: 5

**Validation thresholds (per `CODEX_MONETIZATION_V3_MASTER_BRIEF.md` Part 8):**
- 15+ of 25 accept $99 hardcover → GO at $99 + $129 premium tier
- 8–14 accept → GO at $79 hardcover / $29 digital
- <8 accept → digital-only V1 at $29

**Pre-conditions:**
- DEC-NEXT-002 = GO at $200 OR Vault is repositioned per Plan E and Almanac becomes year-1 anchor.
- Capacity available (~25 hours of Garrett over 7 days).

**Expected synthesis date:** 2026-MM-DD + 7 days.
```

---

## Template: DEC-NEXT-006 — Almanac price tier confirmed

```markdown
## DEC-NEXT-006 — Almanac price tier confirmed

**Date:** 2026-MM-DD (post-Almanac customer dev)
**Author:** Garrett
**Status:** Locked

**Decision:**
- [ ] $99 hardcover / $39 digital (with $129 premium tier)
- [ ] $79 hardcover / $29 digital (no premium tier)
- [ ] $29 digital-only V1 (hardcover deferred to V2)

**Customer dev result:** ____ / 25 accepted $99.

**Decision memo link:** future dated Almanac customer-dev decision file under `reviews/`

**Cover design budget:** $______ (per `CODEX_MONETIZATION_V3_MASTER_BRIEF.md` Part 8: $5–8k non-negotiable for $99 price defense).

**Almanac-exclusive essays (NOT on website for 6 months post-publish):**
- Year-in-Review headline essay
- [Supporting essay 1]
- [Supporting essay 2]

**Pre-order page launch date:** October 2026 (week of: ____).
**Ship date:** January 15, 2027.
```

---

## Template: DEC-NEXT-007 — Live track activation (Scenario C only)

```markdown
## DEC-NEXT-007 — Live track activation

**Date:** 2026-MM-DD
**Author:** Garrett
**Status:** Locked

**Decision:** Live track activates per `02-active-tracks.md` § Live + `product/live-obs-prd.md`.

**Pre-conditions confirmed:**
- [ ] Scenario C runway (24+ months).
- [ ] Vault Month-3 KPI gate passed (250+ paid members at $200/year).
- [ ] OR DEC-NEXT-007-OVERRIDE invoked with rationale.

**Founding-partner mix target (5 partners):**
1. Sketch (warm-intro path) — outreach path: DEC-NEXT-008
2. Mid-tier sports streamer (100k–500k followers) — candidate: ____
3. YouTube sports analyst (50k–500k subscribers) — candidate: ____
4. Twitch DFS streamer (50k–200k followers) — candidate: ____
5. YouTube sports betting podcast (50k–200k subscribers) — candidate: ____

**Engineering kickoff:** Codex begins OBS plugin V1 per `product/live-obs-prd.md`. Timeline: 10–12 weeks.

**90-day founding-partner gate (per PRD):**
- 3+ partners commit → proceed to Phase 7 launch.
- 1–2 commit → single-partner pilot.
- 0 commit → defer Live to Phase 8.
```

---

## Template: DEC-NEXT-008 — Sketch outreach path

```markdown
## DEC-NEXT-008 — Sketch outreach path

**Date:** 2026-MM-DD
**Author:** Garrett
**Status:** Locked

**Decision: outreach path selected:**
- [ ] Warm introduction identified — path: [via mutual contact: ____]
- [ ] 1099 BD consultant hire — [consultant name + scope]
- [ ] Cold direct outreach — last resort, expected reply rate <5%

**Warm intro audit (2 weeks):**
- Mutual contacts identified: ____
- Outreach attempts: ____
- Result: [warm intro confirmed / no warm intro found]

**1099 BD consultant (if warm intro fails):**
- Consultant identified: ____
- Scope: 90-day engagement
- Budget: $______ (range $10–25k per `CODEX_MONETIZATION_V3_MASTER_BRIEF.md` Part 10)
- Success criterion: warm-intro path to Sketch within 90 days

**Cold outreach (if all else fails):**
- DM scheduled for: ____
- Follow-up after 14 days: y/n
- Accept Sketch isn't a founding partner if no reply by: ____

**Backup plan if Sketch doesn't sign:**
Pivot to recruiting 5 mid-tier partners first; revisit Sketch in V2 with track record as leverage.
```

---

## Template: DEC-NEXT-009 — Referral program V1 policy lock

```markdown
## DEC-NEXT-009 — Referral program V1 policy lock

**Date:** 2026-MM-DD
**Author:** Garrett
**Status:** Locked

**Decision:**
- [ ] Activate referral program V1 exactly as written in `copy/vault-referral-program.md`
- [ ] Defer referral program until after public founding-1000 launch
- [ ] Modify before launch (requires rationale below)

**Locked V1 policy, if activated:**
- 10% of first-year referred subscription revenue.
- 12-month payout window only.
- Subscription credit by default.
- Stripe Connect cash payout by request.
- Monthly accrual, not lump-sum.
- 30-day attribution window.
- Last-click attribution.
- No double-rate promotions.
- No ambassador tiers.
- No public leaderboards.

**Rationale:**
____

**Risk review:**
- Brand-safety scanner pass: yes / no
- Tax/reporting review needed: yes / no
- Stripe Connect setup required before cash payouts: yes / no

**Next review date:** 2026-MM-DD
```

---

## Template: DEC-NEXT-010 — Press kit V1 published

```markdown
## DEC-NEXT-010 — Press kit V1 published

**Date:** 2026-MM-DD
**Author:** Garrett
**Status:** Locked

**Decision:** Published / deferred Galaxy press kit at `/press`.

**Rationale:**
____

**Required checks:**
- Brand voice review complete: yes / no
- Brand-safety scan complete: yes / no
- No volunteered named-competitor comparison: yes / no
- City/headquarters fields filled or intentionally omitted: yes / no

**Next review date:** 2026-MM-DD
```

---

## Override entries (when needed)

If Garrett invokes the owner-override protocol for any track kill criterion:

```markdown
## Template: DEC-NEXT-XXX-OVERRIDE — [Track] kill criterion override

**Date:** 2026-MM-DD
**Author:** Garrett
**Status:** Locked

**Original kill criterion:** [verbatim from `04-kpi-decision-rules.md`]

**Why override:** [must include specific evidence, not just feeling]

**New kill criterion replacing original:** [must be more restrictive or equivalent, not looser]

**Reminder:** This is the first AND ONLY override allowed for this track. A second override triggers automatic sunset per protocol.

**Garrett's commitment:** I have read the anti-rationalization protocol from `CODEX_MONETIZATION_V3_MASTER_BRIEF.md` Part 4.9 and confirm:
- [ ] I am not rationalizing emotional attachment as evidence.
- [ ] The new kill criterion is genuinely more rigorous, not weaker.
- [ ] I am willing to honor sunset if the new criterion fires.

Signed: __________________ (date + initials)
```

---

## How to use these templates

1. When a decision fires, copy the relevant template into `templates/decision-log.md` (Codex's main log).
2. Fill in all placeholder fields. Do not leave any field empty — if information isn't available, write "TBD by [date]".
3. Cross-reference any related decisions (e.g., DEC-NEXT-007 references DEC-NEXT-008).
4. Date format: ISO `2026-MM-DD`.
5. After filling, commit to git with message `decision-log: DEC-NEXT-NNN — [short title]`.

---

*The decision log is the audit trail of how Galaxy thinks. Every decision worth tracking gets an entry. Acquirers due-diligence this; Vault advisory channels reference it; future-Garrett rereads it when memory is fuzzy. Keep it clean and append-only.*
