# gse-weather-edge

**Leak-safe, as-of NFL weather features from Open-Meteo — a de-risked building block for the Galaxy edge engine.**

Weather (wind, gusts, precipitation) is a real NFL edge factor, and [Open-Meteo](https://open-meteo.com) is free and commercial-OK. But a naive weather join **leaks**: using what the weather *actually was* at kickoff is information the pick didn't have when it froze. This module returns only what was knowable **as-of the pick's freeze time**, so a weather feature can pass the same no-lookahead discipline as the rest of your as-of feature store.

The hard, easy-to-get-wrong part — the leak-safe as-of design — is done and unit-tested. The build session integrates it behind a `MODEL_VERSION` gate and runs it through the trials registry.

## The leak-safety contract (why this is the whole point)

- `asOfUtc` is the pick freeze time. Returned features must be derivable from information available at `asOfUtc` and nothing later.
- **Live / upcoming** (kickoff in the future): use the **current forecast** — a forecast for a future hour is legitimately known now.
- **Backtest** (kickoff in the past): use Open-Meteo's **historical-forecast archive** constrained so the forecast run was issued **at/before `asOfUtc`**. **Never** the observed/ERA5 archive — that's the outcome, i.e. leakage.
- Every result carries `provenance` (api, lead time, note) so the feature store can assert the leak gate downstream.

## Usage

```ts
import { getAsOfGameWeather } from "gse-weather-edge";

const features = await getAsOfGameWeather(
  {
    site: { name: "Lambeau Field", latitude: 44.5013, longitude: -88.0622, isIndoor: false },
    kickoffUtc: "2026-01-11T18:00:00Z",
    asOfUtc:    "2026-01-08T00:00:00Z", // the pick freeze time — the leak anchor
  },
  { fetchJson: (url) => fetch(url).then((r) => r.json()) }, // you own HTTP + retries + caching
);
// -> { available, source: "forecast"|"historical-forecast"|"indoor-neutral"|"unavailable",
//      windMph, windGustMph, precipInch, tempF, ..., candidateSignals, provenance }
```

- **`fetchJson` is injected** — no hidden HTTP. You control retries, caching, and rate limits. (Tests inject fixtures; production injects `fetch`.)
- **Indoor/dome sites** short-circuit to a neutral result (no network call).
- **`candidateSignals`** (`passingSuppressionIndex`, `kickingDifficultyIndex`) are documented, monotone transforms offered as **hypotheses for the trials registry to admit or reject**. This module makes **no** accuracy or edge claim.

## Build & test

```bash
npm install
npm test    # tsc + 8 fixture-based unit tests (dome, live, backtest, leak guard, honest-unavailable, monotonicity)
```

## Honest status

- The **logic** is verified against fixtures shaped exactly like Open-Meteo's documented response. It has **not** been smoke-tested against the live API in this build (the sandbox couldn't reach Open-Meteo). Your build session's one job before trusting the network path: run it live once and confirm the response shape + the strict as-of behavior — see **`INTEGRATION_SPEC.md`**.
- Adding a weather feature to scoring is a `MODEL_VERSION`-affecting change and is founder-gated per your own rules. This module is a building block, not a scoring change.
