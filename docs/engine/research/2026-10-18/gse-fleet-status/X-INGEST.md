# GSE X Ingest: Technical Handoff (2026-10-18)

Generated Sun 2026-10-18, about 4:20 AM CT, by gse-main-bot/executor. Every count below was produced by running `wc -l` or Python over the live files at that time. Anything that could not be verified is marked **UNKNOWN**. No secrets or key values appear in this file.

## 1. Purpose
- **x-dms:** Garrett shares X posts to his own X Chat "notes-to-self" conversation (conversation id `2091997985215295488`, from progress.json `consumes_from`) as knowledge-base material. Each shared post is ingested. For each shared post's author, original posts from the last 15 days are pulled (window start 2026-10-03T05:00:00Z, excluding replies and retweets).
- **x-search:** topic searches (search_posts_all), 15-day author timelines (get_users_posts), and game-day recency sweeps, all classified into routing buckets.
- Every row has `reliability_weight: 0` (Law 1: ingest everything, weight nothing until DIV-3 grades it).

## 2. Access and limits
| item | fact | verified from |
|---|---|---|
| Free read namespace | built-in `x` MCP namespace: 1,000 reads/day, resets 7 PM CT. Limits are 30/min and 25 results per call. | Brief. The per-minute and per-call limits are UNKNOWN from files; `max_results=25` is in progress.json |
| x-search usage | `qlog.tsv` has 744 lines and every `meta` entry in store.json has 744 matching calls. By label prefix: 328 `TL` (timelines), 132 `P3`, 284 other (pass 1 and pass 2 searches, which the label does not distinguish). The lowest counter in the raw outputs (`/workspace/agent-tools/*.txt`) is "29 of 1000 today", so about 971 reads were used today. | qlog.tsv, store.json, agent-tools |
| x-dms usage | `free_reads_used_approx: 207`, `paid_spend_usd: 0` | progress.json |
| Paid connector | `user-X` as @GalaxySportsHQ. The $29.89 credit balance comes from the brief and is UNKNOWN in files. It has no `search_posts_all` or `get_users_posts`, so it cannot run topic search or read other users' timelines. Paid spend today: $0. | brief; x-search summary.md |
| DMs | X Chat helper at `/home/box/xchat-lite/xchat_lite.py` (it also has README.md and test_xchat_lite.py). The PIN is in env var `CHAT_PIN`. **Never print or log it.** | ls |
| Write actions | The connectors are used only for reading: no posting, liking or following. This is also policy. | brief |
| `min_faves` | Not supported; the API strips it. | x-search summary.md |

## 3. Pipeline
### x-dms (`/workspace/xdm`), run in this order
1. **Decrypt DMs** with xchat-lite, which writes `in.json` (raw) and `dec.json` (decrypted). `err.txt` is 0 bytes. The exact command is UNKNOWN (not scripted in /workspace/xdm).
2. **Extract** post ids and authors into `postids.json`, `authors.json`, `posts.json`, `compact.txt` and `short.txt`. The script is UNKNOWN (ad hoc).
3. **Profile pulls:** free `get_users_posts`, 25 per page, results in `profiles.json` (`prof`, `next`, `pages`). The fetch step is not scripted (MCP calls).
4. `cd /workspace/xdm && python3 proc.py` classifies profile posts and writes `prof_rows.json`.
5. `python3 write.py` writes `ingested.jsonl`, `training-and-tools.jsonl` and `unclear-log.jsonl` using `.tmp` files and atomic rename.
6. `python3 write2.py` writes `profile-intel.jsonl` and `progress.json`, which holds per-author status and `resume_pagination_token`.
- Later repairs (RO-02/03, the canon remap, RO-13–RO-19) are applied by `/workspace/xdm/write2.py` (profile-intel/dfs) and `stamp_eligible.py` (ingested/training/unclear). **Re-running those scripts with the documented flags reproduces live files byte-for-byte** and does not regress repairs. Ad hoc edits alone are no longer the source of truth for profile-intel.

