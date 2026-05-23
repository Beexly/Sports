# KPI Review — The Operator Ritual

**Companion to:** `04-kpi-decision-rules.md` (the mechanical rules) + `templates/monthly-kpi-review.md` (the structured template) + `templates/kpi-dashboard.csv` (the data layer).
**Purpose:** The Galaxy-voice version of the monthly review — what the cockpit looks like to Garrett, how the ritual feels, and how the discipline survives months that are emotionally hard.

---

## Why this document exists

Codex's KPI rules are mechanically correct. They tell Garrett when to kill, when to double down, when to wait. But mechanical correctness doesn't survive emotional pressure. Founders abandon KPI discipline when:

- The product is their identity, so a kill criterion firing feels like personal failure.
- The metrics are between thresholds month after month, so the discipline starts to feel like bureaucracy.
- A bad month feels worse than the metrics suggest because the founder is reading vibes, not data.
- A good month feels better than the metrics suggest because the founder is desperate for a win.

This document is the layer on top of the mechanical rules that helps the rules actually get followed. It's the ritual, not the spec.

---

## The Last Friday — what the ritual looks like

### Block: the calendar entry

Last Friday of every month, 09:00–11:00 Eastern. Recurring calendar entry titled "Monthly KPI Review — do not move." Two hours. Phone on do-not-disturb. No Slack. No email.

If a critical fire requires Garrett's attention on the last Friday morning, the review moves to the same time on the following Monday. It does NOT move to the next month. The slip discipline is the discipline.

### Open: 09:00 — the cockpit walk

Open the cockpit. Walk through each active track in order. **Read the numbers out loud.** This is small but important — saying "Vault has 287 active paid members" out loud surfaces emotional reaction in a way that reading silently doesn't.

For each track:
- Active paid members / customers / partners.
- The headline KPI for that track.
- Change vs last month, percentage and absolute.
- Performance vs target for the period.

10 minutes total. No analysis yet. Just the numbers.

### Sit: 09:10 — the felt response

This is the most important part of the ritual, and it's the part founders skip.

After the cockpit walk, sit with the numbers for two minutes. No notes. No analysis. Just register what they feel like.

The honest emotional read is data. If the numbers are mechanically on-target but Garrett feels dread, that's signal — something about the track is failing in a way the metrics don't capture yet. If the numbers look weak but Garrett feels conviction, that's signal too — there's qualitative information about why the track is going to recover.

**Capture the felt response in one sentence per track**, written down in the monthly review template:

> Vault: "feels good — members are talking in Discord. The slow weeks are quieter than I want but engagement is honest."
> Almanac: "feels uncertain — pre-orders aren't materializing the way I expected and I'm second-guessing the price."
> Live: "feels stalled — no founding partners have closed and I'm starting to dread the BD outreach."

The felt response gets compared to the mechanical read in the next step. Big mismatches between felt response and mechanical read are the most important signal of the month.

### Compute: 09:15 — the mechanical read

Now run the mechanical rules from `04-kpi-decision-rules.md`. For each track:

- Are we at a kill threshold? Sunset by Monday.
- Are we at a doubling-down trigger? Invest within 2 weeks.
- Are we between thresholds? Apply the between-threshold rule.

Write the mechanical read next to the felt response.

| Track | Felt response | Mechanical read |
|---|---|---|
| Vault | "Feels good" | "287/250 target = 115%. Maintain + extend." |
| Almanac | "Feels uncertain" | "180/500 pre-orders = 36%. Warning state — below 50% for first month." |
| Live | "Feels stalled" | "0/5 founding partners. At 1-month-post-launch threshold for active intervention." |

The mismatches surface here. Vault feels good AND mechanically green — no mismatch. Almanac feels uncertain AND mechanically warning — no mismatch (the gut was reading the truth). Live feels stalled AND mechanically requires intervention — no mismatch.

Mismatches to take seriously when they happen:

- **Feels good + mechanically warning:** Garrett is in denial. Trust the data.
- **Feels bad + mechanically green:** something invisible is going wrong. Investigate before next review.
- **Feels good + mechanically green:** keep going.
- **Feels bad + mechanically warning:** kill criterion may need to fire early. Re-examine the override protocol carefully.

