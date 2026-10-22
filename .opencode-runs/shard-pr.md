Re-applies the signal-ledger shard fix onto current `main`. The original (#944) went red on a test file that no longer exists on `main` and was 20 commits behind — stale branch rot, not a regression from this change. Verified by re-running the suite here.

## The bug it fixes, measured

```
[cron:signal-ledger-write] shard=0/1 candidates=118402 written=80000
skipped=0 batches=160 errors=1
```

**80,000 of 118,402 rows — 67.6% — on every tick.** The route ran a constant `0/1` shard, so each hourly run rewrote the same leading rows and **never reached the tail**. Roughly 38,000 rows were permanently unwritten.

## The fix

Derive the shard from the UTC hour rather than a constant:

```ts
return { n: new Date(startedAtMs).getUTCHours() % SHARD_COUNT, total: SHARD_COUNT };
```

UTC because the schedule is a UTC cron expression. An explicit `SIGNAL_LEDGER_SHARD` still wins. No configuration needed, and the alternation is deterministic.

## Verified here

- `signal-ledger-write-route` + `signal-ledger-writer` + `cron-route-contracts`: **20/20 pass**
- The test log shows the shard actually alternating: `shard=0/2` then `shard=1/2` — the tail is reachable, which is the whole point
- A test pins exactly this: it freezes `Date.now()` across four distinct hours and asserts consecutive ticks **must** alternate, or the tail is unreachable forever

Two shards of ~59,201 each finish the population, comfortably inside the 80,000-row deadline. The commit notes that raising the shard count without re-measuring would put every shard back over that deadline and reintroduce the bug.

**Not changed:** no schema, no gate, no weight, no `MODEL_VERSION`.