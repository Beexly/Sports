Follow-up to #959, which landed the Neon branch-churn fix and the cost audit.

**This adds one thing: a record of why the audit's top recommendation cannot be executed from this machine.**

`docs/ops/cost-neon.md` ranks **P1** as the cheapest risk reduction in the whole cost audit: set `suspend_timeout_seconds = 300` on the `sports-db` endpoint. Pure runtime config, no rows touched, reversible, and it closes a **$610.56/month** ceiling on a project that costs **$0.01** and is used by nobody.

I tried to do it and could not. The local `NEON_API_TOKEN` is **not an API key** -- it is a 219-character connection string beginning `https://ep-sum...`. Used as a bearer against the Neon control plane it returns `401 supplied credentials do not pass authentication`. That matches `neonctl` on this machine reporting `Projects Limit 0` and `not an organization member`: the local CLI identity is a **different account** from the one that owns `gse-postgres` and `sports-db`.

So it is two clicks in the console, or drop an `napi_` key into `~/AppData/Local/hermes/.env` as `NEON_API_KEY` and I will do it. No secret from this investigation was written to disk, printed, or committed.

**One number restated because it is the one most likely to be mis-quoted:** $610.56/month is the **ceiling** if that endpoint ever receives a real connection while scale-to-zero is disabled. Measured September spend on it was **$0.0096**. Today's exposure is one cent.

Also recorded, so the next agent does not repeat the attempt: nothing in the repo holds a working `napi_` token, which is also how the original audit obtained its numbers.