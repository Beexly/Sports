# Sports OS — Media Studio Doctrine

**Status**: Doctrine only. No media is auto-uploaded or auto-published.
**Source**: Prompt 4 — Final Wave
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `DESIGN.md` — design tokens applied to media
- `docs/design/stitch-agent-workflow.md` — content generation workflow
- `docs/brain/claim-governance.md` — what claims may appear in media
- `docs/audit/prompt-leak-and-sensitive-source-policy.md` — media sourcing rules

---

## Purpose

The Media Studio Doctrine governs how visual and multimedia assets are
created, reviewed, approved, and published for Galaxy Sports Edge.

It defines what media may be created, by whom, using what tools, under what
constraints, and with what approval gates. It applies to all media types:
static images, animated GIFs, social graphics, video thumbnails, and any
other visual asset associated with the Sports OS brand.

---

## Sports OS Fit

Media serves three functions for the platform:
1. **Brand identity** — consistent visual language builds recognition and trust
2. **Content distribution** — social graphics, thumbnails, and GIFs drive reach
3. **Pick presentation** — visual pick cards reinforce the intelligence positioning

The media must honor the design language from `DESIGN.md` and the claim
governance from `docs/brain/claim-governance.md`. A social graphic that shows
a confidence score must follow the same rules as a web pick card showing that score.

---

## Public / Private Boundary

**Public media** (can be published externally):
- Brand graphics (logo, monogram, wordmark in approved forms)
- Social post graphics (pick cards, Model Journal excerpts, Galaxy Almanac quotes)
- Thumbnails for Almanac essays and public blog posts
- Social GIFs for brand moments (launch, milestone announcements)

**Private / internal media** (never published externally):
- Cockpit screenshots with pick data, evidence chains, or source names
- Any image containing a user's personal data
- Any image derived from Tier 5 (community) source content
- Any image that contains internal tool output, agent prompts, or system prompts

---

## Approved Asset Types

### Static Social Graphics

Format: PNG or WebP  
Dimensions: Platform-standard (1200×630 for OG/Twitter card, 1080×1080 for IG square, 1080×1920 for IG Story)  
Colors: From `DESIGN.md` token set only — no off-brand colors  
Typography: Arch or Display family for headlines, Mono for data  
Background: Atmospheric dark — `--carbon` or `--eclipse` base with restrained glow  

**Required elements**:
- GSE monogram or wordmark in the upper left or lower right corner
- Source freshness disclosure if the graphic contains a pick or data claim
- "For entertainment purposes only" if the graphic contains pick content (required)

**Forbidden elements**:
- Sportsbook green background
- Casino imagery (dice, cards, chips)
- Win/loss celebration imagery without settlement confirmation
- Fake confidence visuals (a glowing "99" without an evidence chain)
- Lock emoji, fire emoji, or other tout-adjacent symbols

### Animated GIFs

Format: GIF (max 8MB for Slack/Discord), optimized for web  
Duration: ≤ 8 seconds, loopable  
Frame rate: 12–24fps  
Colors: Restricted to the design token palette — no off-brand colors  

**Use cases**:
- Brand launch announcements
- Galaxy Studio social moments (not pick promotions)
- Mission Control / Observatory visual moments
- Error or empty state illustrations

**Forbidden GIF uses**:
- Animated pick performance (e.g., a counter ticking up a win rate)
- Animated confidence score changing in real time
- Any imagery that could be interpreted as gambling promotion

### Video Thumbnails

Format: PNG or JPG, 1280×720  
Style: Consistent with static social graphic rules  
Text: Kept minimal — one headline, one eyebrow label  

**Forbidden**:
- Stock photo of sports betting / chips / dice
- Generic "fire" background
- Text claiming guaranteed outcomes

### OG / Social Meta Images

The `/api/og` route generates OpenGraph images programmatically.
These are internal web assets, not external media.
They must comply with all public media rules above since they are user-facing.

---

## Media Creation Tools

### Approved Tools

- **Figma** — UI design, pick card mockups, social graphics (operator-controlled)
- **Canvas design skill** — programmatic PNG/SVG generation via Claude tools
- **Standard image editing** (Photoshop, Affinity Photo) — operator-run
- **Canva** — social graphics via approved Canva connector (operator-controlled)