### x-search (`/workspace/xsearch`), run in this order
1. Search and timeline calls go through the free `x` namespace (MCP). Each result is saved to `/workspace/agent-tools/<8-hex prefix>*.txt`, and one line per call (`prefix<TAB>label`) is appended to `qlog.tsv`.
2. `python3 parse.py [v]` merges all logged outputs into `store.json` (13,382 posts, 3,961 users, 2,897 refs, 744 meta). Passing any argument prints per-query counts.
3. `python3 classify.py` prints category counts and the top authors.
4. `python3 rank.py` ranks new authors for timeline pulls. `queue.json` holds `{un: 34, tl: 100}` entries.
5. `python3 write_pass1.py` (pass 1) or `python3 write.py` (pass 2 and later) writes the bucket files plus `new-authors.json` and `queries.json` via `.tmp` and rename. write.py also wrote `removed.jsonl`.
- Resume and state files: `qlog.tsv`, `store.json`, `queue.json`, `pass1_ids.json`, `pass2_ids.json`, `pass2_counts.json`, `pass3_authors.json`, `pass3_next.json` (18 authors with pagination tokens), `pass3_p3.json` (4), `pass2_cite_trace.json` and `pass3_cite_resolve.json`.
- `classify.py` and `write.py` load **both** `/workspace/xdm/postids.json`, `prof_rows.json` and `authors.json`, so x-search depends on x-dms being present.
- The x-search repairs (RO-04/05, the removed.jsonl deletion) were also ad hoc. Re-running write.py would regress them.

## 4. Output files (live, counted)
### x-search: `/workspace/gse/blackboard/ingest/x-search/2026-10-18/`
| file | rows | pass 1 / 2 / 3 | division | notes |
|---|---|---|---|---|
| situational-intel.jsonl | 3,802 | 2,089 / 1,210 / 503 | DIV-1 | l2: SITUATIONAL 1,961, REPLACEMENT 1,027, TRENCH 446, NONE_PURE_LAYER1 368. lease_version 1: 3,434, lease_version 2: 368. hype 229. 2 rows have `moved_from` |
| tools-data.jsonl | 868 | 499 / 218 / 151 | DIV-2 | hype 78 |
| training-quant.jsonl | 397 | 226 / 103 / 68 | DIV-3 | hype 46 |
| bias-chatter.jsonl | 1,137 | 612 / 317 / 208 | DIV-2 | all l2=BIAS, hype 144 |
| dfs.jsonl | 457 | 233 / 117 / 107 | DIV-2 | all dfs_flag=true, hype 74 |
| unclear-log.jsonl | 3,137 | 1,608 / 925 / 604 | DIV-2 | hype 151 |
| **total content rows** | **9,798** | | | all row_ids unique and non-null |
| new-authors.json | 2,829 lines (JSON) | | | |
| queries.json | 4,502 lines (JSON) | | | |
| summary.md | 159 lines | | | |
| removed.jsonl | absent | | | deleted because it was empty (rule in §6) |

- `versions/pass2/` (archive): situational 3,297, tools 717, quant 329, bias 929, dfs 350, unclear 2,535, plus new-authors, queries, summary.md and `_ARCHIVE_MANIFEST.json`. The jsonl row counts match `pass2_counts.json`. Every row has `archive_only=true, eligible=false, snapshot_of`.
- `versions/pre-ro/`: a pass2 copy and `situational-intel.jsonl` (3,802).

<!-- XDM_INVENTORY_BEGIN -->
### x-dms: `/workspace/gse/blackboard/ingest/x-dms/2026-10-18/`
| file | rows | breakdown |
|---|---|---|
| ingested.jsonl | 79 | subtype situational_intel 37 (DIV-1), tool_or_data_source 26 (DIV-2), ai_content_generation_or_other_sport 16 (DIV-4). hype_flag true 8. eligible true 79 |
| profile-intel.jsonl | 1,117 | kind football 798, ai_quant 214, weak 105. DIV-1 658, DIV-3 459 (of which 245 quarantined routing=NONE, eligible=false; 214 ai_quant eligible=true). l2: SITUATIONAL 575, NONE_PURE_LAYER1 526, REPLACEMENT 16. 31 duplicate_of with eligible=false. eligible true/false 872/245. lease_version 8: 1112, 9: 5 |
| dfs.jsonl | 79 | moved_from=profile-intel. eligible true 79/79. lease 8 |
| training-and-tools.jsonl | 51 | 49 posts + 2 profile_share. hype_flag true 22. eligible=false 5 |
| unclear-log.jsonl | 10 | eligible=false 2 |
| **total** | **1,336** | profile+dfs+ingested+training+unclear |
| progress.json | 116 authors | complete 50, pending_more_pages 65, skipped 1 |
<!-- XDM_INVENTORY_END -->

