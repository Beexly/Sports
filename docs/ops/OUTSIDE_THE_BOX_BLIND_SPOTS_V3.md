# Outside-the-box blind spots (v3) — what we under-leveraged

Multi-domain. Not another settle/Jynx essay.

## Found this pass (live probe 2026-08-06)

| Blind spot | Why it mattered | Action |
|------------|-----------------|--------|
| **Deploy ≠ main** | Prod SHA still on older Jynx-only build; `founderNextSteps` absent live | Founder redeploy (still #1 ops action) |
| **PWA/manifest copy lie** | `site.webmanifest` claimed “live odds every 30 min” while LIVE_BOARD off | Honest description shipped |
| **favicon.ico / apple-touch 404** | Chrome/iOS default paths 404 → unprofessional chrome | Redirects to brand emblems |
| **security.txt missing** | Frontier product with no RFC 9116 contact surface | `/.well-known/security.txt` |
| **ads.txt missing** | Crawlers invent ad inventory; GSE doesn’t sell display | Honest “no sellers” ads.txt |
| **humans.txt / ai.txt** | Brand + AI agent discovery underused (`llms.txt` existed) | humans.txt + ai.txt→llms.txt |
| **RSS orphaned** | Podcast + journal feeds existed; homepage didn’t advertise | layout `alternates.types` RSS |
| **Feed discovery gap** | Agents know `/llms.txt` proof; few humans find `/podcast/feed.xml` | linked via metadata |

## Still under-leveraged (next loops — not ignored)

| Blind spot | Why | Gate |
|------------|-----|------|
| **Sitemap density (~900 URLs)** | Crawl budget / thin pages risk | Audit thin fantasy/* vs core |
| **CSP on main document** | Headers partial; frame-ancestors split | Security review, not drive-by |
| **Service worker `sw.js`** | Exists; offline value unclear | Product decision |
| **PostHog/Clarity open PRs** | Analytics leverage stalled in draft | Founder pick one |
| **Jarvis process-local history** | Multi-instance forgets | Durable later |
| **Email deliverability** | Waitlist stores leads; no send path | Founder ESP |
| **Partner logos / press kit assets** | Press page HTML-only | Content pack |
| **News sitemap thin** | 170 bytes live | Only when real news posts |

## Outside-the-box rule

If a path is a **browser or bot default** (favicon, security.txt, ads.txt, manifest, RSS auto-discover) and we 404, we are **leaving free trust on the table** — same class of failure as unfinished public copy.

## Related code

- `app/.well-known/security.txt` · `ads.txt` · `humans.txt` · `ai.txt` · `favicon.ico` · `apple-touch-icon.png`
- `public/site.webmanifest`
- `app/layout.tsx` RSS alternates
- `app/llms.txt` (already strong proof agent surface)
