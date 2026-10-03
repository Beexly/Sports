# Sports OS — Media Automation Risk Policy

**Status**: Doctrine. Binding on all agents and operators.
**Source**: Prompt 4 — Final Wave
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/design/media-studio-doctrine.md` — approved media types and creation rules
- `docs/design/obs-inspired-scene-system.md` — scene production architecture
- `docs/audit/prompt-leak-and-sensitive-source-policy.md` — sensitive source rules
- `docs/media/youtube-automation-boundaries.md` — platform-specific automation limits

---

## Purpose

This policy governs the risks introduced by media automation — any system
that generates, assembles, schedules, or distributes media content (video,
audio, images, social posts) without full human review at each step.

Media automation is high-risk for Sports OS because:

1. **False claim propagation**: Automated media can distribute a bad pick claim
   (a fabricated win rate, a "lock" framing) to thousands of followers before
   an operator can intervene.

2. **Copyright exposure**: Automated content that ingests sports footage, music,
   or imagery from unlicensed sources creates immediate legal liability.

3. **Brand safety failures**: Auto-generated thumbnails or social graphics that
   use casino imagery, tout vocabulary, or real-athlete deepfakes can permanently
   damage the platform's positioning.

4. **Platform ToS violations**: YouTube, TikTok, Instagram, and X all have
   automated content policies. Violating them risks account suspension on
   platforms central to the distribution strategy.

---

## Section 1 — Automation Risk Classification

Each level of automation in the media pipeline carries a specific risk tier:

| Automation level | Description | Risk tier | Approval required |
|---|---|---|---|
| **Manual** | Operator creates, reviews, and posts every piece of content | Low | None — standard workflow |
| **Draft-assisted** | AI assembles a draft; operator reviews every element before post | Medium | Operator review of each draft |
| **Template-assisted** | AI fills a pre-approved template; operator spot-checks | Medium-High | Operator approval of template + spot-check cadence |
| **Scheduled posting** | Operator pre-approves content; a scheduler posts at set times | High | Owner approval of scheduling capability |
| **Fully automated** | System generates AND posts without operator review | CRITICAL — FORBIDDEN | Never permitted |

**Rule**: Fully automated media generation and posting is permanently forbidden.
No implementation of auto-post, auto-upload, or auto-publish to any external
platform is permitted under any circumstances.

---

## Section 2 — Platform-Specific Automation Risk Register

### YouTube

**Risk profile**:
- YouTube's Automated Content policy: Repetitive or auto-generated content
  is subject to demonetization, removal, and channel strikes.
- Sports footage: NFL, NBA, MLB, and other leagues aggressively enforce
  copyright on broadcast clips. Any automated system that processes sports
  footage for thumbnails or B-roll creates immediate DMCA exposure.
- "Reaction" or "commentary" content: Fair use is not automatic and is a
  defense, not a right. Automated commentary on sports events without legal
  review is high-risk.

**Sports OS position**: YouTube is a long-form distribution channel for
operator-created methodology explainers and Galaxy Almanac essay companion
videos. No automated YouTube upload system is permitted.

**Approved**: Operator-recorded and operator-uploaded content only.  
**Forbidden**: Any automated upload, any sports footage use without license,
any system that programmatically creates YouTube videos.

### TikTok / Instagram Reels / YouTube Shorts

**Risk profile**:
- Short-form video with music is the highest copyright-risk format. Automated
  music selection from unlicensed libraries creates immediate liability.
- Auto-posting to these platforms via third-party tools may violate their ToS.
- Sports highlight clips are aggressively flagged by league copyright detection.

**Sports OS position**: Short-form video is a future Galaxy Studio goal.
All short-form video must be operator-created and operator-posted.

**Approved**: Operator-created clips, posted manually or via approved scheduler
(with owner approval of the scheduling capability).  
**Forbidden**: Any automated clip generation system, any sports highlight
use without a documented license, any AI-voice-over that impersonates a
real person.

### Twitter/X

**Risk profile**:
- X's API pricing and ToS changes since 2023 restrict many automation patterns.
- Auto-posting via API requires a developer account with explicit authorization.
- Pick claims on X are subject to the same claim governance rules as any
  other public surface.

**Sports OS position**: The Twitter bot (see `docs/product/twitter-bot-voice-spec.md`)
is an approved future channel. Posting via API is operator-approved. No
auto-posting of picks without operator review of each post.

**Approved**: Twitter/X API posting of operator-reviewed content via approved bot.  
**Forbidden**: Auto-posting of unreviewed picks, auto-reposting of community
content, manipulation of engagement metrics.

### Instagram

**Risk profile**:
- Instagram prohibits automated follows, likes, and comments under their ToS.
- Image content claiming sports picks is regulated similarly to other platforms.

**Sports OS position**: Instagram is a brand awareness channel. Pick graphics
are posted manually by the operator. No automation of engagement actions.

**Approved**: Operator-manually-posted brand graphics and pick content.  
**Forbidden**: Any automation of follows, likes, comments, or direct messages.

---

## Section 3 — MoneyPrinter / Automated Video Risk Reference

The "MoneyPrinter" and "MoneyPrinterTurbo" pattern (referenced in Prompt 4
source references) represents a category of automated video production tools
that:
- Generate video scripts from AI models
- Programmatically create slides or animations
- Synthesize AI voiceovers
- Auto-upload to YouTube or TikTok

**Sports OS position**: This pattern is FORBIDDEN for the following reasons:

1. **Claim governance bypass**: AI-generated scripts are not reviewed by the
   claim governance scanner by default. A sports intelligence pick claim
   generated and auto-published without review violates the platform's core
   safety model.

2. **Fake persona risk**: AI voiceover systems can produce content that
   implies human authorship. Sports OS may not create media that deceives
   users about whether content is human or AI-generated.

3. **Platform ToS**: Fully automated video generation and upload violates
   YouTube's policies on auto-generated repetitive content.

4. **Copyright**: These tools often use unlicensed music and imagery.

**What Sports OS may use instead**:
- Text-to-speech for narration with explicit AI disclosure ("AI narration")
- Automated slide assembly from pre-approved design templates (with operator review)
- Scheduled posting of operator-pre-approved content (with owner approval)

None of these involve auto-publishing without operator review.

---

## Section 4 — AI Voice and Persona Policy

Sports OS may use AI-generated voice for:
- Methodology explainer narration (must be disclosed as AI voice)
- Model Journal audio summaries (must be disclosed as AI voice)

Sports OS may NOT use AI-generated voice for:
- Impersonating a real person (athlete, analyst, broadcaster)
- Creating a "sports analyst persona" without disclosing it is AI
- Narrating pick recommendations in a way that implies confident human expertise

**Disclosure rule**: Any content using AI-generated voice must include a
visible or audible disclosure: "AI-narrated content."

---

## Section 5 — Copyright and Rights Management

All media produced by Sports OS must satisfy:

| Content type | License required | Notes |
|---|---|---|
| Sports team logos | Yes — licensed or fair use for editorial | Fair use for commentary; not for commercial use |
| League broadcast footage | Yes — strict | NFL/NBA/MLB aggressively enforce; do not use without license |
| Player images | Case-by-case | Editorial use for commentary; commercial use requires license |
| Background music | Yes — CC or licensed | YouTube Content ID will match unlicensed music and may claim revenue or remove video |
| Stock imagery | Yes — licensed | See `docs/audit/piracy-malware-do-not-use-register.md` |
| Original AI-generated images | Yes — verify model's commercial use terms | Do not use if model's license prohibits commercial output |

---

## Forbidden Actions

- Do NOT implement any system that auto-posts to any external platform
- Do NOT use sports broadcast footage without a documented license
- Do NOT use AI voice to impersonate a real person
- Do NOT implement a MoneyPrinter-style auto-upload video pipeline
- Do NOT use unlicensed background music in any media output
- Do NOT auto-generate pick content that is not reviewed by the claim governance scanner
- Do NOT create content that misleads users about whether content is AI-generated
- Do NOT automate engagement actions (follows, likes, comments) on any platform

---

## Approval Gates

| Action | Who approves |
|---|---|
| Any scheduled posting capability | Owner |
| Any new content automation tool | Owner |
| AI voice in any public content | Operator per piece, with disclosure |
| Sports footage use | Owner + legal review |
| Third-party music use | Operator verifies license before use |
| AI-generated imagery in public content | Operator per image |

---

## Validation Expectations

- No auto-post endpoint exists in `apps/web/` or `workers/`
- No scheduled task auto-publishes media without operator review
- All AI-voiced content includes disclosure metadata
- Copyright clearance is documented for any licensed media used

---

## Codex Audit Requirements

1. Confirm no auto-post or auto-upload endpoint exists in any API route
2. Confirm no scheduled worker publishes to external platforms without
   operator approval gate
3. Confirm no AI voice synthesis library is installed as a dependency
   without owner approval
4. Confirm no sports footage files exist in `public/` without documented license
5. Report any auto-publish capability as a P0 violation