- Snapshots: `versions/pre-ro/` (79 / 1,196 / 51 / 10), `versions/pre-canon/` (79 / 1,196 / 51 / 10), `versions/pre-ro13/` (training-and-tools 51, unclear 10).
- `/workspace/gse/blackboard/ingest/row-id-map-2026-10-18.jsonl` has 1,333 lines with fields `legacy_row_id, row_id, post_id, file`. It has only 1,299 unique row_ids because the 34 cross-file duplicate posts map to the same canonical id. 1,336 x-dms rows minus the 3 rows without a post id gives 1,333.

### Field lists
- **x-search row:** row_id, agent_id, division, timestamp_ct, provenance_urls, reliability_weight, layer2_relevance, consumes_from, produces_for, lease_version, post_id, url, author, author_name, author_followers, posted_at_utc, conversation_id, text, referenced, external_links, metrics{like,retweet,reply,quote,bookmark,impression}_count, week6_games, signal_tags, hype_flag, dfs_flag, tout_bio_flag, ingest_pass, signal_score, found_by, category. Optional fields: reason (unclear), repair_note, moved_from, moved_from_category, moved_from_line.
- **x-dms ingested / training / unclear:** envelope fields + category, subtype, gse_application, post_id, url, author, author_name, posted_at_utc, text, referenced, external_links, metrics, insight, row_id, legacy_row_id. Optional fields: hype_flag, drift_or_tos_flag, duplicate_of, duplicate_of_row_id, eligible, ineligible_reason, repair_order, reason.
- **profile-intel:** envelope fields + post_id, author, posted_at_utc, text, tags, kind, promo_flag, metrics{likes,reposts,bookmarks}, row_id, url, legacy_row_id. Optional fields: repair_note, duplicate_of, duplicate_of_row_id, eligible.

Example rows (text truncated):
```json
{"row_id":"776c7cbc6ddaff71","agent_id":"gse-main-bot/executor:x-search-ingest","division":"DIV-1","layer2_relevance":"NONE_PURE_LAYER1","lease_version":2,"post_id":"2106539029265076375","url":"https://x.com/ShaanS7_/status/2106539029265076375","author":"ShaanS7_","text":"15 Key Stats to Know Before Betting on the Week 4 NFL Slate …","week6_games":["ARI@LAR","…"],"signal_tags":["inj","mkt","sch"],"hype_flag":false,"dfs_flag":false,"tout_bio_flag":false,"ingest_pass":1,"signal_score":21.0,"found_by":["coverage schemes (…) NFL","TL ShaanS7_ p3"],"category":"situational","repair_note":"RO-2026-10-18-04: …","reliability_weight":0}
{"agent_id":"gse-main-bot/executor:x-dm-ingest","division":"DIV-3","layer2_relevance":"NONE_PURE_LAYER1","consumes_from":["x-api:get_users_posts(free)"],"lease_version":2,"post_id":"2107580555110031519","author":"0xCodila","text":"Claude Code creator just released INSANE prompt for building…","tags":[],"kind":"ai_quant","promo_flag":false,"metrics":{"likes":81,"reposts":11,"bookmarks":94},"row_id":"6cfc32c0db05f66f","legacy_row_id":"b3ea615506cd9985","reliability_weight":0}
{"legacy_row_id":"…","row_id":"…","post_id":"…","file":"…"}   // row-id-map line
```
The ingested, training and unclear files use the same envelope plus the DM fields listed above. Their example rows are omitted for brevity.

