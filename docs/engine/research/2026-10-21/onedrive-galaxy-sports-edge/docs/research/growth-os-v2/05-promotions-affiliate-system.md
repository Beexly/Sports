# Promotions / Affiliate Revenue System

As of: 2026-06-09

## Recommendation

Build the promotions tab as a compliance-controlled revenue system, not a link dump. The first implementation should be a disabled-by-default data model and admin review workflow. No live links.

## Required System Pieces

- public /promotions page
- geo-aware offer display
- state/country availability rules
- age and eligibility checks where required
- clear affiliate disclosure close to offers
- responsible gambling/help message
- partner cards and offer cards
- referral code and UTM handling
- outbound click tracking
- conversion and payout reconciliation
- fraud prevention
- partner status admin
- offer expiration
- legal/compliance review workflow
- editorial review workflow
- audit log
- finance export
- no-bet/responsible-play alignment

## Partner Inventory Summary

| Partner | Category | Approval | Risk | Priority | Status |
| --- | --- | --- | --- | --- | --- |
| DraftKings | Sportsbook/DFS/casino | Yes | P1 legal / RESEARCH_ONLY trust | No live links; apply/contact only after legal review. | undefined |
| FanDuel | Sportsbook/racing/DFS/casino | Yes | P1 legal / RESEARCH_ONLY trust | No live links; racing page demonstrates compliance complexity. | undefined |
| BetMGM | Sportsbook/casino | Yes | P1 legal / RESEARCH_ONLY trust | No live links; direct partner account required. | undefined |
| bet365 | Sportsbook/casino/poker/bingo | Yes | P1 legal / RESEARCH_ONLY trust | Official page describes apply/drive traffic/earn commission. | undefined |
| PrizePicks | DFS/picks/event contracts | Unknown | P2 legal / RESEARCH_ONLY trust | No live links; product language is highly betting-adjacent. | undefined |
| Underdog | Fantasy/pick'em/predictions | Unknown | P2 legal / RESEARCH_ONLY trust | No live links; verify affiliate terms and geo constraints. | undefined |
| Sleeper | Fantasy/pick'em/community | Unknown | P2 legal / RESEARCH_ONLY trust | Likely safer as fantasy/community partner than sportsbook-first offers. | undefined |
| Direct newsletter sponsor | Sponsorship | Yes | P0 legal / GO_WITH_APPROVAL trust | Can start with sponsor policy and no live sales. | undefined |
| Creator referral partner | Creator/affiliate | Yes | P0 legal / GO_WITH_APPROVAL trust | Use non-gambling education/content first. | undefined |
| Sports data/tools partner | Tool/data affiliate | Yes | P0 legal / GO_WITH_APPROVAL trust | Prioritize tools over wagering promos. | undefined |

## Compliance Baseline

- FTC: disclose material connections clearly and conspicuously.
- AGA/NCPG: treat gaming marketing as age, consumer-protection, responsible-gaming, and assistance-sensitive.
- GSE-specific: promotions must never imply GSE is a sportsbook or that users should gamble.

## Duplicate Gate

Extends BUILD-028, BUILD-035, NEXT-031, NEXT-032, NEXT-033, NEXT-034, NEXT-035, and NEXT-036. New value is compliance workflow, responsible-play copy, geo/state/age safety, payout reconciliation, and trust-impact measurement.
