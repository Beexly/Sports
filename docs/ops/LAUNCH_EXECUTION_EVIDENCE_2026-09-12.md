# Launch execution evidence — 2026-09-12

## L0 — release identity and scope
- Local HEAD: `5ddafd37e826793cbc78dd623e8a68b7765e3af6`
- Local branch: `hermes/c298-inplay-parity-2026-09-12`
- Local status at check: `M AGENTS.md`, `M docs/intelligence/LEVERAGE_STATUS.md`, untracked handoff plan + scratch files (preexisting, not staged)
- Public truth: HTTP 200, `generatedAt=2026-09-12T15:04:44.345Z`
- Deployed SHA (endpoint): `abceb40e1f22aa6d78f5e6cae47206daba3778de`
- `git cat-file -t abceb40...` locally: object NOT present (fatal: could not get object info)
- Verdict: SHAs DIFFER; ancestry/newer NOT established. Intended release NOT yet confirmed — do not treat local fixes as production fixes until resolved.
- Endpoint-reported cohort (not independently recomputed): eligibility GREEN n=407, Brier 0.2103, raw ECE 0.0549, debiased 0.038688; gates statsPublic=true, canExposePublicPicks=true, canExposePerformanceStats=true, calibrationPublished=true.
- No code edited in L0. No flags changed. Tests NOT RUN in L0.

## L5 — benefit-to-route-to-real-source matrix (verified 2026-09-12, no code changed)

| Paid/free benefit (pricing copy) | Route | Real source / enforcement | Verdict |
|---|---|---|---|
| Free calculators & tools | /tools | User-entered-data calculators (L13 verifies each works) | PASS pending L13 |
| Academy full training floor (Free) | /academy + /fantasy/academy | GmAcademy drills; illustrative-labeled scenarios | PASS — exists, labeled |
| Public methodology + calibration | /methodology, /calibration | Real loaders, gated report | PASS |
| Draft Assistant + Best Ball on real, cleared data (Fantasy $) | /fantasy/draft, /fantasy/bestball | Server graded pool when entitled (fail-closed); illustrative default + ProjectionsBadge pool discriminator when not | PASS — claim attaches to paid tier that gets the pool |
| Full board / confidence / factor trail (Pro) | /board, /picks | loadBoardState + entitlement gating, daily limits | PASS — gates enforced server-side |
| Graded-pick alerts, line-value tracker, staking toolkit (Elite) | alerts/tracker/staking routes | Claimed Elite-only | NOT VERIFIED — needs paid-path walkthrough before launch |
| Studio (NOT marketed on pricing) | /fantasy/studio (noindex) | generateWeeklyBrief consumes DFS_SLATE (fictional) + waiver/scheme modules; page carries ILLUSTRATIVE_NOTE, draft-only, never auto-publishes | PASS as free internal-style tool; fidelity limit noted, not a paid promise |
| 3-day money-back window (pricing x3) | N/A (policy) | NO in-repo enforcement found; charge.refunded wired to revocation only | FOUNDER OPS QUESTION — confirm manual Stripe handling; do not rewrite promise unilaterally |
| Age 21+ subscription gate | /api/subscriptions/checkout | assertAtLeast21 intact (route lines 39/49/106) | INTACT — removal BLOCKED pending founder authority |
| Legacy fantasy deep-links | /fantasy?tool=* | LEGACY_TOOL_ROUTES map, honored | PASS |

Suites: entitlements, entitlements-enforcement, subscriptions-checkout-route, fantasy-pool-gating, f25-fantasy-illustrative-noindex — 89/89 pass. No subscriber access changed. No billing mutation.

## Next
- L6: lineup validator + input contract (after L1 done). L1–L4 committed UNPUSHED.
