# Sports OS — Video Brief Pipeline

**Status**: Doctrine only. No automated video production. All video output requires operator creation and review.
**Source**: Prompt 4 — Final Wave
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/media/media-studio-workflow.md` — general media production workflow
- `docs/design/obs-inspired-scene-system.md` — scene types and source rules
- `docs/audit/media-automation-risk-policy.md` — automation risk boundaries
- `docs/brain/claim-governance.md` — what claims may appear in video content

---

## Purpose

This document defines the structure for video content briefs at Galaxy Sports
Edge — the planning documents that govern what a video will contain, what
claims it will make, what data it will reference, and what approvals it needs
before production begins.

A video brief is not a script. It is the planning layer that ensures a video
is safe to produce before production resources are committed.

---

## Video Content Categories

Sports OS produces video for four distinct purposes:

| Category | Purpose | Audience | Typical length |
|---|---|---|---|
| **Methodology Explainer** | Explains how Sports OS produces intelligence | Public — new users | 2–5 min |
| **Galaxy Almanac Companion** | Visual companion to a published Almanac essay | Public — subscribers | 5–15 min |
| **Investor / Partner Demo** | Demonstrates platform capability for business audiences | Private — investor/partner | 3–8 min |
| **Social Clip** | Short-form intelligence brief or brand moment | Public — social audiences | 30–90 sec |

Each category has different claim governance requirements and approval gates.

---

## Brief Template

The following fields are required for every video brief before production begins:

```
VIDEO BRIEF

Title: [working title]
Category: [Methodology Explainer | Almanac Companion | Investor Demo | Social Clip]
Target platform(s): [YouTube | Instagram Reels | X | Internal | TikTok]
Target length: [e.g., 3-5 minutes]

Key message (one sentence):
[The single thing the viewer should understand after watching.]

Data and claims referenced:
[List every data point, pick, confidence score, win rate, or intelligence claim
that will appear in the video. For each, document the source tier and whether
it satisfies claim governance rules.]

Claim governance pre-check:
[ ] No "lock" or "guaranteed" language
[ ] No win rate claims without ≥30 settled picks, defined window, model version
[ ] No confidence scores without "not a guarantee" context
[ ] No sharp money claims without Tier 1/2 backing
[ ] "Entertainment purposes only" will be visible if pick content is present

Rights and attribution:
[List any footage, music, imagery, or third-party content. Confirm license status.]

Required brand elements:
[ ] GSE monogram or wordmark
[ ] "For entertainment purposes only" (if pick content)
[ ] Source attribution if licensed data is referenced

Approvals required:
[ ] Operator sign-off on brief
[ ] Owner sign-off (if win rate performance claims are included)
[ ] Legal review (if investor demo contains financial performance projections)

Production notes:
[Any technical notes — screen recording vs. scripted video, AI narration vs.
operator voice, animation requirements, etc.]
```

---

## Category-Specific Requirements

### Methodology Explainer

**Claim governance level**: Moderate — explains HOW picks are made, not WHAT picks are.

**Required elements**:
- Clear explanation that AI is used for content generation, not for generating picks
- Source tier taxonomy explanation (T1–T6 system)
- Confidence score calibration explanation ("calibrated against historical results — not a guarantee")
- "For entertainment purposes only" in video description and on-screen

**Forbidden elements**:
- Past win rate claims (unless satisfying full claim governance requirements)
- Claims about future pick accuracy
- "Our AI predicts..." framing

**Approval**: Operator. No owner approval required unless performance claims are included.

---

### Galaxy Almanac Companion

**Claim governance level**: Full editorial review — Almanac essays may contain
data-backed historical analysis.

**Required elements**:
- Source citation for every data point referenced in the video
- Clear delineation between historical analysis and forward-looking context
- Tier 1/2 source backing for any quantitative claim

**Forbidden elements**:
- Pick recommendations embedded in an Almanac companion video
- Confidence scores for future games

**Approval**: Operator reviews script and video before publish.

---

### Investor / Partner Demo

**Claim governance level**: Highest — investor audiences may make financial decisions.

**Required elements**:
- Clear statement that past performance does not guarantee future results
- "For entertainment purposes only" if pick content is demonstrated
- Accurate representation of current product state (no vaporware demonstrations)
- No fabricated performance statistics

**Forbidden elements**:
- Performance projections without historical data backing
- Fabricated user counts, subscription numbers, or accuracy rates
- Demonstration of features not yet built as if they are live

**Approval**: Owner approval required before any investor demo is produced or shared.

---

### Social Clip

**Claim governance level**: Highest urgency — widest reach, most visible.

**Required elements**:
- GSE branding clearly visible
- "For entertainment purposes only" on-screen
- Source freshness disclosure if pick data is referenced
- 90-second maximum (most platforms have optimal performance at 30–60 sec)

**Forbidden elements**:
- All tout-adjacent vocabulary (locks, guaranteed, fire, sure thing)
- Win rate claims unless fully governance-compliant
- Sports highlight footage without license

**Approval**: Operator per clip. No social clip auto-schedules without per-clip review.

---

## Video Production Rules

### AI Assistance in Video Production

**Permitted**:
- Script draft generation via Claude API (operator reviews and edits before recording)
- Slide content generation for methodology explainers (operator reviews all slides)
- Title and description copy generation for operator review

**Not permitted**:
- Auto-generation and upload of video to any platform
- AI voiceover without disclosure ("AI narration" must be visible or audible)
- AI-generated sports footage or synthetic athlete footage of any kind
- AI-generated clips that imply live or real-time data when data is not live

### Screen Recording Rules

Screen recordings showing the Sports OS cockpit must:
- Blur or redact internal source IDs and reliability scores
- Blur or redact any user-specific data
- Only record the portion of the cockpit approved for the specific video category
- Have operator approval before recording begins

### Footage and Music Rules

- No sports broadcast footage without documented license
- Music must be from a library with a commercial use license (documented)
- No third-party brand logos without permission
- No real athlete footage from sources other than officially licensed imagery

---

## Post-Production Checklist

Before any video is published:

- [ ] Video matches the approved brief
- [ ] All claims in the video passed governance review
- [ ] All rights and attribution are documented
- [ ] Brand elements are present and correct
- [ ] "Entertainment purposes only" is visible (if applicable)
- [ ] AI narration is disclosed (if applicable)
- [ ] No cockpit data with internal identifiers is visible
- [ ] Operator has reviewed the final cut
- [ ] Owner has approved (if required by category)

---

## Approval Gates

| Category | Brief approval | Production approval | Publish approval |
|---|---|---|---|
| Methodology Explainer | Operator | Operator | Operator |
| Almanac Companion | Operator | Operator | Operator |
| Investor Demo | Owner | Owner | Owner |
| Social Clip | Operator (per clip) | Operator | Operator |

---

## Forbidden Actions

- Do NOT begin production without a completed brief
- Do NOT include pick performance data without full claim governance compliance
- Do NOT use sports broadcast footage without a license
- Do NOT publish an investor demo without owner approval
- Do NOT use AI voice without disclosure
- Do NOT auto-publish any video to any platform

---

## Codex Audit Requirements

1. Confirm no video production library (ffmpeg wrapper, video generation SDK)
   is installed as a dependency without owner approval
2. Confirm no YouTube, TikTok, or Instagram upload API is wired to any endpoint
3. Confirm no auto-publish scheduler targets any video platform
4. Report any auto-upload capability as P0
