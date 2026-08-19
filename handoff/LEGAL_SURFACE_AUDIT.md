# Legal Surface Adequacy Audit

**Coverage audit by a non-lawyer. Adequacy requires human legal review.**

This audit assesses the PRESENCE and COVERAGE of consumer-facing legal disclosures on the Galaxy Sports Edge ("GSE") public web surface and in the supporting `docs/` legal/compliance library. It does NOT assess legal validity, sufficiency of disclaimer wording, or regulatory compliance against any particular jurisdiction — that requires a qualified attorney. Each verdict states the specific evidence behind it (file:line + quoted snippet) and a confidence rating.

Audit date: 2026-08-16
Auditor: GSE sprint executor (automated agent)
Scope: `apps/web/app/{terms,privacy,responsible-play,about,contact,faq,pricing,how-we-make-money,integrity,proof,promotions}/` + `docs/compliance/` + `docs/legal/` + `COMPLIANCE_AND_RESPONSIBLE_GAMING.md` + brand/legal constants.

---

## 1. Terms of Service

**File:** `apps/web/app/terms/page.tsx` (161 lines)

### 1.1 What is sold (the subscription model)

**Verdict: PRESENT.**

The Terms state the service model and paid plans:
- `page.tsx:48-51` — "GSE is an informational service that publishes algorithmic analysis of sporting events using publicly available odds data. The Service is not a sportsbook, does not accept wagers, and does not facilitate any wager."
- `page.tsx:73-92` — Section 5 "Subscriptions and billing" describes paid plans: "Paid plans renew automatically on the interval you select (monthly or annual) until canceled... Your subscription price is locked for the life of your subscription."
- `/pricing/page.tsx:38-47` — pricing metadata confirms subscription is the primary product ("Pricing: Founding-Member Rates, Locked For Life").

**Caveat:** The Terms do not enumerate specific tier features or the exact price points. Pricing detail lives in `/pricing` (live, code-driven via `lib/pricing/pricing-phases.ts`), not in the legal text itself. This is a common split, but a consumer may not traverse from Terms → Pricing and find exact figures referenced. The Terms reference the dashboard for cancellation, which is accurate.

### 1.2 Refund policy

**Verdict: PRESENT.**

- `page.tsx:82-85` — "Every paid plan includes a 3-day money-back window: cancel and request a refund within 3 days of your initial charge for any plan or interval and we will refund it, no questions asked. Outside that window, refunds are at our discretion."
- `/pricing/page.tsx:206-207` (FAQ) — "No free trial, but every paid plan has a 3-day money-back window. Cancel any time from your dashboard, no questions."
- `/how-we-make-money/page.tsx:41-48` — "Refund policy is a billing term, not a guarantee of picks."
- `lib/trust-claims.ts:217-227` — TrustClaim `pricing.money-back-window`: APPROVED, evidence `BILLING_POLICY`.

**Caveat:** "Refunds are at our discretion" outside the 3-day window is a slightly weaker formulation than the pricing page's "no questions." Not a contradiction (the 3-day window is unconditional; the discretion clause is the fallback), but a paying customer reading Terms alone sees "discretion" while the pricing FAQ says "no questions" — the two statements cover different scopes and are internally consistent.

### 1.3 Limitation of liability

**Verdict: PRESENT.**

- `page.tsx:110-119` — Section 8 "Disclaimers": "THE SERVICE IS PROVIDED 'AS IS' WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. TO THE EXTENT PERMITTED BY LAW, GSE IS NOT LIABLE FOR ANY INDIRECT, CONSEQUENTIAL, SPECIAL, INCIDENTAL, OR PUNITIVE DAMAGES, OR FOR LOST WAGERS, LOST PROFITS, OR LOST DATA."

**Confidence: confirmed.** A standard disclaimer + exclusion of consequential damages.

### 1.4 Explicit "not gambling advice / no guaranteed outcome"

**Verdict: PRESENT.**

