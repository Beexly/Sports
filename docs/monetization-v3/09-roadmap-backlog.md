# Roadmap and Backlog

This backlog translates the v3 plan into executable work. It is intentionally sequenced by validation first, build second.

## Milestones

| Milestone | Target timing | Exit criteria |
|---|---|---|
| M0: Runway lock | Day 1 | Runway scenario recorded; active tracks authorized |
| M1: Vault customer development complete | Weeks 1-3 | 30 interviews completed; pricing decision made |
| M2: Vault V1 build ready | Weeks 4-8 after go decision | Payment, access, Discord flow, digest workflow, and admin reporting tested |
| M3: Vault public launch | Month 3 | Landing page live; email/Twitter/Discord launch; first office hours scheduled |
| M4: Almanac validation complete | Months 1-3 | 25 interviews completed; hardcover/digital decision made |
| M5: Almanac production ready | Month 10 | Data export, essays, layout, KDP, and pre-order system ready |
| M6: Almanac launch | 2027-01-15 | Hardcover and digital live; press cycle active |
| M7: Live founding partner gate | Before Live engineering | 3+ founding partners committed, or Live reduced/deferred |
| M8: Live V1 launch | Phase 7 | OBS plugin, dashboard, auth, attribution, and support process ready |

## Week-1 Backlog

| ID | Task | Owner | Output | Status |
|---|---|---|---|---|
| W1-001 | Record runway scenario | Garrett | Decision-log entry | Not started |
| W1-002 | Build 30-person Vault target list | Garrett | Filled tracker | Not started |
| W1-003 | Send first 10 Vault interview requests | Garrett | Sent DMs/emails | Not started |
| W1-004 | Draft Vault landing page | Codex | Copy doc | Complete |
| W1-005 | Prepare Vault interview tracker | Codex | CSV template | Complete |
| W1-006 | Prepare interview synthesis template | Codex | Template doc | Complete |
| W1-007 | Prepare Claude handoff queue | Codex | Handoff doc | Complete |
| W1-008 | Merge Claude customer-dev companion files | Codex | Field guide, recruitment framework, tracking schema, validation plans | Complete |
| W1-009 | Merge Vault onboarding content | Codex | Welcome emails, digest template, Discord launch pack | Complete |
| W1-010 | Upgrade Almanac positioning | Codex | Accountability-led pre-order copy and export PRD notes | Complete |
| W1-011 | Upgrade Live partner development | Codex | Sketch flow, pitch variants, objection handlers, crash gate | Complete |
| W1-012 | Add acquisition optionality doc | Codex | Dedicated operating narrative | Complete |
| W1-013 | Add Vault engineering contracts | Codex | Data model, API contracts, webhook specs, admin ops, test plan | Complete |
| W1-014 | Add launch and brand-safety runbooks | Codex | Vault/Almanac/Live runbooks and brand checklist | Complete |

## Vault Build Backlog

Allowed only after validation gate unless runway is Scenario A.

| ID | Task | Acceptance criteria |
|---|---|---|
| VLT-001 | Product requirements lock | PRD approved; pricing/cap confirmed |
| VLT-002 | Stripe product and price | Annual Vault price exists; founding cap enforced or tracked |
| VLT-003 | Entitlement model | Vault entitlement distinct from Pro/Elite |
| VLT-004 | Upgrade flow | Existing subscriber can upgrade without duplicate account |
| VLT-005 | Landing page | Copy, FAQ, CTA, scarcity language, compliance-safe claims |
| VLT-006 | Member dashboard | Shows Vault benefits, digest archive, office hours, data reviews |
| VLT-007 | Digest workflow | Garrett can publish weekly digest; members can view archive |
| VLT-008 | Office hours workflow | Schedule, registration, recording link, attendance tracking |
| VLT-009 | Quarterly data review workflow | Upload/publish PDF and recording |
| VLT-010 | Discord invite flow | Vault-only invite available after payment |
| VLT-011 | Referral tracking | First-year 10% revenue share attribution tracked |
| VLT-012 | KPI reporting | Signups, active members, cancellations, engagement exportable |
| VLT-013 | Launch email and announcements | Subscriber email, Twitter post, Discord announcement ready |
| VLT-014 | Test plan | Payment, access, cancellation, refund, and downgrade paths tested |

## Almanac Build Backlog

Allowed after customer-development gate.

| ID | Task | Acceptance criteria |
|---|---|---|
| ALM-001 | Product requirements lock | Hardcover/digital pricing and sections confirmed |
| ALM-002 | Data schema map | Settled picks, autopsies, Pass List, model versions mapped |
| ALM-003 | Export tooling | Repeatable export produces deterministic data package |
| ALM-004 | Content freeze process | October 15 freeze documented |
| ALM-005 | Essay pipeline | Claude draft, Garrett edit, copyeditor pass, final proof |
| ALM-006 | Layout template | Designer-ready structure and style brief |
| ALM-007 | KDP setup | ISBN, trim size, print cost, proof order |
| ALM-008 | Pre-order page | Direct pre-order path with hardcover/digital options |
| ALM-009 | Launch press kit | One-page pitch, sample pages, founder note, images |
| ALM-010 | Buyer survey | Post-purchase NPS and section-priority questions |

## Live Build Backlog

Allowed only in Scenario C and only after partner gate.

| ID | Task | Acceptance criteria |
|---|---|---|
| LIV-001 | Partner commitment gate | 3+ of 5 founding partners committed |
| LIV-002 | OBS plugin technical spike | Feasibility, packaging, installation path documented |
| LIV-003 | Overlay rendering | Edge Index and factor breakdown display reliably |
| LIV-004 | Auth and entitlement | Streamer can authenticate and access their overlay |
| LIV-005 | Dashboard controls | Position, opacity, data selection, preview |
| LIV-006 | Attribution links | Partner-specific UTM and revenue-share tracking |
| LIV-007 | Crash-safe behavior | Plugin can fail closed without disrupting stream |
| LIV-008 | Closed beta | Founding partners test for 30 days |
| LIV-009 | Support playbook | Setup docs, troubleshooting, escalation path |
| LIV-010 | Launch coordination | Simultaneous founding partner launch plan |

## Blocked / Claude-Side Queue

Anything blocked by missing real-world info moves to [10-claude-handoff.md](10-claude-handoff.md), not into random limbo.
