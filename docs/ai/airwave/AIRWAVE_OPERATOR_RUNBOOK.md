# Airwave Operator Runbook

> For operators managing the Airwave Intelligence Intake system.
> This runbook covers the full operator workflow from source readiness to
> approved public output.

---

## 1. Review Source Readiness

**Where:** `/api/airwave/readiness` (existing) or `/api/airwave/intelligence-readiness` (full)

**What it shows:**
- Which source lanes are open, held, or missing config
- Which lanes require legal acknowledgement
- What the current intake plan recommends
- GSE and GSN output readiness

**Read before acting:**
- Is `AIRWAVE_ENABLED=true`? If not, all lanes are off.
- Is `AIRWAVE_SIRIUSXM_LEGAL_ACK=true`? If not, CH87 and founder listening are held.
- Which source lanes have their specific enable flags set?

```bash
curl /api/airwave/readiness | jq .
curl /api/airwave/intake-readiness | jq .
curl /api/airwave/intelligence-readiness | jq .
```

---

## 2. Add Manual Schedule Blocks

**Where:** `apps/web/lib/airwave/channel-87-schedule.ts`

The current CH87 schedule contains SAMPLE_PLACEHOLDER blocks. Replace them with
verified show data using the `ShowBlock` type:

```typescript
{
  showId: "ch87-morning-show",        // internal slug
  showName: "Morning Sports",          // display name
  startsAtCt: "06:00",                // HH:MM 24h CT
  endsAtCt: "10:00",
  startHour: 6,                        // 0-23
  endHour: 10,
  expectedHosts: ["Host Name"],
  sportFocus: ["NFL", "NBA"],
  fantasyFocus: true,
  bettingRelevance: true,
  sourceConfidence: "OPERATOR_PROVIDED", // not SAMPLE_PLACEHOLDER
  manualReviewRequired: true,
  rightsStatus: "MANUAL_IMPORT_ONLY",
  operatorNotes: "Verified from official CH87 schedule."
}
```

Validate each block with `validateShowBlock(block)` — it returns an array of errors.

---

## 3. Import a Transcript CSV/TSV

**Format (12 columns, comma or tab-delimited):**

```
aired_at_ct,show,segment,speaker,paraphrased_claim,sport,entity,claim_type,confidence,rights_status,source_pointer,operator_status
```

**Required columns (all 11):**
- `aired_at_ct` — ISO or CT datetime (e.g., `2026-06-11T08:30:00`)
- `show` — show/program name
- `segment` — hour, segment, or chapter label
- `speaker` — host or guest name
- `paraphrased_claim` — your paraphrase of what was said (never verbatim)
- `sport` — NFL, NBA, MLB, etc.
- `entity` — player, team, matchup, or market
- `claim_type` — one of: injury_read, availability_read, role_change, ranking_tier, dfs_value, waiver_note, matchup_note, depth_chart_note, usage_trend, market_signal, odds_context, coaching_note, weather_context, unfalsifiable_hot_take, narrative_only
- `confidence` — EMPHATIC, LEAN, or HEDGED
- `rights_status` — owned, public, or licensed (for import rows)
- `operator_status` — draft, review, or approved

**Optional column:**
- `source_pointer` — internal reference only; NEVER published

**Set env variables:**
```env
AIRWAVE_TRANSCRIPT_FILE_PATH=/path/to/your/notes.csv
AIRWAVE_TRANSCRIPT_IMPORT_ENABLED=true
AIRWAVE_ENABLED=true
```

**Validate the import:**
```bash
curl /api/airwave/intake-readiness | jq '.data.rows'
```

Check: `reviewReady > 0` and `missingRequiredColumns = []`.

---

## 4. Validate Intake Readiness

```bash
curl /api/airwave/intake-readiness | jq '{
  status: .data.source.status,
  reviewReady: .data.rows.reviewReady,
  approved: .data.rows.approved,
  rightsHeld: .data.rows.rightsHeld,
  canStageForReview: .data.gates.canStageForReview
}'
```

