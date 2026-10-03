# Service worker product value (honest)

**File:** `apps/web/public/sw.js`

## What it is
Web **Push notification** service worker only:
- `push` → system notification
- `notificationclick` → focus/open URL

## What it is NOT
- Not an offline app cache
- Not a PWA “install for offline board”
- Does not intercept `fetch` or cache HTML/API

## When it is valuable
Only when:
1. User grants notification permission
2. Web-push subscription is stored
3. Server sends a push (watchlist / alerts path)

Without those, the SW is inert — **correct**, not a bug.

## Product rule
Do not market “offline GSE” or “install our PWA for live odds” while SW is push-only.
Manifest description already avoids live-odds cadence claims.

## Autonomy note
Agents: leave SW push-only unless founder asks for offline product and accepts cache complexity + honesty risk.
