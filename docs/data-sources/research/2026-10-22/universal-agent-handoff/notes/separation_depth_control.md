# Depth control: separation survives (partial r .416) and prices out at +6.5pp catch/yd

The obvious objection to the last finding is that separation is measured at the catch point, so it partly
encodes the outcome. Depth of target is the obvious confound, since deeper throws are both harder and
measured further from launch. Controlled for it:

- raw corr(residual, catch rate) 0.508
- **partial corr controlling depth: 0.416**
- regression catch ~ residual + depth: residual **+0.0645** (+6.5 catch points per yard of extra
  separation), depth **−0.0103**, R² **0.32**

So separation is not a depth proxy. A third of catch-rate variance is explained by just two variables, and
separation carries 6.5 percentage points per yard independently of how deep the throw is. Losing 0.09 of
correlation to the control is the honest cost; the effect remains large.

## Interpretation
6.5 points of catch probability per yard of separation is a usable, quotable coefficient and it lands close
to the +0.29 log-odds per yard fitted on BDB separation earlier, once translated through the base rate
(log-odds 0.29 ≈ 7pp at p=0.67). Two independent datasets, two model families, same magnitude — that is the
strongest internal validation of the whole separation thread.

## Gap to fix
`recYards` was not included in the harvest, so yards-per-target could not be tested. Separation should move
yards per target more strongly than catch rate; that check needs a re-harvest with the receiving-yards field.

## Caveats
- Depth here is the receiver's own average depth of target, not per-play depth; both are game aggregates.
- Catch rate at 3-target minimum, so noise on both sides.
- The mechanical component cannot be fully removed at aggregate level — only per-play separation
  (pre-throw) would settle it, which is what the NGS tracking frames would give.