## 5. Classification (as implemented in `/workspace/xsearch/classify.py`)
Inputs: `t` is the note_tweet text or the post text with t.co links stripped. `fb` is the number of FB regex hits, `tout` the number of TOUT regex hits, and `biot = BIOTOUT.search(author bio)`. The flags are inj, mkt, sch, tool (regex or a link matching github, kaggle, huggingface, colab, nflverse, cfbd or collegefootballdata), quant, dfs, hype (a regex match each).
```
score = min(fb,6) + 2*sch + inj + quant + tool + min(likes,500)/100 + min(bm,100)/25 + min(len(t),600)/200 - 2.5*tout - 2*biot
if len(t)<40 and likes<50: skip
elif fb==0 and not (quant or tool): skip
elif tout>=2 or (biot and tout>=1 and not (sch or quant)): 'bias' if mkt else skip
elif tool and fb>=1: tools
elif quant and (fb>=1 or mkt): quant
elif mkt and not (sch or inj): bias
elif fb>=2 or inj or sch: situational
elif fb==1: unclear
else: skip
if cat!='skip' and score<1.5: cat = 'unclear' if score>0 else 'skip'
```
- `DFS = \b(dfs|draftkings|fanduel|showdown|ownership|chalk|leverage|gpp|cash game|stack(s|ing)?|underdog fantasy|prizepicks|lineup)\b`.
- `HYPE = (insane|unreal|guaranteed|can't lose|lock of|godlike|🚨🚨|100%|free money|never lost|undefeated|massive edge)`.
- TOUT covers lock(s), potd, tail, hammer, units, `\d+u`, free picks, vip, dm me/for, join, discord, telegram, records, cash(ed), 💰🔒, max/whale play, best bet, parlay, lottery, bankroll, link in bio, promo, use code, sign up, deposit, bonus bet, +$, roi. BIOTOUT covers picks, locks, capper, vip, potd, roi, units, handicapp, winners, +$, plays daily, join, discord, telegram, promo, code.
- **The dfs bucket and dfs_flag, layer2_relevance, week6_games and tout_bio_flag are assigned in `write.py`, not classify.py.** The exact layer2 rules (SITUATIONAL / REPLACEMENT / TRENCH from the TRE regex and others) are in write.py and are summarized only partly here: open write.py lines 1–120. The observed values are listed in §4. Since RO-04, any mkt-tagged situational row is NONE_PURE_LAYER1. BIAS is used for bias-chatter only.
- x-dms uses separate regexes in `/workspace/xdm/proc.py` (FB/INJ/MKT/SCH/AI/PROMO). The kind is `skip_pointless` if len<25 and no fb, `football` if fb>=2, `ai_quant` if ai>=2, and so on. The full chain is in proc.py.

## 6. IDs and versioning
- **Rule as stated (canonical_url_rule, about 02:06 CT):** `row_id = sha1('https://x.com/i/status/'+post_id)[:16]`.
- **Actual state (verified by recomputing):**
  - x-dms: all 1,334 rows that have a post_id match the i/status rule (ingested 79/79, profile 1,117/1,117, training 49/49, unclear 9/9). The 3 rows without a post_id use other hashes; 2 of them are `sha1(url)` of the profile URL.
  - **x-search: 0 of 9,798 rows are guaranteed i/status.** All 9,798 equal `sha1(stored url)[:16]`. Only 1,932 of them coincide with i/status: situational 795, unclear 756, bias 167, tools 121, dfs 69, quant 24. The rest hash `https://x.com/<handle>/status/<id>`. This was a deliberate choice to keep DIV-1 and overheard citations stable. **Consumers must not recompute x-search row_ids with the i/status formula.**
