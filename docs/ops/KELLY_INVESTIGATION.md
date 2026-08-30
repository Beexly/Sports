# Investigate: Kelly criterion for stake sizing

- Math SoT: `lib/tracker/staking.ts` (default quarter-Kelly)
- Integrity wrapper: `lib/staking/kelly-investigation.ts`
- Zero stake if no edge; never treat p as verified while RED
- With Res≈0, Kelly amplifies noise — rank first, calibrate second, size third
