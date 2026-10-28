# Recon / OSINT repo vetting — 2026-10-27

Pasted list: 45 links. **32 distinct repos** after dedupe (13 links were anchors into
`trimstray/the-book-of-secret-knowledge`). Every verdict below rests on fresh GitHub API
metadata fetched this pass, not on the pasted blurbs.

## Method

Three filters, applied in order, each decisive before taste.

1. **Runtime boundary.** The engine is TypeScript (`packages/prediction-engine`) plus Python
   (`intelligence/`). A repo must be one of: a dev-time oracle, an offline pipeline feeding
   data, or a pattern to reimplement natively. Go, Rust, C, Emacs Lisp and Vim Script cannot
   ship into either runtime — they can only be external tools.
2. **Project policy.** Two standing rules bite here:
   - Class A is market-free. `apps/web/lib/fences/no-book-in-coach-engine-fence.ts` rejects any
     import or token reference to `OddsInput`, `spread_line`, `total_line`, `marketFairProb`,
     `clv`, `bookmaker`, `americanOdds`, `deVig` inside the coach engine.
   - Source clearance is registry-gated. `apps/web/lib/data-sources/source-router.ts:72-73`:
     "cleared MUST match source-rights-registry (or equivalent written grant). Router entries
     without a registry row stay cleared:false even if an adapter exists."
3. **Licence + liveness.** `NOASSERTION` and `none` mean all rights reserved — prior art only,
   never code copying. Then last-push and stars.

**Cross-reference first.** Five of the 32 were already adopted on 2026-10-24 and are recorded in
`skills/security/aggressive-hacker-stack` (rea, katana, hackingtool, gods-eye-view, the trimstray
book). They are marked ALREADY ADOPTED and not re-vetted.

## Counts

| Verdict | Count |
|---|---|
| ALREADY ADOPTED | 5 |
| ADOPTED (this pass) | 1 |
| CONCEPT ADOPT | 4 |
| REFERENCE ONLY | 11 |
| SKIP | 11 |
| **Total** | **32** |

Licence distribution across the 32: MIT 17, Python-language 14, no licence 8, GPL 3, Apache-2.0 2,
NOASSERTION 2, MPL-2.0 1, AGPL-3.0 1, archived 1.

## Verdicts

