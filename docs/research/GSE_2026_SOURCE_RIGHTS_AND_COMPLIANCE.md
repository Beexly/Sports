# GSE Source Rights, Data Compliance, and Legal Gate Map

**Status:** Research document. Legal claims marked "source gap" have not been
confirmed by qualified legal counsel and must be reviewed before operational
reliance. This document is not legal advice.
**Branch:** claude/laughing-wozniak-gyryjx
**Date:** 2026-06-22

> This document extends and formalizes the binding Scraping Clearance Engine doctrine
> from CLAUDE.md. It covers data rights taxonomy, fantasy platform sync legal posture,
> DFS platform rules, affiliate compliance, voice/AI compliance, the extended source
> registry format, and GDPR/CCPA notes. All binding constraints in CLAUDE.md remain
> in full effect and are not superseded by this document.

---

## 1. Data Rights Taxonomy

This taxonomy classifies every type of data GSE uses or might use. The category
determines what rights analysis is required before use.

---

### Category A: Public Facts (Scores, Standings, Schedules)

**Description:** Game results, final scores, standings tables, scheduled game times,
team rosters (as public knowledge, not platform database extraction).

**Legal posture:** Facts are not copyrightable under U.S. copyright law (Feist
Publications v. Rural Telephone Service, 499 U.S. 340 (1991)). A score is a fact.
A final standing is a fact.

**Key caveat:** The *database* containing those facts may have database rights (in EU
jurisdictions, sui generis database right under Directive 96/9/EC) even if individual
facts do not. Extracting the entire database is categorically different from reading
individual facts.

**EU note:** Database rights in EU must be analyzed separately. If GSE serves EU users
and extracts structured data from a database with EU database rights, a license or
substantial investment argument applies even for pure facts.

**GSE posture:** Facts extracted individually and used for derived analysis are
generally clear. Bulk extraction of a database must go through the Clearance Engine.

---

### Category B: Player Statistics

**Description:** Game-level player stats (passing yards, rushing attempts, receiving
targets, snap counts).

**Legal posture:** Raw stat facts are not copyrightable. However, stats are typically
accessed from databases that may have contractual restrictions on use. The NFL and its
data partners (Sportradar, Stats Perform) hold licenses for NFL official data.

**Official NFL injury reports:** These are official league documents published as a
public obligation. They are generally considered public information. Analysis and
commentary on them is clearly fair use.

**nflverse:** Open source dataset licensed under the MIT license. Approved for GSE use
(`approved_open_license` in source rights registry). This is the primary path for
historical player stats.

**Source gap:** Whether nflverse's underlying data (sourced from nflfastR and
similar) has any upstream licensing restrictions that nflverse's MIT license does not
fully resolve has not been confirmed by legal review. The nflverse maintainers publish
the dataset as MIT-licensed; GSE treats this as cleared for commercial use, but
legal review is recommended before making this the sole basis for a production system.

---

### Category C: Odds Data

**Description:** Opening and closing lines, spread, total, moneyline, player props,
futures.

**Legal posture:** Odds data is commercially licensed. Sportsbooks and data
aggregators (The Odds API, Sportradar, Genius Sports, Action Network) sell access
to odds data. The data itself is proprietary to the books/providers.

**GSE path:** The Odds API is the current licensed provider (`approved_api` in
source rights registry). All odds data in GSE flows through this licensed source.
No scraping of individual sportsbooks for odds.

**Player props coverage:** Source gap — The Odds API's basic tier coverage of player
props (receiving yards O/U, TD props, etc.) versus their higher tiers needs to be
confirmed before building the Prop-to-Projection Delta Engine (System 35).

---

### Category D: Injury Reports

**Description:** Official NFL injury reports (Wednesday/Thursday/Friday practice
participation designations), team-reported injury updates.

**Legal posture:** Official NFL injury reports are published by the NFL as a public
league policy requirement. They are public documents. Extracting the designations
(Full/Limited/DNP participation, Questionable/Doubtful/Out/IR designations) is
extraction of public facts.

**Beat-reported injury news:** Copyrighted content published by reporters and their
outlets. The *fact* that a player is injured is not copyrightable. The reporter's
words describing it are. GSE may extract the factual claim. GSE may not republish
the reporter's article text.