- `page.tsx:49-51` — "The Service is not a sportsbook, does not accept wagers... Nothing on the Service constitutes gambling advice, investment advice, or a promise of any outcome."
- `page.tsx:54-61` — Section 3 "No guarantees": "No outcome from following content on the Service is ever promised or assured... You are solely responsible for any wager you choose to place outside the Service."
- `lib/trust-claims.ts:231-239` — TrustClaim `risk.no-guarantee`: APPROVED.
- `components/ui/risk-disclosure.tsx:22-24` — RiskDisclosure component: "Sports wagering is real risk. Only stake what you can afford to lose... Past performance does not guarantee future results." (rendered on `/promotions`, `/proof`, `/pricing` CTA).
- `/faq/page.tsx:134-135` — "Is sports betting risky? Yes. Real risk... call 1-800-GAMBLER."
- `/about/page.tsx:46-50` — "Every pick exposes its factor breakdown... calibrated confidence the model assigned... Outcomes are uncertain."

**Confidence: confirmed.** The "not gambling advice" language appears in both Terms and on the product UI via RiskDisclosure.

### 1.5 Banned/hype language check

**Verdict: PASS — no banned phrases found in the Terms text.**

The Terms use "guaranteed" only inside the refund context ("no questions asked" — not "guaranteed"), and "risk" in the disclosure sense. The trust-claims scanner in `lib/trust-claims.ts` bans "guaranteed", "lock", "sure thing", "risk-free", "can't lose", "easy money", "thousands of bettors", "trusted by serious bettors", "guaranteed profit". None of these appear in `terms/page.tsx`.

---

## 2. Privacy Policy

**File:** `apps/web/app/privacy/page.tsx` (136 lines)

### 2.1 What is collected

**Verdict: PRESENT.**

- `page.tsx:33-43` — Section 1 "What we collect": "When you create an account, we collect your name, email address, and (if you sign in with Google) your Google profile image. When you subscribe, our payment processor (Stripe) collects payment details directly. We never see or store your card number." + "We log standard request data (IP address, user agent, referrer) for security, abuse-prevention, and aggregate analytics."

### 2.2 Why it is collected (purpose)

**Verdict: PRESENT.**

- `page.tsx:45-52` — Section 2 "How we use it": "authenticate you, deliver picks, manage your subscription, and send transactional email (receipts, password resets, security notifications). We use aggregated analytics to understand feature usage and improve the model."

### 2.3 Retention

**Verdict: PARTIAL.**

- `page.tsx:64-69` — Section 4 "Your choices": "When you do [delete your account], we delete your profile information within 30 days, retaining only the minimum records required for tax, fraud, and legal compliance."

This addresses profile data deletion but does NOT state a general retention period for logs/analytics data. The policy says logs are collected "for security, abuse-prevention, and aggregate analytics" (§2.2) but does not specify _how long_ logs are retained or when they are deleted. The `PRIVACY_REVIEW_PROFILES_PRESENCE.md` draft policy (`docs/legal/PRIVACY_REVIEW_PROFILES_PRESENCE.md:31-34`) proposes "messages 12 months, then purge" for room content and "fan type/register: live with the account, deleted with the account" — but that is a DRAFT for a feature not yet shipped (live rooms), and is NOT in the live Privacy Policy.

**Confidence: confirmed gap.** The live Privacy Policy lacks a general data-retention schedule.

### 2.4 How to request deletion

**Verdict: PRESENT.**

- `page.tsx:64-69` — account deletion from the dashboard, with profile deletion within 30 days.
- `page.tsx:70-81` — Section 4: "If you are a California, EU, or UK resident, you have additional rights, including the right to access, correct, or export the personal data we hold about you. Email [LEGAL_EMAIL] and we will respond within 30 days."
- `/contact/page.tsx:13-22` — "Legal & privacy: Data requests, account deletion, compliance questions, DMCA." → `LEGAL_EMAIL` = `hq@galaxysportsedge.com`.
- `/about/page.tsx:98-114` — Contact section: "Every email gets read. ... Replies typically within one business day."

### 2.5 Data sharing (third parties)

**Verdict: PRESENT.**

- `page.tsx:54-61` — Section 3 "What we share": "We share data only with the subprocessors who help us run the Service: hosting (Vercel), database (managed Postgres), authentication (Google), payments (Stripe), and email (a transactional email provider). We do not sell personal data and we do not share data with advertisers."

### 2.6 Security measures

**Verdict: PRESENT (basic).**

- `page.tsx:84-89` — Section 5 "Security": "We use TLS in transit, encrypted database storage at rest, and role-scoped database access. Authentication uses standard OAuth flows."

