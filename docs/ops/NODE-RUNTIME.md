# Node runtime: one pin, and how to move it

**Decision: the repo pins Node 20 today, because Node 20 is what actually ships.
Moving to 22 is correct and overdue, and this document is the one-commit recipe
for doing it. It is not done here because the file that decides it is out of
this change's reach.**

## The pin

`.node-version` at the repo root holds the major. `.nvmrc` holds the same major
for nvm, which does not read `.node-version`. If both exist they must agree —
`scripts/guardrails/node-container-parity.mjs` fails if they do not.

```bash
nvm use          # reads .nvmrc
fnm use          # reads either
node --version   # expect the major in .node-version
```

## Why 20 and not 22

What the repo actually runs, verified by grep on this tree:

| Surface | Declared major | Where |
|---|---|---|
| CI | 20, in 15 places | `node-version:` across `.github/workflows/ci.yml` (12), `fable-evidence.yml`, `weekly-comparison.yml`, `nova-convergence-inventory.yml` |
| Web/app image | 20 | `docker/Dockerfile:5` — `FROM node:20-alpine` |
| Worker images | 20 | `workers/{data-refresh,pick-generation,content-publishing}/Dockerfile` |
| Chaos harness mock | **was 22** | `docker/chaos/docker-compose.chaos.yml:18` — corrected to 20 alongside this document |
| `engines.node` | `>=20.0.0` | root `package.json` |

CI decides whether a commit ships. Every CI job runs Node 20. A repo that told
developers to run 22 while CI ran 20 would not be pinning anything, it would be
relocating the mismatch — and relocating it onto the *shipping* side, where the
container images live, is strictly worse than where it is now.

So the pin follows the authority. When the authority moves, the pin moves with
it, in the same commit.

## What this costs, stated plainly

Node 20's end-of-life is **2026-04-30**, per the upstream release schedule
(`https://raw.githubusercontent.com/nodejs/Release/main/schedule.json`, v20
`"end": "2026-04-30"`). That date has passed. Node 20 receives no further
security releases, and `node:20-alpine` will stop getting patched base images.

Node 22 is supported until **2027-04-30** (same source, v22 `"end"`), and Node 24
until 2028-04-30.

This is a real, accruing cost and the reason the bump below should be scheduled
rather than admired. Pinning to 20 does not make the repo more secure — it makes
the repo *honest* about the runtime it is already using everywhere, which is the
precondition for moving it deliberately instead of discovering the move through
a red PR.

## The bump: exactly what to change

One commit. Nothing here is guesswork; the workflow hunk below was produced by
running the `sed` and taking `git diff`, then reverting.

**1. CI (15 lines across 4 files).** This is the authority; change it first.

```bash
sed -i 's/node-version: "20"/node-version: "22"/; s/node-version: 20$/node-version: 22/' \
  .github/workflows/ci.yml \
  .github/workflows/fable-evidence.yml \
  .github/workflows/weekly-comparison.yml \
  .github/workflows/nova-convergence-inventory.yml
```

Diff shape, repeated 12 times in `ci.yml` and once each in the other three:

```diff
       - name: Setup Node.js
         uses: actions/setup-node@v4
         with:
-          node-version: "20"
+          node-version: "22"
           cache: "npm"
```

`weekly-comparison.yml:31` is the one unquoted occurrence (`node-version: 20`),
which is why the `sed` carries a second expression.

**2. The pin.**

```bash
printf '22\n' > .node-version
printf '22\n' > .nvmrc          # if present
```

**3. The containers.** Five files: `docker/Dockerfile`, the three
`workers/*/Dockerfile`, and `docker/chaos/docker-compose.chaos.yml`. Do not hunt
for them by hand:

```bash
node scripts/guardrails/node-container-parity.mjs
```

It lists every container still on the old major, by file and line, and exits 1
until all of them agree with `.node-version`. That is the whole point of the
guard: the bump becomes mechanical and verified rather than a grep you might
half-finish.

**4. `engines.node`.** Left alone on purpose — see below.

**5. Verify on the new runtime**, not on whatever the sandbox defaults to:

```bash
PATH=/path/to/node22/bin:$PATH npm run test --workspace=apps/web
PATH=/path/to/node22/bin:$PATH node scripts/guardrails/run-all.mjs
```

## Why `engines.node` is not narrowed

The obvious move is `"node": ">=20.0.0 <21.0.0"` so npm warns anyone on 22. It is
not made here, deliberately.

`vercel.json` at the repo root is the production deploy config, and Vercel reads
`engines.node` from `package.json` to select the build and runtime Node version.
A range that Vercel cannot satisfy fails the build outright. Whether Vercel still
offers Node 20 is a fact about the platform's current console, not about this
repo, and it cannot be tested from here without deploying. Narrowing that field
would put a production build at risk to win a local warning.

The warning is bought elsewhere instead, at no such risk:

- `scripts/lib/node-runtime-pin.mjs` — `describeRuntimeDrift()` /
  `assertPinnedRuntime()` for scripts whose verdict is only meaningful on the
  pinned runtime.
- `scripts/guardrails/node-container-parity.mjs` — containers must match the pin.
- `scripts/guardrails/node-version-parity.mjs` (separate change) — workflows,
  version files, `engines` floor, and a static scan for post-pin APIs.

If a future maintainer confirms in the Vercel project settings which majors are
selectable, narrowing `engines.node` becomes safe and is worth doing.

## Writing a script that needs a newer API than the pin

Do not let it fail with `TypeError: ... is not a function` in CI. Declare the
requirement at the top of the module:

```js
import { requireNodeFeature } from "../lib/node-runtime-pin.mjs";

requireNodeFeature({
  feature: "module.registerHooks",
  minMajor: 22,
  remedy: "use module.register(), which exists on the pinned major",
});
```

On the pinned runtime that throws at load with the feature, the major it needs,
the major running, the pin, the file the pin lives in, and the remedy. Measured
on this machine:

```
$ PATH=/opt/node20/bin:$PATH node -e "const m=require('module'); \
    console.log(process.version, typeof m.registerHooks, typeof m.stripTypeScriptTypes)"
v20.20.2 undefined undefined
$ node -e "..."                       # sandbox default
v22.22.2 function function
```

Both of those are exactly the APIs that turned a readiness-gate PR red while
passing locally.

## Reversing this

- Prefer a different major: follow "The bump" above with that major.
- Drop the container check entirely: remove `&& npm run test:node-runtime-pin &&
  npm run guard:node-container-parity` from the `guardrails` script in
  `package.json`, and delete the `node-container-parity` /
  `node-runtime-pin-test` entries from the `GUARDS` array in
  `scripts/guardrails/run-all.mjs`. Nothing else imports the guard.

  Both wirings exist because they are not the same path. CI's "All guardrails"
  job runs `npm run guardrails`, which is the `&&` chain in `package.json`;
  `scripts/guardrails/run-all.mjs` is referenced by no workflow and no npm
  script, so a guard listed only there does not run in CI today.
- Drop the pin: delete `.node-version`. The guard then fails with
  `no Node pin file found`, which is the intended behaviour — a repo with
  containers and no stated pin is the state this change exists to end.