**Fair use analysis:** Quoting a short relevant excerpt from a beat report with
attribution, for commentary and analysis purposes, has a strong fair use argument
under 17 U.S.C. § 107. Systematic reproduction of article bodies for display to users
is not fair use.

---

### Category E: Beat Reporter Content

**Description:** Articles, tweets, press conference summaries, podcast transcripts
published by sports journalists and their employers.

**Legal posture:** Copyrighted content. Copyright vests in the author/employer at
creation.

**What GSE may do:**
- Extract factual claims (player X will be on a snap count; coach Y said player Z
  earned more playing time)
- Cite with attribution and link to source
- Quote brief relevant passages under fair use doctrine (purpose: commentary and
  analysis; not reproducing the full work)
- Summarize the news using GSE's own words

**What GSE may not do:**
- Republish article bodies in full or in large part
- Display article content to users in a way that substitutes for the original source
  (potential market substitution argument against fair use)
- Store article text for use in training models (no model training right in GSE
  data rules per `data-rules.ts`)

**Social media (Twitter/X):** Platform ToS restricts third-party display and storage
of tweet content. Twitter/X API terms have been significantly tightened since 2023.
Source gap: current Twitter/X API terms for sports data and commercial use need
current review. Do not assume prior API access norms remain valid.

---

### Category F: Fantasy Platform Rankings and ADP

**Description:** Expert consensus rankings, platform ADP (average draft position)
data published by fantasy platforms (FantasyPros, ESPN, Yahoo, Sleeper).

**Legal posture:** Compiled ranking databases are a mix of facts (each ranking is an
editorial opinion, opinions are not facts in the copyright sense) and database rights.
ADP data collected from millions of drafts is a proprietary database.

**FantasyPros ADP:** Source gap — FantasyPros' terms on commercial use of their ADP
data must be reviewed. Their data is used widely by third parties, but the terms
governing commercial product use are not confirmed.

**Platform-native ADP (Yahoo, ESPN, Sleeper):** Platform-generated data from their
own draft activity. Terms vary by platform. Source gap for all.

**GSE posture:** Do not use platform ADP in production without terms review and source
rights registration. For V1 of League Memory features, use nflverse ADP data (if
available as open dataset) or instruct users to manually enter ADP context. The
Projection Factory (System 11) and Draft Futures Engine (System 3) require ADP
benchmarks — source must be confirmed before launch.

---

### Category G: Historical Draft Data (User-Generated Content)

**Description:** A user's own fantasy draft results, waiver decisions, trade history.

**Legal posture:** User-generated content. The user owns their own draft history.
Platforms may have ToS that claim rights to user-generated data stored on their
platform, but a user's decision to export their own data and upload it to a third
party is generally within their rights.

**GSE posture:** User-uploaded draft data is owned by the user. GSE processes it
under the terms of its privacy policy. The user may request deletion. GSE may use
it to improve that user's experience (Genome, Regret Engine) but not as training
data for models or as data shared with other users without consent.

---

### Category H: Social Media Content

**Description:** Posts, stories, live content from Twitter/X, Instagram, TikTok,
Reddit, YouTube.

**Legal posture:** Heavily platform-restricted. Each platform has terms that govern
API access, scraping, display of content, and commercial use. These terms change
frequently.

**GSE posture:** No social media content may be extracted or displayed without
platform-specific API access and rights review. Currently: no approved social media
source in the GSE source rights registry. Source gap for all platforms.

**Exception:** Reddit — if using Reddit's API under their published API terms, public
posts in sports subreddits constitute public factual commentary. The reddit-feed-engine
referenced in GSE docs must have a source rights registration before activation.

---

### Category I: Projection Data from External Sources

**Description:** Forward-looking player projections from third-party services
(numberFire, FantasyPros, Yahoo, ESPN, etc.).

**Legal posture:** Projections are proprietary analytical products, not facts.
They are protected as copyrightable original analysis. Using a third-party projection
in GSE without a license is copyright infringement.

**GSE posture:** The Projection Factory (System 11) must use either: (a) internally
generated projections, (b) licensed third-party projections with commercial license,
or (c) open-licensed projection data. No scraping of third-party projection pages.
Source gap: no approved projection data source is currently confirmed in the source
rights registry.

---

## 2. Fantasy Platform Sync Legal Review

This section documents the current legal posture for each major fantasy platform.
All statuses other than PERMITTED require founder review before implementation.

