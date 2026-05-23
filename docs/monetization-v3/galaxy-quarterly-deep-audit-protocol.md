# Galaxy Quarterly Deep Audit Protocol

**Audience:** Garrett. Internal.
**Pairs with:** `audit/kpi-operator-ritual.md` (monthly KPI ritual) + `galaxy-year1-qualitative-success-markers.md` (the marker framework).
**Purpose:** Once per quarter, run a deep audit of Galaxy operations across all dimensions. The audit consolidates what the monthly rituals don't have time for.

**Cadence:** Once per quarter, last week of March / June / September / December.
**Duration:** 4 hours.

---

## Why this audit exists

Monthly KPI ritual covers KPI rules + ritual + decision-log entries. It's a 2-hour discipline focused on the active month's metrics.

Quarterly deep audit covers:
- Brand position drift across the quarter.
- All 12 qualitative success markers.
- Cross-document consistency (cross-references still resolve, decisions still apply).
- Customer dev signal patterns over the quarter.
- Crisis log patterns over the quarter.
- Year-strategic alignment (are we on the path?).

The deep audit catches what the monthly ritual misses.

---

## The audit structure (4 hours total)

### Hour 1 — Brand position audit (60 min)

#### 1a. Read 5 random Galaxy public surfaces (15 min)

Pick 5 surfaces at random:
- The Board (current publications).
- The Ledger (settled picks).
- A random Loss Room autopsy.
- A random Pass List entry.
- A random Model Journal entry.

Read each surface fully. Note:
- Does the voice sound like Galaxy?
- Any banned vocabulary slipped in?
- Any marketing language drifted toward?
- Any specific factors named that should stay private?

If any drift: flag for fix.

#### 1b. Read the last 4 Wednesday digests (20 min)

- Are they tonally consistent?
- Are they length-consistent (500-900 words)?
- Are the 5 sections holding?
- Is the voice still "the same operator wrote them on Sunday afternoon"?

#### 1c. Sample 4 Discord exchanges (10 min)

Random sample from Vault Discord conversations. Check:
- Are the conversations substantive?
- Is Garrett's tone aligned with brand voice?
- Is the moderation discipline holding?

#### 1d. Brand voice canonical re-read (15 min)

Read `galaxy-brand-voice-canonical.md` end-to-end. Identify any rule that's been drifting in the prior quarter. Note in audit doc.

---

### Hour 2 — Qualitative markers audit (60 min)

Run through all 12 markers from `galaxy-year1-qualitative-success-markers.md`:

For each:
- Healthy / Mixed / Drifting
- Specific evidence supporting that assessment
- If Drifting: what specific action is needed

Document each marker assessment in the quarterly qualitative audit file under `reviews/` per the format in the qualitative markers doc.

If 8+ markers healthy: brand position is compounding correctly.
If 4-7 healthy: investigate drift patterns.
If 0-3 healthy: brand position in trouble; reset.

---

### Hour 3 — Documentation + cross-reference audit (60 min)

#### 3a. File count + line count (5 min)

Run the validation script (`tools/validate-monetization-v3.ps1` per Codex). Note the file count + line count.

Compare to last quarter: growth pattern is healthy if substantive new files were added; flat is fine; significant deletion is unexpected.

#### 3b. Cross-reference resolution (20 min)

Spot-check 10 random cross-references across the pack. Examples:
- A `[file].md` reference resolves to an actual file.
- A specific section reference (`section-anchor`) points to a section that exists.
- A directory reference points to the correct directory.

If any cross-reference is broken: flag for fix.

#### 3c. Decision log review (20 min)

Read every decision-log entry from the past quarter.

- Are entries written same-day-or-near as decisions were made?
- Are overrides documented properly?
- Are any decisions missing log entries that should have them?

If gaps: identify which decisions need retroactive log entries.

#### 3d. Memory cross-check (15 min)

Open Garrett's auto-memory file if it exists.
- Have the most recent memory entries captured the past quarter's important shifts?
- Are there structural Galaxy changes not yet in memory?

---

### Hour 4 — Strategic alignment audit (60 min)

#### 4a. KPI trajectory review (15 min)

For each active track (Vault, Almanac, Live):
- Were the past quarter's KPI gates hit?
- Are forward-looking metrics on trajectory?
- Are any markers approaching thresholds (kill / doubling-down)?

Don't make decisions here — those happen at monthly KPI ritual. This is trajectory awareness.

#### 4b. Customer dev signal review (15 min)

Open `templates/vault-feedback-themes.csv`. Read entries from the past quarter:
- Top 3 themes by frequency.
- Top 3 themes by severity.
- Patterns crossing the action threshold (5+ members, 8+ members, cancellation-tagged themes).

