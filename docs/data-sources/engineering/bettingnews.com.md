# bettingnews.com — engineering

App bundles beautified: **0**  
JSON endpoints captured: **3**  
Client functions passing filter: **0**

## Captured JSON endpoints

| Endpoint | Bytes |
|---|---|
| `https://bettingnews.com/_next/data/` | 17 |
| `https://bettingnews.com/api/apiCloudfrontGeo` | 101 |
| `https://bettingnews.com/api/wpContentUploads` | 57 |

## Response schemas

### `https://bettingnews.com/_next/data/`
```
notFound: bool
```

### `https://bettingnews.com/api/apiCloudfrontGeo`
```
country: str
country_code: str
region: str
region_code: str
city: str
```

### `https://bettingnews.com/api/wpContentUploads`
```
message: str
```

## Client-side functions that passed the filter

_None survived. The model is server-side._

## Gap

Model is server-side. The response schema above is the artifact; no client coefficient exists to read.