---

### Yahoo Fantasy

**Does Yahoo have a public API?**
Yes. Yahoo provides the Yahoo Fantasy Sports API through Yahoo Developer Network (YDN).
Documentation: `https://developer.yahoo.com/fantasysports/guide/`

**License for fantasy league data:**
Source gap. Yahoo's developer terms require review. The API requires OAuth 2.0
authorization and application registration. Commercial applications must register
and agree to Yahoo's developer terms.

**Is reading draft room data permitted?**
Source gap. Historical draft results appear accessible via the API. Real-time draft
room access during a live draft has not been confirmed.

**Status: CONDITIONAL_PERMISSION** — historical reads may be feasible with OAuth;
real-time and commercial use terms must be confirmed.

---

### ESPN Fantasy

**Does ESPN permit third-party read access?**
ESPN does not publish an official third-party fantasy API. Third-party tools (ESPN
Fantasy API wrapper packages on npm/GitHub) use undocumented internal endpoints
that ESPN's own apps use. These are not officially supported.

**API status:**
ESPN's Terms of Use restrict automated access to their services. Source gap: whether
ESPN has changed their ToS posture since the widespread use of third-party wrappers.
The absence of an official API, combined with ToS language restricting automated
access, creates legal risk.

**Status: NOT_PERMITTED** — without written permission from ESPN, do not build ESPN
data extraction. Support manual entry only.

---

### Sleeper

**Does Sleeper have a developer API?**
Yes. Sleeper has a well-documented public REST API.
Documentation: `https://docs.sleeper.com/`

**What can be read with user consent?**
League data, draft picks, rosters, transactions, player data — all available
via the public API. Draft pick data appears to be public (no auth required for
public drafts).

**Source gap:** Sleeper's terms of service for third-party commercial applications
has not been confirmed. Whether a paid subscription product using Sleeper's API
for a core feature is within Sleeper's permitted use requires direct confirmation
from Sleeper.

**Status: CONDITIONAL_PERMISSION** — technically feasible; terms must be confirmed.

---

### CBS Fantasy

**API availability and terms:**
Source gap. CBS Sports has offered data products and APIs for partners, but a
publicly documented developer API for CBS Fantasy specifically is not confirmed.

**Status: UNKNOWN** — contact CBS Sports developer relations before any implementation.

---

### Fantrax

**API and terms:**
Source gap. Fantrax has provided API access to partners and developers previously.
Current availability and terms not confirmed.

**Status: UNKNOWN** — contact Fantrax before implementation.

---

### NFL.com Fantasy

**API and terms:**
Source gap. NFL.com Fantasy is the official NFL fantasy product. The NFL has
strict data licensing arrangements. Third-party access to NFL.com Fantasy data
is not confirmed through a public developer program.

**Status: UNKNOWN** — low priority; NFL.com Fantasy has declining market share.

---

### Summary Table

| Platform | Public API | Draft Data | Commercial Use | GSE Status |
|---|---|---|---|---|
| Yahoo | Yes (official) | Historical yes; live unclear | CONDITIONAL | CONDITIONAL_PERMISSION |
| ESPN | No (unofficial only) | Not officially | NOT_PERMITTED | NOT_PERMITTED |
| Sleeper | Yes (public) | Yes (public drafts) | Terms unclear | CONDITIONAL_PERMISSION |
| CBS | Unknown | Unknown | Unknown | UNKNOWN |
| Fantrax | Unknown | Unknown | Unknown | UNKNOWN |
| NFL.com | Unknown | Unknown | Unknown | UNKNOWN |

---

## 3. Scraping Policy (Binding)

The following constraints are binding on all GSE development. They derive from
CLAUDE.md and the Scraping Clearance Engine at
`apps/web/lib/scraping/clearance-engine.ts`. This section reinforces and clarifies
them in the context of the fantasy and compliance systems described in this document.

### Hard Stops (No Exceptions)

1. **No CAPTCHA bypass.** Any site presenting a CAPTCHA is expressing a technical
   control against automated access. Do not use CAPTCHA-solving services, image
   recognition, or any technique to bypass this.

2. **No login bypass.** Do not use credentials you do not own, shared credentials,
   or any technique to access content behind a login wall without the account owner's
   explicit authorization.

