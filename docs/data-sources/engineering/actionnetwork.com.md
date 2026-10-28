# actionnetwork.com — engineering

App bundles beautified: **0**  
JSON endpoints captured: **3**  
Client functions passing filter: **0**

## Captured JSON endpoints

| Endpoint | Bytes |
|---|---|
| `https://actionnetwork.com/_next/data/` | 17 |
| `https://actionnetwork.com/_next/data/${e.buildId}` | 133,626 |
| `https://actionnetwork.com/_next/data/${this.buildId}${r}${m}` | 133,626 |

## Response schemas

### `https://actionnetwork.com/_next/data/`
```
notFound: bool
```

### `https://actionnetwork.com/_next/data/${e.buildId}`
```
pageProps: dict
pageProps.mainNav: list
pageProps.mainNav[]: dict
pageProps.mainNav[].id: int
pageProps.mainNav[].__component: str
pageProps.mainNav[].Title: str
pageProps.mainNav[].IsPro: NoneType
pageProps.mainNav[].Items: list
pageProps.mainNav[].Items[]: dict
pageProps.pageNav: list
pageProps.pageNav[]: dict
pageProps.pageNav[].id: int
pageProps.pageNav[].__component: str
pageProps.pageNav[].Title: str
pageProps.pageNav[].Link: str
pageProps.pageNav[].NextLink: str
pageProps.pageNav[].IsExternal: bool
pageProps.pageNav[].Icon: str
pageProps.pageNav[].CustomIcon: dict
pageProps.pageNav[].CustomIcon.data: NoneType
__N_SSG: bool
```

### `https://actionnetwork.com/_next/data/${this.buildId}${r}${m}`
```
pageProps: dict
pageProps.mainNav: list
pageProps.mainNav[]: dict
pageProps.mainNav[].id: int
pageProps.mainNav[].__component: str
pageProps.mainNav[].Title: str
pageProps.mainNav[].IsPro: NoneType
pageProps.mainNav[].Items: list
pageProps.mainNav[].Items[]: dict
pageProps.pageNav: list
pageProps.pageNav[]: dict
pageProps.pageNav[].id: int
pageProps.pageNav[].__component: str
pageProps.pageNav[].Title: str
pageProps.pageNav[].Link: str
pageProps.pageNav[].NextLink: str
pageProps.pageNav[].IsExternal: bool
pageProps.pageNav[].Icon: str
pageProps.pageNav[].CustomIcon: dict
pageProps.pageNav[].CustomIcon.data: NoneType
__N_SSG: bool
```

## Client-side functions that passed the filter

_None survived. The model is server-side._

## Gap

Model is server-side. The response schema above is the artifact; no client coefficient exists to read.