Decide:
- Which themes warrant decision-log entries this quarter?
- Which themes feed into Year-2 strategic planning?

#### 4c. Crisis log review (15 min)

Open `templates/crisis-log.md` if any entries exist. Read entries from the past quarter:
- Any patterns? (Same type of incident recurring?)
- Were the responses brand-aligned?
- Any incident that warrants structural change?

If 3+ incidents of the same type: structural change required.

#### 4d. Year-strategic alignment (15 min)

Are we on the path to Year-end annual report + Year-2 strategic question framework?

- Vault track: is it tracking toward V2 cap-lift or sunset, or in the middle?
- Almanac track: is production on schedule for January 15 ship?
- Live track (if active): is Sketch outreach progressing? Are mid-tier partners closing?

Flag concerns; don't decide them. The Year-2 strategic question framework handles decisions in December.

---

## Producing the quarterly audit document

After all 4 hours, document the audit in a quarterly audit file under `reviews/`:

```
# Galaxy Quarterly Deep Audit — 2026-QN

Audit date: 2026-MM-DD
Auditor: Garrett (with Codex assistance for validation tooling)

## Brand position audit

### Random surface sample
[5 surfaces audited, flag any drift]

### Wednesday digest consistency
[Last 4 digests assessed; voice/length/structure findings]

### Discord conversation sample
[Sample findings; moderation discipline assessment]

### Voice canonical re-read
[Any drift identified]

## Qualitative markers audit

[12 markers each Healthy / Mixed / Drifting; specific actions if drifting]

## Documentation audit

[File count + line count + cross-reference findings + decision-log gaps]

## Strategic alignment

[KPI trajectory + customer dev signals + crisis log + Year-strategic path]

## Top three actions this quarter

1. [Specific action]
2. [Specific action]
3. [Specific action]

## What I learned this quarter

[Honest reflection on what the audit surfaced that monthly ritual missed]
```

The quarterly audit document is archived under `reviews/`. The Year-end annual report references all 4 quarterly audits in its "what 2026 didn't teach us" section.

---

## What the quarterly audit produces

By end of the 4 hours, Garrett has:

1. Brand position assessed (drift identified or confirmed).
2. 12 qualitative markers scored.
3. Documentation integrity verified.
4. Strategic alignment with Year-end annual report visible.
5. Top 3 actions for next quarter committed.
6. Quarterly audit document written + archived.

---

## When the quarterly audit gets skipped

The quarterly audit is the discipline that catches what monthly ritual misses. Skipping it for 1 quarter is recoverable. Skipping 2+ consecutive quarters means the deep audit discipline has broken; reset by completing a 6-month catch-up audit.

If the operator is in continuity mode (per `galaxy-business-continuity-plan.md`): the quarterly audit defers until Garrett returns. The designated emergency contact doesn't run quarterly audits.

---

## What this audit deliberately doesn't do

1. **No decision-making during the audit.** The audit surfaces patterns. Decisions happen at monthly KPI ritual or Year-end strategic review.

2. **No member-facing communication.** The audit is internal. If audit findings produce changes that affect members, those changes are communicated separately per the brand voice.

3. **No comparison to last quarter's audit.** Each audit stands alone. Trend analysis happens at Year-end.

4. **No detailed product roadmap planning.** The audit informs planning but doesn't replace it.

5. **No marketing-strategy review.** Galaxy doesn't run a marketing strategy that needs quarterly recalibration.

---

## Annual audit (December, 6 hours)

Once per year (December, before the Year-end annual report):

- All 4 quarterly audits consolidated into a single annual document.
- Year-strategic question framework applied (per `galaxy-year2-strategic-question-framework.md`).
- Annual decision-log review.
- Annual brand position assessment.
- Inputs to the Year-end annual report + Almanac.

The annual audit is the most important Galaxy ritual after the customer dev sprint.

---

## Cross-references

- KPI operator ritual (monthly cadence): `audit/kpi-operator-ritual.md`
- Qualitative success markers (12-marker framework): `galaxy-year1-qualitative-success-markers.md`
- Brand voice canonical: `galaxy-brand-voice-canonical.md`
- Year-end annual report template: `copy/galaxy-year-end-annual-report-template.md`
- Year-2 strategic question framework: `galaxy-year2-strategic-question-framework.md`
- Validation script (Codex): `tools/validate-monetization-v3.ps1`
- Founder resilience: `founder-resilience-playbook.md`
- Daily operations checklist: `galaxy-daily-operations-checklist.md`

---

*The quarterly deep audit is the single most important quarterly Galaxy ritual. It catches brand-position drift, documentation rot, and strategic misalignment before they compound. Block the 4 hours; do the work; produce the document.*
