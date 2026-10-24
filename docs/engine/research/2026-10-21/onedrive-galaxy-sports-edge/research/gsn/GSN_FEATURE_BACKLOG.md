# GSN Feature Backlog

Date: 2026-06-10
Scope: GSN / Galaxy Sports Edge sports intelligence only

## Trust Layer

### Feature Name

Trust Receipts

### User Problem

Users cannot tell whether a recommendation is based on current, high-quality sports intelligence or stale/fabricated confidence.

### Product Behavior

Every recommendation, No-Bet card, podcast segment, and market recap includes a compact receipt showing sources, freshness, uncertainty drivers, conflict state, model disagreement, and human review status.

### Data Needed

Source records, evidence records, timestamps, archive URL, reviewer ID, recommendation state, confidence band, model outputs, conflict flags.

### UI Surface

Receipt drawer on game cards, market pages, admin review queue, newsletter footnotes, podcast episode packet.

### Risk/Compliance Concern

Do not expose proprietary model weights, private source data, unlicensed feeds, or personal information. Receipts must show enough provenance to build trust without leaking restricted data.

### Build Complexity

Medium

### Suggested Implementation Steps

1. Define `Source`, `EvidenceItem`, `Signal`, and `ReviewEvent` types.
2. Add receipt builder utility from approved signal records.
3. Render receipt drawer with source chips and freshness badges.
4. Add tests that block receipt rendering when required fields are missing.

### Acceptance Criteria

- No published signal can render without a receipt.
- Receipt shows source class, freshness, uncertainty, conflict state, and reviewer status.
- Missing source or stale data blocks publication.

## Source Intelligence

### Feature Name

Source Quality Meter

### User Problem

Users need to understand why one report matters more than another when injury news, beat reports, market movement, and public social chatter conflict.

### Product Behavior

Each source receives a visible quality band and internal numeric score based on provenance, freshness, specificity, independence, historical correction rate, and incentive risk.

### Data Needed

Source class, publisher/account metadata, claim history, correction history, observed timestamps, link/archive status, reviewer notes.

### UI Surface

Source drawer, admin source registry, source chips on market radar cards.

### Risk/Compliance Concern

Do not defame individuals or imply unsupported credibility claims. Use internal bands for sensitive scoring and public labels that explain source class and freshness rather than personal judgments.

### Build Complexity

Medium

### Suggested Implementation Steps

1. Create source-quality rubric.
2. Add internal scoring function.
3. Add reviewer override with audit trail.
4. Render public-facing labels: official, confirmed, developing, rumor, stale, conflicting.

### Acceptance Criteria

- Every evidence item links to a source-quality state.
- Public UI avoids unsupported personal credibility accusations.
- Reviewer overrides are logged.

## Sports Market UX

### Feature Name

Market Radar

### User Problem

Sports users need to quickly see what changed in a game or market without reading a wall of raw data.

### Product Behavior

Game cards summarize line movement, injury/news volatility, sharp/public divergence, model disagreement, confidence decay, and recommended action.

### Data Needed

Game schedule, market lines, movement timestamps, injury/news events, public/sharp indicators if licensed, model outputs, source-quality summary.

### UI Surface

Home dashboard, game page, admin cockpit, mobile watchlist.

### Risk/Compliance Concern

Do not imply betting certainty or use unlicensed odds/market data. If a data partner is not available, use clearly labeled demo or delayed data.

### Build Complexity

High

### Suggested Implementation Steps

1. Build UI with demo data clearly labeled.
2. Add line movement and event timeline components.
3. Add recommended action states: Bet, Watch, Wait, No Bet.
4. Connect only after licensed data source is confirmed.

### Acceptance Criteria

- Demo state cannot be mistaken for live recommendation data.
- Every recommendation state includes uncertainty and freshness.
- No Bet is rendered with equal visual seriousness.

## Data Freshness

### Feature Name

Confidence Decay Clock

### User Problem

A sports signal can become weaker as news, line movement, injury status, or market timing changes.

### Product Behavior

Each signal has a visible freshness and decay state. As time passes or volatility increases, confidence can decay, recommendation state can downgrade, and stale signals can be pulled from publication.

### Data Needed

Generated timestamp, source timestamps, fresh-until value, volatility drivers, event type, market movement, reviewer lock state.

### UI Surface

Signal cards, source receipts, admin stale-signal queue, podcast packet status.

### Risk/Compliance Concern

Freshness rules must be conservative. Expired confidence cannot remain published as current advice.

### Build Complexity

Medium

### Suggested Implementation Steps

1. Define freshness half-life by signal type.
2. Add decay utility.
3. Add scheduled stale-signal check.
4. Add UI badges: fresh, aging, stale, locked, expired.

### Acceptance Criteria

- Stale signal cannot publish.
- Existing published stale signal is flagged or unpublished.
- Decay reason is visible in receipt.

## User Education

### Feature Name

No-Bet Intelligence Academy

### User Problem

Users often interpret "No Bet" as lack of value rather than disciplined intelligence.

### Product Behavior

The app teaches No-Bet reasons with examples, post-game autopsies, and side-by-side comparisons of action vs pass decisions.

### Data Needed

No-Bet reason taxonomy, historical examples, signal inputs, final results, reviewer notes, responsible-gaming copy.

### UI Surface

No-Bet card, education hub, newsletter module, podcast segment, post-game autopsy.

### Risk/Compliance Concern

Avoid shaming users or encouraging chase behavior. Education should reinforce bankroll discipline, uncertainty, and non-action.

