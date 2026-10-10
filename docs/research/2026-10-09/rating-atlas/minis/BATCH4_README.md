# Batch-4 (2026-10-10 night cap)
1. pfr_ybc_batch: 2 verified 2026 adv-rushing rows (Taylor 198YBC/86att 2.3; CMC 124/50 2.5) + THROTTLE FINDING: PFR in-browser consecutive fetch caps ~2-3 req (tables missing after) -> >=6-10s spacing or one-page-per-load; full 10-20 player batch = PC/agent via pfr_pull.py (3s policy, real UA).
2. adp_panel_v1: FFC half-vs-PPR format-gap table (DIAGNOSTIC ONLY, zero weights, no rating/margin feed per doctrine). MFL ADP = 5-draft default sample (COUNT param ignored keyless) -> v1 note: per-league MFL pulls needed.
3. tg_relay.py: Telegram live-feed pipe (send doc/say/pull), env-gated on TGBOT_TOKEN+TG_CHAT_ID.
Chain: b9a36b133 -> ff65975ef -> c6a160566 -> 58b4818f3 -> this commit.
