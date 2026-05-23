# Vault Month-6 KPI Decision Memo Template

**Audience:** Garrett.
**Pairs with:** `copy/vault-month-3-kpi-decision-memo-template.md` (Month-3 sibling) + `04-kpi-decision-rules.md` (mechanical rules) + `launch/vault-sunset-playbook.md` (if kill criterion fires).

**Why Month-6 is different:** Month-3 was a check-in. Month-6 is the first kill-criterion gate. Vault either continues into Year-2 planning, or sunsets per Scenario B.

---

## Memo header

```
# Vault Month-6 KPI Decision Memo

**Date:** 2026-MM-DD (last Friday of month 6)
**Operator:** Garrett
**Decision archived as:** future dated Month-6 Vault decision memo under `reviews/`
**Decision-log entry:** DEC-NEXT-VAULT-MONTH-6-001
```

---

## Section 1 — Headline metrics

```
**Active paid members at Day 180:** ____

  Trajectory: Day 30 / Day 60 / Day 90 / Day 120 / Day 150 / Day 180

**Compared to Month-3:** [growth / flat / decline]

**Renewal-rate projection:** [extrapolating current engagement → expected month-12 renewal rate]

**Calibration band (rolling 6 months):** [%]

**Refund rate quarter 1 + 2:** ____ %

**Cancellation reasons (top 3 from past 6 months):**
1. ____
2. ____
3. ____

**Member feedback summary:**
Top 3 themes that crossed action threshold this quarter:
1. ____
2. ____
3. ____
```

---

## Section 2 — KPI gate decision (the critical section)

Apply rules from `04-kpi-decision-rules.md` § "Vault" Month-6 thresholds:

```
## Month-6 KPI gate (per 04-kpi-decision-rules.md)

- Active paid members at Day 180: ____ / 500 target

Mechanical decisions per threshold:
- 500+ members: On track. Begin V2 conference + cap-lift planning.
- 250-499 members: Active intervention. Community manager hire under consideration.
- 150-249 members: Warning. Specific intervention required.
- <150 members: KILL THRESHOLD. Sunset Vault per `launch/vault-sunset-playbook.md` Scenario B.

## My decision

[ ] On track (≥500) — begin V2 planning.
[ ] Active intervention (250-499) — specifics: [describe]
[ ] Warning (150-249) — pricing/positioning revision direction: [describe]
[ ] KILL THRESHOLD (<150) — sunset per Scenario B; specific timeline: [describe]

## Override invoked?

[ ] No override.
[ ] Override invoked. Decision-log entry: DEC-NEXT-___-OVERRIDE created. New kill criterion: ____. This is the first AND ONLY override allowed for the Vault track per `04-kpi-decision-rules.md`.
```

---

## Section 3 — Anti-rationalization audit (if at or near kill threshold)

This section is critical when results are below threshold. Don't skip it.

```
**Question 1:** Did I run the politeness filter honestly through the past 6 months of member engagement?

[Honest answer. Tag: yes / partially / no]

**Question 2:** Did I track to the customer-dev outcome decision rule (Plan A/B/C/D/E) honestly through engineering kickoff?

[Honest answer]

**Question 3:** Am I considering override because the evidence supports it, or because I'm under emotional/time pressure?

[Honest answer]

**Question 4:** Did the founder kill criteria (per `founder-resilience-playbook.md`) fire at any point in the past 6 months?

[Yes/No + details if yes]

**Question 5:** If a Vault member who joined founding-50 asked me publicly today whether Vault is on the right track, what would I honestly say?

[Single honest sentence]

**If any of these checks surface dishonesty: the conservative plan applies. Don't override.**
```

---

## Section 4 — Qualitative marker check (Year-1 mid-point)

Per `galaxy-year1-qualitative-success-markers.md`:

```
**Marker 1-12 score:** ____ / 12 Healthy

Specific breakdown by category:
- Category A (Member culture): ___ / 4
- Category B (Operating discipline): ___ / 4
- Category C (Content quality): ___ / 4

**Comparison to Month-3 audit:** [improving / stable / degrading]

**If the qualitative markers are degrading while KPIs are green: the brand position is in trouble even though the numbers look fine. This is a structural concern.**
```

---

## Section 5 — Felt response

Per `audit/kpi-operator-ritual.md`:

```
**My felt response at Month 6:**

[2-3 sentences. Honest emotional read about the trajectory.]

**Does my felt response match the mechanical read?**

[Aligned / mismatched + details]

**The Month-6 specific question:** if Vault sunsets per the kill threshold, am I prepared to honor that decision honestly?

[Yes / Yes-with-difficulty / Not-yet — flagged for `founder-resilience-playbook.md` review]
```

---

## Section 6 — Strategic alignment with Year-end

Vault's Year-1 horizon is end-of-year. Month-6 is the halfway pulse. Key question:

