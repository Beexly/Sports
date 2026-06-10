# GARRETT_ACTIONS.md — the ONLY things requiring a human

Each ~15 minutes. Everything is built up to the human step.

| ID | Action | Why | Duration | Blocks |
|---|---|---|---|---|
| GA-01 | ~~Provision the production Postgres~~ **ALREADY DONE (discovered 2026-06-10):** the live site's own health check confirms `database: OK` — a Neon DB has been connected since ~May 21. The outage was never the DB. | — | ✅ CLOSED |
| GA-01b | **Delete the duplicate `sports-db` Neon resource** (created during today's provisioning attempt before we discovered the live DB; it is unconnected + free-tier). Vercel dashboard → Integrations → Neon → resources → sports-db → delete. | Housekeeping only — costs nothing while it sits | ~1 min | Nothing |
| GA-02 | **Odds key** — paid 20K key pasted into Vercel ✅. **One eye-check remains:** Settings → Env Vars → 👁 on `THE_ODDS_API_KEY` → value should start `171ae` (the 20K plan), not `90a84` (the exhausted free one). | The live health check shows ingestion dead since June 5 = the exhausted free key; root cause confirmed | ~10 sec | Shadow season |
| GA-03 | **Stripe account verification** (business verification in the Stripe dashboard; stays in TEST mode) | Required before any live billing ever; test-mode lifecycle can be exercised without it but verification has lead time. | ~15–30 min | Eventual revenue (not launch) |
| GA-04 | **Pricing sign-off** (one number pair: deploy says $19/$49, canonical says $14.99/$24.99 + annual) | Two incompatible pricing systems exist; whichever deploys decides what customers are charged. No Stripe price objects are created until this is signed. | ~5 min | Monetization wiring |
| GA-05 | **Legal review of ToS/Privacy + responsible-gaming copy** (incl. the helpline number: trust-claims pins 1-800-522-4700, five other surfaces use 1-800-GAMBLER) | Regulated copy needs a human/legal eye; both numbers are real lines, the product should present one consistently. | ~30 min | Public-claims polish (not the build) |
| GA-06 | **Domain/DNS confirmation** (galaxysportsedge.com already live/aliased on Vercel — confirm it points at THIS project when we deploy) | Prod is alias-based; a wrong alias ships the wrong tree. | ~10 min | Launch |
| GA-07 | **Payment-processor policy review** (Stripe's prohibited/restricted list re: prediction/picks products — read once, confirm GSE's no-real-money-gambling posture fits) | De-risks a ban after revenue starts. | ~20 min | Revenue confidence |
| GA-08 | **Launch go/no-go signature** | The only step after zero-BLOCKERs + calibration pass + Breathtaking Audit. | ~1 min | Launch |
| GA-09 | **Confirm Vercel plan tier** (Pro = sub-daily crons OK → Option A stands; Hobby → say "B" and I wire the worker host instead) | Settlement + 30-min odds cadence need sub-daily crons; full proposal: `docs/command-center/launch/settlement-host-and-cadence-proposal.md` | ~5 min | Settlement in prod, readiness green, calibration sample |
| GA-10 | **(2 min) X handle decision** — @GalaxySportsAI contains "AI"; contradicts the no-AI-foregrounding brand stance (BV-04) | Site metadata updates in 5 min once decided | ~2 min | Brand consistency (not launch) |
| GA-11 | **Record your podcast reference voice** — 3–15s clean mono WAV, natural continuous speech, + its exact transcript (save as e.g. `~/voice-ref.wav` + set `PODCAST_VOICE_REF`/`PODCAST_VOICE_REF_TEXT`) | The voice-clone key; the render pipeline physically cannot run without it | ~10 min | Weekly podcast |
| GA-12 | **Name the show + pick the weekly day** | Feed + page copy fill in | ~5 min | Podcast publish |
| GA-13 | **Platform policy pass** — Spotify/Apple synthetic-content metadata rules for own-voice clones (one-time read) | Clean distribution from episode 1 | ~20 min | Podcast distribution |
| GA-14 | **Install NeuTTS Air locally** (`pip install neutts`; Apache-2.0, runs on CPU, voice never leaves your machine) | Doctrine: no autonomous installs on this box | ~15 min | Podcast render |

**QUESTIONS (defaults already in effect — silence = consent)**
- Q-01: "GSN (Galaxy Sports Network)" vs the repo's "Galaxy Sports Edge" — *proceeding with the existing GSE brand everywhere because all constants/domain/JSON-LD say GSE; override if GSN is a deliberate rebrand.*
- Q-02: Scoped checkpoint commits of the verified-green tree are proceeding on `safety/sports-wip-2026-06-04` — *override if you want a different branch strategy.*
