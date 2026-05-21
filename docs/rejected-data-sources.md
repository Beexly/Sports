# Rejected Data Sources — Supply Chain Audit Log

This document records open-source repositories that were evaluated
for inclusion in Galaxy Sports Edge and **rejected**. Future
maintainers should consult this list before re-evaluating the same
sources.

Rejection is a security and legal decision, not just a quality one.
The platform is days from a paid launch with live Stripe keys and a
custom domain — pulling in a malicious or legally-encumbered
dependency would create exposure we cannot afford.

## Verdict legend

| Verdict | Meaning |
| --- | --- |
| `🚫 LEGAL` | Distributing or running this code creates copyright / ToS / fraud exposure. |
| `🚫 SECURITY` | Code is structurally suspicious (obfuscated, randomised filenames, sketchy install vector). |
| `🚫 QUALITY` | Not malicious, but functionally empty or off-stack. |
| `↪️ FUTURE` | Legitimate but not appropriate for this stack/phase. |

---

## 1. `Upcoming-and-Live-Sports-Data` (Monirul Islam)

**Verdict: 🚫 LEGAL — DO NOT TOUCH.**

Sports_data.json contains DRM decryption keys and stream URLs for
paid live-TV services (Amazon Prime Video, Sky Sports, Star Sports,
JioHotstar, Willow, PTV Sports). The README explicitly says the code
is "encrypted to prevent running", admits the content is
geo-restricted to Bangladesh, and asks users to credit the author
"or I will take it down" — the author understands this is
unauthorised redistribution.

Risks if integrated:
- DMCA takedown of `galaxysportsedge.com`.
- Termination by Stripe, Cloudflare, Vercel, every IaaS provider.
- Personal copyright liability for the operator.

Never link to, reference, or use any data derived from this repo.

## 2. `Stake-All-Games-Predictor-Latest` (anonymous)

**Verdict: 🚫 SECURITY — DO NOT INSTALL.**

The repository contains exactly two PHP files in `main/` with
randomised obfuscated filenames (`AWoykKsvWR.php`, `ySGkteajSr.php`).
Both files implement trivial array-statistics helpers (mean,
median, mode) — *no actual sports-prediction code*. The randomised
filenames + content-free implementation + "Latest" version suffix +
no LICENSE / README is the signature of SEO-spam scaffolding,
typo-squat bait, or a staging point for a later web-shell upload.

Even if the current code is benign, the repo could be replaced
upstream with a malicious version at any time. A user who runs
`git clone … && bash install.sh` (the exact command attempted at
the start of this session) gives the upstream maintainer full code
execution on the host.

## 3. `Public-FotMob-API` (Samoxfordgray966)

**Verdict: 🚫 SECURITY (probable) + 🚫 LEGAL (certain).**

The README pushes a `.zip` download from a `raw.githubusercontent.com`
URL labelled as a "releases page", complete with "if Windows shows
a security prompt, choose Run Anyway if you trust the file source"
— classic instructions for tricking users into executing an unsigned
Windows binary from an unknown publisher. The actual `fotmob_service/`
Django wrapper exists but proxies FotMob's private endpoints, which
violates FotMob's terms of service and would expose Galaxy Sports
Edge to a cease-and-desist and a Cloudflare block.

Use `the-odds-api.com` (already integrated) or `api-sports.io` for
soccer coverage. See `data-source-options.md` for legitimate
alternatives.

## 4. `claude-seo` (AgriciDaniel)

**Verdict: ↪️ FUTURE — useful tool, but install vector was risky.**

The repo itself is a legitimate Claude Code skill for SEO audits.
However, the suggested installation method —
`git clone --depth 1 … && bash install.sh` — gives the upstream
maintainer code execution on the host. The user already has
equivalent functionality via the Marketing and SEO-audit skills
shipped with their Claude Cowork plugins.

If we ever do want this, install only via Claude Code's
`/plugin marketplace add AgriciDaniel/claude-seo` mechanism (which
sandboxes the install), never via the raw bash one-liner.

## 5. `Flat-UI-master` (Designmodo, 2014)

**Verdict: 🚫 QUALITY — wrong stack, wrong era.**

Bootstrap 2.3-based "flat" UI kit from 2014. Galaxy Sports Edge
uses Tailwind on Next.js 14 — pulling in Bootstrap classes alongside
Tailwind would double the CSS surface and produce visual conflicts.
The aesthetic also doesn't match our cosmic/luxury-OS direction
(see `sports-design-philosophy.md`).

## 6. `design-blocks-dev` (Froala)

**Verdict: 🚫 QUALITY — wrong CSS framework.**

170 Bootstrap-4-based design blocks. Same problem as Flat-UI —
Bootstrap conflicts with our Tailwind setup. Block design ideas can
be referenced visually but no code/markup should be ported.

## 7. `unravelsports` (UnravelSports)

**Verdict: ↪️ FUTURE — wrong stack for now.**

Legitimate, well-maintained Python library for sports analytics
based on Graph Neural Networks (Bekkers & Sahasrabudhe 2023). The
math is sound and the package is MPL-2.0 licensed. But:

1. We are a Node/TypeScript project — no Python ML runtime exists
   in production.
2. The package operates on tracking data (player x/y positions)
   that we do not ingest.
3. Adding a Python service for one model creates a deployment
   footprint we don't have.

Re-evaluate in 6+ months if/when we add player-level data ingestion
and a Python sidecar.

## 8. `sample-data-master` (Metrica Sports)

**Verdict: ↪️ FUTURE — legitimate but off-purpose.**

Anonymised football tracking + event data from Metrica Sports.
Excellent reference for tracking-data workflows but we don't do
tracking-based prediction — our edge is bookmaker-line analysis.
Bookmark for the future if we ever build a "tactical insights"
content vertical.

## 9. `cc-switch` (farion1231)

**Verdict: ↪️ NOT RELEVANT — developer tool, not a project dependency.**

Tauri-based desktop app for switching between Claude Code, Codex,
Gemini CLI, OpenCode configurations. Could be useful to the operator
personally but has zero business in the production code.

## 10. `Front-End-Checklist` (David Dias)

**Verdict: ✅ MINED for content — not a code dependency.**

High-quality production-launch checklist. The content has been
distilled into `docs/launch-qa-checklist.md`, tailored to
Galaxy Sports Edge's specific surfaces, brand-safety invariants,
and Stripe paywall architecture. No code was imported.

## 11. `DataScienceProjects` (Tuan Nguyen-Doan)

**Verdict: ✅ MINED for math — not a code dependency.**

Personal repo accompanying Towards Data Science articles. The
Poisson-process football-prediction model is a published,
peer-reviewed approach (Maher 1982; Dixon & Coles 1997). The math
has been reimplemented in TypeScript at
`packages/prediction-engine/src/poisson.ts` with full test
coverage. The original repository is not a runtime dependency.

---

## Approved data sources

For the catalogue of approved live and historical sports data
providers (rate limits, costs, license terms), see
`docs/data-source-options.md`.
