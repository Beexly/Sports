# GSE Daily Telemetry & Claim Delta Schema Contract (2026-10-27)

**Artifact Path:** `artifacts/telemetry-schema-2026-10-27.md`
**Target Daily Log:** `artifacts/delta-YYYY-MM-DD.jsonl` (mirrored on the Linux host to `/opt/intel/delta-YYYY-MM-DD.jsonl`)
**Upstream Bi-Temporal Document Feed:** `packages/prediction-engine/src/feeds/emit-mind-feed-record.ts` (`brain/feeds/<YYYY-MM-DD>/*.jsonl`, schema `gse-mind-feed-v2.0`)
**Runnable Writer:** `scripts/feeds/delta_telemetry.py` (verified `--selftest` PASS on Windows workstation)
**Wiring Spec:** `artifacts/rag-telemetry-wiring-2026-10-27.md`

**Invariant governance.** Every record appended to `artifacts/delta-YYYY-MM-DD.jsonl` conditions on the frozen Tuesday 04:00 CT baseline (`sealed_hash`, `version: "v1.0"`, `tau: 0.42`, `qb_questionable_epa: 0.0947`). Appending or retrieving a telemetry record NEVER imports, mutates, or re-estimates the sealed object.

---

## 0. Seal resolution — read this before using any hash below

Two environments exist and they carry **different** seal hashes. Neither is "wrong"; they are different machines. The writer resolves the active seal at runtime instead of hard-coding one:

