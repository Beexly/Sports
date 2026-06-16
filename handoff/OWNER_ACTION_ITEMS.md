# Owner Action Items — what needs YOU (accounts, keys, deploys)

Everything I can ship in code is shipped + tested. This is the running list of things that
require *you* (signups, API keys, env vars, deploys) to actually switch the leverage on.
Each item says: what, why, exact steps, and which code is already waiting for it.

Status legend: ⬜ not started · ✅ done (mark when you finish).

---

## A. Cut the Claude bill (#1 — code shipped)

⬜ **A1 — Turn on the internal-LLM tier (biggest recurring saving).**
Non-user-facing LLM work (classification, normalization, drafts) can leave Claude for a
free/cheap OpenAI-compatible model. Code is live (`lib/claude-api/internal-llm.ts`), off
until you set env. Cheapest path = **Groq free tier**:
1. Create a free key at https://console.groq.com → API Keys.
2. Set env (Vercel project + local `.env`):
   - `INTERNAL_LLM_BASE_URL=https://api.groq.com/openai/v1`
   - `INTERNAL_LLM_MODEL=llama-3.3-70b-versatile`
   - `INTERNAL_LLM_API_KEY=<your groq key>`
   (Or, once the Oracle VPS is up (item D1), self-host Ollama and point the BASE_URL there —
   $0, no key.)
Economics: models.dev has Groq Llama-3.3-70B at ~$0.59/$0.79 per Mtok vs Sonnet $3/$15 →
~85% cheaper before Groq's free tier (which can make internal work $0).

⬜ **A2 — Run the prompt-downgrade eval gate, then flip cheap surfaces.**
`npm run eval:prompts` (needs `ANTHROPIC_API_KEY`, already in your stack). It proves a
cheaper model matches before you change anything. Start with the surfaces my economics
module flags as biggest wins (calibration-insight & brief: Sonnet→Haiku ≈ 67% cheaper).
After a pass, flip that one line in `lib/claude-api/model-router.ts` (`SURFACE_TIER`).

---

## B. Reduce Odds-API dependence — free EPL data (#2 — adapter shipped, GATED)

⬜ **B1 — Read the FPL / Premier League terms, then clear the adapter.**
A real, facts-only, fixture-tested Fantasy Premier League adapter is shipped
(`lib/data-sources/free-adapters/fpl.ts`) — free, no key, EPL team/player/fixture FACTS
(800+ players) that ESPN covers thinly. It is **gated** (candidate id `fpl` in
`sports-data-candidates.ts`) — no ingestion/public use until you confirm terms.
Steps: read FPL/PL terms for commercial display + storage of these facts; confirm we never
republish FPL's proprietary metrics (we already exclude strength/ICT/form). On clearance,
tell me and I'll add a verified `source-rights-registry.ts` entry + wire ingestion.
(Note: EPL isn't a core `Sport` yet; clearing this is also the trigger to add it.)

---

## C. SEO flywheel (#3 — engine shipped)

⬜ **C1 — Nothing required from you to *build*; one decision to *ship*.**
The engine is shipped + tested (`lib/seo/sports-jsonld.ts`). To go live I (or the next
session) wire `apps/web/app/preview/[sport]/[slug]/page.tsx` to read scheduled games from
the DB and spread `buildMatchupPreview()`, then extend `sitemap.ts`. That needs the DB
running to verify rendering. Your only call: confirm the public URL shape `/preview/...`
is fine (or name your preferred path).

## D. $0 infra on Oracle Cloud (#4 — stack shipped, turnkey)

⬜ **D1 — Create the Oracle Always-Free VPS + deploy the stack.**
Full runbook: `docker/oracle-vps/README.md`. Summary:
1. Sign up https://www.oracle.com/cloud/free/ (real CC + ID; not charged), create an
   Always-Free Ampere ARM instance (Ubuntu), open ports 80/443/22.
2. DNS A records `ncaa.<domain>` + `llm.<domain>` → instance IP.
3. On the box: install Docker, `cp .env.example .env` (set DOMAIN/REDIS_PASSWORD/
   LLM_BASICAUTH_HASH), `docker compose -f compose.yml up -d`, pull an Ollama model.
4. Set app envs: `HENRYGD_NCAA_BASE_URL=https://ncaa.<domain>` (drops the rate cap) and,
   for the internal-LLM tier, point `INTERNAL_LLM_BASE_URL` at this box's Ollama.
Saves: managed Redis + paid VPS + henrygd rate cap + paid internal inference → all $0.

## E. Free analytics (from the leverage plan — 10-minute win)

⬜ **E1 — Add Cloudflare Web Analytics + Microsoft Clarity.**
Both free, cookieless/consent-free. Create the properties, drop their JS snippets in
`apps/web/app/layout.tsx` (gated behind an env flag so it only loads in prod). Tell me the
two site tokens and I'll wire the snippet + env. Gives traffic + paywall-funnel heatmaps at $0.

---

### Quick status board
| # | Item | Needs you | Code shipped |
|---|------|-----------|--------------|
| A1 | Internal-LLM tier (Groq/Ollama) | Groq key OR Oracle box | ✅ |
| A2 | Run eval gate, flip cheap surfaces | run `npm run eval:prompts` | ✅ |
| B1 | Clear FPL terms → wire EPL ingestion | read FPL/PL terms | ✅ (gated) |
| C1 | Ship `/preview` pages | confirm URL shape + DB | ✅ (engine) |
| D1 | Oracle VPS deploy | signup + `compose up` | ✅ (stack) |
| E1 | Cloudflare + Clarity analytics | create properties, send tokens | scaffold pending tokens |