3. **No paywall bypass.** Content behind a paywall is licensed. Do not access it
   without a valid subscription to that content.

4. **No proxy rotation to evade.** Rotating IP addresses or User-Agent headers to
   evade IP-based rate limiting or access controls is evasion of technical controls.
   Not permitted.

5. **No fake accounts.** Do not create accounts on any platform for the purpose of
   automated data access. This includes dummy accounts for "just testing."

6. **No paths disallowed by robots.txt** without explicit legal clearance. A
   `robots.txt` disallow directive is a technical statement of intent by the site
   owner. Ignoring it without legal clearance creates legal exposure.

7. **Cease and desist received = full stop.** If any data source sends a
   cease-and-desist, automated access to that source stops immediately. No further
   access without legal review.

### Mandatory Clearance Steps

Every extraction job must:
1. Call `checkClearance()` from the Scraping Clearance Engine before any extraction
2. If `ClearanceResult.allowed === false`, stop the job immediately and log the
   attempted access
3. Wrap every extracted record with `wrapExtractedRecord()` to enforce the rights
   envelope
4. Never mutate a `RightsSnapshot` after it has been captured

### Source Rights Registration Requirement

Any new data source that GSE has not previously used must be registered in the
source rights registry (`source-rights-registry.ts`) with a cleared status before
any data is extracted from it. Adding a source to the registry with an `excluded`
or `permission_required` status does not permit extraction — it documents that
the source has been reviewed and extraction is not permitted.

---

## 4. DFS Platform Rules

This section covers the rules for major DFS platforms as they affect GSE's DFS
features (DFS Optimizer, Ownership Engine, DFS Portfolio Surgeon, Lineup Thesis Cards).

---

### DraftKings

**Lineup submission API:**
DraftKings does not offer a public API for automated lineup submission for regular
users. They have a partner API program for licensed partners.

**CSV upload:**
DraftKings offers CSV bulk entry (multi-entry upload) for supported contest types.
This is the permissible path for tool-assisted lineup submission. User downloads
lineup CSV from GSE, uploads to DraftKings manually.

**Third-party optimizer terms:**
Source gap. DraftKings' Terms of Use govern use of their platform. Automated
submission (programmatic API calls to submit lineups) for non-partner third parties
is not confirmed as permitted.

**GSE recommendation:** CSV export only. Do not build automated lineup submission
without DraftKings partnership agreement. Inform users that they must submit lineups
manually via CSV upload on DraftKings.

**Restrictions on automated lineup submission:**
Source gap. DraftKings' terms restrict unauthorized automation. Their documented CSV
upload path is explicitly designed for bulk entry and is the safe path.

---

### FanDuel

**Lineup submission API:**
FanDuel does not offer a public API for automated lineup submission. Partner
integrations exist through FanDuel's affiliate/partner program.

**CSV upload:**
FanDuel supports multi-entry CSV upload for large contests. Same posture as
DraftKings — this is the permissible path.

**Third-party optimizer terms:**
Source gap. Must be reviewed against current FanDuel Terms.

**GSE recommendation:** CSV export only. Same posture as DraftKings.

---

### Underdog Fantasy

**Contest type:** Best ball and pick'em (no live DFS lineups). Different regulatory
posture than DraftKings/FanDuel.

**API:** Source gap. No documented public API for lineup submission.

**GSE recommendation:** Out of scope for DFS Portfolio Surgeon. May be relevant
for Best Ball tooling in a future phase.

---

### General DFS Posture

The safe and permissible path for all DFS platforms is:
1. GSE builds and optimizes lineups in the GSE interface
2. User exports lineups as a CSV file
3. User manually uploads the CSV to the DFS platform
4. No automated lineup submission from GSE to any DFS platform without explicit
   partnership agreement with that platform

Salary data: DFS platforms publish salary CSVs for each slate. Downloading your
own salary CSV and using it in a third-party optimizer is standard DFS practice.
The posture is generally permissible — but the specific terms for each platform
regarding commercial products using their salary data should be reviewed.

---

## 5. Affiliate/Sponsorship Compliance

### FTC Disclosure Requirements

