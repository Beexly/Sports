# AWS Leverage Map — Galaxy Sports Edge

Account **183295455211** (signed in as *Beexly*, baxley.garrett@gmail.com). Compiled 2026-07-17 from the live billing console + the AWS-for-Startups welcome email. Read-only recon — nothing was changed.

---

## TL;DR — the three biggest levers

1. **Apply for AWS Activate Credits — up to $100K–$200K, and they cover Amazon Bedrock.** You're enrolled in AWS for Startups but the *credits* are a separate application you haven't completed. This is by far the largest lever. → `https://aws.amazon.com/startups/credits`
2. **Run Claude on Bedrock, paid by those credits.** Your product's `provider-dispatch.ts` already routes Claude → Bedrock via an env flip (zero code). Activate credits + Bedrock = your biggest recurring cost (AI inference) covered.
3. **Offers Hub discounts** — free/again-discounted Slack, Asana, HubSpot, Confluent, etc. Small money, real time saved.

---

## Verified account state (facts, not assumptions)

- **Credits active: $160.00, already being used ($22.85 used → $137.15 est. remaining).** Four active credits, all issued 07/03/2026, expiring 07/03/2027:
  - AWS Free Tier — $100.00
  - Explore AWS: Set up a cost budget using AWS Budgets — $20.00
  - Explore AWS: Create an Aurora or RDS database — $20.00
  - Explore AWS: Create a web app using AWS Lambda — $20.00
- **A default payment method is on file**, and there is **no "upgrade to a paid account" prompt** → the account is already transacting normally. **The "upgrade off Free Tier" theory was wrong** — that is not what's blocking Activate credits.
- **AWS for Startups: enrolled** ("Welcome to AWS for Startups", 2026-07-08). The welcome email lists the credits as an *apply* action, not an automatic grant.

---

## Lever #1 — AWS Activate Credits  ★ highest value, founder-only

The welcome email states: *"Apply to receive up to $200,000 in Activate Credits to offset costs across 200+ eligible AWS services, including … AI/ML models on Amazon Bedrock. … Generative AI startups may be eligible for additional credit offerings."*

- **Action:** complete the credits application at `https://aws.amazon.com/startups/credits` (linked from the welcome email). This is an official startup-credit application — it must be **you** (funding stage, entity, etc.), so I did not submit it.
- **Why it matters:** at your AI-inference burn, five- or six-figure Bedrock-eligible credits is the difference between "AI features cost real money" and "AI features are free for a year+."
- **Tier note:** self-serve Activate is typically ~$1K–$5K; the $100K+ tier usually needs an accelerator/VC/AWS-partner referral. Worth pursuing the higher tier given the GenAI angle. Credits are promotional and time-boxed — apply before scaling spend, not after.

## Lever #2 — Bedrock as the Claude provider  ★ high value, low effort (code already done)

- Your repo's `provider-dispatch.ts::callClaude()` already routes **Bedrock → Vertex → direct Anthropic** with fallback, wired into all 7 content generators. Flipping AI spend onto AWS credits is **env-only** (`CLAUDE_PROVIDER` + creds + model map) — zero code, same per-token price as direct Anthropic.
- **Do before flipping:** in the **Bedrock → Model access** console (us-east-1), confirm the Anthropic Claude models you use are **Access granted** (request access if not — Anthropic models need a one-time use-case form; most others are instant). *Note: the legacy Model-access page displayed "This information isn't currently available" for this account — Bedrock has been moving to auto-granted serverless access, so check the **Model catalog** page's per-model access state instead.*
- **Sequencing:** Activate credits (Lever #1) → enable Claude model access → flip `CLAUDE_PROVIDER=bedrock`. Then inference is billed to AWS and offset by credits.
- This complements, not replaces, the Azure AI Foundry path set up for Claude Code — two credit-backed provider lanes.

## Lever #3 — Activate Offers Hub (partner discounts)

`https://aws.amazon.com/startups/offers` — free trials / discounts on Slack, Asana, Confluent, HubSpot and more. Low-dollar but useful for the ops stack you're already assembling.

## Lever #4 — Startup Advisor + Migration Planning (free tools)

- **AWS Startup Advisor** — AI build assistant for architecture/cost/security, works inside **Claude Code, Cursor, VS Code** (`startups.aws`). Free, and it plugs into the exact toolchain you just wired.
- **Migration Planning** — auto-generates a GCP/OpenAI/Gemini→AWS migration plan (service map + cost estimate). Useful if you ever move inference lanes.

---

## Cost guardrails — ✅ VERIFIED ARMED

- **Two budgets exist** (confirmed in Billing → Budgets):
  - **`gse-monthly-hard-cap-50`** — the activation pack's Step 1 hard cap. The guardrail that had to exist before any Bedrock spend **is in place**.
  - `codex-credit-20260703182645-budget` — created for the "Explore AWS: budget" credit task.
- Worth one click when convenient: open `gse-monthly-hard-cap-50` and confirm its **alert recipients** (email/SNS) are ones you actually read.

## Security posture — verify (couldn't confirm without CLI)

AWS CLI isn't installed locally, so I couldn't enumerate IAM/root state. Quick wins to confirm in-console:
- **Root account has MFA enabled**, and day-to-day work uses an **IAM user/role, not root**.
- No stray **access keys** on root.
- Rotate/scope any keys your app uses for Bedrock/SES to least privilege.

---

## What I verified vs. what to confirm

- **Verified:** credits ($160 active/using), payment method on file, no free→paid gate, Activate enrollment + that credits need applying, Bedrock is credit-eligible, your code already supports Bedrock, **budget hard-cap armed (`gse-monthly-hard-cap-50`)**.
- **Not verified (no CLI / SPA wouldn't render):** Bedrock per-model access state (legacy page returns "not available" — use Model catalog), provisioned resources & current non-credit spend detail, budget alert recipients, IAM/root MFA. Also: the **Activate console page** (`console…/activate/home`) failed with "Unable to load content" twice — same AWS-side glitch as before; application status must be checked at `aws.amazon.com/startups/credits` when applying.

## Ranked next actions

1. **Apply for Activate Credits** (`aws.amazon.com/startups/credits`) — founder-only, biggest payoff.
2. **Confirm Bedrock Claude model access** (us-east-1, Model catalog) — 1 click + possible one-time Anthropic use-case form.
3. ~~Verify budget armed~~ ✅ done — optionally confirm `gse-monthly-hard-cap-50` alert recipients.
4. **Flip `CLAUDE_PROVIDER=bedrock`** once 1–2 are done — moves AI cost onto credits.
5. **Skim the Offers Hub**; **confirm root MFA / IAM hygiene**.
