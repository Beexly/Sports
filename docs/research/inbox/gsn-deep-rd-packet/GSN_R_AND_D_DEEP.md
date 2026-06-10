# GSN / Galaxy Sports Edge — Deep R&D and Product Development Packet

## 1. Diagnosis
The previous package was too shallow because it treated your seed links as the research universe. Real R&D for GSN must start from the product category you are trying to create: a trust-first sports intelligence OS, not a sportsbook, tout site, or static picks blog. The supplied tools are only a toolchain. The product moat lives in the data model, source verification, market timeline, No-Bet logic, review gates, post-game accountability, and the way the interface turns uncertainty into fast comprehension.

GSN should not compete by claiming it predicts better. It should compete by proving it thinks cleaner.

## 2. Category thesis
GSN is a sports-market observability system. The best analogy is not FanDuel or PrizePicks. It is Bloomberg Terminal + Datadog Incident Management + Sentry breadcrumbs + a responsible-gaming editorial desk, translated into sports.

The category-defining promise:
> Show the signal, the source, the timing, the uncertainty, and the accountability trail before anyone tells the user what to do.

## 3. External research expansion map
Sports data and odds should be treated as a mesh, not a single provider. The Odds API is useful as a low-cost fallback odds source; SportsDataIO gives broader sports data, betting data, injuries, lineups, depth charts, news, widgets, historical data, and open ID mapping; Sportradar, OpticOdds, SportsGameOdds, and Unabated are premium/future candidates depending on budget and licensing. nflverse should be the free/open NFL historical backbone for non-live research and calibration.

Responsible decision architecture must be built in from day one. NCPG, AGA, the Responsible Sports Betting Advertising Coalition, and NCAA athlete-protection materials all point toward the same guardrail: avoid misleading outcome certainty, target only appropriate audiences, disclose risk, and treat gambling harm as an actual product concern.

Observability is the hidden goldmine. Datadog incident timelines, Grafana dashboards, Sentry breadcrumbs, and Bloomberg risk screens provide the UX and system architecture GSN needs: everything important becomes an event; every event has source, timestamp, severity, reviewer state, and downstream impact.

## 4. Product primitives
GSN becomes defensible when these primitives are first-class data objects, not UI decorations.

### Trust Receipt
A user-facing proof bundle attached to every pick, No-Bet, article, game note, podcast script, and model update. It shows source list, freshness, odds snapshot, injury/news assumptions, confidence, reviewer, and what would change the view.

### Market Integrity Flight Recorder
A time-aware event log that captures every meaningful change: line movement, source update, confidence change, model disagreement, reviewer note, No-Bet transition, publication state, and post-game result. This is the IP spine.

### No-Bet Intelligence
No-Bet is not weakness. It is the platform refusing false precision. Taxonomy: stale data, conflicting sources, line moved past value, injury uncertainty, model disagreement, low liquidity, suspicious movement, emotional/public distortion, compliance concern.

### Confidence Decay Clock
Confidence should decay as data ages or assumptions break. A pick without a freshness clock is theater. The decay model should attach to every source and every game-level insight.

### Source Quality Ledger
Every source gets a profile: type, authority, historical reliability, recency, conflict rate, domain, licensing status, and whether it is official, journalist, social, market, model, or internal.

### Rumor Quarantine
Unconfirmed information does not enter public picks. It sits in a quarantine state with conflict notes, review requirements, and explicit “not publishable yet” status.

### Sharp/Public Divergence Lens
Show splits only as context, not gospel. Public/sharp data is easy to mythologize. GSN should present divergence as pressure, not proof.

### Post-Game Autopsy
After the event, GSN grades process: what was known, what changed, whether No-Bet would have been better, whether the source was wrong, and whether confidence was calibrated.

### Analyst Note Grader
Borrow the feedback-loop pattern from scoring tools: every analyst note gets graded for claim specificity, source quality, freshness, uncertainty language, and prohibited certainty phrases.

### Podcast Intelligence Loop
The weekly podcast is not content fluff. It is the audible version of the Trust Receipt system: source packet → script → fact check → consented AI voice → transcript → clips → post-game audit.

## 5. Architecture
Core entities:
- Game
- Team
- Player
- Market
- OddsSnapshot
- Source
- SourceClaim
- InjurySignal
- ModelRun
- IntelligenceNote
- PickCandidate
- NoBetDecision
- TrustReceipt
- FlightRecorderEvent
- ReviewAction
- PodcastEpisode
- PodcastSegment
- VoiceConsentRecord
- PostGameAutopsy

Every externally-derived insight must carry:
- source_url
- source_type
- source_license_status
- fetched_at
- observed_at
- expires_at
- confidence_impact
- reviewer_required
- publishable_state

## 6. GSN UI surfaces
The public site should make the user understand the state of a game in under ten seconds.

Public surfaces:
- Market Radar: live slate with freshness, volatility, disagreement, and No-Bet density.
- Game Detail: timeline, current signal, source receipt, market movement, injury volatility, model disagreement.
- Trust Receipt Drawer: collapsible proof layer behind every recommendation.
- No-Bet Card: clear reason, what would change, next review time.
- Post-Game Autopsy: process accountability, not victory-lap content.
- Weekly Intelligence Podcast page: transcript, source packet, clips, disclaimers, episode receipt.

Admin surfaces:
- Review Queue: drafts, stale data, rumor quarantine, voice scripts, risky language.
- Source Ledger: source health and reliability.
- Flight Recorder: event-level history for each game/market.
- Publish Gate: blocks stale, unlicensed, unresolved, or unreviewed insights.
- Podcast Packet Builder: builds episode from approved notes only.

## 7. GSN podcast system
The sports-only weekly podcast should have a repeatable production system:

Episode types:
1. Weekly Market Radar
2. No-Bet Lab
3. Line Movement Autopsy
4. Injury Volatility Report
5. Sharp/Public Pressure Watch
6. Post-Game Accountability episode
7. Playoff/major-event special

Workflow:
1. Collect approved source packets.
2. Generate segment outline.
3. Draft script with uncertainty language.
4. Run claims through fact-check and freshness gate.
5. Human review.
6. Generate voice only from approved written consented voice asset.
7. Watermark/file-label as AI-generated voice.
8. Generate transcript.
9. Create clips.
10. Publish only after final approval.
11. Attach podcast Trust Receipt.

Voice guardrails:
- Only Garrett’s voice with explicit consent.
- No third-party voices.
- No implied live/personal statement unless Garrett approved the script.
- Include disclosure: “This episode uses an AI-generated version of Garrett’s voice from an approved script.”
- Store voice assets separately from public repo.

## 8. 30/60/90-day build plan
### First 30 days: Trust foundation
- Build Source Quality Ledger.
- Build Trust Receipt schema/component.
- Build No-Bet taxonomy.
- Add freshness gates under 60 minutes for live-facing data.
- Build admin Publish Gate.
- Make The Odds API optional fallback, not sole dependency.

### Days 31–60: Market observability
- Build OddsSnapshot timeline.
- Build Confidence Decay Clock.
- Build Market Integrity Flight Recorder MVP.
- Build Rumor Quarantine.
- Build Post-Game Autopsy v1.

### Days 61–90: Intelligence loop
- Build Podcast Packet Builder.
- Build AI voice consent/disclosure controls.
- Build Analyst Note Grader.
- Build source reliability scoring.
- Build user-facing Market Radar.

## 9. 6-month maturity path
By month six, GSN should have a true data mesh, review cockpit, post-game accountability loop, and public UX that visibly separates it from tout sites. The product should be able to answer: “What changed, why did confidence move, who/what was the source, and was the original decision process sound?”

## 10. 12-month category-defining vision
GSN becomes the sports intelligence OS where every signal has a receipt, every claim has provenance, every market move has a timeline, every No-Bet has dignity, and every post-game result feeds calibration instead of marketing theater.

## 11. Sources to keep in the research map
- The Odds API: https://the-odds-api.com/ — Low-cost odds fallback; JSON, multiple bookmakers, historical odds on paid plans
- SportsDataIO: https://sportsdata.io/apis — Scores, stats, plays, injuries, lineups, odds, ID mapping, historical data
- Sportradar Sports Data API: https://sportradar.com/media-tech/data-content/sports-data-api/?lang=en-us — Enterprise-grade depth/reliability benchmark
- API-SPORTS: https://api-sports.io/ — Developer-friendly real-time sports data alternative
- nflverse: https://nflverse.nflverse.com/ — Free/open historical NFL base layer
- nflverse-data: https://github.com/nflverse/nflverse-data — Automated NFL data repository for reproducible analysis
- SportsGameOdds: https://sportsgameodds.com/ — Real-time/pre-match odds alternative; developer-oriented
- OpticOdds: https://opticodds.com/ — Premium breadth: many sportsbooks, push/pull feeds, props/injuries
- Unabated: https://unabated.com/ — Line shopping, market maker lens, props simulator inspiration
- Sports Insights: https://www.sportsinsights.com/ — Bet signals, public/sharp framing, odds-screen competition
- Action Network: https://www.actionnetwork.com/ — Competitor for line movement, betting splits, tracker UX
- Betstamp: https://betstamp.com/education/the-downfalls-of-using-public-betting-percentages-betting-splits — Useful warning: public/sharp split narratives can be seductive and weak
- NCPG: https://www.ncpgambling.org/ — Harm mitigation baseline and help-resource posture
- AGA Responsible Marketing Code: https://americangaming.org/marketing-code/ — Advertising guardrails; avoid misleading/risk-free language
- Coalition principles: https://pr.nba.com/coalition-for-responsible-sports-betting-advertising/ — Age targeting, no irresponsible/excessive gambling, careful delivery
- NCAA sports betting advocacy: https://www.ncaa.org/sports/2026/3/6/sports-betting.aspx — Student-athlete harassment/coercion and competition-integrity risk
- Datadog Incident Management: https://docs.datadoghq.com/incident_response/incident_management/ — Model for Flight Recorder, status changes, postmortems
- Grafana: https://grafana.com/ — Metric/log/trace architecture inspiration
- Sentry: https://sentry.io/ — Breadcrumbs, issue context, post-incident diagnosis inspiration
- Bloomberg Terminal: https://professional.bloomberg.com/products/bloomberg-terminal/ — Command-center mental model: data, news, analytics, workflows
- Bloomberg Risk: https://professional.bloomberg.com/products/risk/ — Intraday risk-monitoring analogy for market pressure/confidence
- SPORTSQL paper: https://arxiv.org/abs/2508.17157 — Natural-language querying over temporal sports data
- Big Ideas in Sports Analytics: https://arxiv.org/abs/2301.04001 — EV, win probability, strength, betting market data as big concepts
- NeuTTS-Air model: https://huggingface.co/neuphonic/neutts-air — On-device TTS/voice cloning; podcast workflow with consent/disclosure
- OpenAI synthetic voice guidance: https://openai.com/index/navigating-the-challenges-and-opportunities-of-synthetic-voices/ — Explicit informed consent and AI voice disclosure standards
- Apple Podcasts creator docs: https://podcasters.apple.com/support/897-submit-a-show — RSS validation and show-submission requirements

## 12. Strongest GSN original idea
The strongest idea remains the Market Integrity Flight Recorder, but it should be elevated from “nice feature” to system spine. The public experience can be beautiful, but the recorder is the part that creates trust, defensibility, and process memory.
