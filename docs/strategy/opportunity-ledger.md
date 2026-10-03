# Master Opportunity Ledger — All Areas (2026-06-03)

Exhaustive, cross-area sweep (4 parallel research passes + the design/motion list). The point: stop
being engine-deep and cover EVERY dimension. Verdict tags: **ADOPT** (do, on-brand) / **EXPERIMENT** /
**GATED** (founder/legal) / **SKIP**. Honesty doctrine + no-real-money + no-auto-publish still bind everything.

## A. Free data sources (make the engine smarter / product richer)
- **Weather:** NWS api.weather.gov (free, Tier-A, US-only) → venue weather signal. Open-Meteo (global, **commercial = paid**, gate). — ADOPT (NWS first).
- **News/sentiment (narrative layer):** **GDELT 2.0** (free, no key, tone every 15min) + Wikipedia Pageviews (attention proxy, Tier-A) + Reddit OAuth (internal only). — ADOPT GDELT + Wikipedia.
- **Geo/jurisdiction:** Nominatim/OSM (geocode, Tier-A, attribution) + ipapi.co/ipwho.is (coarse IP→region, **messaging only, never a compliance gate**). — ADOPT for RG messaging.
- **Schedule density:** Nager.Date (holidays) + TimeAPI (TZ normalization → rest/body-clock signal). — EXPERIMENT.
- **Sports breadth:** balldontlie (NBA/NFL/MLB free, rate-limited), TheSportsDB (logos/artwork for UI), NCAA API (TS-native). — ADOPT TheSportsDB for UI art; others Tier-B.
- **Markets:** Polymarket public read = 2nd CLV anchor (frame carefully). — EXPERIMENT (internal).
- **Anti-fraud:** AbstractAPI email-validation + ipqualityscore (VPN/fraud flag) for contest/RG integrity. — EXPERIMENT.
- ⚠️ **Commercial-use traps** (free ≠ free once we monetize): Open-Meteo, MySportsFeeds, GNews/NewsAPI, ip-api.com. Gate paid upgrade before monetizing.

## B. AI & dev tooling
- **ADOPT now:** `markitdown` (any doc/PDF/audio → clean Markdown for the content pipeline; run as Python sidecar) · `Scrapling` (self-healing Tier-B scraping — survives site redesigns) · **`swr`** (live-updating picks/odds UI) · **Sentry** (error/trace — "reliable = trustworthy") · `ollama` (cheap LOCAL drafting of non-final content, data stays private) · **PostHog** (analytics + flags + experiments + session replay — one tool).
- **EXPERIMENT (high upside):** **VoxCPM2** TTS (audio briefings/podcast — standout differentiator; only from human-approved text) · LangGraph (orchestrate ingest→estimate→grade→draft→**human-review gate**) · supermemory (per-user context, self-host) · Supabase (Realtime + pgvector) · GrowthBook (rigorous Bayesian/sequential experiment stats — fits the honest brand; pick ONE of PostHog/GrowthBook as source of truth).
- **SKIP:** MoneyPrinterTurbo (AI-slop video — anti-trust), Next.js Commerce (wrong product), cal.com (no use), **Unsloth/fine-tuning (bakes opinions into weights — fights the glass-box ethos)**. v0 = prototyping aid only.

## C. Design, motion & the "2027 look" (your new list)
- **Study (production-quality refs):** Apple, Stripe, Linear, Vercel, Figma, Framer, Notion, Rive, Spline, Arc, + immersive studios (Active Theory, Resn, Immersive Garden, Build in Amsterdam, Locomotive), Awwwards/Bruno Simon.
- **The 2027 stack to install (for the public surface):** **Shadcn UI** (component base) + **Motion/Framer Motion** + **GSAP** + **Lenis** (smooth scroll) + **Three.js/React-Three-Fiber/Drei** (3D — the galaxy/reticle hero, a 3D consensus field) + **Theatre.js** (scripted scroll cinematics) + **Spline** (no-code 3D) + **tldraw** (interactive consensus/edge heatmap) + Lottie + Rough Notation (annotate the calibration story). React Bits / Tweakpane for polish/tuning.
- **Discipline:** motion = restrained "lock-on" precision (200–300ms), honor `prefers-reduced-motion`; the reticle/galaxy identity carries it. Beauty must read as *engineered*, not flashy — the brand is precision.

## D. Visual data-viz (our signature, underbuilt)
- **Hero = CORP/PAV reliability diagram** (predicted vs actual + confidence bands) — the literal proof the brand promises; reproducible, non-cherry-picked. Pair the **calibration curve + Brier/Brier-Skill** (shape AND number). Consensus "spread" strip (us vs market, disagreement highlighted). Always show **sample size N** on hover. (Our `performance-analytics.ts` + `consensus-view.ts` already produce this data.)

