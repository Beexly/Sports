# Airwave Listener Worker — Scaffolding (Dry-Run Only, v1)

> **Status: DRY-RUN SCAFFOLDING ONLY. No live capture is implemented.**
> This README describes the intended architecture for a future local listener
> worker. No audio is captured, recorded, transcribed, or archived by this module.

---

## What This Worker Is (Future)

The Airwave Listener is an **out-of-process worker** that will eventually handle:

1. **Local audio routing** — capture audio from a personally-owned subscription
   during a defined show schedule window (05:00–23:00 CT)
2. **Segment slicing** — rolling ~10-minute temporary segments
3. **Transcription** — Whisper-class local transcription + speaker diarization
4. **Claim extraction** — structured `ClaimCandidate` rows from transcript
5. **Review queue handoff** — rows delivered to `/cockpit/airwave` review queue

**Nothing is retained:** segments are deleted immediately after extraction.
**Nothing is published:** all rows start as `DRAFT` and require operator approval.
**Nothing is automated end-to-end:** human review gate before any output.

---

## What This Worker Is NOT

| Forbidden | Reason |
|---|---|
| Protected stream scraper | SiriusXM terms prohibit API/endpoint access |
| Credential bot | No automated login or account management |
| DRM bypass | No circumvention of any content protection |
| Direct stream ripper | No recording of protected streams |
| Long-term audio archive | No audio files are retained after extraction |
| Public verbatim transcript | No verbatim text published at any point |
| Automated publisher | All claims require operator review before any output |

---

## Gates Required Before Any Live Implementation

This worker MUST NOT be made live until all of the following are confirmed:

- [ ] `AIRWAVE_ENABLED=true` — master switch set by operator
- [ ] `AIRWAVE_SIRIUSXM_LEGAL_ACK=true` — human-signed legal acknowledgement
- [ ] Legal review of personal subscription listening posture (counseled)
- [ ] Paraphrase-only posture confirmed in writing
- [ ] Segment ephemeral deletion confirmed in implementation
- [ ] No verbatim text retention confirmed in implementation
- [ ] Review queue gate implemented (no row reaches public without approval)

---

## v1 Dry-Run Plan (Safe Now)

The v1 worker is a **dry-run only**:

```typescript
// workers/airwave-listener/dry-run.ts (not yet created)
//
// Reads show schedule from channel-87-schedule.ts
// Checks isWithinChannel87Window(hourCt)
// Reports: which show would be active, what would be captured
// Does NOT: capture audio, access any stream, activate any adapter
//
// Output: DryRunCapturePlan (from apps/web/lib/airwave/pipeline.ts)
```

Run: `npx ts-node workers/airwave-listener/dry-run.ts`
Expected output: shows current hour, window status, next show block, what would happen if gates were open.

---

## Future Local Listener Architecture (When Gates Open)

### Windows Local Audio Routing Concept

```
SiriusXM app (personal subscription)
  → Windows Virtual Audio Cable (or OS loopback)
  → Worker audio input stream
  → Rolling 10-minute segment buffer
  → Segment saved to TEMP (deleted after transcription)
  → faster-whisper / whisper.cpp (local, on-device)
  → Speaker diarization
  → LLM extraction pass (cheap model)
  → ClaimCandidate[] → review queue
```

**No protected endpoints accessed.** The OS loopback captures locally-routed audio
from a subscription you personally own — equivalent to a person taking notes while listening.

### Possible Future Adapters (No Commitment)

| Adapter | License | Notes |
|---|---|---|
| Windows loopback audio | OS-native | No license needed; OS feature |
| FFmpeg (segment slicing) | MIT / LGPL | Widely used; segment-level use |
| faster-whisper | MIT | Local Whisper; runs on-device |
| whisper.cpp | MIT | C++ local Whisper; edge-capable |
| Pyannote speaker diarization | MIT | Speaker attribution |

None of these bypass DRM. None access protected streams. All operate on locally-routed
audio from a personally-owned subscription.

---

## Output Contract

The worker produces `ClaimCandidate[]` conforming to `claim-extraction-contract.ts`:

```typescript
// Required fields on every output row:
{
  id: string,
  aired_at_ct: string,           // ISO CT timestamp
  channel: "CH87",
  source_policy_id: "satellite_radio_context",
  show: string,                  // from channel-87-schedule.ts
  segment: string,               // show block identifier
  speaker: string,               // diarized speaker label
  paraphrased_claim: string,     // PARAPHRASE — never verbatim
  sport: string,
  league: string,
  entity: string,
  entity_type: ClaimCandidateEntityType,
  claim_type: ClaimCandidateClaimType,
  confidence_language: ...,
  actionability: ...,
  evidence_type: "on_air_statement",
  rights_status: "licensed",     // founder subscription
  operator_status: "DRAFT",      // always starts as draft
  source_pointer_private: ...,   // internal only, never public
  public_safe: false,            // always false on creation
  review_notes: ""
}
```

Forbidden fields on any row:
- `raw_audio_url` — hard forbidden
- `public_verbatim_transcript` — hard forbidden
- `full_quote` — hard forbidden

---

## Claim Extraction Flow

1. Transcription produces raw speaker-attributed text (internal only, ephemeral)
2. LLM extraction pass (cheap model) identifies claim-shaped statements
3. Each candidate is:
   - Paraphrased (never verbatim)
   - Tagged with claim_type, entity, sport, confidence_language
   - Classified for GSE / GSN relevance
   - Written to review queue as `operator_status = DRAFT`
4. Transcript text is discarded after extraction
5. Segment audio is deleted after transcription

---

## Operator Review Flow

1. Worker delivers DRAFT rows to `/cockpit/airwave` review queue
2. Operator reviews each paraphrased claim
3. For GSE evidence: operator corroborates with official source
4. Operator advances: `DRAFT → REVIEW → APPROVED`
5. For GSN editorial: operator maps to show brief / segment idea / newsletter
6. `public_safe = true` set by operator only when review and rights are clear
7. No row reaches public surfaces until `approved` + `public_safe = true`

---

## Next Build Step

1. Implement `dry-run.ts` using existing contracts (no capture, no deps)
2. Validate CH87 schedule contract with real show data (replace SAMPLE_PLACEHOLDER blocks)
3. After legal gate: prototype local audio routing in a sandboxed environment
4. Implement segment → transcription → extraction pipeline (local, on-device)
5. Wire extraction output to the review queue (cockpit import)

---

## What CAN Be Built Now (No New Deps)

- `dry-run.ts` — reads schedule, checks window, reports plan (no capture)
- Schedule fixture importer — operator CSV → ShowBlock[] (no audio)
- ClaimCandidate batch validator — checks a JSON/CSV of candidates against the contract
- Review queue exporter — exports APPROVED candidates to GSE/GSN output map

All of the above use existing contracts and require no new dependencies.
