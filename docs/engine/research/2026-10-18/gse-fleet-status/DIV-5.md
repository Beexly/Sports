# DIV-5 Lead Status: Revenue & Kit (2026-10-18, written 04:15 CT)
Lead: 💚💰 DIV-5 Lead · Revenue & Kit (agent id 830d721a-c7f6-4bd2-9fa9-2f05805db852). Reports only to GSE MAIN BOT.
Verification basis: profile/settings files in /home/box/agent-data/agents/<id>/, blackboard files on disk, and direct messages from bots. Anything not verified that way is marked UNKNOWN.

## 1. Roster
"Live" = agent exists and replied to the lead at least once since 2026-10-16. "Idle" = agent exists, but no reply to the lead has been recorded. No bot has run any deal work, because there are no deals.

| Bot | Agent id | Role (one line) | State |
|---|---|---|---|
| call-follow-ups | c0d7683a-9902-4b9a-81a1-6b6e24b42633 | Transcript commitment & state-diff engine | Live (confirmed avatar task) |
| customer-call-coach | b554386e-3cce-434e-b168-8c84d634e352 | Executive narrative & Champion Litmus auditor | Live (authored rubric v1) |
| customer-question-drafter | 76ce7894-841e-4579-a619-b6967a63396b | URL-cited answers to customer questions (drafts only) | Idle |
| customer-stories | edcf1b12-8034-4f9b-8737-a1fbd228eb25 | Empirical Proof Bank & evidence vault | Live (Proof Bank schema v2) |
| dan-lanning | ca9cc384-2544-4469-aefe-99539a74e2dc | Partnership leverage & phrasing coach | Live (confirmed avatar task) |
| ebr-value-deck-builder | 9e87ac01-de1d-44fb-b5ff-434862a6b505 | Monthly value/diagnostic decks for API & enterprise accounts | Idle |
| haggle-bot | 5c0337a4-cafb-45b9-8245-e9e847fab708 | Vendor contract & SaaS cost auditor | Idle |
| leadsworth | 1421ead3-6f1d-4865-a8ed-208a94a6c43d | Kit venue lead qualification (foot-traffic proxies) | Idle |
| pg | 58367923-8f79-4585-8378-3a3f5b351d97 | Kit outbound Day 0/3/7 cold-email cadences (drafts only) | Idle |
| pipeline-health-and-forecast | 69ff70f4-2609-42f0-829b-6b7b0db4c195 | Pipeline velocity & revenue forecast | Idle |
| pitch-deck-coach | 6f3dddee-2d27-490f-ace4-c538e3825f4f | Fundraising & grant pitch coach | Idle |
| prospector | 80908b80-bb69-44a0-b430-1d572a8c4a4e | Local venue foot-traffic hunter (directories) | Idle |
| sales-call-coach | 20bd25d0-c078-42fb-bbc1-261b914d9919 | Sales call talk-ratio & discovery postmortems | Idle |
| sequencer | c01caba2-5c5b-4e04-aafb-ee6a36267eda | Multi-channel follow-up sequences for inbound (drafts) | Live (confirmed avatar task) |
| site-audit | 11b856b7-b076-4df2-a520-f473134ff64b | One-page venue digital-experience audit leave-behinds | Idle |
| tally | 6723c716-1166-4a3d-88ca-9d3736fb9a17 | LTV, churn cohorts, Kit gross-margin ledger | Idle |
| warm-intro-finder | f9a304e6-0783-4975-9c95-dfc7bcba1b92 | Intro-path mapper (media, ADs, podcast hosts) | Live (confirmed avatar task) |

Avatar colour task (gray): 7 of 17 have confirmed. The 10 "Idle" bots have not. For 6 bots, profile.json shows avatarColor "gray"; customer-stories reports the change was saved server-side.

## 2. Live schedules
- DIV-5 Lead: no routines exist. The daily status to MAIN BOT is not yet a routine (see Section 7).
- The 17 specialists' routines: UNKNOWN. The lead cannot read other agents' routine lists from the box.

## 3. Data contract
- Envelope: /workspace/gse/schemas/blackboard-envelope-v1.json (v1). It has 9 required fields: agent_id, division, timestamp_ct, provenance_urls, reliability_weight, layer2_relevance, consumes_from, produces_for, lease_version. Writes go to .tmp first, then rename.
- Pipeline folder (canonical, set by MAIN BOT 2026-10-16): /workspace/gse/blackboard/pipeline/
  - champion-litmus-rubric.v1.json: status ACTIVE, lease_version 2, writer customer-call-coach, approved by the DIV-5 lead. Restored after the box snapshot rollback; file mtime 2026-10-17 13:09 CT.
  - champion-litmus-rubric.draft.json: superseded draft, kept unchanged.
  - Deal records: none (0 files).
