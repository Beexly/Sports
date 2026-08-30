# GSE / GSN Airwave Intelligence Intake — Architecture

> Status: **Review-ready, operator-gated, inert by default.**
> All capture is held behind explicit gate flags. The architecture, type contracts,
> source policies, and output maps are live. No live capture occurs until gates open.

---

## What Airwave Is

Airwave Intelligence Intake turns sports-media input — satellite radio, podcasts,
YouTube shows, beat reports, operator notes — into **structured, review-gated,
paraphrased sports intelligence** for two consumers:

- **Galaxy Sports Edge (GSE)** — picks, confidence scores, model context, injury/usage alerts
- **Galaxy Sports Network (GSN)** — editorial briefs, show segments, podcast ideas, newsletters

The pipeline:

```
Source schedule
  → source policy gate
  → intake readiness check
  → temporary transcription OR operator transcript import
  → paraphrased claim extraction
  → entity tagging
  → GSE signal mapping
  → GSN editorial mapping
  → review queue
  → redacted output only after operator approval
```

Nothing goes public without operator review. Nothing captures without a gate. Nothing
stores verbatim text. Nothing auto-publishes.

---

## What Airwave Is Not

| Forbidden | Why |
|---|---|
| A scraper | No protected endpoint access of any kind |
| A credential bot | No account automation, no SXM activation tools |
| DRM bypass | Audio rights are real; no bypass of any kind |
| Direct stream ripping | Prohibited by terms and policy |
| A raw audio archive | Segments are ephemeral; nothing is retained |
| A public verbatim transcript product | Paraphrased claims only; no verbatim text |
| A SiriusXM free activation system | Permanently excluded — see EXCLUDED sources |
| Fake autonomy | ACTIVE mode requires explicit gates; default is OFF/HELD |

---

## GSE Use Cases

| Use Case | Source Lane | Output Type |
|---|---|---|
| Injury alert for pick model | Beat report, CH87 import | `injury_readiness_alert` |
| Usage/role change signal | CH87 import, YouTube | `player_usage_alert` |
| DFS value signal | CH87 import, Podcast | `dfs_value_signal` |
| Market narrative context | CH87 import, Podcast | `market_narrative_note` |
| Weather risk flag | CH87 import, Podcast | `risk_flag` |
| Pick evidence candidate | Beat report, YouTube | `pick_evidence_candidate` |
| Model context note | Any approved source | `model_context_note` |
| Watchlist item | Any draft source | `watchlist_item` |
| No-bet reason candidate | Any approved source | `no_bet_reason_candidate` |

**All GSE outputs require operator review. UNFALSIFIABLE claims cannot become pick evidence.**

---

## GSN Use Cases

| Use Case | Source Lane | Output Type |
|---|---|---|
| Daily show brief | Any approved source | `daily_show_brief` |
| Podcast segment idea | Any approved source | `podcast_segment_idea` |
| Article story lead | YouTube, Beat, CH87 | `article_story_lead` |
| Social clip idea | Any approved source | `social_clip_idea` |
| Guest topic tracker | Any draft source | `guest_topic_tracker` |
| Hot take ledger entry | CH87 import, YouTube | `hot_take_ledger_candidate` |
| Editorial research note | Any source | `editorial_research_note` |
| Newsletter blurb | Any approved source | `newsletter_blurb` |
| Segment map item | Any draft source | `segment_map_item` |
| Host claim receipt | CH87, YouTube | `host_claim_receipt` |

**All GSN outputs require operator review before external publication.**

---

## Source Categories

Ten source categories are defined in `apps/web/lib/airwave/source-policy.ts`:

| ID | Label | Use | Status | Cost | Legal ACK? |
|---|---|---|---|---|---|
| `public_youtube` | Public YouTube show feed | BOTH | DESIGNED | FREE | No |
| `podcast_rss` | Podcast RSS feed | BOTH | DESIGNED | FREE | No |
| `beat_report` | Beat reporter mesh | BOTH | MANUAL | LICENSED | No |
| `official_team_feed` | Official team news | GSE | DESIGNED | FREE | No |
| `official_league_feed` | Official league data | GSE | DESIGNED | LICENSED | No |
| `odds_market_context` | Odds / market feed | GSE | READY | LICENSED | No |
| `operator_transcript_import` | CSV/TSV import | BOTH | MANUAL | MANUAL | No |
| `founder_local_listening` | Founder notes | BOTH | DESIGNED | OWNED | **Yes** |
| `satellite_radio_context` | SiriusXM-class | BOTH | **HELD** | LICENSED | **Yes** |
| `studio_handoff` | Galaxy Studio | GSN | MANUAL | OWNED | No |

