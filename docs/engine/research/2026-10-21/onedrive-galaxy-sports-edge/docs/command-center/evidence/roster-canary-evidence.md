# Roster Canary Evidence

As of: 2026-06-09

## Najee Harris

- Official/public source checked: NFL player page reported Najee Harris as UFA.
- Official/public source checked: Los Angeles Chargers roster page did not list Najee Harris.
- App source value: no Najee Harris app player record found by static grep in selected app source.
- App rendered value: not verified because no Player Lab/player route was available and homepage/board are blocked by runtime DB failures.
- Conflict status: no stale app value found, but roster truth cannot be proven because the selected app does not expose roster/player data.
- Confidence: medium for source status, low for app correctness because app data surface is absent.
- Launch status: blocked if launch claims current NFL roster/player truth or Player Lab.

Sources:

- NFL Najee Harris player page: https://www.nfl.com/players/najee-harris/stats/splits/2026/
- Chargers roster page: https://www.chargers.com/team/players-roster/

## Rico Dowdle

- Official/public source checked: NFL player page lists Rico Dowdle as RB #13, Pittsburgh Steelers, active.
- Official/public source checked: Steelers player page lists Rico Dowdle as RB #13.
- App source value: no Rico Dowdle app player record found by static grep in selected app source.
- App rendered value: not verified because no Player Lab/player route was available.
- Conflict status: no stale app value found, but no app roster data can be validated.
- Confidence: high for source status, low for app correctness because app data surface is absent.
- Launch status: blocked if launch claims current player/team intelligence is live.

Sources:

- NFL Rico Dowdle player page: https://www.nfl.com/players/rico-dowdle/
- Steelers Rico Dowdle player page: https://www.steelers.com/team/players-roster/rico-dowdle/

## Broader Roster Risk

The selected app currently behaves like a picks/board/methodology/pricing product rather than a Player Lab roster product. The correct action is either:

1. Add a real roster canary harness tied to approved source hierarchy; or
2. Remove Player Lab/current-roster claims from launch scope until that surface exists.
