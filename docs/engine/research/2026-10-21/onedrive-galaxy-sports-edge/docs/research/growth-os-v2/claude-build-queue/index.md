# Growth OS V2 Claude Build Queue

As of: 2026-06-09

This queue contains 100 non-duplicate or explicitly linked child builds. IDs use the `BUILD-GV2-` prefix to avoid collisions with the prior `BUILD-001` through `BUILD-120` cards.

| ID | Title | Category | Gate | Matched Existing | Priority | Difficulty |
| --- | --- | --- | --- | --- | --- | --- |
| BUILD-GV2-001 | Promotions compliance data model | promotions / affiliate revenue | EXTENSION | BUILD-028; BUILD-035; NEXT-031; NEXT-032; NEXT-033; NEXT-034; NEXT-035; NEXT-036 | P0 | M |
| BUILD-GV2-002 | Geo and state availability rules for promotions | promotions / affiliate revenue | EXTENSION | BUILD-GV2-001; NEXT-031 | P0 | M |
| BUILD-GV2-003 | Affiliate disclosure component spec | promotions / affiliate revenue | EXTENSION | BUILD-GV2-001; NEXT-031 | P0 | S |
| BUILD-GV2-004 | Responsible-play offer card pattern | promotions / affiliate revenue | EXTENSION | BUILD-GV2-001; BUILD-112 | P0 | M |
| BUILD-GV2-005 | Partner due-diligence checklist | promotions / affiliate revenue | NET_NEW |  | P0 | S |
| BUILD-GV2-006 | Affiliate outbound click audit log | promotions / affiliate revenue | EXTENSION | NEXT-036 | P1 | M |
| BUILD-GV2-007 | Offer expiration and kill switch | promotions / affiliate revenue | EXTENSION | BUILD-GV2-001 | P0 | M |
| BUILD-GV2-008 | Affiliate payout reconciliation ledger | financial dashboards | EXTENSION | NEXT-031; NEXT-036 | P1 | M |
| BUILD-GV2-009 | Promotions trust impact dashboard | product analytics | EXTENSION | NEXT-001; NEXT-032 | P1 | M |
| BUILD-GV2-010 | No-live-links approval gate | risk / compliance | DEPENDENCY | BUILD-GV2-001 | P0 | S |
| BUILD-GV2-011 | FREE to PRO GSE Rating education ladder | subscription conversion | EXTENSION | BUILD-115 | P0 | M |
| BUILD-GV2-012 | PRO to ELITE decision-quality upgrade path | pricing / plan upgrades | EXTENSION | BUILD-115 | P0 | M |
| BUILD-GV2-013 | Annual plan trust-safe offer logic | pricing / plan upgrades | VARIANT | BUILD-055 | P1 | M |
| BUILD-GV2-014 | Founder plan packaging spec | pricing / plan upgrades | NET_NEW |  | P2 | S |
| BUILD-GV2-015 | Team plan and small group packaging | pricing / plan upgrades | NET_NEW |  | P2 | L |
| BUILD-GV2-016 | Enterprise intelligence report offer | sales / partner pipeline | EXTENSION | BUILD-029; BUILD-118 | P1 | M |
| BUILD-GV2-017 | No-bet radar public teaser | engagement / time-on-site | NET_NEW |  | P0 | M |
| BUILD-GV2-018 | Volatility and risk explainer module | trust / track-record systems | EXTENSION | BUILD-112; BUILD-119 | P0 | S |
| BUILD-GV2-019 | Track Record autopsy template | trust / track-record systems | EXTENSION | BUILD-057; BUILD-093 | P0 | M |
| BUILD-GV2-020 | Receipts freshness badge system | trust / track-record systems | EXTENSION | BUILD-112 | P1 | M |
| BUILD-GV2-021 | Player Lab what-changed feed | engagement / time-on-site | EXTENSION | BUILD-111; NEXT-002 | P1 | L |
| BUILD-GV2-022 | Rating movers board | engagement / time-on-site | NET_NEW |  | P1 | M |
| BUILD-GV2-023 | Player rabbit-hole related-card graph | engagement / time-on-site | EXTENSION | BUILD-111 | P1 | L |
| BUILD-GV2-024 | Team rabbit-hole journey map | engagement / time-on-site | VARIANT | BUILD-GV2-023 | P2 | L |
| BUILD-GV2-025 | Prediction autopsy public format | trust / track-record systems | EXTENSION | BUILD-GV2-019 | P1 | M |
| BUILD-GV2-026 | Saved watchlist onboarding moment | customer onboarding | EXTENSION | BUILD-113; BUILD-111 | P0 | M |
| BUILD-GV2-027 | Personalized homepage intent router | engagement / time-on-site | EXTENSION | BUILD-113; NEXT-003 | P1 | L |
| BUILD-GV2-028 | Shareable insight card policy | contests / community | NET_NEW |  | P1 | M |
| BUILD-GV2-029 | Free pick'em no-cash education loop | contests / community | NET_NEW |  | P2 | L |
| BUILD-GV2-030 | Beat-the-model educational challenge spec | contests / community | NET_NEW |  | P2 | M |
| BUILD-GV2-031 | Responsible leaderboard guardrails | contests / community | DEPENDENCY | BUILD-GV2-029; BUILD-GV2-030 | P1 | S |
| BUILD-GV2-032 | Confused-user rescue triggers | customer success | EXTENSION | BUILD-037; BUILD-040; BUILD-041; BUILD-042; BUILD-047; NEXT-015 | P0 | M |
| BUILD-GV2-033 | Methodology question triage flow | customer support | EXTENSION | BUILD-040; BUILD-119 | P0 | S |
| BUILD-GV2-034 | Billing and refund support playbook | customer support | EXTENSION | BUILD-047 | P1 | S |
| BUILD-GV2-035 | Cancellation-save responsible boundary | retention / lifecycle | EXTENSION | BUILD-043; BUILD-056 | P0 | M |
| BUILD-GV2-036 | Support sentiment tagging taxonomy | customer support | EXTENSION | BUILD-045; BUILD-041 | P1 | M |
| BUILD-GV2-037 | Support-to-FAQ source-of-truth loop | customer support | EXTENSION | BUILD-041; BUILD-040 | P1 | M |
| BUILD-GV2-038 | Responsible gambling escalation protocol | risk / compliance | NET_NEW |  | P0 | S |
| BUILD-GV2-039 | Promotions complaint escalation flow | customer support | EXTENSION | BUILD-GV2-001; BUILD-047 | P0 | S |
| BUILD-GV2-040 | Customer trust issue ledger | trust / track-record systems | EXTENSION | BUILD-048 | P1 | M |
| BUILD-GV2-041 | GSE human voice rules | brand voice / copy auditor | NET_NEW |  | P0 | S |
| BUILD-GV2-042 | Banned phrase and fake-certainty linter | brand voice / copy auditor | EXTENSION | BUILD-GV2-041 | P0 | S |
| BUILD-GV2-043 | Affiliate copy compliance auditor | brand voice / copy auditor | EXTENSION | BUILD-GV2-003; BUILD-GV2-041 | P0 | M |
| BUILD-GV2-044 | No-bet and risk copy pattern library | brand voice / copy auditor | EXTENSION | BUILD-GV2-018; BUILD-GV2-041 | P0 | S |
| BUILD-GV2-045 | Cancellation-save copy auditor | brand voice / copy auditor | EXTENSION | BUILD-GV2-035; BUILD-GV2-041 | P1 | S |
| BUILD-GV2-046 | Article human editor checklist | content / SEO / editorial | EXTENSION | BUILD-021; NEXT-025 | P0 | S |
| BUILD-GV2-047 | GSE Daily Brief editorial standard | content / SEO / editorial | EXTENSION | BUILD-050 | P0 | S |
| BUILD-GV2-048 | No-bet article series template | content / SEO / editorial | NET_NEW |  | P1 | M |
| BUILD-GV2-049 | Injury shock explainer template | content / SEO / editorial | EXTENSION | BUILD-051 | P1 | M |
| BUILD-GV2-050 | Market movement explainer template | content / SEO / editorial | EXTENSION | BUILD-052 | P1 | M |
| BUILD-GV2-051 | GSE glossary and methodology boundary pages | content / SEO / editorial | EXTENSION | BUILD-119; BUILD-112 | P0 | M |
| BUILD-GV2-052 | Matchup page content model | content / SEO / editorial | NET_NEW |  | P2 | L |
| BUILD-GV2-053 | Player page content model | content / SEO / editorial | EXTENSION | BUILD-GV2-021 | P2 | L |
| BUILD-GV2-054 | Responsible promotions article policy | content / SEO / editorial | EXTENSION | BUILD-GV2-003; BUILD-GV2-043 | P0 | S |
| BUILD-GV2-055 | Article-to-social transformation checklist | content / SEO / editorial | EXTENSION | BUILD-058; BUILD-046 | P2 | S |
| BUILD-GV2-056 | Content refresh and freshness queue | content / SEO / editorial | EXTENSION | BUILD-059; BUILD-112 | P1 | M |
| BUILD-GV2-057 | Lifecycle map by user stage | retention / lifecycle | EXTENSION | BUILD-054; BUILD-055; BUILD-056 | P0 | M |
| BUILD-GV2-058 | Dormant user reactivation triggers | retention / lifecycle | EXTENSION | BUILD-056 | P1 | M |
| BUILD-GV2-059 | Paid user first-week success plan | customer success | EXTENSION | BUILD-054; BUILD-055 | P0 | M |
| BUILD-GV2-060 | PRO power-user retention loop | retention / lifecycle | VARIANT | BUILD-GV2-059 | P1 | M |
| BUILD-GV2-061 | ELITE white-glove success lane | customer success | EXTENSION | BUILD-117 | P1 | M |
| BUILD-GV2-062 | Season restart lifecycle campaign | retention / lifecycle | NET_NEW |  | P1 | M |
| BUILD-GV2-063 | Post-cancellation learning loop | retention / lifecycle | EXTENSION | BUILD-GV2-035 | P1 | M |
| BUILD-GV2-064 | B2C objection library | sales / partner pipeline | EXTENSION | BUILD-036; BUILD-038 | P0 | S |
| BUILD-GV2-065 | Risk-aware sales scripts | sales / partner pipeline | NET_NEW |  | P0 | S |
| BUILD-GV2-066 | Enterprise discovery call script | sales / partner pipeline | EXTENSION | BUILD-029; BUILD-118 | P1 | S |
| BUILD-GV2-067 | Creator partnership pitch kit | sales / partner pipeline | EXTENSION | BUILD-028 | P1 | M |
| BUILD-GV2-068 | Sports media sponsorship one-pager | sales / partner pipeline | NET_NEW |  | P2 | S |
| BUILD-GV2-069 | Partner win-loss notes schema | sales / partner pipeline | EXTENSION | BUILD-035 | P1 | S |
| BUILD-GV2-070 | Promotions trust objection library | sales / partner pipeline | EXTENSION | BUILD-GV2-064; BUILD-GV2-043 | P0 | S |
| BUILD-GV2-071 | Founder financial cockpit v1 | financial dashboards | EXTENSION | NEXT-003; NEXT-006 | P0 | M |
| BUILD-GV2-072 | CAC and channel payback dashboard | financial dashboards | EXTENSION | BUILD-GV2-071; NEXT-036 | P1 | M |
| BUILD-GV2-073 | LTV and churn sensitivity model | financial dashboards | EXTENSION | BUILD-GV2-071 | P1 | M |
| BUILD-GV2-074 | Data/API cost ledger | financial dashboards | NET_NEW |  | P1 | S |
| BUILD-GV2-075 | Refund and chargeback risk dashboard | financial dashboards | EXTENSION | BUILD-GV2-034 | P2 | M |
| BUILD-GV2-076 | Product analytics event contract | product analytics | EXTENSION | NEXT-002 | P0 | M |
| BUILD-GV2-077 | Upgrade funnel instrumentation plan | product analytics | EXTENSION | NEXT-003 | P0 | M |
| BUILD-GV2-078 | Promotions event schema | product analytics | EXTENSION | BUILD-GV2-001; NEXT-002 | P0 | M |
| BUILD-GV2-079 | Support event schema | product analytics | EXTENSION | BUILD-041; NEXT-002 | P1 | S |
| BUILD-GV2-080 | Content event schema | product analytics | EXTENSION | BUILD-058; NEXT-002 | P1 | S |
| BUILD-GV2-081 | Privacy-safe identity resolution policy | product analytics | DEPENDENCY | NEXT-001; BUILD-GV2-076 | P0 | S |
| BUILD-GV2-082 | AI source research workflow | AI automation | EXTENSION | BUILD-021; BUILD-016 | P1 | M |
| BUILD-GV2-083 | AI human-copy reviewer | AI automation | EXTENSION | BUILD-GV2-041; NEXT-007 | P0 | M |
| BUILD-GV2-084 | Affiliate compliance checker agent | AI automation | EXTENSION | BUILD-GV2-043; NEXT-007 | P1 | M |
| BUILD-GV2-085 | Method leakage reviewer | AI automation | EXTENSION | BUILD-022; BUILD-014 | P0 | M |
| BUILD-GV2-086 | Weekly founder growth brief agent | AI automation | EXTENSION | BUILD-106; NEXT-017 | P1 | M |
| BUILD-GV2-087 | Churn risk analysis agent | AI automation | EXTENSION | BUILD-033; BUILD-GV2-057 | P2 | L |
| BUILD-GV2-088 | Competitor monitoring digest | AI automation | NET_NEW |  | P2 | M |
| BUILD-GV2-089 | Release notes generator with risk labels | AI automation | EXTENSION | BUILD-088; NEXT-044 | P2 | M |
| BUILD-GV2-090 | Build queue dedupe assistant | AI automation | EXTENSION | BUILD-018 | P0 | M |
| BUILD-GV2-091 | Weekly growth operating cadence | org design / founder cockpit | EXTENSION | BUILD-106; NEXT-017 | P0 | S |
| BUILD-GV2-092 | Compliance review cadence | org design / founder cockpit | NET_NEW |  | P0 | S |
| BUILD-GV2-093 | Support review cadence | org design / founder cockpit | EXTENSION | BUILD-041; BUILD-047 | P1 | S |
| BUILD-GV2-094 | Revenue review cadence | org design / founder cockpit | EXTENSION | BUILD-GV2-071 | P1 | S |
| BUILD-GV2-095 | Build queue grooming protocol | org design / founder cockpit | EXTENSION | BUILD-GV2-090 | P0 | S |
| BUILD-GV2-096 | Future risk early-warning dashboard | risk / compliance | NET_NEW |  | P1 | M |
| BUILD-GV2-097 | State/legal change watchlist | risk / compliance | EXTENSION | BUILD-GV2-092 | P1 | M |
| BUILD-GV2-098 | Data source outage playbook | risk / compliance | EXTENSION | BUILD-071; BUILD-070 | P1 | M |
| BUILD-GV2-099 | Stale data public warning pattern | risk / compliance | EXTENSION | BUILD-GV2-098; BUILD-112 | P0 | S |
| BUILD-GV2-100 | Founder bottleneck reduction map | org design / founder cockpit | NET_NEW |  | P1 | S |
