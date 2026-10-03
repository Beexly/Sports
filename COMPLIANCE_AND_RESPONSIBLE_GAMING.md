# GSE — Compliance & Responsible Gaming

What regulatory surface GSE sits on, what's already enforced in code, the data-
licensing guardrails, and the open legal actions. In the 2026 climate (microbetting
addiction lawsuits, tightening ad rules), a trust-first, responsible-gaming-first
posture is not just compliance — it's the moat (see `COMPETITIVE_INTELLIGENCE.md`).
Labels: `verified-code` · `verified-ext` · `recommended` · `unverified`.

> This is operational guidance, not legal advice. Items marked 🔴 need a qualified
> gaming/marketing attorney before launch.

---

## 1. What GSE *is* (regulatory posture)

GSE is a **paid sports-analytics/content subscription** — it does **not** accept
wagers, hold customer funds, or settle bets. That is a fundamentally lighter
regulatory posture than a licensed sportsbook or a CFTC prediction market. `inferred`

But two things pull GSE onto regulated surfaces:
1. **Affiliate promotions** — the `Promotion` marketplace surfaces sportsbook offers.
   The AGA Responsible Marketing Code explicitly **applies to affiliates and agents**
   of operators, so GSE's promo surface must meet operator-grade marketing standards. `verified-ext`
2. **Gambling-adjacent advertising** — even content marketing for a picks product is
   subject to state UDAP/ad rules and the AGA code's spirit (no "guaranteed wins,"
   21+, responsible-gaming messaging). `verified-ext`

→ Keep the public framing GSE already uses ("research, not a sportsbook" — pricing FAQ)
and **never** let the product imply it takes bets or guarantees outcomes.

## 2. Already enforced in code (`verified-code`)

GSE's data model + service layer encode an above-average compliance posture:
- **Promotion hard-gates** (`schema.prisma` Promotion; `apps/web/lib/promotions/*`):
  public render requires non-empty `disclosureText`, `termsUrl`, `responsibleGamingText`,
  `status=ACTIVE` + `complianceStatus=APPROVED`, not expired.
- **Geo + age gating**: `eligibleStates` (allow-list) + `restrictedStates` (deny-list);
  `minimumAge` default **21**; honest "not available in your state" rather than fabricated availability.
- **Banned-phrase scanner** (`lib/trust-claims.ts`, `trust-gate.mjs`): bans "risk free",
  "lock", guaranteed-win slang — matches the **AGA's March-2023 "risk free" ban**. `verified-ext`
- **No fabricated stats / no public win-rate until canonical history** (readiness gates,
  `isBootstrap` fencing) — prevents the over-promising the AGA code and FTC target.
- **RG signposting**: NCPG helpline link in `lib/brand.ts`; `RiskDisclosure` component;
  "past performance does not guarantee future results" on performance surfaces.
- **No microbetting / no dark patterns** — GSE has no live-bet nudges, loss-triggered
  push, or addictive in-play mechanics. This is the exact design the 2026 PHAI v.
  DraftKings/FanDuel/NFL suit attacks; GSE's *inverse* posture is a brand asset. `verified-ext`

## 3. AGA Responsible Marketing Code — alignment & gaps

| Code requirement (`verified-ext`) | GSE status |
|---|---|
| No "risk free" | ✅ banned in `trust-claims` |
| 21+ in all ads; no targeting under-21 | ✅ `minimumAge` 21; 🔴 confirm no ad creatives feature U-21 / college |
| No college partnerships promoting wagering | 📋 policy — document it before any campus/NIL marketing |
| Responsible-gaming message + helpline in ads | ✅ NCPG link; 🔶 ensure it renders on every promo + ad unit |
| Internal review process for marketing | ✅ cockpit review + compliance gates; 🔶 formalize a written SOP |
| Code delivered to affiliates/agencies | 🔴 add to affiliate/vendor agreements |

## 4. Data licensing — the-odds-api (`verified-ext`)

the-odds-api ToS: **commercial use is permitted** when their data is *not* the primary
product sold/redistributed; you **may not** resell/repackage/redistribute the raw odds
as a standalone data product (your own API, feed, or downloadable files); they may
revoke the key on violation.

→ **GSE is on the right side**: it consumes odds to *generate derived picks/analysis*
(the product is the model output, not the odds). Guardrails to keep it that way:
- **Never expose a raw-odds API / feed / export publicly.** `SourceSnapshot` raw payloads
  are internal forensic records — keep them internal. `recommended`
- Don't publish full bookmaker odds boards as a standalone data table; publish *derived*
  signals (consensus %, edge index, line movement) tied to a pick. `recommended`
- 🔴 Confirm GSE's exact use with the-odds-api in writing; keep within plan rate limits;
  have a failover plan (single-provider dependency, R5).

## 5. Responsible-gaming posture (recommended, on-brand)

- Keep RG messaging + NCPG/1-800-GAMBLER on performance, pricing, promo, and content surfaces.
- Never use loss-chasing, urgency-on-losses, or late-night push nudges (the litigated patterns).
- Offer easy cancel (already: "cancel any time from your dashboard") + a clear refund window.
- Consider a voluntary "take a break" / self-exclusion from alerts for Elite users. `recommended`
- Frame the product as decision-support + entertainment, with honest uncertainty (calibration),
  not "beat the book" hype.

## 6. Open legal/compliance actions (🔴 — need owner/counsel)

1. **State-by-state review** for the affiliate-promotion marketplace (which states allow
   sports-betting affiliate marketing; licensing/registration where required).
2. **the-odds-api ToS written confirmation** for GSE's derived-product use.
3. **Terms / Privacy / Responsible-Gaming pages** — confirm `/terms`, `/privacy`,
   `/responsible-play` (routes exist) are reviewed by counsel and current.
4. **Affiliate agreements** carry the AGA code + disclosure obligations.
5. **Ad-creative review SOP** (21+, RG message, no banned phrases) before any paid spend
   — paid ads are a hard stop until approved.

## 7. Sources
[AGA Responsible Marketing Code](https://americangaming.org/marketing-code/) ·
[AGA "risk free" ban update](https://www.americangaming.org/new-updates-to-aga-responsible-marketing-code-for-sports-wagering-prohibit-risk-free-enhance-college-aged-protections/) ·
[the-odds-api Terms](https://the-odds-api.com/terms-and-conditions.html) ·
PHAI microbetting suit coverage (see `COMPETITIVE_INTELLIGENCE.md` sources).
