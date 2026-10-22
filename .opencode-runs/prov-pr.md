The adapter layer emitted 52 `provenance:` strings naming engine modules it never imported — the SURF-13 defect, now closed. **The guard reports 0 violations.**

| Action | Count | Detail |
|---|---:|---|
| Relabelled | **66** | `engine-inline:<file>#<fn>` — names the function that actually produced the number. Includes the 16 directory-prefix claims (`.../src/calibration/`) that named no symbol at all. |
| Wired for real | **2** | `devig/oracle.ts#devig` is now genuinely called by `devigOracleAdapter` and extended-signal `devigAdapter`. |
| Headers corrected | 6 | Files asserting "each adapter invokes the real computation". |

7 files, +366/−135. Plus the 15 remaining ungated-but-unwired functions are filed in code comments rather than deleted, so the pointer survives.

## Two things the audit turned up that the fix had to handle

**1. The guard was structurally unable to be satisfied.** Its "has teeth" test proved the detector worked by *requiring* `violations.length > 0` and a specific reason string produced only by the `predictLogistic` case. Fixing the last violation turned the guard **red by design**. It is now based on a synthetic fixture asserting all four detection rules, plus a positive control that backed claims stay backed.

**2. The two devig adapters I wired were computing wrong values — and I did not take the subagent's word for it.** Snapshotting all 68 adapters before and after: **66 byte-identical**, 2 differ, and both were miscomputing:

- `devigAdapter(-110,-125)` read American odds as *decimal* prices, so `1/-110` is a **negative** implied probability. Equal-sided inputs cancelled the error and hid it — 0.4853 instead of 0.5319.
- `devigOracleAdapter` normalised by sum for **every** method, silently doing multiplicative while reporting `"additive"` in `raw`.

Neither has a non-test caller, so no published number shifts. Worth stating plainly: wiring an adapter to a real function is only correct if the adapter was already right.

## Verified here, not inherited

- Guard: **0 violations**, 4/4 tests
- Full engine suite: **859 files / 6,297 tests / 0 failed**
- **Non-vacuity re-proven by me**: injecting one fabricated `provenance` string → `1 violation` → ratchet red, with the actionable "lower KNOWN_VIOLATIONS" message. Source restored clean afterwards.

## Not changed

No gate, weight, schema, or `MODEL_VERSION`. This changes only what the adapter layer *claims* about itself, plus two devig call sites that are not on any live path.