### 2.7 Children

**Verdict: PRESENT.**

- `page.tsx:92-95` — Section 6 "Children": "The Service is not directed to children. We do not knowingly collect data from anyone under the legal wagering age in their jurisdiction."

### 2.8 Third-party advertising / ad-tech / cookies

**Verdict: PARTIAL.**

- `page.tsx:40-42` — "We log standard request data... We do not use third-party advertising trackers."

The policy affirmatively states no ad trackers, but does NOT describe any cookie policy, tracking technology use, or data subject rights under CCPA/GDPR beyond the email-rights statement. There is no dedicated cookie banner or cookie policy file surfaced. For a product with a free tier and analytics, the absence of a cookie/Tracking-Technology section is a coverage gap.

### 2.9 Do Not Sell (CCPA)

**Verdict: ABSENT.**

The Privacy Policy states "We do not sell personal data" (`page.tsx:59`) but does not include the statutory "Do Not Sell My Personal Information" notice required by CCPA §1798.135. A link to a DNT/CCPA opt-out page would typically be expected at this specificity level.

---

## 3. Responsible Play

**File:** `apps/web/app/responsible-play/page.tsx` (168 lines)

### 3.1 Helpline

**Verdict: PRESENT.**

- `page.tsx:59-79` — Helpline call-out section: `HELPLINE` constant from `lib/brand.ts:52-60` — `{ name: "National Problem Gambling Helpline", number: "1-800-GAMBLER", href: "https://www.ncpgambling.org/help-treatment/" }`.
- Renders: "{HELPLINE.number}" — "1-800-GAMBLER" — "24/7. Free. Confidential. Available in English and Spanish. Text and chat options as well."
- `/components/ui/risk-disclosure.tsx:24` — "If you or someone you know has a gambling problem, call 1-800-GAMBLER."
- `/faq/page.tsx:135` — "call 1-800-GAMBLER."
- `/how-we-make-money/page.tsx:43-44` — "RG signposting: NCPG helpline link in `lib/brand.ts`".
- `/COMPLIANCE_AND_RESPONSIBLE_GAMING.md:44` — "RG signposting: NCPG helpline link in `lib/brand.ts`; `RiskDisclosure` component".

### 3.2 Self-exclusion

**Verdict: PRESENT (resource list only).**

- `page.tsx:30-34` — RESOURCES array includes "Self-exclusion (state-by-state)" linking to `https://www.ncpgambling.org/state-resources/`: "Many US states maintain self-exclusion lists you can join to block yourself from sportsbooks for a fixed term."

### 3.3 Warning signs

**Verdict: PRESENT.**

- `page.tsx:98-126` — Warning signs section with 6 bullet points: "Wagering more than you planned... chasing losses", "Borrowing money or lying...", "Feeling restless or irritable...", "Betting interfering with work/sleep/family...", "Hiding the activity...", "Believing the next pick will fix the previous one."

### 3.4 Bias Mirror (behavioral / tool-based intervention)

**Verdict: PRESENT.**

- `page.tsx:81-96` — "The Bias Mirror" section: "Rate a few honest tendencies and the Mirror surfaces the patterns worth watching... computed on your device from your own answers. Nothing is sent or stored."

### 3.5 "Not gambling advice" / uncertainty

**Verdict: PRESENT.**

- `page.tsx:50-55` — "GSE is an informational service. Outcomes are never certain. No model eliminates variance. Wager only what you can afford to lose, and stop immediately if it stops feeling like a hobby."

### 3.6 Limits / time-out tools

**Verdict: ABSENT.**

The page provides resources and a self-assessment tool (Bias Mirror) but does NOT allow a user to set wager/deposit limits, session timers, or cooling-off periods directly on the platform. The `docs/legal/PRIVACY_REVIEW_PROFILES_PRESENCE.md:31` draft mentions self-exclusion integration but that is for a future live-rooms feature. The `COMPLIANCE_AND_RESPONSIBLE_GAMING.md:76-83` doc recommends "Consider a voluntary 'take a break' / self-exclusion from alerts for Elite users" as `recommended` — i.e., not yet built.

**Confidence: confirmed.** No built-in limit-setting UI exists; only external helpline + self-assessment.