A row is `reviewReady` when:
- All 11 required columns are non-empty
- `rights_status` is one of: `owned`, `public`, `licensed`
- `operator_status` is `review` or `approved`

A row is `approved` when `operator_status = approved`.

---

## 5. Review Claims in the Cockpit

**Where:** `/cockpit/airwave`

In the cockpit:
1. Review draft claim rows from the import
2. Verify each paraphrased claim against the show context
3. For GSE use: corroborate injury/availability/role claims against an official source
4. Advance `operator_status` from `draft` → `review` → `approved`
5. Set `public_safe = true` only when rights and review are both clear
6. For CH87 claims: ensure `rights_status = licensed` (founder subscription) or `owned` (personal notes)

---

## 6. Map Claims to GSE / GSN

**Library:** `mapClaimToAllOutputs(candidate)` in `gse-gsn-output-map.ts`

After approving a claim candidate:

```typescript
import { mapClaimToAllOutputs } from "@/lib/airwave";

const mapping = mapClaimToAllOutputs(claim);
// mapping.gseOutputs — what GSE output types this claim maps to
// mapping.gsnOutputs — what GSN output types this claim maps to
// mapping.blockedReasons — why it's blocked (if any)
```

**GSE rules:**
- `UNFALSIFIABLE` claims → cannot produce `pick_evidence_candidate`
- Injury reads → require official corroboration before becoming pick evidence
- Market signals → pair with live odds from The Odds API
- All outputs → `REVIEW_QUEUE` until operator sets `PUBLIC_AFTER_REVIEW`

**GSN rules:**
- Hot takes → `hot_take_ledger_candidate` only
- Narrative-only claims → editorial research / guest topic tracker
- All outputs → `INTERNAL_ONLY` or `REVIEW_QUEUE` until approved

---

## 7. Keep Outputs Private

**Always private (never publish):**
- `source_pointer` / `clip_ref` / `file_path`
- `review_notes`
- Full transcript text
- Speaker's raw quoted words
- Stream URLs or channel IDs

**Use `redactClaimCandidateForPublic(candidate)`** when building any public-facing
claim display. It returns `null` if the claim is not yet public-safe.

---

## 8. What Never Gets Published

| Item | Why |
|---|---|
| Verbatim quotes | Paraphrase-only rule |
| Raw audio or transcript | No archive policy |
| Source pointer (clip ref) | Internal-only, type-enforced |
| Unapproved claims | Operator review gate |
| UNFALSIFIABLE claims as pick evidence | Hard rule in output map |
| Auto-published anything | No auto-publish on any lane |
| SiriusXM stream content without legal ACK | Legal hold |

---

## 9. Environment Checklist

```env
# Master gate
AIRWAVE_ENABLED=true

# Satellite radio / CH87 (human signed)
AIRWAVE_SIRIUSXM_LEGAL_ACK=true

# Manual transcript import
AIRWAVE_TRANSCRIPT_IMPORT_ENABLED=true
AIRWAVE_TRANSCRIPT_FILE_PATH=/path/to/notes.csv

# Public source lanes (optional)
AIRWAVE_YOUTUBE_FEEDS_ENABLED=true
AIRWAVE_PODCAST_RSS_ENABLED=true
AIRWAVE_BEAT_REPORTS_ENABLED=true
AIRWAVE_STUDIO_HANDOFF_ENABLED=true
```

---

## 10. Useful Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/airwave/readiness` | Base control plane — lane status, adapters, policy |
| `GET /api/airwave/intake-readiness` | Transcript CSV/TSV validation — row counts, contract |
| `GET /api/airwave/intelligence-readiness` | Full intelligence plane — CH87, sources, GSE/GSN readiness |
| `GET /cockpit/airwave` | Operator control room (admin-gated) |
| `GET /airwave` | Public ledger (demo data until gate opens) |