- `legacy_row_id` holds the pre-canon handle-URL hash on x-dms rows, and is also mapped in row-id-map.
<!-- XDM_DUP_BEGIN -->
- `duplicate_of` gives `<file>:L<n>` (0-based) of the kept copy, and `duplicate_of_row_id` gives that copy's row_id. Duplicate rows carry `eligible=false`. There are 35 in total: profile 31, training 3, unclear 1.
<!-- XDM_DUP_END -->
- **Every row has an explicit `eligible` field (RO-17).** `eligible=false` marks rows that must not be promoted (ineligible_reason, duplicates, archive_only, or quarantine `routing=="NONE"`). Consumers filter `eligible==true`. There is no missing-field fallback.
- `archive_only=true` plus `snapshot_of=<live path>` (plus eligible=false) are on every row in `versions/*` snapshot folders.
- `moved_from`, `moved_from_category` and `moved_from_line` appear on 2 situational rows that were moved between buckets.
- `lease_version` increments on each edit of a row or file. Edits go into a new lease and are never made in place without a snapshot.
- `removed.jsonl` exists only once it has its first row (DIV-3 ruling, the same rule as verdicts.jsonl). The empty x-search one was deleted and "0 removals" recorded. **Which manifest field holds "0 removals" could not be located by grep; UNKNOWN.**
- Snapshot folders: x-search has `versions/pass2`, `versions/pre-ro`. x-dms has `versions/pre-ro`, `pre-canon`, `pre-ro13`.

## 7. Envelope schemas
| file | sha256 |
|---|---|
| /workspace/gse/schemas/blackboard-envelope-v1.json | `cec3d1017c25d31e1041a1f0a8bfc3be0c0b2bd72e029e5634a828fc8d8a3c37` |
| /workspace/gse/schemas/blackboard-envelope-v2.json | `fffac7a051b5eb679e3c08156e1a230e1edcab843474ab68b52c89f4973513d6` (matches the DIV-3 rerun `matches_expected: true`) |

The diff after normalizing with `json.tool` is three changes: `$id` v1 → v2, `title` v1 → v2, and `"BIAS"` added to the `layer2_relevance` enum. Nothing else changed.

## 8. QA history (DIV-3 import-qa, `/workspace/gse/blackboard/div3/import-qa/2026-10-18/`)
| RO | target | defect | status |
|---|---|---|---|
| RO-2026-10-18-02 | x-dms *.jsonl | duplicates (QA said 36) | DONE: 34 marked. QA conceded that 34 is correct (it had grouped 3 null post_ids). Rerun: **Promote**, provenance 133/134 |
| RO-2026-10-18-03 | x-dms profile-intel | market rows labeled SITUATIONAL/REPLACEMENT | DONE: 187 relabeled (181 SITUATIONAL + 6 REPLACEMENT → NONE_PURE_LAYER1). Rerun: **Promote** 120/120 |
| RO-2026-10-18-04 | x-search situational-intel | mkt rows labeled | DONE: 368 relabeled. Rerun: **Promote** 381/381, 0 exact duplicates, 1 near-duplicate |
| RO-2026-10-18-05 | x-search versions/pass2 | no archive marker | DONE: 8,159 rows marked plus manifest. Rerun: **Promote as archive only**, manifest of 9 files consistent |
| RO-2026-10-18-13 | x-dms 3 no-post_id rows (ff61b364ed8d52be, fd45e2dcfc41607f, 4fa6066452f2b4ee) | missing eligible field | The addendum-2 file still says `open`. **The live files show it applied** (eligible=false plus ineligible_reason, pre-ro13 snapshot). No DIV-3 re-verification has been filed yet. |

Carve-outs (Reject bar 3, freshness: injury rows older than 24 h) are 28 x-dms rows and 648 x-search situational rows. Files: `*-rerun.json`, `rerun-summary-2026-10-18.json`, `repair-response.json` (status APPLIED, 01:57 CT).

## 9. Routing
| consumer | files |
|---|---|
| DIV-1 Lead (3115cea2) | x-search situational-intel.jsonl. x-dms ingested subtype=situational_intel (37) and profile-intel division=DIV-1 **and eligible==true** |
| DIV-2 Lead (792ef63a), cc on all | x-search tools-data, bias-chatter, dfs and unclear-log. x-dms ingested subtype=tool_or_data_source (26), unclear-log (10), progress.json |
| DIV-3 Lead (86e9edd6) | x-search training-quant. x-dms training-and-tools (51), profile-intel division=DIV-3 **and eligible==true** (214) |
| sherlock (1822115a) | tools and training rows from both ingests, profile kind=ai_quant. Evals in `blackboard/tools/x-dm-leads-eval-2026-10-18*.json` (latest `__lease3`) and `x-search-leads-eval-2026-10-18.json` (+`__pass1-rowid-remap`) |
| overheard (2894dea0) | bias-chatter, market-tagged situational rows, profile kind=football **and eligible==true**. Bias outputs are in `blackboard/bias/week6/` (latest `2026-10-18_0210CT.json`) |
| DIV-4 | x-dms ingested subtype ai_content_generation_or_other_sport (16) |
| DFS optimizer bot | dfs.jsonl (457). **Bot name UNKNOWN** |

