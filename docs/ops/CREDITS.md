# CREDITS — claim tracker (founder fills Status)

Agent wires env after keys land. **Applications = founder-only.** Never invent grant amounts.

| Program | Claim URL | Eligibility notes | Status (founder) | Wire env |
|---------|-----------|-------------------|------------------|----------|
| Neon Startup | https://neon.com/startups | Self-funded ≤$1k or VC up to $100k | | DATABASE_URL / DIRECT_URL |
| Vercel for Startups | https://vercel.com/startups | Partner-affiliated preferred | | Pro credits on project |
| Anthropic Claude Startups | https://claude.com/programs/startups | Claude Console account; partner VC for higher tiers | | ANTHROPIC_API_KEY |
| Alibaba Cloud Model Studio (DashScope) | https://www.alibabacloud.com/product/modelstudio | Qwen / DashScope Intl OpenAI-compatible credits (`qwen-plus`, `qwen4-max`, `qwen3.8-max`, `qwen3.8-flash` on `dashscope-intl.aliyuncs.com`) | Active key in local env | ALIBABA_API_KEY / DASHSCOPE_API_KEY / ALIBABA_BASE_URL |
| Nous Portal / Hermes Plus ($20/mo) | https://portal.nousresearch.com | Hermes Agent usage + 1 Cloud Agent (`<=4 GB RAM`, `<=25 GB disk`) are included in $20/mo Plus; **API keys (`sk-nous-...`) always bill pay-as-you-go credits, NOT included usage**, so API calls fail-close to the 3-model `$0` cascade (`qwen/qwen4-max:free` -> `meituan/longcat-2.5:free` -> `stepfun/step-3.7-flash:free`) with `NOUS_ALLOW_PAYG=false` | Active promo key in local env | NOUS_API_KEY / NOUS_MODEL / NOUS_QWEN4_MAX_FREE_PROMO_ENABLED / NOUS_ALLOW_PAYG |
| PostHog for Startups | https://posthog.com/startups | Project 516325; bot/crawler suppression + replay off by default | | NEXT_PUBLIC_POSTHOG_KEY |
| OpenAI Startups | https://openai.com/startups | Partner VC preferred | | OPENAI_API_KEY optional |
| AWS Activate (Acct `183295455211`) | https://aws.amazon.com/activate/ | **HOLD `CLAUDE_PROVIDER=bedrock` until reinstated:** corporate OAuth is already on `hq@galaxysportsedge.com` (no email change needed); suspended since Nov 4 over `$25.73` Oct Invoice `2899922873` -- (1) pay `$25.73` to reinstate, (2) submit NVIDIA Inception Org ID (`#1086418431979798`, Bedrock `InvokeModel` ONLY) -> set `AWS_ACCOUNT_183295455211_REINSTATED=true` | Suspended over `$25.73` invoice (`hq@galaxysportsedge.com` OAuth verified); hold flip | AWS_ACCOUNT_183295455211_REINSTATED / CLAUDE_PROVIDER=bedrock |
| Anthropic Claude Startups & Corps | https://claude.com/programs/startups | Review `Dec 7` (`$50K` active review + `$46K` Startups [1 yr Team 5 seats + `$1K` API + `$45K` perks] + `$10K` Claude Corps for GSI 501(c)(3)) | Active review `Dec 7` | ANTHROPIC_API_KEY (fallback after free/cloud credits) |
| Stripe Atlas / Activate | https://stripe.com/atlas | Once-ever traps — time carefully | | STRIPE_* live |
| GCP / Google AI Ultra & Google Skills | https://cloud.google.com/startup | `$100/mo` AI Ultra GCP credit (`$1,200/yr`); **Google Skills Path 36 is NOT 100%** (`1,977` pts: C1-C2 `100%`, C3 `96%`, C4 `87%` capped by deprecated/unavailable Dataprep `640821`; **Starter plan at `0 TOTAL CREDITS`** after `$0.01` 35-credit pack spent, blank renewal date, blocking badges & Paths `420/419/4525` pending Option A `$29/mo` 7-day Pro trial vs Option B `$0.01` Starter decision); Career Launchpad `$5K` GCSB recovery + Qwiklabs `640821` waiver; Always-Free Pub/Sub (`gse-odds-ticks`, `gse-injury-wire`, `gse-intake-dlq`) + BigQuery `gse_calibration`; respect 31-day Workspace rule | AI Ultra active; Skills at `0 TOTAL CREDITS`; DeepMind/Launchpad applied | VERTEX_* / GCP_FREE_TIER_PUBSUB_TOPICS |
| Rolling Infra Portals & Search (`$81K+`) | https://modal.com / https://e2b.dev / https://livekit.io / https://upstash.com / https://tavily.com | Modal (`$25K` L4 GPUs), E2B (`$20K` sandboxes), LiveKit (`$23K`), Upstash (`$12K`), Tavily (`100K` free search credits replacing `$5` Firecrawl auto-reload -- disable Firecrawl auto-reload) | Rolling startup applications queued | TAVILY_API_KEY / UPSTASH_* / MODAL_* |
| Cerebras free | https://cloud.cerebras.ai | Free lane content (**content-generator wired #320**) | | CEREBRAS_API_KEY + CONTENT_FREE_LANE_ENABLED |
| Groq free | https://console.groq.com | Internal LLM tier | | INTERNAL_LLM_* |

