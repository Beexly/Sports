# Public surface

Fetched from https://www.galaxysportsedge.com/llms.txt on 2026-10-02. These are the only endpoints this skill may call.

## JSON

- GET https://www.galaxysportsedge.com/api/proof/ledger
  Machine-readable ledger. Live check 2026-10-02: HTTP 200. Substantiated seasons: 0.
- GET https://www.galaxysportsedge.com/api/proof/receipts
  Settled receipts only, paginated. Pre-kickoff receipts are not listed.
  Live check 2026-10-02: HTTP 200 on ?limit=1.
- GET https://www.galaxysportsedge.com/api/verify?hash=<64-hex-sha256>
  Pre-kickoff returns SEALED. Post-kickoff settled receipts open.
- GET https://www.galaxysportsedge.com/api/proof/openapi.json
- GET https://www.galaxysportsedge.com/api/proof/verification-spec.json

## Pages an agent may cite, not scrape for numbers

- https://www.galaxysportsedge.com/proof
- https://www.galaxysportsedge.com/verify
- https://www.galaxysportsedge.com/methodology
- https://www.galaxysportsedge.com/calibration
- https://www.galaxysportsedge.com/data
- https://www.galaxysportsedge.com/how-we-make-money
- https://www.galaxysportsedge.com/responsible-play
- https://www.galaxysportsedge.com/llms.txt

## Not in this skill

Rankings, projections, and published picks are named in the mission. The public ledger does not currently serve a substantiated ranking or a projection feed. Until /llms.txt lists one, this skill does not invent the URL.