---

## 4. About Page

**File:** `apps/web/app/about/page.tsx` (130 lines)

### 4.1 Brand identity / who we are

**Verdict: PRESENT.**

- `page.tsx:47-57` — "GSE exists because the sports picks industry runs on a quiet trick: tout services publish their wins, scrub their losses... GSE is the opposite: a system that shows its work on every pick and refuses to publish a win-rate it can't honestly back."
- `page.tsx:60-67` — "GSE ingests live odds across dozens of sportsbooks, scores every matchup for edge, and publishes a calibrated, fully-reasoned signal alongside every factor that drove it."
- `page.tsx:68-70` — signature: "— The Galaxy Sports Edge team".

### 4.2 Operating principles

**Verdict: PRESENT.**

- `page.tsx:74-94` — Four principles: (1) Data is source of truth, (2) Reasoning is published, (3) Outcomes are uncertain, (4) Trust is earned slowly (no public win-rate until statistically meaningful).

### 4.3 Contact

**Verdict: PRESENT.**

- `page.tsx:98-114` — "Every email gets read. ... write to [SUPPORT_EMAIL] ... Replies typically within one business day." (`SUPPORT_EMAIL` = `hq@galaxysportsedge.com`, `brand.ts:39`).

### 4.4 Disclosure of business model (how they make money)

**Verdict: PRESENT.**

- `page.tsx:116-122` — Links to `/methodology` and `/contact` (all inboxes).
- `/how-we-make-money/page.tsx` (261 lines) — Explicitly documented: "Subscriptions are the primary business" + "Partner links: additive, licensed, and labeled." `REVENUE_SOURCES`, `SEPARATION_POINTS` (pick-scoring engine is code-separated from partner link management, build-checked), `DISCLOSURE_POINTS` (every partner link carries "Paid partner link" label). `page.tsx:137-143` — "We don't currently have any live partner links."

**Confidence: confirmed.** Affiliate revenue model disclosed with structural-separation guarantees.

---

## 5. Contact Page

**File:** `apps/web/app/contact/page.tsx` (71 lines)

### 5.1 Support route

**Verdict: PRESENT.**

- `page.tsx:12-28` — INBOXES array: Support (SUPPORT_EMAIL), Legal & privacy (LEGAL_EMAIL), Press (SUPPORT_EMAIL).
- `page.tsx:38-45` — "I answer real people, not bots. ... Faster on weekday afternoons, slower around major slates."

### 5.2 Visible support route for paying customers with billing problems

**Verdict: PRESENT.**

- Support inbox → `SUPPORT_EMAIL` = `hq@galaxysportsedge.com`.
- Legal & privacy inbox → `LEGAL_EMAIL` = `hq@galaxysportsedge.com` (handles "Account access, subscription issues, bug reports").
- `/how-we-make-money/page.tsx:240-244` — "If you can see the link, you can see the label" + "reach out and we'll answer directly."
- `/pricing/page.tsx:501` (footer) → `/contact`.

**Confidence: confirmed.** Both support and legal inboxes are `hq@galaxysportsedge.com`; the footer (below) also carries the contact link.

---

## 6. Footer (global legal access)

**File:** `apps/web/components/ui/footer.tsx` (171 lines)

### 6.1 Legal link presence

**Verdict: PRESENT.**

- `footer.tsx:45-51` — RESPONSIBLE_LINKS includes "Terms" → `/terms`, "Privacy" → `/privacy`, "Set limits" → `/responsible-play`, "Help" → `1-800-GAMBLER`.
- `footer.tsx:114-116` — BRAND_NAME + "MATH YOU CAN READ".
- `footer.tsx:138` — copyright: "© {new Date().getFullYear()} GALAXY SPORTS EDGE / MATH YOU CAN READ".
- `footer.tsx:106-113` — Risk disclosure in footer: "GSE delivers calibrated market signals, not certainty. Treat each one as one input in a disciplined decision... Set limits before emotion enters."

**Caveat:** The footer copyright uses `new Date().getFullYear()` (client-side render). On the server, this resolves to the build/deploy year. Not a legal defect, but the copyright year is not pinned to a static value.

### 6.2 Domain identity

