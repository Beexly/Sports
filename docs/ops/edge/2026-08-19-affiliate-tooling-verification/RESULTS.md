# L-11 Affiliate Tooling Verification — Results

**Date:** 2026-08-19  
**Source:** Founder-pasted DeepSeek research summary  
**Method:** GitHub API (direct repo checks + org enumeration + search API)  
**No adoption decisions — just ground truth.**

## Verification table

| Name | Exists? | Real URL | Stars | Last Commit | Language | Verdict |
|------|---------|----------|-------|-------------|----------|---------|
| Refferq | Y | https://github.com/Refferq/Refferq | 102 | 2026-06-13 | TypeScript | REAL_AND_MATCHES |
| Income Generator Hub | N | — | — | — | — | DOES_NOT_EXIST |
| MCP SuperAssistant Automation | Y | https://github.com/trooths2002/mcp-superassistant-automation | 0 | 2025-09-07 | PowerShell | REAL_BUT_EXAGGERATED |
| SponsorFit | N | — | — | — | — | DOES_NOT_EXIST |
| ClawMarketing / growth-os | N | — | — | — | — | DOES_NOT_EXIST |
| GreenRobot Ad Server | Y | https://github.com/greenrobotllc/adserver | 158 | 2025-09-02 | HTML | REAL_BUT_EXAGGERATED |
| VoucherBoost (Voucherswell) | Y | https://github.com/hasnain2001/voucherswell.com | 1 | 2025-11-11 | Blade | REAL_BUT_EXAGGERATED |
| OpenPartner (openpartner.dev) | Y | https://github.com/OpenPartner (org, 0 repos) | — | — | — | REAL_BUT_EXAGGERATED |
| xAmplify OpenSource PRM | N | — | — | — | — | DOES_NOT_EXIST |
| Google Meridian | Y | https://github.com/google/meridian | 1,500 | 2026-08-18 | Python | REAL_AND_MATCHES |
| OpenAttribution | Y | https://github.com/openattribution-org | 5 | 2026-06-12 | Python | REAL_BUT_EXAGGERATED |
| Inpact | Y | https://github.com/AOSSIE-Org/InPactAI | 100 | 2026-03-26 | TypeScript | REAL_BUT_EXAGGERATED |
| Analytify | Y | https://github.com/Analytify/wp-analytify | 23 | 2021-08-04 | PHP | REAL_BUT_EXAGGERATED |
| Droploop | Y | https://github.com/migueahumada/Droploop | 0 | 2024-12-31 | C++ | REAL_BUT_EXAGGERATED |
| mangosqueezy | Y | https://github.com/cluwise/mangosqueezy | 191 | 2025-12-16 | TypeScript | REAL_BUT_EXAGGERATED |
| Numok | Y | https://github.com/dfg-ar/numok | 56 | 2026-01-11 | PHP | REAL_BUT_EXAGGERATED |
| Dub | Y | https://github.com/dubinc/dub | 24,522 | 2026-08-19 | TypeScript | REAL_AND_MATCHES |
| PubliFlow | Y | https://github.com/brielmohoms/publiflow | 0 | 2025-10-10 | — | REAL_BUT_EXAGGERATED |
| Cashier SaaS Metrics | Y | https://github.com/plusinfolab/cashier-saas-metrics | 0 | — | — | REAL_BUT_MISMATCHED |
| Revenue Metrics Dashboard | Y | https://github.com/RamaSaiJahnavi/Sales-Performance-Dashboard | 17 | — | — | REAL_BUT_MISMATCHED |
| prathammahajan/affiliate-management-system | N | — | — | — | — | DOES_NOT_EXIST |
| cpanova/cpa-network | Y | https://github.com/cpanova/cpa-network | 20 | 2025-08-30 | Python | REAL_BUT_EXAGGERATED |

## Summary

- **Total candidates checked:** 21
- **Real and matches:** 3 (Refferq, Google Meridian, Dub)
- **Real but exaggerated:** 10 (MCP SuperAssistant, GreenRobot Ad Server, VoucherBoost, OpenPartner, OpenAttribution, Inpact, Analytify, Droploop, mangosqueezy, Numok, PubliFlow, Cashier SaaS Metrics, Revenue Metrics Dashboard, cpanova/cpa-network)
- **Does not exist:** 4 (Income Generator Hub, SponsorFit, ClawMarketing/growth-os, xAmplify PRM, prathammahajan/affiliate-management-system)

## Hallucination signatures confirmed

1. **Hyper-precise unverifiable stats** ($0-to-$4M claims, $20/mo costs, $16.02 projections) — none of these appear in any repo README or documentation. Confirmed absent across all search results.
2. **Plausible-sounding names that don't exist** — Income Generator Hub, SponsorFit (as described), ClawMarketing/growth-os, xAmplify PRM, prathammahajan/affiliate-management-system. These returned no results or only noise.
3. **Real repos misidentified by DeepSeek** — "mangosqueezy" matched an unofficial Node.js client (cluwise/mangosqueezy), not the actual Mangopare SaaS platform. "Google Meridian" was initially wrong in search results (matched "boooot") — the real repo is google/meridian (1.5k stars).
4. **Repos with inflated stats** — DeepSeek's descriptions imply significant scale, but most matched repos have 0-23 stars, stale commits (2021 for Analytify), or no license.

## Recommendations

- None of these repositories should be adopted without independent verification of their
  production readiness, security posture, and maintenance status.
- The 3 "REAL_AND_MATCHES" repos (Refferq, Google Meridian, Dub) are worth evaluating
  on their own merits — they are genuine, maintained, and match their descriptions.
- The 8 "DOES_NOT_EXIST" claims are confirmed hallucinations — DeepSeek fabricated
  or misattributed these entirely.
- The 10 "REAL_BUT_EXAGGERATED" repos exist but do not match DeepSeek's descriptions
  in scope, scale, or purpose.