### Non-Dilutive Grant & Competition Calendar (`$958K` Newly Surfaced Stack, Zero Equity Dilution)
- **Thu Nov 19 (`2:00 PM CT`):** DOE SBIR/STTR Fall 2026 Virtual Office Hours Part I (`~$200K+`, Pitch due `Dec 16` at `1:00 PM CT`) + Week 11 TNF `IND @ HOU`.
- **Fri Nov 20 (`11:59 PM PT` -- HARD 48H):** Mozilla Foundation Human-Scale AI Incubator (`$300K` -> `$500K`, non-LLM math packet ready at `docs/gsi/MOZILLA_HUMAN_SCALE_AI_PROPOSAL_2026_11_20.md`).
- **Thu Nov 26 / Mon Nov 30:** Week 12 Thanksgiving `$14` 5-Game Pass (`Nov 26`) + Mozilla Fellowships 2027-2028 nomination cutoff (`Nov 30`, `$125K`, LOI due `Dec 17`).
- **Thu Dec 3 / Sat Dec 5 / Mon Dec 7:** TIPS-USA First-Thursday IDIQ window + `$600` collection (`Dec 3`); 14 NVIDIA DLI codes expire (`Dec 5`); Anthropic `$50K` / `$46K` Startups / `$10K` Corps (`Dec 7`).
- **Wed Dec 9 / Thu Dec 10:** New Caney ISD RFP `121.26` due (`Dec 9`); GSI TX SOS `#15043440630001` `$0` 30-day cure deadline (`Dec 10`, Board of Directors, no members, Garrett Baxley Organizer).
- **Tue Jan 6, 2027:** NFL Big Data Bowl 2027 on Kaggle (`$100K` cash prize -- Combine sensors -> regular-season performance using Wave 22 RFID + `biomech_and_ballistics.py` + `kinematic_workload_hazard.py`). Plus DARPA ERIS (`DARPA-PS-25-05`), Army xTech (`$300K`), AdSense `pub-8151105906877749`, Impact `8111208` (Fanatics `8%` non-gambling merch only).

Full sequencing + traps: [`GSE_CREDITS_PROGRAMS_ACTION_PACK_V3.md`](./GSE_CREDITS_PROGRAMS_ACTION_PACK_V3.md) · **Master alignment:** [`FUNDING_PARTNERSHIP_ALIGNMENT_MASTER.md`](./FUNDING_PARTNERSHIP_ALIGNMENT_MASTER.md) · **Mozilla packet:** [`MOZILLA_HUMAN_SCALE_AI_PROPOSAL_2026_11_20.md`](../gsi/MOZILLA_HUMAN_SCALE_AI_PROPOSAL_2026_11_20.md)

**Anti-pattern:** claim once-ever slots before you will spend.