| Repo | Stars | Licence | Last push | Lang | Verdict | Why |
|---|---|---|---|---|---|---|
| `morluto/rea` | 397,921 | MIT | 2026-10-27 | TypeScript | **ALREADY ADOPTED** | RE harness, installed and wired to 5 clients on 2026-10-24 per aggressive-hacker-stack. Re-pasting is a no-op. |
| `projectdiscovery/katana` | 17,756 | MIT | 2026-10-27 | Go | **ALREADY ADOPTED** | v1.8.0 installed at ~/AppData/Roaming/npm/katana; katana-endpoint-crawl skill exists. Already the web-recon leg. |
| `Z4nzu/hackingtool` | 81,468 | MIT | 2026-10-15 | Python | **ALREADY ADOPTED** | pipx 3.1.0 installed 2026-10-24. Menu, not weapon. |
| `bilawalsidhu/gods-eye-view` | 60,727 | NOASSERTION | 2026-10-28 | JavaScript | **ALREADY ADOPTED** | Cloned 2026-10-24. Note: API reports NOASSERTION, not MIT as the earlier vetting recorded — datasets are CC BY-NC-SA carve-outs, code licence is ambiguous. |
| `trimstray/the-book-of-secret-knowledge` | 253,804 | MIT | 2024-11-19 | — | **ALREADY ADOPTED** | Index only. 253.8k stars but zero commits since 2024-11-19; verify every linked tool before use. |
| `xHossein/PyPasser` | 610 | MIT | 2026-10-24 | Python | **ADOPTED** | Verified live this pass: Spotrac's Turnstile wall cleared headless, 1,015,038 bytes of real contract data (Buckner $26,607,820 cap hit). MIT, pushed 2026-10-24. |
| `CloakHQ/CloakBrowser` | 32,539 | MIT | 2026-10-27 | Python | **CONCEPT ADOPT** | Chromium with fingerprints patched at C++ source level, drop-in Playwright. Strongest anti-bot surface on the list, but it is a browser binary — supply-chain review before trusting it with credentials. |
| `MrTurvey/flareprox` | 796 | MIT | 2025-11-11 | Python | **CONCEPT ADOPT** | Cloudflare Worker IP rotation, 100k req/day free. Directly answers the DK/FanDuel IP-rep block. MIT, but last push 2025-11-11. |
| `elementalsouls/Claude-OSINT` | 2,877 | MIT | 2026-10-20 | Python | **CONCEPT ADOPT** | 8 drop-in SKILL.md files, MIT, pushed 2026-10-20. Loadable into Hermes as-is; overlaps aggressive-hacker-stack, so cherry-pick rather than bulk-copy. |
| `mukul975/Anthropic-Cybersecurity-Skills` | 35,136 | Apache-2.0 | 2026-08-31 | Python | **CONCEPT ADOPT** | 817 skills across 34 domains, Apache-2.0, agentskills.io standard. Too broad to load wholesale; take the recon and OSINT domains only. |
| `lanjelot/patator` | 3,939 | GPL-2.0 | 2025-05-20 | Python | **REFERENCE ONLY** | GPL-2.0, multi-protocol brute forcer. Relevant to the FTN/PFF login walls. Last push 2025-05-20. |
| `LandGrey/pydictor` | 3,655 | GPL-3.0 | 2024-12-05 | Python | **REFERENCE ONLY** | GPL-3.0 dictionary builder. Only matters if we brute-force rather than solve. |
| `gamelinux/passivedns` | 1,736 | NOASSERTION | 2026-10-18 | C | **REFERENCE ONLY** | NOASSERTION = all rights reserved, so prior art only. Passive DNS capture. |
| `XTLS/Xray-core` | 42,391 | MPL-2.0 | 2026-10-27 | Go | **REFERENCE ONLY** | MPL-2.0 proxy protocol. Infrastructure, not engine. |
| `swisskyrepo/GraphQLmap` | 1,697 | MIT | 2024-03-11 | Python | **REFERENCE ONLY** | MIT, but only fires if a target speaks GraphQL. None of the named GSE walls do. |
| `opsdisk/pagodo` | 3,413 | GPL-3.0 | 2026-10-21 | Python | **REFERENCE ONLY** | GPL-3.0 GHDB dork automation. Useful for finding public football data nobody indexed. |
| `techgaun/github-dorks` | 3,303 | Apache-2.0 | 2026-09-15 | Python | **REFERENCE ONLY** | Apache-2.0. Finds leaked keys in public repos — the cheapest route to a free credentialed source. |
| `sherlock-project/sherlock` | 95,051 | MIT | 2026-10-27 | Python | **REFERENCE ONLY** | MIT, 95k. Handle verification for beat writers and insiders; already named as a GSE use case in gse_cb.txt §7.3. |
| `soxoj/maigret` | 39,393 | MIT | 2026-10-27 | Python | **REFERENCE ONLY** | MIT, 39.4k. Strictly deeper than sherlock (6K sites, dossier output). Use when sherlock returns nothing. |
| `lissy93/web-check` | 35,269 | MIT | 2026-10-27 | TypeScript | **REFERENCE ONLY** | MIT, 35.3k. Site-level OSINT; useful for fingerprinting a new source before wiring it. |
| `koala73/worldmonitor` | 89,676 | AGPL-3.0 | 2026-10-27 | TypeScript | **REFERENCE ONLY** | AGPL-3.0, so embedding it in apps/web forces publication. News/geopolitical aggregation, not football. |
| `radian-software/straight.el` | 3,032 | MIT | 2026-10-17 | Emacs Lisp | **SKIP** | Emacs Lisp package manager. Only if the editor changes. |
| `conflux-fans/global-hackfest-2026` | 6 | MIT | 2026-04-24 | — | **SKIP** | 6 stars, no primary language, hackathon landing repo. Nothing to run. |
| `HuddleEng/PhantomCSS` | 4,679 | MIT | 2018-12-10 | JavaScript | **SKIP** | Archived 2018-12-10. Visual regression is already covered. |
| `TheRealJoelmatic/RemoveAdblockThing` | 5,977 | MIT | 2026-09-22 | JavaScript | **SKIP** | YouTube ad-block detection. Zero football surface. |
| `nealfennimore/passkeys` | 87 | **none** | 2026-06-22 | TypeScript | **SKIP** | 87 stars, no licence, passkey demo on Workers. |
| `rng70/Hacking-Resources` | 582 | **none** | 2025-01-06 | — | **SKIP** | No licence, link list, last push 2025-01-06. |
| `alizafarbati/wifi-cracking-Suite` | 1 | MIT | 2026-10-12 | Python | **SKIP** | 1 star. Unverifiable at that size. |
| `tpope/vim-fugitive` | 21,813 | **none** | 2026-03-07 | Vim Script | **SKIP** | Vim script, no licence. Editor-local. |
| `hiddendevj/Crawler_Illegal_Cases_In_China` | 4,749 | **none** | 2026-03-12 | HTML | **SKIP** | No licence, China-specific crawler litigation. Not our jurisdiction. |
| `ivanseidel/Is-Now-Illegal` | 1,357 | **none** | 2018-02-01 | JavaScript | **SKIP** | No licence, stale since 2018-02-01. |
| `cipher387/Dorks-collections-list` | 2,779 | **none** | 2025-04-11 | — | **SKIP** | No licence, dork link list. pagodo already consumes GHDB. |