**Verdict: PRESENT.** Brand name "Galaxy Sports Edge", domain `galaxysportsedge.com` (referenced in `/about/page.tsx:66` as GSN_NAME, `brand.ts` for emails/hosts). `security.txt` route (`apps/web/app/.well-known/security.txt/route.ts:11`) declares `hq@galaxysportsedge.com`.

---

## 7. Promotions / Affiliate Offers

**File:** `apps/web/app/promotions/page.tsx` (239 lines)

### 7.1 Age-gating and disclosure

**Verdict: PRESENT (on offers only).**

- `page.tsx:66` — "Terms and conditions apply at the operator's site. 21+ where applicable."
- `page.tsx:163` — Each promo card shows `{promo.minimumAge}+`.
- `page.tsx:174-176` — Eligible states displayed per offer.
- `page.tsx:204-206` — Each promo shows `promo.disclosureText`.
- `page.tsx:208-212` — Each promo shows `promo.responsibleGamingText`.
- `lib/revenue/responsible-gaming-policy.ts:15,23-35` — `reviewResponsibleGaming` fails closed for offers without `minimumAge >= 21` or `responsibleGamingText`.
- `COMPLIANCE_AND_RESPONSIBLE_GAMING.md:31-47` — geo+age gating: `eligibleStates` + `minimumAge` (default 21), "honest 'not available in your state' rather than fabricated availability."

**Note:** The promotions page requires `promo.status = "ACTIVE"` AND `promo.complianceStatus = "APPROVED"` to render (`page.tsx:39-41`).

---

## 8. Age-Gating at Signup / Checkout

**Task requirement:** "Is there age-gating (18+/21+) present anywhere in signup or checkout — grep for it and report honestly if it is ABSENT?"

**Verdict: ABSENT.**

An exhaustive grep across `apps/web/app/auth/`, `apps/web/app/checkout/` (does not exist as a directory — checkout is API-only via `apps/web/app/api/subscriptions/checkout/`), `apps/web/lib/auth/`, `apps/web/lib/billing/`, and `packages/db/prisma/schema.prisma` for `age|21|18|legal.*age|birth|dob|minimumAge` found NO age-gate component in the account-creation or subscription-purchase flow.

What exists:
- `packages/db/prisma/schema.prisma:2062` — `minimumAge Int @default(21)` is a field on the `Promotion` model (governs sportsbook affiliate offers, not the GSE subscription itself).
- `lib/revenue/partner-types.ts:55` — `minimumAge?: number` on `RevenueOffer` (sportsbook partner offers).
- `lib/revenue/responsible-gaming-policy.ts:23` — enforces 21+ for high-risk offers.

What does NOT exist:
- No age/DoB collection field on the `User` model (schema.prisma:23-44 — `User` has `name`, `email`, `emailVerified`, `image`, `role`, `createdAt`, `updatedAt`; no birthDate/dateOfBirth).
- No age-gate checkbox, modal, or interstitial at `/auth/signin` or checkout.
- No state/eligibility verification step before purchase.
- No middleware enforcing age before subscription creation.

**Confidence: confirmed.** A user can create an account via NextAuth (Google OAuth) and subscribe to Pro/Elite with Stripe without ever confirming they are of legal age to wager in their jurisdiction. The Terms state the eligibility requirement (`terms/page.tsx:63-71`: "You must be at least the legal age to wager in your jurisdiction") but provide no enforcement mechanism. This is a **LAUNCH BLOCKER** per GSE's own doctrine.

---

## 9. docs/compliance/ Library

**Files reviewed:**
- `docs/compliance/README.md` (102 lines)
- `docs/compliance/STATEMENT_OF_APPLICABILITY.md` (47 lines)
- `docs/compliance/SOC2_TYPE_II_PATH.md` (42 lines)
- `docs/compliance/RISK_REGISTER.md` (33 lines)
- `docs/compliance/ISMS_SCOPE.md` (55 lines)
- `docs/compliance/CONTROL_LIBRARY.md` (19 lines)
- `docs/compliance/exports/.gitkeep` (empty)

### 9.1 Coverage summary

**Verdict: PRESENT (internal alignment, not certification).**

