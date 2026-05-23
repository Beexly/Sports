# Synthetic Media Monetization R&D Audit

Date: 2026-05-23
Auditor: Codex
Related decision: DEC-NEXT-015
Source archive inspected: `C:/Users/Garrett/Downloads/XXX-main (1).zip`

## Decision log entry

### DEC-NEXT-015 - Treat synthetic-media archive as architecture reference only

**Decision:** Galaxy can borrow operating-system patterns from the uploaded synthetic media archive, but should not import the adult-generator, scraper, URL-corpus, or classifier repos as production code until each candidate dependency has a separate license, safety, and brand-position review.

**Rationale:** The archive is most useful as a product architecture brief, not as a codebase. The strongest reusable ideas are repo ingest, compliance gates, persona identity control, brief generation, realism QA, asset metadata, draft-only publishing, and experiment tracking. Direct code reuse introduces brand, license, scraping, adult-content, and platform-policy risk.

**Guardrail:** Any future synthetic host or video workflow must remain SFW, adult-presenting, clearly synthetic when asked or when platform policy requires, non-impersonating, and separated from Galaxy's deterministic model. No workflow may imply a real person endorsed Galaxy, no workflow may scrape real creators, and no workflow may make sports outcome promises.

## What I inspected

The archive extracted safely into a temporary review folder after a zip-slip path check. It contains six files:

| File | Lines | Finding |
|---|---:|---|
| `README.md` | 2 | Labels the project as "Adult Agents." |
| Archive design doc | 1,465 | Master product/engineering prompt for a Synthetic Media Command Studio. |
| `research/input-zips/.gitkeep` | 1 | Placeholder. |
| `research/summaries/.gitkeep` | 1 | Placeholder. |
| `research/summaries/deep_static_repo_audit.json` | 7,963 | Machine-readable audit of 14 prior archives. |
| `research/summaries/full_text_scan_counts.json` | 538 | Counts showing how much text was fully read from the 14 prior archives. |

I read the markdown design file and parsed both JSON summaries. The JSON summaries claim prior full-text reads across the smaller text files and bounded reads across the very large corpora. I did not execute any imported code.

## Source archive reuse map

| Source family in audit | Reuse decision | Galaxy use |
|---|---|---|
| `PhoenixAdult.bundle-master.zip` | Extract pattern | Metadata architecture: title parsing, tag cleanup, source matching, library postprocessing, status logging. |
| `nsfwjs-master(1).zip` | Extract pattern | Classifier adapter shape for internal QA, after license and dependency review. Do not rely on it as a final compliance decision-maker. |
| `nsfw_model-master(1).zip` | Extract pattern | Backend classifier API wrapper ideas, after license and model review. |
| `nsfw-resnet-master(1).zip` | Extract pattern | PyTorch/ResNet inference shape only; sample media must not ship. |
| `nsfw_data_scraper-main(1).zip` | Extract pattern only | Queue, URL normalization, logging, Docker wrapper patterns. Do not use scraping targets. |
| `nsfw_data_source_urls-master*` | Reference only | Blocked/review taxonomy construction only. Do not scrape, train, download, or copy real content. |
| `open_nsfw-master(1).zip` | Reference only | Legacy thresholding baseline only. |
| `Sandstorm-Station-13-master.zip` | Reference only | Governance patterns: roles, permissions, admin logs, events, moderation, CI discipline. |
| README-only generator repos | Discard code, reference copy | Competitor promise/risk language only. |

## Reusable architecture for Galaxy

The useful product is not "generate a clip." The useful product is a Galaxy Content Command Center that turns existing Galaxy artifacts into compliant short-form drafts.

Core modules worth adapting:

1. **Content brief builder.** Converts a Galaxy artifact into a short-form brief: objective, target surface, hook, script, visual treatment, CTA, risk flags.
2. **Persona registry.** Maintains synthetic host identities, wardrobe grammar, camera grammar, voice constraints, prohibited traits, and disclosure metadata.
3. **Compliance engine.** Blocks hidden synthetic-person deception, real-person likeness, underage-coded framing, sportsbook affiliate drift, betting outcome claims, and platform-policy risk.
4. **Realism QA.** Scores whether a synthetic host/image feels plausible without becoming deceptive: ordinary lighting, natural posture, imperfect framing, consistent face, no over-polished glamour default.
5. **Asset vault.** Stores generated scripts, images, voiceover drafts, thumbnails, captions, platform eligibility, and reuse notes.
6. **Draft-only publisher.** Produces YouTube Shorts, TikTok, X video, Instagram/Reels, and internal review packages as drafts. No auto-posting in V1.
7. **Experiment tracker.** Tracks series, platform, hook, artifact source, CTA, views, click-through to Galaxy surfaces, and conversion to email/Vault/Almanac.
8. **Repo-ingest scanner.** Keeps future downloaded tools from contaminating Galaxy with unsafe code, licenses, or scraping workflows.

## Galaxy-specific content ladder

The strongest monetization path is not a separate synthetic creator business bolted onto Galaxy. It is an owned media ladder:

Public social video -> specific Galaxy artifact -> email capture -> paid product.

Recommended series:

| Series | Source artifact | Format | CTA | Brand fit |
|---|---|---|---|---|
| Loss Room in 30 seconds | New autopsy | One factor, one assumption, one lesson | Read the autopsy | High |
| Why We Passed | Pass List entry | One close pass, why the floor held | Read the Pass List | High |
| Methodology Minute | Methodology page | One concept: calibration, confidence floor, versioning | Read methodology | High |
| Ledger Recap | Settled picks | Record-only recap, no celebration | Read the Ledger | Medium |
| Almanac Desk | Almanac essays | Annual record snippets | Reserve Almanac | High after Almanac activates |
| Vault Preview | Vault digest, public-safe excerpt | One rationale preview without member-only data | Apply to Vault | Medium; use sparingly |
| Live Overlay Demo | Live OBS PRD | 20-30 second stream-style overlay demo | Partner inquiry | High once Live activates |

## Synthetic host recommendation

The user idea has commercial energy, but it needs a brand-safe shape.

Recommended framing: **Galaxy synthetic desk hosts**, not "sexy housewives."

Allowed V1 host style:

- Adult-presenting, SFW, fictional, non-celebrity, non-real-person.
- Natural domestic, studio, office, gym, or sports-bar-adjacent settings.
- Wardrobe can be attractive but not explicit: fitted casual clothing, sports-network desk look, sweater/jeans, neutral dress, team-color accents without implying league affiliation.
- The host never claims to be Garrett, never claims betting success, never implies personal expertise as a real analyst, and never answers member-specific questions.
- The host introduces or narrates Galaxy artifacts: "A pass from today's board," "One autopsy worth reading," "What calibration means."
- Disclosure is built into profile bios and platform descriptions. On-screen disclosure can be lightweight if platform policy permits, but should never be hidden if asked.

Disallowed V1 host style:

- Real-person likenesses, celebrity lookalikes, face swaps, or "make her look like X."
- Underage-coded terms, school/teen framing, or ambiguous age presentation.
- Explicit sexual positioning, lingerie-first creative, adult-platform funneling, or "lonely DM" parasocial hooks.
- Sportsbook affiliate promotion.
- Outcome-promise language.
- Non-public-information framing.
- Anything that makes Galaxy feel like a tout brand wearing a synthetic face.

## Monetization routes

### Route 1 - Artifact-to-Vault funnel

Use short-form clips to send viewers to public proof surfaces. The conversion path is restrained:

1. Clip explains one artifact.
2. Link goes to `/loss-room`, `/passes`, or `/methodology`.
3. Page offers quiet email capture or `/vault`.
4. Vault sells rationale, not picks.

This is the safest near-term route because it amplifies what Galaxy already is.

### Route 2 - Almanac pre-order media

When Almanac activates, build a 12-week video run:

