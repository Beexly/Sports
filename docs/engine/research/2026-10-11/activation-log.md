# Galaxy Sports Edge — Activation Log
**Started:** 2026-07-17 · **Driver:** Claude (activation co-pilot) · **Companion:** `ACTIVATION_COCKPIT.md` (same folder)

> Running record of every activation step: status, account/application IDs, where each key is stored (**name only, never the value**), and any pending review dates. Updated as steps progress.

---

## Session 1 — 2026-07-17 (prep + recon, no logins yet)

**Done this session (no auth required):**
- Read the full execution pack + 3 leverage docs + `.env.example` provider vars + the alert seam, from branch `claude/glass-ledger-edge-engine` (cloned; repo is public).
- Verified production live-state and all 6 startup-program terms against current sources.
- Built `ACTIVATION_COCKPIT.md` (paste-and-go runbook) and this log.
- Ran a leverage/outstanding-work scan of the connected folders (see `LEVERAGE_SCAN.md`).

**Key findings (see cockpit "READ FIRST"):**
- 🔴 **Blocker:** Proof surface (`/llms.txt`, `/api/proof/*`), `news-sitemap.xml`, and Bedrock/Vertex routing live only on the branch — production (`main`) 404s them. Deploy the branch (or a Preview) before citing the Proof API / submitting the news-sitemap / flipping Bedrock in prod. **Not done autonomously — production change, your call.**
- 🟡 Eligibility drift: Claude-for-Startups credits now need institutional funding; Vercel-for-Startups needs a backing partner; NVIDIA Inception needs incorporation (EIN unchecked). AWS Founders is now $1k–$5k.

---

## Session 2 — 2026-07-17 (live driving, founder present)

- **Step 1 COMPLETE.** Drove the AWS Budgets console (account **Beexly**, us-east-1) and created a Cost budget:
  - Name `gse-monthly-hard-cap-50` · Monthly · **$50.00** · metric UnblendedCost · recurring.
  - Alerts (ACTUAL, % of budgeted) at **50% / 80% / 100%**, all notifying **baxley.garrett@gmail.com**.
  - Verified: budgets list went 1 → 2; success banner shown. This is the Bedrock silent-depletion tripwire the pack requires before any credit routing.
  - Note: a prior budget `codex-credit-20260703182645-budget` already existed (left untouched); the new one is the explicit spend cap.
- Screenshots are permission-blocked on the AWS console for the extension; drove accurately via the page's accessibility tree instead.
- **Credit intel (verified on the Credits page):** account holds **$160** — $100 AWS Free Tier + 3× $20 "Explore AWS" onboarding credits (all issued 07/03/2026, expire 07/03/2027). These are NOT Activate Founders credits, so **Step 2 (Activate, $1–5K) is still worth applying** — not a duplicate. **~$22.21 already estimated-used** against the Free Tier credit → something on the account is consuming spend; the new cap now tracks it.
- **Step 2 paused:** the AWS Activate console (`/activate`) returned "Unable to load content" in the extension session (transient AWS console glitch; the Credits page recovered on reload, the Activate console did not). Retry, or drive the application from aws.amazon.com/startups — it needs your business facts + your submit (an application representation), so I'll fill the narrative and pause for you at those.

## Session 3 — 2026-07-17 (unattended drive; founder pre-logged-in Vercel/Azure/Cloudflare/PostHog/Anthropic)

Founder stepped away (shower) after logging into all accounts. Drove everything cleanly completable without them; left terms/payment/business-fact/deploy items staged.

**Completed / confirmed:**
- **Step 7 — Vercel AI Gateway: ACTIVE.** On the `sports-web` project (team `pick-pilot-s-projects`, Pro plan) the AI Gateway shows a live **$5.00 free credit**. Core benefit in place. Wiring the `internal-llm` lane to it (base URL `https://ai-gateway.vercel.sh/v1` + a verified gateway model id + a gateway key) is a build-session task.
- **Step 8 — Cloudflare Web Analytics: ALREADY DONE.** `galaxysportsedge.com` site created ~1 month ago, actively tracking (5 page views / 4 visits last 24h).
- **Step 8 — Cloudflare Turnstile: CREATED.** Widget `gse-signup`, hostname `galaxysportsedge.com`, **Managed** mode. **Site key (public): `0x4AAAAAAD3ooN62zBAP6s9w`** (safe to embed client-side). Secret key lives in the Cloudflare dashboard (Turnstile → `gse-signup`, "view keys again later") — **not recorded here per the secrets rule**; the build session pulls it into Vercel env when wiring.
- Vercel current env (sports-web): Stripe + Postgres/Neon vars present (updated Jul 12). No `CLAUDE_PROVIDER`/Bedrock vars set → prod still on direct Anthropic (expected; routing code is on the undeployed branch).

