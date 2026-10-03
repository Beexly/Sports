# Affiliate/partnership tooling — founder-pasted DeepSeek research, triage note

Source: DeepSeek research dump pasted by founder 2026-08-19 night. **Not yet
verified.** Per CLAUDE.md (no fake data, no fabricated stats), nothing here
gets adopted, cited, or acted on until each specific repo/claim passes the
same citation-verification discipline used for tonight's C-16 research fleet
(does the repo exist, does the URL resolve, do the stats appear anywhere
outside this one AI-generated summary).

## Reason for caution, not dismissal

Several claims carry the classic hallucination signature — hyper-precise,
unverifiable numbers presented as fact: "$0 → $4M... $20/mo operating cost...
14+ months," "$16.02 revenue potential (30-day projection)," "100M+ clicks
and 2M+ links monthly," "Used by ASOS, Vestiaire Collective, and Shopify."
Some named tools are real and well-known (Dub — link infra; Google Meridian —
Google's actual open-sourced MMM tool). Others (Refferq, ClawMarketing,
SponsorFit, OpenPartner, xAmplify PRM, mangosqueezy, Numok, etc.) are
plausible-sounding but unconfirmed — could be real, could be invented, could
be real repos with invented numbers attached. Treat the whole list as leads,
not facts, until checked.

## What's actually a good idea regardless of which repos are real

- **PRM vs. affiliate distinction** — the point that partnerships (data
  providers, content partners, distribution, white-label) need different
  handling than affiliate links is sound and matches nothing we have in
  `apps/web/lib/revenue/` today (only `RevenueSurface`/`RevenuePartner`, no
  deal-registration or partner-tier concept). Worth its own design pass
  eventually, low urgency.
- **Attribution surviving Safari ITP / third-party cookie deprecation** —
  real, current problem for any affiliate mechanism, ties directly into C-18
  (postback tracking) already opened tonight. Worth folding into that design
  when it's picked up, not a new item.
- **Fraud detection on commissions** — real risk if R-7/C-17 ever go live;
  fold into C-18's design scope rather than opening separately.

## Next step (deferred — not tonight, to conserve tokens)

A bounded, cheap verification pass (single agent, ToolSearch → WebFetch each
named repo URL, confirm exists/real/last-commit date, discard anything that
doesn't resolve) before any of this feeds C-17/C-18/R-7. Do not skip
verification and cite these by name in any founder-facing or code-facing
decision.