---

## Legal / Source Policy Model

Every source carries:

- `rightsStatusDefault` — the baseline rights posture
- `requiresLegalAck` — human-signed gate (SiriusXM-class sources)
- `requiresHumanReview` — all sources require review before public output
- `canStoreRawAudio: false` — hard NO on all sources
- `canStoreVerbatimTranscript: false` — hard NO on all sources
- `canAutoPublish: false` — hard NO on all sources
- `privateFields` — list of fields that must never appear in public output
- `forbiddenOutputs` — explicit list of what is not allowed

---

## Review Gate

Every claim candidate requires:

1. `paraphrased_claim` (no verbatim quotes)
2. `rights_status` set to OWNED / PUBLIC / LICENSED
3. `operator_status` advanced to REVIEW or APPROVED
4. `public_safe: true` set explicitly by operator
5. For GSE pick evidence: additional corroboration from official source

The redaction boundary in `claim-extraction-contract.ts` ensures `source_pointer_private`
never appears in any public output — enforced at the type level.

---

## Paraphrase-Only Rule

**No verbatim quotes.** The field `paraphrased_claim` is:
- Required on every claim candidate
- Always a derived paraphrase, never a direct quote
- The only text that can appear in GSE or GSN outputs

The `source_pointer_private` field carries the internal reference to where the
claim came from. It never crosses the public boundary.

---

## Evidence Trail Role (GSE)

For GSE pick evidence:
1. Claim candidate enters review queue from an Airwave source
2. Operator corroborates with official source (injury report, depth chart, beat report)
3. Operator advances `operator_status` to APPROVED
4. Claim maps to `pick_evidence_candidate` or `injury_readiness_alert`
5. GSE model context is updated with the corroborated signal
6. The source pointer stays private; the paraphrased claim and corroboration become public

---

## Studio Handoff Role (GSN)

1. Operator reviews approved claims in the cockpit review queue
2. Claims map to GSN output types (show brief, segment idea, newsletter blurb, etc.)
3. Operator exports to Galaxy Studio via the manual handoff lane (`studio_handoff`)
4. Studio prepares assets from approved briefs
5. No automatic external publishing. Manual release only.

---

## Future Worker Architecture

Workers exist in `workers/airwave-listener/` as dry-run scaffolding only:
- No live capture in v1
- Future: local audio routing → temp segment → Whisper transcription → claim extraction
- Future: scheduled CH87 show blocks drive segment boundaries
- Future: worker produces ClaimCandidate rows → review queue

See `workers/airwave-listener/README.md` for the full future worker plan.

---

## Key Files

| Path | Role |
|---|---|
| `apps/web/lib/airwave/source-policy.ts` | All 10 source policies with rights/compliance model |
| `apps/web/lib/airwave/channel-87-schedule.ts` | CH87 schedule contract and window check |
| `apps/web/lib/airwave/intake-contract.ts` | Intake plan builder (pure, read-only) |
| `apps/web/lib/airwave/claim-extraction-contract.ts` | ClaimCandidate type, validation, redaction |
| `apps/web/lib/airwave/gse-gsn-output-map.ts` | Claim → GSE/GSN output mapping rules |
| `apps/web/lib/airwave/sports-source-roadmap.ts` | Data source roadmap (repo analysis findings) |
| `apps/web/lib/airwave/intelligence-control-plane.ts` | Composed intelligence control plane |
| `apps/web/app/api/airwave/intelligence-readiness/route.ts` | Read-only intelligence readiness API |
| `docs/ai/airwave/SIRIUSXM_CHANNEL_87_LISTENER_PROTOCOL.md` | CH87 protocol and legal gate |
| `docs/ai/airwave/AIRWAVE_SOURCE_POLICY.md` | Source policy reference |
| `docs/ai/airwave/AIRWAVE_OPERATOR_RUNBOOK.md` | Operator step-by-step guide |
| `docs/ai/airwave/GSE_GSN_REPO_INTEGRATION_PLAN.md` | Repo analysis → GSE/GSN roadmap |
| `workers/airwave-listener/README.md` | Future worker architecture |