```
**If trajectory holds through next 6 months, what does Year-1 look like?**

[Quantitative projection: estimated active members at month 12]

**Is that trajectory consistent with Year-2 planning?**

[Yes — proceed with V2 planning + Almanac strong / Mixed — flag specific concerns / No — Year-2 likely involves sunset]

**Brand position health for Year-end annual report:**

[Will Galaxy have a brand-position-aligned story to tell in the year-end report? Yes / Mixed / No]
```

---

## Section 7 — Action plan based on decision

### If "On track" or "Active intervention":

```
**Top 3 actions for Month 7-12:**

1. [Specific deliverable + deadline]
2. [Specific deliverable + deadline]
3. [Specific deliverable + deadline]

**Hiring decision (community manager):** Yes / No / Defer to Month 9 reassessment

**V2 conference planning:** Begin if on-track ≥500 members. Defer otherwise.

**Almanac coordination:** Confirm October content freeze on track for January 15 ship.
```

### If "Warning":

```
**Pricing/positioning revision plan:**

[Specific changes proposed]

**Member communication required:**

[Will members be told? What language?]

**Re-assess date:** [4 weeks from today]

**Founder resilience check:** Am I emotionally prepared to handle this revision? [Honest answer]
```

### If "KILL THRESHOLD met (sunset)":

```
**Sunset trigger date:** Today.

**Sunset playbook applies:** `launch/vault-sunset-playbook.md` Scenario B.

**Member communication date:** [Within 7 days of this decision]

**Prorated refund processing:** [Begin within 7 days of member notification]

**Public surface update:** `/vault` page becomes sunset notice per Scenario B template.

**Designated contact / Codex / Lawyer notification:** Within 24 hours of this decision.

**Year-1 retrospective content:** Honest documentation of why sunset; what Vault taught Galaxy; what comes next for Galaxy operations (Almanac becomes year-1 anchor; Live track decision separately).
```

---

## Section 8 — One sentence to carry forward

```
[The single most important thing Month 6 teaches Galaxy, in one sentence. Becomes annual report input.]
```

---

## Section 9 — Decision-log entry

Write the formal entry per `week-minus-1/06-decision-log-entry-templates.md`:

```
## DEC-NEXT-VAULT-MONTH-6-001 — Month-6 KPI decision

Date: 2026-MM-DD
Author: Garrett

Mechanical KPI: [active members] / 500 target = ___ % of target.

Mechanical decision per `04-kpi-decision-rules.md`:
[continue / active intervention / warning / KILL THRESHOLD]

Qualitative marker score: ___ / 12 Healthy.

Anti-rationalization audit: [results]

Felt-response vs mechanical-read: [aligned / mismatched]

Decision: [continue / active intervention / warning / sunset]

Rationale: [3-5 sentences]

Override invoked? [No / Yes (link to override DEC entry)]

Next reassessment: Month-12 (the renewal-period KPI gate per `launch/vault-renewal-period-playbook.md`).

Memo link: future dated Month-6 Vault decision memo under `reviews/`
```

---

## Section 10 — Sign-off

```
Memo finalized: ____________________ (Garrett initials + date)
Decision-log entry written: DEC-NEXT-VAULT-MONTH-6-001
Codex notified of decision: Yes / No
Vault Discord update planned: Yes (timing) / No
Lawyer engaged (if kill threshold): Yes / No / N/A
Memo archived: future dated Month-6 Vault decision memo under `reviews/`
```

---

## What Month-6 memo deliberately doesn't do

1. **No deferral of difficult decisions.** Month 6 is the kill-criterion gate. Don't defer "to give it more time."

2. **No emotional override of data.** The anti-rationalization audit is in Section 3 specifically because emotional resistance to sunset is high at Month 6.

3. **No "sweet-spot" KPI revision.** Don't lower the kill threshold mid-year because results are close.

4. **No "wait for Month-7" hedging.** Decisions at Month 6 are decisions at Month 6.

5. **No comparison to industry benchmarks.** Galaxy is Galaxy.

---

## After the Month-6 decision

If "On track" or "Active intervention":
- Decision communicated to Codex.
- V2 planning (if applicable) begins.
- Operations continue normally.

If "Warning":
- 4-week revision period.
- Re-assess at Month 7.

If "KILL THRESHOLD":
- Sunset operations begin per Scenario B.
- Member communication sent within 7 days.
- All Year-1 Vault retrospective work proceeds.

---

## Cross-references

- KPI rules: `04-kpi-decision-rules.md`
- KPI operator ritual: `audit/kpi-operator-ritual.md`
- Vault sunset playbook: `launch/vault-sunset-playbook.md`
- Founder resilience (kill criteria): `founder-resilience-playbook.md`
- Year-2 strategic question framework: `galaxy-year2-strategic-question-framework.md`
- Year-end annual report: `copy/galaxy-year-end-annual-report-template.md`
- Decision-log templates: `week-minus-1/06-decision-log-entry-templates.md`

---

*Month-6 is the first true kill-criterion gate. The memo template is the discipline that turns a hard decision into a mechanical one. If the threshold isn't met, sunset. The anti-rationalization audit is what prevents the override from being made for the wrong reasons.*