### Restricted Tools

- **AI image generation** — Only for brand-approved illustration contexts.
  May NOT be used to generate:
  - Images of real athletes, coaches, or public figures
  - Images implying real sporting events
  - Pick result visualizations
  - Any image that could be mistaken for factual sports photography

  When AI image generation is used: the image must be reviewed by the operator,
  must not depict real people, and must include the GSE brand context.

- **Stock photo libraries** — Only licensed stock. No watermarked or
  unauthorized images. No images from sites identified in
  `docs/audit/piracy-malware-do-not-use-register.md`.

### Forbidden Tools

- Any pirated, cracked, or unlicensed software — see
  `docs/audit/piracy-malware-do-not-use-register.md`
- Any tool that auto-publishes media without operator review
- Any tool that leaks Sports OS content or system prompts to external parties

---

## Media Claim Governance

Media that contains intelligence claims — pick directions, confidence scores,
win rates, injury statuses — must follow the same claim governance rules as
text content:

| Claim type in media | Rule |
|---|---|
| Pick direction | Must include source freshness disclosure |
| Confidence score | Must include "not a guarantee" context |
| Win rate | Requires ≥30 settled picks, defined window, model version |
| Injury status | Must be labeled Tier 1 or "Unconfirmed" |
| Sharp money claim | Requires Tier 1/2 backing — never from line movement alone |
| "Lock" imagery | Forbidden — lock icon implies guaranteed outcome |

---

## Source Evidence and R&D Rationale

The media doctrine exists because:
1. Social graphics are the highest-reach surface for the brand — they reach
   users who never visit the site, and a graphic containing a bad claim (a
   "lock" pick, a fabricated win rate) creates liability before any web visit
2. AI-generated imagery creates real-person impersonation risk if not governed
3. Auto-publish workflows without governance are the fastest path to a brand-
   safety incident

The R&D batch reviews (Batch 0–6) identified multiple reference platforms
that used social graphics to distribute tout-adjacent content. Sports OS media
is explicitly counter-positioned against that pattern.

---

## Approval Gates

| Gate | Who approves | What unlocks |
|---|---|---|
| New media asset type | Operator | New format or dimension standard |
| AI image generation use | Operator | Each new use case requires sign-off |
| Social graphic with pick data | Operator per graphic | Individual review before posting |
| Media tool addition | Operator | New tool enters approved list |
| Auto-publish capability for media | Owner | Never — all media requires operator post action |

---

## Forbidden Actions

- Do NOT auto-upload any media to any external platform (social, CDN, etc.)
- Do NOT generate images of real athletes or public figures using AI tools
- Do NOT use images from unlicensed, watermarked, or pirated sources
- Do NOT use a stock photo of a sportsbook, casino, or betting scene
- Do NOT include forbidden claim language (locks, guaranteed) in any graphic
- Do NOT publish media containing cockpit screenshots or internal data views
- Do NOT use AI image generation to create pick result visualizations
- Do NOT generate GIFs showing win-rate counters or animated confidence scores

---

## MVP Path

1. Brand graphics (logo, monogram) — operator-created in Figma ✅ (existing)
2. Social GIFs for launch moments — created per `stitch-agent-workflow.md`
3. OG images — auto-generated by `/api/og` with governance ✅ (existing)
4. Social post graphics — operator creates in Canva or Figma, posts manually
5. Video thumbnails — operator-created when Almanac video content begins

---

## Validation Expectations

- No media file in the repository contains personal data of real athletes
- No media asset uses forbidden claim language
- Brand safety audit confirms no sportsbook imagery in any public asset
- OG image generator produces correct brand elements (monogram, tagline, carbon bg)
- All social graphics posted link back to content with a source freshness disclosure

---

## Codex Audit Requirements

1. Confirm `/api/og` generates brand-compliant images (correct bg, text, monogram)
2. Confirm no auto-publish pipeline exists for any media type
3. Confirm no media assets in `public/` contain real-person AI-generated images
4. Confirm no media assets in `public/` use casino/sportsbook imagery
5. Confirm GIF assets are within size limits for their target platforms
6. Report any auto-upload workflow as a P0 violation
