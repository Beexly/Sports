# Sports OS — Commercial Crawling Approval Gate

**Status**: Doctrine. No crawling approved without satisfying all gates.
**Source**: Prompt 4 — Final Wave
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/audit/final-wave-source-risk-register.md` — source risk classification
- `docs/audit/piracy-malware-do-not-use-register.md` — ToS violation register
- `docs/source-providers/scores24-source-review.md` — example ORANGE provider
- `docs/audit/prompt-leak-and-sensitive-source-policy.md` — sensitive source policy

---

## Purpose

Crawling — automated access to a website for data extraction — is the
highest-risk data acquisition method for Sports OS. Done without proper
authorization, it:

1. Violates the Terms of Service of most sports data websites
2. Creates legal liability under the Computer Fraud and Abuse Act (CFAA)
   and equivalent laws in other jurisdictions
3. Exposes Sports OS to civil action from the data owner
4. Violates the "no ToS-violating data sources" doctrine in CLAUDE.md

This document defines the complete set of gates that must be satisfied
before ANY crawling of any website is implemented in the Sports OS pipeline.

**Default position**: ALL crawling is PROHIBITED until approved.

---

## The Seven-Gate Approval Process

No crawling implementation may proceed without satisfying all seven gates.
Gates must be completed in order.

---

### Gate 1 — robots.txt Review

**What to do**: Fetch and read the target site's `robots.txt` file.

**What to look for**:
- `Disallow: /` — crawling is prohibited by convention
- `User-agent: *` with `Disallow` rules — specific paths are prohibited
- `Crawl-delay:` — rate limiting requirements
- Absence of prohibition ≠ permission (robots.txt is advisory, not legal)

**Documentation required**:
```
Site: [URL]
robots.txt URL: [URL/robots.txt]
robots.txt as of date: [ISO date]
Relevant rules: [paste or summarize]
Crawling paths relevant to Sports OS: [list specific paths needed]
robots.txt status: [PERMITTED | RESTRICTED | PROHIBITED]
```

**Gate 1 FAIL condition**: `Disallow: /` or any `Disallow` covering the
specific paths Sports OS needs. In a FAIL state, proceed to Gate 2 only
to assess legal options — crawling is blocked until ToS is reviewed.

---

### Gate 2 — Terms of Service Review

**What to do**: Read the target site's Terms of Service or Terms of Use.

**What to look for**:
- Language prohibiting "automated access", "scraping", "crawling",
  "data extraction", "commercial use of data", or "bots"
- Language requiring a license or agreement for commercial use
- Language specifying the intended use of data displayed on the site

**Documentation required**:
```
Site: [URL]
ToS URL: [URL]
ToS as of date: [ISO date]
Automated access language: [quote the relevant clause]
Commercial use language: [quote the relevant clause]
Legal exposure: [HIGH | MEDIUM | LOW]
ToS status: [PERMITS CRAWLING | REQUIRES LICENSE | PROHIBITS CRAWLING]
```

**Gate 2 FAIL condition**: ToS prohibits automated access, scraping, or
commercial data use. In a FAIL state, crawling is BLOCKED. A license
agreement (Gate 3) may unblock it only if the site has an explicit
commercial licensing program.

---

### Gate 3 — API and Licensing Review

**What to do**: Determine whether the site offers an official API or
commercial data licensing program.

**What to look for**:
- An official REST API with commercial pricing
- A data licensing page or contact for commercial data partnerships
- A developer portal with documented terms

**Documentation required**:
```
Site: [URL]
Official API: [YES — [API URL and pricing] | NO]
Commercial license program: [YES — [contact/URL] | NO]
Alternative to crawling: [description of what the official data access method is]
```

**Gate 3 FAIL condition**: No official API or licensing program exists.
In a FAIL state, the source is MONITORING ONLY — no crawling and no
partnership path available.

**Gate 3 PASS condition**: An official API or licensing path exists. Proceed
to Gate 4 to evaluate whether it serves Sports OS's needs.

---

### Gate 4 — Commercial Use Permission Decision

**What to do**: Confirm that the licensing terms permit Sports OS's intended use.

**Sports OS's intended use must be confirmed**:
- Ingesting data into the prediction engine
- Deriving and displaying intelligence (not redistributing raw data)
- Publishing pick content that references the data source

**Documentation required**:
```
Site: [URL]
License type: [API commercial tier | Custom license agreement | ToS with explicit permission]
Permitted uses confirmed: [ingest for engine | derive and display | cite as source]
Redistribution of raw data: [PERMITTED | PROHIBITED]
Attribution requirements: [what must be cited in public output]
Revenue-sharing requirements: [YES — [details] | NONE]
Commercial use permission status: [CONFIRMED | UNCONFIRMED | DENIED]
```

**Gate 4 FAIL condition**: Commercial use not confirmed. Crawling blocked.
Contact the provider directly — a written email confirmation may satisfy
this gate if no formal licensing program exists.

**Gate 4 PASS condition**: Written or contractual commercial use permission obtained.

---

### Gate 5 — Rate Limit Plan

**What to do**: Define and document the crawling rate limits that will be
implemented.

**What to document**:
```
Target site: [URL]
Max requests per minute: [number]
Max requests per hour: [number]
Crawl-delay implemented: [seconds between requests]
Burst protection: [circuit breaker description]
Error handling: [what happens on 429 Too Many Requests]
Quota exhaustion behavior: [fail gracefully — do not retry aggressively]
Logging: [all requests logged with timestamp, endpoint, response code]
```

**Rule**: The rate limit plan must be MORE conservative than the site's
documented or inferred limits. Do not approach rate limits — operate at
50% of the documented limit.

---

### Gate 6 — Attribution and Storage Policy

**What to do**: Define how Sports OS will attribute the source and what
data will be stored.

**Attribution rule**:
- Any public intelligence output that derives from crawled data must cite
  the source: "[Site name] (accessed [date])"
- Raw crawled data may not be republished — only derived intelligence

**Storage policy**:
```
Data stored: [specific fields, not raw HTML dumps]
Storage duration: [e.g., "90 days for active prediction window, then archived"]
Redistribution: [NONE — internal only]
Backup retention: [documented]
Data deletion: [process for removing data if license is revoked]
```

**Gate 6 FAIL condition**: If the licensing terms prohibit storage of any
kind, or if the intended use requires raw data redistribution that the license
prohibits, the source is NOT admissible.

---

### Gate 7 — Owner Approval

**What to do**: Present the documentation from Gates 1–6 to the owner
for final approval.

**Required documentation for owner review**:
- Gate 1–6 summary document
- A recommendation from the operator on whether to proceed
- The estimated cost of the data license (if applicable)
- The implementation plan (what will be built and how)
- The risk assessment (what happens if the license is revoked mid-integration)

**Gate 7 condition**: Owner explicitly approves in writing before any
crawling code is written.

---

## What Crawling Code May NOT Be Written Until All 7 Gates Pass

The following actions are BLOCKED until all seven gates are confirmed:

- Writing any HTTP client code that accesses the target site programmatically
- Writing any HTML parser or data extraction logic targeting the site
- Writing any scheduled job that accesses the site
- Adding any adapter in `packages/data-ingestion/` targeting the site
- Configuring any worker to access the site

Writing a "prototype" or "proof of concept" is not an exception. If it makes
HTTP requests to the target site, it requires Gates 1–7.

---

## Post-Approval Requirements

After crawling is approved and implemented:

- The source must be added to the Source Acquisition Mesh with full metadata
- The source must appear in the Source Risk Register with its classification
- All requests must be logged
- The license terms must be reviewed annually (or when the site updates its ToS)
- If the site changes its ToS to prohibit crawling, crawling must stop within
  48 hours of discovery

---

## Approval Gates Summary

| Gate | What it confirms | Hard block if fails? |
|---|---|---|
| 1. robots.txt review | Conventional crawling status | Proceed with caution to Gate 2; do not crawl |
| 2. ToS review | Legal permission status | YES — crawling blocked unless commercial license resolves |
| 3. API / licensing review | Alternative access path | No — informs Gate 4 decision |
| 4. Commercial permission | Explicit authorization | YES — crawling blocked until confirmed |
| 5. Rate limit plan | Technical safety plan | YES — must be documented before any code |
| 6. Attribution and storage | Data governance | YES — must be documented before any code |
| 7. Owner approval | Final authorization | YES — crawling blocked until owner approves |

---

## Forbidden Actions

- Do NOT write crawling code before completing all 7 gates
- Do NOT treat the absence of ToS prohibition as permission
- Do NOT use robots.txt bypass techniques
- Do NOT exceed documented rate limits
- Do NOT store raw HTML dumps or scraped content beyond what the license permits
- Do NOT redistribute raw data from any crawled source
- Do NOT proceed without explicit owner approval at Gate 7

---

## Codex Audit Requirements

1. Confirm no HTTP client code in `packages/data-ingestion/` targets any source
   not present in the Source Acquisition Mesh with an ADMITTED status
2. Confirm all data ingestion adapters have a documented license classification
3. Confirm no scraping target is classified ORANGE or RED in the Source Risk Register
4. Confirm crawl-delay logic exists in any adapter that performs web requests
5. Report any HTTP client targeting an unapproved source as P0
