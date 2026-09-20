#!/bin/sh
# Sequential runner with single-thread BLAS (the fix for the throttling).
export OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1
export VECLIB_MAXIMUM_THREADS=1 NUMEXPR_NUM_THREADS=1
cd /tmp/nfl || exit 1
: > /tmp/nfl/chain.log
echo "== stage2c (perms + A5 + bootstrap) $(date -u +%H:%M:%S)" >> /tmp/nfl/chain.log
python3 l1_stage2c.py >> /tmp/nfl/chain.log 2>&1
echo "== stage2c rc=$? $(date -u +%H:%M:%S)" >> /tmp/nfl/chain.log
echo "== stage2e (placebo + tertiles + yards) $(date -u +%H:%M:%S)" >> /tmp/nfl/chain.log
python3 l1_stage2e.py >> /tmp/nfl/chain.log 2>&1
echo "== stage2e rc=$? $(date -u +%H:%M:%S)" >> /tmp/nfl/chain.log
echo "== L5 $(date -u +%H:%M:%S)" >> /tmp/nfl/chain.log
python3 l5.py >> /tmp/nfl/chain.log 2>&1
echo "== L5 rc=$? $(date -u +%H:%M:%S)" >> /tmp/nfl/chain.log
echo "== L2 $(date -u +%H:%M:%S)" >> /tmp/nfl/chain.log
python3 l2.py >> /tmp/nfl/chain.log 2>&1
echo "== L2 rc=$? $(date -u +%H:%M:%S)" >> /tmp/nfl/chain.log
echo "CHAIN_DONE $(date -u +%H:%M:%S)" >> /tmp/nfl/chain.log
