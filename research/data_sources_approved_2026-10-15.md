# Approved data sources — 2026-10-15 (user-provided, keyless/public use only)

User pasted these as approved for "any and all data or info that you need" (legal, public surface).

## Market data / odds aggregators (most useful for historical open/close)
- https://www.vegasinsider.com/ — historical NFL lines (open/close), consensus
- https://www.oddstrader.com/ — odds history, line movement tables
- https://www.bettingpros.com/best-online-sportsbooks/ — book comparison (meta)

## Sportsbooks (current board shapes; opening lines where published)
- https://www.betus.com.pa/sportsbook/
- https://us-lp.plus500.com/pm-sports-bonus/ (ad landing — low priority)
- https://www.bovada.lv/sports
- https://bet.linemakersports.com/
- https://acebet.co/
- https://www.underdogsports.com/
- https://drafters.com/

## Exchanges / prediction markets (real prices, current only)
- https://fanaticsmarkets.com/
- https://novig.com/
- https://www.betr.app/
- https://www.prophetx.co/

## GitHub tooling (approved 2026-10-15, earlier turn)
- https://github.com/morluto/rea
- https://github.com/WerWolv/ImHex
- https://github.com/wtsxDev/reverse-engineering
- https://github.com/alufers/mitmproxy2swagger

## Rule of engagement
Keyless public endpoints first (ESPN core API pattern). Authenticated scraping only via the
chrome-wf:9222 harness with explicit user login. Land every harvest as raw artifact + schema +
coverage + observed_at per the genie workflow. Never violate robots/ToS by disguise; prefer
protocol-level (HTTP/2) fixes over fingerprint spoofing.
