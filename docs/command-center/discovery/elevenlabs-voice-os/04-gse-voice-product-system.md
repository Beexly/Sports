# GSE Voice Product System

| Concept | Description | Surface | Repo Dependency | Tier | Phase | Primary Risk | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GSE Audio Brief | Narrated Daily Brief users can listen to in under two minutes. | /brief | elevenlabs-js, captions.events | PRO | Post-P0 prototype | Cost/script safety | Transcript, disclosure, stale-data guard, approval status, no method leakage. |
| Explain This Voice Card | 20-45 second spoken explanation of one rating, no-bet flag, market movement, or player risk card. | /board, /picks, future Player Lab | ui, elevenlabs-js | PRO | Prototype only | Cost/script safety | Transcript, disclosure, stale-data guard, approval status, no method leakage. |
| Galaxy Studios Help Overlay | Short transcript-first narrated help clips embedded across dense surfaces. | /faq, /board, /pricing | ui, examples | FREE | Use static prototype now | Cost/script safety | Transcript, disclosure, stale-data guard, approval status, no method leakage. |
| No-Bet Coach | Calm audio explaining why silence/no-bet is valuable. | /picks, /board | elevenlabs-js, audio policy | FREE/PRO | Post-launch | Cost/script safety | Transcript, disclosure, stale-data guard, approval status, no method leakage. |
| Player Risk Passport Audio | Narrated player role, availability, volatility, usage, and source freshness. | future Player Lab | elevenlabs-js | PRO/ELITE | Blocked on roster source truth | Roster freshness | Transcript, disclosure, stale-data guard, approval status, no method leakage. |
| Weekly Autopsy Audio | Narrated recap of what the model got right, wrong, and what changed. | /performance, /journal | elevenlabs-js, captions.events | ELITE | Post-launch | Cost/script safety | Transcript, disclosure, stale-data guard, approval status, no method leakage. |
| Support Voice Replies | Support can attach short spoken walkthroughs generated from approved help text. | /contact, help center | elevenlabs-mcp, n8n | Internal/FREE | Internal prototype | Cost/script safety | Transcript, disclosure, stale-data guard, approval status, no method leakage. |
| Onboarding Voice Tour | Guided first-run walkthrough explaining GSE without jargon. | homepage/onboarding | ui, nextjs starter | FREE | Prototype after P0 | Cost/script safety | Transcript, disclosure, stale-data guard, approval status, no method leakage. |
| Accessibility Narration | Audio alternative for users with reading fatigue or accessibility needs. | global | ui, captions.events | FREE | Prototype | Cost/script safety | Transcript, disclosure, stale-data guard, approval status, no method leakage. |
| Founder Voice Brief | Internal spoken summary of launch blockers, data health, revenue, and build queue. | /cockpit | mcp, cli | Founder-only | Internal only | Cost/script safety | Transcript, disclosure, stale-data guard, approval status, no method leakage. |
| Sales Demo Narration | Voiceover scripts for partner/investor demos. | sales/demo content | examples, cli | Internal | Safe script-only now | Cost/script safety | Transcript, disclosure, stale-data guard, approval status, no method leakage. |
| Content-to-Shorts Pipeline | Turn approved articles/briefs into captioned short-form scripts and voiceover assets. | /journal, /cockpit/studio | examples, captions.events | Growth | Post-P0 | Cost/script safety | Transcript, disclosure, stale-data guard, approval status, no method leakage. |
| Promotion Disclosure Narration | Spoken disclosures and responsible-play language for partner offers. | /promotions | elevenlabs-js | Future | Legal-only | Legal/compliance | Transcript, disclosure, stale-data guard, approval status, no method leakage. |
| Multilingual Future Layer | Future translation/dubbing for broader markets. | global | SDKs/mobile | Future | Legal/support validation required | Cost/script safety | Transcript, disclosure, stale-data guard, approval status, no method leakage. |

## System Principle

Voice is a comprehension layer, not decoration. GSE audio should answer: what is this, why does it matter, what changed, how certain are we, and what should remain private.