### Decide: 09:45 — what fires this month

Pull out the decision sheet. For each track, write the action that fires this period. The action is mechanical, not discretionary:

- Kill threshold met → sunset by Monday.
- Doubling-down trigger met → invest within 2 weeks.
- Between thresholds → apply the rule.

The decision sheet has three columns: track, action, deadline.

| Track | Action | Deadline |
|---|---|---|
| Vault | Maintain + extend (consider community manager hire if growth holds) | Reassess next review |
| Almanac | Warning: schedule press outreach + community announcement this week | Last day of next week |
| Live | Active intervention: technical review of OBS plugin with founding-5 contacts | End of next week |

### Override: 09:55 — the protocol

If Garrett wants to override a mechanical kill criterion, this is the moment.

The override protocol from `04-kpi-decision-rules.md`:

1. Decision-log entry required.
2. New kill criterion required.
3. First override only — second triggers automatic sunset.

If Garrett invokes the override here, write the decision-log entry in this session — not later. The discipline that the override is rare depends on the override being **harder than acceptance** in real time. If override requires writing a paragraph explaining "why this isn't a fail" + setting a new kill criterion + accepting that the next attempt at override is automatic sunset — most founders will not invoke it unless they really believe the metric is misleading.

If Garrett doesn't have the emotional energy to write the override paragraph in this 5-minute window, that's signal too. It means the override isn't actually justified.

### Document: 10:00 — the monthly memo

Open `templates/monthly-kpi-review.md`. Fill in the structured fields for the month.

The memo template should include:

```markdown
# Monthly KPI Review — [Month Year]

## Felt response (per track, one sentence)

Vault: ...
Almanac: ...
Live: ...

## Mechanical read (per track, one line)

Vault: ...
Almanac: ...
Live: ...

## Decisions this period

| Track | Action | Deadline |

## Override invoked?

[Yes/No, with link to decision-log entry if yes]

## Notes worth carrying forward

[Anything that doesn't fit above — patterns across tracks, observations
about runway, qualitative signals from members, things to revisit next month]

## What I'd do differently this month if I had it back

[The honest retrospective question. Even strong months have one answer here.]
```

Save the memo under `reviews/` using a YYYY-MM filename. Archive every month. Build the operator's own track record.

### Close: 10:30 — the soft close

The last 30 minutes are reserved for the soft work that the ritual makes time for.

- Reply to any Vault Discord posts that need response.
- Read any unread member feedback.
- Look at one specific subscriber's journey (chosen at random or per the diversification audit) — what did they engage with this month?
- Re-read last month's memo. Anything change since then that matters?
- Write one sentence in the decision log capturing the most important thing the month taught you.

The close exists to keep the ritual from being purely analytical. Galaxy is a brand built on operator-led judgment; the close re-grounds Garrett in the human texture of the product.

### End: 11:00 — close the cockpit

Phone back on. Slack back. Email back. The ritual is over.

---

## What the cockpit surfaces should look like

The data layer is in `templates/kpi-dashboard.csv` (CSV format Codex shipped). The cockpit Garrett sits in front of every month needs more than CSV. Recommended surfaces (engineering-side work, but specifying the operator experience):

### Surface 1: The single-page dashboard

One scrollable page. Per track:

- Three numbers at the top in oversized type: active count, period change, vs-target percent.
- A 12-month trendline (sparkline or full chart).
- The next decision gate with the threshold value.
- One-line note: "Last month's decision: maintain. Last month's note: 'engagement is honest.'"

No tables. No legends. The cockpit is the publication-equivalent of the public Ledger — clean, clear, no friction.

### Surface 2: The override log

A separate page that lists every override Garrett has ever invoked. Visible at the cockpit's bottom. Two purposes:

1. Reminds Garrett that overrides are rare events with track records.
2. Provides accountability — if a track sunsets and the decision log shows two overrides on prior months, the postmortem is clear about what went wrong.

### Surface 3: The runway band

A small line at the top of the cockpit showing current runway scenario (6/12/24+ months) and how many months Galaxy has been operating in that scenario. If runway shortens mid-period, the band changes color, and Garrett sees the change before opening any track-level data.

