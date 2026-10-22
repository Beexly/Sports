# Frontier Untapped Atlas — what nobody's switched on yet

2026-07-17. This deliberately does **not** repeat the prior leverage atlas (credits, compute vendors, accelerators, Stripe Atlas — all covered there) or the cloud maps (AWS/Google/Azure — covered today). This is the layer beyond: tools, platforms, agents, workflows, and trustless infrastructure that compound the two things that make galaxysportsedge.com structurally unlike anything else — **the verifiable record** and **agent-nativeness**. Ranked by moat-compounding, with honest maturity flags.

---

## Tier 0 — BUILT TODAY (in this session)

### ⚡ gse-ots-anchor — Bitcoin-anchored trustless time  **[SHIPPED, 10/10 tests, byte-identical to reference impl]**
Every Merkle root the Glass Ledger publishes gets an OpenTimestamps proof that upgrades (free, public calendar network) into a **Bitcoin block-header attestation**. Result: "this pick was committed before kickoff" becomes verifiable against Bitcoin itself — no trust in GSE's clock, database, or existence required. No sports service on earth does this. Zero cost, zero keys, no chain writes by us. Build session wires it per the README (3 small steps). *This is the single most on-thesis upgrade the record can get.*

---

## Tier 1 — Trustless infrastructure (the moat's next rings)

