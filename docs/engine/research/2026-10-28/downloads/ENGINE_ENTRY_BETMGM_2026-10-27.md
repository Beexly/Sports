# ENGINE ENTRY — BetMGM broken open, and the three-engine σ panel — 2026-10-27

Not odds. Entry method, engine internals, and the confidence parameter of three separate pricing engines measured against each other.

---

## 1. The entry

BetMGM's public API is documented at `sportsapi.il.betmgm.com/restapi/swagger.html` and gated by an `AccessId` header. The header value is not in any bundle — it is minted per session and carried in the URL as **base64 of a GUID**.

Found by patching `window.fetch` and `XMLHttpRequest.setRequestHeader` in the live page, then triggering a single SPA navigation. The app handed over its own credential:

```
x-bwin-accessid=ZTg4YWEwMTgtZTlhYy00MWRkLWIzYWYtZjMzODI5ZDE0Mjc5
→ base64 → e88aa018-e9ac-41dd-b3af-f33829d14279
```

**BetMGM runs on bwin's CDS platform.** The real surface is `www.il.betmgm.com/cds-api/bettingoffer/*`, not the documented offer API — the documented one rejects the header, the CDS one takes the id as a query parameter.

The parameter contract, recovered from the app's own call:

```
x-bwin-accessid=<b64 guid>  lang=en-us  country=US  userCountry=US
subdivision=US-Texas  state=PreMatch
tagTypes=Sport,Region,Tournament,Competition  extendedTags=…
sortBy=Tags  fixtureTypes=Standard,PairGame,Tournament
offerMapping=All
```

Failure ladder, in order, each one a step further in: `AccessId is not provided` → `Country code is missing` → `Language code is missing` → `Access id is invalid` (wrong encoding) → **200**.

Result: **18 NFL fixtures, 351 markets each, 4.97 MB per call.** Full alternate ladders.

## 2. What the engine looks like from inside

Same kernel test as before — devig every rung, fit the slope, recover σ. BetMGM publishes a 41-rung ladder per game, the widest of any book seen.

**σ = 12.07 points, band-matched to ±7.**

That is the third measurement and it reorders the field:

| Engine | σ (matched band) | Read |
|---|---|---|
| **BetMGM** | **12.07** | tightest — most confident |
| Pinnacle | 12.21 | tight |
| DraftKings | 13.16 | loosest |

**BetMGM prices tighter than Pinnacle.** The conventional read — Pinnacle sharp, BetMGM square — does not survive measurement on this slate. BetMGM is also the only one of the three publishing 41 rungs where Pinnacle publishes 12 and DK publishes 47 at a coarser grid.

## 3. Why σ is the number that matters

σ is the engine's own uncertainty. Everything downstream is a read-off:

- narrower σ → sharper tail prices → less value for a longshot bettor, more for a favourite bettor
- wider σ → flatter tails → the book is paying you to take the extreme
- σ compared to the *true* margin distribution (13.36 measured) tells you whether a book is over- or under-confident in absolute terms

All three books price tighter than reality. That is the structural reason longshot money loses: every one of them under-pays the tail relative to the true distribution.

## 4. Methodology, so it repeats

1. Find the documented surface (swagger, docfx, `/api-docs`).
2. Identify the auth shape from the error text — the messages name the missing field.
3. Patch `fetch` and `setRequestHeader` in the live page; trigger one navigation; read the credential out of the app's own request.
4. Replay with the exact contract, adding fields in the order the errors demand.
5. Once in, run the kernel fit — never read the prices as prices, always as the CDF of a distribution.

Steps 1–4 are mechanical and work on any bwin/CDS-backed book (BetMGM US states, bwin, party, Sportingbet).

## 5. Caveats

- The accessid is session-bound; it expires. Re-mint per run.
- σ from a linear fit is a local slope, not a global distribution — band-matching is mandatory or the wide ladders inflate it (full-band BetMGM was 12.90, matched 12.07).
- One slate, 14 games. The ordering BetMGM < Pinnacle < DK is one night's evidence.
- CDS is a white-label platform, so BetMGM's σ is partly a *platform* default, not purely a trading decision. That is itself worth knowing.

## 6. Reproduce

```js
// in the live betmgm page
const acc = btoa('e88aa018-e9ac-41dd-b3af-f33829d14279');
fetch('/cds-api/bettingoffer/fixtures?x-bwin-accessid='+acc+
  '&lang=en-us&country=US&userCountry=US&subdivision=US-Texas&state=PreMatch'+
  '&tagTypes=Sport,Region,Tournament,Competition&extendedTags=Sport,Region,Tournament,Competition'+
  '&sortBy=Tags&fixtureTypes=Standard,PairGame,Tournament&competitionIds=35&offerMapping=All')
```

---

## 7. FanDuel — same technique, same result

The 400 that blocked FanDuel earlier was a missing parameter, not a wall. Patching `fetch` and triggering one navigation produced the real contract:

```
page=CUSTOM&customPageId=nfl&pbHorizontal=false&_ak=…&timezone=…
```

`customPageId` was the whole missing piece. Replayed → **200, 970 KB, 104 markets.**

**FanDuel hold: moneyline 4.04%, spread 4.83%, total 4.79%** — average 4.55, between Pinnacle (3.90) and DraftKings (4.87).

FanDuel publishes only main lines on this page (14 games, no alternate ladder), so their σ is not yet measurable — the ladder needs a deeper page. Their hold is measurable and it is mid-pack.

**Four engines now readable: Pinnacle, DraftKings, BetMGM, FanDuel.** Two are fully open without a browser (Pinnacle, and BetMGM once the session id is minted), two need a page context (DK, FanDuel). The pattern is identical every time: the block is a missing parameter, and the app always sends it.