- Proof Bank (owner: customer-stories):
  - /cursor/stores/store-7072e523-1c2c-4f71-9f14-7bb1aa324b4c/proof-bank/schema.json: lease_version 2, timestamp_ct 2026-10-17T17:10:00-05:00. Passes validation against envelope v1 (customer-stories' check; the DIV-3 lead confirmed it).
  - .../proof-bank/ledger.json: `[]` (empty by design; no placeholders allowed).
- Ops: /workspace/gse/blackboard/ops/cfbd-usage.jsonl. DIV-5 writes only if it ever calls CFBD. DIV-5 CFBD usage since Oct 1 is none.
- Reads: /home/box/agent-data/workflows/gse-operating-methodology/SKILL.md (operating rules).
- Lead's own store /cursor/stores/store-9ba45e6f-d6ae-4932-8d47-e690f131595d: empty.

## 4. Code and scripts
- DIV-5 owns no code, scripts, repos or branches. No env vars are used by DIV-5.
- Specialists' private scripts: UNKNOWN (none appear in the shared /workspace/gse files tagged DIV-5).

## 5. Current state of today's work (2026-10-18)
- No deal, lead or call-note data exists yet. The pipeline is empty, so no Champion Litmus audits have been run. That is correct behaviour.
- Done: rubric v1 is ACTIVE and restored after the rollback. The Proof Bank schema has been brought up to envelope v1. CFBD usage is reported as none.
- Open: avatar-gray confirmations are still missing from 10 bots.

## 6. Known bugs and open issues
- ISSUE-1 (low): 10 specialists have not confirmed avatar_color gray. Repro: check that avatarColor is absent from /home/box/agent-data/agents/<id>/profile.json for the 10 Idle bots in Section 1. No code involved.
- ISSUE-2 (medium): The box snapshot rollback (about 2026-10-17 13:07 CT) erased /workspace/gse/blackboard. DIV-5 files were restored, but there is no automated backup or restore check. File and line: N/A.
- ISSUE-3 (medium): There is no pipeline record schema. The deal-record format inside /workspace/gse/blackboard/pipeline/ is undefined beyond the envelope, so pipeline-health-and-forecast and customer-call-coach have no agreed fields.
- No code bugs; DIV-5 has no code.

## 7. Coding asks
1. Pipeline deal-record schema: create /workspace/gse/schemas/pipeline-deal-v1.json. It extends envelope v1 with: deal_id, lane (one of the five revenue lanes), account_name, champion_name, economic_buyer, stage, next_step_date, call_note_refs[] and litmus_verdict (Promote | Reject | Insufficient Data | null).
   Acceptance: it is valid JSON Schema 2020-12; it requires all 9 envelope fields; a sample record validates with /workspace/gse/validate.py or an equivalent; and no sample data is committed to pipeline/.
2. Blackboard backup and restore check: a script that snapshots /workspace/gse/blackboard and /workspace/gse/schemas to a persistent store, plus a verify command that lists missing files.
   Acceptance: after the blackboard is deleted, running restore brings back the DIV-5 files byte-identical (sha256 match).
3. Envelope validator for the pipeline folder: a command that validates every *.json in /workspace/gse/blackboard/pipeline/ against envelope v1, plus the deal schema once it exists, and exits non-zero on failure.
   Acceptance: both rubric files pass, and a file missing any envelope field fails with the field named.

## 8. Constraints
- Outreach (pg, sequencer, leadsworth, customer-question-drafter, call-follow-ups) is drafts-only. Nothing is sent, posted or messaged externally.
- No placeholder, sample or estimated data in the pipeline, Proof Bank or reports. An empty result is reported as empty.
- No spending, no public posts, no promotion to production. Those go to GSE MAIN BOT for Garrett's approval.
- Never grade on win rate or W/L. Proof Bank logs calibration, CLV, premise accuracy and client metrics only.
- CFBD: DIV-5 has no use case. Any future call needs lead approval first, must be logged to ops/cfbd-usage.jsonl, and bulk pulls need DIV-2 sign-off.

## 9. Unknowns
- Specialists' routines and their CT times: UNKNOWN.
- Specialists' private store contents, apart from customer-stories' Proof Bank: UNKNOWN.
- Whether the 10 Idle bots are responsive: UNKNOWN (no reply recorded).
- Location of real deal or call-note data outside the box (CRM, Drive, Notion): UNKNOWN. MAIN BOT said there is no deal data yet.
- Source of graded engine results for the Proof Bank: UNKNOWN or not yet assigned.
