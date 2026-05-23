# Galaxy Vault Pre-Mortem

**Audience:** Garrett. Internal.
**Purpose:** A pre-mortem assumes the project has failed at the end of Year-1 and asks "what killed it?" The exercise surfaces failure modes that planning + optimism otherwise hide.

**Status:** Living document. Re-run at Month-3, Month-6, Month-12 KPI gates.

---

## The pre-mortem frame

Imagine it's December 31, 2026. Vault has failed. Renewal rate is <50%. Galaxy is preparing the sunset playbook. What killed it?

The exercise below catalogs the most-plausible failure modes — ranked by likelihood and severity — and the mitigations Galaxy has (or hasn't yet) put in place.

---

## Failure mode 1: Founding-50 cohort didn't materialize

### What this looks like

Despite 30 customer-dev interviews + a curated invitation list, fewer than 25 founding-50 spots got filled. Vault opens to broader audience with a weak founding cohort signal. The "founding-50" status loses credibility because it's seen as marketing fluff rather than real cohort recognition.

### Likelihood

**Medium.** The 30-interview customer-dev sprint is precisely designed to test this before founding-50 invitations go out. If interview signal is GO, founding-50 has a fighting chance. If interview signal is CONDITIONAL or PIVOT, founding-50 may underfill.

### Severity if it happens

**High.** Founding-50 is the highest-trust signal Galaxy builds in Year-1. A weak founding cohort means broader Vault launches without the social proof of "people who signed up before there was a track record."

### Mitigation in place

- 30 customer-dev interviews + Day-7 decision memo per `week-minus-1/04-day-7-decision-memo-template.md`.
- Plan A/B/C/D/E framework for proceeding with weaker signal.
- Founding-50 fill protocol: "founding spots can go unfilled; we don't backfill with broader signups" per `week-minus-1/13-founding-50-outreach-by-source.md`.

### Mitigation still needed

- A "founding-25" or "founding-15" fallback narrative if the cohort underfills materially.
- Decision-log entry framework if cohort fills below 35.

---

## Failure mode 2: Member onboarding broke at scale

### What this looks like

Stripe webhooks fire intermittently. Welcome emails land in spam. Discord role assignment fails for 10-15% of new members. The first 50 members get personal attention; members 51-200 face a chaotic experience.

### Likelihood

**Medium-high.** Single-operator businesses systematically underestimate the infrastructure work required for clean scaling. The pre-launch checklist tests with a few transactions; live launch surfaces the failure modes.

### Severity if it happens

**High.** Members who pay $200 and face a broken onboarding experience cancel within 14 days — the refund window. Cancellation rate above 15% in Month 1 would trigger the Month-3 KPI ritual warning state.

### Mitigation in place

- Vault pre-launch checklist (`launch/vault-pre-launch-checklist.md`) tests full customer flow.
- Day-by-day onboarding spec (`copy/galaxy-vault-member-onboarding-day-by-day.md`) catches failures within 24 hours.
- Member support playbook (`copy/vault-member-support-playbook.md`) Scenario 1 covers webhook failure.
- Day-4 and Day-7 personal check-ins surface onboarding issues.

### Mitigation still needed

- Specific monitoring dashboard for: Stripe webhook latency, welcome email delivery, Discord role assignment rate.
- Automated alert if any of these drops below 95% over a 1-hour window.
- A "first 24 hours" health check that runs after every signup.

---

## Failure mode 3: Brand position drifted under operational pressure

### What this looks like

The brand position (methodology, restraint, transparency) feels good in theory but becomes hard to maintain under daily pressure. The Wednesday digest starts feeling thin. The Loss Room autopsies become formulaic. Pass List entries get shorter. Twitter cadence slips into engagement-bait. Members notice — first individually, then aggregately — and renewal declines.

### Likelihood

**Medium-high.** Single-operator businesses drift away from stated brand position under fatigue. The brand position isn't load-bearing for any single decision; it's load-bearing across 1,000 small decisions over a year.

### Severity if it happens

**Critical.** Brand position is the core differentiator. If Galaxy drifts toward generic content, the "math you can read" frame becomes marketing veneer, not substance. Year-2 renewal cohort can't be rebuilt from a drifted Year-1.

### Mitigation in place

- Galaxy brand voice canonical (`galaxy-brand-voice-canonical.md`) as canonical reference.
- Quarterly deep audit (`galaxy-quarterly-deep-audit-protocol.md`) specifically checks for brand drift.
- Founder resilience playbook (`founder-resilience-playbook.md`) addresses operator fatigue.
- Saturday-OFF discipline + peak-block protection.

### Mitigation still needed

- A "brand position smoke test" run weekly: 5 questions Garrett answers honestly about whether the week's content held the brand position.
- An automated content-flag system for banned vocabulary in published content.
- A drift trigger: if 2+ consecutive quarterly audits flag brand drift, the next action is a structural rest (week-long pause) not a marketing push.

---

## Failure mode 4: Methodology didn't actually calibrate

### What this looks like

The factor model produces calls. The calls aren't materially better-calibrated than market consensus. Calibration data published in the quarterly audit shows the 65-72% confidence band hitting at 58-62% — significantly below expected. Members notice the methodology doesn't deliver on its core promise (calibrated reads).

### Likelihood

**Medium.** The factor model is real but it's also new. First-year calibration of a methodology that hasn't been tested in production has known risks.

### Severity if it happens

**Critical.** If the methodology doesn't calibrate, Galaxy is just another platform with marketing veneer. The brand position is structurally undermined. Members can audit the calibration data; they will.

### Mitigation in place

- Quarterly calibration audits per `copy/vault-quarterly-data-review-template.md`.
- Methodology revision protocol (`copy/galaxy-methodology-revision-protocol.md`) for evidence-based factor adjustments.
- Loss Room as transparent record of misses with factor-level diagnosis.
- Public methodology page as accountability surface.

### Mitigation still needed

- A pre-launch calibration backtest published at galaxysportsedge.com/methodology/backtest covering 24+ months of historical data.
- A "calibration tracker" widget on the public methodology page that updates as new calls settle.
- Year-1 expectation-setting in the welcome email + landing page: "calibration takes 12+ months to verify; here's what we're measuring."

---

## Failure mode 5: Renewal cliff hit at Month 11-12

### What this looks like

Member experience is fine through Months 1-10. Members are reading digests, engaging in Discord, attending office hours. But when Stripe sends the renewal email at Month 11, 50%+ cancel. Not because the product was bad, but because annual subscriptions face attention-cliff dynamics: members forget, renewal feels like a fresh decision, the year's accumulated value is invisible at renewal time.

### Likelihood

**Medium-high.** Annual subscription renewal cliffs are well-documented across subscription businesses. The default renewal rate for unmanaged annual subscriptions is 50-65%.

### Severity if it happens

**Critical.** Year-1 → Year-2 renewal is the single highest-stakes business decision. <50% renewal triggers Scenario C sunset.

### Mitigation in place

- Vault renewal email sequence (`copy/galaxy-vault-renewal-email-sequence.md`) provides 35-day lead time + personalized framing.
- Day-30 / 60 / 90 / 180 / 335 / 365 retention check-ins (`copy/vault-retention-checkins.md`) surface dissatisfaction before renewal.
- Month-12 renewal decision memo (`copy/vault-month-12-renewal-decision-memo-template.md`) structures the operational response.
- Founding-50 specific personalized DM at renewal moment.

### Mitigation still needed

- A "year-in-review" report sent to each member at Month 11 showing their personal Vault engagement (digests read, Discord posts, office hours attended). Makes accumulated value visible.
- A pre-renewal feedback ask at Month 11 that distinguishes "I want to cancel because the product didn't work" from "I want to cancel because I forgot how to value it."

---

## Failure mode 6: Garrett's mental health gave out

### What this looks like

The single-operator load — 60-70 hour weeks for months, no team to absorb stress, every decision running through one person — produces burnout. Garrett's content quality drops. Member-facing communications become terse or absent. The brand position drifts because the operator can't actively defend it. Renewal rate drops accordingly.

### Likelihood

**Medium-high.** Single-operator burnout in subscription businesses is the modal failure mode, not the tail risk.

### Severity if it happens

**Critical.** Galaxy is currently inseparable from Garrett. Garrett unavailable = Galaxy paused. Burnout that compounds across months = product decline.

### Mitigation in place

- Founder resilience playbook (`founder-resilience-playbook.md`) as operating philosophy.
- Saturday-OFF discipline, non-negotiable.
- Peak-block protection (09:00-11:00 Mon-Tue).
- Founder unavailability protocol (`copy/galaxy-founder-unavailability-protocol.md`) for absences.
- Business continuity plan (`galaxy-business-continuity-plan.md`) for catastrophic scenarios.

### Mitigation still needed

- Personal kill criteria for the founder bet itself per runway scenario, *operationalized*: not just documented but actually monitored against weekly mental-state journal entries.
- A "burnout indicator" tracker — sleep quality, weekly hours worked, weekend recovery, mood — that triggers structural rest before crisis.
- Explicit pre-committed dates for vacation: 2 weeks total across Year-1, scheduled before Year-1 starts.
- A trusted-contact relationship who has standing permission to tell Garrett "you need to stop" without negotiation.

---

## Failure mode 7: A specific bad week destroyed brand confidence

### What this looks like

Galaxy publishes 4-5 calls in one week. 4 of them lose. The Loss Room can't keep up; autopsies feel defensive. Twitter sentiment turns. A few members publicly cancel with reasons. The week creates a feedback loop where members start watching for the next loss instead of the next call.

### Likelihood

**Medium.** Variance dictates that some weeks will be worse than others. The 60-65% confidence band losing 3-4 in a row is mathematically expected on a multi-month basis.

### Severity if it happens

**Medium-high.** A bad week itself isn't fatal; how Galaxy responds to a bad week is.

### Mitigation in place

- Loss Room autopsies handle individual losses honestly.
- Anti-spiral protocol (`founder-resilience-playbook.md`) for not over-reacting to bad weeks.
- Calibration audit framework that contextualizes bad weeks within long-term variance.
- The 24-hour buffer before responding to public criticism.

### Mitigation still needed

- A "bad week protocol" specifically: when 3+ losses in 5-day window, what does Galaxy do? Specifically not: chase wins, change methodology, apologize publicly. Specifically yes: continue cadence, publish autopsies, lean into transparency.
- A Vault member communication template for highly-visible bad-week moments: "the math hasn't changed; the variance has surfaced; here's the autopsy aggregate."

---

## Failure mode 8: A competitor took Galaxy's positioning

### What this looks like

Outlier.bet (or a similar competitor) launches a "we publish our losses + show our methodology" feature in Year-1. The differentiation Galaxy invested in is replicated. The "math you can read" frame becomes less distinctive.

### Likelihood

**Low-medium.** Competitors generally don't copy brand-position discipline because it's expensive (publishing losses + Pass List is a hit to perceived performance). But high-margin pressure could push someone to try.

### Severity if it happens

**Medium.** Galaxy's brand-position moat is partly the discipline of execution, not the idea. A competitor announcing "we'll publish losses too" doesn't actually sustain the discipline; Galaxy's track record by Month 12 is the proof.

### Mitigation in place

- Galaxy's discipline compounds over time; Year-1 Loss Room + Pass List archive is the proof.
- Methodology page transparency is the substrate; copying it requires public commitment to factor-level documentation.
- Founding-50 cohort signals the trust differential.

### Mitigation still needed

- A "first-mover archive" thesis: Galaxy publishes more autopsies, more Pass List entries, more methodology updates than any competitor over the year. The archive itself becomes the moat.
- An Almanac as physical artifact compounds the brand-position investment.
- Monitoring of competitor brand-position claims; if Outlier or similar makes the same claim publicly, Galaxy doesn't react publicly. The execution archive is the response.

---

## Aggregate severity matrix

| Failure mode | Likelihood | Severity | Mitigation level |
|---|---|---|---|
| 1. Founding-50 underfill | Medium | High | Strong (customer dev) |
| 2. Onboarding broke at scale | Medium-high | High | Medium (needs monitoring) |
| 3. Brand position drift | Medium-high | Critical | Medium (needs weekly check) |
| 4. Methodology didn't calibrate | Medium | Critical | Medium (needs public backtest) |
| 5. Renewal cliff at Month 11-12 | Medium-high | Critical | Strong (sequence + check-ins) |
| 6. Founder mental health | Medium-high | Critical | Medium (needs operationalized monitoring) |
| 7. Bad week destroyed confidence | Medium | Medium-high | Medium (needs bad-week protocol) |
| 8. Competitor took positioning | Low-medium | Medium | Strong (execution archive moat) |

---

## What this pre-mortem says

The three failure modes most underprepared for:

1. **Brand position drift under operational pressure** — needs weekly smoke test + content-flag automation.
2. **Methodology calibration risk** — needs public backtest + calibration tracker widget.
3. **Founder mental health** — needs operationalized monitoring + standing trusted-contact permission.

Each of these has Mitigation Level "Medium." Each can be moved to "Strong" with documented + executed work in the next 30 days.

The other 5 failure modes have mitigations rated Strong-Medium that hold.

---

## Decision-log items surfaced

- **DEC-NEXT-PREMORTEM-001:** Build calibration tracker widget for galaxysportsedge.com/methodology by Month-3.
- **DEC-NEXT-PREMORTEM-002:** Operationalize burnout indicator + standing trusted-contact relationship by Month-1.
- **DEC-NEXT-PREMORTEM-003:** Build weekly brand position smoke test (5 questions, 10 minutes) by Week-2.
- **DEC-NEXT-PREMORTEM-004:** Schedule 2 weeks Year-1 vacation in advance, lock dates before launch.
- **DEC-NEXT-PREMORTEM-005:** Build bad-week protocol document by Month-1.
- **DEC-NEXT-PREMORTEM-006:** Build pre-launch calibration backtest publication by Week-2.

---

## Pre-mortem re-run cadence

This document gets re-run:

- **Month-3:** Update Likelihood + Severity based on first 90 days of real data.
- **Month-6:** Comprehensive re-run; new failure modes surfaced.
- **Month-12:** Final pre-Year-2 re-run.

Each re-run preserves the prior version in `audit/` using a month-numbered pre-mortem filename for comparison.

---

## What this pre-mortem deliberately doesn't do

1. **Doesn't soften the failure framings.** Each scenario is named directly.

2. **Doesn't list more than 8 failure modes.** Discipline of focus.

3. **Doesn't promise mitigations Galaxy can't execute.** The "still needed" sections are commitments, not aspirations.

4. **Doesn't address acquisition-shaped failures.** Galaxy is operating to build, not to sell. Acquisition-failure scenarios live in `12-acquisition-optionality.md`.

5. **Doesn't predict which failure mode will materialize.** Pre-mortems surface possibilities; they don't forecast.

---

## Cross-references

- Galaxy decision rights matrix: `galaxy-decision-rights-matrix.md`
- Founder resilience playbook: `founder-resilience-playbook.md`
- Galaxy business continuity plan: `galaxy-business-continuity-plan.md`
- Galaxy crisis communications playbook: `galaxy-crisis-communications-playbook.md`
- Vault month-3 KPI decision memo: `copy/vault-month-3-kpi-decision-memo-template.md`
- Vault month-6 KPI decision memo: `copy/vault-month-6-kpi-decision-memo-template.md`
- Vault month-12 KPI decision memo: `copy/vault-month-12-renewal-decision-memo-template.md`
- Quarterly deep audit protocol: `galaxy-quarterly-deep-audit-protocol.md`
- Galaxy brand voice canonical: `galaxy-brand-voice-canonical.md`
- Galaxy methodology revision protocol: `copy/galaxy-methodology-revision-protocol.md`
- Galaxy vault renewal email sequence: `copy/galaxy-vault-renewal-email-sequence.md`
- Vault sunset playbook: `launch/vault-sunset-playbook.md`

---

*The pre-mortem is honest about what could kill Vault. The most-underprepared failure modes are named; the mitigation gaps are documented; the decision-log items are queued. The exercise compounds: re-run at each KPI gate, the picture sharpens. Trust is built by naming what could break it.*
