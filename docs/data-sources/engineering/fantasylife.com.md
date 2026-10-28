# fantasylife.com — engineering

App bundles beautified: **0**  
JSON endpoints captured: **4**  
Client functions passing filter: **0**

## Captured JSON endpoints

| Endpoint | Bytes |
|---|---|
| `https://fantasylife.com/_next/data/` | 2 |
| `https://fantasylife.com/_next/data/${e.buildId}` | 2 |
| `https://fantasylife.com/api/search?q=${encodeURIComponent(e)}&limit=10` | 72 |
| `https://fantasylife.com/api/session` | 18 |

## Response schemas

### `https://fantasylife.com/_next/data/`
```
```

### `https://fantasylife.com/_next/data/${e.buildId}`
```
```

### `https://fantasylife.com/api/search?q=${encodeURIComponent(e)}&limit=10`
```
data: dict
data.players: list
data.teams: list
data.analysis: list
data.tools: list
status: int
```

### `https://fantasylife.com/api/session`
```
loggedIn: bool
```

## Client-side functions that passed the filter

_None survived. The model is server-side._

## Gap

Model is server-side. The response schema above is the artifact; no client coefficient exists to read.
