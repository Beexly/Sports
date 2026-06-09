# GSE Source Risk Register

| Source Family | Allowed Use | Disallowed Use | Mitigation | Risk |
| --- | --- | --- | --- | --- |
| NFL league media/pages | Links, manual review, licensed/approved feeds, minimal factual references | Scraping media/content, copying video/images/articles, implying official endorsement | Use licensed feeds, source URLs, terms snapshots, trademark-safe UI | High |
| ESPN/Disney products | Ordinary access, links, licensed partnerships | Automated extraction, commercial dataset building, AI/model use without permission | Deny-list direct extraction; use licensed providers | High |
| Licensed sports APIs | Use within contract scope, API keys, rate limits, display/cache rules | Sublicensing, exceeding tier, hiding downstream use | Contract metadata, usage metering, audit calendar | High |
| nflverse open data | Historical R&D, attribution, reproducible backtests | Calling it official, ignoring license/source rights | Pin releases and show attribution | Medium |
| NWS/NOAA weather | Forecasts, alerts, observations with caching | Hammering endpoints or treating forecasts as guaranteed | User-Agent, cache by expiry, freshness badges | Low |
| Odds/sportsbooks | Licensed odds provider only | Scraping sportsbooks, giving betting instructions, jurisdiction-blind paid betting | Contract gate, no-wager copy, compliance review | High |
| Social APIs | Official APIs within approved commercial use | Scraping, redistribution, training, resale, ignoring deletions | Store IDs/metadata, deletion plan, commercial agreement check | High |
| YouTube/video | Official API metadata, embeds where allowed | Downloading clips, copying transcripts, training on video/audio | Metadata only unless licensed | High |
| News/publishers | RSS/API/licensed summaries, short quotes, attribution | Full-text copying, paywall bypass, rumor-as-fact | Quote limiter, claim cards, credibility score | High |
| Injury/medical | Official statuses and availability impact | Diagnosis, private health inference, unsupported speculation | No-diagnosis filter, official-status precedence | High |
| Video-game ratings/assets | Original GSE public-data estimates | Copying EA/Madden ratings/assets/marks or affiliation language | Original schema, no logos, derivation docs | Medium |

## Approval Rule

Any source with High risk needs owner/legal approval before automation, paid product display, or external launch. R&D can still document blocked value, but blocked value cannot silently enter the model.