1. **Sigstore Rekor transparency log** (free public infra, prod-grade — it's what secures major software supply chains). Co-publish every receipt hash into a public, append-only, externally-operated log. Complements OTS: Bitcoin proves *when*, Rekor proves *published & never retracted*. ~an afternoon: one `hashedrekord` POST per receipt + a `/proof` link to the log entry.
2. **TLSNotary / Reclaim-style web proofs** (R&D-grade, moving fast). Cryptographic proof that the odds snapshot you graded against is literally what the sportsbook's TLS session served. Kills the last "they could fabricate the closing line" objection. Flag as experimental; pilot on one book.
3. **AWS Nitro Enclaves attestation** (prod-grade). Run the scorer inside an enclave and publish the attestation document binding the output to a **measured code hash** = the Sealed Engine becomes *literally* hardware-sealed: "this MODEL_VERSION binary, and no other, produced this pick." Pairs perfectly with the existing MODEL_VERSION governance. Medium lift; do after credits land (Bedrock/EC2 eligible).
4. **zkML (EZKL)** (frontier; you already have a ZK-ML extraction ledger doc). Prove an inference came from committed weights without revealing them. The endgame of method-opacity + verifiability. Park until the enclave path ships — enclaves give 90% of the story at 10% of the pain.
5. **C2PA content credentials** (standard, tooling maturing). Sign every generated chart/video/OG image with provenance credentials. When deepfake sports "records" flood 2026, yours are the ones that verify.

## Tier 2 — The agent economy (be the API agents *pay*)

6. **Hosted remote MCP server** — you already have `galaxy-proof-mcp` BUILT (7 tools, tested, in your Galaxy folder). Deploy it as a remote MCP (Cloudflare Workers MCP transport), list it in MCP registries/directories → every Claude/agent user can install "Galaxy Proof" as a connector and independently audit the record. Distribution loop: each verification is a marketing event with cryptographic receipts. **Highest ratio of impact:effort in this tier — the code exists.**
7. **x402 machine-payable endpoints** (Coinbase's HTTP-402 protocol; real, early) + **Stripe agentic commerce** (ACP; live with major AI surfaces). Premium proof/API tiers that an *agent* can pay for autonomously, per-call. First sports intelligence with a machine-payable trust API. Stripe MCP is already connected to your Cowork sessions for the fiat side.
8. **"Ask the Record" — retrieval locked to the ledger.** A chat surface whose retrieval corpus is *only* hash-verified receipts + published journal entries, with the four-leg display guard enforced at the retrieval layer: the bot **cannot** overclaim because unverified text never enters its context. Novel, deeply on-doctrine, and cheap (pgvector on Neon or Cloudflare Vectorize + the existing generators' cache discipline).
9. **schema.org `ClaimReview` markup** on graded picks (+ `SportsEvent`). Your self-grading record rendered as fact-check structured data — search engines and AI answer engines ingest your *graded claims* natively. Nobody marks up their own losses; that's exactly why it lands.

## Tier 3 — Under-leveraged in the stack you already pay for

10. **Cloudflare deep stack** (you have R2 + Turnstile only): **Durable Objects** (live per-game war rooms with commitment countdowns — real-time presence nothing on Vercel gives you cheaply), **Queues** (settlement pipeline off request path), **Vectorize** (Tier-2 #8), **Workers AI** (free-tier inference for tiny classifiers), **Workflows** (durable multi-step settlement jobs). One platform, mostly free tier, already in your account.
11. **GitHub as free compute** — the repo is **public**, so Actions minutes are **unlimited/free**: nightly walk-forward backtest sweeps, trials-registry FDR runs, and the §5 gates as scheduled workflows publishing artifacts (the runs themselves become public evidence). Plus CodeQL security scanning, free for public repos — run it before the paid-tier launch.
12. **Vercel bits you're not using:** Cron (in vercel.json but Hobby-limited — the GH-Actions cron already covers it), **Edge Config** for the founder-gated flags (flip PUBLISH_LEDGER without redeploy), **OG image generation** for per-receipt share cards (every receipt gets a beautiful, C2PA-signed card).
13. **Upstash QStash** (you have Upstash): serverless delayed jobs — "at kickoff, flip disclosure; at settlement+1h, run autopsy draft" as scheduled messages instead of cron sweeps.
14. **Neon branching** (you have Neon): ephemeral DB branches per backtest/PR — the trials registry gets perfect isolation for free.
15. **PostHog** (planned, unwired): session replay on /proof + /verify to watch skeptics verify; feature flags as the runtime gate UI.

## Tier 4 — Autonomous operations (the site that runs & audits itself)

16. **Nightly Sentinel (scheduled Cowork task):** every night, a fresh session verifies the live proof endpoints end-to-end (recompute a receipt hash, check llms.txt/openapi drift, screenshot key pages), writes a dated report to the Galaxy folder, and flags anomalies. The site red-teams itself while you sleep. *I can arm this — say "arm the sentinel" and it's one scheduled task, deletable anytime.*
17. **`/gse-run next` cadence** — installed today at user scope. One verified workstream per session, spend-capped by design.
18. **`ralph-loop` plugin** — already enabled in your Claude Code (`settings.json`) and unused: autonomous looping for grind tasks (e.g., "port the 33-file template manifest") inside the gse-run guardrails.
19. **Synthetic monitoring spec → GH Actions** — your own `synthetic-monitoring-spec.md` exists; the public-repo free minutes (#11) make it $0 to implement now.

## Tier 5 — Content & distribution machines (connected, idle)

20. **Higgsfield MCP (connected to this session, never used):** auto-generate the weekly Model Journal as a narrated explainer video + shorts (their virality predictor scores cuts before posting). Pair with C2PA (#5) → provenance-signed sports analysis video, another first.
21. **Swagger MCP (connected, idle):** publish a hosted developer portal for the live Proof API from `galaxysportsedge.com/api/proof/openapi.json` — turns the API into a *product page* agents and devs can try. Draft is safe to create; publishing is your click.
22. **Nimble MCP (connected, idle):** structured web intelligence for the competitive teardowns + roster-truth research lanes without hand-scraping.
23. **AT Protocol/Bluesky firehose of receipts:** every settled receipt auto-posts (hash + verify link) to a bot account — a public, subscribable, timestamped feed third parties archive for you. Trivial once receipts exist; run through source-rights/brand gates first.
24. **Data lanes to run through your §rejected-data-sources gate** (rights check BEFORE code, per your own doctrine): nflverse (open NFL data), Kalshi/Polymarket public market data (grade your CLV against *exchange* consensus, not just books — an honesty benchmark nobody publishes).

---

## What "no one has thought of" actually cashes out to

Any one of: **Bitcoin-anchored pick commitments** (built today), **hardware-attested scoring**, **a self-grading record published as ClaimReview**, **an AI that cannot overclaim because its retrieval is its own tamper-evident ledger**, or **a sports API agents pay per-verification**. Each is individually novel in sports; the compound — a record that is simultaneously time-anchored (Bitcoin), publication-anchored (Rekor), data-anchored (web proofs), compute-anchored (enclaves), and *sold to machines* — is a category of one. That's the arc this atlas walks.

## Recommended build order (after today)

1. Wire `gse-ots-anchor` (built) — build session, ~half day incl. live calendar smoke test.
2. Deploy `galaxy-proof-mcp` as a hosted remote MCP — the code exists; distribution unlock.
3. Rekor co-publication — afternoon.
4. "Ask the Record" RAG — the flagship product surface of the trust layer.
5. GH-Actions backtest grid + synthetic monitoring (free, public-repo minutes).
6. Enclave attestation spike — after credits land.
