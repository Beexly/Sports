# 30-Gap Audit (Non-Betting Edition) — Triage (2026-06-03)

This second audit is **much more on-brand** than the first (it drops the tout/affiliate framing).
Most of it bends toward context, transparency, and calibration — i.e. us. Triage below; shared
items reference `platform-gaps-triage.md`.

## ✅ ON-BRAND — built / building (pure, inert)
| Gap | Status |
|---|---|
| 28 / 9 Historical performance viz (accuracy by sport/type, **calibration curve**, vs-close, streaks, ROI) | **SHIPPED** `performance-analytics.ts` |
| 12 Comparative model display ("Galaxy 72% vs Vegas 51% vs public") | **SHIPPED core** `consensus.ts` + `consensus-view.ts` |
| 19 Public accountability / loss autopsy / model changelog | Build — expose internal LossAutopsy/CockpitDecision via `/accountability` (+ proof-of-record) |
| 29 Responsible-AI / model-limitations disclosure (confidence intervals, "when NOT to trust us") | Build — pure; the most on-brand item in the list (honest uncertainty) |
| 15 Advanced-stats education (glossary tooltips, "why this stat matters") | Build — content + a small glossary data module |
| 16 Team/player profile pages (form, splits, H2H, game logs) | Build — context pages over ingested data (ESPN/openfootball) |
| 3 Comparative analytics (league-avg, H2H, radar, peer rank, trend lines) | Build — pure stat-compare module + viz |
| 24 Dark mode · 20 PWA · 26 Audio/podcast (TTS) · 8/11 Personalization & profiles | Build (UI + content-gated for audio; no auto-publish) |
| 22/23 Fantasy/props + tournament/playoff modeling | Build — extend the engine (PropPick, bracket model); on-thesis, NOT wagering |
| 17 Coaching analytics · 18 Venue/HFA dashboard | Build — new model-input signals (quantify what we already gesture at) |

## 🔒 FOUNDER / LEGAL or BIG-EFFORT-GATED
- 1 Mobile app (Expo) · 4/27 Video layer + film breakdown (production-heavy) · 2/14 Live in-game (paid live feed + WebSocket infra) · 25 A/B tooling choice · 13 League/team official-data integrations (licensing) · 30 B2B/data-licensing/courses/white-label (sales motion).
- 5/6/7/21 Social / community / gamification / syndicate mode — **on-brand IF** built on honest, verifiable track records (our leaderboards rank by *real* calibration, not hype). Founder-gated on scope; the **contest-scoring** engine is already the skill-based core.

## 🛑 REJECT / GUARD
- 30 "Sponsorships / brands want to reach analysts" + any **affiliate/creator** path: only with clear disclosure, never urgency, never co-branded with the trust mark (per first triage).
- Any social feature that lets users **sell picks or cash out** → re-enters gambling/tout territory; keep contests virtual-currency only.
- "Show me only contrarian picks" etc. is fine; "are they chasing losses" behavioral profiling for monetization is not — use behavior ONLY to trigger responsible-play nudges (`responsible-gaming.ts`), never to upsell.

## The throughline
Both audits converge on the same truth: be a *platform*, not a feature. Our version of "platform" is
**context + transparency + calibration + responsible play** — every gap we adopt makes the model more
*legible and honest*, which is the moat. We decline anything whose payoff is more *action* rather than more *trust*.
Related: `platform-gaps-triage.md`, `repo-firehose-review.md`, `design-monetization-growth.md`.
