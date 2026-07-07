# Galaxy Dynasty — the GSN tie-in

**Status:** v1 seam landed (proof → progression + read-only BFF). Game client re-home is the next step.
**Owner branch:** `claude/magical-feynman-j9180p`.

## What this is

Galaxy Dynasty is a serious game that ties into Galaxy Sports Network: a stylized,
persistent 3D sports-city where your **real GSN identity, subscription, and track
record** become your character, your building, and your rank. It is the embodied
front-end of the fantasy / GM tier — not a betting-app widget, and not "the next
GTA" bolted into the Next app.

"The next GTA" is a *north star* (an open, drivable, sandbox-scale world — a funded,
native-engine, multi-year effort). What ships on the way there is the hub above.

## Non-negotiables (inherited from CLAUDE.md — do not break)

1. **No fake data.** Progression is derived from real settled picks / CLV / calibration — never invented XP.
2. **Server-side enforcement only.** Tier gating happens in the BFF, never in the game client.
3. **One direction.** Data flows GSN → game, read-only. The game never writes a pick or mints an entitlement.
4. **Honest labels.** Web systems are named for what they are (distance-based chunk streaming, instanced LOD, Rapier props) — not "Nanite / Lumen / Colyseus fully implemented." Those AAA terms describe engine features that do not exist in browser Three.js.
5. **Out of the critical path.** The game ships as its own deployable (`apps/dynasty`). A game crash can never touch checkout or SEO SSR.

## The spine: proof → progression

`apps/web/lib/dynasty/dynasty-progression.ts` is a **pure, unit-tested** module
(no DB, no env) — the counterpart to `lib/pricing/pricing-phases.ts`. Your standing
in the game is computed from the SAME proof gates that govern GSN's pricing ladder
and public performance claims:

| Rank | Gate (mirrors the pricing ladder) |
|---|---|
| Rookie | spawn — you've entered the city |
| Proven | ≥100 canonical settled picks **and** published calibration |
| Established | ≥500 settled **and** beat-close rate ≥ 52.4% (the vig break-even line) |
| Authority | deep sample + sustained close-beating (the game's readable stand-in for "multi-season ROI") |

Ranks are a true ladder — you cannot reach Established without also clearing Proven.

### Districts → real GSN surfaces

| District | GSN route | Unlocks when | Real data |
|---|---|---|---|
| Rookie Plaza | `/academy` | always | onboarding |
| The Beat | `/the-beat` | always | BlogPost · DailyBrief · Alert |
| Blacktop | `/picks` | first settled pick | Pick · Odds · Game |
| The Vault | `/vault` | first settled pick | PickProofReceipt · PerformanceSummary |
| GM Tower | `/fantasy` | real `canUseFantasyFull` entitlement | Player · PlayerGameStat · NextGenStat |
| The Depths | `/responsible-play` | always | free-tier / LossAutopsy |

The **Vault**'s floors (Foundation → Century → Calibrated → Beats the Close →
Established → Authority) are earned by the player's real, settled record.

## The seam: `GET /api/dynasty/me`

`apps/web/app/api/dynasty/me/route.ts` — read-only, session-gated, **fails closed**
to the anonymous FREE world on any error. It resolves real entitlements
(`getUserEntitlements`) and the real canonical settled sample (same non-bootstrap,
non-seed filters as `load-performance.ts`), then returns `deriveDynastyProfile(...)`.
The game client renders only this output.

Known follow-up: `hasPublishedCalibration` is conservatively `false` in the route
until the published-calibration signal is wired in — the "Calibrated" Vault floor
stays honestly locked rather than faked.

## Roadmap

- **00 — Re-home & de-hype** *(next)*: move the Three.js prototype out of `apps/web` into `apps/dynasty`; strip AAA relabeling; purge committed GLB binaries from history.
- **01 — Identity hub**: log in → spawn as your account → the Vault renders your real record via this seam. *(spine landed here.)*
- **02 — Data minigames**: Blacktop signal-sprint off the live slate; The Beat wall = real feed; GM Tower reads your roster.
- **03 — Persistence & economy**: city grows with your proof; cosmetics gated to tier; leaderboards by real CLV; a real multiplayer server (replacing the in-memory stub).
- **04 — Open sandbox**: entered only if the hub earns retention — the native-engine go/no-go.

## Engine decision

Start **web-native / stylized** (React-Three-Fiber or PlayCanvas/Babylon): ships in
months, lives beside the web app, monetizes through existing Stripe tiers, real data
is a fetch away. Native AAA (Unity/Unreal) is the funded spin-off you earn *if* the
hub retains players — not the v1 target.
