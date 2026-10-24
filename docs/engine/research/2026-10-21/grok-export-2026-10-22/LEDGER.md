# Grok export index 2026-10-22

Source zip: `Downloads/6ecc171c-d711-47ae-9421-43a2266d7894.zip` (759,110,041 bytes, 1,807 entries).

Streamed with ijson. Auth and billing files were not extracted. The auth file contains `user`, `sessions`, `teams`, `api_keys`, and `management_api_keys`. Treat the zip as credential-bearing. Do not commit it.

## Measured

- `prod-grok-backend.json`: 657,060,769 bytes
- Conversations: 204
- Human messages: 6,692
- Assistant messages: 5,703, of which 149 were empty
- Created range: 2026-06-25 to 2026-10-22
- Asset files left in the zip: 1,804
- Keyword-in-body hits: 102. That filter pulled in non-sports threads, including one that must not be published. Those excerpts were deleted.
- Title-filtered excerpts kept: 48 conversations, in `sports-title-excerpts.jsonl`. Message text is capped. This is not a verified training corpus.

`conversation-index.jsonl` is titles, dates, and message counts only.
