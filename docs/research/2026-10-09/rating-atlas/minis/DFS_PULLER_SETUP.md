# DFS Puller Setup — ONE manual step

`pull_entries.py` pulls DraftKings contest leaderboards (entry lineups) using YOUR logged-in session. No auth bypass — it uses cookies you export.

## What you need (2 things)

1. **Cookie string** — from a browser where you're logged into DraftKings
2. **Contest ID** — the numeric ID from any DK contest URL

## Step 1: Export cookies (30 seconds)

**Chrome:**
1. Log into draftkings.com
2. Open DevTools (F12) → Application tab → Cookies → `https://www.draftkings.com`
3. Copy all cookies as a single `Cookie:` header string, OR:
4. Easier: install the "Get cookies.txt LOCALLY" extension → Export for draftkings.com → paste contents

**What to paste:** The full cookie string (starts with something like `datadome=...; _dk_...`). It looks like gibberish — that's correct.

## Step 2: Get contest ID

Open any DK contest in your browser. The URL looks like:
```
https://www.draftkings.com/draft/contest/123456789/...
                                    ^^^^^^^^^
                                    contest ID
```

## Step 3: Run

```bash
# Option A: env var
export DK_COOKIES="paste-your-cookie-string-here"
python3 pull_entries.py --contest 123456789

# Option B: cookies file
python3 pull_entries.py --contest 123456789 --cookies-file /path/to/cookies.txt
```

## What it does

- Pages `leaderboardfull/v3` API, 50 entries/page
- Writes `entries_{contest}.jsonl` (resumable — re-running skips done pages)
- 0.6s pacing + jitter, backoff on 429/5xx
- Stops on empty page
- Each row stamped with `observed_at`

## If it breaks

| Error | Fix |
|-------|-----|
| `FATAL: no cookies` | You skipped Step 1 |
| `FATAL: session expired (401/403)` | Cookies expired — re-export from browser |
| Empty pages immediately | Wrong contest ID or contest not started |

## Doctrine note

This pulls PUBLIC leaderboard data through YOUR session. Every row gets `observed_at`. Reads go through FreshnessGate for any downstream use. Diagnostic until stamped.
