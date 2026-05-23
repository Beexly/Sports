# Galaxy Year-1 Knowledge Base

**Audience:** Garrett. Internal.
**Purpose:** Galaxy Sports Edge will inevitably hire a community manager, contractor, or operator at some point in Year-2 or beyond. The Year-1 knowledge base below is the single document that brings a new hire up to speed on what Galaxy is, how it operates, and the discipline that holds the brand position.

**Status:** Living document. Updated at Year-1 close + quarterly thereafter.

---

## Table of contents

1. The 30-second pitch
2. What Galaxy is (and isn't)
3. The brand position
4. The 3 product surfaces (Vault, Almanac, Live)
5. The methodology
6. The Loss Room + Pass List
7. Operating cadences
8. Communication standards
9. Decision rights
10. Where the documentation lives
11. The Garrett-specific context
12. What new hires should NOT do

---

## 1. The 30-second pitch

Galaxy Sports Edge is a sports forecasting platform built on a deterministic factor model. We publish calls with confidence levels + factor citations. We publish losses (the Loss Room). We publish considered-but-held games (the Pass List). Our brand position: "we're not AI, we're math you can read."

Revenue is subscription-based (Vault, $200/year), plus an annual hardcover book (the Galaxy Almanac), plus an emerging streaming partnership (Galaxy Live).

The founder operates the business single-handedly. Hires are deliberate + filtered.

---

## 2. What Galaxy is (and isn't)

### Galaxy IS:

- A deterministic factor model that produces published calls with confidence levels.
- A member community (Vault) of paying subscribers who get methodology insights + curated content.
- An honest publisher of its losses + its considered-but-unpublished games.
- A single-operator-led business with deliberate scaling.
- A brand position bet — restraint, methodology, transparency.

### Galaxy is NOT:

- An AI / LLM-based prediction service. (We use Claude internally for writing assistance, never for prediction; this is documented in `galaxy-ai-policy.md`.)
- A sportsbook or sportsbook affiliate.
- A celebrity-bettor or personality-driven content platform.
- A tout-certainty service. We don't have locks. We don't sell certainty.
- A general sports media company. We're narrow + specific.

The distinction between IS and IS NOT defines the brand. Every operational decision is filtered through it.

---

## 3. The brand position

The brand position is captured in three pillars:

**Pillar 1: Method, not personality.**
Galaxy's voice is the methodology. Garrett isn't the brand; the model is.

**Pillar 2: Restraint over enthusiasm.**
We don't celebrate wins publicly. We don't predict every game. We don't post for engagement. The discipline compounds.

**Pillar 3: Transparency demonstrated, not claimed.**
We don't say "we're transparent." We publish the methodology, the losses, the Pass List. The proof is the practice.

Reference: `galaxy-brand-voice-canonical.md` + `galaxy-operating-values.md`.

---

## 4. The 3 product surfaces (Vault, Almanac, Live)

### Vault — $200/year subscription

The primary product. Members get:
- Wednesday digest (data + analysis).
- Pass List entries throughout the week.
- Loss Room autopsies as published.
- Monthly office hours (Zoom + Discord).
- Vault Discord server access.

Member capacity in Year-1: 200-1000. Membership target reviewed at Month-3, Month-6, Month-12 per KPI ritual.

Reference: `product/vault-prd.md` + `copy/vault-landing-page.md`.

### Almanac — $99 hardcover / $39 digital annual

The Galaxy Almanac is an annual hardcover book plus digital edition. ~300 pages. Contains:
- Year-in-review essay plus selected supporting essays.
- Quantitative data (calibration, sport breakdowns, Loss Room aggregate).
- Loss Room reprint with quarterly framing.
- Methodology appendix.

Ships January 15 (covering prior calendar year). Pre-order starts October 1; cover designer + production schedule per Almanac production pack.

Reference: `copy/almanac-production-pack.md` + `copy/galaxy-almanac-essay-outlines.md`.

### Live — partnership-based streaming overlay

Galaxy Live is a streaming overlay product designed for Twitch + YouTube creators in the sports-betting space. Founding-partner agreement structure; not subscription.

Status: Year-2 product. Q1 2027 partnership exploration; Q3 2027 launch if conditions align.

Reference: `copy/live-founding-partner-agreement-template.md`.

---

## 5. The methodology

Galaxy's factor model is documented publicly at galaxysportsedge.com/methodology. Key concepts:

### Factor categories

The model uses 4 factor categories:
- **Quantitative performance** (recent results, advanced stats)
- **Situational context** (matchups, schedule, rest, home/away, weather)
- **Personnel** (injuries, lineup changes, coaching context)
- **Market efficiency** (line movement, public/sharp split, line history)

Each factor has a weight calibrated against historical data.

### Confidence thresholds

The model assigns confidence levels in 5% bands. Pickable thresholds:
- 60% confidence: published as a call.
- 65% confidence: published with higher attention.
- 70%+ confidence: rare; published with full context.
- <60% confidence: Pass List candidate.

### Calibration discipline

A 60%-confidence call should hit ~60% of the time. A 70%-confidence call should hit ~70%. Calibration is the key metric, not win-rate.

Calibration is reviewed quarterly + published in the Almanac.

### Methodology versioning

The model is versioned (currently v2.x). Major version changes are documented in the Model Journal + announced to members.

Reference: `copy/methodology-page-copy.md` + `copy/methodology-faq.md`.

---

## 6. The Loss Room + Pass List

### Loss Room

When a published call doesn't work, Galaxy publishes the autopsy. The autopsy has 5 sections:

1. **What we said** (the original call).
2. **What happened** (the actual game result).
3. **Why we were wrong** (which factor or factors misfired).
4. **What we learned** (methodology implications).
5. **What changes** (concrete revisions to the model or process).

Loss Room is the Galaxy commitment that distinguishes the platform. Members + outside readers can audit every loss.

Reference: `copy/loss-room-page-copy.md`.

### Pass List

When a game is considered but not published, Galaxy publishes the Pass List entry. 5 categories:

1. **Methodology gap** (factor model doesn't have a defensible call).
2. **Market efficiency** (line is fairly priced; no edge).
3. **Personnel uncertainty** (injuries or lineups too ambiguous).
4. **Insufficient data** (sport or league coverage isn't mature enough).
5. **Brand-position consideration** (rare; we don't publish even if methodology has a call).

Pass List is the Galaxy commitment to restraint. We could publish on every game; we choose not to.

Reference: `copy/pass-list-page-copy.md`.

---

## 7. Operating cadences

### Daily

Garrett runs the daily ops checklist per `galaxy-daily-operations-checklist.md`. Steps include:
- Review #vault-feedback + #vault-lounge.
- Check Stripe + bank state.
- Review new-member onboarding (Day 4 + Day 7 check-ins).
- Spot-check Twitter sentiment.
- Update factor scores for upcoming games.
- Maintain the working schedule.

### Weekly

- Monday morning: peak block (09:00-11:00) — methodology + content work.
- Tuesday: peak block — content + member work.
- Wednesday: digest writing + sending.
- Thursday: Pass List + Loss Room updates.
- Friday: weekly retrospective + member touchpoint follow-ups.
- Saturday: OFF (per `founder-resilience-playbook.md`).
- Sunday: methodology research + light operations.

### Monthly

- First Monday: monthly KPI ritual per `audit/kpi-operator-ritual.md`.
- Last Tuesday: office hours session (8pm ET).
- End-of-month: P&L review, founder financial discipline check.

### Quarterly

- Quarterly deep audit per `galaxy-quarterly-deep-audit-protocol.md`.
- Year-2 strategic question framework activation (if applicable).
- Founder personal retrospective.

### Annually

- December: Year-end close per `galaxy-end-of-year-1-checklist.md`.
- January: Almanac ships.
- April: Year-2 strategic decisions implemented.

---

## 8. Communication standards

### Voice

Galaxy's voice is documented in `galaxy-brand-voice-canonical.md`. Key principles:
- Methodology-first, personality-second.
- Restrained, never enthusiastic-bait.
- Specific, not vague.
- Honest about uncertainty.
- Brief is better than verbose.

### Channels

- **Email:** Garrett uses garrett@galaxysportsedge.com for official communications. Per `galaxy-email-signature-standards.md`.
- **Twitter:** @GalaxySportsAI is the official handle. Discipline per `copy/galaxy-twitter-content-discipline.md`.
- **Discord:** Vault Discord per `copy/galaxy-vault-discord-channel-architecture.md`.
- **Direct messages:** Used for member support, founder-to-member relationships. Per scenarios in `copy/vault-member-support-playbook.md`.

### What we don't communicate

- Member ARR / count / revenue specifics.
- Specific subscriber names (except in opt-in cases).
- Garrett's personal financial details.
- Internal team disagreements or contractor relationships.

---

## 9. Decision rights

Decision authority is documented in `galaxy-decision-rights-matrix.md`. Summary:

| Decision type | Authority |
|---|---|
| Methodology factor weighting | Garrett |
| Brand-position changes | Garrett |
| Pricing changes | Garrett |
| Content publication | Garrett |
| Partnership agreements | Garrett |
| Hiring | Garrett |
| Capital decisions | Garrett |
| Discord moderation | Garrett (delegate to community manager in V2) |
| Member support edge cases | Garrett (delegate to community manager in V2) |
| Routine ops (digest scheduling, etc.) | Garrett (delegate to ops contractor in V2) |

Decisions of significant brand-position or strategic impact require a decision-log entry per `galaxy-decision-rights-matrix.md`.

---

## 10. Where the documentation lives

All Galaxy documentation lives in `docs/monetization-v3/` in the OneDrive Galaxy Sports Edge repository. Major folders:

- **Root** — Master plan, brand voice, operating values, daily ops, year-1 close checklist.
- **audit/** — KPI ritual, brand-position audits, critique log.
- **copy/** — All member-facing copy: landing pages, emails, Discord templates, methodology, Almanac essays.
- **launch/** — Launch sequence playbooks (90-day runbook, sunset playbook, renewal period playbook).
- **templates/** — Operational templates (incident log, feedback themes log, decision-log entries).
- **week-minus-1/** — Pre-launch week artifacts.
- **reviews/** — Quarterly + annual review documents.

The full master brief is `CODEX_MONETIZATION_V3_MASTER_BRIEF.md` at the repo root.

---

## 11. The Garrett-specific context

For a new hire to operate effectively, they need to understand Garrett's specific operating mode:

### Strengths

- Methodology + factor model design.
- Member relationships + writing voice.
- Brand-position discipline.
- Strategic decision-making under uncertainty.

### Constraints

- Single operator; bandwidth is the limit.
- Bootstrap-funded; capital is the constraint.
- Saturday off; operating discipline is non-negotiable.
- Quarterly deep audits; structural reflection happens.

### Communication preferences

- Direct, brief, substantive.
- Methodology > marketing language.
- Conversation > argument.
- Disagreement welcome; performance not welcome.

### What Garrett values from hires

- Discipline holding the brand position when the founder isn't watching.
- Surfacing problems early.
- Restraint over enthusiasm.
- Demonstrating the brand position by how the work is done.

---

## 12. What new hires should NOT do

1. **Don't promote individual picks publicly.** Galaxy's brand position rejects pick-tipster framing.

2. **Don't accept sportsbook affiliate partnerships of any kind.** Permanent posture.

3. **Don't promise specific outcomes to members.** We provide methodology + transparency, not certainty.

4. **Don't engage in adversarial Twitter exchanges.** Per `copy/galaxy-twitter-incident-response-protocol.md`, the 24-hour buffer holds.

5. **Don't make brand-position decisions without consulting Garrett.** Brand drift is the most expensive mistake.

6. **Don't represent Galaxy in industry-event contexts without Garrett's explicit approval.** Speaking engagements + partnerships require decision-log entries.

7. **Don't share Garrett's calendar, schedule, or personal context with members.** Member relationships are warm; founder-personal-detail is reserved.

8. **Don't use AI/LLM tools for prediction.** AI tools are allowed for content drafting (per `galaxy-ai-policy.md`); not for methodology.

9. **Don't publish Loss Room or Pass List content without methodological grounding.** Each entry requires factor citation + reasoning.

10. **Don't reactively respond to member complaints.** Per `copy/vault-member-support-playbook.md`, the 24-hour buffer applies to non-emergency communications.

---

## Onboarding for a new hire

If a community manager or contractor joins Galaxy, the onboarding sequence is:

**Week 1:**
- Read this document end-to-end.
- Read the Vault PRD + methodology page.
- Read the brand voice canonical.
- Shadow Garrett's daily ops for one week.
- Read 4 weeks of digests + 4 weeks of Pass List entries + 4 weeks of Loss Room entries.

**Week 2:**
- Read all member support scenarios in `copy/vault-member-support-playbook.md`.
- Practice responding to mock support tickets; Garrett reviews + provides feedback.
- Read the decision-rights matrix.
- Sit in on one office hours session.

**Week 3:**
- Take over Discord moderation (Rungs 1-2 only; Rungs 3-6 require Garrett approval until trust established).
- Take over Day-4 + Day-7 onboarding check-ins.
- Begin drafting (not sending) responses to support tickets; Garrett reviews + approves.

**Week 4:**
- Independent operation on Discord moderation Rungs 1-3.
- Independent operation on Day-4 + Day-7 onboarding.
- First check-in with Garrett on what's working + what isn't.

**Week 5-12:**
- Full operational responsibility within defined scope.
- Weekly 1:1 with Garrett.
- Monthly review of decisions made + brand-position fit.

---

## Living document

This knowledge base updates:
- At Year-1 close (December 2026).
- Quarterly thereafter (March, June, September, December).
- When a major decision changes operational details.

The new-hire onboarding sequence above is run against the current version.

---

## Cross-references

The full documentation set is in `docs/monetization-v3/`. Key cross-references:

- Operating system README: `README.md`
- Active-track economics: `02-active-tracks.md`
- Cash flow and capital model: `05-cashflow-capital.md`
- Vault PRD: `product/vault-prd.md`
- Brand voice canonical: `galaxy-brand-voice-canonical.md`
- Operating values: `galaxy-operating-values.md`
- Decision rights matrix: `galaxy-decision-rights-matrix.md`
- Daily operations checklist: `galaxy-daily-operations-checklist.md`
- KPI operator ritual: `audit/kpi-operator-ritual.md`
- AI policy (internal use of Claude): `galaxy-ai-policy.md`
- Crisis communications: `galaxy-crisis-communications-playbook.md`
- Founder resilience: `founder-resilience-playbook.md`

---

*The Year-1 knowledge base is the single document that brings a new operator up to speed on Galaxy. The product is documented; the brand position is documented; the discipline is documented. The hire's job is to honor it.*
