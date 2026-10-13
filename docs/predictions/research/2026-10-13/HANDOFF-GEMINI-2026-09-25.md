# Brief for Gemini. Second opinion on the whole company.

You are not continuing Grok. Grok spent this session shrinking a large company into a homepage grader, a $350 kit, and a $200 stock account. The owner stopped that. He wants a different perspective, other ideas, and other paths, grounded in the files.

Read the repos. Disagree in the open when the files disagree with this brief. Do not implement, deploy, post, email, trade, or spend. Do not print secrets. If a file looks like a key, close it.

---

## Who this is for

Garrett Baxley. Kingwood, Texas. Time zone America/Chicago. He owns Galaxy Sports Edge (public site galaxysportsedge.com, X @GalaxySportsHQ) and a second repo of small web products. He wants about $300 a day and about $9,000 a month, unattended where that is actually possible. He is out of work. Proposals that need him to walk into shops, tap a phone, or babysit a model are weaker than proposals that run.

He has already rejected two moves. Do not bring them back as the answer unless the files force you to, and then say why the files beat him:

- Centering one catering client in `autonomous-revenue-engine\clients\chick-goodies`. The folder is real. An agent got stuck there. Treat it as one asset among many, not the company.
- Treating a ~$200 Alpaca cash account as the way to make $300 a day. Measured 2026-09-24: equity about $199, cash about $10.50, two small stock positions with resting sells. If both sells fill, the gain is about $3.47. Options and crypto on that account were rejected by the broker. A fresh model that "solves" this with leverage, memecoins, or reuse of unsettled cash is repeating a dead end.

---

## The three trees

Read these. They are on this PC.

1. `C:\Users\Garrett\Sports`
   The sports product. Next.js, Prisma, a frozen prediction engine, subscriptions, a public board. `AGENTS.md` at the root is an enormous session diary plus hard laws. The laws are real constraints (no fake performance, no gate flips, no schema edits, no push, no invented numbers). The diary is not a strategy. If you treat the diary as the job, you will drown.

2. `C:\Users\Garrett\autonomous-revenue-engine`
   Many small products, not one kit. Apps include kit, framefit, linknest, reviewwall, qi-check, crush, stamp, board, brain, conformal-lite, and others. Ops docs, a kit sales page, staged social copy, lead tools. Live claims in the docs point at `https://autonomous-revenue-engine-eight.vercel.app/`. Verify a URL before you call it the business.