## E. Audio / video (minimal high-impact)
- **Daily 60–90s TTS "calibration briefing"** (VoxCPM) generated from the human-approved slate + *yesterday's misses included*. Honesty is the script. 30–60s explainer clips for social. Full podcast later. **Video:** deterministic data-driven animated charts narrated by TTS — NOT AI-slop stock footage.

## F. Content / SEO moat
- Evergreen guides ("how to read a reliability diagram," "what Brier score means") — teaching builds trust + ranks. Programmatic per-team/per-matchup pages **only where real data exists**. Public glossary + methodology hub. SSR + schema.org SportsEvent/Dataset for rich snippets.

## G. Growth / marketing (trust-tuned)
- **Public track-record dashboard as the lead magnet** (proof recruits better than promos). Referral tied to **accuracy milestones**, not signups. **Loss-autopsy posts when wrong** — the most differentiating trust signal vs touts. Weekly "your calibration vs the model" recap email.

## H. Monetization beyond subs (ranked by fit)
1. Education/courses (probabilistic literacy) — perfect doctrine fit.
2. Premium calibration/deep-dive reports.
3. **B2B data/API** (clean calibrated feeds to media/tools) — highest revenue, founder-gated.
4. Honest affiliate **tools/books only, clearly labeled — NEVER sportsbook CPA** (conflicts with no-real-money).

## I. ⚠️ CRITICAL BLIND SPOTS (the part I'd missed — mostly HIGH priority)
- **AI safety (biggest brand risk):** the Cerebras content lane can hallucinate stats/citations under a trust brand. **Build a numeric-claims validator** (reject ungrounded stats), retrieval-grounded generation, mandatory citation-to-source. Narrative/Reddit layer can amplify rumor → source-credibility weighting + "unverified" labels + human-in-loop for high-impact signals. Prompt-injection sanitization on all ingested text fed to models. **H**
- **Legal (non-gambling):** no ToS, "not betting/financial advice" disclaimer, age/jurisdiction gate, limitation-of-liability. Prediction-market state-law risk is LIVE (MN criminalized prediction-market apps June 2026; Kalshi litigation; 13 states banning sweeps) → keep Kalshi strictly read-only/analytical, geofence, never a wagering surface. **H**
- **Accessibility (legal + brand):** WCAG 2.2 AA — charts keyboard/screen-reader traversable; never color-alone for edge/confidence (add icon/pattern); 4.5:1 contrast. EAA in force since 2025. **H**
- **Privacy:** GDPR/CCPA — privacy policy, cookie consent, delete-my-account/DSAR, lawful basis for Reddit ingestion; classify + encrypt bankroll/PII. **H**
- **Security:** vetted auth (Auth.js) + MFA on money-adjacent accounts + brute-force lockout; per-IP/key **rate-limiting** (scraping our edges is the obvious attack); **rotate the 2 leaked keys**, add gitleaks pre-commit + a secrets vault. **H**
- **Observability/Reliability:** Sentry + OpenTelemetry; per-source **freshness SLAs + staleness detection + circuit breakers** — a silent feed outage produces *confidently wrong* edges; "stale data" UI banner + fallback ordering; status page + incident/correction runbook. **H**
- **Per-prediction provenance:** stamp every prediction with source-snapshot IDs + ingestion timestamp (the missing trust primitive; complements proof-of-record). **H**
- **Model reproducibility:** persist frozen input snapshot + code/version hash per prediction; add a `replay` command; calibration-drift monitor that pages when Brier/log-loss creeps. **H**
- **Email deliverability (2026):** Gmail/Yahoo enforce SPF+DKIM+DMARC alignment + one-click unsubscribe + spam <0.30%; dedicated domain warm-up. **H**
- **Contest integrity:** Sybil/multi-account + anti-collusion + published seed commitments. **M**
- **Timezones:** store UTC, render user-TZ, DST tests around lock windows (correctness + trust). **H**
- Backup/DR for the **proof-of-record ledger** (its integrity IS the product): automated + restore-tested + offsite. **M**

## J. Priority read
- **Do-first (on-brand, mostly buildable now):** AI-safety numeric-claims validator · Sentry + staleness banners · swr live UI · accessibility tokens + dark mode · ToS/not-advice disclaimer · per-prediction provenance stamp · email auth (DMARC) · the reliability-diagram + consensus surface (with design direction).
- **Founder/legal-gated:** mobile, live in-game (paid feed), B2B API, prediction-market jurisdiction strategy, affiliate model, MODEL_VERSION wiring.
- **Skip:** AI-slop video, fine-tuning, ecommerce template, sportsbook affiliate.

Related: `repo-firehose-review.md`, `platform-gaps-triage.md`, `platform-gaps-triage-2.md`, `design-monetization-growth.md`, `gaming-and-engagement-expansion.md`.