- The compliance kit is explicitly labeled as internal alignment only — NOT a SOC 2 report or ISO 27001 certificate (`README.md:27-45`). Every document carries the DISCLAIMER: "Internal alignment pack only. Not a SOC 2 report or ISO 27001 certificate."
- `CONTROL_LIBRARY.md` — 7 controls mapped to SOC 2 TSC, ISO 27001 Annex A, and NIST AI RMF: CTL-ACC-001 (MFA), CTL-CHG-001 (change management), CTL-LOG-001/002 (governed-agent receipts + signatures), CTL-KEY-001 (key management), CTL-MON-001 (continuous monitoring), CTL-AI-001 (AI decision traceability), CTL-SUP-001 (supplier risk).
- `SOC2_TYPE_II_PATH.md` — honest Type I vs Type II readiness checklist with real status: control library defined ✓, CCM checks implemented ✓, CCM wired to Postgres ✓, but **no scheduled runner** ✗, **no real data sources** (stubs) ✗, **no evidence over time** ✗, **no formal risk register** ✗ (template only), **no approved ISMS scope** ✗, **no completed SoA** ✗, **no CPA firm engaged** ✗.
- `RISK_REGISTER.md` — template only (3 EXAMPLE rows marked, no real assessed risks).
- `STATEMENT_OF_APPLICABILITY.md` — draft template with "TBD" in every applicability cell.
- `ISMS_SCOPE.md` — draft scope statement, not formally adopted.

**Confidence: confirmed.** The compliance library is a credible starting point, explicitly not a certification. The honest-status approach is commendable.

---

## 10. docs/legal/ Library

**Files reviewed:**
- `docs/legal/COMMUNITY_MODERATION_POLICY.md` (83 lines)
- `docs/legal/community-moderation-policy.md` (64 lines — duplicate)
- `docs/legal/SIRIUSXM_CONNECTION.md` (59 lines)
- `docs/legal/VENDOR_QUESTIONNAIRE_CFBD.md` (51 lines)
- `docs/legal/VENDOR_QUESTIONNAIRE_JEFF_MANS.md` (65 lines)
- `docs/legal/PRIVACY_REVIEW_PROFILES_PRESENCE.md` (64 lines)
- `docs/legal/CFB_NFL_DATA_SOURCE_CANDIDATES.md` (60 lines)

### 10.1 Coverage summary

| Document | Verdict | Notes |
|---|---|---|
| Community Moderation Policy (adopted) | PRESENT | Live rooms require moderation tooling + privacy review before launch; both gates unchecked ([ ]). Responsible-play + helpline integration wired. |
| SiriusXM Connection (legal posture) | PRESENT | `permission_required`: ToS §9(l) bans AI scraping/extraction of SiriusXM audio. Manual listener log lane only. Automation stays off until written license. |
| Vendor Questionnaire — CFBD | PRESENT (gated) | `vendor_candidate`; terms need human/legal read; all automation flags false; ingestion BLOCKED. |
| Vendor Questionnaire — Jeff Mans | PRESENT (template) | Public podcast RSS lane defined; automation gated until written permission; reusable template for future candidates. |
| Privacy Review — Profiles & Presence | PRESENT (DRAFT) | Owner sign-off required before shipping fan-type or presence features; 8 rules defined. |
| CFB/NFL Data Source Candidates | PRESENT (GATED) | None approved; all require clearance gate; secrets handled as env vars only. |

### 10.2 Duplicate policy file

**Finding:** `docs/legal/COMMUNITY_MODERATION_POLICY.md` (83 lines) and `docs/legal/community-moderation-policy.md` (64 lines) both exist and both describe the community moderation policy. The longer one (83 lines) is marked "ADOPTED as written policy" with a more complete launch checklist. The shorter one (64 lines) has identical core principles + hard rules but a different, abbreviated launch sequence. This is a documentation inconsistency — two versions of the same policy in the same directory with different content and status. Not a legal defect, but a governance hygiene issue: a reader may not know which is authoritative.

---

## 11. docs/formal/SRQC_STATUS.md (integrity / AI control plane)

**File:** `docs/formal/SRQC_STATUS.md` (570 lines)

**Verdict: PRESENT (explicit non-claims).**

