# 10-Second Public Route Copy Audit

Date: 2026-06-09

Scope: docs-only audit of launch-facing public route copy in the deploy clone. No app code changed.

## Executive Result

The public copy is directionally strong: it is sharper than generic sports SaaS copy and repeatedly emphasizes receipts, gates, patience, and discipline.

The main launch risk is not weak branding. The risk is a few phrases that may overstate readiness, sound too betting-forward, or imply live coverage before `/api/ready` and ingestion freshness are green.

## Copy Gate

Before launch, public copy should pass these checks:

1. A new visitor understands GSE in 10 seconds.
2. The page does not sound like a sportsbook, tout, or betting advice product.
3. Readiness-sensitive claims are true on production.
4. Pricing copy matches the actual active checkout configuration.
5. Promotions copy does not imply live legal-reviewed offers unless approved.
6. Methodology copy explains the philosophy without exposing protected internals.
7. No-bet/restraint is framed as value.

## Route Audit

| Route | 10-second answer needed | Current launch risk | Priority | Recommendation |
|---|---|---|---|---|
| `/` | What is GSE? | Hero is memorable, but "sports betting research" framing can sound closer to betting advice than sports intelligence. | P1 | Keep the edge, but lead with "sports intelligence" and risk/no-bet discipline. |
| `/board` | What should I look at first? | Degraded/sample states are present and useful. | P1 | Add a clearer one-line explanation for empty/degraded lanes after P0. |
| `/picks` | What is available, gated, or unavailable? | "Every signal published today" can overstate if readiness is not green. | P0/P1 | Ensure launch state says gated/unavailable when readiness is not green. |
| `/pricing` | What do tiers unlock and what is charged? | Pricing text must match live checkout exactly before public launch. | P0 | Verify plan amounts/cadence against active billing before deploy. |
| `/methodology` | Why trust it without seeing the secret recipe? | Generally strong. | P1 | Add a simpler first sentence for non-technical users. |
| `/performance` | What happened and what is proven? | Strong guardrail: past performance disclaimer exists. | P1 | Keep receipts language; avoid implying future win rate. |
| `/promotions` | Are offers informational and approved? | "Vetted sportsbook promotions" is risky if no live approved offers exist. | P0/P1 | Prefer "Reviewed partner offers" or keep empty-state with compliance disclosure until approval. |
| `/faq` | How do I get unstuck? | Some answers make live odds/refresh/pricing claims that must match production. | P0/P1 | Align with readiness, active pricing, and launch scope. |
| `/contact` | How do I reach support? | Clear enough. | P2 | Add issue categories later. |
| `/brief` | Why return daily? | Basic stub clarity. | P2 | After launch, turn into daily habit loop. |

## Highest-Risk Copy To Review

### Betting-Forward Language

Current style includes phrases like "sports betting research" and "sports picks." This is understandable for SEO and user intent, but launch positioning should put "sports intelligence" first so users do not mistake GSE for a sportsbook or direct betting advice product.

Safer pattern:

> GSE is sports intelligence for understanding signal, risk, confidence, and no-bet situations.

### Readiness-Sensitive Claims

Any claim about live odds, refresh cadence, every signal, current data, all sports, alerts, or real-time behavior should be true in the production target.

If `/api/ready` is not green, public copy should not imply live/current completeness.

### Pricing Claims

Pricing page and FAQ mention specific prices and refund terms. Before public launch, verify:

- plan prices,
- cadence,
- refund window,
- checkout IDs,
- entitlement mapping,
- upgrade/downgrade behavior,
- cancellation path.

If any of those are not active, change copy or keep checkout gated.

### Promotions Claims

Promotions page currently has the right empty-state discipline, but the headline is still sensitive.

Safer public launch headline if no approved live offers:

> Reviewed offers will appear here after compliance approval.

Or:

> Partner offers, reviewed before display.

Avoid:

- "best sportsbook promos,"
- "claim now,"
- "go bet,"
- "risk-free,"
- "guaranteed bonus."

## Route-Specific Recommendations

### Home

Current strength:

- Strong identity.
- Memorable anti-hype stance.
- Clear methodology CTA.
- Preview mode banner is honest.

Launch improvement:

Use the first paragraph to say sports intelligence, risk, and no-bet discipline before betting language.

Suggested first paragraph:

> Sports intelligence for reading signal, risk, and no-bet situations before the market noise takes over. GSE shows what changed, what matters, and when uncertainty is high enough to step back.

### Board

Current strength:

- Degraded/sample behavior is visible.
- Gate Cam concept is strong.

Launch improvement:

Add a plain-language sentence:

> This board shows what is being evaluated, what cleared the gate, and what was held back.

### Picks

Current strength:

- Explains price, timing, risk, and reasoning.

Launch risk:

- "Every signal published today" should be conditional on readiness.

Safer pattern:

> Published signals appear here when the readiness gate is open. If the system cannot verify freshness, it withholds the board.

### Pricing

Current strength:

- Tiers are simple.
- "No upsell games" is good brand language.

Launch risk:

- Price/cadence and refund terms must be exact.

Pre-launch requirement:

> Pricing copy must match the live checkout configuration or checkout stays off.

### Methodology

Current strength:

- Good protected-method boundary.
- Explains factors and decision philosophy.

Launch improvement:

Add a non-technical first sentence:

> GSE does not publish a pick just because there is a game. It evaluates the board, checks the strength of the signal, and withholds weak or stale situations.

### Performance

Current strength:

- Past-performance disclaimer is visible.
- Calibration/receipt framing is correct.

Launch improvement:

Keep the page humble until enough canonical settled history exists.

Suggested line:

> This page is a receipt trail, not a promise engine.

### Promotions

Current strength:

- Empty state is conservative.
- Compliance language exists.

Launch risk:

- Headline should not overpromise reviewed live sportsbook promotions before legal/founder approval.

Suggested launch-safe headline:

> Partner offers will appear here only after review.

### FAQ

Current strength:

- Strong difference from tout services.
- Good risk answer.

Launch risk:

- Some claims about live odds, refresh loop, sports covered, and paid tier behavior must be verified against production.

Suggested correction pattern:

> GSE shows live/current surfaces only when readiness checks are green. If a source is unavailable, the product should say so.

### Contact

Current strength:

- Support/legal/press categories are clear.

Launch improvement:

Add "bug report" fields after launch:

- page URL,
- expected behavior,
- actual behavior,
- device/browser,
- screenshot.

### Brief

Current strength:

- Good future habit surface.

Launch improvement:

Make it clear if the brief is preview, stub, or live.

Suggested line:

> The Daily Brief becomes most valuable when production ingestion is live and freshness checks are green.

## Recommended Copy Changes After P0

Do not patch while Claude owns P0 unless a phrase is confirmed as launch-blocking.

After P0:

1. Replace betting-first framing with sports-intelligence-first framing on `/`.
2. Verify and align all pricing/refund/cadence copy.
3. Review FAQ claims against production readiness.
4. Soften promotions headline until legal approval.
5. Add clearer degraded-state explanation to board/picks.
6. Add "receipt trail, not promise engine" language to performance.
7. Add support/bug-report guidance to contact.

## Possible Launch Blockers

These should be treated as P0 if still public at launch and unverified:

- specific pricing/cadence that does not match checkout,
- live odds/refresh/current-data claim that readiness cannot support,
- live promotions language before approval,
- current-player/current-roster claim without verified source,
- any phrase implying betting advice or guaranteed outcome.

## Safe Copy Direction

The best launch voice is:

- direct,
- disciplined,
- calm,
- skeptical of hype,
- clear about uncertainty,
- proud of restraint,
- honest about degraded states.

The best one-line public positioning:

> Sports intelligence for signal, risk, and no-bet discipline.