## 10. Known issues and gaps
1. **65 partial DM authors** (progress.json status pending_more_pages: 31 football authors capped at 2 pages, 34 AI/other at 1 page). Resume tokens are in `resume_pagination_token`.
2. **Freshness carve-outs:** 28 x-dms and 648 x-search injury rows older than 24 h are rejected for injury use.
3. **Tout-flag miss:** PropsEdge row `788c3a97d48b0846` (bias-chatter) has "Sign up with code X20 for 20% off" but `tout_bio_flag=false` and `hype_flag=false`. TOUT matched on text (it routed to bias), but there is no per-row tout flag; only `tout_bio_flag` (bio-based) exists. Other promo-code posts that mention @PropsEdge (e.g. "TURTLEBETS") are also unflagged.
4. **Wasted `from:` queries:** 57 of the qlog labels contain `from:` and **21 returned 0 results**. In total, 26 of 744 calls returned 0.
5. **next_token truncation:** 687 of 744 calls returned a `next_token` that was never followed, so the results are page 1 only for most queries.
6. **x-search row_id mismatch** with the canonical rule (§6): 7,866 rows are not on i/status.
7. README says 30 training rows have hype_flag; the live count is 22. The README needs a regenerate.
8. Repairs live only in the data, not in the scripts, so re-running the scripts regresses them.
9. qlog labels are human descriptions, not the literal query strings. The literal queries live only in the `/workspace/agent-tools/*.txt` outputs.
10. UNKNOWN: the DFS bot name, the exact xchat-lite invocation, the decrypt/extract scripts, the $29.89 balance, and where "0 removals" is recorded.

## 11. Suggested coding tasks
1. **Single idempotent CLI** `gse-x-ingest {dms,search} --date YYYY-MM-DD`. Acceptance criteria:
   - Re-running on the same inputs produces byte-identical outputs (except timestamp_ct).
   - The canonical row_id is computed in one function.
   - Repairs (dup marking, eligible, l2 relabel, archive markers) are coded rules, not hand edits.
   - Writes are .tmp plus rename, with a snapshot to `versions/<tag>/` before any overwrite.
   - Never deletes rows.
2. **Tests (pytest):**
   - row_id formula.
   - The classify.py decision table, one fixture per branch.
   - Duplicate detection gives 34 on today's data.
   - Every live row validates against envelope v2 (sha256 pinned).
   - removed.jsonl is absent when there are 0 removals.
   - No secret patterns (CHAT_PIN value, API keys) appear in any output.
3. **x-search row_id migration:** add `canonical_row_id` (i/status) to every x-search row and keep `row_id`. Write a map file like row-id-map. Acceptance: 9,798 rows, a 1:1 map, and old citations still resolve.
4. **Per-row `tout_flag`** = TOUT hits ≥1 (plus a promo-code regex). Acceptance: `788c3a97d48b0846` is flagged, and there is a fixture test.
5. **Budget-aware pager:** follow next_token for high-yield queries and drop `from:` queries that return 0 two days running. Track reads from the "N of 1000 today" counter and stop at 30 reserve. Acceptance: it never exceeds 970/day, and qlog stores the literal query.
6. **Daily 7 PM CT rerun** (after the reset), with cron `0 19 * * *` in TZ America/Chicago. It resumes the 65 partial authors from progress.json first, then new-authors and queue.json, writes a new dated folder, and posts a summary for DIV-3 QA. Acceptance: it resumes cleanly after being killed mid-run (resume from qlog/progress), and spends $0 on paid unless a flag is set.
7. **Freshness field:** add `stale_injury=true` when an injury-tagged row is older than 24 h at write time. Acceptance: it reproduces the 28 and 648 carve-outs.

