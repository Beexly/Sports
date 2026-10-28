# bovada.lv — engineering

App bundles beautified: **0**  
JSON endpoints captured: **9**  
Client functions passing filter: **0**

## Captured JSON endpoints

| Endpoint | Bytes |
|---|---|
| `https://bovada.lv/api/v1/document-verification-status/profile/${n.SESSION_ID_PLACEHOLDER}?documentType=ID_DOCUMENT` | 110 |
| `https://bovada.lv/api/v1/logout` | 133 |
| `https://bovada.lv/api/v1/profile-info/${a.SESSION_ID_PLACEHOLDER}` | 110 |
| `https://bovada.lv/services/jurisdiction/v2/access` | 47 |
| `https://bovada.lv/services/login-service/v1/auth/handoff` | 136 |
| `https://bovada.lv/services/profile-profiling/v1/document-verification/profile/${n.SESSION_ID_PLACEHOLDER}/document-verification-url` | 110 |
| `https://bovada.lv/services/reward-issuing/v1/profiles/${t}/claimed-crypto-rewards` | 110 |
| `https://bovada.lv/services/signup-service/v1/invitation/validate/${e}` | 110 |
| `https://bovada.lv/services/wallet-gateway/v1/profiles/${t}/balances` | 110 |

## Response schemas

### `https://bovada.lv/api/v1/document-verification-status/profile/${n.SESSION_ID_PLACEHOLDER}?documentType=ID_DOCUMENT`
```
timestamp: str
status: int
error: str
message: str
```

### `https://bovada.lv/api/v1/logout`
```
timestamp: str
status: int
error: str
message: str
```

### `https://bovada.lv/api/v1/profile-info/${a.SESSION_ID_PLACEHOLDER}`
```
timestamp: str
status: int
error: str
message: str
```

### `https://bovada.lv/services/jurisdiction/v2/access`
```
status: str
customBlockMessage: bool
```

### `https://bovada.lv/services/login-service/v1/auth/handoff`
```
timestamp: str
status: int
error: str
path: str
```

### `https://bovada.lv/services/profile-profiling/v1/document-verification/profile/${n.SESSION_ID_PLACEHOLDER}/document-verification-url`
```
timestamp: str
status: int
error: str
message: str
```

### `https://bovada.lv/services/reward-issuing/v1/profiles/${t}/claimed-crypto-rewards`
```
timestamp: str
status: int
error: str
message: str
```

### `https://bovada.lv/services/signup-service/v1/invitation/validate/${e}`
```
timestamp: str
status: int
error: str
message: str
```

### `https://bovada.lv/services/wallet-gateway/v1/profiles/${t}/balances`
```
timestamp: str
status: int
error: str
message: str
```

## Client-side functions that passed the filter

_None survived. The model is server-side._

## Gap

Model is server-side. The response schema above is the artifact; no client coefficient exists to read.