### Surface 4: The decision log

Append-only document of every meaningful decision Galaxy has made since Phase 0. Operates in the cockpit as a left-side rail. Garrett can search it during the monthly review — "did we already decide about [topic] in March?" — without opening a separate tool.

Codex's `templates/decision-log.md` is the foundation. The operator surface puts it next to the data, not in a separate file.

---

## Failure modes to watch for

Galaxy's monthly review ritual fails in three predictable ways. Each has a mitigation.

### Failure mode 1: The review gets skipped

Last Friday becomes the Friday before launch week. Launch week becomes the week of the customer dev sprint. The customer dev sprint becomes the week of the Almanac press push. Months go by, no review.

**Mitigation:** the slip discipline. If last Friday is blocked, review happens Monday of the following week. NOT next month. The two-day slip is acceptable; a one-month slip is not.

**Secondary mitigation:** the Vault Discord. If Garrett misses a review, he posts in #vault-feedback explaining why. The public commitment makes future skips harder.

### Failure mode 2: The review becomes self-congratulatory

Three months of green KPI become a habit of "everything's fine." The discipline atrophies. The founder stops scrutinizing details. Eventually a metric is missed.

**Mitigation:** the "what I'd do differently" question at the end of every memo. Even on green months, the answer can't be "nothing." Forcing a specific answer keeps the operator awake to the texture of the product.

**Secondary mitigation:** rotate which deferred track gets a discretionary 30-minute review each month. The deferred tracks have activation gates; checking those gates monthly keeps Garrett honest about whether the portfolio shape still fits the runway.

### Failure mode 3: A bad month becomes a death spiral

A red month produces a felt-response of dread. Dread produces poor decisions about the next 4 weeks. The next month is worse. The death spiral has begun.

**Mitigation:** the personal kill criteria (per v3 plan Part 7). If Galaxy's reading is at a personal kill threshold (e.g., 12-month runway scenario with combined Vault + Almanac pipeline under $250k at month 9), Garrett executes the pre-committed response — raise capital or return to full-time work. The pre-commitment removes the in-the-moment emotional weight.

**Secondary mitigation:** an external accountability partner. Not a co-founder — Galaxy is single-founder by design — but someone who reads the monthly memo and asks one hard question per month. Vault advisor channel can serve this role at low cost.

---

## How the review evolves

The ritual described above is V1 — for the first 6 months of post-launch operation. It's heavy on Galaxy-voice ritual and light on automation. Over time:

**Month 7-12:** automation increases. The cockpit pulls live data instead of requiring Garrett to compute. The memo template fills itself out for the mechanical sections; Garrett only writes the felt-response and override sections.

**Year 2+:** the review extends to include deferred-track activation reviews. Each deferred track gets a 5-minute monthly check against its activation gate. The portfolio quarterly review (existing in `04-kpi-decision-rules.md`) becomes more meaningful.

**Year 3+:** the ritual becomes the operating discipline of a multi-person Galaxy team. The first hire (likely community manager + 1099 BD) joins the last-Friday review. The ritual scales by changing audience, not by being replaced.

---

## The single most important sentence in this doc

The mechanical rules in `04-kpi-decision-rules.md` are correct.

The reason the rules will or won't be followed has almost nothing to do with the rules. It has to do with the ritual.

The ritual is what survives a bad month. The ritual is what saves Galaxy when the founder's intuition wants to override the math. The ritual is the institutionalization of the discipline that the v3 master plan explicitly named as Galaxy's moat.

Build the ritual. The rules take care of themselves.

---

## Cross-references

- Mechanical rules: `04-kpi-decision-rules.md`
- Structured memo template: `templates/monthly-kpi-review.md`
- Data layer: `templates/kpi-dashboard.csv`
- Decision log: `templates/decision-log.md`
- Personal kill criteria: v3 plan Part 7 → `01-runway-scenarios.md`
- Override protocol: `04-kpi-decision-rules.md` § "Owner-Override Protocol"

---

*The last Friday of the month is the most important Galaxy operating ritual. Get this right and the company corrects itself. Get it wrong and even good rules fail. Block the calendar. Honor the slip discipline. Read the numbers out loud.*
