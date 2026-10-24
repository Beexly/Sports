# GSN OSINT And Source Quality Framework

Date: 2026-06-10
Scope: Lawful public-source research for sports intelligence

## Purpose

GSN can use public information to understand sports news, injuries, markets, source quality, and timing. It must not use OSINT as a shortcut into privacy invasion, deception, account abuse, credential abuse, paywall bypassing, or unlicensed data collection.

## Lawful OSINT Rules

Allowed:

- Public official league/team/player announcements.
- Public reporter posts and articles.
- Public market pages where access is lawful and terms permit use.
- Public archive snapshots where lawful and not used to bypass access controls.
- Owned-domain security checks.
- Brand/source impersonation monitoring.

Restricted:

- Reverse email or username research, only when needed for brand protection, inbound tip verification, or fraud prevention with a valid basis.
- Breach monitoring, only for owned assets or explicit consent.
- Public social monitoring, only for claims relevant to sports intelligence and with privacy minimization.

Excluded:

- Paywall bypass tools.
- Shadow libraries and pirated research sources.
- Temporary SMS services for account creation or platform evasion.
- Fake identity, fake chat, fake profile, or fake proof generation.
- Credential dumps or stolen data.
- Private scraping or access-control bypass.

## Public Source Discovery

Primary source classes:

1. Official league source
2. Official team source
3. Official player/agent/source statement
4. Injury report provider or licensed data partner
5. Sportsbook/market data partner
6. Credentialed reporter
7. Beat reporter
8. Local media
9. Aggregator
10. Public social account
11. Archive snapshot
12. Internal analyst note
13. Model output

Discovery workflow:

1. Start with official and licensed sources.
2. Add reporter/local sources.
3. Check timestamp and wording.
4. Identify whether a report is original or copied from another source.
5. Capture URL, timestamp, and archive/screenshot where lawful.
6. Assign source class.
7. Mark claim status: confirmed, developing, conflicting, stale, rumor, or rejected.

## Account And Source Reputation Scoring

Internal score dimensions, each 0-5:

- Provenance: Is the source directly connected to the event?
- Freshness: How recent is the claim?
- Specificity: Does it contain concrete, falsifiable details?
- Track record: Has the source corrected or retracted often?
- Independence: Is it original or recycled?
- Incentive risk: Does the source benefit from hype, engagement, or market movement?
- Evidence quality: Does it include official document, quote, video, timestamp, or firsthand observation?
- Terms/licensing: Is GSN allowed to use this source in the intended way?

Public labels should be conservative:

- Official
- Confirmed
- Developing
- Conflicting
- Stale
- Rumor
- Quarantined
- Rejected

Avoid public labels like "liar," "bad source," or unsupported credibility accusations.

## Injury And News Freshness

Freshness bands:

- Live: current within configured window for sport/market.
- Fresh: still usable but monitor for updates.
- Aging: approaching expiration.
- Stale: cannot support publication without update.
- Expired: must be unpublished or re-reviewed.

Default freshness rules:

- Breaking injury/news: short half-life.
- Official final injury report: longer half-life until new update.
- Line movement: decays quickly near game time.
- Historical trend: longer half-life but must show date range.
- Social rumor: quarantined until confirmed.

Required fields:

- `observed_at`
- `captured_at`
- `fresh_until`
- `source_timezone`
- `reviewed_at`

## Rumor Handling

Rumor definition:

A claim with insufficient source quality, unclear origin, social-only propagation, anonymous attribution, or material conflict with official/stronger sources.

Rumor workflow:

1. Ingest as analyst-only evidence.
2. Mark `quarantined`.
3. Link to source and timestamp.
4. Do not publish.
5. Seek official or stronger corroboration.
6. Promote only after review.
7. Reject and retain audit note if false or unsupported.

Public surfaces must not show rumor content unless the product explicitly labels it as unverified educational context and the reviewer approves that use.

## Conflicting Reports

Conflict types:

- Direct contradiction: source A says active, source B says out.
- Timing mismatch: older source conflicts with newer source.
- Scope mismatch: "limited practice" vs "full participant."
- Market mismatch: line moves before public news.
- Source-chain mismatch: multiple aggregators repeating one original post.

Conflict workflow:

1. Identify strongest source class.
2. Sort by timestamp.
3. Determine whether conflict changes recommendation state.
4. If material and unresolved, downgrade to Wait or No Bet.
5. Show conflict in receipt.
6. Require reviewer note before publication.

## Social Signal Risk

Social data is noisy and often incentive-distorted. Treat it as context, not proof.

Risks:

- Fake screenshots
- Engagement bait
- Impersonation
- Old clips reposted as current
- Fan speculation
- Market manipulation
- Privacy invasion
- Misattributed injuries or quotes

Controls:

- Verify account identity.
- Verify timestamp.
- Check original source.
- Avoid personal data enrichment.
- Quarantine social-only claims.
- Never publish private or sensitive personal information.

## Screenshot And Archive Policy

Evidence capture rules:

- Store original URL.
- Store capture timestamp.
- Store screenshot hash.
- Store archive URL where lawful.
- Preserve original file.
- Annotate only copies.

Do not:

- Remove text, watermarks, or context from evidence screenshots.
- Retouch or inpaint evidence images.
- Crop in a misleading way.
- Use archive services to bypass paywalls or access controls.
- Present screenshots as proof if origin is unknown.

## Citation Policy

Every published claim should be traceable to an evidence item.

Citation fields:

- Source name
- Source URL or restricted-source label
- Source class
- Observed timestamp
- Captured timestamp
- Freshness state
- Archive URL if available
- Reviewer status

Public citation examples:

- "Official injury report, captured 2026-06-10 14:10 CT, fresh."
- "Beat reporter post, captured 2026-06-10 15:45 CT, developing."
- "Market data partner, licensed feed, line movement observed 2026-06-10 16:05 CT."

## Source Confidence Rubric

| Score | Meaning | Public Handling |
|---:|---|---|
| 5 | Official or licensed source, fresh, specific, no conflict | Publishable with receipt |
| 4 | Strong reporter/local source, fresh, specific, low conflict | Publishable with context |
| 3 | Useful but incomplete or aging | Watch/Wait unless corroborated |
| 2 | Weak, indirect, social-heavy, or conflicting | Quarantine or analyst-only |
| 1 | Unverified rumor, anonymous, unclear origin | Quarantine |
| 0 | Prohibited, illegal, deceptive, or unlicensed source | Exclude |

## What Never Gets Published Automatically

- Rumors
- Injury claims without adequate source quality
- Private personal data
- Credential/leak data
- Paywall-bypassed content
- Pirated research material
- Temporary SMS/account-abuse-derived information
- Fake chats, fake screenshots, fake profiles, or generated proof
- Third-party voice clones
- Claims that imply guaranteed betting outcomes
- Signals with unresolved material conflict
- Signals whose freshness expired
- Model outputs without source receipts and human review

## Source Intake Checklist

For each candidate claim:

1. What is the exact claim?
2. Who made it?
3. Is the source official, licensed, reporter, public social, market, model, or internal?
4. When was it observed?
5. When was it captured?
6. Is it original or recycled?
7. Is it lawful to use?
8. Is it fresh?
9. Does it conflict with stronger sources?
10. Is it publishable, wait, no bet, or quarantine?

## Approved Lessons From Risk-Sensitive Tools

| Tool Type | Lawful Lesson For GSN | Operational Decision |
|---|---|---|
| Fake proof generators | Fake screenshots and chats are easy to make; preserve provenance. | Risk-awareness only |
| Temporary SMS services | Account verification can be abused; require trusted account ownership. | Excluded |
| Breach checkers | Owned-domain exposure monitoring is useful. | Owned/consented only |
| Reverse email/username OSINT | Brand/source impersonation checks can protect users. | Restricted |
| Paywall bypass | Source access must be licensed/legal. | Excluded |
| Shadow libraries | Research ingestion must respect copyright. | Excluded |
| Image retouching | Evidence images must not be altered. | Marketing-only |

## Implementation Recommendations

1. Add a source registry before adding more automated feeds.
2. Make confidence decay visible in the UI.
3. Build rumor quarantine before any social monitoring.
4. Require source receipts before public recommendations.
5. Use "No Bet" automatically when freshness or conflict fails.
6. Keep evidence images immutable.
7. Separate public copy from internal analyst notes.
8. Treat model output as a source class, not as truth.