3. `C:\Users\Garrett\agent-bus`
   How other agents hand work around. Inbox and outbox for Motif, Grok, and OpenCode. A sports research bus under `sports\` with claims from Gemini, Grok, Opus, and others. A stock desk under `outbox\from-grok\`. Read `sports\CHARTER.md` and `sports\BOARD.md` before the stock scripts.

Ignore, unless a file cites them as a dependency: `gse-grok-build-sandbox`, anything that looks like a credential, and the 249-item saved-post board. That board is `C:\Users\Garrett\Downloads\AGENT-IMPLEMENTATION-HANDOFF__1 (1).md`. It is other people's prompts. Grok kept falling into it. You may sample it for one idea the repos do not already contain. You may not work it top to bottom.

---

## Read in this order, then roam

Stop after the commercial layer and say what the company is. Then test that sentence against code.

Sports, commercial first:

- `docs\commercial\90_DAY_COMMERCIALIZATION_PLAN.md`
- `docs\commercial\BUSINESS_MODEL_MAP.md`
- `docs\commercial\GSE_PRODUCT_STACK.md`
- `docs\commercial\REVENUE_RISK_REGISTER.md`
- `docs\commercial\COMPETITOR_INTELLIGENCE_MATRIX.md`
- `docs\business\GSE-BUSINESS-PLAN-2026.md`
- `docs\intelligence\monetization-lanes.md`
- `docs\revenue\` (the whole small folder)
- `docs\positioning.md`
- `docs\subscriptions-and-paywall.md`
- `apps\web\lib\pricing\pricing-phases.ts` if the path exists

Then the honesty constraints, as constraints, not as the product:

- `AGENTS.md` laws and the calibration notes near the top. Confidence on the book path has been measured as inverted. The signal path was measured differently. Do not propose "recalibrate everything."
- `docs\2026-09-13-confidence-calibration-baseline.md`
- `CLAUDE.md` only for the non-negotiable rules

Revenue engine, the parts a fresh reader would miss if they only opened the kit:

- `README.md`, `LEVERAGE.md`, `OPERATING.md`, `STRATEGY.md`, `HANDOFF.md`
- `ops\MULTI_PLATFORM_REVENUE_PATHS.md`
- `ops\GROWTH_STACK.md`
- `ops\TARGET_QUEUE.md`
- `ops\LIVE_SURFACES.md`
- `ops\PERSPECTIVE_20K.md` and `ops\SYNTHESIS_20K.md`
- `ops\FACTORY.md` and `ops\FIFTY_LOOPS.md`
- `.work-review\03-user-see-what-you-missed.md` and `04-review.md`
- `apps\` READMEs. List which apps are a page, which take money, and which are a demo.

Agent bus:

- `INDEX.md`, `PROTOCOL.md`, `STATUS.md`
- `inbox\from-motif\BUILD-BIBLE.md`
- `inbox\from-motif\CONTEXT-autonomous-revenue-engine.md`
- `sports\CHARTER.md`

Grok's last conclusions, so you can attack them:

- `C:\Users\Garrett\Downloads\HANDOFF-NEXT-GROK-2026-09-24.md`
- `C:\Users\Garrett\Downloads\grok-bot-galaxy-review (2).md` section 13 only, if you want the NVIDIA note. The rest of that review is a pattern book from someone else's product. Do not rebuild Grok Bot.

If a path above is missing, say so. Do not invent a substitute.

---

## What Grok already decided, and where it may be blind

Treat every line as a claim to test.

- The day-floor is framed as about 26 kits at $350. That arithmetic is true and it may be the wrong business. The sports repo has its own commercial plan, a pricing ladder, and a paywall. Grok barely used it.
- The kit customer was narrowed to "a homepage with no tap-to-call." One measured example exists: scoginaire.com, about 120KB, no phone and no `tel:` link in the HTML. Three other local trades looked similar on a partial fetch. This may be a real wedge, or a sample of three. The repo may already have a better wedge in framefit, qi-check, signpreview, or the sports product.
- A profit gate script exists at `autonomous-revenue-engine\tools\profit-gate.py`. It labels a $350 preview as DO and a sub-$300 trading gain as SLEEVE. It is a local script, not a company.
- Galaxy Sports Edge is not allowed to invent a win rate. Published confidence has been a bad probability. Closing-line value has been the long-running miss (the diary says 23% versus a 52.4% bar). A path that needs a fake record will get the owner hurt.
- NVIDIA Brev was surveyed as free infrastructure (forecasting, weather, video search, a deny-by-default agent sandbox). GPU hours have no published price. No box was launched. Their catalog does not include a website builder, SEO, lead-gen, or odds feed. NVIDIA's Hermes is not Garrett's Hermes.
- An Instagram comment sweep on 2026-09-25 already happened. Do not comment, follow, or DM anyone.

Your job is the path Grok did not take because it was not in the last prompt.

---

## Questions to answer

Write to a new file, `C:\Users\Garrett\Downloads\GEMINI-PATHS-2026-09-25.md`. Use the headings below. Every path needs a file you opened and a sentence on what is built versus what is only a doc.

1. **What this is.** One paragraph. Name the actual products a stranger could pay for this week, and the ones that are theater.
2. **Money paths, ranked.** Five to eight. For each: who pays, how much, what already exists in the tree, what is missing, what can run without Garrett at the keyboard, and the first hard block that is truly his (a login, a bank form, a public send, a fee). Kill any path whose only engine is "post more" or "trade the $200 harder."
3. **What Grok underweighted.** Assets, docs, or code that a different operator would have led with. Quote the path.
4. **What Grok overweighted.** Including this brief, if it did.
5. **Contradictions.** Places the sports diary, the revenue-engine strategy, and the live app disagree. Say which one you believe and what file decided it.
6. **Thirty-day bet.** One path you would actually run. Name what you would ignore on purpose. If you cannot pick, the reading failed.
7. **Do not.** A short list of seductive work that the files show is already a trap. Calibration theater, unscored confidence, republishing someone else's prompts, and a GPU with no spend cap belong here if you still agree after reading.

Tone: a sharp operator who read the tree. Not a pep talk. Not a rewrite of Grok's seven bots. If your best path is one Grok already named, say that it survived contact with the files, and say what you added.

---

## Hard limits while you look

- Read only. No commits, no deploys, no orders, no posts, no emails, no new accounts.
- No secrets in your writeup. No `.env` values, no key prefixes pasted into the doc.
- No invented metrics. If a number is not in a file or a command you ran, mark it unknown.
- Sports gates and the prediction-engine version stay untouched. You are not shipping.
- The catering folder is evidence, not an assignment.