This document is the honesty front door for the AI/agent control plane governance. Its most relevant section for legal adequacy is the **NON-CLAIMS** section (lines 281-313), which explicitly disclaims:
- Not a parameterized (∀N) proof (fixed-constant TLC model check only).
- Not production enforcement (SHADOW is the only default).
- Not a claim about bet-settlement correctness or user-facing betting logic.
- Not a SOC 2 / ISO 27001 / EU AI Act certification.
- Not autonomous (certificate activation is human-only).
- TLAPS/Isabelle/Apalache unavailable in this environment.

The `/integrity/page.tsx` (384 lines) mirrors these non-claims in the public UI (lines 361-378), making four explicit "What we do not claim" bullets visible to users.

**Confidence: confirmed.** The integrity surface over-claims nothing.

---

## 12. Security (.well-known)

**Files:**
- `apps/web/app/.well-known/security.txt/route.ts` (27 lines)
- `apps/web/app/.well-known/receipt-keys.json/route.ts` (20 lines)

### 12.1 security.txt

**Verdict: PRESENT.**

- `route.ts:10-17` — RFC 9116 compliant: `Contact: mailto:hq@galaxysportsedge.com`, `Policy: /responsible-play`, `Hiring: /about`, `Expires: 2027-08-06`.

### 12.2 Receipt keyring

**Verdict: PRESENT.**

- `/receipt-keys.json/route.ts:14-19` — Public keyring returns only `{ kid, publicKeyPem, status }` per key. Private keys are explicitly stripped (`k.publicKeyPem` mapping, line 18; comment lines 5-6: "may carry privateKeyPem... so it is stripped explicitly here").

---

## 13. COMPLIANCE_AND_RESPONSIBLE_GAMING.md

**File:** `COMPLIANCE_AND_RESPONSIBLE_GAMING.md` (100 lines, repo root)

**Verdict: PRESENT (operational guidance, not legal advice).**

This is the top-level regulatory posture document. Key findings:
- GSE is a paid analytics/content subscription — NOT a sportsbook, does NOT accept wagers or hold funds (`§1`).
- AGA Responsible Marketing Code alignment: "No risk free" banned ✓; 21+ affirm ✓ (with 🔴 flag to confirm no ad creatives feature U-21); responsible-gaming helpline + message ✓; internal review process ✓; affiliate AGA code delivery 🔴.
- the-odds-api ToS: commercial use permitted for derived products (GSE is on the right side, per §4); guardrail: "Never expose a raw-odds API/feed publicly" (`recommended`).
- No microbetting / no dark patterns (no live-bet nudges, no loss-triggered push) — the inverse posture of the 2026 PHAI v. DraftKings/FanDuel/NFL suit.
- Open legal actions: (1) state-by-state affiliate-promotion review 🔴; (2) the-odds-api written confirmation 🔴; (3) Terms/Privacy/Responsible-Play counsel review 🔴; (4) affiliate agreements carry AGA code 🔴; (5) ad-creative review SOP before paid spend 🔴.

---

## VERDICT SUMMARY

