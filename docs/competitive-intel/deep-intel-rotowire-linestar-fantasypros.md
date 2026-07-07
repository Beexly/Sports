# Deep Intelligence: RotoWire · LineStar · FantasyPros (non-customer-facing)

*Public-record research beyond the customer-facing product teardowns. Tags:
`(documented)` = explicit in a cited public source · `(inferred)` = reasoned ·
`(speculative)` = flagged guess.*

> **Scope / integrity note.** An earlier version of this research included an
> "infrastructure forensics" pass that actively probed the companies' **non-public
> infrastructure** — gated/staging subdomains, internal load-balancer hostnames,
> speculative API paths. That crossed from passive OSINT into unauthorized active
> reconnaissance and was correctly flagged by a security control. **All of that
> content has been excluded from this document** and will not be gathered again.
> What remains below is strictly passive-public: patents/trademarks (public
> registries), corporate filings and press releases, court dockets, and stacks
> disclosed in the companies' own public job postings / published files. See
> [[feedback-osint-passive-only]] in project memory for the standing rule.

## Executive summary — the highest-value findings

1. **RotoWire is a division of a public company.** Its own footer states the
   chain: *"GDC Media Limited, licensed to GDC America Inc and sub-licensed to
   Roto Sports Inc."* GDC Media is a subsidiary of **Gambling.com Group Limited
   (Nasdaq: GAMB)**, which acquired Roto Sports (RotoWire) for **$27.5M aggregate**
   — $20.0M at close ($15.0M cash + $5.0M GAMB stock) + $7.5M deferred earnout —
   announced Dec 13 2021, closed Jan 1 2022 (~4× 2021 revenue). Cross-verified
   across multiple trade outlets. *(documented)* — [SBC Americas](https://sbcamericas.com/2022/01/04/gambling-com-group-completes-acquisition-of-roto-sports-inc/), [RotoWire T&Cs](https://www.rotowire.com/termsandconditions.php)

2. **The single most strategically relevant finding: LineStar/BetFully has a
   pending 2024 patent on real-time adaptive prediction.** **US20250140075A1**,
   *"Adaptive real-time sports event simulation and optimization system,"* filed
   Oct 31 2024 (priority Nov 1 2023), published May 1 2025, **status PENDING**,
   assignee Betfully Inc, **8 named inventors** (Erik & Peter Groset + 6 others).
   Applies ML to historical + real-time data to continuously **recalibrate
   predictions**, tracking variance between successive forecasts and surfacing
   recommendations only past a user-defined threshold. This is conceptually
   adjacent to GSE's own edge-engine/calibration work. *(documented)* — [Google Patents](https://patents.google.com/patent/US20250140075A1/en)

3. **LineStar's inventor team roughly tripled** (3 named inventors on the
   original patents → 8 on the 2024 filing) and their own site self-declares
   *"additional patents pending."* A genuinely small company (see #5) with an
   **accelerating, not dormant, patent program.** *(documented)* — [linestarapp.com/registrations](https://www.linestarapp.com/registrations)

4. **RotoWire runs zero engineering hiring under its own brand** — its careers
   page is 100% editorial/content/customer-service. Technical work appears
   centralized at parent Gambling.com Group, which has a named ~12-person
   central Technology & Development team (Lead Data Scientist, Lead Data
   Engineer, Principal Developers, etc.), though no public source ties that team
   to RotoWire's codebase specifically. *(documented careers page; parent-team
   link inferred)* — [rotowire.com/jobs.php](https://www.rotowire.com/jobs.php), [theorg.com](https://theorg.com/org/gambling-com/teams/technology-and-development-team)

5. **LineStar is a "small team, big moat."** Public org data shows a 3-person
   visible org chart (Erik Groset CEO, Peter Groset CTO, community manager);
   third-party trackers show as few as **~4 employees (Tracxn, Oct 2025)**. Yet
   this is the most patent-sophisticated of the three. Don't dismiss on
   team-size grounds. *(documented)* — [theorg.com](https://theorg.com/org/fantasy-sports), [Tracxn](https://tracxn.com/d/companies/betfully/__uf6PJpHGYrlkjQN9okEn4iS9aBRmCnvZ9c8nmqUpZ5Q)

6. **FantasyPros is the only one hiring engineers openly**, with public postings
   (Back-End / Front-End / Junior iOS) disclosing a **LAMP + Python + Vue/React/
   Angular + Swift, AWS** stack — and a genuine product blog (Ghost CMS)
   announcing AI features ("Coach" assistant, AI injury prediction). *(documented,
   from their own careers page + blog)* — [FantasyPros careers](https://www.fantasypros.com/about/careers/web-developer/), [blog.fantasypros.com](https://blog.fantasypros.com/)

7. **FantasyPros is the only one with a confirmed litigation footprint:**
   *Marzen Media LLC v. FL Newsletter LLC ("Fantasy Life")*, D. Nev.
   2:24-cv-01883, filed Oct 8 2024 — a **copyright** suit over "code, features,"
   settled/dismissed with prejudice June 13 2025. Plus two referenced ADA
   web-accessibility suits (existence noted, outcomes unverified). A clean record
   for RotoWire/LineStar here means *not researched*, not *confirmed clean*.
   *(documented)* — [Bloomberg Law](https://news.bloomberglaw.com/litigation/fantasy-sports-sites-settle-copyright-case-over-code-features)

## Patents & IP

**RotoWire** — **no patents** found for Roto Sports Inc or GDC Media (Justia
assignee search returns none; T&Cs cite only generic IP boilerplate). Parent GDC
Media holds a **16-mark US trademark portfolio** incl. GAMBLING.COM (Reg.
4468796). IP moat sits at the parent-brand/trademark level, not in
fantasy-prediction tech. *(documented)*

**LineStar/BetFully** — **strongest of the three.** Four issued patents
(9,751,010 / 9,744,450 / 10,478,721 / 11,660,533) + the pending
**US20250140075A1** (real-time adaptive simulation, above) + **US20230105046A1**
("automated personalized incentives," a rewards/cashback engine, **ABANDONED**).
BETFULLY word-mark application Serial 90898661 filed Aug 24 2021 (+ a same-day
sibling filing for advertising services). Applicant of record is a Delaware
corp, "Fantasy Sports Company," Carlsbad CA address. *(documented)*

**FantasyPros/Marzen Media** — **no patents** (none for Marzen Media LLC or
founder Vincent P. Marzen). FANTASYPROS word mark Reg. 4671593 (filed 2014, reg.
2015); a newer 2023 filing (Serial 98211306) exists, status unconfirmed. No mark
for "Expert Consensus Rankings"/"ECR" — they treat the methodology as an
unregistered brand asset. *(documented / inferred)*

## Corporate & financial

- **RotoWire → Gambling.com Group (Nasdaq: GAMB).** Full acquisition economics
  above; run under GAMB CEO Charles Gillespie with co-founder Peter Schoenke
  still leading the division. RotoWire-specific financials fold into GAMB's
  consolidated public filings (a logical next step: pull GAMB's SEC 20-F for
  segment detail). *(documented)*
- **LineStar** — private; entity naming split between **BetFully Inc** (brand /
  patent-trademark assignee) and **Fantasy Sports Company** (trademark applicant
  of record). Funding/ownership/revenue not researched. *(documented entity
  naming; rest an open gap)*
- **FantasyPros** — private, **Marzen Media LLC** (founder Vincent P. Marzen).
  Funding/M&A not researched. *(documented entity; rest an open gap)*

## Engineering & organization (from public sources only)

- **RotoWire** — zero technical roles on its own careers page; no named technical
  leadership under the RotoWire brand; parent GAMB has a real central tech org.
  Third-party headcount estimates are wildly inconsistent across aggregators
  (~25 FT + 160 contributors per Crunchbase, 51–200 per ZoomInfo) — no reliable
  single figure. *(documented)*
- **LineStar** — 3-person visible org chart; ~4 employees (Tracxn, Oct 2025);
  Peter Groset is CTO. No engineering job postings found. CEO Erik Groset's
  public podcast appearances are business-focused, no technical content.
  *(documented)*
- **FantasyPros** — the only one with current, public technical job postings and
  a stack disclosed in its own careers copy (LAMP, AWS, Python, Vue/React/
  Angular, Swift). Named technical leadership / team size not obtained (open gap).
  *(documented postings; org-chart a gap)*

## Tech stack (passive-public only)

Read strictly from **normal homepage response headers, published `robots.txt` /
`llms.txt` / `sitemap.xml`, public GitHub org pages, and the companies' own
published careers/blog pages** — no probing of non-public hosts:

- **RotoWire** — Cloudflare-fronted **PHP** (HSTS on); `github.com/rotowire`
  exists but has 0 public repos; `llms.txt` self-describes covering *"legal US
  online casinos, social casinos and sweepstakes casinos"* (confirms the
  gambling-affiliate positioning). *(documented)*
- **LineStar** — **DotNetNuke / ASP.NET**, no CDN headers; `sitemap.xml` not
  regenerated since ~2016 (all URLs dated Aug–Sept 2016) — a frozen web presence
  next to an active patent program. *(documented)*
- **FantasyPros** — Apache behind **Amazon CloudFront**; careers page discloses
  the LAMP/AWS/Vue stack; Ghost-powered product blog with AI-feature
  announcements; `github.com/fantasypros` org exists with 0 public repos.
  *(documented)*

*(Infrastructure-reconnaissance findings — enumerated staging/gated hosts,
internal hostnames, speculative-path probing — were excluded per the scope note
at the top. They were neither legitimate nor useful to GSE.)*

## Legal & regulatory

- **FantasyPros** — the Marzen Media v. Fantasy Life **copyright** suit (settled
  June 2025) + two referenced ADA accessibility suits (existence only). *(documented)*
- **RotoWire, LineStar** — no litigation found, but this dimension was **not
  deeply searched** — treat as unresearched, not confirmed-clean.

## Data supply chain

Only one incidental data point: FantasyPros' **public status page** discloses a
past live-feature outage caused by *"an issue with our data provider"* — i.e.
FantasyPros depends on ≥1 unnamed third-party stats vendor, and that dependency
has caused visible incidents. *(documented — from their published status page)*
Vendor names for all three otherwise unresearched.

## Cross-competitor read

- **Patent/IP defensibility (most relevant to GSE's prediction tech): LineStar
  is most formidable** — smallest team, weakest web infra, but the deepest and
  most *active* patent portfolio, newest filing squarely on real-time adaptive
  simulation.
- **Corporate staying power: RotoWire** — backstopped by a public, capitalized
  parent (GAMB).
- **Engineering execution/modernity: FantasyPros** — only one with real current
  technical hiring + modern stack.

## GSE implications

- **Actionable:** before GSE ships any feature with meaningful overlap on
  *real-time recalibration + variance-threshold-gated recommendations*, have
  counsel diff GSE's actual architecture against the **claims language** (not the
  abstract) of **US20250140075A1** as a freedom-to-operate check. This is the one
  finding that warrants concrete follow-up. Ties to [[project-gse-competitive-intel-optimizer]].
- **Reinforces (doesn't change) existing strategy:** RotoWire's gambling-affiliate
  corporate reality contrasts with GSE's deliberate no-gambling-optimizer stance
  ([[project-gse-gaming-stance]]); FantasyPros' copyright/ADA litigation validates
  GSE's already-high code-provenance and accessibility hygiene; FantasyPros'
  data-provider incident validates GSE's fail-closed sourcing doctrine.
- **Not much changes:** web-infra color (who runs Cloudflare vs DotNetNuke) is
  not an actionable competitive threat.

## Sources (public record)

[SBC Americas — GAMB/Roto Sports acquisition](https://sbcamericas.com/2022/01/04/gambling-com-group-completes-acquisition-of-roto-sports-inc/) ·
[Google Patents US20250140075A1](https://patents.google.com/patent/US20250140075A1/en) ·
[Google Patents US20230105046A1](https://patents.google.com/patent/US20230105046A1/en) ·
[LineStar registrations](https://www.linestarapp.com/registrations) ·
[Justia — Roto Sports assignee](https://patents.justia.com/assignee/roto-master-inc) ·
[Justia — GAMBLING.COM mark](https://trademarks.justia.com/857/77/gambling-85777737.html) ·
[Justia — FANTASYPROS mark](https://trademarks.justia.com/863/08/fantasypros-86308985.html) ·
[Justia — Vincent P. Marzen inventor](https://patents.justia.com/inventor/vincent-p-marzen) ·
[Bloomberg Law — Marzen v. Fantasy Life](https://news.bloomberglaw.com/litigation/fantasy-sports-sites-settle-copyright-case-over-code-features) ·
[theorg — Gambling.com tech team](https://theorg.com/org/gambling-com/teams/technology-and-development-team) ·
[theorg — Fantasy Sports Company](https://theorg.com/org/fantasy-sports) ·
[FantasyPros careers](https://www.fantasypros.com/about/careers/web-developer/) ·
[RotoWire T&Cs](https://www.rotowire.com/termsandconditions.php)
