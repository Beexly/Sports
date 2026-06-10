# GSE App Voice Opportunity Audit

## Duplicate Context

The repo already contains media/audio governance and brand voice policy. Voice OS must extend, not replace:

- docs/media/audio-voice-policy.md
- docs/audit/media-automation-risk-policy.md
- docs/media/video-brief-pipeline.md
- packages/brand/src/voice.ts
- public-copy and brand-voice tests

## Surface Audit

| Surface | Route | Voice Feature | Tier | Hidden Data Boundary | Audio Fit |
| --- | --- | --- | --- | --- | --- |
| homepage | / | 10-second spoken product primer | FREE | Low if transcript-first and disclosed. | Medium/High |
| GSE Rating | not verified as route | Explain This Voice Card | PRO | Must not reveal weights or formulas. | Medium/High |
| Player Lab | not verified as route | Player Risk Passport Audio | PRO/ELITE | Blocked until roster source truth exists. | Medium/High |
| player pages | not present | Narrated player summary | Future | Requires current roster/entity graph. | Medium/High |
| team pages | not present | Narrated team trend brief | Future | Requires source freshness guard. | Medium/High |
| Daily Brief | /brief | GSE Audio Brief | FREE/PRO | Must be generated from approved text only. | Medium/High |
| blog/journal | /blog and /journal | Article-to-audio narration | FREE/PRO | Must preserve citations and disclaimers. | Medium/High |
| pricing | /pricing | 30-second plan explainer | FREE | No pressure selling. | Medium/High |
| promotions | /promotions | Disclosure narration placeholder | Future | Legal/founder approval required. | Medium/High |
| FAQ | /faq | Support audio snippets | FREE | Avoid storing customer audio. | Medium/High |
| contact | /contact | Confused-user support walkthrough | FREE | Transcript/source only. | Medium/High |
| performance | /performance | Weekly autopsy audio | ELITE | No premature performance claims. | Medium/High |
| methodology | /methodology | Methodology safe explainer | FREE | High method leakage risk. | Medium/High |
| picks | /picks | No-bet and risk narration | PRO | No betting urgency or stake language. | Medium/High |
| board | /board | What changed audio strip | PRO/ELITE | Must say degraded/stale when data is unavailable. | Medium/High |
| support/help | FAQ/contact/current docs | Galaxy Studios Help Overlay | FREE | AI disclosure and transcript parity. | Medium/High |
| cockpit/founder | /cockpit/* | Founder Voice Brief | Founder-only | Never expose public audio. | Medium/High |
| error/empty states | global | Short calm guidance clip | FREE | No paid API call on errors. | Medium/High |
| mobile views | public routes | Listen instead of read affordance | FREE/PRO | Accessibility controls required. | Medium/High |

## App-Fit Findings

- Best immediate surfaces: /brief, /faq, /methodology, /pricing, /board, and founder-only /cockpit.
- Highest customer value: help overlays, Daily Brief audio, no-bet education, transcript-first explain cards.
- Highest risk: methodology audio, promotions narration, Player Lab audio without roster source truth.
- Voice should never replace visible text. Every audio concept starts from a source transcript and can fail back to text-only.
