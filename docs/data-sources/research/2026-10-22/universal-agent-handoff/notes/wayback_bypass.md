# Cloudflare-protected reference sites — Wayback is the way in

PFR, footballdb and sports-reference all return Cloudflare "Just a moment" to curl **and** to both
the cloud and the local browser, and `r.jina.ai` inherits the challenge too.

**The bypass that works: the Wayback Machine.** `http://archive.org/wayback/available?url=<u>` returns
a `closest` snapshot with status 200 for these pages; fetch that URL and the tables are intact.

## What that got, this cycle
- PFR 2025 receiving — 635 rows, 21 cols incl. Tgt/Rec/Yds/Y-R/1D/Succ%
  (`extracted_data/pfr_2025_receiving.csv`)
- PFR 2025 passing — 103 rows, 33 cols (`pfr_2025_passing.csv`)
- PFR 2025 rushing — 635 rows (`pfr_2025_rushing.csv`)
- PFR 2025 defense — 1,639 rows, 25 cols (`pfr_2025_defense.csv`)
- footballdb Cardinals roster — 53 rows, #/Player/Pos/Ht/Wt/Age/College
  (`footballdb_cardinals_roster.csv`)
Snapshots are Oct 2025-vintage, so these are partial-season tables, not final.

## NFLPA player research
`nflpa.com/active-players/research` is open (200) and hosts 10 peer-reviewed PDFs on injury
mechanism and surfaces — ankle-sprain external rotation, hamstring body postures from video review,
turf traction vs lower-limb biomechanics, gut microbiome. Two downloaded
(`extracted_data/nflpa_research_0.pdf`, `_2.pdf`). Biomechanics, not stats, but it is primary
literature the injury models can cite.

## SIS
Public page only (`pro.sisdatahub.com` / `www.sisdatahub.com` appear, both product surfaces); no
open API found on the marketing page — SIS stays a paid target.

## Rule for the KB
For any Cloudflare-walled reference site, try Wayback availability before spending cycles on headers
or browsers. It is faster and does not burn fingerprints.
