# SiriusXM Channel 87 — Listener Protocol

> Status: **HELD.** CH87 intake is intentionally gated.
> The founder-local-listening and satellite-radio-context source policies
> are both HELD until legal acknowledgement is set.
> Manual transcript import via CSV/TSV is the safe first step.

---

## Channel 87 Scope

**SiriusXM Channel 87** is Fantasy Sports Radio — the primary satellite-radio
intelligence source for Galaxy Sports Edge and Galaxy Sports Network.

Content focus:
- NFL, NBA, MLB injury reads and availability updates
- DFS value commentary and waiver wire guidance
- Betting line context and market narratives
- Fantasy rankings and tier commentary
- Coaching and scheme notes

---

## 05:00–23:00 CT Capture Window

All CH87 intake is limited to:

- **Start:** 05:00 Central Time
- **End:** 23:00 Central Time
- **Timezone:** America/Chicago

Programming outside this window is not targeted. The `isWithinChannel87Window(hourCt)`
function in `channel-87-schedule.ts` enforces this boundary.

This is the same 18-hour window as the core Airwave airing window (`pipeline.ts`).

---

## Founder-Owned Local Listening Concept

**This is not automated recording. This is not stream capture. This is not scraping.**

The intended workflow:

1. Founder listens live on a **personally-owned SiriusXM subscription** during the airing window
2. Founder takes **manual notes** during shows they are actively monitoring
3. Notes are paraphrased in real time — never verbatim quotes
4. Notes are formatted according to the **12-column spreadsheet contract**
5. Notes are **imported via CSV/TSV** using the manual transcript import lane
6. Imported rows pass through the **review gate** before any output is produced

This is the "founder-local-listening" source policy: `operator_status = DRAFT` until
the operator explicitly advances it through the review queue.

---

## What This Is Not

| Forbidden | Reason |
|---|---|
| Protected endpoint scraping | SiriusXM terms prohibit API/endpoint access without authorization |
| Credential automation | No automated login, session management, or credential sharing |
| DRM bypass | SiriusXM content is protected; no bypass of any protection |
| Direct stream ripping | No recording of encrypted or unencrypted streams |
| Raw audio archive | No audio files are retained at any point in the pipeline |
| Public verbatim transcripts | No verbatim text is published; paraphrase only |
| Automated recording | No scheduled recording of any kind |
| Third-party activation tools | `parker-stephens/siriusxm-activator` and `brendeni1/SiriusXM-Renewer` are **permanently excluded** |

---

## Legal Acknowledgement Gate

Before any CH87 notes can flow through the intake system, the operator must:

1. Review the SiriusXM Subscriber Agreement
2. Confirm that personal, non-commercial listening note-taking is within bounds
3. Consult counsel if any doubt exists
4. Set `AIRWAVE_SIRIUSXM_LEGAL_ACK=true` in the environment

Until `AIRWAVE_SIRIUSXM_LEGAL_ACK=true`, the `satellite_radio_context` and
`founder_local_listening` source policies remain **HELD** and **no CH87 intake
can reach the review queue**.

---

## Manual Transcript Import — Safe First Step

The safest path to CH87 intelligence today:

1. Founder watches/listens during a show block within the 05:00–23:00 CT window
2. Takes notes in a CSV or TSV file using the 12-column spreadsheet contract:

```
aired_at_ct | show | segment | speaker | paraphrased_claim | sport | entity | claim_type | confidence | rights_status | source_pointer | operator_status
```

3. Sets `rights_status` based on actual rights posture:
   - Personal notes: `owned`
   - Public statements from a free source: `public`
   - Licensed content under subscription: `licensed`

4. Sets `operator_status = draft` initially
5. Sets `AIRWAVE_TRANSCRIPT_FILE_PATH` to the CSV/TSV file path
6. Sets `AIRWAVE_TRANSCRIPT_IMPORT_ENABLED=true`
7. Reviews import readiness via `/api/airwave/intake-readiness`
8. Advances rows to `review` or `approved` status after verification

No row reaches a public surface unless `operator_status = approved` and
`rights_status` is `owned`, `public`, or `licensed`.

---

## Future Local Listener Worker

When gates are open and the legal posture is confirmed:

**NOT yet implemented. Dry-run scaffolding only in `workers/airwave-listener/`.**

The future local listener worker would:
- Run during show blocks within the 05:00–23:00 CT window
- Route local audio through Windows audio routing (virtual cable)
- Feed temporary 10-minute rolling segments to a Whisper-class transcription engine
- Extract `ClaimCandidate` rows from segments
- Delete segments immediately after extraction
- Write ClaimCandidate rows to the review queue (never direct to public)

**No audio is retained. No verbatim text is published. All claims require review.**

Potential future adapters (no commitment):
- Windows loopback audio capture (OS-native, no credentials needed)
- FFmpeg for segment slicing (MIT/LGPL, widely used)
- faster-whisper or whisper.cpp for local transcription (MIT, runs on-device)

None of these tools bypass DRM or access protected streams. They operate on
locally-routed audio from a personally-owned subscription.

---

## What Can Be Built Now vs. Later

| Capability | Now | Later |
|---|---|---|
| Manual note import (CSV/TSV) | ✅ Ready | — |
| Review queue (cockpit) | ✅ Ready | — |
| Source policy gate | ✅ Defined | — |
| CH87 schedule contract | ✅ Defined | Replace sample blocks with verified data |
| Claim extraction contract | ✅ Defined | — |
| GSE/GSN output mapping | ✅ Defined | — |
| Local listener worker (dry-run) | ✅ Scaffolded | Full implementation after legal gate |
| Automated transcription | ❌ Not yet | After legal gate + counseled posture |
| Automated recording | ❌ Forbidden | Never without legal clearance |
| Scraping / credential automation | ❌ Permanently forbidden | Never |

---

## Env Variables for CH87

```env
AIRWAVE_ENABLED=true                        # Master switch
AIRWAVE_SIRIUSXM_LEGAL_ACK=true            # Human-signed legal gate (CH87 + founder listening)
AIRWAVE_TRANSCRIPT_IMPORT_ENABLED=true      # Enable CSV/TSV import
AIRWAVE_TRANSCRIPT_FILE_PATH=/path/to.csv   # Your notes file (never published)
```
