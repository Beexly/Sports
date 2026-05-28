# Sports OS — Audio and Voice Policy

**Status**: Doctrine. Binding on all agents and operators.
**Source**: Prompt 4 — Final Wave
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/media/media-studio-workflow.md` — media production workflow
- `docs/media/video-brief-pipeline.md` — video production requirements
- `docs/audit/media-automation-risk-policy.md` — automation risk boundaries
- `docs/brain/claim-governance.md` — claim governance applies to spoken claims

---

## Purpose

This policy governs the use of audio and voice in Sports OS media — including
operator-recorded narration, AI-generated voice synthesis, background music,
and audio branding.

The voice is a significant trust signal for a sports intelligence platform.
The wrong voice, the wrong claim spoken aloud, or the use of AI voice without
disclosure can cause immediate brand damage and, in some jurisdictions, may
create legal liability (voice impersonation laws vary by region).

---

## Section 1 — Voice Types and Approval Status

### Operator Voice (Human)

**Status**: Approved. Default preferred.

**Definition**: The operator records their own voice for narration, explanation,
or commentary.

**Rules**:
- No scripted claims that haven't passed claim governance review
- No reading of pick recommendations with certainty language
- Operator voice is attributed to the platform, not identified by personal name
  in public content (Garrett Baxley name must not surface in public media —
  consistent with brand-safety rules)

---

### AI-Generated Voice (Text-to-Speech)

**Status**: Conditionally approved. Requires disclosure. Not for all use cases.

**Permitted use cases**:
- Methodology explainer narration (e.g., "Here is how the evidence chain works")
- Model Journal audio summaries for subscribers
- Pick provenance walkthrough narration (cockpit-style explainer video)
- Galaxy Almanac essay companion audio

**Not permitted use cases**:
- Impersonating a real person (athlete, analyst, broadcaster, or any named individual)
- Creating a recurring AI persona that implies a human host or human analyst
  without disclosure
- Narrating pick recommendations in a voice that implies confident human expertise
  without disclosing the AI source
- Any audio that could be mistaken for a broadcast clip or official league commentary

**Disclosure requirement**: Any content using AI-generated voice must include,
in the description or visually on-screen: "AI-narrated content" or equivalent.
The disclosure must be clear and visible — not buried in the video description.

**Approved tools for AI voice** (must satisfy all criteria):
- Commercial license for voice output permitted
- No voice trained on unlicensed recordings of real individuals
- Voice output does not violate platform Terms of Service for the target distribution channel
- Tool is not on the `docs/audit/piracy-malware-do-not-use-register.md` list

**Operator approval**: Required before any AI voice tool is added to the
production workflow.

---

### Synthetic Athlete Voice

**Status**: PERMANENTLY FORBIDDEN.

Generating a synthetic voice that sounds like, is labeled as, or could be
mistaken for a real athlete, coach, broadcaster, or sports personality is
permanently forbidden. This includes:
- Fine-tuned voice models trained on a specific person's recordings
- AI voice clones marketed as a specific person
- Voice synthesis that mimics a recognizable broadcasting style

The risks are legal (right of publicity, voice likeness laws), ethical
(consent), and brand-damaging (if discovered, this terminates the platform's
credibility).

---

## Section 2 — Music and Audio Licensing

### Background Music

All background music used in Sports OS media must be licensed for commercial use.

**Approved license types**:
- Creative Commons CC0 (public domain)
- Creative Commons CC BY (attribution required — cite the creator)
- Commercial stock music library with a verified commercial license
  (e.g., Artlist, Epidemic Sound, Musicbed — each requires an active subscription)
- Original compositions by the operator (operator retains rights)

**Not approved**:
- Copyrighted commercial music (streaming tracks, chart music) — YouTube
  Content ID will match these and claim revenue or remove the video
- CC BY-NC music used in a commercial context (NC = non-commercial)
- Music from unlicensed libraries or free download sites without explicit license

**Attribution rule**: CC BY music requires attribution in the video description.
Document the attribution before the video is published.

---

### Sound Effects

Same rules as background music — must have a commercial use license.

**Forbidden sound effects**:
- Sports broadcast audio signatures (jingles, theme music from ESPN, NFL broadcasts, etc.)
- Crowd noise samples from specific broadcast events
- Any sound that implies an affiliation with a league or broadcaster

---

### Audio Branding

If Galaxy Sports Edge develops a sonic brand identity (a short audio logo,
a signature sound for pick reveals, etc.):
- Must be original composition or licensed for unlimited commercial use
- Must not use or resemble any existing sports media audio trademark
- Must pass brand safety review before deployment
- Must be documented in this policy once finalized

**Current status**: No audio branding is finalized. No audio branding should be
developed without owner approval.

---

## Section 3 — Claim Governance Applied to Audio

Every spoken claim in any Sports OS audio or video must satisfy the same
claim governance rules as written content. Audio does not receive an exception.

| If the narrator says... | Requirement |
|---|---|
| "Our model is confident on [team]" | Must be accompanied by the confidence score context (not a guarantee) |
| "Win rate of X%" | Must satisfy: ≥30 settled picks, defined window, model version |
| "Sharp money is on [team]" | FORBIDDEN — cannot be spoken without Tier 1/2 backing |
| "This is a lock" | PERMANENTLY FORBIDDEN in any format |
| "Injury report says..." | Must be from Tier 1 or labeled "Unconfirmed" |
| "For entertainment purposes only" | REQUIRED whenever pick content is narrated |

The claim governance scanner in `apps/web/lib/compliance-scanner/rules.ts`
should be run on any narration script before recording begins.

---

## Section 4 — Platform-Specific Audio Rules

### YouTube

- Background music claimed by Content ID will result in: (a) video monetized by rights holder, (b) video blocked in some territories, or (c) video removed. All carry revenue or distribution risk.
- Use music from a library with guaranteed Content ID coverage (Artlist, Epidemic Sound)
- AI voice is permitted but must be disclosed in the video description

### TikTok / Instagram Reels

- Both platforms have audio fingerprinting. Copyrighted music will be detected.
- Use platform-provided licensed audio or approved stock music
- AI voice is permitted with disclosure

### X / Twitter

- No specific audio rules beyond general copyright
- Claim governance applies fully to any audio clip posted

### Podcast / Audio-only

- No current Sports OS podcast. If launched, all rules in this document apply.
- Owner approval required before launching an audio content series.

---

## Section 5 — Production Records

Every audio asset produced must have a production record:

```
Audio Production Record
Asset name: [e.g., "methodology-explainer-v1-narration.mp3"]
Content type: [AI voice | Operator voice | Background music]
Tool used: [e.g., Operator microphone | Eleven Labs | Artlist stock]
License: [commercial license confirmed — reference #]
Claim governance reviewed: [YES / N/A]
Disclosure included: [YES — "AI narration" visible in video | N/A]
Date produced: [ISO date]
Used in: [video title or social post URL]
```

---

## Approval Gates

| Action | Who approves |
|---|---|
| Using AI voice in any public content | Operator per piece |
| Adding a new AI voice tool to the workflow | Owner |
| Background music library subscription | Operator |
| Audio branding development | Owner |
| Any narration of investor-facing content | Owner |

---

## Forbidden Actions

- Do NOT use a real person's voice without their consent
- Do NOT impersonate an athlete, coach, or broadcaster with AI voice
- Do NOT use copyrighted music without a commercial license
- Do NOT use AI voice without disclosure in any public content
- Do NOT narrate any claim that would fail claim governance review
- Do NOT generate a synthetic persona with AI voice that implies a human host
- Do NOT use audio from sports broadcasts without a documented license

---

## Codex Audit Requirements

1. Confirm no text-to-speech or voice synthesis library is installed
   without owner approval
2. Confirm no audio file in `public/` lacks a license provenance record
3. Confirm no narration script references forbidden vocabulary (claim governance
   scanner should run on scripts as text)
4. Report any AI voice tool installed without owner approval as P1