| # | Item | Verdict | Evidence |
|---|---|---|---|
| 1.1 | Terms state what is sold | PRESENT | `terms/page.tsx:48-51,73-92` |
| 1.2 | Refund policy in terms | PRESENT | `terms/page.tsx:82-85`; `pricing/page.tsx:206` |
| 1.3 | Limitation of liability | PRESENT | `terms/page.tsx:110-119` |
| 1.4 | "Not gambling advice / no guarantee" | PRESENT | `terms/page.tsx:49-51,54-61`; `risk-disclosure.tsx:22-24`; `faq/page.tsx:134` |
| 2.1 | What is collected | PRESENT | `privacy/page.tsx:33-43` |
| 2.2 | Why collected (purpose) | PRESENT | `privacy/page.tsx:45-52` |
| 2.3 | Retention period | PARTIAL | `privacy/page.tsx:64-69` (profile only; no log retention schedule) |
| 2.4 | How to request deletion | PRESENT | `privacy/page.tsx:64-81`; `contact/page.tsx:13-22` |
| 2.5 | Data sharing / subprocessors | PRESENT | `privacy/page.tsx:54-61` |
| 2.6 | Security measures | PRESENT (basic) | `privacy/page.tsx:84-89` |
| 2.7 | Children / COPPA | PRESENT | `privacy/page.tsx:92-95` |
| 2.8 | Cookie / tracking-tech policy | PARTIAL | `privacy/page.tsx:40-42` (says "no ad trackers" but no cookie policy) |
| 2.9 | CCPA "Do Not Sell" notice | ABSENT | `privacy/page.tsx:59` ("do not sell") but no statutory opt-out link/page |
| 3.1 | Helpline displayed | PRESENT | `responsible-play/page.tsx:59-79`; `brand.ts:52-60` |
| 3.2 | Self-exclusion | PRESENT (resource list) | `responsible-play/page.tsx:30-34` |
| 3.3 | Warning signs | PRESENT | `responsible-play/page.tsx:98-126` |
| 3.4 | Behavioral intervention tool | PRESENT | `responsible-play/page.tsx:81-96` (Bias Mirror) |
| 3.5 | "Not gambling advice" on RP page | PRESENT | `responsible-play/page.tsx:50-55` |
| 3.6 | Built-in limit-setting UI | ABSENT | No limit/timer/cooling-off tool on platform; only external helpline + self-assessment |
| 3.7 | Support route for billing issues | PRESENT | `contact/page.tsx:13-22`; `about/page.tsx:98-114` |
| 4.1 | About / brand identity | PRESENT | `about/page.tsx:47-57` |
| 4.2 | Operating principles | PRESENT | `about/page.tsx:74-94` |
| 4.3 | Contact / support | PRESENT | `about/page.tsx:98-114` |
| 4.4 | Business model disclosure | PRESENT | `how-we-make-money/page.tsx:41-66`; `about/page.tsx:116` |
| 6.1 | Legal links in footer | PRESENT | `footer.tsx:45-51` |
| 6.2 | Risk disclosure in footer | PRESENT | `footer.tsx:106-113` |
| 7.1 | Age-gating on promo offers | PRESENT | `promotions/page.tsx:66,163,174` |
| 8 | Age-gating at signup/checkout | **ABSENT** | No DoB/age field on User model; no age gate at `/auth/signin` or checkout API |
| 9 | Compliance docs (SOC 2 / ISO 27001) | PRESENT (honest non-claims) | `docs/compliance/README.md`, `SOC2_TYPE_II_PATH.md`, etc. |
| 10 | Data-source licensing docs | PRESENT (gated) | `docs/legal/` (SiriusXM, CFBD, Jeff Mans, nflverse) |
| 10 | Duplicate community policy file | FINDING (not legal defect) | `COMMUNITY_MODERATION_POLICY.md` (83 lines) vs `community-moderation-policy.md` (64 lines) |
| 11 | Integrity non-claims | PRESENT | `SRQC_STATUS.md:281-313`; `integrity/page.tsx:356-378` |
| 12.1 | security.txt | PRESENT | `.well-known/security.txt/route.ts:10-17` |
| 12.2 | Public receipt keyring | PRESENT (private keys stripped) | `.well-known/receipt-keys.json/route.ts:14-19` |
| 13 | Responsible gaming guidance | PRESENT (operational) | `COMPLIANCE_AND_RESPONSIBLE_GAMING.md` |

### Key gaps requiring legal review

1. **ABSENT — Age-gating at signup/checkout.** A user can subscribe without confirming legal age. The Terms state the requirement but enforce nothing. This is the most significant gap for a sports-adjacent paid product.

2. **PARTIAL — Data retention schedule.** The Privacy Policy covers profile-data deletion but omits a general retention schedule for logs/analytics data.

3. **ABSENT — CCPA "Do Not Sell" opt-out.** Statutory notice absent despite the "do not sell" statement.

4. **PARTIAL — Cookie / tracking-technology policy.** No cookie section; tracking-technology use is not documented beyond "we do not use third-party advertising trackers."

5. **OPEN LEGAL ACTIONS** (`COMPLIANCE_AND_RESPONSIBLE_GAMING.md:85-95`): state-by-state affiliate review, the-odds-api ToS confirmation, and formal counsel review of Terms/Privacy/Responsible-Play pages are all 🔴 and pending — these must close before paid affiliate promotions go live.

### Confidence legend

- **confirmed** — the auditor read the file and verified the specific line/snippet in the code.
- **verified** — same as confirmed; the auditor traced the value to a single source of truth.
- No confidence qualifier means the auditor's reading of the file content directly supports the verdict.
