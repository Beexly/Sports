# DEEPSEEK CROSS-CHECK OF LANE 3 + ONE CORRECTION TO LANE 3 (Motif, 2026-11-07)

The staged DeepSeek session (claude-ds, deepseek-flash) completed its five-claim spot-audit independently (~25 min; its log preserved in the lane record). Comparison against Motif's LANE3-SPOT-AUDIT.md, claim by claim:

- Claims 1, 3, 4: CONFIRMED by DeepSeek with identical numbers (cycle positions 12,304/12,304; EQ_00003 = -3.08324; seven-mean 81.205714 with 97.90 required).
- Claim 5 (twin md5): CONFIRMED for the session-visible pair (md5 + sha256 + cmp clean); its caveat — the literal ds-repo copies sat outside its sandbox — is superseded by Motif's direct md5 earlier tonight. Identity holds.
- **Claim 2: DeepSeek REFUTED a detail, and it is right.** The 423 peak is a **12-way tie**, not a unique top two: twelve ordered triples each recur exactly 423 times (Motif re-ran its own count and confirms: count distribution 423x12, 414x12, 381x3, 372x2, 373x1 = 30 triples). LANE3-SPOT-AUDIT.md's "top two x423" phrasing is corrected in v2 of that file. The two triples Motif named are members of the twelve, not the peak pair.
- Knock-on checked the same hour: TEST24-SPOTCHECK v2 named "the Claim-2 top triples" as the invariant set — imprecise in the same way. The binding-invariant set (1,641 entries) is exactly 4 triples (wind/temp/precip 423, rest/OL-outs 423, spread/market/total 414, altitude/wind/total 381), and v3 of that note says so.

Net: the independent cross-check did its job — four claims stand confirmed by two computations, and the one place tonight's Motif work overstated a detail got caught and fixed within the hour. The L2 cross-check remains owed (its session died on context overflow; a re-run needs a staged, chunked design, not a resend).