- Weekly "record of the year" clip.
- One chart or claim from the annual record.
- CTA to Almanac pre-order.

Do not use high-energy launch language. Make the book feel like the annual record, not merch.

### Route 3 - Live partner demo clips

Once Live is active, use synthetic or screen-recorded hosts to demonstrate the overlay:

- 15-second cold open.
- Overlay appears over a mock stream scene.
- CTA to partner inquiry.

This supports creator BD without requiring Garrett to become the face of a creator channel.

### Route 4 - Merch as brand object

Merch should not lead. If used, make it artifact-based:

- Loss Room / Pass List / Methodology typography.
- Almanac companion objects.
- Minimal Galaxy desk-host visuals only after a host proves audience fit.

Avoid selling synthetic-host merch before the host is trusted; that would reverse the brand order.

### Route 5 - B2B content ops licensing

Longer-term, the command-center patterns themselves can become a service:

- "Transparent sports research content pipeline" for media companies.
- Artifact-based short-form production system.
- Compliance/audit workflow for sports analytics publishers.

This is Year 2+ only. It should not distract from Vault launch.

## Engineering implementation sequence

### Phase 0 - Policy gate

Create a synthetic-host policy before generating public assets. Include disclosure, persona limits, platform review, and brand-safety rules.

### Phase 1 - Galaxy Content Brief schema

Add a lightweight content-brief model or markdown template:

- source artifact
- target platform
- script
- visual style
- host/persona
- CTA
- prohibited claims
- brand-safety scan result
- approval status

### Phase 2 - Draft generator

Start text-only:

- Generate 10 scripts from existing Loss Room / Pass List / Methodology docs.
- Garrett approves or rejects.
- No images yet.

### Phase 3 - Synthetic host prompt library

Build 3 SFW host prompt profiles:

- Desk analyst.
- Domestic-lifestyle explainer.
- Field correspondent.

Each profile gets camera grammar, wardrobe grammar, negative prompts, disclosure metadata, and QA checklist.

### Phase 4 - Video assembly

Only after scripts work:

- Generate still host frames or short clips.
- Add voiceover, captions, and artifact screenshot.
- Export vertical 1080x1920.
- Store in asset vault as draft, not auto-posted.

### Phase 5 - Platform test

Run a 4-week controlled test:

- 2 clips/week max.
- One platform first.
- CTA only to public proof surfaces.
- Measure clicks to Galaxy pages, not vanity engagement.

## Immediate next buildable artifact

Build a "Galaxy Short-Form Content Lab" document, not app code:

1. Ten script templates.
2. Three synthetic host profiles.
3. Brand-safety checklist.
4. Approval workflow.
5. Four-week experiment plan.

This can be done without touching production and without distracting from Vault engineering.

## Open risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| Brand-position dilution | Synthetic hosts can make Galaxy look personality-led or promotional. | Host explains artifacts; Galaxy remains method-led. |
| Platform policy drift | Short-form platform rules change often. | Verify current policies before publishing. |
| Hidden synthetic identity | A realistic host can become deceptive. | Profile disclosure, no real-person claims, no real-person likenesses. |
| Adult/SFW contamination | Source archive has adult tooling and risky taxonomies. | Use only SFW synthetic-host lane for Galaxy. |
| Sportsbook/tout drift | Video growth can pull toward betting hype. | CTA to Loss Room, Pass List, Methodology; no outcome-promise language. |
| Founder distraction | Content factory can consume the Vault launch window. | Keep this as R&D until Vault Day 30 unless Garrett explicitly promotes it. |

## Recommendation

Proceed, but do it in Galaxy's order:

1. Vault remains first.
2. Synthetic media becomes an R&D lane, not an active monetization track.
3. Build the command-center docs and templates now.
4. Do not ship public synthetic-host clips until after Vault launch stability.
5. When tested, use the synthetic host as a narrator of Galaxy artifacts, not as the product.

The archive is useful. The caution is equally useful. Its best lesson is that the generator is not the business; the operating system around the generator is.