| Order | Source | Value on that machine |
|---|---|---|
| 1 | `$GSE_SEALED_HASH` env override | caller-supplied |
| 2 | `<repo>/candidates/sealed-center.json` → `merkle` | **`23245bcbba04f1470c5b0f60b83358c6af44c2b20c70e244d8b7a1a0eb686e8b`** (Windows workstation, verified) |
| 3 | Documented canonical verification fixture | `85b5cd3303c540492b23019d913aabd9179945a72c490579124e6e57dcad68b8` (the plan author's environment) |

**Verified facts (2026-10-27):**
- Windows seal center: `week=2026-W44`, `merkle=23245bcbba04…`, `sealed_at=2026-10-25T04:00:00-05:00`, `tau=0.42`.
- `23245bcb…` is confirmed in `packages/prediction-engine/src/coach-brain/coach-brain-inference.test.ts:12` and `packages/prediction-engine/src/gse-pre-seal/run_week7_injury_operator.py:116`.
- `85b5cd33…` appears **zero** times in `packages/prediction-engine/src`. It is the plan's canonical fixture, not the Windows seal.
- Linux sandbox seal: `faab28271513678c` (`/opt/model/sealed_engine.py verify`, exit 0), repo `/root/beexly-sports` @ `db4b1899`.

**Rule:** a record whose `sealed_hash` does not equal the *active* seal on the machine writing it is rejected (`SEAL_HASH_MISMATCH`). Do not merge hashes across machines in one file.

---

## 1. Canonical JSONL Record Format (one JSON object per line)

```json
{
  "id": "uuid",
  "timestamp": "2026-10-27T17:40:00-05:00",
  "source": {
    "type": "injury_note|practice_report|dk_line|beat_writer|form4|arxiv|other",
    "url": "https://...",
    "author": "string|null",
    "raw_excerpt": "verbatim text or structured fact"
  },
  "claim": {
    "subject": "player|team|game|coordinator",
    "predicate": "out|questionable|target_share_shift|line_move|...",
    "object": "string|number|null",
    "game_id": "string|null",
    "week": 8
  },
  "confidence": 0.95,
  "sealed_hash": "<active 64-char SHA-256 seal for this machine>",
  "conditions_on": {
    "version": "v1.0",
    "tau": 0.42,
    "qb_questionable_epa": 0.0947
  },
  "status": "ingested|retrieved|used_in_overlay|rejected",
  "notes": "string|null"
}
```

---

## 2. Field-Level Validation Rules (fail-closed)

1. **`id`** — RFC 4122 UUID v4, or deterministic UUID v5 derived from `SHA256(source.url + "|" + timestamp + "|" + source.raw_excerpt)`. Re-emitting an existing `id` in the same `delta-YYYY-MM-DD.jsonl` is rejected (`NO_OVERWRITE_VIOLATION`). *Implemented in `validate_delta_record` + `append_delta_record`.*
2. **`timestamp`** — ISO-8601 with explicit UTC offset (`transaction_time_iso`). Must never enter `coachMindsetHash`.
3. **`source.type`** — one of `"injury_note" | "practice_report" | "dk_line" | "beat_writer" | "form4" | "arxiv" | "other"`.
   - **Epistemic Routing Rule:** claims with `source.type === "dk_line"` or `"form4"` are strictly **Class B (Zone 3)** diagnostic inputs. They may only be queried during Step N conformal/market residual checks and are forbidden from entering `applyInjuryOverlay()` or `sinkhornTargetAllocation()`. A Class B record carrying `status: "used_in_overlay"` is rejected (`EPISTEMIC_ROUTING_VIOLATION`).
4. **`claim`**
   - `subject`: canonical entity identifier or category (`"player"`, `"team"`, `"game"`, `"coordinator"`, or a specific canonical ID such as `"player:CLE:Dillon_Gabriel"` / `"game:2026_08_LV_NYJ"`).
   - `predicate`: controlled token (`"out"`, `"questionable"`, `"full_practice"`, `"limited_practice"`, `"target_share_shift"`, `"line_move"`, `"insider_form4_filing"`, `"paper_equation_verified"`).
   - `object`: string, number, or `null` (e.g. `"0.0947"`, `-1.5`, `"IR_ACTIVATED"`).
   - `game_id`: canonical game identifier (`"2026_08_CLE_PIT"`, `"2026_08_CHI_SEA"`) or `null`.
   - `week`: integer NFL week in `[1, 22]`.
5. **`confidence`** — float in `[0.0, 1.0]`. Official NFL transaction/inactive lists = `1.0`; verified multi-book/Pinnacle feed = `0.95`; credentialed beat-writer practice observation = `0.75`; uncorroborated social/audio rumor ≤ `0.40` (logged as `"ingested"`, never `"used_in_overlay"` until corroborated).
6. **`sealed_hash`** — must equal the active 64-char SHA-256 seal on the writing machine. Any record with a mismatched or missing `sealed_hash` is rejected for the current week's overlay.
7. **`conditions_on`** — must carry the exact frozen tuple: `version: "v1.0"`, `tau: 0.42`, `qb_questionable_epa: 0.0947`. Tolerance on floats: `1e-9`.
8. **`status`** — lifecycle state in `{"ingested", "retrieved", "used_in_overlay", "rejected"}`.

---

## 3. Duplicate-state resolution (why retrieval exists)

`retrieve_prior_claims(delta_path, sealed_hash, subject, game_id, allowed_source_types)` returns prior claims in chronological order for the same seal and subject. This is what prevents the **Christian Kirk duplicate-state class of bug**: a Wednesday "Questionable" tag and a Saturday "IR activated" tag for the same player resolve to one latest state, deterministically, before any overlay runs.

Retrieval is **read-only**. It never writes back into Zone 1 or Zone 2.

---

## 4. Verification record (this pass)

```
[selftest] active seal = 23245bcbba04f1470c5b0f60b83358c6af44c2b20c70e244d8b7a1a0eb686e8b
[DELTA TELEMETRY SELFTEST PASS] 2 records written & retrieved |
  duplicate/wrong-seal/Class-B-overlay guards fired |
  seal=23245bcbba04f147… |
  simulator=SKIP (simulator unavailable: ModuleNotFoundError: No module named 'gse_coach_mind_simulator')
```

**Interpretation.** The append/retrieve/guard invariants are proven on the Windows workstation against the real seal. The final leg — re-running `simulate_matchup_pbp` and asserting `coachMindsetHash` + `tau` invariance — cannot execute here because `gse_coach_mind_simulator` is not present in this checkout. That module lives in the sandbox build. The writer reports SKIP rather than a false PASS. **The invariance leg remains unproven on Windows and must be run on the machine that owns the simulator.**

---

## 5. Known gaps this artifact does NOT close

| Gap | Status |
|---|---|
| `packages/prediction-engine/src/feeds/emit-mind-feed-record.ts` | Not present in the Windows repo (sandbox-side). The adapter from `brain/feeds/` → `artifacts/delta-*.jsonl` is therefore unimplemented here. |
| `scripts/feeds/validate_mind_feeds_consumer.py` | Not present in the Windows repo. |
| `tests/test_ws6b_rag_anything_probes.py`, `raganything/omml_extractor.py` | Not present in the Windows repo. |
| Live RAG-Anything daemon bridge | `NAMED_GAP` — probes exist in the sandbox, no live query bridge into the delta log. |
| `packages/mcp-equations-server/src/mcp-cognitive-router.ts` 50k-signal router | `NAMED_GAP` until Neon credentials are rotated and wired. |
| Candidate seal chain | `candidates/` is untracked; week-8 candidate is a byte copy of week-7 (`candidate_id` = `2026-10-25-week7`, `week` = `2026-W44`, `tau` = `null`, ratings all `-0.0`/`n=1`, `parent_seal_hash` = sequential placeholder hex). |
| tau contradiction | **Resolved for Windows:** candidates carry `tau: null`; `sealed-center.json` carries `0.42`. The earlier "candidates say 0.001" claim is not supported by the files. |