**Staged for founder (terms/payment/business-facts/deploy — I can't do these):**
- **Cloudflare R2:** the /r2/plans page requires clicking **"Add R2 subscription to my account"** — this agrees to new Terms + ties to a payment method on file (free tier, **$0 due now**). One click for you; then I create bucket `gse-proof-exports` + a scoped API token.
- **PostHog:** project **516325** created (onboarding). Project API key is in Project Settings → API keys; wiring the SDK is a build-session task.
- **Azure portal + Anthropic Console:** logged in. Founders Hub / Claude-for-Startups applications need business info + your submit (Claude credits are gated on institutional funding).
- **AWS Activate:** console failed to load 3× (transient AWS glitch). Apply at aws.amazon.com/startups (business facts + submit), or give me legal entity name / incorporation status / address / phone and I'll fill it.

### 🔑 FOUNDER FINISH-LIST (the short set only you can do)
1. **Deploy** `claude/glass-ledger-edge-engine` → prod (or a Preview). Unblocks the Proof API, news-sitemap, and the Bedrock routing. Highest leverage.
2. **Cloudflare R2:** click **"Add R2 subscription to my account"** (free, $0 due) → then ping me to make the bucket + token.
3. **AWS Activate:** apply (business facts + submit) — or hand me the 4 facts and I'll fill it.
4. **Azure Founders Hub:** apply at microsoft.com/startups (business info + submit).
5. **Bedrock** (after deploy): accept the Anthropic model EULA in the Bedrock console → I'll create the least-priv IAM user + set the Vercel env (Preview → Prod).
6. **(Optional) Claude for Startups:** credits need institutional funding; skip until a raise/accelerator.

## Session 4 — 2026-07-17 (founder provided business facts; drove the applications)

Founder supplied: Garrett Baxley · 281-660-7639 · baxley.garrett@gmail.com · company "Galaxy Sports Network" (note: the existing AWS Startups member profile stores it as **"Galaxy Sports Edge (GSE)"** — reconcile if the legal name differs).

- **AWS Activate application — FILLED through all 6 steps; parked on "Review and submit" (NOT submitted).** The AWS Startups console (the old one glitched; it has MOVED to startups.aws.com) accepted everything:
  - Member profile (pre-existing, accurate): Galaxy Sports Edge (GSE), Kingwood TX 77339, Media & Entertainment, role Entrepreneur/CEO, **FOUNDERS** (self-funded) tier.
  - Profile: 0–2 yrs on AWS; interests AI/ML; funding **Bootstrapped**, No Valuation; AWS spend 25–50%; product = launched & iterating, consumers, web, **core AI/ML**; description of the verifiable ML edge engine; website **https://galaxysportsedge.com** ✅.
  - **AWS account 183295455211 linked ✅** (Builder ID ↔ account verified).
  - **2 THINGS FOR YOU BEFORE SUBMIT:**
    1. **Dates are wrong/guessed.** "Founded" is pre-filled **July 25, 2026** (a *future* date) and I estimated **launch = May 20, 2026** — inconsistent (launch before founding). Use the **Edit** buttons on the Review page to set your real founded + launch dates.
    2. **Free-Tier eligibility gate.** The console warns **Free-Tier accounts aren't eligible for Activate credits — upgrade to a paid AWS account** (add a payment method). That's yours to do; then the credits can issue.
  - Then click **Submit application** (the tab is left open on that page).
- **Azure Founders Hub — BLOCKED.** foundershub / portal.startups.microsoft.com is stuck in a sign-in redirect loop (their "new experience" rollout bounces to portal.azure.com without a session). Needs your hands-on sign-in.

## Session 5 — 2026-07-17 (autonomous R&D; founder asleep, free rein)

Founder went to sleep granting free rein for R&D aligned with the website / AI features, minimal human input. Built a real, frontier, aligned deliverable instead of another strategy doc.

- **✅ SHIPPED: Galaxy Proof MCP** (`galaxy-proof-mcp.zip` in this folder) — a working, tested MCP server that lets any AI agent **trustlessly** verify GSE's record (recomputes `sha256("leaf:"+pickId+":"+payload)` + the Merkle root locally; server never trusted for the verdict). 7 tools. Algorithm copied exactly from `packages/prediction-engine/src/proof-of-record.ts` + `apps/web/lib/proof/receipt-proof.ts`. Verified: `tsc` clean + end-to-end stdio smoke test passes (good hash → true, tampered → false). No performance claims (proves integrity, not win rate). Works against any host serving `/api/proof/*` (honest 404 until the branch deploys; trustless math needs no network).
- **✅ Brief:** `FRONTIER_RD_2026-07-17.md` — the wedge (market full of unverifiable ROI claims; verification is the emerging trust layer) + a prioritized runway (AEO/llms.txt pack, "verify us" page, Open-Meteo weather edge, body-clock, content automation) + smallest human list.
- Runway items #3–5 touch the prediction engine (MODEL_VERSION) / draft-only guards → left as build-session specs, not shipped unsupervised.

## Session 6 — 2026-07-17 (R&D cont'd: weather edge loader)

- **✅ SHIPPED: `gse-weather-edge.zip`** — a leak-safe, AS-OF NFL weather feature loader (Open-Meteo, free/commercial-OK) — your leverage atlas's #1 free model lever, which the repo notes "awaits an as-of forecast loader." Standalone, injectable-fetch TS module + `INTEGRATION_SPEC.md`. Handles dome short-circuit, live-forecast vs. backtest-historical-forecast path selection, the leak guard (asOf ≤ kickoff), honest-unavailable, and candidate signals (framed as trials-registry hypotheses, no accuracy claim). **Verified:** `tsc` clean + **8/8 fixture unit tests pass**.
- **Honest caveats:** WebFetch to Open-Meteo was proxy-blocked (403) so the network path is NOT live-smoke-tested here — the *logic* is tested against documented-shape fixtures; the build session runs one live smoke-test (esp. the strict as-of "previous-runs" selection — see the spec). Wiring it into scoring is a founder-gated MODEL_VERSION step; it goes through the §5 trials registry before any signal is admitted.
- Left as build-session/founder work (not shipped unsupervised): strict-as-of previous-runs confirmation, stadium registry, MODEL_VERSION admission.

## Session 7 — 2026-07-17 (founder back at keyboard; quick knock-out)

- **✅ AWS Activate — SUBMITTED** by the founder ("aws done"). (Credits still require upgrading the AWS account off Free Tier to actually issue.)
- **✅ Cloudflare R2 — bucket `gse-proof-exports` CREATED** (private, Standard, auto-region) after the founder enabled the R2 subscription. R2 **API token deferred to wiring time** (generate scoped token → straight into Vercel env; avoids a loose secret now). Account id `46f1c1d1c65d19f3f983713b3a8ab67c`.
- **❌ Azure Founders Hub — BLOCKED (Microsoft-side).** Every entry (portal, sign-in, and "Apply now") bounces to `portal.azure.com/#home` without loading the Founders Hub app — their "new experience" rollout is broken for this account right now. Not fixable from here; retry in ~a day or via Microsoft for Startups support.

## Step status & credentials ledger

| # | Step | Status | Account / App ID | Key(s) stored (name → location) | Review / renew date |
|---|---|---|---|---|---|
| 1 | AWS Budgets cap | ✅ **DONE 2026-07-17** | budget `gse-monthly-hard-cap-50` · acct **Beexly** (183295455211) | alert email → baxley.garrett@gmail.com (no key) | — |
| 2 | AWS Activate Founders | ◑ **FILLED — 1 click from submit** (on Review step; I did NOT submit) | member profile: Galaxy Sports Edge (GSE), Kingwood TX 77339, FOUNDERS tier; AWS acct 183295455211 linked ✅ | — | ~7–10 biz days after you submit |
| 3 | Bedrock env-flip | ☐ blocked (deploy) | — | `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` → Vercel env (Preview→Prod) | — |
| 4 | Claude for Startups | ⏸ gated (funding) | — | — | 2–4 wk review if submitted |
| 5 | Azure Founders Hub | ☐ pending login | — | — | — |
| 6 | NVIDIA Inception | ⏸ gated (incorporation) | — | — | — |
| 7 | Vercel AI Gateway | ✅ **ACTIVE** (Pro plan, $5 free credit live) | project `sports-web` / team `pick-pilot-s-projects` | `INTERNAL_LLM_*` → Vercel env (build-session wiring) | — |
| 7b | Vercel for Startups | ⏸ gated (partner) | — | — | 5–7 biz days if submitted |
| 8 | Cloudflare R2/Turnstile/Analytics | ◑ Analytics ✅ (pre-existing) · Turnstile ✅ created · R2 ⏸ (founder: Add R2 subscription) | acct `46f1c1d1c65d19f3f983713b3a8ab67c` · Turnstile `gse-signup` | Turnstile site key (public) recorded; secret in CF dashboard · R2 token pending | — |
| 9 | PostHog + startups | ◑ project created (onboarding) | project **516325** (US cloud) | project API key → Vercel env (when SDK wired) | eligibility review after apply |
| 10 | SES identity + prod access | ☐ pending login | — | `gse-ses-send` IAM creds → Vercel env | prod-access review after request |
| 11 | Search Console + sitemaps | ☐ verify now / submit after deploy | — | — | — |
| 12 | GitHub for Startups | ⏸ parked (partner) | — | — | — |

*(I fill the ID and key-location columns live as each step completes. Values themselves are never written here or anywhere in the repo/chat.)*

---

## Pending review / follow-up dates
- (none yet — populated as applications are submitted)

## Notes
- Desktop is not a connected folder in this session, so this log lives in the connected **Galaxy Sports Edge** folder (OneDrive-synced across your devices). Move it to your Desktop anytime, or add the Desktop folder in the Claude desktop app and I'll place it there too.
