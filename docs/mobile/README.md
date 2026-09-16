# GSE iOS — programme workspace

**What this is.** The native iOS client for Galaxy Sports Edge, built on top of
[`Beexly/Sports`](https://github.com/Beexly/Sports).

**What it is not.** It is not deployed, not built, and not run. See "Honest status" below — that
section is the most important one in this file.

---

## Layout

```
PLAN.md                     the plan of action, and the constraints it works under
app/                        the Expo SDK 57 / React Native 0.86 iOS app
preview/                    design review harness (HTML mirror — the app has no simulator here)
server-patches/             PR-ready routes the repo does not have yet
docs/store/SUBMISSION.md    App Store Connect packet: metadata, privacy, review notes
docs/product/               X community strategy
research/round-01-*.md      10 reference repositories, with the lesson each one changed
reports/01-review-and-audit.md   the review pass: defects, doctrine audit, upstream findings
x-transport/                OAuth 1.0a signer + tests (the X bot's missing transport)
sports-meta/                a sparse checkout of Beexly/Sports, used as the source of truth
```

## Start here

| If you want to… | Read |
|---|---|
| understand what was built and what is unverified | `reports/01-review-and-audit.md` §1–2 |
| know what is broken upstream in the Sports repo | `reports/01-review-and-audit.md` §4 |
| ship it | `docs/store/SUBMISSION.md` §9 |
| run the checks | `sh app/scripts/verify.sh` |
| see the screens | open `preview/screens.html` |
| work on the X account | `docs/product/x-community-strategy.md` |

---

## Honest status

| Area | State |
|---|---|
| App source | **Complete and lint-clean** — 41 files, 0 invariant violations |
| Pure logic | **Tested** — 105 passing assertions |
| Core typecheck (13 pure files) | **Passing** — 0 diagnostics |
| **Full typecheck (all 42 files, real RN/Expo types)** | **Passing** — 0 diagnostics, twice consecutively. Treat it as unreliable rather than absent: the same config once passed while the process was actually dead. A *missing* summary line means a killed run, not a clean one. |
| App build / run | **NEVER EXECUTED.** No Xcode, no simulator. |
| Server patches | **Written, never run.** |
| Store submission | **Packet complete, not submitted.** Needs the owner's App Store Connect API key. |
| X transport | **Signer verified (18 tests incl. the RFC 5849 vector); sender not written.** |

**The single next action:** run `npx expo start --ios` on a Mac. The typecheck already passes here
against the real SDK 57 type surface, so the remaining unknowns are runtime behaviour and the
native build, not the type layer.

---

## The three constraints everything bends around

1. **The server is the only enforcer.** `app/src/lib/entitlements.ts` is presentational — it picks
   labels for redacted fields and nothing else. There is a test asserting it imports no components
   and holds no state, because the failure mode is a client that "unlocks" data the server already
   sent (CLAUDE.md rule 3).

2. **Confidence is a score, not a probability.** Measured 2026-09-13: the 80+ band claimed 0.8663
   and realized 0.5191 (z = −10.7). It renders `72/100`. A linter rule fails the build on any
   attempt to render it with a percent sign.

3. **A check is not trusted until it can demonstrate it fails.** The typechecker silently passed
   for an hour while it was being killed. Every check in `scripts/verify.sh` therefore has a
   positive control: the linter self-tests its eight rules against synthetic violations, and the
   typecheck script prints its own summary line so a killed run is visibly a killed run.

---

## Reproducing the verification

```sh
cd app
sh scripts/verify.sh          # lint self-test, lint, tests, then a best-effort typecheck
sh scripts/verify.sh quick    # skip the typecheck attempt
```

Environment requirements for the good path (see the script header for why):

```sh
export UV_THREADPOOL_SIZE=2       # or tsc aborts with a libuv assertion
node --test --test-concurrency=1  # parallel test processes SIGSEGV on this host
```

## Dependencies the toolchain needs (already installed on this host)

TypeScript and the SDK 57 type set live outside the project, because `npm install react-native`
fails here (npm's rename-over-directory path leaves an empty `node_modules`).

```
/opt/gsetools/node_modules/typescript          6.0.3
/opt/gstypes/node_modules/                     the full SDK 57 type surface
/opt/gstypes/fetch.sh <pkg> <ver>              tarball fetcher that bypasses npm's rename
/node_modules -> /opt/gstypes/node_modules     root symlink (symlinks are blocked under /var/minis)
```

To typecheck on a normal machine, `npm install` in `app/` and use `tsc --noEmit` directly.