### Build Complexity

Medium

### Suggested Implementation Steps

1. Define No-Bet reason taxonomy.
2. Add No-Bet card component.
3. Create educational copy templates.
4. Add post-game examples only after source-reviewed data exists.

### Acceptance Criteria

- No-Bet card always includes reason and uncertainty driver.
- No-Bet can be selected and displayed as the primary recommendation.
- Copy avoids irresponsible gambling framing.

## Podcast/Content Engine

### Feature Name

Weekly Intelligence Episode Packet

### User Problem

Podcast and newsletter output can drift into unsupported claims if generated directly from loose notes or live chatter.

### Product Behavior

Each episode starts from a locked packet containing approved segments, source receipts, transcript draft, disclosure language, clip plan, and human approval state.

### Data Needed

Approved signals, episode metadata, script sections, source receipts, reviewer approvals, generated audio file hashes, disclosure text.

### UI Surface

Admin podcast builder, episode archive, newsletter composer, clip queue.

### Risk/Compliance Concern

AI-generated voice requires explicit consent, disclosure, secure voice asset storage, and transcript approval before generation.

### Build Complexity

High

### Suggested Implementation Steps

1. Create episode packet schema.
2. Add script generation from approved signals only.
3. Add compliance checklist and owner approval gate.
4. Add voice-generation placeholder workflow without cloning until consent controls exist.

### Acceptance Criteria

- Audio cannot generate without approved transcript.
- Episode packet contains source receipts and disclosure language.
- AI-generated voice is labeled in metadata and episode notes.

## Admin Cockpit

### Feature Name

Human Review Queue

### User Problem

Operators need a single place to decide what can publish, what is stale, and what must be quarantined.

### Product Behavior

The queue groups signals by required action: approve, reject, update, quarantine, expire, or escalate.

### Data Needed

Signal records, evidence records, conflict flags, freshness state, reviewer assignments, audit trail.

### UI Surface

Admin cockpit, signal detail panel, reviewer activity log.

### Risk/Compliance Concern

No auto-publication. Reviewer decisions must be logged and reversible with audit history.

### Build Complexity

High

### Suggested Implementation Steps

1. Define review states.
2. Build queue UI.
3. Add publish gate.
4. Add audit log and reviewer comments.

### Acceptance Criteria

- Unreviewed signals cannot publish.
- Reviewer action, time, and reason are stored.
- Quarantined signals are excluded from public surfaces.

## Automation

### Feature Name

Rumor Quarantine Engine

### User Problem

Social chatter and unverified reports can be useful analyst context but dangerous as published intelligence.

### Product Behavior

Unverified public social or low-quality signals enter quarantine automatically. Analysts can inspect, attach stronger sources, or reject.

### Data Needed

Source class, claim type, confidence threshold, source-quality state, conflict status, reviewer decision.

### UI Surface

Admin quarantine queue, source receipt drawer, game timeline with private analyst-only labels.

### Risk/Compliance Concern

Do not publish rumors, private data, personal allegations, or unverified injury claims. Avoid privacy-invasive OSINT.

### Build Complexity

Medium

### Suggested Implementation Steps

1. Define quarantine rules by source class and claim type.
2. Add automation job to classify incoming evidence.
3. Build quarantine review actions.
4. Add tests that blocked sources never reach public publish state.

### Acceptance Criteria

- Rumor source cannot publish without approved corroboration.
- Quarantine state is visible to operators.
- Rejected rumors remain auditable but hidden from users.

## Visual Design

### Feature Name

GSN Command-Center Design System

### User Problem

Sports intelligence must feel premium and fast while still making uncertainty legible.

### Product Behavior

A design system defines confidence colors, source chips, freshness badges, volatility meters, compact cards, data-dense timelines, motion rules, and accessibility constraints.

### Data Needed

Design tokens, component specs, UI state catalog, accessibility standards, copy rules.

### UI Surface

All product surfaces, admin cockpit, newsletter visuals, podcast clips.

### Risk/Compliance Concern

Avoid visual language that implies certainty, urgency, or guaranteed profit. Do not hide uncertainty behind cinematic styling.

### Build Complexity

Medium

### Suggested Implementation Steps

1. Draft `DESIGN.md`.
2. Define tokens and states.
3. Build component examples.
4. Add visual QA checklist.

### Acceptance Criteria

- All signal cards have stable states for fresh/stale/conflict/no-bet.
- Color is not the only indicator of risk.
- UI copy avoids hype and fake certainty.

## Responsible Gaming

### Feature Name

Decision Discipline Layer

### User Problem

Sports intelligence can unintentionally encourage over-action, chasing losses, or false confidence.

### Product Behavior

The product adds friction and education around high-risk states: losing streaks, excessive activity, low-confidence edges, stale data, and emotional-chase language.

### Data Needed

User decision journal entries, recommendation confidence, No-Bet reasons, activity thresholds, responsible-gaming copy.

### UI Surface

Recommendation cards, decision journal, account settings, education hub, checkout/subscription areas if relevant.

### Risk/Compliance Concern

The system must not provide gambling treatment advice, but should promote safety, restraint, and links to appropriate support resources where needed.

### Build Complexity

High

### Suggested Implementation Steps

1. Define risky interaction states.
2. Add No-Bet and Wait friction copy.
3. Build decision journal.
4. Add compliance review for all monetization-adjacent language.

### Acceptance Criteria

- High-risk states show friction, not hype.
- Users can record pass decisions.
- Responsible-gaming copy is present wherever recommendations appear.