The FTC's Guides Concerning the Use of Endorsements and Testimonials in Advertising
(16 CFR Part 255) and the FTC Disclosure Guide ("How to Make Effective Disclosures
in Digital Advertising") require that:

1. Any material connection between GSE and a sportsbook affiliate must be clearly
   and conspicuously disclosed.

2. "Material connection" includes: affiliate commissions, sponsored content, free
   services received in exchange for promotion, and any financial relationship.

3. Disclosures must be:
   - Clear: not buried in terms of service or fine print
   - Conspicuous: visible without scrolling, in a readable font, adjacent to the
     affiliate link or sponsored content
   - Language: "Ad," "Sponsored," "Paid Partner," or equivalent language is
     sufficient. Ambiguous language ("Partner" alone may not be sufficient)

4. Disclosures must appear every time the affiliate link or sponsored content
   appears — not just once per page or per session.

**GSE implementation:** All affiliate links in GSE must be routed through the
Sponsor/Affiliate Integrity Layer (System 29) which appends disclosure badges.
This is an engineering control, not a policy-only control.

---

### State-by-State Sports Betting Advertising Considerations

Sports betting is legal in a subset of U.S. states. Sportsbook advertising rules
vary by state. Key considerations:

**States where online sports betting is legal and regulated (as of 2026 — source
gap: verify current status):** Approximately 35+ states have legalized some form
of sports betting. Regulations vary by state on advertising, responsible gambling
disclosure requirements, and prohibited claims.

**States where sports betting is illegal:** GSE must not display sportsbook affiliate
content to users in states where sports betting is illegal. Source gap: a real-time
user jurisdiction check needs to be implemented before sportsbook affiliate content
is activated.

**Responsible gambling requirements:**
Many states with legal sports betting require that gambling advertising include
responsible gambling messaging and links to resources (1-800-GAMBLER or equivalent).

**GSE implementation:** Sportsbook affiliate content must be gated by user
jurisdiction. This is required before any sportsbook affiliate relationship is
activated. The Source Health / Legal Gate Map (System 27) must include jurisdiction
gating for affiliate content as a hard gate.

---

### Prohibited Language

The following language is prohibited in any GSE content, including picks, analysis,
and sponsored content:

- "Guaranteed win" or "guaranteed pick" or any similar absolute outcome claim
- "Can't lose" or equivalent
- "Free money" in the context of sports betting
- "Risk-free" for picks or predictions (unless referring to a specific platform's
  promotion with full terms disclosure)
- "Lock" or "locks" as a prediction certainty claim
- Any implication that GSE has insider information or special access unavailable
  to others

This prohibition applies equally to AI-generated content (GSN Transmission, Signal
Courtroom verdicts, Jarvis responses) and human-authored content.

---

### GSE Affiliate Integrity Policy

1. **Separation of content and commerce:** A sportsbook's affiliate relationship with
   GSE does not influence, modify, or affect any Signal Courtroom case, Agent War Room
   debate, Trust Ledger record, or any prediction/recommendation. These are governed
   solely by analytical merit.

2. **No paid placement in recommendations:** No affiliate can pay for preferential
   treatment in GSE's pick selection, ranking, or recommendation engine.

3. **Technical enforcement:** The Sponsor/Affiliate Integrity Layer (System 29) is
   an engineering control that prevents affiliate links from appearing inside
   Courtroom, War Room, or Trust Ledger components. Policy is reinforced by code.

4. **Disclosure above the fold:** On any page where affiliate links appear, the
   affiliate relationship is disclosed at the top of the page, not just adjacent to
   individual links.

5. **Affiliate revenue is tracked separately:** In the Revenue Intelligence Cockpit
   (System 28), affiliate revenue is a separate line item from subscription revenue,
   so it is visible how large the affiliate component is relative to the total.

---

## 6. Voice/AI Compliance

### GDPR/CCPA for Storing User Voice Data

**Voice audio:**
Voice audio from Voice Jarvis (System 8) is transcribed client-side using the Web
Speech API. No audio is transmitted to GSE servers. Therefore, voice audio is not
stored by GSE.

Under GDPR (Regulation (EU) 2016/679), voice recordings are biometric data that
may constitute special category data under Article 9 if they can be used to uniquely
identify a person. Client-side processing with no server-side storage avoids this
category of data.

Under CCPA (Cal. Civ. Code § 1798.140), "personal information" includes audio
recordings. Client-side-only processing means GSE does not "collect" this data
within the meaning of CCPA.

**Text transcripts:**
Text transcripts from Jarvis sessions are not biometric data. They are stored for
24 hours by default (to support draft session review). Under GDPR, this processing
requires a legal basis (legitimate interest in providing the draft assistance
service is a plausible basis; consent is the cleaner basis for optional persistent
storage). Under CCPA, users have the right to know about this collection and to opt
out of sale/sharing (GSE does not sell or share transcripts).

**Consent requirement:** The Jarvis voice mode onboarding must include explicit
notice that voice is transcribed locally and text is processed by GSE's servers.
If persistent transcript storage is offered, explicit opt-in consent is required.

---

### League Memory Data Retention Policy

League data uploaded by users:
- Retained for the duration of the user's account
- Deleted within 30 days of account deletion request
- User may delete specific seasons via settings without deleting the account

Derived data (Manager Genome, Regret Analysis, Exploit Map):
- Deleted along with the underlying league data on deletion request
- Not retained for aggregate analytics or model training

Backup retention: standard database backup retention (source gap: GSE's specific
backup retention period and GDPR compliance of that retention not yet defined;
must be addressed in privacy policy before EU launch).

---

### User Consent Requirements for AI-Powered Recommendations

**Under GDPR Article 22 (Automated Individual Decision-Making):**
Article 22 restricts solely automated decisions that produce legal or "similarly
significant" effects. Fantasy sports recommendations do not produce legal effects.
However, significant financial effects (DFS entries, betting decisions) may attract
scrutiny in some EU jurisdictions.

**GSE posture:**
1. All AI recommendations are advisory, not automated decisions. The user makes
   the final decision.
2. GSE's privacy notice must disclose that AI analysis (including Claude API) is
   used in generating recommendations.
3. For EU users, the privacy notice should explain the logic of the AI
   recommendation system in plain language (GDPR Article 13/14 requirement for
   information about automated processing).

**Under CCPA:**
No specific restriction on AI recommendations beyond standard personal information
handling. Profiling disclosure required in privacy policy.

---

### AI-Generated Content Disclosure

All content generated using the Claude API (or any other LLM) must be labeled as
AI-generated or AI-assisted in the GSE interface and in published content.

Required label: "AI-assisted analysis" or "Generated by GSE AI" at minimum.
For published content (GSN Transmission pieces), "AI-assisted" must appear in
a visible location, not only in metadata.

This applies to:
- Voice Jarvis responses
- Lineup Thesis Cards
- GSN Transmission content
- Signal Courtroom narratives generated by the AI
- Any other content where Claude API is the primary author

Human-authored content with AI assistance (draft assisted by AI, finalized by
a human editor) may use "AI-assisted" rather than "AI-generated."

---

## 7. GSE Source Registry Format

The following extends the existing `SourceRightsEntry` type in
`apps/web/lib/scraping/source-rights-registry.ts` with additional fields for
the fantasy and compliance use cases described in this document.

```typescript
// Proposed extension fields for SourceRightsEntry
// Add these to the existing type — do not replace existing fields

export type ExtendedSourceRightsEntry = SourceRightsEntry & {
  // Data classification
  readonly data_types_allowed: readonly DataTypeAllowed[];
  readonly data_types_prohibited: readonly DataTypeProhibited[];

  // API access
  readonly api_available: boolean;
  readonly api_terms_url: string | null;
  readonly api_requires_registration: boolean;
  readonly api_requires_commercial_agreement: boolean;

  // Scraping posture
  readonly scraping_permitted: boolean;
  readonly robots_txt_disallows: boolean;  // Derived from robots.txt check
  readonly anti_bot_detected: boolean;

  // Rights snapshot metadata
  readonly rights_snapshot_date: string;  // ISO 8601 date of rights review
  readonly rights_snapshot_reviewer: string;  // Who performed the review

  // GSE use cases
  readonly gse_use_cases: readonly GseUseCase[];
  readonly compliance_notes: string;

  // Fantasy-specific
  readonly fantasy_platform: boolean;    // Is this a fantasy sports platform?
  readonly fantasy_user_data_owner: boolean;  // Does user own their data on this platform?

  // Jurisdiction
  readonly jurisdiction_restrictions: readonly string[];  // e.g., ["EU_GDPR_REVIEW"]
};

export type DataTypeAllowed =
  | "game_scores"
  | "standings"
  | "schedules"
  | "player_stats_aggregate"
  | "player_stats_game_level"
  | "injury_reports_official"
  | "injury_news_factual"
  | "odds_opening"
  | "odds_current"
  | "odds_historical"
  | "player_props"
  | "draft_results_own_data"
  | "adp_historical"
  | "depth_chart_facts"
  | "roster_facts"
  | "coach_statements_factual"
  | "derived_analytics";

export type DataTypeProhibited =
  | "article_bodies"
  | "proprietary_projections"
  | "protected_graphics"
  | "account_gated_content"
  | "personal_data_pii"
  | "biometric_data"
  | "competitor_user_data"
  | "model_training";

export type GseUseCase =
  | "odds_ingestion"
  | "player_stats_historical"
  | "injury_tracking"
  | "news_signal_extraction"
  | "fantasy_league_sync"
  | "projection_input"
  | "adp_benchmark"
  | "beat_reporter_signals"
  | "coach_statements";
```

---

### Example Extended Registry Entry (Illustrative)

```typescript
{
  // Existing fields
  source_id: "sleeper_api",
  source_name: "Sleeper Fantasy Sports API",
  source_url: "https://sleeper.com",
  terms_url: "https://sleeper.com/tos",  // Must verify current URL
  robots_url: "https://sleeper.com/robots.txt",
  jurisdiction: "US",
  source_type: "fantasy_platform",
  status: "vendor_candidate",  // Upgrading to approved_api requires terms review
  automation_allowed: false,   // PENDING terms review
  public_logged_off_allowed: true,  // Public API exists
  commercial_display_allowed: false,  // PENDING terms review
  storage_allowed: false,  // PENDING terms review
  derived_analytics_allowed: false,  // PENDING terms review
  model_training_allowed: false,
  attribution_required: true,
  attribution_text: "Powered by Sleeper Fantasy Sports",  // PLACEHOLDER
  personal_data_risk: "medium",
  copyright_expression_risk: "low",
  database_right_risk: "medium",
  technical_controls_detected: false,
  cease_and_desist_received: false,
  reviewed_at: "2026-06-22",
  reviewed_by: "GSE internal review",
  evidence_urls: ["https://docs.sleeper.com/"],
  unlock_condition: "Confirm commercial use terms with Sleeper support",
  vendor_contact: null,  // Source gap — Sleeper contact info not confirmed
  notes: "Public API is well-documented. Commercial use terms for paid products not confirmed. Founder review required before activation.",

  // Extended fields
  data_types_allowed: ["draft_results_own_data", "roster_facts", "standings"],
  data_types_prohibited: ["article_bodies", "competitor_user_data", "model_training"],
  api_available: true,
  api_terms_url: "https://sleeper.com/tos",
  api_requires_registration: false,  // Public API currently does not require registration
  api_requires_commercial_agreement: true,  // ASSUMPTION — needs confirmation
  scraping_permitted: false,
  robots_txt_disallows: false,  // Source gap — not checked
  anti_bot_detected: false,
  rights_snapshot_date: "2026-06-22",
  rights_snapshot_reviewer: "GSE internal review",
  gse_use_cases: ["fantasy_league_sync"],
  compliance_notes: "User OAuth consent required for personal league data. GDPR: user data export/deletion must be honored. CCPA: user data category disclosure required.",
  fantasy_platform: true,
  fantasy_user_data_owner: true,
  jurisdiction_restrictions: ["FOUNDER_GATED"],
}
```

---

## 8. GDPR / CCPA Notes

### What User Data GSE Collects

The following categories of personal data are collected by GSE:

| Category | Purpose | GDPR Legal Basis | CCPA Category |
|---|---|---|---|
| Account data (email, name) | Authentication, subscription management | Contract (Art. 6(1)(b)) | Identifiers |
| Payment data (via Stripe) | Subscription billing | Contract (Art. 6(1)(b)) | Financial |
| Fantasy league data (uploaded) | League Memory, Genome, Regret Engine | Consent (Art. 6(1)(a)) | Personal information |
| Decision history (picks, recommendations accepted/rejected) | Portfolio, Calibration, Bias Mirror | Legitimate interest / Consent | Inferences |
| Manager Genome data (derived from league uploads) | Draft intelligence, War Room | Consent (implicit in upload) | Inferences |
| Usage events (features used, pages visited) | Product analytics | Legitimate interest | Internet activity |
| Voice session transcripts (if persistent storage enabled) | Draft session review | Consent (explicit) | Audio recording |

---

### League Memory Storage Rights

The user who uploads league data is the data controller for their own data.
GSE acts as a data processor on their behalf for the purpose of providing the
League Memory Graph service.

Under GDPR Article 28, GSE must have a Data Processing Agreement (DPA) covering:
- Scope of processing
- Nature and purpose of processing
- Data retention period
- Sub-processors (Anthropic/Claude API for recommendations, database hosting provider)
- Security measures

**Before EU launch:** A DPA must be in place. Source gap: DPA has not yet been drafted.

---

### Manager Data: Is Profiling Other Users' Behavior Compliant?

**The situation:** When a GSE user uploads their league draft history, that data
includes the draft picks of all managers in their league. The other managers have
not consented to GSE processing their data, and most are not GSE users.

**Legal analysis (source gap — requires legal counsel review):**

Under GDPR, this is a genuine grey area:
- The data (draft picks) is behavioral data that could constitute personal data
  under the broad GDPR definition if the manager can be identified
- Manager names in a fantasy league may be enough to identify a natural person
  if the league is private and the name is the manager's real name
- Profiling (Manager Genome) of individuals without their consent raises concerns
  under GDPR Articles 6 and 22

**Practical factors that mitigate risk:**
- Fantasy sports draft behavior is low-sensitivity data
- The processing is for the benefit of the uploading user, not for commercial
  exploitation of the profiled managers
- The data is shared within a private league context (not public behavior)
- No Genome data is ever displayed to anyone other than the uploading user

**Recommended posture:**
1. GSE's privacy policy must disclose that the service may analyze behavioral
   patterns from user-uploaded league data that includes other participants
2. Manager Genome data derived from other managers is visible only to the
   uploading user — not to anyone else, including that manager
3. A "privacy mode" option that anonymizes other managers (stores them as
   "Manager A, B, C") may be advisable for EU-focused markets
4. Legal counsel review required before EU launch

---

### Right to Deletion

A user who requests account deletion is entitled to deletion of:
- Account data (email, name, auth credentials)
- Fantasy league data they uploaded
- All derived data: Manager Genome, Regret Analysis, Bias Mirror, Exploit Map
- Decision history
- Voice session transcripts

**What must not be deleted:**
- Aggregate, anonymized calibration statistics (these contain no PII after
  aggregation)
- Financial transaction records (Stripe; subject to financial record-keeping
  obligations, typically 7 years under U.S. law)
- Fraud or abuse records (where there is a legal basis for retention)

**Implementation requirement:**
The deletion pipeline must cascade: account deletion → league data deletion → derived
data deletion → event log anonymization. This is a technical requirement, not just
a policy statement. Must be implemented before launch.

---

### Cross-Border Data Transfer

If GSE uses EU-hosted infrastructure: GDPR data transfer requirements are satisfied
by processing within the EEA.

If GSE uses U.S.-based infrastructure with EU users: A valid transfer mechanism is
required. Options:
1. EU-U.S. Data Privacy Framework (DPF) — if the hosting provider and any
   sub-processors are DPF-certified
2. Standard Contractual Clauses (SCCs) in agreements with sub-processors
3. Binding Corporate Rules (more complex, typically for large organizations)

**Anthropic/Claude API:** If user data (including league memory context in AI prompts)
is sent to the Anthropic API and Anthropic processes it in the U.S., this is a
cross-border transfer of EU personal data. Anthropic's current data processing terms
and DPF/SCC status must be reviewed before using the Claude API with EU user data.

Source gap: Anthropic's current data processing agreement terms, DPF status, and SCC
availability for commercial API customers requires review before EU launch.

**Practical guidance for V1:** Clearly state in the privacy policy which countries
data is processed in and which sub-processors are used. Address EU transfer
mechanisms before actively marketing to EU users.

---

*End of GSE Source Rights, Data Compliance, and Legal Gate Map*

*Nothing in this document constitutes legal advice. All legal claims, statuses,
and postures marked as source gaps must be reviewed by qualified legal counsel
before operational reliance. Positions taken here are the GSE team's current
analytical assessment, not a lawyer's opinion.*
