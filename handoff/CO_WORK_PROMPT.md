# Co-work prompt — finish the outstanding owner tasks

Paste the block below to an AI assistant (Claude Code in this repo, or a fresh session) to
get walked through the human-only steps. Everything code-side is already shipped + tested on
branch `claude/happy-euler-trkihe`; this prompt drives the parts that need your accounts/keys.

---

> I'm the owner of a sports prediction/picks platform (Next.js 14 + TypeScript monorepo,
> Postgres+Prisma, Stripe, Claude API, BullMQ+Redis; on branch `claude/happy-euler-trkihe`).
> A previous session shipped four cost/leverage workstreams as tested code and compiled the
> human-only follow-ups in `handoff/OWNER_ACTION_ITEMS.md`. Read that file, then **walk me
> through the outstanding items one at a time, in this priority order.** For each: tell me
> exactly what to click/create, then do the code/env wiring the moment I give you the
> token/key. Verify each before moving on. Don't skip steps; keep `OWNER_ACTION_ITEMS.md`
> checkboxes updated as we finish.
>
> 1. **E1 — Free analytics (10 min, instant value).** Walk me through creating Cloudflare
>    Web Analytics + Microsoft Clarity properties. When I paste the two tokens, add the
>    snippets to `apps/web/app/layout.tsx` behind a prod-only env flag, commit, push.
>
> 2. **A1 + A2 — Cut the Claude bill.** Help me create a free Groq API key
>    (console.groq.com). Then set `INTERNAL_LLM_BASE_URL=https://api.groq.com/openai/v1`,
>    `INTERNAL_LLM_MODEL=llama-3.3-70b-versatile`, `INTERNAL_LLM_API_KEY=<key>` in Vercel +
>    local `.env`. Then run `npm run eval:prompts` (uses my ANTHROPIC_API_KEY) to validate a
>    cheaper model on the `calibration-insight` and `brief` surfaces; if it passes the rubric,
>    flip those one-line tiers in `apps/web/lib/claude-api/model-router.ts` (`SURFACE_TIER`)
>    and show me the projected savings from `surfaceEconomics()`.
>
> 3. **D1 — Oracle $0 VPS.** Using `docker/oracle-vps/README.md`, walk me through the Oracle
>    Always-Free signup, creating an Ampere ARM instance, DNS, and `docker compose up`. Then
>    set `HENRYGD_NCAA_BASE_URL=https://ncaa.<my-domain>` (drops the henrygd rate cap) and
>    point `INTERNAL_LLM_BASE_URL` at the box's Ollama if I prefer self-host over Groq.
>
> 4. **B1 — Clear the FPL adapter.** Help me read the Fantasy Premier League / Premier League
>    terms for commercial use of match facts. If clear, add a verified entry to
>    `apps/web/lib/scraping/source-rights-registry.ts`, promote the `fpl` candidate, add `epl`
>    to the core `Sport` type, and wire ingestion using the shipped
>    `lib/data-sources/free-adapters/fpl.ts`.
>
> 5. **C1 — Ship the SEO `/preview` pages.** Confirm the URL shape `/preview/[sport]/[slug]`,
>    then wire `apps/web/app/preview/[sport]/[slug]/page.tsx` to read scheduled games from the
>    DB and spread `buildMatchupPreview()` from `lib/seo/sports-jsonld.ts`, and extend
>    `apps/web/app/sitemap.ts` to enumerate them. Verify rendering + JSON-LD with the DB up.
>
> After each item, run the relevant tests/typecheck, commit with a clear message, and push to
> `claude/happy-euler-trkihe`. Start with item 1.

---

## Reference: what each item unlocks
- **E1** — traffic + paywall-funnel heatmaps at $0 (conversion optimization).
- **A1/A2** — moves internal LLM work off Claude (~85% cheaper on Groq, or $0 on Ollama) and
  flips cheap surfaces to Haiku (~67% cheaper) once validated. Your biggest variable cost.
- **D1** — self-hosted henrygd (no rate cap) + free Redis + free local LLM on one free box.
- **B1** — free EPL depth (800+ players, fixtures) once terms clear.
- **C1** — thousands of long-tail SEO pages from data you already have — the acquisition flywheel.