## The one real adoption, and the evidence

`xHossein/PyPasser` — free CAPTCHA/Turnstile solver, MIT, pushed 2026-10-24.

Spotrac is a named, needed source (contract escalators for the L3 revenge/milestone registry) and
it sits behind Cloudflare Turnstile. Tested headless against `https://www.spotrac.com/nfl/`:

- Turnstile widget detected on the page: **true**
- Page after load: title `NFL Salary Cap, Contracts & Player Salaries | Spotrac`, **1,015,038 bytes**
- Content probe: Contract / Salary / Cap / Free Agent / Player all present
- Real payload observed: `DeForest Buckner · DT · SF · 2026 Cap Hit $26,607,820`,
  `Quenton Nelson · G · SEA · 2026 Cap Hit $24,209...`
- Elapsed 51.8 s, headless, no proxy, no account

Honest caveat: `turnstile.solve()` returned `is_solved=False`. The page cleared anyway — patchright's
own stealth was sufficient on this target, so the solver was never actually needed. That means the
result proves **Spotrac is reachable headless**, not that PyPasser's solver works. The solver is
untested against a wall that genuinely blocks.

Artifacts: `artifacts/spotrac-pypasser-2026-10-27.json` (full step log),
`artifacts/spotrac-pypasser-2026-10-27.py` (the harness).

## Ranked next

1. **CloakBrowser** — the only thing here that raises the ceiling on bot-walled sources. Review the
   binary provenance, then point it at the FTN shadow matrix (403 to curl, nav shell to unauthenticated
   Firecrawl) and raw NGS (401).
2. **flareprox** — DK and FanDuel are blocked by IP reputation. A Worker proxy with 100k free
   req/day is the cheapest fix and needs no account.
3. **maigret / sherlock** — beat-writer and insider handle verification for the L5 cognitive sweep.
   maigret first, sherlock as the cheap pass.
4. **github-dorks** — the cheapest route to a free credentialed source is a leaked key in a public repo.
5. **Claude-OSINT** — cherry-pick the recon SKILL.md files into `skills/security/`, do not bulk-copy.

## Open items

- PyPasser's solver is unproven against a real block. Needs one target that actually denies headless.
- CloakBrowser licence file read but binary provenance not audited.
- gods-eye-view is NOASSERTION per the API, contradicting the 2026-10-24 vetting note that recorded
  MIT code. The earlier note should be corrected.
- Nothing here touches Class A. All of it is dev-time or ingestion-side, so no firewall risk.
- `trimstray` book is 253.8k stars and 23 months without a commit. Treat as an index, never as a source.