## Consumer rule (RO-16) — 2026-10-18

**Every consumer of x-dms `profile-intel.jsonl` (and related x-dms jsonl) MUST filter `eligible == true`.**

Do **not** select on `division` or `kind` alone. Quarantined rows are stored as `division=DIV-3`, `routing="NONE"`, `eligible=false`, `layer2_relevance=NONE_PURE_LAYER1`. A bare `division=DIV-3` filter returns both genuine training/quant rows and all quarantined off-topic rows.

| Consumer | Old selector (unsafe) | Required selector (RO-16) |
|---|---|---|
| DIV-3 Lead | `profile-intel division=DIV-3` | `division=DIV-3` **and** `eligible==true` (exclude `routing=="NONE"` / `eligible==false`) |
| overheard | `kind=football` | `kind=football` **and** `eligible==true` |
| sherlock | `kind=ai_quant` | `kind=ai_quant` **and** `eligible==true` |
| account-book / DIV-1 merge | `division=DIV-1` | `division=DIV-1` **and** `eligible==true` |
| DFS bot | `dfs.jsonl` | rows in `dfs.jsonl` with `eligible==true` |

Genuine DIV-3 `ai_quant` rows carry `eligible=true`. Quarantined rows carry `eligible=false`. DIV-1 keeps and dfs rows also carry `eligible=true`. As of RO-17 every row has an explicit `eligible` value; filter `eligible==true`.

Full DIV-1 row-level review for RO-16: blackboard path `ingest/x-dms/2026-10-18/div1-row-review-ro16.tsv` (661 data lines + header). Quarantines from that review: `4bb2fd658831510f` (self-help), `1db5f00f335dc3fd` (drone), `8554cc65d97b318a` (soccer DFS).


## Consumer rule (RO-17) — 2026-10-18

**Every x-dms row now carries an explicit `eligible` field.** Consumers filter `eligible == true`.

- `eligible=false` when the row has `ineligible_reason`, `duplicate_of`, `duplicate_of_row_id`, `archive_only`, or is quarantined (`routing=="NONE"`).
- Otherwise `eligible=true` (including all DIV-1 keeps, genuine DIV-3 `ai_quant`, dfs rows, and previously missing ingested/training/unclear rows).
- Do **not** select on `division` or `kind` alone (see RO-16 table below). Quarantined rows are `division=DIV-3` with `routing="NONE"` and `eligible=false`.

## Consumer rule (RO-18) — 2026-10-18T08:02:00-05:00 (America/Chicago)
- Inventory numbers in §4 x-dms table and the duplicate-total bullet are generated by `/workspace/xdm/gen_inventory.py` between HTML markers so they cannot go stale. Re-run that script after any live-file change.
- `write2.py` no longer accepts `--stabilize-from`. Reason text comes only from the classifier; profile-intel and retag-log reasons agree. Plain dual-rerun from `versions/pre-ro14` + `stamp_eligible.py` is byte-identical (diff=0). Eligible and quarantine sets are unchanged vs RO-17.
- Eligible consumer rule is unchanged from RO-16/RO-17: every consumer filters on `eligible==true`. There is no missing-field fallback.

## Consumer rule (RO-19) — 2026-10-18T08:15:00-05:00 (America/Chicago)
- `write2.py` and `stamp_eligible.py` take `--repair-order`, `--lease`, and `--timestamp-ct` as CLI parameters (no hardcoded RO). Only rows whose content changes are re-stamped; untouched rows keep metadata from `--prior` (lease-8 snapshot).
- Plain dual-rerun: write2 from `versions/pre-ro14` with `--prior versions/pre-ro18 --repair-order RO-2026-10-18-18 --lease 9 --timestamp-ct 2026-10-18T08:02:00-05:00`, then stamp_eligible from `versions/pre-ro17` siblings with `--repair-order RO-2026-10-18-17 --lease 8 --timestamp-ct 2026-10-18T07:52:00-05:00`. All 7 jsonl files are byte-identical.
- Eligible consumer rule unchanged: filter `eligible==true`. No missing-field fallback.
